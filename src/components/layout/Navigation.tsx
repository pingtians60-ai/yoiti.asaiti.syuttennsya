import React from 'react';
import { 
  LayoutDashboard, 
  Calendar,
  Store, 
  Users
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'calendar' | 'management' | 'vendor';
export type VendorSubTab = 'management' | 'fire' | 'vendor-list' | 'permit';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unpaidCount: number;
  fireDocIncompleteCount: number;
  bannedWarningCount: number;
  unissuedPermitCount: number;
  isAllEvent?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  unpaidCount,
  fireDocIncompleteCount,
  bannedWarningCount,
  unissuedPermitCount,
  isAllEvent = false
}) => {
  const totalVendorAlerts = unpaidCount + fireDocIncompleteCount + bannedWarningCount;

  const allNavItems: {
    id: ActiveTab;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'ダッシュボード',
      description: '開催概要・売上・回収状況',
      icon: LayoutDashboard,
    },
    {
      id: 'calendar',
      label: 'イベント・カレンダー',
      description: '開催日程・イベント切替・出店者確認',
      icon: Calendar,
    },
    ...(!isAllEvent
      ? [
          {
            id: 'management' as ActiveTab,
            label: '出店・ブース管理',
            description: '当日のブース配置・出店料・入金管理',
            icon: Store,
            badge: unpaidCount > 0 ? unpaidCount : undefined,
            badgeColor: 'bg-rose-500 text-white',
          },
        ]
      : []),
    {
      id: 'vendor',
      label: isAllEvent ? '出店者・登録団体' : '出店者',
      description: isAllEvent ? '出店店舗・登録団体名簿・出禁リスト' : '出店者名簿・消防・許可証',
      icon: Users,
      badge: totalVendorAlerts > 0 ? totalVendorAlerts : undefined,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
  ];

  const navItems = allNavItems;

  return (
    <nav className="no-print bg-slate-900/80 border-b border-slate-800/80 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-start sm:justify-center gap-3 py-2.5 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/60 shadow-lg shadow-amber-500/10 scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 border-slate-300 dark:border-slate-800/60'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition ${isActive ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'bg-slate-800 text-slate-400'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="tracking-wide text-sm">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black leading-tight shadow-sm ${item.badgeColor}`} title={`未完了・要注意項目: ${item.badge}件`}>
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
