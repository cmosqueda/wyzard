# Spec: Fixed-layout books and book features

Status: phases 1 to 3 implemented · phase 4 in progress (4.1 to 4.4 done)
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
| 3 | Fixed-layout EPUB (pre-paginated), print PDF with bleed and crop marks, facing pages with left / right masters and first-page variants, index and glossary, textbook starter template | Done |
| 4 | Closing the gaps: images inside EPUBs, overflow to new pages, per-side master pages, a better index, direct PDF download | 4.1 to 4.4 done, 4.5 planned |

## 4. Data model

All fields are optional so existing projects load unchanged. `layoutMode` of `undefined` means reflowable.

```ts
BookProject {
  layoutMode?: 'reflowable' | 'fixed'
  pageSetup?: PageSetup        // size, margins, numbering, header, footer, accent colour
  sections?: BookSection[]     // grouping used by tokens and the table of contents
  terms?: BookTerm[]           // index and glossary terms (phase 3)
  chapters: Chapter[]          // in fixed mode, each chapter IS one page
}

PageSetup {
  sizeKey, width, height       // CSS px, 96 per inch
  margins { top right bottom left }
  showGuides, numbering { start, style }, accentColor?
  header: HeaderFooterZone, footer: HeaderFooterZone
  facing?: boolean                              // phase 3: left / right master pages
  sectionStart?: { hideHeader?, hideFooter? }   // phase 3: variant for the first page of a section
}

BookTerm { id, term, definition?, inIndex?, parent?, aliases?, seeAlso?, auto? }   // phase 4: see 4.4

HeaderFooterZone { enabled, height, background, color, borderColor, borderWidth, left?, center?, right? }
ZoneSlot { text (with tokens), size?, bold?, color?, bg?, padX? }

BookSection { id, title, subtitle?, number?, color?, level?, tocLabel?, inToc? }

Chapter (page) {
  sectionId?, hideHeader?, hideFooter?, fullBleed?,
  kind?: 'cover' | 'title' | 'copyright' | 'dedication' | 'preface' | 'toc' | 'glossary' | 'index' | 'backCover' | 'content',
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

| Output | Phase 1 | Phase 2 additions | Phase 3 |
| --- | --- | --- | --- |
| HTML reader and HTML pack | Exact-size pages with header and footer | Contents entries are links. In the pack they point to `chapter-N.html`; in the in-app reader they switch pages |
| PDF | Exact-size pages | Contents entries are internal links (`#page-N`) |
| CBZ | Page plates with header and footer | Cover, title, copyright and contents drawn on the plates |
| EPUB | Pages as reflowable chapters | Cover image (uploaded, or rendered from the cover page), `cover-image` manifest property, landmarks (cover, title page, contents, start of content), nested navigation document, page list with printed numbers, structural `epub:type`s per page kind, contents links between page files |
| Fixed-layout EPUB | n/a | n/a | Phase 3, see 5.9 |

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

## 7. Phase 3 (implemented)

### 7.1 Master pages
`PageSetup.facing` turns on facing pages. The first page is a right-hand page, the second a left-hand page, and so
on. On left-hand pages the left and right margins swap (the left margin is the inner, binding margin) and the
slots of the header and footer are mirrored, so page numbers and running titles sit on the outside edge.
`PageSetup.sectionStart` hides the header and / or footer on the first page of each section (chapter openers).
Everything that lays out a page asks `getEffectiveSetup(project, pageIndex)`, so the editor, HTML, PDF, EPUB and CBZ agree.

### 7.2 Print-ready PDF
Export, Print-ready PDF. Options: bleed (none, 3, 5 or 6 mm), crop marks, facing-page spreads (needs facing pages)
and safe-area guides (preview only, never printed).
- A sheet is the trim size plus the bleed plus a slug area that holds the crop marks. The background of each page
  runs into the bleed. Full-bleed pages (covers, openers) are scaled up just enough to cover it.
- With spreads, the cover is alone, then left and right pages are paired on one sheet; the last odd page is alone.
  Each sheet gets its own CSS page size, so the PDF contains single and double pages together.
- The document opens in a print window; choosing "Save as PDF" writes it.

### 7.3 Fixed-layout EPUB
Export, EPUB, with "Fixed-layout EPUB (pre-paginated)" ticked (the default for fixed books):
- `rendition:layout` is `pre-paginated`; `rendition:spread` is `both` with facing pages, otherwise `none`.
- Every page is one XHTML file with a `viewport` of the page size and the header, footer and body positioned
  as authored. Facing books get `page-spread-left` / `page-spread-right` on the spine items.
- The navigation document (nested contents, page list, landmarks) and the cover are the same as in phase 2.
- Credits pages are marked `rendition:layout-reflowable`.
- Untick the option for the reflowable EPUB of phase 2.

### 7.4 Index and glossary
`BookProject.terms` holds `{ term, definition?, inIndex? }`, edited in Page setup, Index & glossary.
- The `Index / Glossary` block (variant index or glossary) is generated from the terms. An index entry lists every
  page whose typed text contains the term as a whole word (case-insensitive), with printed page numbers that link
  to the pages. Contents, copyright, index and glossary blocks and non-content pages are not searched.
- Book pages adds a Glossary or an Index page; they go before the back cover and are listed in the contents.
- Rendered in the editor, HTML, PDF, EPUB (`doc-index` / `doc-glossary`) and CBZ.

### 7.5 Textbook starter
New project, Textbook starter: cover, title, copyright, preface and contents in roman numerals; then Unit 1 with a
full-bleed opener, Chapter 1 (opener), a lesson with two pages, an activity (purple) and a final reflection (red),
each its own coloured section at levels 1 to 3; then glossary, index and back cover. Page numbers restart at the unit
opener. The Textbook band header and footer from phase 1 are used. Every page can be edited, moved or deleted.

