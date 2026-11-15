import React from 'react';
import { useEditor, Element } from '@craftjs/core';
import { TypographyBlock } from '../../blocks/TypographyBlock';
import { ImageBlock } from '../../blocks/ImageBlock';
import { HeroSpreadBlock } from '../../blocks/HeroSpreadBlock';
import { SplitContainer } from '../../blocks/SplitContainer';
import { CalloutCardBlock } from '../../blocks/CalloutCardBlock';
import { OrnamentDividerBlock } from '../../blocks/OrnamentDividerBlock';
import { AccordionBlock } from '../../blocks/AccordionBlock';
import { HotspotPinboardBlock } from '../../blocks/HotspotPinboardBlock';
import { VisualGalleryBlock } from '../../blocks/VisualGalleryBlock';
import { AudioNarrationBlock } from '../../blocks/AudioNarrationBlock';
import { FreeformCanvasBlock } from '../../blocks/FreeformCanvasBlock';
import {
  Type,
  Image as ImageIcon,
  LayoutTemplate,
  Columns,
  Quote,
  Heading1,
  Sparkles,
  Minus,
  HelpCircle,
  MapPin,
  GalleryHorizontal,
  Volume2,
  Palette,
} from 'lucide-react';

export const BlockPalette: React.FC = () => {
  const { connectors } = useEditor();

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b-neo border-neo-ink bg-neo-bg">
        <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-neo-ink">
          Editorial Blocks
        </h3>
        <p className="text-[10px] font-mono text-gray-500">
          Drag blocks onto the mobile canvas
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* Section: Typography */}
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-2 block">
            Typography Modules
          </span>
          <div className="grid grid-cols-2 gap-2">
            {/* Display Heading */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(
                    ref,
                    <TypographyBlock
                      text="Editorial Headline"
                      variant="h1"
                      textAlign="left"
                    />
                  );
                }
              }}
              className="group flex flex-col items-center justify-center p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all"
            >
              <Heading1 className="w-5 h-5 text-neo-vermilion mb-1 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              <span className="font-heading font-bold text-[11px] text-neo-ink">Display H1</span>
            </div>

            {/* Standard Body Copy */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(
                    ref,
                    <TypographyBlock
                      text="Crafting durable visual prose across responsive viewports requires attention to rhythm and relative scales."
                      variant="body"
                      dropCap={true}
                    />
                  );
                }
              }}
              className="group flex flex-col items-center justify-center p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all"
            >
              <Type className="w-5 h-5 text-neo-ink mb-1 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              <span className="font-heading font-bold text-[11px] text-neo-ink">Body + DropCap</span>
            </div>

            {/* Pull Quote */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(
                    ref,
                    <TypographyBlock
                      text="“Reflow is not a restriction—it is the living pulse of reading on the web.”"
                      variant="pullquote"
                      textAlign="left"
                      keepTogetherOnPageTurn={true}
                    />
                  );
                }
              }}
              className="group flex flex-col items-center justify-center p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all col-span-2"
            >
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-neo-yellow mb-0.5" strokeWidth={3} />
                <span className="font-heading font-bold text-[11px] text-neo-ink">Editorial Pull Quote</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Art-Directed Visuals */}
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-2 block">
            Art Direction & Spreads
          </span>
          <div className="flex flex-col gap-2">
            {/* Image Block */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(
                    ref,
                    <ImageBlock
                      aspectRatio="4/5"
                      caption="Fig. 01 — Crosshair art-directed focal point"
                      focalPoint={{ x: 50, y: 50 }}
                    />
                  );
                }
              }}
              className="group flex items-center gap-3 p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all"
            >
              <div className="p-2 bg-neo-yellow/30 rounded border border-neo-ink">
                <ImageIcon className="w-5 h-5 text-neo-ink" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-xs text-neo-ink">Focal Point Image</span>
                <span className="text-[10px] font-mono text-gray-500">Crosshair cropped with safe reflow</span>
              </div>
            </div>

            {/* Magazine Hero Spread */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(
                    ref,
                    <HeroSpreadBlock
                      kicker="COVER SPREAD"
                      title="The Reflow Manifesto"
                      subtitle="Designing publications that breathe across screen aspect ratios."
                      author="Wyzard Editorial"
                      overlayOpacity={50}
                    />
                  );
                }
              }}
              className="group flex items-center gap-3 p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all"
            >
              <div className="p-2 bg-neo-vermilion/20 rounded border border-neo-ink">
                <LayoutTemplate className="w-5 h-5 text-neo-vermilion" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-xs text-neo-ink">Magazine Hero Spread</span>
                <span className="text-[10px] font-mono text-gray-500">Scrim overlay + floating card</span>
              </div>
            </div>

            {/* Adaptive Multi-Column / Grid */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(
                    ref,
                    <Element is={SplitContainer} desktopRatio="60/40" gap="md" canvas />
                  );
                }
              }}
              className="group flex items-center gap-3 p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all"
            >
              <div className="p-2 bg-neo-violet/20 rounded border border-neo-ink">
                <Columns className="w-5 h-5 text-neo-violet" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-xs text-neo-ink">Adaptive Column / Grid</span>
                <span className="text-[10px] font-mono text-gray-500">2-Col, 3-Col, 4-Col &amp; Bento Grid</span>
              </div>
            </div>

            {/* Freeform Visual Canvas Block (Canva / Illustrator Mode) */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(ref, <FreeformCanvasBlock />);
                }
              }}
              className="group flex items-center gap-3 p-3 bg-neo-yellow/20 border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all"
            >
              <div className="p-2 bg-neo-ink text-neo-yellow rounded border border-neo-ink">
                <Palette className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-xs text-neo-ink">Fixed Visual Canvas</span>
                <span className="text-[10px] font-mono text-gray-600">Canva-style 2D freeform artboard</span>
              </div>
            </div>

            {/* Editorial Callout Box */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(
                    ref,
                    <CalloutCardBlock
                      accent="yellow"
                      icon="sparkles"
                      title="NOTEWORTHY PASSAGE"
                      content="Secondary text cards provide rhythm and editorial breathing room."
                      keepTogetherOnPageTurn={true}
                    />
                  );
                }
              }}
              className="group flex items-center gap-3 p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all"
            >
              <div className="p-2 bg-neo-yellow/30 rounded border border-neo-ink">
                <Sparkles className="w-5 h-5 text-neo-ink" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-xs text-neo-ink">Editorial Aside Box</span>
                <span className="text-[10px] font-mono text-gray-500">Key insights &amp; contextual notes</span>
              </div>
            </div>

            {/* Scene Break Ornament */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(
                    ref,
                    <OrnamentDividerBlock
                      type="asterisms"
                      spacingY="md"
                    />
                  );
                }
              }}
              className="group flex items-center gap-3 p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all"
            >
              <div className="p-2 bg-neo-bg rounded border border-neo-ink">
                <Minus className="w-5 h-5 text-neo-ink" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-xs text-neo-ink">Scene Break (✦ ✦ ✦)</span>
                <span className="text-[10px] font-mono text-gray-500">Asterisms &amp; decorative rules</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Interactive & Multimedia */}
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neo-teal mb-2 block flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-neo-teal" />
            Interactive &amp; Multimedia (Dual-Target)
          </span>
          <div className="flex flex-col gap-2">
            {/* Interactive Accordion */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(
                    ref,
                    <AccordionBlock
                      badge="EXPLAINER"
                      title="Curator Lore & Context"
                      content="Interactive accordions invite reader curiosity without cluttering the initial vertical mobile layout."
                      accent="yellow"
                    />
                  );
                }
              }}
              className="group flex items-center gap-3 p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all"
            >
              <div className="p-2 bg-neo-yellow/30 rounded border border-neo-ink">
                <HelpCircle className="w-5 h-5 text-neo-ink" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-xs text-neo-ink">Interactive Accordion</span>
                <span className="text-[10px] font-mono text-gray-500">Drawer on Web • &lt;details&gt; in EPUB</span>
              </div>
            </div>

            {/* Hotspot Pinboard */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(
                    ref,
                    <HotspotPinboardBlock />
                  );
                }
              }}
              className="group flex items-center gap-3 p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all"
            >
              <div className="p-2 bg-neo-vermilion/20 rounded border border-neo-ink">
                <MapPin className="w-5 h-5 text-neo-vermilion" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-xs text-neo-ink">Hotspot Pinboard</span>
                <span className="text-[10px] font-mono text-gray-500">Popovers on Web • Footnotes in EPUB</span>
              </div>
            </div>

            {/* Visual Gallery / Carousel */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(
                    ref,
                    <VisualGalleryBlock />
                  );
                }
              }}
              className="group flex items-center gap-3 p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all"
            >
              <div className="p-2 bg-neo-teal/20 rounded border border-neo-ink">
                <GalleryHorizontal className="w-5 h-5 text-neo-teal" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-xs text-neo-ink">Visual Gallery Deck</span>
                <span className="text-[10px] font-mono text-gray-500">Mobile Deck • Desktop Grid • EPUB Stack</span>
              </div>
            </div>

            {/* Audio Narration Block */}
            <div
              ref={(ref) => {
                if (ref) {
                  connectors.create(
                    ref,
                    <AudioNarrationBlock />
                  );
                }
              }}
              className="group flex items-center gap-3 p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-grab active:cursor-grabbing transition-all"
            >
              <div className="p-2 bg-neo-ink text-white rounded border border-neo-ink">
                <Volume2 className="w-5 h-5 text-neo-yellow" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-xs text-neo-ink">Audio Narration</span>
                <span className="text-[10px] font-mono text-gray-500">Tactile player with waveforms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
