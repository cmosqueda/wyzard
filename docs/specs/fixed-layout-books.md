# Spec: Fixed-layout books and book features

Status: phases 1 and 2 implemented · phase 3 planned
Owner: Rocket Puncher · Last updated: 2026-11-20

## 1. Why

Wyzard started as a digital-first editor: pages reflow to any screen and look like a Canva-style canvas. A lot of
digital publishing still works the traditional way. The author designs **fixed pages at a set size**, adds the
usual **book features** (cover, copyright page, preface, table of contents) and **page features** (running
header, body, running footer, page numbers), then ships the same design as a printed book and as a digital
copy that looks identical.

This spec adds that way of working as a **separate project type**, so reflowable projects stay exactly as they are.

### Reference

`English 7 - Unit 1.pdf` (a Canva-made digital textbook, 155 pages, all 293 × 633 pt, the same aspect as
Wyzard's 390 × 844 mobile preset) shows what authors build by hand today:

| Feature | What the reference does |
| --- | --- |
| Fixed page size | One size for the whole book |
| Front matter | Cover, inside title page, copyright page (publisher, Republic Act statement, credits, ISBN, classification, boxed legal notice, link disclaimer), preface, four-page table of contents |
| Table of contents | Unit → chapter → lesson levels, dot leaders, page numbers, coloured chapter labels |
| Openers | Full-bleed art pages for the unit and for each chapter, with no header or footer |
| Running header | A coloured band: big number badge, title, subtitle. Colour changes by section (black unit, blue chapter and lesson, purple activities, red final reflections) |
| Running footer | Book-name badge on the left, breadcrumb on the right ("UNIT 1 \| Chapter 1: Rhymes and Rhythm") |
| Exceptions | Art pages and openers hide the header and footer |
| Hierarchy | Unit → Chapter → Lesson → Activity |

## 2. Goals and non-goals

Goals
- Author fixed pages at real print sizes and custom sizes, with margins and guides.
- Running headers and footers that fill themselves from the book structure.
- Page numbering with restarts (roman front matter, then arabic).
- Insertable book-feature pages that fill themselves from metadata.
- An automatic table of contents with real page numbers and clickable entries.
- Export the authored pages without re-flowing them.

Non-goals (for now)
- Automatic text flow across pages (manual pages only; auto-flow may follow).
- Print production colour (CMYK, ICC profiles).
- Importing PDF or Canva files.

## 3. Phases

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Fixed-layout project type, page sizes (editable), manual pages, margins and guides, running header and footer designer with tokens, sections, page numbering, HTML / PDF / CBZ export of authored pages | Done |
| 2 | Book-feature pages and smart blocks, automatic table of contents with links, numbering runs, section levels, EPUB cover, landmarks, nested navigation and page list | Done |
| 3 | Fixed-layout EPUB (pre-paginated), print PDF with bleed and crop marks, facing pages with left / right masters and first-page variants, index and glossary, textbook starter template | Planned |

## 4. Data model

All fields are optional so existing projects load unchanged. `layoutMode` of `undefined` means reflowable.

```ts
BookProject {
  layoutMode?: 'reflowable' | 'fixed'
  pageSetup?: PageSetup        // size, margins, numbering, header, footer, accent colour
  sections?: BookSection[]     // grouping used by tokens and the table of contents
  chapters: Chapter[]          // in fixed mode, each chapter IS one page
}

PageSetup {
  sizeKey, width, height       // CSS px, 96 per inch
  margins { top right bottom left }
  showGuides, numbering { start, style }, accentColor?
  header: HeaderFooterZone, footer: HeaderFooterZone
}

HeaderFooterZone { enabled, height, background, color, borderColor, borderWidth, left?, center?, right? }
ZoneSlot { text (with tokens), size?, bold?, color?, bg?, padX? }

BookSection { id, title, subtitle?, number?, color?, level?, tocLabel?, inToc? }

Chapter (page) {
  sectionId?, hideHeader?, hideFooter?, fullBleed?,
  kind?: 'cover' | 'title' | 'copyright' | 'dedication' | 'preface' | 'toc' | 'backCover' | 'content',
  tocEntry?: { title?, level: 1 | 2 | 3 },
  numbering?: { start, style }  // starts a new numbering run at this page
}

BookMetadata additions: shortTitle, subtitle, publisher, isbn, edition, copyrightYear, copyrightHolder,
  classification, contact, rightsStatement, disclaimer (coverImage already existed)
```

Reusing `Chapter` as the page record keeps saving, undo, session restore, backups, folder sync and the
editor-per-chapter mechanism unchanged.

### Tokens

`{bookTitle} {shortTitle} {author} {pageNumber} {pageCount} {pageTitle} {sectionNumber} {sectionTitle}
{sectionSubtitle}`. The colour value `accent` resolves to the page's section colour.

### Page regions

Header and footer sit inside the margins. The body is the space between them (12 px gap). A **full-bleed** page
uses the whole sheet and has no margins, header or footer. Content that spills past the body shows a warning in
the editor and is clipped in exports.

### Numbering

A page's printed number is `start + (index − runStart)` formatted in the run's style. A page with its own
`numbering` starts a run; otherwise the book-wide numbering applies.

### Table of contents entries

Built in page order from: every section (at the first page that uses it, unless `inToc` is false) and every
page with `tocEntry`. Each entry has a label, a title, a level, a target page and the printed page number.

## 5. Features

### 5.1 Project type and page setup (phase 1)
- New project dialog: Reflowable or Fixed-layout book; presets Mobile 390 × 844, A4, A5, US Letter, Trade 6 × 9 in,
  Digest 5 × 8 in, Custom. Sizes are editable later in px, mm or inches, with rotate.
- Page setup dialog: size, margins (linked option), numbering, default accent, header and footer designer with
  presets (Textbook band, Classic running head, Page number only, None) and a live preview, and a Sections tab.
- Responsive blocks follow the page width (mobile under 600 px, tablet under 1100, otherwise desktop).

### 5.2 Pages (phase 1)
- Pages rail: grouped by section, add, duplicate, reorder, rename, delete.
- Page options: section, full bleed, hide header, hide footer.
- Stage: exact-size sheet, margin guides, header and footer preview, overflow warning.

### 5.3 Book-feature pages (phase 2)
A **Book pages** menu in the Pages rail inserts ready-made pages in the right place:

| Page | Content |
| --- | --- |
| Front cover | Full bleed, `Cover / Title Page` block (title, subtitle, author, publisher, background image with overlay) |
| Title page | Same block, title-page variant, no header or footer |
| Copyright page | `Copyright Page` block |
| Dedication | Title-page block, dedication variant (editable text) |
| Preface / foreword | Heading and body text, listed in the table of contents |
| Table of contents | Heading and `Table of Contents` block |
| Back cover | Full bleed, back-cover variant: blurb, author, publisher, ISBN |

Cover, title, copyright, dedication and back cover are unique per book (adding again opens the existing page).
Front-matter pages are inserted in order (cover, title, copyright, dedication, preface, contents); the back cover
goes last.

### 5.4 Smart blocks (phase 2)
Blocks that fill themselves from the book:

- **Cover / Title Page**: from title, subtitle, author, publisher, description and ISBN.
- **Copyright Page**: copyright line, publisher, ISBN, edition, classification, boxed rights statement,
  contact, disclaimer. Edited in the block's inspector or in Book Metadata; saved with the book.
- **Table of Contents**: depth (parts, chapters, lessons), dot leaders, page numbers, label colour, text size,
  and a start entry / entries per page setting so a long contents continues across pages. In the editor each entry
  jumps to its page.

Smart blocks are available in the block palette for fixed-layout books.

### 5.5 Sections, levels and numbering (phase 2)
- Sections have a contents level (part, chapter, lesson), an optional contents label ("Chapter 1") and an
  "in contents" switch.
- Any page can be added to the contents with its own title and level.
- "Restart page numbers here" with a start number and style (1, i, I, none).

### 5.6 Exports

| Output | Phase 1 | Phase 2 additions |
| --- | --- | --- |
| HTML reader and HTML pack | Exact-size pages with header and footer | Contents entries are links. In the pack they point to `chapter-N.html`; in the in-app reader they switch pages |
| PDF | Exact-size pages | Contents entries are internal links (`#page-N`) |
| CBZ | Page plates with header and footer | Cover, title, copyright and contents drawn on the plates |
| EPUB | Pages as reflowable chapters | Cover image (uploaded, or rendered from the cover page), `cover-image` manifest property, landmarks (cover, title page, contents, start of content), nested navigation document, page list with printed numbers, structural `epub:type`s per page kind, contents links between page files |
| Fixed-layout EPUB | n/a | Phase 3 |

## 6. Acceptance criteria (phase 2)

1. In a fixed-layout book, Book pages inserts each page type at the right position; adding a unique page twice
   selects the existing one.
2. Editing the copyright fields updates every copyright block in the book.
3. The table of contents lists sections and flagged pages in order, with printed page numbers that follow
   numbering runs; changing a section, level or numbering updates it immediately.
4. Clicking a contents entry in the editor opens that page. In the HTML pack it opens the page file. In the PDF
   it jumps to the page. In EPUB it opens the page's XHTML file.
5. The EPUB navigation document nests entries by level, includes a landmarks list and (for fixed books) a page list.
6. A book with a cover image or cover page has a valid cover in the EPUB package.
7. Reflowable projects behave exactly as before.

## 7. Phase 3 plan

- **Fixed-layout EPUB:** `rendition:layout=pre-paginated`, a viewport per page, each page as one XHTML with
  absolutely positioned content, the same navigation, landmarks and page list.
- **Print PDF:** trim size with bleed, crop marks, safe area and facing-page spreads.
- **Master pages:** left / right (odd / even) and first-page-of-section variants for the header, footer and margins.
- **Index and glossary:** entries tagged in text, generated pages with links.
- **Textbook starter template** modelled on the reference book.
- **Possible follow-ups:** a "move overflow to a new page" helper and optional automatic text flow.

## 8. Risks and notes

- Authored pages are clipped at the page edge in exports; the editor warns about overflow instead of clipping.
- Text in the editor and in exports is laid out by the browser, so line breaks can differ by a few pixels
  between the two.
- Uploaded images referenced as `blob:` URLs are not bundled into EPUBs yet. The cover is rasterised for that
  reason, but images inside other pages need bundling (tracked separately).
- The in-app Reader previews rely on inline scripts, which the browser extension's content security policy blocks.
  Exported files are unaffected.
