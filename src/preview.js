(function (global) {
  'use strict';

  const PREVIEW_SIZES = [
    { size: 128, label: '128×128' },
    { size: 64, label: '64×64' },
    { size: 32, label: '32×32' },
  ];

  function createSizeBox(node, label) {
    node.title = label;

    const box = document.createElement('div');
    box.className = 'size-box';

    const tag = document.createElement('span');
    tag.className = 'size-tag';
    tag.textContent = label;

    box.appendChild(node);
    box.appendChild(tag);
    return box;
  }

  function createGifImage(gif, size, label) {
    const img = document.createElement('img');
    img.src = gif.toDataURL();
    img.title = label;
    img.width = size;
    img.height = size;
    return img;
  }

  function buildSafeFilename(text) {
    return text.trim().replace(/[/\\:*?"<>|]/g, '_') || 'emoji';
  }

  class PreviewRenderer {
    constructor({ darkWrap, lightWrap, downloadLink, downloadButton, baseSize }) {
      this.darkWrap = darkWrap;
      this.lightWrap = lightWrap;
      this.downloadLink = downloadLink;
      this.downloadButton = downloadButton;
      this.baseSize = baseSize;
    }

    render({ animated, fontSize, text, drawEmoji, animationManager, animationLayout }) {
      this.darkWrap.replaceChildren();
      this.lightWrap.replaceChildren();

      [this.darkWrap, this.lightWrap].forEach(wrap => {
        PREVIEW_SIZES.forEach(({ size, label }) => {
          const node = animated
            ? createGifImage(animationManager.buildGif(size, fontSize, animationLayout, drawEmoji, text), size, label)
            : drawEmoji(size, fontSize);
          wrap.appendChild(createSizeBox(node, label));
        });
      });

      const safeName = buildSafeFilename(text);
      if (animated) {
        const mainGif = animationManager.buildGif(this.baseSize, fontSize, animationLayout, drawEmoji, text);
        this.downloadLink.href = mainGif.toDataURL();
        this.downloadLink.download = safeName + '.gif';
        this.downloadButton.textContent = 'Download GIF (128×128)';
      } else {
        const mainCanvas = drawEmoji(this.baseSize, fontSize);
        this.downloadLink.href = mainCanvas.toDataURL('image/png');
        this.downloadLink.download = safeName + '.png';
        this.downloadButton.textContent = 'Download PNG (128×128)';
      }

      this.downloadButton.disabled = false;
    }
  }

  global.PreviewRenderer = PreviewRenderer;
})(typeof window !== 'undefined' ? window : this);
