import type { VideoData } from "../../scenes/types";
import captions from "./captions.json";

// URETILMIS DOSYA -- kaynak brief: brief.json
/** X3D islemci oyunda gercekten fark eder mi */
const video: VideoData = {
  "format": "reels",
  "background": {
    "type": "aurora"
  },
  "voiceoverSrc": "x3d-fark-eder-mi/vo.mp3",
  "scenes": [
    {
      "type": "broll",
      "durationInSeconds": 10.6,
      "src": "x3d-fark-eder-mi/islemci.mp4",
      "motion": "in",
      "caption": "Tek yaptığı fazladan önbellek",
      "highlight": "önbellek"
    },
    {
      "type": "broll",
      "durationInSeconds": 9.266666666666667,
      "src": "x3d-fark-eder-mi/oyun-ekrani.mp4",
      "startFromInSeconds": 3,
      "motion": "left",
      "caption": "Kazanç 1080p'de çıkıyor",
      "highlight": "1080p'de"
    },
    {
      "type": "stats",
      "durationInSeconds": 14.566666666666666,
      "heading": "X3D kazancı nerede?",
      "stats": [
        {
          "value": 20,
          "suffix": "%",
          "label": "1080p oyun"
        },
        {
          "value": 5,
          "suffix": "%",
          "label": "4K oyun"
        },
        {
          "value": 0,
          "suffix": "%",
          "label": "video render"
        }
      ],
      "revealAtSeconds": [
        2,
        5.966666666666667,
        9.266666666666667
      ]
    },
    {
      "type": "broll",
      "durationInSeconds": 6.633333333333334,
      "src": "x3d-fark-eder-mi/render.mp4",
      "startFromInSeconds": 4,
      "motion": "out",
      "dim": 0.5,
      "caption": "Render'da kazanç yok",
      "highlight": "yok"
    },
    {
      "type": "outro",
      "durationInSeconds": 9.933333333333334,
      "summary": "Soru X3D iyi mi değil. Darboğazın nerede?",
      "next": "RTX 5060 yapay zeka için yeterli mi?",
      "promise": "Her gün 3 teknoloji sorusu",
      "cta": "Kanal ikonuna dokun"
    }
  ],
  "captions": captions
};

export default video;
