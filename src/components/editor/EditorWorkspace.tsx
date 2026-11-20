import React, { useEffect, useState } from 'react';
import { Editor } from '@craftjs/core';
import { useEditorStore } from '../../store/editorStore';
import { Header } from './Header';
import { LeftRail } from './leftRail/LeftRail';
import { CenterStage } from './centerStage/CenterStage';
import { RightRail } from './rightRail/RightRail';
import { ExportModal } from '../export/ExportModal';
import { WebReaderModal, type ReaderEngineMode } from '../preview/WebReaderModal';
import type { ScreenRatioKey } from '../../compiler/multiFormatExporter';
import { TemplatePickerModal } from '../templates/TemplatePickerModal';
import { SettingsModal } from '../settings/SettingsModal';
import { MetadataModal } from './MetadataModal';
import { PageSetupModal } from './PageSetupModal';
import { CanvasContextMenu } from './centerStage/CanvasContextMenu';
import { CanvasShortcuts } from './centerStage/CanvasShortcuts';
import { TouchBlockBar } from './centerStage/TouchBlockBar';

// Craft.js resolvers
import { CanvasContainer } from '../blocks/CanvasContainer';
import { TypographyBlock } from '../blocks/TypographyBlock';
import { ImageBlock } from '../blocks/ImageBlock';
import { HeroSpreadBlock } from '../blocks/HeroSpreadBlock';
import { SplitContainer, SplitColumn } from '../blocks/SplitContainer';
import { CalloutCardBlock } from '../blocks/CalloutCardBlock';
import { OrnamentDividerBlock } from '../blocks/OrnamentDividerBlock';
import { AccordionBlock } from '../blocks/AccordionBlock';
import { HotspotPinboardBlock } from '../blocks/HotspotPinboardBlock';
import { VisualGalleryBlock } from '../blocks/VisualGalleryBlock';
import { AudioNarrationBlock } from '../blocks/AudioNarrationBlock';
import { FreeformCanvasBlock } from '../blocks/FreeformCanvasBlock';
import { TableBlock } from '../blocks/TableBlock';
import { TitlePageBlock } from '../blocks/TitlePageBlock';
import { CopyrightBlock } from '../blocks/CopyrightBlock';
import { TocBlock } from '../blocks/TocBlock';

