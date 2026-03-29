# Markdown Viewer

Markdown / Mermaid / Markmap / Marp 形式のドキュメントを一元管理・閲覧する
サーバーレス Web アプリケーションです。

## 概要

| 項目 | 内容 |
|------|------|
| フロントエンド | React 18 + Vite + TypeScript |
| バックエンド | Python 3.12 + AWS Lambda × 3 |
| ストレージ | Amazon S3 |
| API | Amazon API Gateway (REST) |
| IaC | AWS CDK (TypeScript) |
| スタイリング | Tailwind CSS + daisyUI |

## 主要機能

- **4 種類のビューワー** — Markdown (GFM) / Mermaid (ズーム・パン付き) / Markmap / Marp スライド
- **自動タブ判別** — ファイル内容を解析して最適なビューを自動選択
- **ドキュメント管理** — カテゴリ・タグ付きアップロード、サイドバーでのアコーディオン表示
- **テーマ切替** — ダーク / ライトモード（LocalStorage 永続化）
- **レスポンシブ対応** — モバイルではサイドバーをドロワー表示

## ディレクトリ構成

```
markdown-viewer/
├── frontend/          # React (Vite + TypeScript)
├── backend/           # Lambda (Python 3.12)
│   ├── shared/        # 共通モジュール (Lambda Layer)
│   ├── functions/
│   │   ├── list_documents/
│   │   ├── get_file/
│   │   └── upload_document/
│   ├── tests/
│   └── local_server.py
├── infra/             # AWS CDK スタック
├── docs/              # 設計書
│   ├── spec.md
│   ├── api-spec.md
│   └── ...
└── ai/                # AI ルール・プロンプト
```

## アーキテクチャ

```
ブラウザ (React)
    │
    │ HTTPS
    ▼
Amazon API Gateway
    │
    ├─ GET  /list    ──▶ Lambda: list_documents  ─┐
    ├─ GET  /file    ──▶ Lambda: get_file         ├─▶ S3 (documents + list.json)
    └─ POST /upload  ──▶ Lambda: upload_document  ─┘
```

S3 バケットはパブリックアクセスをブロックし、Lambda 経由でのみアクセスします。

## S3 データ構造

```
s3://markdown-viewer-{account}-{region}/
├── uploads/
│   ├── document_001.md
│   └── ...
└── list.json          # メタデータ一覧
```

`list.json` の形式:

```json
[
  {
    "path": "uploads/document_001.md",
    "title": "システムアーキテクチャ図",
    "category": "設計",
    "tags": ["AWS", "Mermaid"],
    "lastModified": "2026-03-27T12:00:00Z"
  }
]
```

## セットアップ

### 前提条件

- Node.js 20+
- Python 3.12+
- AWS CLI (設定済み)
- AWS CDK v2

### フロントエンド

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

### バックエンド (ローカル開発)

```bash
cd backend
pip install -r requirements.txt
pip install fastapi uvicorn python-multipart
uvicorn local_server:app --reload --port 8000
```

### テスト

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest tests/ -v   # 35 テスト
```

### インフラデプロイ (AWS CDK)

```bash
cd infra
npm install
npx cdk bootstrap   # 初回のみ
npx cdk deploy
```

デプロイ完了後、出力された `ApiBaseUrl` を
フロントエンドの環境変数 `VITE_API_BASE_URL` に設定してください。

```bash
# frontend/.env.local
VITE_API_BASE_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
VITE_USE_MOCK=false
```

> **Basic 認証の設定**
> デプロイ後、3 つの Lambda 関数の環境変数 `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` を
> AWS コンソールまたは CLI で設定してください（CDK コードへの直書き禁止）。

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/list` | ドキュメント一覧取得 (`list.json` を返す) |
| `GET` | `/file?path=uploads/xxx.md` | ファイル内容取得 |
| `POST` | `/upload` | ファイルアップロード (`multipart/form-data`) |

詳細は [docs/api-spec.md](docs/api-spec.md) を参照してください。

## 環境変数

### フロントエンド (`frontend/.env.local`)

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `VITE_API_BASE_URL` | `/api` | API ベース URL |
| `VITE_USE_MOCK` | `true` | `true` でモックデータを使用 |

### バックエンド (Lambda 環境変数)

| 変数名 | 説明 |
|--------|------|
| `S3_BUCKET_NAME` | S3 バケット名 (CDK が自動設定) |
| `BASIC_AUTH_USER` | Basic 認証 ID (デプロイ後に手動設定) |
| `BASIC_AUTH_PASSWORD` | Basic 認証パスワード (デプロイ後に手動設定) |

## 技術スタック詳細

### フロントエンド依存パッケージ

| パッケージ | 用途 |
|-----------|------|
| `react-markdown` + `remark-gfm` | Markdown レンダリング |
| `mermaid` | Mermaid 図解レンダリング |
| `markmap-view` + `markmap-lib` | マインドマップ表示 |
| `@marp-team/marp-core` | Marp スライド表示 |
| `lucide-react` | アイコン |

### バックエンド

Port/Adapter パターンを採用し、ドメインロジックを AWS 依存から分離しています。

```
shared/
├── models.py      # DocumentMeta (Entity / Value Object)
├── s3_client.py   # S3 操作 (Adapter)
└── response.py    # HTTP レスポンス生成
```

## ドキュメント

- [仕様書 (PRD)](docs/spec.md)
- [API 仕様書](docs/api-spec.md)
