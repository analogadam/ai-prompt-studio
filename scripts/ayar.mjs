/**
 * discovery.json icindeki kesif ayarlarini okur.
 *
 * Dosya iki bolumden olusur ("youtube" ve "radar") cunku iki kesif yolu ayni
 * soruyu sormuyor ve ikisinin de windowHours gibi ayni adli ayarlari var. Hangi
 * bolumun okundugu ve "bolum yok" hatasi tek yerde toplanmistir.
 */
import fs from "node:fs";

const CONFIG_FILE = "discovery.json";

/** Hatayi yazip cikar; her betikte tekrarlanmasin diye burada. */
export const fail = (message) => {
  console.error("\nHATA: " + message + "\n");
  process.exit(1);
};

/**
 * Sayisal bayraklari okur: --hours 72 gibi.
 *
 * @param {string} name      Bayrak adi, basindaki "--" olmadan
 * @param {number} fallback  Bayrak verilmediginde gecerli deger
 */
export const readFlag = (name, fallback) => {
  const index = process.argv.indexOf("--" + name);
  if (index === -1) return fallback;

  const value = Number(process.argv[index + 1]);
  if (!Number.isFinite(value) || value <= 0)
    fail("--" + name + " icin gecerli bir sayi verin");
  return value;
};

/**
 * Ayar dosyasinin bir bolumunu dondurur.
 *
 * @param {string} name      Bolum adi, "youtube" ya da "radar"
 * @param {string} required  Bolumde bulunmasi zorunlu dizi alani
 */
export const readSection = (name, required) => {
  if (!fs.existsSync(CONFIG_FILE)) fail(CONFIG_FILE + " bulunamadi");

  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  const section = config[name];
  if (!section) fail(CONFIG_FILE + ' icinde "' + name + '" bolumu yok');

  if (!Array.isArray(section[required]) || section[required].length === 0) {
    fail(
      CONFIG_FILE +
        ' icinde "' +
        name +
        '" bolumunun "' +
        required +
        '" listesi bos olmamali',
    );
  }
  return section;
};
