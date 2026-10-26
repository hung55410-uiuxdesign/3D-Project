'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowsClockwise,
  ArrowsLeftRight,
  ArrowsOutCardinal,
  Check,
  CaretLeft,
  CaretRight,
  FolderOpen,
  LightbulbFilament,
  Moon,
  Palette,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  Sparkle,
  Sun,
  Trash,
  UploadSimple,
  X,
} from '@phosphor-icons/react';
import {
  ActiveTab,
  AssetGroupFilter,
  CartItem,
  ColorPaletteItem,
  CUSTOM_PRINT_FEE,
  CustomColorwayConfig,
  CustomPrintConfig,
  DEFAULT_CUSTOM_COLORWAY_CONFIG,
  DEFAULT_CUSTOM_PRINT_CONFIG,
  GARMENT_DESIGN_PATTERNS,
  GarmentDesignPattern,
  GarmentSize,
  MenuSection,
  ProductCategory,
  ProductItem,
  StudioLightingConfig,
  StudioTheme,
  SUGGESTED_COLOR_PALETTES,
} from '@/types/store';
import {
  CustomPrintPresetItem,
  getCustomPrintPresets,
} from '@/components/canvas/ProceduralTextures';
import { LightingStudioPanel } from './LightingStudioPanel';

export interface StoreOverlayProps {
  activeTab: ActiveTab;
  category: ProductCategory;
  assetGroupFilter: AssetGroupFilter;
  products: ProductItem[];
  isLoadingProducts: boolean;
  activeIndex: number | null;
  selectedProduct: ProductItem | null;
  isLoadingProductDetail: boolean;
  isQuickViewOpen: boolean;
  cart: CartItem[];
  isCartLoading: boolean;
  isCartOpen: boolean;
  isMenuOpen: boolean;
  activeMenuSection: MenuSection;
  theme: StudioTheme;
  useGlbModels: boolean;
  lightingConfig: StudioLightingConfig;
  checkoutOrderCode: string | null;
  customPrint: CustomPrintConfig;
  customColorway?: CustomColorwayConfig;
  userColorPalettes?: ColorPaletteItem[];
  isDirectDragPrintMode: boolean;
  isFlippedBack: boolean;
  onUpdateCustomPrint: (
    updater: (prev: CustomPrintConfig) => CustomPrintConfig
  ) => void;
  onUpdateCustomColorway?: (
    updater: (prev: CustomColorwayConfig) => CustomColorwayConfig
  ) => void;
  onAddUserColorPalette?: (palette: ColorPaletteItem) => void;
  onRemoveUserColorPalette?: (paletteId: string) => void;
  onToggleDirectDragPrintMode: () => void;
  onChangeFlippedBack: (flipped: boolean) => void;
  onSelectTab: (tab: ActiveTab) => void;
  onSelectAssetGroup: (group: AssetGroupFilter) => void;
  onDismissSplash: () => void;
  onBack: () => void;
  onToggleTheme: () => void;
  onToggleGlbMode: () => void;
  onChangeLightingConfig: (next: StudioLightingConfig) => void;
  onResetLightingConfig: () => void;
  onFocusIndex: (index: number | null) => void;
  onCloseQuickView: () => void;
  onAddToCart: (
    productId: string,
    size: GarmentSize,
    customPrint?: CustomPrintConfig,
    customColorway?: CustomColorwayConfig
  ) => Promise<void>;
  onRemoveFromCart: (cartItemId: string) => Promise<void>;
  onUpdateCartSize: (cartItemId: string, newSize: GarmentSize) => Promise<void>;
  onCheckout: () => Promise<void>;
  onOpenCart: (open: boolean) => void;
  onOpenMenu: (open: boolean) => void;
  onSelectMenuSection: (section: MenuSection) => void;
  onQuickInspectFromMenu: (product: ProductItem) => void;
}

const MENU_SECTIONS: MenuSection[] = [
  'Collections',
  'Archive 2026',
  'Lookbook',
  'About Edric Studio',
  'FAQ',
];

const ASSET_GROUPS: { id: AssetGroupFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sweater', label: 'Sweater' },
  { id: 'dress', label: 'Dress' },
  { id: 'set', label: 'Set' },
  { id: 'shirt', label: 'Shirt' },
];

