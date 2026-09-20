const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function run(cmd, cwd) {
  return execSync(cmd, { cwd: cwd || process.cwd(), stdio: 'inherit', shell: true });
}

console.log('========================================================');
console.log('   [ 夜市出店者管理システム ] GitHub Pages デプロイ');
console.log('========================================================\n');

try {
  console.log('1. プロジェクトをビルド中...');
  run('npm run build');

  const rootDir = __dirname;
  const distDir = path.join(rootDir, 'dist');
  const nojekyll = path.join(distDir, '.nojekyll');

  // .nojekyll を配置
  fs.writeFileSync(nojekyll, '');

  console.log('\n2. gh-pages ブランチへデプロイ中...');
  const tempDir = path.join(os.tmpdir(), 'gh-pages-deploy-' + Date.now());
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // dist の中身を一時ディレクトリにコピー
  fs.cpSync(distDir, tempDir, { recursive: true });

  const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  run('git init -b gh-pages', tempDir);
  run('git config user.name "pingtians60-ai"', tempDir);
  run('git config user.email "316494324+pingtians60-ai@users.noreply.github.com"', tempDir);
  run('git add .', tempDir);
  run(`git commit -m "Deploy to GitHub Pages ${dateStr}"`, tempDir);
  run('git remote add origin https://github.com/pingtians60-ai/yoiti.asaiti.syuttennsya.git', tempDir);
  run('git push -f origin gh-pages', tempDir);

  // 一時ディレクトリ削除
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {
    // ignore cleanup error
  }

  console.log('\n========================================================');
  console.log('✅ GitHub Pagesへのデプロイが完了しました！');
  console.log('🌐 公開URL: https://pingtians60-ai.github.io/yoiti.asaiti.syuttennsya/');
  console.log('========================================================\n');
} catch (err) {
  console.error('\n❌ デプロイ中にエラーが発生しました:', err.message);
  process.exit(1);
}
