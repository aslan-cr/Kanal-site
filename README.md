# RS Animasyon — Kanal Sitesi

[youtube.com/@rsanimasyon](https://www.youtube.com/@rsanimasyon) için Roblox / Roblox Studio temalı tanıtım sitesi.
Sayfada kanalın **son uzun videosu** ve **son Shorts videosu** otomatik olarak gösterilir.

## Nasıl çalışır?

- `.github/workflows/update-videos.yml` her saat çalışır, `scripts/fetch-videos.mjs` ile kanalın
  RSS akışlarını okur (uzun videolar: `UULF…`, Shorts: `UUSH…` oynatma listeleri) ve `data/videos.json` dosyasını günceller.
- `index.html` + `app.js` bu dosyayı okuyup videoları gömülü oynatıcıyla gösterir. API anahtarı gerekmez.

## Yayına alma (GitHub Pages)

1. Bu dalı `main` ile birleştir.
2. GitHub → **Settings → Pages** → Source: `Deploy from a branch`, Branch: `main` / `(root)`.
3. **Actions** sekmesinden "Son videoları güncelle" iş akışını bir kez elle çalıştır (Run workflow).
4. **Settings → Actions → General → Workflow permissions** ayarının "Read and write" olduğundan emin ol.

Yerelde denemek için: `python3 -m http.server` ve `http://localhost:8000`.
