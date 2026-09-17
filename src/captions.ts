import type { Caption } from "@remotion/captions";

/**
 * Uzun bir kaydin altyazisindan yalnizca istenen araligi alir ve
 * zaman damgalarini klibin basina tasir. Uzun videodan kisa klip
 * cikarirken kullanilir.
 */
export const sliceCaptions = ({
  captions,
  startInSeconds,
  durationInSeconds,
}: {
  captions: Caption[];
  startInSeconds: number;
  durationInSeconds: number;
}): Caption[] => {
  const startMs = startInSeconds * 1000;
  const endMs = startMs + durationInSeconds * 1000;

  return captions
    .filter((caption) => caption.endMs > startMs && caption.startMs < endMs)
    .map((caption) => ({
      ...caption,
      startMs: caption.startMs - startMs,
      endMs: caption.endMs - startMs,
      timestampMs: caption.timestampMs === null ? null : caption.timestampMs - startMs,
    }));
};
