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
      "durationInSeconds": 10.033333333333333,
      "src": "ssd-takma/anakart.mp4",
      "motion": "in",
      "caption": "Her yuva aynı değil",
      "highlight": "yuva"
    },
    {
      "type": "bullets",
      "durationInSeconds": 13.8,
      "heading": "Takmadan önce üç kontrol",
      "bullets": [
        "Yuva SATA mı, NVMe mi?",
        "Boyut 2280 mi?",
        "Ekran kartıyla hat paylaşımı var mı?"
      ],
      "revealAtSeconds": [
        1.8666666666666667,
        5.633333333333334,
        9.4
      ]
    },
    {
      "type": "broll",
      "durationInSeconds": 6.266666666666667,
      "src": "ssd-takma/ssd.mp4",
      "startFromInSeconds": 1,
      "motion": "left",
      "caption": "Boyut uymayabilir",
      "highlight": "Boyut"
    },
    {
      "type": "broll",
      "durationInSeconds": 7.533333333333333,
      "src": "ssd-takma/dizustu.mp4",
      "startFromInSeconds": 6,
      "motion": "out",
      "caption": "Isınan NVMe kendini yavaşlatır",
      "highlight": "yavaşlatır"
    },
    {
      "type": "outro",
      "durationInSeconds": 9.4,
      "summary": "Kılavuza bakmak beş dakika, yanlış yuva bir akşam.",
      "next": "X3D işlemci oyunda fark eder mi?",
      "promise": "Her gün 3 teknoloji sorusu",
      "cta": "Kanal ikonuna dokun"
    }
  ],
  "captions": captions
};

export default video;
