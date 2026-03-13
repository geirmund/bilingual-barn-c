"use client";

import { useCallback, useEffect, useState } from "react";
import FlashCard from "@/components/FlashCard";
import type { CardData, CardMode } from "@/app/api/generate-card/route";

const DECK_SIZE = 5;
const PRELOAD_THRESHOLD = 2;

const MODES: { value: CardMode; label: string; description: string }[] = [
  { value: "nouns", label: "Nouns & Verbs", description: "Everyday objects and actions" },
  { value: "adjectives", label: "Opposites", description: "Pairs of opposite adjectives" },
  { value: "questions", label: "Questions", description: "Common travel phrases" },
];

async function fetchCard(mode: CardMode): Promise<CardData> {
  const res = await fetch(`/api/generate-card?mode=${mode}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch card");
  return data;
}

export default function Home() {
  const [mode, setMode] = useState<CardMode>("nouns");
  const [deck, setDeck] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [fetching, setFetching] = useState(false);

  const addCard = useCallback(
    async (currentMode: CardMode) => {
      if (fetching) return;
      setFetching(true);
      try {
        const card = await fetchCard(currentMode);
        setDeck((d) => [...d, card]);
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    },
    [fetching]
  );

  // Load deck whenever mode changes
  useEffect(() => {
    setDeck([]);
    setLoading(true);
    setLoadError(null);
    setScore(0);

    (async () => {
      try {
        const cards = await Promise.all(
          Array.from({ length: DECK_SIZE }, () => fetchCard(mode))
        );
        setDeck(cards);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load cards");
      } finally {
        setLoading(false);
      }
    })();
  }, [mode]);

  // Replenish deck when running low
  useEffect(() => {
    if (!loading && deck.length < PRELOAD_THRESHOLD) {
      addCard(mode);
    }
  }, [deck.length, loading, addCard, mode]);

  const handleNext = useCallback(() => {
    setDeck((d) => d.slice(1));
    setScore((s) => s + 1);
  }, []);

  const topCard = deck[0];
  const visibleDeck = deck.slice(0, 3);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">Bilingual Barn</h1>
        <p className="text-indigo-300 text-sm mt-1">English → Norwegian flashcards</p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 flex-wrap justify-center">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              mode === m.value
                ? "bg-indigo-500 text-white shadow-lg"
                : "bg-white/10 text-indigo-200 hover:bg-white/20"
            }`}
            title={m.description}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Score */}
      <div className="flex gap-6 text-sm">
        <div className="bg-white/10 rounded-full px-4 py-1.5 text-white">
          Cards seen: <span className="font-bold text-indigo-300">{score}</span>
        </div>
        <div className="bg-white/10 rounded-full px-4 py-1.5 text-white">
          In deck: <span className="font-bold text-indigo-300">{deck.length}</span>
        </div>
      </div>

      {/* Card deck area */}
      <div className="relative w-80 h-[460px] sm:w-96 sm:h-[500px]">
        {loading ? (
          <div className="absolute inset-0 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-indigo-300 text-sm">Generating cards…</p>
          </div>
        ) : loadError ? (
          <div className="absolute inset-0 rounded-2xl bg-red-950/40 border border-red-500/30 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-red-300 text-sm font-medium">⚠ Could not load cards</p>
            <p className="text-red-400/80 text-xs">{loadError}</p>
          </div>
        ) : deck.length === 0 ? (
          <div className="absolute inset-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <p className="text-indigo-300">Loading next card…</p>
          </div>
        ) : (
          [...visibleDeck].reverse().map((card, reversedIndex) => {
            const index = visibleDeck.length - 1 - reversedIndex;
            return (
              <FlashCard
                key={`${index}-${"noun_en" in card ? card.noun_en : "adj_en" in card ? card.adj_en : card.question_en}`}
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
          <p className="text-indigo-400 text-xs animate-pulse">Generating more cards…</p>
        )}
      </div>

      {/* Instructions */}
      {topCard && !loading && (
        <p className="text-indigo-400/60 text-xs text-center max-w-xs">
          Tap the card to flip and reveal the Norwegian translation. Press{" "}
          <strong className="text-indigo-400">Next card</strong> when you&apos;re ready to move on.
        </p>
      )}
    </main>
  );
}
