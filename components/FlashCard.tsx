"use client";

import { useState } from "react";
import Image from "next/image";
import type { CardData } from "@/app/api/generate-card/route";

interface FlashCardProps {
  card: CardData;
  index: number;
  isTop: boolean;
}

// Deterministic but varied image seed per card so each card looks different
function imageUrl(card: CardData, width = 480, height = 320) {
  const seed = encodeURIComponent(`${card.noun_en}-${card.verb_en}`);
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

export default function FlashCard({ card, index, isTop }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);

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
            <div className="relative flex-1 min-h-0">
              <Image
                src={imageUrl(card)}
                alt={card.imageQuery}
                fill
                className="object-cover"
                sizes="(max-width: 480px) 100vw, 480px"
                priority={isTop}
              />
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
