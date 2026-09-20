/**
 * Yeni cikan yapay zeka araclarini kaynaginda yakalar.
 *
 *   node scripts/radar.mjs
 *   node scripts/radar.mjs --hours 96 --limit 40
 *
 * Neden discover.mjs yetmiyor: o betik YouTube'da Turkce arar, yani bir araci
 * ancak Turkce icerik ureticileri onu isledikten SONRA gorur. Kanalin isi yeni
 * cikani tanitmak oldugu icin bu her zaman gec kalmak demek. Radar kaynaga
 * bakar (resmi bloglar, AI basini, gelistirici toplulugu) ve olayi Turkce
 * icerige dusmeden once bulur.
 *
 * Iki betik ayri durur ve puanlari birlesmez: YouTube'da izlenme var, RSS'te
 * yok. Ortak bir skor uydurmak iki sinyali de bozardi. Iliski su: radar NE
 * CIKTIGINI soyler, discover NE TUTTUGUNU.
 *
 * Skor capraz dogrulamadir: ayni olayi kac bagimsiz kaynak yazmis. Tek kaynak
 * haber olabilir de olmayabilir de; uc kaynak yazmissa olay gercekten olmustur.
 * Resmi blog ve lansman fiili bunun uzerine eklenir.
 *
 * Ayarlar discovery.json "radar" bolumunde. API anahtari ve kota gerekmez.
 */
import fs from "node:fs";
import path from "node:path";
import { fail, readFlag, readSection } from "./ayar.mjs";
import { titleShape, WINNING_SHAPES } from "./baslik.mjs";
import { fetchFeed } from "./feeds.mjs";
import { escapeRegExp, WORD_END, WORD_START } from "./text.mjs";

const OUTPUT_DIR = "topics";
const OUTPUT_SUFFIX = "-radar.json";
// Node kendi CA listesiyle gelir; kurumsal ya da antivirus TLS kesmesi olan
// makinede zincir kendinden imzali gorunur ve istek duser (curl dusmez, cunku
// Windows sertifika deposunu okur). Cozum dogrulamayi kapatmak degil, Node'a
// ayni depoyu okutmaktir: "npm run radar" bayragi bunun icin tasir.
const TLS_ERRORS = new Set([
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
]);
// Baslik onerisi en fazla bu kadar kelimelik bir ozel ad tasir.
const SUBJECT_WORDS = 3;
// Kalip denetiminde {konu} yerine konan ornek: marka + surum, yani "duyuru"
// kalibina en yakin durum. Soru kalibi bunu bile gecirebiliyorsa kalip saglamdir.
const SAMPLE_SUBJECT = "Gemini 3";

/**
 * Ingilizce metin icin kucuk harf.
 *
 * text.mjs'teki toTurkishLower BURADA KULLANILMAZ: Turkce kurali "I" harfini
 * "ı"ya cevirir, yani "AI" kelimesi "aı" olur ve "ai" terimi hicbir zaman
 * eslesmez. Akislar Ingilizce oldugu icin duz kucultme dogrusudur.
 */
const toLower = (text) => text.toLowerCase();

/** Ingilizce terim listesini tam kelime arayan desene cevirir. */
const englishPattern = (terms) =>
  new RegExp(
    WORD_START +
      "(?:" +
      terms.map((term) => escapeRegExp(toLower(term))).join("|") +
      ")" +
      WORD_END,
    "u",
  );

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/** Basliktaki ayirt edici kelimeler (kucuk harf, tekrarsiz). */
const keywords = (title, stopwords) =>
  new Set(
    (toLower(title).match(WORD) ?? []).filter(
      (word) => word.length > 2 && !stopwords.has(word),
    ),
  );

/**
 * Iki baslik ne kadar ayni olayi anlatiyor (Jaccard: ortak / toplam).
 *
 * Tek bir ortak kelime yetmez -- iki ayri OpenAI haberi de "openai" paylasir.
 * Oran istemek bunu kendiliginden eler: alti kelimelik iki baslikta tek ortak
 * kelime 0,09 eder, esigin cok altinda.
 */
const similarity = (a, b) => {
  const shared = [...a].filter((word) => b.has(word)).length;
  const total = a.size + b.size - shared;
  return total === 0 ? 0 : shared / total;
};