### 7.6 Acceptance criteria (phase 3)
1. Turning on facing pages mirrors margins and header / footer slots on left-hand pages in the editor and in exports.
2. Hiding the header / footer on section starts affects only the first page of each section.
3. The print PDF has one sheet per page (or per spread), with the chosen bleed and crop marks; the PDF's pages
   have the sheet sizes (single and double pages when spreads are on).
4. The fixed-layout EPUB has `pre-paginated` metadata, a viewport per page, valid XHTML and working contents links.
5. The index lists terms alphabetically with the right printed page numbers; the glossary lists definitions.
6. The textbook starter opens with its sections, numbering runs, contents, glossary and index filled in.
7. Reflowable projects and fixed books without these options behave as before.

### 7.7 Follow-ups (now phase 4)
See section 7.8.

## 7.8 Phase 4: closing the gaps

### 4.1 Uploaded images and audio inside EPUBs (done)
Uploaded files are referenced in pages as `blob:…#wzasset=<id>` URLs, which are meaningless inside an `.epub`.
When exporting, `createEpubAssetBundler` scans every generated XHTML document for those URLs, reads the files from
the project's stored assets, writes them to `images/asset-N.ext` (or `media/` for audio and video), adds them to the
manifest and rewrites the references to `../images/asset-N.ext`. It applies to reflowable and fixed-layout EPUBs.
Assets that were deleted from storage keep their old URL and are skipped.

Acceptance: an EPUB of a page with an uploaded image contains the image file, a manifest item with the right media
type, a relative `src`, and no `blob:` URL; all XHTML still parses.

### 4.2 Move overflow to new pages (done)
When a page's content runs past the body, the overflow chip gets a **Move overflow to new page(s)** button.
- The blocks (top-level nodes with their children) are measured in the editor and packed in order, page by page, by
  height and the page's block spacing. The first page keeps what fits; every continuation page fits as well.
- Continuations are inserted right after the page, titled "<title> (cont.)" (or "(cont. 1)", "(cont. 2)" …), and keep
  the section and background. They are plain content pages: no full bleed, kind, contents entry or numbering restart.
- A block that does not fit on a page by itself gets a page of its own; if nothing can move the editor says so.
- One undo step restores the original page.

Acceptance: a page with ten paragraphs and an image splits into pages with no overflow warning; the moved blocks are
saved on the new pages and gone from the first page.

### 4.3 Per-side master pages (done)
`PageSetup.masters` is a list of named masters: `{ id, name, side?, header?, footer?, margins? }`. Anything a master
leaves out follows the book's page setup.
- Page setup, **Masters** tab: add masters, name them, choose their side (left pages, right pages or pick manually),
  and switch on an own header, own footer and / or own margins (each starts as a copy of the book's setting).
- Which master a page uses, first match wins: the page's `masterId` (Pages rail, Page options, Master page), then its
  section's `masterId` (Sections tab), then, with facing pages on, the first master made for the page's side.
  A page with no master uses the book setup, mirrored on left-hand pages when facing pages is on.
- An explicit master replaces the automatic mirroring. The "hide on section start" rules still apply on top.
- The editor, HTML, PDF, print PDF, EPUB and CBZ all resolve a page through `getEffectiveSetup`, so they agree.

Acceptance: with facing pages on and a left master that has a 90 px left margin, left-hand pages place their body at
90 px and right-hand pages at the book margin; picking that master on a right-hand page moves its body to 90 px too.

### 4.4 Better index (done)
- **Page ranges:** consecutive pages merge into one range ("12–14"); every range links to its first page. Ranges use
  printed page numbers, so "iv–v" and "3–4" read correctly across numbering runs.
- **Sub-entries:** a term can be a sub-entry of a main term (`BookTerm.parent`). Sub-entries are listed indented under
  their main entry, alphabetically. A main entry with no pages of its own is still listed when it has sub-entries.
  Only main entries start a letter group.
- **See also:** `BookTerm.seeAlso` (comma-separated) prints "See also …" after the page numbers; a term with only
  "see also" text is listed as a cross-reference.
- **Other spellings:** `BookTerm.aliases` ("rhymes, rhyming") are searched in the text as well as the term.
- **Tagging:** Page options, "Index terms tagged on this page", lists a term on that page even if the text does not
  contain it (`Chapter.indexTerms`). Turning off "Find in the text automatically" on a term (`auto: false`) lists it
  only on tagged pages. Tagging works per page; it does not mark individual words inside the text.
- **Leaving pages out:** "Leave this page out of the index" (`Chapter.noIndex`) skips the page's text and tags.
- Rendered the same way in the editor, HTML, PDF, EPUB and CBZ.

Acceptance: with terms rhyme, rhythm, stanza and a sub-entry "beat" under rhythm, the index shows "rhythm, 2–4, 6 …
See also meter, verse" followed by the indented "beat, 3–4"; leaving a page out removes it from every entry; tagging
adds the page to the term's list.

### 4.5 Direct PDF download (planned)
A built-in PDF writer so the print PDF downloads without the browser print dialog, with exact trim and bleed boxes.

### 4.6 Other follow-ups
- Optional automatic text flow.
- Import an existing PDF as page images.
- A validation pass for fixed books (EPUB checks, low-resolution images, content inside the bleed).

## 8. Risks and notes

- Authored pages are clipped at the page edge in exports; the editor warns about overflow instead of clipping.
- Text in the editor and in exports is laid out by the browser, so line breaks can differ by a few pixels
  between the two.
- Remote (`http`) images are not downloaded into EPUBs; they stay as links and need a connection to show.
- The in-app Reader previews rely on inline scripts, which the browser extension's content security policy blocks.
  Exported files are unaffected.
