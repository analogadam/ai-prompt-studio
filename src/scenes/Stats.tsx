import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useScale } from "../scale";
import { theme } from "../theme";
import type { StatsScene } from "./types";

const DEFAULT_STAGGER_IN_SECONDS = 1.2;

/** Turkce yazim: ondalik ayirici virgul. */
const formatValue = (value: number, decimals: number) =>
  value.toFixed(decimals).replace(".", ",");

export const Stats: React.FC<StatsScene> = ({ heading, stats, revealAtSeconds }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = useScale();

  const headingEnter = spring({ frame, fps, durationInFrames: 20, config: { damping: 200 } });
  const drift = Math.sin((frame / fps) * 0.6) * scale * 0.004;

  return (
    <AbsoluteFill
      style={{
        fontFamily: theme.fontFamily,
        justifyContent: "center",
        padding: `0 ${scale * 0.06}px`,
        transform: `translateY(${drift}px)`,
      }}
    >
      {heading ? (
        <div
          style={{
            color: theme.muted,
            fontSize: scale * 0.022,
            fontWeight: 700,
            letterSpacing: scale * 0.004,
            marginBottom: scale * 0.03,
            opacity: headingEnter,
          }}
        >
          {heading}
        </div>
      ) : null}

      {stats.map((stat, index) => {
        const revealAt = revealAtSeconds?.[index] ?? index * DEFAULT_STAGGER_IN_SECONDS;
        const local = frame - Math.round(revealAt * fps);
        const enter = spring({
          frame: local,
          fps,
          durationInFrames: 24,
          config: { damping: 16, mass: 0.7 },
        });
        // Sayi sifirdan hedefe kosar; okunmasi icin girisden biraz daha uzun surer.
        const countUp = spring({
          frame: local,
          fps,
          durationInFrames: 34,
          config: { damping: 200 },
        });
        const shown = interpolate(countUp, [0, 1], [0, stat.value]);

        return (
          <div
            key={stat.label}
            style={{
              marginBottom: scale * 0.03,
              paddingLeft: scale * 0.022,
              borderLeft: `${scale * 0.004}px solid ${index === 0 ? theme.accent : theme.accentAlt}`,
              opacity: enter,
              transform: `translateX(${(1 - enter) * scale * 0.045}px)`,
            }}
          >
            <div
              style={{
                fontSize: scale * 0.088,
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: -scale * 0.002,
                color: "transparent",
                backgroundImage: `linear-gradient(105deg, ${theme.accent} 0%, ${theme.accentAlt} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
              }}
            >
              {stat.prefix ?? ""}
              {formatValue(shown, stat.decimals ?? 0)}
              {stat.suffix ?? ""}
            </div>
            <div
              style={{
                color: theme.text,
                fontSize: scale * 0.026,
                fontWeight: 600,
                marginTop: scale * 0.006,
                lineHeight: 1.3,
              }}
            >
              {stat.label}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
