---
name: Backend Engineering (Ports & Adapters)
description: Python Lambda開発においてドメイン駆動設計（DDD）の考え方を取り入れ、ビジネスロジックをインフラ（S3等）から隔離し、保守性の高いサーバーレスアーキテクチャを構築するスキル。
---

## **1\. Domain Driven Design (DDD)**

* **Core Logic:** 業務ロジックを中心に設計し、Entity, Value Object, Aggregate の概念を用いて実装する。  
* **Ubiquitous Language:** コード上の識別子をプロジェクト用語集（spec.md）と厳密に一致させる。

## **2\. Ports & Adapters Implementation**

* **Port:** S3への永続化ロジック等をインターフェース（Abstract Base Class）として定義。  
* **Adapter:** AWS SDK (boto3) を用いた具象実装をAdapter層に閉じ込め、ビジネスロジックから隔離する。

## **3\. Serverless Best Practices**

* **Stateless Design:** Lambda内での状態保持を禁止し、Twelve-Factor Appの原則に基づいた設計を行う。  
* **Atomic Operations:** S3の list.json 更新において、読み込みから書き込みまでの整合性を確保するロジックを実装。

## **4\. Solid Code Generation**

* **Subagent Check:** コード生成前に「Architect Subagent」として以下の観点でセルフチェックを行う。  
  * SRP (単一責任), OCP (開放閉鎖), LSP (リスコフ置換), ISP (インターフェース分離), DIP (依存性逆転)。