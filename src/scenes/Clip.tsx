import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useVideoConfig,
} from "remotion";
import { useScale } from "../scale";
import { theme } from "../theme";
import type { ClipScene } from "./types";

export const Clip: React.FC<ClipScene> = ({ src, startFromInSeconds, label }) => {
  const { fps } = useVideoConfig();
  const scale = useScale();

  return (
    <AbsoluteFill style={{ backgroundColor: theme.background }}>
      <OffthreadVideo
        src={staticFile(src)}
        trimBefore={startFromInSeconds ? Math.round(startFromInSeconds * fps) : undefined}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      {label ? (
        <AbsoluteFill
          style={{
            fontFamily: theme.fontFamily,
            justifyContent: "flex-start",
            alignItems: "flex-start",
            padding: scale * 0.05,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(11, 17, 32, 0.78)",
              color: theme.text,
              fontSize: scale * 0.026,
              fontWeight: 600,
              padding: `${scale * 0.012}px ${scale * 0.022}px`,
              borderRadius: scale * 0.012,
            }}
          >
            {label}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
