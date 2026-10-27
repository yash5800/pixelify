// src/components/bgremove/DesignAssets.ts
// Professional vector elements, badges, stickers, and canvas export helpers

export interface TextLayer {
  id: string;
  text: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  fontSize: number; // px at standard scale (1 - 1000)
  fontFamily: string;
  fontWeight: 'normal' | '600' | 'bold' | '900';
  italic?: boolean;
  underline?: boolean;
  letterSpacing?: number; // px
  lineHeight?: number; // multiplier e.g. 1.25
  uppercase?: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
  bgPill?: 'none' | 'black' | 'mint' | 'white' | 'crimson' | 'sky' | 'amber';
  shadow?: boolean;
  glow?: boolean;
}

export interface FontPreset {
  id: string;
  label: string;
  category: 'sans' | 'serif' | 'display' | 'script' | 'mono' | 'custom';
  css: string;
  isCustom?: boolean;
}

export interface ElementLayer {
  id: string;
  type: 'badge' | 'shape' | 'sticker';
  name: string;
  key: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  size: number; // px width
  color: string;
  rotation: number; // degrees 0 - 360
  opacity: number; // 0 - 1
  badgeText?: string;
  badgeSubtext?: string;
}

export interface ElementPreset {
  key: string;
  name: string;
  type: 'badge' | 'shape' | 'sticker';
  category: 'badges' | 'shapes' | 'stickers';
  defaultColor: string;
  defaultSize: number;
  badgeText?: string;
  path?: string; // SVG path d (viewBox 0 0 24 24)
}

export const FONT_FAMILIES: FontPreset[] = [
  // --- MODERN SANS ---
  { id: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'sans', css: "'Plus Jakarta Sans', sans-serif" },
  { id: 'Inter', label: 'Inter', category: 'sans', css: "'Inter', sans-serif" },
  { id: 'Outfit', label: 'Outfit', category: 'sans', css: "'Outfit', sans-serif" },
  { id: 'Montserrat', label: 'Montserrat', category: 'sans', css: "'Montserrat', sans-serif" },
  { id: 'Poppins', label: 'Poppins', category: 'sans', css: "'Poppins', sans-serif" },
  { id: 'Space Grotesk', label: 'Space Grotesk', category: 'sans', css: "'Space Grotesk', sans-serif" },
  { id: 'Syne', label: 'Syne', category: 'sans', css: "'Syne', sans-serif" },
  { id: 'Lexend', label: 'Lexend', category: 'sans', css: "'Lexend', sans-serif" },

  // --- LUXURY & EDITORIAL SERIF ---
  { id: 'Playfair Display', label: 'Playfair Display', category: 'serif', css: "'Playfair Display', serif" },
  { id: 'Cinzel', label: 'Cinzel', category: 'serif', css: "'Cinzel', serif" },
  { id: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'serif', css: "'Cormorant Garamond', serif" },
  { id: 'Merriweather', label: 'Merriweather', category: 'serif', css: "'Merriweather', serif" },
  { id: 'DM Serif Display', label: 'DM Serif Display', category: 'serif', css: "'DM Serif Display', serif" },

  // --- BOLD & DISPLAY HEADLINE ---
  { id: 'Bebas Neue', label: 'Bebas Neue', category: 'display', css: "'Bebas Neue', Impact, sans-serif" },
  { id: 'Anton', label: 'Anton', category: 'display', css: "'Anton', sans-serif" },
  { id: 'Impact', label: 'Impact', category: 'display', css: "Impact, 'Arial Black', sans-serif" },
  { id: 'Righteous', label: 'Righteous', category: 'display', css: "'Righteous', cursive" },
  { id: 'Bungee', label: 'Bungee', category: 'display', css: "'Bungee', cursive" },
  { id: 'Russo One', label: 'Russo One', category: 'display', css: "'Russo One', sans-serif" },
  { id: 'Orbitron', label: 'Orbitron', category: 'display', css: "'Orbitron', sans-serif" },

  // --- SCRIPT & HANDWRITING ---
  { id: 'Pacifico', label: 'Pacifico', category: 'script', css: "'Pacifico', cursive" },
  { id: 'Dancing Script', label: 'Dancing Script', category: 'script', css: "'Dancing Script', cursive" },
  { id: 'Caveat', label: 'Caveat', category: 'script', css: "'Caveat', cursive" },
  { id: 'Satisfy', label: 'Satisfy', category: 'script', css: "'Satisfy', cursive" },

  // --- DEVELOPER MONOSPACE ---
  { id: 'JetBrains Mono', label: 'JetBrains Mono', category: 'mono', css: "'JetBrains Mono', monospace" },
  { id: 'Space Mono', label: 'Space Mono', category: 'mono', css: "'Space Mono', monospace" },
  { id: 'Fira Code', label: 'Fira Code', category: 'mono', css: "'Fira Code', monospace" },
  { id: 'Courier New', label: 'Courier New', category: 'mono', css: "'Courier New', monospace" },
];

