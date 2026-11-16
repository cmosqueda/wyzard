/**
 * Authorship + open-source credits shown in the Workspace footer and in the README.
 * Licenses were read from each package's own metadata at the time of writing.
 */
export const AUTHOR_ALIAS = 'Rocket Puncher';
export const REPO_URL = 'https://github.com/cmosqueda/wyzard';

export interface CreditEntry {
  name: string;
  license: string;
  url: string;
  note?: string;
}

export interface CreditGroup {
  title: string;
  entries: CreditEntry[];
}

export const CREDIT_GROUPS: CreditGroup[] = [
  {
    title: 'Core libraries',
    entries: [
      { name: 'React', license: 'MIT', url: 'https://react.dev', note: 'UI framework' },
      { name: 'Craft.js', license: 'MIT', url: 'https://craft.js.org', note: 'Drag-and-drop page editor framework' },
      { name: 'Zustand', license: 'MIT', url: 'https://github.com/pmndrs/zustand', note: 'State management' },
      { name: 'Immer', license: 'MIT', url: 'https://immerjs.github.io/immer/', note: 'Immutable state updates' },
      { name: 'Dexie.js', license: 'Apache-2.0', url: 'https://dexie.org', note: 'IndexedDB storage (local-first projects)' },
      { name: 'KaTeX', license: 'MIT', url: 'https://katex.org', note: 'LaTeX math rendering' },
      { name: 'JSZip', license: 'MIT or GPL-3.0', url: 'https://stuk.github.io/jszip/', note: 'EPUB / ZIP / CBZ packaging (used under MIT)' },
      { name: 'FileSaver.js', license: 'MIT', url: 'https://github.com/eligrey/FileSaver.js', note: 'File downloads' },
      { name: 'Lucide', license: 'ISC', url: 'https://lucide.dev', note: 'Icons' },
      { name: 'clsx', license: 'MIT', url: 'https://github.com/lukeed/clsx' },
      { name: 'tailwind-merge', license: 'MIT', url: 'https://github.com/dcastil/tailwind-merge' },
    ],
  },
  {
    title: 'Build tooling',
    entries: [
      { name: 'Vite', license: 'MIT', url: 'https://vite.dev' },
      { name: 'TypeScript', license: 'Apache-2.0', url: 'https://www.typescriptlang.org' },
      { name: 'Tailwind CSS', license: 'MIT', url: 'https://tailwindcss.com' },
      { name: 'PostCSS & Autoprefixer', license: 'MIT', url: 'https://postcss.org' },
    ],
  },
  {
    title: 'Fonts',
    entries: [
      { name: 'Space Grotesk', license: 'SIL OFL 1.1', url: 'https://fonts.google.com/specimen/Space+Grotesk', note: 'Headings' },
      { name: 'Plus Jakarta Sans', license: 'SIL OFL 1.1', url: 'https://fonts.google.com/specimen/Plus+Jakarta+Sans', note: 'Body UI' },
      { name: 'JetBrains Mono', license: 'SIL OFL 1.1', url: 'https://www.jetbrains.com/lp/mono/', note: 'Monospace' },
      { name: 'Google Fonts', license: 'OFL / Apache-2.0 (per family)', url: 'https://fonts.google.com', note: 'Font picker catalogue & delivery' },
    ],
  },
  {
    title: 'Open content & services',
    entries: [
      { name: 'Openverse', license: 'CC0 / CC BY / PDM (per work)', url: 'https://openverse.org', note: 'Openly licensed image search' },
      { name: 'Iconify', license: 'per icon set', url: 'https://iconify.design', note: 'Vector icon search & delivery' },
      { name: 'Adamsdesk', license: 'curated directory', url: 'https://www.adamsdesk.com/posts/free-design-asset-resource/', note: 'Free design asset resource list' },
      { name: 'Unsplash', license: 'Unsplash License', url: 'https://unsplash.com', note: 'Sample photographs in starter templates' },
      { name: 'Graphite', license: 'Apache-2.0', url: 'https://graphite.rs', note: 'Design inspiration for the vector canvas' },
    ],
  },
];
