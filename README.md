# 🏮 夜市出店者管理システム

🌐 **Web公開URL（ブラウザですぐに使えます）**:  
👉 **[https://pingtians60-ai.github.io/yoiti.asaiti.syuttennsya/](https://pingtians60-ai.github.io/yoiti.asaiti.syuttennsya/)**

---

## 🚀 起動方法（エクスプローラーから）
1. **フォルダ内の「夜市出店者管理システム」または「起動する.bat」をダブルクリック**するだけです。
2. 自動的にローカルサーバーが立ち上がり、既定のブラウザでシステムが開きます。
3. **デスクトップ**にもショートカットが作成されているため、デスクトップから直接起動することも可能です。
4. 終了するときは、開いたコマンド画面（黒いウィンドウ）を「×」で閉じてください。

---

## 🌐 Web公開ページ（GitHub Pages）への変更反映方法
Antigravityで変更した内容を公開ページに反映するには、以下のいずれかの方法で行えます：

### 方法1：Antigravityに「反映して」と伝える（一番かんたん！）
- チャットで「**公開ページに反映して**」または「**デプロイして**」と送るだけで、Antigravityが最新版をビルドしてGitHub Pagesへ即座に送信・更新します。

### 方法2：ダブルクリックで手動反映
- フォルダ内の「**公開ページに反映する.bat**」をダブルクリックするだけで、自動で最新版がビルドされ、GitHub Pagesへ反映されます。

### 方法3：コマンドから実行
- コマンドプロンプトやターミナルで `npm run deploy` を実行しても同様にデプロイできます。


---

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
