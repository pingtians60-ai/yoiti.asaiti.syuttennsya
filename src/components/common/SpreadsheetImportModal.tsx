import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Link as LinkIcon, 
  SlidersHorizontal, 
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Store,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { Vendor, EventEntry, NightMarketEvent } from '../../types';
import { 
  getSavedSheetUrl, 
  saveSheetUrl, 
  fetchGoogleSheetCsv, 
  parseCsvRows, 
  detectColumnMapping, 
  buildVendorsAndEntriesFromSheet,
  ColumnMapping 
} from '../../utils/googleSheets';

interface SpreadsheetImportModalProps {
  event: NightMarketEvent;
  existingVendors: Vendor[];
  existingEntries: EventEntry[];
  onClose: () => void;
  onImport: (vendors: Vendor[], entries: EventEntry[], count: number) => void;
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  event,
  existingVendors,
  existingEntries,
  onClose,
  onImport
}) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [activeInputMode, setActiveInputMode] = useState<'url' | 'paste'>('url');
  const [rawText, setRawText] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showShareGuide, setShowShareGuide] = useState(false);

  // 解析結果ステート
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [showMappingSettings, setShowMappingSettings] = useState(false);

  // プレビュー用生成データ
  const [previewVendors, setPreviewVendors] = useState<Vendor[]>([]);
  const [previewEntries, setPreviewEntries] = useState<EventEntry[]>([]);
  const [removedDuplicatesCount, setRemovedDuplicatesCount] = useState<number>(0);

  // CSVテキストまたはフェッチテキストからパース・マッピング実行
  const processCsvContent = (csvText: string) => {
    try {
      const rows = parseCsvRows(csvText);
      if (rows.length === 0 || (rows.length === 1 && rows[0].every(c => !c.trim()))) {
        setErrorMsg('データが見つかりませんでした。内容をご確認ください。');
        setParsedRows([]);
        setHeaders([]);
        setMapping(null);
        setPreviewVendors([]);
        setPreviewEntries([]);
        setRemovedDuplicatesCount(0);
        return;
      }

      const headerRow = rows[0];
      setParsedRows(rows);
      setHeaders(headerRow);

      const detected = detectColumnMapping(headerRow);
      setMapping(detected);

      // プレビュー生成（被り自動削除・統合適用）
      const built = buildVendorsAndEntriesFromSheet(rows, detected, event, existingVendors, existingEntries);
      setPreviewVendors(built.vendors);
      setPreviewEntries(built.entries);
      setRemovedDuplicatesCount(built.removedDuplicatesCount || 0);
      setErrorMsg('');
      setSuccessMsg(`スプレッドシートから ${rows.length - 1} 件を読み込みました！URLは消去されましたので、次のシートも続けて読み込めます。`);
    } catch (e: any) {
      setErrorMsg(e.message || 'CSVデータの解析に失敗しました。');
    }
  };

  // URLから自動フェッチ
  const handleFetchFromUrl = async () => {
    if (!sheetUrl.trim()) {
      setErrorMsg('GoogleスプレッドシートのURLを入力してください。');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const csv = await fetchGoogleSheetCsv(sheetUrl);
      processCsvContent(csv);
      // 読み込みが成功したらURLを消去（次のシートをすぐに読み込めるように）
      setSheetUrl('');
      saveSheetUrl('');
    } catch (err: any) {
      setErrorMsg(err.message || 'スプレッドシートの読み込みに失敗しました。');
      if (err.message && (err.message.includes('共有') || err.message.includes('アクセス'))) {
        setShowShareGuide(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ペースト内容の変更
  const handlePasteChange = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParsedRows([]);
      setHeaders([]);
      setMapping(null);
      setPreviewVendors([]);
      setPreviewEntries([]);
      return;
    }
    processCsvContent(text);
  };

  // ファイルアップロード
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        setActiveInputMode('paste');
        processCsvContent(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // マッピング手動変更時の再計算
  const handleMappingChange = (field: keyof ColumnMapping, colIndex: number) => {
    if (!mapping) return;
    const updated = { ...mapping, [field]: colIndex };
    setMapping(updated);
    if (parsedRows.length > 0) {
      const built = buildVendorsAndEntriesFromSheet(parsedRows, updated, event, existingVendors, existingEntries);
      setPreviewVendors(built.vendors);
      setPreviewEntries(built.entries);
    }
  };

  // 確定インポート
  const handleConfirmImport = () => {
    if (!mapping || parsedRows.length <= 1) return;
    const result = buildVendorsAndEntriesFromSheet(parsedRows, mapping, event, existingVendors, existingEntries);
    onImport(result.vendors, result.entries, result.importedCount);
    setSheetUrl('');
    saveSheetUrl('');
    onClose();
  };

  // 新規追加件数の算出
  const newImportCount = parsedRows.length > 1 ? parsedRows.length - 1 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* モーダルヘッダー */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Googleフォーム・スプレッドシート連携
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                  URL自動記入
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Googleフォームの回答スプレッドシートのURLを貼り付けるだけで、出店者・エントリー情報を一括自動記入します。
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="p-5 sm:p-6 space-y-5 text-xs overflow-y-auto flex-1">
          {/* 入力方式切り替えタブ */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 bg-slate-850 p-1 rounded-xl border border-slate-700/80">
              <button
                type="button"
                onClick={() => setActiveInputMode('url')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeInputMode === 'url'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                スプレッドシートURLから取得
              </button>
              <button
                type="button"
                onClick={() => setActiveInputMode('paste')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeInputMode === 'paste'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                手動ペースト / ファイル
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowShareGuide(!showShareGuide)}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>URLの共有設定方法</span>
            </button>
          </div>

          {/* 共有設定ガイド */}
          {showShareGuide && (
            <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-800/80 text-sky-200 text-xs space-y-2">
              <div className="font-bold flex items-center gap-2 text-sky-300">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                Googleスプレッドシートのアクセス許可手順（30秒で完了）
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed pl-1">
                <li>Googleフォームの回答スプレッドシートを開きます。</li>
                <li>画面右上の青い「<strong>共有</strong>」ボタンをクリックします。</li>
                <li>「一般的なアクセス」を「制限付き」から「<strong>リンクを知っている全員（閲覧者）</strong>」に変更します。</li>
                <li>「<strong>リンクをコピー</strong>」をクリックし、下記URL入力欄に貼り付けてください。</li>
              </ol>
            </div>
          )}

          {/* URL入力モード */}
          {activeInputMode === 'url' ? (
            <div className="space-y-3">
              <label className="block text-slate-300 font-semibold">
                Googleスプレッドシートの共有URL
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <LinkIcon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  {sheetUrl && (
                    <button
                      type="button"
                      onClick={() => setSheetUrl('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                      title="URLを消去"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleFetchFromUrl}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? '取得中...' : 'シートから自動読込'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ※ 複数枚のスプレッドシートを順番に読み込めます。読込完了後にURLは自動クリアされるため、続けて次のURLを貼り付けられます。
              </p>
            </div>
          ) : (
            /* 手動ペーストモード */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-semibold">
                  表データの貼り付け（スプレッドシートのセルをコピーして貼り付け）
                </label>
                <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer text-xs font-semibold">
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>CSVファイル選択</span>
                  <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder="Googleスプレッドシート上で「Ctrl+A → Ctrl+C」でコピーし、ここに「Ctrl+V」で貼り付けてください..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* 成功・案内メッセージ */}
          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl flex items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg('')}
                className="text-emerald-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* エラーメッセージ */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="whitespace-pre-line text-xs">{errorMsg}</div>
            </div>
          )}

          {/* カラム自動マッピング確認＆調整 */}
          {mapping && headers.length > 0 && (
            <div className="border border-slate-800 rounded-2xl bg-slate-850 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white text-xs">
                    設問列の自動マッピング（{headers.length}列を自動検出）
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMappingSettings(!showMappingSettings)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
                >
                  {showMappingSettings ? (
                    <>設定を隠す <ChevronUp className="w-3.5 h-3.5" /></>
                  ) : (
                    <>列の割り当てを調整 <ChevronDown className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>

              {/* サマリータグ */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  屋号: <strong className="text-amber-400">{mapping.nameCol >= 0 ? headers[mapping.nameCol] : '未検出'}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  代表者: <strong className="text-slate-100">{mapping.ownerNameCol >= 0 ? headers[mapping.ownerNameCol] : '未検出'}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  電話番号: <strong className="text-slate-100">{mapping.phoneCol >= 0 ? headers[mapping.phoneCol] : '未検出'}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  品目: <strong className="text-slate-100">{mapping.menuItemsCol >= 0 ? headers[mapping.menuItemsCol] : '未検出'}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  火気使用: <strong className="text-rose-400">{mapping.hasFireCol >= 0 ? headers[mapping.hasFireCol] : '未検出'}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  出店内容: <strong className="text-sky-400">{mapping.boothAreaCol >= 0 ? headers[mapping.boothAreaCol] : '未検出'}</strong>
                </span>
              </div>

              {/* 詳細設定ドロップダウン */}
              {showMappingSettings && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-750 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">屋号・店舗名の列</label>
                    <select
                      value={mapping.nameCol}
                      onChange={(e) => handleMappingChange('nameCol', Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value={-1}>（未指定）</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>列{i + 1}: {h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">代表者氏名の列</label>
                    <select
                      value={mapping.ownerNameCol}
                      onChange={(e) => handleMappingChange('ownerNameCol', Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value={-1}>（未指定）</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>列{i + 1}: {h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">電話番号の列</label>
                    <select
                      value={mapping.phoneCol}
                      onChange={(e) => handleMappingChange('phoneCol', Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value={-1}>（未指定）</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>列{i + 1}: {h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">メールアドレスの列</label>
                    <select
                      value={mapping.emailCol}
                      onChange={(e) => handleMappingChange('emailCol', Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value={-1}>（未指定）</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>列{i + 1}: {h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">販売品目・メニューの列</label>
                    <select
                      value={mapping.menuItemsCol}
                      onChange={(e) => handleMappingChange('menuItemsCol', Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value={-1}>（未指定）</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>列{i + 1}: {h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">火気器具使用の列</label>
                    <select
                      value={mapping.hasFireCol}
                      onChange={(e) => handleMappingChange('hasFireCol', Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value={-1}>（未指定）</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>列{i + 1}: {h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">出店内容（屋外出店/飲食露店/キッチンカー）の列</label>
                    <select
                      value={mapping.boothAreaCol}
                      onChange={(e) => handleMappingChange('boothAreaCol', Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value={-1}>（未指定）</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>列{i + 1}: {h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 解析プレビュー */}
          {parsedRows.length > 1 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-slate-300 font-bold">
                <span className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-400" />
                  自動記入プレビュー ({newImportCount}件の回答を検出)
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 正常に構造化されました
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-2xl divide-y divide-slate-800 bg-slate-850">
                {previewEntries.slice(-newImportCount).map((entry, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-800/60 transition">
                    <div className="space-y-0.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{entry.vendorSnapshot.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {entry.boothNumber}
                        </span>
                        {entry.fireSafety.hasFireAppliance && entry.fireSafety.appliances.map((app, aIdx) => (
                          <span key={aIdx} className="text-[10px] px-2 py-0.5 rounded bg-orange-950 border border-orange-800 text-orange-300 font-bold flex items-center gap-1 whitespace-nowrap shadow-sm">
                            <Flame className="w-3 h-3 text-red-400 shrink-0" />
                            {app.fuel} × {app.count}台
                          </span>
                        ))}
                        {entry.vendorSnapshot.status === 'banned' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-600 text-white font-bold">出禁</span>
                        )}
                        {entry.vendorSnapshot.status === 'warning' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-black font-bold">要注意</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        代表: {entry.vendorSnapshot.ownerName} | TEL: {entry.vendorSnapshot.phone || '未記入'} | 品目: {entry.vendorSnapshot.menuItems}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400 block">
                        ¥{entry.fee.totalAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {event.areas.find(a => a.code === entry.boothArea)?.name || entry.boothArea}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {newImportCount > 0 ? (
              <div>
                新規および更新: <strong className="text-white font-bold">{newImportCount}件</strong>
                {removedDuplicatesCount > 0 && (
                  <span className="ml-2 text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/80">
                    ※ 被り出店者 {removedDuplicatesCount}件を自動削除・統合
                  </span>
                )}
              </div>
            ) : (
              <span>スプレッドシートのURLを指定して読込を押してください</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={newImportCount === 0}
              className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/20"
            >
              <Check className="w-4 h-4" />
              システムに自動記入して反映
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
