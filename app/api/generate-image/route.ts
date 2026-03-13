import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import nodeFetch from "node-fetch";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchFunction: any = proxyUrl
    ? (url: string, init?: RequestInit) =>
        nodeFetch(url, {
          ...init,
          agent: new HttpsProxyAgent(proxyUrl),
        } as Parameters<typeof nodeFetch>[1])
    : undefined;

  return new OpenAI({ apiKey, fetch: fetchFunction });
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query param q" }, { status: 400 });
  }

  const client = getOpenAIClient();
  if (!client) {
    // No API key — signal the client to use the placeholder fallback
    return NextResponse.json({ fallback: true }, { status: 200 });
  }

  try {
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt: `${query}, clean white background, children's book illustration style, vibrant colors, simple and clear, suitable for language learning`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const url = response.data?.[0]?.url;
    if (!url) throw new Error("No image URL returned");

    return NextResponse.json({ url });
  } catch (err) {
    console.error("generate-image error:", err);
    return NextResponse.json(
      { error: "Image generation failed" },
      { status: 500 }
    );
  }
}
