import React, { useEffect, useRef } from 'react';
import { useEditor, Frame, Element } from '@craftjs/core';
import { useEditorStore } from '../../../store/editorStore';
import { CanvasContainer } from '../../blocks/CanvasContainer';
import { TypographyBlock } from '../../blocks/TypographyBlock';
import { ImageBlock } from '../../blocks/ImageBlock';
import { HeroSpreadBlock } from '../../blocks/HeroSpreadBlock';
import { SplitContainer } from '../../blocks/SplitContainer';
import { CalloutCardBlock } from '../../blocks/CalloutCardBlock';
import { OrnamentDividerBlock } from '../../blocks/OrnamentDividerBlock';

export const CanvasFrame: React.FC = () => {
  const { actions, query } = useEditor();
  const { project, updateChapterCraftState } = useEditorStore();
  const activeChapterId = project.activeChapterId;
  const activeChapter = project.chapters.find((c) => c.id === activeChapterId);
  const isInternalUpdateRef = useRef(false);

  // Sync state changes from Craft.js back into Zustand & IndexedDB
  useEffect(() => {
    // Whenever Craft.js state changes (e.g. drop, edit props, reorder)
    const timeout = setTimeout(() => {
      try {
        const json = query.serialize();
        if (activeChapter && json !== activeChapter.craftStateJson) {
          isInternalUpdateRef.current = true;
          updateChapterCraftState(activeChapterId, json);
        }
      } catch (e) {
        // serialize can throw if uninitialized
      }
    }, 400);

    return () => clearTimeout(timeout);
  });

  // When active chapter changes from outside (e.g. clicked in spine)
  useEffect(() => {
    if (activeChapter && activeChapter.craftStateJson) {
      if (isInternalUpdateRef.current) {
        isInternalUpdateRef.current = false;
        return;
      }
      try {
        actions.deserialize(activeChapter.craftStateJson);
      } catch (err) {
        console.warn('Could not deserialize chapter state, keeping default:', err);
      }
    }
  }, [activeChapterId]);

  return (
    <div className="w-full h-full bg-white transition-colors duration-200">
      <Frame>
        <Element is={CanvasContainer} id="page-root" canvas>
          {/* Default starter blocks for Chapter 1 */}
          <HeroSpreadBlock
            kicker="CHAPTER OPENER"
            title="The Art of Reflowable Design"
            subtitle="Bridging the chasm between responsive mobile readability and rich magazine art-direction."
            author="Wyzard Editorial"
            overlayOpacity={45}
          />
          <TypographyBlock
            text="Digital publishing has long been stranded between two extremes. On one hand, fixed-layout formats lock designs to rigid screen proportions, torturing phone users with constant pinch-and-zooming. On the other hand, traditional reflowable e-books strip away every trace of visual art direction."
            variant="body"
            dropCap={true}
          />
          <ImageBlock
            src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80"
            caption="Fig. 01 — Crosshair focal-point art direction preserved across aspect ratios."
            aspectRatio="16/9"
            focalPoint={{ x: 50, y: 40 }}
          />
          <TypographyBlock
            htmlContent="“The future of publication design is neither a static PDF nor unstyled plaintext. It is structured art direction that breathes with the reader's viewport.”"
            variant="pullquote"
            keepTogetherOnPageTurn={true}
          />
          <CalloutCardBlock
            accent="yellow"
            icon="sparkles"
            title="EDITORIAL FIELD NOTE"
            content="When reading on mobile, vertical scanability takes precedence. On larger displays, asymmetric splits guide the eye through multi-layered storytelling."
            keepTogetherOnPageTurn={true}
          />
          <OrnamentDividerBlock type="asterisms" spacingY="md" />
        </Element>
      </Frame>
    </div>
  );
};
