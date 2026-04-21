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

const ANIMATION_DEFS = [
  { key: 'scale', label: '拡大縮小', defaultSpeed: 2, controls: [
    { key: 'amount', label: '拡大量', min: 10, max: 50, value: 30, suffix: '%' },
  ] },
  { key: 'rotation', label: '回転', defaultSpeed: 1 },
  { key: 'shake', label: 'ぷるぷる', defaultSpeed: 4 },
  { key: 'bounce', label: 'ぴょんぴょん', defaultSpeed: 2 },
  { key: 'heartbeat', label: '心拍', defaultSpeed: 2 },
  { key: 'sway', label: 'ゆらゆら', defaultSpeed: 2 },
  { key: 'dodge', label: '反復横跳び', defaultSpeed: 2 },
  { key: 'spinBack', label: 'ぐるん戻り', defaultSpeed: 1 },
  { key: 'pop', label: 'びっくりポップ', defaultSpeed: 2 },
  { key: 'jitter', label: 'ガタガタ暴走', defaultSpeed: 5 },
  { key: 'glitch', label: 'グリッチ', defaultSpeed: 4 },
  { key: 'slot', label: 'スロット風', defaultSpeed: 1 },
  { key: 'blink', label: '点滅警告', defaultSpeed: 3 },
  { key: 'rainbow', label: 'レインボー文字', defaultSpeed: 2 },
  { key: 'typing', label: 'タイピング表示', defaultSpeed: 1 },
  { key: 'squash', label: '押しつぶし', defaultSpeed: 2 },
  { key: 'warp', label: 'ワープ', defaultSpeed: 1 },
  { key: 'zoom', label: 'ズーム接近', defaultSpeed: 1 },
];

const STORAGE_KEY = 'slackEmojiBuilderSettings';

let currentDirection = 'horizontal';
let animationControls = {};
let animationExpanded = true;

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

function formatSliderValue(controlDef, value) {
  return String(value) + (controlDef.suffix || '');
}

function buildAnimationControls() {
  const controls = {};

  ANIMATION_DEFS.forEach(def => {
    const row = document.createElement('div');
    row.className = 'anim-row';

    const label = document.createElement('label');
    label.className = 'auto-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `anim-${def.key}`;

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(def.label));

    const sub = document.createElement('div');
    sub.className = 'anim-sub';
    sub.id = `anim-${def.key}-controls`;
    sub.setAttribute('aria-hidden', 'true');

    const sliderDefs = [
      ...(def.controls || []),
      { key: 'speed', label: '速度', min: 1, max: 5, value: def.defaultSpeed || 3, suffix: '' },
    ];
    const sliders = {};

    sliderDefs.forEach(controlDef => {
      const control = document.createElement('div');
      control.className = 'anim-control';

      const controlId = def.key === 'scale' && controlDef.key === 'amount'
        ? 'scale-amount'
        : `anim-${def.key}-${controlDef.key}`;

      const controlLabel = document.createElement('label');
      controlLabel.htmlFor = controlId;
      controlLabel.textContent = controlDef.label;

      const rowInner = document.createElement('div');
      rowInner.className = 'font-size-row';

      const input = document.createElement('input');
      input.type = 'range';
      input.id = controlId;
      input.min = controlDef.min;
      input.max = controlDef.max;
      input.value = controlDef.value;

      const value = document.createElement('span');
      value.className = 'font-size-value';
      value.id = controlId + '-value';
      value.textContent = formatSliderValue(controlDef, input.value);

      input.addEventListener('input', () => {
        value.textContent = formatSliderValue(controlDef, input.value);
        saveSettings();
      });

      rowInner.appendChild(input);
      rowInner.appendChild(value);
      control.appendChild(controlLabel);
      control.appendChild(rowInner);
      sub.appendChild(control);

      sliders[controlDef.key] = { input, value, def: controlDef };
    });

    checkbox.addEventListener('change', () => {
      applyAnimVisibility();
      saveSettings();
    });

    row.appendChild(label);
    row.appendChild(sub);
    animContainer.appendChild(row);

    controls[def.key] = { def, checkbox, sub, sliders };
  });

  return controls;
}

