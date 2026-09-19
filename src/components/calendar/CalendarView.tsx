import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Flame, 
  Store, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Users, 
  ArrowRight,
  Sparkles,
  AlertTriangle,
  X,
  Search,
  Check,
  Award,
  DollarSign,
  Building2
} from 'lucide-react';
import { NightMarketEvent, EventEntry, Vendor, BoothArea, PaymentStatus, isVendorOrganization } from '../../types';
import { STANDARD_AREAS } from '../../utils/storage';
import { ActiveTab, VendorSubTab } from '../layout/Navigation';
import { VendorDetailModal } from '../vendor-list/VendorDetailModal';
import { InstagramBadge } from '../../utils/instagram';

interface CalendarViewProps {
  events: NightMarketEvent[];
  selectedEvent: NightMarketEvent;
  entries: EventEntry[];
  vendors: Vendor[];
  onSelectEvent: (eventId: string) => void;
  onCreateEvent: (event: NightMarketEvent) => void;
  onUpdateEvent: (event: NightMarketEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateEntries: (entries: EventEntry[]) => void;
  onNavigateTab: (tab: ActiveTab | VendorSubTab, subTab?: VendorSubTab) => void;
}

// カレンダーセル型定義
interface CalendarCell {
  year: number;
  month: number;
  dateNumber: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: NightMarketEvent[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  selectedEvent,
  entries,
  vendors,
  onSelectEvent,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onUpdateEntries,
  onNavigateTab
}) => {
  // カレンダー表示用の年月ステート（初期値は選択中イベントの年月、または今月）
  const initialDate = selectedEvent?.date ? new Date(selectedEvent.date) : new Date();
  const [currentYear, setCurrentYear] = useState(
    isNaN(initialDate.getFullYear()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState(
    isNaN(initialDate.getMonth()) ? new Date().getMonth() : initialDate.getMonth()
  );

  // モーダル管理ステート
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTargetEvent, setEditingTargetEvent] = useState<NightMarketEvent | null>(null);
  const [selectedDayCell, setSelectedDayCell] = useState<CalendarCell | null>(null);
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<NightMarketEvent | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<string>('');
  const [selectedVendorForDetail, setSelectedVendorForDetail] = useState<Vendor | null>(null);
  const [selectedEntryForDetail, setSelectedEntryForDetail] = useState<EventEntry | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<'info' | 'fire' | 'permit'>('info');

  // 出店者一覧の検索・フィルターステート
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [vendorFilterFireOnly, setVendorFilterFireOnly] = useState(false);
  const [vendorFilterUnpaidOnly, setVendorFilterUnpaidOnly] = useState(false);

  // 夜市全体（全出店者マスターポータル）かどうかの判定
  const isSelectedAll =
    selectedEvent.name === '夜市全体' ||
    selectedEvent.id === 'event-all' ||
    selectedEvent.name.includes('出店者募集中') ||
    selectedEvent.name.includes('募集中') ||
    selectedEvent.name.trim() === '夜市';

  // 選択中イベントの登録エントリー（出店者）
  const currentEventEntries = entries.filter((e) => e.eventId === selectedEvent.id);

  // 統計値計算
  const fireCount = currentEventEntries.filter((e) => e.fireSafety.hasFireAppliance).length;
  const unpaidCount = currentEventEntries.filter((e) => e.fee.paymentStatus !== 'paid').length;
  const totalBilled = currentEventEntries.reduce((sum, e) => sum + e.fee.totalAmount, 0);
  const totalPaid = currentEventEntries
    .filter((e) => e.fee.paymentStatus === 'paid')
    .reduce((sum, e) => sum + e.fee.totalAmount, 0);

  // 検索・絞り込み適用後のエントリー一覧
  const filteredEntries = currentEventEntries.filter((entry) => {
    if (vendorSearchQuery.trim()) {
      const q = vendorSearchQuery.toLowerCase();
      const matchName = entry.vendorSnapshot.name.toLowerCase().includes(q);
      const matchOwner = entry.vendorSnapshot.ownerName.toLowerCase().includes(q);
      const matchMenu = (entry.vendorSnapshot.menuItems || '').toLowerCase().includes(q);
      const matchBooth = entry.boothNumber.toLowerCase().includes(q);
      if (!matchName && !matchOwner && !matchMenu && !matchBooth) return false;
    }
    if (vendorFilterFireOnly && !entry.fireSafety.hasFireAppliance) return false;
    if (vendorFilterUnpaidOnly && entry.fee.paymentStatus === 'paid') return false;

    return true;
  });

  // 月送り操作
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // 月間カレンダーの日付グリッド計算
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0: 日曜日, 6: 土曜日
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const calendarCells: CalendarCell[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  // 前月の余白日付
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = currentMonth === 0 ? 11 : currentMonth - 1;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      year: y,
      month: m,
      dateNumber: d,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      events: events.filter((e) => e.date === dateStr)
    });
  }

