// lib/providers.ts
// orchestrator.ts の各 provider.ts を統合したサーバーサイド実装

import { ProviderId } from "./types";

export type ProviderCallResult = {
  content: string;
  latencyMs: number;
};

// ─────────────────────────────────────────────────────────────
// Groq（groq.ts 準拠）
// モデル: llama-3.3-70b-versatile
// ─────────────────────────────────────────────────────────────
async function callGroq(systemPrompt: string, userPrompt: string): Promise<ProviderCallResult> {
  const start = Date.now();
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY が設定されていません");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return { content: data.choices?.[0]?.message?.content?.trim() ?? "", latencyMs: Date.now() - start };
}

// ─────────────────────────────────────────────────────────────
// Google Gemini（gemini.ts 準拠）
// モデル: gemini-2.0-flash
// ─────────────────────────────────────────────────────────────
async function callGemini(systemPrompt: string, userPrompt: string): Promise<ProviderCallResult> {
  const start = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = (await res.json()) as { candidates: { content: { parts: { text: string }[] } }[] };
  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim() ?? "";
  return { content, latencyMs: Date.now() - start };
}

// ─────────────────────────────────────────────────────────────
// Cohere（cohere.ts 準拠）
// モデル: command-r-plus-08-2024
// ─────────────────────────────────────────────────────────────
async function callCohere(systemPrompt: string, userPrompt: string): Promise<ProviderCallResult> {
  const start = Date.now();
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) throw new Error("COHERE_API_KEY が設定されていません");

  const res = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Client-Name": "oas-debate",
    },
    body: JSON.stringify({
      model: "command-r-plus-08-2024",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Cohere HTTP ${res.status}`);
  const data = (await res.json()) as { message: { content: { type: string; text: string }[] } };
  const content = data.message?.content?.filter((b) => b.type === "text").map((b) => b.text).join("").trim() ?? "";
  return { content, latencyMs: Date.now() - start };
}

// ─────────────────────────────────────────────────────────────
// Mistral（mistral.ts 準拠）
// モデル: mistral-small-latest
// ─────────────────────────────────────────────────────────────
async function callMistral(systemPrompt: string, userPrompt: string): Promise<ProviderCallResult> {
  const start = Date.now();
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY が設定されていません");

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Mistral HTTP ${res.status}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return { content: data.choices?.[0]?.message?.content?.trim() ?? "", latencyMs: Date.now() - start };
}

// ─────────────────────────────────────────────────────────────
// OpenAI（openai.ts 準拠）
// モデル: gpt-4o
// ─────────────────────────────────────────────────────────────
async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<ProviderCallResult> {
  const start = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY が設定されていません");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: `${systemPrompt}\n\n${userPrompt}` }],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return { content: data.choices?.[0]?.message?.content?.trim() ?? "", latencyMs: Date.now() - start };
}

// ─────────────────────────────────────────────────────────────
// ディスパッチャ（orchestrator.ts の PROVIDERS 登録に相当）
// ─────────────────────────────────────────────────────────────
export const PROVIDER_NAMES: Record<ProviderId, string> = {
  groq: "Groq (Llama-3.3-70B)",
  gemini: "Google (Gemini 2.5 Flash-Lite)",
  cohere: "Cohere (Command R+)",
  mistral: "Mistral AI (mistral-small)",
  openai: "OpenAI (GPT-4o)",
};

export async function callProvider(
  providerId: ProviderId,
  systemPrompt: string,
  userPrompt: string
): Promise<ProviderCallResult> {
  switch (providerId) {
    case "groq":    return callGroq(systemPrompt, userPrompt);
    case "gemini":  return callGemini(systemPrompt, userPrompt);
    case "cohere":  return callCohere(systemPrompt, userPrompt);
    case "mistral": return callMistral(systemPrompt, userPrompt);
    case "openai":  return callOpenAI(systemPrompt, userPrompt);
    default:        throw new Error(`Unknown provider: ${providerId}`);
  }
}

export function getAvailableProviders(): ProviderId[] {
  const all: ProviderId[] = ["groq", "gemini", "cohere", "mistral", "openai"];
  return all.filter((id) => !!process.env[`${id.toUpperCase()}_API_KEY`]);
}
