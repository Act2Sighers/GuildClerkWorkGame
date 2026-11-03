// 効果音（音声ファイルは使わず Web Audio で合成）
'use strict';

const SFX = (() => {
  const PREF_KEY = 'guild-clerk-sound';
  const A = { ctx: null, master: null, noise: null, on: true };
  try { if (localStorage.getItem(PREF_KEY) === 'off') A.on = false; } catch (e) { /* noop */ }

  function init() {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    try {
      A.ctx = new C();
      A.master = A.ctx.createGain();
      A.master.gain.value = A.on ? 0.6 : 0;
      A.master.connect(A.ctx.destination);
      const len = A.ctx.sampleRate;
      A.noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const d = A.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { A.ctx = null; }
  }
  function setOn(v) {
    A.on = v;
    try { localStorage.setItem(PREF_KEY, v ? 'on' : 'off'); } catch (e) { /* noop */ }
    if (A.master) A.master.gain.setTargetAtTime(v ? 0.6 : 0, A.ctx.currentTime, 0.02);
  }
  function ok() { return A.ctx && A.on; }
  function tone(f, d, type, v, to, delay) {
    if (!ok()) return;
    const t = A.ctx.currentTime + (delay || 0);
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v || 0.1, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(A.master);
    o.start(t); o.stop(t + d + 0.05);
  }
  function noise(d, v, type, freq, delay, q) {
    if (!ok()) return;
    const t = A.ctx.currentTime + (delay || 0);
    const s = A.ctx.createBufferSource(); s.buffer = A.noise;
    const f = A.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(A.master);
    s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05);
  }
  const bellNote = (f, delay, v) => { tone(f, 0.9, 'sine', v || 0.09, null, delay); tone(f * 2.76, 0.35, 'sine', (v || 0.09) * 0.35, null, delay); };

  const fx = {
    click() { tone(880, 0.03, 'square', 0.03); },
    grab() { tone(520, 0.05, 'triangle', 0.08); tone(700, 0.05, 'triangle', 0.05, null, 0.03); },
    bell() { bellNote(1318, 0, 0.08); bellNote(1568, 0.12, 0.07); },               // 来訪（ドアベル）
    back() { bellNote(988, 0, 0.08); bellNote(1318, 0.14, 0.08); bellNote(1760, 0.28, 0.05); }, // 帰還
    stamp() { noise(0.09, 0.35, 'lowpass', 700); tone(110, 0.12, 'sine', 0.25, 60); },
    good() { [784, 988, 1318].forEach((f, i) => tone(f, 0.18, 'triangle', 0.08, null, i * 0.07)); },
    bad() { tone(220, 0.16, 'square', 0.05); tone(165, 0.24, 'square', 0.05, null, 0.12); },
    deny() { tone(140, 0.09, 'square', 0.05); tone(120, 0.09, 'square', 0.05, null, 0.1); },
    coin() { tone(1975, 0.08, 'square', 0.035); tone(2637, 0.25, 'square', 0.035, null, 0.07); },
    clink() { tone(2400 + Math.random() * 400, 0.12, 'sine', 0.06); tone(3600, 0.06, 'sine', 0.025, null, 0.01); },
    soft() { tone(660, 0.06, 'triangle', 0.05, 440); },
    tag() { noise(0.05, 0.12, 'highpass', 3000); tone(1200, 0.03, 'square', 0.02); },
    paper() { noise(0.22, 0.08, 'bandpass', 2500, 0, 0.8); },
    creak() { tone(180, 0.25, 'sawtooth', 0.04, 140); noise(0.12, 0.12, 'lowpass', 900, 0.08); },
    thump() { noise(0.12, 0.3, 'lowpass', 400); tone(90, 0.14, 'sine', 0.2, 50); },
    open() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, null, i * 0.09)); },
    close() { bellNote(784, 0, 0.09); bellNote(659, 0.3, 0.09); bellNote(523, 0.6, 0.09); },
    fanfare() { [523, 659, 784, 1046, 1318].forEach((f, i) => { tone(f, 0.4, 'triangle', 0.08, null, i * 0.1); }); },
    pop() { tone(820, 0.07, 'square', 0.04, 260); noise(0.04, 0.1, 'highpass', 2000); },        // 栓が抜ける・はまる
    splash() { noise(0.16, 0.12, 'bandpass', 900 + Math.random() * 500, 0, 1.2); },              // 水の中で振る
    rub() { noise(0.07, 0.06, 'highpass', 4200 + Math.random() * 800); },                        // 布でこする
    sparkle() { [1568, 2093, 2637].forEach((f, i) => tone(f, 0.16, 'sine', 0.05, null, i * 0.06)); },
    buzz() { tone(98, 0.32, 'sawtooth', 0.07); tone(104, 0.32, 'square', 0.04); },              // 合わない栓
    night() { tone(392, 0.8, 'sine', 0.06); tone(494, 0.8, 'sine', 0.05, null, 0.2); tone(587, 1.0, 'sine', 0.05, null, 0.4); },
  };
  return { init, setOn, isOn: () => A.on, ...fx };
})();