export const StoreOverlay: React.FC<StoreOverlayProps> = ({
  activeTab,
  category,
  assetGroupFilter,
  products,
  isLoadingProducts,
  activeIndex,
  selectedProduct,
  isLoadingProductDetail,
  isQuickViewOpen,
  cart,
  isCartLoading,
  isCartOpen,
  isMenuOpen,
  activeMenuSection,
  theme,
  useGlbModels,
  lightingConfig,
  checkoutOrderCode,
  customPrint = DEFAULT_CUSTOM_PRINT_CONFIG,
  customColorway = DEFAULT_CUSTOM_COLORWAY_CONFIG,
  userColorPalettes = [],
  isDirectDragPrintMode = false,
  isFlippedBack = false,
  onUpdateCustomPrint,
  onUpdateCustomColorway,
  onAddUserColorPalette,
  onRemoveUserColorPalette,
  onToggleDirectDragPrintMode,
  onChangeFlippedBack,
  onSelectTab,
  onSelectAssetGroup,
  onDismissSplash,
  onBack,
  onToggleTheme,
  onToggleGlbMode,
  onChangeLightingConfig,
  onResetLightingConfig,
  onFocusIndex,
  onCloseQuickView,
  onAddToCart,
  onRemoveFromCart,
  onUpdateCartSize,
  onCheckout,
  onOpenCart,
  onOpenMenu,
  onSelectMenuSection,
  onQuickInspectFromMenu,
}) => {
  const [selectedSize, setSelectedSize] = useState<GarmentSize>('L');
  const [showStudioConfig, setShowStudioConfig] = useState(false);
  const [showLightingPanel, setShowLightingPanel] = useState(false);
  const [justAddedFeedback, setJustAddedFeedback] = useState(false);
  const [customPaletteName, setCustomPaletteName] = useState('');
  const [savedPaletteFeedback, setSavedPaletteFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [printPresets, setPrintPresets] = useState<CustomPrintPresetItem[]>([]);
  useEffect(() => {
    setPrintPresets(getCustomPrintPresets());
  }, []);
  const hasActiveCustomPrint = Boolean(
    customPrint.enabled && customPrint.imageUrl
  );

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (sum, item) =>
      sum +
      (item.product.price + (item.customPrintFee || 0)) * item.quantity,
    0
  );

  const showBackButton = activeTab !== 'store' || activeIndex !== null;

  const watermarkTitle =
    assetGroupFilter !== 'all'
      ? `${assetGroupFilter} / clothing`
      : `${category} / clothing`;

  React.useEffect(() => {
    if (selectedProduct && selectedProduct.sizes.length > 0) {
      if (!selectedProduct.sizes.includes(selectedSize)) {
        setSelectedSize(selectedProduct.sizes[0]);
      }
    }
  }, [selectedProduct, selectedSize]);

  const handleQuickAdd = async () => {
    if (!selectedProduct) return;
    await onAddToCart(
      selectedProduct.id,
      selectedSize,
      hasActiveCustomPrint ? customPrint : undefined,
      customColorway.enabled ? customColorway : undefined
    );
    setJustAddedFeedback(true);
    setTimeout(() => setJustAddedFeedback(false), 1200);
  };

  const handleApplyPalette = (palette: ColorPaletteItem) => {
    onUpdateCustomColorway?.((prev) => ({
      ...prev,
      enabled: true,
      paletteId: palette.id,
      paletteName: palette.name,
      primaryColor: palette.primaryColor,
      accentColor: palette.accentColor,
    }));
  };

  const handleSaveCustomPalette = () => {
    if (!onAddUserColorPalette) return;
    const label =
      customPaletteName.trim() ||
      `Custom #${userColorPalettes.length + 1}`;
    const newPalette: ColorPaletteItem = {
      id: `user-palette-${Date.now()}`,
      name: label,
      primaryColor: customColorway.primaryColor,
      accentColor: customColorway.accentColor,
      isCustom: true,
    };
    onAddUserColorPalette(newPalette);
    onUpdateCustomColorway?.((prev) => ({
      ...prev,
      enabled: true,
      paletteId: newPalette.id,
      paletteName: newPalette.name,
    }));
    setCustomPaletteName('');
    setSavedPaletteFeedback(true);
    setTimeout(() => setSavedPaletteFeedback(false), 1200);
  };

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    onUpdateCustomPrint((prev) => ({
      ...prev,
      enabled: true,
      imageUrl: blobUrl,
      presetLabel: file.name,
    }));
    e.target.value = '';
  };

  const handleSelectSide = (side: 'front' | 'back') => {
    onUpdateCustomPrint((prev) => ({
      ...prev,
      side,
    }));
    onChangeFlippedBack(side === 'back');
  };

  return (
    <>
      {/* =====================================================================
          1. STUDIO BACKGROUND WATERMARK ("man / clothing", "woman / clothing", or group)
         ===================================================================== */}
      <div
        className="pointer-events-none fixed inset-x-0 top-[7%] z-0 flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-500"
        style={{ opacity: activeTab === 'store' ? 0.22 : 0.45 }}
      >
        {/* Subtle Oversized Double Quote Emblem Above */}
        <div className="font-serif text-[72px] md:text-[96px] leading-none text-white/25 -mb-6 tracking-tighter">
          &ldquo;&rdquo;
        </div>

        {/* Category / Group Title Watermark */}
        <h1
          key={watermarkTitle}
          className="font-sans font-extrabold text-[11vw] sm:text-[9.5vw] md:text-[8.2vw] leading-[0.9] tracking-[-0.04em] text-white/20 lowercase text-center transition-all duration-500"
        >
          {watermarkTitle}
        </h1>

        {/* Subtle Async Fetch Status Pill */}
        <div
          className={`mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/15 backdrop-blur-sm transition-all duration-300 ${
            isLoadingProducts ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#f2ff00] animate-ping" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#f2ff00]">
            {assetGroupFilter !== 'all'
              ? `Loading /3d-assets/${assetGroupFilter}...`
              : `Fetching /api/products?category=${category}...`}
          </span>
        </div>
      </div>

      {/* =====================================================================
          2. TOP HEADER BAR (Top-Left Pill Toggle + Top-Right Navigation)
         ===================================================================== */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 py-4 md:px-8 md:py-6 pointer-events-none">
        {/* TOP-LEFT UI: Theme Pill Toggle (Moon / Sun) + Studio Render Switch */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle studio lighting theme"
            className="relative flex items-center justify-between w-16 h-8 px-1.5 rounded-full bg-[#111315] border border-white/15 shadow-lg transition-colors hover:border-white/30"
          >
            <Moon
              weight="fill"
              className={`w-3.5 h-3.5 z-10 transition-colors duration-300 ${
                theme === 'studio-dark' ? 'text-black' : 'text-white/70'
              }`}
            />
            <Sun
              weight="fill"
              className={`w-3.5 h-3.5 z-10 transition-colors duration-300 ${
                theme === 'studio-grey' ? 'text-black' : 'text-white/70'
              }`}
            />
            {/* Smooth Sliding White Circle */}
            <span
              className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ease-out ${
                theme === 'studio-grey' ? 'translate-x-8' : 'translate-x-0'
              }`}
            />
          </button>

          {/* Studio 3D Config Popover Trigger (SlidersHorizontal) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowStudioConfig((prev) => !prev);
                setShowLightingPanel(false);
              }}
              className={`h-8 px-2.5 rounded-full flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider border transition-all ${
                showStudioConfig || useGlbModels
                  ? 'bg-[#f2ff00] text-black border-black font-bold'
                  : 'bg-black/75 text-white/85 border-white/15 hover:bg-black'
              }`}
              title="3D Garment Pipeline Settings"
            >
              <SlidersHorizontal weight="bold" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {useGlbModels ? '3D-Assets (.GLB)' : 'Procedural'}
              </span>
            </button>

            {showStudioConfig && (
              <div className="absolute left-0 mt-2 w-72 bg-[#111315]/95 backdrop-blur-md border border-white/15 p-3.5 shadow-2xl text-white font-mono text-xs z-40">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <span className="text-[10px] uppercase tracking-widest text-white/60">
                    3D Mesh Pipeline
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowStudioConfig(false)}
                    className="text-white/50 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-white/75 leading-relaxed mb-3 font-sans">
                  Active source:{' '}
                  <code className="text-[#f2ff00]">
                    {useGlbModels
                      ? '/public/3d-assets/{dress,set,shirt,sweater}'
                      : 'HTML5 Canvas Procedural 3D'}
                  </code>
                </p>
                <button
                  type="button"
                  onClick={onToggleGlbMode}
                  className="w-full py-1.5 px-3 bg-[#f2ff00] text-black font-bold text-[11px] uppercase tracking-wider hover:bg-white transition-colors"
                >
                  Switch to {useGlbModels ? 'Procedural Fallback' : '.GLB 3D Assets'}
                </button>
              </div>
            )}
          </div>

          {/* Real-Time Studio Lighting & Environment Configurator Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowLightingPanel((prev) => !prev);
                setShowStudioConfig(false);
              }}
              className={`h-8 px-3 rounded-full flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider border transition-all shadow-lg ${
                showLightingPanel || lightingConfig.showLightHelpers
                  ? 'bg-[#f2ff00] text-black border-black font-bold'
                  : 'bg-[#111315]/90 text-white border-white/20 hover:border-[#f2ff00] hover:text-[#f2ff00]'
              }`}
              title="Cấu hình nguồn sáng, vị trí đèn (X/Y/Z) & ánh sáng môi trường trực tiếp"
            >
              <LightbulbFilament weight="fill" className="w-3.5 h-3.5" />
              <span>Lighting</span>
            </button>

            {showLightingPanel && (
              <div className="absolute left-0 mt-2 z-50">
                <LightingStudioPanel
                  lightingConfig={lightingConfig}
                  onChangeLightingConfig={onChangeLightingConfig}
                  onResetLightingConfig={onResetLightingConfig}
                  onClose={() => setShowLightingPanel(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* TOP-RIGHT NAVIGATION: <- back | menu | cart */}
        <nav className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          {/* <- back (Only visible when zoomed into rack or focused on a garment) */}
          {showBackButton && (
            <button
              type="button"
              onClick={onBack}
              className="group flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-black/80 hover:bg-[#f2ff00] text-white hover:text-black font-mono text-xs tracking-wider lowercase transition-all duration-200 border border-white/15 shadow-md"
            >
              <ArrowLeft
                weight="bold"
                className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5"
              />
              <span>back</span>
            </button>
          )}

          {/* menu */}
          <button
            type="button"
            onClick={() => onOpenMenu(true)}
            className="h-8 px-4 rounded-full bg-black/80 hover:bg-white text-white hover:text-black font-mono text-xs tracking-wider lowercase transition-all duration-200 border border-white/15 shadow-md"
          >
            menu
          </button>

          {/* cart */}
          <button
            type="button"
            onClick={() => onOpenCart(true)}
            className="group flex items-center gap-1.5 h-8 pl-3.5 pr-2.5 rounded-full bg-black/85 hover:bg-[#f2ff00] text-white hover:text-black font-mono text-xs tracking-wider lowercase transition-all duration-200 border border-white/15 shadow-md"
          >
            <ShoppingBag weight="bold" className="w-3.5 h-3.5" />
            <span>cart</span>
            <span
              className={`ml-0.5 min-w-[20px] h-5 px-1.5 rounded-full font-mono text-[11px] font-bold flex items-center justify-center transition-colors ${
                totalCartItems > 0
                  ? 'bg-[#f2ff00] text-black group-hover:bg-black group-hover:text-[#f2ff00]'
                  : 'bg-white/15 text-white group-hover:bg-black/20 group-hover:text-black'
              }`}
            >
              {totalCartItems}
            </span>
          </button>
        </nav>
      </header>

      {/* =====================================================================
          3. BRAND SPLASH OVERLAY (When 'Store' tab is active)
         ===================================================================== */}
      <div
        onClick={onDismissSplash}
        className={`fixed inset-0 z-20 flex flex-col items-center justify-between py-16 px-6 backdrop-blur-md bg-black/25 transition-all duration-500 cursor-pointer select-none ${
          activeTab === 'store'
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="h-4" />

        {/* Center Brand Cluster */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto my-auto">
          <p className="font-mono text-xs md:text-sm tracking-[0.22em] uppercase text-white/85 mb-2">
            Archive Y2K Brand
          </p>

          {/* Giant Centerpiece Logo: edric studio® with large faint quote at top-left */}
          <div className="relative inline-flex items-center justify-center my-2">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-8 -left-9 md:-top-11 md:-left-12 font-serif text-7xl md:text-9xl text-white/20 leading-none select-none"
            >
              &ldquo;
            </span>
            <h2 className="font-sans font-black text-5xl sm:text-7xl md:text-[88px] tracking-[-0.05em] text-white leading-none drop-shadow-sm whitespace-nowrap">
              edric studio<sup className="text-xl md:text-3xl font-bold ml-1 align-super">®</sup>
            </h2>
          </div>

          {/* Two-Column Text Cluster Below */}
          <div className="mt-7 grid grid-cols-2 gap-6 sm:gap-10 items-start text-left">
            <div className="flex flex-col items-end text-right font-mono text-xs sm:text-sm leading-relaxed text-white/90 tracking-wider">
              <span>Curated</span>
              <span>Drops</span>
              <span>Weekly</span>
            </div>

            <div className="flex flex-col items-start gap-1.5 font-mono text-xs sm:text-sm font-bold tracking-wider">
              <span className="bg-[#f2ff00] text-black px-2 py-0.5 leading-tight shadow-sm">
                Rare pieces
              </span>
              <span className="bg-[#f2ff00] text-black px-2 py-0.5 leading-tight shadow-sm">
                Re-worn
              </span>
              <span className="bg-[#f2ff00] text-black px-2 py-0.5 leading-tight shadow-sm">
                24/7
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Text: edric.studio */}
        <div className="mb-14 flex flex-col items-center gap-1.5">
          <span className="font-mono text-xs md:text-sm tracking-[0.2em] text-white font-semibold">
            edric.studio
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/55">
            [ Click anywhere or select Man / Woman to inspect rack ]
          </span>
        </div>
      </div>

      {/* =====================================================================
          4. 3D-ASSETS FOLDER GROUP BAR, RACK SCRUBBER & BOTTOM-CENTER DOCK
         ===================================================================== */}
      <div className="fixed bottom-5 inset-x-0 z-30 flex flex-col items-center gap-2.5 pointer-events-none">
        {/* 3D-Assets Folder Filter Bar: All | Sweater | Dress | Set | Shirt */}
        {activeTab !== 'store' && (
          <div className="pointer-events-auto flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded-full border border-white/15 shadow-lg">
            <span className="hidden sm:flex items-center gap-1 pl-2 pr-1.5 font-mono text-[10px] uppercase tracking-wider text-white/50">
              <FolderOpen weight="bold" className="w-3 h-3 text-[#f2ff00]" />
              <span>3d-assets:</span>
            </span>
            {ASSET_GROUPS.map((g) => {
              const active = assetGroupFilter === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelectAssetGroup(g.id)}
                  className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] tracking-wider transition-all ${
                    active
                      ? 'bg-[#f2ff00] text-black font-bold'
                      : 'text-white/75 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Garment Rack Quick-Scrubber & Prev/Next Controls */}
        {activeTab !== 'store' && products.length > 0 && (
          <div className="pointer-events-auto flex items-center gap-2 bg-black/55 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={() => {
                if (activeIndex === null) onFocusIndex(0);
                else onFocusIndex((activeIndex - 1 + products.length) % products.length);
              }}
              className="text-white/75 hover:text-[#f2ff00] p-0.5 transition-colors"
              title="Previous garment"
            >
              <CaretLeft weight="bold" className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5 px-1">
              {products.map((item, idx) => {
                const isFocused = activeIndex === idx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onFocusIndex(isFocused ? null : idx)}
                    title={item.name}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isFocused
                        ? 'w-5 bg-[#f2ff00]'
                        : 'w-1.5 bg-white/35 hover:bg-white/75'
                    }`}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                if (activeIndex === null) onFocusIndex(0);
                else onFocusIndex((activeIndex + 1) % products.length);
              }}
              className="text-white/75 hover:text-[#f2ff00] p-0.5 transition-colors"
              title="Next garment"
            >
              <CaretRight weight="bold" className="w-3.5 h-3.5" />
            </button>

            {activeIndex !== null && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                      new KeyboardEvent('keydown', { key: 'f' })
                    );
                  }
                }}
                className="ml-1 pl-2 border-l border-white/15 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#f2ff00] hover:text-white transition-colors"
                title="Flip 180° Front / Back (Shortcut: F)"
              >
                <ArrowsClockwise weight="bold" className="w-3 h-3" />
                <span>[F] Flip 180°</span>
              </button>
            )}
          </div>
        )}

        {/* BOTTOM-CENTER DOCK: Split Left (Black -> Store) & Right (Grey -> Man, Woman) */}
        <div className="pointer-events-auto flex items-stretch rounded-full overflow-hidden shadow-2xl border border-white/15">
          <div className="bg-[#111315] px-2 py-1.5 flex items-center">
            <button
              type="button"
              onClick={() => onSelectTab('store')}
              className={`px-4 py-1.5 rounded-full font-mono text-xs tracking-wider transition-all duration-200 ${
                activeTab === 'store'
                  ? 'bg-[#f2ff00] text-black font-bold shadow-sm'
                  : 'text-white/85 hover:text-white'
              }`}
            >
              Store
            </button>
          </div>

          <div className="bg-[#63686e]/95 backdrop-blur-md px-2 py-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelectTab('man')}
              className={`px-4 py-1.5 rounded-full font-mono text-xs tracking-wider transition-all duration-200 ${
                activeTab === 'man'
                  ? 'bg-[#f2ff00] text-black font-bold shadow-sm'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              Man
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('woman')}
              className={`px-4 py-1.5 rounded-full font-mono text-xs tracking-wider transition-all duration-200 ${
                activeTab === 'woman'
                  ? 'bg-[#f2ff00] text-black font-bold shadow-sm'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              Woman
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          5. Y2K PRODUCT DETAIL & CUSTOM PRINT STUDIO PANEL (No Fullscreen Backdrop!)
         ===================================================================== */}
      {isQuickViewOpen && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-end p-4 sm:p-6 md:p-8">
          <aside className="relative z-10 pointer-events-auto w-full max-w-[390px] max-h-[88vh] overflow-y-auto bg-black/90 text-white border border-white/15 shadow-2xl p-5 font-mono backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/15">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-[#f2ff00]" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                  Archive Spec // {selectedProduct?.id || 'SYNC'}
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseQuickView}
                className="p-1 text-white/60 hover:text-[#f2ff00] transition-colors"
                title="Close Panel"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>

            {isLoadingProductDetail || !selectedProduct ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-[#f2ff00] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs uppercase tracking-widest text-white/70">
                  Fetching Product Spec...
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-white/10 text-white/90">
                    {selectedProduct.category} / {selectedProduct.assetGroup || selectedProduct.type}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-[#f2ff00]/15 text-[#f2ff00] border border-[#f2ff00]/30">
                    {selectedProduct.stock} in archive
                  </span>
                </div>

                <h3 className="font-sans font-black text-xl tracking-tight uppercase text-white mb-0.5">
                  {selectedProduct.name}
                </h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-lg font-bold text-[#f2ff00]">
                    ${selectedProduct.price + (hasActiveCustomPrint ? CUSTOM_PRINT_FEE : 0)}.00 USD
                  </span>
                  {hasActiveCustomPrint && (
                    <span className="text-[10px] text-[#f2ff00]/80 uppercase tracking-wider">
                      (+${CUSTOM_PRINT_FEE} Custom Print)
                    </span>
                  )}
                </div>

                <p className="font-sans text-[11px] text-white/75 leading-relaxed mb-4">
                  {selectedProduct.description}
                </p>

                {/* =========================================================
                    COLORWAY & SURFACE DESIGN STUDIO (Suggested Palettes + Custom Color Picker + Fabric Pattern)
                   ========================================================= */}
                <div className="mb-4 p-3.5 bg-white/[0.04] border border-white/15 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Palette weight="fill" className="w-3.5 h-3.5 text-[#f2ff00]" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#f2ff00]">
                        Colorway & Fabric Design
                      </span>
                    </div>
                    {customColorway.enabled && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCustomColorway?.(() => ({
                            ...DEFAULT_CUSTOM_COLORWAY_CONFIG,
                          }))
                        }
                        className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
                        title="Restore original garment color"
                      >
                        Reset Original
                      </button>
                    )}
                  </div>

                  {/* 1. Garment Surface Design / Pattern Switcher */}
                  <div>
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-white/60 mb-1.5">
                      <span>Thiết kế họa tiết áo (Design Style)</span>
                      <span className="text-[#f2ff00]">
                        {customColorway.enabled ? customColorway.pattern : 'original'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {GARMENT_DESIGN_PATTERNS.map((pat) => {
                        const isActivePat =
                          customColorway.enabled &&
                          customColorway.pattern === pat.id;
                        return (
                          <button
                            key={pat.id}
                            type="button"
                            onClick={() =>
                              onUpdateCustomColorway?.((prev) => ({
                                ...prev,
                                enabled: true,
                                pattern: pat.id as GarmentDesignPattern,
                                primaryColor: prev.enabled
                                  ? prev.primaryColor
                                  : selectedProduct.baseColor || '#141619',
                                accentColor: prev.enabled
                                  ? prev.accentColor
                                  : selectedProduct.accentColor || '#f2ff00',
                              }))
                            }
                            className={`py-1.5 px-1.5 text-[9px] uppercase tracking-wider border truncate transition-all ${
                              isActivePat
                                ? 'bg-[#f2ff00] text-black border-[#f2ff00] font-bold shadow-sm'
                                : 'bg-black/50 text-white/75 border-white/15 hover:border-[#f2ff00]/60 hover:text-white'
                            }`}
                          >
                            {pat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Suggested Colorway Palettes (Bộ màu gợi ý) */}
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-white/60 mb-1.5">
                      Bộ màu gợi ý (Curated Palettes)
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Original Archive Option */}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCustomColorway?.(() => ({
                            ...DEFAULT_CUSTOM_COLORWAY_CONFIG,
                          }))
                        }
                        className={`p-1.5 border text-left flex items-center gap-2 transition-all ${
                          !customColorway.enabled
                            ? 'bg-[#f2ff00]/15 border-[#f2ff00] text-[#f2ff00] font-bold'
                            : 'bg-black/50 border-white/15 text-white/75 hover:border-white/40'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${
                              selectedProduct.baseColor || '#222'
                            } 55%, ${
                              selectedProduct.accentColor ||
                              selectedProduct.baseColor ||
                              '#888'
                            } 45%)`,
                          }}
                        />
                        <span className="text-[9px] uppercase tracking-wider truncate">
                          Original
                        </span>
                      </button>

                      {SUGGESTED_COLOR_PALETTES.map((pal) => {
                        const isSelected =
                          customColorway.enabled &&
                          customColorway.paletteId === pal.id;
                        return (
                          <button
                            key={pal.id}
                            type="button"
                            onClick={() => handleApplyPalette(pal)}
                            className={`p-1.5 border text-left flex items-center gap-2 transition-all ${
                              isSelected
                                ? 'bg-[#f2ff00]/15 border-[#f2ff00] text-[#f2ff00] font-bold'
                                : 'bg-black/50 border-white/15 text-white/75 hover:border-white/40'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${pal.primaryColor} 55%, ${pal.accentColor} 45%)`,
                              }}
                            />
                            <span className="text-[9px] uppercase tracking-wider truncate">
                              {pal.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Customer Custom Color Palettes & Color Picker (Bộ màu khách tự chọn) */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-white/60">
                      <span>Tự phối màu & Lưu bộ màu riêng</span>
                      <span className="text-[#f2ff00]">Custom Mix</span>
                    </div>

                    {/* User-Saved Custom Palettes List */}
                    {userColorPalettes.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {userColorPalettes.map((pal) => {
                          const isSelected =
                            customColorway.enabled &&
                            customColorway.paletteId === pal.id;
                          return (
                            <div
                              key={pal.id}
                              className={`group flex items-center justify-between p-1.5 border transition-all ${
                                isSelected
                                  ? 'bg-[#f2ff00]/15 border-[#f2ff00] text-[#f2ff00] font-bold'
                                  : 'bg-black/50 border-white/15 text-white/75 hover:border-white/40'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleApplyPalette(pal)}
                                className="flex items-center gap-2 min-w-0 flex-1 text-left"
                              >
                                <span
                                  className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                                  style={{
                                    background: `linear-gradient(135deg, ${pal.primaryColor} 55%, ${pal.accentColor} 45%)`,
                                  }}
                                />
                                <span className="text-[9px] uppercase tracking-wider truncate">
                                  {pal.name}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveUserColorPalette?.(pal.id);
                                }}
                                className="ml-1 text-white/40 hover:text-red-400 transition-colors"
                                title="Delete saved palette"
                              >
                                <X weight="bold" className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Dual Color Pickers (Primary Body + Secondary Accent) + Swap */}
                    <div className="flex items-center gap-1.5">
                      <label className="flex-1 flex items-center gap-2 p-1.5 bg-black/60 border border-white/15 cursor-pointer hover:border-[#f2ff00]/60 transition-colors">
                        <input
                          type="color"
                          value={customColorway.primaryColor}
                          onChange={(e) =>
                            onUpdateCustomColorway?.((prev) => ({
                              ...prev,
                              enabled: true,
                              paletteId: 'custom-live',
                              paletteName: 'Custom Mix',
                              primaryColor: e.target.value,
                            }))
                          }
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer p-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[8px] uppercase text-white/50">
                            Màu chính
                          </div>
                          <div className="text-[9px] font-bold uppercase text-white">
                            {customColorway.primaryColor}
                          </div>
                        </div>
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCustomColorway?.((prev) => ({
                            ...prev,
                            enabled: true,
                            paletteId: 'custom-live',
                            paletteName: 'Custom Mix',
                            primaryColor: prev.accentColor,
                            accentColor: prev.primaryColor,
                          }))
                        }
                        className="p-2 bg-black/60 hover:bg-white/15 text-[#f2ff00] border border-white/15 transition-colors"
                        title="Swap Primary & Accent Colors"
                      >
                        <ArrowsLeftRight weight="bold" className="w-3.5 h-3.5" />
                      </button>

                      <label className="flex-1 flex items-center gap-2 p-1.5 bg-black/60 border border-white/15 cursor-pointer hover:border-[#f2ff00]/60 transition-colors">
                        <input
                          type="color"
                          value={customColorway.accentColor}
                          onChange={(e) =>
                            onUpdateCustomColorway?.((prev) => ({
                              ...prev,
                              enabled: true,
                              paletteId: 'custom-live',
                              paletteName: 'Custom Mix',
                              accentColor: e.target.value,
                            }))
                          }
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer p-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[8px] uppercase text-white/50">
                            Màu phối
                          </div>
                          <div className="text-[9px] font-bold uppercase text-white">
                            {customColorway.accentColor}
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Save Custom Palette Row */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={customPaletteName}
                        onChange={(e) => setCustomPaletteName(e.target.value)}
                        placeholder="Tên bộ màu (VD: Neon Cyber)..."
                        className="flex-1 bg-black/60 border border-white/15 focus:border-[#f2ff00] outline-none px-2 py-1.5 text-[10px] text-white placeholder:text-white/35"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCustomPalette}
                        className="px-2.5 py-1.5 bg-[#f2ff00]/15 hover:bg-[#f2ff00] text-[#f2ff00] hover:text-black border border-[#f2ff00]/40 text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1"
                      >
                        {savedPaletteFeedback ? (
                          <>
                            <Check weight="bold" className="w-3 h-3" />
                            <span>Đã lưu</span>
                          </>
                        ) : (
                          <>
                            <Plus weight="bold" className="w-3 h-3" />
                            <span>Lưu bộ màu</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* =========================================================
                    CUSTOM PRINT STUDIO (Upload & Real-Time 3D DTG Decal)
                   ========================================================= */}
                <div className="mb-4 p-3.5 bg-white/[0.04] border border-white/15 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkle weight="fill" className="w-3.5 h-3.5 text-[#f2ff00]" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#f2ff00]">
                        Custom Print Studio
                      </span>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-[#f2ff00]/15 text-[#f2ff00]">
                      +${CUSTOM_PRINT_FEE} DTG
                    </span>
                  </div>

                  {/* 1. Front / Back Print Side Selector (Auto-Flips 3D Garment 180°) */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectSide('front')}
                      className={`py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1 ${
                        customPrint.side === 'front' && !isFlippedBack
                          ? 'bg-[#f2ff00] text-black border-[#f2ff00]'
                          : 'bg-black/60 text-white/75 border-white/15 hover:border-white/40'
                      }`}
                    >
                      <span>Front Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSide('back')}
                      className={`py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1 ${
                        customPrint.side === 'back' || isFlippedBack
                          ? 'bg-[#f2ff00] text-black border-[#f2ff00]'
                          : 'bg-black/60 text-white/75 border-white/15 hover:border-white/40'
                      }`}
                    >
                      <ArrowsClockwise weight="bold" className="w-3 h-3" />
                      <span>Back Print (180°)</span>
                    </button>
                  </div>

                  {/* 2. Upload Image Button + 3 Instant Y2K Presets */}
                  <div className="space-y-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.svg,image/*"
                      onChange={handleFileUploadChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 bg-white/10 hover:bg-[#f2ff00] hover:text-black text-white border border-dashed border-white/30 hover:border-[#f2ff00] text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      <UploadSimple weight="bold" className="w-3.5 h-3.5" />
                      <span>
                        {hasActiveCustomPrint
                          ? `Change Artwork (${customPrint.presetLabel || 'Custom'})`
                          : 'Upload Design (.PNG / .JPG / .WEBP / .SVG)'}
                      </span>
                    </button>

                    {/* 3 Preset Graphic Quick-Test Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                      {printPresets.map((preset) => {
                        const isPresetActive =
                          customPrint.enabled &&
                          customPrint.imageUrl === preset.dataUrl;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              onUpdateCustomPrint((prev) => ({
                                ...prev,
                                enabled: true,
                                imageUrl: preset.dataUrl,
                                presetLabel: preset.label,
                              }))
                            }
                            className={`py-1 px-1.5 text-[9px] uppercase tracking-wider border truncate transition-all ${
                              isPresetActive
                                ? 'bg-[#f2ff00] text-black border-[#f2ff00] font-bold'
                                : 'bg-black/50 text-white/70 border-white/15 hover:border-[#f2ff00]/60 hover:text-white'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Active Artwork Summary & Direct On-Shirt Transform Guide (No Sliders in Popup!) */}
                  {hasActiveCustomPrint && (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between gap-2 p-2 bg-black/60 border border-[#f2ff00]/35">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={customPrint.imageUrl || undefined}
                            alt="Uploaded Design"
                            className="w-9 h-9 object-contain bg-white/10 border border-white/20 p-0.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#f2ff00] truncate">
                              {customPrint.presetLabel || 'Custom Artwork'}
                            </p>
                            <p className="text-[9px] text-white/65 uppercase tracking-wider">
                              {customPrint.side.toUpperCase()} ·{' '}
                              {Math.round(customPrint.scale * 100)}% ·{' '}
                              {Math.round(customPrint.rotation)}°
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateCustomPrint((prev) => ({
                                ...prev,
                                offsetX: DEFAULT_CUSTOM_PRINT_CONFIG.offsetX,
                                offsetY: DEFAULT_CUSTOM_PRINT_CONFIG.offsetY,
                                scale: DEFAULT_CUSTOM_PRINT_CONFIG.scale,
                                rotation: DEFAULT_CUSTOM_PRINT_CONFIG.rotation,
                                opacity: DEFAULT_CUSTOM_PRINT_CONFIG.opacity,
                              }))
                            }
                            className="py-1 px-2 bg-white/10 hover:bg-white/20 text-white text-[9px] uppercase tracking-wider border border-white/15 transition-colors"
                            title="Reset position, size & angle on shirt"
                          >
                            Reset
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onUpdateCustomPrint(() => ({
                                ...DEFAULT_CUSTOM_PRINT_CONFIG,
                              }))
                            }
                            className="p-1.5 bg-red-500/15 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-colors"
                            title="Remove custom print"
                          >
                            <Trash weight="bold" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 px-2.5 py-2 bg-[#f2ff00]/10 border border-[#f2ff00]/30 text-[10px] text-white/85 leading-relaxed">
                        <ArrowsOutCardinal
                          weight="bold"
                          className="w-4 h-4 text-[#f2ff00] shrink-0 mt-0.5"
                        />
                        <span>
                          Click trực tiếp vào hình in trên áo 3D: <strong className="text-[#f2ff00]">kéo giữa hình</strong> để đổi vị trí, <strong className="text-[#f2ff00]">kéo 4 góc</strong> để phóng to/thu nhỏ, hoặc <strong className="text-[#f2ff00]">kéo nút tròn phía trên</strong> để xoay góc.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Size Selector (S, M, L, XL) */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider mb-1.5">
                    <span className="text-white/70">Select Size</span>
                    <span className="text-[#f2ff00]">Archive Fit</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(['S', 'M', 'L', 'XL'] as GarmentSize[]).map((size) => {
                      const available = selectedProduct.sizes.includes(size);
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={!available}
                          onClick={() => setSelectedSize(size)}
                          className={`py-1.5 text-xs font-bold uppercase border transition-all ${
                            !available
                              ? 'border-white/10 text-white/25 cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-[#f2ff00] text-black border-[#f2ff00] shadow-md'
                              : 'bg-transparent text-white border-white/25 hover:border-white'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isCartLoading}
                  onClick={handleQuickAdd}
                  className="w-full py-3 px-4 bg-[#f2ff00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-[0.16em] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {isCartLoading ? (
                    <span>Updating Cart...</span>
                  ) : justAddedFeedback ? (
                    <>
                      <Check weight="bold" className="w-4 h-4" />
                      <span>Added to Archive Bag</span>
                    </>
                  ) : (
                    <>
                      <Plus weight="bold" className="w-4 h-4" />
                      <span>
                        Add to Cart — $
                        {selectedProduct.price +
                          (hasActiveCustomPrint ? CUSTOM_PRINT_FEE : 0)}{' '}
                        ({selectedSize})
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* =====================================================================
          6. CART DRAWER (View items, Change Size, Remove, Simulated Checkout)
         ===================================================================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => onOpenCart(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          <div className="relative z-10 w-full max-w-md bg-[#111315] text-white h-full flex flex-col border-l border-white/15 shadow-2xl font-mono">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/15">
              <div className="flex items-center gap-2.5">
                <ShoppingBag weight="bold" className="w-5 h-5 text-[#f2ff00]" />
                <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
                  Edric Studio® Bag ({totalCartItems})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onOpenCart(false)}
                className="p-1.5 text-white/60 hover:text-white transition-colors"
              >
                <X weight="bold" className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {checkoutOrderCode ? (
                <div className="my-8 p-6 border border-[#f2ff00] bg-[#f2ff00]/10 text-center space-y-3">
                  <Sparkle weight="fill" className="w-8 h-8 text-[#f2ff00] mx-auto" />
                  <div className="text-xs uppercase tracking-widest text-[#f2ff00]">
                    Archive Drop Confirmed
                  </div>
                  <h3 className="font-sans font-black text-2xl text-white">
                    ORDER #{checkoutOrderCode}
                  </h3>
                  <p className="font-sans text-xs text-white/75 leading-relaxed">
                    Your curated Y2K pieces have been reserved. Dispatch notification sent via
                    Edric Studio® priority courier.
                  </p>
                </div>
              ) : cart.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-white/50 space-y-3">
                  <ShoppingBag className="w-10 h-10 stroke-1 opacity-40" />
                  <p className="text-xs uppercase tracking-widest">Your archive bag is empty</p>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCart(false);
                      if (activeTab === 'store') onSelectTab('man');
                    }}
                    className="mt-2 px-4 py-2 bg-[#f2ff00] text-black text-xs font-bold uppercase tracking-wider"
                  >
                    Explore 3D Rack
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-white/5 border border-white/10 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-12 flex-shrink-0 border border-white/25 relative overflow-hidden flex items-center justify-center"
                          style={{
                            backgroundColor: item.customColorway?.enabled
                              ? item.customColorway.primaryColor
                              : item.product.baseColor,
                          }}
                        >
                          {item.customPrint?.enabled && item.customPrint.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.customPrint.imageUrl}
                              alt="Custom print preview"
                              className="w-8 h-8 object-contain z-10 drop-shadow"
                            />
                          ) : (
                            (item.customColorway?.enabled
                              ? item.customColorway.accentColor
                              : item.product.accentColor) && (
                              <div
                                className="absolute inset-x-0 bottom-0 h-4"
                                style={{
                                  backgroundColor: item.customColorway?.enabled
                                    ? item.customColorway.accentColor
                                    : item.product.accentColor,
                                }}
                              />
                            )
                          )}
                        </div>
                        <div>
                          <h4 className="font-sans font-bold text-sm text-white uppercase">
                            {item.product.name}
                          </h4>
                          <p className="text-[11px] text-white/60">
                            ${item.product.price + (item.customPrintFee || 0)} ×{' '}
                            {item.quantity} ={' '}
                            <strong className="text-[#f2ff00]">
                              $
                              {(item.product.price + (item.customPrintFee || 0)) *
                                item.quantity}
                            </strong>
                          </p>
                          {item.customColorway?.enabled && (
                            <div className="mt-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-white/90 bg-white/10 border border-white/20 px-1.5 py-0.5 w-fit">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-white/40 inline-block"
                                style={{
                                  background: `linear-gradient(135deg, ${item.customColorway.primaryColor} 50%, ${item.customColorway.accentColor} 50%)`,
                                }}
                              />
                              <span>
                                {item.customColorway.paletteName} ·{' '}
                                {item.customColorway.pattern}
                              </span>
                            </div>
                          )}
                          {item.customPrint?.enabled && item.customPrint.imageUrl && (
                            <div className="mt-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#f2ff00] bg-[#f2ff00]/10 border border-[#f2ff00]/30 px-1.5 py-0.5 w-fit">
                              <Sparkle weight="fill" className="w-2.5 h-2.5" />
                              <span>
                                Custom {item.customPrint.side.toUpperCase()} Print (+$
                                {item.customPrintFee || CUSTOM_PRINT_FEE}) ·{' '}
                                {Math.round(item.customPrint.scale * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isCartLoading}
                        onClick={() => onRemoveFromCart(item.id)}
                        className="text-white/50 hover:text-red-400 p-1 transition-colors"
                        title="Remove from bag"
                      >
                        <Trash weight="bold" className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
                      <span className="text-white/60 uppercase">Size:</span>
                      <div className="flex items-center gap-1">
                        {(['S', 'M', 'L', 'XL'] as GarmentSize[]).map((sz) => {
                          const supported = item.product.sizes.includes(sz);
                          const active = item.size === sz;
                          return (
                            <button
                              key={sz}
                              type="button"
                              disabled={!supported || isCartLoading}
                              onClick={() => onUpdateCartSize(item.id, sz)}
                              className={`px-2 py-0.5 text-[10px] font-bold uppercase border transition-colors ${
                                active
                                  ? 'bg-[#f2ff00] text-black border-[#f2ff00]'
                                  : supported
                                  ? 'border-white/20 text-white/80 hover:border-white'
                                  : 'border-white/5 text-white/20 cursor-not-allowed'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-white/15 bg-black/60 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 uppercase tracking-wider">Subtotal</span>
                  <span className="text-lg font-bold text-[#f2ff00]">
                    ${cartSubtotal}.00 USD
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-white/50">
                  <span>WORLDWIDE ARCHIVE COURIER</span>
                  <span>FREE</span>
                </div>
                <button
                  type="button"
                  disabled={isCartLoading}
                  onClick={onCheckout}
                  className="w-full py-3.5 bg-[#f2ff00] hover:bg-white text-black font-bold text-xs uppercase tracking-[0.2em] transition-colors shadow-lg disabled:opacity-50"
                >
                  {isCartLoading ? 'Processing Order...' : 'Proceed to Checkout'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          7. MENU MODAL / DRAWER (Collections, Archive 2026, Lookbook, About Edric Studio, FAQ)
         ===================================================================== */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            onClick={() => onOpenMenu(false)}
            className="fixed inset-0 bg-black/65 backdrop-blur-md"
          />

          <div className="relative z-10 w-full max-w-3xl bg-[#111315] text-white border border-white/20 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[420px]">
            <div className="md:col-span-5 bg-black/60 p-6 border-b md:border-b-0 md:border-r border-white/15 flex flex-col justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50 mb-6">
                  edric studio® // directory
                </div>
                <ul className="space-y-2">
                  {MENU_SECTIONS.map((sec) => {
                    const active = activeMenuSection === sec;
                    return (
                      <li key={sec}>
                        <button
                          type="button"
                          onClick={() => onSelectMenuSection(sec)}
                          className={`w-full text-left px-3 py-2 font-mono text-xs uppercase tracking-wider flex items-center justify-between transition-colors ${
                            active
                              ? 'bg-[#f2ff00] text-black font-bold'
                              : 'text-white/80 hover:bg-white/10'
                          }`}
                        >
                          <span>{sec}</span>
                          {active && <span>→</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="pt-6 border-t border-white/10 font-mono text-[11px] text-white/50">
                <div>edric.studio — 24/7 virtual showroom</div>
              </div>
            </div>

            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between font-mono">
              <div>
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/15">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#f2ff00]">
                    // {activeMenuSection}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenMenu(false)}
                    className="p-1 text-white/60 hover:text-white"
                  >
                    <X weight="bold" className="w-5 h-5" />
                  </button>
                </div>

                {activeMenuSection === 'Collections' && (
                  <div className="space-y-4">
                    <p className="font-sans text-xs text-white/75 leading-relaxed">
                      Browse by 3D Asset Folder (<code className="text-[#f2ff00]">/public/3d-assets</code>) or Gender Rack:
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(['sweater', 'dress', 'set', 'shirt'] as const).map((folder) => (
                        <button
                          key={folder}
                          type="button"
                          onClick={() => {
                            onSelectAssetGroup(folder);
                            onOpenMenu(false);
                          }}
                          className="p-2.5 border border-white/20 hover:border-[#f2ff00] text-left transition-colors"
                        >
                          <div className="text-[10px] text-[#f2ff00] uppercase">
                            /3d-assets/{folder}
                          </div>
                          <div className="font-sans font-bold text-xs uppercase mt-0.5">
                            {folder} Collection
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="pt-2 space-y-1.5">
                      <div className="text-[10px] uppercase tracking-widest text-white/50">
                        Active Rack Pieces:
                      </div>
                      {products.slice(0, 3).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onOpenMenu(false);
                            onQuickInspectFromMenu(p);
                          }}
                          className="w-full py-1.5 px-2.5 bg-white/5 hover:bg-[#f2ff00] hover:text-black text-left text-xs flex items-center justify-between transition-colors"
                        >
                          <span className="truncate pr-2">{p.name}</span>
                          <span>${p.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeMenuSection === 'Archive 2026' && (
                  <div className="space-y-3 font-sans text-xs text-white/80 leading-relaxed">
                    <div className="inline-block font-mono text-[10px] bg-[#f2ff00] text-black font-bold px-2 py-0.5 uppercase">
                      Season 04 // Digital Showroom
                    </div>
                    <p>
                      The 2026 Edric Studio® Archive integrates real 3D GLB scans organized across{' '}
                      <code>dress</code>, <code>set</code>, <code>shirt</code>, and{' '}
                      <code>sweater</code> collections.
                    </p>
                    <p className="text-white/60">
                      Every garment is individually cataloged with 3D spatial inspection and
                      verified serial numbering.
                    </p>
                  </div>
                )}

                {activeMenuSection === 'Lookbook' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {products.slice(0, 4).map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onOpenMenu(false);
                          onQuickInspectFromMenu(p);
                        }}
                        className="group p-3 bg-white/5 border border-white/10 hover:border-[#f2ff00] text-left transition-all"
                      >
                        <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
                          <span>LOOK 0{i + 1}</span>
                          <span className="text-[#f2ff00] uppercase">{p.assetGroup}</span>
                        </div>
                        <div className="font-sans font-bold text-xs text-white group-hover:text-[#f2ff00] truncate">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-white/60 mt-0.5">${p.price} USD</div>
                      </button>
                    ))}
                  </div>
                )}

                {activeMenuSection === 'About Edric Studio' && (
                  <div className="space-y-3 font-sans text-xs text-white/80 leading-relaxed">
                    <h4 className="font-bold text-base text-white">
                      Curated Drops. Rare Pieces. Re-worn 24/7.
                    </h4>
                    <p>
                      Edric Studio® is an interactive WebGL archive concept blending high-fashion chrome
                      installations with collectible 3D garments.
                    </p>
                    <p>
                      Built with Next.js App Router, Three.js, React Three Fiber, Drei, Maath
                      60FPS damping, and Phosphor Icons.
                    </p>
                  </div>
                )}

                {activeMenuSection === 'FAQ' && (
                  <div className="space-y-3 font-sans text-xs">
                    <div className="p-2.5 bg-white/5 border border-white/10">
                      <div className="font-bold text-[#f2ff00] mb-0.5">
                        How are the 3D models organized?
                      </div>
                      <p className="text-white/75">
                        Models in <code>/public/3d-assets</code> are grouped into{' '}
                        <code>sweater</code>, <code>dress</code>, <code>set</code>, and{' '}
                        <code>shirt</code>. Use the bottom filter bar to browse any group directly!
                      </p>
                    </div>
                    <div className="p-2.5 bg-white/5 border border-white/10">
                      <div className="font-bold text-[#f2ff00] mb-0.5">
                        Can I switch between .GLB 3D Assets & Procedural mode?
                      </div>
                      <p className="text-white/75">
                        Yes! Use the top-left <code>3D-Assets (.GLB)</code> button to switch live.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-6 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenMenu(false)}
                  className="px-4 py-2 bg-[#f2ff00] text-black text-xs font-bold uppercase tracking-wider"
                >
                  Return to 3D Store
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
