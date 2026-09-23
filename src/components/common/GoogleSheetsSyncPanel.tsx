import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Copy,
  Check,
  ExternalLink,
  Save,
  Trash2,
  X,
  HelpCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Vendor } from '../../types';
import {
  getGasConfig,
  saveGasConfig,
  testGasConnection,
  fetchVendorsFromGoogleSheets,
  pushVendorsToGoogleSheets,
  GOOGLE_APPS_SCRIPT_TEMPLATE
} from '../../services/googleSheetsDbService';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: Vendor[];
  onVendorsLoaded: (vendors: Vendor[]) => void;
  onSyncSuccess?: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  vendors,
  onVendorsLoaded,
  onSyncSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'guide'>('sync');
  const [url, setUrl] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);

  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getGasConfig();
      setUrl(config.url);
      setAutoSync(config.autoSync);
      setLastSyncTime(config.lastSyncTime);
      setActionResult(null);
      setTestResult(null);

      // URLが未設定なら案内ガイドタブをデフォルト表示
      if (!config.url) {
        setActiveTab('guide');
      } else {
        setActiveTab('sync');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 接続テスト
  const handleTestConnection = async () => {
    if (!url.trim()) {
      setTestResult({ success: false, message: 'ウェブアプリURLを入力してください。' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    setActionResult(null);

    const res = await testGasConnection(url);
    setTestResult(res);
    setIsTesting(false);
  };

  // 設定保存
  const handleSaveConfig = () => {
    saveGasConfig(url, autoSync);
    setActionResult({ success: true, message: 'Googleスプレッドシート連携設定を保存しました！' });
    onSyncSuccess?.();
  };

  // スプレッドシートから読み込み（プル）
  const handlePullFromSheets = async () => {
    if (!url.trim()) {
      setActionResult({ success: false, message: '先にWebアプリURLを入力・保存してください。' });
      return;
    }

    const confirmMsg = vendors.length > 0
      ? `スプレッドシートから出店者マスターを読み込みます。\n現在の端末上の出店者一覧（${vendors.length}件）はスプレッドシートのデータで最新化されます。よろしいですか？`
      : 'スプレッドシートから出店者マスターを読み込みます。よろしいですか？';

    if (!window.confirm(confirmMsg)) return;

    setIsPulling(true);
    setActionResult(null);

    const res = await fetchVendorsFromGoogleSheets(url);
    setIsPulling(false);

    if (res.success && res.vendors) {
      onVendorsLoaded(res.vendors);
      setLastSyncTime(new Date().toISOString());
      setActionResult({
        success: true,
        message: `スプレッドシートから ${res.vendors.length}件の出店者を正常に読み込みました！`
      });
      onSyncSuccess?.();
    } else {
      setActionResult({
        success: false,
        message: res.message || 'スプレッドシートからの読み込みに失敗しました。'
      });
    }
  };

  // スプレッドシートへ保存（プッシュ）
  const handlePushToSheets = async () => {
    if (!url.trim()) {
      setActionResult({ success: false, message: '先にWebアプリURLを入力・保存してください。' });
      return;
    }

    const confirmMsg = `現在の端末にある出店者マスター（${vendors.length}件）をGoogleスプレッドシートに保存（上書き）します。\nスプレッドシートの「出店者マスター」シートが最新データで更新されます。実行しますか？`;
    if (!window.confirm(confirmMsg)) return;

    setIsPushing(true);
    setActionResult(null);

    const res = await pushVendorsToGoogleSheets(vendors, url);
    setIsPushing(false);

    if (res.success) {
      setLastSyncTime(new Date().toISOString());
      setActionResult({
        success: true,
        message: res.message || 'スプレッドシートへ出店者データを正常に保存しました！'
      });
      onSyncSuccess?.();
    } else {
      setActionResult({
        success: false,
        message: res.message || 'スプレッドシートへの保存に失敗しました。'
      });
    }
  };

  // スクリプトコードのコピー
  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // 日時フォーマット
  const formatTime = (isoString: string | null) => {
    if (!isoString) return '未同期';
    const d = new Date(isoString);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const isConfigured = Boolean(url.trim());

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* モーダルヘッダー */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Googleスプレッドシート データベース連携
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  出店者マスター対応
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Googleスプレッドシートを出店者マスターの安全・無料なクラウド保存先として直結します
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'sync'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>データ同期・保存</span>
            {isConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>かんたんセットアップ手順</span>
            {!isConfigured && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                最初はこちら
              </span>
            )}
          </button>
        </div>

        {/* モーダルコンテンツ（スクロール可能） */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* 同期・操作タブ */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              {/* ステータスバナー */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-850 to-slate-900 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">接続ステータス:</span>
                    {isConfigured ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        URL設定済み
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-800">
                        未接続（URL未設定）
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    現在のアプリ内出店者数: <strong className="text-white font-bold">{vendors.length}件</strong>
                    <span className="mx-2 text-slate-600">|</span>
                    最終同期: <span className="text-slate-300">{formatTime(lastSyncTime)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting || !url.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold border border-slate-700 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>{isTesting ? 'テスト中...' : '接続テスト'}</span>
                  </button>
                </div>
              </div>

              {/* 接続テスト結果メッセージ */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                    testResult.success
                      ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                      : 'bg-red-950/60 border-red-800/80 text-red-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">{testResult.message}</div>
                    {testResult.count !== undefined && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        スプレッドシートに記録されている出店者数: {testResult.count}件
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 操作結果メッセージ */}
              {actionResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                    actionResult.success
                      ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                      : 'bg-red-950/60 border-red-800/80 text-red-300'
                  }`}
                >
                  {actionResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="font-bold">{actionResult.message}</div>
                </div>
              )}

              {/* 双方向同期アクションカード */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. スプレッドシートから読み込む */}
                <div className="p-5 rounded-2xl bg-slate-850/80 border border-slate-700/80 flex flex-col justify-between space-y-4 hover:border-slate-600 transition">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                      <DownloadCloud className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      スプレッドシートから読み込む
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      スプレッドシートの出店者マスターをアプリへ同期・復元します。他端末で編集した内容やスプレッドシート上で直打ちしたデータを取り込む際に使用します。
                    </p>
                  </div>
                  <button
                    onClick={handlePullFromSheets}
                    disabled={isPulling || isPushing || !url.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-900/30 transition"
                  >
                    <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                    <span>{isPulling ? '読み込み中...' : 'シートから出店者を読み込む'}</span>
                  </button>
                </div>

                {/* 2. スプレッドシートへ保存 */}
                <div className="p-5 rounded-2xl bg-slate-850/80 border border-slate-700/80 flex flex-col justify-between space-y-4 hover:border-slate-600 transition">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      スプレッドシートへ今すぐ保存
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      現在のアプリ内出店者マスター（{vendors.length}件）をGoogleスプレッドシートへ完全上書き保存します。スタッフ共有やクラウドバックアップに最適です。
                    </p>
                  </div>
                  <button
                    onClick={handlePushToSheets}
                    disabled={isPulling || isPushing || !url.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition"
                  >
                    <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                    <span>{isPushing ? '保存中...' : 'シートへ全データを保存'}</span>
                  </button>
                </div>
              </div>

              {/* 設定入力フォーム */}
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Google Apps Script ウェブアプリURL</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('guide')}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-normal flex items-center gap-1"
                    >
                      URLの取得方法を見る
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition"
                  />
                  <p className="text-[11px] text-slate-500">
                    ※スプレッドシートの「デプロイ」で発行された「https://script.google.com/macros/s/.../exec」形式のURLを入力してください。
                  </p>
                </div>

                {/* 自動同期オプション */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      出店者の追加・編集時に自動反映
                    </div>
                    <p className="text-[11px] text-slate-400">
                      アプリ内で出店者を新規登録・編集・削除した際、自動的にスプレッドシートにも即時反映します
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={handleSaveConfig}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-950"
                  >
                    <Save className="w-4 h-4" />
                    <span>設定を保存する</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* セットアップ手順ガイドタブ */}
          {activeTab === 'guide' && (
            <div className="space-y-6">
              {/* ガイド概要 */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-200 text-xs leading-relaxed space-y-2">
                <div className="font-bold flex items-center gap-2 text-emerald-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  所要時間3分！無料・安全にスプレッドシートと直結できます
                </div>
                <p>
                  Googleアカウントをお持ちであれば、誰でもすぐに作成できます。特別な課金やサーバー契約は一切不要です。
                </p>
              </div>

              {/* 手順ステップ */}
              <div className="space-y-4">
                {/* ステップ1 */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-700/80 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      Googleスプレッドシートを新規作成する
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 pl-8 leading-relaxed">
                    Googleドライブから「新しいスプレッドシート」を作成します（ファイル名は何でも構いません。例：「夜市出店者マスター」）。シートの列ヘッダーなどはシステムが自動作成しますので空のままで大丈夫です。
                  </p>
                </div>

                {/* ステップ2 */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-700/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      Apps Scriptを開き、コードを貼り付ける
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 pl-8 leading-relaxed">
                    スプレッドシートのメニューバーにある<strong>「拡張機能」&gt;「Apps Script」</strong>をクリックします。開いた画面のエディタにあるコードを全て消去し、下のボタンでコピーしたスクリプトを貼り付けて「保存(💾)」してください。
                  </p>
                  <div className="pl-8 pt-1">
                    <button
                      onClick={handleCopyCode}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md ${
                        copiedCode
                          ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
                      }`}
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-4 h-4 text-slate-950" />
                          <span>コピーしました！Apps Scriptに貼り付けてください</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-emerald-400" />
                          <span>完成済みGASコードをワンクリックでコピー</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* ステップ3 */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-700/80 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      ウェブアプリとしてデプロイする
                    </h4>
                  </div>
                  <div className="text-xs text-slate-400 pl-8 leading-relaxed space-y-2">
                    <p>
                      Apps Scriptの画面右上にある青い<strong>「デプロイ」&gt;「新しいデプロイ」</strong>をクリックします。
                    </p>
                    <ul className="list-disc list-inside space-y-1 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-slate-300">
                      <li>左側の歯車アイコンをクリックし、<strong>「ウェブアプリ」</strong>を選択</li>
                      <li>「次のユーザーとして実行」: <strong>自分 (Me)</strong></li>
                      <li>
                        「アクセスできるユーザー」: <strong className="text-emerald-400">全員 (Anyone)</strong>
                        <span className="text-[11px] text-amber-400 block ml-4">
                          ※ここを「全員」にしないとブラウザから保存できなくなりますので必ず「全員」に設定してください。
                        </span>
                      </li>
                    </ul>
                    <p>
                      「デプロイ」ボタンを押して承認を進めると、<strong>「ウェブアプリURL」</strong>が表示されます。
                    </p>
                  </div>
                </div>

                {/* ステップ4 */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-700/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      4
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      発行されたURLを入力して保存する
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 pl-8 leading-relaxed">
                    表示されたURLをコピーし、この画面上部の「データ同期・保存」タブのURL入力欄に貼り付けて「設定を保存する」をクリックしてください。これで完了です！
                  </p>
                  <div className="pl-8 pt-1">
                    <button
                      onClick={() => setActiveTab('sync')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                    >
                      <span>同期画面へ戻る</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Googleスプレッドシート直結型データベース</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
