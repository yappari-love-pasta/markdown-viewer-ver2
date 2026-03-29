# **Backend Rules: Lambda & Python**

## **技術スタック**

* **Language:** Python 3.9+  
* **Library:** boto3 (AWS SDK)

## **実装規約**

* **Handler:** lambda\_handler(event, context) の形式を遵守する。  
* **S3 Operation:** \- list.json を読み込む際は、ファイルが存在しない場合のエラーハンドリング（空配列として初期化）を必ず行うこと。  
  * ファイル保存後、必ず list.json のメタデータを更新する一連の処理をアトミックに行う（擬似的に）。  
* **Error Handling:** 適切な HTTP ステータスコード（200, 400, 500等）とエラーメッセージを JSON 形式で返すこと。

## **禁止事項**

* Lambda 内で一時ファイル（/tmp）を長時間保持することを前提とした設計にしない。  
* S3 のバケット名をコード内にハードコードせず、環境変数から取得すること。

# **Backend Rules: Domain Driven Design**

## **1\. 業務ロジックの設計**

* **Entity / Value Object:** データの整合性を保つためのロジックをここに集約する。  
* **Ubiquitous Language:** コード内の変数名、関数名は docs/spec.md で定義された用語と一致させる。

## **2\. 外部接続の抽象化 (Ports & Adapters)**

* **Port:** S3への保存やJSONの読み書きはインターフェース（抽象クラス）として定義する。  
* **Adapter:** boto3 を使用した具体的なS3操作はAdapter層に隠蔽し、ドメイン層から直接参照させない。

## **3\. コード品質のガードレール**

* **単一責任の原則 (SRP):** 1つのLambda関数やクラスが複数の責務を持たないように分割する。  
* **循環依存の禁止:** モジュール間での相互参照を徹底的に排除する。
