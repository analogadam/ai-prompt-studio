import {
  AbsoluteFill,
  OffthreadVideo,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { auroraColors, theme } from "./theme";
import type { BackgroundConfig } from "./scenes/types";

/**
 * Videonun tamami boyunca kesintisiz akan arka plan.
 * Sahnelerin disinda, TransitionSeries'in ustunde degil altinda durur;
 * boylece sahne gecisleri sadece metni degistirir, zemin akmaya devam eder.
 */

const BLOBS = [
  { color: 0, size: 1.25, x: 0.2, y: 0.24, ax: 0.1, ay: 0.07, speed: 0.09, phase: 0 },
  { color: 1, size: 1.0, x: 0.82, y: 0.35, ax: 0.09, ay: 0.09, speed: 0.13, phase: 1.9 },
  { color: 2, size: 1.15, x: 0.6, y: 0.78, ax: 0.12, ay: 0.06, speed: 0.07, phase: 3.4 },
  { color: 3, size: 0.75, x: 0.25, y: 0.66, ax: 0.08, ay: 0.1, speed: 0.16, phase: 5.1 },
];

const PARTICLE_COUNT = 80;
const NODE_COUNT = 18;

/**
 * Suruklenen dugumler ve yakin olanlari birlestiren cizgiler.
 * Zeminin "duran bir gorsel" degil, akan bir goruntu oldugunu belli eder.
 */
const NeuralMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  const nodes = new Array(NODE_COUNT).fill(0).map((_, i) => {
    const speed = 0.12 + random(`node-${i}-s`) * 0.22;
    const phase = random(`node-${i}-p`) * Math.PI * 2;
    return {
      x: (random(`node-${i}-x`) * 1.1 - 0.05 + Math.sin(t * speed + phase) * 0.07) * width,
      y: (random(`node-${i}-y`) * 1.1 - 0.05 + Math.cos(t * speed * 0.8 + phase) * 0.05) * height,
    };
  });

  const maxDistance = width * 0.46;
  const links: { key: string; a: (typeof nodes)[number]; b: (typeof nodes)[number]; opacity: number }[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const distance = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (distance < maxDistance) {
        links.push({
          key: `${i}-${j}`,
          a: nodes[i],
          b: nodes[j],
          opacity: (1 - distance / maxDistance) * 0.28,
        });
      }
    }
  }

  return (
    <AbsoluteFill style={{ maskImage: "radial-gradient(ellipse at 50% 45%, black 15%, transparent 82%)" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {links.map((link) => (
          <line
            key={link.key}
            x1={link.a.x}
            y1={link.a.y}
            x2={link.b.x}
            y2={link.b.y}
            stroke={theme.accent}
            strokeWidth={width * 0.0012}
            opacity={link.opacity}
          />
        ))}
        {nodes.map((node, i) => (
          <circle
            key={`node-${i}`}
            cx={node.x}
            cy={node.y}
            r={width * (0.0022 + 0.0014 * (0.5 + 0.5 * Math.sin(t * 1.4 + i)))}
            fill={i % 4 === 0 ? theme.accentAlt : theme.accent}
            opacity={0.45}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

const Aurora: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background }}>
      {/* Yavas nefes alan isik lekeleri */}
      {BLOBS.map((blob, i) => {
        const size = width * blob.size;
        const left = (blob.x + Math.sin(t * blob.speed * Math.PI + blob.phase) * blob.ax) * width;
        const top = (blob.y + Math.cos(t * blob.speed * Math.PI * 1.3 + blob.phase) * blob.ay) * height;
        const pulse = 0.56 + 0.13 * Math.sin(t * 0.8 + blob.phase);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: left - size / 2,
              top: top - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle at 50% 50%, ${auroraColors[blob.color]} 0%, transparent 68%)`,
              filter: `blur(${width * 0.075}px)`,
              opacity: pulse,
            }}
          />
        );
      })}

      {/* Cok soluk hareketli izgara, derinlik hissi verir */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)`,
          backgroundSize: `${width * 0.11}px ${width * 0.11}px`,
          backgroundPosition: `0px ${(-t * width * 0.012) % (width * 0.11)}px`,
          opacity: 0.07,
          maskImage: "radial-gradient(ellipse at 50% 45%, black 10%, transparent 78%)",
        }}
      />

      <NeuralMesh />

      {/* Yukari suzulen toz zerrecikleri */}
      {new Array(PARTICLE_COUNT).fill(0).map((_, i) => {
        const seed = `dust-${i}`;
        const depth = 0.35 + random(`${seed}d`) * 0.65;
        const size = width * (0.0012 + random(`${seed}s`) * 0.0032) * depth;
        const drift = (random(`${seed}v`) * 0.5 + 0.25) * depth;
        const y = (((random(`${seed}y`) - t * drift * 0.03) % 1) + 1) % 1;
        const x = random(`${seed}x`) + Math.sin(t * 0.5 + i) * 0.012;
        const twinkle = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(t * 1.6 + i * 2.1));

        return (
          <div
            key={seed}
            style={{
              position: "absolute",
              left: x * width,
              top: y * height,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: i % 5 === 0 ? theme.accentAlt : theme.accent,
              opacity: twinkle * depth,
              boxShadow: `0 0 ${size * 3}px ${theme.accent}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const VideoBackground: React.FC<{ src: string; opacity: number; blur: number }> = ({
  src,
  opacity,
  blur,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  // Yavas kaydirma: sabit duran bir kayit bile canli gorunsun.
  const zoom = 1.06 + Math.sin((frame / fps) * 0.25) * 0.03;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background }}>
      <AbsoluteFill
        style={{
          opacity,
          transform: `scale(${zoom})`,
          filter: blur > 0 ? `blur(${(blur * width) / 1080}px)` : undefined,
        }}
      >
        <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Kontrast icin metnin altina serilen karartma + vinyet + film grenli doku. */
const Overlays: React.FC = () => {
  return (
    <>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(4,6,14,0.60) 0%, rgba(4,6,14,0.14) 30%, rgba(4,6,14,0.20) 60%, rgba(4,6,14,0.80) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 45%, transparent 46%, rgba(4,6,14,0.66) 100%)",
        }}
      />
      <AbsoluteFill style={{ opacity: 0.055, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id="grain">
            {/* Seed sabit tutulur: her karede degisen seed, feTurbulence sonucunu
                onbelleklenemez yapip tam ekran greni her kare bastan hesaplatiyordu. */}
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={7} />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
    </>
  );
};

export const Background: React.FC<{ config?: BackgroundConfig }> = ({ config }) => {
  return (
    <AbsoluteFill>
      {config?.type === "video" ? (
        <VideoBackground
          src={config.src}
          opacity={config.opacity ?? 0.55}
          blur={config.blur ?? 0}
        />
      ) : (
        <Aurora />
      )}
      <Overlays />
    </AbsoluteFill>
  );
};
