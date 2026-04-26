# OAS Program — 事業開発AIチーム軍議

Opti-Agent Synergy の事業開発チームが協調型マルチエージェントで議論するWebアプリです。

## アーキテクチャ

`shu_debate.ts` の設計思想を継承した4ステップ協調議論フロー：

```
STEP 1：各エージェントが提案（並列）
STEP 2：互いの提案を補強（否定禁止・発展のみ）
STEP 2.5：補強を受けて各自が提案を再構築
STEP 3：統合担当が最終アクションプランを統合
```

## 技術スタック

- **Next.js 14** (App Router) + TypeScript
- APIキーはサーバーサイド（`.env.local`）で安全に管理
- 各プロバイダ呼び出しは `/api/debate` ルートで実行

## 使用プロバイダ

| エージェント | プロバイダ | モデル |
|---|---|---|
| CEO視点 | Groq | llama-3.3-70b-versatile |
| 技術責任者 | Google Gemini | gemini-2.0-flash |
| 事業開発 | Cohere | command-r-plus-08-2024 |
| 財務 | Mistral | mistral-small-latest |
| リスク管理 | OpenAI | gpt-4o |
| 統合担当 | Groq | llama-3.3-70b-versatile |

---

## ローカルセットアップ

```bash
# 1. 依存パッケージのインストール
npm install

# 2. 環境変数の設定
cp .env.local.example .env.local
# .env.local を編集してAPIキーを入力

# 3. 開発サーバー起動
npm run dev
# → http://localhost:3000
```

## Vercel へのデプロイ

### 方法1：GitHub経由（推奨）

```bash
# GitHubにプッシュ
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/oas-debate.git
git push -u origin main
```

1. [vercel.com](https://vercel.com) にアクセス
2. 「New Project」→ GitHubリポジトリを選択
3. **Environment Variables** に以下を設定：
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `COHERE_API_KEY`
   - `MISTRAL_API_KEY`
   - `OPENAI_API_KEY`
4. 「Deploy」をクリック

### 方法2：Vercel CLI

```bash
npm i -g vercel
vercel
# 環境変数を対話式で設定
```

## APIキーの取得先

| プロバイダ | URL | 無料枠 |
|---|---|---|
| Groq | https://console.groq.com | 無料（1,000回/日） |
| Google Gemini | https://aistudio.google.com/apikey | 無料枠あり |
| Cohere | https://dashboard.cohere.com/api-keys | Trial key無料（カード不要） |
| Mistral | https://console.mistral.ai | 無料枠あり |
| OpenAI | https://platform.openai.com/api-keys | 有料 |

> APIキーが設定されていないプロバイダは自動でフォールバック回答を使用します。
