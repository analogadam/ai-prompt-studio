export type FormatId = "youtube" | "reels" | "square";

export type Format = {
  width: number;
  height: number;
  fps: number;
};

/**
 * Hedef platforma gore en-boy orani, cozunurluk ve fps.
 * Yeni bir platform gerekirse buraya bir satir eklemek yeterli.
 */
export const FORMATS: Record<FormatId, Format> = {
  youtube: { width: 1920, height: 1080, fps: 30 },
  reels: { width: 1080, height: 1920, fps: 30 },
  square: { width: 1080, height: 1080, fps: 30 },
};
