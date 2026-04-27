// lib/types.ts

export type ProviderId = "groq" | "gemini" | "cohere" | "mistral" | "openai" | "manus";

export type DebateStep = "proposal" | "reinforcement" | "revision" | "synthesis";

export type AIResponse = {
  provider: ProviderId;
  providerName: string;
  content: string;
  success: boolean;
  error?: string;
  latencyMs: number;
  usedFallback: boolean;
};

export type Reinforcement = {
  from: string;
  content: string;
};

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

export type Synthesis = {
  content: string;
  latencyMs: number;
  usedFallback: boolean;
  success: boolean;
};

export type DebateRequest = {
  topic: string;
  step: DebateStep;
  agentId: string;
  referenceText?: string;
  proposals?: Proposal[];
  originalContent?: string;
  reinforcements?: Reinforcement[];
};

export type DebateResponse = {
  content: string;
  providerName: string;
  latencyMs: number;
  usedFallback: boolean;
  error?: string;
  task_id?: string;
  pending?: boolean;
};

export type ReferenceFile = {
  name: string;
  text: string;
  size: number;
};
