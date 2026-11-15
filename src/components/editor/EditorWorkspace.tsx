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

export const EditorWorkspace: React.FC = () => {
  const { project, viewportMode, undo, redo, saveProjectToDb, updateChapterCraftState } = useEditorStore();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isWebReaderOpen, setIsWebReaderOpen] = useState(false);
  const [readerInitialEngine, setReaderInitialEngine] = useState<ReaderEngineMode>('web');
  const [readerInitialRatio, setReaderInitialRatio] = useState<ScreenRatioKey>('tablet');
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

      if (!isInput && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if (!isInput && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveProjectToDb]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neo-bg">
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
        />
        <div className="flex-1 flex overflow-hidden relative">
          <LeftRail />
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
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </Editor>
    </div>
  );
};
