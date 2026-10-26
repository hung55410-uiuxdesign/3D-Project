import {
  AssetGroup,
  CartItem,
  CUSTOM_PRINT_FEE,
  CustomColorwayConfig,
  CustomPrintConfig,
  GarmentSize,
  ProductCategory,
  ProductItem,
} from '@/types/store';

/**
 * Simulated network latency between 300ms and 500ms
 */
export const simulateNetworkDelay = (minMs = 300, maxMs = 500): Promise<void> => {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

export const MOCK_PRODUCTS: ProductItem[] = [
  // ===================== MAN COLLECTION (10 MULTI-MODEL .GLB TEMPLATES IN /public/models/) =====================
  {
    id: 'man-01',
    slug: 'oxide-parachute-jacket',
    name: 'OXIDE PARACHUTE JACKET',
    price: 290,
    category: 'man',
    type: 'jacket',
    assetGroup: 'sweater',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 4,
    description:
      'Early-2000s technical ripstop parachute shell with oxidized matte coating, articulated elbows, and concealed storm zip pockets. (Base Phôi: /models/jacket.glb)',
    modelUrl: '/models/jacket.glb',
    modelConfig: {
      modelUrl: '/models/jacket.glb',
      targetHeight: 1.5,
      hookOffsetY: 0,
      stripBaseColorMap: true,
      stripNormalMap: false,
      roughnessOverride: 0.85,
    },
    baseColor: '#2e332b',
    accentColor: '#171a15',
    patternType: 'solid',
    patternUrl: '/textures/oxide-solid.png',
    decalUrl: 'archive-00',
  },
  {
    id: 'man-02',
    slug: 'archive-long-sleeve',
    name: 'ARCHIVE LONG SLEEVE',
    price: 155,
    category: 'man',
    type: 'hoodie',
    assetGroup: 'sweater',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 7,
    description:
      'Heavyweight vintage-wash indigo long-sleeve sweatshirt with contrast flatlock seams and distressed enzyme finish. (Base Phôi: /models/sweatshirt.glb)',
    modelUrl: '/models/sweatshirt.glb',
    modelConfig: {
      modelUrl: '/models/sweatshirt.glb',
      targetHeight: 1.48,
      hookOffsetY: 0,
      stripBaseColorMap: true,
      stripNormalMap: false,
      roughnessOverride: 0.86,
    },
    baseColor: '#3b4d63',
    accentColor: '#f2ff00',
    patternType: 'custom',
    patternUrl: '/textures/cyber-grid.png',
    decalUrl: 'cyber-star',
  },
  {
    id: 'man-03',
    slug: 'acid-wash-hoodie',
    name: 'ACID WASH HOODIE',
    price: 195,
    category: 'man',
    type: 'hoodie',
    assetGroup: 'sweater',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 9,
    description:
      'Sun-bleached charcoal acid-wash fleece hoodie featuring oversized double-layer hood and archival chest emblem. (Base Phôi: /models/hoodie.glb)',
    modelUrl: '/models/hoodie.glb',
    modelConfig: {
      modelUrl: '/models/hoodie.glb',
      targetHeight: 1.52,
      hookOffsetY: 0,
      stripBaseColorMap: true,
      stripNormalMap: false,
      roughnessOverride: 0.88,
    },
    baseColor: '#272a30',
    accentColor: '#f2ff00',
    patternType: 'tiedye',
    patternUrl: '/textures/silver-stripes.png',
    decalUrl: 'kinetic-loop',
  },
  {
    id: 'man-04',
    slug: 'harness-tee',
    name: 'HARNESS TEE',
    price: 145,
    category: 'man',
    type: 'tshirt',
    assetGroup: 'shirt',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 3,
    description:
      'Signature Edric Studio® archive piece. Washed bone heavyweight cotton tee integrated with crimson tactical harness webbing and silver D-ring hardware. (Base Phôi: /models/tshirt.glb)',
    modelUrl: '/models/tshirt.glb',
    modelConfig: {
      modelUrl: '/models/tshirt.glb',
      targetHeight: 1.44,
      hookOffsetY: 0,
      stripBaseColorMap: true,
      stripNormalMap: false,
      roughnessOverride: 0.85,
    },
    baseColor: '#ecebe6',
    accentColor: '#d91e2a',
    patternType: 'harness',
    patternUrl: '/textures/harness-red.png',
    decalUrl: 'harness-sigil',
  },
  {
    id: 'man-05',
    slug: 'kimi-velour-zip',
    name: 'KIMI VELOUR ZIP',
    price: 210,
    category: 'man',
    type: 'jacket',
    assetGroup: 'sweater',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 5,
    description:
      'Plush Y2K velour track zip jacket in bubblegum pink and optic white horizontal stripes, finished with chrome crest embroidery. (Base Phôi: /models/jacket.glb)',
    modelUrl: '/models/jacket.glb',
    modelConfig: {
      modelUrl: '/models/jacket.glb',
      targetHeight: 1.5,
      hookOffsetY: 0,
      stripBaseColorMap: true,
      stripNormalMap: false,
      roughnessOverride: 0.82,
    },
    baseColor: '#f28bb8',
    accentColor: '#ffffff',
    patternType: 'stripes',
    patternUrl: '/textures/pink-white-stripes.png',
    decalUrl: 'loops-crest',
  },
  {
    id: 'man-06',
    slug: 'halftone-acid-tee',
    name: 'HALFTONE ACID TEE',
    price: 135,
    category: 'man',
    type: 'tshirt',
    assetGroup: 'shirt',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 6,
    description:
      'Hand-treated cobalt & electric yellow tie-dye jersey overprinted with coarse CMYK halftone dot matrix and archival 24/7 graphic. (Base Phôi: /models/tshirt.glb)',
    modelUrl: '/models/tshirt.glb',
    modelConfig: {
      modelUrl: '/models/tshirt.glb',
      targetHeight: 1.44,
      hookOffsetY: 0,
      stripBaseColorMap: true,
      stripNormalMap: false,
      roughnessOverride: 0.85,
    },
    baseColor: '#1565c0',
    accentColor: '#f2ff00',
    patternType: 'tiedye',
    patternUrl: '/textures/acid-tiedye.png',
    decalUrl: 'halftone-acid',
  },
  {
    id: 'man-07',
    slug: 'striped-pink-hoodie',
    name: 'STRIPED PINK HOODIE',
    price: 185,
    category: 'man',
    type: 'hoodie',
    assetGroup: 'sweater',
    sizes: ['M', 'L', 'XL'],
    stock: 2,
    description:
      'Oversized Y2K pastel pink & cream horizontal-striped pullover hoodie with heavy drop shoulders and chest crest. (Base Phôi: /models/hoodie.glb)',
    modelUrl: '/models/hoodie.glb',
    modelConfig: {
      modelUrl: '/models/hoodie.glb',
      targetHeight: 1.52,
      hookOffsetY: 0,
      stripBaseColorMap: true,
      stripNormalMap: false,
      roughnessOverride: 0.86,
    },
    baseColor: '#ec4899',
    accentColor: '#fff1f2',
    patternType: 'stripes',
    patternUrl: '/textures/vortex-harness.png',
    decalUrl: 'loops-crest',
  },
  {
    id: 'man-08',
    slug: 'solar-flare-sweatshirt',
    name: 'SOLAR FLARE SWEATSHIRT',
    price: 175,
    category: 'man',
    type: 'hoodie',
    assetGroup: 'sweater',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 8,
    description:
      'Deep moss-green heavyweight fleece sweatshirt with high-contrast orange cyber decal and enzyme wash finish. (Base Phôi: /models/sweatshirt.glb)',
    modelUrl: '/models/sweatshirt.glb',
    modelConfig: {
      modelUrl: '/models/sweatshirt.glb',
      targetHeight: 1.48,
      hookOffsetY: 0,
      stripBaseColorMap: true,
      stripNormalMap: false,
      roughnessOverride: 0.85,
    },
    baseColor: '#3f4d45',
    accentColor: '#ff5500',
    patternType: 'solid',
    patternUrl: '/textures/solar-tiedye.png',
    decalUrl: 'solar-orb',
  },
  {
    id: 'man-09',
    slug: 'static-cyber-tee',
    name: 'STATIC CYBER TEE',
    price: 130,
    category: 'man',
    type: 'tshirt',
    assetGroup: 'shirt',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 5,
    description:
      'Jet-black heavyweight boxy tee featuring neon yellow cyber grid lines and chest emblem projection. (Base Phôi: /models/tshirt.glb)',
    modelUrl: '/models/tshirt.glb',
    modelConfig: {
      modelUrl: '/models/tshirt.glb',
      targetHeight: 1.44,
      hookOffsetY: 0,
      stripBaseColorMap: true,
      stripNormalMap: false,
      roughnessOverride: 0.85,
    },
    baseColor: '#181a1f',
    accentColor: '#f2ff00',
    patternType: 'custom',
    patternUrl: '/textures/static-custom.png',
    decalUrl: 'cyber-star',
  },
  {
    id: 'man-10',
    slug: 'chrome-bomber',
    name: 'CHROME BOMBER',
    price: 310,
    category: 'man',
    type: 'jacket',
    assetGroup: 'sweater',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 4,
    description:
      'Architectural silver-slate flight bomber jacket with metallic zipper hardware and Y2K angel emblem. (Base Phôi: /models/jacket.glb)',
    modelUrl: '/models/jacket.glb',
    modelConfig: {
      modelUrl: '/models/jacket.glb',
      targetHeight: 1.5,
      hookOffsetY: 0,
      stripBaseColorMap: true,
      stripNormalMap: false,
      roughnessOverride: 0.78,
    },
    baseColor: '#475569',
    accentColor: '#f8fafc',
    patternType: 'solid',
    patternUrl: '/textures/chrome-solid.png',
    decalUrl: 'chrome-angel',
  },

  // ===================== WOMAN COLLECTION (10 PRIMARY ITEMS FROM /3d-assets) =====================
  {
    id: 'woman-01',
    slug: 'starlight-mesh-tank',
    name: 'CHAIN COTTON MINI DRESS',
    price: 175,
    category: 'woman',
    type: 'tank',
    assetGroup: 'dress',
    sizes: ['S', 'M', 'L'],
    stock: 6,
    description:
      'Sleek black sleeveless cotton dress accented with metallic Y2K shoulder chain hardware. (3D Model: /3d-assets/dress/black_sleeveless_cotton_dress_with_chain.glb)',
    modelUrl: '/3d-assets/dress/black_sleeveless_cotton_dress_with_chain.glb',
    baseColor: '#1c1924',
    accentColor: '#f2ff00',
    patternType: 'custom',
    patternUrl: '/textures/starlight-custom.png',
    decalUrl: 'cyber-star',
  },
  {
    id: 'woman-02',
    slug: 'lucid-stripe-hoodie',
    name: 'GREEN & WHITE ARCHIVE HOODIE',
    price: 185,
    category: 'woman',
    type: 'hoodie',
    assetGroup: 'sweater',
    sizes: ['S', 'M', 'L'],
    stock: 4,
    description:
      'Color-blocked emerald green and optic white fleece hoodie with wide sleeves and Edric Studio® crest. (3D Model: /3d-assets/sweater/green_and_white_hoodie.glb)',
    modelUrl: '/3d-assets/sweater/green_and_white_hoodie.glb',
    baseColor: '#10b981',
    accentColor: '#ffffff',
    patternType: 'stripes',
    patternUrl: '/textures/mint-stripes.png',
    decalUrl: 'kinetic-loop',
  },
  {
    id: 'woman-03',
    slug: 'white-knitted-zipper-dress',
    name: 'WHITE KNIT ZIPPER DRESS',
    price: 215,
    category: 'woman',
    type: 'tank',
    assetGroup: 'dress',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 3,
    description:
      'Sculpted optic-white V-neck sleeveless knitted dress with full-length metallic zipper track. (3D Model: /3d-assets/dress/a_white_v-neck_sleeveless_knitted_zipper_dress.glb)',
    modelUrl: '/3d-assets/dress/a_white_v-neck_sleeveless_knitted_zipper_dress.glb',
    baseColor: '#f1f5f9',
    accentColor: '#334155',
    patternType: 'solid',
    patternUrl: '/textures/aero-solid.png',
    decalUrl: 'archive-00',
  },
  {
    id: 'woman-04',
    slug: 'velvet-harness-tee',
    name: 'SATIN CORSET WAIST DRESS',
    price: 240,
    category: 'woman',
    type: 'tshirt',
    assetGroup: 'dress',
    sizes: ['S', 'M', 'L'],
    stock: 5,
    description:
      'Fitted 2001 archive black satin strapless dress featuring structured corset boning at the waist. (3D Model: /3d-assets/dress/black_satin_strapless_corset_waist_dress.glb)',
    modelUrl: '/3d-assets/dress/black_satin_strapless_corset_waist_dress.glb',
    baseColor: '#18181b',
    accentColor: '#e11d48',
    patternType: 'harness',
    patternUrl: '/textures/harness-baby.png',
    decalUrl: 'harness-sigil',
  },
  {
    id: 'woman-05',
    slug: 'kimi-velour-track-zip',
    name: 'KIMI PINK LEATHER JACKET',
    price: 255,
    category: 'woman',
    type: 'jacket',
    assetGroup: 'sweater',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 4,
    description:
      'Iconic Y2K cropped pastel-pink leather moto jacket with asymmetrical silver zip hardware and notched lapels. (3D Model: /3d-assets/sweater/pink_short_leather_jacket.glb)',
    modelUrl: '/3d-assets/sweater/pink_short_leather_jacket.glb',
    baseColor: '#f472b6',
    accentColor: '#fff1f2',
    patternType: 'stripes',
    patternUrl: '/textures/rose-stripes.png',
    decalUrl: 'loops-crest',
  },
  {
    id: 'woman-06',
    slug: 'halftone-acid-baby-tee',
    name: 'WOVEN BUBBLE SLEEVE DRESS',
    price: 228,
    category: 'woman',
    type: 'tshirt',
    assetGroup: 'dress',
    sizes: ['S', 'M', 'L'],
    stock: 7,
    description:
      'Monochrome black and white woven check dress with voluminous architectural bubble sleeves. (3D Model: /3d-assets/dress/black_and_white_woven_bubble_sleeve_dress.glb)',
    modelUrl: '/3d-assets/dress/black_and_white_woven_bubble_sleeve_dress.glb',
    baseColor: '#0284c7',
    accentColor: '#f2ff00',
    patternType: 'tiedye',
    patternUrl: '/textures/cyan-acid-tiedye.png',
    decalUrl: 'halftone-acid',
  },
  {
    id: 'woman-07',
    slug: 'valkyrie-cargo-jacket',
    name: 'ULTRAVIOLET DOWN PUFFER',
    price: 280,
    category: 'woman',
    type: 'jacket',
    assetGroup: 'sweater',
    sizes: ['S', 'M', 'L'],
    stock: 2,
    description:
      'High-volume metallic purple quilted down coat with oversized storm baffles and high collar. (3D Model: /3d-assets/sweater/purple_down_coat.glb)',
    modelUrl: '/3d-assets/sweater/purple_down_coat.glb',
    baseColor: '#6b21a8',
    accentColor: '#f43f5e',
    patternType: 'harness',
    patternUrl: '/textures/valkyrie-harness.png',
    decalUrl: 'vortex-grid',
  },
  {
    id: 'woman-08',
    slug: 'prism-tiedye-hoodie',
    name: 'KNITTED SHORT SWEATER HOODIE',
    price: 190,
    category: 'woman',
    type: 'hoodie',
    assetGroup: 'sweater',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 6,
    description:
      'Textured cable-knit cropped hooded sweater with relaxed drop shoulders and ribbed hem. (3D Model: /3d-assets/sweater/knitted_hooded_short_sweaterhoodie.glb)',
    modelUrl: '/3d-assets/sweater/knitted_hooded_short_sweaterhoodie.glb',
    baseColor: '#7e22ce',
    accentColor: '#f2ff00',
    patternType: 'tiedye',
    patternUrl: '/textures/prism-tiedye.png',
    decalUrl: 'solar-orb',
  },
  {
    id: 'woman-09',
    slug: 'echo-ribbed-tank',
    name: 'WIDE-SHOULDER BLAZER ENSEMBLE',
    price: 325,
    category: 'woman',
    type: 'jacket',
    assetGroup: 'set',
    sizes: ['S', 'M', 'L'],
    stock: 9,
    description:
      'Runway-grade wide-shoulder tailored blazer and pleated mini skirt co-ord set. (3D Model: /3d-assets/set/wide-shoulder_blazer_and_skirt_ensemble.glb)',
    modelUrl: '/3d-assets/set/wide-shoulder_blazer_and_skirt_ensemble.glb',
    baseColor: '#cbd5e1',
    accentColor: '#0f172a',
    patternType: 'solid',
    patternUrl: '/textures/echo-solid.png',
    decalUrl: 'chrome-angel',
  },
  {
    id: 'woman-10',
    slug: 'neon-cyber-tee',
    name: 'ACETATE LOOSE-FIT BLOUSE',
    price: 150,
    category: 'woman',
    type: 'tshirt',
    assetGroup: 'shirt',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 8,
    description:
      'Jet-black lustrous acetate loose-fit blouse with fluid drape and minimalist French cuffs. (3D Model: /3d-assets/shirt/black_acetate_loose-fit_blouse.glb)',
    modelUrl: '/3d-assets/shirt/black_acetate_loose-fit_blouse.glb',
    baseColor: '#111317',
    accentColor: '#f2ff00',
    patternType: 'custom',
    patternUrl: '/textures/neon-cyber.png',
    decalUrl: 'static-skull',
  },

  // ===================== ADDITIONAL 3D-ASSETS CATALOG ITEMS (FOR GROUP BROWSING) =====================
  {
    id: 'set-extra-01',
    slug: 'sheepskin-wool-patchwork-coat-set',
    name: 'SHEEPSKIN PATCHWORK COAT SET',
    price: 420,
    category: 'man',
    type: 'jacket',
    assetGroup: 'set',
    sizes: ['M', 'L', 'XL'],
    stock: 3,
    description:
      'Artisanal shearling sheepskin and wool patchwork coat paired with tailored winter trousers. (3D Model: /3d-assets/set/sheepskin_wool_patchwork_coat_set.glb)',
    modelUrl: '/3d-assets/set/sheepskin_wool_patchwork_coat_set.glb',
    baseColor: '#8d6e63',
    accentColor: '#f5f5dc',
    patternType: 'custom',
    decalUrl: 'archive-00',
  },
  {
    id: 'set-extra-02',
    slug: 'khaki-sports-suit',
    name: 'KHAKI SHORT-SLEEVE SPORTS SET',
    price: 230,
    category: 'man',
    type: 'tshirt',
    assetGroup: 'set',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 6,
    description:
      'Relaxed khaki utility short-sleeved camp shirt and matching knee-length cargo shorts set. (3D Model: /3d-assets/set/khaki_short-sleeved_shorts_sports_suit.glb)',
    modelUrl: '/3d-assets/set/khaki_short-sleeved_shorts_sports_suit.glb',
    baseColor: '#c2b280',
    accentColor: '#1f2937',
    patternType: 'solid',
    decalUrl: 'kinetic-loop',
  },
  {
    id: 'set-extra-03',
    slug: 'white-suit-set',
    name: 'OPTIC WHITE TAILORED SUIT SET',
    price: 390,
    category: 'woman',
    type: 'jacket',
    assetGroup: 'set',
    sizes: ['S', 'M', 'L'],
    stock: 4,
    description:
      'Sharp double-breasted optic white studio suit set with flared trousers. (3D Model: /3d-assets/set/white_suit_set.glb)',
    modelUrl: '/3d-assets/set/white_suit_set.glb',
    baseColor: '#f8fafc',
    accentColor: '#0f172a',
    patternType: 'solid',
    decalUrl: 'loops-crest',
  },
  {
    id: 'set-extra-04',
    slug: 'black-simple-outfit',
    name: 'MONOLITH BLACK SIMPLE OUTFIT',
    price: 275,
    category: 'man',
    type: 'tshirt',
    assetGroup: 'set',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 7,
    description:
      'Minimalist all-black architectural top and relaxed pleated trouser set. (3D Model: /3d-assets/set/black_simple_outfit.glb)',
    modelUrl: '/3d-assets/set/black_simple_outfit.glb',
    baseColor: '#18181b',
    accentColor: '#f2ff00',
    patternType: 'solid',
    decalUrl: 'cyber-star',
  },
  {
    id: 'set-extra-05',
    slug: 'man-black-business-suit',
    name: 'EXECUTIVE BLACK SUIT SET',
    price: 410,
    category: 'man',
    type: 'jacket',
    assetGroup: 'set',
    sizes: ['M', 'L', 'XL'],
    stock: 3,
    description:
      'Structured jet-black wool-blend formal blazer and tailored trouser ensemble. (3D Model: /3d-assets/set/man_black_business_suit.glb)',
    modelUrl: '/3d-assets/set/man_black_business_suit.glb',
    baseColor: '#111827',
    accentColor: '#9ca3af',
    patternType: 'solid',
    decalUrl: 'archive-00',
  },
  {
    id: 'sweater-extra-01',
    slug: 'structured-jacket-coat',
    name: 'ARCHIVE UTILITY JACKET COAT',
    price: 270,
    category: 'man',
    type: 'jacket',
    assetGroup: 'sweater',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 5,
    description:
      'Mid-weight structured utility overcoat with concealed storm placket. (3D Model: /3d-assets/sweater/jacket_coat.glb)',
    modelUrl: '/3d-assets/sweater/jacket_coat.glb',
    baseColor: '#374151',
    accentColor: '#f2ff00',
    patternType: 'solid',
    decalUrl: 'vortex-grid',
  },
  {
    id: 'dress-extra-01',
    slug: 'white-shirt-leather-skirt-outfit',
    name: 'SHIRT & BLACK LEATHER SKIRT',
    price: 245,
    category: 'woman',
    type: 'jacket',
    assetGroup: 'dress',
    sizes: ['S', 'M', 'L'],
    stock: 5,
    description:
      'Crisp tailored poplin shirt paired with a high-waist black leather mini skirt. (3D Model: /3d-assets/dress/white_shirt_black_leather_skirt_outfit.glb)',
    modelUrl: '/3d-assets/dress/white_shirt_black_leather_skirt_outfit.glb',
    baseColor: '#f8fafc',
    accentColor: '#111827',
    patternType: 'solid',
    decalUrl: 'loops-crest',
  },
  {
    id: 'dress-extra-02',
    slug: 'jk-school-uniform-archive',
    name: 'TOKYO JK ARCHIVE UNIFORM',
    price: 210,
    category: 'woman',
    type: 'jacket',
    assetGroup: 'dress',
    sizes: ['S', 'M', 'L'],
    stock: 6,
    description:
      'Authentic Shibuya archive pleated uniform set with contrast sailor collar tie. (3D Model: /3d-assets/dress/jk_school_uniform.glb)',
    modelUrl: '/3d-assets/dress/jk_school_uniform.glb',
    baseColor: '#1e293b',
    accentColor: '#e11d48',
    patternType: 'stripes',
    decalUrl: 'kinetic-loop',
  },
  {
    id: 'dress-extra-03',
    slug: 'polka-dot-vintage-dress',
    name: 'RETRO POLKA DOT MIDI DRESS',
    price: 195,
    category: 'woman',
    type: 'tshirt',
    assetGroup: 'dress',
    sizes: ['S', 'M', 'L'],
    stock: 4,
    description:
      'Fluid vintage polka-dot printed midi dress with cinched waist silhouette. (3D Model: /3d-assets/dress/polka_dot_dress.glb)',
    modelUrl: '/3d-assets/dress/polka_dot_dress.glb',
    baseColor: '#18181b',
    accentColor: '#ffffff',
    patternType: 'custom',
    decalUrl: 'halftone-acid',
  },
  {
    id: 'dress-extra-04',
    slug: 'golden-sequin-halter-gown',
    name: 'GOLDEN SEQUIN HALTER GOWN',
    price: 380,
    category: 'woman',
    type: 'tank',
    assetGroup: 'dress',
    sizes: ['S', 'M', 'L'],
    stock: 2,
    description:
      'Luminous golden sequin halter-neck evening gown with dramatic high side slit. (3D Model: /3d-assets/dress/golden_sequin_halter_neck_high-slit_evening_gown.glb)',
    modelUrl: '/3d-assets/dress/golden_sequin_halter_neck_high-slit_evening_gown.glb',
    baseColor: '#eab308',
    accentColor: '#fef08a',
    patternType: 'custom',
    decalUrl: 'solar-orb',
  },
  {
    id: 'dress-extra-05',
    slug: 'black-satin-spaghetti-dress',
    name: 'BLACK SATIN SLIP DRESS',
    price: 185,
    category: 'woman',
    type: 'tank',
    assetGroup: 'dress',
    sizes: ['S', 'M', 'L'],
    stock: 8,
    description:
      '90s minimalist bias-cut black liquid satin spaghetti-strap slip dress. (3D Model: /3d-assets/dress/black_satin_spaghetti_strap_dress.glb)',
    modelUrl: '/3d-assets/dress/black_satin_spaghetti_strap_dress.glb',
    baseColor: '#09090b',
    accentColor: '#f2ff00',
    patternType: 'solid',
    decalUrl: 'chrome-angel',
  },
];

// In-memory client fallback cart state synced with /api/cart
let clientCartCache: CartItem[] = [
  {
    id: 'man-04_L',
    productId: 'man-04',
    product: MOCK_PRODUCTS[3],
    size: 'L',
    quantity: 1,
    addedAt: Date.now() - 60000,
  },
];

/**
 * Helper to get 10 primary products filtered by category ('man' | 'woman')
 */
export function getMockProductsByCategory(category: ProductCategory): ProductItem[] {
  return MOCK_PRODUCTS.filter((item) => item.category === category).slice(0, 10);
}

/**
 * Helper to get products filtered by 3D asset folder group ('dress' | 'set' | 'shirt' | 'sweater')
 */
export function getMockProductsByAssetGroup(group: AssetGroup): ProductItem[] {
  return MOCK_PRODUCTS.filter((item) => item.assetGroup === group).slice(0, 12);
}

/**
 * Helper to find a single product by ID
 */
export function getMockProductById(id: string): ProductItem | null {
  return MOCK_PRODUCTS.find((item) => item.id === id) ?? null;
}

/**
 * 1. Fetch 10 products belonging to 'man' or 'woman' category via Next.js App Router API + simulated delay
 */
export async function fetchProductsByCategory(
  category: 'man' | 'woman'
): Promise<ProductItem[]> {
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch(`/api/products?category=${encodeURIComponent(category)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        return data.products as ProductItem[];
      }
    } catch {
      // Fallback to local promise simulation if offline
    }
  }
  await simulateNetworkDelay(300, 500);
  return getMockProductsByCategory(category);
}

/**
 * 1b. Fetch products by 3D asset folder ('dress' | 'set' | 'shirt' | 'sweater') in /public/3d-assets
 */
export async function fetchProductsByAssetGroup(
  group: AssetGroup
): Promise<ProductItem[]> {
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch(`/api/products?group=${encodeURIComponent(group)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        return data.products as ProductItem[];
      }
    } catch {
      // Fallback
    }
  }
  await simulateNetworkDelay(300, 500);
  return getMockProductsByAssetGroup(group);
}

