import { NextRequest, NextResponse } from 'next/server';
import {
  getMockProductById,
  MOCK_PRODUCTS,
  simulateNetworkDelay,
} from '@/services/mockApi';
import {
  CartItem,
  CUSTOM_PRINT_FEE,
  CustomColorwayConfig,
  CustomPrintConfig,
  GarmentSize,
} from '@/types/store';

// Server-side in-memory store for simulated cart persistence during session
let serverCart: CartItem[] = [
  {
    id: 'man-04_L',
    productId: 'man-04',
    product: MOCK_PRODUCTS[3], // HARNESS TEE
    size: 'L',
    quantity: 1,
    addedAt: Date.now() - 60000,
  },
];

export async function GET() {
  await simulateNetworkDelay(300, 420);
  return NextResponse.json({
    cart: serverCart,
    totalCount: serverCart.reduce((acc, item) => acc + item.quantity, 0),
  });
}

export async function POST(request: NextRequest) {
  await simulateNetworkDelay(300, 500);

  try {
    const body = await request.json();
    const {
      productId,
      size = 'L',
      customPrint,
      customColorway,
    } = body as {
      productId: string;
      size?: GarmentSize;
      customPrint?: CustomPrintConfig;
      customColorway?: CustomColorwayConfig;
    };

    const product = getMockProductById(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found', cart: serverCart },
        { status: 404 }
      );
    }

    const validSize: GarmentSize = ['S', 'M', 'L', 'XL'].includes(size) ? size : 'L';
    const hasActivePrint = Boolean(customPrint?.enabled && customPrint?.imageUrl);
    const printPayload = hasActivePrint ? customPrint : undefined;
    const customPrintFee = hasActivePrint ? CUSTOM_PRINT_FEE : 0;
    const colorwayPayload = customColorway?.enabled ? customColorway : undefined;
    const printSuffix = printPayload
      ? `_${printPayload.side}_${Math.round(printPayload.offsetX * 100)}_${Math.round(printPayload.offsetY * 100)}_${Math.round(printPayload.scale * 100)}`
      : '';
    const colorSuffix = colorwayPayload
      ? `_${colorwayPayload.primaryColor}_${colorwayPayload.accentColor}_${colorwayPayload.pattern}`
      : '';
    const cartItemId = `${productId}_${validSize}${printSuffix}${colorSuffix}`;
    const existingIdx = serverCart.findIndex((item) => item.id === cartItemId);

    if (existingIdx > -1) {
      serverCart = serverCart.map((item, idx) =>
        idx === existingIdx
          ? {
              ...item,
              quantity: item.quantity + 1,
              customPrint: printPayload ?? item.customPrint,
              customPrintFee: customPrintFee || item.customPrintFee,
              customColorway: colorwayPayload ?? item.customColorway,
            }
          : item
      );
    } else {
      serverCart = [
        ...serverCart,
        {
          id: cartItemId,
          productId,
          product,
          size: validSize,
          quantity: 1,
          addedAt: Date.now(),
          customPrint: printPayload,
          customPrintFee,
          customColorway: colorwayPayload,
        },
      ];
    }

    return NextResponse.json({
      cart: serverCart,
      totalCount: serverCart.reduce((acc, item) => acc + item.quantity, 0),
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request payload', cart: serverCart },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  await simulateNetworkDelay(300, 450);

  try {
    const body = await request.json();
    const { cartItemId, newSize } = body as {
      cartItemId: string;
      newSize: GarmentSize;
    };

    const target = serverCart.find((item) => item.id === cartItemId);
    if (!target) {
      return NextResponse.json({ cart: serverCart }, { status: 404 });
    }

    const newId = `${target.productId}_${newSize}`;
    if (newId !== cartItemId) {
      const existingWithNewSize = serverCart.find((item) => item.id === newId);
      if (existingWithNewSize) {
        serverCart = serverCart
          .filter((item) => item.id !== cartItemId)
          .map((item) =>
            item.id === newId
              ? { ...item, quantity: item.quantity + target.quantity }
              : item
          );
      } else {
        serverCart = serverCart.map((item) =>
          item.id === cartItemId ? { ...item, id: newId, size: newSize } : item
        );
      }
    }

    return NextResponse.json({
      cart: serverCart,
      totalCount: serverCart.reduce((acc, item) => acc + item.quantity, 0),
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid PATCH payload', cart: serverCart },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cartItemId = searchParams.get('cartItemId');
  const checkout = searchParams.get('checkout');

  await simulateNetworkDelay(300, 450);

  if (checkout === 'true') {
    serverCart = [];
    return NextResponse.json({
      cart: [],
      totalCount: 0,
      orderCode: `LP-${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }

  if (cartItemId) {
    serverCart = serverCart.filter((item) => item.id !== cartItemId);
  }

  return NextResponse.json({
    cart: serverCart,
    totalCount: serverCart.reduce((acc, item) => acc + item.quantity, 0),
  });
}
