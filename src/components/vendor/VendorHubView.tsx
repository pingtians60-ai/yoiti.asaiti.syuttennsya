import React from 'react';
import { 
  Store, 
  Flame, 
  Users, 
  Award 
} from 'lucide-react';
import { NightMarketEvent, Vendor, EventEntry } from '../../types';
import { VendorSubTab } from '../layout/Navigation';
import { BoothManagementView } from '../management/BoothManagementView';
import { FireSafetyView } from '../fire/FireSafetyView';
import { VendorListView } from '../vendor-list/VendorListView';
import { PermitView } from '../permit/PermitView';

interface VendorHubViewProps {
  event: NightMarketEvent;
  entries: EventEntry[];
  vendors: Vendor[];
  onUpdateEntries: (entries: EventEntry[]) => void;
  onUpdateVendors: (vendors: Vendor[]) => void;
  activeSubTab: VendorSubTab;
  onSubTabChange: (tab: VendorSubTab) => void;
  unpaidCount: number;
  fireDocIncompleteCount: number;
  bannedWarningCount: number;
  unissuedPermitCount: number;
}

export const VendorHubView: React.FC<VendorHubViewProps> = ({
  event,
  entries,
  vendors,
  onUpdateEntries,
  onUpdateVendors,
  activeSubTab,
  onSubTabChange,
  unpaidCount,
  fireDocIncompleteCount,
  bannedWarningCount,
  unissuedPermitCount
}) => {
  const isAllEvent = 
    event.name === '夜市全体' || 
    event.id === 'event-all' || 
    event.name.includes('出店者募集中') || 
    event.name.includes('募集中') || 
    event.name.trim() === '夜市';

  const allSubTabs: {
    id: VendorSubTab;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'management',
      label: '出店・ブース管理',
      description: 'ブース配置・料金計算・入金管理',
      icon: Store,
      badge: unpaidCount > 0 ? unpaidCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'fire',
      label: '消防・火気安全',
      description: '火気器具・燃料・消火器・提出書類',
      icon: Flame,
      badge: fireDocIncompleteCount > 0 ? fireDocIncompleteCount : undefined,
      badgeColor: 'bg-orange-500 text-white',
    },
    {
      id: 'vendor-list',
      label: '出店者名簿',
      description: '全出店者名簿・出禁/要注意・参加履歴',
      icon: Users,
      badge: bannedWarningCount > 0 ? bannedWarningCount : undefined,
      badgeColor: 'bg-amber-500 text-black',
    },
    {
      id: 'permit',
      label: '出店許可証',
      description: '許可証自動発行・印刷・PDF',
      icon: Award,
      badge: unissuedPermitCount > 0 ? unissuedPermitCount : undefined,
      badgeColor: 'bg-emerald-500 text-white',
    },
  ];

  // 「出店・ブース管理」は「夜市全体」にのみ含める
  const subTabs = isAllEvent
    ? allSubTabs
    : allSubTabs.filter((t) => t.id !== 'management');

  // 個別イベント選択時に「出店・ブース管理」が開かれていた場合は「消防・火気安全」へ自動遷移
  React.useEffect(() => {
    if (!isAllEvent && activeSubTab === 'management') {
      onSubTabChange('fire');
    }
  }, [isAllEvent, activeSubTab, onSubTabChange]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 出店者サブナビゲーション */}
      <div className="no-print bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-xl flex items-center gap-2 overflow-x-auto no-scrollbar">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSubTabChange(tab.id)}
              className={`flex-1 min-w-[170px] flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black leading-tight shrink-0 ${tab.badgeColor}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* サブビューのレンダリング */}
      <div>
        {activeSubTab === 'management' && isAllEvent && (
          <BoothManagementView
            event={event}
            entries={entries}
            vendors={vendors}
            onUpdateEntries={onUpdateEntries}
            onUpdateVendors={onUpdateVendors}
          />
        )}

        {activeSubTab === 'fire' && (
          <FireSafetyView
            event={event}
            entries={entries}
            vendors={vendors}
            onUpdateEntries={onUpdateEntries}
            onUpdateVendors={onUpdateVendors}
          />
        )}

        {activeSubTab === 'vendor-list' && (
          <VendorListView
            event={event}
            entries={entries}
            vendors={vendors}
            onUpdateEntries={onUpdateEntries}
            onUpdateVendors={onUpdateVendors}
          />
        )}

        {activeSubTab === 'permit' && (
          <PermitView
            event={event}
            entries={entries}
            onUpdateEntries={onUpdateEntries}
          />
        )}
      </div>
    </div>
  );
};
