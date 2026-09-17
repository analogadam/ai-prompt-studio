/**
 * Render edilmis videoyu YouTube kanalina yukler.
 *
 *   node scripts/upload.mjs --login                    (bir kereye mahsus izin)
 *   node scripts/upload.mjs x3d-fark-eder-mi
 *   node scripts/upload.mjs x3d-fark-eder-mi --privacy public
 *   node scripts/upload.mjs x3d-fark-eder-mi --publish-at 2026-09-18T18:00:00Z
 *
 * Neden: kanalin bir numarali sorunu sureklilik -- 12 ayda uc patlama, arada
 * dort ve yedi ay sessizlik. Uretim otomatik olsa bile yukleme elle kalirsa
 * sessizlik geri geliyor.
 *
 * Yetki: yukleme API anahtariyla olmaz, kanal sahibinin izni (OAuth) gerekir.
 * Izin bir kere verilir, uretilen "refresh token" .env icinde saklanir ve
 * sonraki yuklemeler kullaniciya sormadan calisir.
 *
 * Kota: yukleme cagrisi 1.600 birim, gunluk ucretsiz kota 10.000 birim --
 * gunde alti yukleme rahat siger.
 *
 * Video basligi ve aciklamasi brief.json icindeki "youtube" alanindan gelir:
 *   "youtube": { "title": "...", "description": "...", "tags": ["..."] }
 * Yoksa brief'in "title" alani kullanilir.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { readApiKey } from "./env.mjs";

const REDIRECT_PORT = 53682;
const REDIRECT_URI = "http://127.0.0.1:" + REDIRECT_PORT;
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
// 28 = Science & Technology.
const CATEGORY_ID = "28";
const DEFAULT_PRIVACY = "private";

const fail = (message) => {
  console.error("\nHATA: " + message + "\n");
  process.exit(1);
};

const readFlag = (name) => {
  const index = process.argv.indexOf("--" + name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const clientId = () =>
  readApiKey(
    "YOUTUBE_CLIENT_ID",
    'Google Cloud Console > Credentials > OAuth client ID > "Desktop app" ile alinir.',
  );
const clientSecret = () =>
  readApiKey(
    "YOUTUBE_CLIENT_SECRET",
    "Ayni OAuth istemcisinin gizli anahtari.",
  );

/** .env dosyasina satir ekler; anahtar zaten varsa degerini gunceller. */
const saveToDotEnv = (name, value) => {
  const current = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
  const lines = current
    .split(/\r?\n/)
    .filter((line) => !line.startsWith(name + "="));
  const next = [...lines.filter(Boolean), name + "=" + value, ""].join("\n");
  fs.writeFileSync(".env", next, "utf8");
};

const postForm = async (url, params) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const body = await response.json();
  if (!response.ok) fail("Yetki istegi basarisiz: " + JSON.stringify(body));
  return body;
};

/**
 * Tarayicida izin alip "refresh token" uretir.
 *
 * Google masaustu uygulamalarinda izni yerel bir adrese geri gonderir; bu
 * yuzden kisa omurlu bir sunucu acilir, kod alinir ve sunucu kapanir.
 */
const login = async () => {
  const id = clientId();
  const secret = clientSecret();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", id);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPE);
  // Refresh token yalnizca ilk onayda ve "consent" istenirse geliyor.
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  console.log(
    "\nSu adresi tarayicida ac ve kanal hesabiyla izin ver:\n\n" +
      authUrl +
      "\n",
  );

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const url = new URL(request.url, REDIRECT_URI);
      const received = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(
        received ? "Izin alindi, terminale donebilirsin." : "Izin verilmedi.",
      );
      server.close();

      if (received) resolve(received);
      else reject(new Error(error ?? "kod alinamadi"));
    });
    server.listen(REDIRECT_PORT);
  }).catch((error) => fail("Izin alinamadi: " + error.message));

  const token = await postForm(TOKEN_URL, {
    code,
    client_id: id,
    client_secret: secret,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });

  if (!token.refresh_token) {
    fail("Google refresh token dondurmedi. Izni kaldirip yeniden deneyin.");
  }

  saveToDotEnv("YOUTUBE_REFRESH_TOKEN", token.refresh_token);
  console.log("\nBitti: YOUTUBE_REFRESH_TOKEN .env dosyasina yazildi.\n");
};

