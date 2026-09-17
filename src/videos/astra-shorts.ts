import type { VideoData } from "../scenes/types";
import captions from "./astra.captions.json";

/**
 * 30 saniyelik dikey YouTube Shorts: OpenAI GPT-6 Astra (3 Eylul 2026).
 *
 * Zemin: Pexels'ten alinan dikey 3B nöral ag animasyonu (Pexels lisansi,
 * ticari kullanim serbest). ffmpeg ile mavi paletimize renk duzeltildi ve
 * ileri + ters kopya birlestirilerek dikissiz donguye cevrildi.
 *
 * Seslendirme: scripts/tts.py (tr-TR-AhmetNeural, +5% hiz). Sahne sinirlari
 * anlatimin kesme noktalarina oturur; gecisler komsu sahnelerden 0.4 sn
 * caldigi icin 32.0 sn sahne = 30.0 sn video.
 *   1: 0.0  - 2.9   "GPT-6 Astra cikti"
 *   2: 2.9  - 5.9   "siradan bir guncelleme degil"
 *   3: 5.9  - 11.1  ne yapiyor
 *   4: 11.1 - 20.2  sayilar (sesle senkron sayar)
 *   5: 20.2 - 25.9  siber guvenlik
 *   6: 25.9 - 30.0  kapanis
 */
const video: VideoData = {
  format: "reels",
  background: { type: "video", src: "astra-bg.mp4", opacity: 1, blur: 4 },
  voiceoverSrc: "astra-vo.mp3",
  captions,
  scenes: [
    {
      type: "title",
      durationInSeconds: 3.3,
      kicker: "3 EYLÜL 2026",
      title: "GPT-6 Astra çıktı",
      highlight: "Astra",
    },
    {
      type: "title",
      durationInSeconds: 3.4,
      title: "Sıradan bir güncelleme değil",
      highlight: "değil",
    },
    {
      type: "bullets",
      durationInSeconds: 5.6,
      heading: "Ne değişti?",
      revealAtSeconds: [0.5, 2.6],
      bullets: ["Bilgisayarı senin yerine kullanıyor", "İşi anlatmıyor, bitiriyor"],
    },
    {
      type: "stats",
      durationInSeconds: 9.5,
      heading: "OPENAI'IN AÇIKLADIĞI SONUÇLAR",
      revealAtSeconds: [1.5, 4.0, 7.1],
      stats: [
        { prefix: "%", value: 72.6, decimals: 1, label: "Bilgisayar kullanma · OSWorld 2.0" },
        { prefix: "%", value: 47, label: "Görev başına daha hızlı" },
        { value: 1.05, decimals: 2, suffix: "M", label: "Token bağlam penceresi" },
      ],
    },
    {
      type: "title",
      durationInSeconds: 6.1,
      title: "Siber güvenlikte kritik seviye",
      highlight: "kritik",
      subtitle: "Bu eşiği aşan ilk model — bu yüzden erişim kısıtlı",
    },
    {
      type: "title",
      durationInSeconds: 4.1,
      title: "Yarış hızlandı",
      highlight: "hızlandı",
      subtitle: "1M token: 10$ giriş · 50$ çıkış",
    },
  ],
};

export default video;
