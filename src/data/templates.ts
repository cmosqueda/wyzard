import type { BookProject } from '../types/ast';

export interface StarterTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string;
  badge: string;
  project: BookProject;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  // Template 1: Digital Culture Magazine Feature
  {
    id: 'culture-magazine',
    name: 'Digital Culture Magazine Feature',
    category: 'Editorial & Journalism',
    badge: 'MAGAZINE',
    description: 'High-contrast typography, 60/40 asymmetric split spreads, art-directed focal points, and visual gallery decks.',
    thumbnail: 'https://images.unsplash.com/photo-1507842229451-79b1be8d6290?auto=format&fit=crop&w=600&q=80',
    project: {
      id: 'proj-magazine',
      title: 'Substratum: The Digital Culture Review',
      metadata: {
        title: 'Substratum: The Digital Culture Review',
        author: 'Editorial Guild of New Media',
        language: 'en',
        description: 'An art-directed exploration of typography, user agency, and responsive editorial form.',
      },
      activeChapterId: 'ch-mag-1',
      designSystem: 'wyzard',
      chapters: [
        {
          id: 'ch-mag-1',
          title: 'Issue 08: The Architecture of Reading',
          slug: 'issue-08-architecture',
          order: 1,
          backgroundColor: '#FFFFFF',
          craftStateJson: JSON.stringify({
            ROOT: {
              type: { resolvedName: 'CanvasContainer' },
              isCanvas: true,
              props: { paddingY: '2rem', paddingX: '1.5rem' },
              nodes: ['hero-1', 'lead-1', 'split-1', 'gallery-1', 'callout-1', 'divider-1'],
            },
            'hero-1': {
              type: { resolvedName: 'HeroSpreadBlock' },
              props: {
                kicker: 'FEATURE ESSAY',
                kickerColor: 'vermilion',
                title: 'The Screen That Learned to Breathe',
                subtitle: 'Why the golden era of editorial book design is shifting from locked PDF spreads to living, responsive document flows.',
                author: 'By Elena Rostova • 12 min read',
                backgroundImage: 'https://images.unsplash.com/photo-1507842229451-79b1be8d6290?auto=format&fit=crop&w=1600&q=80',
                overlayOpacity: 55,
                height: 'lg',
                cardTheme: 'glass-dark',
                cardAlignment: 'bottom',
                keepTogetherOnPageTurn: true,
              },
              parent: 'ROOT',
            },
            'lead-1': {
              type: { resolvedName: 'TypographyBlock' },
              props: {
                variant: 'lead',
                fontFamily: 'serif',
                remSize: '1.25rem',
                dropCap: true,
                dropCapLines: 3,
                text: 'Print never demanded that its reader carry a magnifying lens into the subway car. Yet for fifteen years, digital publishing treated smartphones as pocket-sized photocopiers—scaling double-truck magazine spreads down to unreadable postage stamps.',
                keepTogetherOnPageTurn: false,
              },
              parent: 'ROOT',
            },
            'split-1': {
              type: { resolvedName: 'SplitContainer' },
              props: {
                desktopRatio: '60/40',
                gap: 'md',
                showDivider: true,
                reverseOnMobile: false,
                keepTogetherOnPageTurn: false,
              },
              linkedNodes: {
                'left-column': 'col-left-1',
                'right-column': 'col-right-1',
              },
              parent: 'ROOT',
            },
            'col-left-1': {
              type: { resolvedName: 'SplitColumn' },
              isCanvas: true,
              props: {},
              nodes: ['text-col-1', 'quote-col-1'],
              parent: 'split-1',
            },
            'text-col-1': {
              type: { resolvedName: 'TypographyBlock' },
              props: {
                variant: 'body',
                fontFamily: 'sans',
                text: 'When we design mobile-first, we acknowledge reality: more than 74 percent of longform digital publications are opened first on a vertical pocket screen. Art direction cannot mean static rigidity; it must mean intentional adaptability.',
              },
              parent: 'col-left-1',
            },
            'quote-col-1': {
              type: { resolvedName: 'TypographyBlock' },
              props: {
                variant: 'pullquote',
                text: '“True art direction does not crumble when the viewport narrows—it gracefully distills into its purest rhythm.”',
                keepTogetherOnPageTurn: true,
              },
              parent: 'col-left-1',
            },
            'col-right-1': {
              type: { resolvedName: 'SplitColumn' },
              isCanvas: true,
              props: {},
              nodes: ['img-col-1'],
              parent: 'split-1',
            },
            'img-col-1': {
              type: { resolvedName: 'ImageBlock' },
              props: {
                src: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=80',
                alt: 'Typography proofing spread',
                caption: 'Plate 01: Modern typesetting on newsprint grain',
                aspectRatio: '4/5',
                borderStyle: 'neo',
                focalPoint: { x: 50, y: 35 },
                keepTogetherOnPageTurn: true,
              },
              parent: 'col-right-1',
            },
            'gallery-1': {
              type: { resolvedName: 'VisualGalleryBlock' },
              props: {
                desktopLayout: 'grid-3',
                aspectRatio: '4/3',
                slides: [
                  {
                    id: 's-1',
                    imageSrc: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1000&q=80',
                    title: 'Figure A: Proportional Rhythm',
                    caption: 'Relative rem scales preserve reading comfort across resolutions.',
                  },
                  {
                    id: 's-2',
                    imageSrc: 'https://images.unsplash.com/photo-1507842229451-79b1be8d6290?auto=format&fit=crop&w=1000&q=80',
                    title: 'Figure B: Asymmetric Balancing',
                    caption: '60/40 column splits guide visual hierarchy on desktop spreads.',
                  },
                  {
                    id: 's-3',
                    imageSrc: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=80',
                    title: 'Figure C: Tactile Neo-Brutalism',
                    caption: 'Hard ink borders create tactile physical boundaries.',
                  },
                ],
                keepTogetherOnPageTurn: true,
              },
              parent: 'ROOT',
            },
            'callout-1': {
              type: { resolvedName: 'CalloutCardBlock' },
              props: {
                accent: 'vermilion',
                icon: 'sparkles',
                title: 'CRITICAL DESIGN DIRECTIVE',
                content: 'Never hardcode layout heights or absolute pixel coordinates. All spacing compiles to fluid percentages and rem units.',
                keepTogetherOnPageTurn: true,
              },
              parent: 'ROOT',
            },
            'divider-1': {
              type: { resolvedName: 'OrnamentDividerBlock' },
              props: { type: 'asterisms', spacingY: 'lg' },
              parent: 'ROOT',
            },
          }),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  },

  // Template 2: Interactive Educational Field Guide
  {
    id: 'field-guide',
    name: 'Interactive Educational Field Guide',
    category: 'STEM & Non-Fiction',
    badge: 'FIELD GUIDE',
    description: 'Anatomical diagrams with interactive numbered hotspots, taxonomic expanders, and field observation notes.',
    thumbnail: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=600&q=80',
    project: {
      id: 'proj-fieldguide',
      title: 'Botanical & Ecological Field Manual',
      metadata: {
        title: 'Botanical & Ecological Field Manual',
        author: 'Dr. Marcus Vance, Naturalist Guild',
        language: 'en',
        description: 'An annotated scientific visual guide designed for smartphones in the wild and desktop study.',
      },
      activeChapterId: 'ch-guide-1',
      designSystem: 'wyzard',
      chapters: [
        {
          id: 'ch-guide-1',
          title: 'Section 03: Forest Canopy Anatomy',
          slug: 'section-03-canopy',
          order: 1,
          backgroundColor: '#FFFFFF',
          craftStateJson: JSON.stringify({
            ROOT: {
              type: { resolvedName: 'CanvasContainer' },
              isCanvas: true,
              props: { paddingY: '2rem', paddingX: '1.5rem' },
              nodes: ['guide-hero', 'pinboard-1', 'accordion-1', 'split-guide', 'callout-guide'],
            },
            'guide-hero': {
              type: { resolvedName: 'HeroSpreadBlock' },
              props: {
                kicker: 'TAXONOMY FIELD GUIDE',
                kickerColor: 'teal',
                title: 'The Arboreal Stratum',
                subtitle: 'Observing structural micro-ecosystems across high-canopy temperate rain forests.',
                author: 'By Dr. Marcus Vance • Department of Forestry',
                backgroundImage: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1600&q=80',
                overlayOpacity: 50,
                height: 'md',
                cardTheme: 'neo-white',
                keepTogetherOnPageTurn: true,
              },
              parent: 'ROOT',
            },
            'pinboard-1': {
              type: { resolvedName: 'HotspotPinboardBlock' },
              props: {
                imageSrc: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1200&q=80',
                alt: 'Canopy stratum cross section',
                caption: 'Plate 3.1: Morphological anatomy of mature coniferous branch nodes',
                pins: [
                  {
                    id: 'p-1',
                    number: 1,
                    x: 28,
                    y: 35,
                    title: 'Epiphytic Lichen Colonies',
                    description: 'Micro-organisms that absorb atmospheric moisture without parasitizing host bark.',
                  },
                  {
                    id: 'p-2',
                    number: 2,
                    x: 64,
                    y: 48,
                    title: 'Secondary Bud Nodes',
                    description: 'Latent meristematic tissue activated following high-wind defoliation.',
                  },
                  {
                    id: 'p-3',
                    number: 3,
                    x: 82,
                    y: 70,
                    title: 'Resin Ducts',
                    description: 'Defensive canals delivering terpenes to seal bark punctures against boring insects.',
                  },
                ],
                keepTogetherOnPageTurn: true,
              },
              parent: 'ROOT',
            },
            'accordion-1': {
              type: { resolvedName: 'AccordionBlock' },
              props: {
                badge: 'FIELD TAXONOMY',
                accent: 'teal',
                title: 'Key Identification Features: Genus Pinus vs. Abies',
                content: 'Look for needle fascicles: Pinus species group needles in paper sheaths of 2 to 5, whereas Abies needles attach singly with small suction-cup circular bases directly to twigs.',
                defaultOpen: true,
                keepTogetherOnPageTurn: true,
              },
              parent: 'ROOT',
            },
            'split-guide': {
              type: { resolvedName: 'SplitContainer' },
              props: {
                desktopRatio: '50/50',
                gap: 'md',
                showDivider: true,
                keepTogetherOnPageTurn: true,
              },
              linkedNodes: {
                'left-column': 'col-g-left',
                'right-column': 'col-g-right',
              },
              parent: 'ROOT',
            },
            'col-g-left': {
              type: { resolvedName: 'SplitColumn' },
              isCanvas: true,
              props: {},
              nodes: ['guide-text-1'],
              parent: 'split-guide',
            },
            'guide-text-1': {
              type: { resolvedName: 'TypographyBlock' },
              props: {
                variant: 'body',
                text: 'Sampling requires documented compass bearings and elevation readings. When cataloging arboreal lichen clusters, inspect both leeward and windward bark fissures.',
              },
              parent: 'col-g-left',
            },
            'col-g-right': {
              type: { resolvedName: 'SplitColumn' },
              isCanvas: true,
              props: {},
              nodes: ['guide-img-1'],
              parent: 'split-guide',
            },
            'guide-img-1': {
              type: { resolvedName: 'ImageBlock' },
              props: {
                src: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=80',
                aspectRatio: '1/1',
                caption: 'Fig. 3.2: Bark texture specimen sample',
                keepTogetherOnPageTurn: true,
              },
              parent: 'col-g-right',
            },
            'callout-guide': {
              type: { resolvedName: 'CalloutCardBlock' },
              props: {
                accent: 'teal',
                icon: 'lightbulb',
                title: 'OBSERVER PROTOCOL',
                content: 'Avoid peeling live bark samples. Use high-resolution macro photography with a standard metric calibration ruler placed adjacent to the specimen.',
                keepTogetherOnPageTurn: true,
              },
              parent: 'ROOT',
            },
          }),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  },

  // Template 3: Illustrated Children's / Story Spread
  {
    id: 'story-spread',
    name: "Illustrated Children's / Story Spread",
    category: 'Children & Storytelling',
    badge: 'ILLUSTRATED STORY',
    description: 'Whimsical editorial storytelling with embedded read-along narration audio, large picture spreads, and drop caps.',
    thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    project: {
      id: 'proj-story',
      title: 'The Clockmaker of St. Jude',
      metadata: {
        title: 'The Clockmaker of St. Jude',
        author: 'Arthur Pendelton',
        language: 'en',
        description: 'An illustrated read-along fable of mechanical wonder and forgotten gears.',
      },
      activeChapterId: 'ch-story-1',
      designSystem: 'wyzard',
      chapters: [
        {
          id: 'ch-story-1',
          title: 'Chapter 1: The Whispering Pendulum',
          slug: 'chapter-1-whispering-pendulum',
          order: 1,
          backgroundColor: '#FFFFFF',
          craftStateJson: JSON.stringify({
            ROOT: {
              type: { resolvedName: 'CanvasContainer' },
              isCanvas: true,
              props: { paddingY: '2rem', paddingX: '1.5rem' },
              nodes: ['story-hero', 'audio-story', 'story-lead', 'story-img-full', 'story-quote', 'story-split'],
            },
            'story-hero': {
              type: { resolvedName: 'HeroSpreadBlock' },
              props: {
                kicker: 'TALE OF WONDER',
                kickerColor: 'yellow',
                title: 'The Whispering Pendulum',
                subtitle: 'High in the bell-tower of St. Jude, Old Barnaby tuned the heartbeats of brass and silver.',
                author: 'Illustrated & Written by Arthur Pendelton',
                backgroundImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1600&q=80',
                overlayOpacity: 40,
                height: 'md',
                cardTheme: 'neo-white',
                keepTogetherOnPageTurn: true,
              },
              parent: 'ROOT',
            },
            'audio-story': {
              type: { resolvedName: 'AudioNarrationBlock' },
              props: {
                trackTitle: 'Audio Storybook: Chapter 1',
                narrator: 'Read by Arthur Pendelton with Harp & Chimes',
                duration: '04:18',
                accent: 'yellow',
                coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80',
                keepTogetherOnPageTurn: true,
              },
              parent: 'ROOT',
            },
            'story-lead': {
              type: { resolvedName: 'TypographyBlock' },
              props: {
                variant: 'lead',
                fontFamily: 'serif',
                remSize: '1.25rem',
                dropCap: true,
                dropCapLines: 3,
                text: 'Barnaby believed that every timepiece possessed a secret voice. Some muttered like grumpy toads; others hummed sweet as morning sparrows. But on the thirteenth night of autumn, the tower clock sang a tune no one had heard in three centuries.',
                keepTogetherOnPageTurn: false,
              },
              parent: 'ROOT',
            },
            'story-img-full': {
              type: { resolvedName: 'ImageBlock' },
              props: {
                src: 'https://images.unsplash.com/photo-1507842229451-79b1be8d6290?auto=format&fit=crop&w=1200&q=80',
                aspectRatio: '16/9',
                caption: 'Barnaby adjusted the escapement wheel with his polished silver tweezers.',
                fullBleed: true,
                keepTogetherOnPageTurn: true,
              },
              parent: 'ROOT',
            },
            'story-quote': {
              type: { resolvedName: 'TypographyBlock' },
              props: {
                variant: 'pullquote',
                fontFamily: 'serif',
                text: '“Time is not a cage, little pip. It is the music that gears dance to when no one is looking.”',
                keepTogetherOnPageTurn: true,
              },
              parent: 'ROOT',
            },
            'story-split': {
              type: { resolvedName: 'SplitContainer' },
              props: {
                desktopRatio: '50/50',
                gap: 'md',
                reverseOnMobile: false,
                keepTogetherOnPageTurn: true,
              },
              linkedNodes: {
                'left-column': 'story-col-1',
                'right-column': 'story-col-2',
              },
              parent: 'ROOT',
            },
            'story-col-1': {
              type: { resolvedName: 'SplitColumn' },
              isCanvas: true,
              props: {},
              nodes: ['story-p-1'],
              parent: 'story-split',
            },
            'story-p-1': {
              type: { resolvedName: 'TypographyBlock' },
              props: {
                variant: 'body',
                fontFamily: 'serif',
                text: 'With three clicks of his copper key, the great bell gave a soft, golden chime that rippled across cobblestone alleys.',
              },
              parent: 'story-col-1',
            },
            'story-col-2': {
              type: { resolvedName: 'SplitColumn' },
              isCanvas: true,
              props: {},
              nodes: ['story-callout-1'],
              parent: 'story-split',
            },
            'story-callout-1': {
              type: { resolvedName: 'CalloutCardBlock' },
              props: {
                accent: 'yellow',
                icon: 'sparkles',
                title: 'STORY NOTE FOR PARENTS',
                content: 'Ask your child: What sound would your alarm clock make if it were an animal?',
                keepTogetherOnPageTurn: true,
              },
              parent: 'story-col-2',
            },
          }),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  },
];