const accessToken = async () => {
  const token = await postForm(TOKEN_URL, {
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: readApiKey(
      "YOUTUBE_REFRESH_TOKEN",
      "Once bir kereligine: node scripts/upload.mjs --login",
    ),
    grant_type: "refresh_token",
  });
  return token.access_token;
};

/** Yuklenecek video verisini brief'ten kurar. */
const buildMetadata = (brief, privacy, publishAt) => {
  const youtube = brief.youtube ?? {};
  const status = { privacyStatus: privacy, selfDeclaredMadeForKids: false };

  // Zamanlanmis yayin yalnizca video "private" iken kabul ediliyor.
  if (publishAt) {
    status.publishAt = publishAt;
    status.privacyStatus = "private";
  }

  return {
    snippet: {
      title: youtube.title ?? brief.title,
      description: youtube.description ?? "",
      tags: youtube.tags ?? [],
      categoryId: CATEGORY_ID,
      defaultLanguage: "tr",
      defaultAudioLanguage: "tr",
    },
    status,
  };
};

const upload = async (slug) => {
  const briefPath = path.join("src", "videos", slug, "brief.json");
  const videoPath = path.join("out", slug + ".mp4");
  const recordPath = path.join("src", "videos", slug, "upload.json");

  if (!fs.existsSync(briefPath)) fail("Brief bulunamadi: " + briefPath);
  if (!fs.existsSync(videoPath)) {
    fail(
      "Render bulunamadi: " +
        videoPath +
        "\nOnce: node scripts/produce.mjs " +
        briefPath,
    );
  }
  // Ayni videoyu ikinci kez yuklemek kanalda kopya birakir; kayit varsa durulur.
  if (fs.existsSync(recordPath)) {
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
    fail(
      slug +
        " zaten yuklenmis: " +
        record.url +
        "\nYeniden yuklemek icin " +
        recordPath +
        " silinmeli.",
    );
  }

  const brief = JSON.parse(fs.readFileSync(briefPath, "utf8"));
  const metadata = buildMetadata(
    brief,
    readFlag("privacy") ?? DEFAULT_PRIVACY,
    readFlag("publish-at"),
  );
  const file = fs.readFileSync(videoPath);
  const token = await accessToken();

  console.log("\n== " + slug + " ==");
  console.log("   baslik : " + metadata.snippet.title);
  console.log(
    "   durum  : " +
      metadata.status.privacyStatus +
      (metadata.status.publishAt
        ? " (yayin: " + metadata.status.publishAt + ")"
        : ""),
  );
  console.log(
    "   boyut  : " + (file.length / (1024 * 1024)).toFixed(1) + " MB",
  );

  // 1. adim: oturum acilir, Google yukleme adresi verir.
  const session = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json; charset=utf-8",
      "X-Upload-Content-Length": String(file.length),
      "X-Upload-Content-Type": "video/mp4",
    },
    body: JSON.stringify(metadata),
  });
  if (!session.ok)
    fail("Yukleme oturumu acilamadi: " + (await session.text()).slice(0, 300));

  const location = session.headers.get("location");
  if (!location) fail("Google yukleme adresi vermedi.");

  // 2. adim: dosya tek parca gonderilir (Shorts dosyalari 40 MB civari).
  console.log("\nYukleniyor...");
  const response = await fetch(location, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(file.length),
    },
    body: file,
  });
  const result = await response.json();
  if (!response.ok)
    fail("Yukleme basarisiz: " + JSON.stringify(result).slice(0, 300));

  const record = {
    videoId: result.id,
    url: "https://youtube.com/shorts/" + result.id,
    title: metadata.snippet.title,
    privacyStatus: metadata.status.privacyStatus,
    uploadedAt: new Date().toISOString(),
  };
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + "\n", "utf8");

  console.log("\nBitti: " + record.url);
  console.log("Kayit: " + recordPath);
};

// --- akis ---

if (process.argv.includes("--login")) {
  await login();
} else {
  const slug = process.argv[2];
  if (!slug || slug.startsWith("--")) {
    fail(
      "Kullanim: node scripts/upload.mjs <slug> [--privacy private|unlisted|public] [--publish-at ISO]",
    );
  }
  await upload(slug);
}
