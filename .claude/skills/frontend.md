---
name: Frontend Engineering (Clean Architecture)
description: Reactコンポーネント設計においてクリーンアーキテクチャを適用し、インターフェースに基づいた疎結合なロジック実装と、多形式（Markdown, Mermaid, Markmap, Marp）のレンダリングを制御するスキル。
---

## **1\. Interface-Based Design (Mandatory)**

* **Generation Rule:** コード生成を開始する際、まず外部依存（API、S3、LocalStorage）を抽象化するためのインターフェース（または型）を定義すること。  
* **Dependency Injection:** コンポーネントやHooksに、定義したインターフェースの実装を注入するパターン（DI）を優先的に使用する。

## **2\. Rendering & Framework Skills**

* **Markdown:** react-markdown を用い、ドメインロジックから独立したレンダラーとして実装。  
* **Mermaid:** 動的レンダリングと d3 によるズーム・パン機能の統合。  
* **Markmap/Marp:** 各ライブラリのAPIをラップし、Reactのライフサイクルと安全に同期させる。

## **3\. Separation of Concerns (SoC)**

* **Logic Extraction:** ビジネスロジックをコンポーネントから分離し、環境に依存しない純粋関数または Custom Hooks に配置する。  
* **Atomic Design:** UIをAtom, Molecule, Organismの単位で分割し、単一責任の原則（SRP）を維持する。

## **4\. Static Guardrails (Automatic Detection)**

* **SRP Check:** 1つのファイルが150行を超えた場合、または1つのクラスに複数の責務が混在している場合に、分割を提案する。  
* **Cycle Detection:** モジュール間の循環参照を検出し、回避策（インターフェースの抽出等）を講じる。