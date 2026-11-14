// Abone sayacı: API anahtarı varsa YouTube'dan canlı çeker, yoksa saatlik veriyi gösterir.
(async function () {
  const box = document.querySelector("[data-subs]");
  const numEl = document.querySelector("[data-sub-num]");
  const deltaEl = document.querySelector("[data-sub-delta]");
  const liveEl = document.querySelector("[data-live]");
  if (!box) return;

  const cfg = window.RSA_CONFIG || {};
  const fmt = (n) => n.toLocaleString("tr-TR");
  let current = null;

  let data = null;
  try {
    const r = await fetch("data/videos.json", { cache: "no-store" });
    if (r.ok) data = await r.json();
  } catch (e) {}
  const ch = (data && data.channel) || {};

  // Yedek: saatlik güncellenen metin ("17 abone" gibi)
  if (ch.subscribers) {
    const m = ch.subscribers.match(/^([\d.,]+)\s*abone$/i);
    if (m) { current = parseInt(m[1].replace(/[.,]/g, ""), 10); numEl.textContent = fmt(current); }
    else { numEl.textContent = ch.subscribers.replace(/\s*abone$/i, ""); }
    box.hidden = false;
  }

  if (!cfg.youtubeApiKey || !ch.id) return;

  function animateTo(next) {
    if (current === null) { current = next; numEl.textContent = fmt(next); box.hidden = false; return; }
    if (next === current) return;
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

    const start = performance.now();
    const dur = 900;
    (function step(t) {
      const k = Math.min(1, (t - start) / dur);
      numEl.textContent = fmt(Math.round(from + diff * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    })(start);
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
      if (!st || st.hiddenSubscriberCount) return;
      failures = 0;
      liveEl.hidden = false;
      animateTo(parseInt(st.subscriberCount, 10));
    } catch (e) {
      failures++;
      if (failures >= 3) liveEl.hidden = true;
    }
  }

  refresh();
  setInterval(refresh, Math.max(10, cfg.refreshSeconds || 30) * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
})();