function setSliderValue(slider, value) {
  if (!slider || value === undefined) return;
  slider.input.value = value;
  slider.value.textContent = formatSliderValue(slider.def, slider.input.value);
}

animationControls = buildAnimationControls();

function getEnabledAnimationCount() {
  return Object.values(animationControls).filter(control => control.checkbox.checked).length;
}

function updateAnimationCount() {
  const count = getEnabledAnimationCount();
  animationCount.textContent = String(count);
  animationClearBtn.disabled = count === 0;
}

function setAnimationExpanded(expanded) {
  animationExpanded = expanded;
  animationToggle.classList.toggle('collapsed', !expanded);
  animationToggle.setAttribute('aria-expanded', String(expanded));
  animationBody.classList.toggle('collapsed', !expanded);
}

animationToggle.addEventListener('click', () => {
  setAnimationExpanded(!animationExpanded);
  saveSettings();
});

animationClearBtn.addEventListener('click', () => {
  Object.values(animationControls).forEach(control => {
    control.checkbox.checked = false;
  });
  applyAnimVisibility();
  saveSettings();
});

function getAnimationSettings() {
  const animations = {};
  Object.entries(animationControls).forEach(([key, control]) => {
    animations[key] = {
      enabled: control.checkbox.checked,
    };
    Object.entries(control.sliders).forEach(([sliderKey, slider]) => {
      animations[key][sliderKey] = slider.input.value;
    });
  });
  return animations;
}

function saveSettings() {
  const animations = getAnimationSettings();
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
    direction:     currentDirection,
    animationExpanded: animationExpanded,
    animations:    animations,
    animScale:     animations.scale.enabled,
    scaleAmount:   animations.scale.amount,
    animRotation:  animations.rotation.enabled,
    rotationSpeed: animations.rotation.speed,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (_) { /* ignore storage errors */ }
}

function applyStoredAnimationSettings(settings) {
  const storedAnimations = settings.animations || {};

  Object.entries(animationControls).forEach(([key, control]) => {
    const stored = storedAnimations[key] || {};

    if (stored.enabled !== undefined) {
      control.checkbox.checked = stored.enabled;
    }
    Object.entries(control.sliders).forEach(([sliderKey, slider]) => {
      if (stored[sliderKey] !== undefined) {
        setSliderValue(slider, stored[sliderKey]);
      }
    });
  });

  if (!storedAnimations.scale) {
    if (settings.animScale !== undefined) {
      animationControls.scale.checkbox.checked = settings.animScale;
    }
    if (settings.scaleAmount !== undefined) {
      setSliderValue(animationControls.scale.sliders.amount, settings.scaleAmount);
    }
  }
  if (!storedAnimations.rotation) {
    if (settings.animRotation !== undefined) {
      animationControls.rotation.checkbox.checked = settings.animRotation;
    }
    if (settings.rotationSpeed !== undefined) {
      setSliderValue(animationControls.rotation.sliders.speed, settings.rotationSpeed);
    }
  }

  applyAnimVisibility();
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
  if (settings.direction !== undefined) {
    setDirection(settings.direction);
  }
  if (settings.animationExpanded !== undefined) {
    setAnimationExpanded(settings.animationExpanded);
  }
  applyStoredAnimationSettings(settings);
}

loadSettings();

function applyAnimVisibility() {
  Object.values(animationControls).forEach(control => {
    const visible = control.checkbox.checked;
    control.sub.classList.toggle('visible', visible);
    control.sub.setAttribute('aria-hidden', String(!visible));
  });
  updateAnimationCount();
}

setAnimationExpanded(animationExpanded);
applyAnimVisibility();

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
const ANIMATION_TOTAL_FRAMES = 24;
const ANIMATION_FRAME_DELAY = 70;
const FALLBACK_ASCENT_RATIO  = 0.8;
const FALLBACK_DESCENT_RATIO = 0.2;
const SLOT_CHARS = '!?#$%&*+0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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

  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = opts.bgColor || bgColorEl.value;
  if (!bgTransparentEl.checked) {
    ctx.fillRect(0, 0, size, size);
  }

  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  ctx.translate(size / 2 + translateX, size / 2 + translateY);
  if (rotation) ctx.rotate(rotation * Math.PI / 180);
  if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
  ctx.translate(-size / 2, -size / 2);

  const scaledFontSize = Math.round(fontSize * (size / BASE_SIZE));
  ctx.font = `bold ${scaledFontSize}px ${fontFamSel.value}`;

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

