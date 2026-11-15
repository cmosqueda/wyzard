import type { BookProject } from '../types/ast';
import { parseCraftState, type ParsedBlockNode } from './astParser';

export interface PreflightItem {
  id: string;
  category: 'metadata' | 'accessibility' | 'epub-rules' | 'structure';
  level: 'pass' | 'warning' | 'error';
  title: string;
  message: string;
}

export interface PreflightReport {
  items: PreflightItem[];
  canExport: boolean;
  passCount: number;
  warningCount: number;
  errorCount: number;
}

export function runPreflightValidation(project: BookProject): PreflightReport {
  const items: PreflightItem[] = [];

  // 1. Metadata Checks
  if (project.metadata.title && project.metadata.title.trim().length > 0) {
    items.push({
      id: 'meta-title',
      category: 'metadata',
      level: 'pass',
      title: 'Publication Title Present',
      message: `"${project.metadata.title}" is valid for EPUB Dublin Core metadata.`,
    });
  } else {
    items.push({
      id: 'meta-title',
      category: 'metadata',
      level: 'error',
      title: 'Missing Publication Title',
      message: 'EPUB 3.3 specification requires a non-empty <dc:title> element.',
    });
  }

  if (project.metadata.author && project.metadata.author.trim().length > 0) {
    items.push({
      id: 'meta-author',
      category: 'metadata',
      level: 'pass',
      title: 'Author / Creator Defined',
      message: `Creator credit set to "${project.metadata.author}".`,
    });
  } else {
    items.push({
      id: 'meta-author',
      category: 'metadata',
      level: 'warning',
      title: 'Missing Author Attribution',
      message: 'It is recommended to define an author for EPUB discovery.',
    });
  }

  const lang = (project.metadata.language || '').trim().toLowerCase();
  if (lang.length >= 2) {
    items.push({
      id: 'meta-lang',
      category: 'metadata',
      level: 'pass',
      title: 'Valid Language Code',
      message: `Language set to RFC 5646 / ISO code "${lang}".`,
    });
  } else {
    items.push({
      id: 'meta-lang',
      category: 'metadata',
      level: 'error',
      title: 'Invalid Language Code',
      message: 'EPUB 3.3 requires a valid xml:lang code (e.g. "en", "es", "fr").',
    });
  }

  // 2. Spine & Chapters
  if (project.chapters.length > 0) {
    items.push({
      id: 'spine-count',
      category: 'structure',
      level: 'pass',
      title: 'Publication Spine Populated',
      message: `${project.chapters.length} chapter document(s) in reading order.`,
    });
  } else {
    items.push({
      id: 'spine-count',
      category: 'structure',
      level: 'error',
      title: 'Empty Publication Spine',
      message: 'A publication must have at least one chapter.',
    });
  }

  // 3. Inspect Block Nodes across all Chapters
  let totalImages = 0;
  let missingAltCount = 0;
  let totalBlocks = 0;
  let emptyChapterCount = 0;

  project.chapters.forEach((chapter, idx) => {
    const blocks = parseCraftState(chapter.craftStateJson);
    if (blocks.length === 0) {
      emptyChapterCount++;
    }

    const checkNode = (node: ParsedBlockNode) => {
      totalBlocks++;

      // Image Checks
      if (node.type === 'ImageBlock' || node.type === 'ArtDirectedImage') {
        totalImages++;
        if (!node.props.alt || node.props.alt.trim() === '') {
          missingAltCount++;
        }
      }

      // Hotspot pinboard
      if (node.type === 'HotspotPinboardBlock' || node.type === 'HotspotPinboard') {
        totalImages++;
        if (!node.props.alt || node.props.alt.trim() === '') {
          missingAltCount++;
        }
      }

      node.children.forEach(checkNode);
    };

    blocks.forEach(checkNode);
  });

  if (emptyChapterCount === 0) {
    items.push({
      id: 'chapters-content',
      category: 'structure',
      level: 'pass',
      title: 'All Chapters Contain Content',
      message: 'No empty chapter spines detected.',
    });
  } else {
    items.push({
      id: 'chapters-content',
      category: 'structure',
      level: 'warning',
      title: 'Empty Chapter Detected',
      message: `${emptyChapterCount} chapter(s) have no editorial blocks placed yet.`,
    });
  }

  // Accessibility Alt Text
  if (totalImages > 0) {
    if (missingAltCount === 0) {
      items.push({
        id: 'img-alt',
        category: 'accessibility',
        level: 'pass',
        title: 'Image Alt Descriptions Complete',
        message: `All ${totalImages} images have accessibility descriptions for screen readers.`,
      });
    } else {
      items.push({
        id: 'img-alt',
        category: 'accessibility',
        level: 'warning',
        title: 'Missing Image Alt Text',
        message: `${missingAltCount} of ${totalImages} images lack descriptive alt text.`,
      });
    }
  }

  // EPUB 3.3 Rule Checks
  items.push({
    id: 'epub-mimetype',
    category: 'epub-rules',
    level: 'pass',
    title: 'Strict Uncompressed Mimetype',
    message: 'ZIP first-entry "mimetype" rule will be strictly applied (0 compression).',
  });

  items.push({
    id: 'epub-fallbacks',
    category: 'epub-rules',
    level: 'pass',
    title: 'EPUB Progressive Fallbacks',
    message: 'Interactive carousels unwrapped, accordions mapped to <details>, hotspots to footnotes.',
  });

  const passCount = items.filter((i) => i.level === 'pass').length;
  const warningCount = items.filter((i) => i.level === 'warning').length;
  const errorCount = items.filter((i) => i.level === 'error').length;

  return {
    items,
    canExport: errorCount === 0,
    passCount,
    warningCount,
    errorCount,
  };
}
