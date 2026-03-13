import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

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
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Generate a simple English noun and an action verb that naturally goes with it (e.g. "dog" + "fetch", "chef" + "cook", "bird" + "fly").
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
    return NextResponse.json(
      { error: "Failed to generate card" },
      { status: 500 }
    );
  }
}
