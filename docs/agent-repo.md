# slack-emoji-builder — リポジトリ固有ルール

## 概要

Slack 用カスタム絵文字（静止画 PNG / アニメーション GIF）をブラウザ上で生成する静的 Web アプリ。ビルドツールやパッケージマネージャは使わず、`src/` 配下の HTML / CSS / JavaScript をそのまま GitHub Pages にデプロイする。

## プロジェクト構成

```
src/
├── index.html       # UI
├── style.css        # スタイル
├── script.js        # メイン UI ロジック・設定永続化
├── emoji-renderer.js # Canvas 描画
├── text-layout.js   # テキストレイアウト計算
├── preview.js       # プレビュー表示
├── animation.js     # アニメーション定義・フレーム生成
└── gif-encoder.js   # GIF エンコード
```

各 JS ファイルは IIFE でスコープを閉じ、必要なクラス・オブジェクトは `global` / `window` に公開する。モジュールバンドラや `import` / `export` は使わない。

## ビルド・検証

パッケージマネージャやテストランナーはない。CI と同じ構文チェックを使う:

```shell
find src -type f -name '*.js' -print0 | xargs -0 -r -n1 node --check
```

編集後は上記を実行してからコミットする。ブラウザでの動作確認は `src/index.html` を開く（ローカルサーバ不要だが、file:// でも動く）。

## JavaScript 規約

- `'use strict'` を IIFE 内で使う（既存ファイルに合わせる）
- 識別子は英語、UI ラベルやアニメーション名などユーザー向け文字列は日本語可
- `var` は既存コードに合わせて許容するが、新規コードでは `const` / `let` を優先
- グローバル汚染を避ける。公開が必要なものだけ `global.XXX = ...` でエクスポート
- ファイル間の依存は `index.html` の `<script>` 読み込み順で解決する。順序を変えるときは依存関係を確認する

## ドメイン固有

- 生成サイズ・プレビューサイズは `script.js` の `SIZE_CONFIG` で一元管理する
- アニメーション GIF は Slack 制限（128KB）を意識し、`animation.js` の `MAX_GIF_BYTES` 等の既存ロジックに従う
- Canvas 描画の座標・スケール計算は `baseSize` を基準にする。サイズ変更時は `EmojiRenderer` と `SIZE_CONFIG` の整合を保つ
- 設定の localStorage キー（`STORAGE_KEY` 等）を変更すると既存ユーザーの保存データが無効になる。互換が必要ならバージョンキーを検討する

## コメント（このリポジトリ）

共通ルールのコメント方針に加え:

- アルゴリズムや外部仕様（GIF89a 等）の制約説明は、既存の `gif-encoder.js` のようにファイル先頭や最小スコープに書いてよい
- UI 文言と重複する説明コメントは不要

## デプロイ

`main` ブランチへの push で GitHub Pages（`src/` ディレクトリ）へ自動デプロイされる。アプリコード以外の変更のみの PR でも CI（JavaScript 構文チェック）は通ること。
