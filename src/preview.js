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

  function decorateCanvas(canvas, size, label) {
    canvas.title = label;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    return canvas;
  }

  function buildSafeFilename(text) {
    return text.trim().replace(/[/\\:*?"<>|]/g, '_') || 'emoji';
  }

  class PreviewRenderer {
    constructor({ darkWrap, lightWrap, downloadLink, downloadButton, outputSize, previewSizes, frameSliderWrap, frameSlider, frameSliderValue, frameAutoplay }) {
      this.darkWrap = darkWrap;
      this.lightWrap = lightWrap;
      this.downloadLink = downloadLink;
      this.downloadButton = downloadButton;
      this.outputSize = outputSize;
      this.outputLabel = formatSizeLabel(outputSize);
      this.previewSizes = previewSizes.map(normalizePreviewSize);
      this.downloadButton.textContent = this.buildDownloadLabel('PNG');
      this.frameSliderWrap = frameSliderWrap || null;
      this.frameSlider = frameSlider || null;
      this.frameSliderValue = frameSliderValue || null;
      this.frameAutoplay = frameAutoplay || null;
      this.currentFrameContext = null;
      this.autoplayTimer = null;

      if (this.frameSlider) {
        this.frameSlider.addEventListener('input', () => {
          if (this.frameSliderValue) this.frameSliderValue.textContent = this.frameSlider.value;
          if (this.frameAutoplay && this.frameAutoplay.checked) {
            this.frameAutoplay.checked = false;
            this.stopAutoplay();
          }
          this.renderCurrentFrame();
        });
      }
      if (this.frameAutoplay) {
        this.frameAutoplay.addEventListener('change', () => {
          if (this.frameAutoplay.checked) this.startAutoplay();
          else this.stopAutoplay();
        });
      }
    }

    stopAutoplay() {
      if (this.autoplayTimer) {
        clearInterval(this.autoplayTimer);
        this.autoplayTimer = null;
      }
    }

    startAutoplay() {
      this.stopAutoplay();
      if (!this.currentFrameContext || !this.frameSlider) return;
      const delay = this.currentFrameContext.frameDelay || 70;
      this.autoplayTimer = setInterval(() => {
        if (!this.currentFrameContext) { this.stopAutoplay(); return; }
        const frameCount = this.currentFrameContext.frameCount;
        const current = parseInt(this.frameSlider.value, 10) || 0;
        const next = (current + 1) % Math.max(1, frameCount);
        this.frameSlider.value = String(next);
        if (this.frameSliderValue) this.frameSliderValue.textContent = this.frameSlider.value;
        this.renderCurrentFrame();
      }, delay);
    }

    buildDownloadLabel(format) {
      return `Download ${format} (${this.outputLabel})`;
    }

    render({ animated, fontSize, text, drawEmoji, animationManager, animationLayout }) {
      const safeName = buildSafeFilename(text);

      if (animated) {
        const frameCount = animationManager.getFrameCount();
        this.currentFrameContext = { fontSize, text, drawEmoji, animationManager, animationLayout, frameCount, frameDelay: 70 };
        if (this.frameSliderWrap) this.frameSliderWrap.hidden = false;
        if (this.frameSlider) {
          this.frameSlider.max = String(Math.max(0, frameCount - 1));
          this.frameSlider.value = '0';
          if (this.frameSliderValue) this.frameSliderValue.textContent = '0';
        }
        if (this.frameAutoplay) {
          this.frameAutoplay.checked = true;
        }
        this.renderCurrentFrame();
        this.startAutoplay();

        const mainGif = animationManager.buildGif(this.outputSize, fontSize, animationLayout, drawEmoji, text);
        this.downloadLink.href = mainGif.toDataURL();
        this.downloadLink.download = safeName + '.gif';
        this.downloadButton.textContent = this.buildDownloadLabel('GIF');
      } else {
        this.currentFrameContext = null;
        this.stopAutoplay();
        if (this.frameSliderWrap) this.frameSliderWrap.hidden = true;

        this.darkWrap.replaceChildren();
        this.lightWrap.replaceChildren();
        [this.darkWrap, this.lightWrap].forEach(wrap => {
          this.previewSizes.forEach(({ size, label }) => {
            wrap.appendChild(createSizeBox(decorateCanvas(drawEmoji(size, fontSize), size, label), label));
          });
        });

        const mainCanvas = drawEmoji(this.outputSize, fontSize);
        this.downloadLink.href = mainCanvas.toDataURL('image/png');
        this.downloadLink.download = safeName + '.png';
        this.downloadButton.textContent = this.buildDownloadLabel('PNG');
      }

      this.downloadButton.disabled = false;
    }

    renderCurrentFrame() {
      const ctx = this.currentFrameContext;
      if (!ctx) return;
      const frame = this.frameSlider ? parseInt(this.frameSlider.value, 10) || 0 : 0;
      const { fontSize, text, drawEmoji, animationManager, animationLayout } = ctx;
      const frameOpts = animationManager.buildFrameOptions(frame, text, animationLayout);

      this.darkWrap.replaceChildren();
      this.lightWrap.replaceChildren();
      [this.darkWrap, this.lightWrap].forEach(wrap => {
        this.previewSizes.forEach(({ size, label }) => {
          const canvas = drawEmoji(size, fontSize, frameOpts);
          wrap.appendChild(createSizeBox(decorateCanvas(canvas, size, label), label));
        });
      });
    }
  }

  global.PreviewRenderer = PreviewRenderer;
})(typeof window !== 'undefined' ? window : this);
