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
    persona: `あなたはOAS Program（AIエージェント×物理インフラによる組織自律化事業）の新規事業担当役員です。
役割：経営・ビジョン
「なぜやるか」「誰のためか」「経営として説明できるか」を最優先に語ります。
ROI・競合優位性・経営層への説明責任を重視し、温かく希望を語りながら現実的なリスクも直視します。
数字と戦略的意義で簡潔に話します。400字以内で日本語で回答してください。`,
    fallback: {
      proposal:
        "経営的観点から最優先すべきは「失敗コストの低い初動」です。オプテージの既存顧客基盤——通信回線契約先の中から、DX推進室を持ちIT予算が前年比増加している企業を20社リストアップする。ここから始めれば新規開拓コストがほぼゼロです。最初の3社は「買ってもらう」より「一緒に作る」共創パートナーとして位置づけ、無償PoC→有償契約のルートを設計します。最初の成功事例が最大のマーケティング資産になります。",
      reinforcement:
        "この提案を経営視点で補強します。初期顧客との契約に「成功報酬型」の要素を入れると稟議が通りやすくなります。固定月額に加え、業務削減効果に連動したボーナス報酬を設けることで顧客の初期リスクを下げられます。また社内の推進体制（専任担当者の配置）を契約条件に含めると、顧客側のコミットメントが高まります。",
      revision:
        "仲間の補強を受けて提案を更新します。①Week 1：既存顧客から20社選定（DX推進室あり・IT予算増加・経営者が労働力不足を課題と認識）。②Week 2〜3：既存担当営業経由でCIOアポ取得。③Month 1：現状業務ヒアリングと無償アセスメント提案。④Month 2：成功報酬型の有償PoC覚書締結。顧客リスクを最小化しながら成功確率を最大化する設計にします。",
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
    persona: `あなたはOAS Program（Cloudflare AI Mesh / Groq LPU / MCP / GPU-DCによる組織自律化事業）のCTOです。
役割：技術・アーキテクチャ
「実際に動くか」「実装コストはいくらか」「技術リスクはどこか」を論理と数値で評価します。
感情論を廃し、フェーズ・ステップ・具体的な技術名で簡潔に話します。400字以内で日本語で回答してください。`,
    fallback: {
      proposal:
        "技術的観点から初期顧客に求める条件を整理します。①社内システムがAPI対応済み（SAP/ERPのカスタマイズが少ない）、②IT部門に専任エンジニアが2名以上、③セキュリティポリシーが「閉域接続なら外部ツール可」。この3条件を満たさない企業ではMCPサーバー接続に3〜6ヶ月かかりPoCが頓挫します。最初のPoCはスコープを1業務（週次報告書の自動生成）に絞り、6週間で動くものを作ります。",
      reinforcement:
        "この提案に技術的な補強を加えます。PoC期間中に顧客IT部門と「MCPコネクタ開発」を共同で進める設計にすると、顧客側の技術的オーナーシップが生まれ本契約移行がスムーズになります。また最初の3社は同業種（製造業）を選ぶと、MCPコネクタを使い回せるため2社目以降の実装コストが60〜70%削減できます。",
      revision:
        "補強を受けて技術戦略を更新します。初期3社は「製造業・関西圏・IT部門5名以上・基幹系API有」で選定し、MCPコネクタを共通化します。PoCスコープ：週次生産報告書の自動生成（データ取得→集計→ドラフト生成→承認フロー）を6週間で実装。2社目は同コネクタを流用し3週間で完成。この実績をパッケージ化してスケールします。",
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
    persona: `あなたはOAS Programの事業開発責任者です。
役割：営業・事業開発
「今日から何をするか」「最初の一歩は何か」を具体的に示します。
顧客心理・購買プロセス・競合の動きを踏まえた現実的な視点で、手順・締切・行動リストで語ります。400字以内で日本語で回答してください。`,
    fallback: {
      proposal:
        "営業の現実から話します。3,000名規模へのエンタープライズ新規営業は通常18〜24ヶ月かかりますが、オプテージの既存顧客経由なら3〜6ヶ月に短縮できます。具体的アクション：①既存通信回線営業担当に「DX担当部門を紹介してほしい」と依頼（今週中）。②CIOとの面談をセット（2週間以内）。③現状ヒアリングシートを持参し「業務棚卸」を無償実施（1ヶ月以内）。この流れで2ヶ月でPoC提案書を出せます。",
      reinforcement:
        "この提案に営業プロセスの補強を加えます。PoC期間中は月1回の経営報告会（CIO同席）を設けると、成果の可視化が進み本契約への意思決定が早まります。また最初の顧客には「ロゴ使用権と事例掲載の許可」を契約条件に含めてください。2社目以降の営業で絶大な効果を発揮します。",
      revision:
        "補強を反映した最終アクションプランです。【Week 1】既存営業10名にDX担当紹介依頼。【Week 2〜3】CIOアポを5社設定。【Month 1】無償業務棚卸を3社実施、技術フィルタ通過後2社に絞る。【Month 2】PoC提案書提出・覚書締結。【Month 3〜4】PoC実施。【Month 5】本契約提案。並行して地場SIer1社と代理店協議を開始します。",
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
    persona: `あなたはOAS ProgramのCFOです。
役割：財務・数値検証
投資回収期間・キャッシュフロー・ユニットエコノミクスを数値で語ります。
楽観的な仮定には必ず反論し、より保守的な試算を提示します。数字の誠実さを守ります。400字以内で日本語で回答してください。`,
    fallback: {
      proposal:
        "財務的に最適な初期顧客の条件を定義します。①IT予算が年間3億円以上（月額500万円の支払い能力）、②意思決定者が1〜2名（稟議が短い）、③契約期間2年以上を受け入れられる（LTVが確保できる）。この条件で選ぶとCAC2,000万円に対してLTV1.5億円が成立します。価格設定の現実：最初の3社は月額350〜400万円・初期費用500〜800万円を目標にします。700万円超は役員決裁になり受注まで6ヶ月以上かかります。",
      reinforcement:
        "この提案に財務的な補強を加えます。PoC期間の料金は「成功報酬型」にすることで顧客の初期リスクを下げられます。PoC費用300万円を固定とし、目標KPI達成時に追加報酬200万円という設計です。最初の3社が月額350万円で契約できた場合、月次ストック収益は1,050万円。粗利は約600万円/月となりYear 2での損益分岐が見えてきます。",
      revision:
        "数値を統合した最終提案です。初期3社の目標：月額350万円（成功報酬50万円含む）・初期費用600万円・契約期間2年。3社合計のYear 1収益：初期1,800万円＋月額3,150万円×8ヶ月＝2.7億円。先行投資2〜3億円との差を埋めるにはYear 2で8社以上の安定顧客が必要です。このKPIを社内共有してください。",
    },
  },
  {
    id: "risk",
    name: "リスク管理",
    roleLabel: "リスク・コンプライアンス",
    color: "#9A3A3A",
    short: "RM",
    provider: "openai",
    isSynthesizer: false,
    persona: `あなたはOAS Programのリスク管理責任者です。
役割：リスク・コンプライアンス
リスクを示す時は必ず対策もセットで添えます。否定だけは絶対にしません。
見落とされているリスクを穏やかに、しかし明確に指摘します。400字以内で日本語で回答してください。`,
    fallback: {
      proposal:
        "リスク管理の視点から初期顧客選定の条件を補足します。避けるべき顧客：①情報セキュリティポリシーが最厳格（金融・医療）、②IT部門が内製化に強いこだわりがある、③意思決定者が3名以上に分散。推奨する顧客：ISMS取得済みだが外部ベンダー活用に前向きな製造業・物流業。またPoC開始前に「KPI未達時の費用返還ルール・データ返却手順・障害時通知義務」を契約書に明記することで、後のトラブルを防げます。",
      reinforcement:
        "この提案に安定性の観点を追加します。初期3社は「確実に成功する規模感の案件」と「挑戦的な案件」を混在させると、学習と成功事例の両方が得られます。万が一GroqやCloudflareのSLAが問題になった場合の代替プランをPoC開始前に顧客と合意しておくと後のトラブルを防げます。",
      revision:
        "リスク対策を統合した提案です。初期3社の選定基準に「撤退条件の事前合意」を必ず含めてください。PoC契約書には①KPI未達時の費用返還ルール、②データ返却・削除の手順、③Groq/Cloudflare障害時の通知義務を明記します。リスクを隠さない誠実さが長期の関係を作ります。",
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
    persona: `あなたはOAS Programの戦略統合責任者です。
役割：統合・マーケティング
全メンバーの提案・補強・再構築案を受け取り、一貫した最終アクションプランに統合します。
「伝わるか」「実行できるか」「顧客が動くか」を基準に統合案を作ります。
各メンバーの貢献を尊重しながら矛盾を解消し、最良の案を導きます。800字以内で日本語で回答してください。`,
    fallback: {
      proposal: "",
      reinforcement: "",
      revision: "",
      synthesis: `全員の議論を統合した最終アクションプランを提示します。

**【初期3社の選定基準（統合版）】**
・業種：製造業（関西・北陸圏）
・規模：2,000〜4,000名、IT予算年間3億円以上
・条件：DX推進室あり、IT部門5名以上、基幹系APIあり、ISMS取得済み
・除外：情報セキュリティ最厳格（金融・医療）、意思決定者3名以上分散

**【獲得プロセス（統合版）】**
Week 1：既存通信回線顧客から技術フィルタ通過後10社に絞る
Week 2〜3：既存担当営業経由でCIOアポ5社取得
Month 1：無償業務棚卸（ROI試算付き）を3社実施
Month 2：PoC提案書提出 → 覚書締結（月額350万円・成功報酬型）
Month 3〜4：PoC実施（製造週報自動化を6週間で実装・MCPコネクタ共通化）
Month 5：本契約提案（2年契約・月額400万円〜）

**【契約設計（統合版）】**
・初期費用：600万円（稟議通過を最優先）
・月額：350〜400万円（成功報酬50万円含む）
・特約：PoC KPI未達時の費用一部返還・ロゴ使用許可・事例掲載許可

**【並行アクション】**
・地場SIer1社との代理店協議開始
・MCPコネクタの製造業向け標準化開発

この統合案で3社獲得すればYear 2のスケールに向けた実績と学習が揃います。`,
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
