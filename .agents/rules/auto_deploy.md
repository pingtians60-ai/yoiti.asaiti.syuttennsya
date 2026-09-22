# 自動デプロイ規則 (Auto-deploy to GitHub Pages)

このプロジェクト（夜市出店者管理システム）でAntigravityがソースコードや設定ファイルを編集・修正・機能追加した際は、作業の仕上げとして必ず以下のデプロイ処理を実行すること：

1. **ビルド検証**:
   `npm run build` を実行してTypeScript型エラーやViteビルドエラーがないことを確認する。

2. **GitHub Pages公開サイトへのデプロイ**:
   `node deploy.cjs` を実行して `https://pingtians60-ai.github.io/yoiti.asaiti.syuttennsya/`（`gh-pages` ブランチ）へ即時反映する。

3. **Gitリポジトリ main ブランチへのコミット＆プッシュ**:
   `git add .`、`git commit`、`git push origin main` を実行し、ソースコードとGitHub Actionsワークフローを最新状態に保つ。

これにより、ユーザーがAntigravityに依頼して編集した内容が、常に即座に公開Webサイト（https://pingtians60-ai.github.io/yoiti.asaiti.syuttennsya/）へ完全反映される状態を維持する。
