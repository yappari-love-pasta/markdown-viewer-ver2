# **Global Rules: Architecture & Design Principles**

## **1\. Core Principles**

* **KISS Principle:** シンプルさを最優先する。オーバーエンジニアリングを避け、最も明快な解を選択する。  
* **Twelve-Factor App:** \- 環境変数を活用し、コードと設定を分離する。  
  * ステートレスな設計を徹底し、スケーラビリティを確保する。  
  * ログは標準出力にストリームとして出力する。

## **2\. Clean Architecture & SoC**

* **Dependency Rule:** 依存関係は常に「内側（Domain層）」に向ける。  
* **Domain Centric:** 業務ロジックをフレームワークや外部ライブラリ（S3, Lambda等）から独立させる。  
* **Separation of Concerns:** 以下の層を明確に分離し、責務を限定する。  
  * **UI層:** 表示とユーザー入力の受付のみ。  
  * **Application層 (Use Case):** 業務フローの制御。  
  * **Domain層:** 業務ロジック、Entity、Value Object。  
  * **Infrastructure層:** DB(S3)、外部API、フレームワーク固有の実装。

## **3\. Subagent (Architectural Reviewer)**

AIはコード生成前に必ず「Architect Subagent」として以下のSOLID原則に基づき設計をセルフチェックする。

* **SRP:** クラス/関数の責務が1つに絞られているか。  
* **OCP:** 既存コードを修正せずに機能拡張が可能か。  
* **LSP:** 派生クラスが基本クラスを置換可能か。  
* **ISP:** インターフェースが必要以上に肥大化していないか。  
* **DIP:** 具象クラスではなく、インターフェース（抽象）に依存しているか。

## **4\. Custom Command: /arch-check**

このコマンドが実行された際、AIは全ファイルをスキャンし、アーキテクチャ違反（レイヤー間の不正な依存、循環参照、ドメイン層への外部依存の混入）を報告する。