// URETILMIS DOSYA -- elle duzenlemeyin.
// Yeniden uretmek icin: node scripts/build-registry.mjs
import type { VideoData } from "../scenes/types";
import astraShorts from "./astra-shorts/video";
import gpt6Shorts from "./gpt6-shorts/video";
import vramMiIslemciMi from "./vram-mi-islemci-mi/video";

/** Render edilebilir kompozisyonlar: kimlik -> video verisi. */
export const VIDEOS: Record<string, VideoData> = {
  AstraShorts: astraShorts,
  Gpt6Shorts: gpt6Shorts,
  VramMiIslemciMi: vramMiIslemciMi,
};
