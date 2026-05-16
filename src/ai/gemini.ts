import type { GeminiRecommendation, Guardrail, RawSku } from "../types";
import { buildRecommendationPrompt } from "./recommendationPrompt";

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) return trimmed;
  const match = trimmed.match(/\[[\s\S]*\]/);
  return match ? match[0] : trimmed;
}

export async function askGemini(
  items: Array<{ sku: RawSku; guardrail: Guardrail }>,
): Promise<GeminiRecommendation[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  const model = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || "gemini-2.0-flash";

  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY. Add it to .env.local and restart the dev server.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildRecommendationPrompt(items) }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini request failed: ${message}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty recommendation.");
  return JSON.parse(extractJson(text)) as GeminiRecommendation[];
}
