"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AGENTS } from "@/lib/agents";
import { Proposal, Reinforcement, DebateResponse } from "@/lib/types";
import styles from "./page.module.css";

// ── 型 ─────────────────────────────────────────────────────────────────────
type StepId = "s1" | "s2" | "s25" | "s3";
type StepState = "idle" | "active" | "done";

type Message = {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  agentShort: string;
  roleLabel: string;
  content: string;
  providerName: string;
  latencyMs: number;
  usedFallback: boolean;
  phase: "proposal" | "reinforcement" | "revision" | "synthesis" | "system";
  isThinking: boolean;
};

const STEPS = [
  { id: "s1" as StepId, emoji: "💡", label: "STEP 1：各エージェントが提案" },
  { id: "s2" as StepId, emoji: "🤝", label: "STEP 2：互いの提案を補強" },
  { id: "s25" as StepId, emoji: "🔄", label: "STEP 2.5：再構築" },
  { id: "s3" as StepId, emoji: "🌟", label: "STEP 3：統合担当が統合" },
];

// ── ユーティリティ ──────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2);
}

function fmtMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

// ── API呼び出し（fetchでサーバーサイドAPIルートへ） ───────────────────────
async function callDebateAPI(payload: object): Promise<DebateResponse> {
  const res = await fetch("/api/debate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── メインコンポーネント ────────────────────────────────────────────────────
export default function DebatePage() {
  const [topic, setTopic] = useState("パイロット顧客をどこから獲得するか？最初の3社をどう見つけ、どう契約に持ち込むか。");
  const [messages, setMessages] = useState<Message[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stepStates, setStepStates] = useState<Record<StepId, StepState>>({ s1: "idle", s2: "idle", s25: "idle", s3: "idle" });
  const [progress, setProgress] = useState({ pct: 0, label: "議題を入力して軍議を開始してください" });
  const [isRunning, setIsRunning] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  // 利用可能プロバイダを起動時に確認
  useEffect(() => {
    fetch("/api/debate")
      .then((r) => r.json())
      .then((d) => setAvailableProviders((d.providers ?? []).map((p: { name: string }) => p.name)))
      .catch(() => {});
  }, []);

  // チャット自動スクロール
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── メッセージ操作 ──────────────────────────────────────────────────────
  const addSystem = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: uid(), agentId: "system", agentName: "システム", agentColor: "#555",
        agentShort: "SYS", roleLabel: "", content: text, providerName: "",
        latencyMs: 0, usedFallback: false, phase: "system", isThinking: false,
      },
    ]);
  }, []);

  const addThinking = useCallback((agent: typeof AGENTS[0], phase: Message["phase"]): string => {
    const id = uid();
    setMessages((prev) => [
      ...prev,
      {
        id, agentId: agent.id, agentName: agent.name, agentColor: agent.color,
        agentShort: agent.short, roleLabel: agent.roleLabel, content: "",
        providerName: "", latencyMs: 0, usedFallback: false, phase, isThinking: true,
      },
    ]);
    return id;
  }, []);

  const resolveThinking = useCallback((msgId: string, result: DebateResponse, phase: Message["phase"]) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, content: result.content, providerName: result.providerName, latencyMs: result.latencyMs, usedFallback: result.usedFallback, phase, isThinking: false }
          : m
      )
    );
  }, []);

  const setStep = useCallback((id: StepId, state: StepState) => {
    setStepStates((prev) => ({ ...prev, [id]: state }));
  }, []);

  // ── メインオーケストレーター（shu_debate.ts の runShuEngine に相当） ───
  const startDebate = useCallback(async () => {
    if (isRunning || !topic.trim()) return;
    setIsRunning(true);
    setMessages([]);
    setProposals([]);
    setStepStates({ s1: "idle", s2: "idle", s25: "idle", s3: "idle" });

    const nonSynth = AGENTS.filter((a) => !a.isSynthesizer);
    const synth = AGENTS.find((a) => a.isSynthesizer)!;

    addSystem(`軍議開始 — 議題：${topic}`);
    if (availableProviders.length > 0) {
      addSystem(`使用プロバイダ：${availableProviders.join("、")}`);
    } else {
      addSystem("APIキー未設定のためフォールバックモードで動作します");
    }

    // ── STEP 1：提案 ────────────────────────────────────────────────────
    setStep("s1", "active");
    setProgress({ pct: 5, label: "STEP 1：各エージェントが提案中…" });

    const thinkingIds1 = nonSynth.map((a) => ({ agent: a, msgId: addThinking(a, "proposal") }));

    const proposalResults = await Promise.allSettled(
      nonSynth.map(async (agent) => {
        const result = await callDebateAPI({ topic, step: "proposal", agentId: agent.id });
        return { agent, result };
      })
    );

    const newProposals: Proposal[] = [];
    proposalResults.forEach((settled, i) => {
      const { agent, msgId } = thinkingIds1[i];
      if (settled.status === "fulfilled") {
        const { result } = settled.value;
        resolveThinking(msgId, result, "proposal");
        newProposals.push({
          agentId: agent.id, agentName: agent.name, roleLabel: agent.roleLabel,
          content: result.content, reinforcements: [], revisedContent: "",
          latencyMs: result.latencyMs, usedFallback: result.usedFallback, success: true,
        });
      }
    });
    setProposals(newProposals);
    setStep("s1", "done");
    setProgress({ pct: 25, label: "STEP 1 完了" });

    // ── STEP 2：補強 ────────────────────────────────────────────────────
    setStep("s2", "active");
    setProgress({ pct: 30, label: "STEP 2：互いの提案を補強中…" });

    const thinkingIds2 = nonSynth.map((a) => ({ agent: a, msgId: addThinking(a, "reinforcement") }));

    const reinforcementResults = await Promise.allSettled(
      nonSynth.map(async (agent) => {
        const result = await callDebateAPI({ topic, step: "reinforcement", agentId: agent.id, proposals: newProposals });
        return { agent, result };
      })
    );

    const updatedProposals = newProposals.map((p) => ({ ...p, reinforcements: [] as Reinforcement[] }));

    reinforcementResults.forEach((settled, i) => {
      const { agent, msgId } = thinkingIds2[i];
      if (settled.status === "fulfilled") {
        const { result } = settled.value;
        resolveThinking(msgId, result, "reinforcement");
        // 他のエージェントの提案へ補強として分配
        updatedProposals.forEach((p) => {
          if (p.agentId !== agent.id) {
            p.reinforcements.push({ from: agent.name, content: result.content.slice(0, 150) });
          }
        });
      }
    });
    setProposals([...updatedProposals]);
    setStep("s2", "done");
    setProgress({ pct: 55, label: "STEP 2 完了" });

    // ── STEP 2.5：再構築 ─────────────────────────────────────────────────
    setStep("s25", "active");
    setProgress({ pct: 60, label: "STEP 2.5：補強を受けて再構築中…" });

    const thinkingIds25 = nonSynth.map((a) => ({ agent: a, msgId: addThinking(a, "revision") }));

    const revisionResults = await Promise.allSettled(
      nonSynth.map(async (agent) => {
        const prop = updatedProposals.find((p) => p.agentId === agent.id)!;
        const result = await callDebateAPI({
          topic, step: "revision", agentId: agent.id,
          originalContent: prop.content, reinforcements: prop.reinforcements,
        });
        return { agent, result };
      })
    );

    const finalProposals = updatedProposals.map((p) => ({ ...p }));
    revisionResults.forEach((settled, i) => {
      const { agent, msgId } = thinkingIds25[i];
      if (settled.status === "fulfilled") {
        const { result } = settled.value;
        resolveThinking(msgId, result, "revision");
        const fp = finalProposals.find((p) => p.agentId === agent.id);
        if (fp) fp.revisedContent = result.content;
      }
    });
    setProposals([...finalProposals]);
    setStep("s25", "done");
    setProgress({ pct: 80, label: "STEP 2.5 完了" });

    // ── STEP 3：統合 ─────────────────────────────────────────────────────
    setStep("s3", "active");
    setProgress({ pct: 85, label: "STEP 3：統合担当が最終案を統合中…" });

    const synthMsgId = addThinking(synth, "synthesis");
    try {
      const synthResult = await callDebateAPI({ topic, step: "synthesis", agentId: synth.id, proposals: finalProposals });
      resolveThinking(synthMsgId, synthResult, "synthesis");
    } catch {
      resolveThinking(synthMsgId, { content: synth.fallback.synthesis ?? "", providerName: "フォールバック", latencyMs: 0, usedFallback: true }, "synthesis");
    }

    setStep("s3", "done");
    setProgress({ pct: 100, label: "軍議完了" });
    addSystem("── 以上で軍議終了 ──");
    setIsRunning(false);
  }, [topic, isRunning, addSystem, addThinking, resolveThinking, setStep, availableProviders]);

  const resetAll = useCallback(() => {
    if (isRunning) return;
    setMessages([]);
    setProposals([]);
    setStepStates({ s1: "idle", s2: "idle", s25: "idle", s3: "idle" });
    setProgress({ pct: 0, label: "議題を入力して軍議を開始してください" });
  }, [isRunning]);

  // ── レンダリング ──────────────────────────────────────────────────────────
  const phaseLabel: Record<string, string> = {
    proposal: "💡 STEP 1：提案",
    reinforcement: "🤝 STEP 2：補強",
    revision: "🔄 STEP 2.5：再構築",
    synthesis: "🌟 STEP 3：統合",
  };

  let lastPhase = "";

  return (
    <div className={styles.wrap}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>OAS</div>
          <div>
            <div className={styles.logoText}>Opti-Agent Synergy — 事業開発AIチーム軍議</div>
            <div className={styles.logoSub}>提案 → 補強 → 再構築 → 統合（協調型マルチエージェント）</div>
          </div>
        </div>
        <div className={styles.providerBadges}>
          {AGENTS.filter((a) => !a.isSynthesizer).map((a) => (
            <div key={a.id} className={styles.providerBadge}>
              <span className={styles.providerDot} style={{ background: a.color }} />
              <span>{a.name}</span>
            </div>
          ))}
        </div>
      </header>

      <div className={styles.body}>
        {/* ── Sidebar ── */}
        <aside className={styles.aside}>
          <div className={styles.asideSec}>
            <div className={styles.asideTitle}>議題</div>
            <textarea
              className={styles.topicInput}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="議論テーマを入力…"
              rows={4}
              disabled={isRunning}
            />
            <button className={styles.runBtn} onClick={startDebate} disabled={isRunning}>
              {isRunning ? "⏳ 軍議中…" : "▶ 軍議を開始"}
            </button>
          </div>

          <div className={styles.asideSec}>
            <div className={styles.asideTitle}>チームメンバー</div>
            {AGENTS.map((a) => (
              <div key={a.id} className={`${styles.agentCard} ${a.isSynthesizer ? styles.synthesizer : ""}`}>
                <div className={styles.agentAv} style={{ background: a.color }}>{a.short}</div>
                <div className={styles.agentInfo}>
                  <div className={styles.agentName}>{a.name}</div>
                  <div className={styles.agentRole}>{a.roleLabel}</div>
                </div>
                {a.isSynthesizer && <span className={styles.synthBadge}>統合</span>}
              </div>
            ))}
          </div>

          <div className={styles.asideSec} style={{ flex: 1 }}>
            <div className={styles.asideTitle}>進行フロー</div>
            {STEPS.map((s) => {
              const state = stepStates[s.id];
              return (
                <div key={s.id} className={`${styles.stepItem} ${state === "active" ? styles.stepActive : ""} ${state === "done" ? styles.stepDone : ""}`}>
                  <div className={styles.stepNum}>{state === "done" ? "✓" : s.emoji}</div>
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Chat ── */}
        <div className={styles.chatPane}>
          <div className={styles.chatMsgs} ref={chatRef}>
            {messages.map((msg) => {
              const showPhaseHeader = msg.phase !== "system" && msg.phase !== lastPhase;
              if (showPhaseHeader) lastPhase = msg.phase;

              return (
                <div key={msg.id}>
                  {showPhaseHeader && (
                    <div className={styles.phaseHeader}>
                      <div className={styles.phaseLine} />
                      <div className={styles.phaseLabel}>{phaseLabel[msg.phase]}</div>
                      <div className={styles.phaseLine} />
                    </div>
                  )}

                  {msg.phase === "system" ? (
                    <div className={styles.systemMsg}>{msg.content}</div>
                  ) : (
                    <div className={styles.msg}>
                      <div className={styles.msgAv} style={{ background: msg.agentColor }}>
                        {msg.agentShort}
                      </div>
                      <div className={styles.msgBody}>
                        <div className={styles.msgMeta}>
                          <span className={styles.msgName} style={{ color: msg.agentColor }}>{msg.agentName}</span>
                          <span className={styles.msgRole}>{msg.roleLabel}</span>
                          {!msg.isThinking && (
                            <>
                              <span className={styles.msgProvider}>{msg.providerName}</span>
                              <span className={styles.msgLatency}>{fmtMs(msg.latencyMs)}</span>
                              {msg.usedFallback && <span className={styles.fallbackBadge}>fallback</span>}
                            </>
                          )}
                        </div>
                        {msg.isThinking ? (
                          <div className={styles.thinking}>
                            <span /><span /><span />
                          </div>
                        ) : (
                          <div className={`${styles.msgBubble} ${styles[msg.phase]}`}>
                            {msg.content.split("\n").map((line, i) =>
                              line.startsWith("**") && line.endsWith("**") ? (
                                <strong key={i} style={{ display: "block", color: "#fff", marginTop: "0.4em" }}>
                                  {line.slice(2, -2)}
                                </strong>
                              ) : (
                                <span key={i} style={{ display: "block" }}>{line}</span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Bottom bar ── */}
          <div className={styles.bottomBar}>
            <div className={styles.progressWrap}>
              <div className={styles.progressLabel}>{progress.label}</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress.pct}%` }} />
              </div>
            </div>
            <button className={styles.resetBtn} onClick={resetAll} disabled={isRunning}>
              リセット
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
