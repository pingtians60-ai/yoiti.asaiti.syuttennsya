import React, { useState } from 'react';
import { Cloud, FileSpreadsheet, Database, X } from 'lucide-react';
import { SupabaseSyncModal } from './SupabaseSyncModal';
import { GoogleSheetsSyncModal } from './GoogleSheetsSyncModal';
import { NightMarketEvent, Vendor, EventEntry } from '../../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: NightMarketEvent[];
  vendors: Vendor[];
  entries: EventEntry[];
  isSupabaseConnected: boolean;
  onRefreshDataFromCloud: () => Promise<void>;
  onConnectionStatusChange: () => void;
  onVendorsLoaded: (vendors: Vendor[]) => void;
  onEventsLoaded?: (events: NightMarketEvent[]) => void;
  onSyncSuccess?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  events,
  vendors,
  entries,
  isSupabaseConnected,
  onRefreshDataFromCloud,
  onConnectionStatusChange,
  onVendorsLoaded,
  onEventsLoaded,
  onSyncSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'sheets'>('sheets');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* モーダル共通ヘッダー */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                クラウド・データベース連携
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                外部のクラウドサービスと連携して、データを安全に保存・共有します
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

        {/* サービス切り替えタブ */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 sm:px-6 z-10">
          <button
            onClick={() => setActiveTab('sheets')}
            className={`py-3.5 px-5 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'sheets'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Google スプレッドシート連携</span>
          </button>
          
          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-3.5 px-5 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'supabase'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Supabase 高度な連携</span>
          </button>
        </div>

        {/* コンテンツエリア (各コンポーネントを表示) */}
        <div className="flex-1 overflow-y-auto bg-slate-950/30 relative">
          <div className={activeTab === 'sheets' ? 'block p-4' : 'hidden'}>
            <GoogleSheetsSyncModal
              isOpen={true} // 内側の非表示処理を無効化
              onClose={onClose}
              vendors={vendors}
              onVendorsLoaded={onVendorsLoaded}
              events={events}
              onEventsLoaded={onEventsLoaded}
              onSyncSuccess={onSyncSuccess}
            />
          </div>
          <div className={activeTab === 'supabase' ? 'block p-4' : 'hidden'}>
            <SupabaseSyncModal
              isOpen={true} // 内側の非表示処理を無効化
              onClose={onClose}
              events={events}
              vendors={vendors}
              entries={entries}
              isConnected={isSupabaseConnected}
              onRefreshDataFromCloud={onRefreshDataFromCloud}
              onConnectionStatusChange={onConnectionStatusChange}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
