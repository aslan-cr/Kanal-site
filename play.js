// Oyun gibi şeyler: sahneye Part ekleme, gece/gündüz, bug avı, başarımlar,
// kaydırma çubuğu, fareyi izleyen ışık, küp şehir.
(function () {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s) => document.querySelector(s);
  const COLORS = ["#ff3b3b", "#3ba7ff", "#ffcf33", "#00d47a", "#9b5cff", "#ff8a1f"];
  const sound = (n) => window.RSA_PLAY && window.RSA_PLAY(n);
  const log = (c, m) => window.RSA_LOG && window.RSA_LOG(c, m);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------- Kaydırma çubuğu ---------- */
  const bar = $("[data-progress]");
  if (bar) {
    const upd = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty("--p", max > 0 ? Math.min(1, scrollY / max) : 0);
    };
    addEventListener("scroll", upd, { passive: true });
    addEventListener("resize", upd);
    upd();
  }

  /* ---------- Fareyi izleyen ışık ---------- */
  const spot = $("[data-spot]");
  if (spot && !reduce && matchMedia("(hover: hover)").matches) {
    let raf = 0, mx = 0, my = 0;
    addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        spot.style.setProperty("--mx", mx + "px");
        spot.style.setProperty("--my", my + "px");
      });
    }, { passive: true });
  }

  /* ---------- Başarımlar ---------- */
  const BADGES = [
    { id: "bug1", ico: "🐛", name: "Bug Avcısı", hint: "Sayfada gezen bir bug'ı ez" },
    { id: "bug5", ico: "🧯", name: "Böcek İlacı", hint: "5 bug ez" },
    { id: "part5", ico: "🧱", name: "İnşaat Ustası", hint: "Studio sahnesine 5 Part ekle" },
    { id: "night", ico: "🌙", name: "Gece Kuşu", hint: "Sahnedeki güneşe tıkla" },
    { id: "deco10", ico: "🎛️", name: "Tuş Delisi", hint: "Süs butonlarına 10 kez bas" },
    { id: "lag", ico: "🐢", name: "Lag Canavarı", hint: "Lag butonuna bas" },
    { id: "end", ico: "🏁", name: "Sona Kadar", hint: "Sayfanın en altına in" },
  ];
  let unlocked = store.get("rsa-badges", []);
  if (!Array.isArray(unlocked)) unlocked = [];
  const grid = $("[data-badges]");
  const countEl = $("[data-badge-count]");
  const toasts = $("[data-toasts]");

  function renderBadges(justId) {
    if (!grid) return;
    grid.innerHTML = "";
    BADGES.forEach((b, i) => {
      const on = unlocked.includes(b.id);
      const d = document.createElement("div");
      d.className = "badge" + (on ? " on" : "") + (b.id === justId ? " just" : "");
      d.setAttribute("data-reveal", "");
      if (grid.dataset.shown) d.classList.add("in");
      d.style.setProperty("--rd", (i * 0.05).toFixed(2) + "s");
      const ico = document.createElement("span"); ico.className = "badge-ico"; ico.textContent = on ? b.ico : "❓";
      const name = document.createElement("b"); name.textContent = b.name;
      const hint = document.createElement("small"); hint.textContent = on ? "✔ Açıldı!" : b.hint;
      d.append(ico, name, hint);
      grid.appendChild(d);
    });
    grid.dataset.shown = "1";
    const n = BADGES.filter((b) => unlocked.includes(b.id)).length;
    if (countEl) countEl.textContent = n + "/" + BADGES.length;
  }

  function toast(ico, small, text) {
    if (!toasts) return;
    const t = document.createElement("div");
    t.className = "toast";
    const i = document.createElement("span"); i.className = "toast-ico"; i.textContent = ico;
    const w = document.createElement("span");
    const s = document.createElement("small"); s.textContent = small;
    const b = document.createElement("b"); b.textContent = text;
    w.append(s, b);
    t.append(i, w);
    toasts.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }

  function unlock(id) {
    if (unlocked.includes(id)) return;
    const b = BADGES.find((x) => x.id === id);
    if (!b) return;
    unlocked.push(id);
    store.set("rsa-badges", unlocked);
    renderBadges(id);
    toast(b.ico, "Başarım açıldı!", b.name);
    sound("chime");
    log("ok", "Başarım açıldı: " + b.name + " 🏆");
    if (window.RSA_CONFETTI) window.RSA_CONFETTI(40);
    if (BADGES.every((x) => unlocked.includes(x.id))) {
      setTimeout(() => {
        toast("👑", "Efsane!", "Tüm başarımlar tamam!");
        sound("play");
        if (window.RSA_CONFETTI) window.RSA_CONFETTI(160);
      }, 1500);
    }
  }

  if (grid) {
    grid.dataset.shown = "";
    renderBadges();
    delete grid.dataset.shown; // ilk çizimde kaydırınca belirsin
    document.dispatchEvent(new Event("rsa:content"));
    grid.dataset.shown = "1";
  }

  // Süs butonu sayacı
  let decoClicks = 0;
  document.addEventListener("click", (e) => {
    const d = e.target.closest(".deco");
    if (!d) return;
    if (++decoClicks >= 10) unlock("deco10");
    if (d.dataset.sound === "lag") unlock("lag");
  });

  // Sayfanın sonu
  const footer = $(".footer");
  if (footer && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((en) => {
      if (en[0].isIntersecting && scrollY > 200) { unlock("end"); io.disconnect(); }
    }, { threshold: 0.6 });
    io.observe(footer);
  }

  /* ---------- Sahne: Part ekleme + gece/gündüz ---------- */
  const vp = $(".viewport");
  const layer = $("[data-spawn]");
  const hint = $("[data-vp-hint]");
  let parts = 0;

  function spawn(x, y) {
    const s = 28 + Math.random() * 26;
    const H = vp.clientHeight;
    const floor = Math.min(H - s - 6, Math.max(y + 10, H * (0.66 + Math.random() * 0.22)) - s / 2);
    const el = document.createElement("div");
    el.className = "spawned pop";
    el.style.left = x - s / 2 + "px";
    el.style.zIndex = Math.round(floor + s);
    const cube = document.createElement("span");
    cube.className = "cube3d";
    cube.style.setProperty("--s", s + "px");
    cube.style.setProperty("--c", COLORS[Math.floor(Math.random() * COLORS.length)]);
    cube.style.animationDuration = 6 + Math.random() * 8 + "s";
    cube.innerHTML = "<i></i><i></i><i></i><i></i><i></i><i></i>";
    el.appendChild(cube);
    layer.appendChild(el);
    while (layer.children.length > 14) layer.firstChild.remove();

    let py = Math.min(y - s / 2, floor), vy = 0, bounced = false;
    if (reduce) { el.style.transform = `translateY(${floor}px)`; sound("thud"); return; }
    (function step() {
      vy += 0.9; py += vy;
      if (py >= floor) {
        py = floor;
        if (!bounced) { bounced = true; sound("thud"); }
        if (Math.abs(vy) < 2.5) { el.style.transform = `translateY(${py}px)`; return; }
        vy *= -0.42;
      }
      el.style.transform = `translateY(${py}px)`;
      if (el.isConnected) requestAnimationFrame(step);
    })();
  }

  if (vp && layer) {
    vp.addEventListener("click", (e) => {
      if (e.target.closest(".sun")) {
        const night = vp.classList.toggle("night");
        sound(night ? "chime" : "play");
        log("info", night ? "Gece oldu 🌙" : "Gündüz oldu ☀️");
        unlock("night");
        return;
      }
      const r = vp.getBoundingClientRect();
      spawn(e.clientX - r.left, e.clientY - r.top);
      parts++;
      if (hint) hint.classList.add("gone");
      log("info", "Part eklendi: Küp #" + parts);
      if (parts >= 5) unlock("part5");
    });
  }

  /* ---------- Bug avı ---------- */
  let bugs = store.get("rsa-bugs", 0) | 0;
  const bugStat = $("[data-bug-count]");
  const hud = document.createElement("a");
  hud.className = "bug-hud";
  hud.href = "#basarimlar";
  hud.title = "Ezdiğin bug sayısı";
  document.body.appendChild(hud);
  function paintBugs(bump) {
    if (bugStat) bugStat.textContent = bugs.toLocaleString("tr-TR");
    hud.textContent = "🐛 " + bugs;
    hud.hidden = bugs === 0;
    if (bump) { hud.classList.remove("bump"); void hud.offsetWidth; hud.classList.add("bump"); }
  }
  paintBugs(false);

  const SPLATS = ["+1 Bug!", "Ezildi!", "Düzeltildi!", "Patch!", "Bug fix!"];
  let activeBug = null;

  function sendBug() {
    if (document.hidden || activeBug) return schedule();
    const fromLeft = Math.random() < 0.5;
    const y = innerHeight * (0.2 + Math.random() * 0.6);
    const x0 = fromLeft ? -60 : innerWidth + 10;
    const x1 = fromLeft ? innerWidth + 10 : -60;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "bug-crawl" + (fromLeft ? " flip" : "");
    b.tabIndex = -1;
    b.setAttribute("aria-hidden", "true");
    b.innerHTML = "<span>🐛</span>";
    document.body.appendChild(b);
    activeBug = b;
    const dur = Math.max(7000, (innerWidth / 110) * 1000) * (0.8 + Math.random() * 0.5);
    const mid = y + (Math.random() - 0.5) * 160;
    const anim = b.animate(
      [{ transform: `translate(${x0}px, ${y}px)` }, { transform: `translate(${(x0 + x1) / 2}px, ${mid}px)` }, { transform: `translate(${x1}px, ${y}px)` }],
      { duration: dur, easing: "linear" }
    );
    const done = () => { if (activeBug === b) activeBug = null; b.remove(); schedule(); };
    anim.onfinish = done;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      anim.onfinish = null;
      anim.cancel();
      const sp = document.createElement("span");
      sp.className = "splat";
      sp.style.left = e.clientX + "px";
      sp.style.top = e.clientY + "px";
      sp.textContent = "💥 " + SPLATS[Math.floor(Math.random() * SPLATS.length)];
      document.body.appendChild(sp);
      setTimeout(() => sp.remove(), 950);
      bugs++;
      store.set("rsa-bugs", bugs);
      paintBugs(true);
      sound("glitch");
      setTimeout(() => sound("coin"), 180);
      log("ok", "Bug ezildi! Toplam: " + bugs + " 🐛");
      unlock("bug1");
      if (bugs >= 5) unlock("bug5");
      done();
    }, { once: true });
  }
  function schedule() { setTimeout(sendBug, 8000 + Math.random() * 7000); }
  if (!reduce) setTimeout(sendBug, 5000);

  /* ---------- Küp şehir ---------- */
  const sky = $("[data-skyline]");
  if (sky) {
    const n = Math.max(14, Math.min(46, Math.round(innerWidth / 30)));
    for (let i = 0; i < n; i++) {
      const b = document.createElement("i");
      const wave = 0.5 + 0.5 * Math.sin(i * 0.9) * Math.cos(i * 0.37);
      b.style.height = 22 + wave * 50 + Math.random() * 28 + "%";
      b.style.setProperty("--sd", (i * 0.025).toFixed(2) + "s");
      sky.appendChild(b);
    }
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { sky.classList.add("in"); io.disconnect(); } }, { threshold: 0.2 });
      io.observe(sky);
    } else sky.classList.add("in");
  }
})();