function getAnimationSpeed(key) {
  const slider = animationControls[key]?.sliders.speed;
  const speed = slider ? parseInt(slider.input.value, 10) : 1;
  return Number.isFinite(speed) ? speed : 1;
}

function getAnimationControlValue(key, controlKey, fallback) {
  const slider = animationControls[key]?.sliders[controlKey];
  const value = slider ? parseFloat(slider.input.value) : fallback;
  return Number.isFinite(value) ? value : fallback;
}

function isAnimationEnabled() {
  return Object.values(animationControls).some(control => control.checkbox.checked);
}

function getPhase(frame, speed) {
  return ((frame / ANIMATION_TOTAL_FRAMES) * speed) % 1;
}

function addTranslate(opts, x, y) {
  opts.translateX = (opts.translateX || 0) + x;
  opts.translateY = (opts.translateY || 0) + y;
}

function addRotation(opts, degrees) {
  opts.rotation = (opts.rotation || 0) + degrees;
}

function multiplyScale(opts, x, y) {
  opts.scaleX = (opts.scaleX === undefined ? 1 : opts.scaleX) * x;
  opts.scaleY = (opts.scaleY === undefined ? 1 : opts.scaleY) * y;
}

function multiplyAlpha(opts, alpha) {
  opts.alpha = (opts.alpha === undefined ? 1 : opts.alpha) * alpha;
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function pulse(t, center, width) {
  return Math.exp(-Math.pow((t - center) / width, 2));
}

function hash01(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buildSlotText(text, phase, frame) {
  const chars = [...text];
  if (phase > 0.82) return text;

  const stopCount = Math.floor((phase / 0.82) * (chars.length + 1));
  return chars.map((ch, i) => {
    if (ch === ' ' || i < stopCount) return ch;
    const index = (frame * 7 + i * 13 + Math.floor(phase * 30)) % SLOT_CHARS.length;
    return SLOT_CHARS[index];
  }).join('');
}

function buildTypingText(text, phase) {
  const chars = [...text];
  if (phase > 0.78) return text;

  const count = Math.floor((phase / 0.78) * (chars.length + 1));
  return chars.slice(0, count).join('');
}

function applyAnimationEffect(key, phase, frame, opts, baseText) {
  switch (key) {
    case 'scale': {
      const amount = getAnimationControlValue('scale', 'amount', 30) / 100;
      const scale = 1 + amount * Math.sin(2 * Math.PI * phase);
      multiplyScale(opts, scale, scale);
      break;
    }
    case 'rotation':
      addRotation(opts, 360 * phase);
      break;
    case 'shake':
      addTranslate(opts, Math.sin(2 * Math.PI * phase) * 8, Math.sin(2 * Math.PI * phase * 2) * 1.5);
      addRotation(opts, Math.sin(2 * Math.PI * phase * 2) * 3);
      break;
    case 'bounce': {
      const jump = Math.sin(Math.PI * phase);
      const landing = Math.pow(Math.max(0, Math.cos(2 * Math.PI * phase)), 8);
      addTranslate(opts, 0, -24 * jump + 5 * landing);
      multiplyScale(opts, 1 + 0.16 * landing, 1 - 0.13 * landing);
      break;
    }
    case 'heartbeat': {
      const beat = pulse(phase, 0.16, 0.055) + pulse(phase, 0.34, 0.075) * 0.75;
      const scale = 1 + 0.28 * beat;
      multiplyScale(opts, scale, scale);
      break;
    }
    case 'sway':
      addRotation(opts, Math.sin(2 * Math.PI * phase) * 12);
      break;
    case 'dodge':
      addTranslate(opts, Math.sin(2 * Math.PI * phase) * 28, 0);
      break;
    case 'spinBack': {
      const rotation = phase < 0.68
        ? 360 * easeOutCubic(phase / 0.68)
        : 360 * (1 - easeInOutCubic((phase - 0.68) / 0.32));
      addRotation(opts, rotation);
      break;
    }
    case 'pop': {
      const scale = 1 + 0.58 * pulse(phase, 0.14, 0.08) - 0.12 * pulse(phase, 0.36, 0.11);
      multiplyScale(opts, scale, scale);
      break;
    }
    case 'jitter': {
      const bucket = Math.floor((frame + 1) * getAnimationSpeed('jitter') * 1.7);
      addTranslate(opts, (hash01(bucket) - 0.5) * 14, (hash01(bucket + 9) - 0.5) * 10);
      addRotation(opts, (hash01(bucket + 17) - 0.5) * 14);
      break;
    }
    case 'glitch': {
      const bucket = Math.floor((frame + 1) * getAnimationSpeed('glitch') * 1.25);
      opts.glitch = true;
      opts.glitchSeed = bucket;
      opts.glitchAmount = 0.8 + hash01(bucket + 3) * 0.8;
      if (hash01(bucket + 7) > 0.55) {
        addTranslate(opts, (hash01(bucket + 13) - 0.5) * 8, 0);
      }
      break;
    }
    case 'slot':
      opts.text = buildSlotText(baseText, phase, frame);
      break;
    case 'blink':
      opts.textColor = phase < 0.5 ? '#ffd900' : '#ff2f3f';
      opts.borderColor = phase < 0.5 ? '#3d2500' : '#ffffff';
      opts.bgColor = phase < 0.5 ? '#1f1f1f' : '#ffcc00';
      break;
    case 'rainbow':
      opts.textColor = `hsl(${Math.round(phase * 360)}, 100%, 62%)`;
      break;
    case 'typing':
      opts.text = buildTypingText(baseText, phase);
      break;
    case 'squash': {
      const squash = pulse(phase, 0.18, 0.16);
      multiplyScale(opts, 1 + 0.28 * squash, 1 - 0.42 * squash);
      addTranslate(opts, 0, 10 * squash);
      break;
    }
    case 'warp':
      if (phase < 0.42) {
        const t = easeInOutCubic(phase / 0.42);
        addTranslate(opts, -78 * t, 0);
        multiplyScale(opts, 1 - 0.68 * t, 1 - 0.68 * t);
        multiplyAlpha(opts, 1 - 0.7 * t);
      } else if (phase < 0.54) {
        multiplyScale(opts, 0.2, 0.2);
        multiplyAlpha(opts, 0);
      } else {
        const t = easeOutCubic((phase - 0.54) / 0.46);
        addTranslate(opts, 78 * (1 - t), 0);
        multiplyScale(opts, 0.32 + 0.68 * t, 0.32 + 0.68 * t);
        multiplyAlpha(opts, Math.min(1, t + 0.2));
      }
      break;
    case 'zoom': {
      const t = phase < 0.78 ? easeOutBack(phase / 0.78) : 1;
      const scale = 0.18 + 0.82 * t;
      multiplyScale(opts, scale, scale);
      multiplyAlpha(opts, Math.min(1, phase * 5));
      break;
    }
    default:
      break;
  }
}

function buildFrameOptions(frame) {
  const opts = {};
  const baseText = getBaseText();

  ANIMATION_DEFS.forEach(def => {
    const control = animationControls[def.key];
    if (!control?.checkbox.checked) return;

    const speed = getAnimationSpeed(def.key);
    applyAnimationEffect(def.key, getPhase(frame, speed), frame, opts, baseText);
  });

  return opts;
}

function buildGif(size, fontSize) {
  var encoder = new GifEncoder(size, size);
  for (var f = 0; f < ANIMATION_TOTAL_FRAMES; f++) {
    encoder.addFrame(drawEmoji(size, fontSize, buildFrameOptions(f)), { delay: ANIMATION_FRAME_DELAY });
  }
  return encoder;
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

  canvasWrapDark.innerHTML = '';
  canvasWrapLight.innerHTML = '';

  const animated = isAnimationEnabled();

  const sizes = [
    { size: BASE_SIZE, label: '128×128' },
    { size: 64,        label: '64×64'   },
    { size: 32,        label: '32×32'   },
  ];

  [canvasWrapDark, canvasWrapLight].forEach(wrap => {
    sizes.forEach(({ size, label }) => {
      if (animated) {
        const gif = buildGif(size, fontSize);
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
    const mainGif = buildGif(BASE_SIZE, fontSize);
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
