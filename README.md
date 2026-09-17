# Remotion Video Sistemi

Brief'ten bitmis Shorts ureten hat. Bir video kendi klasorunde yasar: elle
yazilan tek dosya `src/videos/<slug>/brief.json`, gerisini `scripts/produce.mjs`
uretir.

## Uctan uca uretim

```bash
node scripts/produce.mjs src/videos/ornek/brief.json              # seslendirmeden mp4'e
node scripts/produce.mjs src/videos/ornek/brief.json --no-render  # sadece onizleme icin
```

Sirasiyla: seslendirme + kelime zamanli altyazi (`tts.py`) -> zamanlama
oturtma -> `src/videos/<slug>/video.ts` -> kayit defteri -> render.

Bir videonun dosyalari iki klasore dagilir; medya, Remotion `staticFile()` ile
yalnizca `public/` altindan okuyabildigi icin ayri durur:

```
src/videos/<slug>/   brief.json (kaynak) + video.ts, captions.json (uretilmis)
public/<slug>/       vo.mp3 + b-roll klipleri
out/<slug>.mp4       render
```

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

## Konu kesfi

```bash
node scripts/discover.mjs                      # son 48 saat, discovery.json ayarlariyla
node scripts/discover.mjs --hours 72 --limit 40
```

`discovery.json` icindeki aramalari YouTube'da tarar, sonucu `topics/<tarih>.json`
olarak yazar. Siralama ham izlenmeye gore degil **kanal ortalamasina gore asima**
gore yapilir: 500 bin abonelinin 50 bin izlenmesi siradan, 2 bin abonelinin 50 bin
izlenmesi sinyaldir. Her baslik ayrica kalibina gore isaretlenir (soru / iddia /
duyuru / duz); kanal verisinde kazananlar soru ve iddia, kaybedenler duyuru oldu.

Arama sonucu ham haliyle kullanilamaz: "SSD" sorgusu Guney Sudan'dan, "yapay
zeka" sorgusu mizah videolarindan sonuc dondurur. Bu yuzden her aday uc filtreden
gecer -- dil (`defaultAudioLanguage`, yoksa basliktaki Turkce izler), nis
(`nicheTerms` govdeleri, Turkce ekleriyle) ve etiket yigini. Terminalde neyin
neden elendigi yazilir; filtre fazla sikiysa liste sessizce bosalmasin.

Kota: her arama 100 birim, gunluk ucretsiz kota 10.000 birim. Varsayilan 10 arama
gunde 1.000 birim harcar.

## Yardimci komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Remotion Studio -- canli onizleme |
| `node scripts/fetch-broll.mjs "arama" <slug> <klip-adi>` | Pexels'ten dikey b-roll indirir, `public/<slug>/` altina koyar |
| `node scripts/discover.mjs` | Nisdeki patlayan videolardan konu havuzu cikarir |
| `node scripts/build-registry.mjs` | `src/videos/index.ts`'i yeniden uretir |
| `npx remotion still <Kimlik> out/kontrol.png --frame=60` | Tek kare (hizli gorsel kontrol) |
| `node scripts/transcribe.mjs public/ses.mp4` | Disaridan gelen kayittan altyazi |

## Yapi

```
src/
  format.ts        youtube (16:9) / reels (9:16) / square (1:1)
  theme.ts         renk ve font
  scale.ts         formattan bagimsiz olcu birimi
  Video.tsx        sahneleri gecislerle birlestirir, sure hesaplar
  Subtitles.tsx    karaoke altyazi katmani
  Background.tsx   aurora / video zemin
  scenes/          types.ts + Broll / Title / Bullets / Stats / Clip / Outro
  videos/<slug>/   brief.json + uretilmis video.ts, captions.json
  videos/index.ts  kayit defteri (URETILMIS, elle duzenlenmez)
  Root.tsx         kompozisyonlari index.ts'ten okur
public/<slug>/     videonun sesi ve klipleri (staticFile buradan okur)
discovery.json     konu kesfi ayarlari (aramalar, esikler)
topics/            gunluk konu havuzlari
scripts/
  produce.mjs      uctan uca uretim
  discover.mjs     konu kesfi (YouTube Data API)
  env.mjs          .env icindeki API anahtarlarini okur
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
- API anahtarlari proje kokundeki `.env` dosyasinda durur (`.env` gitignore'dadir):
  `fetch-broll.mjs` icin `PEXELS_API_KEY`, `discover.mjs` icin `YOUTUBE_API_KEY`.
  Ornek icin `.env.example` dosyasina bakin.
- Pexels aramasinin ilk sirasi sik sik konuyla alakasiz cikar ("server rack" ->
  lojistik deposu). Klip kabul edilmeden once karesine bakilir.
- Render 4 paralel Chrome kullanir (`remotion.config.ts`). Makineyi tamamen bosaltmak
  istersen 2 yap; hizlandirmak istersen 6-8 dene, ama sistem agirlasir.
- Ilk `transcribe.mjs` calistirmasi agirdir: Whisper.cpp kaynaktan derlenir ve model
  indirilir. Varsayilan `base` (~150 MB); daha yuksek dogruluk icin
  `WHISPER_MODEL=medium node scripts/transcribe.mjs ...` (~1.5 GB).
- Video/ses dosyalari `public/<slug>/` altinda olmali. Brief icinde yalnizca dosya
  adi yazilir (`ekran-karti.mp4`); klasorlu yolu `produce.mjs` kurar.
- Remotion 3 kisiye kadar ekiplerde ucretsizdir; sirket kullanimi icin lisans gerekir.
