/**
 * RSS 2.0 ve Atom akislarindan baslik, bag ve tarih cikarir.
 *
 * Neden ayri bir XML paketi yok: iki alan (baslik, tarih) ve bir bag okunuyor,
 * kaynaklar da standart akis uretiyor. Paket eklemek bu kadari icin agir kacar.
 * Bedeli sudur: bozuk XML'de desen sessizce bos donebilir. Bu yuzden akis basina
 * kac kayit okundugu cagirana bildirilir; radar.mjs sifir donen kaynagi yazar.
 *
 * Akislar birbirinden bagimsiz: biri 403/429 verdiginde tarama durmaz, o kaynak
 * hatasiyla birlikte atlanir (olculdu: VentureBeat 429, Microsoft AI 403).
 */

// Bazi kaynaklar (Ars Technica, TechCrunch) tarayici kimligi olmayan istegi
// reddediyor.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppData/1.0 (konu radari)";
const TIMEOUT_MS = 20_000;

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  "#8217": "’",
  "#8216": "‘",
  "#8212": "—",
  "#8211": "–",
};

/** &amp; ve &#8217; gibi kacislari cozer; tanimadigini oldugu gibi birakir. */
const decodeEntities = (text) =>
  text.replace(/&(#?\w+);/g, (match, name) => ENTITIES[name] ?? match);

/** CDATA, ic etiket ve fazla bosluktan arindirilmis duz metin. */
const clean = (xml) =>
  decodeEntities(
    xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

/** Verilen etiketlerden ilk dolu olanin metni. */
const tagText = (xml, names) => {
  for (const name of names) {
    const match = new RegExp(
      "<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">",
      "i",
    ).exec(xml);
    const text = match ? clean(match[1]) : "";
    if (text) return text;
  }
  return "";
};

/**
 * Kaydin baglantisi.
 *
 * RSS bagi etiketin icine yazar (<link>adres</link>), Atom ise href niteligine
 * koyar ve kendine donen rel="self" bagini da ekler; o atlanir.
 */
const readLink = (xml) => {
  const href = [...xml.matchAll(/<link\b([^>]*?)\/?>/gi)]
    .map((match) => match[1])
    .filter((attrs) => !/rel\s*=\s*["']self["']/i.test(attrs))
    .map((attrs) => /href\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1])
    .find(Boolean);
  if (href) return decodeEntities(href);

  return tagText(xml, ["link", "guid"]);
};

const ENTRY = /<(item|entry)\b[\s\S]*?<\/\1>/gi;

/** Akis metnini {title, url, publishedAt} kayitlarina cevirir. */
export const parseFeed = (xml) =>
  [...xml.matchAll(ENTRY)]
    .map((match) => {
      const entry = match[0];
      // dc:date eski WordPress akislarinda pubDate yerine gecer.
      const date = tagText(entry, [
        "pubDate",
        "published",
        "updated",
        "dc:date",
      ]);
      const publishedAt = date ? new Date(date) : null;

      return {
        title: tagText(entry, ["title"]),
        url: readLink(entry),
        publishedAt:
          publishedAt && !Number.isNaN(publishedAt.getTime())
            ? publishedAt
            : null,
      };
    })
    .filter((entry) => entry.title && entry.publishedAt);

/**
 * Tek bir akisi indirip ayristirir.
 *
 * Hata firlatmaz: cagiran tum kaynaklari tek turda gezdigi icin bir kaynagin
 * cokmesi digerlerini goturmemeli. Sonuc ya {entries} ya {error} tasir.
 */
export const fetchFeed = async (feed) => {
  try {
    const response = await fetch(feed.url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/xml, text/xml",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });
    if (!response.ok)
      return { feed, entries: [], error: "HTTP " + response.status };

    return { feed, entries: parseFeed(await response.text()) };
  } catch (error) {
    // error.name her seye "TypeError" der; asil neden cause.code icinde
    // ("SELF_SIGNED_CERT_IN_CHAIN", "ENOTFOUND"). Teshis icin o yazilir.
    return {
      feed,
      entries: [],
      error: error.cause?.code ?? error.name ?? String(error),
    };
  }
};
