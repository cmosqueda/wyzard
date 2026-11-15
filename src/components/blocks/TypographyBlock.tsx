import React, { useRef } from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { useEditorStore } from '../../store/editorStore';
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bookmark,
} from 'lucide-react';

export type TypographyVariant = 'h1' | 'h2' | 'h3' | 'lead' | 'body' | 'pullquote';
export type FontFamily = 'serif' | 'sans' | 'heading' | 'mono';
export type RemScale = '0.75rem' | '0.875rem' | '1rem' | '1.125rem' | '1.25rem' | '1.5rem' | '1.875rem' | '2.25rem' | '3rem';

export interface TypographyBlockProps {
  text?: string;
  htmlContent?: string;
  variant?: TypographyVariant;
  fontFamily?: FontFamily;
  remSize?: RemScale;
  lineHeight?: '1.2' | '1.4' | '1.6' | '1.8';
  letterSpacing?: '-0.02em' | '0' | '0.04em' | '0.08em';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  dropCap?: boolean;
  dropCapColor?: string;
  dropCapLines?: 2 | 3;
  color?: string;
  backgroundColor?: string;
  keepTogetherOnPageTurn?: boolean; // break-inside: avoid for EPUB
  // Desktop override
  desktopRemSize?: RemScale;
}

export const TypographyBlock: UserComponent<TypographyBlockProps> = ({
  text,
  htmlContent = text || 'Typography is the craft of endowing human language with a durable visual form across responsive screens.',
  variant = 'body',
  fontFamily = 'sans',
  remSize,
  lineHeight = '1.6',
  letterSpacing = '0',
  textAlign = 'left',
  dropCap = false,
  dropCapColor = '#FF5E3A',
  dropCapLines = 2,
  color = '#141414',
  backgroundColor = 'transparent',
  keepTogetherOnPageTurn = false,
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

  const viewportMode = useEditorStore((state) => state.viewportMode);
  const contentRef = useRef<HTMLDivElement>(null);

  const getFontFamilyClass = () => {
    switch (fontFamily) {
      case 'serif':
        return 'font-serif';
      case 'heading':
        return 'font-heading';
      case 'mono':
        return 'font-mono';
      case 'sans':
      default:
        return 'font-sans';
    }
  };

  const getDefaultRemSize = (): string => {
    if (remSize) return remSize;
    switch (variant) {
      case 'h1':
        return '2.25rem';
      case 'h2':
        return '1.875rem';
      case 'h3':
        return '1.5rem';
      case 'lead':
        return '1.25rem';
      case 'pullquote':
        return '1.25rem';
      case 'body':
      default:
        return '1rem';
    }
  };

  const activeRemSize = getDefaultRemSize();

  const getVariantStyles = () => {
    switch (variant) {
      case 'h1':
        return 'font-bold tracking-tight mb-3';
      case 'h2':
        return 'font-bold tracking-tight mb-2';
      case 'h3':
        return 'font-semibold leading-snug mb-2';
      case 'lead':
        return 'font-normal leading-relaxed text-gray-700 mb-3';
      case 'pullquote':
        return 'italic border-l-4 border-neo-ink pl-4 py-2 my-4 text-gray-800 leading-snug';
      case 'body':
      default:
        return 'font-normal leading-relaxed text-gray-800';
    }
  };

  // Helper for inline commands (Bold, Italic, etc)
  const execFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
      setProp((props: TypographyBlockProps) => {
        props.htmlContent = contentRef.current?.innerHTML || '';
      });
    }
  };

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative group transition-all duration-150 p-2 rounded ${
        selected ? 'ring-2 ring-neo-yellow ring-offset-2' : hovered ? 'outline outline-1 outline-dashed outline-neo-vermilion' : ''
      }`}
      style={{
        pageBreakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
        breakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
        backgroundColor,
      }}
    >
      {/* Floating mini-toolbar when selected */}
      {selected && (
        <div className="absolute -top-10 left-0 bg-neo-ink text-white rounded-md shadow-neo-sm px-2 py-1 flex items-center gap-1.5 z-30 select-none animate-in fade-in zoom-in-95 duration-100">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              execFormat('bold');
            }}
            className="p-1 hover:bg-white/20 rounded text-neo-yellow"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              execFormat('italic');
            }}
            className="p-1 hover:bg-white/20 rounded text-neo-yellow"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              execFormat('underline');
            }}
            className="p-1 hover:bg-white/20 rounded text-neo-yellow"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
          <div className="w-[1px] h-3.5 bg-white/30 mx-0.5" />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              execFormat('hiliteColor', '#FFD23F');
            }}
            className="p-1 hover:bg-white/20 rounded text-neo-yellow"
            title="Highlight Marker"
          >
            <Highlighter className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Breakpoint / Guardrail Badges */}
      <div className="absolute top-1 right-1 flex items-center gap-1 pointer-events-none">
        {keepTogetherOnPageTurn && (
          <span className="flex items-center gap-0.5 text-[9px] font-mono bg-neo-teal text-neo-ink px-1 py-0.5 rounded shadow-neo-sm font-bold">
            <Bookmark className="w-2.5 h-2.5" />
            Keep on Page
          </span>
        )}
        {viewportMode === 'desktop' && (
          <span className="text-[9px] font-mono bg-neo-violet text-white px-1 py-0.5 rounded shadow-neo-sm font-semibold">
            {activeRemSize}
          </span>
        )}
      </div>

      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          setProp((props: TypographyBlockProps) => {
            props.htmlContent = e.currentTarget.innerHTML || '';
          });
        }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        className={`${getFontFamilyClass()} ${getVariantStyles()} transition-all focus:outline-none`}
        style={{
          fontSize: activeRemSize,
          lineHeight,
          letterSpacing,
          textAlign,
          color,
          ...(dropCap && variant === 'body'
            ? {
                // Editorial Drop Cap CSS
                initialLetter: `${dropCapLines} ${dropCapLines}`,
                WebkitInitialLetter: `${dropCapLines} ${dropCapLines}`,
              }
            : {}),
        }}
      />
    </div>
  );
};

export const TypographySettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as TypographyBlockProps,
  }));

  const remPresets: { label: string; value: RemScale }[] = [
    { label: '0.875rem (14px)', value: '0.875rem' },
    { label: '1rem (16px)', value: '1rem' },
    { label: '1.125rem (18px)', value: '1.125rem' },
    { label: '1.25rem (20px)', value: '1.25rem' },
    { label: '1.5rem (24px)', value: '1.5rem' },
    { label: '1.875rem (30px)', value: '1.875rem' },
    { label: '2.25rem (36px)', value: '2.25rem' },
    { label: '3rem (48px)', value: '3rem' },
  ];

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      {/* Variant Selector */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Editorial Role
        </label>
        <select
          value={props.variant || 'body'}
          onChange={(e) => setProp((p: TypographyBlockProps) => (p.variant = e.target.value as TypographyVariant))}
          className="w-full bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded font-mono font-medium focus:outline-none shadow-neo-sm"
        >
          <option value="h1">Display Headline 1</option>
          <option value="h2">Section Title 2</option>
          <option value="h3">Subhead 3</option>
          <option value="lead">Lead / Deck Paragraph</option>
          <option value="body">Standard Body Text</option>
          <option value="pullquote">Editorial Pull Quote</option>
        </select>
      </div>

      {/* Font Family */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Font Family
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { id: 'sans', label: 'Plus Jakarta' },
              { id: 'serif', label: 'Editorial Serif' },
              { id: 'heading', label: 'Space Grotesk' },
              { id: 'mono', label: 'JetBrains Mono' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setProp((p: TypographyBlockProps) => (p.fontFamily = f.id))}
              className={`py-1.5 text-center border-neo border-neo-ink rounded transition-all font-medium ${
                props.fontFamily === f.id ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rem Scale Preset */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="font-heading font-semibold text-neo-ink uppercase tracking-wider text-[11px]">
            Relative Rem Scale
          </label>
          <span className="font-mono text-[10px] text-gray-500">{props.remSize || 'Default'}</span>
        </div>
        <select
          value={props.remSize || ''}
          onChange={(e) => setProp((p: TypographyBlockProps) => (p.remSize = e.target.value as RemScale))}
          className="w-full bg-white border-neo border-neo-ink px-2 py-1.5 rounded font-mono font-medium focus:outline-none shadow-neo-sm"
        >
          <option value="">Auto (Derived from Role)</option>
          {remPresets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {/* Alignment */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Alignment
        </label>
        <div className="grid grid-cols-4 gap-1">
          {(
            [
              { id: 'left', icon: AlignLeft },
              { id: 'center', icon: AlignCenter },
              { id: 'right', icon: AlignRight },
              { id: 'justify', icon: AlignJustify },
            ] as const
          ).map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setProp((p: TypographyBlockProps) => (p.textAlign = id))}
              className={`py-1.5 flex justify-center items-center border-neo border-neo-ink rounded transition-all ${
                props.textAlign === id ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={2.5} />
            </button>
          ))}
        </div>
      </div>

      {/* Line Height & Letter Spacing */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
            Line Height
          </label>
          <select
            value={props.lineHeight || '1.6'}
            onChange={(e) => setProp((p: TypographyBlockProps) => (p.lineHeight = e.target.value as any))}
            className="w-full bg-white border-neo border-neo-ink px-2 py-1 rounded font-mono shadow-neo-sm"
          >
            <option value="1.2">1.2 (Tight)</option>
            <option value="1.4">1.4 (Snug)</option>
            <option value="1.6">1.6 (Normal)</option>
            <option value="1.8">1.8 (Loose)</option>
          </select>
        </div>
        <div>
          <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
            Tracking
          </label>
          <select
            value={props.letterSpacing || '0'}
            onChange={(e) => setProp((p: TypographyBlockProps) => (p.letterSpacing = e.target.value as any))}
            className="w-full bg-white border-neo border-neo-ink px-2 py-1 rounded font-mono shadow-neo-sm"
          >
            <option value="-0.02em">-0.02em (Tight)</option>
            <option value="0">0 (Normal)</option>
            <option value="0.04em">+0.04em (Wide)</option>
            <option value="0.08em">+0.08em (Loose)</option>
          </select>
        </div>
      </div>

      {/* Drop Cap */}
      {props.variant === 'body' && (
        <div className="border-neo border-neo-ink p-2.5 rounded bg-neo-bg/50 flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!props.dropCap}
              onChange={(e) => setProp((p: TypographyBlockProps) => (p.dropCap = e.target.checked))}
              className="w-4 h-4 accent-neo-ink rounded"
            />
            <span className="font-heading font-semibold text-neo-ink">Editorial Drop Cap</span>
          </label>

          {props.dropCap && (
            <div className="flex items-center justify-between pt-2 border-t border-neo-ink/20 text-xs">
              <span className="font-mono text-gray-600">Drop Lines:</span>
              <div className="flex gap-1">
                {([2, 3] as const).map((lines) => (
                  <button
                    key={lines}
                    type="button"
                    onClick={() => setProp((p: TypographyBlockProps) => (p.dropCapLines = lines))}
                    className={`px-2 py-0.5 font-mono border border-neo-ink rounded ${
                      props.dropCapLines === lines ? 'bg-neo-yellow font-bold' : 'bg-white'
                    }`}
                  >
                    {lines} Lines
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination Guardrail */}
      <label className="flex items-start gap-2.5 cursor-pointer border-neo border-neo-ink p-2.5 rounded bg-neo-bg/50">
        <input
          type="checkbox"
          checked={!!props.keepTogetherOnPageTurn}
          onChange={(e) => setProp((p: TypographyBlockProps) => (p.keepTogetherOnPageTurn = e.target.checked))}
          className="w-4 h-4 accent-neo-ink rounded mt-0.5"
        />
        <div className="flex flex-col">
          <span className="font-heading font-bold text-neo-ink flex items-center gap-1">
            <Bookmark className="w-3.5 h-3.5 text-neo-teal" />
            Keep on Same Page Turn
          </span>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5">
            Compiles to <code className="bg-white px-1 py-0.2 rounded border border-gray-300">break-inside: avoid</code> to prevent splitting across e-reader page breaks.
          </span>
        </div>
      </label>
    </div>
  );
};

TypographyBlock.craft = {
  displayName: 'Editorial Typography',
  props: {
    htmlContent: 'Typography is the craft of endowing human language with a durable visual form across responsive screens.',
    variant: 'body',
    fontFamily: 'sans',
    remSize: undefined,
    lineHeight: '1.6',
    letterSpacing: '0',
    textAlign: 'left',
    dropCap: false,
    dropCapColor: '#FF5E3A',
    dropCapLines: 2,
    color: '#141414',
    backgroundColor: 'transparent',
    keepTogetherOnPageTurn: false,
  },
  related: {
    toolbar: TypographySettings,
  },
};
