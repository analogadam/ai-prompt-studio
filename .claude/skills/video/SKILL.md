---
name: video
description: Bu projede prompt'tan video uretir. Kullanici video, klip, reels, shorts, YouTube videosu, tanitim videosu, altyazi ekleme veya uzun kayittan kisa klip cikarma istediginde kullan.
---

# Prompt'tan Remotion videosu

Bu projede video **kod yazarak degil, veri yazarak** uretilir. Bir video = bir `VideoData` nesnesi.
Sahne bilesenleri hazir; senin isin dogru veriyi yazip render almak.

## 1. Istegi netlestir

Kullanicidan su uc seyi cikar. Eksikse **sorma, varsay ve varsayimini soyle**:

| Bilgi | Varsayilan |
|---|---|
| Sure | Icerik kadar; madde basina ~3 sn |
| Platform | `youtube` (16:9). "reels/shorts/tiktok/dikey" gecerse `reels`, "kare" gecerse `square` |
| Konu | Kullanicinin cumlesi |

## 2. Video dosyasini yaz

`src/videos/<slug>/video.ts` olustur (her video kendi klasorunde):

```ts
import type { VideoData } from "../../scenes/types";

export const urunTanitim: VideoData = {
  format: "reels",
  scenes: [
    { type: "title", durationInSeconds: 3, title: "Baslik", subtitle: "Alt baslik" },
    { type: "bullets", durationInSeconds: 8, heading: "Basligi", bullets: ["Madde 1", "Madde 2"] },
  ],
};
```

Sonra `src/Root.tsx` icindeki `VIDEOS` listesine ekle:

```ts
const VIDEOS: Record<string, VideoData> = {
  Demo: demo,
  UrunTanitim: urunTanitim,
};
```

Anahtar, render komutundaki kimliktir. Toplam sure otomatik hesaplanir; `durationInFrames` elle yazma.

## 3. Sahne tipleri

`src/scenes/types.ts` tek dogruluk kaynagidir; yeni alan eklemeden once oraya bak.

- `title` — `title`, opsiyonel `subtitle`
- `bullets` — `heading`, `bullets: string[]` (3-5 madde ideal, madde basina en fazla ~60 karakter)
- `clip` — `src` (`public/<slug>/` altindaki dosya adi), opsiyonel `startFromInSeconds`, opsiyonel `label`

Video seviyesinde: `transitionInSeconds` (varsayilan 0.4, `0` verirsen gecis olmaz), `voiceoverSrc`, `captions`.

**Sure kurali:** metin ekranda okunabilmeli. Kabaca 15 karakter/saniye; bir `bullets` sahnesi 3 maddeden asagi olmamak uzere en az 6 sn.

## 4. Yeni gorunum gerekiyorsa

Mevcut uc tip yetmiyorsa yeni bir sahne tipi ekle -- var olanlari bozma:

1. `src/scenes/types.ts` icine yeni tipi yaz ve `Scene` birlesimine ekle
2. `src/scenes/<Ad>.tsx` bilesenini yaz (olculeri `useVideoConfig().width` ile oranla; boylece her formatta calisir)
3. `src/Video.tsx` icindeki `renderScene` switch'ine ekle

Renk ve font icin daima `src/theme.ts` kullan, sabit deger yazma.

## 5. Altyazi

Elinde ses/konusma varsa:

```bash
node scripts/transcribe.mjs public/konusma.mp4
```

`src/videos/konusma/captions.json` uretir. Video dosyasinda kullan:

```ts
import captions from "./captions.json";

export const anlatim: VideoData = {
  format: "reels",
  voiceoverSrc: "konusma.mp4",
  captions,
  scenes: [...],
};
```

Ilk calistirmada Whisper.cpp derlenir ve model (~1.5 GB) indirilir; kullaniciya bunu onceden soyle.
Turkce varsayilandir. Daha hizli ve kucuk model icin `WHISPER_MODEL=small`.

## 6. Uzun videodan kisa klip

1. Uzun kaydi `public/<slug>/` altina koy
2. `node scripts/transcribe.mjs public/uzun/kayit.mp4 src/videos/uzun/captions.json` ile transkript cikar
3. Transkript JSON'unu oku, kullanicinin verdigi kritere gore (yoksa "en carpici cumle") 3-5 an sec
4. Her an icin bir video dosyasi yaz -- kaynagi kesmene gerek yok, `clip` sahnesi zaten kirpar:

```ts
import { sliceCaptions } from "../../captions";
import captions from "./captions.json";

const START = 754;
const DURATION = 42;

export const klip1: VideoData = {
  format: "reels",
  captions: sliceCaptions({ captions, startInSeconds: START, durationInSeconds: DURATION }),
  scenes: [{ type: "clip", durationInSeconds: DURATION, src: "uzun/kayit.mp4", startFromInSeconds: START }],
};
```

5. Her klibi ayri kimlikle `VIDEOS`'a ekle ve tek tek render et

## 7. Teslim etmeden once -- bu sirayi atlama

```bash
npx tsc                                              # tip hatasi varsa duzelt
npx remotion still <Kimlik> out/<kimlik>-kontrol.png --frame=<orta-kare>
```

Still'i **gercekten oku**. Tasma, ust uste binme veya kesilen metin varsa sure/font/madde sayisini duzelt
ve tekrar bak. Ancak temizse render al:

```bash
npx remotion render <Kimlik> out/<kimlik>.mp4
```

Kullaniciya yalnizca render alinmis son `.mp4` dosyasinin yolunu ver. Ara dosyalari, sahne sahne
ciktilari veya kod dokumunu teslim etme; ne yaptigini bir iki cumleyle ozetle.

## Onizleme

Kullanici sonucu canli gormek isterse: `npm run dev` (Remotion Studio).
