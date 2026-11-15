import React, { useRef, useState } from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { useEditorStore } from '../../store/editorStore';
import { saveAsset } from '../../db/assets';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Upload,
  Bookmark,
  LayoutGrid,
  Layers,
} from 'lucide-react';

export interface GallerySlide {
  id: string;
  imageSrc: string;
  title: string;
  caption: string;
}

export interface VisualGalleryProps {
  slides?: GallerySlide[];
  desktopLayout?: 'carousel' | 'grid-2' | 'grid-3';
  aspectRatio?: '16/9' | '4/3' | '1/1' | '4/5';
  keepTogetherOnPageTurn?: boolean;
}

export const VisualGalleryBlock: UserComponent<VisualGalleryProps> = ({
  slides = [
    {
      id: 'slide-1',
      imageSrc: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=80',
      title: 'Plate 01: Typographic Grid',
      caption: 'Form follows reader viewport constraints.',
    },
    {
      id: 'slide-2',
      imageSrc: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1000&q=80',
      title: 'Plate 02: Modular Composition',
      caption: 'Flexible column spans adjust gracefully to desktop spreads.',
    },
    {
      id: 'slide-3',
      imageSrc: 'https://images.unsplash.com/photo-1507842229451-79b1be8d6290?auto=format&fit=crop&w=1000&q=80',
      title: 'Plate 03: Editorial Artifacts',
      caption: 'Modern digital publications retain the tactility of print.',
    },
  ],
  desktopLayout = 'grid-3',
  aspectRatio = '4/3',
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

  const viewportMode = useEditorStore((state) => state.viewportMode);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const isMobile = viewportMode === 'mobile';
  const isGridOnDesktop = !isMobile && desktopLayout !== 'carousel';

  const getAspectClass = () => {
    switch (aspectRatio) {
      case '1/1':
        return 'aspect-square';
      case '16/9':
        return 'aspect-video';
      case '4/5':
        return 'aspect-[4/5]';
      case '4/3':
      default:
        return 'aspect-[4/3]';
    }
  };

  const getDesktopGridCols = () => {
    if (desktopLayout === 'grid-2') return 'grid-cols-2';
    return 'grid-cols-3';
  };

  const currentSlide = slides[currentSlideIndex] || slides[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
  };

  return (
    <section
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
      {/* Breakpoint tag indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1">
          <Layers className="w-3 h-3 text-neo-teal" />
          Editorial Visual Gallery ({slides.length} Plates)
        </span>

        <div className="flex items-center gap-1">
          {keepTogetherOnPageTurn && (
            <span className="flex items-center gap-0.5 text-[9px] font-mono bg-neo-teal text-neo-ink px-1.5 py-0.5 rounded shadow-neo-sm font-bold">
              <Bookmark className="w-2.5 h-2.5" />
              Keep on Page
            </span>
          )}
          {isGridOnDesktop ? (
            <span className="text-[10px] font-mono bg-neo-violet text-white px-1.5 py-0.5 rounded shadow-neo-sm font-bold">
              Desktop: {desktopLayout === 'grid-2' ? '2-Col Grid' : '3-Col Grid'}
            </span>
          ) : (
            <span className="text-[10px] font-mono bg-neo-yellow text-neo-ink px-1.5 py-0.5 rounded border border-neo-ink font-semibold">
              Mobile: Swipe Deck
            </span>
          )}
        </div>
      </div>

      {/* Render Mode: Desktop Grid vs Mobile Swipe Carousel */}
      {isGridOnDesktop ? (
        /* Desktop Multi-Column Grid Spread */
        <div className={`grid ${getDesktopGridCols()} gap-4`}>
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className="bg-white border-neo border-neo-ink rounded-lg overflow-hidden shadow-neo flex flex-col"
            >
              <div className={`w-full overflow-hidden bg-gray-100 ${getAspectClass()}`}>
                <img
                  src={slide.imageSrc}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 flex flex-col">
                <span className="font-heading font-bold text-xs text-neo-ink mb-0.5 truncate">
                  {slide.title}
                </span>
                <span className="font-mono text-[10px] text-gray-500 line-clamp-2">
                  {slide.caption}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Mobile Swipe Deck Carousel */
        <div className="relative w-full bg-white border-neo border-neo-ink rounded-xl overflow-hidden shadow-neo">
          {/* Active Image */}
          <div className={`w-full overflow-hidden bg-gray-900 relative ${getAspectClass()}`}>
            {currentSlide && (
              <img
                src={currentSlide.imageSrc}
                alt={currentSlide.title}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            )}

            {/* Carousel Navigation Arrows */}
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border-neo border-neo-ink text-neo-ink flex items-center justify-center shadow-neo-sm hover:scale-105 active:scale-95 transition-all z-10"
              title="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border-neo border-neo-ink text-neo-ink flex items-center justify-center shadow-neo-sm hover:scale-105 active:scale-95 transition-all z-10"
              title="Next slide"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Active Slide Editorial Info */}
          <div className="p-4 bg-white flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className="font-heading font-bold text-sm text-neo-ink">
                {currentSlide?.title}
              </span>
              <span className="font-mono text-[10px] text-gray-500 font-bold bg-neo-bg px-2 py-0.5 rounded border border-neo-ink">
                {currentSlideIndex + 1} / {slides.length}
              </span>
            </div>
            <p className="font-sans text-xs text-gray-600 leading-relaxed">
              {currentSlide?.caption}
            </p>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-1.5 mt-3 pt-2 border-t border-gray-100">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlideIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentSlideIndex ? 'w-6 bg-neo-vermilion' : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export const VisualGallerySettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as VisualGalleryProps,
  }));

  const projectId = useEditorStore((state) => state.project.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeUploadSlideId, setActiveUploadSlideId] = useState<string | null>(null);

  const slides = props.slides || [];

  const handleAddSlide = () => {
    const nextIdx = slides.length + 1;
    const newSlide: GallerySlide = {
      id: 'slide-' + Date.now(),
      imageSrc: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=80',
      title: `Plate 0${nextIdx}: Visual Spread`,
      caption: 'Detailed editorial plate description.',
    };
    setProp((p: VisualGalleryProps) => {
      p.slides = [...(p.slides || []), newSlide];
    });
  };

  const handleDeleteSlide = (slideId: string) => {
    if (slides.length <= 1) {
      alert("A gallery must have at least one slide.");
      return;
    }
    setProp((p: VisualGalleryProps) => {
      p.slides = (p.slides || []).filter((s) => s.id !== slideId);
    });
  };

  const handleUpdateSlide = (slideId: string, updates: Partial<GallerySlide>) => {
    setProp((p: VisualGalleryProps) => {
      p.slides = (p.slides || []).map((s) =>
        s.id === slideId ? { ...s, ...updates } : s
      );
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadSlideId) return;

    setIsUploading(true);
    try {
      const blobUrl = await saveAsset(projectId, file);
      handleUpdateSlide(activeUploadSlideId, { imageSrc: blobUrl });
    } catch (err) {
      console.error('Failed to upload slide image:', err);
    } finally {
      setIsUploading(false);
      setActiveUploadSlideId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      <div className="p-2.5 bg-neo-teal/15 border-neo border-neo-teal rounded-lg">
        <span className="font-heading font-bold text-neo-ink uppercase tracking-wider text-[11px] block mb-1">
          Dual-Target Behavior
        </span>
        <p className="text-[11px] text-gray-700 leading-normal">
          On <strong>Mobile Web</strong>, this displays as an interactive swipeable deck. On <strong>Desktop Web</strong>, it expands into an editorial grid. In <strong>EPUB 3</strong>, it unwraps into stacked figures so e-reader page turns are never hijacked.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Desktop Layout Preset */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Desktop Reflow Layout
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { id: 'grid-3', label: '3-Col Grid' },
              { id: 'grid-2', label: '2-Col Grid' },
              { id: 'carousel', label: 'Deck' },
            ] as const
          ).map((lay) => (
            <button
              key={lay.id}
              type="button"
              onClick={() => setProp((p: VisualGalleryProps) => (p.desktopLayout = lay.id))}
              className={`py-1.5 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                props.desktopLayout === lay.id ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {lay.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Slide Aspect Ratio
        </label>
        <div className="grid grid-cols-4 gap-1">
          {(['4/3', '16/9', '1/1', '4/5'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setProp((p: VisualGalleryProps) => (p.aspectRatio = r))}
              className={`py-1 text-center font-mono border-neo border-neo-ink rounded transition-all ${
                props.aspectRatio === r ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white hover:bg-neo-bg'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Slide Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-heading font-semibold text-neo-ink uppercase tracking-wider text-[11px]">
            Gallery Plates ({slides.length})
          </label>
          <button
            type="button"
            onClick={handleAddSlide}
            className="flex items-center gap-1 text-[11px] font-mono font-bold bg-neo-yellow text-neo-ink border-neo border-neo-ink px-2 py-0.5 rounded shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px]"
          >
            <Plus className="w-3 h-3" strokeWidth={3} />
            <span>Add Plate</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className="p-2.5 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-xs text-neo-ink">
                  Plate #{idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveUploadSlideId(slide.id);
                      fileInputRef.current?.click();
                    }}
                    className="p-1 hover:bg-neo-bg rounded border border-gray-300 flex items-center gap-1 font-mono text-[10px]"
                    title="Upload image"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload</span>
                  </button>
                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <input
                type="text"
                value={slide.imageSrc}
                onChange={(e) => handleUpdateSlide(slide.id, { imageSrc: e.target.value })}
                placeholder="Image URL..."
                className="w-full bg-neo-bg border border-neo-ink px-2 py-1 rounded font-mono text-[11px]"
              />

              <input
                type="text"
                value={slide.title}
                onChange={(e) => handleUpdateSlide(slide.id, { title: e.target.value })}
                placeholder="Plate title..."
                className="w-full bg-neo-bg border border-neo-ink px-2 py-1 rounded font-heading font-semibold text-xs"
              />

              <input
                type="text"
                value={slide.caption}
                onChange={(e) => handleUpdateSlide(slide.id, { caption: e.target.value })}
                placeholder="Caption text..."
                className="w-full bg-neo-bg border border-neo-ink px-2 py-1 rounded font-sans text-xs"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

VisualGalleryBlock.craft = {
  displayName: 'Visual Gallery / Carousel',
  props: {
    slides: [
      {
        id: 'slide-1',
        imageSrc: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=80',
        title: 'Plate 01: Typographic Grid',
        caption: 'Form follows reader viewport constraints.',
      },
      {
        id: 'slide-2',
        imageSrc: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1000&q=80',
        title: 'Plate 02: Modular Composition',
        caption: 'Flexible column spans adjust gracefully to desktop spreads.',
      },
      {
        id: 'slide-3',
        imageSrc: 'https://images.unsplash.com/photo-1507842229451-79b1be8d6290?auto=format&fit=crop&w=1000&q=80',
        title: 'Plate 03: Editorial Artifacts',
        caption: 'Modern digital publications retain the tactility of print.',
      },
    ],
    desktopLayout: 'grid-3',
    aspectRatio: '4/3',
    keepTogetherOnPageTurn: true,
  },
  related: {
    toolbar: VisualGallerySettings,
  },
};
