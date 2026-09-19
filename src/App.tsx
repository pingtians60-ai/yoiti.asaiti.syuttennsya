import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Navigation, ActiveTab, VendorSubTab } from './components/layout/Navigation';
import { DashboardView } from './components/dashboard/DashboardView';
import { CalendarView } from './components/calendar/CalendarView';
import { BoothManagementView } from './components/management/BoothManagementView';
import { VendorListView } from './components/vendor-list/VendorListView';
import { SpreadsheetImportModal } from './components/common/SpreadsheetImportModal';

import { NightMarketEvent, Vendor, EventEntry, isVendorOrganization } from './types';
import { 
  loadEvent, 
  saveEvent, 
  loadAllEvents,
  saveAllEvents,
  loadSelectedEventId,
  saveSelectedEventId,
  loadVendors, 
  saveVendors, 
  loadEntries, 
  saveEntries, 
  clearAllData,
  loadMockData,
  importAllDataFromJson,
  defaultBlankEvent
} from './utils/storage';
import { deduplicateVendorsAndEntries } from './utils/googleSheets';
import { Sparkles, FileSpreadsheet } from 'lucide-react';

export function App() {
  // 初期画面はダッシュボードを表示
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // ナビゲーション補助ハンドラー
  const handleNavigateTab = (tab: ActiveTab | VendorSubTab) => {
    if (tab === 'management' && !isAllEvent) {
      setActiveTab('management');
    } else if (tab === 'management' || tab === 'fire' || tab === 'vendor-list' || tab === 'permit' || tab === 'vendor') {
      setActiveTab('vendor');
    } else {
      setActiveTab(tab as ActiveTab);
    }
  };
  
  // 複数イベント管理ステート
  const [allEvents, setAllEvents] = useState<NightMarketEvent[]>(loadAllEvents);
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    const saved = loadSelectedEventId();
    if (saved && allEvents.some((e) => e.id === saved)) return saved;
    return allEvents[0]?.id || '';
  });

  const [vendors, setVendors] = useState<Vendor[]>(loadVendors);
  const [entries, setEntries] = useState<EventEntry[]>(loadEntries);

  console.log('[DEBUG-STATE] allEvents count:', allEvents.length, allEvents.map(e => ({ id: e.id, name: e.name, date: e.date })));
  console.log('[DEBUG-STATE] vendors count:', vendors.length, vendors.map(v => ({ id: v.id, name: v.name })));
  console.log('[DEBUG-STATE] selectedEventId:', selectedEventId);

  // 現在選択中のイベントオブジェクト
  const event = allEvents.find((e) => e.id === selectedEventId) || allEvents[0] || defaultBlankEvent;

  // 現在選択中イベントが「夜市全体」かどうか
  const isAllEvent = 
    event.name === '夜市全体' || 
    event.id === 'event-all' || 
    event.name.includes('出店者募集中') || 
    event.name.includes('募集中') ||
    event.name.trim() === '夜市';

  // 初回マウント時およびストレージ更新時に正規化データを同期し、被り出店者を完全自動で検知・削除
  useEffect(() => {
    const cleaned = loadAllEvents();
    setAllEvents(cleaned);

    const loadedV = loadVendors();
    const loadedE = loadEntries();
    const deduped = deduplicateVendorsAndEntries(loadedV, loadedE);
    if (deduped.removedVendorCount > 0 || deduped.removedEntryCount > 0) {
      setVendors(deduped.vendors);
      saveVendors(deduped.vendors);
      setEntries(deduped.entries);
      saveEntries(deduped.entries);
    }
  }, []);

  // 現在選択中イベントのエントリー（出店ブース）
  // 出店・ブース管理はカレンダーの個別予定イベントで利用
  const currentEventEntries = isAllEvent
    ? entries
    : entries.filter(
        (e) => e.eventId === event.id || (!e.eventId && allEvents[0]?.id === event.id)
      );

  // モーダル開閉ステート
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);

  // イベント選択切り替え
  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    saveSelectedEventId(eventId);
    const target = allEvents.find((e) => e.id === eventId);
    if (target) {
      saveEvent(target);
    }
  };

  // 新規イベント作成
  const handleCreateEvent = (newEvent: NightMarketEvent) => {
    const updated = [...allEvents, newEvent];
    setAllEvents(updated);
    saveAllEvents(updated);
    setSelectedEventId(newEvent.id);
    saveSelectedEventId(newEvent.id);
    saveEvent(newEvent);
  };

  // イベント情報更新
  const handleUpdateEvent = (updated: NightMarketEvent) => {
    const updatedList = allEvents.map((e) => (e.id === updated.id ? updated : e));
    setAllEvents(updatedList);
    saveAllEvents(updatedList);
    saveEvent(updated);
  };

  // イベント削除
  const handleDeleteEvent = (eventId: string) => {
    if (allEvents.length <= 1) {
      // 最後の1件を削除した場合は、初期状態の空イベントにリセット
      const resetEvent: NightMarketEvent = {
        ...defaultBlankEvent,
        id: `event-${Date.now()}`,
        name: '新規夜市イベント',
        date: new Date().toISOString().split('T')[0],
        time: '16:00 - 21:00'
      };
      setAllEvents([resetEvent]);
      saveAllEvents([resetEvent]);
      setSelectedEventId(resetEvent.id);
      saveSelectedEventId(resetEvent.id);
      saveEvent(resetEvent);

      // このイベントのエントリーも削除
      const updatedEntries = entries.filter((e) => e.eventId !== eventId);
      setEntries(updatedEntries);
      saveEntries(updatedEntries);
      return;
    }
    const updatedList = allEvents.filter((e) => e.id !== eventId);
    setAllEvents(updatedList);
    saveAllEvents(updatedList);

    // 削除されたイベントに紐づくエントリーも整理
    const updatedEntries = entries.filter((e) => e.eventId !== eventId);
    setEntries(updatedEntries);
    saveEntries(updatedEntries);

    // 次の選択イベントを設定
    const nextEvent = updatedList[0];
    setSelectedEventId(nextEvent.id);
    saveSelectedEventId(nextEvent.id);
    saveEvent(nextEvent);
  };

  const handleUpdateVendors = (updatedVendors: Vendor[]) => {
    setVendors(updatedVendors);
    saveVendors(updatedVendors);

    // entries側のvendorSnapshotも自動同期
    setEntries((prevEntries) => {
      const vendorMap = new Map(updatedVendors.map((v) => [v.id, v]));
      const syncedEntries = prevEntries.map((entry) => {
        const v = vendorMap.get(entry.vendorId) || vendorMap.get(entry.vendorSnapshot?.id);
        if (v) {
          return {
            ...entry,
            vendorSnapshot: { ...entry.vendorSnapshot, ...v }
          };
        }
        return entry;
      });
      saveEntries(syncedEntries);
      return syncedEntries;
    });
  };

  // 現在選択中イベントのエントリー更新
  const handleUpdateCurrentEventEntries = (updatedForCurrentEvent: EventEntry[]) => {
    setEntries((prevEntries) => {
      let newAllEntries: EventEntry[];
      if (isAllEvent) {
        newAllEntries = updatedForCurrentEvent;
      } else {
        const otherEntries = prevEntries.filter(
          (e) => e.eventId !== event.id && (e.eventId || allEvents[0]?.id !== event.id)
        );
        const standardized = updatedForCurrentEvent.map((e) => ({
          ...e,
          eventId: event.id
        }));
        newAllEntries = [...otherEntries, ...standardized];
      }

      saveEntries(newAllEntries);

      // entries側で出店者情報（屋号、代表者、電話等）が編集・変更された場合、vendors名簿マスター側も自動同期
      setVendors((prevVendors) => {
        const updatedVendors = prevVendors.map((v) => {
          const matchingEntry = updatedForCurrentEvent.find(
            (e) => e.vendorId === v.id || e.vendorSnapshot?.id === v.id
          );
          if (matchingEntry && matchingEntry.vendorSnapshot) {
            return {
              ...v,
              ...matchingEntry.vendorSnapshot,
              id: v.id
            };
          }
          return v;
        });
        saveVendors(updatedVendors);
        return updatedVendors;
      });

      return newAllEntries;
    });
  };

  // 全エントリーの直接更新（カレンダー等からの更新用）
  const handleUpdateAllEntries = (newAllEntries: EventEntry[]) => {
    setEntries(newAllEntries);
    saveEntries(newAllEntries);
  };

  // 全消去（空にして新規スタート）
  const handleClearAllData = () => {
    const res = clearAllData();
    setAllEvents(res.allEvents);
    setSelectedEventId(res.event.id);
    setVendors([]);
    setEntries([]);
  };

  // サンプルデータ読み込み
  const handleLoadMockData = () => {
    const res = loadMockData();
    setAllEvents(res.allEvents);
    setSelectedEventId(res.event.id);
    setVendors(res.vendors);
    setEntries(res.entries);
  };

  // JSONインポート復元
  const handleImportData = (jsonStr: string) => {
    const success = importAllDataFromJson(jsonStr);
    if (success) {
      const loadedEvents = loadAllEvents();
      setAllEvents(loadedEvents);
      setSelectedEventId(loadSelectedEventId() || loadedEvents[0]?.id || '');
      setVendors(loadVendors());
      setEntries(loadEntries());
      alert('バックアップデータを正常に読み込みました。');
    } else {
      alert('JSONデータの読み込みに失敗しました。ファイル形式をご確認ください。');
    }
  };

  // スプレッドシートからの自動取り込み＆一括反映（現在選択中のイベントへ紐付け）
  const handleSpreadsheetImport = (importedVendors: Vendor[], importedEntries: EventEntry[], count: number) => {
    const deduped = deduplicateVendorsAndEntries(importedVendors, importedEntries);
    handleUpdateVendors(deduped.vendors);

    // 現在選択中のイベントIDを付与して反映
    const entriesWithEventId = deduped.entries.map((e) => ({ ...e, eventId: event.id }));
    handleUpdateCurrentEventEntries(entriesWithEventId);

    let msg = `Googleスプレッドシートから「${event.name}」へ ${count}件の出店・エントリー情報を自動記入しました！`;
    if (deduped.removedVendorCount > 0) {
      msg += `\n※ 重複していた出店者 ${deduped.removedVendorCount}件 の被りを自動削除・統合しました。`;
    }
    msg += '\n出店者一覧、ブース管理、消防安全、出店許可証に即時反映されています。';
    alert(msg);
  };

  // 統計バッジ計算（現在選択中イベント基準）
  const fireCount = currentEventEntries.filter((e) => e.fireSafety.hasFireAppliance).length;
  const unpaidCount = currentEventEntries.filter((e) => e.fee.paymentStatus !== 'paid').length;
  const fireDocIncompleteCount = currentEventEntries.filter(
    (e) => e.fireSafety.hasFireAppliance && !e.fireSafety.checkedByStaff
  ).length;
  const bannedWarningCount = vendors.filter(
    (v) => v.status === 'banned' || v.status === 'warning'
  ).length;
  const unissuedPermitCount = currentEventEntries.filter((e) => !e.permitIssued).length;

  // 夜市全体（isAllEvent === true）選択時に management が開かれていた場合は vendor（出店者名簿）へ自動遷移
  useEffect(() => {
    if (isAllEvent && activeTab === 'management') {
      setActiveTab('vendor');
    }
  }, [isAllEvent, activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black transition-colors duration-200">
      {/* 管理者グローバルヘッダー */}
      <Header
        event={event}
        events={allEvents}
        onSelectEvent={handleSelectEvent}
        onUpdateEvent={handleUpdateEvent}
        onImportData={handleImportData}
        onOpenSpreadsheetImport={() => setIsSpreadsheetModalOpen(true)}
        onNavigateToDashboard={() => {
          const allEvent = allEvents.find((e) => e.id === 'event-all' || e.name === '夜市全体') || allEvents[0];
          if (allEvent) {
            handleSelectEvent(allEvent.id);
          }
          setActiveTab('dashboard');
        }}
        entryStats={{
          total: isAllEvent ? vendors.length : currentEventEntries.length,
          confirmed: isAllEvent ? vendors.length : currentEventEntries.filter((e) => e.entryStatus === 'confirmed').length,
          fireCount: isAllEvent
            ? vendors.filter((v) => v.category === 'food' || v.category === 'kitchen_car' || v.tags.some((t) => t.includes('火気'))).length
            : fireCount,
          unpaidCount: isAllEvent ? 0 : unpaidCount,
          warningCount: bannedWarningCount,
          isAllEvent,
          storeCount: isAllEvent ? vendors.filter(v => !isVendorOrganization(v)).length : undefined,
          organizationCount: isAllEvent ? vendors.filter(isVendorOrganization).length : undefined
        }}
      />

      {/* タブナビゲーション */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unpaidCount={unpaidCount}
        fireDocIncompleteCount={fireDocIncompleteCount}
        bannedWarningCount={bannedWarningCount}
        unissuedPermitCount={unissuedPermitCount}
        isAllEvent={isAllEvent}
      />

      {/* メインコンテンツエリア */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* データが0件（空）の場合の案内バー */}
        {entries.length === 0 && vendors.length === 0 && (
          <div className="mb-8 p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border-2 border-dashed border-slate-700 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg shadow-emerald-950">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">
                Googleフォーム・スプレッドシートから自動記入できます
              </h2>
              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                出店者から集めたGoogleフォームの回答スプレッドシートのURLを貼り付けるだけで、
                出店者一覧・ブース配置・料金計算・消防安全届出・許可証発行に必要な情報が全自動で記入されます。
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <button
                onClick={() => setIsSpreadsheetModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                スプレッドシートのURLを連携して自動記入
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            event={event}
            entries={currentEventEntries}
            vendors={vendors}
            allEvents={allEvents}
            onSelectEvent={handleSelectEvent}
            setActiveTab={handleNavigateTab}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            events={allEvents}
            selectedEvent={event}
            entries={entries}
            vendors={vendors}
            onSelectEvent={handleSelectEvent}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onUpdateEntries={handleUpdateAllEntries}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {activeTab === 'management' && !isAllEvent && (
          <BoothManagementView
            event={event}
            entries={currentEventEntries}
            vendors={vendors}
            onUpdateEntries={handleUpdateCurrentEventEntries}
            onUpdateVendors={handleUpdateVendors}
          />
        )}

        {activeTab === 'vendor' && (
          <VendorListView
            event={event}
            entries={currentEventEntries}
            vendors={vendors}
            onUpdateEntries={handleUpdateCurrentEventEntries}
            onUpdateVendors={handleUpdateVendors}
          />
        )}
      </main>

      {/* スプレッドシート一括取り込みモーダル */}
      {isSpreadsheetModalOpen && (
        <SpreadsheetImportModal
          event={event}
          existingVendors={vendors}
          existingEntries={currentEventEntries}
          onClose={() => setIsSpreadsheetModalOpen(false)}
          onImport={handleSpreadsheetImport}
        />
      )}

      {/* 管理者フッター */}
      <footer className="no-print border-t border-slate-800/80 bg-slate-900/40 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>yoiti・asaiti 出店者管理ポータル</span>
            <span className="mx-2">|</span>
            <span>Googleフォーム・スプレッドシート連携対応</span>
          </div>
          <div className="text-[11px] text-slate-400">
            © 2026 yoiti・asaiti
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
