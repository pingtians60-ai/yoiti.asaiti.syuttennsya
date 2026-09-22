import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Building2, Store, Sparkles, Trash2 } from 'lucide-react';
import { Vendor, getVendorCategoryLabel } from '../../types';
import { Instagram } from '../../utils/instagram';
import { inspectVendorWithAi, VendorAiInspectionResult } from '../../utils/gemini';
import { inferReadingOffline, inferVendorReadingWithAi } from '../../utils/aiNameReading';

export interface VendorEditModalProps {
  vendor: Vendor;
  isNew?: boolean;
  onClose: () => void;
  onSave: (vendor: Vendor) => void;
  onDelete?: (vendorId: string) => void;
}

const categoryLabels: Record<string, string> = {
  kitchen_car: 'キッチンカー',
  food: '飲食露店',
  outdoor: '屋外出店（物販・体験）',
  drink: '飲食露店',
  goods: '屋外出店（物販・体験）',
  game: '屋外出店（物販・体験）',
  other: '屋外出店（物販・体験）'
};

export const VendorEditModal: React.FC<VendorEditModalProps> = ({
  vendor,
  isNew = false,
  onClose,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState<Vendor>({ 
    ...vendor,
    readingFurigana: vendor.readingFurigana || inferReadingOffline(vendor.name || ''),
    organizationType: vendor.organizationType || (vendor.tags?.some(t => /団体|振興会|サークル|NPO|実行委/.test(t)) ? 'organization' : 'store')
  });

  const [isAiChecking, setIsAiChecking] = useState(false);
  const [aiInspection, setAiInspection] = useState<VendorAiInspectionResult | null>(null);

  // 初期ロード時に既存データがあれば再判定をスキップするためのref
  const lastCheckedMenuRef = useRef<string>(vendor.menuItems?.trim() || '');
  const lastCheckedNameRef = useRef<string>(vendor.name?.trim() || '');

  // 1. 出店品目・メニューの裏側AI自動判別（ボタンを押さずとも自動判定・反映）
  useEffect(() => {
    const trimmedMenu = formData.menuItems.trim();
    if (!trimmedMenu) {
      setAiInspection(null);
      return;
    }
    // 既に判定済みの内容と同じならスキップ
    if (trimmedMenu === lastCheckedMenuRef.current) return;

    const timer = setTimeout(async () => {
      lastCheckedMenuRef.current = trimmedMenu;
      setIsAiChecking(true);
      try {
        const res = await inspectVendorWithAi(formData.name, trimmedMenu);
        setAiInspection(res);

        // カテゴリおよび火気タグを自動反映
        setFormData(prev => {
          const newTags = new Set(prev.tags || []);
          if (res.hasFireAppliance) {
            newTags.add('火気使用(要消火器)');
          } else {
            newTags.delete('火気使用(要消火器)');
          }

          return {
            ...prev,
            category: res.category,
            tags: Array.from(newTags)
          };
        });
      } catch (err) {
        console.warn('Auto AI inspection error:', err);
      } finally {
        setIsAiChecking(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.menuItems, formData.name]);

  // 2. 屋号・店名の五十音順読みを裏側で自動判別（ボタン不要で自動設定）
  useEffect(() => {
    const trimmedName = formData.name.trim();
    if (!trimmedName || trimmedName === lastCheckedNameRef.current) return;

    const timer = setTimeout(async () => {
      lastCheckedNameRef.current = trimmedName;
      try {
        const aiReading = await inferVendorReadingWithAi(trimmedName);
        if (aiReading) {
          setFormData(prev => ({ ...prev, readingFurigana: aiReading }));
        }
      } catch (err) {
        console.warn('Auto reading inference error:', err);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [formData.name]);

  const isBanned = formData.status === 'banned';
  const isWarning = formData.status === 'warning';

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      alert('屋号・店名を入力してください。');
      return;
    }
    const finalReading = formData.readingFurigana?.trim() || inferReadingOffline(formData.name);
    onSave({
      ...formData,
      readingFurigana: finalReading
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-400" />
            {isNew ? '出店者の新規登録' : `出店者情報の編集: ${formData.name}`}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
            {/* 出禁・要注意ステータス設定 */}
            <div className="p-4 rounded-xl border bg-slate-800/60 border-slate-700 space-y-3">
              <div className="font-bold text-slate-200 text-sm flex items-center justify-between">
                <span>出禁・要注意フラグ設定</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                  isBanned ? 'bg-red-950/70 text-red-300 border-red-800/60' : isWarning ? 'bg-amber-950/70 text-amber-300 border-amber-800/60' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {isBanned ? '出禁' : isWarning ? '要注意' : '通常'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'active', statusReason: '' })}
                  className={`p-2 rounded-lg font-bold border transition ${
                    formData.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  通常 (問題なし)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'warning' })}
                  className={`p-2 rounded-lg font-bold border transition ${
                    formData.status === 'warning'
                      ? 'bg-amber-500/30 text-amber-200 border-amber-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  ⚠️ 要注意
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'banned', blacklistedAt: new Date().toISOString().split('T')[0] })}
                  className={`p-2 rounded-lg font-bold border transition ${
                    formData.status === 'banned'
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  ⛔ 出禁 (受付不可)
                </button>
              </div>

              {(isBanned || isWarning) && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isBanned ? '出禁理由・トラブルの経緯 (必須記録)' : '要注意理由・過去の指導内容'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.statusReason || ''}
                    onChange={(e) => setFormData({ ...formData, statusReason: e.target.value })}
                    placeholder="例: 無断キャンセル、油流し、騒音苦情、消火器未持参でトラブルなど..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              )}
            </div>

            {/* 基本情報（屋号 & 代表者名） */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">屋号・店名 <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      const autoReading = inferReadingOffline(newName);
                      setFormData(prev => ({ 
                        ...prev, 
                        name: newName,
                        readingFurigana: autoReading || prev.readingFurigana
                      }));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                    placeholder="例: 極旨たこ焼き 蛸源"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">代表者氏名 <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="例: 田中 太郎"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 出店区分（店舗 / 登録団体） */}
            <div className="p-3.5 rounded-xl border bg-slate-800/40 border-slate-700 space-y-2">
              <label className="block text-slate-300 font-semibold mb-1">出店区分 (店舗・団体の種別)</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, organizationType: 'store' })}
                  className={`p-2.5 rounded-xl font-bold border transition flex items-center justify-center gap-2 ${
                    formData.organizationType !== 'organization'
                      ? 'bg-blue-600/30 text-blue-200 border-blue-500 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Store className="w-4 h-4 text-blue-400" />
                  <span>一般店舗</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, organizationType: 'organization' })}
                  className={`p-2.5 rounded-xl font-bold border transition flex items-center justify-center gap-2 ${
                    formData.organizationType === 'organization'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-black'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Building2 className={`w-4 h-4 ${formData.organizationType === 'organization' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>登録団体</span>
                </button>
              </div>
            </div>

            {/* 連絡先 & ジャンル */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">電話番号</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="例: 090-1234-5678"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">出店ジャンル</label>
                <select
                  value={
                    formData.category === 'kitchen_car'
                      ? 'kitchen_car'
                      : formData.category === 'food' || formData.category === 'drink'
                      ? 'food'
                      : 'outdoor'
                  }
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="kitchen_car">キッチンカー</option>
                  <option value="food">飲食露店</option>
                  <option value="outdoor">屋外出店（物販・体験）</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">メールアドレス</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="例: info@example.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-pink-300 mb-1 font-semibold flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                  <span>公式Instagram</span>
                </label>
                <input
                  type="text"
                  value={formData.instagram || ''}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="例: @benkei_yakitori または URL"
                  className="w-full bg-slate-800 border border-pink-500/40 focus:border-pink-400 rounded-lg px-3 py-2 text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">住所・所在地</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="例: 和歌山県田辺市..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            {/* 出店品目・メニュー & 裏側AI完全自動判定 */}
            <div className="space-y-2">
              <label className="block text-slate-400 font-semibold">出店品目・メニュー</label>
              <input
                type="text"
                value={formData.menuItems}
                onChange={(e) => setFormData({ ...formData, menuItems: e.target.value })}
                placeholder="例: たこ焼き、唐揚げ、生ビールなど"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />

              {/* 判定中アニメーションインジケーター */}
              {isAiChecking && (
                <div className="flex items-center gap-1.5 text-indigo-300 text-[11px] py-1 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span>裏側AIが品目からジャンル・火気リスクを自動判別中...</span>
                </div>
              )}

              {/* AI自動判定結果のスマート表示（ボタンを押さずとも自動適用済み） */}
              {aiInspection && !isAiChecking && (
                <div className="p-3 rounded-xl bg-slate-800/80 border border-indigo-500/40 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      裏側AI自動判別済み (適用中)
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      aiInspection.fireSafetyRisk === 'high'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {aiInspection.fireSafetyRisk === 'high' ? '⚠️ 火気あり(要消火器)' : '✅ 安全(火気なし)'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 flex items-center gap-2 flex-wrap">
                    <span>自動設定ジャンル: <strong className="text-amber-300">{categoryLabels[aiInspection.category] || aiInspection.category}</strong></span>
                    <span className="text-slate-600">|</span>
                    <span>消火器: <strong className={aiInspection.requiresFireExtinguisher ? 'text-rose-400' : 'text-slate-400'}>{aiInspection.requiresFireExtinguisher ? '設置義務あり' : '不要'}</strong></span>
                    {aiInspection.suggestedAppliances.length > 0 && (
                      <>
                        <span className="text-slate-600">|</span>
                        <span>推定熱源: <span className="text-slate-200">{aiInspection.suggestedAppliances.map(a => `${a.name} (${a.fuel})`).join(', ')}</span></span>
                      </>
                    )}
                  </div>
                  {aiInspection.reason && (
                    <div className="text-[10px] text-slate-400 bg-slate-900/60 p-1.5 rounded border border-slate-800">
                      💡 {aiInspection.reason}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">食品営業許可番号</label>
                <input
                  type="text"
                  value={formData.foodLicenseNumber || ''}
                  onChange={(e) => setFormData({ ...formData, foodLicenseNumber: e.target.value })}
                  placeholder="例: 和歌保 第012345号"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">過去出店回数</label>
                <input
                  type="number"
                  value={formData.pastParticipationCount}
                  onChange={(e) => setFormData({ ...formData, pastParticipationCount: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">運営用内部メモ</label>
              <textarea
                rows={2}
                value={formData.internalNotes || ''}
                onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                placeholder="マナー、集客力、注意点など..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div>
              {!isNew && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`出店者「${formData.name}」を完全に削除しますか？\n※出店エントリーや履歴データも削除されます。\n※この操作は取り消せません。`)) {
                      onDelete(formData.id);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold border border-red-500/30 flex items-center gap-1.5 transition text-xs"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>この出店者を削除</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition"
              >
                出店者情報を反映する
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
