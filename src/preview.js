(function (global) {
  'use strict';

  function formatSizeLabel(size) {
    return `${size}×${size}`;
  }

  function normalizePreviewSize(previewSize) {
    if (typeof previewSize === 'number') {
      return {
        size: previewSize,
        label: formatSizeLabel(previewSize),
      };
    }

    const size = previewSize.size;
    return {
      size,
      label: previewSize.label || formatSizeLabel(size),
    };
  }

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
    constructor({ darkWrap, lightWrap, downloadLink, downloadButton, outputSize, previewSizes }) {
      this.darkWrap = darkWrap;
      this.lightWrap = lightWrap;
      this.downloadLink = downloadLink;
      this.downloadButton = downloadButton;
      this.outputSize = outputSize;
      this.outputLabel = formatSizeLabel(outputSize);
      this.previewSizes = previewSizes.map(normalizePreviewSize);
      this.downloadButton.textContent = this.buildDownloadLabel('PNG');
    }

    buildDownloadLabel(format) {
      return `Download ${format} (${this.outputLabel})`;
    }

    render({ animated, fontSize, text, drawEmoji, animationManager, animationLayout }) {
      this.darkWrap.replaceChildren();
      this.lightWrap.replaceChildren();

      [this.darkWrap, this.lightWrap].forEach(wrap => {
        this.previewSizes.forEach(({ size, label }) => {
          const node = animated
            ? createGifImage(animationManager.buildGif(size, fontSize, animationLayout, drawEmoji, text), size, label)
            : drawEmoji(size, fontSize);
          wrap.appendChild(createSizeBox(node, label));
        });
      });

      const safeName = buildSafeFilename(text);
      if (animated) {
        const mainGif = animationManager.buildGif(this.outputSize, fontSize, animationLayout, drawEmoji, text);
        this.downloadLink.href = mainGif.toDataURL();
        this.downloadLink.download = safeName + '.gif';
        this.downloadButton.textContent = this.buildDownloadLabel('GIF');
      } else {
        const mainCanvas = drawEmoji(this.outputSize, fontSize);
        this.downloadLink.href = mainCanvas.toDataURL('image/png');
        this.downloadLink.download = safeName + '.png';
        this.downloadButton.textContent = this.buildDownloadLabel('PNG');
      }

      this.downloadButton.disabled = false;
    }
  }

  global.PreviewRenderer = PreviewRenderer;
})(typeof window !== 'undefined' ? window : this);
