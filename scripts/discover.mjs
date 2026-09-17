/**
 * Nisdeki patlayan videolari bulup konu havuzu cikarir.
 *
 *   node scripts/discover.mjs
 *   node scripts/discover.mjs --hours 72 --min-views 10000 --limit 40
 *
 * Neden: kanal verisi gosteriyor ki ayni gun, ayni formatta cekilen iki video
 * 1.962 ve 9 izlenme aliyor. Fark uretimden degil konudan geliyor. Konu elle
 * secildigi surece sonuc kumardir; bu betik konu secimini veriye baglar.
 *
 * Skor ham izlenme degildir: kanalin kendi ortalamasina gore asimdir. 500 bin
 * abonelinin 50 bin izlenmesi siradan, 2 bin abonelinin 50 bin izlenmesi
 * sinyaldir. Ikincisi kopyalanabilir, birincisi kanal buyuklugunun sonucudur.
 *
 * Ayarlar discovery.json icinde; anahtar .env icindeki YOUTUBE_API_KEY.
 *
 * Kota: search.list cagrisi 100 birim, videos/channels.list 1 birim. Gunluk
 * ucretsiz kota 10.000 birim, yani discovery.json'daki her arama gunun
 * kotasindan 100 birim goturur.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readApiKey } from "./env.mjs";
import { WORD_END, WORD_START } from "./text.mjs";

const API = "https://www.googleapis.com/youtube/v3";
const CONFIG_FILE = "discovery.json";
const OUTPUT_DIR = "topics";
// Tek istekte sorulabilecek video/kanal sayisi (API siniri).
const ID_BATCH = 50;
const SEARCH_COST = 100;

const fail = (message) => {
  console.error("\nHATA: " + message + "\n");
  process.exit(1);
};

// Anahtar akis baslarken okunur: betik iceri aktarildiginda (baslik kalibini
// denemek gibi) anahtar sormasin.
let apiKey;

/** Sayisal bayraklari okur: --hours 72 gibi. */
const readFlag = (name, fallback) => {
  const index = process.argv.indexOf("--" + name);
  if (index === -1) return fallback;

  const value = Number(process.argv[index + 1]);
  if (!Number.isFinite(value) || value <= 0)
    fail("--" + name + " icin gecerli bir sayi verin");
  return value;
};

const readConfig = () => {
  if (!fs.existsSync(CONFIG_FILE)) fail(CONFIG_FILE + " bulunamadi");

  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  if (!Array.isArray(config.queries) || config.queries.length === 0) {
    fail(CONFIG_FILE + " icinde en az bir arama (queries) olmali");
  }
  return config;
};

const request = async (endpoint, params) => {
  const url = new URL(API + "/" + endpoint);
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, value);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    // Kota bitmesi en sik hata; mesaji oldugu gibi gostermek tahminden iyi.
    fail(
      "YouTube API istegi basarisiz (" +
        response.status +
        "): " +
        body.slice(0, 300),
    );
  }
  return response.json();
};

/** ID listesini 50'lik parcalara bolup tek bir sonuc dizisi dondurur. */
const fetchByIds = async (endpoint, part, ids) => {
  const items = [];
  for (let i = 0; i < ids.length; i += ID_BATCH) {
    const batch = ids.slice(i, i + ID_BATCH);
    const data = await request(endpoint, {
      part,
      id: batch.join(","),
      maxResults: ID_BATCH,
    });
    items.push(...data.items);
  }
  return items;
};

/** ISO 8601 suresini ("PT1M12S") saniyeye cevirir. */
const toSeconds = (duration) => {
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(
    duration,
  );
  if (!match) return Number.POSITIVE_INFINITY;

  const [, days, hours, minutes, seconds] = match.map((part) =>
    part ? Number(part) : 0,
  );
  return ((days * 24 + hours) * 60 + minutes) * 60 + seconds;
};

/** Turkce kelime listesinden sinirlari dogru kurulmus bir desen yapar. */
const wordsPattern = (words) =>
  new RegExp(WORD_START + "(?:" + words.join("|") + ")" + WORD_END, "iu");

// Soru eki ayri yazilir ("oyun odakli mi"), yani kelime olarak aranir.
const QUESTION = wordsPattern([
  "nasıl",
  "neden",
  "niçin",
  "niye",
  "kaç",
  "hangi",
  "ne kadar",
  "mı",
  "mi",
  "mu",
  "mü",
]);
const SECOND_PERSON = wordsPattern([
  "sen",
  "senin",
  "sana",
  "sakın",
  "yapma",
  "alma",
  "almayın",
  "dikkat",
  "bunu",
  "şunu",
]);
// "GPT-6", "RTX 5090", "Gemini 3": marka + surum kalibi.
const PRODUCT_NAME = new RegExp(WORD_START + "\\p{Lu}\\p{L}*[- ]?\\d", "u");

/**
 * Baslik kalibini isaretler.
 *
 * Kanal verisinde kazananlar hep soru ya da izleyiciye yonelik iddia, kaybedenler
 * hep urun duyurusu oldu ("GPT-6 Astra" 4 izlenme). Kalip, konuyu almadan once
 * bakilacak ilk sey.
 */
export const titleShape = (title) => {
  if (title.includes("?") || QUESTION.test(title)) return "soru";
  if (SECOND_PERSON.test(title)) return "iddia";
  if (PRODUCT_NAME.test(title)) return "duyuru";
  return "duz";
};

const searchRecent = async (query, config, publishedAfter) => {
  const data = await request("search", {
    part: "snippet",
    q: query,
    type: "video",
    // Shorts'lar kisa videodur; uzun anlatim videolari bu kanalin isi degil.
    videoDuration: "short",
    order: "viewCount",
    publishedAfter,
    regionCode: config.regionCode,
    relevanceLanguage: config.language,
    maxResults: ID_BATCH,
  });

  return data.items.map((item) => item.id.videoId).filter(Boolean);
};

