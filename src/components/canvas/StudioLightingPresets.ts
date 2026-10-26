import { StudioLightingConfig } from '@/types/store';

export interface LightingPresetOption {
  id: string;
  label: string;
  description: string;
  config: Omit<StudioLightingConfig, 'showLightHelpers'>;
}

export const STUDIO_LIGHTING_PRESETS: LightingPresetOption[] = [
  {
    id: 'balanced-boutique',
    label: 'Balanced Boutique (Default)',
    description:
      'Symmetric left & right front lights + soft overhead beauty light so both dark and light garments show crisp folds from every rack angle.',
    config: {
      presetId: 'balanced-boutique',
      envPreset: 'studio',
      envIntensity: 0.34,
      exposure: 0.88,
      ambientIntensity: 0.56,
      ambientSkyColor: '#ffffff',
      ambientGroundColor: '#3a3f47',
      contactShadowOpacity: 0.52,
      keyLight: {
        id: 'key',
        name: 'Key Light (Right-Front)',
        enabled: true,
        intensity: 1.15,
        color: '#fffcf5',
        position: [3.2, 4.4, 4.6],
      },
      fillLight: {
        id: 'fill',
        name: 'Fill Light (Left-Front)',
        enabled: true,
        intensity: 1.05,
        color: '#f4f8ff',
        position: [-3.4, 3.8, 4.8],
      },
      rimLight: {
        id: 'rim',
        name: 'Top / Rim Light (Center-High)',
        enabled: true,
        intensity: 0.58,
        color: '#ffffff',
        position: [0.0, 5.6, 2.2],
      },
    },
  },
  {
    id: 'sketchfab-daylight',
    label: 'Sketchfab Soft Daylight',
    description:
      'Bright, clean 360° showroom illumination ideal for inspecting dark fabrics, stitching details, and patterns.',
    config: {
      presetId: 'sketchfab-daylight',
      envPreset: 'city',
      envIntensity: 0.45,
      exposure: 0.96,
      ambientIntensity: 0.72,
      ambientSkyColor: '#ffffff',
      ambientGroundColor: '#525862',
      contactShadowOpacity: 0.45,
      keyLight: {
        id: 'key',
        name: 'Key Light (Right-Front)',
        enabled: true,
        intensity: 1.25,
        color: '#ffffff',
        position: [2.8, 4.2, 5.0],
      },
      fillLight: {
        id: 'fill',
        name: 'Fill Light (Left-Front)',
        enabled: true,
        intensity: 1.15,
        color: '#eef6ff',
        position: [-3.2, 3.6, 5.0],
      },
      rimLight: {
        id: 'rim',
        name: 'Top / Rim Light (Center-High)',
        enabled: true,
        intensity: 0.65,
        color: '#fffdf7',
        position: [0.0, 5.2, -2.5],
      },
    },
  },
  {
    id: 'runway-contrast',
    label: 'High-Contrast Runway',
    description:
      'Dramatic directional key light with deep fold shadows and crisp edge rim lighting.',
    config: {
      presetId: 'runway-contrast',
      envPreset: 'warehouse',
      envIntensity: 0.25,
      exposure: 0.84,
      ambientIntensity: 0.36,
      ambientSkyColor: '#e2e8f0',
      ambientGroundColor: '#1e2024',
      contactShadowOpacity: 0.65,
      keyLight: {
        id: 'key',
        name: 'Key Light (Right-Front)',
        enabled: true,
        intensity: 1.55,
        color: '#fff9eb',
        position: [3.8, 5.0, 3.8],
      },
      fillLight: {
        id: 'fill',
        name: 'Fill Light (Left-Front)',
        enabled: true,
        intensity: 0.65,
        color: '#cbd5e1',
        position: [-3.8, 2.8, 4.2],
      },
      rimLight: {
        id: 'rim',
        name: 'Top / Rim Light (Center-High)',
        enabled: true,
        intensity: 0.85,
        color: '#f2ff00',
        position: [0.0, 5.4, -3.0],
      },
    },
  },
  {
    id: 'warm-editorial',
    label: 'Warm Editorial Showroom',
    description:
      'Golden-hour luxury boutique warmth with soft amber highlights and neutral fill.',
    config: {
      presetId: 'warm-editorial',
      envPreset: 'apartment',
      envIntensity: 0.38,
      exposure: 0.9,
      ambientIntensity: 0.55,
      ambientSkyColor: '#fff5e6',
      ambientGroundColor: '#3f3832',
      contactShadowOpacity: 0.5,
      keyLight: {
        id: 'key',
        name: 'Key Light (Right-Front)',
        enabled: true,
        intensity: 1.3,
        color: '#ffedd5',
        position: [3.0, 4.5, 4.5],
      },
      fillLight: {
        id: 'fill',
        name: 'Fill Light (Left-Front)',
        enabled: true,
        intensity: 0.95,
        color: '#f1f5f9',
        position: [-3.2, 3.6, 4.5],
      },
      rimLight: {
        id: 'rim',
        name: 'Top / Rim Light (Center-High)',
        enabled: true,
        intensity: 0.5,
        color: '#fde68a',
        position: [0.0, 5.5, 1.8],
      },
    },
  },
];

export const DEFAULT_STUDIO_LIGHTING: StudioLightingConfig = {
  ...STUDIO_LIGHTING_PRESETS[0].config,
  showLightHelpers: false,
};
