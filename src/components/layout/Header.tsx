import React, { useState } from 'react';
import { 
  Download, 
  AlertTriangle,
  FileSpreadsheet,
  Sparkles,
  Calendar,
  Building2,
  Store
} from 'lucide-react';
import { NightMarketEvent } from '../../types';
import { exportAllDataAsJson } from '../../utils/storage';

interface HeaderProps {
  event: NightMarketEvent;
  events?: NightMarketEvent[];
  onSelectEvent?: (eventId: string) => void;
  onUpdateEvent: (event: NightMarketEvent) => void;
  onClearAllData?: () => void;
  onLoadMockData?: () => void;
  onImportData: (json: string) => void;
  onOpenSpreadsheetImport: () => void;
  onNavigateToDashboard?: () => void;
  entryStats: {
    total: number;
    confirmed: number;
    fireCount: number;
    unpaidCount: number;
    warningCount: number;
    isAllEvent?: boolean;
    storeCount?: number;
    organizationCount?: number;
  };
}

export const Header: React.FC<HeaderProps> = ({
  event,
  events,
  onSelectEvent,
  onUpdateEvent,
  onImportData,
  onOpenSpreadsheetImport,
  onNavigateToDashboard,
  entryStats
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(event);
  const [logoFailed, setLogoFailed] = useState(false);

  const handleExport = () => {
    const data = exportAllDataAsJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `夜市出店管理バックアップ_${event.date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <header className="no-print bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-3 sm:px-4 lg:px-8 py-2 sm:py-3 transition-all shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
          {/* 上段: ロゴ・サイト名 & 右側アクションボタン */}
          <div className="w-full md:w-auto flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="flex items-center gap-2 sm:gap-3 text-left group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl p-0.5 transition"
                title="夜市全体のダッシュボードを開く"
              >
                {!logoFailed ? (
                  <img
                    src={`${import.meta.env.BASE_URL}logo.png`}
                    alt="たなべ夜市 ロゴ"
                    onError={() => setLogoFailed(true)}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain bg-white p-0.5 shadow-md border border-slate-700/80 flex-shrink-0 group-hover:scale-105 transition-all duration-200"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg shadow-md flex-shrink-0">
                    🏮
                  </div>
                )}
                <h1 className="text-base sm:text-xl font-black text-white tracking-wide group-hover:text-amber-300 transition-colors whitespace-nowrap">
                  夜市管理
                </h1>
              </button>

              {/* イベント切替セレクター */}
              {events && events.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2 py-1 shadow-sm max-w-[150px] sm:max-w-[220px]">
                  <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                  <select
                    value={event.id}
                    onChange={(e) => onSelectEvent?.(e.target.value)}
                    className="bg-transparent text-white font-bold text-[11px] sm:text-xs focus:outline-none cursor-pointer truncate w-full"
                    title="作業する夜市イベントを切り替える"
                  >
                    {events.map((ev) => {
                      const isAll = 
                        ev.id === 'event-all' || 
                        ev.name === '夜市全体' || 
                        ev.name.includes('出店者募集中') || 
                        ev.name.includes('募集中') || 
                        ev.name.trim() === '夜市' || 
                        !ev.date;

                      const cleanName = isAll
                        ? '夜市全体'
                        : ev.name
                            .replace(/[（(]出店者募集中[）)]/g, '')
                            .replace(/出店者募集中/g, '')
                            .replace(/[（(]募集中[）)]/g, '')
                            .replace(/募集中/g, '')
                            .trim() || '夜市全体';

                      const label = isAll
                        ? '夜市全体'
                        : (ev.date ? `${cleanName} (${ev.date})` : cleanName);

                      return (
                        <option key={ev.id} value={ev.id} className="bg-slate-900 text-white">
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* モバイル時に上段右側に並べるアクションボタン */}
            <div className="flex items-center gap-1.5 sm:hidden ml-auto">
              <button
                onClick={onOpenSpreadsheetImport}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition"
                title="Googleスプレッドシート連携"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>連携</span>
              </button>
              <button
                onClick={handleExport}
                title="保存"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          </div>

          {/* 中段: クイック統計インジケーター（モバイルでは横スクロールで1行に綺麗に収める） */}
          <div className="w-full md:w-auto flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs overflow-x-auto no-scrollbar py-0.5 justify-start md:justify-center">
            {entryStats.isAllEvent ? (
              <>
                <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  <span>店舗: <strong className="text-white font-semibold">{entryStats.storeCount ?? (entryStats.total - (entryStats.organizationCount ?? 0))}</strong></span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/70 text-emerald-300 whitespace-nowrap shrink-0">
                  <Building2 className="w-3 h-3 text-emerald-400" />
                  <span>団体: <strong className="text-white font-semibold">{entryStats.organizationCount ?? 0}</strong></span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span>出店: <strong className="text-white font-semibold">{entryStats.total}店舗</strong></span>
              </div>
            )}
            {entryStats.fireCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                <span>火気: <strong className="text-red-400 font-semibold">{entryStats.fireCount}</strong></span>
              </div>
            )}
            {entryStats.warningCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-300 whitespace-nowrap shrink-0">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>要注意: <strong>{entryStats.warningCount}</strong></span>
              </div>
            )}
          </div>

          {/* PC・タブレット用右側アクションボタン（モバイルでは上段にコンパクト配置済みのためhidden sm:flex） */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
            {/* Googleスプレッドシート連携・自動記入 */}
            <button
              onClick={onOpenSpreadsheetImport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20 transition"
              title="GoogleスプレッドシートのURLから出店者・エントリー情報を自動記入"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>スプレッドシート連携</span>
            </button>

            {/* 保存 */}
            <button
              onClick={handleExport}
              title="データをJSONファイルとして保存"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>保存</span>
            </button>
          </div>
        </div>
      </header>

      {/* イベント開催情報編集モーダル */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                夜市開催情報の編集
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">夜市イベント名</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              {editForm.name !== '夜市全体' && !editForm.name.includes('出店者募集中') && editForm.id !== 'event-all' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">開催日</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">開催時間</label>
                    <input
                      type="text"
                      value={editForm.time}
                      onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-slate-400 text-xs">
                  ※「夜市全体」はすべての出店者名簿を包括するポータルのため、特定の日程はありません。
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300">
                キャンセル
              </button>
              <button
                onClick={() => {
                  onUpdateEvent(editForm);
                  setIsEditModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                変更を保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
