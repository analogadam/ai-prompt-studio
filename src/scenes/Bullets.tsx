import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useScale } from "../scale";
import { theme } from "../theme";
import type { BulletsScene } from "./types";

const DEFAULT_STAGGER_IN_SECONDS = 0.45;

export const Bullets: React.FC<BulletsScene> = ({ heading, bullets, revealAtSeconds }) => {
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: scale * 0.015,
          marginBottom: scale * 0.036,
          opacity: headingEnter,
          transform: `translateX(${(1 - headingEnter) * -scale * 0.025}px)`,
        }}
      >
        <div
          style={{
            width: scale * 0.005,
            height: scale * 0.038,
            borderRadius: 999,
            background: `linear-gradient(180deg, ${theme.accent}, ${theme.accentAlt})`,
          }}
        />
        <div
          style={{
            color: theme.text,
            fontSize: scale * 0.041,
            fontWeight: 800,
            letterSpacing: -scale * 0.0008,
          }}
        >
          {heading}
        </div>
      </div>

      {bullets.map((bullet, index) => {
        const revealAt = revealAtSeconds?.[index] ?? index * DEFAULT_STAGGER_IN_SECONDS;
        const local = frame - Math.round(revealAt * fps);
        const enter = spring({
          frame: local,
          fps,
          durationInFrames: 26,
          config: { damping: 15, mass: 0.7 },
        });
        // Belirdikten hemen sonra sonen kisa bir vurgu parlamasi.
        const flash = spring({
          frame: local - 4,
          fps,
          durationInFrames: 34,
          config: { damping: 200 },
        });

        return (
          <div
            key={bullet}
            style={{
              display: "flex",
              alignItems: "center",
              gap: scale * 0.022,
              marginBottom: scale * 0.02,
              padding: `${scale * 0.023}px ${scale * 0.025}px`,
              borderRadius: scale * 0.018,
              backgroundColor: theme.surface,
              border: `1px solid ${theme.surfaceBorder}`,
              boxShadow: `0 ${scale * 0.012}px ${scale * 0.04}px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,${(0.06 + (1 - flash) * 0.14).toFixed(3)})`,
              opacity: enter,
              transform: `translateX(${(1 - enter) * scale * 0.05}px) scale(${0.96 + enter * 0.04})`,
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: scale * 0.048,
                height: scale * 0.048,
                borderRadius: "50%",
                background: `linear-gradient(140deg, ${theme.accent}, ${theme.accentAlt})`,
                color: theme.background,
                fontSize: scale * 0.022,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 ${scale * 0.035 * (1 - flash)}px ${theme.accent}`,
              }}
            >
              {index + 1}
            </div>
            <div
              style={{
                color: theme.text,
                fontSize: scale * 0.032,
                fontWeight: 600,
                lineHeight: 1.28,
              }}
            >
              {bullet}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
