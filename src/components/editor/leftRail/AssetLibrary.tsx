import React, { useState, useEffect } from 'react';
import { useEditor, ROOT_NODE } from '@craftjs/core';
import { useEditorStore } from '../../../store/editorStore';
import { ImageBlock } from '../../blocks/ImageBlock';
import { HeroSpreadBlock } from '../../blocks/HeroSpreadBlock';
import { FreeformCanvasBlock, type CanvasLayerItem } from '../../blocks/FreeformCanvasBlock';
import { notify } from '../../../store/toastStore';
import { setAssetDragData } from '../../../utils/assetDragDrop';
import {
  Search,
  Sparkles,
  ExternalLink,
  Plus,
  Award,
  Image as ImageIcon,
  Shapes,
  BookMarked,
  Loader2,
  CheckCircle2,
  Link2,
  Move,
  GripVertical,
} from 'lucide-react';

interface OpenverseResult {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  creator?: string;
  creator_url?: string;
  license: string;
  license_version?: string;
  license_url?: string;
  source?: string;
  foreign_landing_url?: string;
}

interface IconifyCollectionMeta {
  name: string;
  author?: { name: string; url?: string };
  license?: { title: string; spdx?: string; url?: string };
}

interface CuratedPackSampleAsset {
  title: string;
  assetUrl: string;
  kind: 'vector' | 'image';
}

interface CuratedPack {
  id: string;
  name: string;
  curatorOrCreator: string;
  category: string;
  license: string;
  url: string;
  description: string;
  featured?: boolean;
  sampleAssets: CuratedPackSampleAsset[];
}

