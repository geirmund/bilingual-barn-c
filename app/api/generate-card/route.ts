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

export interface CardData {
  noun_en: string;
  verb_en: string;
  noun_no: string;
  verb_no: string;
  sentence_en: string;
  sentence_no: string;
  imageQuery: string;
}

export async function GET() {
  try {
    const client = getClient();
    // Pick a random category to nudge Claude toward variety
    const categories = [
      "animals", "food and cooking", "sports", "nature", "vehicles",
      "household objects", "occupations", "music", "weather", "technology",
    ];
    const category = categories[Math.floor(Math.random() * categories.length)];

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Generate a simple English noun and an action verb related to the category "${category}" that naturally go together (e.g. "dog" + "fetch", "chef" + "cook", "bird" + "fly"). Pick something specific and interesting — avoid the most common examples.
Then provide the Norwegian translation of each word separately, and a short illustrative sentence in both languages.

Return ONLY valid JSON in this exact shape, no extra text:
{
  "noun_en": "...",
  "verb_en": "...",
  "noun_no": "...",
  "verb_no": "...",
  "sentence_en": "The [noun] [verb]s.",
  "sentence_no": "...",
  "imageQuery": "a [noun] [verb]ing, bright colorful illustration"
}`,
        },
      ],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from the response (handle any surrounding text)
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
