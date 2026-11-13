/* 효과음: 파일 없이 브라우저에서 직접 만들어 재생합니다 (오프라인) */
const SFX = {
  ctx:null, on:true,
  wake(){
    if (!this.ctx){ const A = window.AudioContext || window.webkitAudioContext; if (!A) return; this.ctx = new A(); }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  note(f, t, d, type = 'triangle', v = .16){
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .012); g.gain.exponentialRampToValueAtTime(.0008, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + .02);
  },
  noise(t, d, from, to, v = .1){
    const c = this.ctx, b = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; fl.type = 'bandpass'; fl.Q.value = 1.2; fl.frequency.setValueAtTime(from, t); fl.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0008, t + d);
    s.connect(fl); fl.connect(g); g.connect(c.destination); s.start(t);
  },
  play(name){
    if (!this.on) return;
    this.wake();
    if (!this.ctx || !SOUNDS[name]) return;
    SOUNDS[name](this, this.ctx.currentTime);
  }
};
const seq = (s, t, list, gap, d, type, v) => list.forEach((f, i) => s.note(f, t + i * gap, d, type, v));
const SOUNDS = {
  tap:(s, t) => s.note(740, t, .09, 'sine', .14),
  pick:(s, t) => { s.note(520, t, .07, 'triangle'); s.note(780, t + .05, .1, 'triangle'); },
  inspect:(s, t) => seq(s, t, [660, 880], .07, .1, 'sine', .13),
  clue:(s, t) => seq(s, t, [660, 880, 1046, 1318], .08, .24, 'triangle', .16),
  again:(s, t) => seq(s, t, [660, 523], .1, .16, 'sine', .13),
  talk:(s, t) => seq(s, t, [392, 494], .06, .09, 'square', .05),
  door:(s, t) => { s.noise(t, .3, 300, 1400, .16); s.note(180, t + .22, .14, 'triangle', .14); },
  paper:(s, t) => s.noise(t, .18, 3200, 1500, .12),
  locked:(s, t) => seq(s, t, [196, 165], .1, .14, 'square', .07),
  unlock:(s, t) => seq(s, t, [523, 659, 784, 1046], .1, .3, 'triangle', .17),
  step:(s, t) => seq(s, t, [587, 784], .07, .13, 'triangle', .13),
  submit:(s, t) => { s.noise(t, .16, 2600, 1200, .12); s.note(330, t + .12, .18, 'triangle', .16); },
  great:(s, t) => { seq(s, t, [523, 659, 784, 1046, 1318], .12, .34, 'triangle', .17); seq(s, t + .6, [784, 1046, 1568], .05, .5, 'sine', .12); },
  good:(s, t) => seq(s, t, [523, 659, 784], .13, .32, 'triangle', .16),
  retry:(s, t) => seq(s, t, [440, 392, 494], .15, .26, 'sine', .15)
};
