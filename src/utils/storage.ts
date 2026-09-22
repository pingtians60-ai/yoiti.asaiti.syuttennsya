import { NightMarketEvent, Vendor, EventEntry, VendorCategory } from '../types';
import { initialEvent, initialVendors, initialEntries } from '../data/mockData';

const STORAGE_KEYS = {
  EVENT: 'night_market_current_event',
  ALL_EVENTS: 'night_market_all_events_list',
  SELECTED_EVENT_ID: 'night_market_selected_event_id',
  VENDORS: 'night_market_vendors_master',
  ENTRIES: 'night_market_event_entries',
  INITIALIZED: 'night_market_has_initialized_v2'
};

export const defaultBlankEvent: NightMarketEvent = {
  id: 'event-all',
  name: '夜市全体',
  date: '',
  time: '',
  venue: '全会場 / 出店者マスター',
  organizer: '夜市実行委員会',
  contactPhone: '090-0000-0000',
  fireDepartmentName: '所轄消防本部 予防課',
  guidelinesNotes: [
    '火気器具を使用するブースは必ず「業務用粉末消火器(10型以上)」を持参・設置してください。',
    '発電機への給油は必ずエンジン停止状態で行い、火気厳禁です。',
    '廃油・ゴミの現地廃棄は一切禁止です。全量持ち帰りを徹底してください。',
    '許可証はブース正面の視認しやすい位置に常時掲示してください。',
    '終了時刻 21:00 以降の販売は厳禁です。22:00完全撤収を厳守してください。'
  ],
  areas: [
    { code: 'OUTDOOR', name: '屋外出店（物販・体験）', defaultBaseFee: 5000, description: '物販・ハンドメイド雑貨・展示・体験型ワークショップ' },
    { code: 'FOOD_STALL', name: '飲食露店', defaultBaseFee: 8000, description: '調理・食品販売・露店（火気器具使用可）' },
    { code: 'KITCHEN_CAR', name: 'キッチンカー', defaultBaseFee: 12000, description: '移動販売車輛スペース（自立営業）' }
  ]
};

export const STANDARD_AREAS: NightMarketEvent['areas'] = [
  { code: 'OUTDOOR', name: '屋外出店（物販・体験）', defaultBaseFee: 5000, description: '物販・ハンドメイド雑貨・展示・体験型ワークショップ' },
  { code: 'FOOD_STALL', name: '飲食露店', defaultBaseFee: 8000, description: '調理・食品販売・露店（火気器具使用可）' },
  { code: 'KITCHEN_CAR', name: 'キッチンカー', defaultBaseFee: 12000, description: '移動販売車輛スペース（自立営業）' }
];

export function normalizeEvent(event: NightMarketEvent): NightMarketEvent {
  const isAll = 
    event.id === 'event-all' || 
    event.name === '夜市全体' || 
    event.name.includes('出店者募集中') ||
    event.name.includes('募集中') ||
    event.name === '夜市' ||
    event.name.trim() === '夜市';

  let cleanedName = event.name
    .replace(/[（(]出店者募集中[）)]/g, '')
    .replace(/出店者募集中/g, '')
    .replace(/[（(]募集中[）)]/g, '')
    .replace(/募集中/g, '')
    .trim();

  const name = isAll ? '夜市全体' : (cleanedName || '夜市全体');
  const date = isAll ? '' : (event.date || '');
  const time = isAll ? '' : (event.time || '');
  const id = isAll ? 'event-all' : event.id;

  const hasNewAreas = event.areas && event.areas.some(a => a.code === 'OUTDOOR' || a.code === 'FOOD_STALL');
  const areas = (!event.areas || event.areas.length !== 3 || !hasNewAreas) ? STANDARD_AREAS : event.areas;

  return {
    ...event,
    id,
    name,
    date,
    time,
    areas
  };
}

export function normalizeEntries(entries: EventEntry[]): EventEntry[] {
  // 夜市全体（event-all）はエントリーを持たないため、誤って保存された古いデータを自動除外
  return entries
    .filter(entry => entry.eventId && entry.eventId !== 'event-all')
    .map(entry => {
      let newArea = entry.boothArea;
      if (newArea === 'A' || newArea === 'B') {
        newArea = 'FOOD_STALL';
      } else if (newArea === 'C' || newArea === 'WORKSHOP') {
        newArea = 'OUTDOOR';
      } else if (newArea !== 'FOOD_STALL' && newArea !== 'KITCHEN_CAR' && newArea !== 'OUTDOOR') {
        newArea = 'OUTDOOR';
      }
      return {
        ...entry,
        boothArea: newArea
      };
    });
}

