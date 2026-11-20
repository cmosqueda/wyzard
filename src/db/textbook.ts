import type { BookProject, BookSection, Chapter } from '../types/ast';
import type { PageSizeKey } from '../utils/pageLayout';
import { createFixedBookProject } from './index';
import { createBookPage, heading, pageJson } from './bookPages';

/**
 * "Textbook" starter: a fixed-layout book modelled on a classroom textbook. It has front matter in roman
 * numerals (cover, title, copyright, preface, contents), then a unit with a chapter, lessons, an activity and a
 * final reflection (each its own coloured section with a full-bleed opener), and back matter (glossary, index, back cover).
 */

const UNIT = '#111827';
const CHAPTER = '#2563EB';
const ACTIVITY = '#7C3AED';
const REFLECTION = '#DC2626';

type Spec = { id: string; type: string; props: Record<string, unknown> };

const typo = (id: string, variant: 'h1' | 'h2' | 'body', html: string, extra: Record<string, unknown> = {}): Spec => ({
  id,
  type: 'TypographyBlock',
  props: { variant, fontFamily: variant === 'body' ? 'sans' : 'heading', htmlContent: html, ...extra },
});

export function createTextbookProject(
  title = 'Untitled Textbook',
  author = 'Wyzard Author',
  description = 'A fixed-layout textbook created in Wyzard.',
  size: { key: PageSizeKey; width?: number; height?: number } = { key: 'mobile' }
): BookProject {
  const project = createFixedBookProject(title, author, description, size);
  const now = Date.now();
  const stamp = (n: number) => now + n;

  const sections: BookSection[] = [
    { id: 'sec-unit', title: 'Unit 1', subtitle: 'Words that move', number: '1', color: UNIT, level: 1, tocLabel: 'UNIT 1' },
    { id: 'sec-chapter', title: 'Chapter 1', subtitle: 'Rhymes and Rhythm', number: '1', color: CHAPTER, level: 2, tocLabel: 'Chapter 1' },
    { id: 'sec-lesson', title: 'Lesson 1', subtitle: 'Reading a poem aloud', number: '1.1', color: CHAPTER, level: 3, tocLabel: 'Lesson 1' },
    { id: 'sec-activity', title: 'Activities', subtitle: 'Try it yourself', number: 'A', color: ACTIVITY, level: 3 },
    { id: 'sec-reflection', title: 'Final Reflection', subtitle: 'What did you learn?', number: 'R', color: REFLECTION, level: 3 },
  ];
  project.sections = sections;
  project.metadata = {
    ...project.metadata,
    shortTitle: title.slice(0, 18).toUpperCase(),
    subtitle: 'Student textbook',
    edition: 'First edition',
    classification: 'Textbook',
  };
  project.terms = [
    { id: 'term-rhyme', term: 'rhyme', definition: 'Words that end with the same sound, like “moon” and “spoon”.' },
    { id: 'term-rhythm', term: 'rhythm', definition: 'The pattern of strong and weak beats in a line of words or music.' },
    { id: 'term-stanza', term: 'stanza', definition: 'A group of lines in a poem, like a paragraph in prose.' },
  ];

  const page = (id: string, title: string, sectionId: string | undefined, nodes: Spec[], extra: Partial<Chapter> = {}, n = 0): Chapter => ({
    id,
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    order: 0,
    craftStateJson: pageJson(nodes),
    backgroundColor: '#FFFFFF',
    sectionId,
    createdAt: stamp(n),
    updatedAt: stamp(n),
    ...extra,
  });

  const opener = (id: string, label: string, name: string, sectionId: string, color: string, n: number): Chapter =>
    page(
      id,
      name,
      sectionId,
      [typo('l', 'h2', label.toUpperCase(), { color: '#FFFFFF', textAlign: 'left' }), typo('t', 'h1', name, { color: '#FFFFFF', textAlign: 'left' })],
      { fullBleed: true, backgroundColor: color },
      n
    );

  const accent = project.pageSetup?.accentColor || CHAPTER;
  const frontKinds = ['cover', 'title', 'copyright', 'preface', 'toc'] as const;
  const front = frontKinds.map((k) => createBookPage(k, project));
  // roman numerals for the front matter, then arabic from the unit opener
  front[0].numbering = { start: 1, style: 'roman' };

  const body: Chapter[] = [
    opener('tb-unit', 'Unit 1', 'Words that move', 'sec-unit', UNIT, 1),
    { ...opener('tb-chapter', 'Chapter 1', 'Rhymes and Rhythm', 'sec-chapter', CHAPTER, 2) },
    page(
      'tb-lesson-1',
      'Reading a poem aloud',
      'sec-lesson',
      [
        heading('h', 'Reading a poem aloud', accent),
        typo('b1', 'body', 'A poem is built from lines, and lines are grouped into a <strong>stanza</strong>. When we read aloud, we listen for the <strong>rhyme</strong> at the end of each line.', { textAlign: 'justify' }),
        typo('b2', 'body', 'Try tapping your desk as you read. The beat you feel is the <strong>rhythm</strong> of the poem.', { textAlign: 'justify' }),
      ],
      {},
      3
    ),
    page(
      'tb-lesson-2',
      'Finding the beat',
      'sec-lesson',
      [
        heading('h', 'Finding the beat', accent),
        typo('b1', 'body', 'Clap once for every strong syllable. Short lines usually have a quick rhythm, and long lines feel slower.', { textAlign: 'justify' }),
      ],
      {},
      4
    ),
    page(
      'tb-activity',
      'Make your own rhyme',
      'sec-activity',
      [
        heading('h', 'Make your own rhyme', ACTIVITY),
        typo('b1', 'body', 'Write a four-line stanza about your day. The second and fourth lines must rhyme.', { textAlign: 'left' }),
      ],
      {},
      5
    ),
    page(
      'tb-reflection',
      'Final reflection',
      'sec-reflection',
      [
        heading('h', 'Final reflection', REFLECTION),
        typo('b1', 'body', 'Which rhyme or rhythm did you enjoy most? Tell a classmate why.', { textAlign: 'left' }),
      ],
      {},
      6
    ),
  ];
  body[0].numbering = { start: 1, style: 'arabic' };
  body[0].tocEntry = undefined;

  const back = (['glossary', 'index', 'backCover'] as const).map((k) => createBookPage(k, project));
  // glossary / index entries are listed in the contents by default, like the reference book
  const chapters = [...front, ...body, ...back];
  chapters.forEach((c, i) => (c.order = i + 1));
  project.chapters = chapters;
  project.activeChapterId = chapters.find((c) => c.kind === 'cover')?.id || chapters[0].id;
  return project;
}
