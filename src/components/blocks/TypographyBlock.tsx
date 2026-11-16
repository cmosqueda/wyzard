import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { useEditorStore } from '../../store/editorStore';
import { FontPicker } from '../ui/FontPicker';
import { notify } from '../../store/toastStore';
import { googleFontStack, loadGoogleFont } from '../../utils/googleFonts';
import { hydrateMath, serializeRichHtml, mathSpanHtml, renderTex } from '../../utils/math';
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  RemoveFormatting,
  Sigma,
  Link2,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bookmark,
} from 'lucide-react';

type FormatKey = 'bold' | 'italic' | 'underline' | 'highlight' | 'link';

export type TypographyVariant = 'h1' | 'h2' | 'h3' | 'lead' | 'body' | 'pullquote';
export type FontFamily = 'serif' | 'sans' | 'heading' | 'mono';
export type RemScale = '0.75rem' | '0.875rem' | '1rem' | '1.125rem' | '1.25rem' | '1.5rem' | '1.875rem' | '2.25rem' | '3rem';

const BUILT_IN_FONT_LABELS: Record<FontFamily, string> = {
  sans: 'Plus Jakarta Sans',
  serif: 'Serif',
  heading: 'Space Grotesk',
  mono: 'JetBrains Mono',
};

const DEFAULT_REM_BY_VARIANT: Record<TypographyVariant, string> = {
  h1: '2.25rem',
  h2: '1.875rem',
  h3: '1.5rem',
  lead: '1.25rem',
  pullquote: '1.25rem',
  body: '1rem',
};

export interface TypographyBlockProps {
  text?: string;
  htmlContent?: string;
  variant?: TypographyVariant;
  fontFamily?: FontFamily;
  /** Google Fonts family; takes precedence over `fontFamily` when set. */
  googleFont?: string;
  remSize?: RemScale | string;
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
  googleFont,
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

