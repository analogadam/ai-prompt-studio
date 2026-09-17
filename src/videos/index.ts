// URETILMIS DOSYA -- elle duzenlemeyin.
// Yeniden uretmek icin: node scripts/build-registry.mjs
import type { VideoData } from "../scenes/types";
import astraShorts from "./astra-shorts/video";
import gpt6Shorts from "./gpt6-shorts/video";
import rtx5060YapayZeka from "./rtx-5060-yapay-zeka/video";
import ssdTakma from "./ssd-takma/video";
import vramMiIslemciMi from "./vram-mi-islemci-mi/video";
import x3dFarkEderMi from "./x3d-fark-eder-mi/video";

/** Render edilebilir kompozisyonlar: kimlik -> video verisi. */
export const VIDEOS: Record<string, VideoData> = {
  AstraShorts: astraShorts,
  Gpt6Shorts: gpt6Shorts,
  Rtx5060YapayZeka: rtx5060YapayZeka,
  SsdTakma: ssdTakma,
  VramMiIslemciMi: vramMiIslemciMi,
  X3dFarkEderMi: x3dFarkEderMi,
};
