(function (global) {
  'use strict';

  const {
    VERTICAL_METRIC_RATIO,
    buildTightLineLayout,
    getHorizontalLines,
    getVerticalColumns,
    splitCharacters,
  } = global.TextLayout;

  class EmojiRenderer {
    constructor({ baseSize }) {
      this.baseSize = baseSize;
    }

    draw(size, fontSize, settings, opts) {
      opts = opts || {};
      const unit = size / this.baseSize;
      const scaleX = opts.scaleX !== undefined ? opts.scaleX : 1;
      const scaleY = opts.scaleY !== undefined ? opts.scaleY : 1;
      const rotation = opts.rotation || 0;
      const translateX = (opts.translateX || 0) * unit;
      const translateY = (opts.translateY || 0) * unit;
      const outputPadding = opts.outputPadding || 0;

      const canvas = document.createElement('canvas');
      canvas.width = size + outputPadding * 2;
      canvas.height = size + outputPadding * 2;
      const ctx = canvas.getContext('2d');

      ctx.save();
      if (outputPadding) ctx.translate(outputPadding, outputPadding);

      ctx.fillStyle = opts.bgColor || settings.bgColor;
      if (!opts.skipBackground && !settings.bgTransparent) {
        ctx.fillRect(0, 0, size, size);
      }

      ctx.save();
      if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
      ctx.translate(size / 2 + translateX, size / 2 + translateY);
      if (rotation) ctx.rotate(rotation * Math.PI / 180);
      if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
      ctx.translate(-size / 2, -size / 2);

      const scaledFontSize = Math.round(fontSize * (size / this.baseSize));
      ctx.font = `bold ${scaledFontSize}px ${settings.fontFamily}`;

      const drawOpts = {
        text: opts.text !== undefined ? opts.text : settings.text,
        textColor: opts.textColor || settings.textColor,
        borderColor: opts.borderColor || settings.borderColor,
      };

      if (opts.glitch) {
        this.drawGlitchText(ctx, size, scaledFontSize, settings, drawOpts, opts);
      } else {
        this.drawTextLayer(ctx, size, scaledFontSize, settings, drawOpts);
      }

      ctx.restore();
      ctx.restore();
      return canvas;
    }

    drawTextLayer(ctx, size, scaledFontSize, settings, drawOpts) {
      if (settings.direction === 'vertical') {
        this.drawVerticalText(ctx, size, scaledFontSize, settings, drawOpts);
      } else {
        this.drawHorizontalText(ctx, size, scaledFontSize, settings, drawOpts);
      }
    }

    drawGlitchText(ctx, size, scaledFontSize, settings, drawOpts, opts) {
      const unit = size / this.baseSize;
      const seed = opts.glitchSeed || 0;
      const amount = opts.glitchAmount || 1;
      const shiftA = ((seed % 3) + 2) * unit * amount;
      const shiftB = (((seed + 1) % 3) + 1) * unit * amount;

      ctx.save();
      ctx.globalAlpha *= 0.55;
      ctx.translate(-shiftA, 0);
      this.drawTextLayer(ctx, size, scaledFontSize, settings, {
        ...drawOpts,
        textColor: '#ff3bd5',
        skipBorder: true,
      });
      ctx.restore();

      ctx.save();
      ctx.globalAlpha *= 0.55;
      ctx.translate(shiftB, 0);
      this.drawTextLayer(ctx, size, scaledFontSize, settings, {
        ...drawOpts,
        textColor: '#00e5ff',
        skipBorder: true,
      });
      ctx.restore();

      this.drawTextLayer(ctx, size, scaledFontSize, settings, drawOpts);

      for (let i = 0; i < 2; i++) {
        const bandY = (((seed * 23) + i * 41) % this.baseSize) * unit;
        const bandH = (7 + ((seed + i) % 5)) * unit;
        const bandShift = (i === 0 ? 1 : -1) * (4 + (seed % 4)) * unit * amount;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, bandY, size, bandH);
        ctx.clip();
        ctx.translate(bandShift, 0);
        this.drawTextLayer(ctx, size, scaledFontSize, settings, drawOpts);
        ctx.restore();
      }
    }

    drawHorizontalText(ctx, size, scaledFontSize, settings, drawOpts) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      const scaledBorder = Math.round(settings.borderSize * (size / this.baseSize));
      const availableWidth = Math.max(1, size - scaledBorder * 2);
      const text = drawOpts.text || ' ';
      const lines = getHorizontalLines(ctx, text, availableWidth, settings.lineBreak);

      const { baselines } = buildTightLineLayout(ctx, lines, scaledFontSize, size, scaledBorder);

      if (scaledBorder > 0 && !drawOpts.skipBorder) {
        ctx.strokeStyle = drawOpts.borderColor;
        ctx.lineWidth = scaledBorder * 2;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        lines.forEach((line, i) => {
          ctx.strokeText(line, size / 2, baselines[i]);
        });
      }

      ctx.fillStyle = drawOpts.textColor;
      lines.forEach((line, i) => {
        ctx.fillText(line, size / 2, baselines[i]);
      });
    }

    drawVerticalText(ctx, size, scaledFontSize, settings, drawOpts) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = drawOpts.text || ' ';
      const columns = getVerticalColumns(text, settings.lineBreak);
      const charHeight = scaledFontSize * VERTICAL_METRIC_RATIO;
      const colWidth = scaledFontSize * VERTICAL_METRIC_RATIO;
      const totalWidth = columns.length * colWidth;
      const startX = (size + totalWidth) / 2 - colWidth / 2;
      const scaledBorder = Math.round(settings.borderSize * (size / this.baseSize));

      columns.forEach((col, ci) => {
        const chars = splitCharacters(col);
        const totalColHeight = chars.length * charHeight;
        const colStartY = (size - totalColHeight) / 2 + charHeight / 2;
        const x = startX - ci * colWidth;

        chars.forEach((ch, ri) => {
          const y = colStartY + ri * charHeight;

          if (scaledBorder > 0 && !drawOpts.skipBorder) {
            ctx.strokeStyle = drawOpts.borderColor;
            ctx.lineWidth = scaledBorder * 2;
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(ch, x, y);
          }

          ctx.fillStyle = drawOpts.textColor;
          ctx.fillText(ch, x, y);
        });
      });
    }
  }

  global.EmojiRenderer = EmojiRenderer;
})(typeof window !== 'undefined' ? window : this);
