import React, { useState } from 'react';
import {
  Database,
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Save,
  RotateCcw,
  X
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  resetSupabaseConfig,
  testSupabaseConnection
} from '../../services/supabaseClient';
import { pushAllLocalDataToSupabase } from '../../services/supabaseService';
import { NightMarketEvent, Vendor, EventEntry } from '../../types';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: NightMarketEvent[];
  vendors: Vendor[];
  entries: EventEntry[];
  isConnected: boolean;
  onRefreshDataFromCloud: () => Promise<void>;
  onConnectionStatusChange: () => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  events,
  vendors,
  entries,
  isConnected,
  onRefreshDataFromCloud,
  onConnectionStatusChange
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(url, anonKey);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSave = () => {
    saveSupabaseConfig(url, anonKey);
    onConnectionStatusChange();
    handleTest();
  };

  const handleReset = () => {
    if (confirm('Supabase設定を初期状態（デフォルト値）に戻しますか？')) {
      resetSupabaseConfig();
      const cfg = getSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setTestResult(null);
      onConnectionStatusChange();
    }
  };

  const handlePushAll = async () => {
    if (!confirm(`現在ローカルに保存されているデータ（イベント: ${events.length}件、店舗: ${vendors.length}件、ブース: ${entries.length}件）をSupabaseクラウドに一括アップロードしますか？\n※既存データと同一IDのものは上書き更新されます。`)) {
      return;
    }

    setIsPushing(true);
    setPushResult(null);
    const res = await pushAllLocalDataToSupabase(events, vendors, entries);
    if (res.success) {
      setPushResult({
        success: true,
        message: `一括アップロード完了！ (イベント: ${res.count.events}件、店舗: ${res.count.vendors}件、ブース: ${res.count.entries}件)`
      });
      onConnectionStatusChange();
    } else {
      setPushResult({
        success: false,
        message: res.error || 'アップロードに失敗しました。'
      });
    }
    setIsPushing(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshDataFromCloud();
      alert('Supabaseクラウドから最新データを同期しました！');
    } catch (e: any) {
      alert(`同期エラー: ${e?.message || '最新データの取得に失敗しました。'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const sqlCode = `-- Supabase SQL Editorで実行するテーブル作成スクリプト
CREATE TABLE IF NOT EXISTS public.yoichi_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT DEFAULT '',
  time TEXT DEFAULT '',
  venue TEXT DEFAULT '',
  organizer TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  fire_department_name TEXT DEFAULT '',
  guidelines_notes JSONB DEFAULT '[]'::jsonb,
  areas JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.yoichi_vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reading_furigana TEXT,
  owner_name TEXT NOT NULL,
  furigana TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  line_id TEXT,
  instagram TEXT,
  address TEXT,
  category TEXT NOT NULL,
  organization_type TEXT DEFAULT 'store',
  organization_name TEXT,
  menu_items TEXT,
  has_food_license BOOLEAN DEFAULT FALSE,
  food_license_number TEXT,
  license_expiry_date TEXT,
  submitted_licenses JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  status_reason TEXT,
  blacklisted_at TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  internal_notes TEXT,
  past_participation_count INTEGER DEFAULT 0,
  past_events JSONB DEFAULT '[]'::jsonb,
  created_at TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.yoichi_entries (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  vendor_snapshot JSONB NOT NULL,
  booth_area TEXT NOT NULL,
  booth_number TEXT NOT NULL,
  fee JSONB NOT NULL,
  fire_safety JSONB NOT NULL,
  permit_issued BOOLEAN DEFAULT FALSE,
  permit_issued_at TEXT,
  submitted_licenses JSONB DEFAULT '[]'::jsonb,
  entry_status TEXT DEFAULT 'pending',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSポリシー（全ユーザーにアクセス許可）
ALTER TABLE public.yoichi_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yoichi_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yoichi_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon all on yoichi_events" ON public.yoichi_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on yoichi_vendors" ON public.yoichi_vendors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on yoichi_entries" ON public.yoichi_entries FOR ALL USING (true) WITH CHECK (true);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
        {/* ヘッダー */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Supabase クラウドデータベース連携
              </h3>
              <p className="text-xs text-slate-400">
                複数端末・複数スタッフでのリアルタイム共有とクラウドバックアップ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ本体 */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs">
          {/* 現在のステータスバナー */}
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            isConnected
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}>
            <div className="flex items-center gap-3">
              {isConnected ? (
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CloudCheck className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <CloudOff className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="font-black text-sm flex items-center gap-2">
                  <span>{isConnected ? '🟢 Supabase クラウド同期中' : '🟡 ローカル保存モードで動作中'}</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {isConnected 
                    ? 'すべての更新（店舗・ブース・イベント）がリアルタイムにSupabaseへ自動保存されます。' 
                    : '現在ローカル（ブラウザ）に保存されています。接続設定を行うとクラウドに保存できます。'}
                </p>
              </div>
            </div>

            {isConnected && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition flex items-center gap-1.5 shrink-0 shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>クラウド再取得</span>
              </button>
            )}
          </div>

          {/* 接続先設定フォーム */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/80 space-y-3.5">
            <div className="font-bold text-slate-200 text-sm flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-sky-400" />
                Supabase プロジェクト接続情報
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-normal"
              >
                <RotateCcw className="w-3 h-3" />
                デフォルトに戻す
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xxxxxxxxxxxx.supabase.co"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Supabase Anon (Public) Key
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* テスト結果メッセージ */}
            {testResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                testResult.success 
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200' 
                  : 'bg-rose-950/60 border-rose-600 text-rose-200'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{testResult.success ? '疎通確認成功' : '接続エラー'}</div>
                  <div className="mt-0.5 whitespace-pre-wrap">{testResult.message}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !url || !anonKey}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'テスト中...' : '接続テスト'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition flex items-center gap-1.5 shadow"
              >
                <Save className="w-3.5 h-3.5" />
                <span>設定を保存</span>
              </button>
            </div>
          </div>

          {/* 初期データ一括アップロード */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/80 space-y-3">
            <div className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-amber-400" />
              ローカルデータをSupabaseへ一括アップロード
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              現在ブラウザ内に登録されているデータ（出店者マスター・イベント・ブース割り当て）を、Supabaseクラウドデータベースへ一括で反映します。最初にSupabase連携を開始する際にお使いください。
            </p>

            <div className="grid grid-cols-3 gap-2 py-1">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">開催イベント</div>
                <div className="text-base font-black text-white font-mono">{events.length} 件</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">過去出店店舗</div>
                <div className="text-base font-black text-amber-400 font-mono">{vendors.length} 店舗</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">ブース配置</div>
                <div className="text-base font-black text-sky-400 font-mono">{entries.length} 件</div>
              </div>
            </div>

            {pushResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                pushResult.success 
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200' 
                  : 'bg-rose-950/60 border-rose-600 text-rose-200'
              }`}>
                {pushResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span className="font-medium">{pushResult.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handlePushAll}
              disabled={isPushing}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
              <span>{isPushing ? 'クラウドへ一括アップロード中...' : '現在の全ローカルデータをSupabaseにアップロード'}</span>
            </button>
          </div>

          {/* 初回セットアップ用SQLガイド */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSqlGuide(!showSqlGuide)}
              className="w-full p-3.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold flex items-center justify-between transition text-left"
            >
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                初回セットアップ用 SQLスクリプト（テーブル作成）
              </span>
              <span className="text-[11px] text-slate-400">{showSqlGuide ? '閉じる ▲' : 'SQLを表示 ▼'}</span>
            </button>

            {showSqlGuide && (
              <div className="p-4 bg-slate-950 space-y-3 text-[11px]">
                <p className="text-slate-400">
                  Supabaseダッシュボード（<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-sky-400 underline inline-flex items-center gap-0.5">SQL Editor <ExternalLink className="w-3 h-3" /></a>）を開き、以下のSQLを貼り付けて「RUN」を実行してください。
                  専用の3テーブル（<code>yoichi_events</code>, <code>yoichi_vendors</code>, <code>yoichi_entries</code>）が作成されます。
                </p>

                <div className="relative">
                  <pre className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-48">
                    {sqlCode}
                  </pre>
                  <button
                    type="button"
                    onClick={copySqlToClipboard}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 text-[10px] flex items-center gap-1 shadow"
                  >
                    {copiedSql ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'コピー完了！' : 'SQLをコピー'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-xs"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