/**
 * Kanalin video basina ortalama izlenmesi.
 *
 * YouTube kanal ortalamasini dogrudan vermiyor; toplam izlenme / video sayisi
 * kaba ama karsilastirma icin yeterli. Sifir bolmeyi onlemek icin en az 1.
 */
const averageViews = (channel) => {
  const stats = channel?.statistics ?? {};
  const views = Number(stats.viewCount ?? 0);
  const videos = Math.max(1, Number(stats.videoCount ?? 1));
  return Math.max(1, views / videos);
};

const collectCandidates = async (config, windowHours, minViews) => {
  const publishedAfter = new Date(
    Date.now() - windowHours * 3600 * 1000,
  ).toISOString();

  const ids = new Set();
  for (const query of config.queries) {
    const found = await searchRecent(query, config, publishedAfter);
    found.forEach((id) => ids.add(id));
    console.log("   " + query + ": " + found.length + " video");
  }
  if (ids.size === 0) return [];

  const videos = await fetchByIds(
    "videos",
    "snippet,statistics,contentDetails",
    [...ids],
  );

  const usable = videos.filter((video) => {
    const views = Number(video.statistics?.viewCount ?? 0);
    const seconds = toSeconds(video.contentDetails.duration);
    return views >= minViews && seconds <= config.maxDurationSeconds;
  });
  if (usable.length === 0) return [];

  const channelIds = [
    ...new Set(usable.map((video) => video.snippet.channelId)),
  ];
  const channels = await fetchByIds("channels", "statistics", channelIds);
  const byChannel = new Map(channels.map((channel) => [channel.id, channel]));

  return usable.map((video) => {
    const views = Number(video.statistics.viewCount);
    const ageHours =
      (Date.now() - new Date(video.snippet.publishedAt).getTime()) / 3_600_000;
    const channel = byChannel.get(video.snippet.channelId);

    return {
      videoId: video.id,
      url: "https://youtube.com/watch?v=" + video.id,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      channelId: video.snippet.channelId,
      subscribers: Number(channel?.statistics?.subscriberCount ?? 0),
      views,
      ageHours: Math.max(0.5, ageHours),
      viewsPerHour: Math.round(views / Math.max(0.5, ageHours)),
      // Kanal ortalamasinin kac kati: asil sinyal bu.
      outlier: Number((views / averageViews(channel)).toFixed(1)),
      shape: titleShape(video.snippet.title),
      durationInSeconds: toSeconds(video.contentDetails.duration),
    };
  });
};

/**
 * Tek bir kanalin listeyi doldurmasini engeller.
 *
 * Bir kanal ayni gun ustuste patlarsa havuz o kanalin kopyasina donusur; konu
 * cesitliligi kalmaz.
 */
const limitPerChannel = (candidates, perChannel) => {
  const seen = new Map();
  return candidates.filter((candidate) => {
    const count = seen.get(candidate.channelId) ?? 0;
    if (count >= perChannel) return false;
    seen.set(candidate.channelId, count + 1);
    return true;
  });
};

const formatRow = (candidate, index) =>
  [
    String(index + 1).padStart(2) + ".",
    ("x" + candidate.outlier).padStart(7),
    candidate.views.toLocaleString("tr-TR").padStart(9),
    (Math.round(candidate.ageHours) + " sa").padStart(6),
    candidate.shape.padEnd(7),
    candidate.title.slice(0, 70),
  ].join("  ");

// --- akis ---

// Yalnizca dogrudan calistirildiginda taramaya baslar; iceri aktarildiginda
// (titleShape'i denemek gibi) sadece yardimcilari verir.
const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  apiKey = readApiKey(
    "YOUTUBE_API_KEY",
    "https://console.cloud.google.com/apis/credentials adresinden ucretsiz alinir\n" +
      '(once "YouTube Data API v3" etkinlestirilir).',
  );

  const config = readConfig();
  const windowHours = readFlag("hours", config.windowHours ?? 48);
  const minViews = readFlag("min-views", config.minViews ?? 5000);
  const limit = readFlag("limit", config.limit ?? 25);

  console.log(
    "\n== Konu kesfi ==\n" +
      "   pencere: son " +
      windowHours +
      " saat | esik: " +
      minViews.toLocaleString("tr-TR") +
      " izlenme | kota: ~" +
      config.queries.length * SEARCH_COST +
      " birim\n",
  );

  const candidates = await collectCandidates(config, windowHours, minViews);
  if (candidates.length === 0) {
    fail(
      "Esigi gecen video cikmadi. --hours degerini buyutun ya da --min-views degerini dusurun.",
    );
  }

  const ranked = limitPerChannel(
    candidates.sort((a, b) => b.outlier - a.outlier),
    config.perChannelLimit ?? 2,
  ).slice(0, limit);

  const today = new Date().toISOString().slice(0, 10);
  const outputFile = path.join(OUTPUT_DIR, today + ".json");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        windowHours,
        minViews,
        topics: ranked,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("\n  #     asim    izlenme    yas  kalip    baslik");
  console.log("  " + "-".repeat(100));
  ranked.forEach((candidate, index) =>
    console.log("  " + formatRow(candidate, index)),
  );

  const shapes = ranked.reduce((counts, candidate) => {
    counts[candidate.shape] = (counts[candidate.shape] ?? 0) + 1;
    return counts;
  }, {});

  console.log(
    "\nKalip dagilimi: " +
      Object.entries(shapes)
        .map(([shape, count]) => shape + " " + count)
        .join(", "),
  );
  console.log("\nBitti: " + outputFile + " (" + ranked.length + " konu)");
}