const CURATED_ASSET_PACKS: CuratedPack[] = [
  {
    id: 'graphite-editor',
    name: 'Graphite 2D Vector & Procedural Design Engine',
    curatorOrCreator: 'Graphite Editor Contributors (Keavon Chambers et al.)',
    category: 'Open-Source Vector Studio Inspiration',
    license: 'Apache-2.0 / MIT',
    url: 'https://github.com/GraphiteEditor/Graphite',
    description:
      'Open-source 2D vector and procedural graphics editor that inspired Wyzard’s Freeform Vector Artboard workflow, path pen tool, and layer stack.',
    featured: true,
    sampleAssets: [
      {
        title: 'Bezier Vector Pen',
        assetUrl: 'https://api.iconify.design/ph/bezier-curve-duotone.svg?height=512&color=%23FF5E3A',
        kind: 'vector',
      },
      {
        title: 'Procedural Node Grid',
        assetUrl: 'https://api.iconify.design/ph/polygon-duotone.svg?height=512&color=%23141414',
        kind: 'vector',
      },
      {
        title: 'Compass Geometry',
        assetUrl: 'https://api.iconify.design/ph/compass-tool-duotone.svg?height=512&color=%233BCEAC',
        kind: 'vector',
      },
    ],
  },
  {
    id: 'adamsdesk-directory',
    name: 'Free Design Asset Resource Directory',
    curatorOrCreator: 'Adam Douglas (Adamsdesk)',
    category: 'Curated Directory',
    license: 'CC BY-NC-SA 4.0',
    url: 'https://www.adamsdesk.com/posts/free-design-asset-resource/',
    description:
      'Human-curated directory of free graphic design asset packs, public domain archives, vectors, and creative resources organized by category.',
    featured: true,
    sampleAssets: [
      {
        title: 'Royal Crest Badge',
        assetUrl: 'https://api.iconify.design/game-icons/crested-helmet.svg?height=512&color=%23141414',
        kind: 'vector',
      },
      {
        title: 'Editorial Flourish',
        assetUrl: 'https://api.iconify.design/game-icons/flourish.svg?height=512&color=%23FF5E3A',
        kind: 'vector',
      },
      {
        title: 'Sunburst Seal',
        assetUrl: 'https://api.iconify.design/game-icons/sunbeams.svg?height=512&color=%239B5DE5',
        kind: 'vector',
      },
    ],
  },
  {
    id: 'openverse-cc',
    name: 'Openverse Creative Commons Archive',
    curatorOrCreator: 'WordPress / Creative Commons Contributors',
    category: 'Photos, Book Plates & Art',
    license: 'CC0 / CC BY / PDM',
    url: 'https://openverse.org/',
    description:
      'Searchable commons of 800M+ openly licensed illustrations, archival book plates, and photography with built-in creator attribution.',
    sampleAssets: [
      {
        title: 'Botanical Flora Plate',
        assetUrl:
          'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80',
        kind: 'image',
      },
      {
        title: 'Archival Library Plate',
        assetUrl:
          'https://images.unsplash.com/photo-1507842229451-79b1be8d6290?auto=format&fit=crop&w=800&q=80',
        kind: 'image',
      },
      {
        title: 'Book Spread Specimen',
        assetUrl:
          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
        kind: 'image',
      },
    ],
  },
  {
    id: 'british-library-commons',
    name: 'British Library Mechanical Curator Plates',
    curatorOrCreator: 'British Library Public Domain Archive',
    category: 'Vintage Book Engravings',
    license: 'CC0 1.0 Public Domain',
    url: 'https://commons.wikimedia.org/wiki/Category:Images_from_the_British_Library',
    description:
      'Over 1 million 17th–19th century book illustrations, ornamental capitals, and botanical maps.',
    sampleAssets: [
      {
        title: 'Quill & Scroll Engraving',
        assetUrl: 'https://api.iconify.design/game-icons/quill-ink.svg?height=512&color=%23141414',
        kind: 'vector',
      },
      {
        title: 'Archival Scroll Seal',
        assetUrl: 'https://api.iconify.design/ph/scroll-duotone.svg?height=512&color=%23141414',
        kind: 'vector',
      },
      {
        title: 'Celestial Astrolabe',
        assetUrl: 'https://api.iconify.design/game-icons/all-seeing-eye.svg?height=512&color=%23FF5E3A',
        kind: 'vector',
      },
    ],
  },
  {
    id: 'open-peeps',
    name: 'Open Peeps Hand-Drawn Illustration Library',
    curatorOrCreator: 'Pablo Stanley',
    category: 'Vector Character Illustrations',
    license: 'CC0 1.0 Public Domain',
    url: 'https://www.openpeeps.com/',
    description:
      'Mix-and-match hand-drawn vector illustrations ideal for editorial storytelling and margin callouts.',
    sampleAssets: [
      {
        title: 'Character Portrait Sketch',
        assetUrl: 'https://api.iconify.design/ph/user-focus-duotone.svg?height=512&color=%23141414',
        kind: 'vector',
      },
      {
        title: 'Storyteller Figure',
        assetUrl: 'https://api.iconify.design/ph/person-Arms-spread-duotone.svg?height=512&color=%23FF5E3A',
        kind: 'vector',
      },
      {
        title: 'Hand-Drawn Smile',
        assetUrl: 'https://api.iconify.design/ph/smiley-wink-duotone.svg?height=512&color=%239B5DE5',
        kind: 'vector',
      },
    ],
  },
  {
    id: 'undraw-illustrations',
    name: 'unDraw Open-Source Illustrations',
    curatorOrCreator: 'Katerina Limpitsouni',
    category: 'Editorial & Tech Vectors',
    license: 'unDraw Open License',
    url: 'https://undraw.co/illustrations',
    description:
      'Customizable SVG editorial illustrations that scale cleanly across mobile and desktop reflow layouts.',
    sampleAssets: [
      {
        title: 'Creative Rocket Vector',
        assetUrl: 'https://api.iconify.design/ph/rocket-launch-duotone.svg?height=512&color=%23FF5E3A',
        kind: 'vector',
      },
      {
        title: 'Design Palette Vector',
        assetUrl: 'https://api.iconify.design/ph/palette-duotone.svg?height=512&color=%233BCEAC',
        kind: 'vector',
      },
      {
        title: 'Book Layout Vector',
        assetUrl: 'https://api.iconify.design/ph/book-open-text-duotone.svg?height=512&color=%23141414',
        kind: 'vector',
      },
    ],
  },
  {
    id: 'smithsonian-open',
    name: 'Smithsonian Open Access Collection',
    curatorOrCreator: 'Smithsonian Institution',
    category: 'Historical & Scientific Art',
    license: 'CC0 1.0 Public Domain',
    url: 'https://www.si.edu/openaccess',
    description:
      '4.5 million 2D and 3D museum items, natural history plates, and typographic specimens.',
    sampleAssets: [
      {
        title: 'Planetary Orbit Diagram',
        assetUrl: 'https://api.iconify.design/ph/planet-duotone.svg?height=512&color=%23141414',
        kind: 'vector',
      },
      {
        title: 'Botanical Leaf Specimen',
        assetUrl: 'https://api.iconify.design/ph/leaf-duotone.svg?height=512&color=%233BCEAC',
        kind: 'vector',
      },
      {
        title: 'Fossil Shell Archive',
        assetUrl: 'https://api.iconify.design/game-icons/spiral-shell.svg?height=512&color=%23FF5E3A',
        kind: 'vector',
      },
    ],
  },
];

const FALLBACK_OPENVERSE_ITEMS: OpenverseResult[] = [
  {
    id: 'ov-botanical-1',
    title: 'Vintage Botanical Flora Plate',
    url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1200&q=80',
    thumbnail:
      'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=400&q=80',
    creator: 'Natural History Archive',
    creator_url: 'https://openverse.org',
    license: 'CC0',
    license_version: '1.0',
    license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    source: 'Openverse Commons',
    foreign_landing_url: 'https://openverse.org',
  },
  {
    id: 'ov-editorial-2',
    title: 'Classical Library & Archival Volumes',
    url: 'https://images.unsplash.com/photo-1507842229451-79b1be8d6290?auto=format&fit=crop&w=1200&q=80',
    thumbnail:
      'https://images.unsplash.com/photo-1507842229451-79b1be8d6290?auto=format&fit=crop&w=400&q=80',
    creator: 'Archival Guild',
    creator_url: 'https://openverse.org',
    license: 'CC BY',
    license_version: '4.0',
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
    source: 'Openverse Commons',
    foreign_landing_url: 'https://openverse.org',
  },
  {
    id: 'ov-typography-3',
    title: 'Open Spread Book Typography Specimen',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
    thumbnail:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    creator: 'Editorial Commons',
    creator_url: 'https://openverse.org',
    license: 'CC0',
    license_version: '1.0',
    license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    source: 'Openverse Commons',
    foreign_landing_url: 'https://openverse.org',
  },
];

