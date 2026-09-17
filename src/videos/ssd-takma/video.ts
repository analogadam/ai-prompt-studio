import type { VideoData } from "../../scenes/types";
import captions from "./captions.json";

// URETILMIS DOSYA -- kaynak brief: brief.json
/** SSD takarken nereye dikkat etmeli */
const video: VideoData = {
  "format": "reels",
  "background": {
    "type": "aurora"
  },
  "voiceoverSrc": "ssd-takma/vo.mp3",
  "scenes": [
    {
      "type": "broll",
      "durationInSeconds": 10.3,
      "src": "ssd-takma/anakart.mp4",
      "motion": "in",
      "caption": "Her yuva aynı değil",
      "highlight": "yuva"
    },
    {
      "type": "bullets",
      "durationInSeconds": 14.133333333333333,
      "heading": "Takmadan önce üç kontrol",
      "bullets": [
        "Yuva SATA mı, NVMe mi?",
        "Boyut 2280 mi?",
        "Ekran kartıyla hat paylaşımı var mı?"
      ],
      "revealAtSeconds": [
        1.9333333333333333,
        5.8,
        9.633333333333333
      ]
    },
    {
      "type": "broll",
      "durationInSeconds": 6.433333333333334,
      "src": "ssd-takma/ssd.mp4",
      "startFromInSeconds": 1,
      "motion": "left",
      "caption": "Boyut uymayabilir",
      "highlight": "Boyut"
    },
    {
      "type": "broll",
      "durationInSeconds": 7.7,
      "src": "ssd-takma/dizustu.mp4",
      "startFromInSeconds": 6,
      "motion": "out",
      "caption": "Isınan NVMe kendini yavaşlatır",
      "highlight": "yavaşlatır"
    },
    {
      "type": "outro",
      "durationInSeconds": 9.633333333333333,
      "summary": "Kılavuza bakmak beş dakika, yanlış yuva bir akşam.",
      "next": "X3D işlemci oyunda fark eder mi?",
      "promise": "Her gün 3 teknoloji sorusu",
      "cta": "Kanal ikonuna dokun"
    }
  ],
  "captions": captions
};

export default video;
