import React, { useRef, useState } from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import type { FocalPoint } from '../../types/ast';
import { saveAsset } from '../../db/assets';
import { useEditorStore } from '../../store/editorStore';
import { Upload, Crosshair, Bookmark, Image as ImageIcon } from 'lucide-react';

export interface ImageBlockProps {
  src?: string;
  alt?: string;
  caption?: string;
  aspectRatio?: 'original' | '1/1' | '4/5' | '16/9' | '21/9';
  fit?: 'cover' | 'contain';
  focalPoint?: FocalPoint;
  fullBleed?: boolean;
  borderStyle?: 'none' | 'subtle' | 'neo';
  keepTogetherOnPageTurn?: boolean;
}

export const ImageBlock: UserComponent<ImageBlockProps> = ({
  src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
  alt = 'Editorial feature visual',
  caption = '',
  aspectRatio = '4/5',
  fit = 'cover',
  focalPoint = { x: 50, y: 50 },
  fullBleed = false,
  borderStyle = 'none',
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

  const getAspectClass = () => {
    switch (aspectRatio) {
      case '1/1':
        return 'aspect-square';
      case '4/5':
        return 'aspect-[4/5]';
      case '16/9':
        return 'aspect-video';
      case '21/9':
        return 'aspect-[21/9]';
      case 'original':
      default:
        return 'h-auto';
    }
  };

  const getBorderClass = () => {
    switch (borderStyle) {
      case 'neo':
        return 'border-neo border-neo-ink shadow-neo rounded-lg';
      case 'subtle':
        return 'border border-gray-200 rounded-md shadow-sm';
      case 'none':
      default:
        return 'rounded-md';
    }
  };

  return (
    <figure
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative group my-4 transition-all ${
        fullBleed ? '-mx-6 sm:-mx-8' : 'mx-0'
      } ${
        selected ? 'ring-2 ring-neo-yellow ring-offset-2' : hovered ? 'outline outline-1 outline-dashed outline-neo-vermilion' : ''
      }`}
      style={{
        pageBreakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
        breakInside: keepTogetherOnPageTurn ? 'avoid' : 'auto',
      }}
    >
      {/* Badges */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 pointer-events-none">
        {keepTogetherOnPageTurn && (
          <span className="flex items-center gap-0.5 text-[9px] font-mono bg-neo-teal text-neo-ink px-1.5 py-0.5 rounded shadow-neo-sm font-bold">
            <Bookmark className="w-2.5 h-2.5" />
            Keep on Page
          </span>
        )}
        {selected && (
          <span className="flex items-center gap-1 text-[9px] font-mono bg-neo-ink text-neo-yellow px-1.5 py-0.5 rounded shadow-neo-sm font-bold">
            <Crosshair className="w-2.5 h-2.5" />
            {focalPoint.x}% {focalPoint.y}%
          </span>
        )}
      </div>

      <div className={`overflow-hidden bg-gray-100 ${getAspectClass()} ${getBorderClass()} w-full relative`}>
        <img
          src={src}
          alt={alt}
          className="w-full h-full"
          style={{
            objectFit: fit,
            objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
          }}
        />

        {/* Focal Point Crosshair indicator on canvas when selected */}
        {selected && (
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-white bg-neo-vermilion shadow-neo-sm -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 flex items-center justify-center"
            style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
          >
            <div className="w-1 h-1 bg-white rounded-full" />
          </div>
        )}
      </div>

      <figcaption
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          setProp((props: ImageBlockProps) => {
            props.caption = e.currentTarget.textContent || '';
          });
        }}
        className="mt-2 text-xs font-mono text-gray-500 text-center tracking-tight px-2 focus:outline-none"
      >
        {caption || 'Add art-directed caption...'}
      </figcaption>
    </figure>
  );
};

export const ImageSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as ImageBlockProps,
  }));

  const projectId = useEditorStore((state) => state.project.id);
  const pickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePickerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 && e.type !== 'click') return; // only update on drag (left mouse down) or click
    if (!pickerRef.current) return;
    const rect = pickerRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    setProp((p: ImageBlockProps) => {
      p.focalPoint = { x: clampedX, y: clampedY };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const blobUrl = await saveAsset(projectId, file);
      setProp((p: ImageBlockProps) => {
        p.src = blobUrl;
        p.alt = file.name.replace(/\.[^/.]+$/, '');
      });
    } catch (err) {
      console.error('Failed to store image in IndexedDB:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      {/* Upload or URL */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Media Source
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
            <span>{isUploading ? 'Saving Blob...' : 'Upload Local Image'}</span>
          </button>
        </div>

        <input
          type="text"
          value={props.src || ''}
          onChange={(e) => setProp((p: ImageBlockProps) => (p.src = e.target.value))}
          placeholder="Or paste external image URL..."
          className="w-full bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded font-mono text-xs focus:outline-none shadow-neo-sm"
        />
      </div>

      {/* Alt Text */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Alt Description (Accessibility & EPUB)
        </label>
        <input
          type="text"
          value={props.alt || ''}
          onChange={(e) => setProp((p: ImageBlockProps) => (p.alt = e.target.value))}
          placeholder="Concise visual description..."
          className="w-full bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded font-mono text-xs focus:outline-none shadow-neo-sm"
        />
      </div>

      {/* Aspect Ratio Locking */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Aspect Ratio Locking
        </label>
        <div className="grid grid-cols-4 gap-1">
          {(['1/1', '4/5', '16/9', 'original'] as const).map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => setProp((p: ImageBlockProps) => (p.aspectRatio = ratio))}
              className={`py-1 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                props.aspectRatio === ratio ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Focal Point Crosshair Picker */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="font-heading font-semibold text-neo-ink uppercase tracking-wider text-[11px] flex items-center gap-1">
            <Crosshair className="w-3 h-3 text-neo-vermilion" strokeWidth={2.5} />
            Focal Point Crosshair
          </label>
          <span className="font-mono text-[10px] text-gray-700 bg-neo-yellow px-1.5 py-0.5 rounded border border-neo-ink font-bold">
            {props.focalPoint?.x ?? 50}% / {props.focalPoint?.y ?? 50}%
          </span>
        </div>
        <div
          ref={pickerRef}
          onClick={handlePickerMove}
          onMouseMove={handlePickerMove}
          className="relative w-full h-32 border-neo border-neo-ink rounded-lg overflow-hidden cursor-crosshair bg-gray-900 group shadow-neo select-none"
        >
          {props.src && (
            <img
              src={props.src}
              alt="Focal preview"
              className="w-full h-full object-cover opacity-60 pointer-events-none"
            />
          )}
          {/* Yellow Crosshair gridlines */}
          <div
            className="absolute left-0 right-0 h-[1.5px] bg-neo-yellow pointer-events-none"
            style={{ top: `${props.focalPoint?.y ?? 50}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-neo-yellow pointer-events-none"
            style={{ left: `${props.focalPoint?.x ?? 50}%` }}
          />
          {/* Draggable pin */}
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-white bg-neo-vermilion shadow-neo-sm -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
            style={{
              left: `${props.focalPoint?.x ?? 50}%`,
              top: `${props.focalPoint?.y ?? 50}%`,
            }}
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
        <p className="text-[10px] font-mono text-gray-500 mt-1">
          Drag to lock the visual focus point across dynamic viewports.
        </p>
      </div>

      {/* Frame Styling */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Frame Border Style
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { id: 'none', label: 'None' },
              { id: 'subtle', label: 'Subtle 1px' },
              { id: 'neo', label: 'Neo Card' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setProp((p: ImageBlockProps) => (p.borderStyle = s.id))}
              className={`py-1 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                props.borderStyle === s.id ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Full Bleed & Pagination Guardrail */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 cursor-pointer border-neo border-neo-ink p-2 rounded bg-neo-bg/50">
          <input
            type="checkbox"
            checked={!!props.fullBleed}
            onChange={(e) => setProp((p: ImageBlockProps) => (p.fullBleed = e.target.checked))}
            className="w-4 h-4 accent-neo-ink rounded"
          />
          <span className="font-heading font-semibold text-neo-ink">Full-Bleed Margin Breakout</span>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer border-neo border-neo-ink p-2.5 rounded bg-neo-bg/50">
          <input
            type="checkbox"
            checked={props.keepTogetherOnPageTurn ?? true}
            onChange={(e) => setProp((p: ImageBlockProps) => (p.keepTogetherOnPageTurn = e.target.checked))}
            className="w-4 h-4 accent-neo-ink rounded mt-0.5"
          />
          <div className="flex flex-col">
            <span className="font-heading font-bold text-neo-ink flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-neo-teal" />
              Keep on Same Page Turn
            </span>
            <span className="text-[10px] text-gray-500 font-mono mt-0.5">
              Prevents the image and its caption from being severed by an e-reader page break.
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};

ImageBlock.craft = {
  displayName: 'Art-Directed Image',
  props: {
    src: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
    alt: 'Editorial visual',
    caption: 'Fig. 01 — Crosshair art-directed focal point reflow',
    aspectRatio: '4/5',
    fit: 'cover',
    focalPoint: { x: 50, y: 50 },
    fullBleed: false,
    borderStyle: 'none',
    keepTogetherOnPageTurn: true,
  },
  related: {
    toolbar: ImageSettings,
  },
};
