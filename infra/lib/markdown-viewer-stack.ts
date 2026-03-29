/**
 * Markdown Viewer — メイン CDK スタック
 *
 * 作成されるリソース:
 *   1. S3 バケット              ドキュメントファイル・list.json の保存先
 *   2. IAM ロール               Lambda 実行ロール（S3 アクセス + CloudWatch Logs）
 *   3. Lambda Layer             3 つの Lambda が共有する Python モジュール (shared/)
 *   4. Lambda 関数 × 3          list_documents / get_file / upload_document
 *   5. API Gateway (REST API)   Lambda をバックエンドとした HTTP エンドポイント
 *   6. CloudWatch ロググループ  Lambda のログ保持期間を管理
 *
 * ディレクトリ構成:
 *   project-root/
 *     backend/
 *       shared/          ← Lambda Layer に同梱される共通モジュール
 *       functions/
 *         list_documents/handler.py
 *         get_file/handler.py
 *         upload_document/handler.py
 *     infra/             ← このファイルが存在するディレクトリ
 */

import * as path from 'path'
import * as fs   from 'fs'

import * as cdk        from 'aws-cdk-lib'
import * as s3         from 'aws-cdk-lib/aws-s3'
import * as iam        from 'aws-cdk-lib/aws-iam'
import * as lambda     from 'aws-cdk-lib/aws-lambda'
import * as logs       from 'aws-cdk-lib/aws-logs'
import * as apigw      from 'aws-cdk-lib/aws-apigateway'
import { Construct }   from 'constructs'

// ─────────────────────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────────────────────

/** Python ランタイムバージョン（全 Lambda・Layer で統一） */
const PYTHON_RUNTIME = lambda.Runtime.PYTHON_3_12

/** Lambda のデフォルトタイムアウト（秒） */
const DEFAULT_TIMEOUT_SEC = 15

/** アップロード Lambda のタイムアウト（大きいファイルの S3 書き込みを考慮） */
const UPLOAD_TIMEOUT_SEC = 30

/** Lambda ログの保持期間 */
const LOG_RETENTION = logs.RetentionDays.ONE_MONTH

/** バックエンドコードのルートパス（infra/ から見た相対パス） */
const BACKEND_DIR = path.join(__dirname, '../../backend')

// ─────────────────────────────────────────────────────────────────────────────
// スタック定義
// ─────────────────────────────────────────────────────────────────────────────

