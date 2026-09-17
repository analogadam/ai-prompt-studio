import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useScale } from "../scale";
import { theme } from "../theme";
import type { BrollScene } from "./types";

/**
 * Manset ustte durur: ekranin alt bandi karaoke altyazinin (Subtitles) ve
 * Shorts arayuzunun; oraya ikinci bir metin konursa ust uste biner.
 * Ustte ise ilerleme cizgisinin altinda kalmasi yeter.
 */
const HEADLINE_TOP = 0.13;

/**
 * Kadraj hareketi. Sabit duran bir kayit "donmus goruntu" gibi durur; surekli
 * hafif hareket goz icin canli tutar. Sahneden sahneye degistirilerek kurgunun
 * tekduze olmasi engellenir.
 */
const useFraming = (motion: BrollScene["motion"], progress: number) => {
  switch (motion) {
    case "out":
      return { scale: 1.16 - progress * 0.1, x: 0, y: 0 };
    case "left":
      return { scale: 1.12, x: (0.5 - progress) * 0.06, y: 0 };
    case "right":
      return { scale: 1.12, x: (progress - 0.5) * 0.06, y: 0 };
    case "in":
    default:
      return { scale: 1.06 + progress * 0.1, x: 0, y: 0 };
  }
};

/** caption'i kelimelere ayirip vurgulanacak olani isaretler. */
const splitCaption = (caption: string, highlight?: string) =>
  caption.split(" ").map((word) => ({
    word,
    isHighlight: highlight ? word.replace(/[^\p{L}\p{N}-]/gu, "") === highlight : false,
  }));

export const Broll: React.FC<BrollScene> = ({
  durationInSeconds,
  src,
  startFromInSeconds,
  caption,
  highlight,
  motion = "in",
  dim = 0.34,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const scale = useScale();

  const total = Math.max(1, durationInSeconds * fps);
  const progress = interpolate(frame, [0, total], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const framing = useFraming(motion, progress);

  const words = caption ? splitCaption(caption, highlight) : [];

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background }}>
      <AbsoluteFill
        style={{
          transform: `scale(${framing.scale}) translateX(${framing.x * width}px)`,
        }}
      >
        <OffthreadVideo
          src={staticFile(src)}
          muted
          trimBefore={startFromInSeconds ? Math.round(startFromInSeconds * fps) : undefined}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* Karartma iki ucta yogunlasir: ustte manset, altta altyazi okunsun
          diye. Ortadaki bant acik kalir, goruntu gorunur olmaya devam eder. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(4,6,14,${Math.min(1, dim * 1.7)}) 0%, rgba(4,6,14,${dim * 0.7}) 28%, rgba(4,6,14,0) 48%, rgba(4,6,14,${dim * 1.3}) 82%, rgba(4,6,14,${Math.min(1, dim * 1.9)}) 100%)`,
        }}
      />

      {caption ? (
        <AbsoluteFill
          style={{
            fontFamily: theme.fontFamily,
            justifyContent: "flex-start",
            alignItems: "flex-start",
            padding: `${height * HEADLINE_TOP}px ${scale * 0.06}px 0`,
          }}
        >
          <div style={{ display: "flex", alignItems: "stretch", gap: scale * 0.022 }}>
            {/* Sol kenardaki renk cubugu: metni goruntuden ayirir. */}
            <div
              style={{
                width: scale * 0.006,
                borderRadius: 999,
                background: `linear-gradient(180deg, ${theme.accent}, ${theme.accentAlt})`,
                boxShadow: `0 0 ${scale * 0.018}px ${theme.accent}`,
                transform: `scaleY(${spring({ frame, fps, durationInFrames: 18, config: { damping: 200 } })})`,
                transformOrigin: "top",
              }}
            />
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: `${scale * 0.002}px ${scale * 0.016}px`,
                maxWidth: scale * 0.66,
              }}
            >
              {words.map(({ word, isHighlight }, index) => {
                // Kelimeler yandan girer: solmak yerine kesme hissi verir.
                const enter = spring({
                  frame: frame - 2 - index * 2,
                  fps,
                  durationInFrames: 20,
                  config: { damping: 18, mass: 0.5 },
                });

                return (
                  <span
                    key={`${word}-${index}`}
                    style={{
                      display: "inline-block",
                      // Manset boyutu: altyazidan buyuk ama ekrani ele
                      // gecirmeyecek kadar; asil katman goruntu.
                      fontSize: scale * 0.047,
                      fontWeight: 800,
                      lineHeight: 1.14,
                      letterSpacing: -scale * 0.0015,
                      color: isHighlight ? "transparent" : theme.text,
                      backgroundImage: isHighlight
                        ? `linear-gradient(105deg, ${theme.accent} 0%, ${theme.accentAlt} 100%)`
                        : undefined,
                      backgroundClip: isHighlight ? "text" : undefined,
                      WebkitBackgroundClip: isHighlight ? "text" : undefined,
                      textShadow: isHighlight ? "none" : "0 6px 28px rgba(0,0,0,0.75)",
                      opacity: enter,
                      transform: `translateX(${(1 - enter) * -scale * 0.03}px)`,
                    }}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
