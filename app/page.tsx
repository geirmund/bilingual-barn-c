"use client";

import { useCallback, useEffect, useState } from "react";
import FlashCard from "@/components/FlashCard";
import type { CardData } from "@/app/api/generate-card/route";

const DECK_SIZE = 5; // cards pre-loaded in the deck
const PRELOAD_THRESHOLD = 2; // fetch a new card when fewer than this remain

async function fetchCard(): Promise<CardData> {
  const res = await fetch("/api/generate-card");
  if (!res.ok) throw new Error("Failed to fetch card");
  return res.json();
}

export default function Home() {
  const [deck, setDeck] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [fetching, setFetching] = useState(false);

  // Add a new card to the bottom of the deck
  const addCard = useCallback(async () => {
    if (fetching) return;
    setFetching(true);
    try {
      const card = await fetchCard();
      setDeck((d) => [...d, card]);
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }, [fetching]);

  // Initial load: fill deck
  useEffect(() => {
    (async () => {
      setLoading(true);
      const cards = await Promise.all(
        Array.from({ length: DECK_SIZE }, () => fetchCard())
      );
      setDeck(cards);
      setLoading(false);
    })();
  }, []);

  // Replenish deck when running low
  useEffect(() => {
    if (!loading && deck.length < PRELOAD_THRESHOLD) {
      addCard();
    }
  }, [deck.length, loading, addCard]);

  const handleNext = useCallback(() => {
    setDeck((d) => d.slice(1)); // discard top card
    setScore((s) => s + 1);
  }, []);

  const topCard = deck[0];
  // Show at most 3 cards in the visual stack
  const visibleDeck = deck.slice(0, 3);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 gap-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Bilingual Barn
        </h1>
        <p className="text-indigo-300 text-sm mt-1">
          English → Norwegian flashcards
        </p>
      </div>

      {/* Score */}
      <div className="flex gap-6 text-sm">
        <div className="bg-white/10 rounded-full px-4 py-1.5 text-white">
          Cards seen: <span className="font-bold text-indigo-300">{score}</span>
        </div>
        <div className="bg-white/10 rounded-full px-4 py-1.5 text-white">
          In deck:{" "}
          <span className="font-bold text-indigo-300">{deck.length}</span>
        </div>
      </div>

      {/* Card deck area */}
      <div className="relative w-80 h-[460px] sm:w-96 sm:h-[500px]">
        {loading ? (
          <div className="absolute inset-0 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-indigo-300 text-sm">Generating cards…</p>
          </div>
        ) : deck.length === 0 ? (
          <div className="absolute inset-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <p className="text-indigo-300">Loading next card…</p>
          </div>
        ) : (
          // Render stack — bottom cards first so top card renders last (on top)
          [...visibleDeck].reverse().map((card, reversedIndex) => {
            const index = visibleDeck.length - 1 - reversedIndex;
            return (
              <FlashCard
                key={`${card.noun_en}-${card.verb_en}-${index}`}
                card={card}
                index={index}
                isTop={index === 0}
              />
            );
          })
        )}
      </div>

      {/* Next card button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleNext}
          disabled={loading || deck.length === 0}
          className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-900 disabled:text-indigo-600 text-white font-semibold px-8 py-3 rounded-full text-base transition-colors shadow-lg"
        >
          Next card →
        </button>
        {fetching && (
          <p className="text-indigo-400 text-xs animate-pulse">
            Generating more cards…
          </p>
        )}
      </div>

      {/* Instructions */}
      {topCard && !loading && (
        <p className="text-indigo-400/60 text-xs text-center max-w-xs">
          Tap the card to flip and reveal the Norwegian translation. Press{" "}
          <strong className="text-indigo-400">Next card</strong> when you&apos;re
          ready to move on.
        </p>
      )}
    </main>
  );
}
