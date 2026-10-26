'use client';

import React, { useState } from 'react';
import {
  ArrowCounterClockwise,
  Check,
  Copy,
  Eye,
  EyeSlash,
  LightbulbFilament,
  Sparkle,
  SunDim,
  X,
} from '@phosphor-icons/react';
import {
  EnvironmentPresetName,
  LightSourceConfig,
  StudioLightingConfig,
} from '@/types/store';
import { STUDIO_LIGHTING_PRESETS } from '@/components/canvas/StudioLightingPresets';

export interface LightingStudioPanelProps {
  lightingConfig: StudioLightingConfig;
  onChangeLightingConfig: (next: StudioLightingConfig) => void;
  onResetLightingConfig: () => void;
  onClose: () => void;
}

const ENV_PRESETS: { id: EnvironmentPresetName; label: string }[] = [
  { id: 'studio', label: 'Studio (Softbox)' },
  { id: 'apartment', label: 'Apartment (Daylight)' },
  { id: 'warehouse', label: 'Warehouse (Loft)' },
  { id: 'city', label: 'City (Neutral)' },
  { id: 'lobby', label: 'Lobby (Warm)' },
  { id: 'dawn', label: 'Dawn (Soft Rose)' },
  { id: 'sunset', label: 'Sunset (Golden)' },
  { id: 'park', label: 'Park (Outdoor)' },
  { id: 'forest', label: 'Forest (Diffused)' },
  { id: 'night', label: 'Night (Moody)' },
];

type ActiveLightKey = 'keyLight' | 'fillLight' | 'rimLight';

