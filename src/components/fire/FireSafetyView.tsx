import React, { useState } from 'react';
import { 
  Flame, 
  FileText, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileCheck, 
  Printer, 
  ExternalLink,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  User,
  Building2
} from 'lucide-react';
import { EventEntry, NightMarketEvent, FireSafetyInfo, FireApplianceType, Vendor, isVendorOrganization } from '../../types';
import { mergePdfDocuments, createSampleDocPdf, FileItemToMerge } from '../../utils/pdfMerger';

interface FireSafetyViewProps {
  event: NightMarketEvent;
  entries: EventEntry[];
  vendors?: Vendor[];
  onUpdateEntries: (entries: EventEntry[]) => void;
  onUpdateVendors?: (vendors: Vendor[]) => void;
}

export const FireSafetyView: React.FC<FireSafetyViewProps> = ({
  event,
  entries,
  vendors,
  onUpdateEntries,
  onUpdateVendors
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'appliance_list' | 'pdf_merger' | 'official_form'>('appliance_list');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeStatus, setMergeStatus] = useState<string | null>(null);
  const [editingFireEntry, setEditingFireEntry] = useState<EventEntry | null>(null);

  // 火気使用店舗
  const fireEntries = entries.filter((e) => e.fireSafety.hasFireAppliance);
  const noFireEntries = entries.filter((e) => !e.fireSafety.hasFireAppliance);

  // 消火器未配備または未確認の店舗
  const missingExtinguisher = fireEntries.filter((e) => !e.fireSafety.fireExtinguisher.installed);
  const uncheckedEntries = fireEntries.filter((e) => !e.fireSafety.checkedByStaff);

  // 全提出書類のカウント
  const totalDocsCount = entries.reduce(
    (sum, e) => sum + e.fireSafety.submittedDocuments.length,
    0
  );

  // 消防書類PDFのワンクリック結合（まとめ）実行
  const handleMergeAllPdfs = async () => {
    setIsMerging(true);
    setMergeStatus('PDFファイルを収集・解析中...');

    try {
      const filesToMerge: FileItemToMerge[] = [];

      for (const entry of entries) {
        if (!entry.fireSafety.hasFireAppliance && entry.fireSafety.submittedDocuments.length === 0) {
          continue;
        }

        // 提出済み書類がある場合
        if (entry.fireSafety.submittedDocuments.length > 0) {
          for (const doc of entry.fireSafety.submittedDocuments) {
            // もしアップロードされた生データ(Uint8Array)等があればそれを使用、なければ動的サンプルPDFを生成
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
          // 書類未提出だが火気がある場合、安全台帳シートを1枚自動添付
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

      setMergeStatus(`${filesToMerge.length}件の書類を結合中...`);
      const mergedBytes = await mergePdfDocuments(filesToMerge, event, true);

      // ブラウザダウンロード
      const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `消防届出書類まとめ_${event.name.replace(/\s+/g, '_')}_${event.date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setMergeStatus('一括PDFの結合・ダウンロードが完了しました！');
      setTimeout(() => setMergeStatus(null), 4000);
    } catch (err) {
      console.error('PDFマージエラー:', err);
      setMergeStatus('PDFの結合中にエラーが発生しました。');
    } finally {
      setIsMerging(false);
    }
  };

  // ファイルアップロード処理（書類の個別追加）
  const handleFileUpload = (entryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newDoc = {
      id: `doc-${Date.now()}`,
      title: file.name,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    const updatedEntries = entries.map((entry) => {
      if (entry.id === entryId) {
        return {
          ...entry,
          fireSafety: {
            ...entry.fireSafety,
            submittedDocuments: [...entry.fireSafety.submittedDocuments, newDoc]
          }
        };
      }
      return entry;
    });

    onUpdateEntries(updatedEntries);
    e.target.value = '';
  };

  // 書類削除
  const handleDeleteDoc = (entryId: string, docId: string) => {
    const updatedEntries = entries.map((entry) => {
      if (entry.id === entryId) {
        return {
          ...entry,
          fireSafety: {
            ...entry.fireSafety,
            submittedDocuments: entry.fireSafety.submittedDocuments.filter(d => d.id !== docId)
          }
        };
      }
      return entry;
    });
    onUpdateEntries(updatedEntries);
  };

  // 点検確認ステータスのトグル
  const handleToggleStaffCheck = (entryId: string) => {
    const updated = entries.map((e) => {
      if (e.id === entryId) {
        return {
          ...e,
          fireSafety: {
            ...e.fireSafety,
            checkedByStaff: !e.fireSafety.checkedByStaff
          }
        };
      }
      return e;
    });
    onUpdateEntries(updated);
  };

  const isAllEvent = event.name === '夜市全体' || event.id === 'event-all';

  return (
    <div className="space-y-6">
      {/* 夜市全体選択時の案内バー */}
      {isAllEvent && (
        <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-slate-900 border border-orange-500/30 rounded-2xl p-5 text-slate-300 shadow-xl flex items-start gap-4">
          <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl shrink-0 mt-0.5">
            <Flame className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-white">
              現在は「夜市全体（出店者マスター名簿）」が表示されています
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              所轄消防署への火気使用届出・消火器点検確認・消防提出書類PDFの結合は、各開催日（特定イベント）のエントリーに対して行います。<br />
              夜市全体の出店者は過去の全登録出店者名簿であり、特定イベントにエントリーしているわけではありません。
            </p>
            <p className="text-xs text-orange-400 font-semibold">
              💡 画面上部ヘッダーのイベント切り替えから、消防届出を行いたい開催日を選択してください。
            </p>
          </div>
        </div>
      )}

      {/* 消防サマリーヘッダー */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></span>
            消防管理（火気使用一覧・消防書類PDFまとめ）
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            所轄消防署（{event.fireDepartmentName}）への届出に必要な火気器具一覧の管理と、提出書類PDFのワンクリック結合を行います。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleMergeAllPdfs}
            disabled={isMerging || entries.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-slate-950 font-black text-xs shadow-lg shadow-orange-500/25 transition disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {isMerging ? '結合中...' : '消防書類を1本のPDFにまとめる'}
          </button>
        </div>
      </div>

      {mergeStatus && (
        <div className="p-4 bg-orange-950/60 border border-orange-600 rounded-xl text-orange-200 text-xs flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>{mergeStatus}</span>
        </div>
      )}

      {/* 警告通知（消火器未配備など） */}
      {missingExtinguisher.length > 0 && (
        <div className="p-4 bg-rose-950/50 border border-rose-600 rounded-xl text-rose-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-rose-300">
              【消防指導違反警告】火気を使用するのに消火器が未持参・未設置の店舗があります！
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              {missingExtinguisher.map((e) => (
                <span key={e.id} className="px-2 py-0.5 rounded bg-rose-900/80 font-mono font-bold">
                  [{e.boothNumber}] {e.vendorSnapshot.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* サブタブナビゲーション */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveSubTab('appliance_list')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
            activeSubTab === 'appliance_list'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          火気器具・消火器 台帳一覧 ({fireEntries.length}店舗)
        </button>

        <button
          onClick={() => setActiveSubTab('pdf_merger')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'pdf_merger'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          提出書類PDFまとめ・アップロード ({totalDocsCount}件)
        </button>

        <button
          onClick={() => setActiveSubTab('official_form')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'official_form'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          消防署届出用一覧プレビュー（印刷用）
        </button>
      </div>

      {/* 1. 火気器具・消火器 台帳一覧 */}
      {activeSubTab === 'appliance_list' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-800/60 border-b border-slate-700 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-200">
                火気使用ブース ({fireEntries.length}店) / 火気なし ({noFireEntries.length}店)
              </span>
              <span className="text-slate-400">
                消火器配備率: <strong className="text-emerald-400 font-mono">
                  {fireEntries.length > 0 ? Math.round(((fireEntries.length - missingExtinguisher.length) / fireEntries.length) * 100) : 100}%
                </strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/40 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">場所</th>
                    <th className="py-3 px-4">屋号・品目</th>
                    <th className="py-3 px-4">使用火気器具・燃料</th>
                    <th className="py-3 px-4">持参消火器情報</th>
                    <th className="py-3 px-4">提出書類</th>
                    <th className="py-3 px-4">運営確認</th>
                    <th className="py-3 px-4 text-right">編集</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {fireEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/30 transition">
                      {/* ブース番号 */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-amber-400 text-sm">
                        {entry.boothNumber}
                      </td>

                      {/* 屋号・品目 */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                          {isVendorOrganization(entry.vendorSnapshot) && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] inline-flex items-center gap-1 shadow-sm shrink-0">
                              <Building2 className="w-2.5 h-2.5 text-slate-950" />
                              登録団体
                            </span>
                          )}
                          <span>{entry.vendorSnapshot.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{entry.vendorSnapshot.menuItems}</div>
                      </td>

                      {/* 火気器具・使用燃料（燃料バッジを一番最初に配置） */}
                      <td className="py-3 px-4 min-w-[240px]">
                        <div className="space-y-1.5">
                          {entry.fireSafety.appliances
                            .slice()
                            .sort((a, b) => {
                              const aGen = /ガソリン|発電機/.test(a.fuel + a.name);
                              const bGen = /ガソリン|発電機/.test(b.fuel + b.name);
                              if (aGen && !bGen) return -1;
                              if (!aGen && bGen) return 1;
                              return 0;
                            })
                            .map((app, idx) => {
                            const isGenerator = /ガソリン|発電機/.test(app.fuel + app.name);
                            const isLpg = /LP|プロパン|ボンベ/.test(app.fuel + app.name);
                            const isCharcoal = /炭/.test(app.fuel + app.name);
                            const isCassette = /カセット/.test(app.fuel + app.name);

                            return (
                              <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                                {/* 燃料・台数バッジを一番最初に配置 */}
                                <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold inline-flex items-center gap-1 whitespace-nowrap shadow-sm border ${
                                  isGenerator
                                    ? 'bg-orange-950/90 text-orange-200 border-orange-600 shadow-orange-950/50'
                                    : isLpg
                                    ? 'bg-sky-950/90 text-sky-200 border-sky-600 shadow-sky-950/50'
                                    : isCharcoal
                                    ? 'bg-amber-950/90 text-amber-200 border-amber-600 shadow-amber-950/50'
                                    : isCassette
                                    ? 'bg-yellow-950/90 text-yellow-200 border-yellow-600 shadow-yellow-950/50'
                                    : 'bg-slate-800 text-slate-200 border-slate-700'
                                }`}>
                                  {isGenerator ? (
                                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  ) : (
                                    <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  )}
                                  <span>{app.fuel} × {app.count}台</span>
                                </span>

                                {/* 器具名 */}
                                <div className="flex items-center gap-1 text-slate-200 font-semibold truncate">
                                  <span className="truncate">{app.name}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* 消火器 */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {entry.fireSafety.fireExtinguisher.installed ? (
                          <div>
                            <div className="flex items-center gap-1 text-emerald-400 font-bold">
                              <ShieldCheck className="w-4 h-4" />
                              <span>{entry.fireSafety.fireExtinguisher.capacity} ({entry.fireSafety.fireExtinguisher.count}本)</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {entry.fireSafety.fireExtinguisher.type} / {entry.fireSafety.fireExtinguisher.manufacturingYear}
                            </div>
                          </div>
                        ) : (
                          <div className="text-rose-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 animate-bounce" />
                            <span>消火器未設置！</span>
                          </div>
                        )}
                      </td>

                      {/* 提出書類 */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            entry.fireSafety.submittedDocuments.length > 0
                              ? 'bg-slate-800 text-sky-400 border border-slate-700'
                              : 'bg-rose-950/40 text-rose-300 border border-rose-800'
                          }`}>
                            {entry.fireSafety.submittedDocuments.length}点 添付済
                          </span>
                        </div>
                      </td>

                      {/* 運営確認 */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStaffCheck(entry.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                            entry.fireSafety.checkedByStaff
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{entry.fireSafety.checkedByStaff ? '確認済' : '未確認'}</span>
                        </button>
                      </td>

                      {/* 編集ボタン */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setEditingFireEntry(entry)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                        >
                          器具・書類設定
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. 提出書類PDFまとめ・アップロード */}
      {activeSubTab === 'pdf_merger' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-orange-400" />
                  出店者提出 消防関係PDF書類の一括まとめ
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  消火器点検表・器具仕様書・配置見取り図などのPDFを各ブースごとにアップロード＆管理。
                  「1本のPDFにまとめる」を押すと、消防署提出用の目次表紙付きの単一PDFとして一括合成されます。
                </p>
              </div>

              <button
                onClick={handleMergeAllPdfs}
                disabled={isMerging}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-xs shadow-lg transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                全書類を1本にまとめてダウンロード
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs">
                        {entry.boothNumber}
                      </span>
                      <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5 flex-wrap">
                        {isVendorOrganization(entry.vendorSnapshot) && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] inline-flex items-center gap-1 shadow-sm shrink-0">
                            <Building2 className="w-2.5 h-2.5 text-slate-950" />
                            登録団体
                          </span>
                        )}
                        <span>{entry.vendorSnapshot.name}</span>
                      </span>
                    </div>
                    {entry.fireSafety.hasFireAppliance ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                        火気使用あり
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        火気なし
                      </span>
                    )}
                  </div>

                  {/* 添付書類リスト */}
                  <div className="space-y-1.5 my-3 min-h-[40px]">
                    {entry.fireSafety.submittedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2 text-slate-300 truncate">
                          <FileText className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                          <span className="truncate">{doc.title}</span>
                          <span className="text-[10px] text-slate-500">({doc.uploadedAt})</span>
                        </div>
                        <button
                          onClick={() => handleDeleteDoc(entry.id, doc.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="削除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {entry.fireSafety.submittedDocuments.length === 0 && (
                      <div className="text-xs text-slate-500 italic py-1">
                        添付書類なし (火気ありの場合は自動で台帳シートが付与されます)
                      </div>
                    )}
                  </div>

                  {/* PDF追加アップロードボタン */}
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>書類PDF/画像を追加</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(entry.id, e)}
                      className="hidden"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. 消防署届出用一覧プレビュー（印刷用） */}
      {activeSubTab === 'official_form' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-3 no-print">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition shadow"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              印刷 / ブラウザPDF保存
            </button>
          </div>

          <div className="bg-white text-slate-900 rounded-xl p-8 shadow-2xl font-serif text-sm space-y-6 print:shadow-none">
            {/* 届出書ヘッダー */}
            <div className="text-center border-b-2 border-slate-900 pb-4">
              <h2 className="text-2xl font-bold tracking-wider">露店等の開設に伴う火気使用器具等届出台帳</h2>
              <p className="text-xs text-slate-600 mt-1">（消防署・予防課提出用 添付別紙）</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p><strong>催物名称:</strong> {event.name}</p>
                <p><strong>開催日時:</strong> {event.date} {event.time}</p>
                <p><strong>開催場所:</strong> {event.venue}</p>
              </div>
              <div className="text-right">
                <p><strong>提出先:</strong> {event.fireDepartmentName}</p>
                <p><strong>主催者・届出者:</strong> {event.organizer}</p>
                <p><strong>本部緊急連絡先:</strong> {event.contactPhone}</p>
              </div>
            </div>

            {/* 火気器具・消火器一覧表 */}
            <div>
              <table className="w-full border-collapse border border-slate-400 text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400">
                    <th className="border border-slate-400 p-2 w-16 text-center">番号</th>
                    <th className="border border-slate-400 p-2 w-36">出店者名 (屋号)</th>
                    <th className="border border-slate-400 p-2 w-28">代表者 / 連絡先</th>
                    <th className="border border-slate-400 p-2">使用する火気器具・燃料</th>
                    <th className="border border-slate-400 p-2 w-32">消火器配備情報</th>
                    <th className="border border-slate-400 p-2 w-20 text-center">点検確認</th>
                  </tr>
                </thead>
                <tbody>
                  {fireEntries.map((e, idx) => (
                    <tr key={e.id} className="border-b border-slate-300">
                      <td className="border border-slate-400 p-2 text-center font-bold font-mono">
                        {e.boothNumber}
                      </td>
                      <td className="border border-slate-400 p-2 font-bold">
                        {e.vendorSnapshot.name}
                      </td>
                      <td className="border border-slate-400 p-2">
                        {e.vendorSnapshot.ownerName}<br />
                        <span className="text-[10px] text-slate-600">{e.vendorSnapshot.phone}</span>
                      </td>
                      <td className="border border-slate-400 p-2">
                        {e.fireSafety.appliances.map((a, aIdx) => (
                          <div key={aIdx}>
                            ・{a.name} ({a.fuel}) × {a.count}
                          </div>
                        ))}
                      </td>
                      <td className="border border-slate-400 p-2 text-[11px]">
                        {e.fireSafety.fireExtinguisher.installed ? (
                          <>
                            {e.fireSafety.fireExtinguisher.capacity}<br />
                            ({e.fireSafety.fireExtinguisher.manufacturingYear})
                          </>
                        ) : (
                          <span className="text-red-600 font-bold">未設置</span>
                        )}
                      </td>
                      <td className="border border-slate-400 p-2 text-center">
                        {e.fireSafety.checkedByStaff ? '良 [済]' : '確認中'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-slate-600 border-t border-slate-300 pt-3">
              ※ 火気器具を使用する全ての露店・キッチンカーに業務用消火器の設置および安全弁点検を義務付けています。
            </div>
          </div>
        </div>
      )}

      {/* 火気器具・消火器編集モーダル */}
      {editingFireEntry && (
        <FireDetailModal
          entry={editingFireEntry}
          onClose={() => setEditingFireEntry(null)}
          onSave={(updated) => {
            onUpdateEntries(entries.map((e) => (e.id === updated.id ? updated : e)));
            if (onUpdateVendors && vendors) {
              onUpdateVendors(vendors.map((v) => (v.id === updated.vendorSnapshot.id ? { ...v, ...updated.vendorSnapshot } : v)));
            }
            setEditingFireEntry(null);
          }}
        />
      )}
    </div>
  );
};

// 火気器具・消火器詳細設定モーダル
interface FireDetailModalProps {
  entry: EventEntry;
  onClose: () => void;
  onSave: (entry: EventEntry) => void;
}

const FireDetailModal: React.FC<FireDetailModalProps> = ({
  entry,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<EventEntry>({ ...entry });

  // 器具の追加
  const handleAddAppliance = () => {
    setFormData({
      ...formData,
      fireSafety: {
        ...formData.fireSafety,
        hasFireAppliance: true,
        appliances: [
          ...formData.fireSafety.appliances,
          { type: 'cassette_stove', name: '新規コンロ・火気', fuel: 'ガスボンベ', count: 1 }
        ]
      }
    });
  };

  // 器具の削除
  const handleRemoveAppliance = (idx: number) => {
    const updated = formData.fireSafety.appliances.filter((_, i) => i !== idx);
    setFormData({
      ...formData,
      fireSafety: {
        ...formData.fireSafety,
        appliances: updated,
        hasFireAppliance: updated.length > 0
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              消防・火気器具設定: [{formData.boothNumber}] {formData.vendorSnapshot.name}
            </h3>
            <p className="text-xs text-slate-400">代表: {formData.vendorSnapshot.ownerName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* 出店者・代表者基本情報 */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-3">
            <div className="font-bold text-slate-200 flex items-center gap-2">
              <User className="w-4 h-4 text-orange-400" />
              <span>出店者・代表者情報（変更可能）</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">屋号・店舗名</label>
                <input
                  type="text"
                  value={formData.vendorSnapshot.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    vendorSnapshot: { ...formData.vendorSnapshot, name: e.target.value }
                  })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">代表者氏名</label>
                <input
                  type="text"
                  value={formData.vendorSnapshot.ownerName}
                  onChange={(e) => setFormData({
                    ...formData,
                    vendorSnapshot: { ...formData.vendorSnapshot, ownerName: e.target.value }
                  })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">電話番号</label>
                <input
                  type="text"
                  value={formData.vendorSnapshot.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    vendorSnapshot: { ...formData.vendorSnapshot, phone: e.target.value }
                  })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">出店品目</label>
                <input
                  type="text"
                  value={formData.vendorSnapshot.menuItems}
                  onChange={(e) => setFormData({
                    ...formData,
                    vendorSnapshot: { ...formData.vendorSnapshot, menuItems: e.target.value }
                  })}
                  placeholder="例: たこ焼き、唐揚げなど"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>
          {/* 火気使用フラグ */}
          <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-800/60 rounded-xl border border-slate-700">
            <input
              type="checkbox"
              checked={formData.fireSafety.hasFireAppliance}
              onChange={(e) => setFormData({
                ...formData,
                fireSafety: { ...formData.fireSafety, hasFireAppliance: e.target.checked }
              })}
              className="rounded bg-slate-800 border-slate-700 text-orange-500"
            />
            <span className="font-bold text-slate-200">このブースは火気器具を使用する</span>
          </label>

          {formData.fireSafety.hasFireAppliance && (
            <>
              {/* 火気器具一覧 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-300">使用火気器具</span>
                  <button
                    onClick={handleAddAppliance}
                    className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> 器具を追加
                  </button>
                </div>

                {formData.fireSafety.appliances.map((app, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-800/40 p-2.5 rounded-lg border border-slate-700">
                    <input
                      type="text"
                      placeholder="器具名（例: 2口ガスコンロ）"
                      value={app.name}
                      onChange={(e) => {
                        const updated = [...formData.fireSafety.appliances];
                        updated[idx].name = e.target.value;
                        setFormData({ ...formData, fireSafety: { ...formData.fireSafety, appliances: updated } });
                      }}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                    <input
                      type="text"
                      placeholder="燃料（例: LPガス 5kg）"
                      value={app.fuel}
                      onChange={(e) => {
                        const updated = [...formData.fireSafety.appliances];
                        updated[idx].fuel = e.target.value;
                        setFormData({ ...formData, fireSafety: { ...formData.fireSafety, appliances: updated } });
                      }}
                      className="w-36 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                    <input
                      type="number"
                      min={1}
                      value={app.count}
                      onChange={(e) => {
                        const updated = [...formData.fireSafety.appliances];
                        updated[idx].count = Number(e.target.value);
                        setFormData({ ...formData, fireSafety: { ...formData.fireSafety, appliances: updated } });
                      }}
                      className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono text-center"
                    />
                    <button
                      onClick={() => handleRemoveAppliance(idx)}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* 消火器情報 */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200">消火器の配備状況（※必須）</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.fireSafety.fireExtinguisher.installed}
                      onChange={(e) => setFormData({
                        ...formData,
                        fireSafety: {
                          ...formData.fireSafety,
                          fireExtinguisher: {
                            ...formData.fireSafety.fireExtinguisher,
                            installed: e.target.checked
                          }
                        }
                      })}
                      className="rounded bg-slate-800 text-emerald-500"
                    />
                    <span className="text-xs font-semibold text-emerald-400">消火器持参済</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">能力単位・型</label>
                    <input
                      type="text"
                      value={formData.fireSafety.fireExtinguisher.capacity}
                      onChange={(e) => setFormData({
                        ...formData,
                        fireSafety: {
                          ...formData.fireSafety,
                          fireExtinguisher: { ...formData.fireSafety.fireExtinguisher, capacity: e.target.value }
                        }
                      })}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">製造年・点検状況</label>
                    <input
                      type="text"
                      value={formData.fireSafety.fireExtinguisher.manufacturingYear}
                      onChange={(e) => setFormData({
                        ...formData,
                        fireSafety: {
                          ...formData.fireSafety,
                          fireExtinguisher: { ...formData.fireSafety.fireExtinguisher, manufacturingYear: e.target.value }
                        }
                      })}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 運営スタッフ確認 */}
          <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-800/40 rounded-xl border border-slate-700">
            <input
              type="checkbox"
              checked={formData.fireSafety.checkedByStaff}
              onChange={(e) => setFormData({
                ...formData,
                fireSafety: { ...formData.fireSafety, checkedByStaff: e.target.checked }
              })}
              className="rounded bg-slate-800 text-emerald-500"
            />
            <span className="font-semibold text-slate-300">運営スタッフによる消防・火気現物確認完了</span>
          </label>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
            キャンセル
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
};
