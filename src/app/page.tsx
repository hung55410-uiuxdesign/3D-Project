'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ActiveTab,
  AssetGroupFilter,
  CameraViewMode,
  CartItem,
  ColorPaletteItem,
  CustomColorwayConfig,
  CustomPrintConfig,
  DEFAULT_CUSTOM_COLORWAY_CONFIG,
  DEFAULT_CUSTOM_PRINT_CONFIG,
  GarmentSize,
  MenuSection,
  ProductCategory,
  ProductItem,
  StudioLightingConfig,
  StudioTheme,
} from '@/types/store';
import {
  addToCartMock,
  checkoutCartMock,
  fetchCartMock,
  fetchProductById,
  fetchProductsByAssetGroup,
  fetchProductsByCategory,
  getMockProductsByCategory,
  removeFromCartMock,
  updateCartItemSizeMock,
} from '@/services/mockApi';
import { USE_GLB_MODELS } from '@/components/canvas/GarmentItem';
import { DEFAULT_STUDIO_LIGHTING } from '@/components/canvas/StudioLightingPresets';
import { StoreOverlay } from '@/components/ui/StoreOverlay';

const LIGHTING_STORAGE_KEY = 'loops_studio_lighting_v1';
const USER_PALETTES_STORAGE_KEY = 'loops_user_color_palettes_v1';

// Dynamically import the WebGL Canvas scene to avoid SSR hydration mismatches
const VirtualStoreScene = dynamic(
  () =>
    import('@/components/canvas/VirtualStoreScene').then(
      (mod) => mod.VirtualStoreScene
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center font-mono text-xs uppercase tracking-[0.25em] text-white/60">
        Initializing Edric Studio® 3D...
      </div>
    ),
  }
);

export default function EdricStudioVirtualStorePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('store');
  const [category, setCategory] = useState<ProductCategory>('man');
  const [assetGroupFilter, setAssetGroupFilter] =
    useState<AssetGroupFilter>('all');
  const [products, setProducts] = useState<ProductItem[]>(() =>
    getMockProductsByCategory('man')
  );
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(
    null
  );
  const [isLoadingProductDetail, setIsLoadingProductDetail] =
    useState<boolean>(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState<boolean>(false);

  // Custom Print Studio & Custom Colorway Studio state per product ID + 3D interaction states
  const [customPrintsByProduct, setCustomPrintsByProduct] = useState<
    Record<string, CustomPrintConfig>
  >({});
  const [customColorwaysByProduct, setCustomColorwaysByProduct] = useState<
    Record<string, CustomColorwayConfig>
  >({});
  const [userColorPalettes, setUserColorPalettes] = useState<
    ColorPaletteItem[]
  >([]);
  const [isDirectDragPrintMode, setIsDirectDragPrintMode] =
    useState<boolean>(false);
  const [isFlippedBack, setIsFlippedBack] = useState<boolean>(false);

  // Load saved user color palettes from localStorage on client mount
  useEffect(() => {
    try {
      const savedPalettes = window.localStorage.getItem(
        USER_PALETTES_STORAGE_KEY
      );
      if (savedPalettes) {
        const parsed = JSON.parse(savedPalettes);
        if (Array.isArray(parsed)) {
          setUserColorPalettes(parsed);
        }
      }
    } catch {
      // Ignore storage parse errors
    }
  }, []);

  const handleAddUserColorPalette = useCallback((palette: ColorPaletteItem) => {
    setUserColorPalettes((prev) => {
      const next = [palette, ...prev];
      try {
        window.localStorage.setItem(
          USER_PALETTES_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

  const handleRemoveUserColorPalette = useCallback((paletteId: string) => {
    setUserColorPalettes((prev) => {
      const next = prev.filter((p) => p.id !== paletteId);
      try {
        window.localStorage.setItem(
          USER_PALETTES_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

  const activeProductId = useMemo(() => {
    if (selectedProduct?.id) return selectedProduct.id;
    if (activeIndex !== null && products[activeIndex]) {
      return products[activeIndex].id;
    }
    return null;
  }, [activeIndex, products, selectedProduct]);

  const activeCustomPrint: CustomPrintConfig = useMemo(() => {
    if (activeProductId && customPrintsByProduct[activeProductId]) {
      return customPrintsByProduct[activeProductId];
    }
    return DEFAULT_CUSTOM_PRINT_CONFIG;
  }, [activeProductId, customPrintsByProduct]);

  const activeCustomColorway: CustomColorwayConfig = useMemo(() => {
    if (activeProductId && customColorwaysByProduct[activeProductId]) {
      return customColorwaysByProduct[activeProductId];
    }
    const baseProd =
      selectedProduct ?? (activeIndex !== null ? products[activeIndex] : null);
    return {
      ...DEFAULT_CUSTOM_COLORWAY_CONFIG,
      primaryColor:
        baseProd?.baseColor || DEFAULT_CUSTOM_COLORWAY_CONFIG.primaryColor,
      accentColor:
        baseProd?.accentColor || DEFAULT_CUSTOM_COLORWAY_CONFIG.accentColor,
    };
  }, [activeIndex, activeProductId, customColorwaysByProduct, products, selectedProduct]);

  const handleUpdateCustomPrint = useCallback(
    (
      updater:
        | ((prev: CustomPrintConfig) => CustomPrintConfig)
        | Partial<CustomPrintConfig>
    ) => {
      if (!activeProductId) return;
      setCustomPrintsByProduct((prev) => {
        const current = prev[activeProductId] ?? DEFAULT_CUSTOM_PRINT_CONFIG;
        const next =
          typeof updater === 'function'
            ? updater(current)
            : { ...current, ...updater };
        return {
          ...prev,
          [activeProductId]: next,
        };
      });
    },
    [activeProductId]
  );

  const handleUpdateCustomColorway = useCallback(
    (
      updater:
        | ((prev: CustomColorwayConfig) => CustomColorwayConfig)
        | Partial<CustomColorwayConfig>
    ) => {
      if (!activeProductId) return;
      setCustomColorwaysByProduct((prev) => {
        const current = prev[activeProductId] ?? activeCustomColorway;
        const next =
          typeof updater === 'function'
            ? updater(current)
            : { ...current, ...updater };
        return {
          ...prev,
          [activeProductId]: next,
        };
      });
    },
    [activeCustomColorway, activeProductId]
  );

  // Automatically open the Product Detail & Custom Studio panel whenever a garment becomes active
  useEffect(() => {
    setIsFlippedBack(false);
    if (activeIndex === null) {
      setIsDirectDragPrintMode(false);
      setIsQuickViewOpen(false);
      return;
    }
    const focusedProduct = products[activeIndex];
    if (focusedProduct) {
      setSelectedProduct(focusedProduct);
      setIsQuickViewOpen(true);
    }
  }, [activeIndex, products]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoading, setIsCartLoading] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [checkoutOrderCode, setCheckoutOrderCode] = useState<string | null>(
    null
  );

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [activeMenuSection, setActiveMenuSection] =
    useState<MenuSection>('Collections');

  const [theme, setTheme] = useState<StudioTheme>('studio-grey');
  const [useGlbModels, setUseGlbModels] = useState<boolean>(USE_GLB_MODELS);
  const [lightingConfig, setLightingConfig] = useState<StudioLightingConfig>(
    DEFAULT_STUDIO_LIGHTING
  );

  // Load saved lighting configuration from localStorage on client mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LIGHTING_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.keyLight && parsed.fillLight && parsed.rimLight) {
          setLightingConfig({
            ...DEFAULT_STUDIO_LIGHTING,
            ...parsed,
          });
        }
      }
    } catch {
      // Ignore storage parse errors
    }
  }, []);

  const handleChangeLightingConfig = useCallback(
    (next: StudioLightingConfig) => {
      setLightingConfig(next);
      try {
        window.localStorage.setItem(LIGHTING_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write errors
      }
    },
    []
  );

  const handleResetLightingConfig = useCallback(() => {
    setLightingConfig(DEFAULT_STUDIO_LIGHTING);
    try {
      window.localStorage.removeItem(LIGHTING_STORAGE_KEY);
    } catch {
      // Ignore storage remove errors
    }
  }, []);

  // Derive 3D Camera View Mode from UI state
  const viewMode: CameraViewMode = useMemo(() => {
    if (activeTab === 'store') return 'overview';
    if (activeIndex !== null) return 'focus';
    return 'rack';
  }, [activeTab, activeIndex]);

  // Initial cart sync on mount
  useEffect(() => {
    let mounted = true;
    fetchCartMock().then((initialCart) => {
      if (mounted) setCart(initialCart);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Load products via Mock API when category ('man' | 'woman') changes
  const handleLoadCategory = useCallback(
    async (nextCategory: ProductCategory) => {
      setIsLoadingProducts(true);
      setActiveIndex(null);
      setIsQuickViewOpen(false);
      setCategory(nextCategory);
      setAssetGroupFilter('all');

      try {
        const fetched = await fetchProductsByCategory(nextCategory);
        setProducts(fetched);
      } finally {
        setIsLoadingProducts(false);
      }
    },
    []
  );

  // Load products by 3D asset folder ('all' | 'dress' | 'set' | 'shirt' | 'sweater')
  const handleSelectAssetGroup = useCallback(
    async (group: AssetGroupFilter) => {
      if (activeTab === 'store') {
        setActiveTab(category);
      }
      setAssetGroupFilter(group);
      setActiveIndex(null);
      setIsQuickViewOpen(false);
      setIsLoadingProducts(true);

      try {
        if (group === 'all') {
          const fetched = await fetchProductsByCategory(category);
          setProducts(fetched);
        } else {
          const fetched = await fetchProductsByAssetGroup(group);
          setProducts(fetched);
        }
      } finally {
        setIsLoadingProducts(false);
      }
    },
    [activeTab, category]
  );

  // Handle bottom dock tab selection ('store' | 'man' | 'woman')
  const handleSelectTab = useCallback(
    (tab: ActiveTab) => {
      if (tab === 'store') {
        setActiveIndex(null);
        setIsQuickViewOpen(false);
        setActiveTab('store');
        return;
      }

      setActiveTab(tab);
      setAssetGroupFilter('all');
      if (tab !== category || assetGroupFilter !== 'all') {
        handleLoadCategory(tab);
      } else {
        setIsLoadingProducts(true);
        fetchProductsByCategory(tab).then((fetched) => {
          setProducts(fetched);
          setIsLoadingProducts(false);
        });
      }
    },
    [assetGroupFilter, category, handleLoadCategory]
  );

  // Dismiss splash overlay on click -> zoom into current category rack
  const handleDismissSplash = useCallback(() => {
    setActiveTab(category);
  }, [category]);

  // Top-right '<- back' button handler
  const handleBack = useCallback(() => {
    if (isQuickViewOpen) {
      setIsQuickViewOpen(false);
      return;
    }
    if (activeIndex !== null) {
      setActiveIndex(null);
      return;
    }
    setActiveTab('store');
  }, [activeIndex, isQuickViewOpen]);

  // Focus a specific garment index on the rack -> immediately open its Product Detail & Studio panel
  const handleFocusIndex = useCallback(
    (index: number | null) => {
      if (index !== null && activeTab === 'store') {
        setActiveTab(category);
      }
      setActiveIndex(index);
      if (index === null) {
        setIsQuickViewOpen(false);
      } else {
        const targetProd = products[index];
        if (targetProd) {
          setSelectedProduct(targetProd);
        }
        setIsQuickViewOpen(true);
      }
    },
    [activeTab, category, products]
  );

  // Click on the neon yellow garment label -> fetchProductById & open Quick View
  const handleOpenQuickView = useCallback(async (product: ProductItem) => {
    setSelectedProduct(product);
    setIsQuickViewOpen(true);
    setIsLoadingProductDetail(true);

    try {
      const detailed = await fetchProductById(product.id);
      if (detailed) {
        setSelectedProduct(detailed);
      }
    } finally {
      setIsLoadingProductDetail(false);
    }
  }, []);

  // Inspect a product directly from the Menu Modal (Lookbook / Collections)
  const handleQuickInspectFromMenu = useCallback(
    (product: ProductItem) => {
      setActiveTab(product.category);
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        setActiveIndex(idx);
      }
      handleOpenQuickView(product);
    },
    [products, handleOpenQuickView]
  );

  // Add item to Cart via Mock API & open Cart Drawer
  const handleAddToCart = useCallback(
    async (
      productId: string,
      size: GarmentSize,
      customPrint?: CustomPrintConfig,
      customColorway?: CustomColorwayConfig
    ) => {
      setIsCartLoading(true);
      setCheckoutOrderCode(null);
      try {
        const updated = await addToCartMock(
          productId,
          size,
          customPrint,
          customColorway
        );
        setCart(updated);
        setIsQuickViewOpen(false);
        setIsDirectDragPrintMode(false);
        setIsCartOpen(true);
      } finally {
        setIsCartLoading(false);
      }
    },
    []
  );

  // Remove item from Cart via Mock API
  const handleRemoveFromCart = useCallback(async (cartItemId: string) => {
    setIsCartLoading(true);
    try {
      const updated = await removeFromCartMock(cartItemId);
      setCart(updated);
    } finally {
      setIsCartLoading(false);
    }
  }, []);

  // Update size of item in Cart via Mock API
  const handleUpdateCartSize = useCallback(
    async (cartItemId: string, newSize: GarmentSize) => {
      setIsCartLoading(true);
      try {
        const updated = await updateCartItemSizeMock(cartItemId, newSize);
        setCart(updated);
      } finally {
        setIsCartLoading(false);
      }
    },
    []
  );

  // Simulated Checkout
  const handleCheckout = useCallback(async () => {
    setIsCartLoading(true);
    try {
      const res = await checkoutCartMock();
      setCart(res.cart);
      setCheckoutOrderCode(res.orderCode);
    } finally {
      setIsCartLoading(false);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isCartOpen || isMenuOpen) {
        if (e.key === 'Escape') {
          setIsCartOpen(false);
          setIsMenuOpen(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        handleBack();
      } else if (
        e.key === 'ArrowRight' &&
        activeTab !== 'store' &&
        products.length > 0
      ) {
        setActiveIndex((prev) =>
          prev === null ? 0 : (prev + 1) % products.length
        );
      } else if (
        e.key === 'ArrowLeft' &&
        activeTab !== 'store' &&
        products.length > 0
      ) {
        setActiveIndex((prev) =>
          prev === null
            ? products.length - 1
            : (prev - 1 + products.length) % products.length
        );
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, handleBack, isCartOpen, isMenuOpen, products.length]);

  return (
    <main
      className={`relative w-screen h-screen overflow-hidden transition-colors duration-700 ${
        theme === 'studio-grey' ? 'studio-bg-grey' : 'studio-bg-dark'
      }`}
    >
      {/* 3D WebGL Virtual Showroom Canvas */}
      <VirtualStoreScene
        products={products}
        activeIndex={activeIndex}
        viewMode={viewMode}
        isDetailOpen={isQuickViewOpen}
        isLoadingProducts={isLoadingProducts}
        useGlbModels={useGlbModels}
        lightingConfig={lightingConfig}
        customPrint={activeCustomPrint}
        customColorway={activeCustomColorway}
        customPrintsByProduct={customPrintsByProduct}
        customColorwaysByProduct={customColorwaysByProduct}
        isDirectDragPrintMode={isDirectDragPrintMode}
        isFlippedBack={isFlippedBack}
        onChangeFlippedBack={setIsFlippedBack}
        onUpdateCustomPrint={handleUpdateCustomPrint}
        onFocusIndex={handleFocusIndex}
        onOpenQuickView={handleOpenQuickView}
      />

      {/* 2D Tailwind CSS + Phosphor Icons UI Overlay */}
      <StoreOverlay
        activeTab={activeTab}
        category={category}
        assetGroupFilter={assetGroupFilter}
        products={products}
        isLoadingProducts={isLoadingProducts}
        activeIndex={activeIndex}
        selectedProduct={selectedProduct}
        isLoadingProductDetail={isLoadingProductDetail}
        isQuickViewOpen={isQuickViewOpen}
        customPrint={activeCustomPrint}
        customColorway={activeCustomColorway}
        userColorPalettes={userColorPalettes}
        isDirectDragPrintMode={isDirectDragPrintMode}
        isFlippedBack={isFlippedBack}
        onUpdateCustomPrint={handleUpdateCustomPrint}
        onUpdateCustomColorway={handleUpdateCustomColorway}
        onAddUserColorPalette={handleAddUserColorPalette}
        onRemoveUserColorPalette={handleRemoveUserColorPalette}
        onToggleDirectDragPrintMode={() =>
          setIsDirectDragPrintMode((prev) => !prev)
        }
        onChangeFlippedBack={setIsFlippedBack}
        cart={cart}
        isCartLoading={isCartLoading}
        isCartOpen={isCartOpen}
        isMenuOpen={isMenuOpen}
        activeMenuSection={activeMenuSection}
        theme={theme}
        useGlbModels={useGlbModels}
        lightingConfig={lightingConfig}
        checkoutOrderCode={checkoutOrderCode}
        onSelectTab={handleSelectTab}
        onSelectAssetGroup={handleSelectAssetGroup}
        onDismissSplash={handleDismissSplash}
        onBack={handleBack}
        onToggleTheme={() =>
          setTheme((prev) =>
            prev === 'studio-grey' ? 'studio-dark' : 'studio-grey'
          )
        }
        onToggleGlbMode={() => setUseGlbModels((prev) => !prev)}
        onChangeLightingConfig={handleChangeLightingConfig}
        onResetLightingConfig={handleResetLightingConfig}
        onFocusIndex={handleFocusIndex}
        onCloseQuickView={() => {
          setIsQuickViewOpen(false);
          setIsDirectDragPrintMode(false);
        }}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        onUpdateCartSize={handleUpdateCartSize}
        onCheckout={handleCheckout}
        onOpenCart={(open) => {
          if (open) setCheckoutOrderCode(null);
          setIsCartOpen(open);
        }}
        onOpenMenu={setIsMenuOpen}
        onSelectMenuSection={setActiveMenuSection}
        onQuickInspectFromMenu={handleQuickInspectFromMenu}
      />
    </main>
  );
}
