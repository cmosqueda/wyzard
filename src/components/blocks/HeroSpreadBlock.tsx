import React, { useRef, useState } from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { saveAsset } from '../../db/assets';
import { useEditorStore } from '../../store/editorStore';
import { Upload, Bookmark } from 'lucide-react';

export interface HeroSpreadProps {
  kicker?: string;
  kickerColor?: 'vermilion' | 'yellow' | 'teal' | 'violet';
  title?: string;
  subtitle?: string;
  author?: string;
  backgroundImage?: string;
  overlayOpacity?: number; // 0 - 100
  scrimGradient?: 'bottom-up' | 'top-down' | 'vignette' | 'solid';
  height?: 'sm' | 'md' | 'lg' | 'screen';
  cardAlignment?: 'left' | 'center' | 'bottom';
  cardTheme?: 'neo-white' | 'glass-dark';
  keepTogetherOnPageTurn?: boolean;
}

export const HeroSpreadBlock: UserComponent<HeroSpreadProps> = ({
  kicker = 'SPECIAL FEATURE',
  kickerColor = 'vermilion',
  title = 'The Architecture of Modern Reading',
  subtitle = 'Why the future of books belongs to mobile screens that expand into rich editorial spreads.',
  author = 'By Editorial Studio',
  backgroundImage = 'https://images.unsplash.com/photo-1507842229451-79b1be8d6290?auto=format&fit=crop&w=1600&q=80',
  overlayOpacity = 45,
  scrimGradient = 'bottom-up',
  height = 'md',
  cardAlignment = 'bottom',
  cardTheme = 'neo-white',
  keepTogetherOnPageTurn = true,
}) => {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
    actions: { setProp },
  } = useNode((node) => ({
    selected: node.events.selected,
    hovered: node.events.hovered,
  }));

  const getHeightClass = () => {
    switch (height) {
      case 'sm':
        return 'min-h-[280px]';
      case 'lg':
        return 'min-h-[500px]';
      case 'screen':
        return 'min-h-[85vh]';
      case 'md':
      default:
        return 'min-h-[400px]';
    }
  };

  const getAlignmentClass = () => {
    switch (cardAlignment) {
      case 'center':
        return 'items-center justify-center';
      case 'left':
        return 'items-start justify-center';
      case 'bottom':
      default:
        return 'items-end justify-start';
    }
  };

  const getScrimGradient = () => {
    switch (scrimGradient) {
      case 'top-down':
        return 'bg-gradient-to-b from-black via-black/40 to-transparent';
      case 'vignette':
        return 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black';
      case 'solid':
        return 'bg-black';
      case 'bottom-up':
      default:
        return 'bg-gradient-to-t from-black via-black/40 to-transparent';
    }
  };

  const getKickerColorClass = () => {
    switch (kickerColor) {
      case 'yellow':
        return 'text-neo-yellow';
      case 'teal':
        return 'text-neo-teal';
      case 'violet':
        return 'text-neo-violet';
      case 'vermilion':
      default:
        return 'text-neo-vermilion';
    }
  };

  const isDarkCard = cardTheme === 'glass-dark';

  return (
    <section
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative w-full rounded-xl overflow-hidden flex p-5 sm:p-7 my-4 transition-all ${getHeightClass()} ${getAlignmentClass()} ${
        selected ? 'ring-2 ring-neo-yellow ring-offset-2' : hovered ? 'outline outline-1 outline-dashed outline-neo-vermilion' : ''
      }`}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        pageBreakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
        breakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
      }}
    >
      {/* Dark gradient scrim overlay */}
      <div
        className={`absolute inset-0 ${getScrimGradient()} pointer-events-none transition-opacity`}
        style={{ opacity: overlayOpacity / 100 }}
      />

      {/* Page break guardrail badge */}
      {keepTogetherOnPageTurn && (
        <span className="absolute top-3 right-3 z-20 flex items-center gap-0.5 text-[9px] font-mono bg-neo-teal text-neo-ink px-1.5 py-0.5 rounded shadow-neo-sm font-bold pointer-events-none">
          <Bookmark className="w-2.5 h-2.5" />
          Keep on Page
        </span>
      )}

      {/* Floating Editorial Card */}
      <div
        className={`relative z-10 max-w-lg p-5 sm:p-6 rounded-lg transition-all ${
          isDarkCard
            ? 'bg-neo-ink/90 text-white backdrop-blur-md border-neo border-white/30 shadow-neo'
            : 'bg-white/95 text-neo-ink backdrop-blur-sm border-neo border-neo-ink shadow-neo'
        }`}
      >
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            setProp((props: HeroSpreadProps) => {
              props.kicker = e.currentTarget.textContent || '';
            });
          }}
          className={`inline-block text-[11px] font-mono font-bold uppercase tracking-wider mb-1.5 focus:outline-none ${getKickerColorClass()}`}
        >
          {kicker}
        </span>

        <h1
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            setProp((props: HeroSpreadProps) => {
              props.title = e.currentTarget.textContent || '';
            });
          }}
          className="font-heading font-bold text-2xl sm:text-3xl leading-tight mb-2 tracking-tight focus:outline-none"
        >
          {title}
        </h1>

        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            setProp((props: HeroSpreadProps) => {
              props.subtitle = e.currentTarget.textContent || '';
            });
          }}
          className={`font-sans text-xs sm:text-sm leading-relaxed mb-3 focus:outline-none ${
            isDarkCard ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          {subtitle}
        </p>

        <div className={`pt-2.5 border-t flex items-center justify-between ${isDarkCard ? 'border-white/20' : 'border-gray-200'}`}>
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              setProp((props: HeroSpreadProps) => {
                props.author = e.currentTarget.textContent || '';
              });
            }}
            className={`font-mono text-[11px] font-medium focus:outline-none ${
              isDarkCard ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {author}
          </span>
        </div>
      </div>
    </section>
  );
};

export const HeroSpreadSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as HeroSpreadProps,
  }));

  const projectId = useEditorStore((state) => state.project.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const blobUrl = await saveAsset(projectId, file);
      setProp((p: HeroSpreadProps) => {
        p.backgroundImage = blobUrl;
      });
    } catch (err) {
      console.error('Failed to store hero background in IndexedDB:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      {/* Background Visual */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Background Visual
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-neo-yellow text-neo-ink font-mono font-bold border-neo border-neo-ink rounded shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all"
          >
            <Upload className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>{isUploading ? 'Uploading...' : 'Upload Background Image'}</span>
          </button>
        </div>
        <input
          type="text"
          value={props.backgroundImage || ''}
          onChange={(e) => setProp((p: HeroSpreadProps) => (p.backgroundImage = e.target.value))}
          placeholder="Or paste image URL..."
          className="w-full bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded font-mono text-xs focus:outline-none shadow-neo-sm"
        />
      </div>

      {/* Scrim Gradient & Opacity */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="font-heading font-semibold text-neo-ink uppercase tracking-wider text-[11px]">
            Dark Scrim Opacity
          </label>
          <span className="font-mono text-[10px] text-gray-700 bg-neo-yellow px-1 rounded font-bold">
            {props.overlayOpacity ?? 45}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="95"
          value={props.overlayOpacity ?? 45}
          onChange={(e) => setProp((p: HeroSpreadProps) => (p.overlayOpacity = Number(e.target.value)))}
          className="w-full accent-neo-ink mb-2"
        />
        <div className="grid grid-cols-4 gap-1">
          {(
            [
              { id: 'bottom-up', label: 'Bottom' },
              { id: 'top-down', label: 'Top' },
              { id: 'vignette', label: 'Vignette' },
              { id: 'solid', label: 'Solid' },
            ] as const
          ).map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setProp((p: HeroSpreadProps) => (p.scrimGradient = g.id))}
              className={`py-1 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                props.scrimGradient === g.id ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card Theme */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Card Theme
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { id: 'neo-white', label: 'Neo White Card' },
              { id: 'glass-dark', label: 'Dark Glassmorphic' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setProp((p: HeroSpreadProps) => (p.cardTheme = t.id))}
              className={`py-1.5 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                props.cardTheme === t.id ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kicker Pill Color */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Kicker Highlight Color
        </label>
        <div className="grid grid-cols-4 gap-1">
          {(
            [
              { id: 'vermilion', label: 'Vermilion', color: 'bg-neo-vermilion' },
              { id: 'yellow', label: 'Yellow', color: 'bg-neo-yellow' },
              { id: 'teal', label: 'Teal', color: 'bg-neo-teal' },
              { id: 'violet', label: 'Violet', color: 'bg-neo-violet' },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setProp((p: HeroSpreadProps) => (p.kickerColor = c.id))}
              className={`py-1 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                props.kickerColor === c.id ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Height Presets */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Spread Height
        </label>
        <div className="grid grid-cols-4 gap-1">
          {(['sm', 'md', 'lg', 'screen'] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setProp((p: HeroSpreadProps) => (p.height = h))}
              className={`py-1 text-center font-mono border-neo border-neo-ink rounded capitalize transition-all ${
                props.height === h ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Card Alignment */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Card Alignment
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(['bottom', 'center', 'left'] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => setProp((p: HeroSpreadProps) => (p.cardAlignment = align))}
              className={`py-1 text-center font-mono border-neo border-neo-ink rounded capitalize transition-all ${
                props.cardAlignment === align ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      {/* Keep on Page Break */}
      <label className="flex items-start gap-2.5 cursor-pointer border-neo border-neo-ink p-2.5 rounded bg-neo-bg/50">
        <input
          type="checkbox"
          checked={props.keepTogetherOnPageTurn ?? true}
          onChange={(e) => setProp((p: HeroSpreadProps) => (p.keepTogetherOnPageTurn = e.target.checked))}
          className="w-4 h-4 accent-neo-ink rounded mt-0.5"
        />
        <div className="flex flex-col">
          <span className="font-heading font-bold text-neo-ink flex items-center gap-1">
            <Bookmark className="w-3.5 h-3.5 text-neo-teal" />
            Keep on Same Page Turn
          </span>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5">
            Prevents the hero spread from breaking across pages.
          </span>
        </div>
      </label>
    </div>
  );
};

HeroSpreadBlock.craft = {
  displayName: 'Magazine Hero Spread',
  props: {
    kicker: 'SPECIAL FEATURE',
    kickerColor: 'vermilion',
    title: 'The Architecture of Modern Reading',
    subtitle: 'Why the future of books belongs to mobile screens that expand into rich editorial spreads.',
    author: 'By Editorial Studio',
    backgroundImage: 'https://images.unsplash.com/photo-1507842229451-79b1be8d6290?auto=format&fit=crop&w=1600&q=80',
    overlayOpacity: 45,
    scrimGradient: 'bottom-up',
    height: 'md',
    cardAlignment: 'bottom',
    cardTheme: 'neo-white',
    keepTogetherOnPageTurn: true,
  },
  related: {
    toolbar: HeroSpreadSettings,
  },
};
