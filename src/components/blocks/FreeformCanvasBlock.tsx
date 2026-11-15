import React, { useState, useRef } from 'react';
import { useNode, type UserComponent } from '@craftjs/core';
import { saveAsset } from '../../db/assets';
import { useEditorStore } from '../../store/editorStore';
import { notify } from '../../store/toastStore';
import {
  setAssetDragData,
  getAssetDragData,
  hasAssetDragData,
} from '../../utils/assetDragDrop';
import {
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Bookmark,
  Sparkles,
  MousePointer,
  PenTool,
  Brush,
  Star,
  Hexagon,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Download,
  Upload,
  ExternalLink,
  Layers,
  Magnet,
  Search,
  PackageOpen,
  CheckSquare,
  Grid,
  Loader2,
  GripVertical,
} from 'lucide-react';

export type LayerShapeKind = 'rect' | 'circle' | 'pill' | 'star' | 'hexagon' | 'diamond';
export type LayerBlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';
export type ArtboardBgType = 'transparent' | 'solid' | 'gradient' | 'pattern' | 'image';

export interface VectorPoint {
  x: number; // 0-100% of artboard
  y: number; // 0-100% of artboard
}

export interface CanvasLayerItem {
  id: string;
  name?: string;
  type: 'text' | 'shape' | 'image' | 'path';
  x: number; // 0 - 100%
  y: number; // 0 - 100%
  width: number; // 2 - 100%
  height: number; // 2 - 100%
  rotation?: number; // degrees (-180 to 180)
  flipX?: boolean;
  flipY?: boolean;
  opacity?: number; // 0 - 100
  blendMode?: LayerBlendMode;
  text?: string;
  fontSize?: number;
  fontFamily?: 'heading' | 'sans' | 'serif' | 'mono';
  textAlign?: 'left' | 'center' | 'right';
  fill?: string;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDashed?: boolean;
  imageSrc?: string;
  // For editable Iconify / vector pack assets so their color can be customized live
  iconifyId?: string;
  svgRaw?: string;
  shapeKind?: LayerShapeKind;
  borderNeo?: boolean;
  // Vector path data (for pen/freehand tools, normalized 0-100 within layer box)
  points?: VectorPoint[];
  closed?: boolean;
  smooth?: boolean;
  hidden?: boolean;
  locked?: boolean;
}

export interface FreeformCanvasBlockProps {
  aspectRatio?: '16/9' | '4/3' | '1/1' | '4/5';
  backgroundType?: ArtboardBgType;
  backgroundColor?: string;
  backgroundGradient?: string;
  backgroundPattern?: 'dots' | 'grid' | 'diagonal' | 'crosshatch';
  backgroundImage?: string;
  backgroundOpacity?: number;
  showGrid?: boolean;
  snapToGuides?: boolean;
  scaleTextOnResize?: boolean;
  caption?: string;
  layers?: CanvasLayerItem[];
  keepTogetherOnPageTurn?: boolean;
}

/**
 * Returns height-to-width ratio (H / W) for a given artboard aspectRatio preset.
 */
export function getArtboardHeightRatio(
  ratio: FreeformCanvasBlockProps['aspectRatio'] = '16/9'
): number {
  switch (ratio) {
    case '1/1':
      return 1;
    case '4/5':
      return 5 / 4; // 1.25
    case '4/3':
      return 3 / 4; // 0.75
    case '16/9':
    default:
      return 9 / 16; // 0.5625
  }
}

export const GRADIENT_PRESETS: { label: string; value: string }[] = [
  {
    label: 'Paper Warmth',
    value: 'linear-gradient(135deg, #F4F1EA 0%, #FFEAE4 100%)',
  },
  {
    label: 'Brutalist Sun',
    value: 'linear-gradient(135deg, #FFD23F 0%, #FF5E3A 100%)',
  },
  {
    label: 'Cyber Mint',
    value: 'linear-gradient(135deg, #E6FBF5 0%, #3BCEAC 100%)',
  },
  {
    label: 'Violet Haze',
    value: 'linear-gradient(135deg, #F5EDFD 0%, #9B5DE5 100%)',
  },
  {
    label: 'Noir Spotlight',
    value: 'radial-gradient(circle at 50% 40%, #333338 0%, #141414 100%)',
  },
];

export const BUILTIN_CANVAS_ASSET_PACKS: {
  id: string;
  packName: string;
  creator: string;
  creatorUrl: string;
  license: string;
  items: {
    title: string;
    kind: 'iconify' | 'illustration';
    iconifyId?: string;
    imageSrc?: string;
    defaultColor?: string;
  }[];
}[] = [
  {
    id: 'pack-editorial-vectors',
    packName: 'Editorial & Book Ornaments Pack',
    creator: 'Phosphor & Game Icons Contributors (via Iconify)',
    creatorUrl: 'https://iconify.design',
    license: 'MIT / CC BY 3.0',
    items: [
      { title: 'Compass Rose', kind: 'iconify', iconifyId: 'ph:compass-tool-duotone', defaultColor: '#141414' },
      { title: 'Sparkle Star', kind: 'iconify', iconifyId: 'ph:sparkle-duotone', defaultColor: '#FF5E3A' },
      { title: 'Quill & Ink', kind: 'iconify', iconifyId: 'game-icons:quill-ink', defaultColor: '#141414' },
      { title: 'Sunbeams Emblem', kind: 'iconify', iconifyId: 'game-icons:sunbeams', defaultColor: '#FFD23F' },
      { title: 'Vintage Scroll', kind: 'iconify', iconifyId: 'ph:scroll-duotone', defaultColor: '#9B5DE5' },
      { title: 'Planet Orbit', kind: 'iconify', iconifyId: 'ph:planet-duotone', defaultColor: '#3BCEAC' },
      { title: 'Royal Flourish', kind: 'iconify', iconifyId: 'game-icons:flourish', defaultColor: '#141414' },
      { title: 'Open Tome', kind: 'iconify', iconifyId: 'ph:book-open-text-duotone', defaultColor: '#FF5E3A' },
    ],
  },
  {
    id: 'pack-adamsdesk-commons',
    packName: 'Adamsdesk & Openverse Visual Plates',
    creator: 'Adam Douglas (Adamsdesk) / Openverse Commons',
    creatorUrl: 'https://www.adamsdesk.com/posts/free-design-asset-resource/',
    license: 'CC0 / CC BY 4.0',
    items: [
      {
        title: 'Botanical Flora Plate',
        kind: 'illustration',
        imageSrc: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Archival Typography',
        kind: 'illustration',
        imageSrc: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Classical Library Study',
        kind: 'illustration',
        imageSrc: 'https://images.unsplash.com/photo-1507842229451-79b1be8d6290?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Geometric Bauhaus Poster',
        kind: 'illustration',
        imageSrc: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
];

type ActiveTool = 'select' | 'pen' | 'draw';
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const DEFAULT_LAYERS: CanvasLayerItem[] = [
  {
    id: 'layer-bg-shape',
    name: 'Sunburst Circle',
    type: 'shape',
    shapeKind: 'circle',
    x: 56,
    y: 10,
    width: 34,
    height: 60,
    rotation: 0,
    opacity: 100,
    fill: '#FFD23F',
    strokeColor: '#141414',
    strokeWidth: 2,
    borderNeo: true,
  },
  {
    id: 'layer-star-accent',
    name: 'Vector Star Badge',
    type: 'shape',
    shapeKind: 'star',
    x: 78,
    y: 54,
    width: 16,
    height: 28,
    rotation: 12,
    opacity: 100,
    fill: '#3BCEAC',
    strokeColor: '#141414',
    strokeWidth: 2,
    borderNeo: false,
  },
  {
    id: 'layer-img-1',
    name: 'Compass Vector',
    type: 'image',
    iconifyId: 'ph:compass-tool-duotone',
    color: '#141414',
    imageSrc: 'https://api.iconify.design/ph/compass-tool-duotone.svg?height=512&color=%23141414',
    x: 61,
    y: 16,
    width: 24,
    height: 43,
    rotation: -8,
    opacity: 100,
    borderNeo: false,
  },
  {
    id: 'layer-badge',
    name: 'Kicker Pill',
    type: 'shape',
    shapeKind: 'pill',
    x: 6,
    y: 12,
    width: 38,
    height: 12,
    rotation: 0,
    opacity: 100,
    fill: '#FF5E3A',
    color: '#FFFFFF',
    strokeColor: '#141414',
    strokeWidth: 2,
    text: 'GRAPHITE-INSPIRED 2D STUDIO',
    fontSize: 10,
    fontFamily: 'mono',
    borderNeo: true,
  },
  {
    id: 'layer-title',
    name: 'Headline Text',
    type: 'text',
    x: 6,
    y: 30,
    width: 50,
    height: 30,
    rotation: 0,
    opacity: 100,
    text: 'Vector & Visual Artboard',
    fontSize: 22,
    fontFamily: 'heading',
    textAlign: 'left',
    color: '#141414',
    fill: 'transparent',
    borderNeo: false,
  },
  {
    id: 'layer-sub',
    name: 'Caption Note',
    type: 'text',
    x: 6,
    y: 66,
    width: 68,
    height: 20,
    rotation: 0,
    opacity: 100,
    text: 'Multi-select, rotate handles, resize text & assets, transparent bg, and editable asset packs.',
    fontSize: 11,
    fontFamily: 'sans',
    textAlign: 'left',
    color: '#2A2A2A',
    fill: '#FFFFFF',
    strokeColor: '#141414',
    strokeWidth: 2,
    borderNeo: true,
  },
];

/**
 * Converts an array of 0-100 points into an SVG path `d` string (smooth Catmull-Rom or polyline).
 */
export function buildSvgPathD(
  points: VectorPoint[],
  closed = false,
  smooth = true,
  scaleX = 1,
  scaleY = 1
): string {
  if (!points || points.length === 0) return '';
  const pts = points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY }));
  if (pts.length === 1) {
    return `M ${pts[0].x} ${pts[0].y} l 0.1 0.1`;
  }
  if (!smooth || pts.length < 3) {
    const segs = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    if (closed) segs.push('Z');
    return segs.join(' ');
  }

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  if (closed) d += ' Z';
  return d;
}

/**
 * Computes inline CSS background styles for the artboard (supports transparent checkerboard in editor).
 */