export const EditorWorkspace: React.FC = () => {
  const {
    project,
    viewportMode,
    undo,
    redo,
    saveProjectToDb,
    updateChapterCraftState,
    isMetadataOpen,
    setMetadataOpen,
  } = useEditorStore();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isWebReaderOpen, setIsWebReaderOpen] = useState(false);
  const [readerInitialEngine, setReaderInitialEngine] = useState<ReaderEngineMode>('web');
  const [readerInitialRatio, setReaderInitialRatio] = useState<ScreenRatioKey>('tablet');
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPageSetupOpen, setIsPageSetupOpen] = useState(false);

  const mapViewportToRatio = (): ScreenRatioKey => {
    if (viewportMode === 'mobile') return 'mobile';
    if (viewportMode === 'tablet') return 'tablet';
    if (viewportMode === 'desktop') return 'laptop';
    if (viewportMode === 'comic') return 'comic';
    if (viewportMode === 'square') return 'square';
    return 'tablet';
  };

  // Ensure active project is persisted on mount
  useEffect(() => {
    saveProjectToDb();
  }, [project.id]);

  // Text-editing drag guard: Craft.js makes every block `draggable`, so click-dragging across text
  // (or inside an input) would pick up the whole block instead of selecting characters. While the
  // pointer is pressed on an editable control we switch off `draggable` on its ancestors.
  useEffect(() => {
    let restore: (() => void) | null = null;

    const finish = () => {
      restore?.();
    };

    const onPointerDown = (e: PointerEvent) => {
      finish();
      const target = e.target as HTMLElement | null;
      if (!target?.closest) return;
      const isEditable = target.closest(
        '[contenteditable=""], [contenteditable="true"], input, textarea, select, [data-no-block-drag]'
      );
      if (!isEditable) return;

      const locked: HTMLElement[] = [];
      for (let node = target as HTMLElement | null; node; node = node.parentElement) {
        if (node.getAttribute('draggable') === 'true') {
          node.setAttribute('draggable', 'false');
          locked.push(node);
        }
      }
      if (locked.length === 0) return;

      restore = () => {
        locked.forEach((el) => el.setAttribute('draggable', 'true'));
        window.removeEventListener('pointerup', finish, true);
        window.removeEventListener('pointercancel', finish, true);
        window.removeEventListener('dragend', finish, true);
        window.removeEventListener('blur', finish);
        restore = null;
      };
      window.addEventListener('pointerup', finish, true);
      window.addEventListener('pointercancel', finish, true);
      window.addEventListener('dragend', finish, true);
      window.addEventListener('blur', finish);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      finish();
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside an input/textarea/contentEditable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProjectToDb();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveProjectToDb]);

  return (
    <div className="flex flex-col h-dvh w-screen overflow-hidden bg-neo-bg">
      <Editor
        key={`${project.id}:${project.activeChapterId}`}
        onNodesChange={(query) => {
          try {
            const json = query.serialize();
            const currentChapterId = useEditorStore.getState().project.activeChapterId;
            const currentChapter = useEditorStore
              .getState()
              .project.chapters.find((c) => c.id === currentChapterId);
            if (currentChapter && json && json !== '{}' && json !== currentChapter.craftStateJson) {
              updateChapterCraftState(currentChapterId, json);
            }
          } catch {
            // Ignore transient serialization states during mount
          }
        }}
        resolver={{
          CanvasContainer,
          TypographyBlock,
          ImageBlock,
          HeroSpreadBlock,
          SplitContainer,
          SplitColumn,
          CalloutCardBlock,
          OrnamentDividerBlock,
          AccordionBlock,
          HotspotPinboardBlock,
          VisualGalleryBlock,
          AudioNarrationBlock,
          FreeformCanvasBlock,
          TableBlock,
          TitlePageBlock,
          CopyrightBlock,
          TocBlock,
        }}
        indicator={{
          success: '#FF5E3A', // Neo-vermilion drop line indicator!
          error: '#E53E3E',
          thickness: 3,
        }}
      >
        <Header
          onOpenExportModal={() => setIsExportOpen(true)}
          onOpenWebReader={() => {
            setReaderInitialEngine('web');
            setReaderInitialRatio(mapViewportToRatio());
            setIsWebReaderOpen(true);
          }}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenMetadata={() => setMetadataOpen(true)}
          onOpenPageSetup={() => setIsPageSetupOpen(true)}
        />
        <div className="flex-1 flex overflow-hidden relative">
          <LeftRail onOpenPageSetup={() => setIsPageSetupOpen(true)} />
          <CenterStage />
          <RightRail />
        </div>

        {/* Modals */}
        <TemplatePickerModal
          isOpen={isTemplatesOpen}
          onClose={() => setIsTemplatesOpen(false)}
        />
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          onOpenWebReader={(engine = 'web', ratio = 'tablet') => {
            setReaderInitialEngine(engine);
            setReaderInitialRatio(ratio);
            setIsWebReaderOpen(true);
          }}
        />
        <WebReaderModal
          isOpen={isWebReaderOpen}
          onClose={() => setIsWebReaderOpen(false)}
          initialEngine={readerInitialEngine}
          initialRatio={readerInitialRatio}
        />
        <CanvasShortcuts />
        <PageSetupModal isOpen={isPageSetupOpen} onClose={() => setIsPageSetupOpen(false)} />
        <TouchBlockBar />
        <CanvasContextMenu />
        <MetadataModal isOpen={isMetadataOpen} onClose={() => setMetadataOpen(false)} />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </Editor>
    </div>
  );
};
