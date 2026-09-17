import { Composition } from "remotion";
import "./index.css";
import { FORMATS } from "./format";
import { calculateDurationInFrames, Video } from "./Video";
import { VIDEOS } from "./videos";

/**
 * Kompozisyon listesi src/videos/ klasorunden uretilir; yeni bir video eklemek
 * icin oraya "<slug>.ts" dosyasi birakip `node scripts/build-registry.mjs`
 * calistirmak yeterlidir. Kimlik, slug'in PascalCase hali olur.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {Object.entries(VIDEOS).map(([id, data]) => {
        const format = FORMATS[data.format];

        return (
          <Composition
            key={id}
            id={id}
            component={Video}
            defaultProps={data}
            durationInFrames={calculateDurationInFrames(data)}
            fps={format.fps}
            width={format.width}
            height={format.height}
          />
        );
      })}
    </>
  );
};