export const LightingStudioPanel: React.FC<LightingStudioPanelProps> = ({
  lightingConfig,
  onChangeLightingConfig,
  onResetLightingConfig,
  onClose,
}) => {
  const [activeLightTab, setActiveLightTab] =
    useState<ActiveLightKey>('keyLight');
  const [copiedJson, setCopiedJson] = useState(false);

  const activeLight: LightSourceConfig = lightingConfig[activeLightTab];

  const handleUpdateLight = (
    key: ActiveLightKey,
    patch: Partial<LightSourceConfig>
  ) => {
    onChangeLightingConfig({
      ...lightingConfig,
      [key]: {
        ...lightingConfig[key],
        ...patch,
      },
    });
  };

  const handleUpdateLightAxis = (
    key: ActiveLightKey,
    axisIndex: 0 | 1 | 2,
    value: number
  ) => {
    const nextPos: [number, number, number] = [
      ...lightingConfig[key].position,
    ] as [number, number, number];
    nextPos[axisIndex] = value;
    handleUpdateLight(key, { position: nextPos });
  };

  const handleCopyConfig = () => {
    navigator.clipboard?.writeText(JSON.stringify(lightingConfig, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1500);
  };

  return (
    <div className="w-[340px] sm:w-[375px] max-h-[82vh] flex flex-col bg-[#111315]/95 backdrop-blur-xl border border-white/20 shadow-2xl text-white font-mono text-xs select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/15 bg-black/50">
        <div className="flex items-center gap-2">
          <LightbulbFilament
            weight="fill"
            className="w-4 h-4 text-[#f2ff00]"
          />
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white">
            Studio Lighting &amp; Env
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              onChangeLightingConfig({
                ...lightingConfig,
                showLightHelpers: !lightingConfig.showLightHelpers,
              })
            }
            className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 border transition-colors ${
              lightingConfig.showLightHelpers
                ? 'bg-[#f2ff00] text-black border-[#f2ff00] font-bold'
                : 'bg-white/5 text-white/75 border-white/15 hover:text-white'
            }`}
            title="Hiển thị quả cầu vị trí đèn và tia sáng trong không gian 3D"
          >
            {lightingConfig.showLightHelpers ? (
              <Eye weight="bold" className="w-3 h-3" />
            ) : (
              <EyeSlash weight="bold" className="w-3 h-3" />
            )}
            <span>3D Gizmo</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white transition-colors"
            title="Close lighting panel"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* 1. Curated Studio Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-white/55 flex items-center gap-1">
              <Sparkle weight="fill" className="w-3 h-3 text-[#f2ff00]" />
              Presets Ánh Sáng Mẫu
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {STUDIO_LIGHTING_PRESETS.map((preset) => {
              const isCurrent =
                lightingConfig.envPreset === preset.config.envPreset &&
                Math.abs(lightingConfig.exposure - preset.config.exposure) <
                  0.005 &&
                Math.abs(
                  lightingConfig.keyLight.intensity -
                    preset.config.keyLight.intensity
                ) < 0.01 &&
                Math.abs(
                  lightingConfig.fillLight.intensity -
                    preset.config.fillLight.intensity
                ) < 0.01;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    onChangeLightingConfig({
                      ...preset.config,
                      showLightHelpers: lightingConfig.showLightHelpers,
                    })
                  }
                  className={`text-left p-2 border transition-all ${
                    isCurrent
                      ? 'bg-[#f2ff00]/15 border-[#f2ff00] text-[#f2ff00]'
                      : 'bg-white/5 border-white/10 text-white/80 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-[10px] truncate">
                    {preset.label}
                  </div>
                  <div className="text-[9px] text-white/50 truncate mt-0.5 font-sans">
                    {preset.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Environment HDRI & Global Exposure */}
        <div className="p-3 bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#f2ff00] font-bold flex items-center gap-1.5">
              <SunDim weight="bold" className="w-3.5 h-3.5" />
              Môi Trường (HDRI &amp; Phơi Sáng)
            </span>
          </div>

          {/* Environment HDRI Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/70">HDRI Environment</span>
              <span className="text-[#f2ff00] uppercase">
                {lightingConfig.envPreset}
              </span>
            </div>
            <select
              value={lightingConfig.envPreset}
              onChange={(e) =>
                onChangeLightingConfig({
                  ...lightingConfig,
                  envPreset: e.target.value as EnvironmentPresetName,
                })
              }
              className="w-full bg-black/80 border border-white/20 px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#f2ff00]"
            >
              {ENV_PRESETS.map((env) => (
                <option key={env.id} value={env.id} className="bg-[#111315]">
                  {env.label}
                </option>
              ))}
            </select>
          </div>

          {/* Env Intensity Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/70">Cường độ HDRI (Env Intensity)</span>
              <span className="text-[#f2ff00] font-bold">
                {lightingConfig.envIntensity.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1.4}
              step={0.02}
              value={lightingConfig.envIntensity}
              onChange={(e) =>
                onChangeLightingConfig({
                  ...lightingConfig,
                  envIntensity: parseFloat(e.target.value),
                })
              }
              className="w-full accent-[#f2ff00] cursor-pointer h-1.5 bg-white/15 rounded-lg"
            />
          </div>

          {/* Exposure Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/70">Độ phơi sáng (Exposure)</span>
              <span className="text-[#f2ff00] font-bold">
                {lightingConfig.exposure.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.45}
              max={1.45}
              step={0.01}
              value={lightingConfig.exposure}
              onChange={(e) =>
                onChangeLightingConfig({
                  ...lightingConfig,
                  exposure: parseFloat(e.target.value),
                })
              }
              className="w-full accent-[#f2ff00] cursor-pointer h-1.5 bg-white/15 rounded-lg"
            />
          </div>

          {/* Hemisphere Ambient Fill Slider + Colors */}
          <div className="space-y-1.5 pt-1 border-t border-white/10">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/70">Ánh sáng tán xạ (Ambient Fill)</span>
              <span className="text-[#f2ff00] font-bold">
                {lightingConfig.ambientIntensity.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.02}
              value={lightingConfig.ambientIntensity}
              onChange={(e) =>
                onChangeLightingConfig({
                  ...lightingConfig,
                  ambientIntensity: parseFloat(e.target.value),
                })
              }
              className="w-full accent-[#f2ff00] cursor-pointer h-1.5 bg-white/15 rounded-lg"
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center justify-between bg-black/50 px-2 py-1 border border-white/10 text-[10px]">
                <span className="text-white/65">Màu Trời</span>
                <input
                  type="color"
                  value={lightingConfig.ambientSkyColor}
                  onChange={(e) =>
                    onChangeLightingConfig({
                      ...lightingConfig,
                      ambientSkyColor: e.target.value,
                    })
                  }
                  className="w-5 h-4 bg-transparent border-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between bg-black/50 px-2 py-1 border border-white/10 text-[10px]">
                <span className="text-white/65">Màu Sàn</span>
                <input
                  type="color"
                  value={lightingConfig.ambientGroundColor}
                  onChange={(e) =>
                    onChangeLightingConfig({
                      ...lightingConfig,
                      ambientGroundColor: e.target.value,
                    })
                  }
                  className="w-5 h-4 bg-transparent border-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Floor Contact Shadow Opacity */}
          <div className="space-y-1 pt-1 border-t border-white/10">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/70">Độ đậm bóng đổ sàn (Shadow)</span>
              <span className="text-[#f2ff00] font-bold">
                {lightingConfig.contactShadowOpacity.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.95}
              step={0.02}
              value={lightingConfig.contactShadowOpacity}
              onChange={(e) =>
                onChangeLightingConfig({
                  ...lightingConfig,
                  contactShadowOpacity: parseFloat(e.target.value),
                })
              }
              className="w-full accent-[#f2ff00] cursor-pointer h-1.5 bg-white/15 rounded-lg"
            />
          </div>
        </div>

        {/* 3. Individual 3D Light Sources (Position X/Y/Z, Intensity, Color) */}
        <div className="p-3 bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#f2ff00] font-bold">
              Cấu Hình 3 Nguồn Sáng &amp; Vị Trí (X, Y, Z)
            </span>
          </div>

          {/* Light Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-black/60 p-1 border border-white/10">
            {(
              [
                { key: 'keyLight', short: '1. Key (Phải)' },
                { key: 'fillLight', short: '2. Fill (Trái)' },
                { key: 'rimLight', short: '3. Rim (Đỉnh)' },
              ] as { key: ActiveLightKey; short: string }[]
            ).map((tab) => {
              const isSelected = activeLightTab === tab.key;
              const isEnabled = lightingConfig[tab.key].enabled;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveLightTab(tab.key)}
                  className={`py-1.5 px-1 text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-[#f2ff00] text-black'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isEnabled
                        ? isSelected
                          ? 'bg-black'
                          : 'bg-[#f2ff00]'
                        : 'bg-red-500'
                    }`}
                  />
                  <span className="truncate">{tab.short}</span>
                </button>
              );
            })}
          </div>

          {/* Active Light Controls */}
          <div className="space-y-3 pt-1">
            {/* Enable Toggle + Color Picker */}
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={activeLight.enabled}
                  onChange={(e) =>
                    handleUpdateLight(activeLightTab, {
                      enabled: e.target.checked,
                    })
                  }
                  className="accent-[#f2ff00] w-3.5 h-3.5 cursor-pointer"
                />
                <span className="font-bold text-white">{activeLight.name}</span>
              </label>

              <label className="flex items-center gap-1.5 bg-black/60 px-2 py-1 border border-white/15 cursor-pointer">
                <span className="text-[10px] text-white/70 uppercase">
                  {activeLight.color}
                </span>
                <input
                  type="color"
                  value={activeLight.color}
                  onChange={(e) =>
                    handleUpdateLight(activeLightTab, { color: e.target.value })
                  }
                  className="w-5 h-4 bg-transparent border-0 cursor-pointer"
                />
              </label>
            </div>

            {/* Light Intensity */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-white/70">Cường độ sáng (Intensity)</span>
                <span className="text-[#f2ff00] font-bold">
                  {activeLight.intensity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={3.0}
                step={0.05}
                value={activeLight.intensity}
                onChange={(e) =>
                  handleUpdateLight(activeLightTab, {
                    intensity: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-[#f2ff00] cursor-pointer h-1.5 bg-white/15 rounded-lg"
              />
            </div>

            {/* X / Y / Z Position Coordinates */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              {/* X Axis */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/70">
                    Vị trí X <span className="text-white/40">(Trái ↔ Phải)</span>
                  </span>
                  <span className="text-[#f2ff00] font-bold">
                    {activeLight.position[0].toFixed(1)}m
                  </span>
                </div>
                <input
                  type="range"
                  min={-8}
                  max={8}
                  step={0.1}
                  value={activeLight.position[0]}
                  onChange={(e) =>
                    handleUpdateLightAxis(
                      activeLightTab,
                      0,
                      parseFloat(e.target.value)
                    )
                  }
                  className="w-full accent-[#f2ff00] cursor-pointer h-1.5 bg-white/15 rounded-lg"
                />
              </div>

              {/* Y Axis */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/70">
                    Vị trí Y <span className="text-white/40">(Thấp ↔ Cao)</span>
                  </span>
                  <span className="text-[#f2ff00] font-bold">
                    {activeLight.position[1].toFixed(1)}m
                  </span>
                </div>
                <input
                  type="range"
                  min={-2}
                  max={8}
                  step={0.1}
                  value={activeLight.position[1]}
                  onChange={(e) =>
                    handleUpdateLightAxis(
                      activeLightTab,
                      1,
                      parseFloat(e.target.value)
                    )
                  }
                  className="w-full accent-[#f2ff00] cursor-pointer h-1.5 bg-white/15 rounded-lg"
                />
              </div>

              {/* Z Axis */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/70">
                    Vị trí Z <span className="text-white/40">(Sau ↔ Trước)</span>
                  </span>
                  <span className="text-[#f2ff00] font-bold">
                    {activeLight.position[2].toFixed(1)}m
                  </span>
                </div>
                <input
                  type="range"
                  min={-8}
                  max={8}
                  step={0.1}
                  value={activeLight.position[2]}
                  onChange={(e) =>
                    handleUpdateLightAxis(
                      activeLightTab,
                      2,
                      parseFloat(e.target.value)
                    )
                  }
                  className="w-full accent-[#f2ff00] cursor-pointer h-1.5 bg-white/15 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-2.5 border-t border-white/15 bg-black/70 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onResetLightingConfig}
          className="flex-1 py-1.5 px-2.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
        >
          <ArrowCounterClockwise weight="bold" className="w-3.5 h-3.5" />
          <span>Reset Mặc Định</span>
        </button>

        <button
          type="button"
          onClick={handleCopyConfig}
          className="py-1.5 px-3 bg-[#f2ff00] hover:bg-white text-black text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
        >
          {copiedJson ? (
            <>
              <Check weight="bold" className="w-3.5 h-3.5" />
              <span>Đã Copy</span>
            </>
          ) : (
            <>
              <Copy weight="bold" className="w-3.5 h-3.5" />
              <span>Copy JSON</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
