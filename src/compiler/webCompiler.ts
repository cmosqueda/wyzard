import type { BookProject, Chapter } from '../types/ast';
import { parseCraftState, type ParsedBlockNode } from './astParser';

/**
 * Compiles a block node into clean semantic HTML5 markup for the web reader.
 */
function renderWebNode(node: ParsedBlockNode): string {
  const p = node.props;

  switch (node.type) {
    case 'TypographyBlock':
    case 'EditorialTypography': {
      const variant = p.variant || 'body';
      const align = p.textAlign || 'left';
      const family = p.fontFamily || 'sans';
      const remSize = p.remSize || '';
      const text = p.htmlContent || p.text || '';
      const dropCap = p.dropCap && variant === 'body';
      const keepTogether = p.keepTogetherOnPageTurn ? 'page-break-inside-avoid' : '';

      const styleAttr = [
        remSize ? `font-size: ${remSize};` : '',
        p.lineHeight ? `line-height: ${p.lineHeight};` : '',
        p.letterSpacing ? `letter-spacing: ${p.letterSpacing};` : '',
        p.color ? `color: ${p.color};` : '',
      ].filter(Boolean).join(' ');

      const fontClass = family === 'serif' ? 'font-serif' : family === 'heading' ? 'font-heading' : family === 'mono' ? 'font-mono' : 'font-sans';
      const dropCapClass = dropCap ? 'drop-cap-enabled' : '';

      switch (variant) {
        case 'h1':
          return `<h1 class="editorial-h1 ${fontClass} text-${align} ${keepTogether}" style="${styleAttr}">${text}</h1>`;
        case 'h2':
          return `<h2 class="editorial-h2 ${fontClass} text-${align} ${keepTogether}" style="${styleAttr}">${text}</h2>`;
        case 'h3':
          return `<h3 class="editorial-h3 ${fontClass} text-${align} ${keepTogether}" style="${styleAttr}">${text}</h3>`;
        case 'lead':
          return `<p class="editorial-lead ${fontClass} text-${align} ${keepTogether}" style="${styleAttr}">${text}</p>`;
        case 'pullquote':
          return `<blockquote class="editorial-pullquote ${fontClass} text-${align} ${keepTogether}" style="${styleAttr}"><p>${text}</p></blockquote>`;
        case 'body':
        default:
          return `<p class="editorial-body ${fontClass} ${dropCapClass} text-${align} ${keepTogether}" style="${styleAttr}">${text}</p>`;
      }
    }

    case 'ImageBlock':
    case 'ArtDirectedImage': {
      const src = p.src || '';
      const alt = p.alt || '';
      const caption = p.caption || '';
      const ratio = p.aspectRatio || '4/5';
      const focal = p.focalPoint || { x: 50, y: 50 };
      const bleed = p.fullBleed ? 'full-bleed' : '';
      const border = p.borderStyle === 'neo' ? 'image-frame-neo' : p.borderStyle === 'subtle' ? 'image-frame-subtle' : '';

      return `
        <figure class="editorial-image-figure ${bleed}">
          <div class="image-aspect-wrapper aspect-${ratio.replace('/', '-')} ${border}">
            <img src="${src}" alt="${alt}" style="object-fit: ${p.fit || 'cover'}; object-position: ${focal.x}% ${focal.y}%;" loading="lazy" />
          </div>
          ${caption ? `<figcaption class="editorial-caption">${caption}</figcaption>` : ''}
        </figure>
      `;
    }

    case 'HeroSpreadBlock':
    case 'MagazineHeroSpread': {
      const bg = p.backgroundImage || '';
      const kicker = p.kicker || '';
      const kickerColor = p.kickerColor || 'vermilion';
      const title = p.title || '';
      const subtitle = p.subtitle || '';
      const author = p.author || '';
      const opacity = (p.overlayOpacity ?? 45) / 100;
      const isDark = p.cardTheme === 'glass-dark';

      return `
        <section class="editorial-hero-spread hero-height-${p.height || 'md'}" style="background-image: url('${bg}');">
          <div class="hero-scrim-overlay scrim-${p.scrimGradient || 'bottom-up'}" style="opacity: ${opacity};"></div>
          <div class="hero-floating-card ${isDark ? 'card-glass-dark' : 'card-neo-white'}">
            ${kicker ? `<span class="hero-kicker kicker-${kickerColor}">${kicker}</span>` : ''}
            <h1 class="hero-title">${title}</h1>
            ${subtitle ? `<p class="hero-subtitle">${subtitle}</p>` : ''}
            ${author ? `<div class="hero-author"><span>${author}</span></div>` : ''}
          </div>
        </section>
      `;
    }

    case 'SplitContainer':
    case 'AdaptiveSplitContainer': {
      const ratio = p.desktopRatio || '60/40';
      const gap = p.gap || 'md';
      const divider = p.showDivider ? 'has-divider' : '';
      const reverse = p.reverseOnMobile ? 'reverse-mobile' : '';

      const leftCol = node.children[0] ? node.children[0].children.map(renderWebNode).join('\n') : '';
      const rightCol = node.children[1] ? node.children[1].children.map(renderWebNode).join('\n') : '';

      return `
        <div class="adaptive-split-container split-ratio-${ratio.replace('/', '-')} gap-${gap} ${divider} ${reverse}">
          <div class="split-column column-left">${leftCol}</div>
          <div class="split-column column-right">${rightCol}</div>
        </div>
      `;
    }

    case 'CalloutCardBlock':
    case 'CalloutCard': {
      const accent = p.accent || 'yellow';
      const title = p.title || '';
      const content = p.content || '';
      return `
        <aside class="editorial-callout accent-${accent}">
          <div class="callout-header"><span class="callout-title">${title}</span></div>
          <div class="callout-body">${content}</div>
        </aside>
      `;
    }

    case 'OrnamentDividerBlock':
    case 'OrnamentDivider': {
      const type = p.type || 'asterisms';
      const spacing = p.spacingY || 'md';
      return `<div class="editorial-ornament ornament-${type} spacing-${spacing}"><span>✦ ✦ ✦</span></div>`;
    }

    case 'AccordionBlock':
    case 'InteractiveAccordion': {
      const title = p.title || '';
      const badge = p.badge || '';
      const content = p.content || '';
      const accent = p.accent || 'yellow';
      const open = p.defaultOpen ? 'open' : '';

      return `
        <div class="interactive-accordion accent-${accent} ${open}">
          <button class="accordion-trigger" type="button">
            <div class="trigger-left">
              ${badge ? `<span class="accordion-badge">${badge}</span>` : ''}
              <span class="accordion-title">${title}</span>
            </div>
            <span class="accordion-icon">▼</span>
          </button>
          <div class="accordion-drawer"><div class="drawer-inner">${content}</div></div>
        </div>
      `;
    }

    case 'HotspotPinboardBlock':
    case 'HotspotPinboard': {
      const src = p.imageSrc || '';
      const alt = p.alt || '';
      const caption = p.caption || '';
      const pins: any[] = p.pins || [];

      return `
        <figure class="interactive-hotspot-pinboard">
          <div class="pinboard-canvas-wrapper">
            <img src="${src}" alt="${alt}" loading="lazy" />
            ${pins
              .map(
                (pin) => `
              <button class="hotspot-pin" style="left: ${pin.x}%; top: ${pin.y}%;" data-pin-id="${pin.id}" type="button">
                ${pin.number}
              </button>
              <div class="hotspot-popover" id="popover-${pin.id}" style="left: ${pin.x}%; top: ${pin.y}%;">
                <div class="popover-header"><strong>${pin.number}. ${pin.title}</strong><button class="popover-close" type="button">&times;</button></div>
                <div class="popover-body">${pin.description}</div>
              </div>
            `
              )
              .join('\n')}
          </div>
          ${caption ? `<figcaption class="editorial-caption">${caption}</figcaption>` : ''}
        </figure>
      `;
    }

    case 'VisualGalleryBlock':
    case 'VisualGallery': {
      const slides: any[] = p.slides || [];
      const desktopLayout = p.desktopLayout || 'grid-3';
      const ratio = p.aspectRatio || '4/3';

      return `
        <section class="editorial-gallery layout-${desktopLayout}">
          <div class="gallery-carousel-track">
            ${slides
              .map(
                (slide, idx) => `
              <div class="gallery-slide ${idx === 0 ? 'active' : ''}" data-slide-index="${idx}">
                <div class="slide-aspect-box aspect-${ratio.replace('/', '-')}">
                  <img src="${slide.imageSrc}" alt="${slide.title}" loading="lazy" />
                </div>
                <div class="slide-meta">
                  <h4 class="slide-title">${slide.title}</h4>
                  <p class="slide-caption">${slide.caption}</p>
                </div>
              </div>
            `
              )
              .join('\n')}
          </div>
          <div class="gallery-nav-controls">
            <button class="gallery-prev-btn" type="button">❮</button>
            <div class="gallery-dots">
              ${slides.map((_, idx) => `<span class="dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>`).join('')}
            </div>
            <button class="gallery-next-btn" type="button">❯</button>
          </div>
        </section>
      `;
    }

    case 'AudioNarrationBlock':
    case 'AudioNarration': {
      const src = p.audioSrc || '';
      const title = p.trackTitle || 'Audio Narration';
      const narrator = p.narrator || '';
      const duration = p.duration || '03:42';
      const cover = p.coverImage || '';
      const accent = p.accent || 'vermilion';

      return `
        <div class="editorial-audio-player accent-${accent}">
          ${src ? `<audio src="${src}" preload="none"></audio>` : ''}
          <div class="player-top">
            ${cover ? `<div class="player-cover"><img src="${cover}" alt="Artwork" /></div>` : ''}
            <div class="player-meta">
              <span class="player-title">${title}</span>
              <span class="player-narrator">${narrator}</span>
            </div>
          </div>
          <div class="player-controls">
            <button class="player-play-btn" type="button">▶</button>
            <div class="player-progress-bar"><div class="progress-fill" style="width: 0%;"></div></div>
            <span class="player-duration">${duration}</span>
          </div>
        </div>
      `;
    }

    default:
      return node.children.map(renderWebNode).join('\n');
  }
}

/**
 * Returns complete, self-contained CSS rules for the web publication.
 */
function getWebPublicationStyles(): string {
  return `
/* Base & Typography */
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
  color: #141414;
  background-color: #F4F1EA;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
.book-wrapper {
  max-width: 860px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
  background-color: #FFFFFF;
  min-height: 100vh;
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
}
@media (min-width: 1024px) {
  .book-wrapper { max-width: 980px; padding: 4rem 3rem; }
}

.editorial-h1 { font-family: "Space Grotesk", sans-serif; font-size: 2.25rem; font-weight: 700; line-height: 1.15; margin-bottom: 1rem; color: #141414; }
.editorial-h2 { font-family: "Space Grotesk", sans-serif; font-size: 1.75rem; font-weight: 700; line-height: 1.25; margin-top: 1.5rem; margin-bottom: 0.75rem; }
.editorial-h3 { font-family: "Space Grotesk", sans-serif; font-size: 1.35rem; font-weight: 600; margin-bottom: 0.5rem; }
.editorial-lead { font-size: 1.2rem; line-height: 1.65; color: #4A4A4A; margin-bottom: 1.25rem; }
.editorial-body { font-size: 1.05rem; line-height: 1.75; margin-bottom: 1.25rem; color: #2A2A2A; }
.editorial-pullquote {
  font-family: "Space Grotesk", sans-serif;
  font-size: 1.35rem;
  font-style: italic;
  border-left: 4px solid #141414;
  padding: 0.75rem 0 0.75rem 1.5rem;
  margin: 2rem 0;
  color: #141414;
}

/* Drop Cap */
.drop-cap-enabled::first-letter {
  float: left;
  font-family: "Space Grotesk", sans-serif;
  font-size: 3.8rem;
  line-height: 0.8;
  padding-top: 0.2rem;
  padding-right: 0.6rem;
  font-weight: 700;
  color: #FF5E3A;
  text-transform: uppercase;
}

/* Images & Scrim */
.editorial-image-figure { margin: 2rem 0; }
.editorial-image-figure.full-bleed { margin-left: -1.5rem; margin-right: -1.5rem; }
@media (min-width: 1024px) {
  .editorial-image-figure.full-bleed { margin-left: -3rem; margin-right: -3rem; }
}
.image-aspect-wrapper { overflow: hidden; position: relative; background: #eee; width: 100%; border-radius: 8px; }
.image-aspect-wrapper img { width: 100%; height: 100%; display: block; }
.aspect-1-1 { aspect-ratio: 1/1; }
.aspect-4-5 { aspect-ratio: 4/5; }
.aspect-16-9 { aspect-ratio: 16/9; }
.aspect-4-3 { aspect-ratio: 4/3; }
.image-frame-neo { border: 2px solid #141414; box-shadow: 4px 4px 0px #141414; }
.editorial-caption { font-family: "JetBrains Mono", monospace; font-size: 0.8rem; color: #666; text-align: center; margin-top: 0.5rem; }

/* Magazine Hero Spread */
.editorial-hero-spread {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  margin: 2rem 0;
  padding: 2rem;
  display: flex;
  align-items: flex-end;
}
.hero-height-sm { min-height: 280px; }
.hero-height-md { min-height: 400px; }
.hero-height-lg { min-height: 520px; }
.hero-scrim-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); pointer-events: none; }
.hero-floating-card {
  position: relative;
  z-index: 10;
  max-width: 520px;
  padding: 1.5rem;
  border-radius: 8px;
}
.card-neo-white { background: rgba(255,255,255,0.96); border: 2px solid #141414; box-shadow: 4px 4px 0px #141414; color: #141414; }
.card-glass-dark { background: rgba(20,20,20,0.85); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); color: #FFF; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.hero-kicker { font-family: "JetBrains Mono", monospace; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 0.5rem; color: #FF5E3A; }
.hero-title { font-family: "Space Grotesk", sans-serif; font-size: 1.8rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.5rem; }
.hero-subtitle { font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.75rem; opacity: 0.9; }
.hero-author { font-family: "JetBrains Mono", monospace; font-size: 0.8rem; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 0.5rem; opacity: 0.75; }

/* Adaptive Split Container */
.adaptive-split-container { display: flex; flex-direction: column; margin: 2rem 0; gap: 1.5rem; }
@media (min-width: 768px) {
  .adaptive-split-container { display: grid; }
  .split-ratio-50-50 { grid-template-columns: 1fr 1fr; }
  .split-ratio-60-40 { grid-template-columns: 3fr 2fr; }
  .split-ratio-40-60 { grid-template-columns: 2fr 3fr; }
  .split-ratio-70-30 { grid-template-columns: 7fr 3fr; }
  .split-ratio-30-70 { grid-template-columns: 3fr 7fr; }
}
.split-column { display: flex; flex-direction: column; gap: 1rem; }

/* Callout Box */
.editorial-callout {
  border: 2px solid #141414;
  border-radius: 8px;
  padding: 1.25rem;
  margin: 2rem 0;
  box-shadow: 3px 3px 0px #141414;
}
.accent-yellow { background-color: #FFF9DB; }
.accent-vermilion { background-color: #FFEAE4; border-color: #FF5E3A; }
.accent-teal { background-color: #E6FBF5; border-color: #3BCEAC; }
.accent-violet { background-color: #F5EDFD; border-color: #9B5DE5; }
.accent-ink { background-color: #141414; color: #FFFFFF; }
.callout-title { font-family: "JetBrains Mono", monospace; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.callout-body { margin-top: 0.5rem; font-size: 0.95rem; }

/* Ornament Divider */
.editorial-ornament { text-align: center; margin: 2.5rem 0; font-family: "JetBrains Mono", monospace; color: #141414; letter-spacing: 0.5em; font-weight: bold; }

/* Interactive Accordion */
.interactive-accordion { border: 2px solid #141414; border-radius: 8px; margin: 1.5rem 0; overflow: hidden; background: #fff; box-shadow: 3px 3px 0px #141414; }
.accordion-trigger { width: 100%; padding: 1rem 1.25rem; background: none; border: none; display: flex; align-items: center; justify-content: space-between; cursor: pointer; text-align: left; }
.accordion-badge { font-family: "JetBrains Mono", monospace; font-size: 0.7rem; font-weight: 700; background: #FFD23F; padding: 2px 6px; border-radius: 4px; border: 1px solid #141414; margin-right: 0.5rem; }
.accordion-title { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 1rem; color: #141414; }
.accordion-icon { transition: transform 0.2s ease; font-size: 0.75rem; }
.interactive-accordion.open .accordion-icon { transform: rotate(180deg); }
.accordion-drawer { display: none; padding: 1rem 1.25rem; border-top: 2px solid #141414; background: #FAF9F6; font-size: 0.95rem; }
.interactive-accordion.open .accordion-drawer { display: block; }

/* Hotspot Pinboard */
.interactive-hotspot-pinboard { position: relative; margin: 2rem 0; }
.pinboard-canvas-wrapper { position: relative; border: 2px solid #141414; border-radius: 8px; overflow: hidden; box-shadow: 4px 4px 0px #141414; }
.pinboard-canvas-wrapper img { width: 100%; display: block; }
.hotspot-pin {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #141414;
  background: #FFD23F;
  color: #141414;
  font-family: "JetBrains Mono", monospace;
  font-weight: 700;
  font-size: 0.8rem;
  transform: translate(-50%, -50%);
  cursor: pointer;
  box-shadow: 2px 2px 0px #141414;
  transition: transform 0.15s ease;
}
.hotspot-pin:hover { transform: translate(-50%, -50%) scale(1.15); background: #FF5E3A; color: #fff; }
.hotspot-popover {
  display: none;
  position: absolute;
  z-index: 50;
  width: 240px;
  background: #fff;
  border: 2px solid #141414;
  border-radius: 6px;
  padding: 0.75rem;
  box-shadow: 4px 4px 0px #141414;
  transform: translate(-50%, 15px);
}
.hotspot-popover.active { display: block; }
.popover-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 0.25rem; font-size: 0.85rem; font-family: "Space Grotesk", sans-serif; }
.popover-close { background: none; border: none; font-size: 1.1rem; cursor: pointer; }
.popover-body { font-size: 0.8rem; margin-top: 0.5rem; color: #555; }

/* Visual Gallery */
.editorial-gallery { margin: 2rem 0; }
.gallery-carousel-track { overflow: hidden; position: relative; border: 2px solid #141414; border-radius: 8px; background: #fff; box-shadow: 4px 4px 0px #141414; }
.gallery-slide { display: none; }
.gallery-slide.active { display: block; }
.slide-aspect-box { width: 100%; overflow: hidden; background: #000; }
.slide-aspect-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
.slide-meta { padding: 1rem; }
.slide-title { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 1rem; margin-bottom: 0.25rem; }
.slide-caption { font-size: 0.85rem; color: #666; }
.gallery-nav-controls { display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem; }
.gallery-prev-btn, .gallery-next-btn {
  background: #fff;
  border: 2px solid #141414;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 2px 2px 0px #141414;
}
.gallery-dots { display: flex; gap: 6px; }
.gallery-dots .dot { width: 8px; height: 8px; border-radius: 50%; background: #ccc; cursor: pointer; }
.gallery-dots .dot.active { background: #FF5E3A; width: 20px; border-radius: 4px; }

@media (min-width: 768px) {
  .editorial-gallery.layout-grid-3 .gallery-carousel-track {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    padding: 1rem;
  }
  .editorial-gallery.layout-grid-3 .gallery-slide { display: block; border: 1px solid #141414; border-radius: 6px; overflow: hidden; }
  .editorial-gallery.layout-grid-3 .gallery-nav-controls { display: none; }
}

/* Audio Player */
.editorial-audio-player {
  border: 2px solid #141414;
  border-radius: 10px;
  padding: 1rem;
  margin: 2rem 0;
  background: #fff;
  box-shadow: 4px 4px 0px #141414;
}
.player-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
.player-cover { width: 48px; height: 48px; border-radius: 6px; overflow: hidden; border: 2px solid #141414; }
.player-cover img { width: 100%; height: 100%; object-fit: cover; }
.player-title { display: block; font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 0.95rem; }
.player-narrator { font-family: "JetBrains Mono", monospace; font-size: 0.75rem; color: #666; }
.player-controls { display: flex; align-items: center; gap: 0.75rem; padding-top: 0.5rem; border-top: 1px solid #eee; }
.player-play-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #141414;
  background: #FF5E3A;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 2px 2px 0px #141414;
}
.player-progress-bar { flex: 1; height: 8px; background: #eee; border: 1px solid #141414; border-radius: 4px; overflow: hidden; cursor: pointer; }
.progress-fill { height: 100%; background: #141414; }
.player-duration { font-family: "JetBrains Mono", monospace; font-size: 0.75rem; font-weight: 700; }
`;
}

/**
 * Returns the zero-dependency vanilla JS runtime for web readers.
 */
function getWebRuntimeJs(): string {
  return `
document.addEventListener('DOMContentLoaded', function() {
  // 1. Accordion Drawer Toggles
  document.querySelectorAll('.interactive-accordion').forEach(function(acc) {
    var trigger = acc.querySelector('.accordion-trigger');
    if (trigger) {
      trigger.addEventListener('click', function() {
        acc.classList.toggle('open');
      });
    }
  });

  // 2. Hotspot Pinboard Popovers
  document.querySelectorAll('.interactive-hotspot-pinboard').forEach(function(board) {
    board.querySelectorAll('.hotspot-pin').forEach(function(pin) {
      pin.addEventListener('click', function(e) {
        e.stopPropagation();
        var pinId = pin.getAttribute('data-pin-id');
        var popover = board.querySelector('#popover-' + pinId);
        board.querySelectorAll('.hotspot-popover').forEach(function(p) { if (p !== popover) p.classList.remove('active'); });
        if (popover) popover.classList.toggle('active');
      });
    });

    board.querySelectorAll('.popover-close').forEach(function(closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeBtn.closest('.hotspot-popover').classList.remove('active');
      });
    });
  });

  document.addEventListener('click', function() {
    document.querySelectorAll('.hotspot-popover').forEach(function(p) { p.classList.remove('active'); });
  });

  // 3. Visual Gallery Carousel
  document.querySelectorAll('.editorial-gallery').forEach(function(gallery) {
    var slides = gallery.querySelectorAll('.gallery-slide');
    var dots = gallery.querySelectorAll('.gallery-dots .dot');
    var prevBtn = gallery.querySelector('.gallery-prev-btn');
    var nextBtn = gallery.querySelector('.gallery-next-btn');
    var currentIndex = 0;

    function showSlide(index) {
      if (slides.length === 0) return;
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      currentIndex = index;

      slides.forEach(function(s, idx) {
        s.classList.toggle('active', idx === currentIndex);
      });
      dots.forEach(function(d, idx) {
        d.classList.toggle('active', idx === currentIndex);
      });
    }

    if (prevBtn) prevBtn.addEventListener('click', function() { showSlide(currentIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { showSlide(currentIndex + 1); });
    dots.forEach(function(dot, idx) {
      dot.addEventListener('click', function() { showSlide(idx); });
    });
  });

  // 4. Audio Narration Player
  document.querySelectorAll('.editorial-audio-player').forEach(function(player) {
    var audio = player.querySelector('audio');
    var playBtn = player.querySelector('.player-play-btn');
    var progressFill = player.querySelector('.progress-fill');
    var isPlaying = false;

    if (playBtn) {
      playBtn.addEventListener('click', function() {
        if (!audio) {
          isPlaying = !isPlaying;
          playBtn.textContent = isPlaying ? '❚❚' : '▶';
          return;
        }
        if (audio.paused) {
          audio.play().then(function() {
            isPlaying = true;
            playBtn.textContent = '❚❚';
          });
        } else {
          audio.pause();
          isPlaying = false;
          playBtn.textContent = '▶';
        }
      });
    }

    if (audio) {
      audio.addEventListener('timeupdate', function() {
        if (audio.duration) {
          var pct = (audio.currentTime / audio.duration) * 100;
          if (progressFill) progressFill.style.width = pct + '%';
        }
      });
      audio.addEventListener('ended', function() {
        isPlaying = false;
        if (playBtn) playBtn.textContent = '▶';
      });
    }
  });
});
`;
}

/**
 * Compiles the entire project into a standalone single-file Web Publication bundle.
 */
export function compileWebPublication(project: BookProject, currentChapterId?: string): string {
  const activeChapterId = currentChapterId || project.activeChapterId;
  const chapter = project.chapters.find((c) => c.id === activeChapterId) || project.chapters[0];
  const parsedNodes = parseCraftState(chapter?.craftStateJson || '');

  const renderedContent = parsedNodes.map(renderWebNode).join('\n');

  return `<!DOCTYPE html>
<html lang="${project.metadata.language || 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${chapter ? chapter.title : project.title} — ${project.metadata.title}</title>
  <!-- Typography Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
  <style>
    ${getWebPublicationStyles()}
  </style>
</head>
<body>
  <div class="book-wrapper">
    <article>
      ${renderedContent}
    </article>
  </div>
  <script>
    ${getWebRuntimeJs()}
  </script>
</body>
</html>`;
}