export function getArtboardBackgroundStyle(
  props: FreeformCanvasBlockProps,
  forExport = false
): React.CSSProperties {
  const bgType: ArtboardBgType = props.backgroundType || 'solid';
  const bgColor = props.backgroundColor || '#F4F1EA';

  if (bgType === 'transparent') {
    if (forExport) {
      return { backgroundColor: 'transparent' };
    }
    // Classic studio transparency checkerboard in editor
    return {
      backgroundColor: '#FFFFFF',
      backgroundImage:
        'linear-gradient(45deg, #E2E0D8 25%, transparent 25%), linear-gradient(-45deg, #E2E0D8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E2E0D8 75%), linear-gradient(-45deg, transparent 75%, #E2E0D8 75%)',
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    };
  }

  if (bgType === 'gradient') {
    return {
      backgroundImage:
        props.backgroundGradient || GRADIENT_PRESETS[0].value,
    };
  }

  if (bgType === 'pattern') {
    const pat = props.backgroundPattern || 'dots';
    const patternCss =
      pat === 'grid'
        ? 'linear-gradient(to right, rgba(20,20,20,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,20,20,0.12) 1px, transparent 1px)'
        : pat === 'diagonal'
        ? 'repeating-linear-gradient(45deg, rgba(20,20,20,0.08) 0px, rgba(20,20,20,0.08) 2px, transparent 2px, transparent 12px)'
        : pat === 'crosshatch'
        ? 'radial-gradient(circle, rgba(20,20,20,0.18) 1.5px, transparent 1.5px), radial-gradient(circle, rgba(20,20,20,0.12) 1.5px, transparent 1.5px)'
        : 'radial-gradient(rgba(20,20,20,0.2) 1.25px, transparent 1.25px)';
    return {
      backgroundColor: bgColor,
      backgroundImage: patternCss,
      backgroundSize: pat === 'crosshatch' ? '20px 20px' : '16px 16px',
    };
  }

  if (bgType === 'image' && props.backgroundImage) {
    return {
      backgroundColor: bgColor,
      backgroundImage: `url('${props.backgroundImage}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  return {
    backgroundColor: bgColor,
    backgroundImage:
      !forExport && props.showGrid
        ? 'radial-gradient(rgba(20,20,20,0.18) 1px, transparent 1px)'
        : 'none',
    backgroundSize: '16px 16px',
  };
}

export const FreeformCanvasBlock: UserComponent<FreeformCanvasBlockProps> = ({
  aspectRatio = '16/9',
  backgroundType = 'solid',
  backgroundColor = '#F4F1EA',
  backgroundGradient = GRADIENT_PRESETS[0].value,
  backgroundPattern = 'dots',
  backgroundImage = '',
  backgroundOpacity = 100,
  showGrid = true,
  snapToGuides = true,
  scaleTextOnResize = true,
  caption = 'Fig. — Vector & visual artboard (inspired by Graphite Editor • Web & EPUB 3 SVG)',
  layers = DEFAULT_LAYERS,
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

  const projectId = useEditorStore((s) => s.project.id);
  const addAssetAttribution = useEditorStore((s) => s.addAssetAttribution);

  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  // Lock state editing mode: locks the canvas block in place so dragging/long-pressing assets inside never moves the block itself
  const [isCanvasEditingLocked, setIsCanvasEditingLocked] = useState<boolean>(true);
  // Multi-selection array of layer IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [snapGuide, setSnapGuide] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const [rotatingAngleBadge, setRotatingAngleBadge] = useState<number | null>(null);

  // Marquee rubber-band selection state (0-100% artboard coords)
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);

  // Embedded drawers inside Fixed Visual Canvas: Layer Manager | Background Studio | Asset Packs
  const [openDrawer, setOpenDrawer] = useState<'none' | 'layers' | 'background' | 'packs'>('none');

  // Live Iconify Vector Search inside the Artboard Asset Packs Drawer
  const [packVectorQuery, setPackVectorQuery] = useState('ornament badge');
  const [packVectorResults, setPackVectorResults] = useState<string[]>([
    'ph:compass-tool-duotone',
    'ph:sparkle-duotone',
    'ph:feather-duotone',
    'ph:crown-duotone',
    'ph:planet-duotone',
    'ph:scroll-duotone',
    'game-icons:quill-ink',
    'game-icons:sunbeams',
    'game-icons:flourish',
    'game-icons:crystal-wand',
    'game-icons:winged-emblem',
    'game-icons:abstract-024',
  ]);
  const [isSearchingPackVectors, setIsSearchingPackVectors] = useState(false);

  // Active vector drawing points (0-100 artboard coords)
  const [draftPoints, setDraftPoints] = useState<VectorPoint[]>([]);
  const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);

  // Drag-and-Drop Asset Pack onto Artboard state
  const [isDragOverBoard, setIsDragOverBoard] = useState(false);
  const [dropCursorPct, setDropCursorPct] = useState<{ x: number; y: number } | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  const dragStateRef = useRef<{
    mode: 'move' | 'resize' | 'rotate' | 'marquee';
    handle?: ResizeHandle;
    primaryId: string;
    startX: number;
    startY: number;
    // Snapshot of all selected layers at drag start for multi-move / multi-resize
    initialLayers: Record<
      string,
      {
        x: number;
        y: number;
        width: number;
        height: number;
        fontSize: number;
        rotation: number;
      }
    >;
    centerPx?: { x: number; y: number };
    startAngleDeg?: number;
  } | null>(null);

  const primarySelectedId = selectedIds[selectedIds.length - 1] || null;
  const activeLayer = layers.find((l) => l.id === primarySelectedId) || null;
  const selectedLayersList = layers.filter((l) => selectedIds.includes(l.id));

  const getAspectClass = () => {
    switch (aspectRatio) {
      case '1/1':
        return 'aspect-square';
      case '4/5':
        return 'aspect-[4/5]';
      case '4/3':
        return 'aspect-[4/3]';
      case '16/9':
      default:
        return 'aspect-video';
    }
  };

  const getRelativeBoardCoords = (clientX: number, clientY: number): VectorPoint => {
    if (!boardRef.current) return { x: 50, y: 50 };
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  };

  // Search Iconify vectors directly inside the Canvas Asset Pack Drawer
  const handleSearchCanvasVectors = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = packVectorQuery.trim();
    if (!q) return;
    setIsSearchingPackVectors(true);
    try {
      const res = await fetch(
        `https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=24`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.icons) && data.icons.length > 0) {
          setPackVectorResults(data.icons);
        }
      }
    } catch {
      // Keep existing icons on offline fallback
    } finally {
      setIsSearchingPackVectors(false);
    }
  };

  // Insert an editable asset pack item (Iconify vector or illustration plate) into the artboard
  const insertPackAssetIntoCanvas = (
    item: {
      title: string;
      kind: 'iconify' | 'illustration';
      iconifyId?: string;
      imageSrc?: string;
      defaultColor?: string;
      creator: string;
      creatorUrl?: string;
      license: string;
    },
    dropCenter?: { x: number; y: number }
  ) => {
    const id = 'pack-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5);
    const hRatio = getArtboardHeightRatio(aspectRatio);
    const w = item.kind === 'iconify' ? 24 : 38;
    const h = Math.min(88, Math.round(w / hRatio));
    const tint = item.defaultColor || '#141414';

    let src = item.imageSrc || '';
    if (item.kind === 'iconify' && item.iconifyId) {
      const [prefix, name] = item.iconifyId.split(':');
      src = `https://api.iconify.design/${prefix}/${name}.svg?height=512&color=${encodeURIComponent(
        tint
      )}`;
    }

    const cx = dropCenter ? dropCenter.x : 50;
    const cy = dropCenter ? dropCenter.y : 50;
    const posX = Math.max(0, Math.min(100 - w, Math.round(cx - w / 2)));
    const posY = Math.max(0, Math.min(100 - h, Math.round(cy - h / 2)));

    const newLayer: CanvasLayerItem = {
      id,
      name: item.title,
      type: 'image',
      imageSrc: src,
      iconifyId: item.iconifyId,
      color: tint,
      fill: 'transparent',
      x: posX,
      y: posY,
      width: w,
      height: h,
      rotation: 0,
      opacity: 100,
      borderNeo: item.kind === 'illustration',
    };

    setProp((props: FreeformCanvasBlockProps) => {
      props.layers = [...(props.layers || []), newLayer];
    });
    setSelectedIds([id]);
    setActiveTool('select');

    addAssetAttribution({
      title: item.title,
      creator: item.creator,
      creatorUrl: item.creatorUrl,
      sourceName: item.iconifyId ? `Iconify (${item.iconifyId})` : 'Adamsdesk / Openverse Asset Pack',
      sourceUrl: item.creatorUrl || src,
      license: item.license,
      assetUrl: src,
    });
  };

  // Drag-and-Drop Asset Pack / File directly onto the Fixed Visual Canvas artboard
  const handleBoardDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasAssetDragData(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverBoard) setIsDragOverBoard(true);
    setDropCursorPct(getRelativeBoardCoords(e.clientX, e.clientY));
  };

  const handleBoardDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragOverBoard(false);
    setDropCursorPct(null);
  };

  const handleBoardDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverBoard(false);
    setDropCursorPct(null);

    const dropPos = getRelativeBoardCoords(e.clientX, e.clientY);
    const hRatio = getArtboardHeightRatio(aspectRatio);

    // 1. Check for Wyzard Asset Pack drag payload (from Left Rail AssetLibrary or In-Canvas Packs)
    const assetPayload = getAssetDragData(e);
    if (assetPayload) {
      const id = 'drop-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5);
      const w = assetPayload.defaultWidthPct || (assetPayload.kind === 'vector' ? 24 : 38);
      const h = assetPayload.defaultHeightPct || Math.min(88, Math.round(w / hRatio));
      const posX = Math.max(0, Math.min(100 - w, Math.round(dropPos.x - w / 2)));
      const posY = Math.max(0, Math.min(100 - h, Math.round(dropPos.y - h / 2)));

      // Detect Iconify ID if URL matches api.iconify.design/<prefix>/<name>.svg
      const iconifyMatch = assetPayload.assetUrl.match(
        /api\.iconify\.design\/([^/]+)\/([^.?]+)\.svg/i
      );
      const iconifyId = iconifyMatch ? `${iconifyMatch[1]}:${iconifyMatch[2]}` : undefined;

      const newLayer: CanvasLayerItem = {
        id,
        name: assetPayload.title.slice(0, 28),
        type: 'image',
        imageSrc: assetPayload.assetUrl,
        iconifyId,
        color: '#141414',
        fill: 'transparent',
        x: posX,
        y: posY,
        width: w,
        height: h,
        rotation: 0,
        opacity: 100,
        borderNeo: assetPayload.borderNeo ?? assetPayload.kind === 'image',
      };

      setProp((props: FreeformCanvasBlockProps) => {
        props.layers = [...(props.layers || []), newLayer];
      });
      setSelectedIds([id]);
      setActiveTool('select');

      addAssetAttribution({
        title: assetPayload.title,
        creator: assetPayload.creator,
        creatorUrl: assetPayload.creatorUrl,
        sourceName: assetPayload.sourceName,
        sourceUrl: assetPayload.sourceUrl || assetPayload.assetUrl,
        license: assetPayload.license,
        licenseUrl: assetPayload.licenseUrl,
        assetUrl: assetPayload.assetUrl,
      });

      notify({
        type: 'success',
        title: 'Dropped into Fixed Visual Canvas',
        message: `Placed “${assetPayload.title}” at (${Math.round(dropPos.x)}%, ${Math.round(
          dropPos.y
        )}%) & credited ${assetPayload.creator}.`,
        duration: 2400,
      });
      return;
    }

    // 2. Check for local image/SVG file dragged from OS file manager
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.endsWith('.svg'))) {
      try {
        const url = await saveAsset(projectId, file);
        const id = 'file-' + Date.now().toString(36);
        const w = 36;
        const h = Math.min(88, Math.round(w / hRatio));
        const posX = Math.max(0, Math.min(100 - w, Math.round(dropPos.x - w / 2)));
        const posY = Math.max(0, Math.min(100 - h, Math.round(dropPos.y - h / 2)));

        const newLayer: CanvasLayerItem = {
          id,
          name: file.name.slice(0, 24),
          type: 'image',
          imageSrc: url,
          x: posX,
          y: posY,
          width: w,
          height: h,
          rotation: 0,
          opacity: 100,
          borderNeo: false,
        };
        setProp((props: FreeformCanvasBlockProps) => {
          props.layers = [...(props.layers || []), newLayer];
        });
        setSelectedIds([id]);
      } catch {
        // saveAsset already notifies on error
      }
    }
  };

  // Recolor an Iconify vector asset layer dynamically!
  const updateVectorAssetColor = (layerId: string, newHexColor: string) => {
    setProp((props: FreeformCanvasBlockProps) => {
      const target = (props.layers || []).find((l) => l.id === layerId);
      if (!target) return;
      target.color = newHexColor;
      if (target.iconifyId) {
        const [prefix, name] = target.iconifyId.split(':');
        target.imageSrc = `https://api.iconify.design/${prefix}/${name}.svg?height=512&color=${encodeURIComponent(
          newHexColor
        )}`;
      }
    });
  };

  // Commit draft vector points into a permanent 'path' layer
  const commitDraftVector = (pointsToCommit: VectorPoint[], closed = false, smooth = true) => {
    if (pointsToCommit.length < 2) {
      setDraftPoints([]);
      return;
    }
    const xs = pointsToCommit.map((p) => p.x);
    const ys = pointsToCommit.map((p) => p.y);
    const minX = Math.max(0, Math.min(...xs) - 2);
    const minY = Math.max(0, Math.min(...ys) - 2);
    const maxX = Math.min(100, Math.max(...xs) + 2);
    const maxY = Math.min(100, Math.max(...ys) + 2);
    const boxW = Math.max(6, maxX - minX);
    const boxH = Math.max(6, maxY - minY);

    const normalizedPoints = pointsToCommit.map((p) => ({
      x: Number((((p.x - minX) / boxW) * 100).toFixed(1)),
      y: Number((((p.y - minY) / boxH) * 100).toFixed(1)),
    }));

    const id = 'vec-' + Date.now().toString(36);
    const newLayer: CanvasLayerItem = {
      id,
      name: closed ? 'Vector Shape Path' : 'Vector Ink Path',
      type: 'path',
      x: Math.round(minX),
      y: Math.round(minY),
      width: Math.round(boxW),
      height: Math.round(boxH),
      rotation: 0,
      opacity: 100,
      fill: closed ? '#FFD23F' : 'transparent',
      strokeColor: '#141414',
      strokeWidth: 3,
      points: normalizedPoints,
      closed,
      smooth,
      borderNeo: false,
    };

    setProp((props: FreeformCanvasBlockProps) => {
      props.layers = [...(props.layers || []), newLayer];
    });
    setDraftPoints([]);
    setSelectedIds([id]);
    setActiveTool('select');
  };

  // Artboard pointer handlers for Pen, Freehand, and Marquee Multi-Selection
  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'pen') {
      e.stopPropagation();
      const pt = getRelativeBoardCoords(e.clientX, e.clientY);
      setDraftPoints((prev) => [...prev, pt]);
      return;
    }

    if (activeTool === 'draw') {
      e.stopPropagation();
      const pt = getRelativeBoardCoords(e.clientX, e.clientY);
      setIsDrawingFreehand(true);
      setDraftPoints([pt]);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    // In Select mode, clicking/dragging on empty artboard starts a Marquee Selection box
    e.stopPropagation();
    boardRef.current?.setPointerCapture?.(e.pointerId);
    setEditingTextId(null);
    const pt = getRelativeBoardCoords(e.clientX, e.clientY);
    if (!e.shiftKey) {
      setSelectedIds([]);
    }
    setMarquee({ startX: pt.x, startY: pt.y, curX: pt.x, curY: pt.y });
    dragStateRef.current = {
      mode: 'marquee',
      primaryId: '',
      startX: e.clientX,
      startY: e.clientY,
      initialLayers: {},
    };
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'draw' && isDrawingFreehand) {
      e.stopPropagation();
      const pt = getRelativeBoardCoords(e.clientX, e.clientY);
      setDraftPoints((prev) => {
        const last = prev[prev.length - 1];
        if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 1.5) return prev;
        return [...prev, pt];
      });
      return;
    }

    if (!dragStateRef.current || !boardRef.current) return;
    e.stopPropagation();

    const rect = boardRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const st = dragStateRef.current;

    // 1. Marquee Multi-Selection Drag
    if (st.mode === 'marquee' && marquee) {
      const pt = getRelativeBoardCoords(e.clientX, e.clientY);
      const nextMarquee = { ...marquee, curX: pt.x, curY: pt.y };
      setMarquee(nextMarquee);

      const minX = Math.min(nextMarquee.startX, nextMarquee.curX);
      const maxX = Math.max(nextMarquee.startX, nextMarquee.curX);
      const minY = Math.min(nextMarquee.startY, nextMarquee.curY);
      const maxY = Math.max(nextMarquee.startY, nextMarquee.curY);

      if (maxX - minX > 1.5 || maxY - minY > 1.5) {
        const hits = layers
          .filter((l) => {
            if (l.hidden || l.locked) return false;
            const lx2 = l.x + l.width;
            const ly2 = l.y + l.height;
            return l.x < maxX && lx2 > minX && l.y < maxY && ly2 > minY;
          })
          .map((l) => l.id);
        setSelectedIds(hits);
      }
      return;
    }

    // 2. Interactive Rotation Drag
    if (st.mode === 'rotate' && st.centerPx) {
      const angleRad = Math.atan2(e.clientY - st.centerPx.y, e.clientX - st.centerPx.x);
      let angleDeg = Math.round((angleRad * 180) / Math.PI + 90);
      if (angleDeg > 180) angleDeg -= 360;
      if (angleDeg < -180) angleDeg += 360;

      // Snap to 15-degree increments when holding Shift or near cardinal angles
      if (e.shiftKey) {
        angleDeg = Math.round(angleDeg / 15) * 15;
      } else {
        for (const cardinal of [-180, -135, -90, -45, 0, 45, 90, 135, 180]) {
          if (Math.abs(angleDeg - cardinal) <= 3) {
            angleDeg = cardinal;
            break;
          }
        }
      }

      setRotatingAngleBadge(angleDeg);
      const primaryOrig = st.initialLayers[st.primaryId];
      const deltaAngle = primaryOrig ? angleDeg - primaryOrig.rotation : 0;

      setProp((props: FreeformCanvasBlockProps) => {
        Object.keys(st.initialLayers).forEach((id) => {
          const item = (props.layers || []).find((l) => l.id === id);
          const init = st.initialLayers[id];
          if (item && !item.locked && init) {
            item.rotation =
              id === st.primaryId ? angleDeg : Math.round(((init.rotation + deltaAngle + 180) % 360) - 180);
          }
        });
      });
      return;
    }

    const dxPct = ((e.clientX - st.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - st.startY) / rect.height) * 100;

    // 3. Move Layer(s) (Supports Multi-Selection Group Move!)
    if (st.mode === 'move') {
      const primaryInit = st.initialLayers[st.primaryId];
      if (!primaryInit) return;

      let nextPrimaryX = Math.max(-20, Math.min(98, primaryInit.x + dxPct));
      let nextPrimaryY = Math.max(-20, Math.min(98, primaryInit.y + dyPct));

      let guideX: number | null = null;
      let guideY: number | null = null;

      if (snapToGuides) {
        const centerX = nextPrimaryX + primaryInit.width / 2;
        const centerY = nextPrimaryY + primaryInit.height / 2;
        const snapTargets = [10, 25, 50, 75, 90];

        for (const target of snapTargets) {
          if (Math.abs(centerX - target) < 2) {
            nextPrimaryX = target - primaryInit.width / 2;
            guideX = target;
            break;
          }
          if (Math.abs(nextPrimaryX - target) < 1.8) {
            nextPrimaryX = target;
            guideX = target;
            break;
          }
        }

        for (const target of snapTargets) {
          if (Math.abs(centerY - target) < 2) {
            nextPrimaryY = target - primaryInit.height / 2;
            guideY = target;
            break;
          }
          if (Math.abs(nextPrimaryY - target) < 1.8) {
            nextPrimaryY = target;
            guideY = target;
            break;
          }
        }
      }

      setSnapGuide({ x: guideX, y: guideY });
      const snappedDx = nextPrimaryX - primaryInit.x;
      const snappedDy = nextPrimaryY - primaryInit.y;

      setProp((props: FreeformCanvasBlockProps) => {
        Object.keys(st.initialLayers).forEach((id) => {
          const item = (props.layers || []).find((l) => l.id === id);
          const init = st.initialLayers[id];
          if (item && !item.locked && init) {
            item.x = Math.round(Math.max(-20, Math.min(98, init.x + snappedDx)));
            item.y = Math.round(Math.max(-20, Math.min(98, init.y + snappedDy)));
          }
        });
      });
    } else if (st.mode === 'resize' && st.handle) {
      // 4. Resize Text, Shape, Vector, or Asset (with optional proportional text font scaling!)
      const primaryInit = st.initialLayers[st.primaryId];
      if (!primaryInit) return;

      let nextX = primaryInit.x;
      let nextY = primaryInit.y;
      let nextW = primaryInit.width;
      let nextH = primaryInit.height;

      if (st.handle.includes('e')) {
        nextW = Math.max(4, Math.min(100 - primaryInit.x, primaryInit.width + dxPct));
      }
      if (st.handle.includes('s')) {
        nextH = Math.max(4, Math.min(100 - primaryInit.y, primaryInit.height + dyPct));
      }
      if (st.handle.includes('w')) {
        const deltaW = Math.min(primaryInit.width - 4, dxPct);
        nextX = Math.max(0, primaryInit.x + deltaW);
        nextW = Math.max(4, primaryInit.width - deltaW);
      }
      if (st.handle.includes('n')) {
        const deltaH = Math.min(primaryInit.height - 4, dyPct);
        nextY = Math.max(0, primaryInit.y + deltaH);
        nextH = Math.max(4, primaryInit.height - deltaH);
      }

      // Hold Shift to lock aspect ratio while resizing
      if (e.shiftKey && primaryInit.width > 0 && primaryInit.height > 0) {
        const origAspect = primaryInit.height / primaryInit.width;
        nextH = Math.max(4, Math.min(100 - nextY, nextW * origAspect));
      }

      const scaleFactorW = nextW / Math.max(1, primaryInit.width);
      const scaleFactorH = nextH / Math.max(1, primaryInit.height);
      const isCornerResize = st.handle.length === 2;
      const fontScale = isCornerResize ? (scaleFactorW + scaleFactorH) / 2 : scaleFactorH;

      setProp((props: FreeformCanvasBlockProps) => {
        Object.keys(st.initialLayers).forEach((id) => {
          const item = (props.layers || []).find((l) => l.id === id);
          const init = st.initialLayers[id];
          if (!item || item.locked || !init) return;

          if (id === st.primaryId) {
            item.x = Math.round(nextX);
            item.y = Math.round(nextY);
            item.width = Math.round(nextW);
            item.height = Math.round(nextH);
          } else {
            item.width = Math.max(4, Math.round(init.width * scaleFactorW));
            item.height = Math.max(4, Math.round(init.height * scaleFactorH));
          }

          // Automatically scale text font size when resizing text/badge layers!
          if (
            scaleTextOnResize &&
            (item.type === 'text' || (item.type === 'shape' && item.text))
          ) {
            item.fontSize = Math.max(8, Math.min(96, Math.round(init.fontSize * fontScale)));
          }
        });
      });
    }
  };

  const handleBoardPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'draw' && isDrawingFreehand) {
      e.stopPropagation();
      setIsDrawingFreehand(false);
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      commitDraftVector(draftPoints, false, true);
      return;
    }

    if (dragStateRef.current) {
      e.stopPropagation();
      boardRef.current?.releasePointerCapture?.(e.pointerId);
      dragStateRef.current = null;
      setSnapGuide({ x: null, y: null });
      setRotatingAngleBadge(null);
      setMarquee(null);
    }
  };

  const buildInitialLayersSnapshot = (ids: string[]) => {
    const map: Record<
      string,
      { x: number; y: number; width: number; height: number; fontSize: number; rotation: number }
    > = {};
    layers.forEach((l) => {
      if (ids.includes(l.id)) {
        map[l.id] = {
          x: l.x,
          y: l.y,
          width: l.width,
          height: l.height,
          fontSize: l.fontSize || 14,
          rotation: l.rotation || 0,
        };
      }
    });
    return map;
  };

  const startLayerDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    layer: CanvasLayerItem
  ) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();

    let nextSelected: string[];
    if (e.shiftKey) {
      nextSelected = selectedIds.includes(layer.id)
        ? selectedIds.filter((id) => id !== layer.id)
        : [...selectedIds, layer.id];
      setSelectedIds(nextSelected);
    } else if (selectedIds.includes(layer.id)) {
      nextSelected = selectedIds;
    } else {
      nextSelected = [layer.id];
      setSelectedIds(nextSelected);
    }

    if (layer.locked || editingTextId === layer.id) return;

    boardRef.current?.setPointerCapture?.(e.pointerId);
    dragStateRef.current = {
      mode: 'move',
      primaryId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      initialLayers: buildInitialLayersSnapshot(nextSelected),
    };
  };

  const startResizeDrag = (
    e: React.PointerEvent<HTMLSpanElement>,
    layer: CanvasLayerItem,
    handle: ResizeHandle
  ) => {
    e.stopPropagation();
    if (layer.locked) return;
    boardRef.current?.setPointerCapture?.(e.pointerId);
    const activeIds = selectedIds.includes(layer.id) ? selectedIds : [layer.id];
    dragStateRef.current = {
      mode: 'resize',
      handle,
      primaryId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      initialLayers: buildInitialLayersSnapshot(activeIds),
    };
  };

  const startRotateDrag = (
    e: React.PointerEvent<HTMLSpanElement>,
    layer: CanvasLayerItem
  ) => {
    e.stopPropagation();
    if (layer.locked || !boardRef.current) return;
    boardRef.current.setPointerCapture?.(e.pointerId);
    const rect = boardRef.current.getBoundingClientRect();
    const centerX = rect.left + ((layer.x + layer.width / 2) / 100) * rect.width;
    const centerY = rect.top + ((layer.y + layer.height / 2) / 100) * rect.height;
    const activeIds = selectedIds.includes(layer.id) ? selectedIds : [layer.id];

    dragStateRef.current = {
      mode: 'rotate',
      primaryId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      centerPx: { x: centerX, y: centerY },
      initialLayers: buildInitialLayersSnapshot(activeIds),
    };
  };

  // Add preset layer (sizing height relative to current aspect ratio so shapes are never stretched)
  const addLayer = (kind: 'text' | 'rect' | 'circle' | 'star' | 'hexagon' | 'image') => {
    const id = 'layer-' + Date.now().toString(36);
    const hRatio = getArtboardHeightRatio(aspectRatio);
    const squareW = 24;
    const unstretchedH = Math.min(90, Math.round(squareW / hRatio));

    const newLayer: CanvasLayerItem =
      kind === 'text'
        ? {
            id,
            name: 'Text Layer',
            type: 'text',
            x: 22,
            y: 28,
            width: 48,
            height: Math.min(80, Math.round(12 / hRatio)),
            rotation: 0,
            opacity: 100,
            text: 'Double-click to edit text',
            fontSize: 16,
            fontFamily: 'heading',
            textAlign: 'center',
            color: '#141414',
            fill: '#FFFFFF',
            strokeColor: '#141414',
            strokeWidth: 2,
            borderNeo: true,
          }
        : kind === 'image'
        ? {
            id,
            name: 'Sparkle Vector',
            type: 'image',
            iconifyId: 'ph:sparkle-duotone',
            color: '#FF5E3A',
            imageSrc:
              'https://api.iconify.design/ph/sparkle-duotone.svg?height=512&color=%23FF5E3A',
            x: 34,
            y: 22,
            width: squareW,
            height: unstretchedH,
            rotation: 0,
            opacity: 100,
            borderNeo: false,
          }
        : {
            id,
            name: `${kind.charAt(0).toUpperCase() + kind.slice(1)} Shape`,
            type: 'shape',
            shapeKind: kind as LayerShapeKind,
            x: 32,
            y: 24,
            width: squareW,
            height: unstretchedH,
            rotation: 0,
            opacity: 100,
            fill:
              kind === 'star'
                ? '#FFD23F'
                : kind === 'hexagon'
                ? '#9B5DE5'
                : kind === 'circle'
                ? '#3BCEAC'
                : '#FF5E3A',
            color: '#141414',
            strokeColor: '#141414',
            strokeWidth: 2,
            text: '',
            borderNeo: kind === 'rect' || kind === 'circle',
          };

    setProp((props: FreeformCanvasBlockProps) => {
      props.layers = [...(props.layers || []), newLayer];
    });
    setSelectedIds([id]);
    setActiveTool('select');
  };

  // Upload local image/SVG file into artboard
  const handleUploadImageLayer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await saveAsset(projectId, file);
      const id = 'img-' + Date.now().toString(36);
      const newLayer: CanvasLayerItem = {
        id,
        name: file.name.slice(0, 22),
        type: 'image',
        imageSrc: url,
        x: 25,
        y: 20,
        width: 40,
        height: 50,
        rotation: 0,
        opacity: 100,
        borderNeo: false,
      };
      setProp((props: FreeformCanvasBlockProps) => {
        props.layers = [...(props.layers || []), newLayer];
      });
      setSelectedIds([id]);
    } catch {
      // saveAsset already notifies on error
    }
    e.target.value = '';
  };

  const handleUploadBgImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await saveAsset(projectId, file);
      setProp((p: FreeformCanvasBlockProps) => {
        p.backgroundType = 'image';
        p.backgroundImage = url;
      });
    } catch {
      // handled
    }
    e.target.value = '';
  };

  // Auto-alignment helpers for all selected layers
  const alignSelectedLayers = (
    alignment:
      | 'left'
      | 'center-x'
      | 'right'
      | 'top'
      | 'center-y'
      | 'bottom'
      | 'distribute-x'
      | 'distribute-y'
  ) => {
    if (selectedIds.length === 0) return;
    setProp((props: FreeformCanvasBlockProps) => {
      const targets = (props.layers || []).filter(
        (l) => selectedIds.includes(l.id) && !l.locked
      );
      if (targets.length === 0) return;

      if (alignment === 'distribute-x' && targets.length >= 2) {
        const sorted = [...targets].sort((a, b) => a.x - b.x);
        const minX = sorted[0].x;
        const maxX = sorted[sorted.length - 1].x;
        const step = (maxX - minX) / Math.max(1, sorted.length - 1);
        sorted.forEach((t, idx) => {
          t.x = Math.round(minX + idx * step);
        });
        return;
      }

      if (alignment === 'distribute-y' && targets.length >= 2) {
        const sorted = [...targets].sort((a, b) => a.y - b.y);
        const minY = sorted[0].y;
        const maxY = sorted[sorted.length - 1].y;
        const step = (maxY - minY) / Math.max(1, sorted.length - 1);
        sorted.forEach((t, idx) => {
          t.y = Math.round(minY + idx * step);
        });
        return;
      }

      targets.forEach((target) => {
        switch (alignment) {
          case 'left':
            target.x = 4;
            break;
          case 'center-x':
            target.x = Math.round(50 - target.width / 2);
            break;
          case 'right':
            target.x = Math.max(0, 96 - target.width);
            break;
          case 'top':
            target.y = 4;
            break;
          case 'center-y':
            target.y = Math.round(50 - target.height / 2);
            break;
          case 'bottom':
            target.y = Math.max(0, 96 - target.height);
            break;
        }
      });
    });
  };

  const duplicateSelectedLayers = () => {
    if (selectedIds.length === 0) return;
    const newIds: string[] = [];
    setProp((props: FreeformCanvasBlockProps) => {
      const copies: CanvasLayerItem[] = [];
      (props.layers || []).forEach((layer) => {
        if (selectedIds.includes(layer.id)) {
          const copyId =
            'layer-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5);
          newIds.push(copyId);
          copies.push({
            ...JSON.parse(JSON.stringify(layer)),
            id: copyId,
            name: `${layer.name || layer.type} (Copy)`,
            x: Math.min(92, layer.x + 4),
            y: Math.min(92, layer.y + 4),
          });
        }
      });
      props.layers = [...(props.layers || []), ...copies];
    });
    setSelectedIds(newIds);
    notify({
      type: 'info',
      title: `Duplicated ${newIds.length} ${newIds.length === 1 ? 'Layer' : 'Layers'}`,
      duration: 1800,
    });
  };

  const deleteSelectedLayers = () => {
    if (selectedIds.length === 0) return;
    setProp((props: FreeformCanvasBlockProps) => {
      props.layers = (props.layers || []).filter((l) => !selectedIds.includes(l.id));
    });
    setSelectedIds([]);
  };

  const reorderLayerZ = (
    layerId: string,
    action: 'front' | 'forward' | 'backward' | 'back'
  ) => {
    setProp((props: FreeformCanvasBlockProps) => {
      const list = [...(props.layers || [])];
      const idx = list.findIndex((l) => l.id === layerId);
      if (idx === -1) return;
      const [item] = list.splice(idx, 1);

      if (action === 'front') {
        list.push(item);
      } else if (action === 'back') {
        list.unshift(item);
      } else if (action === 'forward') {
        list.splice(Math.min(list.length, idx + 1), 0, item);
      } else if (action === 'backward') {
        list.splice(Math.max(0, idx - 1), 0, item);
      }
      props.layers = list;
    });
  };

  // Export artboard directly as a standalone .svg vector file
  const handleExportSvgFile = () => {
    const viewH =
      aspectRatio === '1/1'
        ? 1000
        : aspectRatio === '4/5'
        ? 1250
        : aspectRatio === '4/3'
        ? 750
        : 562;

    const svgBody = layers
      .filter((l) => !l.hidden)
      .map((l) => {
        const x = Math.round((l.x / 100) * 1000);
        const y = Math.round((l.y / 100) * viewH);
        const w = Math.round((l.width / 100) * 1000);
        const h = Math.round((l.height / 100) * viewH);
        const cx = Math.round(x + w / 2);
        const cy = Math.round(y + h / 2);
        const rot = l.rotation || 0;
        const tf = rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : '';

        if (l.type === 'path' && l.points) {
          const d = buildSvgPathD(
            l.points.map((pt) => ({
              x: x + (pt.x / 100) * w,
              y: y + (pt.y / 100) * h,
            })),
            l.closed,
            l.smooth
          );
          return `<path d="${d}" fill="${
            l.closed && l.fill && l.fill !== 'transparent' ? l.fill : 'none'
          }" stroke="${l.strokeColor || '#141414'}" stroke-width="${
            (l.strokeWidth || 3) * 2
          }" stroke-linecap="round" stroke-linejoin="round"${tf} />`;
        }

        if (l.type === 'image' && l.imageSrc) {
          return `<image href="${l.imageSrc}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"${tf} />`;
        }

        const fill = l.fill && l.fill !== 'transparent' ? l.fill : 'none';
        const stroke = l.strokeWidth
          ? ` stroke="${l.strokeColor || '#141414'}" stroke-width="${l.strokeWidth * 2}"`
          : '';
        return `<g${tf}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}"${stroke} />${
          l.text
            ? `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="${
                l.color || '#141414'
              }" font-family="sans-serif" font-weight="bold" font-size="${
                (l.fontSize || 16) * 1.6
              }">${l.text}</text>`
            : ''
        }</g>`;
      })
      .join('\n  ');

    const bgRect =
      backgroundType === 'transparent'
        ? ''
        : `<rect x="0" y="0" width="1000" height="${viewH}" fill="${backgroundColor}" />`;

    const svgDoc = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by Wyzard Studio (Vector workflow inspired by Graphite Editor: https://github.com/GraphiteEditor/Graphite) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${viewH}" width="1000" height="${viewH}">
  ${bgRect}
  ${svgBody}
</svg>`;

    const blob = new Blob([svgDoc], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wyzard-artboard-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    notify({
      type: 'success',
      title: 'Artboard Exported as .SVG',
      message:
        backgroundType === 'transparent'
          ? 'Saved with transparent vector background.'
          : 'Saved vector artboard SVG.',
    });
  };

  const renderShapeSvg = (layer: CanvasLayerItem) => {
    const fill = layer.fill && layer.fill !== 'transparent' ? layer.fill : 'none';
    const stroke = layer.strokeColor || '#141414';
    const sw = layer.strokeWidth ?? (layer.borderNeo ? 3 : 0);
    const dash = layer.strokeDashed ? '6 4' : undefined;

    if (layer.shapeKind === 'star') {
      return (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          <polygon
            points="50,4 63,36 98,38 70,59 79,94 50,74 21,94 30,59 2,38 37,36"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeDasharray={dash}
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    if (layer.shapeKind === 'hexagon') {
      return (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          <polygon
            points="25,5 75,5 98,50 75,95 25,95 2,50"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeDasharray={dash}
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    return null;
  };

  const artboardBgStyle = getArtboardBackgroundStyle(
    {
      backgroundType,
      backgroundColor,
      backgroundGradient,
      backgroundPattern,
      backgroundImage,
      backgroundOpacity,
      showGrid,
    },
    false
  );

  return (
    <figure
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      data-stage-ui="true"
      className={`relative my-4 rounded-xl transition-all select-none ${
        selected
          ? 'ring-2 ring-neo-yellow ring-offset-2'
          : hovered
          ? 'outline outline-1 outline-dashed outline-neo-vermilion'
          : ''
      }`}
    >
      {/* Top Vector & Artboard Studio Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 bg-neo-ink text-white px-2.5 py-2 rounded-lg border-neo border-neo-ink shadow-neo-sm text-[10px] font-mono">
        {/* Lock Canvas Editing State + Tool Modes: Select | Pen | Freehand Brush */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Canvas Edit Lock Toggle (Prevents dragging assets inside from moving the whole canvas block!) */}
          <button
            type="button"
            onClick={() => setIsCanvasEditingLocked((prev) => !prev)}
            className={`px-2 py-1 rounded flex items-center gap-1 font-bold transition-colors border ${
              isCanvasEditingLocked
                ? 'bg-neo-teal text-neo-ink border-neo-teal'
                : 'bg-neo-vermilion text-white border-white/40'
            }`}
            title={
              isCanvasEditingLocked
                ? 'Canvas Edit Locked: Long-pressing and dragging assets inside stays strictly inside this canvas. Click to unlock block reordering.'
                : 'Block Move Unlocked: Use the Move Block grip to reorder this canvas block on the page. Click to lock for canvas editing.'
            }
          >
            {isCanvasEditingLocked ? (
              <>
                <Lock className="w-3 h-3" />
                <span>Edit Locked</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3" />
                <span>Unlocked</span>
              </>
            )}
          </button>

          {!isCanvasEditingLocked && (
            <span
              ref={(ref) => {
                if (ref) drag(ref);
              }}
              className="px-2 py-1 rounded bg-neo-yellow text-neo-ink font-bold flex items-center gap-1 cursor-grab active:cursor-grabbing"
              title="Drag here to move this Fixed Visual Canvas block up/down between other page blocks"
            >
              <GripVertical className="w-3 h-3" />
              <span>Move Block</span>
            </span>
          )}

          <div className="h-4 w-[1px] bg-white/20 mx-0.5" />

          <button
            type="button"
            onClick={() => {
              if (draftPoints.length >= 2) commitDraftVector(draftPoints, false, true);
              setActiveTool('select');
            }}
            className={`px-2 py-1 rounded flex items-center gap-1 font-bold transition-colors ${
              activeTool === 'select'
                ? 'bg-neo-yellow text-neo-ink'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Select, Multi-Select (Shift+Click or Drag Box), Resize & Rotate"
          >
            <MousePointer className="w-3 h-3" />
            <span>Select</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('pen');
              setDraftPoints([]);
            }}
            className={`px-2 py-1 rounded flex items-center gap-1 font-bold transition-colors ${
              activeTool === 'pen'
                ? 'bg-neo-vermilion text-white'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Vector Pen Tool: click points on canvas to draw custom SVG curves/shapes"
          >
            <PenTool className="w-3 h-3" />
            <span>Pen</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('draw');
              setDraftPoints([]);
            }}
            className={`px-2 py-1 rounded flex items-center gap-1 font-bold transition-colors ${
              activeTool === 'draw'
                ? 'bg-neo-teal text-neo-ink'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Vector Brush Tool: drag freely on canvas to sketch smooth SVG paths"
          >
            <Brush className="w-3 h-3" />
            <span>Draw</span>
          </button>

          {activeTool === 'pen' && draftPoints.length > 0 && (
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => commitDraftVector(draftPoints, false, true)}
                className="px-2 py-0.5 bg-neo-teal text-neo-ink rounded font-bold"
              >
                Finish Open ({draftPoints.length})
              </button>
              <button
                type="button"
                onClick={() => commitDraftVector(draftPoints, true, true)}
                className="px-2 py-0.5 bg-neo-yellow text-neo-ink rounded font-bold"
              >
                Close Shape
              </button>
            </div>
          )}
        </div>

        {/* Add Primitives + Open Drawers (Asset Packs, Layers, Background) */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => addLayer('text')}
            className="px-2 py-1 bg-white/15 hover:bg-neo-yellow hover:text-neo-ink rounded flex items-center gap-1 font-bold transition-colors"
            title="Add resizable text layer"
          >
            <Type className="w-3 h-3" />
            <span>Text</span>
          </button>
          <button
            type="button"
            onClick={() => addLayer('rect')}
            className="p-1 bg-white/15 hover:bg-neo-yellow hover:text-neo-ink rounded"
            title="Add rectangle"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => addLayer('circle')}
            className="p-1 bg-white/15 hover:bg-neo-yellow hover:text-neo-ink rounded"
            title="Add circle"
          >
            <Circle className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => addLayer('star')}
            className="p-1 bg-white/15 hover:bg-neo-yellow hover:text-neo-ink rounded"
            title="Add vector star"
          >
            <Star className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => addLayer('hexagon')}
            className="p-1 bg-white/15 hover:bg-neo-yellow hover:text-neo-ink rounded"
            title="Add vector polygon"
          >
            <Hexagon className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 bg-white/15 hover:bg-neo-teal hover:text-neo-ink rounded"
            title="Upload local SVG/PNG into artboard"
          >
            <Upload className="w-3 h-3" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.svg"
            onChange={handleUploadImageLayer}
            className="hidden"
          />

          {/* Asset Packs Drawer Toggle */}
          <button
            type="button"
            onClick={() => setOpenDrawer((d) => (d === 'packs' ? 'none' : 'packs'))}
            className={`px-2 py-1 rounded flex items-center gap-1 font-bold transition-colors ${
              openDrawer === 'packs'
                ? 'bg-neo-vermilion text-white'
                : 'bg-white/15 hover:bg-neo-yellow hover:text-neo-ink'
            }`}
            title="Browse & Insert Editable Asset Packs & Vectors inside Canvas"
          >
            <PackageOpen className="w-3 h-3" />
            <span>Asset Packs</span>
          </button>

          {/* Background Studio Drawer Toggle */}
          <button
            type="button"
            onClick={() => setOpenDrawer((d) => (d === 'background' ? 'none' : 'background'))}
            className={`px-2 py-1 rounded flex items-center gap-1 font-bold transition-colors ${
              openDrawer === 'background'
                ? 'bg-neo-teal text-neo-ink'
                : 'bg-white/15 hover:bg-neo-yellow hover:text-neo-ink'
            }`}
            title="Background Settings (Transparent, Solid, Gradient, Pattern, Image)"
          >
            <Grid className="w-3 h-3" />
            <span>Bg</span>
          </button>

          {/* Enhanced Layering Manager Toggle */}
          <button
            type="button"
            onClick={() => setOpenDrawer((d) => (d === 'layers' ? 'none' : 'layers'))}
            className={`px-2 py-1 rounded flex items-center gap-1 font-bold transition-colors ${
              openDrawer === 'layers'
                ? 'bg-neo-yellow text-neo-ink'
                : 'bg-white/15 hover:bg-neo-yellow hover:text-neo-ink'
            }`}
            title="Enhanced Layering & Multi-Selection Manager"
          >
            <Layers className="w-3 h-3" />
            <span>Layers ({layers.length})</span>
          </button>

          <button
            type="button"
            onClick={handleExportSvgFile}
            className="px-2 py-1 bg-neo-teal text-neo-ink rounded flex items-center gap-1 font-bold"
            title="Export Artboard as standalone SVG file"
          >
            <Download className="w-3 h-3" />
            <span>SVG</span>
          </button>
        </div>
      </div>

      {/* DRAWER 1: ASSET PACKS & EDITABLE VECTORS BROWSER INSIDE CANVAS */}
      {openDrawer === 'packs' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mb-2 p-3 bg-white border-neo border-neo-ink rounded-xl shadow-neo-sm flex flex-col gap-3 text-xs font-mono"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
            <span className="font-heading font-bold text-neo-ink flex items-center gap-1.5">
              <PackageOpen className="w-4 h-4 text-neo-vermilion" />
              <span>Canvas Asset Packs &amp; Editable Vector Library</span>
            </span>
            <span className="text-[10px] text-gray-500">
              Drag &amp; drop onto canvas or click to insert (resizable, rotatable, recolorable &amp; auto-credited)
            </span>
          </div>

          {/* Live Iconify Vector Search */}
          <form onSubmit={handleSearchCanvasVectors} className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={packVectorQuery}
                onChange={(e) => setPackVectorQuery(e.target.value)}
                placeholder="Search 200,000+ editable SVG vectors (e.g. dragon, floral, badge, arrow)..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-neo-bg border border-neo-ink rounded-lg text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingPackVectors}
              className="px-3 py-1.5 bg-neo-yellow text-neo-ink border border-neo-ink rounded-lg font-bold flex items-center gap-1"
            >
              {isSearchingPackVectors ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Search Vectors</span>
              )}
            </button>
          </form>

          {/* Searchable Editable Vector Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5 max-h-28 overflow-y-auto p-1 bg-neo-bg/60 rounded-lg border border-neo-ink/20">
            {packVectorResults.map((iconId) => {
              const [prefix, name] = iconId.split(':');
              const previewUrl = `https://api.iconify.design/${prefix}/${name}.svg?height=64&color=%23141414`;
              const fullSvgUrl = `https://api.iconify.design/${prefix}/${name}.svg?height=512&color=%23141414`;
              return (
                <button
                  key={iconId}
                  type="button"
                  draggable
                  onDragStart={(e) =>
                    setAssetDragData(e, {
                      title: `${name} Vector`,
                      assetUrl: fullSvgUrl,
                      creator: `${prefix} Contributors`,
                      creatorUrl: 'https://iconify.design',
                      sourceName: `Iconify (${iconId})`,
                      sourceUrl: 'https://iconify.design',
                      license: 'Open Source SVG',
                      kind: 'vector',
                      defaultWidthPct: 24,
                      borderNeo: false,
                    })
                  }
                  onClick={() =>
                    insertPackAssetIntoCanvas({
                      title: `${name} Vector`,
                      kind: 'iconify',
                      iconifyId: iconId,
                      defaultColor: '#141414',
                      creator: `${prefix} Contributors`,
                      creatorUrl: 'https://iconify.design',
                      license: 'Open Source SVG',
                    })
                  }
                  className="p-1.5 bg-white hover:bg-neo-yellow border border-neo-ink/40 rounded flex flex-col items-center justify-center gap-1 transition-colors cursor-grab active:cursor-grabbing"
                  title={`Drag & drop onto canvas or click to insert "${name}"`}
                >
                  <img
                    src={previewUrl}
                    alt={name}
                    draggable={false}
                    className="w-6 h-6 object-contain pointer-events-none"
                  />
                </button>
              );
            })}
          </div>

          {/* Curated Visual Packs (Adamsdesk / Openverse / Editorial Ornaments) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BUILTIN_CANVAS_ASSET_PACKS.map((pack) => (
              <div
                key={pack.id}
                className="p-2 bg-neo-bg/50 border border-neo-ink rounded-lg flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-neo-ink">{pack.packName}</span>
                  <span className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-neo-ink">
                    {pack.license}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {pack.items.map((item, idx) => {
                    const thumb =
                      item.kind === 'iconify' && item.iconifyId
                        ? `https://api.iconify.design/${item.iconifyId.replace(':', '/')}.svg?height=64&color=${encodeURIComponent(
                            item.defaultColor || '#141414'
                          )}`
                        : item.imageSrc;
                    const fullAssetUrl =
                      item.kind === 'iconify' && item.iconifyId
                        ? `https://api.iconify.design/${item.iconifyId.replace(':', '/')}.svg?height=512&color=${encodeURIComponent(
                            item.defaultColor || '#141414'
                          )}`
                        : item.imageSrc || '';
                    return (
                      <button
                        key={idx}
                        type="button"
                        draggable
                        onDragStart={(e) =>
                          setAssetDragData(e, {
                            title: item.title,
                            assetUrl: fullAssetUrl,
                            creator: pack.creator,
                            creatorUrl: pack.creatorUrl,
                            sourceName: pack.packName,
                            sourceUrl: pack.creatorUrl,
                            license: pack.license,
                            kind: item.kind === 'iconify' ? 'vector' : 'pack-item',
                            defaultWidthPct: item.kind === 'iconify' ? 24 : 36,
                            borderNeo: item.kind === 'illustration',
                          })
                        }
                        onClick={() =>
                          insertPackAssetIntoCanvas({
                            ...item,
                            creator: pack.creator,
                            creatorUrl: pack.creatorUrl,
                            license: pack.license,
                          })
                        }
                        className="p-1 bg-white hover:bg-neo-yellow border border-neo-ink rounded flex flex-col items-center gap-1 text-center transition-colors cursor-grab active:cursor-grabbing"
                        title={`Drag & drop onto canvas or click to add "${item.title}"`}
                      >
                        <img
                          src={thumb}
                          alt={item.title}
                          draggable={false}
                          className="w-8 h-8 object-contain rounded pointer-events-none"
                        />
                        <span className="text-[9px] truncate w-full font-bold">
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DRAWER 2: TRANSPARENT & RICH BACKGROUND STUDIO */}
      {openDrawer === 'background' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mb-2 p-3 bg-white border-neo border-neo-ink rounded-xl shadow-neo-sm flex flex-col gap-2.5 text-xs font-mono"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
            <span className="font-heading font-bold text-neo-ink">
              Artboard Background Studio
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {(['transparent', 'solid', 'gradient', 'pattern', 'image'] as ArtboardBgType[]).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setProp((p: FreeformCanvasBlockProps) => {
                        p.backgroundType = mode;
                      })
                    }
                    className={`px-2 py-1 rounded border border-neo-ink text-[10px] font-bold uppercase ${
                      backgroundType === mode
                        ? 'bg-neo-yellow text-neo-ink shadow-neo-sm'
                        : 'bg-neo-bg text-gray-600 hover:bg-white'
                    }`}
                  >
                    {mode}
                  </button>
                )
              )}
            </div>
          </div>

          {backgroundType === 'transparent' && (
            <div className="text-[11px] text-gray-600 flex items-center justify-between bg-neo-bg p-2 rounded border border-neo-ink/30">
              <span>
                ✦ Transparent background active (checkerboard shown in editor; exports with zero background fill in Web, PDF, CBZ, EPUB &amp; SVG).
              </span>
            </div>
          )}

          {(backgroundType === 'solid' || backgroundType === 'pattern') && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold">Color:</span>
              {['#F4F1EA', '#FFFFFF', '#FFF9DB', '#FFEAE4', '#E6FBF5', '#F5EDFD', '#141414'].map(
                (bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() =>
                      setProp((p: FreeformCanvasBlockProps) => {
                        p.backgroundColor = bg;
                      })
                    }
                    style={{ backgroundColor: bg }}
                    className={`w-6 h-6 rounded-full border-2 border-neo-ink ${
                      backgroundColor === bg ? 'ring-2 ring-neo-vermilion' : ''
                    }`}
                  />
                )
              )}
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) =>
                  setProp((p: FreeformCanvasBlockProps) => {
                    p.backgroundColor = e.target.value;
                  })
                }
                className="w-7 h-7 rounded border border-neo-ink cursor-pointer"
                title="Custom background color"
              />

              {backgroundType === 'pattern' && (
                <div className="flex items-center gap-1 ml-2">
                  {(['dots', 'grid', 'diagonal', 'crosshatch'] as const).map((pat) => (
                    <button
                      key={pat}
                      type="button"
                      onClick={() =>
                        setProp((p: FreeformCanvasBlockProps) => {
                          p.backgroundPattern = pat;
                        })
                      }
                      className={`px-2 py-0.5 rounded border border-neo-ink text-[10px] font-bold uppercase ${
                        backgroundPattern === pat ? 'bg-neo-teal text-neo-ink' : 'bg-white'
                      }`}
                    >
                      {pat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {backgroundType === 'gradient' && (
            <div className="flex flex-wrap items-center gap-2">
              {GRADIENT_PRESETS.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() =>
                    setProp((p: FreeformCanvasBlockProps) => {
                      p.backgroundGradient = g.value;
                    })
                  }
                  style={{ backgroundImage: g.value }}
                  className={`px-2.5 py-1 rounded border-2 border-neo-ink text-[10px] font-bold ${
                    backgroundGradient === g.value ? 'ring-2 ring-neo-vermilion' : ''
                  } ${g.label === 'Noir Spotlight' ? 'text-white' : 'text-neo-ink'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          {backgroundType === 'image' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="url"
                value={backgroundImage || ''}
                onChange={(e) =>
                  setProp((p: FreeformCanvasBlockProps) => {
                    p.backgroundImage = e.target.value;
                  })
                }
                placeholder="Background image URL..."
                className="flex-1 min-w-[180px] px-2.5 py-1 bg-neo-bg border border-neo-ink rounded text-xs"
              />
              <button
                type="button"
                onClick={() => bgFileInputRef.current?.click()}
                className="px-2.5 py-1 bg-neo-yellow text-neo-ink border border-neo-ink rounded font-bold flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Upload Bg</span>
              </button>
              <input
                ref={bgFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadBgImage}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}

      {/* DRAWER 3: ENHANCED LAYERING & MULTI-SELECTION MANAGER */}
      {openDrawer === 'layers' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mb-2 p-3 bg-white border-neo border-neo-ink rounded-xl shadow-neo-sm flex flex-col gap-2 text-xs font-mono"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
            <span className="font-heading font-bold text-neo-ink flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-neo-vermilion" />
              <span>
                Layer Stack ({layers.length} Layers • {selectedIds.length} Selected)
              </span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setSelectedIds(layers.filter((l) => !l.hidden && !l.locked).map((l) => l.id))
                }
                className="px-2 py-0.5 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded text-[10px] font-bold flex items-center gap-1"
              >
                <CheckSquare className="w-3 h-3" />
                <span>Select All</span>
              </button>
              {selectedIds.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={duplicateSelectedLayers}
                    className="px-2 py-0.5 bg-neo-teal text-neo-ink border border-neo-ink rounded text-[10px] font-bold"
                  >
                    Duplicate ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedLayers}
                    className="px-2 py-0.5 bg-neo-vermilion text-white border border-neo-ink rounded text-[10px] font-bold"
                  >
                    Delete ({selectedIds.length})
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
            {[...layers].reverse().map((layer, revIdx) => {
              const isSel = selectedIds.includes(layer.id);
              const zIndexNumber = layers.length - revIdx;
              return (
                <div
                  key={layer.id}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      setSelectedIds((prev) =>
                        prev.includes(layer.id)
                          ? prev.filter((id) => id !== layer.id)
                          : [...prev, layer.id]
                      );
                    } else {
                      setSelectedIds([layer.id]);
                    }
                  }}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                    isSel
                      ? 'bg-neo-yellow/35 border-neo-ink font-bold'
                      : 'bg-neo-bg/60 border-neo-ink/30 hover:bg-neo-bg'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedIds((prev) =>
                          prev.includes(layer.id)
                            ? prev.filter((id) => id !== layer.id)
                            : [...prev, layer.id]
                        );
                      }}
                      className="w-3.5 h-3.5 accent-neo-ink rounded shrink-0"
                      title="Toggle layer in multi-selection"
                    />
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-neo-ink text-white uppercase shrink-0">
                      #{zIndexNumber} {layer.type}
                    </span>
                    <input
                      type="text"
                      value={layer.name || layer.text || layer.type}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        setProp((p: FreeformCanvasBlockProps) => {
                          const target = (p.layers || []).find((l) => l.id === layer.id);
                          if (target) target.name = e.target.value;
                        })
                      }
                      className="bg-transparent border-b border-transparent focus:border-neo-ink focus:outline-none text-xs truncate min-w-0 flex-1"
                    />
                  </div>

                  {/* Layer Blend Mode, Opacity & Z-Order Controls */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 shrink-0"
                  >
                    <select
                      value={layer.blendMode || 'normal'}
                      onChange={(e) =>
                        setProp((p: FreeformCanvasBlockProps) => {
                          const target = (p.layers || []).find((l) => l.id === layer.id);
                          if (target) target.blendMode = e.target.value as LayerBlendMode;
                        })
                      }
                      className="bg-white border border-neo-ink rounded px-1 py-0.5 text-[10px]"
                      title="Layer Blend Mode"
                    >
                      <option value="normal">Normal</option>
                      <option value="multiply">Multiply</option>
                      <option value="screen">Screen</option>
                      <option value="overlay">Overlay</option>
                      <option value="darken">Darken</option>
                      <option value="lighten">Lighten</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => reorderLayerZ(layer.id, 'front')}
                      className="p-1 bg-white hover:bg-neo-teal border border-neo-ink rounded"
                      title="Bring to Front"
                    >
                      <ChevronsUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => reorderLayerZ(layer.id, 'forward')}
                      className="p-1 bg-white hover:bg-neo-teal border border-neo-ink rounded"
                      title="Bring Forward"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => reorderLayerZ(layer.id, 'backward')}
                      className="p-1 bg-white hover:bg-neo-teal border border-neo-ink rounded"
                      title="Send Backward"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => reorderLayerZ(layer.id, 'back')}
                      className="p-1 bg-white hover:bg-neo-teal border border-neo-ink rounded"
                      title="Send to Back"
                    >
                      <ChevronsDown className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setProp((p: FreeformCanvasBlockProps) => {
                          const target = (p.layers || []).find((l) => l.id === layer.id);
                          if (target) target.hidden = !target.hidden;
                        })
                      }
                      className="p-1 bg-white hover:bg-neo-yellow border border-neo-ink rounded"
                      title={layer.hidden ? 'Show layer' : 'Hide layer'}
                    >
                      {layer.hidden ? (
                        <EyeOff className="w-3 h-3 text-gray-400" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setProp((p: FreeformCanvasBlockProps) => {
                          const target = (p.layers || []).find((l) => l.id === layer.id);
                          if (target) target.locked = !target.locked;
                        })
                      }
                      className="p-1 bg-white hover:bg-neo-yellow border border-neo-ink rounded"
                      title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                    >
                      {layer.locked ? (
                        <Lock className="w-3 h-3 text-neo-vermilion" />
                      ) : (
                        <Unlock className="w-3 h-3 text-gray-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setProp((p: FreeformCanvasBlockProps) => {
                          p.layers = (p.layers || []).filter((l) => l.id !== layer.id);
                        })
                      }
                      className="p-1 bg-neo-vermilion text-white border border-neo-ink rounded"
                      title="Delete layer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fixed Aspect-Ratio 2D Vector & Visual Artboard (Also a Drag-and-Drop Asset Target!) */}
      <div
        ref={boardRef}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
        onPointerCancel={handleBoardPointerUp}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onDragStart={(e) => {
          // Prevent Craft.js block drag from firing when dragging layers inside the artboard
          if (isCanvasEditingLocked) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onDragOver={handleBoardDragOver}
        onDragEnter={handleBoardDragOver}
        onDragLeave={handleBoardDragLeave}
        onDrop={handleBoardDrop}
        style={{ ...artboardBgStyle, touchAction: 'none' }}
        className={`w-full ${getAspectClass()} relative overflow-hidden border-neo border-neo-ink rounded-xl shadow-neo transition-all ${
          activeTool !== 'select' ? 'cursor-crosshair' : ''
        } ${isDragOverBoard ? 'ring-4 ring-neo-teal border-neo-teal' : ''}`}
      >
        {/* Drag-and-Drop Asset Target Overlay */}
        {isDragOverBoard && (
          <div className="absolute inset-0 z-50 bg-neo-teal/20 border-2 border-dashed border-neo-ink rounded-xl pointer-events-none flex items-center justify-center">
            {dropCursorPct && (
              <div
                style={{ left: `${dropCursorPct.x}%`, top: `${dropCursorPct.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-neo-vermilion bg-neo-yellow/40 flex items-center justify-center"
              >
                <div className="w-2 h-2 rounded-full bg-neo-vermilion" />
              </div>
            )}
            <div className="px-3 py-1.5 bg-neo-ink text-neo-yellow border-2 border-neo-yellow rounded-lg shadow-neo font-mono text-xs font-bold uppercase tracking-wider">
              ✦ Drop Asset Here on Fixed Visual Canvas {dropCursorPct ? `(${Math.round(dropCursorPct.x)}%, ${Math.round(dropCursorPct.y)}%)` : ''}
            </div>
          </div>
        )}

        {/* Smart Magnetic Alignment Guides */}
        {snapGuide.x !== null && (
          <div
            style={{ left: `${snapGuide.x}%` }}
            className="absolute top-0 bottom-0 w-[1.5px] bg-neo-vermilion z-50 pointer-events-none"
          />
        )}
        {snapGuide.y !== null && (
          <div
            style={{ top: `${snapGuide.y}%` }}
            className="absolute left-0 right-0 h-[1.5px] bg-neo-vermilion z-50 pointer-events-none"
          />
        )}

        {/* Marquee Multi-Selection Box */}
        {marquee &&
          (Math.abs(marquee.curX - marquee.startX) > 1 ||
            Math.abs(marquee.curY - marquee.startY) > 1) && (
            <div
              style={{
                left: `${Math.min(marquee.startX, marquee.curX)}%`,
                top: `${Math.min(marquee.startY, marquee.curY)}%`,
                width: `${Math.abs(marquee.curX - marquee.startX)}%`,
                height: `${Math.abs(marquee.curY - marquee.startY)}%`,
              }}
              className="absolute z-50 border-2 border-dashed border-neo-vermilion bg-neo-yellow/20 pointer-events-none rounded"
            />
          )}

        {/* Live Draft Vector Path Overlay (Pen / Draw Mode) */}
        {draftPoints.length > 0 && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full z-40 pointer-events-none"
          >
            <path
              d={buildSvgPathD(draftPoints, false, true)}
              fill="none"
              stroke="#FF5E3A"
              strokeWidth="1.2"
              strokeDasharray={activeTool === 'pen' ? '2 1' : undefined}
              strokeLinecap="round"
            />
            {draftPoints.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="1.3"
                fill="#FFD23F"
                stroke="#141414"
                strokeWidth="0.5"
              />
            ))}
          </svg>
        )}

        {/* Rendered Layers */}
        {layers.map((layer, index) => {
          if (layer.hidden) return null;
          const isLayerSelected = selectedIds.includes(layer.id);
          const isPrimarySelected = layer.id === primarySelectedId;
          const isSpecialPolygon =
            layer.type === 'shape' &&
            (layer.shapeKind === 'star' || layer.shapeKind === 'hexagon');

          const borderClass =
            !isSpecialPolygon && layer.type !== 'path' && layer.borderNeo
              ? 'border-2 border-neo-ink shadow-neo-sm'
              : '';
          const radiusClass =
            layer.shapeKind === 'circle' || layer.shapeKind === 'pill'
              ? 'rounded-full'
              : 'rounded-lg';

          const fontClass =
            layer.fontFamily === 'serif'
              ? 'font-serif'
              : layer.fontFamily === 'mono'
              ? 'font-mono'
              : layer.fontFamily === 'sans'
              ? 'font-sans'
              : 'font-heading';

          const scaleX = layer.flipX ? -1 : 1;
          const scaleY = layer.flipY ? -1 : 1;

          return (
            <div
              key={layer.id}
              onPointerDown={(e) => startLayerDrag(e, layer)}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (layer.type === 'text' || layer.type === 'shape') {
                  setEditingTextId(layer.id);
                }
              }}
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.width}%`,
                height: `${layer.height}%`,
                zIndex: index + 1,
                opacity: (layer.opacity ?? 100) / 100,
                mixBlendMode: layer.blendMode || 'normal',
                transform: `rotate(${layer.rotation || 0}deg)`,
                backgroundColor:
                  layer.type === 'image' || layer.type === 'path' || isSpecialPolygon
                    ? layer.fill && layer.fill !== 'transparent'
                      ? layer.fill
                      : 'transparent'
                    : layer.fill || 'transparent',
                color: layer.color || '#141414',
                borderColor:
                  !isSpecialPolygon && layer.type !== 'path' && layer.strokeWidth
                    ? layer.strokeColor || '#141414'
                    : undefined,
                borderWidth:
                  !isSpecialPolygon && layer.type !== 'path' && layer.strokeWidth
                    ? `${layer.strokeWidth}px`
                    : undefined,
                borderStyle:
                  !isSpecialPolygon && layer.type !== 'path' && layer.strokeWidth
                    ? layer.strokeDashed
                      ? 'dashed'
                      : 'solid'
                    : undefined,
              }}
              className={`absolute ${
                layer.locked ? 'cursor-not-allowed' : 'cursor-move'
              } flex items-center justify-center p-1.5 transition-shadow ${radiusClass} ${borderClass} ${
                isLayerSelected
                  ? 'ring-2 ring-neo-vermilion ring-offset-1'
                  : 'hover:ring-1 hover:ring-neo-ink/40'
              }`}
            >
              {/* Inner Flippable Content Wrapper */}
              <div
                style={{
                  transform:
                    scaleX !== 1 || scaleY !== 1 ? `scale(${scaleX}, ${scaleY})` : undefined,
                }}
                className="w-full h-full flex items-center justify-center"
              >
                {layer.type === 'path' && layer.points ? (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible pointer-events-none"
                  >
                    <path
                      d={buildSvgPathD(layer.points, layer.closed, layer.smooth)}
                      fill={
                        layer.closed && layer.fill && layer.fill !== 'transparent'
                          ? layer.fill
                          : 'none'
                      }
                      stroke={layer.strokeColor || '#141414'}
                      strokeWidth={layer.strokeWidth || 3}
                      strokeDasharray={layer.strokeDashed ? '6 4' : undefined}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : layer.type === 'image' && layer.imageSrc ? (
                  <img
                    src={layer.imageSrc}
                    alt={layer.name || 'Canvas Layer'}
                    draggable={false}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : isSpecialPolygon ? (
                  <div className="w-full h-full relative flex items-center justify-center pointer-events-none">
                    {renderShapeSvg(layer)}
                    {layer.text && (
                      <span
                        style={{ fontSize: `${layer.fontSize || 13}px` }}
                        className={`absolute inset-0 flex items-center justify-center ${fontClass} font-bold text-center px-2`}
                      >
                        {layer.text}
                      </span>
                    )}
                  </div>
                ) : editingTextId === layer.id ? (
                  <textarea
                    autoFocus
                    value={layer.text || ''}
                    onChange={(e) =>
                      setProp((p: FreeformCanvasBlockProps) => {
                        const target = (p.layers || []).find((l) => l.id === layer.id);
                        if (target) target.text = e.target.value;
                      })
                    }
                    onBlur={() => setEditingTextId(null)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: `${layer.fontSize || 14}px` }}
                    className={`w-full h-full bg-transparent resize-none focus:outline-none ${fontClass} font-bold text-${
                      layer.textAlign || 'center'
                    }`}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: `${layer.fontSize || 14}px`,
                      textAlign: layer.textAlign || 'center',
                    }}
                    className={`${fontClass} font-bold leading-tight break-words w-full pointer-events-none`}
                  >
                    {layer.text}
                  </span>
                )}
              </div>

              {/* Interactive Rotation Handle + 8-Way Resize Handles when Selected */}
              {isLayerSelected && !layer.locked && activeTool === 'select' && (
                <>
                  {/* Top Rotation Handle Stem */}
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center z-30">
                    <span
                      onPointerDown={(e) => startRotateDrag(e, layer)}
                      title="Drag to rotate layer (Hold Shift for 15° snap)"
                      className="w-4 h-4 rounded-full bg-neo-yellow border-2 border-neo-ink shadow-neo-sm cursor-grab active:cursor-grabbing flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <RotateCw className="w-2.5 h-2.5 text-neo-ink" strokeWidth={2.5} />
                    </span>
                    <div className="w-[1.5px] h-3 bg-neo-vermilion" />
                  </div>

                  {/* Live Rotation Degree Pill */}
                  {isPrimarySelected && rotatingAngleBadge !== null && (
                    <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-neo-ink text-neo-yellow font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-neo-yellow whitespace-nowrap z-40">
                      {rotatingAngleBadge}°
                    </span>
                  )}

                  {/* 4 Corner Handles (Resize W & H + Proportional Text Font Size) */}
                  <span
                    onPointerDown={(e) => startResizeDrag(e, layer, 'nw')}
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-neo-vermilion rounded-sm cursor-nwse-resize"
                    title="Resize corner"
                  />
                  <span
                    onPointerDown={(e) => startResizeDrag(e, layer, 'ne')}
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-neo-vermilion rounded-sm cursor-nesw-resize"
                    title="Resize corner"
                  />
                  <span
                    onPointerDown={(e) => startResizeDrag(e, layer, 'sw')}
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-neo-vermilion rounded-sm cursor-nesw-resize"
                    title="Resize corner"
                  />
                  <span
                    onPointerDown={(e) => startResizeDrag(e, layer, 'se')}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-neo-yellow border-2 border-neo-ink rounded-sm cursor-nwse-resize"
                    title="Resize corner (scales text & asset)"
                  />

                  {/* 4 Side Handles (N, E, S, W) */}
                  <span
                    onPointerDown={(e) => startResizeDrag(e, layer, 'n')}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-2 bg-white border border-neo-vermilion rounded-sm cursor-ns-resize"
                  />
                  <span
                    onPointerDown={(e) => startResizeDrag(e, layer, 's')}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-2 bg-white border border-neo-vermilion rounded-sm cursor-ns-resize"
                  />
                  <span
                    onPointerDown={(e) => startResizeDrag(e, layer, 'w')}
                    className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-3 bg-white border border-neo-vermilion rounded-sm cursor-ew-resize"
                  />
                  <span
                    onPointerDown={(e) => startResizeDrag(e, layer, 'e')}
                    className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2 h-3 bg-white border border-neo-vermilion rounded-sm cursor-ew-resize"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Layer(s) Inspector & Transform Controls Bar */}
      {selectedLayersList.length > 0 && activeLayer && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2 p-2.5 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm flex flex-col gap-2 text-[11px] font-mono"
        >
          {/* Row 1: Selection Info + Auto-Align + Z-Order + Flip + Actions */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-neo-ink text-neo-yellow text-[10px] font-bold mr-1">
                {selectedLayersList.length > 1
                  ? `${selectedLayersList.length} SELECTED`
                  : activeLayer.name || activeLayer.type.toUpperCase()}
              </span>

              <button
                type="button"
                onClick={() => alignSelectedLayers('left')}
                className="p-1 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded"
                title="Align Left"
              >
                <AlignStartVertical className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => alignSelectedLayers('center-x')}
                className="p-1 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded"
                title="Align Horizontal Center"
              >
                <AlignCenterVertical className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => alignSelectedLayers('right')}
                className="p-1 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded"
                title="Align Right"
              >
                <AlignEndVertical className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => alignSelectedLayers('top')}
                className="p-1 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded"
                title="Align Top"
              >
                <AlignStartHorizontal className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => alignSelectedLayers('center-y')}
                className="p-1 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded"
                title="Align Vertical Middle"
              >
                <AlignCenterHorizontal className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => alignSelectedLayers('bottom')}
                className="p-1 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded"
                title="Align Bottom"
              >
                <AlignEndHorizontal className="w-3 h-3" />
              </button>

              {selectedLayersList.length >= 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayers('distribute-x')}
                    className="px-1.5 py-0.5 bg-neo-teal/30 hover:bg-neo-teal border border-neo-ink rounded text-[10px] font-bold"
                    title="Distribute Horizontally"
                  >
                    Dist X
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayers('distribute-y')}
                    className="px-1.5 py-0.5 bg-neo-teal/30 hover:bg-neo-teal border border-neo-ink rounded text-[10px] font-bold"
                    title="Distribute Vertically"
                  >
                    Dist Y
                  </button>
                </>
              )}
            </div>

            {/* Rotate 90, Flip, Z-Order, Duplicate & Delete */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setProp((p: FreeformCanvasBlockProps) => {
                    (p.layers || []).forEach((l) => {
                      if (selectedIds.includes(l.id) && !l.locked) {
                        l.rotation = ((l.rotation || 0) - 45 + 180) % 360 - 180;
                      }
                    });
                  })
                }
                className="p-1 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded"
                title="Rotate -45°"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setProp((p: FreeformCanvasBlockProps) => {
                    (p.layers || []).forEach((l) => {
                      if (selectedIds.includes(l.id) && !l.locked) {
                        l.rotation = ((l.rotation || 0) + 45 + 180) % 360 - 180;
                      }
                    });
                  })
                }
                className="p-1 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded"
                title="Rotate +45°"
              >
                <RotateCw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setProp((p: FreeformCanvasBlockProps) => {
                    (p.layers || []).forEach((l) => {
                      if (selectedIds.includes(l.id) && !l.locked) {
                        l.flipX = !l.flipX;
                      }
                    });
                  })
                }
                className={`p-1 border border-neo-ink rounded ${
                  activeLayer.flipX ? 'bg-neo-yellow' : 'bg-neo-bg'
                }`}
                title="Flip Horizontally"
              >
                <FlipHorizontal className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setProp((p: FreeformCanvasBlockProps) => {
                    (p.layers || []).forEach((l) => {
                      if (selectedIds.includes(l.id) && !l.locked) {
                        l.flipY = !l.flipY;
                      }
                    });
                  })
                }
                className={`p-1 border border-neo-ink rounded ${
                  activeLayer.flipY ? 'bg-neo-yellow' : 'bg-neo-bg'
                }`}
                title="Flip Vertically"
              >
                <FlipVertical className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => reorderLayerZ(activeLayer.id, 'front')}
                className="p-1 bg-neo-bg hover:bg-neo-teal border border-neo-ink rounded"
                title="Bring to Front"
              >
                <ChevronsUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => reorderLayerZ(activeLayer.id, 'forward')}
                className="p-1 bg-neo-bg hover:bg-neo-teal border border-neo-ink rounded"
                title="Bring Forward"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => reorderLayerZ(activeLayer.id, 'backward')}
                className="p-1 bg-neo-bg hover:bg-neo-teal border border-neo-ink rounded"
                title="Send Backward"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => reorderLayerZ(activeLayer.id, 'back')}
                className="p-1 bg-neo-bg hover:bg-neo-teal border border-neo-ink rounded"
                title="Send to Back"
              >
                <ChevronsDown className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={duplicateSelectedLayers}
                className="p-1 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded"
                title="Duplicate Selected Layer(s)"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={deleteSelectedLayers}
                className="p-1 bg-neo-vermilion text-white border border-neo-ink rounded"
                title="Delete Selected Layer(s)"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Row 2: Text / Vector Asset / Resize / Rotate / Color Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {(activeLayer.type === 'text' || activeLayer.type === 'shape') && (
              <>
                <input
                  type="text"
                  value={activeLayer.text || ''}
                  onChange={(e) =>
                    setProp((p: FreeformCanvasBlockProps) => {
                      const target = (p.layers || []).find((l) => l.id === activeLayer.id);
                      if (target) target.text = e.target.value;
                    })
                  }
                  placeholder="Layer text..."
                  className="flex-1 min-w-[110px] px-2 py-1 bg-neo-bg border border-neo-ink rounded text-xs"
                />
                <label className="flex items-center gap-1" title="Text Font Size (px)">
                  <span>Font</span>
                  <input
                    type="number"
                    min={8}
                    max={96}
                    value={activeLayer.fontSize || 14}
                    onChange={(e) =>
                      setProp((p: FreeformCanvasBlockProps) => {
                        (p.layers || []).forEach((l) => {
                          if (selectedIds.includes(l.id)) {
                            l.fontSize = Number(e.target.value);
                          }
                        });
                      })
                    }
                    className="w-12 px-1 py-0.5 bg-neo-bg border border-neo-ink rounded text-center"
                  />
                </label>
                <input
                  type="color"
                  value={activeLayer.color || '#141414'}
                  onChange={(e) =>
                    setProp((p: FreeformCanvasBlockProps) => {
                      (p.layers || []).forEach((l) => {
                        if (selectedIds.includes(l.id)) {
                          l.color = e.target.value;
                        }
                      });
                    })
                  }
                  title="Text color"
                  className="w-6 h-6 rounded border border-neo-ink cursor-pointer"
                />
              </>
            )}

            {activeLayer.type === 'image' && (
              <>
                <input
                  type="url"
                  value={activeLayer.imageSrc || ''}
                  onChange={(e) =>
                    setProp((p: FreeformCanvasBlockProps) => {
                      const target = (p.layers || []).find((l) => l.id === activeLayer.id);
                      if (target) target.imageSrc = e.target.value;
                    })
                  }
                  placeholder="Asset / SVG URL..."
                  className="flex-1 min-w-[120px] px-2 py-1 bg-neo-bg border border-neo-ink rounded text-xs"
                />
                {activeLayer.iconifyId && (
                  <label className="flex items-center gap-1" title="Recolor Vector Asset">
                    <span>Vector Tint</span>
                    <input
                      type="color"
                      value={activeLayer.color || '#141414'}
                      onChange={(e) => updateVectorAssetColor(activeLayer.id, e.target.value)}
                      className="w-6 h-6 rounded border border-neo-ink cursor-pointer"
                    />
                  </label>
                )}
              </>
            )}

            <label className="flex items-center gap-1" title="Width %">
              <span>W%</span>
              <input
                type="number"
                min={4}
                max={100}
                value={activeLayer.width}
                onChange={(e) =>
                  setProp((p: FreeformCanvasBlockProps) => {
                    const target = (p.layers || []).find((l) => l.id === activeLayer.id);
                    if (target) target.width = Number(e.target.value);
                  })
                }
                className="w-11 px-1 py-0.5 bg-neo-bg border border-neo-ink rounded text-center"
              />
            </label>

            <label className="flex items-center gap-1" title="Height %">
              <span>H%</span>
              <input
                type="number"
                min={4}
                max={100}
                value={activeLayer.height}
                onChange={(e) =>
                  setProp((p: FreeformCanvasBlockProps) => {
                    const target = (p.layers || []).find((l) => l.id === activeLayer.id);
                    if (target) target.height = Number(e.target.value);
                  })
                }
                className="w-11 px-1 py-0.5 bg-neo-bg border border-neo-ink rounded text-center"
              />
            </label>

            <label className="flex items-center gap-1" title="Rotation degrees (-180° to 180°)">
              <RotateCw className="w-3 h-3" />
              <input
                type="number"
                min={-180}
                max={180}
                value={activeLayer.rotation || 0}
                onChange={(e) =>
                  setProp((p: FreeformCanvasBlockProps) => {
                    (p.layers || []).forEach((l) => {
                      if (selectedIds.includes(l.id)) {
                        l.rotation = Number(e.target.value);
                      }
                    });
                  })
                }
                className="w-12 px-1 py-0.5 bg-neo-bg border border-neo-ink rounded text-center"
              />
            </label>

            <label className="flex items-center gap-1" title="Layer Fill / Backdrop">
              <span>Fill</span>
              <input
                type="color"
                value={
                  activeLayer.fill && activeLayer.fill !== 'transparent'
                    ? activeLayer.fill
                    : '#FFD23F'
                }
                onChange={(e) =>
                  setProp((p: FreeformCanvasBlockProps) => {
                    (p.layers || []).forEach((l) => {
                      if (selectedIds.includes(l.id)) {
                        l.fill = e.target.value;
                      }
                    });
                  })
                }
                className="w-6 h-6 rounded border border-neo-ink cursor-pointer"
              />
              <button
                type="button"
                onClick={() =>
                  setProp((p: FreeformCanvasBlockProps) => {
                    (p.layers || []).forEach((l) => {
                      if (selectedIds.includes(l.id)) {
                        l.fill = 'transparent';
                      }
                    });
                  })
                }
                className="px-1.5 py-0.5 bg-neo-bg hover:bg-white border border-neo-ink rounded text-[10px]"
                title="Clear layer background fill to transparent"
              >
                Clear
              </button>
            </label>
          </div>
        </div>
      )}

      {caption && (
        <figcaption className="mt-2 text-center font-mono text-xs text-gray-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

export const FreeformCanvasSettings: React.FC = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({
    props: node.data.props as FreeformCanvasBlockProps,
  }));

  const addAttribution = useEditorStore((s) => s.addAssetAttribution);
  const layers = props.layers || [];
  const bgType = props.backgroundType || 'solid';

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      {/* Graphite Editor Inspiration Credit Card */}
      <div className="p-3 bg-neo-yellow/25 border-neo border-neo-ink rounded-lg flex flex-col gap-1.5">
        <div className="font-heading font-bold text-neo-ink uppercase tracking-wider text-[11px] flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-neo-vermilion" />
            2D Vector &amp; Artboard Studio
          </span>
          <a
            href="https://github.com/GraphiteEditor/Graphite"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-neo-vermilion underline flex items-center gap-0.5"
          >
            <span>Graphite</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        <p className="text-[11px] text-gray-700 leading-normal">
          Supports multi-selection (Shift+Click or drag marquee), on-canvas rotation &amp; 8-point resize handles, transparent backgrounds, and editable asset packs.
        </p>
        <button
          type="button"
          onClick={() =>
            addAttribution({
              title: 'Graphite 2D Vector & Procedural Graphics Engine (Design Inspiration)',
              creator: 'Graphite Editor Contributors (Keavon Chambers et al.)',
              creatorUrl: 'https://graphite.rs/',
              sourceName: 'GitHub • GraphiteEditor/Graphite',
              sourceUrl: 'https://github.com/GraphiteEditor/Graphite',
              license: 'Apache-2.0',
              licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
            })
          }
          className="mt-1 py-1 px-2 bg-neo-ink text-white hover:bg-neo-vermilion rounded font-mono text-[10px] font-bold transition-colors"
        >
          + Credit Graphite Editor in Book Colophon
        </button>
      </div>

      {/* Aspect Ratio (Extends/crops canvas space without stretching existing layers!) */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Artboard Aspect Ratio
        </label>
        <div className="grid grid-cols-4 gap-1">
          {(['16/9', '4/3', '1/1', '4/5'] as const).map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() =>
                setProp((p: FreeformCanvasBlockProps) => {
                  const oldRatio = p.aspectRatio || '16/9';
                  if (oldRatio === ratio) return;
                  const oldH = getArtboardHeightRatio(oldRatio);
                  const newH = getArtboardHeightRatio(ratio);
                  const scaleY = oldH / newH;
                  (p.layers || []).forEach((layer) => {
                    layer.y = Number(
                      Math.max(0, Math.min(95, layer.y * scaleY)).toFixed(2)
                    );
                    layer.height = Number(
                      Math.max(2, Math.min(100, layer.height * scaleY)).toFixed(2)
                    );
                  });
                  p.aspectRatio = ratio;
                })
              }
              className={`py-1.5 text-center font-mono border-neo border-neo-ink rounded ${
                props.aspectRatio === ratio
                  ? 'bg-neo-yellow font-bold shadow-neo-sm'
                  : 'bg-white'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* Artboard Background Mode & Settings */}
      <div className="flex flex-col gap-2">
        <label className="font-heading font-semibold block text-neo-ink uppercase tracking-wider text-[11px]">
          Background Mode
        </label>
        <div className="grid grid-cols-5 gap-1">
          {(['transparent', 'solid', 'gradient', 'pattern', 'image'] as ArtboardBgType[]).map(
            (mode) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  setProp((p: FreeformCanvasBlockProps) => {
                    p.backgroundType = mode;
                  })
                }
                className={`py-1 px-1 text-center font-mono text-[10px] uppercase border border-neo-ink rounded ${
                  bgType === mode ? 'bg-neo-yellow font-bold shadow-neo-sm' : 'bg-white'
                }`}
              >
                {mode === 'transparent' ? 'Clear' : mode}
              </button>
            )
          )}
        </div>

        {(bgType === 'solid' || bgType === 'pattern') && (
          <div className="flex items-center gap-2 pt-1">
            {['#F4F1EA', '#FFFFFF', '#FFF9DB', '#E6FBF5', '#F5EDFD', '#141414'].map(
              (bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() =>
                    setProp((p: FreeformCanvasBlockProps) => (p.backgroundColor = bg))
                  }
                  style={{ backgroundColor: bg }}
                  className={`w-6 h-6 rounded-full border-2 border-neo-ink ${
                    props.backgroundColor === bg ? 'ring-2 ring-neo-vermilion' : ''
                  }`}
                />
              )
            )}
            <input
              type="color"
              value={props.backgroundColor || '#F4F1EA'}
              onChange={(e) =>
                setProp((p: FreeformCanvasBlockProps) => (p.backgroundColor = e.target.value))
              }
              className="w-7 h-7 rounded border border-neo-ink cursor-pointer"
            />
          </div>
        )}

        {bgType === 'gradient' && (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {GRADIENT_PRESETS.map((g) => (
              <button
                key={g.label}
                type="button"
                onClick={() =>
                  setProp((p: FreeformCanvasBlockProps) => (p.backgroundGradient = g.value))
                }
                style={{ backgroundImage: g.value }}
                className={`py-1.5 px-2 rounded border border-neo-ink font-mono text-[10px] font-bold ${
                  g.label === 'Noir Spotlight' ? 'text-white' : 'text-neo-ink'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Layer Stack Tree (Graphite-style Layer Outliner) */}
      <div>
        <label className="font-heading font-semibold block mb-1.5 text-neo-ink uppercase tracking-wider text-[11px] flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-neo-vermilion" />
          <span>Artboard Layer Stack ({layers.length})</span>
        </label>
        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto bg-white border-neo border-neo-ink rounded-lg p-2">
          {[...layers].reverse().map((layer) => (
            <div
              key={layer.id}
              className="flex items-center justify-between gap-1.5 px-2 py-1 bg-neo-bg/60 border border-neo-ink/30 rounded text-[11px] font-mono"
            >
              <span className="truncate font-bold text-neo-ink">
                {layer.name || layer.text || layer.type.toUpperCase()}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setProp((p: FreeformCanvasBlockProps) => {
                      const target = (p.layers || []).find((l) => l.id === layer.id);
                      if (target) target.hidden = !target.hidden;
                    })
                  }
                  className="p-0.5 hover:text-neo-vermilion"
                  title={layer.hidden ? 'Show layer' : 'Hide layer'}
                >
                  {layer.hidden ? (
                    <EyeOff className="w-3 h-3 text-gray-400" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setProp((p: FreeformCanvasBlockProps) => {
                      const target = (p.layers || []).find((l) => l.id === layer.id);
                      if (target) target.locked = !target.locked;
                    })
                  }
                  className="p-0.5 hover:text-neo-vermilion"
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                >
                  {layer.locked ? (
                    <Lock className="w-3 h-3 text-neo-vermilion" />
                  ) : (
                    <Unlock className="w-3 h-3 text-gray-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setProp((p: FreeformCanvasBlockProps) => {
                      p.layers = (p.layers || []).filter((l) => l.id !== layer.id);
                    })
                  }
                  className="p-0.5 hover:text-red-600"
                  title="Delete layer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Caption */}
      <div>
        <label className="font-heading font-semibold block mb-1 text-neo-ink uppercase tracking-wider text-[11px]">
          Artboard Caption
        </label>
        <input
          type="text"
          value={props.caption || ''}
          onChange={(e) =>
            setProp((p: FreeformCanvasBlockProps) => (p.caption = e.target.value))
          }
          className="w-full px-2.5 py-1.5 bg-white border-neo border-neo-ink rounded font-mono text-xs"
        />
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 cursor-pointer border-neo border-neo-ink p-2 rounded bg-neo-bg/50">
          <input
            type="checkbox"
            checked={props.scaleTextOnResize !== false}
            onChange={(e) =>
              setProp(
                (p: FreeformCanvasBlockProps) =>
                  (p.scaleTextOnResize = e.target.checked)
              )
            }
            className="w-4 h-4 accent-neo-ink rounded"
          />
          <span className="font-heading font-semibold text-neo-ink">
            Scale Text Font Size When Resizing Box
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer border-neo border-neo-ink p-2 rounded bg-neo-bg/50">
          <input
            type="checkbox"
            checked={props.snapToGuides !== false}
            onChange={(e) =>
              setProp(
                (p: FreeformCanvasBlockProps) => (p.snapToGuides = e.target.checked)
              )
            }
            className="w-4 h-4 accent-neo-ink rounded"
          />
          <span className="font-heading font-semibold text-neo-ink flex items-center gap-1">
            <Magnet className="w-3.5 h-3.5 text-neo-vermilion" />
            Smart Magnetic Alignment Guides
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer border-neo border-neo-ink p-2 rounded bg-neo-bg/50">
          <input
            type="checkbox"
            checked={!!props.showGrid}
            onChange={(e) =>
              setProp((p: FreeformCanvasBlockProps) => (p.showGrid = e.target.checked))
            }
            className="w-4 h-4 accent-neo-ink rounded"
          />
          <span className="font-heading font-semibold text-neo-ink">
            Show Designer Dot Grid
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer border-neo border-neo-ink p-2 rounded bg-neo-bg/50">
          <input
            type="checkbox"
            checked={!!props.keepTogetherOnPageTurn}
            onChange={(e) =>
              setProp(
                (p: FreeformCanvasBlockProps) =>
                  (p.keepTogetherOnPageTurn = e.target.checked)
              )
            }
            className="w-4 h-4 accent-neo-ink rounded"
          />
          <span className="font-heading font-semibold text-neo-ink flex items-center gap-1">
            <Bookmark className="w-3.5 h-3.5 text-neo-teal" />
            Keep Artboard on Single Page Turn
          </span>
        </label>
      </div>
    </div>
  );
};

FreeformCanvasBlock.craft = {
  displayName: 'Freeform Visual Canvas',
  props: {
    aspectRatio: '16/9',
    backgroundType: 'solid',
    backgroundColor: '#F4F1EA',
    backgroundGradient: GRADIENT_PRESETS[0].value,
    backgroundPattern: 'dots',
    backgroundImage: '',
    backgroundOpacity: 100,
    showGrid: true,
    snapToGuides: true,
    scaleTextOnResize: true,
    caption: 'Fig. — Vector & visual artboard (inspired by Graphite Editor)',
    layers: DEFAULT_LAYERS,
    keepTogetherOnPageTurn: true,
  },
  related: {
    toolbar: FreeformCanvasSettings,
  },
};
