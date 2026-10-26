export type ProductCategory = 'man' | 'woman';
export type GarmentType = 'tshirt' | 'hoodie' | 'jacket' | 'tank';
export type GarmentSize = 'S' | 'M' | 'L' | 'XL';
export type PatternType = 'solid' | 'tiedye' | 'stripes' | 'harness' | 'custom';
export type AssetGroup = 'dress' | 'set' | 'shirt' | 'sweater';
export type AssetGroupFilter = 'all' | AssetGroup;

export interface GarmentModelConfig {
  modelUrl: string;                 // VD: '/models/hoodie_style3d.glb', '/models/tshirt_blank.glb'
  targetHeight?: number;            // Chiều cao chuẩn hóa trên giá treo (mặc định: 1.65 đơn vị)
  hookOffsetY?: number;             // Độ lệch trục Y để cổ áo khớp chính xác vào móc treo
  stripBaseColorMap?: boolean;      // Mặc định true: Xóa sạch ảnh BaseColor gốc (chứa logo Style3D/brand cũ)
  stripNormalMap?: boolean;         // Mặc định false: Giữ lại nếp nhăn vải, chỉ bật true nếu logo bị khắc vào Normal Map
  roughnessOverride?: number;       // Độ nhám vải (mặc định 0.85 cho cotton/nỉ)
  hiddenMeshKeywords?: string[];    // Từ khóa bổ sung để ẩn mesh thừa nếu cần
}

export interface ProductItem {
  id: string;
  slug: string;
  name: string;               // VD: 'HARNESS TEE', 'KIMI VELOUR ZIP', 'HALFTONE ACID TEE'
  price: number;              // Giá tiền (USD)
  category: 'man' | 'woman';  // Phục vụ lọc theo tab Man / Woman ở thanh dưới cùng
  type: 'tshirt' | 'hoodie' | 'jacket' | 'tank';
  assetGroup?: AssetGroup;    // Phân nhóm thư mục trong /3d-assets (dress | set | shirt | sweater)
  sizes: ('S' | 'M' | 'L' | 'XL')[];
  stock: number;
  description: string;
  modelUrl?: string;          // Đường dẫn file .glb (VD: '/models/hoodie.glb' hoặc '/3d-assets/...')
  modelConfig?: GarmentModelConfig; // Cấu hình đa model linh hoạt cho UniversalGarmentGLB
  baseColor: string;          // Màu vải chính (HEX)
  accentColor?: string;       // Màu bo cổ / tay áo (HEX)
  patternType?: 'solid' | 'tiedye' | 'stripes' | 'harness' | 'custom';
  patternUrl?: string;        // Ảnh texture phủ toàn thân áo
  decalUrl?: string;          // Ảnh PNG graphic in lên ngực áo
  backDecalUrl?: string;      // Ảnh PNG graphic tùy chọn in ở mặt lưng áo
}

export interface CustomPrintConfig {
  enabled: boolean;
  side: 'front' | 'back';       // Mặt in: Trước ngực hoặc Sau lưng
  imageUrl: string | null;      // Blob URL từ file người dùng upload hoặc preset mẫu
  presetLabel?: string;         // Tên file hoặc preset
  offsetX: number;              // Vị trí ngang (-0.45 đến +0.45, mặc định 0)
  offsetY: number;              // Vị trí dọc (-0.45 đến +0.45, mặc định 0.08)
  scale: number;                // Kích thước (0.12 đến 0.85, mặc định 0.32)
  rotation: number;             // Góc xoay độ (-180 đến 180, mặc định 0)
  opacity: number;              // Độ hòa trộn vào sớ vải (0.5 đến 1.0, mặc định 0.95)
}

export const CUSTOM_PRINT_FEE = 15;

export const DEFAULT_CUSTOM_PRINT_CONFIG: CustomPrintConfig = {
  enabled: false,
  side: 'front',
  imageUrl: null,
  offsetX: 0,
  offsetY: 0.08,
  scale: 0.32,
  rotation: 0,
  opacity: 0.95,
};

