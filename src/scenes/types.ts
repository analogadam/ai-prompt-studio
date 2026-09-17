import type { Caption } from "@remotion/captions";
import type { FormatId } from "../format";

type SceneBase = {
  /** Sahnenin ekranda kalma suresi (saniye). */
  durationInSeconds: number;
};

export type TitleScene = SceneBase & {
  type: "title";
  title: string;
  subtitle?: string;
  /** Basligin ustunde duran kucuk etiket, ornek: "YAPAY ZEKA". */
  kicker?: string;
  /** Baslikta vurgulanacak kelime; renk gecisiyle boyanir. */
  highlight?: string;
};

export type BulletsScene = SceneBase & {
  type: "bullets";
  heading: string;
  bullets: string[];
  /**
   * Her maddenin sahne baslangicina gore kacinci saniyede belirecegi.
   * Verilmezse maddeler esit araliklarla siraya girer.
   */
  revealAtSeconds?: number[];
};

export type Stat = {
  value: number;
  /** Ondalik basamak sayisi; Turkce yazimda virgulle gosterilir. */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
};

export type StatsScene = SceneBase & {
  type: "stats";
  heading?: string;
  stats: Stat[];
  /** Her sayinin sahne baslangicina gore kacinci saniyede sayacagi. */
  revealAtSeconds?: number[];
};

export type ClipScene = SceneBase & {
  type: "clip";
  /** public/ klasorune gore dosya adi, ornek: "kayit.mp4" */
  src: string;
  /** Kaynak videonun kacinci saniyesinden baslanacagi. */
  startFromInSeconds?: number;
  /** Klibin ustune basilacak kisa etiket. */
  label?: string;
};

/**
 * Tam ekran gercek goruntu; metin onun uzerine biner.
 *
 * Title/Bullets/Stats sahneleri metni bir zeminin ortasina koyar ve sunum
 * slaydi gibi durur. Broll bunun tersidir: asil katman goruntudur, metin alt
 * seritte durur ve kadraj surekli hafifce hareket eder.
 */
export type BrollScene = SceneBase & {
  type: "broll";
  /** public/ klasorune gore dosya adi, ornek: "gpu-kapak.mp4" */
  src: string;
  /** Kaynak videonun kacinci saniyesinden baslanacagi. */
  startFromInSeconds?: number;
  /** Goruntunun uzerine binen kisa metin; cumle degil, vurus olmali. */
  caption?: string;
  /** caption icinde renk gecisiyle boyanacak kelime. */
  highlight?: string;
  /** Kadraj hareketi; her sahnede farkli verilirse kurgu tekduze olmaz. */
  motion?: "in" | "out" | "left" | "right";
  /** Metnin okunmasi icin goruntuye uygulanan karartma (0-1). */
  dim?: number;
};

/**
 * Kapanis sahnesi: ozet -> sonraki bolumun sorusu -> kanal vaadi + talimat.
 *
 * Shorts'ta tiklanabilir bir katman yoktur; abone cagrisi videonun kendi
 * karelerine gomulmek zorundadir. Izlemelerin buyuk kismi sessiz oldugu icin
 * cagri sesle degil metinle verilir. Bolumler sahne suresine oranli akar,
 * boylece sahne uzayip kisaldiginda duzen bozulmaz.
 */
export type OutroScene = SceneBase & {
  type: "outro";
  /** Cevabin tek cumlelik ozeti. */
  summary: string;
  /** Bir sonraki bolumun sorusu; verilmezse o bolum atlanir. */
  next?: string;
  /** Kanalin somut vaadi, ornek: "Her gun 3 teknoloji sorusu". */
  promise: string;
  /** Fiziksel talimat; varsayilan "Kanal ikonuna dokun". */
  cta?: string;
};

export type Scene =
  | TitleScene
  | BulletsScene
  | StatsScene
  | ClipScene
  | BrollScene
  | OutroScene;

/**
 * Video boyunca kesintisiz akan zemin. Varsayilan "aurora" tamamen kod
 * uretimi hareketli bir katman; elinde gercek bir kayit varsa public/
 * altina koyup "video" tipine gec.
 */
export type BackgroundConfig =
  | { type: "aurora" }
  | {
      type: "video";
      src: string;
      opacity?: number;
      /** Metnin okunmasi icin zemine uygulanan bulaniklik (px, 1080 genislige gore). */
      blur?: number;
    };

export type VideoData = {
  format: FormatId;
  scenes: Scene[];
  background?: BackgroundConfig;
  /** Sahneler arasi gecisin suresi (saniye). 0 verilirse gecis yok. */
  transitionInSeconds?: number;
  /** Tum videoya binen seslendirme, public/ klasorune gore. */
  voiceoverSrc?: string;
  /** Altyazi katmani; scripts/tts.py veya scripts/transcribe.mjs uretir. */
  captions?: Caption[];
  /** Ustteki ilerleme cubugunu gizlemek icin false ver. */
  progressBar?: boolean;
};
