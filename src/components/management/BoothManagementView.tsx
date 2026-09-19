import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  DollarSign, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileSpreadsheet, 
  Edit2, 
  Trash2, 
  AlertTriangle,
  Zap,
  Trash,
  Check,
  Building,
  Lock,
  Unlock,
  Flame,
  User,
  Store,
  Eye,
  ExternalLink,
  Building2
} from 'lucide-react';
import { EventEntry, NightMarketEvent, Vendor, BoothArea, PaymentStatus, isVendorOrganization } from '../../types';
import { Instagram, getInstagramUrl, getInstagramHandle, InstagramBadge } from '../../utils/instagram';
import { VendorDetailModal } from '../vendor-list/VendorDetailModal';
import { VendorEditModal } from '../vendor-list/VendorEditModal';

interface BoothManagementViewProps {
  event: NightMarketEvent;
  entries: EventEntry[];
  vendors: Vendor[];
  onUpdateEntries: (entries: EventEntry[]) => void;
  onUpdateVendors?: (vendors: Vendor[]) => void;
}

export const BoothManagementView: React.FC<BoothManagementViewProps> = ({
  event,
  entries,
  vendors,
  onUpdateEntries,
  onUpdateVendors
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('ALL');
  const [selectedVendorForDetail, setSelectedVendorForDetail] = useState<Vendor | null>(null);
  const [selectedEntryForDetail, setSelectedEntryForDetail] = useState<EventEntry | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<'info' | 'fire' | 'permit'>('info');
  const [editingEntry, setEditingEntry] = useState<EventEntry | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteUnlocked, setIsDeleteUnlocked] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<EventEntry | null>(null);

  // フィルター
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = 
      entry.vendorSnapshot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.boothNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.vendorSnapshot.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = selectedArea === 'ALL' || entry.boothArea === selectedArea;
    const matchesPayment = selectedPaymentStatus === 'ALL' || entry.fee.paymentStatus === selectedPaymentStatus;
    return matchesSearch && matchesArea && matchesPayment;
  });

  // 売上合計
  const totalAmount = filteredEntries.reduce((sum, e) => sum + e.fee.totalAmount, 0);
  const paidAmount = filteredEntries
    .filter((e) => e.fee.paymentStatus === 'paid')
    .reduce((sum, e) => sum + e.fee.totalAmount, 0);

  // CSVエクスポート
  const handleExportCsv = () => {
    const headers = [
      'ブース番号',
      '出店内容',
      '屋号',
      '代表者名',
      '電話番号',
      '基本料金',
      '電源利用',
      '電源料',
      'ゴミ回収料',
      '備品レンタル',
      '割引',
      '合計金額',
      '入金状況',
      '入金日',
      '領収書発行'
    ];

    const rows = entries.map((e) => [
      e.boothNumber,
      event.areas.find((a) => a.code === e.boothArea)?.name || e.boothArea,
      `"${e.vendorSnapshot.name.replace(/"/g, '""')}"`,
      `"${e.vendorSnapshot.ownerName.replace(/"/g, '""')}"`,
      e.vendorSnapshot.phone,
      e.fee.baseFee,
      e.fee.powerOption ? 'あり' : 'なし',
      e.fee.powerFee,
      e.fee.garbageFee,
      e.fee.equipmentRentalFee,
      e.fee.discount,
      e.fee.totalAmount,
      e.fee.paymentStatus === 'paid' ? '入金済' : e.fee.paymentStatus === 'billed' ? '請求済' : '未請求',
      e.fee.paidAt || '',
      e.fee.receiptIssued ? '発行済' : '未発行'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `夜市出店場所・金額台帳_${event.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 料金の自動再計算
  const recalculateFee = (fee: EventEntry['fee']): EventEntry['fee'] => {
    const total = 
      (Number(fee.baseFee) || 0) + 
      (fee.powerOption ? (Number(fee.powerFee) || 0) : 0) + 
      (fee.garbageOption ? (Number(fee.garbageFee) || 0) : 0) + 
      (Number(fee.equipmentRentalFee) || 0) - 
      (Number(fee.discount) || 0);
    return {
      ...fee,
      totalAmount: Math.max(0, total)
    };
  };

  // 入金ステータスのトグル
  const handleTogglePayment = (entry: EventEntry) => {
    const newStatus: PaymentStatus = entry.fee.paymentStatus === 'paid' ? 'billed' : 'paid';
    const updatedEntries = entries.map((e) => {
      if (e.id === entry.id) {
        return {
          ...e,
          fee: {
            ...e.fee,
            paymentStatus: newStatus,
            paidAt: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined
          }
        };
      }
      return e;
    });
    onUpdateEntries(updatedEntries);
  };

  // 削除
  const handleConfirmDelete = () => {
    if (entryToDelete) {
      onUpdateEntries(entries.filter((e) => e.id !== entryToDelete.id));
      setEntryToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 上部サマリーバー */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            出店管理（ブース配置場所・出店金額・入金）
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            各店舗のブース番号、基本料金、電源・ゴミ等のオプション料金の自動計算、入金状況を一元管理します。
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
          <div className="text-right px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-[11px] text-slate-400 block">現在の請求合計 / 入金済</span>
            <span className="text-lg font-black text-white font-mono">
              ¥{paidAmount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ ¥{totalAmount.toLocaleString()}</span>
            </span>
          </div>

          {/* 削除ロック・保護スイッチ */}
          <button
            onClick={() => setIsDeleteUnlocked(!isDeleteUnlocked)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
              isDeleteUnlocked
                ? 'bg-rose-950/80 text-rose-300 border-rose-600 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title={isDeleteUnlocked ? "クリックして削除をロック（保護）" : "クリックして削除可能モードに切り替え"}
          >
            {isDeleteUnlocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-rose-400" />
                <span>⚠️ 削除可能モード</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>🔒 削除保護中</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            CSV出力
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            ブース新規追加
          </button>
        </div>
      </div>

      {/* 出店・ブース管理案内バー */}
      <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
        <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
          <Store className="w-5 h-5" />
        </div>
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white font-bold block mb-0.5">{event.name} 出店・ブース管理</strong>
          {event.name}の出店ブース配置・出店内容（屋外出店・飲食露店・キッチンカー）・出店料計算・入金状況を一元管理します。
        </div>
      </div>

      {/* 検索・フィルターバー */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="屋号・ブース番号・代表者で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* 出店内容選択 */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">全ての出店内容</option>
            {event.areas.map((a) => (
              <option key={a.code} value={a.code}>{a.name}</option>
            ))}
          </select>

          {/* 入金ステータス選択 */}
          <select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">全ての入金状態</option>
            <option value="paid">入金済み</option>
            <option value="billed">請求中 (未入金)</option>
            <option value="unbilled">未請求</option>
          </select>

          <span className="text-xs text-slate-400 ml-2 whitespace-nowrap">
            該当: <strong className="text-white">{filteredEntries.length}件</strong>
          </span>
        </div>
      </div>

      {/* ブース一覧テーブル */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">場所 / ブース</th>
                <th className="py-3 px-4">屋号・代表者</th>
                <th className="py-3 px-4">使用火気・燃料</th>
                <th className="py-3 px-4">基本料金</th>
                <th className="py-3 px-4">電源・オプション</th>
                <th className="py-3 px-4">合計出店料</th>
                <th className="py-3 px-4">入金状況</th>
                <th className="py-3 px-4">注意事項 / 状態</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEntries.map((entry) => {
                const isPaid = entry.fee.paymentStatus === 'paid';
                const isBanned = entry.vendorSnapshot.status === 'banned';
                const isWarning = entry.vendorSnapshot.status === 'warning';
                const vendorInsta = entry.vendorSnapshot.instagram || vendors.find(v => v.id === entry.vendorId)?.instagram;
                const fullVendor = vendors.find(v => v.id === entry.vendorId || v.id === entry.vendorSnapshot.id) || entry.vendorSnapshot;
                const isOrg = isVendorOrganization(fullVendor);

                return (
                  <tr 
                    key={entry.id} 
                    onClick={() => {
                      setSelectedVendorForDetail(fullVendor);
                      setSelectedEntryForDetail(entry);
                      setDetailInitialTab('info');
                    }}
                    className={`cursor-pointer hover:bg-slate-800/60 transition group/row ${
                      isBanned ? 'bg-red-950/20' : isWarning ? 'bg-amber-950/20' : isOrg ? 'bg-emerald-950/15' : ''
                    }`}
                    title="クリックしてこの出店者の詳細（基本情報・消防・許可証）を表示"
                  >
                    {/* ブース番号・出店内容 */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-mono font-black text-sm border border-amber-500/40">
                          {entry.boothNumber}
                        </span>
                        <span className="text-[11px] text-slate-300 font-medium">
                          {event.areas.find(a => a.code === entry.boothArea)?.name || entry.boothArea}
                        </span>
                      </div>
                    </td>

                    {/* 屋号・代表者（出店者について書いている枠） */}
                    <td className="py-2.5 px-3">
                      <div className={`p-2.5 rounded-xl border transition-all ${
                        isOrg
                          ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-900/90 ring-1 ring-emerald-500/30 shadow-sm'
                          : 'border-slate-700/60 bg-slate-900/80 group-hover/row:border-amber-500/60 group-hover/row:bg-slate-850 group-hover/row:shadow-md'
                      }`}>
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="font-bold text-slate-100 text-sm flex items-center gap-1.5 flex-wrap group-hover/row:text-amber-300 transition-colors">
                            {isOrg && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] inline-flex items-center gap-1 shadow-sm shrink-0">
                                <Building2 className="w-2.5 h-2.5 text-slate-950" />
                                登録団体
                              </span>
                            )}
                            <span>{entry.vendorSnapshot.name}</span>
                            {isBanned && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-600 text-white font-bold animate-pulse">
                                出禁
                              </span>
                            )}
                            {isWarning && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500 text-black font-bold">
                                要注意
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-normal border border-amber-500/30 group-hover/row:bg-amber-500 group-hover/row:text-slate-950 transition-all shrink-0">
                            詳細 ↗
                          </span>
                        </div>
                        {isOrg && fullVendor.organizationName && (
                          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>所属: {fullVendor.organizationName}</span>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                          <span className="text-slate-400">代表:</span>
                          <strong>{entry.vendorSnapshot.ownerName}</strong>
                          <span className="text-slate-500">({entry.vendorSnapshot.phone || '電話なし'})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                          <span className="text-slate-500">品目:</span> {entry.vendorSnapshot.menuItems || '未設定'}
                        </div>
                        {vendorInsta && (
                          <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center">
                            <InstagramBadge instagram={vendorInsta} vendorName={entry.vendorSnapshot.name} size="xs" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 使用火気・燃料 */}
                    <td className="py-3 px-4 min-w-[200px]">
                      {entry.fireSafety.hasFireAppliance && entry.fireSafety.appliances.length > 0 ? (
                        <div className="space-y-1">
                          {entry.fireSafety.appliances
                            .slice()
                            .sort((a, b) => {
                              const aGen = /ガソリン|発電機/.test(a.fuel + a.name);
                              const bGen = /ガソリン|発電機/.test(b.fuel + b.name);
                              if (aGen && !bGen) return -1;
                              if (!aGen && bGen) return 1;
                              return 0;
                            })
                            .map((app, aIdx) => {
                            const isGenerator = /ガソリン|発電機/.test(app.fuel + app.name);
                            const isLpg = /LP|プロパン|ボンベ/.test(app.fuel + app.name);
                            const isCharcoal = /炭/.test(app.fuel + app.name);
                            return (
                              <div key={aIdx} className="flex items-center gap-1.5 text-xs">
                                <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold inline-flex items-center gap-1 whitespace-nowrap border shadow-sm ${
                                  isGenerator
                                    ? 'bg-orange-950/90 text-orange-200 border-orange-600 shadow-orange-950/50'
                                    : isLpg
                                    ? 'bg-sky-950/90 text-sky-200 border-sky-600 shadow-sky-950/50'
                                    : isCharcoal
                                    ? 'bg-amber-950/90 text-amber-200 border-amber-600 shadow-amber-950/50'
                                    : 'bg-yellow-950/90 text-yellow-200 border-yellow-600 shadow-yellow-950/50'
                                }`}>
                                  {isGenerator ? <Zap className="w-3 h-3 text-amber-400 shrink-0" /> : <Flame className="w-3 h-3 text-red-400 shrink-0" />}
                                  <span>{app.fuel} × {app.count}台</span>
                                </span>
                                <span className="text-[11px] text-slate-400 truncate">{app.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">火気なし</span>
                      )}
                    </td>

                    {/* 基本料金 */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300">
                      ¥{entry.fee.baseFee.toLocaleString()}
                    </td>

                    {/* 電源・オプション */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="space-y-0.5 text-[11px]">
                        {entry.fee.powerOption ? (
                          <div className="flex items-center gap-1 text-amber-400">
                            <Zap className="w-3 h-3" />
                            <span>電源: +¥{entry.fee.powerFee.toLocaleString()} ({entry.fee.powerWatts || 1500}W)</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">電源なし</span>
                        )}
                        {entry.fee.garbageOption && (
                          <div className="text-slate-400">
                            ゴミ回収: +¥{entry.fee.garbageFee.toLocaleString()}
                          </div>
                        )}
                        {entry.fee.equipmentRentalFee > 0 && (
                          <div className="text-slate-400">
                            備品レンタル: +¥{entry.fee.equipmentRentalFee.toLocaleString()}
                          </div>
                        )}
                        {entry.fee.discount > 0 && (
                          <div className="text-emerald-400">
                            割引: -¥{entry.fee.discount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 合計出店料 */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-sm font-black text-white font-mono">
                        ¥{entry.fee.totalAmount.toLocaleString()}
                      </span>
                    </td>

                    {/* 入金状況 */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePayment(entry);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition shadow-sm ${
                          isPaid
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                        }`}
                        title="クリックで入金状況を切り替え"
                      >
                        {isPaid ? <Check className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-rose-400" />}
                        <span>{isPaid ? '入金済' : '未入金'}</span>
                      </button>
                      {entry.fee.paidAt && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          {entry.fee.paidAt}
                        </div>
                      )}
                    </td>

                    {/* 状態・特記 */}
                    <td className="py-3 px-4">
                      {isBanned && (
                        <p className="text-[11px] text-red-300 line-clamp-1 font-semibold">
                          ⚠️ {entry.vendorSnapshot.statusReason || '出禁指定された出店者'}
                        </p>
                      )}
                      {isWarning && (
                        <p className="text-[11px] text-amber-300 line-clamp-1 font-medium">
                          ⚠️ {entry.vendorSnapshot.statusReason || '要注意店舗'}
                        </p>
                      )}
                      {!isBanned && !isWarning && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {entry.notes || '正常'}
                        </p>
                      )}
                    </td>

                    {/* 操作ボタン */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const fullVendor = vendors.find(v => v.id === entry.vendorId || v.id === entry.vendorSnapshot.id) || entry.vendorSnapshot;
                            setSelectedVendorForDetail(fullVendor);
                            setSelectedEntryForDetail(entry);
                            setDetailInitialTab('info');
                          }}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 transition border border-amber-500/30"
                          title="出店者の詳細（基本情報・消防・許可証）を表示"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEntry(entry);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="金額や場所を編集"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isDeleteUnlocked ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEntryToDelete(entry);
                            }}
                            className="p-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-700 text-rose-200 hover:text-white border border-rose-700/80 transition"
                            title="この出店ブースを削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span
                            className="p-1.5 text-slate-600 cursor-not-allowed inline-flex items-center"
                            title="誤削除防止のためロックされています。上部の「削除保護中」を押すと解除できます。"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    該当する出店ブースが見つかりません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 出店者詳細モーダル */}
      {selectedVendorForDetail && (
        <VendorDetailModal
          vendor={selectedVendorForDetail}
          entry={selectedEntryForDetail || undefined}
          event={event}
          initialTab={detailInitialTab}
          onClose={() => {
            setSelectedVendorForDetail(null);
            setSelectedEntryForDetail(null);
          }}
          onEdit={(vendorToEdit) => {
            setSelectedVendorForDetail(null);
            setSelectedEntryForDetail(null);
            setEditingVendor(vendorToEdit);
          }}
          onUpdateEntry={(updatedEntry) => {
            const updated = entries.map(e => e.id === updatedEntry.id ? updatedEntry : e);
            onUpdateEntries(updated);
            setSelectedEntryForDetail(updatedEntry);
          }}
          onUpdateVendor={(updatedVendor) => {
            if (onUpdateVendors) {
              onUpdateVendors(vendors.map(v => v.id === updatedVendor.id ? updatedVendor : v));
            }
            const updatedEntries = entries.map((e) => {
              if (e.vendorId === updatedVendor.id || e.vendorSnapshot?.id === updatedVendor.id) {
                return { ...e, vendorSnapshot: { ...e.vendorSnapshot, ...updatedVendor } };
              }
              return e;
            });
            onUpdateEntries(updatedEntries);
            setSelectedVendorForDetail(updatedVendor);
            if (selectedEntryForDetail && (selectedEntryForDetail.vendorId === updatedVendor.id || selectedEntryForDetail.vendorSnapshot?.id === updatedVendor.id)) {
              setSelectedEntryForDetail({
                ...selectedEntryForDetail,
                vendorSnapshot: { ...selectedEntryForDetail.vendorSnapshot, ...updatedVendor }
              });
            }
          }}
        />
      )}

      {/* ブース金額・配置編集モーダル */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-emerald-400" />
                  出店情報・ブース設定の編集
                </h3>
                <p className="text-xs text-slate-400">{editingEntry.vendorSnapshot.name} （代表: {editingEntry.vendorSnapshot.ownerName}）</p>
              </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* 出店者・代表者基本情報 */}
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span>出店者・代表者情報（変更可能）</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">屋号・店舗名</label>
                    <input
                      type="text"
                      value={editingEntry.vendorSnapshot.name}
                      onChange={(e) => setEditingEntry({
                        ...editingEntry,
                        vendorSnapshot: { ...editingEntry.vendorSnapshot, name: e.target.value }
                      })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">代表者氏名</label>
                    <input
                      type="text"
                      value={editingEntry.vendorSnapshot.ownerName}
                      onChange={(e) => setEditingEntry({
                        ...editingEntry,
                        vendorSnapshot: { ...editingEntry.vendorSnapshot, ownerName: e.target.value }
                      })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">電話番号</label>
                    <input
                      type="text"
                      value={editingEntry.vendorSnapshot.phone}
                      onChange={(e) => setEditingEntry({
                        ...editingEntry,
                        vendorSnapshot: { ...editingEntry.vendorSnapshot, phone: e.target.value }
                      })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">メールアドレス</label>
                    <input
                      type="email"
                      value={editingEntry.vendorSnapshot.email || ''}
                      onChange={(e) => setEditingEntry({
                        ...editingEntry,
                        vendorSnapshot: { ...editingEntry.vendorSnapshot, email: e.target.value }
                      })}
                      placeholder="未登録"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">出店品目・取扱商品</label>
                  <input
                    type="text"
                    value={editingEntry.vendorSnapshot.menuItems}
                    onChange={(e) => setEditingEntry({
                      ...editingEntry,
                      vendorSnapshot: { ...editingEntry.vendorSnapshot, menuItems: e.target.value }
                    })}
                    placeholder="例: たこ焼き、唐揚げ、りんご飴など"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              {/* ブース番号と出店内容 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">ブース番号</label>
                  <input
                    type="text"
                    value={editingEntry.boothNumber}
                    onChange={(e) => setEditingEntry({ ...editingEntry, boothNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">出店内容</label>
                  <select
                    value={editingEntry.boothArea}
                    onChange={(e) => {
                      const newArea = e.target.value as BoothArea;
                      const areaDef = event.areas.find((a) => a.code === newArea);
                      setEditingEntry({
                        ...editingEntry,
                        boothArea: newArea,
                        fee: recalculateFee({
                          ...editingEntry.fee,
                          baseFee: areaDef?.defaultBaseFee || editingEntry.fee.baseFee
                        })
                      });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {event.areas.map((a) => (
                      <option key={a.code} value={a.code}>{a.name} (基本 ¥{a.defaultBaseFee.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 料金詳細設定 */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>料金の自動計算明細</span>
                  <span className="text-emerald-400 text-sm font-black font-mono">
                    計: ¥{editingEntry.fee.totalAmount.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">基本出店料 (円)</label>
                    <input
                      type="number"
                      value={editingEntry.fee.baseFee}
                      onChange={(e) => setEditingEntry({
                        ...editingEntry,
                        fee: recalculateFee({ ...editingEntry.fee, baseFee: Number(e.target.value) })
                      })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">備品レンタル料 (円)</label>
                    <input
                      type="number"
                      value={editingEntry.fee.equipmentRentalFee}
                      onChange={(e) => setEditingEntry({
                        ...editingEntry,
                        fee: recalculateFee({ ...editingEntry.fee, equipmentRentalFee: Number(e.target.value) })
                      })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                {/* 電源オプション */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEntry.fee.powerOption}
                      onChange={(e) => setEditingEntry({
                        ...editingEntry,
                        fee: recalculateFee({
                          ...editingEntry.fee,
                          powerOption: e.target.checked,
                          powerFee: e.target.checked ? (editingEntry.fee.powerFee || 1500) : 0
                        })
                      })}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-slate-300 font-semibold">電源オプション利用</span>
                  </label>
                  {editingEntry.fee.powerOption && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">料金: ¥</span>
                      <input
                        type="number"
                        value={editingEntry.fee.powerFee}
                        onChange={(e) => setEditingEntry({
                          ...editingEntry,
                          fee: recalculateFee({ ...editingEntry.fee, powerFee: Number(e.target.value) })
                        })}
                        className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* ゴミ回収オプション */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEntry.fee.garbageOption}
                      onChange={(e) => setEditingEntry({
                        ...editingEntry,
                        fee: recalculateFee({
                          ...editingEntry.fee,
                          garbageOption: e.target.checked,
                          garbageFee: e.target.checked ? (editingEntry.fee.garbageFee || 500) : 0
                        })
                      })}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-slate-300 font-semibold">ゴミ処理・回収サービス</span>
                  </label>
                  {editingEntry.fee.garbageOption && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">料金: ¥</span>
                      <input
                        type="number"
                        value={editingEntry.fee.garbageFee}
                        onChange={(e) => setEditingEntry({
                          ...editingEntry,
                          fee: recalculateFee({ ...editingEntry.fee, garbageFee: Number(e.target.value) })
                        })}
                        className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* 割引 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                  <span className="text-slate-300">特別割引（地元割・リピート等）</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">- ¥</span>
                    <input
                      type="number"
                      value={editingEntry.fee.discount}
                      onChange={(e) => setEditingEntry({
                        ...editingEntry,
                        fee: recalculateFee({ ...editingEntry.fee, discount: Number(e.target.value) })
                      })}
                      className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 入金ステータス */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">入金ステータス</label>
                  <select
                    value={editingEntry.fee.paymentStatus}
                    onChange={(e) => {
                      const newStat = e.target.value as PaymentStatus;
                      setEditingEntry({
                        ...editingEntry,
                        fee: {
                          ...editingEntry.fee,
                          paymentStatus: newStat,
                          paidAt: newStat === 'paid' ? (editingEntry.fee.paidAt || new Date().toISOString().split('T')[0]) : undefined
                        }
                      });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="unbilled">未請求</option>
                    <option value="billed">請求済（未入金）</option>
                    <option value="paid">入金完了</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">入金完了日</label>
                  <input
                    type="date"
                    value={editingEntry.fee.paidAt || ''}
                    onChange={(e) => setEditingEntry({
                      ...editingEntry,
                      fee: { ...editingEntry.fee, paidAt: e.target.value }
                    })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* 特記事項 */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">運営特記事項・メモ</label>
                <textarea
                  rows={2}
                  value={editingEntry.notes || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, notes: e.target.value })}
                  placeholder="当日搬入時の注意や机の配置など..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  const updatedEntries = entries.map((e) => (e.id === editingEntry.id ? editingEntry : e));
                  onUpdateEntries(updatedEntries);
                  if (onUpdateVendors) {
                    const targetVendorId = editingEntry.vendorId || editingEntry.vendorSnapshot?.id;
                    onUpdateVendors(
                      vendors.map((v) =>
                        v.id === targetVendorId || v.id === editingEntry.vendorSnapshot?.id
                          ? { ...v, ...editingEntry.vendorSnapshot, id: v.id }
                          : v
                      )
                    );
                  }
                  setEditingEntry(null);
                }}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
              >
                変更を反映する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規ブース登録モーダル */}
      {isAddModalOpen && (
        <NewBoothModal
          event={event}
          vendors={vendors}
          existingEntries={entries}
          onClose={() => setIsAddModalOpen(false)}
          onAddEntry={(newEntry) => {
            onUpdateEntries([...entries, newEntry]);
            setIsAddModalOpen(false);
          }}
        />
      )}

      {/* ブース出店削除確認モーダル */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">出店ブースの削除確認</h3>
                <p className="text-xs text-slate-400 mt-0.5">この操作は取り消すことができません。</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1.5">
              <div className="text-slate-400">ブース番号 / 屋号:</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  {entryToDelete.boothNumber}
                </span>
                <span>{entryToDelete.vendorSnapshot.name}</span>
              </div>
              <div className="text-slate-400 pt-1">代表者: <span className="text-slate-200">{entryToDelete.vendorSnapshot.ownerName}</span></div>
              <div className="text-slate-400">出店料: <span className="text-emerald-400 font-mono font-bold">¥{entryToDelete.fee.totalAmount.toLocaleString()}</span></div>
            </div>

            <p className="text-xs text-rose-300/90 leading-relaxed bg-rose-950/30 p-2.5 rounded-lg border border-rose-900/50">
              ⚠️ 今回の夜市イベントからこの出店ブース情報を削除します。よろしいですか？
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>完全に削除する</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 出店者情報の編集モーダル */}
      {editingVendor && (
        <VendorEditModal
          vendor={editingVendor}
          onClose={() => setEditingVendor(null)}
          onSave={(updated) => {
            if (onUpdateVendors) {
              onUpdateVendors(vendors.map((v) => (v.id === updated.id ? updated : v)));
            }
            const updatedEntries = entries.map((e) => {
              if (e.vendorId === updated.id || e.vendorSnapshot?.id === updated.id) {
                return { ...e, vendorSnapshot: { ...e.vendorSnapshot, ...updated } };
              }
              return e;
            });
            onUpdateEntries(updatedEntries);
            setEditingVendor(null);
          }}
        />
      )}
    </div>
  );
};

// 新規ブース追加モーダル（出禁チェック機能付き）
interface NewBoothModalProps {
  event: NightMarketEvent;
  vendors: Vendor[];
  existingEntries: EventEntry[];
  onClose: () => void;
  onAddEntry: (entry: EventEntry) => void;
}

const NewBoothModal: React.FC<NewBoothModalProps> = ({
  event,
  vendors,
  existingEntries,
  onClose,
  onAddEntry
}) => {
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?.id || '');
  const [boothArea, setBoothArea] = useState<BoothArea>('OUTDOOR');
  const [boothNumber, setBoothNumber] = useState(`O-0${existingEntries.length + 1}`);
  const [powerOption, setPowerOption] = useState(false);
  const [garbageOption, setGarbageOption] = useState(true);

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);
  const areaDef = event.areas.find((a) => a.code === boothArea);
  const baseFee = areaDef?.defaultBaseFee || 6000;
  const powerFee = powerOption ? 1500 : 0;
  const garbageFee = garbageOption ? 500 : 0;
  const totalAmount = baseFee + powerFee + garbageFee;

  const isBanned = selectedVendor?.status === 'banned';
  const isWarning = selectedVendor?.status === 'warning';

  const handleSave = () => {
    if (!selectedVendor) return;

    if (isBanned) {
      const confirmBanned = window.confirm(
        `【警告】「${selectedVendor.name}」は出禁指定（ブラックリスト）されています！\n理由: ${selectedVendor.statusReason}\n\n本当にエントリーを登録しますか？`
      );
      if (!confirmBanned) return;
    }

    const newEntry: EventEntry = {
      id: `entry-${Date.now()}`,
      eventId: event.id,
      vendorId: selectedVendor.id,
      vendorSnapshot: selectedVendor,
      boothArea,
      boothNumber,
      fee: {
        baseFee,
        powerOption,
        powerFee,
        powerWatts: powerOption ? 1000 : 0,
        garbageOption,
        garbageFee,
        equipmentRentalFee: 0,
        discount: 0,
        totalAmount,
        paymentStatus: 'unbilled',
        receiptIssued: false
      },
      fireSafety: {
        hasFireAppliance: selectedVendor.category === 'food' || selectedVendor.category === 'kitchen_car',
        appliances: selectedVendor.category === 'food' ? [
          { type: 'cassette_stove', name: '調理用コンロ', fuel: 'カセットボンベ', count: 1 }
        ] : [],
        fireExtinguisher: {
          installed: true,
          count: 1,
          type: 'ABC粉末消火器',
          capacity: '10型',
          manufacturingYear: '2025年製',
          inspectionValid: true
        },
        submittedDocuments: [],
        checkedByStaff: false
      },
      permitIssued: false,
      entryStatus: 'confirmed'
    };

    onAddEntry(newEntry);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            新規出店ブースの割り当て・登録
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* 出店者選択 */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">出店者（マスター名簿から選択）</label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-sm"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.ownerName}) {v.status === 'banned' ? '【※出禁】' : v.status === 'warning' ? '【要注意】' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 出禁・要注意警告表示 */}
          {isBanned && (
            <div className="p-3.5 bg-red-950/60 border border-red-600 rounded-xl text-red-200">
              <div className="font-bold flex items-center gap-1.5 text-sm text-red-400">
                <AlertTriangle className="w-4 h-4" />
                出禁指定出店者です！
              </div>
              <p className="mt-1 text-xs">{selectedVendor.statusReason}</p>
            </div>
          )}
          {isWarning && (
            <div className="p-3.5 bg-amber-950/60 border border-amber-600 rounded-xl text-amber-200">
              <div className="font-bold flex items-center gap-1.5 text-sm text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                過去トラブル要注意出店者です
              </div>
              <p className="mt-1 text-xs">{selectedVendor.statusReason}</p>
            </div>
          )}

          {/* 出店内容とブース番号 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">出店内容</label>
              <select
                value={boothArea}
                onChange={(e) => {
                  const a = e.target.value as BoothArea;
                  setBoothArea(a);
                  const prefix = a === 'OUTDOOR' ? 'O' : a === 'FOOD_STALL' ? 'F' : a === 'KITCHEN_CAR' ? 'K' : a;
                  setBoothNumber(`${prefix}-0${existingEntries.length + 1}`);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                {event.areas.map((a) => (
                  <option key={a.code} value={a.code}>{a.name} (基本 ¥{a.defaultBaseFee.toLocaleString()})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">ブース番号</label>
              <input
                type="text"
                value={boothNumber}
                onChange={(e) => setBoothNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* オプション選択 */}
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300">電源利用 (+¥1,500)</span>
              <input
                type="checkbox"
                checked={powerOption}
                onChange={(e) => setPowerOption(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300">ゴミ回収オプション (+¥500)</span>
              <input
                type="checkbox"
                checked={garbageOption}
                onChange={(e) => setGarbageOption(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500"
              />
            </label>
            <div className="pt-2 border-t border-slate-700 flex justify-between font-bold text-sm">
              <span className="text-slate-300">初期請求額</span>
              <span className="text-emerald-400 font-mono">¥{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className={`px-5 py-2 rounded-lg font-bold text-slate-950 transition ${
              isBanned ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {isBanned ? '警告を理解して登録' : 'ブースを確定・登録'}
          </button>
        </div>
      </div>
    </div>
  );
};
