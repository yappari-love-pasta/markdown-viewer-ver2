# AWS 構築手順 — Markdown Viewer

AWS CDK (TypeScript) を使って、Markdown Viewer のバックエンドインフラを構築する手順です。

---

## 目次

1. [アーキテクチャ概要](#1-アーキテクチャ概要)
2. [前提条件](#2-前提条件)
3. [AWS リソース一覧](#3-aws-リソース一覧)
4. [初回セットアップ](#4-初回セットアップ)
5. [CDK デプロイ](#5-cdk-デプロイ)
6. [デプロイ後の設定](#6-デプロイ後の設定)
7. [update_document Lambda の追加](#7-update_document-lambda-の追加)
8. [フロントエンドへの API URL 設定](#8-フロントエンドへの-api-url-設定)
9. [ローカル開発](#9-ローカル開発)
10. [運用・メンテナンス](#10-運用メンテナンス)
11. [スタックの削除](#11-スタックの削除)
12. [トラブルシューティング](#12-トラブルシューティング)

---

## 1. アーキテクチャ概要

```
ブラウザ (React/Vite)
    │
    │ HTTPS
    ▼
Amazon CloudFront（任意・推奨）
    │
    │ HTTPS + Basic 認証
    ▼
Amazon API Gateway (REST API / prod ステージ)
    ├── GET  /list    → Lambda: markdown-viewer-list-documents
    ├── GET  /file    → Lambda: markdown-viewer-get-file
    ├── POST /upload  → Lambda: markdown-viewer-upload-document
    └── PUT  /update  → Lambda: markdown-viewer-update-document  ※要追加
          │
          ▼
    Amazon S3 バケット
      ├── uploads/xxxxxxxx.md   # ドキュメント本体
      └── list.json             # ドキュメント一覧メタデータ
```

Lambda 関数は共通の Python モジュール（`shared/`）を Lambda Layer 経由で参照します。

---

## 2. 前提条件

### ツール

| ツール | バージョン | 確認コマンド |
|--------|-----------|-------------|
| Node.js | 18 以上 | `node --version` |
| npm | 8 以上 | `npm --version` |
| Python | 3.12 以上 | `python --version` |
| AWS CLI | v2 | `aws --version` |
| AWS CDK CLI | 2.180 以上 | `cdk --version` |

### AWS 環境

- AWS アカウントおよび IAM ユーザー／ロールの作成済み
- CDK デプロイに必要な権限（後述）
- デプロイ先リージョン: デフォルト `ap-northeast-1`（変更可）

### CDK デプロイに必要な IAM 権限

最小権限での構成を推奨しますが、初回は以下の AWS マネージドポリシーで確認できます：

- `AmazonS3FullAccess`
- `AWSLambda_FullAccess`
- `AmazonAPIGatewayAdministrator`
- `IAMFullAccess`
- `CloudWatchLogsFullAccess`
- `AWSCloudFormationFullAccess`

---

## 3. AWS リソース一覧

CDK によって以下のリソースが作成されます。

| リソース | 名前 / ARN パターン | 備考 |
|---------|-------------------|------|
| S3 Bucket | `markdown-viewer-{account}-{region}` | パブリックアクセス完全ブロック、HTTPS 強制、S3 管理キー暗号化 |
| IAM Role | `markdown-viewer-lambda-role-{region}` | S3 読み書き + CloudWatch Logs 書き込み |
| Lambda Layer | `markdown-viewer-shared` | `backend/shared/` を `/opt/python/` にマウント |
| Lambda | `markdown-viewer-list-documents` | GET /list, タイムアウト 15 秒 |
| Lambda | `markdown-viewer-get-file` | GET /file, タイムアウト 15 秒 |
| Lambda | `markdown-viewer-upload-document` | POST /upload, タイムアウト 30 秒 |
| Lambda | `markdown-viewer-update-document` | PUT /update, タイムアウト 30 秒 (**要追加** → [§7](#7-update_document-lambda-の追加)) |
| API Gateway | `markdown-viewer-api` (prod ステージ) | CORS 全オリジン許可（本番では制限推奨） |
| CloudWatch Log Group | `/aws/lambda/markdown-viewer-*` | 保持期間 1 ヶ月 |
| CloudWatch Log Group | `/aws/apigateway/markdown-viewer` | API アクセスログ（JSON 形式）|

---

## 4. 初回セットアップ

### 4-1. AWS CLI 設定

```bash
aws configure
# AWS Access Key ID:     <アクセスキー>
# AWS Secret Access Key: <シークレットキー>
# Default region name:   ap-northeast-1
# Default output format: json
```

設定確認：

```bash
aws sts get-caller-identity
# {
#   "UserId": "...",
#   "Account": "123456789012",
#   "Arn": "arn:aws:iam::123456789012:user/xxxxx"
# }
```

### 4-2. CDK CLI インストール

```bash
npm install -g aws-cdk
cdk --version   # 2.x.x と表示されれば OK
```

### 4-3. CDK Bootstrap（アカウント・リージョンごとに 1 回だけ）

CDK がデプロイに使う S3 バケットや IAM ロールを事前に作成します。

```bash
cdk bootstrap aws://<AWSアカウントID>/ap-northeast-1
# 例: cdk bootstrap aws://123456789012/ap-northeast-1
```

または、AWS CLI のデフォルトプロファイルを使う場合：

```bash
cdk bootstrap
```

> **注意**: Bootstrap は同一アカウント・リージョンに対して最初の 1 回だけ実行します。

### 4-4. infra ディレクトリの依存関係インストール

```bash
cd infra
npm install
```

---

## 5. CDK デプロイ

### 5-1. 差分確認（任意）

実際に変更が加わる前に何が作成／変更されるかを確認できます：

```bash
cd infra
cdk diff
```

### 5-2. デプロイ実行

```bash
cd infra
cdk deploy
```

途中で IAM ポリシーの変更承認を求められたら `y` を入力してください：

```
Do you wish to deploy these changes (y/n)? y
```

### 5-3. デプロイ完了後の出力

デプロイが成功すると、以下のような出力が表示されます：

```
Outputs:
MarkdownViewerStack.ApiBaseUrl     = https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/
MarkdownViewerStack.BucketName     = markdown-viewer-123456789012-ap-northeast-1
MarkdownViewerStack.LambdaRoleArn  = arn:aws:iam::123456789012:role/markdown-viewer-lambda-role-ap-northeast-1
```

**`ApiBaseUrl` の値を必ず控えておいてください**（フロントエンド設定で使用）。

---

## 6. デプロイ後の設定

### 6-1. Basic 認証の設定（必須）

CDK デプロイ直後は `BASIC_AUTH_USER` と `BASIC_AUTH_PASSWORD` が空のため、全 API リクエストが 401 エラーになります。以下の **4 つの Lambda 関数すべて** に設定してください。

```bash
# 設定する環境変数
BUCKET=markdown-viewer-<AWSアカウントID>-ap-northeast-1
USER=あなたのユーザー名
PASS=あなたのパスワード

# 各 Lambda に設定（1 コマンドずつ実行）
for FN in list-documents get-file upload-document update-document; do
  aws lambda update-function-configuration \
    --function-name "markdown-viewer-${FN}" \
    --environment "Variables={S3_BUCKET_NAME=${BUCKET},BASIC_AUTH_USER=${USER},BASIC_AUTH_PASSWORD=${PASS}}"
done
```

#### AWS コンソールから設定する場合

1. AWS コンソール → **Lambda** → 対象の関数を選択
2. **設定** タブ → **環境変数** → **編集**
3. 以下の 3 つを設定：

| キー | 値 |
|-----|-----|
| `S3_BUCKET_NAME` | `markdown-viewer-{account}-{region}` |
| `BASIC_AUTH_USER` | 任意のユーザー名 |
| `BASIC_AUTH_PASSWORD` | 任意のパスワード |

4. **保存** をクリック

> **セキュリティ注意**: パスワードは CDK コード（`.ts` ファイル）に直書きしないでください。Git 履歴に残ります。本番環境では AWS Secrets Manager や SSM Parameter Store の利用を推奨します。

### 6-2. API Gateway の CORS 設定確認（本番環境推奨）

現在の設定はすべてのオリジンを許可しています（`Access-Control-Allow-Origin: *`）。
本番環境では `infra/lib/markdown-viewer-stack.ts` の以下の箇所をフロントエンドのドメインに変更してください：

```typescript
// 変更前
allowOrigins: apigw.Cors.ALL_ORIGINS,

// 変更後（例: CloudFront のドメイン）
allowOrigins: ['https://dxxxxxxxxxx.cloudfront.net'],
```

変更後は `cdk deploy` で再デプロイします。

---

## 7. update_document Lambda の追加

`PUT /update`（ドキュメント更新）は `backend/functions/update_document/` に実装済みですが、**CDK スタックにはまだ追加されていません**。以下の手順で `infra/lib/markdown-viewer-stack.ts` を編集してください。

### 7-1. ロググループの追加

既存の `uploadLogGroup` 定義の直後（`const listFn = ...` より前）に追加：

```typescript
const updateLogGroup = new logs.LogGroup(this, 'UpdateDocumentLogGroup', {
  logGroupName:  '/aws/lambda/markdown-viewer-update-document',
  retention:     LOG_RETENTION,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
})
```

### 7-2. Lambda 関数の追加

既存の `uploadFn` 定義の直後に追加：

```typescript
const updateFn = new lambda.Function(this, 'UpdateDocumentFunction', {
  ...commonFnProps,
  functionName: 'markdown-viewer-update-document',
  description:  'PUT /update — ドキュメント内容・メタデータを更新する',
  handler: 'handler.lambda_handler',
  code: lambda.Code.fromAsset(
    path.join(BACKEND_DIR, 'functions', 'update_document')
  ),
  timeout: cdk.Duration.seconds(UPLOAD_TIMEOUT_SEC),
  logGroup: updateLogGroup,
})
```

### 7-3. API Gateway の CORS にメソッドを追加

既存の `defaultCorsPreflightOptions` を以下のように変更：

```typescript
// 変更前
allowMethods: ['GET', 'POST', 'OPTIONS'],

// 変更後
allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
```

### 7-4. API Gateway リソースの追加

既存の `/** POST /upload */` ブロックの直後に追加：

```typescript
/** PUT /update */
const updateResource = api.root.addResource('update')
const updateIntegration = new apigw.LambdaIntegration(updateFn, { proxy: true })
updateResource.addMethod('PUT', updateIntegration, {
  operationName: 'UpdateDocument',
})
```

### 7-5. 再デプロイ

```bash
cd infra
cdk deploy
```

---

## 8. フロントエンドへの API URL 設定

デプロイ後に出力された `ApiBaseUrl` をフロントエンドに設定します。

### 本番ビルドの場合

`frontend/` ディレクトリに `.env.production` を作成（または既存ファイルを編集）：

```bash
# frontend/.env.production
VITE_API_BASE_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
```

> **注意**: 末尾にスラッシュを付けないでください。

フロントエンドをビルドします：

```bash
cd frontend
npm install
npm run build
# dist/ フォルダが生成される
```

### Amazon S3 + CloudFront でホスティングする場合

1. フロントエンド用の S3 バケットを作成（静的ウェブサイトホスティング不要）
2. CloudFront ディストリビューションを作成し、S3 をオリジンに設定
3. `dist/` の内容を S3 にアップロード：

```bash
aws s3 sync frontend/dist/ s3://<フロントエンド用バケット名>/ --delete
```

### Basic 認証の設定（フロントエンド）

`frontend/src/services/api.ts` の以下の箇所を編集してください：

```typescript
const BASIC_AUTH_USER = 'あなたのユーザー名'
const BASIC_AUTH_PASSWORD = 'あなたのパスワード'
```

> **セキュリティ注意**: フロントエンドにパスワードを埋め込む場合は、コードを公開リポジトリに push しないよう注意してください。環境変数（`VITE_BASIC_AUTH_USER` 等）での管理を推奨します。

---

## 9. ローカル開発

AWS にデプロイせずにローカルで動作確認する手順です（実際の S3 バケットへのアクセスが必要）。

### バックエンド起動

```bash
cd backend
pip install fastapi uvicorn python-multipart boto3

# AWS 認証情報と S3 バケット名を設定
export AWS_DEFAULT_REGION=ap-northeast-1
export S3_BUCKET_NAME=markdown-viewer-<AWSアカウントID>-ap-northeast-1
export BASIC_AUTH_USER=admin
export BASIC_AUTH_PASSWORD=password

uvicorn local_server:app --reload --port 8000
```

### フロントエンド起動

別ターミナルで：

```bash
cd frontend
npm install
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスします。
`/api/*` へのリクエストは Vite のプロキシ設定により `http://localhost:8000` に転送されます。

### テスト実行

```bash
cd backend
pip install pytest pytest-cov moto boto3
pytest --cov=. --cov-report=term-missing
```

---

## 10. 運用・メンテナンス

### Lambda 関数のコード更新

バックエンドのコードを変更した場合は再デプロイします：

```bash
cd infra
cdk deploy
```

CDK は変更があったリソースのみ更新します。

### list.json の手動確認

```bash
aws s3 cp s3://<バケット名>/list.json - | python -m json.tool
```

### ドキュメントの手動削除

```bash
# S3 からファイルを削除
aws s3 rm s3://<バケット名>/uploads/<uuid>.md

# list.json から対応エントリを削除（手動編集）
aws s3 cp s3://<バケット名>/list.json list.json
# list.json を編集して対象エントリを削除
aws s3 cp list.json s3://<バケット名>/list.json
```

### Lambda 環境変数の更新

パスワードを変更する場合：

```bash
aws lambda update-function-configuration \
  --function-name markdown-viewer-list-documents \
  --environment "Variables={S3_BUCKET_NAME=<バケット名>,BASIC_AUTH_USER=<新USER>,BASIC_AUTH_PASSWORD=<新PASS>}"
# 他の 3 関数にも同様に実行
```

### CloudWatch ログの確認

```bash
# 直近のログを表示
aws logs tail /aws/lambda/markdown-viewer-upload-document --follow
```

---

## 11. スタックの削除

> **注意**: S3 バケットは `RemovalPolicy.RETAIN` のため、スタック削除後も残ります。バケットを削除する場合は手動で行ってください。

```bash
cd infra
cdk destroy
```

S3 バケットを削除する場合（中身がある場合は `--force` が必要）：

```bash
aws s3 rb s3://<バケット名> --force
```

---

## 12. トラブルシューティング

### `cdk bootstrap` でエラーが出る

IAM ユーザーに `AWSCloudFormationFullAccess` と `IAMFullAccess` が付いているか確認してください。

### デプロイ後に API が 401 を返す

`BASIC_AUTH_USER` と `BASIC_AUTH_PASSWORD` が設定されていない可能性があります。[§6-1](#6-1-basic-認証の設定必須) を参照してください。

### Lambda が `KeyError: 'S3_BUCKET_NAME'` エラーを出す

Lambda の環境変数に `S3_BUCKET_NAME` が設定されていません。[§6-1](#6-1-basic-認証の設定必須) の手順で設定してください。

### API Gateway が CORS エラーを返す

- `defaultCorsPreflightOptions` の `allowOrigins` にフロントエンドのオリジンが含まれているか確認
- `PUT` メソッドが `allowMethods` に含まれているか確認（update_document 追加後）
- 変更後は `cdk deploy` で再デプロイ

### `cdk deploy` が `No bucket named 'cdk-...'` エラーを出す

Bootstrap が完了していない可能性があります。[§4-3](#4-3-cdk-bootstrapアカウントリージョンごとに-1-回だけ) を参照してください。

### ローカルでバックエンドが S3 に接続できない

- `AWS_DEFAULT_REGION` と `S3_BUCKET_NAME` 環境変数が設定されているか確認
- `aws sts get-caller-identity` で AWS 認証情報が有効か確認
- S3 バケットが指定リージョンに存在するか確認：`aws s3 ls s3://<バケット名>`
