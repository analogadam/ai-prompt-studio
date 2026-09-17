import type { VideoData } from "../scenes/types";
import captions from "./gpt6.captions.json";

/**
 * 15 saniyelik dikey YouTube Shorts.
 *
 * Seslendirme: scripts/tts.py (tr-TR-AhmetNeural, +10% hiz). Ayni kosuda
 * cikan kelime zamanlari altyaziyi besler, bu yuzden karaoke vurgusu sesle
 * birebir tutar.
 *
 * Sahne sureleri anlatimin kesme noktalarina gore secildi; gecisler komsu
 * sahnelerden 0.4 sn caldigi icin 16.2 sn sahne = 15.0 sn video.
 *   sahne 1: 0.0 - 2.6  "GPT 6 mi geliyor?"
 *   sahne 2: 2.6 - 8.9  uc madde (revealAtSeconds ile tek tek, sesle senkron)
 *   sahne 3: 8.9 - 11.5 "resmi duyuru yok"
 *   sahne 4: 11.5 - 15.0 kapanis
 */
const video: VideoData = {
  format: "reels",
  background: { type: "aurora" },
  voiceoverSrc: "gpt6-vo.mp3",
  captions,
  scenes: [
    {
      type: "title",
      durationInSeconds: 3.0,
      kicker: "YAPAY ZEKA",
      title: "GPT-6 mı geliyor?",
      highlight: "GPT-6",
      subtitle: "Ortalıkta dolaşan iddialar neler?",
    },
    {
      type: "bullets",
      durationInSeconds: 6.7,
      heading: "Konuşulan üç şey",
      // Anlatimda maddelerin gectigi saniyeler, sahne basina gore.
      revealAtSeconds: [1.17, 2.57, 3.96],
      bullets: [
        "Çok daha uzun hafıza",
        "Daha derin akıl yürütme",
        "Tek komutla biten görevler",
      ],
    },
    {
      type: "title",
      durationInSeconds: 3.0,
      title: "Henüz resmi duyuru yok",
      highlight: "yok",
    },
    {
      type: "title",
      durationInSeconds: 3.5,
      kicker: "TAKİPTE KAL",
      title: "Yarış çoktan hızlandı",
      highlight: "hızlandı",
    },
  ],
};

export default video;
