import React from 'react';
import { useEditorStore } from '../../../store/editorStore';
import { VIEWPORT_PRESETS } from '../../../types/ast';
import { CanvasFrame } from './CanvasFrame';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

export const CenterStage: React.FC = () => {
  const { viewportMode, zoomLevel } = useEditorStore();
  const preset = VIEWPORT_PRESETS[viewportMode];

  const isMobile = viewportMode === 'mobile';
  const isTablet = viewportMode === 'tablet';

  return (
    <main className="flex-1 bg-neo-bg h-full overflow-auto relative flex flex-col items-center py-8 px-4 select-none">
      {/* Top Viewport Dimension Indicator */}
      <div className="mb-4 flex items-center gap-2 bg-white border-neo border-neo-ink px-3 py-1 rounded-full shadow-neo-sm text-xs font-mono">
        <span className="w-2.5 h-2.5 rounded-full bg-neo-yellow" />
        <span className="font-bold text-neo-ink">{preset.name}</span>
        <span className="text-gray-400">•</span>
        <span className="text-gray-600">
          {preset.width}px × {isMobile ? '844px (Reflow Flow)' : `${preset.height}px`}
        </span>
      </div>

      {/* Scaled Device Viewport Frame */}
      <div
        className="transition-transform duration-150 origin-top"
        style={{
          transform: `scale(${zoomLevel / 100})`,
        }}
      >
        <div
          className={`bg-white border-neo-thick border-neo-ink shadow-neo-lg rounded-2xl overflow-hidden transition-all duration-300 flex flex-col ${
            isMobile ? 'max-w-[390px]' : isTablet ? 'max-w-[768px]' : 'max-w-[1280px]'
          }`}
          style={{
            width: `${preset.width}px`,
            minHeight: `${preset.height}px`,
          }}
        >
          {/* Simulated Mobile Device Top Bar */}
          {isMobile && (
            <div className="h-10 bg-neo-ink text-white px-6 flex items-center justify-between text-[11px] font-mono select-none">
              <span className="font-bold">9:41</span>
              {/* Dynamic Island Pill */}
              <div className="w-20 h-4 bg-black rounded-full border border-gray-800" />
              <div className="flex items-center gap-1.5">
                <Signal className="w-3 h-3 text-white" strokeWidth={2.5} />
                <Wifi className="w-3 h-3 text-white" strokeWidth={2.5} />
                <BatteryMedium className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
            </div>
          )}

          {/* Chapter Content Canvas Frame */}
          <div className="flex-1 w-full overflow-y-auto">
            <CanvasFrame />
          </div>
        </div>
      </div>
    </main>
  );
};
