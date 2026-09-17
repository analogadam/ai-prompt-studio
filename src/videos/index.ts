// URETILMIS DOSYA -- elle duzenlemeyin.
// Yeniden uretmek icin: node scripts/build-registry.mjs
import type { VideoData } from "../scenes/types";
import astraShorts from "./astra-shorts";
import demo from "./demo";
import demoReels from "./demo-reels";
import gpt6Shorts from "./gpt6-shorts";
import vramMiIslemciMi from "./vram-mi-islemci-mi";

/** Render edilebilir kompozisyonlar: kimlik -> video verisi. */
export const VIDEOS: Record<string, VideoData> = {
  AstraShorts: astraShorts,
  Demo: demo,
  DemoReels: demoReels,
  Gpt6Shorts: gpt6Shorts,
  VramMiIslemciMi: vramMiIslemciMi,
};
