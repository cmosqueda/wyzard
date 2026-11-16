import React, { useEffect } from 'react';
import { useEditor, Frame, Element, ROOT_NODE } from '@craftjs/core';
import { useEditorStore } from '../../../store/editorStore';
import { notify } from '../../../store/toastStore';
import { getAssetDragData, hasAssetDragData } from '../../../utils/assetDragDrop';
import {
  createDefaultChapterCraftJson,
  createChapter2StarterCraftJson,
  createEmptyChapterCraftJson,
} from '../../../db';
import { CanvasContainer } from '../../blocks/CanvasContainer';
import { TypographyBlock } from '../../blocks/TypographyBlock';
import { ImageBlock } from '../../blocks/ImageBlock';
import { HeroSpreadBlock } from '../../blocks/HeroSpreadBlock';
import { CalloutCardBlock } from '../../blocks/CalloutCardBlock';
import { OrnamentDividerBlock } from '../../blocks/OrnamentDividerBlock';

export const CanvasFrame: React.FC = () => {
  const { actions, query, isBlockDragging } = useEditor((state) => ({
    isBlockDragging: state.events.dragged.size > 0,
  }));
  const { project, updateChapterCraftState, addAssetAttribution } = useEditorStore();
  const activeChapterId = project.activeChapterId;
  const chapterIndex = project.chapters.findIndex((c) => c.id === activeChapterId);
  const activeChapter = project.chapters[chapterIndex] || project.chapters[0];
  const isPlain = project.designSystem === 'plain';

  const handlePageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (hasAssetDragData(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handlePageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const payload = getAssetDragData(e);
    if (!payload) return;
    e.preventDefault();

    try {
      const captionCredit = `“${payload.title}” by ${payload.creator} • ${payload.license}`;
      const tree = query
        .parseReactElement(
          <ImageBlock
            src={payload.assetUrl}
            alt={payload.title}
            caption={captionCredit}
            aspectRatio={payload.kind === 'vector' ? '1/1' : '4/5'}
            fit={payload.kind === 'vector' ? 'contain' : 'cover'}
            borderStyle="neo"
          />
        )
        .toNodeTree();
      actions.addNodeTree(tree, ROOT_NODE);

      addAssetAttribution({
        title: payload.title,
        creator: payload.creator,
        creatorUrl: payload.creatorUrl,
        sourceName: payload.sourceName,
        sourceUrl: payload.sourceUrl || payload.assetUrl,
        license: payload.license,
        licenseUrl: payload.licenseUrl,
        assetUrl: payload.assetUrl,
      });

      notify({
        type: 'success',
        title: 'Dropped Asset onto Page',
        message: `Inserted “${payload.title}” & credited ${payload.creator}.`,
        duration: 2200,
      });
    } catch (err) {
      console.warn('Could not drop asset onto page:', err);
    }
  };

  // Resolve serialized Craft.js data for this chapter
  const resolvedCraftData = (() => {
    if (!activeChapter) return undefined;
    if (activeChapter.craftStateJson && activeChapter.craftStateJson.trim() !== '') {
      return activeChapter.craftStateJson;
    }
    // For Chapter 2+ when empty, provide a distinct chapter layout instead of duplicating Chapter 1
    if (isPlain) return createEmptyChapterCraftJson();
    if (chapterIndex > 0) {
      return activeChapter.id === 'ch-2'
        ? createChapter2StarterCraftJson()
        : createDefaultChapterCraftJson(activeChapter.title);
    }
    return undefined;
  })();

  // Persist initial default layout for Chapter 1 if it started empty, and handle Undo/Redo within same chapter
  useEffect(() => {
    if (!activeChapter) return;
    try {
      const currentSerialized = query.serialize();
      if (!activeChapter.craftStateJson && currentSerialized && currentSerialized !== '{}') {
        updateChapterCraftState(activeChapter.id, currentSerialized);
      } else if (
        activeChapter.craftStateJson &&
        currentSerialized &&
        activeChapter.craftStateJson !== currentSerialized
      ) {
        actions.deserialize(activeChapter.craftStateJson);
      }
    } catch (err) {
      console.warn('Could not sync chapter state:', err);
    }
  }, [activeChapter?.craftStateJson]);

  return (
    <div
      data-book-page-sheet="true"
      data-design-system={isPlain ? 'plain' : 'wyzard'}
      data-block-dragging={isBlockDragging ? 'true' : 'false'}
      onDragOver={handlePageDragOver}
      onDrop={handlePageDrop}
      className="w-full h-full transition-colors duration-200"
      style={{ backgroundColor: activeChapter?.backgroundColor || '#FFFFFF' }}
    >
      <Frame data={resolvedCraftData}>
        <Element is={CanvasContainer} id="page-root" canvas>
          {/* Default starter blocks for Chapter 1 (Wyzard design system only; 'plain' starts blank) */}
          {!isPlain && <>
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
          </>}
        </Element>
      </Frame>
    </div>
  );
};
