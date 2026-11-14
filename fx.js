// Görsel efektler: yükleme ekranı, arka plan küpleri, dalgalı yazı, eğilme, kaydırınca belirme,
// Studio "Output" mesajları, kayan şeritler, konfeti.
(function () {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const COLORS = ["#ff3b3b", "#3ba7ff", "#ffcf33", "#00d47a", "#9b5cff", "#ff8a1f"];

  /* ---------- Yükleme ekranı ---------- */
  const loader = document.getElementById("loader");
  const tips = ["Bug'lar temizleniyor…", "Lag ayarlanıyor…", "Küpler diziliyor…", "Animasyon render ediliyor…"];
  const tipEl = document.querySelector("[data-loader-tip]");
  let ti = 0;
  const tipTimer = setInterval(() => { if (tipEl) tipEl.textContent = tips[++ti % tips.length]; }, 280);
  const hideLoader = () => { clearInterval(tipTimer); if (loader) loader.classList.add("done"); };
  setTimeout(hideLoader, reduce ? 0 : 1050);
  setTimeout(() => loader && loader.remove(), 2200);

  /* ---------- Arka plan küpleri ---------- */
  const bg = document.querySelector("[data-bg-cubes]");
  if (bg && !reduce) {
    for (let i = 0; i < 16; i++) {
      const c = document.createElement("span");
      c.className = "bg-cube";
      const s = 14 + Math.random() * 34;
      c.style.width = c.style.height = s + "px";
      c.style.left = Math.random() * 100 + "%";
      c.style.background = COLORS[i % COLORS.length];
      c.style.animationDuration = 22 + Math.random() * 26 + "s";
      c.style.animationDelay = -Math.random() * 40 + "s";
      bg.appendChild(c);
    }
  }

  /* ---------- Dalgalı "animasyon!" yazısı ---------- */
  $$("[data-wave]").forEach((el) => {
    const text = el.textContent;
    el.setAttribute("aria-label", text);
    el.textContent = "";
    [...text].forEach((ch, i) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--i", i);
      s.textContent = ch;
      el.appendChild(s);
    });
  });

  /* ---------- Fareyle eğilme ---------- */
  if (!reduce && matchMedia("(hover: hover)").matches) {
    $$("[data-tilt]").forEach((el) => {
      const base = el.classList.contains("studio-window") ? -6 : 0;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", base + x * 12 + "deg");
        el.style.setProperty("--rx", -y * 10 + "deg");
      });
      el.addEventListener("pointerleave", () => {
        el.style.removeProperty("--ry");
        el.style.removeProperty("--rx");
      });
    });
  }

  /* ---------- Kaydırınca belirme ---------- */
  let io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  const scan = () => $$("[data-reveal]:not(.in)").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
  scan();
  document.addEventListener("rsa:content", scan);

  /* ---------- Studio Output mesajları ---------- */
  const out = document.querySelector("[data-output]");
  const LOG = [
    ["info", "Studio açıldı. Hoş geldin RSAnimasyon!"],
    ["ok", "Animasyon yüklendi (%100)"],
    ["warn", "Uyarı: Lag 9999 ms 🐢"],
    ["err", "Hata: Ayarlar kaydedilmedi 😱"],
    ["info", "Part eklendi: KırmızıKüp"],
    ["ok", "Bug düzeltildi… galiba 🐛"],
    ["warn", "Uyarı: 3 gündür Studio'dasın"],
    ["err", "Hata: Karakter haritadan düştü"],
    ["info", "Script çalıştırılıyor…"],
    ["ok", "Yeni video yayınlandı! 🎬"],
    ["warn", "Uyarı: İnternet modemi kapandı 📡"],
    ["ok", "Abone sayısı artıyor 📈"],
  ];
  if (out) {
    let li = 0;
    const t0 = Date.now();
    const push = () => {
      const [cls, msg] = LOG[li++ % LOG.length];
      const d = document.createElement("div");
      const sec = ((Date.now() - t0) / 1000).toFixed(1).padStart(5, "0");
      d.innerHTML = `<span class="t">00:${sec}</span>`;
      const m = document.createElement("span");
      m.className = cls;
      m.textContent = msg;
      d.appendChild(m);
      out.appendChild(d);
      while (out.children.length > 5) out.firstChild.remove();
    };
    push(); push();
    setInterval(push, reduce ? 4000 : 1900);
  }

  /* ---------- Kayan şeritler ---------- */
  $$("[data-tape]").forEach((el) => {
    const txt = el.getAttribute("data-tape");
    const half = document.createElement("span");
    half.textContent = txt.repeat(4);
    el.append(half, half.cloneNode(true));
  });

  /* ---------- Konfeti ---------- */
  window.RSA_CONFETTI = function (n = 80) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const c = document.createElement("span");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = COLORS[i % COLORS.length];
      c.style.setProperty("--dx", (Math.random() - 0.5) * 300 + "px");
      c.style.setProperty("--r", Math.random() * 1080 + "deg");
      c.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
      c.style.animationDelay = Math.random() * 0.4 + "s";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4000);
    }
  };
})();
