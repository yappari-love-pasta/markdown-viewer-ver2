---
name: Testing Strategy (Test Pyramid)
description: テストピラミッドの原則に従い、ユニットテストを中心に据えた効率的な品質保証を行い、インフラ依存をモックで排除しながら、重要なユーザーフローをPlaywrightで検証するスキル。
---

## **1\. Test Pyramid Adherence**

* **Unit Tests:** ロジックの 70% 以上をカバーする。特にDomain層（Entity, UseCase）のユニットテストを徹底する。  
* **Integration Tests:** Lambda-S3間、Frontend-API間の通信をモックを用いてテストする。  
* **E2E Tests:** Playwright は「重要なユーザーフロー（アップロード、閲覧）」にのみ適用し、UIの微細な変更に左右されない堅牢なテストを作成する。

## **2\. Mocking & Simulation Skills**

* **Frontend:** msw (Mock Service Worker) を用いて、実際のAPIを叩かずにフロントエンド開発を完結させる。  
* **Backend:** moto (boto3 mock) を活用し、ローカル環境でS3操作の検証を行う。

## **3\. CI/CD Integration**

* 環境変数による設定管理（Twelve-Factor App）がテスト環境でも機能することを保証し、常にクリーンな環境でテストを実行する。