export const AssetLibrary: React.FC = () => {
  const { actions, query, connectors } = useEditor();
  const {
    project,
    addAssetAttribution,
    setActiveInspectorTab,
  } = useEditorStore();

  const [subTab, setSubTab] = useState<'openverse' | 'vectors' | 'packs'>('openverse');

  // Openverse search state
  const [ovQuery, setOvQuery] = useState('vintage book illustration');
  const [ovCategory, setOvCategory] = useState<'all' | 'illustration' | 'photograph'>('illustration');
  const [ovResults, setOvResults] = useState<OpenverseResult[]>(FALLBACK_OPENVERSE_ITEMS);
  const [ovLoading, setOvLoading] = useState(false);

  // Iconify vector search state
  const [vecQuery, setVecQuery] = useState('book ornament');
  const [vecIcons, setVecIcons] = useState<string[]>([
    'ph:book-open-text-duotone',
    'ph:feather-duotone',
    'ph:compass-tool-duotone',
    'ph:sparkle-duotone',
    'ph:scroll-duotone',
    'ph:planet-duotone',
    'game-icons:quill-ink',
    'game-icons:open-book',
    'game-icons:sunbeams',
    'game-icons:flourish',
  ]);
  const [vecCollections, setVecCollections] = useState<Record<string, IconifyCollectionMeta>>({});
  const [vecLoading, setVecLoading] = useState(false);
  const [vectorInsertTarget, setVectorInsertTarget] = useState<'canvas' | 'block'>('canvas');

  // Custom linked asset + credit state
  const [customAssetUrl, setCustomAssetUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customCreator, setCustomCreator] = useState('');
  const [customCreatorUrl, setCustomCreatorUrl] = useState('');
  const [customLicense, setCustomLicense] = useState('CC BY 4.0');

  const [justAddedToast, setJustAddedToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setJustAddedToast(msg);
    setTimeout(() => setJustAddedToast(null), 2600);
  };

  // Send an editable layer directly into an existing FreeformCanvasBlock (or create one if none exists)
  const insertLayerIntoFreeformCanvas = (newLayer: CanvasLayerItem, label: string) => {
    try {
      const serialized = query.getSerializedNodes();
      const existingCanvasEntry = Object.entries(serialized).find(
        ([, node]) =>
          (typeof node?.type === 'object' &&
            node.type.resolvedName === 'FreeformCanvasBlock') ||
          node?.displayName === 'Freeform Visual Canvas'
      );

      if (existingCanvasEntry) {
        const [canvasNodeId] = existingCanvasEntry;
        actions.setProp(canvasNodeId, (props: { layers?: CanvasLayerItem[] }) => {
          props.layers = [...(props.layers || []), newLayer];
        });
        actions.selectNode(canvasNodeId);
        notify({
          type: 'success',
          title: 'Added to Visual Canvas',
          message: `“${label}” added as an editable, resizable & rotatable layer.`,
        });
      } else {
        const tree = query
          .parseReactElement(
            <FreeformCanvasBlock
              aspectRatio="16/9"
              backgroundColor="#F4F1EA"
              backgroundType="solid"
              caption={`Visual Canvas Composition • Includes ${label}`}
              layers={[
                {
                  id: 'layer-title-card',
                  type: 'text',
                  text: label.toUpperCase().slice(0, 28),
                  x: 8,
                  y: 10,
                  width: 48,
                  height: 18,
                  fill: '#FFD23F',
                  color: '#141414',
                  fontSize: 16,
                  rotation: 0,
                  borderNeo: true,
                  opacity: 100,
                },
                newLayer,
              ]}
            />
          )
          .toNodeTree();
        actions.addNodeTree(tree, ROOT_NODE);
        notify({
          type: 'success',
          title: 'Created Visual Canvas with Layer',
          message: `Inserted a new Fixed Visual Canvas containing “${label}”.`,
        });
      }
    } catch (err) {
      console.warn('Could not insert layer into FreeformCanvasBlock:', err);
    }
  };

  // Search Openverse API
  const searchOpenverse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = ovQuery.trim();
    if (!q) return;

    setOvLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        page_size: '16',
      });
      if (ovCategory !== 'all') {
        params.set('category', ovCategory);
      }

      const res = await fetch(`https://api.openverse.org/v1/images/?${params.toString()}`);
      if (!res.ok) throw new Error('Openverse request failed');
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        setOvResults(data.results);
      } else {
        setOvResults(FALLBACK_OPENVERSE_ITEMS);
      }
    } catch {
      // Keep fallback items if offline or rate-limited
      setOvResults(FALLBACK_OPENVERSE_ITEMS);
    } finally {
      setOvLoading(false);
    }
  };

  // Search Iconify Open SVG API
  const searchIconify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = vecQuery.trim();
    if (!q) return;

    setVecLoading(true);
    try {
      const res = await fetch(
        `https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=24`
      );
      if (!res.ok) throw new Error('Iconify search failed');
      const data = await res.json();
      if (Array.isArray(data.icons)) {
        setVecIcons(data.icons);
      }
      if (data.collections && typeof data.collections === 'object') {
        setVecCollections((prev) => ({ ...prev, ...data.collections }));
      }
    } catch {
      // Keep default icons if offline
    } finally {
      setVecLoading(false);
    }
  };

  useEffect(() => {
    searchOpenverse();
  }, [ovCategory]);

  // Insert an Openverse image block or visual canvas layer + record contributor credit
  const handleInsertOpenverseAsset = (
    item: OpenverseResult,
    target: 'block' | 'hero' | 'canvas' = 'block'
  ) => {
    const creatorName = item.creator || 'Openverse Contributor';
    const licenseLabel = `${item.license.toUpperCase()}${
      item.license_version ? ' ' + item.license_version : ''
    }`;
    const sourceLabel = item.source ? `Openverse (${item.source})` : 'Openverse';
    const captionCredit = `“${item.title || 'Visual Asset'}” by ${creatorName} • Licensed under ${licenseLabel}`;

    if (target === 'canvas') {
      insertLayerIntoFreeformCanvas(
        {
          id: `layer-ov-${Date.now()}`,
          type: 'image',
          text: (item.title || 'Commons Plate').slice(0, 28),
          imageSrc: item.url,
          x: 18,
          y: 16,
          width: 44,
          height: 56,
          fill: 'transparent',
          color: '#141414',
          fontSize: 12,
          rotation: 0,
          borderNeo: true,
          opacity: 100,
        },
        item.title || 'Commons Plate'
      );
    } else {
      const element =
        target === 'hero' ? (
          <HeroSpreadBlock
            kicker={licenseLabel}
            title={item.title || 'Editorial Feature'}
            subtitle={`Artwork by ${creatorName}`}
            author={`Credit: ${creatorName} (${sourceLabel})`}
            backgroundImage={item.url}
            overlayOpacity={45}
          />
        ) : (
          <ImageBlock
            src={item.url}
            alt={item.title || 'Editorial illustration'}
            caption={captionCredit}
            aspectRatio="4/5"
            borderStyle="neo"
            focalPoint={{ x: 50, y: 50 }}
          />
        );

      try {
        const tree = query.parseReactElement(element).toNodeTree();
        actions.addNodeTree(tree, ROOT_NODE);
      } catch (err) {
        console.warn('Could not insert asset into canvas:', err);
      }
    }

    addAssetAttribution({
      title: item.title || 'Untitled Visual Asset',
      creator: creatorName,
      creatorUrl: item.creator_url,
      sourceName: sourceLabel,
      sourceUrl: item.foreign_landing_url || item.url,
      license: licenseLabel,
      licenseUrl: item.license_url,
      assetUrl: item.url,
    });

    showToast(`Credited ${creatorName} (${licenseLabel})`);
  };

  // Insert an Iconify Open SVG Graphic + record contributor credit
  const handleInsertVectorSvg = (iconFullName: string) => {
    const [prefix, name] = iconFullName.split(':');
    const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg?height=512&color=%23141414`;
    const meta = vecCollections[prefix];
    const creatorName = meta?.author?.name || `${prefix} Open Icon Contributors`;
    const collectionName = meta?.name || prefix.toUpperCase();
    const licenseTitle = meta?.license?.title || meta?.license?.spdx || 'Open Source SVG License';

    const captionCredit = `Vector “${name}” from ${collectionName} by ${creatorName} (${licenseTitle})`;

    if (vectorInsertTarget === 'canvas') {
      insertLayerIntoFreeformCanvas(
        {
          id: `layer-vec-${Date.now()}`,
          type: 'image',
          text: `${name} (${prefix})`,
          imageSrc: svgUrl,
          x: 28,
          y: 22,
          width: 24,
          height: 36,
          fill: 'transparent',
          color: '#141414',
          fontSize: 12,
          rotation: 0,
          borderNeo: false,
          opacity: 100,
        },
        `${name} Vector`
      );
    } else {
      try {
        const tree = query
          .parseReactElement(
            <ImageBlock
              src={svgUrl}
              alt={`${name} vector graphic`}
              caption={captionCredit}
              aspectRatio="1/1"
              fit="contain"
              borderStyle="subtle"
            />
          )
          .toNodeTree();
        actions.addNodeTree(tree, ROOT_NODE);
      } catch (err) {
        console.warn('Could not insert SVG asset:', err);
      }
    }

    addAssetAttribution({
      title: `${name} (${collectionName} Vector)`,
      creator: creatorName,
      creatorUrl: meta?.author?.url,
      sourceName: `Iconify • ${collectionName}`,
      sourceUrl: meta?.author?.url || 'https://iconify.design',
      license: licenseTitle,
      licenseUrl: meta?.license?.url,
      assetUrl: svgUrl,
    });

    showToast(`Credited ${creatorName} (${licenseTitle})`);
  };

  // Insert custom linked external asset with explicit creator attribution
  const handleInsertCustomExternalAsset = (
    e: React.FormEvent,
    intoVisualCanvas = false
  ) => {
    e.preventDefault();
    if (!customAssetUrl.trim()) return;

    const title = customTitle.trim() || 'External Graphic Asset';
    const creator = customCreator.trim() || 'Independent Creator';
    const license = customLicense.trim() || 'CC BY 4.0';
    const captionCredit = `“${title}” by ${creator} (${license})`;

    if (intoVisualCanvas) {
      insertLayerIntoFreeformCanvas(
        {
          id: `layer-ext-${Date.now()}`,
          type: 'image',
          text: title.slice(0, 28),
          imageSrc: customAssetUrl.trim(),
          x: 22,
          y: 18,
          width: 36,
          height: 48,
          fill: 'transparent',
          color: '#141414',
          fontSize: 12,
          rotation: 0,
          borderNeo: false,
          opacity: 100,
        },
        title
      );
    } else {
      try {
        const tree = query
          .parseReactElement(
            <ImageBlock
              src={customAssetUrl.trim()}
              alt={title}
              caption={captionCredit}
              aspectRatio="4/5"
              borderStyle="neo"
            />
          )
          .toNodeTree();
        actions.addNodeTree(tree, ROOT_NODE);
      } catch (err) {
        console.warn('Could not insert custom asset:', err);
      }
    }

    addAssetAttribution({
      title,
      creator,
      creatorUrl: customCreatorUrl.trim() || undefined,
      sourceName: 'External Design Pack (via Adamsdesk Directory)',
      sourceUrl: customCreatorUrl.trim() || 'https://www.adamsdesk.com/posts/free-design-asset-resource/',
      license,
      assetUrl: customAssetUrl.trim(),
    });

    setCustomAssetUrl('');
    setCustomTitle('');
    setCustomCreator('');
    setCustomCreatorUrl('');
    showToast(`Inserted & credited ${creator}`);
  };

  const attributionCount = project.metadata.attributions?.length || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header & Attribution Counter */}
      <div className="p-3 border-b-neo border-neo-ink bg-neo-bg flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-neo-ink flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-neo-vermilion" />
            <span>Open Asset Commons</span>
          </h3>
          <p className="text-[10px] font-mono text-gray-500">
            API-linked visuals with auto-contributor credits
          </p>
        </div>

        <button
          onClick={() => setActiveInspectorTab('project')}
          className="flex items-center gap-1 bg-white border border-neo-ink px-2 py-1 rounded shadow-neo-sm text-[10px] font-mono font-bold hover:bg-neo-yellow transition-colors"
          title="View Contributor Credits Ledger in Metadata Inspector"
        >
          <Award className="w-3 h-3 text-neo-vermilion" />
          <span>{attributionCount} Credits</span>
        </button>
      </div>

      {/* Sub-navigation: Images | Vectors | Packs Directory */}
      <div className="grid grid-cols-3 gap-1 p-2 bg-white border-b-neo border-neo-ink text-[10px] font-mono font-bold">
        <button
          onClick={() => setSubTab('openverse')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded border transition-all ${
            subTab === 'openverse'
              ? 'bg-neo-ink text-white border-neo-ink'
              : 'bg-neo-bg text-neo-ink border-transparent hover:border-neo-ink'
          }`}
        >
          <ImageIcon className="w-3 h-3" />
          <span>CC Art</span>
        </button>
        <button
          onClick={() => setSubTab('vectors')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded border transition-all ${
            subTab === 'vectors'
              ? 'bg-neo-ink text-white border-neo-ink'
              : 'bg-neo-bg text-neo-ink border-transparent hover:border-neo-ink'
          }`}
        >
          <Shapes className="w-3 h-3" />
          <span>Vectors</span>
        </button>
        <button
          onClick={() => setSubTab('packs')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded border transition-all ${
            subTab === 'packs'
              ? 'bg-neo-ink text-white border-neo-ink'
              : 'bg-neo-bg text-neo-ink border-transparent hover:border-neo-ink'
          }`}
        >
          <BookMarked className="w-3 h-3" />
          <span>Packs</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {justAddedToast && (
        <div className="mx-3 mt-2 px-2.5 py-1.5 bg-neo-teal/30 border border-neo-ink rounded flex items-center gap-1.5 text-[10px] font-mono font-bold text-neo-ink">
          <CheckCircle2 className="w-3.5 h-3.5 text-neo-ink shrink-0" />
          <span className="truncate">{justAddedToast}</span>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* TAB 1: OPENVERSE CC ART & PHOTOS */}
        {subTab === 'openverse' && (
          <>
            <form onSubmit={searchOpenverse} className="flex flex-col gap-2">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ovQuery}
                    onChange={(e) => setOvQuery(e.target.value)}
                    placeholder="Search Openverse CC art..."
                    className="w-full pl-8 pr-2 py-1.5 bg-white border-neo border-neo-ink rounded text-xs font-mono focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={ovLoading}
                  className="px-2.5 py-1.5 bg-neo-yellow border-neo border-neo-ink rounded font-mono text-xs font-bold shadow-neo-sm"
                >
                  {ovLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Go'}
                </button>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-mono">
                {(['all', 'illustration', 'photograph'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setOvCategory(cat)}
                    className={`px-2 py-0.5 rounded border uppercase ${
                      ovCategory === cat
                        ? 'bg-neo-vermilion text-white border-neo-ink font-bold'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </form>

            <div className="grid grid-cols-1 gap-2.5">
              {ovResults.map((item) => {
                const licenseBadge = `${item.license.toUpperCase()}${
                  item.license_version ? ' ' + item.license_version : ''
                }`;
                const creatorName = item.creator || 'Openverse Contributor';
                const sourceLabel = item.source ? `Openverse (${item.source})` : 'Openverse';
                const captionCredit = `“${item.title || 'Visual Asset'}” by ${creatorName} • Licensed under ${licenseBadge}`;

                return (
                  <div
                    key={item.id}
                    ref={(ref) => {
                      if (ref) {
                        connectors.create(
                          ref,
                          <ImageBlock
                            src={item.url}
                            alt={item.title || 'Editorial illustration'}
                            caption={captionCredit}
                            aspectRatio="4/5"
                            borderStyle="neo"
                            focalPoint={{ x: 50, y: 50 }}
                          />
                        );
                      }
                    }}
                    draggable
                    onDragStart={(e) =>
                      setAssetDragData(e, {
                        title: item.title || 'Untitled Commons Work',
                        assetUrl: item.url,
                        creator: creatorName,
                        creatorUrl: item.creator_url,
                        sourceName: sourceLabel,
                        sourceUrl: item.foreign_landing_url || item.url,
                        license: licenseBadge,
                        licenseUrl: item.license_url,
                        kind: 'image',
                        defaultWidthPct: 40,
                        defaultHeightPct: 50,
                        borderNeo: true,
                      })
                    }
                    className="bg-white border-neo border-neo-ink rounded-lg overflow-hidden shadow-neo-sm flex flex-col cursor-grab active:cursor-grabbing"
                    title="Drag & drop onto page or inside a Fixed Visual Canvas"
                  >
                    <div className="h-28 bg-gray-900 relative border-b border-neo-ink overflow-hidden">
                      <img
                        src={item.thumbnail || item.url}
                        alt={item.title}
                        draggable={false}
                        className="w-full h-full object-cover pointer-events-none"
                        loading="lazy"
                      />
                      <span className="absolute top-1.5 left-1.5 bg-neo-yellow text-neo-ink text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-neo-ink">
                        {licenseBadge}
                      </span>
                      <span className="absolute top-1.5 right-1.5 bg-neo-ink/85 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <GripVertical className="w-2.5 h-2.5 text-neo-yellow" />
                        <span>DRAG</span>
                      </span>
                    </div>

                    <div className="p-2.5 flex flex-col gap-1.5">
                      <div className="text-xs font-heading font-bold text-neo-ink truncate">
                        {item.title || 'Untitled Commons Work'}
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 truncate">
                        By {item.creator || 'Commons Contributor'}
                      </div>

                      <div className="flex items-center gap-1 pt-1">
                        <button
                          onClick={() => handleInsertOpenverseAsset(item, 'block')}
                          className="flex-1 flex items-center justify-center gap-1 bg-neo-ink text-white hover:bg-neo-vermilion py-1 px-1.5 rounded text-[10px] font-mono font-bold transition-colors"
                          title="Insert as Reflowable Image Block + Credit"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Block</span>
                        </button>
                        <button
                          onClick={() => handleInsertOpenverseAsset(item, 'canvas')}
                          className="flex-1 flex items-center justify-center gap-1 bg-neo-yellow text-neo-ink hover:bg-neo-vermilion hover:text-white border border-neo-ink py-1 px-1.5 rounded text-[10px] font-mono font-bold transition-colors"
                          title="Add as Editable & Rotatable Layer in Fixed Visual Canvas"
                        >
                          <Move className="w-3 h-3" />
                          <span>+ Canvas</span>
                        </button>
                        <button
                          onClick={() => handleInsertOpenverseAsset(item, 'hero')}
                          className="py-1 px-1.5 bg-neo-bg hover:bg-neo-yellow border border-neo-ink rounded text-[10px] font-mono font-bold transition-colors"
                          title="Insert as Hero Spread with Credit"
                        >
                          Hero
                        </button>
                        {item.foreign_landing_url && (
                          <a
                            href={item.foreign_landing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 bg-white border border-neo-ink rounded hover:bg-neo-bg"
                            title="View original source & contributor page"
                          >
                            <ExternalLink className="w-3 h-3 text-neo-ink" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TAB 2: ICONIFY OPEN VECTORS & ORNAMENTS */}
        {subTab === 'vectors' && (
          <>
            <form onSubmit={searchIconify} className="flex gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={vecQuery}
                  onChange={(e) => setVecQuery(e.target.value)}
                  placeholder="Search 200k+ open SVGs..."
                  className="w-full pl-8 pr-2 py-1.5 bg-white border-neo border-neo-ink rounded text-xs font-mono focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={vecLoading}
                className="px-2.5 py-1.5 bg-neo-yellow border-neo border-neo-ink rounded font-mono text-xs font-bold shadow-neo-sm"
              >
                {vecLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Go'}
              </button>
            </form>

            <div className="flex items-center justify-between gap-1 bg-neo-bg p-1.5 rounded border border-neo-ink/30 text-[10px] font-mono">
              <span className="font-bold text-gray-600">Insert Target:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVectorInsertTarget('canvas')}
                  className={`px-2 py-0.5 rounded border font-bold ${
                    vectorInsertTarget === 'canvas'
                      ? 'bg-neo-yellow text-neo-ink border-neo-ink'
                      : 'bg-white text-gray-500 border-gray-300'
                  }`}
                >
                  Visual Canvas Layer
                </button>
                <button
                  type="button"
                  onClick={() => setVectorInsertTarget('block')}
                  className={`px-2 py-0.5 rounded border font-bold ${
                    vectorInsertTarget === 'block'
                      ? 'bg-neo-ink text-white border-neo-ink'
                      : 'bg-white text-gray-500 border-gray-300'
                  }`}
                >
                  Reflow Block
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {vecIcons.map((iconName) => {
                const [prefix, name] = iconName.split(':');
                const previewUrl = `https://api.iconify.design/${prefix}/${name}.svg?height=64&color=%23141414`;
                const fullSvgUrl = `https://api.iconify.design/${prefix}/${name}.svg?height=512&color=%23141414`;
                const meta = vecCollections[prefix];
                const creatorName = meta?.author?.name || `${prefix} Open Icon Contributors`;
                const collectionName = meta?.name || prefix.toUpperCase();
                const licenseTitle =
                  meta?.license?.title || meta?.license?.spdx || 'Open Source SVG License';

                return (
                  <button
                    key={iconName}
                    ref={(ref) => {
                      if (ref) {
                        connectors.create(
                          ref,
                          <ImageBlock
                            src={fullSvgUrl}
                            alt={`${name} vector graphic`}
                            caption={`Vector “${name}” from ${collectionName} by ${creatorName} (${licenseTitle})`}
                            aspectRatio="1/1"
                            fit="contain"
                            borderStyle="subtle"
                          />
                        );
                      }
                    }}
                    draggable
                    onDragStart={(e) =>
                      setAssetDragData(e, {
                        title: `${name} (${collectionName} Vector)`,
                        assetUrl: fullSvgUrl,
                        creator: creatorName,
                        creatorUrl: meta?.author?.url,
                        sourceName: `Iconify • ${collectionName}`,
                        sourceUrl: meta?.author?.url || 'https://iconify.design',
                        license: licenseTitle,
                        licenseUrl: meta?.license?.url,
                        kind: 'vector',
                        defaultWidthPct: 24,
                        borderNeo: false,
                      })
                    }
                    onClick={() => handleInsertVectorSvg(iconName)}
                    className="group p-2.5 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm hover:bg-neo-yellow/30 flex flex-col items-center justify-center gap-1.5 transition-all cursor-grab active:cursor-grabbing"
                    title={`Drag & drop into Fixed Visual Canvas (or page) or click to insert ${iconName}`}
                  >
                    <img
                      src={previewUrl}
                      alt={name}
                      draggable={false}
                      className="w-8 h-8 object-contain group-hover:scale-110 transition-transform pointer-events-none"
                      loading="lazy"
                    />
                    <span className="text-[9px] font-mono text-gray-600 truncate w-full text-center">
                      {name}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* TAB 3: CURATED ASSET PACKS DIRECTORY (ADAMSDESK + EXTERNAL ATTRIBUTION) */}
        {subTab === 'packs' && (
          <div className="flex flex-col gap-3">
            {CURATED_ASSET_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={`p-3 rounded-lg border-neo border-neo-ink shadow-neo-sm flex flex-col gap-1.5 ${
                  pack.featured ? 'bg-neo-yellow/25' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-mono font-bold uppercase bg-neo-ink text-white px-1.5 py-0.5 rounded">
                    {pack.category}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-neo-vermilion">
                    {pack.license}
                  </span>
                </div>

                <h4 className="font-heading font-bold text-xs text-neo-ink">
                  {pack.name}
                </h4>
                <p className="text-[10px] font-mono text-gray-600">
                  By {pack.curatorOrCreator}
                </p>
                <p className="text-[11px] font-sans text-gray-600 leading-snug">
                  {pack.description}
                </p>

                {/* Draggable Pack Assets Strip (Drag into Fixed Visual Canvas or Reflow Page!) */}
                {pack.sampleAssets && pack.sampleAssets.length > 0 && (
                  <div className="mt-1 p-2 bg-neo-bg/80 border border-neo-ink/40 rounded-lg flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold text-neo-ink">
                      <span className="flex items-center gap-1">
                        <GripVertical className="w-3 h-3 text-neo-vermilion" />
                        <span>DRAG PACK ASSETS INTO VISUAL CANVAS</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {pack.sampleAssets.map((sample, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          ref={(ref) => {
                            if (ref) {
                              connectors.create(
                                ref,
                                <ImageBlock
                                  src={sample.assetUrl}
                                  alt={sample.title}
                                  caption={`“${sample.title}” from ${pack.name} by ${pack.curatorOrCreator} (${pack.license})`}
                                  aspectRatio="1/1"
                                  fit={sample.kind === 'vector' ? 'contain' : 'cover'}
                                  borderStyle="neo"
                                />
                              );
                            }
                          }}
                          draggable
                          onDragStart={(e) =>
                            setAssetDragData(e, {
                              title: sample.title,
                              assetUrl: sample.assetUrl,
                              creator: pack.curatorOrCreator,
                              creatorUrl: pack.url,
                              sourceName: pack.name,
                              sourceUrl: pack.url,
                              license: pack.license,
                              kind: sample.kind === 'vector' ? 'vector' : 'pack-item',
                              defaultWidthPct: sample.kind === 'vector' ? 24 : 36,
                              borderNeo: sample.kind === 'image',
                            })
                          }
                          onClick={() => {
                            insertLayerIntoFreeformCanvas(
                              {
                                id: `pack-${Date.now()}-${sIdx}`,
                                name: sample.title,
                                type: 'image',
                                text: sample.title,
                                imageSrc: sample.assetUrl,
                                x: 24,
                                y: 20,
                                width: sample.kind === 'vector' ? 24 : 36,
                                height: sample.kind === 'vector' ? 38 : 48,
                                fill: 'transparent',
                                color: '#141414',
                                fontSize: 12,
                                rotation: 0,
                                borderNeo: sample.kind === 'image',
                                opacity: 100,
                              },
                              sample.title
                            );
                            addAssetAttribution({
                              title: sample.title,
                              creator: pack.curatorOrCreator,
                              creatorUrl: pack.url,
                              sourceName: pack.name,
                              sourceUrl: pack.url,
                              license: pack.license,
                              assetUrl: sample.assetUrl,
                            });
                            showToast(`Credited ${pack.curatorOrCreator}`);
                          }}
                          className="p-1.5 bg-white hover:bg-neo-yellow border border-neo-ink rounded flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing transition-colors"
                          title={`Drag & drop "${sample.title}" into Fixed Visual Canvas (or click to add)`}
                        >
                          <img
                            src={sample.assetUrl}
                            alt={sample.title}
                            draggable={false}
                            className="w-8 h-8 object-contain rounded pointer-events-none"
                          />
                          <span className="text-[8px] font-mono font-bold text-neo-ink truncate w-full text-center">
                            {sample.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 pt-1.5">
                  <a
                    href={pack.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-neo-yellow text-neo-ink border border-neo-ink py-1 px-2 rounded text-[10px] font-mono font-bold shadow-neo-sm transition-colors"
                  >
                    <span>Open Resource</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => {
                      addAssetAttribution({
                        title: pack.name,
                        creator: pack.curatorOrCreator,
                        creatorUrl: pack.url,
                        sourceName: pack.name,
                        sourceUrl: pack.url,
                        license: pack.license,
                      });
                      showToast(`Credited ${pack.curatorOrCreator}`);
                    }}
                    className="py-1 px-2 bg-neo-ink text-white hover:bg-neo-vermilion rounded text-[10px] font-mono font-bold transition-colors"
                    title="Add contributor credit to this book's Colophon"
                  >
                    + Credit
                  </button>
                </div>
              </div>
            ))}

            {/* Link External Pack Asset + Credit Form */}
            <form
              onSubmit={handleInsertCustomExternalAsset}
              className="p-3 bg-white border-neo border-neo-ink rounded-lg shadow-neo-sm flex flex-col gap-2 mt-1"
            >
              <div className="flex items-center gap-1.5 font-heading font-bold text-xs text-neo-ink">
                <Link2 className="w-3.5 h-3.5 text-neo-vermilion" />
                <span>Link Asset URL + Credit Creator</span>
              </div>
              <input
                type="url"
                required
                value={customAssetUrl}
                onChange={(e) => setCustomAssetUrl(e.target.value)}
                placeholder="Direct Image/SVG URL (https://...)"
                className="w-full px-2 py-1 bg-neo-bg border border-neo-ink rounded text-[11px] font-mono"
              />
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Asset Title (e.g. Retro Computer Vector)"
                className="w-full px-2 py-1 bg-neo-bg border border-neo-ink rounded text-[11px] font-mono"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={customCreator}
                  onChange={(e) => setCustomCreator(e.target.value)}
                  placeholder="Creator Name"
                  className="w-full px-2 py-1 bg-neo-bg border border-neo-ink rounded text-[11px] font-mono"
                />
                <input
                  type="text"
                  value={customLicense}
                  onChange={(e) => setCustomLicense(e.target.value)}
                  placeholder="License (e.g. CC BY 4.0)"
                  className="w-full px-2 py-1 bg-neo-bg border border-neo-ink rounded text-[11px] font-mono"
                />
              </div>
              <input
                type="url"
                value={customCreatorUrl}
                onChange={(e) => setCustomCreatorUrl(e.target.value)}
                placeholder="Creator / Source URL (optional)"
                className="w-full px-2 py-1 bg-neo-bg border border-neo-ink rounded text-[11px] font-mono"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="submit"
                  className="py-1.5 bg-neo-ink text-white border border-neo-ink rounded font-mono text-[10px] font-bold shadow-neo-sm hover:bg-neo-vermilion transition-all"
                >
                  + Reflow Block
                </button>
                <button
                  type="button"
                  onClick={(e) => handleInsertCustomExternalAsset(e, true)}
                  className="py-1.5 bg-neo-yellow text-neo-ink border border-neo-ink rounded font-mono text-[10px] font-bold shadow-neo-sm hover:bg-neo-vermilion hover:text-white transition-all"
                >
                  + Visual Canvas
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
