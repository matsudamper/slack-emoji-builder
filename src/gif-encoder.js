/**
 * 最小限のGIF89aアニメーションエンコーダ。
 *
 * 使い方:
 *   const enc = new GifEncoder(width, height);
 *   enc.addFrame(canvas, { delay: 80 });   // delay（ミリ秒）
 *   enc.addFrame(canvas2, { delay: 80 });
 *   const blob = enc.toBlob();              // image/gif 型の Blob
 *   const url  = enc.toDataURL();           // data:image/gif;base64,...
 */
(function (global) {
  'use strict';

  /* ========== ByteArray helper ========== */

  function ByteArray() {
    this.data = [];
  }

  ByteArray.prototype.writeByte = function (b) {
    this.data.push(b & 0xff);
  };

  ByteArray.prototype.writeShort = function (s) {
    this.data.push(s & 0xff);
    this.data.push((s >> 8) & 0xff);
  };

  ByteArray.prototype.writeBytes = function (arr) {
    for (var i = 0; i < arr.length; i++) {
      this.data.push(arr[i] & 0xff);
    }
  };

  ByteArray.prototype.writeUTF = function (str) {
    for (var i = 0; i < str.length; i++) {
      this.data.push(str.charCodeAt(i));
    }
  };

  ByteArray.prototype.toUint8Array = function () {
    return new Uint8Array(this.data);
  };

  /* ========== Median-cut colour quantization ========== */

  function medianCut(colors, maxColors) {
    function createBox(indices) {
      var minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
      for (var i = 0; i < indices.length; i++) {
        var c = colors[indices[i]];
        if (c.r < minR) minR = c.r;
        if (c.r > maxR) maxR = c.r;
        if (c.g < minG) minG = c.g;
        if (c.g > maxG) maxG = c.g;
        if (c.b < minB) minB = c.b;
        if (c.b > maxB) maxB = c.b;
      }
      return {
        indices: indices,
        rangeR: maxR - minR,
        rangeG: maxG - minG,
        rangeB: maxB - minB,
      };
    }

    function splitBox(box) {
      var axis;
      if (box.rangeR >= box.rangeG && box.rangeR >= box.rangeB) axis = 'r';
      else if (box.rangeG >= box.rangeB) axis = 'g';
      else axis = 'b';

      box.indices.sort(function (a, b) {
        return colors[a][axis] - colors[b][axis];
      });

      var mid = Math.floor(box.indices.length / 2);
      return [
        createBox(box.indices.slice(0, mid)),
        createBox(box.indices.slice(mid)),
      ];
    }

    var indices = [];
    for (var i = 0; i < colors.length; i++) indices.push(i);
    var boxes = [createBox(indices)];

    while (boxes.length < maxColors) {
      var bestIdx = -1;
      var bestRange = 0;
      for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].indices.length < 2) continue;
        var range = Math.max(boxes[i].rangeR, boxes[i].rangeG, boxes[i].rangeB);
        if (range > bestRange) {
          bestRange = range;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      var parts = splitBox(boxes[bestIdx]);
      boxes.splice(bestIdx, 1, parts[0], parts[1]);
    }

    var palette = [];
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      var rS = 0, gS = 0, bS = 0, cnt = 0;
      for (var j = 0; j < box.indices.length; j++) {
        var c = colors[box.indices[j]];
        var w = c.count || 1;
        rS += c.r * w;
        gS += c.g * w;
        bS += c.b * w;
        cnt += w;
      }
      palette.push({
        r: Math.round(rS / cnt),
        g: Math.round(gS / cnt),
        b: Math.round(bS / cnt),
      });
    }
    return palette;
  }

  function findClosest(r, g, b, palette) {
    var best = 0;
    var bestDist = Infinity;
    for (var i = 0; i < palette.length; i++) {
      var dr = r - palette[i].r;
      var dg = g - palette[i].g;
      var db = b - palette[i].b;
      var d = dr * dr + dg * dg + db * db;
      if (d < bestDist) {
        bestDist = d;
        best = i;
        if (d === 0) break;
      }
    }
    return best;
  }

  /**
   * Quantize RGBA pixels to a ≤256-colour indexed image.
   * Returns { palette: [{r,g,b},...], indexed: Uint8Array, transparentIndex: number }
   */
  function quantize(rgba, width, height, hasTransparency) {
    var npixels = width * height;
    var uniqueMap = {};
    var uniqueColors = [];

    for (var i = 0; i < npixels; i++) {
      var off = i * 4;
      var a = rgba[off + 3];
      if (hasTransparency && a < 128) continue;
      var r = rgba[off], g = rgba[off + 1], b = rgba[off + 2];
      var key = (r << 16) | (g << 8) | b;
      if (uniqueMap[key] === undefined) {
        uniqueMap[key] = uniqueColors.length;
        uniqueColors.push({ r: r, g: g, b: b, count: 1 });
      } else {
        uniqueColors[uniqueMap[key]].count++;
      }
    }

    var maxSlots = hasTransparency ? 255 : 256;
    var palette;
    if (uniqueColors.length <= maxSlots) {
      palette = uniqueColors;
    } else {
      palette = medianCut(uniqueColors, maxSlots);
    }

    var transparentIndex = -1;
    if (hasTransparency) {
      transparentIndex = palette.length;
      palette.push({ r: 0, g: 0, b: 0 });
    }

    /* Build lookup from RGB key -> palette index for exact matches */
    var exactLookup = {};
    if (uniqueColors.length <= maxSlots) {
      for (var k in uniqueMap) {
        exactLookup[k] = uniqueMap[k];
      }
    }

    var indexed = new Uint8Array(npixels);
    for (var i = 0; i < npixels; i++) {
      var off = i * 4;
      var a = rgba[off + 3];
      if (hasTransparency && a < 128) {
        indexed[i] = transparentIndex;
      } else {
        var r = rgba[off], g = rgba[off + 1], b = rgba[off + 2];
        var key = (r << 16) | (g << 8) | b;
        if (exactLookup[key] !== undefined) {
          indexed[i] = exactLookup[key];
        } else {
          indexed[i] = findClosest(r, g, b, palette);
        }
      }
    }

    return { palette: palette, indexed: indexed, transparentIndex: transparentIndex };
  }

  /* ========== LZW compression ========== */

  function lzwEncode(indexed, minCodeSize) {
    var clearCode = 1 << minCodeSize;
    var eoiCode = clearCode + 1;

    var codeSize = minCodeSize + 1;
    var freeEnt = eoiCode + 1;
    var table = {};

    /* Bit packing into sub-blocks */
    var bits = 0;
    var bitCount = 0;
    var subBlock = [];
    var blocks = [];

    function emit(code) {
      bits |= code << bitCount;
      bitCount += codeSize;
      while (bitCount >= 8) {
        subBlock.push(bits & 0xff);
        bits >>>= 8;
        bitCount -= 8;
        if (subBlock.length === 255) {
          blocks.push(subBlock);
          subBlock = [];
        }
      }
      /* Increase code size when needed (deferred, matching standard decoders) */
      if (freeEnt > (1 << codeSize) - 1 && codeSize < 12) {
        codeSize++;
      }
    }

    function reset() {
      table = {};
      freeEnt = eoiCode + 1;
      codeSize = minCodeSize + 1;
    }

    reset();
    emit(clearCode);

    if (indexed.length === 0) {
      emit(eoiCode);
      if (bitCount > 0) subBlock.push(bits & 0xff);
      if (subBlock.length) blocks.push(subBlock);
      return blocks;
    }

    var current = indexed[0];
    for (var i = 1; i < indexed.length; i++) {
      var px = indexed[i];
      var key = current + ',' + px;
      if (table[key] !== undefined) {
        current = table[key];
      } else {
        emit(current);
        if (freeEnt < 4096) {
          table[key] = freeEnt++;
        } else {
          emit(clearCode);
          reset();
        }
        current = px;
      }
    }

    emit(current);
    emit(eoiCode);

    if (bitCount > 0) subBlock.push(bits & 0xff);
    if (subBlock.length) blocks.push(subBlock);
    return blocks;
  }

  /* ========== GIF binary writer helpers ========== */

  function writePalette(out, palette, palSizeBits) {
    var total = 1 << palSizeBits;
    for (var i = 0; i < total; i++) {
      if (i < palette.length) {
        out.writeByte(palette[i].r);
        out.writeByte(palette[i].g);
        out.writeByte(palette[i].b);
      } else {
        out.writeByte(0);
        out.writeByte(0);
        out.writeByte(0);
      }
    }
  }

  function palSizeBits(count) {
    var b = 1;
    while ((1 << b) < count) b++;
    return Math.max(2, b); // GIF requires minimum 2
  }

  /* ========== GifEncoder class ========== */

  function GifEncoder(width, height) {
    this.width = width;
    this.height = height;
    this.repeat = 0; // 0 = loop forever
    this.frames = [];
  }

  /**
   * Add a frame.
   * @param {HTMLCanvasElement|CanvasRenderingContext2D|ImageData} source
   * @param {object} [opts]
   * @param {number} [opts.delay=80]     Frame delay in milliseconds.
   * @param {number} [opts.dispose=2]    Dispose method (2 = restore to bg).
   */
  GifEncoder.prototype.addFrame = function (source, opts) {
    opts = opts || {};
    var pixels;
    if (source instanceof ImageData) {
      pixels = new Uint8Array(source.data);
    } else if (source instanceof HTMLCanvasElement) {
      pixels = new Uint8Array(
        source.getContext('2d').getImageData(0, 0, this.width, this.height).data,
      );
    } else if (source instanceof CanvasRenderingContext2D) {
      pixels = new Uint8Array(
        source.getImageData(0, 0, this.width, this.height).data,
      );
    } else {
      pixels = new Uint8Array(source);
    }
    this.frames.push({
      pixels: pixels,
      delay: opts.delay !== undefined ? opts.delay : 80,
      dispose: opts.dispose !== undefined ? opts.dispose : 2,
    });
  };

  /** Return the byte length of the encoded GIF (uses cached result). */
  GifEncoder.prototype.byteLength = function () {
    return this.encode().length;
  };

  /** Encode all frames and return a Uint8Array of the complete GIF. */
  GifEncoder.prototype.encode = function () {
    if (this._cachedBytes) return this._cachedBytes;
    var w = this.width;
    var h = this.height;
    var out = new ByteArray();

    /* --- Header --- */
    out.writeUTF('GIF89a');

    /* Quantize first frame to build global colour table */
    var hasTransp = this._anyTransparency(this.frames[0].pixels);
    var q0 = quantize(this.frames[0].pixels, w, h, hasTransp);
    var gctBits = palSizeBits(q0.palette.length);

    /* --- Logical Screen Descriptor --- */
    out.writeShort(w);
    out.writeShort(h);
    /* packed: GCT flag | colour resolution | sort | GCT size */
    out.writeByte(0x80 | ((gctBits - 1) << 4) | (gctBits - 1));
    out.writeByte(0); // bg colour index
    out.writeByte(0); // pixel aspect ratio

    /* --- Global Colour Table --- */
    writePalette(out, q0.palette, gctBits);

    /* --- NETSCAPE2.0 Application Extension (loop) --- */
    out.writeByte(0x21);
    out.writeByte(0xff);
    out.writeByte(11);
    out.writeUTF('NETSCAPE2.0');
    out.writeByte(3);
    out.writeByte(1);
    out.writeShort(this.repeat);
    out.writeByte(0);

    /* --- Frames --- */
    for (var f = 0; f < this.frames.length; f++) {
      var frame = this.frames[f];
      var ht = this._anyTransparency(frame.pixels);
      var q = f === 0 ? q0 : quantize(frame.pixels, w, h, ht);
      var useLocal = f !== 0;
      var localBits = useLocal ? palSizeBits(q.palette.length) : gctBits;
      var minCode = Math.max(2, useLocal ? localBits : gctBits);

      /* Graphic Control Extension */
      out.writeByte(0x21);
      out.writeByte(0xf9);
      out.writeByte(4);
      var transpFlag = q.transparentIndex >= 0 ? 1 : 0;
      out.writeByte((frame.dispose << 2) | transpFlag);
      out.writeShort(Math.round(frame.delay / 10)); // centiseconds
      out.writeByte(transpFlag ? q.transparentIndex : 0);
      out.writeByte(0);

      /* Image Descriptor */
      out.writeByte(0x2c);
      out.writeShort(0); // left
      out.writeShort(0); // top
      out.writeShort(w);
      out.writeShort(h);
      if (useLocal) {
        out.writeByte(0x80 | (localBits - 1));
        writePalette(out, q.palette, localBits);
      } else {
        out.writeByte(0);
      }

      /* LZW-compressed image data */
      out.writeByte(minCode);
      var blocks = lzwEncode(q.indexed, minCode);
      for (var bi = 0; bi < blocks.length; bi++) {
        out.writeByte(blocks[bi].length);
        out.writeBytes(blocks[bi]);
      }
      out.writeByte(0); // block terminator
    }

    /* --- Trailer --- */
    out.writeByte(0x3b);

    this._cachedBytes = out.toUint8Array();
    return this._cachedBytes;
  };

  /** Return a Blob of type image/gif. */
  GifEncoder.prototype.toBlob = function () {
    return new Blob([this.encode()], { type: 'image/gif' });
  };

  /** Return a data:image/gif;base64,… URL. */
  GifEncoder.prototype.toDataURL = function () {
    var bytes = this.encode();
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:image/gif;base64,' + btoa(binary);
  };

  /** @private Check if any pixel has alpha < 128. */
  GifEncoder.prototype._anyTransparency = function (rgba) {
    for (var i = 3; i < rgba.length; i += 4) {
      if (rgba[i] < 128) return true;
    }
    return false;
  };

  global.GifEncoder = GifEncoder;
})(typeof window !== 'undefined' ? window : this);
