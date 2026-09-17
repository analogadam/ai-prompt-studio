import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useScale } from "../scale";
import { theme } from "../theme";
import type { TitleScene } from "./types";

/** Basligi kelimelere ayirir ve vurgulanacak kelimeyi isaretler. */
const splitTitle = (title: string, highlight?: string) =>
  title.split(" ").map((word) => ({
    word,
    isHighlight: highlight ? word.replace(/[^\p{L}\p{N}-]/gu, "") === highlight : false,
  }));

export const Title: React.FC<TitleScene> = ({ title, subtitle, kicker, highlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = useScale();

  const words = splitTitle(title, highlight);

  const kickerEnter = spring({ frame, fps, durationInFrames: 18, config: { damping: 200 } });
  const ruleWidth = spring({ frame: frame - 6, fps, durationInFrames: 26, config: { damping: 200 } });
  const subtitleEnter = spring({
    frame: frame - 10 - words.length * 3,
    fps,
    durationInFrames: 24,
    config: { damping: 200 },
  });

  // Sahne boyunca cok yavas bir kamera kaymasi: hicbir kare tam sabit degil.
  const drift = Math.sin((frame / fps) * 0.7) * scale * 0.004;

  return (
    <AbsoluteFill
      style={{
        fontFamily: theme.fontFamily,
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${scale * 0.075}px`,
        textAlign: "center",
        transform: `translateY(${drift}px)`,
      }}
    >
      {kicker ? (
        <div
          style={{
            color: theme.accent,
            fontSize: scale * 0.019,
            fontWeight: 700,
            letterSpacing: scale * 0.006,
            marginBottom: scale * 0.03,
            opacity: kickerEnter,
            padding: `${scale * 0.009}px ${scale * 0.021}px`,
            borderRadius: 999,
            border: `1px solid ${theme.surfaceBorder}`,
            backgroundColor: theme.surface,
          }}
        >
          {kicker}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: `${scale * 0.004}px ${scale * 0.022}px`,
        }}
      >
        {words.map(({ word, isHighlight }, index) => {
          const enter = spring({
            frame: frame - 4 - index * 3,
            fps,
            durationInFrames: 26,
            config: { damping: 14, mass: 0.6 },
          });

          return (
            <span
              key={`${word}-${index}`}
              style={{
                display: "inline-block",
                fontSize: scale * 0.079,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: -scale * 0.0018,
                color: isHighlight ? "transparent" : theme.text,
                backgroundImage: isHighlight
                  ? `linear-gradient(105deg, ${theme.accent} 0%, ${theme.accentAlt} 100%)`
                  : undefined,
                backgroundClip: isHighlight ? "text" : undefined,
                WebkitBackgroundClip: isHighlight ? "text" : undefined,
                opacity: enter,
                transform: `translateY(${(1 - enter) * scale * 0.05}px) scale(${0.86 + enter * 0.14})`,
                textShadow: isHighlight ? "none" : "0 8px 40px rgba(0,0,0,0.55)",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      <div
        style={{
          height: scale * 0.0035,
          width: ruleWidth * scale * 0.1,
          marginTop: scale * 0.032,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentAlt})`,
          boxShadow: `0 0 ${scale * 0.02}px ${theme.accent}`,
        }}
      />

      {subtitle ? (
        <div
          style={{
            color: theme.muted,
            fontSize: scale * 0.03,
            fontWeight: 500,
            marginTop: scale * 0.026,
            maxWidth: "88%",
            lineHeight: 1.35,
            opacity: subtitleEnter,
            transform: `translateY(${(1 - subtitleEnter) * scale * 0.02}px)`,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
