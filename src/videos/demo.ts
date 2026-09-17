import type { VideoData } from "../scenes/types";

/**
 * Ornek video. Yeni bir video icin bu dosyayi kopyalayip
 * src/Root.tsx icindeki VIDEOS listesine ekle.
 */
const video: VideoData = {
  format: "youtube",
  scenes: [
    {
      type: "title",
      durationInSeconds: 3,
      title: "Remotion Video Sistemi",
      subtitle: "Kod değil, prompt yazıyorsun",
    },
    {
      type: "bullets",
      durationInSeconds: 8,
      heading: "Nasıl çalışıyor?",
      bullets: [
        "İsteğini tek cümleyle yaz: süre, platform, konu",
        "Ajan sahneleri veri olarak üretir",
        "Geçiş, altyazı ve render otomatik gelir",
      ],
    },
    {
      type: "title",
      durationInSeconds: 3,
      title: "İlk videon bir prompt uzakta",
      subtitle: "npx remotion render Demo",
    },
  ],
};

export default video;
