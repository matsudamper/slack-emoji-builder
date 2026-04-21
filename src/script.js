const textInput        = document.getElementById('text-input');
const fontSizeEl       = document.getElementById('font-size');
const fontSizeVal      = document.getElementById('font-size-value');
const fontAutoEl       = document.getElementById('font-size-auto');
const lineBreakEl      = document.getElementById('line-break');
const fontFamSel       = document.getElementById('font-family');
const textColorEl      = document.getElementById('text-color');
const bgColorEl        = document.getElementById('bg-color');
const textHexEl        = document.getElementById('text-color-hex');
const bgHexEl          = document.getElementById('bg-color-hex');
const borderSizeEl     = document.getElementById('border-size');
const borderSizeVal    = document.getElementById('border-size-value');
const borderColorEl    = document.getElementById('border-color');
const borderHexEl      = document.getElementById('border-color-hex');
const bgTransparentEl  = document.getElementById('bg-transparent');
const bgColorWrap      = document.getElementById('bg-color-wrap');
const generateBtn      = document.getElementById('generate-btn');
const previewSec       = document.getElementById('preview-section');
const canvasWrapDark   = document.getElementById('canvas-wrap-dark');
const canvasWrapLight  = document.getElementById('canvas-wrap-light');
const downloadLink     = document.getElementById('download-link');
const downloadBtn      = document.getElementById('download-btn');
const directionToggle  = document.getElementById('direction-toggle');
const directionIndicator = document.getElementById('direction-indicator');
const directionBtns    = directionToggle.querySelectorAll('.direction-btn');
const animationToggle  = document.getElementById('animation-toggle');
const animationBody    = document.getElementById('animation-body');
const animationCount   = document.getElementById('animation-count');
const animationClearBtn = document.getElementById('animation-clear-btn');
const animContainer    = document.getElementById('anim-container');

const BASE_SIZE = 128;
const STORAGE_KEY = 'slackEmojiBuilderSettings';
const DEFAULT_FONT_FAMILY = fontFamSel.options[0]?.value || 'sans-serif';
const LEGACY_FONT_FAMILY_MAP = {
  'sans-serif': DEFAULT_FONT_FAMILY,
  'serif': '"Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", serif',
  'monospace': '"DotGothic16", "Noto Sans JP", monospace',
  'Impact, sans-serif': '"Dela Gothic One", "Noto Sans JP", sans-serif',
};

let currentDirection = 'horizontal';

const animationManager = new AnimationManager({
  toggle: animationToggle,
  body: animationBody,
  count: animationCount,
  clearButton: animationClearBtn,
  container: animContainer,
  baseSize: BASE_SIZE,
  onChange: saveSettings,
});

function isFontFamilyOption(value) {
  return Array.from(fontFamSel.options).some(option => option.value === value);
}

function normalizeFontFamily(value) {
  const mapped = LEGACY_FONT_FAMILY_MAP[value] || value || DEFAULT_FONT_FAMILY;
  return isFontFamilyOption(mapped) ? mapped : DEFAULT_FONT_FAMILY;
}

function setFontFamily(value) {
  fontFamSel.value = normalizeFontFamily(value);
}

function getSelectedFontFamily() {
  return fontFamSel.value || DEFAULT_FONT_FAMILY;
}

async function waitForSelectedFontReady(sampleText) {
  if (!document.fonts?.load) return;
  const sample = sampleText || '日本語Aa';
  const fontFamily = getSelectedFontFamily();
  try {
    await Promise.all([
      document.fonts.load(`400 32px ${fontFamily}`, sample),
      document.fonts.load(`700 32px ${fontFamily}`, sample),
      document.fonts.ready,
    ]);
  } catch (_) { /* ignore font loading errors */ }
}

function getDirection() {
  return currentDirection;
}

function setDirection(dir) {
  currentDirection = dir;
  directionBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.direction === dir);
  });
  directionIndicator.classList.toggle('right', dir === 'vertical');
}

directionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    setDirection(btn.dataset.direction);
    saveSettings();
  });
});

