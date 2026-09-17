/**
 * API anahtarlarini ortamdan ya da proje kokundeki .env dosyasindan okur.
 *
 * Anahtarlar depoya girmez (.env gitignore icinde). Birden fazla betik ayni
 * dosyadan okudugu icin okuma ve "anahtar yok" hatasi tek yerde toplanmistir.
 */
import fs from "node:fs";

const DOTENV = ".env";

const readFromDotEnv = (name) => {
  if (!fs.existsSync(DOTENV)) return undefined;

  const line = fs
    .readFileSync(DOTENV, "utf8")
    .split(/\r?\n/)
    .find((row) => row.startsWith(name + "="));

  return line ? line.slice(name.length + 1).trim() : undefined;
};

/**
 * Anahtari dondurur; bulamazsa nereden alinacagini anlatip cikar.
 *
 * @param {string} name  Ortam degiskeninin adi, ornegin "PEXELS_API_KEY"
 * @param {string} help  Anahtarin nereden alinacagini anlatan satir
 */
export const readApiKey = (name, help) => {
  const value = process.env[name] || readFromDotEnv(name);
  if (value) return value;

  console.error(
    "\nHATA: " +
      name +
      " bulunamadi.\n" +
      help +
      "\n" +
      'Proje kokundeki .env dosyasina "' +
      name +
      '=..." satiri olarak ekleyin.\n',
  );
  process.exit(1);
};
