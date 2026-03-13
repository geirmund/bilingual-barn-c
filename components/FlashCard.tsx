"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { CardData } from "@/app/api/generate-card/route";

interface FlashCardProps {
  card: CardData;
  index: number;
  isTop: boolean;
}

type ImageState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error" };

function picsumFallback(card: CardData) {
  const seed = encodeURIComponent(`${card.noun_en}-${card.verb_en}`);
  return `https://picsum.photos/seed/${seed}/480/320`;
}

function useCardImage(card: CardData, isTop: boolean): ImageState {
  const [state, setState] = useState<ImageState>({ status: "loading" });

  useEffect(() => {
    // Only fetch DALL-E image when this card is (or becomes) top
    if (!isTop) return;
    setState({ status: "loading" });

    const controller = new AbortController();
    const query = encodeURIComponent(card.imageQuery);

    fetch(`/api/generate-image?q=${query}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.url) {
          setState({ status: "ready", url: data.url });
        } else {
          // fallback=true means no OpenAI key — use picsum
          setState({ status: "ready", url: picsumFallback(card) });
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setState({ status: "ready", url: picsumFallback(card) });
        }
      });

    return () => controller.abort();
  }, [card, isTop]);

  return state;
}

export default function FlashCard({ card, index, isTop }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);
  const imageState = useCardImage(card, isTop);

  // Stack cards behind top card with slight offset
  const stackOffset = index * 4;
  const stackRotate = index % 2 === 0 ? index * 1.5 : -(index * 1.5);

  return (
    <div
      className="absolute inset-0"
      style={{
        transform: `translateY(${stackOffset}px) rotate(${stackRotate}deg)`,
        zIndex: 10 - index,
      }}
    >
      {/* Perspective wrapper */}
      <div
        className="w-full h-full"
        style={{ perspective: "1200px" }}
        onClick={isTop ? () => setFlipped((f) => !f) : undefined}
      >
        {/* Card that flips */}
        <div
          className="relative w-full h-full transition-transform duration-700"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            cursor: isTop ? "pointer" : "default",
          }}
        >
          {/* ── FRONT ── */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* Image section */}
            <div className="relative flex-1 min-h-0 bg-slate-100">
              {imageState.status === "loading" ? (
                // Shimmer skeleton while DALL-E generates
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer bg-[length:200%_100%]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-3 border-indigo-300 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-xs">Generating image…</p>
                  </div>
                </div>
              ) : imageState.status === "ready" ? (
                <Image
                  src={imageState.url}
                  alt={card.imageQuery}
                  fill
                  className="object-cover"
                  sizes="(max-width: 480px) 100vw, 480px"
                  priority={isTop}
                  unoptimized={imageState.url.includes("blob.core.windows.net")}
                />
              ) : (
                // error state — show a subtle placeholder
                <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
                  <span className="text-slate-400 text-sm">No image</span>
                </div>
              )}
              {/* Gradient overlay at bottom of image */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            {/* English text section */}
            <div className="bg-white px-6 py-5 flex flex-col gap-1">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900 tracking-tight">
                  {card.noun_en}
                </span>
                <span className="text-xl text-indigo-500 font-medium">
                  {card.verb_en}
                </span>
              </div>
              <p className="text-sm text-gray-500 italic">{card.sentence_en}</p>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Tap to reveal Norwegian
              </p>
            </div>
          </div>

          {/* ── BACK ── */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex flex-col items-center justify-center gap-6 px-8"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {/* Norwegian flag accent */}
            <div className="text-5xl select-none">🇳🇴</div>

            <div className="text-center flex flex-col gap-2">
              <div className="flex items-baseline gap-4 justify-center">
                <span className="text-4xl font-bold text-white tracking-tight">
                  {card.noun_no}
                </span>
                <span className="text-2xl text-indigo-200 font-medium">
                  {card.verb_no}
                </span>
              </div>
              <p className="text-indigo-100 italic text-base mt-1">
                {card.sentence_no}
              </p>
            </div>

            {/* English reminder */}
            <div className="bg-white/10 rounded-xl px-5 py-3 text-center">
              <p className="text-indigo-200 text-sm">
                {card.noun_en} · {card.verb_en}
              </p>
            </div>

            <p className="text-indigo-300 text-xs mt-2">Tap to go back</p>
          </div>
        </div>
      </div>
    </div>
  );
}