function saveSettings() {
  const settings = {
    fontSize:      fontSizeEl.value,
    fontAuto:      fontAutoEl.checked,
    lineBreak:     lineBreakEl.checked,
    fontFamily:    getSelectedFontFamily(),
    textColor:     textColorEl.value,
    bgColor:       bgColorEl.value,
    bgTransparent: bgTransparentEl.checked,
    borderSize:    borderSizeEl.value,
    borderColor:   borderColorEl.value,
    direction:     currentDirection,
    ...animationManager.getStorageState(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (_) { /* ignore storage errors */ }
}

function loadSettings() {
  let settings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    settings = JSON.parse(raw);
  } catch (_) { return; }

  if (settings.fontSize !== undefined) {
    fontSizeEl.value = settings.fontSize;
    fontSizeVal.textContent = settings.fontSize;
  }
  if (settings.fontAuto !== undefined) {
    fontAutoEl.checked = settings.fontAuto;
    fontSizeEl.disabled = settings.fontAuto;
  }
  if (settings.lineBreak !== undefined) {
    lineBreakEl.checked = settings.lineBreak;
  }
  if (settings.fontFamily !== undefined) {
    setFontFamily(settings.fontFamily);
  }
  if (settings.textColor !== undefined) {
    textColorEl.value = settings.textColor;
    textHexEl.value = settings.textColor;
  }
  if (settings.bgColor !== undefined) {
    bgColorEl.value = settings.bgColor;
    bgHexEl.value = settings.bgColor;
  }
  if (settings.bgTransparent !== undefined) {
    bgTransparentEl.checked = settings.bgTransparent;
    applyBgTransparent();
  }
  if (settings.borderSize !== undefined) {
    borderSizeEl.value = settings.borderSize;
    borderSizeVal.textContent = settings.borderSize;
  }
  if (settings.borderColor !== undefined) {
    borderColorEl.value = settings.borderColor;
    borderHexEl.value = settings.borderColor;
  }
  if (settings.direction !== undefined) {
    setDirection(settings.direction);
  }
  animationManager.applyStorageState(settings);
}

loadSettings();

function applyBgTransparent() {
  const isTransparent = bgTransparentEl.checked;
  bgColorEl.disabled  = isTransparent;
  bgHexEl.disabled    = isTransparent;
  bgColorWrap.style.opacity = isTransparent ? '0.4' : '1';
}

// Initialize transparent state (default is checked in HTML)
applyBgTransparent();

bgTransparentEl.addEventListener('change', () => { applyBgTransparent(); saveSettings(); });

textColorEl.addEventListener('input', () => { textHexEl.value = textColorEl.value; saveSettings(); });
bgColorEl.addEventListener('input',   () => { bgHexEl.value   = bgColorEl.value;   saveSettings(); });
borderColorEl.addEventListener('input', () => { borderHexEl.value = borderColorEl.value; saveSettings(); });

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function expandHex(hex) {
  if (hex.length === 4) {
    return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex;
}

function syncHexInput(hexEl, colorEl) {
  const val = hexEl.value.trim();
  if (HEX_RE.test(val)) {
    hexEl.classList.remove('invalid');
    colorEl.value = expandHex(val);
    saveSettings();
  } else {
    hexEl.classList.add('invalid');
  }
}

textHexEl.addEventListener('input',    () => syncHexInput(textHexEl,   textColorEl));
bgHexEl.addEventListener('input',      () => syncHexInput(bgHexEl,     bgColorEl));
borderHexEl.addEventListener('input',  () => syncHexInput(borderHexEl, borderColorEl));
borderSizeEl.addEventListener('input', () => { borderSizeVal.textContent = borderSizeEl.value; saveSettings(); });

fontSizeEl.addEventListener('input', () => {
  fontSizeVal.textContent = fontSizeEl.value;
  saveSettings();
});

fontAutoEl.addEventListener('change', () => {
  fontSizeEl.disabled = fontAutoEl.checked;
  saveSettings();
});

lineBreakEl.addEventListener('change', () => { saveSettings(); });
fontFamSel.addEventListener('change',  () => { saveSettings(); });

// Initialize slider state
fontSizeEl.disabled = fontAutoEl.checked;

const FALLBACK_ASCENT_RATIO  = 0.8;
const FALLBACK_DESCENT_RATIO = 0.2;

function measureTightLine(ctx, line, fontSize) {
  const metrics = ctx.measureText(line || ' ');
  const ascent = metrics.actualBoundingBoxAscent
    ?? metrics.fontBoundingBoxAscent
    ?? fontSize * FALLBACK_ASCENT_RATIO;
  const descent = metrics.actualBoundingBoxDescent
    ?? metrics.fontBoundingBoxDescent
    ?? fontSize * FALLBACK_DESCENT_RATIO;

  return {
    ascent: Math.max(0, ascent),
    descent: Math.max(0, descent),
  };
}

function buildTightLineLayout(ctx, lines, fontSize, canvasSize, borderPadding) {
  const border = borderPadding || 0;
  const lineGap = border * 2;
  const lineMetrics = lines.map(line => measureTightLine(ctx, line, fontSize));
  const textHeight = lineMetrics.reduce((sum, metrics) => {
    return sum + metrics.ascent + metrics.descent;
  }, 0);
  const totalHeight = textHeight + Math.max(0, lines.length - 1) * lineGap + border * 2;
  let y = (canvasSize - totalHeight) / 2 + border;
  const baselines = lineMetrics.map((metrics, i) => {
    if (i > 0) y += lineGap;
    y += metrics.ascent;
    const baseline = y;
    y += metrics.descent;
    return baseline;
  });

  return { baselines, totalHeight };
}

function drawEmoji(size, fontSize, opts) {
  opts = opts || {};
  const unit = size / BASE_SIZE;
  const scaleX = opts.scaleX !== undefined ? opts.scaleX : 1;
  const scaleY = opts.scaleY !== undefined ? opts.scaleY : 1;
  const rotation = opts.rotation || 0;
  const translateX = (opts.translateX || 0) * unit;
  const translateY = (opts.translateY || 0) * unit;
  const outputPadding = opts.outputPadding || 0;

  const canvas = document.createElement('canvas');
  canvas.width  = size + outputPadding * 2;
  canvas.height = size + outputPadding * 2;
  const ctx = canvas.getContext('2d');

  ctx.save();
  if (outputPadding) ctx.translate(outputPadding, outputPadding);

  ctx.fillStyle = opts.bgColor || bgColorEl.value;
  if (!opts.skipBackground && !bgTransparentEl.checked) {
    ctx.fillRect(0, 0, size, size);
  }

  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  ctx.translate(size / 2 + translateX, size / 2 + translateY);
  if (rotation) ctx.rotate(rotation * Math.PI / 180);
  if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
  ctx.translate(-size / 2, -size / 2);

  const scaledFontSize = Math.round(fontSize * (size / BASE_SIZE));
  ctx.font = `bold ${scaledFontSize}px ${getSelectedFontFamily()}`;

  const drawOpts = {
    text: opts.text !== undefined ? opts.text : getBaseText(),
    textColor: opts.textColor || textColorEl.value,
    borderColor: opts.borderColor || borderColorEl.value,
  };

  if (opts.glitch) {
    drawGlitchText(ctx, size, scaledFontSize, drawOpts, opts);
  } else {
    drawTextLayer(ctx, size, scaledFontSize, drawOpts);
  }

  ctx.restore();
  ctx.restore();
  return canvas;
}

function getBaseText() {
  return textInput.value.trim() || ' ';
}

function drawTextLayer(ctx, size, scaledFontSize, drawOpts) {
  if (getDirection() === 'vertical') {
    drawVerticalText(ctx, size, scaledFontSize, drawOpts);
  } else {
    drawHorizontalText(ctx, size, scaledFontSize, drawOpts);
  }
}

function drawGlitchText(ctx, size, scaledFontSize, drawOpts, opts) {
  const unit = size / BASE_SIZE;
  const seed = opts.glitchSeed || 0;
  const amount = opts.glitchAmount || 1;
  const shiftA = ((seed % 3) + 2) * unit * amount;
  const shiftB = (((seed + 1) % 3) + 1) * unit * amount;

  ctx.save();
  ctx.globalAlpha *= 0.55;
  ctx.translate(-shiftA, 0);
  drawTextLayer(ctx, size, scaledFontSize, {
    ...drawOpts,
    textColor: '#ff3bd5',
    skipBorder: true,
  });
  ctx.restore();

  ctx.save();
  ctx.globalAlpha *= 0.55;
  ctx.translate(shiftB, 0);
  drawTextLayer(ctx, size, scaledFontSize, {
    ...drawOpts,
    textColor: '#00e5ff',
    skipBorder: true,
  });
  ctx.restore();

  drawTextLayer(ctx, size, scaledFontSize, drawOpts);

  for (let i = 0; i < 2; i++) {
    const bandY = (((seed * 23) + i * 41) % BASE_SIZE) * unit;
    const bandH = (7 + ((seed + i) % 5)) * unit;
    const bandShift = (i === 0 ? 1 : -1) * (4 + (seed % 4)) * unit * amount;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, bandY, size, bandH);
    ctx.clip();
    ctx.translate(bandShift, 0);
    drawTextLayer(ctx, size, scaledFontSize, drawOpts);
    ctx.restore();
  }
}

function drawHorizontalText(ctx, size, scaledFontSize, drawOpts) {
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';

  const borderSize = parseInt(borderSizeEl.value, 10);
  const scaledBorder = Math.round(borderSize * (size / BASE_SIZE));
  const availableWidth = Math.max(1, size - scaledBorder * 2);
  const text = drawOpts.text || ' ';
  const lines = getLines(ctx, text, availableWidth, lineBreakEl.checked);

  const { baselines } = buildTightLineLayout(ctx, lines, scaledFontSize, size, scaledBorder);

  if (scaledBorder > 0 && !drawOpts.skipBorder) {
    ctx.strokeStyle = drawOpts.borderColor;
    ctx.lineWidth   = scaledBorder * 2;
    ctx.lineJoin    = 'round';
    ctx.miterLimit  = 2;
    lines.forEach((line, i) => {
      ctx.strokeText(line, size / 2, baselines[i]);
    });
  }

  ctx.fillStyle = drawOpts.textColor;
  lines.forEach((line, i) => {
    ctx.fillText(line, size / 2, baselines[i]);
  });
}

function drawVerticalText(ctx, size, scaledFontSize, drawOpts) {
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const text = drawOpts.text || ' ';
  const columns = getVerticalColumns(text, lineBreakEl.checked);
  const charHeight = scaledFontSize * 1.15;
  const colWidth = scaledFontSize * 1.15;
  const totalWidth = columns.length * colWidth;

  // Columns go right-to-left in vertical writing
  const startX = (size + totalWidth) / 2 - colWidth / 2;

  const borderSize = parseInt(borderSizeEl.value, 10);

  columns.forEach((col, ci) => {
    const chars = [...col];
    const totalColHeight = chars.length * charHeight;
    const colStartY = (size - totalColHeight) / 2 + charHeight / 2;
    const x = startX - ci * colWidth;

    chars.forEach((ch, ri) => {
      const y = colStartY + ri * charHeight;

      if (borderSize > 0 && !drawOpts.skipBorder) {
        const scaledBorder = Math.round(borderSize * (size / BASE_SIZE));
        ctx.strokeStyle = drawOpts.borderColor;
        ctx.lineWidth   = scaledBorder * 2;
        ctx.lineJoin    = 'round';
        ctx.miterLimit  = 2;
        ctx.strokeText(ch, x, y);
      }

      ctx.fillStyle = drawOpts.textColor;
      ctx.fillText(ch, x, y);
    });
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const probe = current ? current + ' ' + word : word;
    if (ctx.measureText(probe).width <= maxWidth) {
      current = probe;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [' '];
}

// Split text into two lines using ceil(n/2) / floor(n/2) when n >= 3.
// Uses Unicode-aware character counting so that multi-byte characters and
// emoji are each treated as one unit.
function splitTextIntoLines(text) {
  const chars = [...text];
  const n = chars.length;
  if (n < 3) return [text];
  const firstCount = Math.ceil(n / 2);
  return [
    chars.slice(0, firstCount).join(''),
    chars.slice(firstCount).join(''),
  ];
}

function getLines(ctx, text, maxWidth, lineBreakEnabled) {
  if (lineBreakEnabled) {
    return splitTextIntoLines(text);
  }
  return wrapText(ctx, text, maxWidth);
}

// Split text into vertical columns using ceil(n/2) / floor(n/2) when n >= 3.
// Each column is a string of characters drawn top-to-bottom. Columns are
// rendered right-to-left. Mirrors splitTextIntoLines for horizontal mode.
function getVerticalColumns(text, lineBreakEnabled) {
  const chars = [...text];
  if (!lineBreakEnabled || chars.length < 3) return [text];
  const firstCount = Math.ceil(chars.length / 2);
  return [
    chars.slice(0, firstCount).join(''),
    chars.slice(firstCount).join(''),
  ];
}

function calculateAutoFontSize(text, fontFamily, canvasSize, borderSize, lineBreakEnabled) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');

  // Reserve space for the border on both sides so it does not overflow.
  const available = canvasSize - borderSize * 2;
  const isVertical = getDirection() === 'vertical';

  let lo = 1, hi = canvasSize;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    ctx.font = `bold ${mid}px ${fontFamily}`;

    let fits;
    if (isVertical) {
      const columns = getVerticalColumns(text, lineBreakEnabled);
      const charHeight = mid * 1.15;
      const colWidth = mid * 1.15;
      const totalWidth = columns.length * colWidth;
      const maxColChars = Math.max(...columns.map(c => [...c].length));
      const totalHeight = maxColChars * charHeight;
      fits = totalWidth <= available && totalHeight <= available;
    } else {
      const lines = getLines(ctx, text, available, lineBreakEnabled);
      const { totalHeight } = buildTightLineLayout(ctx, lines, mid, canvasSize, borderSize);

      let allLinesFit = true;
      for (const line of lines) {
        if (ctx.measureText(line).width > available) {
          allLinesFit = false;
          break;
        }
      }
      fits = totalHeight <= canvasSize && allLinesFit;
    }

    if (fits) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

generateBtn.addEventListener('click', async () => {
  if (!textInput.value.trim()) {
    textInput.focus();
    return;
  }

  const text = textInput.value.trim();
  await waitForSelectedFontReady(text);

  let fontSize;

  if (fontAutoEl.checked) {
    const borderSize = parseInt(borderSizeEl.value, 10);
    fontSize = calculateAutoFontSize(text, getSelectedFontFamily(), BASE_SIZE, borderSize, lineBreakEl.checked);
    fontSizeEl.value = fontSize;
    fontSizeVal.textContent = fontSize;
  } else {
    fontSize = parseInt(fontSizeEl.value, 10);
  }

  canvasWrapDark.innerHTML = '';
  canvasWrapLight.innerHTML = '';

  const animated = animationManager.isEnabled();
  const animationLayout = animated ? animationManager.buildLayout(fontSize, drawEmoji, text) : null;

  const sizes = [
    { size: BASE_SIZE, label: '128×128' },
    { size: 64,        label: '64×64'   },
    { size: 32,        label: '32×32'   },
  ];

  [canvasWrapDark, canvasWrapLight].forEach(wrap => {
    sizes.forEach(({ size, label }) => {
      if (animated) {
        const gif = animationManager.buildGif(size, fontSize, animationLayout, drawEmoji, text);
        const img = document.createElement('img');
        img.src = gif.toDataURL();
        img.title = label;
        img.width = size;
        img.height = size;

        const box = document.createElement('div');
        box.className = 'size-box';

        const tag = document.createElement('span');
        tag.className = 'size-tag';
        tag.textContent = label;

        box.appendChild(img);
        box.appendChild(tag);
        wrap.appendChild(box);
      } else {
        const canvas = drawEmoji(size, fontSize);
        canvas.title = label;

        const box = document.createElement('div');
        box.className = 'size-box';

        const tag = document.createElement('span');
        tag.className = 'size-tag';
        tag.textContent = label;

        box.appendChild(canvas);
        box.appendChild(tag);
        wrap.appendChild(box);
      }
    });
  });

  const safeName = textInput.value.trim().replace(/[/\\:*?"<>|]/g, '_') || 'emoji';

  if (animated) {
    const mainGif = animationManager.buildGif(BASE_SIZE, fontSize, animationLayout, drawEmoji, text);
    downloadLink.href = mainGif.toDataURL();
    downloadLink.download = safeName + '.gif';
    downloadBtn.textContent = 'Download GIF (128×128)';
  } else {
    const mainCanvas = drawEmoji(BASE_SIZE, fontSize);
    downloadLink.href = mainCanvas.toDataURL('image/png');
    downloadLink.download = safeName + '.png';
    downloadBtn.textContent = 'Download PNG (128×128)';
  }

  downloadBtn.disabled = false;
});
