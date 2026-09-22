import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  History, 
  Phone, 
  Mail, 
  MapPin, 
  Utensils, 
  Store,
  Tag,
  Lock,
  Unlock,
  Info,
  Eye,
  Flame,
  Award,
  Download, 
  Printer,
  ExternalLink,
  Building2,
  Sparkles
} from 'lucide-react';
import { Vendor, VendorStatus, EventEntry, NightMarketEvent, isVendorOrganization, getVendorCategoryLabel } from '../../types';
import { mergePdfDocuments, createSampleDocPdf, FileItemToMerge } from '../../utils/pdfMerger';
import { Instagram, getInstagramUrl, getInstagramHandle, InstagramBadge } from '../../utils/instagram';
import { 
  getVendorReading, 
  getKanaInitialGroup, 
  sortVendorsByJapaneseAlphabet 
} from '../../utils/aiNameReading';
import { VendorDetailModal } from './VendorDetailModal';
import { VendorEditModal } from './VendorEditModal';

interface VendorListViewProps {
  vendors: Vendor[];
  onUpdateVendors: (vendors: Vendor[]) => void;
  event: NightMarketEvent;
  entries: EventEntry[];
  onUpdateEntries: (entries: EventEntry[]) => void;
}

export const VendorListView: React.FC<VendorListViewProps> = ({
  vendors,
  onUpdateVendors,
  event,
  entries,
  onUpdateEntries
}) => {
  const isAllEvent = 
    event.name === '夜市全体' || 
    event.id === 'event-all' || 
    !event.date;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VendorStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'store' | 'organization'>('ALL');
  const [sortBy, setSortBy] = useState<'kana' | 'original' | 'count'>('kana'); // デフォルトで五十音順（AI自動判定）
  const [kanaRow, setKanaRow] = useState<string>('ALL');
  const [selectedVendorForDetail, setSelectedVendorForDetail] = useState<Vendor | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<'info' | 'fire' | 'permit'>('info');
  const [isMergingPdfs, setIsMergingPdfs] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteUnlocked, setIsDeleteUnlocked] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

  // フィルター & 五十音順（AI判定）ソート
  const filteredVendors = useMemo(() => {
    let result = vendors.filter((v) => {
      const reading = getVendorReading(v);
      const matchesSearch = 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.menuItems.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reading.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.statusReason && v.statusReason.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;

      const normalizedCategory = 
        v.category === 'kitchen_car' ? 'kitchen_car' :
        (v.category === 'food' || v.category === 'drink') ? 'food' : 'outdoor';
      const matchesCategory = categoryFilter === 'ALL' || normalizedCategory === categoryFilter || v.category === categoryFilter;

      const isOrg = isVendorOrganization(v);
      const matchesType = 
        typeFilter === 'ALL' || 
        (typeFilter === 'organization' && isOrg) || 
        (typeFilter === 'store' && !isOrg);

      const matchesKanaRow = 
        kanaRow === 'ALL' || getKanaInitialGroup(reading) === kanaRow;

      return matchesSearch && matchesStatus && matchesCategory && matchesType && matchesKanaRow;
    });

    // 夜市全体表示時は、エントリー（ブース出店）の概念がないため、アクティブ店舗と出禁店舗のみでシンプルに整理
    if (isAllEvent) {
      let activeList = result.filter((v) => v.status !== 'banned');
      let bannedList = result.filter((v) => v.status === 'banned');

      if (sortBy === 'kana') {
        activeList = sortVendorsByJapaneseAlphabet(activeList);
        bannedList = sortVendorsByJapaneseAlphabet(bannedList);
      } else if (sortBy === 'count') {
        activeList = [...activeList].sort((a, b) => b.pastParticipationCount - a.pastParticipationCount);
        bannedList = [...bannedList].sort((a, b) => b.pastParticipationCount - a.pastParticipationCount);
      }

      return [...activeList, ...bannedList];
    }

    // 個別イベント選択時：エントリー登録されている店舗のID一覧
    const registeredVendorIds = new Set(
      entries.map((e) => e.vendorId || e.vendorSnapshot?.id).filter(Boolean)
    );

    // 1. 今回のイベントに出店登録（エントリー済）の店舗（一番上に表示）
    let registeredList = result.filter(
      (v) => v.status !== 'banned' && registeredVendorIds.has(v.id)
    );

    // 2. 名簿登録店舗・過去出店者（今回のイベントは未登録）
    let unregisteredList = result.filter(
      (v) => v.status !== 'banned' && !registeredVendorIds.has(v.id)
    );

    // 3. 出禁・受付不可店舗（最下部）
    let bannedList = result.filter((v) => v.status === 'banned');

    if (sortBy === 'kana') {
      registeredList = sortVendorsByJapaneseAlphabet(registeredList);
      unregisteredList = sortVendorsByJapaneseAlphabet(unregisteredList);
      bannedList = sortVendorsByJapaneseAlphabet(bannedList);
    } else if (sortBy === 'count') {
      registeredList = [...registeredList].sort((a, b) => b.pastParticipationCount - a.pastParticipationCount);
      unregisteredList = [...unregisteredList].sort((a, b) => b.pastParticipationCount - a.pastParticipationCount);
      bannedList = [...bannedList].sort((a, b) => b.pastParticipationCount - a.pastParticipationCount);
    }

    return [...registeredList, ...unregisteredList, ...bannedList];
  }, [vendors, entries, searchTerm, statusFilter, categoryFilter, typeFilter, kanaRow, sortBy, isAllEvent]);

  // エントリー登録ID一覧のメモ化
  const registeredVendorIds = useMemo(() => {
    return new Set(entries.map((e) => e.vendorId || e.vendorSnapshot?.id).filter(Boolean));
  }, [entries]);

  // グループ別リスト（最上部: 登録団体一覧、中間上: 過去出店者、中間下: 一般未登録店舗、最下部: 出禁店舗）
  const organizationVendors = useMemo(
    () => filteredVendors.filter((v) => v.status !== 'banned' && isVendorOrganization(v)),
    [filteredVendors]
  );
  const storeVendors = useMemo(
    () => filteredVendors.filter((v) => v.status !== 'banned' && !isVendorOrganization(v)),
    [filteredVendors]
  );
  const registeredStores = useMemo(
    () => filteredVendors.filter((v) => v.status !== 'banned' && !isVendorOrganization(v) && registeredVendorIds.has(v.id)),
    [filteredVendors, registeredVendorIds]
  );
  const unregisteredStores = useMemo(
    () => filteredVendors.filter((v) => v.status !== 'banned' && !isVendorOrganization(v) && !registeredVendorIds.has(v.id)),
    [filteredVendors, registeredVendorIds]
  );
  const bannedVendors = useMemo(
    () => filteredVendors.filter((v) => v.status === 'banned'),
    [filteredVendors]
  );

  const bannedCount = vendors.filter((v) => v.status === 'banned').length;
  const warningCount = vendors.filter((v) => v.status === 'warning').length;
  const orgCount = vendors.filter(isVendorOrganization).length;
  const storeCount = vendors.length - orgCount;

  // CSVエクスポート
  const handleExportCsv = () => {
    const headers = [
      '屋号・店名',
      '代表者名',
      '電話番号',
      'メールアドレス',
      'Instagram',
      'ステータス(出禁/要注意/通常)',
      '出禁・要注意理由',
      '出店カテゴリ',
      '主な出店品目',
      '食品営業許可番号',
      '過去出店回数',
      '運営メモ'
    ];

    const rows = vendors.map((v) => [
      `"${v.name.replace(/"/g, '""')}"`,
      `"${v.ownerName.replace(/"/g, '""')}"`,
      v.phone,
      v.email,
      `"${(v.instagram || '').replace(/"/g, '""')}"`,
      v.status === 'banned' ? '出禁(受付不可)' : v.status === 'warning' ? '要注意' : '通常',
      `"${(v.statusReason || '').replace(/"/g, '""')}"`,
      v.category,
      `"${v.menuItems.replace(/"/g, '""')}"`,
      v.foodLicenseNumber || '',
      v.pastParticipationCount,
      `"${(v.internalNotes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `出店者名簿_出禁管理リスト_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 消防書類一括まとめPDF
  const handleMergeAllPdfs = async () => {
    setIsMergingPdfs(true);
    try {
      const filesToMerge: FileItemToMerge[] = [];
      for (const entry of entries) {
        if (!entry.fireSafety.hasFireAppliance && entry.fireSafety.submittedDocuments.length === 0) continue;
        if (entry.fireSafety.submittedDocuments.length > 0) {
          for (const doc of entry.fireSafety.submittedDocuments) {
            const sampleBytes = await createSampleDocPdf(
              entry.vendorSnapshot.name,
              entry.boothNumber,
              doc.title,
              `消火器: ${entry.fireSafety.fireExtinguisher.type} (${entry.fireSafety.fireExtinguisher.manufacturingYear}) / 火気器具: ${entry.fireSafety.appliances.map(a => a.name).join(', ') || 'なし'}`
            );
            filesToMerge.push({
              name: doc.title,
              vendorName: entry.vendorSnapshot.name,
              boothNumber: entry.boothNumber,
              bytes: sampleBytes,
            });
          }
        } else if (entry.fireSafety.hasFireAppliance) {
          const sampleBytes = await createSampleDocPdf(
            entry.vendorSnapshot.name,
            entry.boothNumber,
            '火気使用安全確認届出票(現地確認用)',
            `器具: ${entry.fireSafety.appliances.map(a => `${a.name}(${a.fuel})`).join(', ')} / 消火器: ${entry.fireSafety.fireExtinguisher.installed ? 'あり' : '※未持参警告'}`
          );
          filesToMerge.push({
            name: '火気使用安全確認届出票.pdf',
            vendorName: entry.vendorSnapshot.name,
            boothNumber: entry.boothNumber,
            bytes: sampleBytes,
          });
        }
      }

      if (filesToMerge.length === 0) {
        alert('火気器具使用または書類提出のある出店者がありません。');
        return;
      }

      const mergedBytes = await mergePdfDocuments(filesToMerge, event, true);
      const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `消防届出書類まとめ_${event.name.replace(/\s+/g, '_')}_${event.date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDFマージエラー:', err);
      alert('消防届出書類のまとめ処理に失敗しました。');
    } finally {
      setIsMergingPdfs(false);
    }
  };

  const handleConfirmDelete = () => {
    if (vendorToDelete) {
      onUpdateVendors(vendors.filter((v) => v.id !== vendorToDelete.id));
      setVendorToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 上部ヘッダー */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            {isAllEvent ? '出店者マスター名簿（過去の出店者一覧・登録団体）' : `出店者名簿（${event.name}）`}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAllEvent
              ? '過去の全出店実績、登録団体、トラブル・マナー違反による出禁や要注意フラグを一括管理します。※特定イベントへの出店（エントリー）は各イベントを選択して行います。'
              : 'このイベントに出店エントリーしている出店者と、過去出店者を確認できます。'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTypeFilter(typeFilter === 'organization' ? 'ALL' : 'organization')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
                typeFilter === 'organization'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
              }`}
              title="登録団体のみに絞り込み"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>登録団体: {orgCount}件</span>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'banned' ? 'ALL' : 'banned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                statusFilter === 'banned'
                  ? 'bg-red-600 text-white border-red-500'
                  : 'bg-red-950/40 text-red-300 border-red-800 hover:bg-red-900/50'
              }`}
            >
              出禁: {bannedCount}件
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'warning' ? 'ALL' : 'warning')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                statusFilter === 'warning'
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-amber-950/40 text-amber-300 border-amber-800 hover:bg-amber-900/50'
              }`}
            >
              要注意: {warningCount}件
            </button>
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

          {/* 消防書類まとめボタン（個別イベント選択時のみ表示） */}
          {!isAllEvent && (
            <button
              onClick={handleMergeAllPdfs}
              disabled={isMergingPdfs}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-bold border border-orange-500/40 transition"
              title="所轄消防署への火気使用届出用PDFを1本にまとめてダウンロードします"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>{isMergingPdfs ? 'PDF作成中...' : '消防書類一括まとめ'}</span>
            </button>
          )}


          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            名簿CSV
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            出店者新規登録
          </button>
        </div>
      </div>

      {/* 検索・ステータスフィルター */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="屋号・代表者・品目・トラブル理由で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* ステータスフィルター */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">全ステータス表示</option>
            <option value="active">通常出店者</option>
            <option value="warning">【要注意】出店者</option>
            <option value="banned">【出禁・受付不可】出店者</option>
          </select>

          {/* 出店区分フィルター */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="ALL">全区分 (店舗・団体)</option>
            <option value="store">店舗のみ ({storeCount})</option>
            <option value="organization">登録団体のみ ({orgCount})</option>
          </select>

          {/* ジャンルフィルター */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="ALL">全ジャンル</option>
            <option value="kitchen_car">キッチンカー</option>
            <option value="food">飲食露店</option>
            <option value="outdoor">屋外出店（物販・体験）</option>
          </select>

          <span className="text-xs text-slate-400 ml-2 whitespace-nowrap">
            該当: <strong className="text-white">{filteredVendors.length}件</strong>
          </span>
        </div>
      </div>

      {/* 並び替え & 五十音インデックスフィルター */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>並び替え:</span>
          </span>
          <button
            type="button"
            onClick={() => setSortBy('kana')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              sortBy === 'kana'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700'
            }`}
          >
            <span>あいうえお五十音順（AI自動判定）</span>
          </button>
          <button
            type="button"
            onClick={() => setSortBy('count')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              sortBy === 'count'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700'
            }`}
          >
            <span>出店回数順</span>
          </button>
          <button
            type="button"
            onClick={() => setSortBy('original')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              sortBy === 'original'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700'
            }`}
          >
            <span>登録順</span>
          </button>
        </div>

        {/* 五十音インデックスボタン群 */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto no-scrollbar py-0.5">
          <span className="text-[11px] text-slate-500 mr-1 hidden sm:inline">五十音絞込:</span>
          {['ALL', 'あ行', 'か行', 'さ行', 'た行', 'な行', 'は行', 'ま行', 'や行', 'ら行', 'わ行'].map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setKanaRow(group)}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap border ${
                kanaRow === group
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/60 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {group === 'ALL' ? 'すべて' : group.replace('行', '')}
            </button>
          ))}
        </div>
      </div>

      {/* 出店者リスト表示領域（過去出店者は一番上、未登録店舗は中間、出禁店舗は最下部） */}
      {filteredVendors.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
          条件に一致する出店者が見つかりませんでした。
        </div>
      ) : (
        <div className="space-y-8">
          {/* 出店者カード共通レンダラー */}
          {(() => {
            const renderVendorCard = (vendor: Vendor) => {
              const isBanned = vendor.status === 'banned';
              const isWarning = vendor.status === 'warning';
              const isOrg = isVendorOrganization(vendor);
              const vendorEntry = entries.find(
                (e) => e.vendorId === vendor.id || e.vendorSnapshot?.id === vendor.id
              );
              const isRegistered = !isAllEvent && !isBanned && !!vendorEntry;

              return (
                <div
                  key={vendor.id}
                  onClick={() => {
                    setSelectedVendorForDetail(vendor);
                    setDetailInitialTab('info');
                  }}
                  className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between shadow-sm relative overflow-hidden group/card hover:shadow-lg hover:-translate-y-0.5 ${
                    isBanned
                      ? 'bg-red-950/20 border-red-800/50 shadow-red-950/20 hover:border-red-600'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-800/40 shadow-amber-950/20 hover:border-amber-600'
                      : isRegistered
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
                      : isOrg
                      ? 'bg-slate-900 border-slate-800 hover:border-emerald-800/50 hover:bg-slate-850/80'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                  title="クリックして出店者の詳細（連絡先・営業許可証・消防・許可証）を表示"
                >
                  {/* カード上部アクセントライン（要注意・出禁のみ控えめに表示） */}
                  {isBanned && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-600/70" />
                  )}
                  {isWarning && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500/70" />
                  )}

                  <div className="space-y-3">
                    {/* 上部: ステータス・登録状況 & 区分 & カテゴリ & 消防/許可証 */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isBanned ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-red-600 text-white shadow-sm shadow-red-900/50">
                            <ShieldAlert className="w-3 h-3" />
                            <span>出禁</span>
                          </span>
                        ) : isWarning ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-amber-500 text-slate-950 font-black">
                            <AlertTriangle className="w-3 h-3" />
                            <span>要注意</span>
                          </span>
                        ) : isRegistered ? (
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-amber-500/10 text-amber-300/80 border border-amber-500/20">
                            <Store className="w-3 h-3 text-amber-400/70" />
                            <span>出店確定: {vendorEntry.boothNumber || '出店中'}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            名簿登録
                          </span>
                        )}

                        {isOrg ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            登録団体
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            店舗
                          </span>
                        )}

                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/80">
                          {getVendorCategoryLabel(vendor.category)}
                        </span>
                      </div>

                      {/* 消防・許可証インジケーター */}
                      {(() => {
                        const hasFire =
                          vendorEntry?.fireSafety?.hasFireAppliance ??
                          (vendor.category === 'food' ||
                            vendor.category === 'kitchen_car' ||
                            vendor.tags?.some(
                              (t) => t.includes('火気') || t.includes('ガス') || t.includes('炭火')
                            ));
                        return (
                          <div className="flex items-center gap-1 text-[10px]">
                            {hasFire && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30 font-medium flex items-center gap-0.5"
                                title="火気使用対象ブース"
                              >
                                <Flame className="w-2.5 h-2.5" />
                                <span>消防</span>
                              </span>
                            )}
                            {!isAllEvent && vendorEntry?.permitIssued && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-0.5"
                                title="出店許可証発行済"
                              >
                                <Award className="w-2.5 h-2.5" />
                                <span>許可済</span>
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* 屋号 & 代表者 */}
                    <div>
                      <h3 className="text-base font-bold tracking-wide transition-colors flex items-center gap-1.5 leading-snug text-white">
                        {isOrg && <Building2 className="w-4 h-4 text-emerald-400/80 shrink-0" />}
                        <span className="truncate">{vendor.name}</span>
                      </h3>

                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span>
                          代表: <strong className="text-slate-300 font-medium">{vendor.ownerName}</strong>
                        </span>
                        {vendor.pastParticipationCount > 0 && (
                          <span className="text-slate-400 text-[11px]">
                            (出店{vendor.pastParticipationCount}回)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 主な出店品目 */}
                    {vendor.menuItems && (
                      <div className="text-xs text-slate-300 bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-800/80 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">品目:</span>
                        <span className="truncate text-slate-300 text-xs">{vendor.menuItems}</span>
                      </div>
                    )}

                    {/* 出禁・要注意理由 */}
                    {(isBanned || isWarning) && (
                      <div
                        className={`px-2.5 py-1.5 rounded-lg text-xs border flex items-center gap-1.5 ${
                          isBanned
                            ? 'bg-red-950/60 border-red-700/60 text-red-200'
                            : 'bg-amber-950/50 border-amber-700/60 text-amber-200'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate text-[11px]">
                          {vendor.statusReason ||
                            (isBanned ? '出禁指定されています（受付不可）' : '要注意店舗です')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* カード下部操作ボタン */}
                  <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex justify-between items-center text-xs">
                    {vendor.instagram ? (
                      <a
                        href={getInstagramUrl(vendor.instagram) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] text-pink-400 hover:text-pink-300 font-medium transition"
                        title={`${vendor.name} の公式Instagramを開く`}
                      >
                        <Instagram className="w-3 h-3" />
                        <span className="max-w-[100px] sm:max-w-[120px] truncate">
                          {getInstagramHandle(vendor.instagram)}
                        </span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-500">クリックで詳細表示</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVendorForDetail(vendor);
                          setDetailInitialTab('info');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-medium text-xs border border-slate-700 transition flex items-center gap-1"
                        title="出店者の詳細情報を表示"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>詳細</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingVendor(vendor);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition"
                        title="編集・出禁設定"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {isDeleteUnlocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVendorToDelete(vendor);
                          }}
                          className="p-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-700 text-rose-200 hover:text-white border border-rose-700/80 transition"
                          title="この出店者を削除"
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
                  </div>
                </div>
              );
            };

            return (
              <>
                {/* 0. 最上部: 登録団体一覧 */}
                {organizationVendors.length > 0 && (
                  <div className="space-y-3 bg-emerald-950/15 border border-emerald-800/40 rounded-2xl p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-800/40">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <span>登録団体一覧</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 font-black">
                              {organizationVendors.length}件
                            </span>
                          </h3>
                          <p className="text-[11px] text-emerald-400/80 mt-0.5">
                            地域振興会・サークル・NPO等の公認登録団体
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAllEvent ? (
                          <span className="text-xs text-emerald-300 bg-emerald-900/40 border border-emerald-700/50 px-3 py-1 rounded-full font-bold">
                            登録団体名簿: {organizationVendors.length}件
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-300 bg-emerald-900/40 border border-emerald-700/50 px-3 py-1 rounded-full font-bold">
                            出店中: {organizationVendors.filter(v => registeredVendorIds.has(v.id)).length}件 / 名簿: {organizationVendors.filter(v => !registeredVendorIds.has(v.id)).length}件
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                      {organizationVendors.map(renderVendorCard)}
                    </div>
                  </div>
                )}

                {/* 夜市全体選択時：一般店舗マスター一覧（エントリー分割せず名簿としてシンプルに表示） */}
                {isAllEvent && storeVendors.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500/70 inline-block" />
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-amber-500/80" />
                          <span>過去出店者 ({storeVendors.length}件)</span>
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-850 border border-slate-800 px-2.5 py-0.5 rounded-full font-medium">
                        過去出店者マスター・五十音順
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {storeVendors.map(renderVendorCard)}
                    </div>
                  </div>
                )}

                {/* 個別イベント選択時：1. 今回のイベントに出店登録（エントリー済）の一般店舗 */}
                {!isAllEvent && registeredStores.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500/70 inline-block" />
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-amber-500/80" />
                          <span>過去出店者 ({registeredStores.length}件)</span>
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-850 border border-slate-800 px-2.5 py-0.5 rounded-full font-medium">
                        出店エントリー済・五十音順
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {registeredStores.map(renderVendorCard)}
                    </div>
                  </div>
                )}

                {/* 個別イベント選択時：2. 名簿登録店舗・過去出店者（一般店舗・未登録） */}
                {!isAllEvent && unregisteredStores.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {(registeredStores.length > 0 || organizationVendors.length > 0) && (
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>過去出店者（未エントリー: {unregisteredStores.length}件）</span>
                          </h3>
                        </div>
                        <span className="text-xs text-slate-400">過去出店者名簿・五十音順</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {unregisteredStores.map(renderVendorCard)}
                    </div>
                  </div>
                )}

                {/* 3. 最下部: 出禁・受付不可店舗 */}
                {bannedVendors.length > 0 && (
                  <div className="space-y-3 pt-6 border-t-2 border-red-900/50">
                    <div className="flex items-center justify-between pb-2 border-b border-red-900/40">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-red-600/20 text-red-400 border border-red-500/30">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                          <span>出禁・受付不可店舗</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800">
                            {bannedVendors.length}件
                          </span>
                        </h3>
                      </div>
                      <span className="text-[11px] text-red-400 bg-red-950/70 border border-red-800/60 px-2.5 py-1 rounded-full font-medium">
                        ※トラブル防止のため最下部に隔離表示しています
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bannedVendors.map(renderVendorCard)}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* 出店者削除確認モーダル */}
      {vendorToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">出店者の削除確認</h3>
                <p className="text-xs text-slate-400 mt-0.5">この操作は取り消すことができません。</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1.5">
              <div className="text-slate-400">屋号・店名:</div>
              <div className="text-sm font-bold text-white">{vendorToDelete.name}</div>
              <div className="text-slate-400 pt-1">代表者: <span className="text-slate-200">{vendorToDelete.ownerName}</span></div>
              {vendorToDelete.menuItems && (
                <div className="text-slate-400">品目: <span className="text-slate-300">{vendorToDelete.menuItems}</span></div>
              )}
            </div>

            <p className="text-xs text-rose-300/90 leading-relaxed bg-rose-950/30 p-2.5 rounded-lg border border-rose-900/50">
              ⚠️ この出店者データを名簿マスターから完全に削除します。よろしいですか？
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setVendorToDelete(null)}
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

      {/* 出店者詳細モーダル */}
      {selectedVendorForDetail && (
        <VendorDetailModal
          vendor={selectedVendorForDetail}
          entry={entries.find(e => e.vendorId === selectedVendorForDetail.id || e.vendorSnapshot.id === selectedVendorForDetail.id)}
          event={event}
          initialTab={detailInitialTab}
          onClose={() => setSelectedVendorForDetail(null)}
          onEdit={(vendorToEdit) => {
            setSelectedVendorForDetail(null);
            setEditingVendor(vendorToEdit);
          }}
          onUpdateEntry={(updatedEntry) => {
            const updated = entries.map(e => e.id === updatedEntry.id ? updatedEntry : e);
            onUpdateEntries(updated);
          }}
          onUpdateVendor={(updatedVendor) => {
            onUpdateVendors(vendors.map(v => v.id === updatedVendor.id ? updatedVendor : v));
            setSelectedVendorForDetail(updatedVendor);
          }}
        />
      )}

      {/* 出店者編集・出禁設定モーダル */}
      {editingVendor && (
        <VendorEditModal
          vendor={editingVendor}
          onClose={() => setEditingVendor(null)}
          onSave={(updated) => {
            onUpdateVendors(vendors.map((v) => (v.id === updated.id ? updated : v)));
            if (selectedVendorForDetail && selectedVendorForDetail.id === updated.id) {
              setSelectedVendorForDetail(updated);
            }
            setEditingVendor(null);
          }}
          onDelete={(id) => {
            onUpdateVendors(vendors.filter((v) => v.id !== id));
            onUpdateEntries(entries.filter((e) => e.vendorId !== id && e.vendorSnapshot?.id !== id));
            if (selectedVendorForDetail && selectedVendorForDetail.id === id) {
              setSelectedVendorForDetail(null);
            }
            setEditingVendor(null);
          }}
        />
      )}

      {/* 新規出店者作成モーダル */}
      {isAddModalOpen && (
        <VendorEditModal
          vendor={{
            id: `v-${Date.now()}`,
            name: '',
            ownerName: '',
            phone: '',
            email: '',
            category: 'food',
            menuItems: '',
            hasFoodLicense: true,
            status: 'active',
            tags: [],
            pastParticipationCount: 0,
            pastEvents: [],
            createdAt: new Date().toISOString().split('T')[0]
          }}
          isNew={true}
          onClose={() => setIsAddModalOpen(false)}
          onSave={(newVendor) => {
            onUpdateVendors([newVendor, ...vendors]);
            setIsAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
