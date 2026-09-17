import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useScale } from "../scale";
import { theme } from "../theme";
import type { OutroScene } from "./types";

/**
 * Alttan bosluk: Shorts arayuzunun kapattigi serit (%17) ile karaoke
 * altyazinin durdugu bant ust uste binmesin diye biraz daha yukari alinir.
 */
const SAFE_AREA_BOTTOM = 0.26;

const DEFAULT_CTA = "Kanal ikonuna dokun";

/** Bolum sinirlari sahne suresinin oranlari olarak verilir. */
const NEXT_AT = 0.36;
const CTA_AT = 0.66;

export const Outro: React.FC<OutroScene> = ({
  durationInSeconds,
  summary,
  next,
  promise,
  cta = DEFAULT_CTA,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const scale = useScale();

  // Sahne suresi prop'tan alinir: Sequence icinde kompozisyon suresi degil,
  // sahnenin kendi suresi gerekir.
  const total = durationInSeconds * fps;

  const enter = (atRatio: number, durationInFrames = 22) =>
    spring({
      frame: frame - Math.round(total * atRatio),
      fps,
      durationInFrames,
      config: { damping: 200 },
    });

  const summaryEnter = enter(0, 20);
  const nextEnter = enter(NEXT_AT);
  const ctaEnter = enter(CTA_AT);

  // Talimat son bolumde nabiz gibi atar: sessiz izleyicinin gozu oraya gider.
  const pulse = 1 + Math.sin(Math.max(0, frame - total * CTA_AT) * 0.22) * 0.03 * ctaEnter;

  // Ok, Shorts'ta kanal ikonunun bulundugu sol alta isaret eder.
  const arrowNudge = interpolate(Math.sin(frame * 0.18), [-1, 1], [0, scale * 0.008]);

  return (
    <AbsoluteFill
      style={{
        fontFamily: theme.fontFamily,
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${scale * 0.07}px ${height * SAFE_AREA_BOTTOM}px`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: scale * 0.062,
          fontWeight: 800,
          lineHeight: 1.15,
          color: theme.text,
          textShadow: "0 8px 40px rgba(0,0,0,0.55)",
          opacity: summaryEnter,
          transform: `translateY(${(1 - summaryEnter) * scale * 0.04}px)`,
        }}
      >
        {summary}
      </div>

      {next ? (
        <div
          style={{
            marginTop: scale * 0.045,
            padding: `${scale * 0.022}px ${scale * 0.028}px`,
            borderRadius: scale * 0.018,
            border: `1px solid ${theme.surfaceBorder}`,
            backgroundColor: theme.surface,
            maxWidth: "94%",
            opacity: nextEnter,
            transform: `translateY(${(1 - nextEnter) * scale * 0.03}px)`,
          }}
        >
          <div
            style={{
              color: theme.accent,
              fontSize: scale * 0.017,
              fontWeight: 700,
              letterSpacing: scale * 0.005,
              marginBottom: scale * 0.012,
            }}
          >
            SIRADAKİ
          </div>
          <div style={{ color: theme.text, fontSize: scale * 0.032, fontWeight: 600, lineHeight: 1.3 }}>
            {next}
          </div>
        </div>
      ) : null}

      <div
        style={{
          marginTop: scale * 0.05,
          opacity: ctaEnter,
          transform: `scale(${pulse})`,
        }}
      >
        <div
          style={{
            color: theme.muted,
            fontSize: scale * 0.026,
            fontWeight: 500,
            marginBottom: scale * 0.016,
          }}
        >
          {promise}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: scale * 0.012,
            padding: `${scale * 0.014}px ${scale * 0.026}px`,
            borderRadius: 999,
            color: theme.text,
            fontSize: scale * 0.029,
            fontWeight: 700,
            background: `linear-gradient(105deg, ${theme.accent}, ${theme.accentAlt})`,
            boxShadow: `0 0 ${scale * 0.03}px ${theme.accentSoft}`,
          }}
        >
          <span style={{ transform: `translateX(${-arrowNudge}px)` }}>←</span>
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};
