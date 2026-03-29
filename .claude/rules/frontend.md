# **Frontend Rules: React & Tailwind**

## **技術スタック**

* **Framework:** React.js (Vite)  
* **Styling:** Tailwind CSS \+ daisyUI  
* **Icons:** Lucide React

## **実装規約**

* **Component:** 機能ごとに分割し、src/components に配置する。  
* **Theme:** daisyUI のテーマ機能を使用し、ダークモード（デフォルト）とライトモードを切り替え可能にする。  
* **File Detection:** マークダウンの内容を解析してタブ（Markdown/Mermaid/Markmap/Marp）を自動選択するロジックを共通関数として実装する。  
* **UX:** \- ファイルアップロード中はローディングインジケータを表示すること。  
  * サイドバーの「新規アップロード」ボタンは常に下部に固定すること。

## **禁止事項**

* alert() や confirm() などのブラウザネイティブのダイアログは使用せず、UIコンポーネントで代用すること。  
* 外部の巨大なCSSフレームワーク（Bootstrap等）を個別に追加導入しないこと。

# **Frontend Rules: Logic & UI Separation**

## **1\. 関心の分離 (SoC)**

* **Component vs Logic:** コンポーネント内に複雑な業務ロジックを書かない。  
* **Custom Hooks:** API通信やデータ加工、自動判別ロジックは Custom Hooks に抽出し、UIから切り離す。  
* **Infrastructure:** S3やAPIへのアクセスは、Repositoryパターン等を用いて抽象化する。

## **2\. 静的解析と整合性**

* **Dependency Visualization:** 依存関係を意識し、UIコンポーネントがインフラ層に直接依存することを避ける。  
* **Constraint:** クラスやコンポーネントの行数が肥大化した場合は、SRPに基づいた分割案を提示すること。