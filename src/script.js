const textInput      = document.getElementById('text-input');
const fontSizeEl     = document.getElementById('font-size');
const fontSizeVal    = document.getElementById('font-size-value');
const fontAutoEl     = document.getElementById('font-size-auto');
const fontFamSel     = document.getElementById('font-family');
const textColorEl    = document.getElementById('text-color');
const bgColorEl      = document.getElementById('bg-color');
const textHexEl      = document.getElementById('text-color-hex');
const bgHexEl        = document.getElementById('bg-color-hex');
const borderSizeEl   = document.getElementById('border-size');
const borderSizeVal  = document.getElementById('border-size-value');
const borderColorEl  = document.getElementById('border-color');
const borderHexEl    = document.getElementById('border-color-hex');
const generateBtn    = document.getElementById('generate-btn');
const previewSec     = document.getElementById('preview-section');
const canvasWrap     = document.getElementById('canvas-wrap');
const downloadLink   = document.getElementById('download-link');
const downloadBtn    = document.getElementById('download-btn');

textColorEl.addEventListener('input', () => { textHexEl.textContent = textColorEl.value; });
bgColorEl.addEventListener('input',   () => { bgHexEl.textContent   = bgColorEl.value;   });
borderColorEl.addEventListener('input', () => { borderHexEl.textContent = borderColorEl.value; });
borderSizeEl.addEventListener('input', () => { borderSizeVal.textContent = borderSizeEl.value; });

fontSizeEl.addEventListener('input', () => {
  fontSizeVal.textContent = fontSizeEl.value;
});

fontAutoEl.addEventListener('change', () => {
  fontSizeEl.disabled = fontAutoEl.checked;
});

// Initialize slider state
fontSizeEl.disabled = fontAutoEl.checked;

const BASE_SIZE = 128;

function drawEmoji(size, fontSize) {
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColorEl.value;
  ctx.fillRect(0, 0, size, size);

  const scaledFontSize = Math.round(fontSize * (size / BASE_SIZE));
  ctx.font = `bold ${scaledFontSize}px ${fontFamSel.value}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const text = textInput.value.trim() || ' ';
  const lines = wrapText(ctx, text, size);
  const lineHeight = scaledFontSize * 1.2;
  const totalHeight = lines.length * lineHeight;
  const startY = (size - totalHeight) / 2 + lineHeight / 2;

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

function calculateAutoFontSize(text, fontFamily, canvasSize) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');

  let lo = 1, hi = canvasSize;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    ctx.font = `bold ${mid}px ${fontFamily}`;
    const lines = wrapText(ctx, text, canvasSize);
    const lineHeight = mid * 1.2;
    const totalHeight = lines.length * lineHeight;

    let allLinesFit = true;
    for (const line of lines) {
      if (ctx.measureText(line).width > canvasSize) {
        allLinesFit = false;
        break;
      }
    }

    if (totalHeight <= canvasSize && allLinesFit) {
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
    fontSize = calculateAutoFontSize(text, fontFamSel.value, BASE_SIZE);
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