export class MarkdownViewerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // =========================================================================
    // 1. S3 バケット
    //    ドキュメント (.md ファイル) と list.json を保存する。
    //    パブリックアクセスは完全にブロックし、Lambda 経由でのみアクセスする。
    // =========================================================================
    const bucket = new s3.Bucket(this, 'DocumentBucket', {
      /**
       * バケット名にアカウント ID とリージョンを含めることで、
       * グローバル一意性を確保しつつ環境ごとに分離する。
       */
      bucketName: `markdown-viewer-${this.account}-${this.region}`,

      /** パブリックアクセスを完全ブロック（CloudFront 経由が必要な場合も同様） */
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      /** 誤削除防止: スタック削除時もバケットを残す */
      removalPolicy: cdk.RemovalPolicy.RETAIN,

      /** オブジェクトのバージョン管理（不要なら DISABLED でも可） */
      versioned: false,

      /** 保存時暗号化（S3 管理キー） */
      encryption: s3.BucketEncryption.S3_MANAGED,

      /** HTTPS のみアクセス許可 */
      enforceSSL: true,
    })

    // =========================================================================
    // 2. IAM ロール — Lambda 実行ロール
    //    最小権限の原則に従い、必要な権限のみを付与する。
    //    ・CloudWatch Logs への書き込み (AWSLambdaBasicExecutionRole)
    //    ・S3 バケットへの読み書き (後述で grantReadWrite)
    // =========================================================================
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      /** Lambda サービスがこのロールを引き受けられるように設定 */
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),

      roleName: `markdown-viewer-lambda-role-${this.region}`,

      description: 'Markdown Viewer Lambda 実行ロール (S3 読み書き + CloudWatch Logs)',

      /**
       * AWS マネージドポリシー: CloudWatch Logs への書き込みを許可。
       * Lambda 関数の console.log / print 出力がこれにより記録される。
       */
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    })

    /**
     * S3 バケットへの読み書き権限を付与。
     * grantReadWrite は GetObject / PutObject / DeleteObject などを
     * このロールにのみスコープを絞って許可する。
     */
    bucket.grantReadWrite(lambdaRole)

    // =========================================================================
    // 3. Lambda Layer — 共通 Python モジュール (shared/)
    //    shared/ ディレクトリを Lambda Layer に同梱する。
    //    Layer は /opt/python/ にマウントされ、
    //    各 Lambda から `from shared.xxx import ...` で参照できる。
    //
    //    ローカルバンドリング優先（Docker 不要）。
    //    失敗時は Docker 経由でビルドする。
    // =========================================================================
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      layerVersionName: 'markdown-viewer-shared',

      description: 'Markdown Viewer 共通モジュール: models / s3_client / response / auth',

      compatibleRuntimes: [PYTHON_RUNTIME],

      code: lambda.Code.fromAsset(BACKEND_DIR, {
        bundling: {
          /**
           * ローカルバンドリング（Docker なし）
           * CDK がまずこちらを試みる。Windows / macOS / Linux 共通で動作する。
           * 出力先 (outputDir) の python/shared/ に shared/ をコピーする。
           */
          local: {
            tryBundle(outputDir: string): boolean {
              try {
                const src = path.join(BACKEND_DIR, 'shared')
                const dst = path.join(outputDir, 'python', 'shared')
                fs.mkdirSync(path.dirname(dst), { recursive: true })
                copyDirSync(src, dst)
                return true
              } catch (e) {
                console.warn('Local bundling for SharedLayer failed, falling back to Docker:', e)
                return false
              }
            },
          },
          /**
           * Docker フォールバック
           * ローカルバンドリングが失敗した場合のみ使用。
           * Docker Desktop がインストールされている環境で動作する。
           */
          image: PYTHON_RUNTIME.bundlingImage,
          command: [
            'bash', '-c',
            'mkdir -p /asset-output/python/shared && cp -r shared/. /asset-output/python/shared/',
          ],
        },
      }),
    })

    // =========================================================================
    // 4. Lambda 関数 × 3
    //    各関数の共通設定をまとめ、関数ごとの差分のみを上書きする。
    //
    //    【環境変数】
    //    S3_BUCKET_NAME   : S3 バケット名（自動設定）
    //    BASIC_AUTH_USER  : Basic 認証 ID    ← デプロイ後に手動設定 or CDK Secrets で管理
    //    BASIC_AUTH_PASSWORD : Basic 認証 PW ← デプロイ後に手動設定 or CDK Secrets で管理
    //
    //    【セキュリティ注意】
    //    BASIC_AUTH_USER / BASIC_AUTH_PASSWORD はここでは空文字で定義し、
    //    デプロイ後に AWS コンソール or SSM Parameter Store / Secrets Manager で設定する。
    //    CDK コードにパスワードを直書きすると Git 履歴に残るため厳禁。
    // =========================================================================

    /** 3 関数で共通の設定 */
    const commonFnProps: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      runtime: PYTHON_RUNTIME,
      role: lambdaRole,

      /** Lambda Layer を全関数に適用 */
      layers: [sharedLayer],

      /** タイムアウト（デフォルト） */
      timeout: cdk.Duration.seconds(DEFAULT_TIMEOUT_SEC),

      /** 環境変数 */
      environment: {
        S3_BUCKET_NAME: bucket.bucketName,
        /**
         * Basic 認証の ID / パスワードは空文字で初期設定。
         * デプロイ後に以下のいずれかの方法で設定すること:
         *   A) AWS コンソール → Lambda → 環境変数 で直接入力
         *   B) aws cli: aws lambda update-function-configuration \
         *        --function-name <name> \
         *        --environment Variables="{BASIC_AUTH_USER=xxx,BASIC_AUTH_PASSWORD=yyy}"
         *   C) AWS Secrets Manager を使う場合は下記コメントを参照
         */
        BASIC_AUTH_USER:     '',
        BASIC_AUTH_PASSWORD: '',
      },

      /** メモリサイズ（デフォルト 128 MB で十分） */
      memorySize: 128,

      /** X-Ray トレーシングを有効化（コスト重視なら DISABLED でも可） */
      tracing: lambda.Tracing.ACTIVE,
    }

    // -------------------------------------------------------------------------
    // 4-1. GET /list — ドキュメント一覧取得
    //      S3 の list.json を読み込んで DocumentMeta 配列を返す。
    // -------------------------------------------------------------------------
    /**
     * Lambda 関数ごとに CloudWatch ロググループを明示的に作成する。
     * logGroup プロパティで紐付けることで保持期間を管理できる。
     * ロググループ名は Lambda のデフォルト命名規則 /aws/lambda/<functionName> に従う。
     */
    const listLogGroup = new logs.LogGroup(this, 'ListDocumentsLogGroup', {
      logGroupName:  '/aws/lambda/markdown-viewer-list-documents',
      retention:     LOG_RETENTION,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })
    const fileLogGroup = new logs.LogGroup(this, 'GetFileLogGroup', {
      logGroupName:  '/aws/lambda/markdown-viewer-get-file',
      retention:     LOG_RETENTION,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })
    const uploadLogGroup = new logs.LogGroup(this, 'UploadDocumentLogGroup', {
      logGroupName:  '/aws/lambda/markdown-viewer-upload-document',
      retention:     LOG_RETENTION,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const listFn = new lambda.Function(this, 'ListDocumentsFunction', {
      ...commonFnProps,
      functionName: 'markdown-viewer-list-documents',
      description:  'GET /list — S3 の list.json からドキュメント一覧を返す',
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset(
        path.join(BACKEND_DIR, 'functions', 'list_documents')
      ),
      logGroup: listLogGroup,
    })

    // -------------------------------------------------------------------------
    // 4-2. GET /file?path=xxx — ドキュメント内容取得
    //      クエリパラメータ path で指定された S3 オブジェクトをテキストで返す。
    //      パストラバーサル防止のため Lambda 側で uploads/ プレフィックスを強制。
    // -------------------------------------------------------------------------
    const fileFn = new lambda.Function(this, 'GetFileFunction', {
      ...commonFnProps,
      functionName: 'markdown-viewer-get-file',
      description:  'GET /file?path=xxx — S3 からファイル内容を取得して返す',
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset(
        path.join(BACKEND_DIR, 'functions', 'get_file')
      ),
      logGroup: fileLogGroup,
    })

    // -------------------------------------------------------------------------
    // 4-3. POST /upload — ドキュメントアップロード
    //      multipart/form-data を受け取り、ファイルを S3 に保存して list.json を更新。
    //      ファイルサイズが大きい場合を考慮してタイムアウトを長めに設定。
    // -------------------------------------------------------------------------
    const uploadFn = new lambda.Function(this, 'UploadDocumentFunction', {
      ...commonFnProps,
      functionName: 'markdown-viewer-upload-document',
      description:  'POST /upload — ファイルを S3 に保存し list.json を更新する',
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset(
        path.join(BACKEND_DIR, 'functions', 'upload_document')
      ),
      /** アップロード処理は S3 書き込みを含むため長めのタイムアウト */
      timeout: cdk.Duration.seconds(UPLOAD_TIMEOUT_SEC),
      logGroup: uploadLogGroup,
    })

    // =========================================================================
    // 5. API Gateway — REST API
    //    Lambda をバックエンドとした HTTP エンドポイントを公開する。
    //    CORS 設定: フロントエンドからのクロスオリジンリクエストを許可。
    //
    //    エンドポイント:
    //      GET  /list          → listFn
    //      GET  /file          → fileFn
    //      POST /upload        → uploadFn
    // =========================================================================
    const api = new apigw.RestApi(this, 'MarkdownViewerApi', {
      restApiName: 'markdown-viewer-api',
      description: 'Markdown Viewer バックエンド API',

      /**
       * デプロイステージ設定
       * デフォルトでは "prod" ステージが作成される。
       * stageName を変更すれば "dev" / "staging" 等も作れる。
       */
      deployOptions: {
        stageName: 'prod',

        /** アクセスログを CloudWatch Logs に記録 */
        accessLogDestination: new apigw.LogGroupLogDestination(
          new logs.LogGroup(this, 'ApiAccessLog', {
            logGroupName: '/aws/apigateway/markdown-viewer',
            retention:    LOG_RETENTION,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          })
        ),
        accessLogFormat: apigw.AccessLogFormat.jsonWithStandardFields({
          caller:      true,
          httpMethod:  true,
          ip:          true,
          protocol:    true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status:      true,
          user:        true,
        }),

        /** X-Ray トレーシング有効化 */
        tracingEnabled: true,
      },

      /**
       * デフォルト CORS 設定（全リソースに適用）
       *
       * 本番環境では allowOrigins を CloudFront のドメインに制限することを推奨:
       *   allowOrigins: ['https://dxxxxxxxxxx.cloudfront.net'],
       */
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'Authorization',  // Basic 認証ヘッダーを許可
        ],
        /** プリフライトキャッシュ時間（秒） */
        maxAge: cdk.Duration.hours(1),
      },
    })

    // -------------------------------------------------------------------------
    // 5-1. Lambda 統合設定（共通）
    //      プロキシ統合: Lambda がリクエスト全体を受け取り、
    //      レスポンスも Lambda が直接返す（API Gateway は素通しする）。
    // -------------------------------------------------------------------------
    const listIntegration   = new apigw.LambdaIntegration(listFn,   { proxy: true })
    const fileIntegration   = new apigw.LambdaIntegration(fileFn,   { proxy: true })
    const uploadIntegration = new apigw.LambdaIntegration(uploadFn, { proxy: true })

    // -------------------------------------------------------------------------
    // 5-2. リソース・メソッドの定義
    //      /list, /file, /upload の各パスにメソッドを追加する。
    // -------------------------------------------------------------------------

    /** GET /list */
    const listResource = api.root.addResource('list')
    listResource.addMethod('GET', listIntegration, {
      operationName: 'ListDocuments',
    })

    /** GET /file?path=xxx */
    const fileResource = api.root.addResource('file')
    fileResource.addMethod('GET', fileIntegration, {
      operationName: 'GetFile',
      /**
       * リクエストバリデーション: クエリパラメータ path を必須にする。
       * path がない場合、Lambda に到達する前に 400 を返す。
       */
      requestParameters: {
        'method.request.querystring.path': true,
      },
      requestValidatorOptions: {
        validateRequestParameters: true,
      },
    })

    /** POST /upload */
    const uploadResource = api.root.addResource('upload')
    uploadResource.addMethod('POST', uploadIntegration, {
      operationName: 'UploadDocument',
    })

    // =========================================================================
    // 6. CloudFormation Outputs — デプロイ後に確認すべき情報を出力
    //    `cdk deploy` 完了後にコンソールに表示される。
    // =========================================================================

    /**
     * API のベース URL
     * フロントエンドの VITE_API_BASE_URL に設定する。
     * 例: https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
     */
    new cdk.CfnOutput(this, 'ApiBaseUrl', {
      value:       api.url,
      description: 'API Gateway ベース URL（フロントエンドの VITE_API_BASE_URL に設定）',
      exportName:  'MarkdownViewerApiUrl',
    })

    /**
     * S3 バケット名
     * Lambda の S3_BUCKET_NAME 環境変数として自動設定済みだが、
     * 手動確認や CLI 操作時に使用する。
     */
    new cdk.CfnOutput(this, 'BucketName', {
      value:       bucket.bucketName,
      description: 'ドキュメント保存用 S3 バケット名',
      exportName:  'MarkdownViewerBucketName',
    })

    /** Lambda 実行ロール ARN（権限トラブルシューティング時に参照） */
    new cdk.CfnOutput(this, 'LambdaRoleArn', {
      value:       lambdaRole.roleArn,
      description: 'Lambda 実行ロール ARN',
    })

    /**
     * Basic 認証設定のリマインダー
     * デプロイ後に以下のコマンドで認証情報を設定すること。
     *
     * aws lambda update-function-configuration \
     *   --function-name markdown-viewer-list-documents \
     *   --environment Variables="{S3_BUCKET_NAME=<bucket>,BASIC_AUTH_USER=<id>,BASIC_AUTH_PASSWORD=<pw>}"
     */
    new cdk.CfnOutput(this, 'BasicAuthSetupReminder', {
      value: [
        '⚠️  デプロイ後、3 つの Lambda 関数に BASIC_AUTH_USER と BASIC_AUTH_PASSWORD を設定してください。',
        '   設定方法: AWS コンソール → Lambda → 環境変数 または aws cli で設定',
      ].join('\n'),
      description: 'Basic 認証の設定リマインダー',
    })
  }
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * ディレクトリを再帰的にコピーする（Lambda Layer のローカルバンドリング用）
 *
 * @param src コピー元ディレクトリ
 * @param dst コピー先ディレクトリ
 */
function copyDirSync(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const dstPath = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, dstPath)
    } else {
      fs.copyFileSync(srcPath, dstPath)
    }
  }
}
