import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Store,
  User,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  History,
  Tag,
  FileText,
  Edit3,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Download,
  CheckCircle2,
  Plus,
  Trash2,
  Upload,
  Clipboard,
  Image as ImageIcon,
  Eye,
  Maximize2,
  FileIcon,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Building2
} from 'lucide-react';
import { Vendor, EventEntry, NightMarketEvent, FireApplianceType, SubmittedLicense, isVendorOrganization, getVendorCategoryLabel } from '../../types';
import { Instagram, getInstagramUrl, getInstagramHandle } from '../../utils/instagram';

interface VendorDetailModalProps {
  vendor: Vendor;
  entry?: EventEntry;
  event: NightMarketEvent;
  onClose: () => void;
  onEdit?: (vendor: Vendor) => void;
  onUpdateEntry?: (entry: EventEntry) => void;
  onUpdateVendor?: (vendor: Vendor) => void;
  initialTab?: 'info' | 'fire' | 'permit';
}

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({
  vendor,
  entry,
  event,
  onClose,
  onEdit,
  onUpdateEntry,
  onUpdateVendor,
  initialTab = 'info'
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'fire' | 'permit'>(initialTab);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 提出許可証管理ステート
  const [licenseTitle, setLicenseTitle] = useState('飲食店営業許可証');
  const [licenseNumber, setLicenseNumber] = useState(vendor.foodLicenseNumber || '');
  const [licenseExpiry, setLicenseExpiry] = useState(vendor.licenseExpiryDate || '');
  const [licenseUrlInput, setLicenseUrlInput] = useState('');
  const [licenseNotes, setLicenseNotes] = useState('');
  const [previewModalImage, setPreviewModalImage] = useState<{ src: string; title: string } | null>(null);
  const [previewModalDrive, setPreviewModalDrive] = useState<{ url: string; title: string } | null>(null);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Driveリンク情報抽出ヘルパー
  const extractGoogleDriveInfo = (url?: string) => {
    if (!url || !url.includes('drive.google.com')) return null;
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      const fileId = fileMatch[1];
      return {
        type: 'file' as const,
        fileId,
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
        openUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
      };
    }
    const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch) {
      const fileId = idParamMatch[1];
      return {
        type: 'file' as const,
        fileId,
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
        openUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
      };
    }
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) {
      return {
        type: 'folder' as const,
        fileId: folderMatch[1],
        previewUrl: url,
        thumbnailUrl: '',
        openUrl: url
      };
    }
    return {
      type: 'other' as const,
      fileId: '',
      previewUrl: url,
      thumbnailUrl: '',
      openUrl: url
    };
  };

  // 火気器具の簡易追加用
  const [newApplianceName, setNewApplianceName] = useState('');
  const [newApplianceFuel, setNewApplianceFuel] = useState('LPガス');
  const [newApplianceCount, setNewApplianceCount] = useState(1);

  const isBanned = vendor.status === 'banned';
  const isWarning = vendor.status === 'warning';

  // 登録済み許可証の取得
  const existingLicenses: SubmittedLicense[] = (
    entry?.submittedLicenses && entry.submittedLicenses.length > 0
      ? entry.submittedLicenses
      : vendor.submittedLicenses && vendor.submittedLicenses.length > 0
      ? vendor.submittedLicenses
      : vendor.hasFoodLicense
      ? [
          {
            id: 'legacy-food-license',
            title: '飲食店営業許可証 (登録済)',
            fileType: 'text',
            licenseNumber: vendor.foodLicenseNumber || '第34-08129号',
            expiryDate: vendor.licenseExpiryDate || '2027-03-31',
            submittedAt: '2026-04-01',
            verified: true,
            notes: '台帳登録済情報'
          }
        ]
      : []
  );

  // 許可証リストの更新＆親コンポーネント同期
  const handleUpdateLicenses = (newLicenses: SubmittedLicense[]) => {
    const primaryLic = newLicenses[0];
    const updatedVendor: Vendor = {
      ...vendor,
      submittedLicenses: newLicenses,
      hasFoodLicense: newLicenses.length > 0,
      foodLicenseNumber: primaryLic?.licenseNumber || vendor.foodLicenseNumber,
      licenseExpiryDate: primaryLic?.expiryDate || vendor.licenseExpiryDate
    };

    if (onUpdateVendor) {
      onUpdateVendor(updatedVendor);
    }

    if (entry && onUpdateEntry) {
      onUpdateEntry({
        ...entry,
        vendorSnapshot: {
          ...entry.vendorSnapshot,
          ...updatedVendor
        },
        submittedLicenses: newLicenses,
        permitIssued: newLicenses.length > 0 && newLicenses.some(l => l.verified)
      });
    }
  };

  // 許可証の追加共通処理
  const addLicenseItem = (item: {
    title: string;
    fileType: 'image' | 'pdf' | 'url' | 'text';
    fileData?: string;
    fileName?: string;
    licenseNumber?: string;
    expiryDate?: string;
    notes?: string;
  }) => {
    const newLic: SubmittedLicense = {
      id: `lic-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: item.title || licenseTitle || '営業許可証',
      fileType: item.fileType,
      fileData: item.fileData,
      fileName: item.fileName,
      licenseNumber: item.licenseNumber || licenseNumber || undefined,
      expiryDate: item.expiryDate || licenseExpiry || undefined,
      submittedAt: new Date().toISOString().split('T')[0],
      verified: true, // 管理者が登録・確認したため初期値確認済
      notes: item.notes || licenseNotes || undefined
    };

    const nextList = [newLic, ...existingLicenses];
    handleUpdateLicenses(nextList);
    setPasteNotice(`「${newLic.title}」を反映しました`);
    setTimeout(() => setPasteNotice(null), 3500);

    // 入力欄をクリア
    setLicenseUrlInput('');
    setLicenseNotes('');
  };

  // Google Driveリンク反映ハンドラー
  const handleApplyGoogleDriveLink = (targetUrl?: string) => {
    const rawLink = (targetUrl || licenseUrlInput).trim();
    if (!rawLink) {
      alert('Google Driveのリンクを入力または貼り付けてください。');
      return;
    }
    const gDrive = extractGoogleDriveInfo(rawLink);
    const isGDrive = !!gDrive;

    addLicenseItem({
      title: licenseTitle ? `${licenseTitle} (Google Drive)` : '飲食店営業許可証 (Google Drive)',
      fileType: 'url',
      fileData: rawLink,
      fileName: isGDrive ? 'Google Drive共有リンク' : 'WEBリンク',
      licenseNumber: licenseNumber,
      expiryDate: licenseExpiry,
      notes: isGDrive ? 'Google Driveリンクより即座反映' : undefined
    });
    setPasteNotice(isGDrive ? '✓ Google Driveの営業許可証リンクを反映しました！' : '✓ 営業許可証URLを反映しました');
  };

  // ファイル読み込み処理
  const handleFileProcess = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      alert('画像ファイル (JPEG/PNG/WebP) または PDFファイルを選択してください。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      addLicenseItem({
        title: licenseTitle || (isImage ? '営業許可証(画像)' : '営業許可証(PDF)'),
        fileType: isImage ? 'image' : 'pdf',
        fileData: result,
        fileName: file.name,
        licenseNumber: licenseNumber,
        expiryDate: licenseExpiry
      });
    };
    reader.readAsDataURL(file);
  };

  // ファイルインプットからの選択
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ドラッグ＆ドロップ処理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  // クリップボードからの貼り付けボタン
  const handlePasteFromClipboardBtn = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        alert('このブラウザでは直接貼り付けボタンが非対応のため、画面上でキーボードの [Ctrl + V] を押してGoogle Driveリンクや画像を貼り付けてください。');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      let foundImage = false;

      for (const item of clipboardItems) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `pasted-license-${Date.now()}.png`, { type: imageType });
          handleFileProcess(file);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const trimmed = text.trim();
          if (trimmed.includes('drive.google.com')) {
            handleApplyGoogleDriveLink(trimmed);
          } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            addLicenseItem({
              title: licenseTitle || '営業許可証URL',
              fileType: 'url',
              fileData: trimmed,
              fileName: 'WEBリンク',
              licenseNumber: licenseNumber,
              expiryDate: licenseExpiry
            });
          } else {
            addLicenseItem({
              title: licenseTitle || '許可番号(テキスト提出)',
              fileType: 'text',
              licenseNumber: trimmed,
              expiryDate: licenseExpiry,
              notes: 'クリップボードより貼り付け'
            });
          }
        } else {
          alert('クリップボードにGoogle Driveリンクや画像が見つかりませんでした。\nリンクをコピーした状態で再度お試しください。');
        }
      }
    } catch (err) {
      console.warn('Clipboard read error, fallback:', err);
      alert('クリップボードのアクセスが許可されていないか、データがありません。\n画面上でキーボードの [Ctrl + V] を直接押して貼り付けてみてください。');
    }
  };

  // キーボード [Ctrl + V] のグローバルペーストリスナー
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      if (activeTab !== 'permit') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      // 画像ペースト判定
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFileProcess(file);
            return;
          }
        }
      }

      // テキスト・Google Driveリンク判定
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      const pastedText = e.clipboardData?.getData('text');

      if (pastedText && pastedText.trim()) {
        const trimmed = pastedText.trim();
        // Google Driveリンクがペーストされた場合は、入力欄フォーカスの有無にかかわらず即座に反映！
        if (trimmed.includes('drive.google.com')) {
          e.preventDefault();
          handleApplyGoogleDriveLink(trimmed);
          return;
        }

        if (!isInput && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
          e.preventDefault();
          addLicenseItem({
            title: licenseTitle || '営業許可証URL',
            fileType: 'url',
            fileData: trimmed,
            fileName: 'URL参照'
          });
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [activeTab, existingLicenses, licenseTitle, licenseNumber, licenseExpiry]);

  // 許可証の削除
  const handleDeleteLicense = (id: string) => {
    if (!confirm('この営業許可証データを削除しますか？')) return;
    const nextList = existingLicenses.filter(l => l.id !== id);
    handleUpdateLicenses(nextList);
  };

  // 確認ステータスのトグル
  const handleToggleVerify = (id: string) => {
    const nextList = existingLicenses.map(l => {
      if (l.id === id) {
        return { ...l, verified: !l.verified };
      }
      return l;
    });
    handleUpdateLicenses(nextList);
  };

  // URL直接追加
  const handleAddUrlLicense = () => {
    if (!licenseUrlInput.trim()) return;
    if (licenseUrlInput.includes('drive.google.com')) {
      handleApplyGoogleDriveLink();
    } else {
      addLicenseItem({
        title: licenseTitle || '営業許可証リンク',
        fileType: 'url',
        fileData: licenseUrlInput.trim(),
        fileName: 'WEBリンク',
        licenseNumber: licenseNumber,
        expiryDate: licenseExpiry
      });
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getCategoryLabel = (category: string) => {
    return getVendorCategoryLabel(category);
  };

  // 消防スタッフ確認のトグル
  const handleToggleStaffCheck = () => {
    if (!entry || !onUpdateEntry) return;
    const updated: EventEntry = {
      ...entry,
      fireSafety: {
        ...entry.fireSafety,
        checkedByStaff: !entry.fireSafety.checkedByStaff
      }
    };
    onUpdateEntry(updated);
  };

  // 火気器具の追加
  const handleAddAppliance = () => {
    if (!entry || !onUpdateEntry || !newApplianceName.trim()) return;
    const newApp = {
      type: 'other' as FireApplianceType,
      name: newApplianceName.trim(),
      fuel: newApplianceFuel,
      count: Number(newApplianceCount) || 1
    };
    const updated: EventEntry = {
      ...entry,
      fireSafety: {
        ...entry.fireSafety,
        hasFireAppliance: true,
        appliances: [...entry.fireSafety.appliances, newApp]
      }
    };
    onUpdateEntry(updated);
    setNewApplianceName('');
  };

  // 火気器具の削除
  const handleDeleteAppliance = (index: number) => {
    if (!entry || !onUpdateEntry) return;
    const filtered = entry.fireSafety.appliances.filter((_, i) => i !== index);
    const updated: EventEntry = {
      ...entry,
      fireSafety: {
        ...entry.fireSafety,
        appliances: filtered,
        hasFireAppliance: filtered.length > 0
      }
    };
    onUpdateEntry(updated);
  };



  const hasFire = entry?.fireSafety.hasFireAppliance ?? (
    vendor.category === 'food' || vendor.tags?.some(t => t.includes('火気') || t.includes('ガス') || t.includes('炭火'))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* モーダル上部ヘッダー */}
        <div className={`p-4 sm:p-5 border-b relative ${
          isBanned 
            ? 'bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border-red-900/60' 
            : isWarning 
            ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-amber-900/60' 
            : 'bg-gradient-to-r from-slate-850 via-slate-900 to-slate-900 border-slate-800'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1 pr-6">
              {/* ステータス ＆ カテゴリバッジ */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm ${
                  isBanned
                    ? 'bg-red-950/80 text-red-300 border border-red-800/70'
                    : isWarning
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/70'
                    : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50'
                }`}>
                  {isBanned && <ShieldAlert className="w-3.5 h-3.5" />}
                  {isWarning && <AlertTriangle className="w-3.5 h-3.5" />}
                  {!isBanned && !isWarning && <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{isBanned ? '【出禁・受付不可】' : isWarning ? '【要注意出店者】' : '通常出店者'}</span>
                </span>

                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                  {getCategoryLabel(vendor.category)}
                </span>

                {isVendorOrganization(vendor) && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    登録団体
                  </span>
                )}

                {entry?.boothNumber && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-sky-800/50 font-semibold">
                    ブース: {entry.boothNumber}
                  </span>
                )}
              </div>

              {/* 屋号・フリガナ */}
              {vendor.furigana && (
                <div className="text-[11px] text-amber-400/90 font-medium tracking-wider">
                  {vendor.furigana}
                </div>
              )}
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide leading-tight flex items-center gap-2">
                {isVendorOrganization(vendor) && (
                  <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </span>
                )}
                <span>{vendor.name}</span>
              </h2>

              <div className="text-xs text-slate-300 flex items-center gap-2 pt-0.5 flex-wrap">
                {vendor.ownerName && vendor.ownerName.trim() && (
                  <>
                    <span className="text-slate-400">代表者:</span>
                    <strong className="text-white font-bold">{vendor.ownerName}</strong>
                    <span className="text-slate-400">様</span>
                    <span className="text-slate-500">|</span>
                  </>
                )}
                <span className="text-slate-400">連絡先:</span>
                <span className="text-slate-200 font-mono">{vendor.phone}</span>
                {vendor.instagram && (
                  <>
                    <span className="text-slate-500">|</span>
                    <a
                      href={getInstagramUrl(vendor.instagram) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-500/20 text-pink-300 hover:text-white border border-pink-500/30 transition text-[11px] font-semibold"
                      title="公式Instagramを開く"
                    >
                      <Instagram className="w-3 h-3 text-pink-400" />
                      <span>{getInstagramHandle(vendor.instagram)}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* 編集ボタン & 閉じるボタン */}
            <div className="flex items-center gap-2 shrink-0">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(vendor);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  title="出店者情報を編集"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>情報を編集</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
                title="閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 3大タブ切り替えナビ（基本情報 / 消防・火気安全 / 出店許可証） */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition border ${
                activeTab === 'info'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                  : 'bg-slate-850/80 hover:bg-slate-800 text-slate-300 border-slate-750'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>基本情報</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fire')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition border ${
                activeTab === 'fire'
                  ? 'bg-orange-500 text-white border-orange-400 shadow-md font-black'
                  : 'bg-slate-850/80 hover:bg-slate-800 text-slate-300 border-slate-750'
              }`}
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span>消防・火気安全</span>
              {hasFire && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-950 text-orange-300 border border-orange-700/60 font-mono">
                  火気有
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('permit')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition border ${
                activeTab === 'permit'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black'
                  : 'bg-slate-850/80 hover:bg-slate-800 text-slate-300 border-slate-750'
              }`}
            >
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>営業許可証</span>
              {existingLicenses.length > 0 ? (
                existingLicenses.some(l => l.verified) ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold">
                    確認済 ({existingLicenses.length}通)
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60 font-bold">
                    未確認 ({existingLicenses.length}通)
                  </span>
                )
              ) : vendor.category === 'outdoor' || vendor.category === 'goods' || vendor.category === 'game' ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                  対象外
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-300 border border-rose-700/60 font-bold">
                  未提出
                </span>
              )}
            </button>
          </div>
        </div>

        {/* スクロール可能コンテンツエリア */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-200">
          {/* ===================== TAB 1: 基本情報 ===================== */}
          {activeTab === 'info' && (
            <div className="space-y-6 divide-y divide-slate-800/80">
              {/* 出禁・要注意理由の警告セクション（該当者のみ） */}
              {(isBanned || isWarning) && (
                <div className={`p-4 rounded-2xl border-2 space-y-2 ${
                  isBanned
                    ? 'bg-red-950/60 border-red-600 text-red-200'
                    : 'bg-amber-950/60 border-amber-500 text-amber-200'
                }`}>
                  <div className="flex items-center gap-2 font-black text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>{isBanned ? '【出禁指定の理由・ペナルティ経緯】' : '【要注意指定の理由・注意事項】'}</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap pl-7">
                    {vendor.statusReason || '指定理由が記載されていません。'}
                  </p>
                  {vendor.blacklistedAt && (
                    <div className="text-[11px] text-slate-400 pl-7 pt-1">
                      指定日: <strong className="font-mono text-slate-300">{vendor.blacklistedAt}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* 出店内容・販売品目 */}
              <div className="pt-4 first:pt-0 space-y-3">
                <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-amber-400" />
                  <span>出店内容・販売品目</span>
                </h3>

                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                  <div className="text-sm font-bold text-white leading-relaxed">
                    {vendor.menuItems || '未設定'}
                  </div>

                  {vendor.tags && vendor.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
                      {vendor.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-amber-300 font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 連絡先・所在地 */}
              <div className="pt-4 space-y-3">
                <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-sky-400" />
                  <span>連絡先・所在地</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 電話番号 */}
                  <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-slate-400 block">電話番号</span>
                      <a
                        href={`tel:${vendor.phone}`}
                        className="text-sm font-bold font-mono text-sky-400 hover:underline"
                      >
                        {vendor.phone || '未登録'}
                      </a>
                    </div>
                    {vendor.phone && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(vendor.phone, 'phone')}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="電話番号をコピー"
                      >
                        {copiedField === 'phone' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* メールアドレス */}
                  <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[11px] text-slate-400 block">メールアドレス</span>
                      <a
                        href={`mailto:${vendor.email}`}
                        className="text-xs font-bold text-sky-400 hover:underline truncate block"
                      >
                        {vendor.email || '未登録'}
                      </a>
                    </div>
                    {vendor.email && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(vendor.email, 'email')}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
                        title="メールアドレスをコピー"
                      >
                        {copiedField === 'email' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* LINE ID */}
                  {vendor.lineId && (
                    <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-slate-400 block">LINE ID</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          {vendor.lineId}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(vendor.lineId || '', 'lineId')}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
                        title="LINE IDをコピー"
                      >
                        {copiedField === 'lineId' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* 公式Instagram */}
                  {vendor.instagram ? (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-pink-950/30 to-amber-950/20 border border-pink-500/40 sm:col-span-2 flex items-center justify-between gap-3 shadow-md">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20 shrink-0">
                          <Instagram className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-pink-300">公式Instagram</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 font-medium">SNS</span>
                          </div>
                          <span className="text-sm font-bold text-white truncate block">
                            {getInstagramHandle(vendor.instagram)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(getInstagramUrl(vendor.instagram) || vendor.instagram || '', 'instagram')}
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Instagramリンクをコピー"
                        >
                          {copiedField === 'instagram' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={getInstagramUrl(vendor.instagram) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-pink-600/30 transition group"
                        >
                          <span>Instagramを開く</span>
                          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-slate-850/50 border border-slate-800 sm:col-span-2 flex items-center justify-between text-slate-500">
                      <div className="flex items-center gap-2 text-xs">
                        <Instagram className="w-4 h-4 text-slate-600" />
                        <span>公式Instagram: 未登録</span>
                      </div>
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(vendor)}
                          className="text-[11px] text-pink-400/80 hover:text-pink-300 underline"
                        >
                          + アカウントを登録
                        </button>
                      )}
                    </div>
                  )}

                  {/* 住所 */}
                  {vendor.address && (
                    <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 sm:col-span-2 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-slate-400 block">住所・所在地</span>
                        <span className="text-xs font-medium text-slate-200">
                          {vendor.address}
                        </span>
                      </div>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(vendor.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 transition shrink-0 flex items-center gap-1 text-[11px]"
                        title="Googleマップで開く"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>マップ</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* 食品営業許可・衛生情報 */}
              <div className="pt-4 space-y-3">
                <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>食品営業許可・衛生管理</span>
                </h3>

                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">営業許可ステータス</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      vendor.hasFoodLicense
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {vendor.hasFoodLicense ? '✓ 営業許可書あり' : '許可証不要・未提出'}
                    </span>
                  </div>

                  {vendor.foodLicenseNumber && (
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">営業許可番号</span>
                      <strong className="text-xs font-mono font-bold text-white">
                        {vendor.foodLicenseNumber}
                      </strong>
                    </div>
                  )}

                  {vendor.licenseExpiryDate && (
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">許可有効期限</span>
                      <strong className="text-xs font-mono font-bold text-amber-300">
                        {vendor.licenseExpiryDate}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* 過去の参加履歴 */}
              <div className="pt-4 space-y-3">
                <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>過去の参加実績・出店履歴</span>
                </h3>

                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">通算参加回数:</span>
                    <strong className="text-amber-400 font-bold text-sm font-mono">
                      {vendor.pastParticipationCount} 回
                    </strong>
                  </div>

                  {vendor.pastEvents && vendor.pastEvents.length > 0 ? (
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <span className="text-[11px] text-slate-400 block">参加イベント一覧:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {vendor.pastEvents.map((evName, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1"
                          >
                            <span>🏮</span>
                            <span>{evName}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 pt-1">
                      ※ 過去イベントの個別記録はまだありません。
                    </div>
                  )}
                </div>
              </div>

              {/* 運営メモ（内部用） */}
              {vendor.internalNotes && (
                <div className="pt-4 space-y-2">
                  <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>運営メモ（社内共有用）</span>
                  </h3>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                    {vendor.internalNotes}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB 2: 消防・火気安全 ===================== */}
          {activeTab === 'fire' && (
            <div className="space-y-6">
              {/* 火気使用ステータスバナー */}
              <div className={`p-4 rounded-2xl border flex items-start justify-between gap-4 ${
                hasFire
                  ? 'bg-orange-950/40 border-orange-600/70 text-orange-200'
                  : 'bg-slate-850 border-slate-700 text-slate-300'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                    hasFire ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Flame className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{hasFire ? '所轄消防署 火気使用届出 対象' : '火気器具の使用なし（物販・体験等）'}</span>
                    </h3>
                    <p className="text-xs leading-relaxed">
                      {hasFire
                        ? 'ガスコンロ・炭火・フライヤー・発電機などの火気を使用するため、所轄消防署（予防課）への届出および10型消火器の設置義務があります。'
                        : 'この出店者は調理や火気器具を使用しません。消火器の個別設置義務はありません。'}
                    </p>
                  </div>
                </div>

                {entry && onUpdateEntry && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateEntry({
                        ...entry,
                        fireSafety: {
                          ...entry.fireSafety,
                          hasFireAppliance: !entry.fireSafety.hasFireAppliance
                        }
                      });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition border ${
                      hasFire
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        : 'bg-orange-500 hover:bg-orange-600 text-white border-orange-400'
                    }`}
                  >
                    {hasFire ? '火気なしに変更' : '火気ありに変更'}
                  </button>
                )}
              </div>

              {/* 使用火気器具一覧 */}
              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span>登録火気器具・燃料</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    登録数: <strong className="text-white">{entry?.fireSafety.appliances.length || 0}台</strong>
                  </span>
                </div>

                {entry?.fireSafety.appliances && entry.fireSafety.appliances.length > 0 ? (
                  <div className="divide-y divide-slate-800">
                    {entry.fireSafety.appliances.map((app, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">🔥</span>
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm">{app.name}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>使用燃料: <strong className="text-orange-300">{app.fuel}</strong></span>
                              <span>数量: <strong className="text-white font-mono">{app.count}台</strong></span>
                            </div>
                          </div>
                        </div>

                        {onUpdateEntry && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAppliance(idx)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 transition"
                            title="この器具を削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs py-3 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                    登録されている火気器具はありません。
                  </div>
                )}

                {/* 火気器具の追加フォーム */}
                {entry && onUpdateEntry && (
                  <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      placeholder="器具名（例: 2口LPガスコンロ）"
                      value={newApplianceName}
                      onChange={(e) => setNewApplianceName(e.target.value)}
                      className="sm:col-span-6 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                    <select
                      value={newApplianceFuel}
                      onChange={(e) => setNewApplianceFuel(e.target.value)}
                      className="sm:col-span-3 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                    >
                      <option value="LPガス">LPガス</option>
                      <option value="カセットボンベ">カセットボンベ</option>
                      <option value="炭火">炭火</option>
                      <option value="ガソリン(発電機)">ガソリン(発電機)</option>
                      <option value="電気(100V)">電気(100V)</option>
                      <option value="その他">その他</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={newApplianceCount}
                      onChange={(e) => setNewApplianceCount(Number(e.target.value))}
                      className="sm:col-span-1 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white text-center font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddAppliance}
                      className="sm:col-span-2 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      追加
                    </button>
                  </div>
                )}
              </div>

              {/* 持参消火器情報 ＆ 現地スタッフ確認 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 消火器情報 */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                  <h3 className="text-xs font-black tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>持参消火器ステータス</span>
                  </h3>

                  {entry ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">消火器持参:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          entry.fireSafety.fireExtinguisher.installed
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                        }`}>
                          {entry.fireSafety.fireExtinguisher.installed ? '✓ 設置・持参あり' : '⚠️ 未持参・要確認'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">型番・容量:</span>
                        <strong className="text-white font-mono">{entry.fireSafety.fireExtinguisher.capacity || '10型 3.0kg以上'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">製造年・点検:</span>
                        <strong className="text-amber-300 font-mono">
                          {entry.fireSafety.fireExtinguisher.manufacturingYear || '2024年製造'} ({entry.fireSafety.fireExtinguisher.inspectionValid ? '点検済' : '未点検'})
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs py-2">エントリー未作成</div>
                  )}
                </div>

                {/* 現地スタッフ安全確認チェック */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                  <h3 className="text-xs font-black tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>当日現地 スタッフ点検</span>
                  </h3>

                  <div className="space-y-3 pt-1">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      当日の開場前に、消火器の配置位置・期限・火気器具周辺の離隔距離を確認したかを記録します。
                    </p>

                    <button
                      type="button"
                      onClick={handleToggleStaffCheck}
                      disabled={!entry || !onUpdateEntry}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                        entry?.fireSafety.checkedByStaff
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'bg-slate-850 hover:bg-slate-750 text-slate-300 border-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{entry?.fireSafety.checkedByStaff ? '✓ 現地安全点検 完了済' : '未確認（クリックして確認済にする）'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 提出書類PDF一覧 */}
              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                <h3 className="text-xs font-black tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-amber-400" />
                  <span>提出書類・仕様書PDF (消防届出添付用)</span>
                </h3>

                {entry?.fireSafety.submittedDocuments && entry.fireSafety.submittedDocuments.length > 0 ? (
                  <div className="divide-y divide-slate-800">
                    {entry.fireSafety.submittedDocuments.map((doc, dIdx) => (
                      <div key={dIdx} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-sky-400" />
                          <span className="font-bold text-white">{doc.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({doc.uploadedAt || '添付済'})</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          受領済
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs py-2 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                    ※ 特別な添付書類はまだ登録されていません。（消防届出には安全確認届出票が自動添付されます）
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB 3: 営業許可証 (Google Drive / アップロード / コピペ受領) ===================== */}
          {activeTab === 'permit' && (
            <div className="space-y-6">
              {/* 隠しファイルインプット */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept="image/*,application/pdf"
                className="hidden"
              />

              {/* ペースト / 登録トースト通知 */}
              {pasteNotice && (
                <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-4 py-2.5 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-xs">{pasteNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasteNotice(null)}
                    className="text-emerald-400 hover:text-white text-xs px-2 py-0.5 rounded"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 営業許可証 受領・確認ステータスバナー */}
              <div className="bg-slate-850 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${
                    existingLicenses.length > 0 && existingLicenses.some(l => l.verified)
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : existingLicenses.length > 0
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : vendor.category === 'outdoor' || vendor.category === 'goods' || vendor.category === 'game'
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}>
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">出店者 営業許可証 受領・確認状況</h3>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-black ${
                        existingLicenses.length > 0 && existingLicenses.some(l => l.verified)
                          ? 'bg-emerald-500 text-slate-950'
                          : existingLicenses.length > 0
                          ? 'bg-amber-500 text-slate-950'
                          : vendor.category === 'outdoor' || vendor.category === 'goods' || vendor.category === 'game'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-rose-500 text-white'
                      }`}>
                        {existingLicenses.length > 0 && existingLicenses.some(l => l.verified)
                          ? '✓ 営業許可証 確認済'
                          : existingLicenses.length > 0
                          ? '⚠ 営業許可証 未確認'
                          : vendor.category === 'outdoor' || vendor.category === 'goods' || vendor.category === 'game'
                          ? '提出対象外 (物販・体験)'
                          : '✕ 営業許可証 未提出'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>登録件数: <strong className="text-white">{existingLicenses.length}件</strong></span>
                      {vendor.foodLicenseNumber && (
                        <span>代表許可番号: <strong className="text-amber-300 font-mono">{vendor.foodLicenseNumber}</strong></span>
                      )}
                      {vendor.licenseExpiryDate && (
                        <span>
                          有効期限: <strong className={
                            new Date(vendor.licenseExpiryDate) < new Date()
                              ? 'text-rose-400 font-bold'
                              : 'text-slate-200'
                          }>{vendor.licenseExpiryDate}</strong>
                          {new Date(vendor.licenseExpiryDate) < new Date() && (
                            <span className="ml-1 text-[10px] text-rose-400 font-black">【期限切れ注意】</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 hidden sm:block shrink-0">
                  <span className="text-[11px] block text-slate-500">※出店者の営業許可証を</span>
                  <span className="text-amber-400/90 font-medium">Google Drive / コピペで即時反映</span>
                </div>
              </div>

              {/* 営業許可証の登録エリア（Google Driveコピペ & アップロード） */}
              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      営業許可証の受領・反映（Google Drive / コピペ / アップロード）
                    </h4>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-bold">
                    Ctrl + V で即時自動反映
                  </span>
                </div>

                {/* 許可証メタ情報入力（種別・番号・期限） */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      書類種別
                    </label>
                    <select
                      value={licenseTitle}
                      onChange={(e) => setLicenseTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="飲食店営業許可証">飲食店営業許可証</option>
                      <option value="露店営業許可証">露店営業許可証</option>
                      <option value="自動車営業許可証(キッチンカー)">自動車営業許可証(キッチンカー)</option>
                      <option value="食品衛生責任者証">食品衛生責任者証</option>
                      <option value="菓子製造業許可証">菓子製造業許可証</option>
                      <option value="その他営業許可証">その他営業許可証</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      許可番号 (任意)
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="例: 第34-08129号"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      有効期限 (任意)
                    </label>
                    <input
                      type="date"
                      value={licenseExpiry}
                      onChange={(e) => setLicenseExpiry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* ★ Google Drive リンク コピペ専用入力バー（目立つハイライト枠） ★ */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-sky-950/50 border-2 border-emerald-500/40 space-y-2 shadow-md">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-white flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-emerald-400" />
                      <span>Google Drive のリンクをコピペして反映</span>
                    </span>
                    <span className="text-[10px] text-emerald-300 font-mono">
                      共有リンク対応 (view / open / preview)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="url"
                        value={licenseUrlInput}
                        onChange={(e) => setLicenseUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyGoogleDriveLink();
                          }
                        }}
                        placeholder="Google Drive の共有リンクを貼り付け (例: https://drive.google.com/file/d/...)"
                        className="w-full bg-slate-950 border border-emerald-500/50 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono placeholder:text-slate-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyGoogleDriveLink()}
                      disabled={!licenseUrlInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>リンクを反映する</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-emerald-300/90 pl-1 flex items-center gap-1">
                    <span>💡 出店者から送られた Google Drive リンクをコピーした状態で、この画面で <strong>[Ctrl + V]</strong> を押すだけでも即座に反映されます！</span>
                  </p>
                </div>

                {/* ドラッグ＆ドロップ ＆ ファイル選択＆画像コピペ枠 */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition cursor-pointer ${
                    isDragging
                      ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                      : 'border-slate-700 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-600'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>画像ファイル (JPG/PNG) や PDFファイルを直接アップロードする場合</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition"
                      >
                        📁 ファイルを選択
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePasteFromClipboardBtn();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-1"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>📋 クリップボードから貼り付け</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 登録済み営業許可証リスト */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      受領・登録済み 営業許可証一覧 ({existingLicenses.length}件)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    スタッフ確認済みにチェックを入れて管理
                  </span>
                </div>

                {existingLicenses.length === 0 ? (
                  <div className="p-8 text-center bg-slate-850/60 rounded-2xl border border-dashed border-slate-800 space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
                    <div className="text-xs font-bold text-slate-400">
                      営業許可証がまだ登録されていません
                    </div>
                    <div className="text-[11px] text-slate-500">
                      上の入力欄に Google Drive リンクをコピペするか、画面上で [Ctrl + V] を押して反映してください。
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {existingLicenses.map((lic) => {
                      const isExpired = lic.expiryDate ? new Date(lic.expiryDate) < new Date() : false;
                      const hasImage = lic.fileType === 'image' && lic.fileData;
                      const gDrive = extractGoogleDriveInfo(lic.fileData);

                      return (
                        <div
                          key={lic.id}
                          className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                            lic.verified
                              ? 'bg-slate-850 border-emerald-500/40 shadow-sm'
                              : 'bg-slate-850/90 border-amber-500/40'
                          }`}
                        >
                          {/* 上部: タイトル ＆ 確認ステータス */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                  gDrive
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : lic.fileType === 'image'
                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                    : lic.fileType === 'pdf'
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    : lic.fileType === 'url'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-slate-700 text-slate-300'
                                }`}>
                                  {gDrive && <HardDrive className="w-3 h-3 text-emerald-400" />}
                                  <span>
                                    {gDrive ? 'Google Drive連携' : lic.fileType === 'image' ? '画像提出' : lic.fileType === 'pdf' ? 'PDF提出' : lic.fileType === 'url' ? 'WEB参照' : '台帳情報'}
                                  </span>
                                </span>
                                <h5 className="text-xs font-black text-white">
                                  {lic.title}
                                </h5>
                              </div>

                              <div className="text-[11px] text-slate-400 space-y-0.5 pt-0.5 font-mono">
                                {lic.licenseNumber && (
                                  <div>番号: <span className="text-amber-300 font-bold">{lic.licenseNumber}</span></div>
                                )}
                                {lic.expiryDate && (
                                  <div className={isExpired ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                                    期限: {lic.expiryDate} {isExpired && '【期限切れ】'}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-500">
                                  提出日: {lic.submittedAt || '登録済'}
                                  {lic.fileName && ` (${lic.fileName})`}
                                </div>
                                {lic.notes && (
                                  <div className="text-[10px] text-emerald-400/90 italic">
                                    {lic.notes}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 削除ボタン */}
                            <button
                              type="button"
                              onClick={() => handleDeleteLicense(lic.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="この営業許可証を削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Google Drive リンクの場合のリッチプレビュー */}
                          {gDrive ? (
                            <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2">
                              {gDrive.thumbnailUrl ? (
                                <div
                                  onClick={() => setPreviewModalDrive({ url: gDrive.previewUrl, title: lic.title })}
                                  className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 cursor-pointer h-28 flex items-center justify-center hover:border-emerald-400 transition"
                                >
                                  <img
                                    src={gDrive.thumbnailUrl}
                                    alt={lic.title}
                                    className="w-full h-full object-contain group-hover:scale-105 transition duration-200"
                                    onError={(e) => {
                                      // サムネイル読み込み不可時のフォールバック表示
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-[1px]">
                                    <Maximize2 className="w-4 h-4" />
                                    <span>クリックで埋め込みプレビュー</span>
                                  </div>
                                </div>
                              ) : null}

                              <div className="flex items-center justify-between gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setPreviewModalDrive({ url: gDrive.previewUrl, title: lic.title })}
                                  className="text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold transition flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>プレビュー確認</span>
                                </button>

                                <a
                                  href={gDrive.openUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 font-bold transition flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Googleドライブで開く</span>
                                </a>
                              </div>
                            </div>
                          ) : hasImage ? (
                            <div
                              onClick={() => setPreviewModalImage({ src: lic.fileData!, title: lic.title })}
                              className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer h-32 flex items-center justify-center hover:border-amber-400 transition"
                            >
                              <img
                                src={lic.fileData}
                                alt={lic.title}
                                className="w-full h-full object-contain group-hover:scale-105 transition duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-[1px]">
                                <Maximize2 className="w-4 h-4" />
                                <span>クリックで拡大表示</span>
                              </div>
                            </div>
                          ) : lic.fileType === 'pdf' && lic.fileData ? (
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileIcon className="w-5 h-5 text-red-400" />
                                <span className="text-xs text-white font-bold truncate max-w-[150px]">
                                  {lic.fileName || '営業許可証PDF'}
                                </span>
                              </div>
                              <a
                                href={lic.fileData}
                                download={lic.fileName || '営業許可証.pdf'}
                                className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-amber-300 font-bold transition flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                <span>ダウンロード</span>
                              </a>
                            </div>
                          ) : lic.fileType === 'url' && lic.fileData ? (
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between">
                              <span className="text-xs text-slate-300 truncate max-w-[180px] font-mono">
                                {lic.fileData}
                              </span>
                              <a
                                href={lic.fileData}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-sky-400 font-bold transition flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>リンクを開く</span>
                              </a>
                            </div>
                          ) : null}

                          {/* 下部: 確認済トグルスイッチ */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleToggleVerify(lic.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                lic.verified
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              <Check className={`w-3.5 h-3.5 ${lic.verified ? 'text-emerald-400' : 'text-slate-500'}`} />
                              <span>{lic.verified ? 'スタッフ確認済' : '未確認 (クリックで確認済)'}</span>
                            </button>

                            {lic.verified && (
                              <span className="text-[10px] text-emerald-400 font-medium">
                                営業許可確認OK
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Google Drive 埋め込みプレビューモーダル */}
              {previewModalDrive && (
                <div
                  className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
                  onClick={() => setPreviewModalDrive(null)}
                >
                  <div
                    className="relative max-w-5xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-4 overflow-hidden flex flex-col h-[88vh]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-emerald-400" />
                        <h4 className="text-sm font-black text-white">
                          {previewModalDrive.title} - Google Drive プレビュー
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={previewModalDrive.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs border border-slate-700 transition flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Googleドライブで原本を開く</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setPreviewModalDrive(null)}
                          className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden p-1 rounded-2xl bg-black/50 mt-2">
                      <iframe
                        src={previewModalDrive.url}
                        title={previewModalDrive.title}
                        className="w-full h-full rounded-xl border-0"
                        allow="autoplay"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 画像拡大表示モーダル (Lightbox) */}
              {previewModalImage && (
                <div
                  className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
                  onClick={() => setPreviewModalImage(null)}
                >
                  <div
                    className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-4 overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-amber-400" />
                        <h4 className="text-sm font-black text-white">
                          {previewModalImage.title} - 高解像度プレビュー
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={previewModalImage.src}
                          download={`${previewModalImage.title}.png`}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 transition flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>画像を保存</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setPreviewModalImage(null)}
                          className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto p-2 flex items-center justify-center">
                      <img
                        src={previewModalImage.src}
                        alt={previewModalImage.title}
                        className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* モーダル下部ボタン */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          {onEdit ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(vendor);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 font-bold text-xs border border-slate-700 hover:border-amber-500/50 transition shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              <span>出店者情報を編集</span>
            </button>
          ) : (
            <div></div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
