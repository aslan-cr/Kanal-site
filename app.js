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

  const addViews = (el, views) => {
    if (!views) return;
    const s = document.createElement("small");
    s.className = "views";
    s.textContent = "👀 " + views.toLocaleString("tr-TR") + " izlenme";
    el.appendChild(s);
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
  if (ch.avatar) document.querySelectorAll("[data-avatar]").forEach((a) => { a.src = ch.avatar; a.hidden = false; a.onerror = () => { a.hidden = true; }; });

  const suffix = ch.id ? ch.id.slice(2) : null;

  // Son uzun video
  const longFrame = $("[data-long-frame]");
  if (data?.latestLong) {
    embed(longFrame, `https://www.youtube-nocookie.com/embed/${data.latestLong.id}`, data.latestLong.title);
    $("[data-long-title]").textContent = data.latestLong.title;
    addViews($("[data-long-title]"), data.latestLong.views);
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
    addViews($("[data-short-title]"), data.latestShort.views);
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
      a.setAttribute("data-reveal", "");
      a.style.setProperty("--rd", (grid.children.length * 0.07).toFixed(2) + "s");
      a.href = v.type === "short" ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;
      a.target = "_blank";
      a.rel = "noopener";
      const thumb = document.createElement("span");
      thumb.className = "mini-thumb";
      const img = document.createElement("img");
      img.src = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
      img.alt = "";
      img.loading = "lazy";
      thumb.appendChild(img);
      const body = document.createElement("div");
      body.className = "mini-body";
      body.textContent = v.title;
      const small = document.createElement("small");
      small.textContent = (v.type === "short" ? "⚡ Shorts · " : "🎬 Video · ") + fmtDate(v.published) + (v.views ? " · " + v.views.toLocaleString("tr-TR") + " izlenme" : "");
      body.appendChild(small);
      a.append(thumb, body);
      grid.appendChild(a);
    }
    $("[data-recent-wrap]").hidden = false;
    document.dispatchEvent(new Event("rsa:content"));
  }
})();
