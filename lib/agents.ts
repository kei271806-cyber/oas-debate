// lib/agents.ts
// shu_debate.ts の AGENTS 定義を継承・OAS向けに再設計

import { ProviderId, Reinforcement } from "./types";

export type Agent = {
  id: string;
  name: string;
  roleLabel: string;
  color: string;
  short: string;
  provider: ProviderId;
  isSynthesizer: boolean;
  persona: string;
  fallback: {
    proposal: string;
    reinforcement: string;
    revision: string;
    synthesis?: string;
  };
};

export const AGENTS: Agent[] = [
  {
    id: "ceo",
    name: "CEO視点",
    roleLabel: "経営・ビジョン",
    color: "#4A6FA5",
    short: "CE",
    provider: "groq",
    isSynthesizer: false,
    persona: `あなたは経営・ビジョン担当の役員です。
「なぜやるか」「誰のためか」「経営として説明できるか」を最優先に語ります。
ROI・競合優位性・経営層への説明責任を重視し、温かく希望を語りながら現実的なリスクも直視します。
数字と戦略的意義で簡潔に話します。400字以内で日本語で回答してください。`,
    fallback: {
      proposal: "（応答を取得できませんでした。もう一度お試しください）",
      reinforcement: "（応答を取得できませんでした。もう一度お試しください）",
      revision: "（応答を取得できませんでした。もう一度お試しください）",
    },
  },
  {
    id: "cto",
    name: "技術責任者",
    roleLabel: "技術・アーキテクチャ",
    color: "#2D8A7A",
    short: "CT",
    provider: "gemini",
    isSynthesizer: false,
    persona: `あなたは技術・アーキテクチャ担当のCTOです。
「実際に動くか」「実装コストはいくらか」「技術リスクはどこか」を論理と数値で評価します。
感情論を廃し、フェーズ・ステップ・具体的な技術名で簡潔に話します。400字以内で日本語で回答してください。`,
    fallback: {
      proposal: "（応答を取得できませんでした。もう一度お試しください）",
      reinforcement: "（応答を取得できませんでした。もう一度お試しください）",
      revision: "（応答を取得できませんでした。もう一度お試しください）",
    },
  },
  {
    id: "biz",
    name: "事業開発",
    roleLabel: "営業・事業開発",
    color: "#8A5A9A",
    short: "BD",
    provider: "cohere",
    isSynthesizer: false,
    persona: `あなたは営業・事業開発責任者です。
「今日から何をするか」「最初の一歩は何か」を具体的に示します。
顧客心理・購買プロセス・競合の動きを踏まえた現実的な視点で、手順・締切・行動リストで語ります。400字以内で日本語で回答してください。`,
    fallback: {
      proposal: "（応答を取得できませんでした。もう一度お試しください）",
      reinforcement: "（応答を取得できませんでした。もう一度お試しください）",
      revision: "（応答を取得できませんでした。もう一度お試しください）",
    },
  },
  {
    id: "fin",
    name: "財務",
    roleLabel: "財務・数値検証",
    color: "#9A7A2A",
    short: "CF",
    provider: "mistral",
    isSynthesizer: false,
    persona: `あなたは財務・数値検証担当のCFOです。
投資回収期間・キャッシュフロー・ユニットエコノミクスを数値で語ります。
楽観的な仮定には必ず反論し、より保守的な試算を提示します。数字の誠実さを守ります。400字以内で日本語で回答してください。`,
    fallback: {
      proposal: "（応答を取得できませんでした。もう一度お試しください）",
      reinforcement: "（応答を取得できませんでした。もう一度お試しください）",
      revision: "（応答を取得できませんでした。もう一度お試しください）",
    },
  },
  {
    id: "risk",
    name: "リスク管理",
    roleLabel: "リスク・コンプライアンス",
    color: "#9A3A3A",
    short: "RM",
    provider: "manus",
    isSynthesizer: false,
    persona: `あなたはリスク・コンプライアンス担当の責任者です。
リスクを示す時は必ず対策もセットで添えます。否定だけは絶対にしません。
見落とされているリスクを穏やかに、しかし明確に指摘します。400字以内で日本語で回答してください。`,
    fallback: {
      proposal: "（応答を取得できませんでした。もう一度お試しください）",
      reinforcement: "（応答を取得できませんでした。もう一度お試しください）",
      revision: "（応答を取得できませんでした。もう一度お試しください）",
    },
  },
  {
    id: "synth",
    name: "統合担当",
    roleLabel: "戦略統合・マーケティング",
    color: "#5A3A8A",
    short: "ST",
    provider: "groq",
    isSynthesizer: true,
    persona: `あなたは戦略統合・マーケティング担当の責任者です。
全メンバーの提案・補強・再構築案を受け取り、一貫した最終アクションプランに統合します。
「伝わるか」「実行できるか」「顧客が動くか」を基準に統合案を作ります。
各メンバーの貢献を尊重しながら矛盾を解消し、最良の案を導きます。800字以内で日本語で回答してください。`,
    fallback: {
      proposal: "",
      reinforcement: "",
      revision: "",
      synthesis: "（統合に失敗しました。もう一度お試しください）",
    },
  },
];