/**
 * Ayni olayi anlatan kayitlari tek kumede toplar.
 *
 * Kayitlar eskiden yeniye gezilir, boylece kumenin ilk uyesi olayi ilk yazan
 * kaynak olur; sonradan gelenler onun ustune eklenir.
 */
const clusterEntries = (entries, threshold) => {
  const clusters = [];

  for (const entry of entries) {
    const match = clusters.find((cluster) =>
      cluster.some(
        (other) => similarity(entry.keywords, other.keywords) >= threshold,
      ),
    );
    if (match) match.push(entry);
    else clusters.push([entry]);
  }
  return clusters;
};

/**
 * Kumenin konusu: baslik onerisine girecek ozel ad.
 *
 * Birden fazla kaynak varsa hepsinin paylastigi kelimeler alinir -- olayin
 * cekirdegi odur. Tek kaynakta paylasilan kelime olmadigi icin basligin kendi
 * ayirt edici kelimeleri kullanilir.
 *
 * Iki kelime turu disarida kalir. Lansman fiili ozne olamaz: disarida
 * birakilmazsa konu "Introducing Astra Law" cikiyor. Ingilizce basligin ilk
 * kelimesi de ozel ad sayilmaz, cunku baslik her zaman buyuk harfle baslar --
 * "Reimagining advertising with AI" basliginda "Reimagining" marka degil.
 *
 * Sonuc bir ipucudur, kesin ad degil: baslik ve bag da ciktida durur, senaryoyu
 * yazan duzeltir.
 */
const subjectOf = (cluster, representative, launch) => {
  const shared = cluster
    .map((entry) => entry.keywords)
    .reduce(
      (left, right) => new Set([...left].filter((word) => right.has(word))),
    );
  const keep = shared.size > 0 ? shared : representative.keywords;

  const words = representative.title.match(WORD) ?? [];
  const chosen = words
    .map((word, index) => ({ word, index }))
    .filter(
      ({ word }) => keep.has(toLower(word)) && !launch.test(toLower(word)),
    );
  const proper = chosen.filter(
    ({ word, index }) => index > 0 && /^\p{Lu}/u.test(word),
  );

  return (proper.length > 0 ? proper : chosen)
    .slice(0, SUBJECT_WORDS)
    .map(({ word }) => word)
    .join(" ");
};

/**
 * Kanal kuralina uyan baslik kaliplarini secer.
 *
 * Kural: konu yeni bir urun olsa bile baslik urun duyurusu gibi kurulmamali
 * ("GPT-6 Astra" 4 izlenme aldi). Denetim kalip basina bir kez yapilir, cunku
 * elenecek olan kalibin kendisidir; ayni kalibi her madde icin yeniden sinamak
 * hep ayni sonucu verirdi.
 */
const usableTemplates = (templates) => {
  const usable = [];

  for (const template of templates) {
    const shape = titleShape(template.replaceAll("{konu}", SAMPLE_SUBJECT));
    if (WINNING_SHAPES.has(shape)) usable.push(template);
    else
      console.warn(
        '   UYARI: "' + template + '" kalibi ' + shape + " cikti, elendi.",
      );
  }

  if (usable.length === 0) {
    fail(
      "Hicbir baslik kalibi soru ya da iddia degil. discovery.json icindeki " +
        "titleTemplates listesini duzeltin.",
    );
  }
  return usable;
};

// --- akis ---

const config = readSection("radar", "feeds");
const windowHours = readFlag("hours", config.windowHours ?? 48);
const limit = readFlag("limit", config.limit ?? 25);

const terms = englishPattern(config.terms ?? []);
const launch = englishPattern(config.launchTerms ?? []);
const threshold = config.similarity ?? 0.35;
const stopwords = new Set(config.stopwords ?? []);

console.log(
  "\n== Yenilik radari ==\n" +
    "   pencere: son " +
    windowHours +
    " saat | kaynak: " +
    config.feeds.length +
    " akis | kota: yok\n",
);

const templates = usableTemplates(config.titleTemplates ?? []);
const since = Date.now() - windowHours * 3_600_000;

const results = await Promise.all(config.feeds.map(fetchFeed));
const entries = [];

