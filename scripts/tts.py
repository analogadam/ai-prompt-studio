"""
Metinden dogal (neural) Turkce seslendirme + kelime zamanli altyazi uretir.

edge-tts, Microsoft'un neural seslerini kullanir ve konusurken WordBoundary
olaylari verdigi icin altyaziyi ayrica transkript etmeye gerek kalmaz.

  python scripts/tts.py --text-file metin.txt \
      --audio-out public/ses.mp3 --captions-out src/videos/ses.captions.json \
      [--voice tr-TR-AhmetNeural] [--rate +8%] [--replace "GPT altı=GPT-6"]
"""

import argparse
import asyncio
import json
import os
import re

import edge_tts

# WordBoundary zamanlari 100 nanosaniye biriminde gelir.
TICKS_PER_MS = 10_000


def normalize(word: str) -> str:
    return re.sub(r"[^\w]", "", word, flags=re.UNICODE).casefold()


def apply_replacements(words: list[dict], replacements: list[tuple[str, str]]) -> list[dict]:
    """
    Seslendirme metni ile ekranda okunan metin ayni olmak zorunda degil:
    "GPT altı" duyulur ama altyazida "GPT-6" yazar. Ardisik kelimeleri
    tek bir altyazi parcasinda birlestirir, zamanlamayi korur.
    """
    rules = [([normalize(w) for w in src.split()], dst) for src, dst in replacements]
    result: list[dict] = []
    i = 0

    while i < len(words):
        matched = False
        for source, target in rules:
            span = words[i : i + len(source)]
            if len(span) == len(source) and [normalize(w["text"]) for w in span] == source:
                result.append({"text": target, "startMs": span[0]["startMs"], "endMs": span[-1]["endMs"]})
                i += len(source)
                matched = True
                break
        if not matched:
            result.append(words[i])
            i += 1

    return result


async def synthesize(args: argparse.Namespace) -> None:
    communicate = edge_tts.Communicate(
        args.text,
        args.voice,
        rate=args.rate,
        pitch=args.pitch,
        volume=args.volume,
        boundary="WordBoundary",
    )

    audio = bytearray()
    words: list[dict] = []

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            words.append(
                {
                    "text": chunk["text"],
                    "startMs": round(chunk["offset"] / TICKS_PER_MS),
                    "endMs": round((chunk["offset"] + chunk["duration"]) / TICKS_PER_MS),
                }
            )

    os.makedirs(os.path.dirname(os.path.abspath(args.audio_out)), exist_ok=True)
    with open(args.audio_out, "wb") as f:
        f.write(audio)

    if args.replace:
        words = apply_replacements(words, [tuple(r.split("=", 1)) for r in args.replace])

    captions = []
    for i, w in enumerate(words):
        # Kelimeler arasindaki bosluklari bir sonrakine kadar uzat: altyazi
        # blogu sessizlikte kaybolup tekrar belirmesin.
        end = words[i + 1]["startMs"] if i + 1 < len(words) else w["endMs"]
        captions.append(
            {
                "text": w["text"] if i == 0 else " " + w["text"],
                "startMs": w["startMs"],
                "endMs": max(end, w["endMs"]),
                "timestampMs": w["startMs"],
                "confidence": 1,
            }
        )

    os.makedirs(os.path.dirname(os.path.abspath(args.captions_out)), exist_ok=True)
    with open(args.captions_out, "w", encoding="utf-8") as f:
        json.dump(captions, f, ensure_ascii=False, indent=2)

    print(f"audio={args.audio_out}")
    print(f"words={len(captions)}")
    print(f"speechEndMs={words[-1]['endMs'] if words else 0}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text-file")
    parser.add_argument("--text")
    parser.add_argument("--audio-out", required=True)
    parser.add_argument("--captions-out", required=True)
    parser.add_argument("--voice", default="tr-TR-AhmetNeural")
    parser.add_argument("--rate", default="+0%")
    parser.add_argument("--pitch", default="+0Hz")
    parser.add_argument("--volume", default="+0%")
    parser.add_argument(
        "--replace",
        action="append",
        metavar="SOYLENEN=YAZILAN",
        help='Altyazida degistirilecek kelime dizisi, ornek: --replace "GPT altı=GPT-6"',
    )
    args = parser.parse_args()

    if args.text_file:
        with open(args.text_file, encoding="utf-8") as f:
            args.text = f.read().strip()
    if not args.text:
        parser.error("--text veya --text-file gerekli")

    asyncio.run(synthesize(args))


if __name__ == "__main__":
    main()
