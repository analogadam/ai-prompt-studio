# Remotion Video Sistemi

Brief'ten bitmis Shorts ureten hat. Bir video, `briefs/` altinda tek bir JSON
dosyasidir; gerisini `scripts/produce.mjs` yapar.

## Uctan uca uretim

```bash
node scripts/produce.mjs briefs/ornek.json              # seslendirmeden mp4'e
node scripts/produce.mjs briefs/ornek.json --no-render  # sadece onizleme icin hazirla
```

Sirasiyla: seslendirme + kelime zamanli altyazi (`tts.py`) -> zamanlama
oturtma -> `src/videos/<slug>.ts` -> kayit defteri -> render.

### Brief alanlari

| Alan | Aciklama |
|---|---|
| `slug` | Dosya ve kompozisyon adi; yalnizca `a-z0-9-` |
| `narration` | Seslendirilecek tam metin |
| `scenes` | Sahne listesi (asagida) |
| `format` | `reels` (varsayilan) / `youtube` / `square` |
| `voice`, `rate` | edge-tts sesi ve hizi. Turkce sesler: `tr-TR-AhmetNeural`, `tr-TR-EmelNeural` |
| `background` | Broll disindaki sahnelerin zemini: `aurora` veya `video` |
| `lexicon` | Telaffuz sozlugune ekleme/ezme; `null` verilen terim devre disi kalir |
| `replace` | Ek altyazi duzeltmeleri: `"soylenen=yazilan"` |
| `autoFit` | `false` verilmedikce sahne sureleri seslendirmeye oranli oturtulur |

### Sahne tipleri

| Tip | Ne yapar |
|---|---|
| `broll` | Tam ekran gercek goruntu, ustte manset, kadraj hareketi (`in`/`out`/`left`/`right`) |
| `title` | Ortalanmis baslik; vurgulu kelime, kicker, alt baslik |
| `bullets` | Sirayla beliren maddeler |
| `stats` | Sayarak beliren sayilar |
| `clip` | Ham klip, uzerinde kucuk etiket |
| `outro` | Ozet -> sonraki bolumun sorusu -> kanal vaadi + "Kanal ikonuna dokun" |

Metin katmanlari cakismasin diye alan paylasimi sabittir: **manset ustte**,
**karaoke altyazi altta**, Shorts arayuzunun kapattigi alt %17 bos.

## Yardimci komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Remotion Studio -- canli onizleme |
| `node scripts/fetch-broll.mjs "arama" dosya-adi` | Pexels'ten dikey b-roll indirir |
| `node scripts/build-registry.mjs` | `src/videos/index.ts`'i yeniden uretir |
| `npx remotion still <Kimlik> out/kontrol.png --frame=60` | Tek kare (hizli gorsel kontrol) |
| `node scripts/transcribe.mjs public/ses.mp4` | Disaridan gelen kayittan altyazi |

## Yapi

```
briefs/            her video bir JSON  <- yeni videolar buraya
src/
  format.ts        youtube (16:9) / reels (9:16) / square (1:1)
  theme.ts         renk ve font
  scale.ts         formattan bagimsiz olcu birimi
  Video.tsx        sahneleri gecislerle birlestirir, sure hesaplar
  Subtitles.tsx    karaoke altyazi katmani
  Background.tsx   aurora / video zemin
  scenes/          types.ts + Broll / Title / Bullets / Stats / Clip / Outro
  videos/          uretilmis video verileri + index.ts (URETILMIS, elle duzenlenmez)
  Root.tsx         kompozisyonlari index.ts'ten okur
public/            video, ses ve gorsel dosyalari
scripts/
  produce.mjs      uctan uca uretim
  lexicon.mjs      telaffuz sozlugu (VRAM -> "vi ram")
  fetch-broll.mjs  Pexels'ten klip indirme
  build-registry.mjs
  tts.py           edge-tts seslendirme + kelime zamanli altyazi
  transcribe.mjs   yerel Whisper (yalnizca disaridan gelen kayitlar icin)
```

## Notlar

- `scripts/tts.py` **Python 3.14** kurulumundaki `edge_tts` paketini kullanir.
  Baska bir yorumlayici gerekirse: `PYTHON=... node scripts/produce.mjs ...`
- Telaffuz duzeltmeleri `scripts/lexicon.mjs` icinde merkezi tutulur: seslendirmeye
  okunus gider, altyazida dogru yazim gorunur. Yeni kisaltmalar oraya eklenir.
- `fetch-broll.mjs` icin ucretsiz Pexels anahtari gerekir; proje kokundeki `.env`
  dosyasina `PEXELS_API_KEY=...` olarak yazilir (`.env` gitignore'dadir).
- Render 4 paralel Chrome kullanir (`remotion.config.ts`). Makineyi tamamen bosaltmak
  istersen 2 yap; hizlandirmak istersen 6-8 dene, ama sistem agirlasir.
- Ilk `transcribe.mjs` calistirmasi agirdir: Whisper.cpp kaynaktan derlenir ve model
  indirilir. Varsayilan `base` (~150 MB); daha yuksek dogruluk icin
  `WHISPER_MODEL=medium node scripts/transcribe.mjs ...` (~1.5 GB).
- Video/ses dosyalari `public/` altinda olmali; kodda `staticFile()` ile yalnizca dosya adi verilir.
- Remotion 3 kisiye kadar ekiplerde ucretsizdir; sirket kullanimi icin lisans gerekir.