for (const { feed, entries: found, error } of results) {
  // Terim suzgeci yalnizca genel akislara uygulanir. Konu akislari (OpenAI
  // haberleri, TechCrunch AI) zaten kapsam icinde; oralarda suzmek kaybettiriyor:
  // "Introducing Astra for Law" tek bir genel terim tasimiyor ama tam da aranan
  // sey. Hacker News gibi genel akislarda ise suzgec sart.
  const fresh = found.filter(
    (entry) =>
      entry.publishedAt.getTime() >= since &&
      (!feed.genel || terms.test(toLower(entry.title))),
  );
  fresh.forEach((entry) =>
    entries.push({
      ...entry,
      feed: feed.name,
      kind: feed.kind,
      keywords: keywords(entry.title, stopwords),
    }),
  );

  console.log(
    "   " +
      feed.name.padEnd(22) +
      (error
        ? "ULASILAMADI (" + error + ")"
        : String(fresh.length) + " / " + found.length + " kayit"),
  );
}

if (results.some(({ error }) => TLS_ERRORS.has(error))) {
  console.log(
    "\n   Not: ULASILAMADI yazan kaynaklarda sertifika zinciri dogrulanamadi." +
      '\n   "npm run radar" ile calistirin: Node sistem deposunu okur.',
  );
}

if (entries.length === 0) {
  fail(
    "Pencerede konuyla ilgili kayit cikmadi. --hours degerini buyutun ya da " +
      "discovery.json icindeki radar.terms listesini genisletin.",
  );
}

entries.sort((a, b) => a.publishedAt - b.publishedAt);

const topics = clusterEntries(entries, threshold)
  .map((cluster) => {
    // Temsilci resmi kaynak varsa odur: lansmani birincil agizdan almak yeglenir.
    const representative =
      cluster.find((entry) => entry.kind === "resmi") ?? cluster[0];
    const sources = [...new Set(cluster.map((entry) => entry.feed))];
    const official = cluster.some((entry) => entry.kind === "resmi");
    const isLaunch = cluster.some((entry) => launch.test(toLower(entry.title)));
    const subject = subjectOf(cluster, representative, launch);

    return {
      konu: subject,
      baslik: representative.title,
      url: representative.url,
      kaynaklar: sources,
      kaynakSayisi: sources.length,
      resmi: official,
      lansman: isLaunch,
      ageHours: Number(
        (
          (Date.now() - representative.publishedAt.getTime()) /
          3_600_000
        ).toFixed(1),
      ),
      score:
        sources.length +
        (official ? (config.officialBonus ?? 2) : 0) +
        (isLaunch ? (config.launchBonus ?? 1) : 0),
      // Senaryoyu yazarken kaynaklarin hepsi okunur; tek tek aranmasin.
      kayitlar: cluster.map((entry) => ({
        feed: entry.feed,
        title: entry.title,
        url: entry.url,
        publishedAt: entry.publishedAt.toISOString(),
      })),
      basliklar: templates.map((template) =>
        template.replaceAll("{konu}", subject),
      ),
    };
  })
  .sort((a, b) => b.score - a.score || a.ageHours - b.ageHours)
  .slice(0, limit);

const today = new Date().toISOString().slice(0, 10);
const outputFile = path.join(OUTPUT_DIR, today + OUTPUT_SUFFIX);
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(
  outputFile,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), windowHours, topics },
    null,
    2,
  ),
  "utf8",
);

const formatRow = (topic, index) =>
  [
    String(index + 1).padStart(2) + ".",
    String(topic.score).padStart(5),
    String(topic.kaynakSayisi).padStart(3),
    (topic.resmi ? "resmi" : "-").padEnd(5),
    (topic.lansman ? "lansman" : "-").padEnd(7),
    (Math.round(topic.ageHours) + " sa").padStart(6),
    topic.baslik.slice(0, 64),
  ].join("  ");

console.log("\n  #   puan   kyn  resmi  lansman     yas  baslik");
console.log("  " + "-".repeat(100));
topics.forEach((topic, index) => console.log("  " + formatRow(topic, index)));

console.log("\nBitti: " + outputFile + " (" + topics.length + " konu)");
