# Markdown Viewer — API 仕様書

バージョン: 1.0.0
作成日: 2026-03-28
ベースURL（本番）: `https://{api-id}.execute-api.{region}.amazonaws.com/prod`
ベースURL（ローカル開発）: `http://localhost:8000`

---

## OpenAPI 3.0 仕様

```yaml
openapi: "3.0.3"
info:
  title: Markdown Viewer API
  description: |
    Markdown/Mermaid/Markmap/Marp 形式のドキュメントを S3 で管理する
    サーバーレス API。Lambda (Python) + API Gateway で動作する。
  version: "1.0.0"

servers:
  - url: https://{apiId}.execute-api.{region}.amazonaws.com/prod
    description: AWS 本番環境
    variables:
      apiId:
        default: "xxxxxxxxxx"
      region:
        default: "ap-northeast-1"
  - url: http://localhost:8000
    description: ローカル開発環境

tags:
  - name: documents
    description: ドキュメント一覧・取得
  - name: upload
    description: ドキュメントアップロード

paths:

  # -------------------------------------------------------
  # GET /list
  # -------------------------------------------------------
  /list:
    get:
      tags: [documents]
      summary: ドキュメント一覧取得
      description: |
        S3 上の list.json を読み込み、全ドキュメントのメタデータ配列を返す。
        カテゴリ・タイトル・形式・タグ・最終更新日時を含む。
      operationId: listDocuments
      responses:
        "200":
          description: ドキュメント一覧
          headers:
            Access-Control-Allow-Origin:
              schema:
                type: string
                example: "*"
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/DocumentMeta"
              example:
                - path: "uploads/system-architecture.md"
                  title: "システムアーキテクチャ図"
                  category: "設計"
                  tags: ["AWS", "Infrastructure", "Mermaid"]
                  lastModified: "2026-03-27T12:00:00Z"
                  format: "mermaid"
                - path: "uploads/onboarding.md"
                  title: "オンボーディングガイド"
                  category: "運用"
                  tags: ["Guide", "Beginner"]
                  lastModified: "2026-03-20T09:00:00Z"
                  format: "markdown"
        "500":
          description: サーバーエラー
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

  # -------------------------------------------------------
  # GET /file
  # -------------------------------------------------------
  /file:
    get:
      tags: [documents]
      summary: ドキュメント内容取得
      description: |
        S3 上の指定パスのファイル内容（Markdown テキスト）を返す。
        `path` パラメータには `uploads/xxx.md` 形式の S3 オブジェクトキーを指定する。
      operationId: getFile
      parameters:
        - name: path
          in: query
          required: true
          description: S3 オブジェクトキー（例: `uploads/system-architecture.md`）
          schema:
            type: string
            pattern: "^uploads/[\\w\\-\\.]+\\.md$"
          example: "uploads/system-architecture.md"
      responses:
        "200":
          description: ファイル内容（プレーンテキスト）
          headers:
            Access-Control-Allow-Origin:
              schema:
                type: string
                example: "*"
            Content-Type:
              schema:
                type: string
                example: "text/plain; charset=utf-8"
          content:
            text/plain:
              schema:
                type: string
              example: |
                # システムアーキテクチャ図

                ```mermaid
                graph TD
                  A[Frontend] --> B[API Gateway]
                ```
        "400":
          description: パラメータ不正（path が未指定 or 不正なパス）
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
              example:
                error: "Invalid path parameter"
        "404":
          description: ファイルが存在しない
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
              example:
                error: "File not found"
        "500":
          description: サーバーエラー
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

  # -------------------------------------------------------
  # POST /upload
  # -------------------------------------------------------
  /upload:
    post:
      tags: [upload]
      summary: ドキュメントアップロード
      description: |
        Markdown ファイルとメタデータを受け取り、以下を行う:
        1. ファイルを S3 の `uploads/` パスに保存
        2. S3 の `list.json` を読み込み、新しいメタデータを追加して更新
        3. `lastModified` はサーバー側（Lambda）で付与する

        ファイル名が重複する場合は上書きする。
        `path` はサーバー側で `uploads/{filename}` として生成する。
      operationId: uploadDocument
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [file, title, category, format]
              properties:
                file:
                  type: string
                  format: binary
                  description: アップロードする .md ファイル
                title:
                  type: string
                  description: ドキュメントタイトル
                  example: "新しいシステム設計書"
                category:
                  type: string
                  description: ドキュメント分類
                  example: "設計"
                format:
                  type: string
                  enum: [markdown, mermaid, markmap, marp]
                  description: ドキュメント形式
                  example: "mermaid"
                tags:
                  type: string
                  description: タグ（カンマ区切り、省略可）
                  example: "AWS,API,Mermaid"
      responses:
        "200":
          description: アップロード成功
          headers:
            Access-Control-Allow-Origin:
              schema:
                type: string
                example: "*"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UploadResponse"
              example:
                message: "Uploaded successfully"
                path: "uploads/new-system-design.md"
                meta:
                  path: "uploads/new-system-design.md"
                  title: "新しいシステム設計書"
                  category: "設計"
                  tags: ["AWS", "API", "Mermaid"]
                  lastModified: "2026-03-28T10:00:00Z"
                  format: "mermaid"
        "400":
          description: バリデーションエラー（必須項目不足、ファイル形式不正）
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
              example:
                error: "Missing required fields: title, category"
        "500":
          description: サーバーエラー
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

    options:
      tags: [upload]
      summary: CORS プリフライト
      operationId: uploadOptions
      responses:
        "200":
          description: CORS ヘッダーを返す
          headers:
            Access-Control-Allow-Origin:
              schema:
                type: string
            Access-Control-Allow-Methods:
              schema:
                type: string
            Access-Control-Allow-Headers:
              schema:
                type: string

# -------------------------------------------------------
# Components
# -------------------------------------------------------
components:
  schemas:

    DocumentMeta:
      type: object
      description: ドキュメントのメタデータ
      required: [path, title, category, tags, lastModified, format]
      properties:
        path:
          type: string
          description: S3 オブジェクトキー（uploads/ プレフィックス付き）
          example: "uploads/system-architecture.md"
        title:
          type: string
          description: ドキュメントタイトル
          example: "システムアーキテクチャ図"
        category:
          type: string
          description: ドキュメント分類
          example: "設計"
        tags:
          type: array
          items:
            type: string
          description: タグ一覧
          example: ["AWS", "Infrastructure", "Mermaid"]
        lastModified:
          type: string
          format: date-time
          description: 最終更新日時（ISO 8601 / UTC）
          example: "2026-03-27T12:00:00Z"
        format:
          type: string
          enum: [markdown, mermaid, markmap, marp]
          description: ドキュメント形式
          example: "mermaid"

    UploadResponse:
      type: object
      required: [message, path, meta]
      properties:
        message:
          type: string
          example: "Uploaded successfully"
        path:
          type: string
          example: "uploads/document.md"
        meta:
          $ref: "#/components/schemas/DocumentMeta"

    ErrorResponse:
      type: object
      required: [error]
      properties:
        error:
          type: string
          description: エラーメッセージ
          example: "Internal server error"
```

