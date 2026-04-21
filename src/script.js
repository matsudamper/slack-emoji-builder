const textInput      = document.getElementById('text-input');
const fontSizeEl     = document.getElementById('font-size');
const fontSizeVal    = document.getElementById('font-size-value');
const fontAutoEl     = document.getElementById('font-size-auto');
const lineBreakEl    = document.getElementById('line-break');
const fontFamSel     = document.getElementById('font-family');
const textColorEl    = document.getElementById('text-color');
const bgColorEl      = document.getElementById('bg-color');
const textHexEl      = document.getElementById('text-color-hex');
const bgHexEl        = document.getElementById('bg-color-hex');
const borderSizeEl   = document.getElementById('border-size');
const borderSizeVal  = document.getElementById('border-size-value');
const borderColorEl  = document.getElementById('border-color');
const borderHexEl    = document.getElementById('border-color-hex');
const bgTransparentEl = document.getElementById('bg-transparent');
const bgColorWrap     = document.getElementById('bg-color-wrap');

const generateBtn    = document.getElementById('generate-btn');
const previewSec     = document.getElementById('preview-section');
const canvasWrap     = document.getElementById('canvas-wrap');
const downloadLink   = document.getElementById('download-link');
const downloadBtn    = document.getElementById('download-btn');

const STORAGE_KEY = 'slackEmojiBuilderSettings';

function saveSettings() {
  const settings = {
    fontSize:      fontSizeEl.value,
    fontAuto:      fontAutoEl.checked,
    lineBreak:     lineBreakEl.checked,
    fontFamily:    fontFamSel.value,
    textColor:     textColorEl.value,
    bgColor:       bgColorEl.value,
    bgTransparent: bgTransparentEl.checked,
    borderSize:    borderSizeEl.value,
    borderColor:   borderColorEl.value,
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
    fontFamSel.value = settings.fontFamily;
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

const BASE_SIZE = 128;

function drawEmoji(size, fontSize) {
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColorEl.value;
  if (!bgTransparentEl.checked) {
    ctx.fillRect(0, 0, size, size);
  }

  const scaledFontSize = Math.round(fontSize * (size / BASE_SIZE));
  ctx.font = `bold ${scaledFontSize}px ${fontFamSel.value}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';

  const text = textInput.value.trim() || ' ';
  const lines = getLines(ctx, text, size, lineBreakEl.checked);
  const lineHeight = scaledFontSize * 1.2;
  const totalHeight = lines.length * lineHeight;

  // Use font metrics so the visual centre of the text block lands at the canvas
  // centre.  textBaseline='middle' positions y at the em-box centre, which sits
  // above the visual centre of most glyphs; switching to 'alphabetic' and
  // computing the baseline from fontBoundingBoxAscent/Descent corrects this.
  //
  // Measure against a string that covers typical cap-height and descender
  // extent so the metrics are stable regardless of the actual text content.
  const FALLBACK_ASCENT_RATIO  = 0.8; // typical ratio of ascent  to font size
  const FALLBACK_DESCENT_RATIO = 0.2; // typical ratio of descent to font size
  const metrics = ctx.measureText('Aq');
  const ascent  = metrics.fontBoundingBoxAscent  ?? scaledFontSize * FALLBACK_ASCENT_RATIO;
  const descent = metrics.fontBoundingBoxDescent ?? scaledFontSize * FALLBACK_DESCENT_RATIO;
  // The visual centre of the font box is (ascent - descent) / 2 above the
  // alphabetic baseline.  startY is the baseline of the first line positioned
  // so the entire block is vertically centred.
  const startY = (size - totalHeight) / 2 + lineHeight / 2 + (ascent - descent) / 2;

  const borderSize = parseInt(borderSizeEl.value, 10);
  if (borderSize > 0) {
    const scaledBorder = Math.round(borderSize * (size / BASE_SIZE));
    ctx.strokeStyle = borderColorEl.value;
    ctx.lineWidth   = scaledBorder * 2;
    ctx.lineJoin    = 'round';
    ctx.miterLimit  = 2;
    lines.forEach((line, i) => {
      ctx.strokeText(line, size / 2, startY + i * lineHeight);
    });
  }

  ctx.fillStyle = textColorEl.value;
  lines.forEach((line, i) => {
    ctx.fillText(line, size / 2, startY + i * lineHeight);
  });

  return canvas;
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

function calculateAutoFontSize(text, fontFamily, canvasSize, borderSize, lineBreakEnabled) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');

  // Reserve space for the border on both sides so it does not overflow.
  const available = canvasSize - borderSize * 2;

  let lo = 1, hi = canvasSize;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    ctx.font = `bold ${mid}px ${fontFamily}`;
    const lines = getLines(ctx, text, available, lineBreakEnabled);
    const lineHeight = mid * 1.2;
    const totalHeight = lines.length * lineHeight;

    let allLinesFit = true;
    for (const line of lines) {
      if (ctx.measureText(line).width > available) {
        allLinesFit = false;
        break;
      }
    }

    if (totalHeight <= available && allLinesFit) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

generateBtn.addEventListener('click', () => {
  if (!textInput.value.trim()) {
    textInput.focus();
    return;
  }

  const text = textInput.value.trim();
  let fontSize;

  if (fontAutoEl.checked) {
    const borderSize = parseInt(borderSizeEl.value, 10);
    fontSize = calculateAutoFontSize(text, fontFamSel.value, BASE_SIZE, borderSize, lineBreakEl.checked);
    fontSizeEl.value = fontSize;
    fontSizeVal.textContent = fontSize;
  } else {
    fontSize = parseInt(fontSizeEl.value, 10);
  }

  canvasWrap.innerHTML = '';

  const sizes = [
    { size: BASE_SIZE, label: '128×128' },
    { size: 64,        label: '64×64'   },
    { size: 32,        label: '32×32'   },
  ];

  sizes.forEach(({ size, label }) => {
    const canvas = drawEmoji(size, fontSize);
    canvas.title = label;

    const box = document.createElement('div');
    box.className = 'size-box';

    const tag = document.createElement('span');
    tag.className = 'size-tag';
    tag.textContent = label;

    box.appendChild(canvas);
    box.appendChild(tag);
    canvasWrap.appendChild(box);
  });

  const mainCanvas = drawEmoji(BASE_SIZE, fontSize);
  downloadLink.href = mainCanvas.toDataURL('image/png');
  const safeName = textInput.value.trim().replace(/[/\\:*?"<>|]/g, '_') || 'emoji';
  downloadLink.download = safeName + '.png';

  downloadBtn.disabled = false;
});
