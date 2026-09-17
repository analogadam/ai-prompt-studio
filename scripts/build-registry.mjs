/**
 * src/videos/ altindaki her video klasorunu tarayip src/videos/index.ts'i uretir.
 *
 * Kural: her video "<slug>/" adinda bir klasordur ve icindeki "video.ts"
 * VideoData'yi "export default" ile disari verir. Kompozisyon kimligi slug'in
 * PascalCase halidir: "ram-yavaslama/" -> "RamYavaslama".
 *
 *   node scripts/build-registry.mjs
 *
 * Gunde birkac video uretilen bir kanalda kayit defterini elle tutmak
 * surdurulemez; bu yuzden index.ts uretilir, elle duzenlenmez.
 */
import fs from "node:fs";
import path from "node:path";

const VIDEOS_DIR = path.join("src", "videos");
const VIDEO_FILE = "video.ts";
const OUTPUT = path.join(VIDEOS_DIR, "index.ts");

const toPascalCase = (slug) =>
  slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");

const toCamelCase = (slug) => {
  const pascal = toPascalCase(slug);
  return pascal[0].toLowerCase() + pascal.slice(1);
};

const slugs = fs
  .readdirSync(VIDEOS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((slug) => fs.existsSync(path.join(VIDEOS_DIR, slug, VIDEO_FILE)))
  .sort();

if (slugs.length === 0) {
  throw new Error(`${VIDEOS_DIR} altinda ${VIDEO_FILE} iceren klasor bulunamadi`);
}

// Iki farkli slug ayni kimlige dusebilir ("a-b" ve "a_b"); sessizce birini
// yutmak yerine hata verilir.
const byId = new Map();
for (const slug of slugs) {
  const id = toPascalCase(slug);
  if (byId.has(id)) {
    throw new Error(`Cakisan kompozisyon kimligi "${id}": ${byId.get(id)}.ts ve ${slug}.ts`);
  }
  byId.set(id, slug);
}

const imports = slugs.map((slug) => `import ${toCamelCase(slug)} from "./${slug}/video";`).join("\n");
const entries = slugs.map((slug) => `  ${toPascalCase(slug)}: ${toCamelCase(slug)},`).join("\n");

const contents = `// URETILMIS DOSYA -- elle duzenlemeyin.
// Yeniden uretmek icin: node scripts/build-registry.mjs
import type { VideoData } from "../scenes/types";
${imports}

/** Render edilebilir kompozisyonlar: kimlik -> video verisi. */
export const VIDEOS: Record<string, VideoData> = {
${entries}
};
`;

fs.writeFileSync(OUTPUT, contents, "utf8");
console.log(`${OUTPUT} uretildi (${slugs.length} video: ${slugs.map(toPascalCase).join(", ")})`);
