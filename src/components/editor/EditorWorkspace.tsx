import React, { useEffect, useState } from 'react';
import { Editor } from '@craftjs/core';
import { useEditorStore } from '../../store/editorStore';
import { Header } from './Header';
import { LeftRail } from './leftRail/LeftRail';
import { CenterStage } from './centerStage/CenterStage';
import { RightRail } from './rightRail/RightRail';
import { ExportModal } from '../export/ExportModal';
import { WebReaderModal } from '../preview/WebReaderModal';
import { TemplatePickerModal } from '../templates/TemplatePickerModal';

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

export const EditorWorkspace: React.FC = () => {
  const { loadProjectFromDb, undo, redo, saveProjectToDb } = useEditorStore();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isWebReaderOpen, setIsWebReaderOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  // Load project on mount
  useEffect(() => {
    loadProjectFromDb();
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
        }}
        indicator={{
          success: '#FF5E3A', // Neo-vermilion drop line indicator!
          error: '#E53E3E',
          thickness: 3,
        }}
      >
        <Header
          onOpenExportModal={() => setIsExportOpen(true)}
          onOpenWebReader={() => setIsWebReaderOpen(true)}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
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
          onOpenWebReader={() => setIsWebReaderOpen(true)}
        />
        <WebReaderModal
          isOpen={isWebReaderOpen}
          onClose={() => setIsWebReaderOpen(false)}
        />
      </Editor>
    </div>
  );
};
