"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AGENTS } from "@/lib/agents";
import { Proposal, Reinforcement, DebateResponse, ReferenceFile } from "@/lib/types";
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

const ACCEPT_TYPES = ".txt,.md,.csv,.json,.pdf";

function uid() { return Math.random().toString(36).slice(2); }
function fmtMs(ms: number) { return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`; }
function fmtSize(bytes: number) {
  return bytes < 1024 ? `${bytes}B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ── ファイルからテキスト抽出 ─────────────────────────────────────────────
async function extractText(file: File): Promise<string> {
  // PDFはテキストレイヤーをそのまま読む（ブラウザAPIのみ）
  if (file.type === "application/pdf") {
    return extractPdfText(file);
  }
  // テキスト系はそのまま読む
  return file.text();
}

async function extractPdfText(file: File): Promise<string> {
  // PDF.js CDN を動的ロード（依存パッケージ不要）
  try {
    const arrayBuffer = await file.arrayBuffer();
    // @ts-expect-error - dynamic CDN load
    if (!window.pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
      // @ts-expect-error
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    // @ts-expect-error
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pages.push(content.items.map((item: any) => item.str).join(" "));
    }
    return pages.join("\n\n");
  } catch {
    return `（PDFの読み込みに失敗しました。テキスト形式のファイルをお使いください）`;
  }
}

// ── API呼び出し ──────────────────────────────────────────────────────────
async function callDebateAPI(payload: object): Promise<DebateResponse> {
  const res = await fetch("/api/debate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── メインコンポーネント ──────────────────────────────────────────────────
export default function DebatePage() {
  const [topic, setTopic] = useState("パイロット顧客をどこから獲得するか？最初の3社をどう見つけ、どう契約に持ち込むか。");
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stepStates, setStepStates] = useState<Record<StepId, StepState>>({ s1: "idle", s2: "idle", s25: "idle", s3: "idle" });
  const [progress, setProgress] = useState({ pct: 0, label: "議題を入力して軍議を開始してください" });
  const [isRunning, setIsRunning] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/debate")
      .then((r) => r.json())
      .then((d) => setAvailableProviders((d.providers ?? []).map((p: { name: string }) => p.name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── 参考資料の追加 ──────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setIsLoadingFile(true);
    const arr = Array.from(files);
    const results: ReferenceFile[] = [];
    for (const file of arr) {
      try {
        const text = await extractText(file);
        results.push({ name: file.name, text, size: file.size });
      } catch {
        results.push({ name: file.name, text: `（読み込みエラー）`, size: file.size });
      }
    }
    setReferenceFiles((prev) => [...prev, ...results]);
    setIsLoadingFile(false);
  }, []);

  const removeFile = useCallback((idx: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // 全参考資料を結合した文字列
  const mergedReferenceText = referenceFiles.length > 0
    ? referenceFiles.map((f) => `=== ${f.name} ===\n${f.text}`).join("\n\n")
    : undefined;

  // ── メッセージ操作 ──────────────────────────────────────────────────────
  const addSystem = useCallback((text: string) => {
    setMessages((prev) => [...prev, {
      id: uid(), agentId: "system", agentName: "システム", agentColor: "#555",
      agentShort: "SYS", roleLabel: "", content: text, providerName: "",
      latencyMs: 0, usedFallback: false, phase: "system", isThinking: false,
    }]);
  }, []);

  const addThinking = useCallback((agent: typeof AGENTS[0], phase: Message["phase"]): string => {
    const id = uid();
    setMessages((prev) => [...prev, {
      id, agentId: agent.id, agentName: agent.name, agentColor: agent.color,
      agentShort: agent.short, roleLabel: agent.roleLabel, content: "",
      providerName: "", latencyMs: 0, usedFallback: false, phase, isThinking: true,
    }]);
    return id;
  }, []);

  const resolveThinking = useCallback((msgId: string, result: DebateResponse, phase: Message["phase"]) => {
    setMessages((prev) => prev.map((m) =>
      m.id === msgId ? { ...m, content: result.content, providerName: result.providerName, latencyMs: result.latencyMs, usedFallback: result.usedFallback, phase, isThinking: false } : m
    ));
  }, []);

  const setStep = useCallback((id: StepId, state: StepState) => {
    setStepStates((prev) => ({ ...prev, [id]: state }));
  }, []);

  // ── メインオーケストレーター ────────────────────────────────────────────
  const startDebate = useCallback(async () => {
    if (isRunning || !topic.trim()) return;
    setIsRunning(true);
    setMessages([]);
    setProposals([]);
    setStepStates({ s1: "idle", s2: "idle", s25: "idle", s3: "idle" });

    const nonSynth = AGENTS.filter((a) => !a.isSynthesizer);
    const synth = AGENTS.find((a) => a.isSynthesizer)!;

    addSystem(`軍議開始 — 議題：${topic}`);
    if (referenceFiles.length > 0) {
      addSystem(`参考資料：${referenceFiles.map((f) => f.name).join("、")}（合計 ${fmtSize(referenceFiles.reduce((s, f) => s + f.size, 0))}）`);
    }
    if (availableProviders.length > 0) {
      addSystem(`使用プロバイダ：${availableProviders.join("、")}`);
    }

    // STEP 1
    setStep("s1", "active");
    setProgress({ pct: 5, label: "STEP 1：各エージェントが提案中…" });
    const thinkingIds1 = nonSynth.map((a) => ({ agent: a, msgId: addThinking(a, "proposal") }));

    const proposalResults = await Promise.allSettled(
      nonSynth.map(async (agent) => {
        const result = await callDebateAPI({ topic, step: "proposal", agentId: agent.id, referenceText: mergedReferenceText });
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

    // STEP 2
    setStep("s2", "active");
    setProgress({ pct: 30, label: "STEP 2：互いの提案を補強中…" });
    const thinkingIds2 = nonSynth.map((a) => ({ agent: a, msgId: addThinking(a, "reinforcement") }));

    const reinforcementResults = await Promise.allSettled(
      nonSynth.map(async (agent) => {
        const result = await callDebateAPI({ topic, step: "reinforcement", agentId: agent.id, proposals: newProposals, referenceText: mergedReferenceText });
        return { agent, result };
      })
    );

    const updatedProposals = newProposals.map((p) => ({ ...p, reinforcements: [] as Reinforcement[] }));
    reinforcementResults.forEach((settled, i) => {
      const { agent, msgId } = thinkingIds2[i];
      if (settled.status === "fulfilled") {
        const { result } = settled.value;
        resolveThinking(msgId, result, "reinforcement");
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

    // STEP 2.5
    setStep("s25", "active");
    setProgress({ pct: 60, label: "STEP 2.5：再構築中…" });
    const thinkingIds25 = nonSynth.map((a) => ({ agent: a, msgId: addThinking(a, "revision") }));

    const revisionResults = await Promise.allSettled(
      nonSynth.map(async (agent) => {
        const prop = updatedProposals.find((p) => p.agentId === agent.id)!;
        const result = await callDebateAPI({
          topic, step: "revision", agentId: agent.id,
          originalContent: prop.content, reinforcements: prop.reinforcements,
          referenceText: mergedReferenceText,
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

    // STEP 3
    setStep("s3", "active");
    setProgress({ pct: 85, label: "STEP 3：統合担当が最終案を統合中…" });
    const synthMsgId = addThinking(synth, "synthesis");
    try {
      const synthResult = await callDebateAPI({ topic, step: "synthesis", agentId: synth.id, proposals: finalProposals, referenceText: mergedReferenceText });
      resolveThinking(synthMsgId, synthResult, "synthesis");
    } catch {
      resolveThinking(synthMsgId, { content: synth.fallback.synthesis ?? "", providerName: "フォールバック", latencyMs: 0, usedFallback: true }, "synthesis");
    }

    setStep("s3", "done");
    setProgress({ pct: 100, label: "軍議完了" });
    addSystem("── 以上で軍議終了 ──");
    setIsRunning(false);
  }, [topic, isRunning, addSystem, addThinking, resolveThinking, setStep, availableProviders, mergedReferenceText, referenceFiles]);

  const resetAll = useCallback(() => {
    if (isRunning) return;
    setMessages([]);
    setProposals([]);
    setStepStates({ s1: "idle", s2: "idle", s25: "idle", s3: "idle" });
    setProgress({ pct: 0, label: "議題を入力して軍議を開始してください" });
  }, [isRunning]);

  const phaseLabel: Record<string, string> = {
    proposal: "💡 STEP 1：提案",
    reinforcement: "🤝 STEP 2：補強",
    revision: "🔄 STEP 2.5：再構築",
    synthesis: "🌟 STEP 3：統合",
  };
  let lastPhase = "";

  return (
    <div className={styles.wrap}>
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
        <aside className={styles.aside}>
          {/* 議題入力 */}
          <div className={styles.asideSec}>
            <div className={styles.asideTitle}>議題</div>
            <textarea
              className={styles.topicInput}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="議論テーマを入力…"
              rows={3}
              disabled={isRunning}
            />
          </div>

          {/* 参考資料アップロード */}
          <div className={styles.asideSec}>
            <div className={styles.asideTitle}>参考資料（任意）</div>

            {/* ドロップゾーン */}
            <div
              className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""} ${isLoadingFile ? styles.dropzoneLoading : ""}`}
              onClick={() => !isRunning && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (!isRunning) handleFiles(e.dataTransfer.files);
              }}
            >
              {isLoadingFile ? (
                <span className={styles.dropzoneText}>読み込み中…</span>
              ) : (
                <span className={styles.dropzoneText}>
                  {isDragging ? "ドロップして追加" : "クリックまたはドロップ"}
                  <br />
                  <span className={styles.dropzoneHint}>PDF / TXT / MD / CSV / JSON</span>
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_TYPES}
              multiple
              style={{ display: "none" }}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />

            {/* アップロード済みファイル一覧 */}
            {referenceFiles.length > 0 && (
              <div className={styles.fileList}>
                {referenceFiles.map((f, i) => (
                  <div key={i} className={styles.fileItem}>
                    <span className={styles.fileIcon}>📄</span>
                    <div className={styles.fileInfo}>
                      <div className={styles.fileName}>{f.name}</div>
                      <div className={styles.fileMeta}>{fmtSize(f.size)} · {f.text.length.toLocaleString()}字</div>
                    </div>
                    <button className={styles.fileRemove} onClick={() => removeFile(i)} disabled={isRunning}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 軍議開始ボタン */}
          <div className={styles.asideSec}>
            <button className={styles.runBtn} onClick={startDebate} disabled={isRunning}>
              {isRunning ? "⏳ 軍議中…" : "▶ 軍議を開始"}
            </button>
            {referenceFiles.length > 0 && !isRunning && (
              <div className={styles.refBadge}>
                📎 参考資料 {referenceFiles.length}件 を読み込んで議論します
              </div>
            )}
          </div>

          {/* チームメンバー */}
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

          {/* 進行フロー */}
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

        {/* チャット */}
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
                      <div className={styles.msgAv} style={{ background: msg.agentColor }}>{msg.agentShort}</div>
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
                          <div className={styles.thinking}><span /><span /><span /></div>
                        ) : (
                          <div className={`${styles.msgBubble} ${styles[msg.phase]}`}>
                            {msg.content.split("\n").map((line, i) =>
                              line.startsWith("**") && line.endsWith("**") ? (
                                <strong key={i} style={{ display: "block", color: "#fff", marginTop: "0.4em" }}>{line.slice(2, -2)}</strong>
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

          <div className={styles.bottomBar}>
            <div className={styles.progressWrap}>
              <div className={styles.progressLabel}>{progress.label}</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress.pct}%` }} />
              </div>
            </div>
            <button className={styles.resetBtn} onClick={resetAll} disabled={isRunning}>リセット</button>
          </div>
        </div>
      </div>
    </div>
  );
}
