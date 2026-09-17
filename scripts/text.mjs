/**
 * Turkce metinde kelime siniri.
 *
 * JavaScript'in \b sinir kontrolu ASCII'ye gore calisir: "ı", "ş", "ğ" gibi
 * harfleri harf saymaz. Bu yuzden "VRAM'ı" ya da "oyun odaklı mı" gibi
 * ifadelerde \b sessizce yanlis sonuc verir -- desen hic eslesmez. Sinir bu
 * yuzden "harf ya da rakam gelmiyor" kosuluyla kurulur (u bayragi sart).
 */
export const WORD_START = "(?<![\\p{L}\\p{N}_])";
export const WORD_END = "(?![\\p{L}\\p{N}_])";
