// Abone sayacı + istatistikler: API anahtarı varsa YouTube'dan canlı çeker, yoksa saatlik veriyi gösterir.
(async function () {
  const $ = (s) => document.querySelector(s);
  const box = $("[data-subs]");
  const numEl = $("[data-sub-num]");
  const deltaEl = $("[data-sub-delta]");
  const liveEl = $("[data-live]");
  const navBox = $("[data-nav-subs]");
  const navNum = $("[data-nav-sub-num]");
  if (!box) return;

  const cfg = window.RSA_CONFIG || {};
  const fmt = (n) => n.toLocaleString("tr-TR");
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = null;

  // Sayıyı yumuşakça saydır
  function countTo(el, from, to, dur = 1200) {
    if (!el) return;
    const token = (el._countToken = (el._countToken || 0) + 1);
    if (reduce || from === to) { el.textContent = fmt(to); return; }
    const start = performance.now();
    (function step(t) {
      if (el._countToken !== token) return; // daha yeni bir sayım başladı
      const k = Math.min(1, (t - start) / dur);
      el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    })(start);
  }

  // İstatistik kartları: görünür olunca saymaya başlar
  const statVals = {};
  const statShown = {};
  function setStat(name, value) {
    const el = document.querySelector(`[data-stat="${name}"]`);
    if (!el || value == null || isNaN(value)) return;
    const prev = statVals[name];
    statVals[name] = value;
    if (!statShown[name]) {
      const start = () => { statShown[name] = true; countTo(el, 0, statVals[name], 1600); };
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); start(); } }, { threshold: 0.3 });
        io.observe(el);
      } else start();
    } else countTo(el, prev, value, 900);
  }

  function showSubs(n) {
    numEl.textContent = fmt(n);
    if (navNum) navNum.textContent = fmt(n);
    if (navBox) navBox.hidden = false;
    box.hidden = false;
    setStat("subs", n);
  }

  let data = null;
  try {
    const r = await fetch("data/videos.json", { cache: "no-store" });
    if (r.ok) data = await r.json();
  } catch (e) {}
  const ch = (data && data.channel) || {};

  // Yedek: saatlik güncellenen metin ("17 abone" gibi)
  if (ch.subscribers) {
    const m = ch.subscribers.match(/^([\d.,]+)\s*abone$/i);
    if (m) { current = parseInt(m[1].replace(/[.,]/g, ""), 10); showSubs(current); }
    else { numEl.textContent = ch.subscribers.replace(/\s*abone$/i, ""); box.hidden = false; }
  }

  if (!cfg.youtubeApiKey || !ch.id) return;

  let liveStarted = false;
  function animateTo(next) {
    // İlk canlı veri: sessizce güncelle (sayfa açılırken kutlama yapma)
    if (!liveStarted || current === null || current === next) {
      liveStarted = true;
      const from = current;
      current = next;
      showSubs(next);
      if (from !== null && from !== next) { countTo(numEl, from, next, 900); if (navNum) countTo(navNum, from, next, 900); }
      return;
    }
    const diff = next - current;
    const from = current;
    current = next;

    numEl.classList.remove("up", "down");
    void numEl.offsetWidth;
    numEl.classList.add(diff > 0 ? "up" : "down");

    deltaEl.textContent = (diff > 0 ? "+" : "") + fmt(diff);
    deltaEl.className = "sub-delta " + (diff > 0 ? "plus" : "minus");
    void deltaEl.offsetWidth;
    deltaEl.classList.add("show");

    if (window.RSA_PLAY) window.RSA_PLAY(diff > 0 ? "coin" : "lag");
    if (diff > 0 && window.RSA_CONFETTI) window.RSA_CONFETTI();

    countTo(numEl, from, next, 900);
    if (navNum) countTo(navNum, from, next, 900);
    setStat("subs", next);
  }

  let failures = 0;
  async function refresh() {
    if (document.hidden) return;
    try {
      const url = "https://www.googleapis.com/youtube/v3/channels?part=statistics&id=" +
        encodeURIComponent(ch.id) + "&key=" + encodeURIComponent(cfg.youtubeApiKey);
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      const st = j.items && j.items[0] && j.items[0].statistics;
      if (!st) return;
      failures = 0;
      setStat("views", parseInt(st.viewCount, 10));
      setStat("videos", parseInt(st.videoCount, 10));
      if (st.hiddenSubscriberCount) return;
      liveEl.hidden = false;
      animateTo(parseInt(st.subscriberCount, 10));
    } catch (e) {
      failures++;
      if (failures >= 3) liveEl.hidden = true;
    }
  }

  // Videoların izlenme sayıları (sayfadaki tüm videolar tek istekte)
  async function refreshVideos() {
    if (document.hidden) return;
    const els = Array.from(document.querySelectorAll("[data-vid]"));
    const ids = [...new Set(els.map((e) => e.dataset.vid))].slice(0, 50);
    if (!ids.length) return;
    try {
      const url = "https://www.googleapis.com/youtube/v3/videos?part=statistics&id=" +
        ids.map(encodeURIComponent).join(",") + "&key=" + encodeURIComponent(cfg.youtubeApiKey);
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      const map = {};
      (j.items || []).forEach((it) => { map[it.id] = parseInt(it.statistics && it.statistics.viewCount, 10); });
      els.forEach((el) => {
        const next = map[el.dataset.vid];
        if (next == null || isNaN(next)) return;
        const prev = parseInt(el.dataset.views, 10) || 0;
        if (next === prev && el.textContent) return;
        el.dataset.views = next;
        const pre = el.dataset.prefix || "";
        if (reduce || !prev || next === prev) { el.textContent = pre + fmt(next) + " izlenme"; return; }
        const start = performance.now();
        (function step(t) {
          const k = Math.min(1, (t - start) / 900);
          el.textContent = pre + fmt(Math.round(prev + (next - prev) * k)) + " izlenme";
          if (k < 1) requestAnimationFrame(step);
        })(start);
        if (next > prev) { el.classList.remove("views-up"); void el.offsetWidth; el.classList.add("views-up"); }
      });
    } catch (e) {}
  }

  const refreshAll = () => { refresh(); refreshVideos(); };
  refreshAll();
  setTimeout(refreshVideos, 2500); // video kartları geç çizildiyse
  setInterval(refreshAll, Math.max(10, cfg.refreshSeconds || 30) * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshAll(); });
})();
