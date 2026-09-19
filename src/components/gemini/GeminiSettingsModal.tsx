import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Cpu, 
  RefreshCw,
  Trash2,
  Server
} from 'lucide-react';
import { 
  getStoredGeminiApiKey, 
  setStoredGeminiApiKey, 
  getStoredGeminiModel, 
  setStoredGeminiModel,
  checkServerAiStatus
} from '../../utils/gemini';

interface GeminiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-flash-latest', name: 'Gemini Flash (推奨・最新鋭)', desc: '最新の高速推論モデル。夜市の運営分析や文章作成に最適' },
  { id: 'gemini-pro-latest', name: 'Gemini Pro (高度・大容量)', desc: '複雑な推論や長文作成に適した高性能モデル' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini Flash-Lite (超軽量)', desc: '最も軽量で即座に応答するモデル' }
];

export const GeminiSettingsModal: React.FC<GeminiSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [apiKey, setApiKey] = useState<string>(getStoredGeminiApiKey);
  const [model, setModel] = useState<string>(getStoredGeminiModel);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [serverAiInfo, setServerAiInfo] = useState<{ hasServerKey: boolean }>({ hasServerKey: false });

  useEffect(() => {
    if (isOpen) {
      checkServerAiStatus().then(res => setServerAiInfo(res));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Geminiサーバーに接続テスト中...');

    try {
      const endpoint = '/api/ai/chat';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: '夜市管理システムの接続テストです。「接続成功」とだけ返してください。',
          clientApiKey: apiKey.trim(),
          model
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      setTestStatus('success');
      setTestMessage('Gemini APIと正常に通信できました！（裏側サーバーまたはAPIキー経由）');
    } catch (err: any) {
      // フォールバック: 直接Google APIをテスト
      if (apiKey.trim()) {
        try {
          const directEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
          const directRes = await fetch(directEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: '接続テスト' }] }],
              generationConfig: { maxOutputTokens: 10 }
            })
          });
          if (directRes.ok) {
            setTestStatus('success');
            setTestMessage('Gemini APIと正常に直接通信できました！');
            return;
          }
        } catch {}
      }
      setTestStatus('error');
      setTestMessage(err.message || '接続に失敗しました。APIキーをご確認ください。');
    }
  };

  const handleSave = () => {
    setStoredGeminiApiKey(apiKey);
    setStoredGeminiModel(model);
    if (onSaved) onSaved();
    onClose();
  };

  const handleClear = () => {
    if (confirm('保存されているGemini APIキーを削除しますか？')) {
      setApiKey('');
      setStoredGeminiApiKey('');
      setTestStatus('idle');
      setTestMessage('');
      if (onSaved) onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950 sm:bg-slate-900 border-0 sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[92dvh] sm:max-h-[85vh]">
        {/* モーダルヘッダー */}
        <div className="px-4 py-3.5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-amber-500 p-0.5 shadow-lg shadow-indigo-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] sm:rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Gemini AI 設定
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Google AI
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                夜市運営の自動分析・連絡文面作成を設定
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* モーダル本文 */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* 裏側サーバーキー設定済みバナー */}
          {serverAiInfo.hasServerKey && (
            <div className="p-3 sm:p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 space-y-1 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Server className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>裏側サーバー（.env）でAPIキーが有効です</span>
              </div>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                プロジェクト設定（.env）から安全にAIが接続されています。ブラウザで個別にAPIキーを入力しなくても、AI機能が利用可能です。
              </p>
            </div>
          )}

          {/* APIキーの取得案内バナー */}
          <div className="p-3 sm:p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                Google AI Studioで無料キー取得
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 underline underline-offset-2 whitespace-nowrap shrink-0"
              >
                キー取得ページ
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Googleアカウントがあれば無料ですぐにAPIキーを発行できます。
              キーはブラウザ内（ローカル）にのみ安全に保存されます。
            </p>
          </div>

          {/* APIキー入力欄 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">
                Gemini API キー <span className="text-amber-400">*</span>
              </label>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  削除
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestStatus('idle');
                }}
                placeholder="AIzaSy..."
                className="w-full bg-slate-900 sm:bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-slate-600 font-mono tracking-wider transition pr-11"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              ※未設定の場合は、出店者データ連動の「デモモード」で動作します。
            </p>
          </div>

          {/* モデル選択 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              使用モデル
            </label>
            <div className="space-y-2">
              {AVAILABLE_MODELS.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border cursor-pointer transition ${
                    model === m.id
                      ? 'bg-indigo-950/40 border-indigo-500/80 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <input
                    type="radio"
                    name="gemini-model"
                    value={m.id}
                    checked={model === m.id}
                    onChange={(e) => setModel(e.target.value)}
                    className="mt-0.5 text-indigo-500 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white leading-tight">{m.name}</div>
                    <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-relaxed">{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 疎通確認テストボタンと結果表示 */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing' || !apiKey.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
              {testStatus === 'testing' ? '接続確認中...' : '接続テスト（疎通確認）'}
            </button>

            {testStatus === 'success' && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{testMessage}</span>
              </div>
            )}

            {testStatus === 'error' && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{testMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* モーダルフッター */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            設定を保存する
          </button>
        </div>
      </div>
    </div>
  );
};