export const COLOR_PALETTE = [
  '#FFFFFF', // White
  '#00FF85', // Mint / Brand Green
  '#38BDF8', // Sky Blue
  '#F43F5E', // Rose / Red
  '#F59E0B', // Amber / Gold
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#09090D', // Midnight Black
];

export const TEXT_PRESETS = [
  { label: '50% OFF', text: '50% OFF', fontSize: 42, fontWeight: '900', color: '#00FF85', bgPill: 'black' },
  { label: 'NEW ARRIVAL', text: 'NEW ARRIVAL', fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', bgPill: 'none' },
  { label: 'LIMITED EDITION', text: 'LIMITED EDITION', fontSize: 26, fontWeight: '600', color: '#38BDF8', bgPill: 'black' },
  { label: 'BESTSELLER', text: '★ BESTSELLER', fontSize: 28, fontWeight: 'bold', color: '#F59E0B', bgPill: 'black' },
  { label: 'VERIFIED ✓', text: 'VERIFIED ✓', fontSize: 24, fontWeight: 'bold', color: '#38BDF8', bgPill: 'none' },
  { label: 'PRO STUDIO', text: 'PRO STUDIO', fontSize: 34, fontWeight: '900', color: '#FFFFFF', bgPill: 'mint' },
];

export const ELEMENT_PRESETS: ElementPreset[] = [
  // --- BADGES ---
  {
    key: 'badge-50-off',
    name: '50% OFF',
    type: 'badge',
    category: 'badges',
    defaultColor: '#00FF85',
    defaultSize: 120,
    badgeText: '50% OFF',
  },
  {
    key: 'badge-new',
    name: 'NEW',
    type: 'badge',
    category: 'badges',
    defaultColor: '#38BDF8',
    defaultSize: 90,
    badgeText: 'NEW',
  },
  {
    key: 'badge-hot',
    name: 'HOT DEAL 🔥',
    type: 'badge',
    category: 'badges',
    defaultColor: '#F43F5E',
    defaultSize: 130,
    badgeText: 'HOT DEAL 🔥',
  },
  {
    key: 'badge-verified',
    name: 'VERIFIED ✓',
    type: 'badge',
    category: 'badges',
    defaultColor: '#38BDF8',
    defaultSize: 120,
    badgeText: 'VERIFIED ✓',
  },
  {
    key: 'badge-bestseller',
    name: '★ BESTSELLER',
    type: 'badge',
    category: 'badges',
    defaultColor: '#F59E0B',
    defaultSize: 140,
    badgeText: '★ BESTSELLER',
  },
  {
    key: 'badge-premium',
    name: 'PREMIUM ✦',
    type: 'badge',
    category: 'badges',
    defaultColor: '#A855F7',
    defaultSize: 125,
    badgeText: 'PREMIUM ✦',
  },

  // --- SHAPES ---
  {
    key: 'star',
    name: '5-Point Star',
    type: 'shape',
    category: 'shapes',
    defaultColor: '#F59E0B',
    defaultSize: 64,
    path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    key: 'heart',
    name: 'Heart',
    type: 'shape',
    category: 'shapes',
    defaultColor: '#F43F5E',
    defaultSize: 64,
    path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  },
  {
    key: 'sparkle',
    name: 'Sparkle Burst',
    type: 'shape',
    category: 'shapes',
    defaultColor: '#00FF85',
    defaultSize: 64,
    path: 'M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z',
  },
  {
    key: 'circle',
    name: 'Circle Ring',
    type: 'shape',
    category: 'shapes',
    defaultColor: '#00FF85',
    defaultSize: 64,
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  },
  {
    key: 'hexagon',
    name: 'Hexagon',
    type: 'shape',
    category: 'shapes',
    defaultColor: '#38BDF8',
    defaultSize: 64,
    path: 'M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z',
  },
  {
    key: 'bubble',
    name: 'Speech Bubble',
    type: 'shape',
    category: 'shapes',
    defaultColor: '#FFFFFF',
    defaultSize: 64,
    path: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
  },
  {
    key: 'arrow',
    name: 'Arrow Pointer',
    type: 'shape',
    category: 'shapes',
    defaultColor: '#00FF85',
    defaultSize: 64,
    path: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z',
  },

  // --- STICKERS ---
  {
    key: 'flame',
    name: 'Flame',
    type: 'sticker',
    category: 'stickers',
    defaultColor: '#F59E0B',
    defaultSize: 64,
    path: 'M12 23c-4.97 0-9-4.03-9-9 0-3.9 2.5-7.3 6-8.5-.2 1.5.3 3 1.5 4 1.2-3 4-5.5 4-8.5 3 2.5 6.5 6.5 6.5 11 0 6.07-4.03 11-9 11z',
  },
  {
    key: 'crown',
    name: 'Crown',
    type: 'sticker',
    category: 'stickers',
    defaultColor: '#F59E0B',
    defaultSize: 64,
    path: 'M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1s.45-1 1-1h12c.55 0 1 .45 1 1z',
  },
  {
    key: 'shield',
    name: 'Shield',
    type: 'sticker',
    category: 'stickers',
    defaultColor: '#38BDF8',
    defaultSize: 64,
    path: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  },
  {
    key: 'lightning',
    name: 'Lightning',
    type: 'sticker',
    category: 'stickers',
    defaultColor: '#F59E0B',
    defaultSize: 64,
    path: 'M7 2v11h3v9l7-12h-4l4-8H7z',
  },
  {
    key: 'trophy',
    name: 'Trophy',
    type: 'sticker',
    category: 'stickers',
    defaultColor: '#00FF85',
    defaultSize: 64,
    path: 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1c1.86-.46 3.29-1.99 3.61-3.96C19.08 11.63 21 9.55 21 7V6c0-1.1-.9-1-2-1zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z',
  },
  {
    key: 'gift',
    name: 'Gift Box',
    type: 'sticker',
    category: 'stickers',
    defaultColor: '#EC4899',
    defaultSize: 64,
    path: 'M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.65-.5-.65C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1h-2V5c0-.55.45-1 1-1zM9 4c.55 0 1 .45 1 1v1H8c0-.55.45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76V14h2V8.76L15.38 12 17 10.83 14.92 8H20v6z',
  },
];

/**
 * Draws a rounded rectangle path on a canvas 2D context
 */
export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Renders all design text and element layers onto a target canvas 2D context.
 * Uses baseWidth (the preview artboard width) to scale all dimensions identically
 * to how they appeared on the screen preview.
 */
export function renderDesignLayersToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  textLayers: TextLayer[],
  elementLayers: ElementLayer[],
  baseWidth?: number
) {
  // If baseWidth is provided, scale is strictly width / baseWidth.
  // Otherwise fall back to base 800 standard.
  const scale = baseWidth && baseWidth > 0 ? width / baseWidth : Math.max(0.5, width / 800);

  // 1. RENDER ELEMENT LAYERS
  elementLayers.forEach((el) => {
    ctx.save();
    const pixelX = (el.x / 100) * width;
    const pixelY = (el.y / 100) * height;
    const pixelSize = el.size * scale;

    ctx.translate(pixelX, pixelY);
    if (el.rotation) {
      ctx.rotate((el.rotation * Math.PI) / 180);
    }
    ctx.globalAlpha = el.opacity ?? 1;

    if (el.type === 'badge') {
      // Draw badge pill
      const text = el.badgeText || el.name;
      const fontSize = Math.round(el.size * 0.22 * scale);
      ctx.font = `900 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
      const textWidth = ctx.measureText(text).width;
      const padX = 16 * scale;
      const padY = 8 * scale;
      const pillW = textWidth + padX * 2;
      const pillH = fontSize + padY * 2;
      const radius = pillH / 2;

      // Outer glow / shadow
      ctx.shadowColor = el.color + '66';
      ctx.shadowBlur = 20 * scale;
      ctx.shadowOffsetY = 0;

      // Badge background
      ctx.fillStyle = '#09090D';
      drawRoundRect(ctx, -pillW / 2, -pillH / 2, pillW, pillH, radius);
      ctx.fill();

      // Badge border
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1, Math.round(2 * scale));
      ctx.strokeStyle = el.color;
      ctx.stroke();

      // Badge text
      ctx.fillStyle = el.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 1 * scale);
    } else {
      // Draw shape / sticker from SVG path
      const preset = ELEMENT_PRESETS.find((p) => p.key === el.key);
      if (preset?.path) {
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10 * scale;
        ctx.shadowOffsetY = 4 * scale;

        // Path is in 24x24 box
        const pathScale = pixelSize / 24;
        ctx.scale(pathScale, pathScale);
        ctx.translate(-12, -12); // Center path around 0,0

        const path2d = new Path2D(preset.path);
        ctx.fillStyle = el.color;
        ctx.fill(path2d);
      }
    }
    ctx.restore();
  });

  // 2. RENDER TEXT LAYERS
  textLayers.forEach((tl) => {
    ctx.save();
    const pixelX = (tl.x / 100) * width;
    const pixelY = (tl.y / 100) * height;
    const scaledFontSize = Math.round(tl.fontSize * scale);

    const fontFamily = tl.fontFamily?.trim() || 'Plus Jakarta Sans';
    const matchedFont = FONT_FAMILIES.find((f) => f.id === tl.fontFamily);
    const fontCss = matchedFont ? matchedFont.css : `'${fontFamily}', sans-serif`;
    const fontStyle = tl.italic ? 'italic ' : '';
    const fontWeight = tl.fontWeight || 'bold';
    ctx.font = `${fontStyle}${fontWeight} ${scaledFontSize}px ${fontCss}`;

    if (tl.letterSpacing && 'letterSpacing' in ctx) {
      (ctx as any).letterSpacing = `${tl.letterSpacing * scale}px`;
    }

    const textToRender = tl.uppercase ? tl.text.toUpperCase() : tl.text;
    const lines = textToRender.split('\n');
    const lineMultiplier = tl.lineHeight || 1.25;
    const lineHeight = scaledFontSize * lineMultiplier;
    const totalTextHeight = lines.length * lineHeight;

    let maxLineWidth = 0;
    lines.forEach((line) => {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });

    const padX = 12 * scale;
    const padY = 4 * scale;
    const pillW = maxLineWidth + padX * 2;
    const pillH = totalTextHeight + padY * 2;
    const radius = Math.min(pillH / 2, 12 * scale);

    // Optional background pill
    if (tl.bgPill && tl.bgPill !== 'none') {
      ctx.save();
      let pillColor = 'rgba(9, 9, 13, 0.85)';
      if (tl.bgPill === 'mint') pillColor = '#00FF85';
      if (tl.bgPill === 'white') pillColor = '#FFFFFF';
      if (tl.bgPill === 'crimson') pillColor = '#F43F5E';
      if (tl.bgPill === 'sky') pillColor = '#38BDF8';
      if (tl.bgPill === 'amber') pillColor = '#F59E0B';
      if (tl.bgPill === 'black') pillColor = 'rgba(9, 9, 13, 0.85)';

      ctx.fillStyle = pillColor;
      drawRoundRect(ctx, pixelX - pillW / 2, pixelY - pillH / 2, pillW, pillH, radius);
      ctx.fill();
      ctx.restore();
    }

    // Glow or Shadow
    if (tl.glow) {
      ctx.shadowColor = tl.color || '#00FF85';
      ctx.shadowBlur = 24 * scale;
      ctx.shadowOffsetY = 0;
    } else if (tl.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 14 * scale;
      ctx.shadowOffsetY = 4 * scale;
    }

    ctx.fillStyle = tl.color || '#FFFFFF';
    ctx.textBaseline = 'middle';

    // Draw each line so that overall block is centered at (pixelX, pixelY)
    lines.forEach((line, i) => {
      const lineY = pixelY - totalTextHeight / 2 + (i + 0.5) * lineHeight;
      const lineWidth = ctx.measureText(line).width;
      let lineX = pixelX;

      if (tl.align === 'left') {
        ctx.textAlign = 'left';
        lineX = pixelX - maxLineWidth / 2;
        ctx.fillText(line, lineX, lineY);
      } else if (tl.align === 'right') {
        ctx.textAlign = 'right';
        lineX = pixelX + maxLineWidth / 2;
        ctx.fillText(line, lineX, lineY);
      } else {
        ctx.textAlign = 'center';
        lineX = pixelX;
        ctx.fillText(line, lineX, lineY);
      }

      // Underline support
      if (tl.underline) {
        ctx.save();
        ctx.fillStyle = tl.color || '#FFFFFF';
        const underlineThickness = Math.max(1, Math.round(scaledFontSize * 0.07));
        const underlineY = lineY + scaledFontSize * 0.45;
        let underlineStartX = lineX;
        if (tl.align === 'center') {
          underlineStartX = lineX - lineWidth / 2;
        } else if (tl.align === 'right') {
          underlineStartX = lineX - lineWidth;
        }
        ctx.fillRect(underlineStartX, underlineY, lineWidth, underlineThickness);
        ctx.restore();
      }
    });

    ctx.restore();
  });
}
