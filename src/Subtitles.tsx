import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useScale } from "./scale";
import { theme } from "./theme";

/** Ayni anda ekranda duracak altyazi blogunun azami suresi. */
const COMBINE_WITHIN_MS = 900;

/**
 * Karaoke tarzi altyazi: blok bir butun olarak girer, o an soylenen
 * kelime vurgu rengine boyanir. Shorts arayuzunun altta kapattigi
 * seride kalmamasi icin ekranin alt %17'lik bandinin uzerinde durur.
 */
export const Subtitles: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const scale = useScale();

  const { pages } = createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds: COMBINE_WITHIN_MS,
  });

  const nowMs = (frame / fps) * 1000;
  const active = pages.find((page) => nowMs >= page.startMs && nowMs < page.startMs + page.durationMs);

  if (!active) {
    return null;
  }

  const enter = spring({
    frame: frame - Math.round((active.startMs / 1000) * fps),
    fps,
    durationInFrames: 12,
    config: { damping: 13, mass: 0.5 },
  });

  return (
    <AbsoluteFill
      style={{
        fontFamily: theme.fontFamily,
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: height * 0.17,
        paddingLeft: scale * 0.06,
        paddingRight: scale * 0.06,
      }}
    >
      <div
        style={{
          maxWidth: "92%",
          textAlign: "center",
          fontSize: scale * 0.042,
          fontWeight: 800,
          lineHeight: 1.22,
          letterSpacing: -scale * 0.0006,
          padding: `${scale * 0.016}px ${scale * 0.026}px`,
          borderRadius: scale * 0.016,
          backgroundColor: "rgba(4, 6, 14, 0.62)",
          border: `1px solid ${theme.surfaceBorder}`,
          transform: `scale(${0.94 + enter * 0.06})`,
          opacity: enter,
        }}
      >
        {active.tokens.map((token, index) => {
          const isActive = nowMs >= token.fromMs && nowMs < token.toMs;

          return (
            <span
              key={`${token.fromMs}-${index}`}
              style={{
                color: isActive ? theme.accent : theme.text,
                textShadow: isActive
                  ? `0 0 ${scale * 0.02}px rgba(56, 189, 248, 0.55)`
                  : "0 2px 14px rgba(0,0,0,0.6)",
              }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
