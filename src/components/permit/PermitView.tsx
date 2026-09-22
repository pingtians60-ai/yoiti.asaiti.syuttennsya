import React, { useState } from 'react';
import { 
  Award, 
  Printer, 
  Download, 
  CheckCircle2, 
  Flame, 
  Zap, 
  AlertTriangle, 
  QrCode, 
  FileText,
  Calendar,
  MapPin,
  Building,
  Sparkles,
  Building2
} from 'lucide-react';
import { EventEntry, NightMarketEvent, isVendorOrganization } from '../../types';
import { exportMultipleCardsToPdf } from '../../utils/pdfGenerator';

interface PermitViewProps {
  event: NightMarketEvent;
  entries: EventEntry[];
  onUpdateEntries: (entries: EventEntry[]) => void;
}

export const PermitView: React.FC<PermitViewProps> = ({
  event,
  entries,
  onUpdateEntries
}) => {
  const [selectedBoothFilter, setSelectedBoothFilter] = useState<string>('ALL');
  const [layoutMode, setLayoutMode] = useState<'a4_single' | 'a4_double'>('a4_single');
  const [isExporting, setIsExporting] = useState(false);

  const issuedCount = entries.filter((e) => e.permitIssued).length;

  const filteredEntries = entries.filter((e) => {
    if (selectedBoothFilter === 'ALL') return true;
    if (selectedBoothFilter === 'FIRE_ONLY') return e.fireSafety.hasFireAppliance;
    if (selectedBoothFilter === 'UNISSUED') return !e.permitIssued;
    return e.id === selectedBoothFilter;
  });

  // 全許可証を一括「発行済」にする
  const handleMarkAllIssued = () => {
    const updated = entries.map((e) => ({
      ...e,
      permitIssued: true,
      permitIssuedAt: e.permitIssuedAt || new Date().toISOString().split('T')[0]
    }));
    onUpdateEntries(updated);
  };

  // 個別発行トグル
  const handleToggleIssue = (id: string) => {
    const updated = entries.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          permitIssued: !e.permitIssued,
          permitIssuedAt: !e.permitIssued ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return e;
    });
    onUpdateEntries(updated);
  };

  // 一括PDFエクスポート
  const handleExportAllPdf = async () => {
    setIsExporting(true);
    try {
      await exportMultipleCardsToPdf('permit-card-target', `夜市出店許可証_一括まとめ_${event.date}.pdf`);
      handleMarkAllIssued();
    } catch (err) {
      console.error('PDF生成エラー:', err);
      alert('PDF出力に失敗しました。ブラウザの「印刷」機能をご利用ください。');
    } finally {
      setIsExporting(false);
    }
  };

  const isAllEvent = event.name === '夜市全体' || event.id === 'event-all';

  return (
    <div className="space-y-6">
      {/* 夜市全体選択時の案内バー */}
      {isAllEvent && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border border-amber-500/30 rounded-2xl p-5 text-slate-300 shadow-xl flex items-start gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-white">
              現在は「夜市全体（出店者マスター名簿）」が表示されています
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              出店許可証は、各開催日（特定イベント）にエントリーした出店者に対してブース番号・消防安全基準と共に発行されます。<br />
              夜市全体の出店者は過去の全登録出店者名簿であり、特定イベントにエントリーしているわけではありません。
            </p>
            <p className="text-xs text-amber-400 font-semibold">
              💡 画面上部ヘッダーのイベント切り替えから、許可証を発行したい開催日を選択してください。
            </p>
          </div>
        </div>
      )}

      {/* 上部ヘッダー（印刷時は非表示） */}
      <div className="no-print bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-500"></span>
            出店者許可証（自動生成・一括まとめ印刷）
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            イベント当日に各ブースへ掲示・携帯する「出店許可証」をワンクリックで一括レイアウト・まとめ印刷します。
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button
            onClick={handleMarkAllIssued}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            全件を発行済みにする
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-600 transition shadow"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            印刷ダイアログを開く
          </button>

          <button
            onClick={handleExportAllPdf}
            disabled={isExporting || entries.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black text-xs shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? '一括PDF生成中...' : '全許可証を一括PDF保存'}
          </button>
        </div>
      </div>

      {/* 絞り込み・表示形式切り替え（印刷時非表示） */}
      <div className="no-print bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">表示絞り込み:</span>
          <select
            value={selectedBoothFilter}
            onChange={(e) => setSelectedBoothFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">全出店者 ({entries.length}ブース)</option>
            <option value="FIRE_ONLY">火気使用ブースのみ ({entries.filter(e => e.fireSafety.hasFireAppliance).length}店)</option>
            <option value="UNISSUED">未発行のみ ({entries.length - issuedCount}店)</option>
            {entries.map((e) => (
              <option key={e.id} value={e.id}>[{e.boothNumber}] {e.vendorSnapshot.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            発行進捗: <strong className="text-sky-400 font-mono">{issuedCount} / {entries.length}</strong> 件
          </span>

          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setLayoutMode('a4_single')}
              className={`px-2.5 py-1 rounded font-semibold transition ${
                layoutMode === 'a4_single' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              1枚 / A4 (掲示用)
            </button>
            <button
              onClick={() => setLayoutMode('a4_double')}
              className={`px-2.5 py-1 rounded font-semibold transition ${
                layoutMode === 'a4_double' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              2枚 / A4 (コンパクト)
            </button>
          </div>
        </div>
      </div>

      {filteredEntries.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <p className="text-slate-400 text-sm font-medium">
            {isAllEvent
              ? '「夜市全体」にはエントリー情報がないため、許可証プレビューはありません。開催イベントを選択してください。'
              : '該当する出店者の許可証データがありません。'}
          </p>
        </div>
      )}

      {/* 許可証プレビュー一覧（画面表示＆印刷領域） */}
      <div className={`grid gap-8 ${layoutMode === 'a4_double' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {filteredEntries.map((entry) => {
          const isFire = entry.fireSafety.hasFireAppliance;
          const isBanned = entry.vendorSnapshot.status === 'banned';

          return (
            <div
              key={entry.id}
              className="permit-card-target page-break bg-white text-slate-950 rounded-2xl p-8 border-4 border-slate-900 shadow-2xl relative flex flex-col justify-between"
              style={{ minHeight: layoutMode === 'a4_single' ? '680px' : '480px' }}
            >
              {/* カード上部：夜市タイトル・許可バッジ */}
              <div>
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
                  <div>
                    <span className="text-xs font-black tracking-widest text-orange-600 uppercase">
                      OFFICIAL VENDOR PERMIT
                    </span>
                    <h3 className="text-xl font-black tracking-tight text-slate-950">
                      {event.name} 出店許可証
                    </h3>
                    <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-3">
                      <span>開催日: {event.date}</span>
                      <span>場所: {event.venue}</span>
                    </div>
                  </div>

                  {/* 許可番号・QRコード */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-slate-100 border border-slate-300 rounded-lg flex flex-col items-center justify-center p-1">
                      <QrCode className="w-10 h-10 text-slate-800" />
                      <span className="text-[7px] text-slate-500 font-mono">VERIFIED</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">許可証番号</span>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        PMT-{entry.boothNumber}
                      </span>
                    </div>
                  </div>
                </div>

                {/* メイン情報：ブース番号 ＆ 屋号 */}
                <div className="grid grid-cols-12 gap-4 items-center bg-slate-100/70 p-4 rounded-xl border border-slate-300 mb-4">
                  {/* 特大ブース番号 */}
                  <div className="col-span-4 text-center border-r-2 border-slate-300 pr-2">
                    <span className="text-xs font-bold text-slate-500 block">BOOTH NO.</span>
                    <span className="text-4xl lg:text-5xl font-black font-mono tracking-tight text-slate-900">
                      {entry.boothNumber}
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 block mt-0.5">
                      {event.areas.find(a => a.code === entry.boothArea)?.name || entry.boothArea}
                    </span>
                  </div>

                  {/* 屋号・代表者・品目 */}
                  <div className="col-span-8 pl-2">
                    <span className="text-xs font-semibold text-slate-500 block">出店者名 (屋号)</span>
                    <h4 className="text-2xl font-black text-slate-900 tracking-wide flex items-center gap-2 flex-wrap">
                      <span>{entry.vendorSnapshot.name}</span>
                      {isVendorOrganization(entry.vendorSnapshot) && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm">
                          <Building2 className="w-3 h-3 text-white" />
                          登録団体
                        </span>
                      )}
                    </h4>
                    <div className="text-xs text-slate-700 mt-1 flex flex-wrap gap-x-4">
                      <span>代表: <strong>{entry.vendorSnapshot.ownerName}</strong> 様</span>
                      <span>連絡先: {entry.vendorSnapshot.phone}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      品目: <strong className="text-slate-800">{entry.vendorSnapshot.menuItems}</strong>
                    </div>
                  </div>
                </div>

                {/* 安全・設備承認バッジ */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* 火気安全ステータス */}
                  <div className={`p-3 rounded-xl border-2 flex items-center gap-3 ${
                    isFire
                      ? 'bg-red-50 border-red-500 text-red-950'
                      : 'bg-emerald-50 border-emerald-500 text-emerald-950'
                  }`}>
                    <div className={`p-2 rounded-lg ${isFire ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">
                        {isFire ? '【火気器具使用承認】' : '【火気厳禁ブース】'}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {isFire
                          ? `消火器点検済: ${entry.fireSafety.fireExtinguisher.capacity || '確認済'}`
                          : '火気・熱源の使用不可'}
                      </div>
                    </div>
                  </div>

                  {/* 電源・設備ステータス */}
                  <div className={`p-3 rounded-xl border-2 flex items-center gap-3 ${
                    entry.fee.powerOption || entry.fee.tentOption
                      ? 'bg-amber-50 border-amber-500 text-amber-950'
                      : 'bg-slate-50 border-slate-300 text-slate-700'
                  }`}>
                    <div className={`p-2 rounded-lg ${entry.fee.powerOption || entry.fee.tentOption ? 'bg-amber-500 text-slate-950' : 'bg-slate-300 text-slate-700'}`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">
                        {entry.fee.powerOption ? `電源使用許可 (${entry.fee.powerWatts || 1500}W)` : '電源利用なし'}
                        {entry.fee.tentOption && ` / テント貸出 (${entry.fee.tentCount || 1}張り)`}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        ゴミ全量各自持ち帰り
                        {entry.fee.equipmentRentalFee > 0 && ' ・その他備品貸出あり'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 運営注意事項 */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1 text-xs mb-0.5">
                    <span>【出店遵守事項】</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    <li>本許可証はブース正面の視認しやすい位置に必ず掲示してください。</li>
                    <li>火気使用ブースは常に消火器を手の届く場所に設置してください。</li>
                    <li>終了時刻（21:00）以降の販売は禁止です。22:00完全撤収を厳守してください。</li>
                    <li>生ゴミや廃油を会場内に投棄した場合は次回以降の出店停止処分となります。</li>
                  </ul>
                </div>
              </div>

              {/* カード最下部：発行印 ＆ 署名欄 */}
              <div className="mt-4 pt-3 border-t-2 border-slate-900 flex justify-between items-end text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">発行主体</span>
                  <span className="font-bold text-slate-900">{event.organizer}</span>
                  <span className="text-[10px] text-slate-600 block">本部緊急連絡: {event.contactPhone}</span>
                </div>

                {/* 発行承認印（朱肉風デザイン） */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">発行日</span>
                    <span className="font-mono text-slate-700 font-semibold">{entry.permitIssuedAt || event.date}</span>
                  </div>
                  <div className="w-14 h-14 rounded-full border-2 border-red-600 flex items-center justify-center p-1 rotate-[-8deg] shadow-inner">
                    <div className="w-12 h-12 rounded-full border border-red-500 flex flex-col items-center justify-center text-[9px] font-bold text-red-600 font-serif leading-tight">
                      <span>夜市</span>
                      <span className="border-y border-red-400 py-0.2">承認済</span>
                      <span>本部</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 画面プレビュー時の個別操作ボタン（印刷時は非表示） */}
              <div className="no-print mt-4 pt-3 border-t border-slate-200 flex justify-between items-center bg-slate-50 -mx-8 -mb-8 p-3 px-8 rounded-b-xl">
                <span className={`text-xs font-bold ${entry.permitIssued ? 'text-emerald-600' : 'text-slate-500'}`}>
                  ステータス: {entry.permitIssued ? '✓ 発行済' : '未発行'}
                </span>
                <button
                  onClick={() => handleToggleIssue(entry.id)}
                  className={`text-xs px-3 py-1 rounded-lg font-bold transition ${
                    entry.permitIssued
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-sky-500 text-white hover:bg-sky-600'
                  }`}
                >
                  {entry.permitIssued ? '発行取消' : '発行済みにする'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
