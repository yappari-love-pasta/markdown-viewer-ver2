import type { DocumentMeta } from '../types'

export const MOCK_DOCUMENT_LIST: DocumentMeta[] = [
  {
    path: 'uploads/system-architecture.md',
    title: 'システムアーキテクチャ図',
    category: '設計',
    tags: ['AWS', 'Infrastructure', 'Mermaid'],
    lastModified: '2026-03-27T12:00:00Z',
    format: 'mermaid',
  },
  {
    path: 'uploads/api-overview.md',
    title: 'API 設計概要',
    category: '設計',
    tags: ['API', 'REST', 'Mermaid'],
    lastModified: '2026-03-10T11:00:00Z',
    format: 'mermaid',
  },
  {
    path: 'uploads/onboarding.md',
    title: 'オンボーディングガイド',
    category: '運用',
    tags: ['Guide', 'Beginner'],
    lastModified: '2026-03-20T09:00:00Z',
    format: 'markdown',
  },
  {
    path: 'uploads/product-roadmap.md',
    title: 'プロダクトロードマップ',
    category: '企画',
    tags: ['Roadmap', 'Markmap'],
    lastModified: '2026-03-15T14:30:00Z',
    format: 'markmap',
  },
  {
    path: 'uploads/kickoff-slide.md',
    title: 'キックオフスライド',
    category: '企画',
    tags: ['Marp', 'Presentation'],
    lastModified: '2026-03-01T10:00:00Z',
    format: 'marp',
  },
]

export const MOCK_CONTENT_MAP: Record<string, string> = {
  'uploads/system-architecture.md': `# システムアーキテクチャ図

## 概要

AWS を活用したサーバーレス構成です。CloudFront で静的コンテンツを配信し、API Gateway + Lambda でバックエンド処理を行います。

\`\`\`mermaid
graph TD
  Browser -->|HTTPS| CloudFront
  CloudFront -->|静的配信| S3_Static[S3: Frontend]
  CloudFront -->|API| APIGW[API Gateway]
  APIGW --> Lambda
  Lambda --> S3_Data[S3: Data]
  Lambda --> DDB[DynamoDB]
\`\`\`

## コンポーネント説明

| コンポーネント | 役割 |
|--------------|------|
| CloudFront | CDN・HTTPS終端 |
| S3 (Frontend) | 静的ファイルホスティング |
| API Gateway | REST API エンドポイント |
| Lambda | ビジネスロジック |
| S3 (Data) | Markdownファイル保存 |
`,

  'uploads/api-overview.md': `# API 設計概要

## アップロードフロー

\`\`\`mermaid
sequenceDiagram
  participant Browser
  participant APIGW as API Gateway
  participant Lambda
  participant S3

  Browser->>APIGW: POST /upload (multipart)
  APIGW->>Lambda: invoke
  Lambda->>S3: PutObject uploads/xxx.md
  Lambda->>S3: GetObject list.json
  Lambda->>S3: PutObject list.json (updated)
  Lambda-->>Browser: 200 OK { path, lastModified }
\`\`\`

## エンドポイント一覧

\`\`\`mermaid
graph LR
  A[POST /upload] --> B[Lambda: upload_handler]
  C[GET /list] --> D[Lambda: list_handler]
  E[GET /file?path=...] --> F[S3 Pre-signed URL]
\`\`\`
`,

  'uploads/onboarding.md': `# オンボーディングガイド

## セットアップ手順

1. リポジトリをクローン
\`\`\`bash
git clone https://github.com/example/markdown-viewer.git
cd markdown-viewer
\`\`\`

2. フロントエンドの依存関係をインストール
\`\`\`bash
cd frontend
npm install
\`\`\`

3. 開発サーバーを起動
\`\`\`bash
npm run dev
\`\`\`

## 技術スタック

| 項目 | 技術 |
|------|------|
| Frontend | React + Vite |
| Styling | Tailwind CSS + daisyUI |
| Markdown | react-markdown |
| Diagram | Mermaid.js |
| Mindmap | Markmap |
| Slide | Marp |
| Backend | AWS Lambda (Python) |
| Storage | Amazon S3 |

## ディレクトリ構成

\`\`\`
markdown-viewer/
├── frontend/       # React アプリ
│   └── src/
├── backend/        # Lambda 関数
│   └── handler.py
└── spec.md         # PRD
\`\`\`
`,

  'uploads/product-roadmap.md': `# プロダクトロードマップ

## 2026 年度計画

### Q1 フロントエンド基盤

#### 閲覧機能
##### Markdown レンダリング
##### Mermaid 図解
##### Markmap マインドマップ
##### Marp スライド

#### UI/UX
##### ダーク/ライトテーマ
##### レスポンシブ対応

### Q2 バックエンド

#### AWS 基盤
##### Lambda 実装
##### S3 連携
##### API Gateway 設定

#### セキュリティ
##### CloudFront + OAC
##### 認証機能

### Q3 拡張機能

#### 検索・フィルタ
#### タグ管理の強化
#### 共同編集
`,

  'uploads/kickoff-slide.md': `---
marp: true
theme: default
paginate: true
backgroundColor: #1a1a2e
color: #eee
---

# Markdown Viewer
## プロジェクト キックオフ

**2026年3月27日**

---

## アジェンダ

1. **プロダクト概要**
2. **技術スタック**
3. **マイルストーン**
4. **チーム構成**

---

## プロダクト概要

> Markdownドキュメントを一元管理・閲覧する
> サーバーレスWebシステム

### 対応フォーマット
- 📄 **Markdown** — GFM形式
- 📊 **Mermaid** — 図解・フローチャート
- 🗺 **Markmap** — マインドマップ
- 🎯 **Marp** — スライドプレゼン

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | React + Vite + Tailwind |
| Backend | AWS Lambda (Python) |
| Storage | Amazon S3 |
| CDN | Amazon CloudFront |

---

## マイルストーン

\`\`\`
Q1 2026: フロントエンド完成 ✅
Q2 2026: バックエンド + AWS 連携
Q3 2026: 拡張機能 + 本番リリース
\`\`\`

---

# ご清聴ありがとうございました

**Let's build something great! 🚀**
`,
}