export function loadEvent(): NightMarketEvent {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EVENT);
    if (data) {
      const parsed = normalizeEvent(JSON.parse(data));
      if (parsed.id === 'event-all' || parsed.name === '夜市全体') {
        parsed.date = '';
        parsed.time = '';
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load event data:', e);
  }
  return defaultBlankEvent;
}

export function saveEvent(event: NightMarketEvent): void {
  const normalized = normalizeEvent(event);
  localStorage.setItem(STORAGE_KEYS.EVENT, JSON.stringify(normalized));
}

export function loadAllEvents(): NightMarketEvent[] {
  let events: NightMarketEvent[] = [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ALL_EVENTS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        events = parsed.map(normalizeEvent);
      }
    }
  } catch (e) {
    console.error('Failed to load all events:', e);
  }

  // 「夜市全体」および旧「出店者募集中」以外のイベントリスト
  const nonAllEvents = events.filter(e => e.id !== 'event-all' && e.name !== '夜市全体');

  // 単一の完全な「夜市全体（日程なし）」を常に先頭に配置
  const cleanAllEvent: NightMarketEvent = {
    ...defaultBlankEvent,
    id: 'event-all',
    name: '夜市全体',
    date: '',
    time: ''
  };

  // イベントがない場合は初期イベントを含める
  const finalEvents = nonAllEvents.length > 0 ? [cleanAllEvent, ...nonAllEvents] : [cleanAllEvent, initialEvent];

  // localStorage も即時同期して過去の古いデータを完全に上書き一新
  try {
    localStorage.setItem(STORAGE_KEYS.ALL_EVENTS, JSON.stringify(finalEvents));
    localStorage.setItem(STORAGE_KEYS.EVENT, JSON.stringify(cleanAllEvent));
    
    const currentSelected = localStorage.getItem(STORAGE_KEYS.SELECTED_EVENT_ID);
    if (!currentSelected || !finalEvents.some(e => e.id === currentSelected)) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_EVENT_ID, 'event-all');
    }
  } catch (e) {
    console.error('Failed to persist cleaned events to localStorage:', e);
  }

  return finalEvents;
}

export function saveAllEvents(events: NightMarketEvent[]): void {
  const normalized = events.map(normalizeEvent);
  localStorage.setItem(STORAGE_KEYS.ALL_EVENTS, JSON.stringify(normalized));
}

export function loadSelectedEventId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.SELECTED_EVENT_ID);
}

export function saveSelectedEventId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.SELECTED_EVENT_ID, id);
}

export function normalizeVendorCategory(cat?: string): VendorCategory {
  if (cat === 'kitchen_car') return 'kitchen_car';
  if (cat === 'food' || cat === 'drink') return 'food';
  return 'outdoor';
}

export function normalizeVendors(vendors: Vendor[]): Vendor[] {
  return vendors.map(v => {
    let status = v.status;
    let statusReason = v.statusReason;

    // スプレッドシートの「注意事項」等の質問列によって誤って要注意判定された出店者を自動復旧
    if (status === 'warning' && (statusReason === 'スプレッドシート記録に基づく要注意' || statusReason?.includes('スプレッドシート'))) {
      const combinedNotes = `${v.internalNotes || ''} ${v.tags?.join(' ') || ''}`
        .replace(/注意事項|注意点|ご注意|留意事項|留意点|特記事項|規約/g, '')
        .trim();
      if (!/トラブル|要注意|警告|クレーム|警察|消防指導|違反|出禁|ブラック/.test(combinedNotes)) {
        status = 'active';
        statusReason = undefined;
      }
    }

    return {
      ...v,
      status,
      statusReason,
      category: normalizeVendorCategory(v.category)
    };
  });
}

export function loadVendors(): Vendor[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.VENDORS);
    if (data !== null) return normalizeVendors(JSON.parse(data));
  } catch (e) {
    console.error('Failed to load vendors data:', e);
  }
  return normalizeVendors(initialVendors); // 初期状態はマスターデータを使用
}

export function saveVendors(vendors: Vendor[]): void {
  localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(normalizeVendors(vendors)));
}

export function loadEntries(): EventEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    if (data !== null) return normalizeEntries(JSON.parse(data));
  } catch (e) {
    console.error('Failed to load entries data:', e);
  }
  return normalizeEntries(initialEntries); // 初期状態はマスターエントリーを使用
}

export function saveEntries(entries: EventEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
}

/**
 * データを完全にクリアして新規状態にする
 */
export function clearAllData(): { event: NightMarketEvent; allEvents: NightMarketEvent[]; vendors: Vendor[]; entries: EventEntry[] } {
  saveEvent(defaultBlankEvent);
  saveAllEvents([defaultBlankEvent]);
  saveSelectedEventId(defaultBlankEvent.id);
  saveVendors([]);
  saveEntries([]);
  return { event: defaultBlankEvent, allEvents: [defaultBlankEvent], vendors: [], entries: [] };
}

