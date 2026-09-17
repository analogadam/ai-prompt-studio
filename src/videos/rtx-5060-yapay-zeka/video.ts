import type { VideoData } from "../../scenes/types";
import captions from "./captions.json";

// URETILMIS DOSYA -- kaynak brief: brief.json
/** RTX 5060 yapay zeka icin yeterli mi */
const video: VideoData = {
  "format": "reels",
  "background": {
    "type": "aurora"
  },
  "voiceoverSrc": "rtx-5060-yapay-zeka/vo.mp3",
  "scenes": [
    {
      "type": "broll",
      "durationInSeconds": 10.266666666666667,
      "src": "rtx-5060-yapay-zeka/ekran-karti.mp4",
      "startFromInSeconds": 2,
      "motion": "in",
      "caption": "Sınırı hız değil bellek koyar",
      "highlight": "bellek"
    },
    {
      "type": "stats",
      "durationInSeconds": 15.366666666666667,
      "heading": "8 GB ile ne çalışır?",
      "stats": [
        {
          "value": 5,
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
        1.9333333333333333,
        6.4,
        10.266666666666667
      ]
    },
    {
      "type": "broll",
      "durationInSeconds": 7.7,
      "src": "rtx-5060-yapay-zeka/bellek.mp4",
      "motion": "left",
      "caption": "13B tam sınırda",
      "highlight": "sınırda"
    },
    {
      "type": "broll",
      "durationInSeconds": 6.4,
      "src": "rtx-5060-yapay-zeka/yapay-zeka.mp4",
      "startFromInSeconds": 5,
      "motion": "out",
      "dim": 0.45,
      "caption": "Görsel üretim sorunsuz",
      "highlight": "sorunsuz"
    },
    {
      "type": "outro",
      "durationInSeconds": 9.6,
      "summary": "5060 yapay zekaya girer, ama küçük modellerle.",
      "next": "SSD takarken nereye dikkat etmeli?",
      "promise": "Her gün 3 teknoloji sorusu",
      "cta": "Kanal ikonuna dokun"
    }
  ],
  "captions": captions
};

export default video;
