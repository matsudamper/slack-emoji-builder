(function (global) {
  'use strict';

  const {
    VERTICAL_METRIC_RATIO,
    buildTightLineLayout,
    getCircleRadius,
    getHorizontalLines,
    getVerticalColumns,
    splitCharacters,
  } = global.TextLayout;

  const EFFECT_BASE_SIZE = 128;

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

      const scaledFontSize = Math.round(fontSize * (size / this.baseSize));
      const textFill = opts.textColor || settings.textColor;
      const borderFill = opts.borderColor || settings.borderColor;
      const drawOpts = {
        text: opts.text !== undefined ? opts.text : settings.text,
        textColor: textFill,
        borderColor: borderFill,
      };

      const depth = Math.max(0, Math.round(settings.depthSize || 0));
      let depthX = opts.depthX;
      let depthY = opts.depthY;
      if (depth > 0 && depthX === undefined && depthY === undefined) {
        depthX = Math.SQRT1_2;
        depthY = Math.SQRT1_2;
      }
      depthX = depthX || 0;
      depthY = depthY || 0;
      const hasDepth = depth > 0 && (depthX !== 0 || depthY !== 0);
      const sideColor = (settings.borderSize > 0) ? borderFill : textFill;

      const renderOnto = (targetCtx, sx, sy, layerOpts) => {
        targetCtx.save();
        targetCtx.translate(size / 2, size / 2);
        if (rotation) targetCtx.rotate(rotation * Math.PI / 180);
        if (sx !== 1 || sy !== 1) targetCtx.scale(sx, sy);
        targetCtx.translate(-size / 2, -size / 2);
        targetCtx.font = `bold ${scaledFontSize}px ${settings.fontFamily}`;
        if (opts.glitch) {
          this.drawGlitchText(targetCtx, size, scaledFontSize, settings, layerOpts, opts);
        } else {
          this.drawTextLayer(targetCtx, size, scaledFontSize, settings, layerOpts);
        }
        targetCtx.restore();
      };

      const textCanvas = document.createElement('canvas');
      textCanvas.width = size;
      textCanvas.height = size;
      const textCtx = textCanvas.getContext('2d');
      renderOnto(textCtx, scaleX, scaleY, drawOpts);

      let silCanvas = null;
      if (hasDepth) {
        const silFloor = 0.1 * Math.min(1, Math.max(Math.abs(depthX), Math.abs(depthY)));
        const silScaleX = (Math.abs(scaleX) < silFloor ? (scaleX < 0 ? -silFloor : silFloor) : scaleX);
        const silScaleY = (Math.abs(scaleY) < silFloor ? (scaleY < 0 ? -silFloor : silFloor) : scaleY);

        silCanvas = document.createElement('canvas');
        silCanvas.width = size;
        silCanvas.height = size;
        const silCtx = silCanvas.getContext('2d');
        renderOnto(silCtx, silScaleX, silScaleY, { ...drawOpts, textColor: sideColor, borderColor: sideColor });
      }

      ctx.save();
      if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
      if (hasDepth) {
        const density = 4;
        const stepCount = depth * density;
        const halfSteps = stepCount / 2;
        const cosFront = scaleX * scaleY;
        const reverse = cosFront < 0;
        for (let i = 0; i <= stepCount; i++) {
          const idx = reverse ? (stepCount - i) : i;
          const t = (idx - halfSteps) / density;
          ctx.drawImage(silCanvas, translateX + depthX * t * unit, translateY + depthY * t * unit);
        }
        const halfDepth = depth / 2;
        if (cosFront > 0) {
          ctx.drawImage(textCanvas, translateX + depthX * halfDepth * unit, translateY + depthY * halfDepth * unit);
        } else if (cosFront < 0) {
          ctx.drawImage(textCanvas, translateX - depthX * halfDepth * unit, translateY - depthY * halfDepth * unit);
        }
      } else {
        ctx.drawImage(textCanvas, translateX, translateY);
      }
      ctx.restore();

      ctx.restore();
      return canvas;
    }

    drawTextLayer(ctx, size, scaledFontSize, settings, drawOpts) {
      if (settings.direction === 'vertical') {
        this.drawVerticalText(ctx, size, scaledFontSize, settings, drawOpts);
      } else if (settings.direction === 'circle') {
        this.drawCircleText(ctx, size, scaledFontSize, settings, drawOpts);
      } else {
        this.drawHorizontalText(ctx, size, scaledFontSize, settings, drawOpts);
      }
    }

    drawGlitchText(ctx, size, scaledFontSize, settings, drawOpts, opts) {
      const unit = size / EFFECT_BASE_SIZE;
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
        const bandY = (((seed * 23) + i * 41) % EFFECT_BASE_SIZE) * unit;
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

    drawCircleText(ctx, size, scaledFontSize, settings, drawOpts) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = drawOpts.text || ' ';
      const chars = splitCharacters(text.replace(/\n/g, ''));
      if (chars.length === 0) return;

      const scaledBorder = Math.round(settings.borderSize * (size / this.baseSize));
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = getCircleRadius(size, settings.circleDiameter * (size / this.baseSize));

      // Distribute characters evenly around the circle.
      // First character at top (-PI/2), subsequent characters clockwise.
      // Each character is rotated to face outward from the center.
      const angleStep = 2 * Math.PI / chars.length;
      chars.forEach((ch, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);

        if (scaledBorder > 0 && !drawOpts.skipBorder) {
          ctx.strokeStyle = drawOpts.borderColor;
          ctx.lineWidth = scaledBorder * 2;
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(ch, 0, 0);
        }

        ctx.fillStyle = drawOpts.textColor;
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      });
    }
  }

  global.EmojiRenderer = EmojiRenderer;
})(typeof window !== 'undefined' ? window : this);