  useEffect(() => {
    loadGoogleFont(googleFont);
  }, [googleFont]);

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
  // The editable is uncontrolled: React must not rewrite innerHTML while the user is typing or
  // formatting, otherwise the selection is destroyed (which broke applying / removing highlights).
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (document.activeElement !== el && serializeRichHtml(el) !== htmlContent) {
      el.innerHTML = htmlContent;
    }
    hydrateMath(el);
  }, [htmlContent]);

  const [activeFormats, setActiveFormats] = useState<Record<FormatKey, boolean>>({
    bold: false,
    italic: false,
    underline: false,
    highlight: false,
    link: false,
  });

  // Read which inline styles apply at the current selection / caret so the toolbar can show toggled state
  const readFormats = () => {
    const root = contentRef.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.rangeCount === 0 || !root.contains(sel.anchorNode)) return;
    try {
      const bg = (
        document.queryCommandValue('hiliteColor') ||
        document.queryCommandValue('backColor') ||
        ''
      )
        .toLowerCase()
        .replace(/\s/g, '');
      const next: Record<FormatKey, boolean> = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        highlight: bg !== '' && bg !== 'transparent' && bg !== 'rgba(0,0,0,0)' && bg !== 'initial',
        link: !!(sel.anchorNode && (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : (sel.anchorNode as HTMLElement))?.closest('a')),
      };
      setActiveFormats((prev) =>
        (Object.keys(next) as FormatKey[]).every((k) => prev[k] === next[k]) ? prev : next
      );
    } catch {
      // queryCommand* can throw in unusual selection states; keep previous state
    }
  };

  useEffect(() => {
    if (!selected) return;
    document.addEventListener('selectionchange', readFormats);
    return () => document.removeEventListener('selectionchange', readFormats);
  }, [selected]);

  const execFormat = (command: string, value: string | undefined = undefined) => {
    contentRef.current?.focus({ preventScroll: true });
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, value);
    if (contentRef.current) {
      setProp((props: TypographyBlockProps) => {
        props.htmlContent = serializeRichHtml(contentRef.current as HTMLElement);
      });
    }
    readFormats();
  };

  // --- LaTeX math: atomic placeholder spans edited through a small popover ---
  const mathElRef = useRef<HTMLElement | null>(null);
  const [mathEdit, setMathEdit] = useState<{ tex: string; display: boolean } | null>(null);

  const saveRichHtml = () => {
    const el = contentRef.current;
    if (!el) return;
    setProp((props: TypographyBlockProps) => {
      props.htmlContent = serializeRichHtml(el);
    }, 300);
  };

  const openMathEditor = (el: HTMLElement) => {
    setLinkEdit(null);
    mathElRef.current = el;
    setMathEdit({ tex: el.dataset.tex || '', display: el.dataset.display === '1' });
  };

  const updateMath = (next: { tex: string; display: boolean }) => {
    setMathEdit(next);
    const el = mathElRef.current;
    if (!el) return;
    el.dataset.tex = next.tex;
    el.dataset.display = next.display ? '1' : '0';
    if (contentRef.current) hydrateMath(contentRef.current);
    saveRichHtml();
  };

  const closeMathEditor = () => {
    setMathEdit(null);
    mathElRef.current = null;
  };

  const removeMath = () => {
    mathElRef.current?.remove();
    closeMathEditor();
    saveRichHtml();
  };

  const insertMath = () => {
    const root = contentRef.current;
    if (!root) return;
    const picked = window.getSelection()?.toString().trim() || '';
    const tex = picked || 'x^2';
    execFormat('insertHTML', `${mathSpanHtml(tex, false)}&nbsp;`);
    const fresh = root.querySelector<HTMLElement>('.wz-math:not([data-rendered])');
    hydrateMath(root);
    if (fresh) openMathEditor(fresh);
  };

  // --- Hyperlinks ---
  const linkRangeRef = useRef<Range | null>(null);
  const [linkEdit, setLinkEdit] = useState<{ url: string; anchor: HTMLAnchorElement | null } | null>(null);

  const anchorAtSelection = (): HTMLAnchorElement | null => {
    const sel = window.getSelection();
    const root = contentRef.current;
    if (!sel || !root || !sel.anchorNode || !root.contains(sel.anchorNode)) return null;
    const el = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : (sel.anchorNode as HTMLElement);
    return (el?.closest('a') as HTMLAnchorElement | null) ?? null;
  };

  const openLinkEditor = (anchor?: HTMLAnchorElement | null) => {
    const root = contentRef.current;
    const sel = window.getSelection();
    if (!root || !sel) return;
    const target = anchor ?? anchorAtSelection();
    if (target) {
      const r = document.createRange();
      r.selectNodeContents(target);
      linkRangeRef.current = r;
    } else if (sel.rangeCount > 0 && !sel.isCollapsed && root.contains(sel.anchorNode)) {
      linkRangeRef.current = sel.getRangeAt(0).cloneRange();
    } else {
      notify({ type: 'info', title: 'Select some text first, then add a link', duration: 2000 });
      return;
    }
    closeMathEditor();
    setLinkEdit({ url: target?.getAttribute('href') || 'https://', anchor: target });
  };

  const closeLinkEditor = () => {
    setLinkEdit(null);
    linkRangeRef.current = null;
  };

  const restoreLinkRange = () => {
    const sel = window.getSelection();
    const range = linkRangeRef.current;
    contentRef.current?.focus({ preventScroll: true });
    if (sel && range) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  /** Accepts http(s), mailto, tel, #anchors and bare domains / emails; rejects script-like schemes. */
  const normalizeUrl = (raw: string): string | null => {
    const url = raw.trim();
    if (!url) return '';
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(url)) return url;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(url)) return `https://${url}`;
    return null;
  };

  const applyLink = () => {
    if (!linkEdit) return;
    const url = normalizeUrl(linkEdit.url);
    if (url === null) {
      notify({ type: 'warning', title: 'That does not look like a valid link' });
      return;
    }
    if (url === '') {
      removeLink();
      return;
    }
    restoreLinkRange();
    if (linkEdit.anchor) {
      linkEdit.anchor.setAttribute('href', url);
    } else {
      document.execCommand('createLink', false, url);
    }
    contentRef.current?.querySelectorAll('a').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
    saveRichHtml();
    readFormats();
    closeLinkEditor();
  };

  function removeLink() {
    restoreLinkRange();
    document.execCommand('unlink');
    saveRichHtml();
    readFormats();
    closeLinkEditor();
  }

  const toolbarButtons: { key: FormatKey; title: string; icon: React.ReactNode; run: () => void }[] = [
    { key: 'bold', title: 'Bold (Ctrl+B)', icon: <Bold className="w-3.5 h-3.5" strokeWidth={3} />, run: () => execFormat('bold') },
    { key: 'italic', title: 'Italic (Ctrl+I)', icon: <Italic className="w-3.5 h-3.5" strokeWidth={3} />, run: () => execFormat('italic') },
    { key: 'underline', title: 'Underline (Ctrl+U)', icon: <Underline className="w-3.5 h-3.5" strokeWidth={3} />, run: () => execFormat('underline') },
    {
      key: 'highlight',
      title: 'Highlight (click again to remove)',
      icon: <Highlighter className="w-3.5 h-3.5" strokeWidth={2.5} />,
      // Toggle: remove the highlight if the selection already has one
      run: () => execFormat('hiliteColor', activeFormats.highlight ? 'transparent' : '#FFD23F'),
    },
    {
      key: 'link',
      title: 'Link (select text first) — click a link to edit it',
      icon: <Link2 className="w-3.5 h-3.5" strokeWidth={2.5} />,
      run: () => openLinkEditor(),
    },
  ];

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
          {toolbarButtons.map((b, i) => (
            <React.Fragment key={b.key}>
              {b.key === 'highlight' && <div className="w-[1px] h-3.5 bg-white/30 mx-0.5" />}
              <button
                type="button"
                aria-pressed={activeFormats[b.key]}
                onMouseDown={(e) => {
                  e.preventDefault();
                  b.run();
                }}
                className={`p-1 rounded transition-colors ${
                  activeFormats[b.key]
                    ? 'bg-neo-yellow text-neo-ink'
                    : 'text-neo-yellow hover:bg-white/20'
                }`}
                title={b.title}
              >
                {b.icon}
              </button>
            </React.Fragment>
          ))}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              insertMath();
            }}
            className="p-1 rounded text-neo-yellow hover:bg-white/20 transition-colors"
            title="Insert LaTeX equation (or type $x^2$ / $$…$$)"
          >
            <Sigma className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <div className="w-[1px] h-3.5 bg-white/30 mx-0.5" />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execFormat('removeFormat');
            }}
            className="p-1 rounded text-neo-yellow hover:bg-white/20 transition-colors"
            title="Clear all formatting on the selection"
          >
            <RemoveFormatting className="w-3.5 h-3.5" strokeWidth={2.5} />
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
        onClick={(e) => {
          const math = (e.target as HTMLElement).closest<HTMLElement>('.wz-math');
          if (math) {
            e.stopPropagation();
            closeLinkEditor();
            openMathEditor(math);
            return;
          }
          const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a');
          if (link) {
            e.preventDefault();
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
              window.open(link.href, '_blank', 'noopener,noreferrer');
            } else {
              openLinkEditor(link);
            }
          }
        }}
        onBlur={(e) => {
          setProp((props: TypographyBlockProps) => {
            props.htmlContent = serializeRichHtml(e.currentTarget);
          });
        }}
        className={`${getFontFamilyClass()} ${getVariantStyles()} transition-all focus:outline-none`}
        style={{
          ...(googleFont ? { fontFamily: googleFontStack(googleFont) } : {}),
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

      {linkEdit && (
        <div
          data-no-block-drag
          onClick={(e) => e.stopPropagation()}
          className="absolute left-2 top-full mt-1 z-40 w-[min(22rem,90%)] bg-white text-neo-ink border-neo border-neo-ink rounded-lg shadow-neo p-2.5 flex flex-col gap-2 text-xs"
        >
          <span className="font-heading font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5" /> {linkEdit.anchor ? 'Edit link' : 'Add link'}
          </span>
          <input
            autoFocus
            type="text"
            value={linkEdit.url}
            onChange={(e) => setLinkEdit({ ...linkEdit, url: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                closeLinkEditor();
              }
            }}
            spellCheck={false}
            placeholder="https://example.com, name@mail.com or #section"
            className="w-full px-2 py-1.5 bg-neo-bg border border-neo-ink rounded font-mono text-xs"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {linkEdit.anchor && (
                <button
                  type="button"
                  onClick={removeLink}
                  className="px-2 py-1 border border-neo-ink rounded font-mono text-[10px] hover:bg-neo-vermilion hover:text-white"
                >
                  Remove link
                </button>
              )}
              {linkEdit.anchor && (
                <a
                  href={linkEdit.anchor.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in a new tab"
                  className="p-1 border border-neo-ink rounded hover:bg-neo-yellow/50"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={closeLinkEditor}
                className="px-2 py-1 border border-neo-ink rounded font-mono text-[10px] hover:bg-neo-bg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyLink}
                className="px-3 py-1 bg-neo-yellow border border-neo-ink rounded font-mono text-[11px] font-bold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {mathEdit && (
        <div
          data-no-block-drag
          onClick={(e) => e.stopPropagation()}
          className="absolute left-2 top-full mt-1 z-40 w-[min(22rem,90%)] bg-white text-neo-ink border-neo border-neo-ink rounded-lg shadow-neo p-2.5 flex flex-col gap-2 text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-heading font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
              <Sigma className="w-3.5 h-3.5" /> LaTeX equation
            </span>
            <label className="flex items-center gap-1 font-mono text-[10px]">
              <input
                type="checkbox"
                checked={mathEdit.display}
                onChange={(e) => updateMath({ ...mathEdit, display: e.target.checked })}
                className="accent-neo-ink"
              />
              Block (centered)
            </label>
          </div>
          <textarea
            autoFocus
            rows={2}
            value={mathEdit.tex}
            onChange={(e) => updateMath({ ...mathEdit, tex: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                closeMathEditor();
              }
            }}
            spellCheck={false}
            placeholder={'e.g. \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'}
            className="w-full px-2 py-1.5 bg-neo-bg border border-neo-ink rounded font-mono text-xs resize-y"
          />
          <div
            className="min-h-[2.5rem] px-2 py-1.5 border border-dashed border-neo-ink/40 rounded overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: renderTex(mathEdit.tex || '\\;', mathEdit.display) }}
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={removeMath}
              className="px-2 py-1 border border-neo-ink rounded font-mono text-[10px] hover:bg-neo-vermilion hover:text-white"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={closeMathEditor}
              className="px-3 py-1 bg-neo-yellow border border-neo-ink rounded font-mono text-[11px] font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}
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

  const variant = props.variant || 'body';
  const defaultRem = DEFAULT_REM_BY_VARIANT[variant];
  const currentRem = props.remSize || defaultRem;
  const currentPx = Math.round(parseFloat(currentRem) * 16);

  const setSizePx = (px: number) => {
    if (!Number.isFinite(px)) return;
    const clamped = Math.min(160, Math.max(8, Math.round(px)));
    setProp((p: TypographyBlockProps) => {
      p.remSize = `${Math.round((clamped / 16) * 1000) / 1000}rem`;
    });
  };

  const labelCls = 'font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]';
  const controlCls = 'w-full bg-white border-neo border-neo-ink px-2 py-1.5 rounded font-mono text-xs shadow-neo-sm';

  return (
    <div className="flex flex-col gap-3 text-xs font-sans">
      {/* Role */}
      <div>
        <label className={labelCls}>Style</label>
        <select
          value={variant}
          onChange={(e) => setProp((p: TypographyBlockProps) => (p.variant = e.target.value as TypographyVariant))}
          className={controlCls}
        >
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="lead">Lead paragraph</option>
          <option value="body">Body text</option>
          <option value="pullquote">Pull quote</option>
        </select>
      </div>

      {/* Font (built-in families + Google Fonts) */}
      <div>
        <label className={labelCls}>Font</label>
        <FontPicker
          value={props.googleFont}
          onChange={(family) => setProp((p: TypographyBlockProps) => (p.googleFont = family))}
          defaultLabel={BUILT_IN_FONT_LABELS[props.fontFamily || 'sans']}
        />
        {!props.googleFont && (
          <select
            value={props.fontFamily || 'sans'}
            onChange={(e) => setProp((p: TypographyBlockProps) => (p.fontFamily = e.target.value as FontFamily))}
            className={`${controlCls} mt-1.5`}
            title="Built-in font family used when no Google Font is chosen"
          >
            {(Object.keys(BUILT_IN_FONT_LABELS) as FontFamily[]).map((id) => (
              <option key={id} value={id}>
                {BUILT_IN_FONT_LABELS[id]}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Size + color */}
      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div>
          <label className={labelCls}>Size (px)</label>
          <div className="flex items-stretch gap-1">
            <button
              type="button"
              onClick={() => setSizePx(currentPx - 1)}
              className="px-2 border-neo border-neo-ink rounded bg-white hover:bg-neo-bg font-mono font-bold"
              aria-label="Decrease size"
            >
              −
            </button>
            <input
              type="number"
              min={8}
              max={160}
              value={currentPx}
              onChange={(e) => setSizePx(Number(e.target.value))}
              className={`${controlCls} text-center`}
            />
            <button
              type="button"
              onClick={() => setSizePx(currentPx + 1)}
              className="px-2 border-neo border-neo-ink rounded bg-white hover:bg-neo-bg font-mono font-bold"
              aria-label="Increase size"
            >
              +
            </button>
          </div>
        </div>
        <div>
          <label className={labelCls}>Color</label>
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(props.color || '') ? (props.color as string) : '#141414'}
            onChange={(e) => setProp((p: TypographyBlockProps) => (p.color = e.target.value))}
            className="h-[34px] w-10 p-0.5 bg-white border-neo border-neo-ink rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Alignment */}
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
            title={`Align ${id}`}
            onClick={() => setProp((p: TypographyBlockProps) => (p.textAlign = id))}
            className={`py-1.5 flex justify-center items-center border-neo border-neo-ink rounded transition-all ${
              (props.textAlign || 'left') === id ? 'bg-neo-yellow shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
            }`}
          >
            <Icon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        ))}
      </div>

      {/* Everything else, collapsed */}
      <details className="border-neo border-neo-ink rounded bg-neo-bg/50 group/adv">
        <summary className="cursor-pointer select-none px-2.5 py-1.5 font-heading font-semibold uppercase tracking-wider text-[11px] text-neo-ink">
          More options
        </summary>
        <div className="p-2.5 pt-1.5 flex flex-col gap-3 border-t border-neo-ink/20">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col font-mono text-[10px] text-gray-500">
              Line height
              <select
                value={props.lineHeight || '1.6'}
                onChange={(e) => setProp((p: TypographyBlockProps) => (p.lineHeight = e.target.value as TypographyBlockProps['lineHeight']))}
                className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
              >
                <option value="1.2">Tight</option>
                <option value="1.4">Snug</option>
                <option value="1.6">Normal</option>
                <option value="1.8">Loose</option>
              </select>
            </label>
            <label className="flex flex-col font-mono text-[10px] text-gray-500">
              Letter spacing
              <select
                value={props.letterSpacing || '0'}
                onChange={(e) => setProp((p: TypographyBlockProps) => (p.letterSpacing = e.target.value as TypographyBlockProps['letterSpacing']))}
                className="mt-0.5 bg-white border border-neo-ink px-1.5 py-1 rounded text-xs"
              >
                <option value="-0.02em">Tight</option>
                <option value="0">Normal</option>
                <option value="0.04em">Wide</option>
                <option value="0.08em">Wider</option>
              </select>
            </label>
          </div>

          {variant === 'body' && (
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-neo-ink">
                <input
                  type="checkbox"
                  checked={!!props.dropCap}
                  onChange={(e) => setProp((p: TypographyBlockProps) => (p.dropCap = e.target.checked))}
                  className="w-4 h-4 accent-neo-ink rounded"
                />
                Drop cap
              </label>
              {props.dropCap && (
                <div className="flex gap-1">
                  {([2, 3] as const).map((lines) => (
                    <button
                      key={lines}
                      type="button"
                      onClick={() => setProp((p: TypographyBlockProps) => (p.dropCapLines = lines))}
                      className={`px-2 py-0.5 font-mono border border-neo-ink rounded ${
                        (props.dropCapLines || 2) === lines ? 'bg-neo-yellow font-bold' : 'bg-white'
                      }`}
                    >
                      {lines} lines
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <label
            className="flex items-center gap-2 cursor-pointer text-neo-ink"
            title="Adds break-inside: avoid so the block isn't split across e-reader page breaks"
          >
            <input
              type="checkbox"
              checked={!!props.keepTogetherOnPageTurn}
              onChange={(e) => setProp((p: TypographyBlockProps) => (p.keepTogetherOnPageTurn = e.target.checked))}
              className="w-4 h-4 accent-neo-ink rounded"
            />
            Keep on one page
          </label>
        </div>
      </details>
    </div>
  );
};

TypographyBlock.craft = {
  displayName: 'Editorial Typography',
  props: {
    htmlContent: 'Typography is the craft of endowing human language with a durable visual form across responsive screens.',
    variant: 'body',
    fontFamily: 'sans',
    googleFont: undefined,
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