  // 当月の日付
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      year: currentYear,
      month: currentMonth,
      dateNumber: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      events: events.filter((e) => e.date === dateStr)
    });
  }

  // 翌月の余白日付（合計セル数が7の倍数になるまで）
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const m = currentMonth === 11 ? 0 : currentMonth + 1;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      year: y,
      month: m,
      dateNumber: d,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      events: events.filter((e) => e.date === dateStr)
    });
  }

  // 日付セルクリック時の処理
  const handleCellClick = (cell: CalendarCell) => {
    if (cell.events.length > 0) {
      onSelectEvent(cell.events[0].id);
      setSelectedDayCell(cell);
    } else {
      setPrefilledDate(cell.dateStr);
      setIsCreateModalOpen(true);
    }
  };

  // 出店者の入金ステータス簡易切替
  const handleTogglePaymentStatus = (entryId: string) => {
    const updated = entries.map((e) => {
      if (e.id === entryId) {
        const nextStatus: PaymentStatus = e.fee.paymentStatus === 'paid' ? 'unbilled' : 'paid';
        return {
          ...e,
          fee: {
            ...e.fee,
            paymentStatus: nextStatus,
            paidAt: nextStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined
          }
        };
      }
      return e;
    });
    onUpdateEntries(updated);
  };

  // 出店者のこのイベントからの除外
  const handleRemoveEntry = (entryId: string, vendorName: string) => {
    if (window.confirm(`「${vendorName}」をこのイベント（${selectedEvent.name}）の出店ブースから除外しますか？\n（出店者名簿マスターには残ります）`)) {
      const updated = entries.filter((e) => e.id !== entryId);
      onUpdateEntries(updated);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 画面トップバナー */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-950">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              イベント・カレンダー
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {events.length}件のイベント登録中
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              カレンダーから日程確認・イベント切替・出店者の直接確認・編集・削除が行えます
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* イベントを削除ボタン（夜市全体は削除不可） */}
          {selectedEvent.name !== '夜市全体' && selectedEvent.id !== 'event-all' && !selectedEvent.name.includes('出店者募集中') && !selectedEvent.name.includes('募集中') && (
            <button
              onClick={() => setEventToDelete(selectedEvent)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 border border-rose-800/70 font-bold text-xs shadow-sm transition"
              title="選択中のイベントを削除"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>イベントを削除</span>
            </button>
          )}

          <button
            onClick={() => setEditingTargetEvent(selectedEvent)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 shadow-sm transition"
            title="現在選択中のイベント情報を編集"
          >
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span>イベント詳細編集</span>
          </button>

          <button
            onClick={() => {
              setPrefilledDate(new Date().toISOString().split('T')[0]);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span>新規イベントを作成</span>
          </button>
        </div>
      </div>

      {/* カレンダーコントロールバー & グリッド */}
      <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
        {/* 月切り替えヘッダー */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="前月"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg sm:text-xl font-black text-white px-2">
              {currentYear}年 {currentMonth + 1}月
            </h3>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="翌月"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleToday}
              className="ml-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition"
            >
              今月
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500"></span>
              <span>選択中イベント</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700"></span>
              <span>他イベント</span>
            </div>
            <span className="text-[11px] text-amber-300 font-semibold bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-900/60">
              💡 日付やバッジをクリックするとイベント詳細と出店者が下に表示されます
            </span>
          </div>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold py-1">
          <div className="text-rose-400">日</div>
          <div className="text-slate-300">月</div>
          <div className="text-slate-300">火</div>
          <div className="text-slate-300">水</div>
          <div className="text-slate-300">木</div>
          <div className="text-slate-300">金</div>
          <div className="text-sky-400">土</div>
        </div>

        {/* 日付セルグリッド */}
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((cell, idx) => {
            const hasSelectedEvent = cell.events.some((e) => e.id === selectedEvent.id);
            const hasEvents = cell.events.length > 0;

            return (
              <div
                key={idx}
                onClick={() => handleCellClick(cell)}
                className={`min-h-[105px] sm:min-h-[115px] p-2 rounded-2xl border transition flex flex-col justify-between cursor-pointer group relative ${
                  hasSelectedEvent
                    ? 'bg-amber-950/25 border-amber-500 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/50'
                    : hasEvents
                    ? 'bg-slate-850/90 border-slate-700 hover:border-slate-600'
                    : cell.isCurrentMonth
                    ? 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                    : 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60'
                }`}
              >
                {/* 日付ヘッダー */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      cell.isToday
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : cell.isCurrentMonth
                        ? 'text-slate-200'
                        : 'text-slate-600'
                    }`}
                  >
                    {cell.dateNumber}
                  </span>
                  {cell.isToday && (
                    <span className="text-[10px] font-bold text-amber-400">今日</span>
                  )}
                </div>

                {/* イベントバッジ表示 */}
                <div className="space-y-1 my-1">
                  {cell.events.map((ev) => {
                    const isSelected = ev.id === selectedEvent.id;
                    const eventBoothCount = entries.filter((en) => en.eventId === ev.id).length;

                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev.id);
                          setSelectedDayCell(cell);
                        }}
                        className={`text-[11px] p-1.5 rounded-xl border transition flex flex-col gap-0.5 group/badge relative ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 font-semibold'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="truncate leading-tight flex items-center gap-1 flex-1">
                            <span>🏮</span>
                            <span className="truncate">{ev.name}</span>
                          </div>
                          {/* イベント直接編集ボタン */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvent(ev.id);
                              setEditingTargetEvent(ev);
                            }}
                            className={`p-1 rounded-md transition shrink-0 ${
                              isSelected
                                ? 'bg-black/10 hover:bg-black/30 text-slate-900 hover:text-black'
                                : 'hover:bg-slate-700 text-slate-400 hover:text-amber-300'
                            }`}
                            title="このイベントの情報を編集"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[10px] opacity-90 flex items-center justify-between pt-0.5">
                          <span>{eventBoothCount}店舗</span>
                          <span>{ev.time ? ev.time.split(' ')[0] : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ホバー時の案内 */}
                {cell.events.length === 0 && cell.isCurrentMonth && (
                  <div className="opacity-0 group-hover:opacity-100 transition text-[10px] text-amber-400 font-semibold flex items-center gap-0.5 justify-center py-0.5">
                    <Plus className="w-3 h-3" />
                    <span>イベント作成</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 選択中イベントの詳細 ＆ このイベントの出店者一覧（メインセクション） */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl space-y-8">
        {/* イベント切り替えセレクター（複数ある場合） */}
        {events.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-slate-800/80">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">切り替え:</span>
            {events.map((ev) => {
              const isSelected = ev.id === selectedEvent.id;
              const count = entries.filter((e) => e.eventId === ev.id).length;
              return (
                <button
                  key={ev.id}
                  onClick={() => onSelectEvent(ev.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 border-slate-700'
                  }`}
                >
                  <span>🏮 {ev.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/30 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                    {ev.date} ({count}店舗)
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* イベント詳細ヘッダーバナー */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 shadow-sm ${
                isSelectedAll
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {isSelectedAll ? (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    出店者マスターポータル
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    現在選択中のイベント
                  </>
                )}
              </span>
              {selectedEvent.date && !isSelectedAll && (
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                  開催日: <strong className="text-white">{selectedEvent.date}</strong>
                </span>
              )}
              {selectedEvent.time && !isSelectedAll && (
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {selectedEvent.time}
                </span>
              )}
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
              {isSelectedAll ? '夜市全体' : selectedEvent.name}
            </h3>
          </div>

          {/* クイックアクションボタングループ */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => setEditingTargetEvent(selectedEvent)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-xs transition"
              title="イベント名や日程を変更"
            >
              <Edit3 className="w-4 h-4 text-amber-400" />
              <span>イベント情報を編集</span>
            </button>

            {/* 削除ボタン（夜市全体は削除不可） */}
            {selectedEvent.name !== '夜市全体' && selectedEvent.id !== 'event-all' && !selectedEvent.name.includes('出店者募集中') && !selectedEvent.name.includes('募集中') && (
              <button
                onClick={() => setEventToDelete(selectedEvent)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 hover:text-rose-200 border border-rose-800/80 font-bold text-xs shadow-sm transition"
                title="このイベントを削除"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>イベントを削除</span>
              </button>
            )}

            {!isSelectedAll ? (
              <button
                onClick={() => {
                  onSelectEvent(selectedEvent.id);
                  onNavigateTab('management');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition"
                title="このイベントの出店・ブース配置・詳細編集へ進む"
              >
                <Store className="w-4 h-4" />
                <span>出店・ブース管理を開く</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => onNavigateTab('vendor')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition"
                title="全出店者名簿マスター一覧を開く"
              >
                <Users className="w-4 h-4" />
                <span>出店者名簿を開く</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 統計ミニカード（3つのみ） */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80">
            <div className="text-xs text-slate-400 font-medium">参加出店ブース数</div>
            <div className="text-2xl font-black text-white font-mono mt-1 flex items-baseline gap-1.5">
              <span>{currentEventEntries.length}</span>
              <span className="text-xs font-normal text-slate-400">店舗</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              確定: <strong className="text-emerald-400">{currentEventEntries.filter((e) => e.entryStatus === 'confirmed').length}</strong> 店舗
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80">
            <div className="text-xs text-slate-400 font-medium">火気使用ブース</div>
            <div className="text-2xl font-black text-orange-400 font-mono mt-1 flex items-baseline gap-1.5">
              <span>{fireCount}</span>
              <span className="text-xs font-normal text-slate-400">店舗</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              消火器確認済: <strong className="text-white">{currentEventEntries.filter((e) => e.fireSafety.hasFireAppliance && e.fireSafety.fireExtinguisher.installed).length}</strong> 店舗
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80">
            <div className="text-xs text-slate-400 font-medium">出店料 請求総額</div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              ¥{totalBilled.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              回収済: <strong className="text-white">¥{totalPaid.toLocaleString()}</strong> ({unpaidCount > 0 ? `未収 ${unpaidCount}件` : '全額回収済'})
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* このイベントの出店者一覧セクション */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <h4 className="text-base sm:text-lg font-black text-white">
                このイベントの出店者一覧
                <span className="ml-2 text-xs font-normal text-slate-400">
                  （全{currentEventEntries.length}店舗中 {filteredEntries.length}店舗表示）
                </span>
              </h4>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsAddVendorModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>出店者名簿から追加</span>
              </button>

              {!isSelectedAll && (
                <button
                  onClick={() => {
                    onSelectEvent(selectedEvent.id);
                    onNavigateTab('management');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-xs transition"
                >
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  <span>出店・ブース管理で編集</span>
                </button>
              )}
            </div>
          </div>

          {/* 検索バー＆フィルター */}
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={vendorSearchQuery}
                onChange={(e) => setVendorSearchQuery(e.target.value)}
                placeholder="店名・代表者名・メニュー・ブース番号で検索..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              {vendorSearchQuery && (
                <button
                  onClick={() => setVendorSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* 火気使用のみ */}
              <button
                onClick={() => setVendorFilterFireOnly(!vendorFilterFireOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  vendorFilterFireOnly
                    ? 'bg-orange-500 text-slate-950 border-orange-400'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-700'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>火気あり ({fireCount})</span>
              </button>

              {/* 未入金のみ */}
              <button
                onClick={() => setVendorFilterUnpaidOnly(!vendorFilterUnpaidOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  vendorFilterUnpaidOnly
                    ? 'bg-rose-500 text-white border-rose-400'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-700'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>未入金のみ ({unpaidCount})</span>
              </button>
            </div>
          </div>

          {/* 出店者一覧テーブル */}
          {filteredEntries.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">ブース</th>
                    <th className="py-3 px-4">屋号・店舗名</th>
                    <th className="py-3 px-4">代表者・連絡先</th>
                    <th className="py-3 px-4">出店品目・メニュー</th>
                    <th className="py-3 px-4">出店料・入金状況</th>
                    <th className="py-3 px-4">火気・燃料</th>
                    <th className="py-3 px-4">許可証</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredEntries.map((entry) => {
                    const isPaid = entry.fee.paymentStatus === 'paid';
                    const hasFire = entry.fireSafety.hasFireAppliance;
                    const fullVendor = vendors.find((v) => v.id === entry.vendorId || v.id === entry.vendorSnapshot.id) || entry.vendorSnapshot;
                    const isOrg = isVendorOrganization(fullVendor);

                    return (
                      <tr 
                        key={entry.id} 
                        onClick={() => {
                          setSelectedVendorForDetail(fullVendor);
                          setSelectedEntryForDetail(entry);
                          setDetailInitialTab('info');
                        }}
                        className={`hover:bg-slate-800/60 transition cursor-pointer group/row ${isOrg ? 'bg-emerald-950/15' : ''}`}
                        title="クリックしてこの出店者の詳細（基本情報・消防・許可証）を表示"
                      >
                        {/* ブース番号 */}
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-amber-400 text-sm">
                            {entry.boothNumber}
                          </div>
                        </td>

                        {/* 屋号・店舗名（出店者について書いている枠） */}
                        <td className="py-2.5 px-3">
                          <div className={`p-2.5 rounded-xl border transition-all ${
                            isOrg 
                              ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-900/90 ring-1 ring-emerald-500/30 shadow-sm' 
                              : 'border-slate-700/60 bg-slate-900/80 group-hover/row:border-amber-500/60 group-hover/row:bg-slate-850 group-hover/row:shadow-md'
                          }`}>
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isOrg && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] inline-flex items-center gap-1 shadow-sm shrink-0">
                                    <Building2 className="w-2.5 h-2.5 text-slate-950" />
                                    登録団体
                                  </span>
                                )}
                                <span className="font-bold text-white text-sm group-hover/row:text-amber-300 transition-colors">
                                  {entry.vendorSnapshot.name}
                                </span>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-normal border border-amber-500/30 group-hover/row:bg-amber-500 group-hover/row:text-slate-950 transition-all shrink-0">
                                詳細 ↗
                              </span>
                            </div>

                            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between gap-2 flex-wrap">
                              <span>ID: {entry.vendorSnapshot.id}</span>
                              {fullVendor.instagram && (
                                <InstagramBadge instagram={fullVendor.instagram} vendorName={entry.vendorSnapshot.name} size="xs" />
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 代表者・電話番号 */}
                        <td className="py-3 px-4">
                          <div className="text-slate-200 font-medium">
                            {entry.vendorSnapshot.ownerName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {entry.vendorSnapshot.phone || '電話番号未登録'}
                          </div>
                        </td>

                        {/* 出店品目・メニュー */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="text-slate-300 truncate" title={entry.vendorSnapshot.menuItems}>
                            {entry.vendorSnapshot.menuItems || '未設定'}
                          </div>
                        </td>

                        {/* 出店料・入金状況 */}
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-white">
                            ¥{entry.fee.totalAmount.toLocaleString()}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePaymentStatus(entry.id);
                            }}
                            className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition flex items-center gap-1 w-fit ${
                              isPaid
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                                : 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900'
                            }`}
                            title="クリックで入金済み/未入金を切り替え"
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>入金済</span>
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-2.5 h-2.5" />
                                <span>未入金 (切替)</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* 火気器具・燃料 */}
                        <td className="py-3 px-4">
                          {hasFire ? (
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-950 text-orange-300 border border-orange-800 flex items-center gap-1 w-fit">
                                <Flame className="w-3 h-3" />
                                <span>火気使用 ({entry.fireSafety.appliances.length}器)</span>
                              </span>
                              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                {entry.fireSafety.appliances.map((a) => a.name || a.fuel).join(', ') || '器具あり'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">火気なし</span>
                          )}
                        </td>

                        {/* 許可証発行ステータス */}
                        <td className="py-3 px-4">
                          {entry.permitIssued ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center gap-1 w-fit">
                              <Award className="w-3 h-3" />
                              <span>発行済</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 w-fit">
                              <span>未発行</span>
                            </span>
                          )}
                        </td>

                        {/* アクション */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const fullVendor = vendors.find((v) => v.id === entry.vendorId || v.id === entry.vendorSnapshot.id) || entry.vendorSnapshot;
                                setSelectedVendorForDetail(fullVendor);
                                setSelectedEntryForDetail(entry);
                                setDetailInitialTab('info');
                              }}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 transition border border-amber-500/30"
                              title="出店者の詳細（基本情報・消防・許可証）を表示"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateTab('management');
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-amber-300 transition"
                              title="出店ブース管理で編集"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveEntry(entry.id, entry.vendorSnapshot.name);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition"
                              title="このイベントから除外"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/30 rounded-2xl border border-slate-800 space-y-3">
              {currentEventEntries.length === 0 ? (
                <>
                  <p className="text-sm font-bold text-slate-400">このイベントにはまだ出店者が登録されていません。</p>
                  <p className="text-slate-500">出店者名簿マスターから参加者を選択して追加してください。</p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setIsAddVendorModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      出店者名簿から出店者を登録する
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-400">検索・絞り込み条件に一致する出店者が見つかりませんでした。</p>
                  <button
                    onClick={() => {
                      setVendorSearchQuery('');
                      setVendorFilterFireOnly(false);
                      setVendorFilterUnpaidOnly(false);
                    }}
                    className="text-amber-400 hover:underline"
                  >
                    絞り込みを解除する
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 登録済み全イベント一覧カード */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <h4 className="text-lg font-black text-white flex items-center gap-2">
          <span>全イベント一覧</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal border border-slate-700">
            {events.length}件登録中
          </span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => {
            const isSelected = ev.id === selectedEvent.id;
            const evBoothCount = entries.filter((en) => en.eventId === ev.id).length;
            const evFireCount = entries.filter((en) => en.eventId === ev.id && en.fireSafety.hasFireAppliance).length;

            return (
              <div
                key={ev.id}
                className={`p-5 rounded-3xl border transition space-y-3 relative ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-950/30 to-slate-900 border-amber-500 shadow-xl shadow-amber-950/20 ring-1 ring-amber-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {ev.date}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* 直接編集ボタン */}
                    <button
                      onClick={() => {
                        onSelectEvent(ev.id);
                        setEditingTargetEvent(ev);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition"
                      title="このイベント情報を編集"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* 削除ボタン（各カードに明示的に配置） */}
                    <button
                      onClick={() => setEventToDelete(ev)}
                      className="p-1.5 px-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/80 text-rose-300 hover:text-rose-200 border border-rose-800/60 transition flex items-center gap-1 text-xs font-semibold"
                      title="このイベントを削除"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>削除</span>
                    </button>

                    {isSelected && (
                      <span className="text-[11px] font-black text-amber-400 flex items-center gap-1 ml-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 選択中
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-base font-black text-white">{ev.name}</h5>
                  {ev.time && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {ev.time}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    👥 <strong>{evBoothCount}</strong> 店舗
                  </span>
                  {evFireCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/60">
                      🔥 <strong>{evFireCount}</strong> 火気
                    </span>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  {!isSelected ? (
                    <button
                      onClick={() => onSelectEvent(ev.id)}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold border border-slate-700 transition"
                    >
                      このイベントを選択して詳細を表示
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigateTab('vendor', 'management')}
                      className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>ブース管理を開く</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* カレンダーの日付クリック時の詳細・操作モーダル */}
      {/* ========================================================================= */}
      {selectedDayCell && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-amber-400" />
                  {selectedDayCell.dateStr} のイベント
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedDayCell.events.length}件の夜市イベントが登録されています
                </p>
              </div>
              <button onClick={() => setSelectedDayCell(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {selectedDayCell.events.map((ev) => {
                const isSelected = ev.id === selectedEvent.id;
                const evBoothCount = entries.filter((en) => en.eventId === ev.id).length;

                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500'
                        : 'bg-slate-800/60 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>🏮</span>
                        <span>{ev.name}</span>
                      </h4>
                      {isSelected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                          選択中
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-slate-300">
                      {ev.time && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{ev.time}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400">
                        参加店舗: <strong className="text-white">{evBoothCount}</strong> 店舗
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={() => {
                          onSelectEvent(ev.id);
                          setEditingTargetEvent(ev);
                          setSelectedDayCell(null);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1 transition"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>イベント編集</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectEvent(ev.id);
                          setSelectedDayCell(null);
                          onNavigateTab('vendor', 'management');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black flex items-center gap-1 transition"
                      >
                        <Store className="w-3 h-3" />
                        <span>出店者管理</span>
                      </button>

                      {/* 削除ボタン */}
                      <button
                        onClick={() => {
                          setEventToDelete(ev);
                          setSelectedDayCell(null);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 transition ml-auto flex items-center gap-1 font-semibold"
                        title="このイベントを削除"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>削除</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="pt-2">
                <button
                  onClick={() => {
                    setPrefilledDate(selectedDayCell.dateStr);
                    setSelectedDayCell(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-amber-500 text-slate-400 hover:text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>この日（{selectedDayCell.dateStr}）に新しいイベントを追加</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新規イベント作成モーダル */}
      {isCreateModalOpen && (
        <EventFormModal
          title="新規夜市イベントの作成"
          initialDate={prefilledDate}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={(newEvent) => {
            onCreateEvent(newEvent);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* イベント編集モーダル（任意イベント編集可能 & 削除ボタン付き） */}
      {editingTargetEvent && (
        <EventFormModal
          title={`イベント情報の編集: ${editingTargetEvent.name}`}
          existingEvent={editingTargetEvent}
          onClose={() => setEditingTargetEvent(null)}
          onSave={(updated) => {
            onUpdateEvent(updated);
            setEditingTargetEvent(null);
          }}
          onDelete={(id) => {
            const target = events.find((e) => e.id === id) || editingTargetEvent;
            setEventToDelete(target);
            setEditingTargetEvent(null);
          }}
        />
      )}

      {/* 出店者名簿からイベントに追加するモーダル */}
      {isAddVendorModalOpen && (
        <AddVendorToEventModal
          event={selectedEvent}
          vendors={vendors}
          existingEntries={currentEventEntries}
          onClose={() => setIsAddVendorModalOpen(false)}
          onAddEntry={(newEntry) => {
            onUpdateEntries([...entries, newEntry]);
            setIsAddVendorModalOpen(false);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* イベント削除確認モーダル */}
      {/* ========================================================================= */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">イベントの削除確認</h3>
                <p className="text-xs text-slate-400 mt-0.5">この操作は取り消すことができません。</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="text-slate-400">削除対象イベント:</div>
              <div className="text-sm font-bold text-white">{eventToDelete.name}</div>
              <div className="text-slate-400 pt-1">開催日: <strong className="text-slate-200">{eventToDelete.date}</strong></div>
              <div className="text-slate-400">参加出店数: <strong className="text-amber-400">{entries.filter((e) => e.eventId === eventToDelete.id).length}</strong> 店舗</div>
            </div>

            <p className="text-xs text-rose-300/90 leading-relaxed bg-rose-950/30 p-2.5 rounded-lg border border-rose-900/50">
              ⚠️ イベント「{eventToDelete.name}」を削除します。このイベントに登録されているブース情報も削除されます。よろしいですか？
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  onDeleteEvent(eventToDelete.id);
                  setEventToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-900/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>削除を実行する</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 出店者詳細モーダル */}
      {selectedVendorForDetail && (
        <VendorDetailModal
          vendor={selectedVendorForDetail}
          entry={selectedEntryForDetail || undefined}
          event={selectedEvent}
          initialTab={detailInitialTab}
          onClose={() => {
            setSelectedVendorForDetail(null);
            setSelectedEntryForDetail(null);
          }}
          onUpdateEntry={(updatedEntry) => {
            const updated = entries.map(e => e.id === updatedEntry.id ? updatedEntry : e);
            onUpdateEntries(updated);
            setSelectedEntryForDetail(updatedEntry);
          }}
        />
      )}
    </div>
  );
};

// イベント作成・編集モーダル（シンプル設計：名称・開催日・開催時間のみ）
interface EventFormModalProps {
  title: string;
  initialDate?: string;
  existingEvent?: NightMarketEvent;
  onClose: () => void;
  onSave: (event: NightMarketEvent) => void;
  onDelete?: (eventId: string) => void;
}

const EventFormModal: React.FC<EventFormModalProps> = ({
  title,
  initialDate,
  existingEvent,
  onClose,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState<NightMarketEvent>(() => {
    if (existingEvent) return JSON.parse(JSON.stringify(existingEvent));
    return {
      id: `event-${Date.now()}`,
      name: '第13回 たなべ夜市',
      date: initialDate || new Date().toISOString().split('T')[0],
      time: '16:00 - 21:00',
      venue: '',
      organizer: '',
      contactPhone: '',
      fireDepartmentName: '',
      guidelinesNotes: [],
      areas: [...STANDARD_AREAS]
    };
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-amber-400" />
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* イベント名称 */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">イベント名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例: 第13回 たなべ夜市"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* 開催日 & 開催時間 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">開催日</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">開催時間</label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                placeholder="例: 16:00 - 21:00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          {/* 編集時のみ削除ボタンを左側に表示 */}
          {existingEvent && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(existingEvent.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-rose-200 border border-rose-800/80 text-xs font-bold transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>このイベントを削除</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              キャンセル
            </button>
            <button
              onClick={() => onSave(formData)}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
            >
              保存する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 出店者名簿からイベントに出店登録するモーダル
interface AddVendorToEventModalProps {
  event: NightMarketEvent;
  vendors: Vendor[];
  existingEntries: EventEntry[];
  onClose: () => void;
  onAddEntry: (entry: EventEntry) => void;
}

const AddVendorToEventModal: React.FC<AddVendorToEventModalProps> = ({
  event,
  vendors,
  existingEntries,
  onClose,
  onAddEntry
}) => {
  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || '');
  const [boothArea, setBoothArea] = useState<BoothArea>('OUTDOOR');
  const [boothNumber, setBoothNumber] = useState(`O-0${existingEntries.length + 1}`);
  const [baseFee, setBaseFee] = useState<number>(5000);
  const [powerOption, setPowerOption] = useState(false);
  const [garbageOption, setGarbageOption] = useState(true);

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  const handleAreaChange = (newArea: BoothArea) => {
    setBoothArea(newArea);
    const prefix = newArea === 'OUTDOOR' ? 'O' : newArea === 'FOOD_STALL' ? 'F' : newArea === 'KITCHEN_CAR' ? 'K' : newArea;
    setBoothNumber(`${prefix}-0${existingEntries.length + 1}`);
    const areaDef = (event.areas && event.areas.length > 0 ? event.areas : STANDARD_AREAS).find((a) => a.code === newArea);
    const fee = areaDef?.defaultBaseFee || (newArea === 'KITCHEN_CAR' ? 12000 : newArea === 'FOOD_STALL' ? 8000 : 5000);
    setBaseFee(fee);
  };

  const handleAdd = () => {
    if (!selectedVendor) return;

    const powerFee = powerOption ? 1500 : 0;
    const garbageFee = garbageOption ? 500 : 0;

    const newEntry: EventEntry = {
      id: `entry-${Date.now()}`,
      eventId: event.id,
      vendorId: selectedVendor.id,
      vendorSnapshot: { ...selectedVendor },
      boothArea,
      boothNumber,
      fee: {
        baseFee,
        powerOption,
        powerFee,
        garbageOption,
        garbageFee,
        equipmentRentalFee: 0,
        discount: 0,
        totalAmount: baseFee + powerFee + garbageFee,
        paymentStatus: 'unbilled',
        receiptIssued: false
      },
      fireSafety: {
        hasFireAppliance: selectedVendor.category === 'food' || selectedVendor.category === 'kitchen_car',
        appliances: selectedVendor.category === 'food' || selectedVendor.category === 'kitchen_car' ? [
          { type: 'cassette_stove', name: '卓上コンロ', fuel: 'カセットボンベ', count: 1 }
        ] : [],
        fireExtinguisher: {
          installed: false,
          count: 0,
          type: '粉末ABC',
          capacity: '10型 3.0kg',
          manufacturingYear: '2024',
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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            「{event.name}」に出店者を登録
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">出店者名簿から選択</label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.ownerName}) {v.status === 'banned' ? '【※出禁】' : v.status === 'warning' ? '【要注意】' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 出店内容 */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">出店内容</label>
            <select
              value={boothArea}
              onChange={(e) => handleAreaChange(e.target.value as BoothArea)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            >
              {(event.areas && event.areas.length > 0 ? event.areas : STANDARD_AREAS).map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name} (基本 ¥{a.defaultBaseFee.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">ブース番号</label>
              <input
                type="text"
                value={boothNumber}
                onChange={(e) => setBoothNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">基本出店料 (円)</label>
              <input
                type="number"
                step={500}
                value={baseFee}
                onChange={(e) => setBaseFee(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700 space-y-2">
            <span className="font-semibold text-slate-300 block">オプション選択</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={powerOption}
                  onChange={(e) => setPowerOption(e.target.checked)}
                  className="rounded bg-slate-800 text-amber-500"
                />
                <span>電源利用 (+¥1,500)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={garbageOption}
                  onChange={(e) => setGarbageOption(e.target.checked)}
                  className="rounded bg-slate-800 text-emerald-500"
                />
                <span>ゴミ回収 (+¥500)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-5 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            キャンセル
          </button>
          <button
            onClick={handleAdd}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold"
          >
            登録する
          </button>
        </div>
      </div>
    </div>
  );
};
