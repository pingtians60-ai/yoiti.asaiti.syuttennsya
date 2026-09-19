import React, { useState } from 'react';
import { Edit3, Building2, Store, Sparkles, Trash2 } from 'lucide-react';
import { Vendor } from '../../types';
import { Instagram } from '../../utils/instagram';
import { inspectVendorWithAi, VendorAiInspectionResult } from '../../utils/gemini';

export interface VendorEditModalProps {
  vendor: Vendor;
  isNew?: boolean;
  onClose: () => void;
  onSave: (vendor: Vendor) => void;
  onDelete?: (vendorId: string) => void;
}

export const VendorEditModal: React.FC<VendorEditModalProps> = ({
  vendor,
  isNew = false,
  onClose,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState<Vendor>({ 
    ...vendor,
    organizationType: vendor.organizationType || (vendor.tags?.some(t => /団体|振興会|サークル|NPO|実行委/.test(t)) ? 'organization' : 'store')
  });
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [aiInspection, setAiInspection] = useState<VendorAiInspectionResult | null>(null);

  const isBanned = formData.status === 'banned';
  const isWarning = formData.status === 'warning';

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      alert('屋号・店名を入力してください。');
      return;
    }
    onSave(formData);
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
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  isBanned ? 'bg-red-600 text-white' : isWarning ? 'bg-amber-500 text-black' : 'bg-emerald-500/20 text-emerald-400'
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

            {/* 基本情報 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">屋号・店名 <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
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
                  required
                />
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

              {formData.organizationType === 'organization' && (
                <div className="pt-2">
                  <label className="block text-emerald-300 font-semibold mb-1">所属団体名・グループ名</label>
                  <input
                    type="text"
                    value={formData.organizationName || ''}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    placeholder="例: 扇ヶ浜地域振興協力会、〇〇青年サークル 等"
                    className="w-full bg-slate-800 border border-emerald-500/50 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-xs"
                  />
                </div>
              )}
            </div>

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
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="food">飲食・屋台</option>
                  <option value="kitchen_car">キッチンカー</option>
                  <option value="drink">ドリンク・カフェ</option>
                  <option value="goods">クラフト・物販</option>
                  <option value="game">縁日・ゲーム</option>
                  <option value="other">その他</option>
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
                  <span>公式Instagram (アカウント / URL)</span>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">LINE ID</label>
                <input
                  type="text"
                  value={formData.lineId || ''}
                  onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                  placeholder="例: line_id_123"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
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
            </div>

            {/* 出店品目・メニュー & 裏側AI判定 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-slate-400 font-semibold">出店品目・メニュー</label>
                <button
                  type="button"
                  onClick={async () => {
                    if (!formData.menuItems.trim()) {
                      alert('品目・メニューを入力してください。');
                      return;
                    }
                    setIsAiChecking(true);
                    try {
                      const res = await inspectVendorWithAi(formData.name, formData.menuItems);
                      setAiInspection(res);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsAiChecking(false);
                    }
                  }}
                  disabled={isAiChecking || !formData.menuItems.trim()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/40 transition disabled:opacity-40"
                  title="品目からジャンルや火気リスクを裏側AIで推論"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAiChecking ? 'animate-spin text-indigo-400' : 'text-amber-400'}`} />
                  <span>{isAiChecking ? '裏でAI判定中...' : '裏側AIで自動判定'}</span>
                </button>
              </div>
              <input
                type="text"
                value={formData.menuItems}
                onChange={(e) => {
                  setFormData({ ...formData, menuItems: e.target.value });
                  setAiInspection(null);
                }}
                placeholder="例: たこ焼き、唐揚げ、生ビールなど"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />

              {/* AI判定結果サジェスト */}
              {aiInspection && (
                <div className="p-3 rounded-xl bg-slate-800/90 border border-indigo-500/50 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      裏側AIの推論結果
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          category: aiInspection.category,
                          tags: Array.from(new Set([
                            ...formData.tags,
                            ...(aiInspection.hasFireAppliance ? ['火気使用(要消火器)'] : [])
                          ]))
                        });
                        alert(`AIの判定結果（カテゴリ: ${aiInspection.category}、火気情報）を反映しました！`);
                      }}
                      className="text-[11px] px-2 py-0.5 rounded bg-indigo-500 hover:bg-indigo-400 text-white font-bold transition"
                    >
                      この判定を適用する
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center gap-2">
                      <span>推奨ジャンル: <strong className="text-amber-300">{aiInspection.category}</strong></span>
                      <span className="text-slate-600">|</span>
                      <span>火気安全リスク: <strong className={aiInspection.fireSafetyRisk === 'high' ? 'text-rose-400' : aiInspection.fireSafetyRisk === 'medium' ? 'text-amber-400' : 'text-emerald-400'}>{aiInspection.fireSafetyRisk.toUpperCase()}</strong></span>
                      <span className="text-slate-600">|</span>
                      <span>消火器: <strong className={aiInspection.requiresFireExtinguisher ? 'text-rose-400' : 'text-slate-400'}>{aiInspection.requiresFireExtinguisher ? '設置義務あり' : '不要'}</strong></span>
                    </div>
                    {aiInspection.suggestedAppliances.length > 0 && (
                      <div className="text-slate-400">
                        推定熱源: {aiInspection.suggestedAppliances.map(a => `${a.name} (${a.fuel})`).join(', ')}
                      </div>
                    )}
                    <div className="text-slate-400 text-[10px] bg-slate-900/60 p-1.5 rounded border border-slate-800">
                      💡 {aiInspection.reason}
                    </div>
                  </div>
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
