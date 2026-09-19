import React, { useState } from 'react';
import { 
  DollarSign, 
  Flame, 
  Users, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Printer,
  FileText,
  ShieldAlert,
  Zap,
  Calendar as CalendarIcon,
  Store,
  Building2,
  ExternalLink
} from 'lucide-react';
import { NightMarketEvent, EventEntry, Vendor, isVendorOrganization } from '../../types';
import { ActiveTab, VendorSubTab } from '../layout/Navigation';
import { InstagramBadge } from '../../utils/instagram';

interface DashboardViewProps {
  event: NightMarketEvent;
  entries: EventEntry[];
  vendors: Vendor[];
  allEvents?: NightMarketEvent[];
  onSelectEvent?: (eventId: string) => void;
  setActiveTab: (tab: ActiveTab | VendorSubTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  event,
  entries,
  vendors,
  allEvents,
  onSelectEvent,
  setActiveTab
}) => {
  const isAllEvent = 
    event.name === '夜市全体' || 
    event.id === 'event-all' || 
    event.name.includes('出店者募集中') || 
    event.name.includes('募集中') || 
    event.name.trim() === '夜市';

  // 統計計算
  const totalRevenue = entries.reduce((sum, e) => sum + e.fee.totalAmount, 0);
  const paidRevenue = entries
    .filter((e) => e.fee.paymentStatus === 'paid')
    .reduce((sum, e) => sum + e.fee.totalAmount, 0);
  const collectionRate = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;
  const unpaidEntries = entries.filter((e) => e.fee.paymentStatus !== 'paid');

  const fireEntries = entries.filter((e) => e.fireSafety.hasFireAppliance);
  const checkedFireEntries = fireEntries.filter((e) => e.fireSafety.checkedByStaff);
  const totalFireAppliances = fireEntries.reduce(
    (sum, e) => sum + e.fireSafety.appliances.reduce((aSum, a) => aSum + a.count, 0),
    0
  );

  const bannedVendors = vendors.filter((v) => v.status === 'banned');
  const warningVendors = vendors.filter((v) => v.status === 'warning');

  // 店舗・登録団体の分類
  const [vendorTypeFilter, setVendorTypeFilter] = useState<'all' | 'store' | 'organization'>('all');
  const organizationVendors = vendors.filter(isVendorOrganization);
  const storeVendors = vendors.filter((v) => !isVendorOrganization(v));

  // 現在のエントリーの中に要注意または出禁の店舗が含まれているか
  const problematicEntries = entries.filter((e) => {
    const v = vendors.find((v) => v.id === e.vendorId);
    return v?.status === 'banned' || v?.status === 'warning';
  });

  const fireHandlingVendors = vendors.filter(
    (v) => v.category === 'food' || v.category === 'kitchen_car' || v.tags.some((t) => t.includes('火気'))
  );

  const issuedPermitCount = entries.filter((e) => e.permitIssued).length;

  return (
    <div className="space-y-6">


      {/* 出禁・要注意出店者アラート（該当がある場合） */}
      {!isAllEvent && problematicEntries.length > 0 && (
        <div className="bg-amber-950/40 border-2 border-amber-600/70 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
              <ShieldAlert className="w-7 h-7 animate-bounce" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                <span>【重要警告】要注意または出禁指定の出店者がエントリーに含まれています！</span>
              </h3>
              <p className="text-xs text-amber-200/80 mt-1">
                過去のトラブル（火気規則違反、無断キャンセル、油流し等）の履歴がある出店者です。許可証発行前に誓約書の受領や現地確認を徹底してください。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {problematicEntries.map((e) => (
                  <span
                    key={e.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                      e.vendorSnapshot.status === 'banned'
                        ? 'bg-red-500/30 text-red-300 border border-red-500/60'
                        : 'bg-amber-500/30 text-amber-200 border border-amber-500/60'
                    }`}
                  >
                    <span>[{e.boothNumber}] {e.vendorSnapshot.name}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-black/40">
                      {e.vendorSnapshot.status === 'banned' ? '出禁' : '要注意'}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setActiveTab('vendor-list')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition"
            >
              詳細を確認
            </button>
          </div>
        </div>
      )}

      {/* 5つの主要メトリクスカード（夜市全体） */}
      {isAllEvent ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* 1. 全登録店舗 */}
          <div 
            onClick={() => setActiveTab('vendor-list')}
            className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl cursor-pointer transition shadow-lg group relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400">登録店舗マスター</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {storeVendors.length}
                <span className="text-sm font-normal text-slate-400 ml-1">店舗</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                飲食店・キッチンカー・物販等
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
              <span>一般出店者</span>
              <span className="text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform font-semibold">
                店舗一覧へ <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 2. 登録団体（新規追加） */}
          <div 
            onClick={() => {
              setActiveTab('vendor-list');
              setVendorTypeFilter('organization');
            }}
            className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl cursor-pointer transition shadow-lg group relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400">登録団体マスター</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {organizationVendors.length}
                <span className="text-sm font-normal text-slate-400 ml-1">団体</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                地域連携・協力団体
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
              <span>地域連携・協力枠</span>
              <span className="text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform font-semibold">
                団体一覧へ <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 3. 消防・火気取扱 */}
          <div 
            onClick={() => setActiveTab('fire')}
            className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-orange-500/50 p-4 rounded-2xl cursor-pointer transition shadow-lg group relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400">火気取扱店舗（通算）</span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-slate-950 transition">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {fireHandlingVendors.length}
                <span className="text-sm font-normal text-slate-400 ml-1">/ {vendors.length}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                ガス・炭火・電気フライヤー
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
              <span>消火器・保安点検</span>
              <span className="text-orange-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform font-semibold">
                消防管理へ <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 4. 出禁・要注意管理 */}
          <div 
            onClick={() => setActiveTab('vendor-list')}
            className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-red-500/50 p-4 rounded-2xl cursor-pointer transition shadow-lg group relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400">出禁・要注意指定</span>
              <div className="p-2 rounded-xl bg-red-500/10 text-red-400 group-hover:bg-red-500 group-hover:text-slate-950 transition">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {bannedVendors.length + warningVendors.length}
                <span className="text-sm font-normal text-slate-400 ml-1">件該当</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span className="px-1.5 py-0.2 rounded bg-red-950/80 text-red-300 font-bold border border-red-800 text-[10px]">
                  出禁: {bannedVendors.length}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 font-bold border border-amber-800 text-[10px]">
                  要注意: {warningVendors.length}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
              <span>自動照合機能ON</span>
              <span className="text-red-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform font-semibold">
                リスト管理へ <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 5. 登録夜市イベント数 */}
          <div 
            onClick={() => setActiveTab('calendar')}
            className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 p-4 rounded-2xl cursor-pointer transition shadow-lg group relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400">開催イベント一覧</span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950 transition">
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {allEvents ? allEvents.filter(e => e.id !== 'event-all' && e.name !== '夜市全体' && !e.name.includes('出店者募集中') && !e.name.includes('募集中') && e.name.trim() !== '夜市' && !!e.date).length : 0}
                <span className="text-sm font-normal text-slate-400 ml-1">回 登録済</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                日程ごとの出店ブース管理
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
              <span>カレンダー・日程</span>
              <span className="text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform font-semibold">
                カレンダーへ <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. 金額・売上管理 */}
          <div 
            onClick={() => setActiveTab('management')}
            className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl cursor-pointer transition shadow-lg group relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400">出店料・入金状況</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                ¥{paidRevenue.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 ml-1">/ ¥{totalRevenue.toLocaleString()}</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">回収率</span>
                  <span className="font-bold text-emerald-400">{collectionRate}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${collectionRate}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
              <span>未入金: <strong className={unpaidEntries.length > 0 ? "text-rose-400" : "text-slate-300"}>{unpaidEntries.length}店舗</strong></span>
              <span className="text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                管理へ <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 2. 消防書類・火気 */}
          <div 
            onClick={() => setActiveTab('fire')}
            className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-orange-500/50 p-5 rounded-2xl cursor-pointer transition shadow-lg group relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400">消防・火気器具管理</span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-slate-950 transition">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {fireEntries.length}
                <span className="text-sm font-normal text-slate-400 ml-1">店舗 / 計{totalFireAppliances}器具</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">消防台帳・点検完了</span>
                  <span className="font-bold text-orange-400">{checkedFireEntries.length} / {fireEntries.length}店</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${fireEntries.length > 0 ? (checkedFireEntries.length / fireEntries.length) * 100 : 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
              <span>提出PDFまとめ対応済</span>
              <span className="text-orange-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                消防へ <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 3. 出店者リスト・出禁管理 */}
          <div 
            onClick={() => setActiveTab('vendor-list')}
            className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl cursor-pointer transition shadow-lg group relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400">出店者名簿・出禁リスト</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {vendors.length}
                <span className="text-sm font-normal text-slate-400 ml-1">登録店舗</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs bg-red-950/80 border border-red-800 text-red-300 font-bold">
                  出禁: {bannedVendors.length}件
                </span>
                <span className="px-2 py-0.5 rounded text-xs bg-amber-950/80 border border-amber-800 text-amber-300 font-bold">
                  要注意: {warningVendors.length}件
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
              <span>新規受付時の自動判定ON</span>
              <span className="text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                リストへ <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 4. 出店者許可証 */}
          <div 
            onClick={() => setActiveTab('permit')}
            className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 p-5 rounded-2xl cursor-pointer transition shadow-lg group relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400">当日出店許可証</span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950 transition">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {issuedPermitCount}
                <span className="text-sm font-normal text-slate-400 ml-1">/ {entries.length} 発行済</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">発行進捗</span>
                  <span className="font-bold text-sky-400">{entries.length > 0 ? Math.round((issuedPermitCount / entries.length) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${entries.length > 0 ? (issuedPermitCount / entries.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
              <span>全ブース一括PDF印刷</span>
              <span className="text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                許可証へ <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 下部コンテンツエリア */}
      {isAllEvent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 過去の全出店者・登録団体一覧 */}
          <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  全出店者・登録団体名簿一覧 ({vendors.length}件)
                </h3>
                {/* 区分フィルター */}
                <div className="inline-flex rounded-xl bg-slate-800/80 p-0.5 border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setVendorTypeFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      vendorTypeFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    すべて ({vendors.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVendorTypeFilter('store')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      vendorTypeFilter === 'store'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    店舗 ({storeVendors.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVendorTypeFilter('organization')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      vendorTypeFilter === 'organization'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    登録団体 ({organizationVendors.length})
                  </button>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('vendor-list')}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold shrink-0"
              >
                出店者・団体名簿の検索・編集 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-800 max-h-[480px] overflow-y-auto pr-1">
              {vendors
                .filter((v) => {
                  if (vendorTypeFilter === 'store') return !isVendorOrganization(v);
                  if (vendorTypeFilter === 'organization') return isVendorOrganization(v);
                  return true;
                })
                .map((v) => {
                  const isOrg = isVendorOrganization(v);
                  return (
                    <div 
                      key={v.id} 
                      className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 rounded-xl transition ${
                        isOrg 
                          ? 'bg-emerald-950/20 border-l-4 border-l-emerald-500 hover:bg-emerald-950/35' 
                          : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{v.name}</span>
                          {isOrg ? (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black shadow-sm shadow-emerald-500/20 inline-flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-950" />
                              登録団体
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 font-semibold border border-blue-800/60 inline-flex items-center gap-1">
                              <Store className="w-2.5 h-2.5" />
                              店舗
                            </span>
                          )}
                          {v.status === 'banned' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-600 text-white font-bold">出禁</span>
                          )}
                          {v.status === 'warning' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500 text-black font-bold">要注意</span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                            {v.category === 'kitchen_car' ? 'キッチンカー' : v.category === 'food' ? '飲食露店' : v.category === 'drink' ? 'ドリンク' : v.category === 'goods' ? '物販' : v.category === 'game' ? '縁日' : 'その他'}
                          </span>
                          {/* Instagram 直接表示（詳細を見なくてもワンクリックで閲覧可能） */}
                          {v.instagram && (
                            <InstagramBadge instagram={v.instagram} vendorName={v.name} size="xs" />
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>代表: {v.ownerName}</span>
                          <span>TEL: {v.phone}</span>
                          {v.menuItems && <span>品目: {v.menuItems}</span>}
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-amber-400 block">
                          参加 {v.pastParticipationCount}回
                        </span>
                        <span className="text-[10px] text-slate-400">名簿登録済</span>
                      </div>
                    </div>
                  );
                })}
              {vendors.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  まだ出店者が登録されていません。上部の「スプレッドシート連携」等から取り込めます。
                </div>
              )}
            </div>
          </div>

          {/* 右側クイックアクション */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-400" />
                夜市全体の管理メニュー
              </h3>

              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('vendor-list')}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/60 transition group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-white">出店者名簿・出禁リスト</div>
                      <div className="text-xs text-slate-400">過去の全出店者を検索・新規追加・編集</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
                </button>

                <button
                  onClick={() => setActiveTab('calendar')}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-sky-500/60 transition group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950 transition">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-white">イベント・カレンダー</div>
                      <div className="text-xs text-slate-400">各回の開催日を確認・新規作成・切替</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-400 group-hover:translate-x-1 transition" />
                </button>

                <button
                  onClick={() => setActiveTab('fire')}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-orange-500/60 transition group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-slate-950 transition">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-white">消防安全・器具管理</div>
                      <div className="text-xs text-slate-400">火気器具・消火器の安全確認状況</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-400 group-hover:translate-x-1 transition" />
                </button>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-slate-800/30 border border-slate-800 text-xs text-slate-400">
              <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                自動バックアップ有効
              </div>
              全データはブラウザのローカル環境に自動保存されています。
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ブース配置概要 */}
          <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                出店内容別ブース一覧 ({entries.length}ブース)
              </h3>
              <button
                onClick={() => setActiveTab('management')}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                配置・金額編集 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {event.areas.map((area) => {
                const areaEntries = entries.filter((e) => e.boothArea === area.code);
                return (
                  <div key={area.code} className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm text-slate-200">{area.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">
                        {areaEntries.length}店
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-1">{area.description}</p>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {areaEntries.map((e) => (
                        <span
                          key={e.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${
                            e.fireSafety.hasFireAppliance
                              ? 'bg-orange-950/40 border-orange-700/60 text-orange-200'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                          title={`${e.vendorSnapshot.name} (${e.fee.totalAmount.toLocaleString()}円)`}
                        >
                          <strong className="font-mono text-amber-400">{e.boothNumber}</strong>
                          <span className="truncate max-w-[100px]">{e.vendorSnapshot.name}</span>
                          {e.fireSafety.hasFireAppliance && (
                            <Flame className="w-3 h-3 text-red-400 flex-shrink-0" />
                          )}
                        </span>
                      ))}
                      {areaEntries.length === 0 && (
                        <span className="text-xs text-slate-400 italic">配置なし</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* クイックアクションパネル */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-400" />
                ワンクリック一括処理
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('fire')}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-800/80 hover:bg-orange-950/40 border border-slate-700 hover:border-orange-500/60 transition group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-slate-950 transition">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-white">消防書類を1本にPDF結合</div>
                      <div className="text-xs text-slate-400">消防署届出用の一括まとめPDF作成</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-400 group-hover:translate-x-1 transition" />
                </button>

                <button
                  onClick={() => setActiveTab('permit')}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-800/80 hover:bg-sky-950/40 border border-slate-700 hover:border-sky-500/60 transition group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950 transition">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-white">出店許可証の一括PDF印刷</div>
                      <div className="text-xs text-slate-400">当日ブース掲示用の許可札を一括出力</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-400 group-hover:translate-x-1 transition" />
                </button>

                <button
                  onClick={() => setActiveTab('vendor-list')}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-800/80 hover:bg-amber-950/40 border border-slate-700 hover:border-amber-500/60 transition group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-white">出禁・ブラックリスト照合</div>
                      <div className="text-xs text-slate-400">過去トラブル履歴の管理・新規確認</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
                </button>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-slate-800/30 border border-slate-800 text-xs text-slate-400">
              <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                自動バックアップ有効
              </div>
              編集内容はブラウザのLocalStorageに常時自動保存されます。
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