/**
 * 2. Fetch detailed product info when user clicks the yellow garment label
 */
export async function fetchProductById(id: string): Promise<ProductItem | null> {
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        return (data.product as ProductItem) ?? null;
      }
    } catch {
      // Fallback
    }
  }
  await simulateNetworkDelay(300, 450);
  return getMockProductById(id);
}

/**
 * 3. Fetch current cart items from /api/cart
 */
export async function fetchCartMock(): Promise<CartItem[]> {
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/cart', {
        method: 'GET',
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        clientCartCache = data.cart;
        return clientCartCache;
      }
    } catch {
      // Fallback
    }
  }
  await simulateNetworkDelay(300, 400);
  return [...clientCartCache];
}

/**
 * 4. Add product + size to cart via /api/cart (simulated REST POST with 300-500ms latency)
 */
export async function addToCartMock(
  productId: string,
  size: string,
  customPrint?: CustomPrintConfig,
  customColorway?: CustomColorwayConfig
): Promise<CartItem[]> {
  const validSize = (['S', 'M', 'L', 'XL'].includes(size) ? size : 'L') as GarmentSize;
  const hasActivePrint = Boolean(customPrint?.enabled && customPrint?.imageUrl);
  const printPayload = hasActivePrint ? { ...customPrint! } : undefined;
  const customPrintFee = hasActivePrint ? CUSTOM_PRINT_FEE : 0;
  const colorwayPayload = customColorway?.enabled ? { ...customColorway } : undefined;

  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          size: validSize,
          customPrint: printPayload,
          customPrintFee,
          customColorway: colorwayPayload,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        clientCartCache = data.cart;
        return clientCartCache;
      }
    } catch {
      // Fallback below
    }
  }

  await simulateNetworkDelay(300, 500);
  const product = getMockProductById(productId);
  if (!product) return [...clientCartCache];

  const printSuffix = printPayload
    ? `_${printPayload.side}_${Math.round(printPayload.offsetX * 100)}_${Math.round(printPayload.offsetY * 100)}_${Math.round(printPayload.scale * 100)}`
    : '';
  const colorSuffix = colorwayPayload
    ? `_${colorwayPayload.primaryColor}_${colorwayPayload.accentColor}_${colorwayPayload.pattern}`
    : '';
  const cartItemId = `${productId}_${validSize}${printSuffix}${colorSuffix}`;
  const existingIndex = clientCartCache.findIndex((item) => item.id === cartItemId);

  if (existingIndex > -1) {
    clientCartCache = clientCartCache.map((item, idx) =>
      idx === existingIndex
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
    clientCartCache = [
      ...clientCartCache,
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

  return [...clientCartCache];
}

/**
 * 5. Remove item from cart by cartItemId via /api/cart
 */
export async function removeFromCartMock(cartItemId: string): Promise<CartItem[]> {
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch(`/api/cart?cartItemId=${encodeURIComponent(cartItemId)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        const data = await response.json();
        clientCartCache = data.cart;
        return clientCartCache;
      }
    } catch {
      // Fallback below
    }
  }

  await simulateNetworkDelay(300, 450);
  clientCartCache = clientCartCache.filter((item) => item.id !== cartItemId);
  return [...clientCartCache];
}

/**
 * 6. Update size of an existing cart item via /api/cart PATCH
 */
export async function updateCartItemSizeMock(
  cartItemId: string,
  newSize: GarmentSize
): Promise<CartItem[]> {
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId, newSize }),
      });
      if (response.ok) {
        const data = await response.json();
        clientCartCache = data.cart;
        return clientCartCache;
      }
    } catch {
      // Fallback below
    }
  }

  await simulateNetworkDelay(300, 450);
  const target = clientCartCache.find((item) => item.id === cartItemId);
  if (!target) return [...clientCartCache];

  const newId = `${target.productId}_${newSize}`;
  if (newId === cartItemId) return [...clientCartCache];

  const duplicate = clientCartCache.find((item) => item.id === newId);
  if (duplicate) {
    clientCartCache = clientCartCache
      .filter((item) => item.id !== cartItemId)
      .map((item) =>
        item.id === newId ? { ...item, quantity: item.quantity + target.quantity } : item
      );
  } else {
    clientCartCache = clientCartCache.map((item) =>
      item.id === cartItemId ? { ...item, id: newId, size: newSize } : item
    );
  }
  return [...clientCartCache];
}

/**
 * 7. Simulated Checkout API call
 */
export async function checkoutCartMock(): Promise<{
  success: boolean;
  orderCode: string;
  cart: CartItem[];
}> {
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/cart?checkout=true', {
        method: 'DELETE',
      });
      if (response.ok) {
        const data = await response.json();
        clientCartCache = [];
        return {
          success: true,
          orderCode: data.orderCode || `LP-${Math.floor(100000 + Math.random() * 900000)}`,
          cart: [],
        };
      }
    } catch {
      // Fallback
    }
  }

  await simulateNetworkDelay(400, 500);
  clientCartCache = [];
  return {
    success: true,
    orderCode: `LP-${Math.floor(100000 + Math.random() * 900000)}`,
    cart: [],
  };
}
