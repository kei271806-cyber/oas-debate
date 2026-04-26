// lib/types.ts
// orchestrator.ts / types.ts の設計を継承

export type ProviderId = "groq" | "gemini" | "cohere" | "mistral" | "openai";

export type DebateStep = "proposal" | "reinforcement" | "revision" | "synthesis";

// orchestrator.ts の AIResponse に相当
export type AIResponse = {
  provider: ProviderId;
  providerName: string;
  content: string;
  success: boolean;
  error?: string;
  latencyMs: number;
  usedFallback: boolean;
};

// shu_debate.ts の Reinforcement に相当
export type Reinforcement = {
  from: string;
  content: string;
};

// shu_debate.ts の Proposal に相当
export type Proposal = {
  agentId: string;
  agentName: string;
  roleLabel: string;
  content: string;
  reinforcements: Reinforcement[];
  revisedContent: string;
  latencyMs: number;
  usedFallback: boolean;
  success: boolean;
};

// shu_debate.ts の Synthesis に相当
export type Synthesis = {
  content: string;
  latencyMs: number;
  usedFallback: boolean;
  success: boolean;
};

// API リクエスト/レスポンス型
export type DebateRequest = {
  topic: string;
  step: DebateStep;
  agentId: string;
  // step別の追加データ
  proposals?: Proposal[];     // reinforcement / revision / synthesis で使用
  originalContent?: string;   // revision で使用
  reinforcements?: Reinforcement[]; // revision で使用
};

export type DebateResponse = {
  content: string;
  providerName: string;
  latencyMs: number;
  usedFallback: boolean;
  error?: string;
};
