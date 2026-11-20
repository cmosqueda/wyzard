import React, { useRef, useState } from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { Upload, BookKey } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { saveAsset } from '../../db/assets';
import { getTitlePageData } from '../../utils/bookFeatures';

export type TitlePageVariant = 'cover' | 'title' | 'back' | 'dedication';

export interface TitlePageBlockProps {
  variant?: TitlePageVariant;
  /** Dedication text, or a custom back-cover blurb (defaults to the book description) */
  text?: string;
  textColor?: string;
  align?: 'left' | 'center' | 'right';
  backgroundImage?: string;
  /** 0–80: dark overlay over the background image so text stays readable */
  overlay?: number;
  titleSize?: number;
  showSubtitle?: boolean;
  showAuthor?: boolean;
  showPublisher?: boolean;
}

const VARIANT_LABEL: Record<TitlePageVariant, string> = {
  cover: 'Front cover',
  title: 'Title page',
  back: 'Back cover',
  dedication: 'Dedication',
};

/**
 * Cover, title page, back cover and dedication. Title, subtitle, author and publisher come from the
 * book's metadata, so they stay in sync everywhere (edit them in Book Metadata).
 */
export const TitlePageBlock: UserComponent<TitlePageBlockProps> = ({
  variant = 'title',
  text = '',
  textColor = '#111111',
  align = 'center',
  backgroundImage = '',
  overlay = 0,
  titleSize = 38,
  showSubtitle = true,
  showAuthor = true,
  showPublisher = true,
}) => {
  const {
    connectors: { connect, drag },
    selected,
    hovered,
    actions: { setProp },
  } = useNode((node) => ({ selected: node.events.selected, hovered: node.events.hovered }));
  const project = useEditorStore((s) => s.project);
  const d = getTitlePageData(project);

  const alignItems = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative flex-1 flex flex-col justify-center gap-3 overflow-hidden ${
        selected ? 'ring-2 ring-neo-yellow ring-offset-2' : hovered ? 'outline outline-1 outline-dashed outline-neo-vermilion' : ''
      }`}
      style={{
        minHeight: variant === 'cover' || variant === 'back' ? '100%' : 360,
        padding: 28,
        color: textColor,
        textAlign: align,
        alignItems,
        backgroundImage: backgroundImage ? `url("${backgroundImage}")` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {backgroundImage && overlay > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: `rgba(0,0,0,${overlay / 100})` }} />
      )}
      <span className="absolute top-1 left-1 z-20 text-[9px] font-mono font-bold uppercase bg-neo-ink text-neo-yellow px-1.5 py-0.5 rounded pointer-events-none">
        {VARIANT_LABEL[variant]}
      </span>

      <div className="relative z-10 flex flex-col gap-3 max-w-full" style={{ alignItems }}>
        {(variant === 'cover' || variant === 'title') && (
          <>
            <h1 style={{ fontSize: titleSize, lineHeight: 1.1, fontWeight: 800, margin: 0 }}>{d.title}</h1>
            {showSubtitle && d.subtitle && <p style={{ fontSize: Math.round(titleSize * 0.45), margin: 0 }}>{d.subtitle}</p>}
            {showAuthor && d.author && <p style={{ fontSize: 16, margin: '18px 0 0', fontWeight: 600 }}>{d.author}</p>}
            {showPublisher && d.publisher && <p style={{ fontSize: 12, margin: '8px 0 0', opacity: 0.8 }}>{d.publisher}</p>}
          </>
        )}

        {variant === 'back' && (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0, whiteSpace: 'pre-line' }}>{text || d.description}</p>
            {showAuthor && d.author && <p style={{ fontSize: 13, margin: '14px 0 0', fontWeight: 700 }}>{d.author}</p>}
            {showPublisher && d.publisher && <p style={{ fontSize: 12, margin: 0, opacity: 0.8 }}>{d.publisher}</p>}
            {d.isbn && <p style={{ fontSize: 11, margin: '10px 0 0', opacity: 0.8 }}>ISBN {d.isbn}</p>}
          </>
        )}

        {variant === 'dedication' && (
          <div
            contentEditable
            suppressContentEditableWarning
            data-placeholder="For …"
            onBlur={(e) =>
              setProp((p: TitlePageBlockProps) => {
                p.text = e.currentTarget.textContent || '';
              })
            }
            className="focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:opacity-50"
            style={{ fontSize: 20, fontStyle: 'italic', lineHeight: 1.5, whiteSpace: 'pre-line', maxWidth: '85%' }}
          >
            {text || 'For everyone who reads this.'}
          </div>
        )}
      </div>
    </div>
  );
};

export const TitlePageSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as TitlePageBlockProps }));
  const projectId = useEditorStore((s) => s.project.id);
  const setMetadataOpen = useEditorStore((s) => s.setMetadataOpen);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const variant = props.variant || 'title';

  const label = 'font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]';
  const field = 'w-full bg-white border-neo border-neo-ink px-2 py-1.5 rounded font-mono text-xs shadow-neo-sm';

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await saveAsset(projectId, file);
      setProp((p: TitlePageBlockProps) => {
        p.backgroundImage = url;
        if (!p.overlay) p.overlay = 35;
      });
    } catch {
      // saveAsset already shows a toast
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs font-sans">
      <div>
        <label className={label}>Kind</label>
        <select
          value={variant}
          onChange={(e) => setProp((p: TitlePageBlockProps) => (p.variant = e.target.value as TitlePageVariant))}
          className={field}
        >
          {(Object.keys(VARIANT_LABEL) as TitlePageVariant[]).map((v) => (
            <option key={v} value={v}>
              {VARIANT_LABEL[v]}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setMetadataOpen(true)}
        className="flex items-center justify-center gap-1.5 py-1.5 border-neo border-neo-ink rounded bg-white hover:bg-neo-yellow/40 font-mono font-bold"
      >
        <BookKey className="w-3.5 h-3.5 text-neo-vermilion" /> Edit title, author &amp; publisher
      </button>

      {variant === 'back' && (
        <div>
          <label className={label}>Back-cover text</label>
          <textarea
            rows={4}
            value={props.text || ''}
            placeholder="Leave empty to use the book description"
            onChange={(e) => setProp((p: TitlePageBlockProps) => (p.text = e.target.value))}
            className={field}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 items-end">
        <label className="flex flex-col font-mono text-[10px] text-gray-500">
          Text colour
          <input
            type="color"
            value={props.textColor || '#111111'}
            onChange={(e) => setProp((p: TitlePageBlockProps) => (p.textColor = e.target.value))}
            className="mt-0.5 h-8 w-full p-0.5 bg-white border-neo border-neo-ink rounded cursor-pointer"
          />
        </label>
        <label className="flex flex-col font-mono text-[10px] text-gray-500">
          Alignment
          <select
            value={props.align || 'center'}
            onChange={(e) => setProp((p: TitlePageBlockProps) => (p.align = e.target.value as TitlePageBlockProps['align']))}
            className="mt-0.5 bg-white border-neo border-neo-ink px-2 py-1.5 rounded font-mono text-xs"
          >
            <option value="left">Left</option>
            <option value="center">Centre</option>
            <option value="right">Right</option>
          </select>
        </label>
      </div>

      {(variant === 'cover' || variant === 'title') && (
        <label className="flex flex-col font-mono text-[10px] text-gray-500">
          Title size ({props.titleSize ?? 38}px)
          <input
            type="range"
            min={20}
            max={90}
            value={props.titleSize ?? 38}
            onChange={(e) => setProp((p: TitlePageBlockProps) => (p.titleSize = Number(e.target.value)))}
            className="accent-neo-ink"
          />
        </label>
      )}

      <div className="flex flex-col gap-1.5 border-neo border-neo-ink rounded bg-neo-bg/50 p-2.5">
        {(
          [
            ['showSubtitle', 'Show subtitle'],
            ['showAuthor', 'Show author'],
            ['showPublisher', 'Show publisher'],
          ] as const
        ).map(([key, text]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer text-neo-ink">
            <input
              type="checkbox"
              checked={props[key] ?? true}
              onChange={(e) => setProp((p: TitlePageBlockProps) => (p[key] = e.target.checked))}
              className="w-4 h-4 accent-neo-ink"
            />
            {text}
          </label>
        ))}
      </div>

      {(variant === 'cover' || variant === 'back' || variant === 'title') && (
        <div className="flex flex-col gap-2">
          <label className={label}>Background image</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-neo-yellow text-neo-ink font-mono font-bold border-neo border-neo-ink rounded shadow-neo-sm"
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={2.5} /> {uploading ? 'Uploading…' : 'Upload image'}
            </button>
            {props.backgroundImage && (
              <button
                type="button"
                onClick={() => setProp((p: TitlePageBlockProps) => (p.backgroundImage = ''))}
                className="px-2 border-neo border-neo-ink rounded bg-white hover:bg-neo-bg font-mono font-bold"
              >
                Remove
              </button>
            )}
          </div>
          {props.backgroundImage && (
            <label className="flex flex-col font-mono text-[10px] text-gray-500">
              Dark overlay ({props.overlay ?? 0}%)
              <input
                type="range"
                min={0}
                max={80}
                value={props.overlay ?? 0}
                onChange={(e) => setProp((p: TitlePageBlockProps) => (p.overlay = Number(e.target.value)))}
                className="accent-neo-ink"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
};

TitlePageBlock.craft = {
  displayName: 'Cover / Title Page',
  props: {
    variant: 'title',
    text: '',
    textColor: '#111111',
    align: 'center',
    backgroundImage: '',
    overlay: 0,
    titleSize: 38,
    showSubtitle: true,
    showAuthor: true,
    showPublisher: true,
  },
  related: { toolbar: TitlePageSettings },
};
