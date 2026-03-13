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

function cardSeed(card: CardData): string {
  if (card.mode === "nouns") return `${card.noun_en}-${card.verb_en}`;
  if (card.mode === "adjectives") return `${card.adj_en}-${card.opposite_en}`;
  return card.question_en.slice(0, 40);
}

function picsumFallback(card: CardData) {
  const seed = encodeURIComponent(cardSeed(card));
  return `https://picsum.photos/seed/${seed}/480/320`;
}

function useCardImage(card: CardData, isTop: boolean): ImageState {
  const [state, setState] = useState<ImageState>({ status: "loading" });

  useEffect(() => {
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

// ── Front content per mode ──────────────────────────────────────────────────

function NounFront({ card }: { card: Extract<CardData, { mode: "nouns" }> }) {
  return (
    <div className="bg-white px-6 py-5 flex flex-col gap-1">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-gray-900 tracking-tight">
          {card.noun_en}
        </span>
        <span className="text-xl text-indigo-500 font-medium">{card.verb_en}</span>
      </div>
      <p className="text-sm text-gray-500 italic">{card.sentence_en}</p>
      <p className="text-xs text-gray-400 mt-2 text-center">Tap to reveal Norwegian</p>
    </div>
  );
}

function AdjectiveFront({ card }: { card: Extract<CardData, { mode: "adjectives" }> }) {
  return (
    <div className="bg-white px-6 py-5 flex flex-col gap-1">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-gray-900 tracking-tight">
          {card.adj_en}
        </span>
        <span className="text-xl text-gray-400 font-light">↔</span>
        <span className="text-3xl font-bold text-indigo-500 tracking-tight">
          {card.opposite_en}
        </span>
      </div>
      <p className="text-sm text-gray-500 italic">{card.sentence_en}</p>
      <p className="text-xs text-gray-400 mt-2 text-center">Tap to reveal Norwegian</p>
    </div>
  );
}

function QuestionFront({ card }: { card: Extract<CardData, { mode: "questions" }> }) {
  return (
    <div className="bg-white px-6 py-5 flex flex-col gap-2">
      <p className="text-2xl font-bold text-gray-900 tracking-tight leading-snug">
        {card.question_en}
      </p>
      <p className="text-sm text-gray-400 italic">{card.context}</p>
      <p className="text-xs text-gray-400 mt-1 text-center">Tap to reveal Norwegian</p>
    </div>
  );
}

// ── Back content per mode ───────────────────────────────────────────────────

function NounBack({ card }: { card: Extract<CardData, { mode: "nouns" }> }) {
  return (
    <>
      <div className="text-5xl select-none">🇳🇴</div>
      <div className="text-center flex flex-col gap-2">
        <div className="flex items-baseline gap-4 justify-center">
          <span className="text-4xl font-bold text-white tracking-tight">{card.noun_no}</span>
          <span className="text-2xl text-indigo-200 font-medium">{card.verb_no}</span>
        </div>
        <p className="text-indigo-100 italic text-base mt-1">{card.sentence_no}</p>
      </div>
      <div className="bg-white/10 rounded-xl px-5 py-3 text-center">
        <p className="text-indigo-200 text-sm">{card.noun_en} · {card.verb_en}</p>
      </div>
    </>
  );
}

function AdjectiveBack({ card }: { card: Extract<CardData, { mode: "adjectives" }> }) {
  return (
    <>
      <div className="text-5xl select-none">🇳🇴</div>
      <div className="text-center flex flex-col gap-2">
        <div className="flex items-baseline gap-3 justify-center">
          <span className="text-4xl font-bold text-white tracking-tight">{card.adj_no}</span>
          <span className="text-2xl text-indigo-200 font-light">↔</span>
          <span className="text-4xl font-bold text-indigo-200 tracking-tight">{card.opposite_no}</span>
        </div>
        <p className="text-indigo-100 italic text-base mt-1">{card.sentence_no}</p>
      </div>
      <div className="bg-white/10 rounded-xl px-5 py-3 text-center">
        <p className="text-indigo-200 text-sm">{card.adj_en} ↔ {card.opposite_en}</p>
      </div>
    </>
  );
}

function QuestionBack({ card }: { card: Extract<CardData, { mode: "questions" }> }) {
  return (
    <>
      <div className="text-5xl select-none">🇳🇴</div>
      <div className="text-center flex flex-col gap-3 px-2">
        <p className="text-3xl font-bold text-white tracking-tight leading-snug">
          {card.question_no}
        </p>
      </div>
      <div className="bg-white/10 rounded-xl px-5 py-3 text-center">
        <p className="text-indigo-200 text-sm italic">{card.question_en}</p>
      </div>
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function FlashCard({ card, index, isTop }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);
  const imageState = useCardImage(card, isTop);

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
      <div
        className="w-full h-full"
        style={{ perspective: "1200px" }}
        onClick={isTop ? () => setFlipped((f) => !f) : undefined}
      >
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
            <div className="relative flex-1 min-h-0 bg-slate-100">
              {imageState.status === "loading" ? (
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
                <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
                  <span className="text-slate-400 text-sm">No image</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
            </div>

            {card.mode === "nouns" && <NounFront card={card} />}
            {card.mode === "adjectives" && <AdjectiveFront card={card} />}
            {card.mode === "questions" && <QuestionFront card={card} />}
          </div>

          {/* ── BACK ── */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex flex-col items-center justify-center gap-6 px-8"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {card.mode === "nouns" && <NounBack card={card} />}
            {card.mode === "adjectives" && <AdjectiveBack card={card} />}
            {card.mode === "questions" && <QuestionBack card={card} />}
            <p className="text-indigo-300 text-xs mt-2">Tap to go back</p>
          </div>
        </div>
      </div>
    </div>
  );
}
