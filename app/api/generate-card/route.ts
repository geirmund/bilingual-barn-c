import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import fs from "fs";
import { HttpsProxyAgent } from "https-proxy-agent";
import nodeFetch from "node-fetch";

// Disable Next.js route caching so each request generates a fresh card
export const dynamic = "force-dynamic";

function getApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  // Fallback: read from Claude Code session token file (dev environment)
  const tokenFile = process.env.CLAUDE_SESSION_INGRESS_TOKEN_FILE;
  if (tokenFile) {
    try {
      return fs.readFileSync(tokenFile, "utf8").trim();
    } catch {
      // ignore
    }
  }
  return undefined;
}

function getClient() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  // Provide a proxy-aware fetch so requests go through the egress gateway
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customFetch: any = proxyUrl
    ? (url: string, init?: RequestInit) =>
        nodeFetch(url, {
          ...init,
          agent: new HttpsProxyAgent(proxyUrl),
        } as Parameters<typeof nodeFetch>[1])
    : undefined;

  const token = getApiKey();
  // Session ingress tokens (sk-ant-si-...) use Bearer auth, not x-api-key
  const isSessionToken = token?.startsWith("sk-ant-si-");
  return new Anthropic({
    ...(isSessionToken ? { authToken: token } : { apiKey: token }),
    fetch: customFetch,
  });
}

export type CardMode = "nouns" | "adjectives" | "questions";

export type NounCard = {
  mode: "nouns";
  noun_en: string;
  verb_en: string;
  noun_no: string;
  verb_no: string;
  sentence_en: string;
  sentence_no: string;
  imageQuery: string;
};

export type AdjectiveCard = {
  mode: "adjectives";
  adj_en: string;
  opposite_en: string;
  adj_no: string;
  opposite_no: string;
  sentence_en: string;
  sentence_no: string;
  imageQuery: string;
};

export type QuestionCard = {
  mode: "questions";
  question_en: string;
  question_no: string;
  context: string;
  imageQuery: string;
};

export type CardData = NounCard | AdjectiveCard | QuestionCard;

const NOUN_CATEGORIES = [
  "animals", "food and cooking", "sports", "nature", "vehicles",
  "household objects", "occupations", "music", "weather", "technology",
];

const ADJECTIVE_THEMES = [
  "temperature", "size", "speed", "emotion", "appearance",
  "texture", "age", "difficulty", "brightness", "distance",
];

const QUESTION_SITUATIONS = [
  "finding a place", "ordering food", "shopping", "asking for help",
  "transport and travel", "meeting people", "time and schedules",
  "emergencies", "making plans", "health and wellbeing",
];

function buildPrompt(mode: CardMode): string {
  if (mode === "nouns") {
    const category = NOUN_CATEGORIES[Math.floor(Math.random() * NOUN_CATEGORIES.length)];
    return `Generate a simple English noun and an action verb related to the category "${category}" that naturally go together (e.g. "dog" + "fetch", "chef" + "cook"). Pick something specific — avoid the most common examples.
Provide the Norwegian translation of each word and a short illustrative sentence in both languages.

Return ONLY valid JSON, no extra text:
{
  "mode": "nouns",
  "noun_en": "...",
  "verb_en": "...",
  "noun_no": "...",
  "verb_no": "...",
  "sentence_en": "The [noun] [verb]s.",
  "sentence_no": "...",
  "imageQuery": "a [noun] [verb]ing, bright colorful illustration"
}`;
  }

  if (mode === "adjectives") {
    const theme = ADJECTIVE_THEMES[Math.floor(Math.random() * ADJECTIVE_THEMES.length)];
    return `Generate a pair of opposite English adjectives related to the theme "${theme}" (e.g. "hot" ↔ "cold", "fast" ↔ "slow"). Pick an interesting pair — avoid the most obvious.
Provide the Norwegian translation of each adjective and a short sentence in English and Norwegian that uses both words.

Return ONLY valid JSON, no extra text:
{
  "mode": "adjectives",
  "adj_en": "...",
  "opposite_en": "...",
  "adj_no": "...",
  "opposite_no": "...",
  "sentence_en": "...",
  "sentence_no": "...",
  "imageQuery": "showing [adj_en] vs [opposite_en], bright colorful illustration"
}`;
  }

  // questions
  const situation = QUESTION_SITUATIONS[Math.floor(Math.random() * QUESTION_SITUATIONS.length)];
  return `Generate a common, practical question in English that a traveller might say in the situation: "${situation}".
Provide the Norwegian translation and a brief English description of the context in which you'd use this phrase (1 sentence, e.g. "Use this when you need to find the nearest toilet.").

Return ONLY valid JSON, no extra text:
{
  "mode": "questions",
  "question_en": "...",
  "question_no": "...",
  "context": "...",
  "imageQuery": "a person in a scene related to [situation], bright colorful illustration"
}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") ?? "nouns") as CardMode;

  try {
    const client = getClient();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{ role: "user", content: buildPrompt(mode) }],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response");
    }

    const card: CardData = JSON.parse(jsonMatch[0]);
    return NextResponse.json(card);
  } catch (err) {
    console.error("generate-card error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