export type GarmentDesignPattern =
  | 'solid'
  | 'colorblock'
  | 'gradient'
  | 'stripes'
  | 'grid'
  | 'acid';

export interface ColorPaletteItem {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  isCustom?: boolean;
}

export interface CustomColorwayConfig {
  enabled: boolean;
  paletteId: string;
  paletteName: string;
  primaryColor: string;
  accentColor: string;
  pattern: GarmentDesignPattern;
}

export const DEFAULT_CUSTOM_COLORWAY_CONFIG: CustomColorwayConfig = {
  enabled: false,
  paletteId: 'original',
  paletteName: 'Original Archive',
  primaryColor: '#16181c',
  accentColor: '#f2ff00',
  pattern: 'solid',
};

export const SUGGESTED_COLOR_PALETTES: ColorPaletteItem[] = [
  {
    id: 'obsidian-acid',
    name: 'Obsidian Acid',
    primaryColor: '#141619',
    accentColor: '#f2ff00',
  },
  {
    id: 'chalk-cobalt',
    name: 'Chalk Cobalt',
    primaryColor: '#f2f0eb',
    accentColor: '#1d4ed8',
  },
  {
    id: 'crimson-onyx',
    name: 'Crimson Onyx',
    primaryColor: '#7f1d1d',
    accentColor: '#18181b',
  },
  {
    id: 'sage-cream',
    name: 'Sage Cream',
    primaryColor: '#4a6b53',
    accentColor: '#f5efe1',
  },
  {
    id: 'cyber-violet',
    name: 'Cyber Violet',
    primaryColor: '#2e1065',
    accentColor: '#c084fc',
  },
  {
    id: 'sand-espresso',
    name: 'Sand Espresso',
    primaryColor: '#d4c3ad',
    accentColor: '#3e2c23',
  },
];

export const GARMENT_DESIGN_PATTERNS: {
  id: GarmentDesignPattern;
  label: string;
  shaderCode: number;
}[] = [
  { id: 'solid', label: 'Solid / Trim', shaderCode: 0 },
  { id: 'colorblock', label: '2-Tone Split', shaderCode: 1 },
  { id: 'gradient', label: 'Ombre Fade', shaderCode: 2 },
  { id: 'stripes', label: 'Pinstripe', shaderCode: 3 },
  { id: 'grid', label: 'Cyber Grid', shaderCode: 4 },
  { id: 'acid', label: 'Acid Marble', shaderCode: 5 },
];

export interface CartItem {
  id: string;                 // Unique cartItemId (e.g., `${productId}_${size}`)
  productId: string;
  product: ProductItem;
  size: GarmentSize;
  quantity: number;
  addedAt: number;
  customPrint?: CustomPrintConfig;
  customPrintFee?: number;
  customColorway?: CustomColorwayConfig;
}

export type ActiveTab = 'store' | 'man' | 'woman';
export type CameraViewMode = 'overview' | 'rack' | 'focus';
export type StudioTheme = 'studio-grey' | 'studio-dark';
export type MenuSection = 'Collections' | 'Archive 2026' | 'Lookbook' | 'About Edric Studio' | 'FAQ';

export type EnvironmentPresetName =
  | 'studio'
  | 'city'
  | 'apartment'
  | 'warehouse'
  | 'dawn'
  | 'sunset'
  | 'lobby'
  | 'park'
  | 'forest'
  | 'night';

export interface LightSourceConfig {
  id: string;
  name: string;
  enabled: boolean;
  intensity: number;
  color: string;
  position: [number, number, number];
}

export interface StudioLightingConfig {
  presetId: string;
  envPreset: EnvironmentPresetName;
  envIntensity: number;
  exposure: number;
  ambientIntensity: number;
  ambientSkyColor: string;
  ambientGroundColor: string;
  contactShadowOpacity: number;
  showLightHelpers: boolean;
  keyLight: LightSourceConfig;
  fillLight: LightSourceConfig;
  rimLight: LightSourceConfig;
}

export interface StoreState {
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
}
