(function () {
  const ANIMATION_DEFS = [
    { key: 'scale', label: '拡大縮小', defaultSpeed: 2, controls: [
      { key: 'amount', label: '拡大量', min: 10, max: 50, value: 30, suffix: '%' },
    ] },
    { key: 'rotation', label: '回転', defaultSpeed: 1, cycleFrames: 48, speedControl: { max: 5, value: 1, step: 1 }, toggles: [
      { key: 'reverse', label: 'リバース', value: false },
    ] },
    { key: 'shake', label: 'ぷるぷる', defaultSpeed: 4 },
    { key: 'bounce', label: 'ぴょんぴょん', defaultSpeed: 2 },
    { key: 'heartbeat', label: '心拍', defaultSpeed: 2 },
    { key: 'sway', label: 'ゆらゆら', defaultSpeed: 2 },
    { key: 'dodge', label: '反復横跳び', defaultSpeed: 2 },
    { key: 'spinBack', label: 'ぐるん戻り', defaultSpeed: 1, toggles: [
      { key: 'reverse', label: 'リバース', value: false },
    ] },
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

  const DEFAULT_BASE_SIZE = 128;
  const ANIMATION_TOTAL_FRAMES = 24;
  const ANIMATION_FRAME_DELAY = 70;
  const ANIMATION_STORAGE_VERSION = 3;
  const SLOT_CHARS = '!?#$%&*+0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const textLayout = typeof window !== 'undefined' ? window.TextLayout : null;

  function formatSliderValue(controlDef, value) {
    return String(value) + (controlDef.suffix || '');
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

  function splitAnimationCharacters(text) {
    return textLayout?.splitCharacters
      ? textLayout.splitCharacters(text)
      : [...text];
  }

  function buildSlotText(text, phase, frame) {
    const chars = splitAnimationCharacters(text);
    if (phase > 0.82) return text;

    const stopCount = Math.floor((phase / 0.82) * (chars.length + 1));
    return chars.map((ch, i) => {
      if (ch === ' ' || i < stopCount) return ch;
      const index = (frame * 7 + i * 13 + Math.floor(phase * 30)) % SLOT_CHARS.length;
      return SLOT_CHARS[index];
    }).join('');
  }

  function buildTypingText(text, phase) {
    const chars = splitAnimationCharacters(text);
    if (phase > 0.78) return text;

    const count = Math.floor((phase / 0.78) * (chars.length + 1));
    return chars.slice(0, count).join('');
  }

  function measureCanvasAlphaBounds(canvas, padding) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    let data;
    try {
      data = ctx.getImageData(0, 0, width, height).data;
    } catch (_) {
      return null;
    }
    let top = height;
    let bottom = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 0) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }

    if (bottom < top) return null;
    return {
      top: top - padding,
      bottom: bottom - padding,
    };
  }

  const EFFECTS = {
    scale({ phase, opts, getControlValue }) {
      const amount = getControlValue('scale', 'amount', 30) / 100;
      const scale = 1 + amount * Math.sin(2 * Math.PI * phase);
      multiplyScale(opts, scale, scale);
    },

    rotation({ phase, opts, getToggleValue }) {
      const direction = getToggleValue('rotation', 'reverse') ? -1 : 1;
      addRotation(opts, direction * 360 * phase);
    },

    shake({ phase, opts }) {
      addTranslate(opts, Math.sin(2 * Math.PI * phase) * 8, Math.sin(2 * Math.PI * phase * 2) * 1.5);
      addRotation(opts, Math.sin(2 * Math.PI * phase * 2) * 3);
    },

    bounce({ phase, opts }) {
      const jump = Math.sin(Math.PI * phase);
      const landing = Math.pow(Math.max(0, Math.cos(2 * Math.PI * phase)), 8);
      addTranslate(opts, 0, -24 * jump + 5 * landing);
      multiplyScale(opts, 1 + 0.16 * landing, 1 - 0.13 * landing);
    },

    heartbeat({ phase, opts }) {
      const beat = pulse(phase, 0.16, 0.055) + pulse(phase, 0.34, 0.075) * 0.75;
      const scale = 1 + 0.28 * beat;
      multiplyScale(opts, scale, scale);
    },

    sway({ phase, opts }) {
      addRotation(opts, Math.sin(2 * Math.PI * phase) * 12);
    },

    dodge({ phase, opts }) {
      addTranslate(opts, Math.sin(2 * Math.PI * phase) * 28, 0);
    },

    spinBack({ phase, opts, getToggleValue }) {
      const rotation = phase < 0.68
        ? 360 * easeOutCubic(phase / 0.68)
        : 360 * (1 - easeInOutCubic((phase - 0.68) / 0.32));
      const direction = getToggleValue('spinBack', 'reverse') ? -1 : 1;
      addRotation(opts, direction * rotation);
    },

    pop({ phase, opts }) {
      const scale = 1 + 0.58 * pulse(phase, 0.14, 0.08) - 0.12 * pulse(phase, 0.36, 0.11);
      multiplyScale(opts, scale, scale);
    },

    jitter({ frame, opts, getSpeed }) {
      const bucket = Math.floor((frame + 1) * getSpeed('jitter') * 1.7);
      addTranslate(opts, (hash01(bucket) - 0.5) * 14, (hash01(bucket + 9) - 0.5) * 10);
      addRotation(opts, (hash01(bucket + 17) - 0.5) * 14);
    },

    glitch({ frame, opts, getSpeed }) {
      const bucket = Math.floor((frame + 1) * getSpeed('glitch') * 1.25);
      opts.glitch = true;
      opts.glitchSeed = bucket;
      opts.glitchAmount = 0.8 + hash01(bucket + 3) * 0.8;
      if (hash01(bucket + 7) > 0.55) {
        addTranslate(opts, (hash01(bucket + 13) - 0.5) * 8, 0);
      }
    },

    slot({ phase, frame, opts, baseText }) {
      opts.text = buildSlotText(baseText, phase, frame);
    },

    blink({ phase, opts }) {
      opts.textColor = phase < 0.5 ? '#ffd900' : '#ff2f3f';
      opts.borderColor = phase < 0.5 ? '#3d2500' : '#ffffff';
      opts.bgColor = phase < 0.5 ? '#1f1f1f' : '#ffcc00';
    },

    rainbow({ phase, opts }) {
      opts.textColor = `hsl(${Math.round(phase * 360)}, 100%, 62%)`;
    },

    typing({ phase, opts, baseText }) {
      opts.text = buildTypingText(baseText, phase);
    },

    squash({ phase, opts }) {
      const squash = pulse(phase, 0.18, 0.16);
      multiplyScale(opts, 1 + 0.28 * squash, 1 - 0.42 * squash);
      addTranslate(opts, 0, 10 * squash);
    },

    warp({ phase, opts }) {
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
    },

    zoom({ phase, opts }) {
      const t = phase < 0.78 ? easeOutBack(phase / 0.78) : 1;
      const scale = 0.18 + 0.82 * t;
      multiplyScale(opts, scale, scale);
      multiplyAlpha(opts, Math.min(1, phase * 5));
    },
  };

  class AnimationEngine {
    constructor({ controls, baseSize }) {
      this.controls = controls;
      this.baseSize = baseSize || DEFAULT_BASE_SIZE;
      this.measurePadding = this.baseSize * 2;
    }

    isEnabled() {
      return Object.values(this.controls).some(control => control.checkbox.checked);
    }

    getSpeed(key) {
      const slider = this.controls[key]?.sliders.speed;
      const speed = slider ? parseInt(slider.input.value, 10) : 1;
      return Number.isFinite(speed) ? speed : 1;
    }

    getSpeedDivisor(key) {
      const slider = this.controls[key]?.sliders.speed;
      const divisor = slider?.def.speedDivisor;
      return Number.isFinite(divisor) && divisor > 0 ? divisor : 1;
    }

    getCycleFrames(key) {
      const frames = this.controls[key]?.def.cycleFrames;
      return Number.isFinite(frames) ? frames : ANIMATION_TOTAL_FRAMES;
    }

    getFrameCount() {
      return Object.values(this.controls).reduce((frameCount, control) => {
        if (!control.checkbox.checked) return frameCount;
        return Math.max(frameCount, this.getCycleFrames(control.def.key));
      }, ANIMATION_TOTAL_FRAMES);
    }

    getControlValue(key, controlKey, fallback) {
      const slider = this.controls[key]?.sliders[controlKey];
      const value = slider ? parseFloat(slider.input.value) : fallback;
      return Number.isFinite(value) ? value : fallback;
    }

    getToggleValue(key, toggleKey, fallback) {
      const toggle = this.controls[key]?.toggles[toggleKey];
      return toggle ? toggle.input.checked : Boolean(fallback);
    }

    getPhase(frame, speed, cycleFrames, speedDivisor = 1) {
      return ((frame / cycleFrames) * speed / speedDivisor) % 1;
    }

    normalizeFrameTranslation(opts) {
      const unit = this.baseSize / DEFAULT_BASE_SIZE;
      if (unit === 1) return;
      if (opts.translateX !== undefined) opts.translateX *= unit;
      if (opts.translateY !== undefined) opts.translateY *= unit;
    }

    applyEffect(key, phase, frame, opts, baseText) {
      const effect = EFFECTS[key];
      if (!effect) return;

      effect({
        key,
        phase,
        frame,
        opts,
        baseText,
        getSpeed: effectKey => this.getSpeed(effectKey),
        getControlValue: (effectKey, controlKey, fallback) => {
          return this.getControlValue(effectKey, controlKey, fallback);
        },
        getToggleValue: (effectKey, toggleKey, fallback) => {
          return this.getToggleValue(effectKey, toggleKey, fallback);
        },
      });
    }

    buildFrameOptions(frame, baseText, animationLayout) {
      const text = baseText || ' ';
      const opts = { text };

      ANIMATION_DEFS.forEach(def => {
        const control = this.controls[def.key];
        if (!control?.checkbox.checked) return;

        const speed = this.getSpeed(def.key);
        this.applyEffect(def.key, this.getPhase(frame, speed, this.getCycleFrames(def.key), this.getSpeedDivisor(def.key)), frame, opts, text);
      });
      this.normalizeFrameTranslation(opts);

      if (animationLayout?.offsetY) {
        addTranslate(opts, 0, animationLayout.offsetY);
      }

      return opts;
    }

    buildLayout(fontSize, drawEmoji, baseText) {
      let top = Infinity;
      let bottom = -Infinity;

      const frameCount = this.getFrameCount();
      for (let frame = 0; frame < frameCount; frame++) {
        const frameCanvas = drawEmoji(this.baseSize, fontSize, {
          ...this.buildFrameOptions(frame, baseText),
          skipBackground: true,
          outputPadding: this.measurePadding,
        });
        const bounds = measureCanvasAlphaBounds(frameCanvas, this.measurePadding);
        if (!bounds) continue;

        top = Math.min(top, bounds.top);
        bottom = Math.max(bottom, bounds.bottom);
      }

      if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
        return { offsetY: 0 };
      }

      const animationCenterY = (top + bottom + 1) / 2;
      return { offsetY: this.baseSize / 2 - animationCenterY };
    }

    buildGif(size, fontSize, animationLayout, drawEmoji, baseText) {
      var encoder = new GifEncoder(size, size);
      const frameCount = this.getFrameCount();
      for (var frame = 0; frame < frameCount; frame++) {
        encoder.addFrame(
          drawEmoji(size, fontSize, this.buildFrameOptions(frame, baseText, animationLayout)),
          { delay: ANIMATION_FRAME_DELAY },
        );
      }
      return encoder;
    }
  }

  class AnimationManager {
    constructor({ toggle, body, count, clearButton, container, onChange, baseSize }) {
      this.toggle = toggle;
      this.body = body;
      this.count = count;
      this.clearButton = clearButton;
      this.container = container;
      this.onChange = onChange || function () {};
      this.baseSize = baseSize || DEFAULT_BASE_SIZE;
      this.expanded = true;
      this.controls = this.buildControls();
      this.engine = new AnimationEngine({
        controls: this.controls,
        baseSize: this.baseSize,
      });

      this.toggle.addEventListener('click', () => {
        this.setExpanded(!this.expanded);
        this.notifyChange();
      });

      this.clearButton.addEventListener('click', () => {
        Object.values(this.controls).forEach(control => {
          control.checkbox.checked = false;
        });
        this.applyVisibility();
        this.notifyChange();
      });

      this.setExpanded(this.expanded);
      this.applyVisibility();
    }

    notifyChange() {
      this.onChange();
    }

    buildControls() {
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
          { key: 'speed', label: '速度', min: 1, max: 5, value: def.defaultSpeed || 3, suffix: '', ...(def.speedControl || {}) },
        ];
        const sliders = {};
        const toggles = {};

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
          if (controlDef.step !== undefined) {
            input.step = controlDef.step;
          }
          input.value = controlDef.value;

          const value = document.createElement('span');
          value.className = 'font-size-value';
          value.id = controlId + '-value';
          value.textContent = formatSliderValue(controlDef, input.value);

          input.addEventListener('input', () => {
            value.textContent = formatSliderValue(controlDef, input.value);
            this.notifyChange();
          });

          rowInner.appendChild(input);
          rowInner.appendChild(value);
          control.appendChild(controlLabel);
          control.appendChild(rowInner);
          sub.appendChild(control);

          sliders[controlDef.key] = { input, value, def: controlDef };
        });

        (def.toggles || []).forEach(toggleDef => {
          const control = document.createElement('div');
          control.className = 'anim-control anim-control-checkbox';

          const controlLabel = document.createElement('label');
          controlLabel.htmlFor = `anim-${def.key}-${toggleDef.key}`;
          controlLabel.textContent = toggleDef.label;

          const rowInner = document.createElement('div');
          rowInner.className = 'anim-checkbox-row';

          const input = document.createElement('input');
          input.type = 'checkbox';
          input.id = controlLabel.htmlFor;
          input.checked = Boolean(toggleDef.value);

          input.addEventListener('change', () => {
            this.notifyChange();
          });

          rowInner.appendChild(input);
          control.appendChild(controlLabel);
          control.appendChild(rowInner);
          sub.appendChild(control);

          toggles[toggleDef.key] = { input, def: toggleDef };
        });

        checkbox.addEventListener('change', () => {
          this.applyVisibility();
          this.notifyChange();
        });

        row.appendChild(label);
        row.appendChild(sub);
        this.container.appendChild(row);

        controls[def.key] = { def, checkbox, sub, sliders, toggles };
      });

      return controls;
    }

    setSliderValue(slider, value) {
      if (!slider || value === undefined) return;
      slider.input.value = value;
      slider.value.textContent = formatSliderValue(slider.def, slider.input.value);
    }

    getEnabledCount() {
      return Object.values(this.controls).filter(control => control.checkbox.checked).length;
    }

    updateCount() {
      const enabledCount = this.getEnabledCount();
      this.count.textContent = String(enabledCount);
      this.clearButton.disabled = enabledCount === 0;
    }

    setExpanded(expanded) {
      this.expanded = expanded;
      this.toggle.classList.toggle('collapsed', !expanded);
      this.toggle.setAttribute('aria-expanded', String(expanded));
      this.body.classList.toggle('collapsed', !expanded);
    }

    applyVisibility() {
      Object.values(this.controls).forEach(control => {
        const visible = control.checkbox.checked;
        control.sub.classList.toggle('visible', visible);
        control.sub.setAttribute('aria-hidden', String(!visible));
      });
      this.updateCount();
    }

    getAnimationSettings() {
      const animations = {};
      Object.entries(this.controls).forEach(([key, control]) => {
        animations[key] = {
          enabled: control.checkbox.checked,
        };
        Object.entries(control.sliders).forEach(([sliderKey, slider]) => {
          animations[key][sliderKey] = slider.input.value;
        });
        Object.entries(control.toggles).forEach(([toggleKey, toggle]) => {
          animations[key][toggleKey] = toggle.input.checked;
        });
      });
      return animations;
    }

    getStorageState() {
      const animations = this.getAnimationSettings();
      return {
        animationExpanded: this.expanded,
        animationStorageVersion: ANIMATION_STORAGE_VERSION,
        animations: animations,
        animScale: animations.scale.enabled,
        scaleAmount: animations.scale.amount,
        animRotation: animations.rotation.enabled,
        rotationSpeed: animations.rotation.speed,
      };
    }

    applyStorageState(settings) {
      if (!settings) return;

      if (settings.animationExpanded !== undefined) {
        this.setExpanded(settings.animationExpanded);
      }

      this.applyStoredAnimationSettings(settings);
    }

    normalizeStoredSliderValue(key, sliderKey, slider, value, settings) {
      if (key !== 'rotation' || sliderKey !== 'speed') return value;
      if (settings.animationStorageVersion >= ANIMATION_STORAGE_VERSION) return value;

      const speed = parseFloat(value);
      if (!Number.isFinite(speed)) return value;

      const min = parseInt(slider.input.min, 10);
      const max = parseInt(slider.input.max, 10);
      const version = settings.animationStorageVersion || 0;
      // v2 stored slider values 1-10 with speedDivisor=2 (effective speed 0.5-5), convert to direct speed 1-5
      const normalized = version === 2 ? Math.round(speed / 2) : Math.round(speed);
      return String(Math.min(max, Math.max(min, normalized)));
    }

    applyStoredAnimationSettings(settings) {
      const storedAnimations = settings.animations || {};

      Object.entries(this.controls).forEach(([key, control]) => {
        const stored = storedAnimations[key] || {};

        if (stored.enabled !== undefined) {
          control.checkbox.checked = stored.enabled;
        }
        Object.entries(control.sliders).forEach(([sliderKey, slider]) => {
          if (stored[sliderKey] !== undefined) {
            this.setSliderValue(slider, this.normalizeStoredSliderValue(key, sliderKey, slider, stored[sliderKey], settings));
          }
        });
        Object.entries(control.toggles).forEach(([toggleKey, toggle]) => {
          if (stored[toggleKey] !== undefined) {
            toggle.input.checked = Boolean(stored[toggleKey]);
          }
        });
      });

      if (!storedAnimations.scale) {
        if (settings.animScale !== undefined) {
          this.controls.scale.checkbox.checked = settings.animScale;
        }
        if (settings.scaleAmount !== undefined) {
          this.setSliderValue(this.controls.scale.sliders.amount, settings.scaleAmount);
        }
      }
      if (!storedAnimations.rotation) {
        if (settings.animRotation !== undefined) {
          this.controls.rotation.checkbox.checked = settings.animRotation;
        }
        if (settings.rotationSpeed !== undefined) {
          const slider = this.controls.rotation.sliders.speed;
          this.setSliderValue(slider, this.normalizeStoredSliderValue('rotation', 'speed', slider, settings.rotationSpeed, settings));
        }
      }

      this.applyVisibility();
    }

    isEnabled() {
      return this.engine.isEnabled();
    }

    buildLayout(fontSize, drawEmoji, baseText) {
      return this.engine.buildLayout(fontSize, drawEmoji, baseText);
    }

    buildGif(size, fontSize, animationLayout, drawEmoji, baseText) {
      return this.engine.buildGif(size, fontSize, animationLayout, drawEmoji, baseText);
    }
  }

  window.AnimationManager = AnimationManager;
})();
