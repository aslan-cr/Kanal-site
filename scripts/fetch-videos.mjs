// Fetches the channel's latest long video and latest Short and writes data/videos.json.
// Runs in GitHub Actions (Node 20+, no dependencies).
import { writeFile, readFile } from "node:fs/promises";

const HANDLE = process.env.CHANNEL_HANDLE || "rsanimasyon";
const OUT = new URL("../data/videos.json", import.meta.url);
const UA = { "User-Agent": "Mozilla/5.0", "Accept-Language": "tr-TR,tr;q=0.9" };

async function get(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

async function channelInfo() {
  const html = await get(`https://www.youtube.com/@${HANDLE}`);
  const id =
    html.match(/"externalId":"(UC[\w-]{22})"/)?.[1] ||
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1];
  if (!id) throw new Error("Kanal ID bulunamadı");
  const meta = (p) => html.match(new RegExp(`<meta property="${p}" content="([^"]*)"`))?.[1] || "";
  const subs = html.match(/"([\d.,]+\s*[BbKkMn]*\s*abone)"/)?.[1] || "";
  return { id, title: decode(meta("og:title")), description: decode(meta("og:description")), avatar: meta("og:image"), subscribers: subs };
}

function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. yol: RSS akışı (izlenme sayısı da verir). YouTube bazen boş/hatalı döner, o yüzden tekrar dener.
async function fromRss(playlistId) {
  for (let i = 0; i < 3; i++) {
    try {
      const xml = await get(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`);
      const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
        id: e.match(/<yt:videoId>([^<]+)/)?.[1],
        title: decode(e.match(/<title>([^<]*)/)?.[1] || ""),
        published: e.match(/<published>([^<]+)/)?.[1],
        views: Number(e.match(/views="(\d+)"/)?.[1] || 0),
      })).filter((v) => v.id);
      if (entries.length) return entries;
    } catch (err) {
      console.warn(`RSS ${playlistId} (deneme ${i + 1}):`, err.message);
    }
    await sleep(2000 * (i + 1));
  }
  return [];
}

// 2. yol: YouTube Data API (config.js içindeki anahtarla)
async function fromApi(playlistId) {
  try {
    const cfg = await readFile(new URL("../config.js", import.meta.url), "utf8");
    const key = cfg.match(/youtubeApiKey:\s*"([^"]+)"/)?.[1];
    if (!key) return [];
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=10&playlistId=${playlistId}&key=${key}`,
      { headers: { Referer: "https://aslan-cr.github.io/" } }
    );
    if (!res.ok) throw new Error(`API ${res.status}`);
    const j = await res.json();
    return (j.items || []).map((it) => ({
      id: it.contentDetails?.videoId,
      title: it.snippet?.title || "",
      published: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt,
      views: 0,
    })).filter((v) => v.id);
  } catch (err) {
    console.warn(`API ${playlistId}:`, err.message);
    return [];
  }
}

async function latestFromPlaylist(playlistId) {
  const rss = await fromRss(playlistId);
  if (rss.length) return rss;
  const api = await fromApi(playlistId);
  return api.sort((x, y) => new Date(y.published) - new Date(x.published));
}

const ch = await channelInfo();
const suffix = ch.id.slice(2);
const [longs, shorts] = await Promise.all([latestFromPlaylist(`UULF${suffix}`), latestFromPlaylist(`UUSH${suffix}`)]);

const data = {
  updated: new Date().toISOString(),
  channel: { ...ch, handle: HANDLE },
  latestLong: longs[0] || null,
  latestShort: shorts[0] || null,
  recent: [...longs.slice(1, 5).map((v) => ({ ...v, type: "long" })), ...shorts.slice(1, 5).map((v) => ({ ...v, type: "short" }))]
    .sort((a, b) => new Date(b.published) - new Date(a.published))
    .slice(0, 6),
};

let prev = "";
try { prev = await readFile(OUT, "utf8"); } catch {}

// YouTube boş döndüyse eldeki eski veriyi silme
try {
  const old = JSON.parse(prev);
  if (!data.latestLong && old.latestLong) { data.latestLong = old.latestLong; console.warn("Uzun video listesi alınamadı, eskisi korundu."); }
  if (!data.latestShort && old.latestShort) { data.latestShort = old.latestShort; console.warn("Shorts listesi alınamadı, eskisi korundu."); }
  if (!data.recent.length && old.recent?.length) data.recent = old.recent;
} catch {}
const strip = (s) => s.replace(/"updated":\s*"[^"]*",?/, "");
const next = JSON.stringify(data, null, 2) + "\n";
if (strip(prev) === strip(next)) {
  console.log("Değişiklik yok.");
} else {
  await writeFile(OUT, next);
  console.log("Güncellendi:", data.latestLong?.title, "|", data.latestShort?.title);
}
