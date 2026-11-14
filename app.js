(async function () {
  const $ = (s) => document.querySelector(s);
  const CHANNEL = "https://www.youtube.com/@rsanimasyon";
  $("[data-year]").textContent = new Date().getFullYear();

  const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "";

  const embed = (frame, src, title) => {
    frame.innerHTML = "";
    const f = document.createElement("iframe");
    f.src = src;
    f.title = title || "YouTube video";
    f.loading = "lazy";
    f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    f.allowFullscreen = true;
    frame.appendChild(f);
  };

  const fallback = (frame, text, url) => {
    frame.innerHTML = `<div class="placeholder"><p>${text}<br><a href="${url}" target="_blank" rel="noopener">YouTube'da izle →</a></p></div>`;
  };

  let data = null;
  try {
    const res = await fetch("data/videos.json", { cache: "no-store" });
    if (res.ok) data = await res.json();
  } catch (e) { /* data stays null */ }

  const ch = data?.channel || {};
  if (ch.avatar) { const a = $("[data-avatar]"); a.src = ch.avatar; a.hidden = false; }
  if (ch.subscribers) { const s = $("[data-subs]"); s.textContent = "👥 " + ch.subscribers; s.hidden = false; }
  if (ch.description) $("[data-channel-desc]").textContent = ch.description;

  const suffix = ch.id ? ch.id.slice(2) : null;

  // Son uzun video
  const longFrame = $("[data-long-frame]");
  if (data?.latestLong) {
    embed(longFrame, `https://www.youtube-nocookie.com/embed/${data.latestLong.id}`, data.latestLong.title);
    $("[data-long-title]").textContent = data.latestLong.title;
    $("[data-long-date]").textContent = fmtDate(data.latestLong.published);
  } else if (suffix) {
    embed(longFrame, `https://www.youtube-nocookie.com/embed/videoseries?list=UULF${suffix}`, "Son videolar");
  } else {
    fallback(longFrame, "Son video yakında burada görünecek.", CHANNEL + "/videos");
  }

  // Son Shorts
  const shortFrame = $("[data-short-frame]");
  if (data?.latestShort) {
    embed(shortFrame, `https://www.youtube-nocookie.com/embed/${data.latestShort.id}`, data.latestShort.title);
    $("[data-short-title]").textContent = data.latestShort.title;
    $("[data-short-date]").textContent = fmtDate(data.latestShort.published);
  } else if (suffix) {
    embed(shortFrame, `https://www.youtube-nocookie.com/embed/videoseries?list=UUSH${suffix}`, "Son Shorts");
  } else {
    fallback(shortFrame, "Son Shorts yakında burada görünecek.", CHANNEL + "/shorts");
  }

  // Diğer yeni videolar
  const recent = data?.recent || [];
  if (recent.length) {
    const grid = $("[data-recent]");
    for (const v of recent) {
      const a = document.createElement("a");
      a.className = "mini";
      a.href = v.type === "short" ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;
      a.target = "_blank";
      a.rel = "noopener";
      const img = document.createElement("img");
      img.src = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
      img.alt = "";
      img.loading = "lazy";
      const body = document.createElement("div");
      body.textContent = v.title;
      const small = document.createElement("small");
      small.textContent = (v.type === "short" ? "⚡ Shorts · " : "🎬 Video · ") + fmtDate(v.published);
      body.appendChild(small);
      a.append(img, body);
      grid.appendChild(a);
    }
    $("[data-recent-wrap]").hidden = false;
  }
})();
