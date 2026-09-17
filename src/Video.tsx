import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "./Background";
import { FORMATS } from "./format";
import { Broll } from "./scenes/Broll";
import { Bullets } from "./scenes/Bullets";
import { Clip } from "./scenes/Clip";
import { Outro } from "./scenes/Outro";
import { Stats } from "./scenes/Stats";
import { Title } from "./scenes/Title";
import { Subtitles } from "./Subtitles";
import { useScale } from "./scale";
import { theme } from "./theme";
import type { Scene, VideoData } from "./scenes/types";

const DEFAULT_TRANSITION_IN_SECONDS = 0.4;

const transitionFrames = (data: VideoData, fps: number): number =>
  Math.round((data.transitionInSeconds ?? DEFAULT_TRANSITION_IN_SECONDS) * fps);

/**
 * TransitionSeries'te her gecis komsu iki sahnenin suresinden calindigi icin
 * toplam sure, sahne surelerinin toplamindan gecis surelerinin toplami kadar kisadir.
 */
export const calculateDurationInFrames = (data: VideoData): number => {
  const { fps } = FORMATS[data.format];
  const scenesTotal = data.scenes.reduce(
    (sum, scene) => sum + Math.round(scene.durationInSeconds * fps),
    0,
  );
  const gaps = Math.max(0, data.scenes.length - 1);
  return Math.max(1, scenesTotal - transitionFrames(data, fps) * gaps);
};

const renderScene = (scene: Scene) => {
  switch (scene.type) {
    case "title":
      return <Title {...scene} />;
    case "bullets":
      return <Bullets {...scene} />;
    case "stats":
      return <Stats {...scene} />;
    case "clip":
      return <Clip {...scene} />;
    case "broll":
      return <Broll {...scene} />;
    case "outro":
      return <Outro {...scene} />;
  }
};

/** Ustte ince bir ilerleme cizgisi: izleyici videonun ne kadar surdugunu gorur. */
const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = useScale();
  const progress = Math.min(1, (frame + 1) / durationInFrames);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start" }}>
      <div style={{ height: scale * 0.0035, width: "100%", backgroundColor: "rgba(148,163,184,0.16)" }}>
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentAlt})`,
            boxShadow: `0 0 ${scale * 0.012}px ${theme.accent}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const Video: React.FC<VideoData> = (data) => {
  const { fps } = useVideoConfig();
  const transition = transitionFrames(data, fps);

  const children: React.ReactNode[] = [];
  data.scenes.forEach((scene, index) => {
    if (index > 0 && transition > 0) {
      children.push(
        <TransitionSeries.Transition
          key={`transition-${index}`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transition })}
        />,
      );
    }
    children.push(
      <TransitionSeries.Sequence
        key={`scene-${index}`}
        durationInFrames={Math.round(scene.durationInSeconds * fps)}
      >
        {renderScene(scene)}
      </TransitionSeries.Sequence>,
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background }}>
      {/* Zemin sahnelerin disinda durur: gecisler sadece metni degistirir, arka plan akmaya devam eder. */}
      <Background config={data.background} />
      <TransitionSeries>{children}</TransitionSeries>
      {data.progressBar === false ? null : <ProgressBar />}
      {data.voiceoverSrc ? <Audio src={staticFile(data.voiceoverSrc)} /> : null}
      {data.captions ? <Subtitles captions={data.captions} /> : null}
    </AbsoluteFill>
  );
};