/**
 * 模擬サンプルデータを読み込む（動作確認用）
 */
export function loadMockData(): { event: NightMarketEvent; allEvents: NightMarketEvent[]; vendors: Vendor[]; entries: EventEntry[] } {
  const secondEvent: NightMarketEvent = {
    ...initialEvent,
    id: 'event-2026-11-21',
    name: '第13回 たなべ夜市 (秋の収穫SP)',
    date: '2026-11-21',
    venue: '扇ヶ浜公園 芝生広場'
  };
  const events = [defaultBlankEvent, initialEvent, secondEvent];
  saveAllEvents(events);
  saveSelectedEventId(defaultBlankEvent.id);
  saveEvent(defaultBlankEvent);
  saveVendors(initialVendors);
  saveEntries(initialEntries);
  return { event: defaultBlankEvent, allEvents: events, vendors: initialVendors, entries: initialEntries };
}

export function exportAllDataAsJson(): string {
  const exportData = {
    version: '1.1.0',
    exportedAt: new Date().toISOString(),
    event: loadEvent(),
    allEvents: loadAllEvents(),
    selectedEventId: loadSelectedEventId(),
    vendors: loadVendors(),
    entries: loadEntries()
  };
  return JSON.stringify(exportData, null, 2);
}

export function importAllDataFromJson(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if ((parsed.event || parsed.allEvents) && Array.isArray(parsed.vendors) && Array.isArray(parsed.entries)) {
      const allEvents: NightMarketEvent[] = Array.isArray(parsed.allEvents) && parsed.allEvents.length > 0
        ? parsed.allEvents
        : [parsed.event];
      const selectedId = parsed.selectedEventId || allEvents[0]?.id;
      const currentEvent = allEvents.find((e: NightMarketEvent) => e.id === selectedId) || allEvents[0];
      
      saveAllEvents(allEvents);
      if (selectedId) saveSelectedEventId(selectedId);
      saveEvent(currentEvent);
      saveVendors(parsed.vendors);
      saveEntries(parsed.entries);
      return true;
    }
  } catch (err) {
    console.error('JSON parse error during import:', err);
  }
  return false;
}

/**
 * スプレッドシートやCSVから出店者を一括インポートするパーサー
 */
export function parseSpreadsheetCsv(csvText: string): Vendor[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const results: Vendor[] = [];
  // ヘッダー行をスキップ
  const startIndex = lines[0].includes('屋号') || lines[0].includes('名前') || lines[0].includes('店名') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    // 簡易CSVパース（カンマまたはタブ区切り対応）
    const line = lines[i];
    const isTab = line.includes('\t');
    const cols = isTab ? line.split('\t') : line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());

    if (cols.length === 0 || !cols[0]) continue;

    const name = cols[0] || `出店者_${i + 1}`;
    const ownerName = cols[1] || '代表者未定';
    const phone = cols[2] || '';
    const email = cols[3] || '';
    const categoryRaw = cols[4] || '';
    const menuItems = cols[5] || cols[4] || '未定';
    const note = cols[6] || '';

    let category: Vendor['category'] = 'food';
    if (categoryRaw.includes('キッチンカー') || categoryRaw.includes('車')) {
      category = 'kitchen_car';
    } else if (categoryRaw.includes('物販') || categoryRaw.includes('体験') || categoryRaw.includes('クラフト') || categoryRaw.includes('縁日') || categoryRaw.includes('ゲーム') || categoryRaw.includes('屋外')) {
      category = 'outdoor';
    } else {
      category = 'food';
    }

    // 出禁・要注意判定
    let status: Vendor['status'] = 'active';
    let statusReason = '';
    const cleanImportText = `${line} ${note}`
      .replace(/注意事項|注意点|ご注意|留意事項|留意点|特記事項|規約/g, '')
      .trim();
    if (/出禁|ブラック/.test(cleanImportText)) {
      status = 'banned';
      statusReason = 'スプレッドシート記録に基づく出禁';
    } else if (/トラブル|要注意|警告|クレーム|警察|消防指導|違反/.test(cleanImportText)) {
      status = 'warning';
      statusReason = '過去のトラブル・警告記録あり';
    }

    results.push({
      id: `v-imported-${Date.now()}-${i}`,
      name,
      ownerName,
      phone,
      email,
      category,
      menuItems,
      hasFoodLicense: category === 'food' || category === 'kitchen_car',
      status,
      statusReason,
      tags: ['スプレッドシート移行'],
      internalNotes: note,
      pastParticipationCount: 1,
      pastEvents: ['過去の夜市'],
      createdAt: new Date().toISOString().split('T')[0]
    });
  }

  return results;
}
