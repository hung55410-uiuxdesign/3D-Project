import { NextRequest, NextResponse } from 'next/server';
import {
  getMockProductById,
  getMockProductsByAssetGroup,
  getMockProductsByCategory,
  MOCK_PRODUCTS,
  simulateNetworkDelay,
} from '@/services/mockApi';
import { AssetGroup, ProductCategory } from '@/types/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const categoryParam = searchParams.get('category');
  const groupParam = searchParams.get('group');

  // Simulate realistic backend latency (300ms - 500ms)
  await simulateNetworkDelay(300, 500);

  if (id) {
    const product = getMockProductById(id);
    if (!product) {
      return NextResponse.json(
        { error: `Product with id '${id}' not found`, product: null },
        { status: 404 }
      );
    }
    return NextResponse.json({
      product,
      timestamp: new Date().toISOString(),
    });
  }

  if (
    groupParam === 'dress' ||
    groupParam === 'set' ||
    groupParam === 'shirt' ||
    groupParam === 'sweater'
  ) {
    const products = getMockProductsByAssetGroup(groupParam as AssetGroup);
    return NextResponse.json({
      group: groupParam,
      count: products.length,
      products,
      timestamp: new Date().toISOString(),
    });
  }

  if (categoryParam === 'man' || categoryParam === 'woman') {
    const products = getMockProductsByCategory(categoryParam as ProductCategory);
    return NextResponse.json({
      category: categoryParam,
      count: products.length,
      products,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    category: 'all',
    count: MOCK_PRODUCTS.length,
    products: MOCK_PRODUCTS,
    timestamp: new Date().toISOString(),
  });
}
