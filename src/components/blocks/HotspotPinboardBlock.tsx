import React, { useRef, useState } from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { saveAsset } from '../../db/assets';
import { useEditorStore } from '../../store/editorStore';
import { MapPin, Plus, Trash2, Upload, Bookmark, X, Eye } from 'lucide-react';

export interface HotspotPin {
  id: string;
  number: number;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  title: string;
  description: string;
}

export interface HotspotPinboardProps {
  imageSrc?: string;
  alt?: string;
  caption?: string;
  pins?: HotspotPin[];
  activePinId?: string | null;
  keepTogetherOnPageTurn?: boolean;
}

export const HotspotPinboardBlock: UserComponent<HotspotPinboardProps> = ({
  imageSrc = 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1200&q=80',
  alt = 'Annotated architectural diagram',
  caption = 'Fig. 02 — Interactive architectural anatomy with numbered hotspots',
  pins = [
    {
      id: 'pin-1',
      number: 1,
      x: 32,
      y: 40,
      title: 'Typographic Hierarchy',
      description: 'Primary visual weight anchors the reader before reflowing into subheads.',
    },
    {
      id: 'pin-2',
      number: 2,
      x: 68,
      y: 55,
      title: 'Focal Point Cropping',
      description: 'Preserved aspect focal coordinate keeps key visual subject centered on phones.',
    },
  ],
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

  const [activePinId, setActivePinId] = useState<string | null>(pins[0]?.id || null);

  // Live pin drag state (committed to node props on pointer release)
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const justDraggedRef = useRef(false);

  const positionedPins = pins.map((p) =>
    dragPos && dragPos.id === p.id ? { ...p, x: dragPos.x, y: dragPos.y } : p
  );
  const activePin = positionedPins.find((p) => p.id === activePinId);

  const pointToPercent = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v * 10) / 10));
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    };
  };

  const handlePinPointerDown = (e: React.PointerEvent<HTMLButtonElement>, pinId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { id: pinId, startX: e.clientX, startY: e.clientY, moved: false };
  };

  const handlePinPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return;
    drag.moved = true;
    const pos = pointToPercent(e.clientX, e.clientY);
    if (pos) setDragPos({ id: drag.id, ...pos });
  };

  const handlePinPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!drag || !drag.moved) return;
    justDraggedRef.current = true;
    setTimeout(() => (justDraggedRef.current = false), 0);
    const pos = pointToPercent(e.clientX, e.clientY);
    setDragPos(null);
    if (pos) {
      setProp((p: HotspotPinboardProps) => {
        p.pins = (p.pins || []).map((pin) => (pin.id === drag.id ? { ...pin, ...pos } : pin));
      });
    }
  };

  return (
    <figure
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative group my-5 transition-all ${
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
        <span className="text-[9px] font-mono bg-neo-vermilion text-white px-1.5 py-0.5 rounded shadow-neo-sm font-bold">
          {pins.length} Hotspots
        </span>
      </div>

      {/* Main Image with Hotspot Pins */}
      <div
        ref={boardRef}
        className="relative w-full rounded-lg overflow-hidden border-neo border-neo-ink bg-gray-900 shadow-neo aspect-[16/10]"
      >
        <img
          src={imageSrc}
          alt={alt}
          className="w-full h-full object-cover select-none pointer-events-none"
        />

        {/* Hotspot Pins */}
        {positionedPins.map((pin) => {
          const isActive = pin.id === activePinId;
          const isDragging = dragPos?.id === pin.id;
          return (
            <button
              key={pin.id}
              type="button"
              draggable={false}
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => handlePinPointerDown(e, pin.id)}
              onPointerMove={handlePinPointerMove}
              onPointerUp={handlePinPointerUp}
              onPointerCancel={handlePinPointerUp}
              onClick={(e) => {
                e.stopPropagation();
                if (justDraggedRef.current) return;
                setActivePinId(isActive ? null : pin.id);
              }}
              style={{ left: `${pin.x}%`, top: `${pin.y}%`, touchAction: 'none' }}
              className={`absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-neo border-neo-ink font-mono font-bold text-xs flex items-center justify-center hover:scale-110 shadow-neo-sm z-10 ${
                isDragging ? 'cursor-grabbing scale-125' : 'cursor-grab transition-transform active:scale-95'
              } ${
                isActive
                  ? 'bg-neo-vermilion text-white ring-4 ring-white/60 scale-110'
                  : 'bg-neo-yellow text-neo-ink'
              }`}
              title={`${pin.number}. ${pin.title} — drag to move`}
            >
              {pin.number}
            </button>
          );
        })}

        {/* Active Hotspot Popover Tooltip */}
        {activePin && (
          <div
            className="absolute z-20 w-64 bg-white/95 backdrop-blur-sm border-neo border-neo-ink rounded-lg p-3 shadow-neo animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: `${Math.min(75, Math.max(25, activePin.x))}%`,
              top: activePin.y > 60 ? `${activePin.y - 12}%` : `${activePin.y + 12}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-gray-200">
              <span className="font-heading font-bold text-xs text-neo-ink flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-neo-vermilion text-white text-[10px] flex items-center justify-center font-mono">
                  {activePin.number}
                </span>
                {activePin.title}
              </span>
              <button
                onClick={() => setActivePinId(null)}
                className="text-gray-400 hover:text-neo-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="font-sans text-[11px] text-gray-700 leading-relaxed">
              {activePin.description}
            </p>
          </div>
        )}
      </div>

      <figcaption
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          setProp((p: HotspotPinboardProps) => {
            p.caption = e.currentTarget.textContent || '';
          });
        }}
        className="mt-2 text-xs font-mono text-gray-500 text-center tracking-tight px-2 focus:outline-none"
      >
        {caption}
      </figcaption>

      {/* EPUB Semantic Fallback Preview Card List */}
      <div className="mt-3 p-3 bg-neo-bg/60 border border-neo-ink/30 rounded-lg">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1">
          EPUB 3 Fallback Footnotes Preview
        </span>
        <ol className="list-decimal list-inside space-y-1 text-[11px] font-sans text-gray-700">
          {pins.map((pin) => (
            <li key={pin.id}>
              <strong>{pin.title}:</strong> {pin.description}
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
};

export const HotspotPinboardSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as HotspotPinboardProps,
  }));

  const projectId = useEditorStore((state) => state.project.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);

  const pins = props.pins || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const blobUrl = await saveAsset(projectId, file);
      setProp((p: HotspotPinboardProps) => {
        p.imageSrc = blobUrl;
      });
    } catch (err) {
      console.error('Failed to store pinboard image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPin = () => {
    const nextNumber = pins.length + 1;
    const newPin: HotspotPin = {
      id: 'pin-' + Date.now(),
      number: nextNumber,
      x: 50,
      y: 50,
      title: `Feature Detail ${nextNumber}`,
      description: 'Add explanatory context for this visual hotspot pin.',
    };

    setProp((p: HotspotPinboardProps) => {
      p.pins = [...(p.pins || []), newPin];
    });
    setEditingPinId(newPin.id);
  };

  const handleDeletePin = (pinId: string) => {
    setProp((p: HotspotPinboardProps) => {
      p.pins = (p.pins || [])
        .filter((pin) => pin.id !== pinId)
        .map((pin, idx) => ({ ...pin, number: idx + 1 }));
    });
    if (editingPinId === pinId) setEditingPinId(null);
  };

  const handleUpdatePin = (pinId: string, updates: Partial<HotspotPin>) => {
    setProp((p: HotspotPinboardProps) => {
      p.pins = (p.pins || []).map((pin) =>
        pin.id === pinId ? { ...pin, ...updates } : pin
      );
    });
  };

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      <div className="p-2.5 bg-neo-teal/15 border-neo border-neo-teal rounded-lg">
        <span className="font-heading font-bold text-neo-ink uppercase tracking-wider text-[11px] block mb-1">
          Dual-Target Behavior
        </span>
        <p className="text-[11px] text-gray-700 leading-normal">
          Interactive tap-to-reveal popovers on the <strong>Web</strong> degrade cleanly into an annotated image with ordered footnote cards (<code className="bg-white px-1 py-0.2 rounded border border-gray-300">&lt;aside epub:type="footnote"&gt;</code>) in <strong>EPUB 3</strong>.
        </p>
      </div>

      {/* Image Source */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Diagram / Photo Source
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
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-neo-yellow text-neo-ink font-mono font-bold border-neo border-neo-ink rounded shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            <Upload className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>{isUploading ? 'Uploading...' : 'Upload Local Image'}</span>
          </button>
        </div>
        <input
          type="text"
          value={props.imageSrc || ''}
          onChange={(e) => setProp((p: HotspotPinboardProps) => (p.imageSrc = e.target.value))}
          placeholder="https://..."
          className="w-full bg-white border-neo border-neo-ink px-2.5 py-1.5 rounded font-mono text-xs focus:outline-none shadow-neo-sm"
        />
      </div>

      {/* Pins List & Management */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-heading font-semibold text-neo-ink uppercase tracking-wider text-[11px]">
            Hotspot Pins ({pins.length})
          </label>
          <button
            type="button"
            onClick={handleAddPin}
            className="flex items-center gap-1 text-[11px] font-mono font-bold bg-neo-yellow text-neo-ink border-neo border-neo-ink px-2 py-0.5 rounded shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px]"
          >
            <Plus className="w-3 h-3" strokeWidth={3} />
            <span>Add Pin</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {pins.map((pin) => {
            const isEditing = editingPinId === pin.id;
            return (
              <div
                key={pin.id}
                className="p-2.5 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm"
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setEditingPinId(isEditing ? null : pin.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-neo-ink text-neo-yellow font-mono text-[10px] flex items-center justify-center font-bold">
                      {pin.number}
                    </span>
                    <span className="font-heading font-bold text-xs text-neo-ink truncate w-36">
                      {pin.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-gray-500">
                      {pin.x}% / {pin.y}%
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePin(pin.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-3 pt-2 border-t border-gray-200 flex flex-col gap-2 animate-in fade-in duration-100">
                    <div>
                      <span className="font-mono text-[10px] text-gray-500 block mb-0.5">
                        Pin Title
                      </span>
                      <input
                        type="text"
                        value={pin.title}
                        onChange={(e) => handleUpdatePin(pin.id, { title: e.target.value })}
                        className="w-full bg-neo-bg border border-neo-ink px-2 py-1 rounded font-heading font-semibold text-xs"
                      />
                    </div>

                    <div>
                      <span className="font-mono text-[10px] text-gray-500 block mb-0.5">
                        Description / Annotation
                      </span>
                      <textarea
                        rows={2}
                        value={pin.description}
                        onChange={(e) => handleUpdatePin(pin.id, { description: e.target.value })}
                        className="w-full bg-neo-bg border border-neo-ink px-2 py-1 rounded font-sans text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-mono text-[10px] text-gray-500 block mb-0.5">
                          X Position ({pin.x}%)
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={pin.x}
                          onChange={(e) => handleUpdatePin(pin.id, { x: Number(e.target.value) })}
                          className="w-full accent-neo-ink"
                        />
                      </div>
                      <div>
                        <span className="font-mono text-[10px] text-gray-500 block mb-0.5">
                          Y Position ({pin.y}%)
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={pin.y}
                          onChange={(e) => handleUpdatePin(pin.id, { y: Number(e.target.value) })}
                          className="w-full accent-neo-ink"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

HotspotPinboardBlock.craft = {
  displayName: 'Illustrated Hotspot Pinboard',
  props: {
    imageSrc: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1200&q=80',
    alt: 'Annotated architectural diagram',
    caption: 'Fig. 02 — Interactive architectural anatomy with numbered hotspots',
    pins: [
      {
        id: 'pin-1',
        number: 1,
        x: 32,
        y: 40,
        title: 'Typographic Hierarchy',
        description: 'Primary visual weight anchors the reader before reflowing into subheads.',
      },
      {
        id: 'pin-2',
        number: 2,
        x: 68,
        y: 55,
        title: 'Focal Point Cropping',
        description: 'Preserved aspect focal coordinate keeps key visual subject centered on phones.',
      },
    ],
    keepTogetherOnPageTurn: true,
  },
  related: {
    toolbar: HotspotPinboardSettings,
  },
};
