import type { VideoData } from "../../scenes/types";
import captions from "./captions.json";

// URETILMIS DOSYA -- kaynak brief: brief.json
/** Yapay zeka icin islemci degil VRAM alinir */
const video: VideoData = {
  "format": "reels",
  "background": {
    "type": "aurora"
  },
  "voiceoverSrc": "vram-mi-islemci-mi/vo.mp3",
  "scenes": [
    {
      "type": "broll",
      "durationInSeconds": 8.266666666666667,
      "src": "vram-mi-islemci-mi/islemci-anakart.mp4",
      "motion": "in",
      "caption": "İşlemci almana gerek yok",
      "highlight": "İşlemci"
    },
    {
      "type": "broll",
      "durationInSeconds": 6.9,
      "src": "vram-mi-islemci-mi/ekran-karti.mp4",
      "startFromInSeconds": 2,
      "motion": "left",
      "caption": "Model ekran kartında çalışır",
      "highlight": "kartında"
    },
    {
      "type": "stats",
      "durationInSeconds": 13.233333333333333,
      "heading": "Ne kadar VRAM gerekir?",
      "stats": [
        {
          "value": 4,
          "suffix": " GB",
          "label": "7B model"
        },
        {
          "value": 8,
          "suffix": " GB",
          "label": "13B model"
        },
        {
          "value": 18,
          "suffix": " GB",
          "label": "30B model"
        }
      ],
      "revealAtSeconds": [
        1.7333333333333334,
        5.166666666666667,
        8.033333333333333
      ]
    },
    {
      "type": "broll",
      "durationInSeconds": 5.733333333333333,
      "src": "vram-mi-islemci-mi/yavaslama.mp4",
      "dim": 0.62,
      "startFromInSeconds": 3,
      "motion": "out",
      "caption": "Hız 10 kat düşer",
      "highlight": "10"
    },
    {
      "type": "outro",
      "durationInSeconds": 8.633333333333333,
      "summary": "Soru kaç çekirdek değil. Kaç gigabayt VRAM.",
      "next": "SSD zamanla neden yavaşlar?",
      "promise": "Her gün 3 teknoloji sorusu",
      "cta": "Kanal ikonuna dokun"
    }
  ],
  "captions": captions
};

export default video;
