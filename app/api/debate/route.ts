// app/api/debate/route.ts

export const maxDuration = 60; // Vercel関数タイムアウト延長（Manusポーリング対応）

import { NextRequest, NextResponse } from "next/server";
import { callProvider, PROVIDER_NAMES, getAvailableProviders } from "@/lib/providers";
import {
  AGENTS,
  buildProposalPrompt,
  buildReinforcementPrompt,
  buildRevisionPrompt,
  buildSynthesisPrompt,
} from "@/lib/agents";
import { DebateRequest, DebateResponse, Reinforcement } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body: DebateRequest = await req.json();
  const { topic, step, agentId, referenceText, proposals, originalContent, reinforcements } = body;

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 400 });
  }

  const start = Date.now();

  // プロンプト組み立て（referenceText を全ステップに注入）
  let userPrompt = "";
  switch (step) {
    case "proposal":
      userPrompt = buildProposalPrompt(topic, agent.roleLabel, referenceText);
      break;

    case "reinforcement": {
      const targets = (proposals ?? [])
        .filter((p) => p.agentId !== agentId)
        .map((p) => ({ agentName: p.agentName, roleLabel: p.roleLabel, content: p.content }));
      userPrompt = buildReinforcementPrompt(topic, agent.roleLabel, targets, referenceText);
      break;
    }

    case "revision":
      userPrompt = buildRevisionPrompt(
        topic,
        originalContent ?? "",
        (reinforcements ?? []) as Reinforcement[],
        referenceText
      );
      break;

    case "synthesis": {
      const synthInputs = (proposals ?? []).map((p) => ({
        agentName: p.agentName,
        roleLabel: p.roleLabel,
        content: p.content,
        reinforcements: p.reinforcements,
        revisedContent: p.revisedContent,
      }));
      userPrompt = buildSynthesisPrompt(topic, synthInputs, referenceText);
      break;
    }

    default:
      return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  try {
    const result = await callProvider(agent.provider, agent.persona, userPrompt);
    const response: DebateResponse = {
      content: result.content,
      providerName: PROVIDER_NAMES[agent.provider],
      latencyMs: result.latencyMs,
      usedFallback: false,
    };
    return NextResponse.json(response);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[debate] step=${step} agent=${agentId} provider=${agent.provider} error:`, errMsg);
    const fallbackContent =
      agent.fallback[step === "synthesis" ? "synthesis" : step] ?? agent.fallback.proposal;
    const response: DebateResponse = {
      content: fallbackContent ?? "（応答なし）",
      providerName: "フォールバック",
      latencyMs: Date.now() - start,
      usedFallback: true,
      error: errMsg,
    };
    return NextResponse.json(response);
  }
}

export async function GET() {
  const available = getAvailableProviders();
  return NextResponse.json({
    providers: available.map((id) => ({ id, name: PROVIDER_NAMES[id] })),
  });
}
