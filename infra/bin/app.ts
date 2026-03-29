#!/usr/bin/env node
/**
 * CDK アプリケーションのエントリポイント
 *
 * ここでスタックをインスタンス化し、デプロイ先の AWS アカウント/リージョンを指定する。
 * 環境変数 CDK_DEFAULT_ACCOUNT / CDK_DEFAULT_REGION は `cdk deploy` 時に
 * AWS CLI のプロファイルから自動補完される。
 */

import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { MarkdownViewerStack } from '../lib/markdown-viewer-stack'

const app = new cdk.App()

new MarkdownViewerStack(app, 'MarkdownViewerStack', {
  /**
   * デプロイ先 AWS アカウント・リージョン
   *
   * 明示的に指定する場合は以下のようにコメントアウトを解除:
   *   account: '123456789012',
   *   region:  'ap-northeast-1',
   *
   * 省略時は CDK_DEFAULT_ACCOUNT / CDK_DEFAULT_REGION が使われる。
   */
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region:  process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
  },

  /** CloudFormation スタックの説明 */
  description: 'Markdown Viewer — Lambda + API Gateway + S3',
})
