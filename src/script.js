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

const emojiRenderer = new EmojiRenderer({ baseSize: BASE_SIZE });
const previewRenderer = new PreviewRenderer({
  darkWrap: canvasWrapDark,
  lightWrap: canvasWrapLight,
  downloadLink,
  downloadButton: downloadBtn,
  baseSize: BASE_SIZE,
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

function getBaseText() {
  return textInput.value.trim() || ' ';
}

function parseNumber(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readCurrentSettings() {
  return {
    text: getBaseText(),
    fontSize: parseNumber(fontSizeEl.value, 32),
    fontAuto: fontAutoEl.checked,
    lineBreak: lineBreakEl.checked,
    fontFamily: getSelectedFontFamily(),
    textColor: textColorEl.value,
    bgColor: bgColorEl.value,
    bgTransparent: bgTransparentEl.checked,
    borderSize: parseNumber(borderSizeEl.value, 0),
    borderColor: borderColorEl.value,
    direction: getDirection(),
  };
}

function setFontSizeValue(fontSize) {
  fontSizeEl.value = fontSize;
  fontSizeVal.textContent = fontSize;
}

function createDrawEmoji(settings) {
  return (size, fontSize, opts) => emojiRenderer.draw(size, fontSize, settings, opts);
}

generateBtn.addEventListener('click', async () => {
  if (!textInput.value.trim()) {
    textInput.focus();
    return;
  }

  const text = textInput.value.trim();
  await waitForSelectedFontReady(text);

  const settings = readCurrentSettings();
  settings.text = text;
  let fontSize = settings.fontSize;

  if (settings.fontAuto) {
    fontSize = TextLayout.calculateAutoFontSize({
      text,
      fontFamily: settings.fontFamily,
      canvasSize: BASE_SIZE,
      borderSize: settings.borderSize,
      lineBreakEnabled: settings.lineBreak,
      direction: settings.direction,
    });
    setFontSizeValue(fontSize);
  }

  settings.fontSize = fontSize;
  const drawEmoji = createDrawEmoji(settings);

  const animated = animationManager.isEnabled();
  const animationLayout = animated ? animationManager.buildLayout(fontSize, drawEmoji, text) : null;

  previewRenderer.render({
    animated,
    fontSize,
    text,
    drawEmoji,
    animationManager,
    animationLayout,
  });
});
