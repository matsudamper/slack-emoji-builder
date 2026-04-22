(function (global) {
  'use strict';

  const FALLBACK_ASCENT_RATIO = 0.8;
  const FALLBACK_DESCENT_RATIO = 0.2;
  const VERTICAL_METRIC_RATIO = 1.15;
  const graphemeSegmenter = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

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

  function splitCharacters(text) {
    if (!graphemeSegmenter) return [...text];
    return Array.from(graphemeSegmenter.segment(text), segment => segment.segment);
  }

  function splitTextByHalf(text) {
    const chars = splitCharacters(text);
    if (chars.length < 3) return [text];

    const firstCount = Math.ceil(chars.length / 2);
    return [
      chars.slice(0, firstCount).join(''),
      chars.slice(firstCount).join(''),
    ];
  }

  function getHorizontalLines(ctx, text, maxWidth, lineBreakEnabled) {
    if (lineBreakEnabled) {
      return splitTextByHalf(text);
    }
    return wrapText(ctx, text, maxWidth);
  }

  function getVerticalColumns(text, lineBreakEnabled) {
    if (!lineBreakEnabled) return [text];
    return splitTextByHalf(text);
  }

  function calculateAutoFontSize({ text, fontFamily, canvasSize, borderSize, lineBreakEnabled, direction }) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');

    const available = canvasSize - borderSize * 2;
    const isVertical = direction === 'vertical';
    const isCircle = direction === 'circle';

    let lo = 1;
    let hi = canvasSize;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      ctx.font = `bold ${mid}px ${fontFamily}`;

      let fits;
      if (isCircle) {
        const chars = splitCharacters(text);
        if (chars.length === 2) {
          // 2-char layout uses center of canvas with radius 0.32
          fits = mid <= available * 0.45;
        } else {
          const radius = canvasSize * 0.45;
          const charWidths = chars.map(ch => ctx.measureText(ch).width);
          const totalArcWidth = charWidths.reduce((sum, w) => sum + w, 0);
          const totalAngle = totalArcWidth / radius;
          // Characters must fit along the arc without exceeding a half circle
          // and the font size must not exceed the available space
          fits = totalAngle <= Math.PI && mid <= available * 0.5;
        }
      } else if (isVertical) {
        const columns = getVerticalColumns(text, lineBreakEnabled);
        const charHeight = mid * VERTICAL_METRIC_RATIO;
        const colWidth = mid * VERTICAL_METRIC_RATIO;
        const totalWidth = columns.length * colWidth;
        const maxColChars = Math.max(...columns.map(c => splitCharacters(c).length));
        const totalHeight = maxColChars * charHeight;
        fits = totalWidth <= available && totalHeight <= available;
      } else {
        const lines = getHorizontalLines(ctx, text, available, lineBreakEnabled);
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

  global.TextLayout = {
    VERTICAL_METRIC_RATIO,
    buildTightLineLayout,
    calculateAutoFontSize,
    getHorizontalLines,
    getVerticalColumns,
    splitCharacters,
  };
})(typeof window !== 'undefined' ? window : this);
