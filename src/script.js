const textInput   = document.getElementById('text-input');
const fontSizeSel = document.getElementById('font-size');
const fontFamSel  = document.getElementById('font-family');
const textColorEl = document.getElementById('text-color');
const bgColorEl   = document.getElementById('bg-color');
const textHexEl   = document.getElementById('text-color-hex');
const bgHexEl     = document.getElementById('bg-color-hex');
const generateBtn = document.getElementById('generate-btn');
const previewSec  = document.getElementById('preview-section');
const canvasWrap  = document.getElementById('canvas-wrap');
const downloadLink = document.getElementById('download-link');

textColorEl.addEventListener('input', () => { textHexEl.textContent = textColorEl.value; });
bgColorEl.addEventListener('input',   () => { bgHexEl.textContent   = bgColorEl.value;   });

const BASE_SIZE = 128;

function drawEmoji(size) {
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColorEl.value;
  ctx.fillRect(0, 0, size, size);

  const scaledFontSize = Math.round(parseInt(fontSizeSel.value, 10) * (size / BASE_SIZE));
  ctx.font = `bold ${scaledFontSize}px ${fontFamSel.value}`;
  ctx.fillStyle    = textColorEl.value;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const text = textInput.value.trim() || ' ';
  const lines = wrapText(ctx, text, size * 0.9);
  const lineHeight = scaledFontSize * 1.2;
  const totalHeight = lines.length * lineHeight;
  const startY = (size - totalHeight) / 2 + lineHeight / 2;

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

generateBtn.addEventListener('click', () => {
  if (!textInput.value.trim()) {
    textInput.focus();
    return;
  }

  canvasWrap.innerHTML = '';

  const sizes = [
    { size: BASE_SIZE, label: '128×128' },
    { size: 64,        label: '64×64'   },
    { size: 32,        label: '32×32'   },
  ];

  sizes.forEach(({ size, label }) => {
    const canvas = drawEmoji(size);
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

  const mainCanvas = drawEmoji(BASE_SIZE);
  downloadLink.href = mainCanvas.toDataURL('image/png');
  const safeName = textInput.value.trim().replace(/[/\\:*?"<>|]/g, '_') || 'emoji';
  downloadLink.download = safeName + '.png';

  previewSec.classList.add('visible');
});