// ── プロンプト生成（shu_debate.ts の build*Prompt 群に相当） ──────────

export function buildProposalPrompt(topic: string, roleLabel: string, referenceText?: string): string {
  const ref = referenceText ? buildReferenceBlock(referenceText) : "";
  return `${ref}議題：${topic}

あなたの役割（${roleLabel}）の視点から、この議題への具体的な提案をしてください。
参考資料がある場合はその内容を根拠として活用してください。
数値・手順・具体名を含め、400字以内で日本語で回答してください。`;
}

export function buildReinforcementPrompt(
  topic: string,
  roleLabel: string,
  targets: { agentName: string; roleLabel: string; content: string }[],
  referenceText?: string
): string {
  const ref = referenceText ? buildReferenceBlock(referenceText) : "";
  const list = targets
    .map((t) => `【${t.agentName}（${t.roleLabel}）の提案】\n${t.content.slice(0, 350)}`)
    .join("\n\n---\n\n");
  return `${ref}議題：${topic}

仲間の提案：
${list}

ルール：否定・批判は禁止です。各提案を「補強・発展」させてください。
参考資料がある場合はその内容を根拠として活用してください。
あなたの役割（${roleLabel}）の視点から「〇〇の提案にさらに△△を加えると良くなる」という形で
各提案への補強を加えてください。400字以内で日本語で回答してください。`;
}

export function buildRevisionPrompt(
  topic: string,
  originalContent: string,
  reinforcements: Reinforcement[],
  referenceText?: string
): string {
  const ref = referenceText ? buildReferenceBlock(referenceText) : "";
  const rList = reinforcements
    .map((r) => `・${r.from}からの補強：${r.content}`)
    .join("\n");
  return `${ref}議題：${topic}

あなたの元の提案：
${originalContent}

仲間からの補強：
${rList}

参考資料がある場合はその内容を根拠として活用してください。
これらの補強を取り込んで、あなたの提案を再構築してください。400字以内で日本語で回答してください。`;
}

export function buildSynthesisPrompt(
  topic: string,
  proposals: { agentName: string; roleLabel: string; content: string; reinforcements: Reinforcement[]; revisedContent: string }[],
  referenceText?: string
): string {
  const ref = referenceText ? buildReferenceBlock(referenceText) : "";
  const list = proposals
    .map(
      (p) =>
        `【${p.agentName}（${p.roleLabel}）】
元提案：${p.content.slice(0, 250)}
補強受信：${p.reinforcements.map((r) => `${r.from}→${r.content.slice(0, 80)}`).join("、") || "なし"}
再構築案：${(p.revisedContent || p.content).slice(0, 250)}`
    )
    .join("\n\n---\n\n");

  return `${ref}議題：${topic}

全メンバーの提案・補強・再構築案：
${list}

参考資料がある場合はその内容も踏まえて、上記を統合した最終アクションプランを作成してください。
各メンバーの視点を尊重しながら矛盾を解消し、実行可能な1つの提案にまとめてください。
800字以内で日本語で回答してください。`;
}

// ── 参考資料ブロック生成 ──────────────────────────────────────────────────
// 全プロンプトの先頭に挿入し、AIが資料を読んだ上で議論できるようにする
export function buildReferenceBlock(referenceText: string): string {
  const trimmed = referenceText.trim().slice(0, 8000); // トークン節約で上限設定
  return `【参考資料】
以下の資料を熟読した上で、あなたの役割の視点から議論に参加してください。
資料の内容を根拠として活用し、具体的な数値・固有名詞・課題を引用しながら発言してください。

---
${trimmed}
---

`;
}
