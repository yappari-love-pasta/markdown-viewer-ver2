# **製品要求仕様書 (PRD): Markdown Viewer**

## **1\. 製品概要**

**Markdown Viewer** は、様々な形式（標準Markdown, Mermaid, Markmap, Marp）で書かれたドキュメントを、一元管理・閲覧するためのWebシステムです。

サーバーレスアーキテクチャを採用し、スケーラビリティと低コストな運用を実現します。

## **2\. ターゲットユーザー**

* 技術ドキュメントをMarkdownで管理するエンジニア  
* 図解（Mermaid）やマインドマップ（Markmap）を多用するプロジェクトマネージャー  
* Markdownスライド（Marp）をチームで共有したいプレゼンター

## **3\. 主要機能要件**

### **3.1 閲覧機能 (Viewer)**

* **タブ切り替え表示:** 以下の4つのモードをタブで切り替えて表示。  
  * **Markdown:** 標準的なGFM形式。  
  * **Mermaid:** 図解表示（フローチャート、シーケンス図等）。拡大・縮小機能（Zoom/Pan）を搭載。  
  * **Markmap:** インタラクティブなマインドマップ表示。  
  * **Marp:** スライド形式のプレゼンテーション表示。  
* **自動判別ロジック:** ファイル取得時、内容を解析して最適な初期表示タブを選択。  
  * \--- marp: true \--- があれば Marp。  
  * \`\`\`mermaid ブロックが主であれば Mermaid。  
  * 判別不能な場合はデフォルトの Markdown タブ。

### **3.2 アップロード機能 (Upload via Lambda)**

* **入力項目:**  
  * ファイル選択 (.md)  
  * ページタイトル (自由入力)  
  * ページ分類 (自由入力)  
  * タグ (複数入力、カンマ区切り等)  
* **処理フロー:**  
  1. フロントエンドから API Gateway 経由で Lambda (Python) へデータを送信。  
  2. Lambda がファイルを S3 の uploads/ パスに保存。  
  3. Lambda が S3 上の list.json を読み込み、新しいメタデータを追加して更新。  
  4. 最終アップロード日時をサーバー（Lambda）側で付与。

### **3.3 サイドバー・ナビゲーション**

* **配置:** 画面左側に固定。  
* **リスト表示:** list.json を元に、「ページ分類」ごとにグループ化（アコーディオン形式）してタイトルを表示。  
* **新規作成:** サイドバーの**最下部**に「＋ 新規アップロード」ボタンを配置。

### **3.4 テーマ管理**

* **モード:** ダークモード（デフォルト）とライトモードの2種類。  
* **切り替え:** 画面上部（ヘッダー）のスイッチで即座に切り替え。  
* **永続化:** ユーザーのブラウザ（LocalStorage）に設定を保存。

## **4\. テクニカルスタック**

### **フロントエンド**

* **Framework:** React.js (Vite / Create React App)  
* **Styling:** Tailwind CSS \+ daisyUI (テーマ切り替え用)  
* **Libraries:**  
  * react-markdown: Markdownレンダリング  
  * mermaid: 図解レンダリング  
  * markmap-view: マインドマップレンダリング  
  * @marp-team/marp-core: スライドレンダリング

### **バックエンド (サーバーレス)**

* **Language:** Python 3.x  
* **Infrastructure:** AWS Lambda  
* **API:** Amazon API Gateway (REST API)  
* **Storage:** Amazon S3 (静的サイトホスティング & データストレージ)

## **5\. データ構造 (S3: list.json)**

\[  
  {  
    "path": "uploads/document\_001.md",  
    "title": "システムアーキテクチャ図",  
    "category": "設計",  
    "tags": \["AWS", "Infrastructure", "Mermaid"\],  
    "lastModified": "2026-03-27T12:00:00Z"  
  }  
\]

## **6\. UI/UX 設計方針**

### **レイアウト構成**

* **Sidebar (Left):** \- \[Top\] カテゴリ別ドキュメントリスト  
  * \[Bottom\] 「＋ 新規アップロード」ボタン  
* **Main Content (Right):**  
  * \[Header\] タイトル、タグ、テーマ切替トグル  
  * \[Tabs\] Markdown | Mermaid | Markmap | Marp  
  * \[Body\] 選択されたモードのビューワーエリア

### **インタラクション**

* サイドバーのアイテムクリック時に即座にファイルをフェッチし、スケルトンスクリーン等でロード中を表示。  
* Mermaidタブではマウスホイールによるズームとドラッグによるパン操作を有効化。

## **7\. 非機能要件**

* **レスポンシブ対応:** モバイル端末ではサイドバーをハンバーガーメニューに格納。  
* **セキュリティ:** S3バケットはパブリック公開せず、CloudFront \+ OAC または署名付きURLによるアクセスを検討（要件に応じて拡張）。  
* **競合制御:** Lambda側で list.json 更新時のアトミック性を確保（簡易的にはS3の強整合性を利用）。

## **8\. フォルダ構成**

```
project-root/
├── frontend/              # React
├── backend/               # Lambda (Python)
├── infra/                 # IaC
├── docs/                  # 設計書
│   ├── spec.md             # 要求仕様書
│   ├── api-spec.md         # API設計書
│   ├── db-schema.md        # DB設計書
│   ├── ui-design.md        # 画面設計書
│   └── feature-spec.md     # 機能設計書
├── ai/                    # AI
│   ├── rules/             # 全体ルール
│   │   ├── global.md
│   │   ├── frontend.md
│   │   ├── backend.md
│   │   ├── security.md
│   │   └── naming.md
│   │
│   ├── skills/            # スキル定義
│   │   ├── frontend.md
│   │   ├── backend.md
│   │   └── testing.md
│   │
│   ├── context/           # プロジェクト固有情報
│   │   ├── architecture.md
│   │   ├── api-spec.md
│   │   └── db-schema.md
│   │
│   └── prompts/           # よく使うプロンプト
│       ├── code-review.md
│       ├── bugfix.md
│       └── feature.md
│
└── README.md
```

作成日: 2026年3月27日

ステータス: 草案 (v2.1)