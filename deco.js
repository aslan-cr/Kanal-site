// Süs butonları + ses efektleri. Süs butonları hiçbir şey yapmaz, sadece eğlence için.
(function () {
  /* ---------------- Ses motoru (Web Audio, dosya gerektirmez) ---------------- */
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem("rsa-muted") === "1"; } catch (e) {}

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone({ type = "square", f0 = 440, f1 = f0, t = 0, dur = 0.15, vol = 0.15, curve = "exp" }) {
    const a = ac(); if (!a) return;
    const now = a.currentTime + t;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, now);
    if (f1 !== f0) {
      if (curve === "exp") o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + dur);
      else o.frequency.linearRampToValueAtTime(f1, now + dur);
    }
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(a.destination);
    o.start(now);
    o.stop(now + dur + 0.02);
  }

  let noiseBuf = null;
  function noise({ t = 0, dur = 0.2, vol = 0.2, filter = "lowpass", f0 = 1000, f1 = f0, q = 1 }) {
    const a = ac(); if (!a) return;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const now = a.currentTime + t;
    const s = a.createBufferSource();
    s.buffer = noiseBuf;
    const f = a.createBiquadFilter();
    f.type = filter; f.Q.value = q;
    f.frequency.setValueAtTime(f0, now);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, now + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    s.connect(f).connect(g).connect(a.destination);
    s.start(now);
    s.stop(now + dur + 0.02);
  }

  const SOUNDS = {
    click() { tone({ f0: 1400, f1: 700, dur: 0.06, vol: 0.08 }); },
    play() { [523, 659, 784, 1047].forEach((f, i) => tone({ type: "triangle", f0: f, t: i * 0.07, dur: 0.18, vol: 0.18 })); },
    whoosh() { noise({ dur: 0.35, vol: 0.35, filter: "bandpass", f0: 300, f1: 3000, q: 2 }); },
    boing() { tone({ type: "sine", f0: 120, f1: 520, dur: 0.12, vol: 0.25 }); tone({ type: "sine", f0: 520, f1: 260, t: 0.12, dur: 0.25, vol: 0.2 }); },
    spin() { for (let i = 0; i < 4; i++) tone({ type: "sawtooth", f0: 300 + i * 120, f1: 700 + i * 120, t: i * 0.06, dur: 0.08, vol: 0.06 }); },
    thud() { tone({ type: "sine", f0: 160, f1: 40, dur: 0.25, vol: 0.4 }); noise({ dur: 0.08, vol: 0.2, f0: 800 }); },
    typing() { for (let i = 0; i < 7; i++) noise({ t: i * 0.055 + Math.random() * 0.02, dur: 0.03, vol: 0.25, filter: "highpass", f0: 2500 }); },
    chime() { tone({ type: "sine", f0: 880, dur: 0.6, vol: 0.18 }); tone({ type: "sine", f0: 1320, t: 0.08, dur: 0.7, vol: 0.14 }); tone({ type: "sine", f0: 1760, t: 0.16, dur: 0.8, vol: 0.08 }); },
    glitch() { for (let i = 0; i < 9; i++) tone({ type: "square", f0: 100 + Math.random() * 1400, t: i * 0.035, dur: 0.03, vol: 0.08 }); },
    lag() { [0, 0.12, 0.2, 0.38, 0.44].forEach((t, i) => tone({ type: "square", f0: 440 - i * 50, t, dur: 0.05, vol: 0.09 })); tone({ type: "sawtooth", f0: 300, f1: 60, t: 0.5, dur: 0.35, vol: 0.08 }); },
    coin() { tone({ type: "square", f0: 988, dur: 0.08, vol: 0.1 }); tone({ type: "square", f0: 1319, t: 0.08, dur: 0.3, vol: 0.1 }); },
    jump() { tone({ type: "square", f0: 260, f1: 900, dur: 0.18, vol: 0.1 }); },
    boom() { noise({ dur: 0.8, vol: 0.6, filter: "lowpass", f0: 1200, f1: 60 }); tone({ type: "sine", f0: 90, f1: 30, dur: 0.6, vol: 0.4 }); },
    gear() { for (let i = 0; i < 6; i++) noise({ t: i * 0.06, dur: 0.04, vol: 0.3, filter: "bandpass", f0: 1800 - i * 150, q: 8 }); },
  };

  function play(name) {
    if (muted) return;
    try { (SOUNDS[name] || SOUNDS.click)(); } catch (e) {}
  }

  /* ---------------- Şekiller (SVG) ---------------- */
  const pts = (n, rOut, rIn, cx = 32, cy = 31, rot = -90) =>
    Array.from({ length: n * 2 }, (_, i) => {
      const r = i % 2 ? rIn : rOut;
      const a = ((rot + i * (180 / n)) * Math.PI) / 180;
      return (cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1);
    }).join(" ");

  const gearPts = Array.from({ length: 40 }, (_, i) => {
    const r = Math.floor(i / 2) % 2 ? 21 : 28;
    const a = ((i * 9 + 4.5) * Math.PI) / 180;
    return (32 + r * Math.cos(a)).toFixed(1) + "," + (30 + r * Math.sin(a)).toFixed(1);
  }).join(" ");

  const octPts = Array.from({ length: 8 }, (_, i) => {
    const a = ((22.5 + i * 45) * Math.PI) / 180;
    return (32 + 27 * Math.cos(a)).toFixed(1) + "," + (30 + 27 * Math.sin(a)).toFixed(1);
  }).join(" ");

  const SHAPES = {
    circle: (f) => `<circle cx="32" cy="30" r="26" fill="${f}"/>`,
    hex: (f) => `<polygon points="32,3 57,17 57,43 32,57 7,43 7,17" fill="${f}" stroke="${f}" stroke-width="4" stroke-linejoin="round"/>`,
    diamond: (f) => `<polygon points="32,4 58,30 32,56 6,30" fill="${f}" stroke="${f}" stroke-width="6" stroke-linejoin="round"/>`,
    star: (f) => `<polygon points="${pts(5, 29, 14)}" fill="${f}" stroke="${f}" stroke-width="4" stroke-linejoin="round"/>`,
    squircle: (f) => `<rect x="7" y="5" width="50" height="50" rx="14" fill="${f}" transform="rotate(-8 32 30)"/>`,
    cloud: (f) => `<path d="M17 48h31a11 11 0 0 0 1.5-21.9A16 16 0 0 0 19 21.5 13.5 13.5 0 0 0 17 48Z" fill="${f}"/>`,
    pill: (f) => `<rect x="3" y="13" width="58" height="34" rx="17" fill="${f}"/>`,
    oct: (f) => `<polygon points="${octPts}" fill="${f}" stroke="${f}" stroke-width="3" stroke-linejoin="round"/>`,
    gear: (f) => `<polygon points="${gearPts}" fill="${f}" stroke="${f}" stroke-width="2" stroke-linejoin="round"/>`,
    tri: (f) => `<polygon points="32,7 57,52 7,52" fill="${f}" stroke="${f}" stroke-width="8" stroke-linejoin="round"/>`,
  };

  const W = `fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"`;
  const ICONS = {
    play: `<polygon points="26,18 26,42 45,30" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`,
    move: `<path ${W} d="M32 13v34M15 30h34M32 13l-5 5M32 13l5 5M32 47l-5-5M32 47l5-5M15 30l5-5M15 30l5 5M49 30l-5-5M49 30l-5 5"/>`,
    scale: `<path ${W} d="M19 25v17h17M27 34l16-16M34 18h9v9"/>`,
    rotate: `<path ${W} d="M45 32a13 13 0 1 1-4-12M43 13v8h-8"/>`,
    script: `<text x="32" y="37" text-anchor="middle" font-family="monospace" font-weight="900" font-size="19" fill="#fff" transform="rotate(-8 32 30)">&lt;/&gt;</text>`,
    publish: `<path ${W} d="M32 44V27M24 34l8-8 8 8"/>`,
    bug: `<g><ellipse cx="32" cy="35" rx="9" ry="11" fill="#fff"/><circle cx="32" cy="21" r="5.5" fill="#fff"/><path d="M32 25v21" stroke="#d92626" stroke-width="2"/><path ${W} stroke-width="3" d="M23 31l-6-3M23 36h-7M24 42l-6 3M41 31l6-3M41 36h7M40 42l6 3M29 17l-3-4M35 17l3-4"/></g>`,
    lag: `<text x="32" y="36.5" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="18" fill="#3a2a00">LAG</text>`,
    coin: `<circle cx="32" cy="30" r="18" fill="none" stroke="#fff6" stroke-width="3"/><text x="32" y="38" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="22" fill="#fff">$</text>`,
    gear: `<circle cx="32" cy="30" r="8" fill="#0005"/>`,
    jump: `<path ${W} d="M24 46l8-8 8 8M24 37l8-8 8 8"/>`,
    star: `<ellipse cx="25" cy="22" rx="5" ry="3" fill="#fff8" transform="rotate(-30 25 22)"/>`,
  };

  // Özel şekiller (kendi 3D'si olanlar)
  const CUSTOM = {
    part: () => `<polygon points="32,5 57,18 32,31 7,18" fill="#c9ced8"/><polygon points="7,18 32,31 32,59 7,46" fill="#8b93a3"/><polygon points="57,18 32,31 32,59 57,46" fill="#a9b0bd"/><polygon points="32,10 46,17.5 32,25 18,17.5" fill="#fff3"/>`,
    bomb: () => `<circle cx="30" cy="37" r="21" fill="#151820"/><circle cx="30" cy="40" r="21" fill="#000" opacity=".35"/><circle cx="30" cy="37" r="21" fill="#2b303c"/><ellipse cx="22" cy="29" rx="6" ry="4" fill="#fff3" transform="rotate(-35 22 29)"/><rect x="36" y="13" width="10" height="9" rx="2" fill="#555c6b" transform="rotate(35 41 17)"/><path d="M44 13q4-9 11-7" fill="none" stroke="#c9a46b" stroke-width="3" stroke-linecap="round"/><polygon points="${pts(4, 6, 2.2, 56, 6, 0)}" fill="#ffcf33"/>`,
  };

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const c = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
    return "#" + ((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, "0");
  }

  function svgFor(d) {
    let inner;
    if (CUSTOM[d.custom]) inner = CUSTOM[d.custom]();
    else {
      const sh = SHAPES[d.shape];
      inner = `<g transform="translate(0 4)">${sh(shade(d.color, 0.62))}</g>${sh(d.color)}<g class="deco-icon">${ICONS[d.icon] || ""}</g>`;
    }
    return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">${inner}</svg>`;
  }

  /* ---------------- Süs butonu tanımları ---------------- */
  const D = {
    play:    { shape: "circle",   color: "#00c46a", icon: "play",    sound: "play",   label: "Test Et" },
    move:    { shape: "hex",      color: "#3ba7ff", icon: "move",    sound: "whoosh", label: "Taşı" },
    scale:   { shape: "diamond",  color: "#9b5cff", icon: "scale",   sound: "boing",  label: "Boyutlandır" },
    rotate:  { shape: "circle",   color: "#ff8a1f", icon: "rotate",  sound: "spin",   label: "Döndür" },
    part:    { custom: "part",                                       sound: "thud",   label: "Part" },
    script:  { shape: "squircle", color: "#2f5bd3", icon: "script",  sound: "typing", label: "Script" },
    publish: { shape: "cloud",    color: "#45c4f0", icon: "publish", sound: "chime",  label: "Yayınla" },
    bug:     { shape: "oct",      color: "#ff3b3b", icon: "bug",     sound: "glitch", label: "Bug" },
    lag:     { shape: "pill",     color: "#ffcf33", icon: "lag",     sound: "lag",    label: "Lag" },
    coin:    { shape: "circle",   color: "#f5b400", icon: "coin",    sound: "coin",   label: "Para" },
    gear:    { shape: "gear",     color: "#7d8696", icon: "gear",    sound: "gear",   label: "Unutulan Ayarlar" },
    jump:    { shape: "tri",      color: "#14b8a6", icon: "jump",    sound: "jump",   label: "Zıpla" },
    bomb:    { custom: "bomb",                                       sound: "boom",   label: "Bomba" },
    star:    { shape: "star",     color: "#ffcf33", icon: "star",    sound: "chime",  label: "Yıldız" },
  };

  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function makeDeco(key, extraClass, style) {
    const d = D[key];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "deco " + (extraClass || "");
    b.tabIndex = -1;
    b.setAttribute("aria-hidden", "true");
    b.title = d.label;
    b.dataset.sound = d.sound;
    if (style) Object.assign(b.style, style);
    b.style.setProperty("--delay", (-Math.random() * 6).toFixed(2) + "s");
    b.innerHTML = `<span class="deco-inner">${svgFor(d)}</span>`;
    return b;
  }

  // Studio araç çubuğu
  const bar = document.querySelector("[data-deco-bar]");
  if (bar) ["move", "scale", "rotate", "part", "script", "play", "publish", "gear", "lag"].forEach((k) => {
    const wrap = document.createElement("div");
    wrap.className = "tool";
    wrap.appendChild(makeDeco(k, "deco-tool"));
    const l = document.createElement("span");
    l.textContent = D[k].label;
    wrap.appendChild(l);
    bar.appendChild(wrap);
  });

  // Hero etrafı
  const hero = document.querySelector(".hero-art");
  if (hero) [
    ["bug", { left: "-2%", top: "2%" }],
    ["play", { left: "2%", bottom: "8%" }],
    ["star", { right: "-2%", top: "46%" }],
  ].forEach(([k, pos]) => hero.appendChild(makeDeco(k, "deco-hero", pos)));

  // Kenarlar (geniş ekranlarda)
  const side = document.querySelector("[data-deco-side]");
  if (side) [
    ["coin", "left", 6], ["jump", "right", 14], ["bomb", "left", 27], ["script", "right", 36],
    ["star", "left", 48], ["part", "right", 58], ["bug", "left", 70], ["coin", "right", 80], ["gear", "left", 90],
  ].forEach(([k, s, top]) => side.appendChild(makeDeco(k, "deco-side-btn deco-" + s, { top: top + "%" })));

  /* ---------------- Tıklama: ses + içine gir/çık animasyonu ---------------- */
  const COLORS = ["#ff3b3b", "#3ba7ff", "#ffcf33", "#00c46a", "#9b5cff", "#ff8a1f"];

  function burst(x, y) {
    if (reduce) return;
    for (let i = 0; i < 8; i++) {
      const p = document.createElement("span");
      p.className = "deco-particle";
      const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 40 + Math.random() * 30;
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.background = COLORS[i % COLORS.length];
      p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      p.style.setProperty("--r", Math.random() * 360 + "deg");
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  }

  document.addEventListener("click", (e) => {
    const deco = e.target.closest(".deco");
    if (deco) {
      play(deco.dataset.sound);
      const inner = deco.querySelector(".deco-inner");
      inner.classList.remove("dive");
      void inner.offsetWidth; // animasyonu yeniden başlat
      inner.classList.add("dive");
      const r = deco.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2);
      return;
    }
    if (e.target.closest("a, button")) play("click");
  });

  document.addEventListener("animationend", (e) => {
    if (e.target.classList && e.target.classList.contains("dive")) e.target.classList.remove("dive");
  });

  /* ---------------- Ses aç/kapa ---------------- */
  const SPK = `<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>`;
  const ON = SPK + `<path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
  const OFF = SPK + `<path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
  const mute = document.createElement("button");
  mute.type = "button";
  mute.className = "mute-btn";
  const paint = () => {
    mute.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${muted ? OFF : ON}</svg>`;
    mute.setAttribute("aria-label", muted ? "Sesi aç" : "Sesi kapat");
    mute.title = muted ? "Sesi aç" : "Sesi kapat";
  };
  paint();
  mute.addEventListener("click", (e) => {
    e.stopPropagation();
    muted = !muted;
    try { localStorage.setItem("rsa-muted", muted ? "1" : "0"); } catch (err) {}
    paint();
    if (!muted) play("click");
  });
  document.body.appendChild(mute);
})();