---

## エンドポイント一覧

| メソッド | パス      | 説明                         | Lambda 関数              |
|--------|-----------|------------------------------|--------------------------|
| GET    | /list     | ドキュメント一覧取得          | `list_documents/handler` |
| GET    | /file     | ドキュメント内容取得          | `get_file/handler`       |
| POST   | /upload   | ドキュメントアップロード      | `upload_document/handler`|
| OPTIONS| /upload   | CORS プリフライト対応         | `upload_document/handler`|

---

## S3 バケット構成

```
{bucket-name}/
├── list.json           # ドキュメントメタデータ一覧
└── uploads/
    ├── document-001.md
    ├── document-002.md
    └── ...
```

### list.json スキーマ

```json
[
  {
    "path": "uploads/system-architecture.md",
    "title": "システムアーキテクチャ図",
    "category": "設計",
    "tags": ["AWS", "Infrastructure", "Mermaid"],
    "lastModified": "2026-03-27T12:00:00Z",
    "format": "mermaid"
  }
]
```

---

## CORS ポリシー

全エンドポイントで以下のレスポンスヘッダーを付与:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

本番環境では `Access-Control-Allow-Origin` を CloudFront ドメインに制限することを推奨。

---

## 環境変数（Lambda）

| 変数名            | 説明                     | 例                        |
|------------------|--------------------------|---------------------------|
| `S3_BUCKET_NAME` | S3 バケット名            | `my-markdown-viewer`      |
| `LIST_JSON_KEY`  | list.json の S3 キー     | `list.json`（デフォルト） |

---

## バリデーションルール

### POST /upload

| フィールド | 必須 | 制約                                     |
|-----------|------|------------------------------------------|
| file      | ✅   | `.md` 拡張子のみ、最大 10MB              |
| title     | ✅   | 1〜200 文字                              |
| category  | ✅   | 1〜100 文字                              |
| format    | ✅   | `markdown` / `mermaid` / `markmap` / `marp` |
| tags      | ❌   | カンマ区切り、各タグ 50 文字以内        |

### GET /file

| パラメータ | 必須 | 制約                                     |
|-----------|------|------------------------------------------|
| path      | ✅   | `uploads/` プレフィックス必須、`..` 不可（パストラバーサル防止） |
