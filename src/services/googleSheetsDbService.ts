import { Vendor } from '../types';

const STORAGE_KEYS = {
  GAS_API_URL: 'night_market_gas_api_url',
  AUTO_SYNC: 'night_market_gas_auto_sync',
  LAST_SYNC_TIME: 'night_market_gas_last_sync_time'
};

export interface GasSyncResult {
  success: boolean;
  message: string;
  count?: number;
  data?: any;
}

export interface GasConfig {
  url: string;
  autoSync: boolean;
  lastSyncTime: string | null;
}

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyHe8QQKxDr4--kUIcrgxBeo1jT_DCTG_aUkan8ACTh9C97XcX74YmXIUHdacu0AQoRng/exec';

/**
 * 保存された設定を取得
 */
export function getGasConfig(): GasConfig {
  const url = DEFAULT_GAS_URL; // 常に最新のスプレッドシートURLを使用するよう強制
  const storedAutoSync = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC);
  const autoSync = storedAutoSync === null ? true : storedAutoSync === 'true';
  const lastSyncTime = localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME) || null;
  return { url, autoSync, lastSyncTime };
}

/**
 * 設定を保存
 */
export function saveGasConfig(url: string, autoSync: boolean): void {
  localStorage.setItem(STORAGE_KEYS.GAS_API_URL, url.trim());
  localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, autoSync ? 'true' : 'false');
}

/**
 * 最終同期日時を更新
 */
export function recordLastSyncTime(): void {
  const now = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, now);
}

/**
 * GASの接続テスト
 */
export async function testGasConnection(apiUrl?: string): Promise<GasSyncResult> {
  const targetUrl = (apiUrl || getGasConfig().url).trim();
  if (!targetUrl) {
    return { success: false, message: 'Google Apps ScriptのウェブアプリURLが設定されていません。' };
  }

  try {
    const separator = targetUrl.includes('?') ? '&' : '?';
    const testUrl = `${targetUrl}${separator}action=ping&_t=${Date.now()}`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      return {
        success: false,
        message: `通信エラー: HTTPステータス ${response.status}（URLが正しいか、またはアクセス権限が「全員」になっているかご確認ください）`
      };
    }

    const data = await response.json();
    if (data && data.success) {
      return {
        success: true,
        message: data.message || '接続に成功しました！',
        count: data.vendorCount
      };
    } else {
      return {
        success: false,
        message: data.error || data.message || 'スプレッドシートAPIからエラーが返されました。'
      };
    }
  } catch (err: any) {
    console.error('GAS connection test error:', err);
    return {
      success: false,
      message: `接続テスト失敗: ${err.message || 'ネットワークエラーが発生しました。デプロイ時のアクセス権限を「全員(Anyone)」に設定しているかご確認ください。'}`
    };
  }
}

/**
 * Googleスプレッドシートから出店者一覧を取得
 */
export async function fetchVendorsFromGoogleSheets(apiUrl?: string): Promise<{ success: boolean; vendors?: Vendor[]; message?: string }> {
  const targetUrl = (apiUrl || getGasConfig().url).trim();
  if (!targetUrl) {
    return { success: false, message: 'WebアプリURLが設定されていません。' };
  }

  try {
    const separator = targetUrl.includes('?') ? '&' : '?';
    const fetchUrl = `${targetUrl}${separator}action=getVendors&_t=${Date.now()}`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      return { success: false, message: `データ取得エラー: HTTP ${response.status}` };
    }

    const resData = await response.json();
    if (!resData.success) {
      return { success: false, message: resData.error || resData.message || '出店者データの取得に失敗しました。' };
    }

    const vendors: Vendor[] = (resData.vendors || []).map((row: any) => normalizeRowToVendor(row));
    recordLastSyncTime();
    return { success: true, vendors };
  } catch (err: any) {
    console.error('GAS fetch error:', err);
    return { success: false, message: `通信エラー: ${err.message || 'Googleスプレッドシートからの取得に失敗しました。'}` };
  }
}

/**
 * アプリ側の出店者リストをGoogleスプレッドシートに一括保存（上書き・完全同期）
 */
export async function pushVendorsToGoogleSheets(vendors: Vendor[], apiUrl?: string): Promise<GasSyncResult> {
  const targetUrl = (apiUrl || getGasConfig().url).trim();
  if (!targetUrl) {
    return { success: false, message: 'WebアプリURLが設定されていません。' };
  }

  try {
    const payload = {
      action: 'syncVendors',
      vendors: vendors.map(vendorToRowObject)
    };

    // CORS preflight回避のため text/plain でJSON文字列を送信
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return { success: false, message: `送信エラー: HTTP ${response.status}` };
    }

    const resData = await response.json();
    if (resData.success) {
      recordLastSyncTime();
      return {
        success: true,
        message: `スプレッドシートに ${resData.count ?? vendors.length}件の出店者データを保存しました！`,
        count: resData.count
      };
    } else {
      return { success: false, message: resData.error || resData.message || 'スプレッドシートの更新に失敗しました。' };
    }
  } catch (err: any) {
    console.error('GAS push error:', err);
    return { success: false, message: `保存エラー: ${err.message || 'スプレッドシートへの保存に失敗しました。'}` };
  }
}

/**
 * 単一出店者の追加・更新（バックグラウンド自動同期用）
 */
export async function upsertSingleVendorToGoogleSheets(vendor: Vendor): Promise<boolean> {
  const { url, autoSync } = getGasConfig();
  if (!url || !autoSync) return false;

  try {
    const payload = {
      action: 'upsertVendor',
      vendor: vendorToRowObject(vendor)
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) return false;
    const data = await res.json();
    if (data.success) {
      recordLastSyncTime();
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Background vendor upsert to Google Sheets failed:', e);
    return false;
  }
}

/**
 * 単一出店者の削除（バックグラウンド自動同期用）
 */
export async function deleteSingleVendorFromGoogleSheets(vendorId: string): Promise<boolean> {
  const { url, autoSync } = getGasConfig();
  if (!url || !autoSync) return false;

  try {
    const payload = {
      action: 'deleteVendor',
      vendorId
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) return false;
    const data = await res.json();
    if (data.success) {
      recordLastSyncTime();
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Background vendor delete from Google Sheets failed:', e);
    return false;
  }
}

/**
 * Vendorオブジェクトをスプレッドシート行用のオブジェクトに変換
 */
function vendorToRowObject(v: Vendor) {
  return {
    id: v.id,
    name: v.name || '',
    readingFurigana: v.readingFurigana || '',
    ownerName: v.ownerName || '',
    furigana: v.furigana || '',
    phone: v.phone || '',
    email: v.email || '',
    lineId: v.lineId || '',
    instagram: v.instagram || '',
    address: v.address || '',
    organizationType: v.organizationType || 'store',
    organizationName: v.organizationName || '',
    category: v.category || 'outdoor',
    menuItems: v.menuItems || '',
    hasFoodLicense: v.hasFoodLicense ? 'あり' : 'なし',
    foodLicenseNumber: v.foodLicenseNumber || '',
    licenseExpiryDate: v.licenseExpiryDate || '',
    status: v.status || 'active',
    statusReason: v.statusReason || '',
    tags: Array.isArray(v.tags) ? v.tags.join(', ') : '',
    defaultPowerOption: v.defaultPowerOption ? '希望する' : '希望なし',
    defaultTentOption: v.defaultTentOption ? '希望する' : '希望なし',
    defaultTentCount: v.defaultTentCount || 0,
    internalNotes: v.internalNotes || '',

    submittedLicensesJson: v.submittedLicenses ? JSON.stringify(v.submittedLicenses) : '',
    createdAt: v.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * スプレッドシートから取得した行オブジェクトをVendorオブジェクトに変換
 */
function normalizeRowToVendor(row: any): Vendor {
  // tagsのパース
  let tags: string[] = [];
  if (Array.isArray(row.tags)) {
    tags = row.tags;
  } else if (typeof row.tags === 'string' && row.tags.trim()) {
    tags = row.tags.split(/[,、\s]+/).filter(Boolean);
  }

  // submittedLicensesのパース
  let submittedLicenses: any[] = [];
  if (row.submittedLicensesJson) {
    try {
      submittedLicenses = JSON.parse(row.submittedLicensesJson);
    } catch {
      submittedLicenses = [];
    }
  }

  const hasFoodLicense = 
    row.hasFoodLicense === true || 
    row.hasFoodLicense === 'あり' || 
    row.hasFoodLicense === 'TRUE' || 
    row.hasFoodLicense === 'true' || 
    row.hasFoodLicense === '有';

  const defaultPowerOption = 
    row.defaultPowerOption === true || 
    row.defaultPowerOption === '希望する' || 
    row.defaultPowerOption === 'TRUE' || 
    row.defaultPowerOption === 'true';

  const defaultTentOption = 
    row.defaultTentOption === true || 
    row.defaultTentOption === '希望する' || 
    row.defaultTentOption === 'TRUE' || 
    row.defaultTentOption === 'true';

  const status = (['active', 'warning', 'banned'].includes(row.status))
    ? row.status
    : (row.status === '要注意' ? 'warning' : (row.status === '出禁' ? 'banned' : 'active'));

  return {
    id: String(row.id || `vendor-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
    name: String(row.name || ''),
    readingFurigana: row.readingFurigana ? String(row.readingFurigana) : undefined,
    ownerName: String(row.ownerName || ''),
    furigana: row.furigana ? String(row.furigana) : undefined,
    phone: String(row.phone || ''),
    email: String(row.email || ''),
    lineId: row.lineId ? String(row.lineId) : undefined,
    instagram: row.instagram ? String(row.instagram) : undefined,
    address: row.address ? String(row.address) : undefined,
    category: row.category || 'outdoor',
    organizationType: row.organizationType === 'organization' ? 'organization' : 'store',
    organizationName: row.organizationName ? String(row.organizationName) : undefined,
    menuItems: String(row.menuItems || ''),
    hasFoodLicense,
    foodLicenseNumber: row.foodLicenseNumber ? String(row.foodLicenseNumber) : undefined,
    licenseExpiryDate: row.licenseExpiryDate ? String(row.licenseExpiryDate) : undefined,
    submittedLicenses,
    status,
    statusReason: row.statusReason ? String(row.statusReason) : undefined,
    tags,
    defaultPowerOption,
    defaultTentOption,
    defaultTentCount: Number(row.defaultTentCount) || 0,
    internalNotes: row.internalNotes ? String(row.internalNotes) : undefined,

    pastEvents: Array.isArray(row.pastEvents) ? row.pastEvents : [],
    createdAt: row.createdAt ? String(row.createdAt) : new Date().toISOString()
  };
}

/**
 * Google Apps Script (GAS) に貼り付けるスクリプトコード
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * 🏮 夜市出店者管理システム - Googleスプレッドシート データベースAPI
 * 
 * 【設定手順】
 * 1. このスクリプト全体をコピーします。
 * 2. スプレッドシートのメニュー「拡張機能」>「Apps Script」を開きます。
 * 3. 既存のコードを全て消してこのコードを貼り付け、「保存(💾)」します。
 * 4. 画面右上の「デプロイ」>「新しいデプロイ」をクリックします。
 * 5. 種類の選択（歯車アイコン）で「ウェブアプリ」を選択します。
 * 6. 次の通り設定します:
 *    - 次のユーザーとして実行: 自分 (Me)
 *    - アクセスできるユーザー: 全員 (Anyone) ★重要★
 * 7. 「デプロイ」を押し、表示された「ウェブアプリURL」をコピーして夜市管理システムに入力します。
 */

const SHEET_NAME = '出店者マスター';
const ENTRIES_SHEET_NAME = '出店記録';
const EVENTS_SHEET_NAME = 'イベント管理';

const HEADERS = [
  { key: 'id', title: '出店者ID' },
  { key: 'name', title: '屋号・店名' },
  { key: 'readingFurigana', title: '屋号よみがな' },
  { key: 'ownerName', title: '代表者氏名' },
  { key: 'furigana', title: '代表者フリガナ' },
  { key: 'phone', title: '電話番号' },
  { key: 'email', title: 'メールアドレス' },
  { key: 'lineId', title: 'LINE ID' },
  { key: 'instagram', title: 'Instagram' },
  { key: 'address', title: '住所' },
  { key: 'organizationType', title: '出店区分(店舗/団体)' },
  { key: 'organizationName', title: '所属団体名' },
  { key: 'category', title: '出店ジャンル' },
  { key: 'menuItems', title: '主な取扱品目・メニュー' },
  { key: 'hasFoodLicense', title: '営業許可証(あり/なし)' },
  { key: 'foodLicenseNumber', title: '許可番号' },
  { key: 'licenseExpiryDate', title: '許可有効期限' },
  { key: 'status', title: '状態(active/warning/banned)' },
  { key: 'statusReason', title: '出禁・要注意理由' },
  { key: 'tags', title: 'タグ' },
  { key: 'defaultPowerOption', title: '電源希望' },
  { key: 'defaultTentOption', title: 'テント希望' },
  { key: 'defaultTentCount', title: 'テント張数' },
  { key: 'internalNotes', title: '運営用メモ' },

  { key: 'submittedLicensesJson', title: '許可証データ(JSON)' },
  { key: 'createdAt', title: '登録日時' },
  { key: 'updatedAt', title: '最終更新日時' }
];

const ENTRY_HEADERS = [
  { key: 'id', title: 'エントリーID' },
  { key: 'eventId', title: 'イベントID' },
  { key: 'vendorId', title: '出店者ID' },
  { key: 'vendorName', title: '屋号(スナップショット)' },
  { key: 'boothArea', title: 'ブースエリア' },
  { key: 'boothNumber', title: 'ブース番号' },
  { key: 'feeAmount', title: '出店料' },
  { key: 'feePaid', title: '支払い完了(true/false)' },
  { key: 'feeMethod', title: '支払い方法' },
  { key: 'entryStatus', title: 'ステータス' },
  { key: 'permitIssued', title: '許可証確認済(true/false)' },
  { key: 'fireSafetyJson', title: '消防情報(JSON)' },
  { key: 'notes', title: '備考・メモ' },
  { key: 'fullJson', title: '全データ(JSON)' }
];

const EVENT_HEADERS = [
  { key: 'id', title: 'イベントID' },
  { key: 'name', title: 'イベント名' },
  { key: 'date', title: '開催日' },
  { key: 'time', title: '開催時間' },
  { key: 'venue', title: '開催場所' },
  { key: 'organizer', title: '主催者名' },
  { key: 'contactPhone', title: '緊急連絡先' },
  { key: 'fireDepartmentName', title: '所轄消防署' },
  { key: 'fullJson', title: '全データ(JSON)' }
];

function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  if (sheet.getLastRow() === 0) {
    const headerRow = headers.map(function(h) { return h.title; });
    sheet.appendRow(headerRow);
    const range = sheet.getRange(1, 1, 1, headerRow.length);
    range.setBackground('#1e293b');
    range.setFontColor('#ffffff');
    range.setFontWeight('bold');
    range.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  const params = e ? e.parameter : {};
  const action = params.action || 'ping';

  try {
    const vendorSheet = getOrCreateSheet(SHEET_NAME, HEADERS);
    const entrySheet = getOrCreateSheet(ENTRIES_SHEET_NAME, ENTRY_HEADERS);
    const eventSheet = getOrCreateSheet(EVENTS_SHEET_NAME, EVENT_HEADERS);

    if (action === 'ping') {
      const vendorCount = Math.max(0, vendorSheet.getLastRow() - 1);
      return createJsonResponse({
        success: true,
        message: 'Googleスプレッドシート データベースに正常に接続されました。',
        sheetName: vendorSheet.getName(),
        vendorCount: vendorCount
      });
    }

    if (action === 'getVendors') {
      const lastRow = vendorSheet.getLastRow();
      if (lastRow <= 1) return createJsonResponse({ success: true, vendors: [] });
      const values = vendorSheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      const vendors = values.map(function(row) {
        const item = {};
        HEADERS.forEach(function(h, index) { item[h.key] = row[index]; });
        return item;
      });
      return createJsonResponse({ success: true, vendors: vendors, count: vendors.length });
    }
    
    if (action === 'getEntries') {
      const lastRow = entrySheet.getLastRow();
      if (lastRow <= 1) return createJsonResponse({ success: true, entries: [] });
      const values = entrySheet.getRange(2, 1, lastRow - 1, ENTRY_HEADERS.length).getValues();
      const entries = values.map(function(row) {
        const item = {};
        ENTRY_HEADERS.forEach(function(h, index) { item[h.key] = row[index]; });
        return item;
      });
      return createJsonResponse({ success: true, entries: entries, count: entries.length });
    }

    if (action === 'getEvents') {
      const lastRow = eventSheet.getLastRow();
      if (lastRow <= 1) return createJsonResponse({ success: true, events: [] });
      const values = eventSheet.getRange(2, 1, lastRow - 1, EVENT_HEADERS.length).getValues();
      const events = values.map(function(row) {
        const item = {};
        EVENT_HEADERS.forEach(function(h, index) { item[h.key] = row[index]; });
        return item;
      });
      return createJsonResponse({ success: true, events: events, count: events.length });
    }

    return createJsonResponse({ success: false, error: '不明なアクション: ' + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    const vendorSheet = getOrCreateSheet(SHEET_NAME, HEADERS);
    const entrySheet = getOrCreateSheet(ENTRIES_SHEET_NAME, ENTRY_HEADERS);
    const eventSheet = getOrCreateSheet(EVENTS_SHEET_NAME, EVENT_HEADERS);
    const content = e && e.postData ? e.postData.contents : '{}';
    const body = JSON.parse(content);
    const action = body.action;

    // --- 出店者マスター用 ---
    if (action === 'syncVendors') {
      const vendors = body.vendors || [];
      if (vendorSheet.getLastRow() > 1) vendorSheet.deleteRows(2, vendorSheet.getLastRow() - 1);
      if (vendors.length > 0) {
        const rows = vendors.map(function(v) {
          return HEADERS.map(function(h) { return v[h.key] !== undefined && v[h.key] !== null ? v[h.key] : ''; });
        });
        vendorSheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
      }
      return createJsonResponse({ success: true, message: vendors.length + '件の出店者を保存しました。', count: vendors.length });
    }

    if (action === 'upsertVendor') {
      const v = body.vendor;
      if (!v || !v.id) return createJsonResponse({ success: false, error: '出店者IDが指定されていません。' });
      const lastRow = vendorSheet.getLastRow();
      let targetRowIndex = -1;
      if (lastRow > 1) {
        const ids = vendorSheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function(r) { return String(r[0]); });
        const found = ids.indexOf(String(v.id));
        if (found !== -1) targetRowIndex = found + 2;
      }
      const rowData = HEADERS.map(function(h) { return v[h.key] !== undefined && v[h.key] !== null ? v[h.key] : ''; });
      if (targetRowIndex !== -1) vendorSheet.getRange(targetRowIndex, 1, 1, HEADERS.length).setValues([rowData]);
      else vendorSheet.appendRow(rowData);
      return createJsonResponse({ success: true, message: '出店者を保存しました。', vendorId: v.id });
    }

    if (action === 'deleteVendor') {
      const vendorId = String(body.vendorId || '');
      const lastRow = vendorSheet.getLastRow();
      if (lastRow > 1 && vendorId) {
        const ids = vendorSheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function(r) { return String(r[0]); });
        const found = ids.indexOf(vendorId);
        if (found !== -1) {
          vendorSheet.deleteRow(found + 2);
          return createJsonResponse({ success: true, message: '出店者を削除しました。' });
        }
      }
      return createJsonResponse({ success: true, message: '対象の出店者が見つかりませんでした。' });
    }
    
    // --- 出店記録（エントリー）用 ---
    if (action === 'syncEntries') {
      const entries = body.entries || [];
      if (entrySheet.getLastRow() > 1) entrySheet.deleteRows(2, entrySheet.getLastRow() - 1);
      if (entries.length > 0) {
        const rows = entries.map(function(v) {
          return ENTRY_HEADERS.map(function(h) { return v[h.key] !== undefined && v[h.key] !== null ? v[h.key] : ''; });
        });
        entrySheet.getRange(2, 1, rows.length, ENTRY_HEADERS.length).setValues(rows);
      }
      return createJsonResponse({ success: true, message: entries.length + '件の出店記録を保存しました。', count: entries.length });
    }

    if (action === 'upsertEntry') {
      const v = body.entry;
      if (!v || !v.id) return createJsonResponse({ success: false, error: 'エントリーIDが指定されていません。' });
      const lastRow = entrySheet.getLastRow();
      let targetRowIndex = -1;
      if (lastRow > 1) {
        const ids = entrySheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function(r) { return String(r[0]); });
        const found = ids.indexOf(String(v.id));
        if (found !== -1) targetRowIndex = found + 2;
      }
      const rowData = ENTRY_HEADERS.map(function(h) { return v[h.key] !== undefined && v[h.key] !== null ? v[h.key] : ''; });
      if (targetRowIndex !== -1) entrySheet.getRange(targetRowIndex, 1, 1, ENTRY_HEADERS.length).setValues([rowData]);
      else entrySheet.appendRow(rowData);
      return createJsonResponse({ success: true, message: '出店記録を保存しました。', entryId: v.id });
    }

    if (action === 'deleteEntry') {
      const entryId = String(body.entryId || '');
      const lastRow = entrySheet.getLastRow();
      if (lastRow > 1 && entryId) {
        const ids = entrySheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function(r) { return String(r[0]); });
        const found = ids.indexOf(entryId);
        if (found !== -1) {
          entrySheet.deleteRow(found + 2);
          return createJsonResponse({ success: true, message: '出店記録を削除しました。' });
        }
      }
      return createJsonResponse({ success: true, message: '対象の出店記録が見つかりませんでした。' });
    }

    // --- イベント管理用 ---
    if (action === 'syncEvents') {
      const events = body.events || [];
      if (eventSheet.getLastRow() > 1) eventSheet.deleteRows(2, eventSheet.getLastRow() - 1);
      if (events.length > 0) {
        const rows = events.map(function(v) {
          return EVENT_HEADERS.map(function(h) { return v[h.key] !== undefined && v[h.key] !== null ? v[h.key] : ''; });
        });
        eventSheet.getRange(2, 1, rows.length, EVENT_HEADERS.length).setValues(rows);
      }
      return createJsonResponse({ success: true, message: events.length + '件のイベントを保存しました。', count: events.length });
    }

    if (action === 'upsertEvent') {
      const v = body.event;
      if (!v || !v.id) return createJsonResponse({ success: false, error: 'イベントIDが指定されていません。' });
      const lastRow = eventSheet.getLastRow();
      let targetRowIndex = -1;
      if (lastRow > 1) {
        const ids = eventSheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function(r) { return String(r[0]); });
        const found = ids.indexOf(String(v.id));
        if (found !== -1) targetRowIndex = found + 2;
      }
      const rowData = EVENT_HEADERS.map(function(h) { return v[h.key] !== undefined && v[h.key] !== null ? v[h.key] : ''; });
      if (targetRowIndex !== -1) eventSheet.getRange(targetRowIndex, 1, 1, EVENT_HEADERS.length).setValues([rowData]);
      else eventSheet.appendRow(rowData);
      return createJsonResponse({ success: true, message: 'イベントを保存しました。', eventId: v.id });
    }

    if (action === 'deleteEvent') {
      const eventId = String(body.eventId || '');
      const lastRow = eventSheet.getLastRow();
      if (lastRow > 1 && eventId) {
        const ids = eventSheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function(r) { return String(r[0]); });
        const found = ids.indexOf(eventId);
        if (found !== -1) {
          eventSheet.deleteRow(found + 2);
          return createJsonResponse({ success: true, message: 'イベントを削除しました。' });
        }
      }
      return createJsonResponse({ success: true, message: '対象のイベントが見つかりませんでした。' });
    }

    return createJsonResponse({ success: false, error: '不明なアクション: ' + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
`;
/**
 * EventEntryオブジェクトをスプレッドシート行用のオブジェクトに変換
 */
export function entryToRowObject(e: import('../types').EventEntry) {
  return {
    id: e.id,
    eventId: e.eventId,
    vendorId: e.vendorId,
    vendorName: e.vendorSnapshot?.name || '',
    boothArea: e.boothArea || 'outdoor',
    boothNumber: e.boothNumber || '',
    feeAmount: e.fee?.totalAmount ?? e.fee?.baseFee ?? 0,
    feePaid: e.fee?.paymentStatus === 'paid' ? 'TRUE' : 'FALSE',
    feeMethod: (e.fee as any)?.paymentMethod || 'cash',
    entryStatus: e.entryStatus || 'pending',
    permitIssued: e.permitIssued ? 'TRUE' : 'FALSE',
    fireSafetyJson: e.fireSafety ? JSON.stringify(e.fireSafety) : '{}',
    notes: e.notes || '',
    fullJson: JSON.stringify(e) // 復元用としてフルデータをJSONで保存
  };
}

/**
 * スプレッドシートの行からEventEntryオブジェクトに変換
 */
export function normalizeRowToEntry(row: any): import('../types').EventEntry {
  let fullObj: any = {};
  try {
    if (row.fullJson) {
      fullObj = JSON.parse(row.fullJson);
    }
  } catch (err) {
    console.error('Failed to parse fullJson:', err);
  }
  
  const isPaid = row.feePaid === 'TRUE' || row.feePaid === true || row.feePaid === 'true';
  const defaultFee: import('../types').VendorFee = {
    baseFee: Number(row.feeAmount) || 0,
    powerOption: false,
    powerFee: 0,
    garbageOption: false,
    garbageFee: 0,
    equipmentRentalFee: 0,
    discount: 0,
    totalAmount: Number(row.feeAmount) || 0,
    paymentStatus: isPaid ? 'paid' : 'unbilled',
    receiptIssued: false
  };

  return {
    id: String(row.id),
    eventId: String(row.eventId),
    vendorId: String(row.vendorId),
    vendorSnapshot: fullObj.vendorSnapshot || { id: String(row.vendorId), name: String(row.vendorName || '') },
    boothArea: row.boothArea || 'outdoor',
    boothNumber: String(row.boothNumber || ''),
    fee: fullObj.fee || defaultFee,
    fireSafety: row.fireSafetyJson ? JSON.parse(row.fireSafetyJson) : (fullObj.fireSafety || { usesFire: false, fireTypes: [], equipment: [], notes: '', hasExtinguisher: false, verified: false }),
    permitIssued: row.permitIssued === 'TRUE' || row.permitIssued === true || row.permitIssued === 'true',
    entryStatus: row.entryStatus || 'pending',
    notes: String(row.notes || ''),
    ...fullObj // Merge any missing nested properties
  };
}

/**
 * Googleスプレッドシートから出店記録一覧を取得
 */
export async function fetchEntriesFromGoogleSheets(apiUrl?: string): Promise<{ success: boolean; entries?: import('../types').EventEntry[]; message?: string }> {
  const targetUrl = (apiUrl || getGasConfig().url).trim();
  if (!targetUrl) return { success: false, message: 'WebアプリURLが設定されていません。' };

  try {
    const separator = targetUrl.includes('?') ? '&' : '?';
    const fetchUrl = `${targetUrl}${separator}action=getEntries&_t=${Date.now()}`;
    const response = await fetch(fetchUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });

    if (!response.ok) return { success: false, message: `データ取得エラー: HTTP ${response.status}` };

    const resData = await response.json();
    if (!resData.success) return { success: false, message: resData.error || resData.message || '出店記録の取得に失敗しました。' };

    const entries = (resData.entries || []).map((row: any) => normalizeRowToEntry(row));
    return { success: true, entries };
  } catch (err: any) {
    console.error('GAS entry fetch error:', err);
    return { success: false, message: `通信エラー: ${err.message || '取得に失敗しました。'}` };
  }
}

/**
 * アプリ側の出店記録をGoogleスプレッドシートに一括保存（上書き）
 */
export async function pushEntriesToGoogleSheets(entries: import('../types').EventEntry[], apiUrl?: string): Promise<GasSyncResult> {
  const targetUrl = (apiUrl || getGasConfig().url).trim();
  if (!targetUrl) return { success: false, message: 'WebアプリURLが設定されていません。' };

  try {
    const payload = { action: 'syncEntries', entries: entries.map(entryToRowObject) };
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return { success: false, message: `送信エラー: HTTP ${response.status}` };
    const resData = await response.json();
    if (resData.success) {
      recordLastSyncTime();
      return { success: true, message: `スプレッドシートに ${resData.count ?? entries.length}件の出店記録を保存しました！`, count: resData.count };
    } else {
      return { success: false, message: resData.error || resData.message || 'スプレッドシートの更新に失敗しました。' };
    }
  } catch (err: any) {
    return { success: false, message: `保存エラー: ${err.message || 'スプレッドシートへの保存に失敗しました。'}` };
  }
}

/**
 * 単一出店記録の追加・更新（自動同期用）
 */
export async function upsertSingleEntryToGoogleSheets(entry: import('../types').EventEntry): Promise<boolean> {
  const { url, autoSync } = getGasConfig();
  if (!url || !autoSync) return false;

  try {
    const payload = { action: 'upsertEntry', entry: entryToRowObject(entry) };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success) {
      recordLastSyncTime();
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Background entry upsert to Google Sheets failed:', e);
    return false;
  }
}

/**
 * 単一出店記録の削除（自動同期用）
 */
export async function deleteSingleEntryFromGoogleSheets(entryId: string): Promise<boolean> {
  const { url, autoSync } = getGasConfig();
  if (!url || !autoSync) return false;

  try {
    const payload = { action: 'deleteEntry', entryId };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success) {
      recordLastSyncTime();
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Background entry delete from Google Sheets failed:', e);
    return false;
  }
};

/**
 * NightMarketEventオブジェクトをスプレッドシート行用のオブジェクトに変換
 */
export function eventToRowObject(e: import('../types').NightMarketEvent) {
  return {
    id: e.id,
    name: e.name || '',
    date: e.date || '',
    time: e.time || '',
    venue: e.venue || '',
    organizer: e.organizer || '',
    contactPhone: e.contactPhone || '',
    fireDepartmentName: e.fireDepartmentName || '',
    fullJson: JSON.stringify(e)
  };
}

/**
 * スプレッドシートの行からNightMarketEventオブジェクトに変換
 */
export function normalizeRowToEvent(row: any): import('../types').NightMarketEvent {
  let fullObj: any = {};
  try {
    if (row.fullJson) {
      fullObj = JSON.parse(row.fullJson);
    }
  } catch (err) {
    console.error('Failed to parse fullJson for event:', err);
  }

  return {
    id: String(row.id),
    name: String(row.name || fullObj.name || ''),
    date: String(row.date || fullObj.date || ''),
    time: String(row.time || fullObj.time || ''),
    venue: String(row.venue || fullObj.venue || ''),
    organizer: String(row.organizer || fullObj.organizer || ''),
    contactPhone: String(row.contactPhone || fullObj.contactPhone || ''),
    fireDepartmentName: String(row.fireDepartmentName || fullObj.fireDepartmentName || ''),
    guidelinesNotes: fullObj.guidelinesNotes || [],
    areas: fullObj.areas || [],
    ...fullObj
  };
}

/**
 * Googleスプレッドシートからイベント一覧を取得
 */
export async function fetchEventsFromGoogleSheets(apiUrl?: string): Promise<{ success: boolean; events?: import('../types').NightMarketEvent[]; message?: string }> {
  const targetUrl = (apiUrl || getGasConfig().url).trim();
  if (!targetUrl) return { success: false, message: 'WebアプリURLが設定されていません。' };

  try {
    const separator = targetUrl.includes('?') ? '&' : '?';
    const fetchUrl = `${targetUrl}${separator}action=getEvents&_t=${Date.now()}`;
    const response = await fetch(fetchUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });

    if (!response.ok) return { success: false, message: `データ取得エラー: HTTP ${response.status}` };

    const resData = await response.json();
    if (!resData.success) return { success: false, message: resData.error || resData.message || 'イベントの取得に失敗しました。' };

    const events = (resData.events || []).map((row: any) => normalizeRowToEvent(row));
    return { success: true, events };
  } catch (err: any) {
    console.error('GAS event fetch error:', err);
    return { success: false, message: `通信エラー: ${err.message || '取得に失敗しました。'}` };
  }
}

/**
 * アプリ側のイベント一覧をGoogleスプレッドシートに一括保存（上書き）
 */
export async function pushEventsToGoogleSheets(events: import('../types').NightMarketEvent[], apiUrl?: string): Promise<GasSyncResult> {
  const targetUrl = (apiUrl || getGasConfig().url).trim();
  if (!targetUrl) return { success: false, message: 'WebアプリURLが設定されていません。' };

  try {
    const payload = { action: 'syncEvents', events: events.map(eventToRowObject) };
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return { success: false, message: `送信エラー: HTTP ${response.status}` };
    const resData = await response.json();
    if (resData.success) {
      recordLastSyncTime();
      return { success: true, message: `スプレッドシートに ${resData.count ?? events.length}件のイベントを保存しました！`, count: resData.count };
    } else {
      return { success: false, message: resData.error || resData.message || 'スプレッドシートの更新に失敗しました。' };
    }
  } catch (err: any) {
    return { success: false, message: `保存エラー: ${err.message || 'スプレッドシートへの保存に失敗しました。'}` };
  }
}

/**
 * 単一イベントの追加・更新（自動同期用）
 */
export async function upsertSingleEventToGoogleSheets(
  event: import('../types').NightMarketEvent
): Promise<{ success: boolean; message: string; notConfigured?: boolean }> {
  const { url, autoSync } = getGasConfig();
  if (!url) {
    return { success: false, message: 'GoogleスプレッドシートのWebアプリURLが設定されていません。', notConfigured: true };
  }
  if (!autoSync) {
    return { success: false, message: 'Googleスプレッドシートへの自動同期がオフになっています。' };
  }

  try {
    const payload = { action: 'upsertEvent', event: eventToRowObject(event) };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      return { success: false, message: `通信エラー: HTTP ${res.status}` };
    }
    const data = await res.json();
    if (data.success) {
      recordLastSyncTime();
      return { success: true, message: `スプレッドシートの「イベント管理」シートに保存しました（${event.name}）` };
    }
    return { success: false, message: data.error || data.message || 'スプレッドシートへの保存に失敗しました。' };
  } catch (e: any) {
    console.warn('Background event upsert to Google Sheets failed:', e);
    return { success: false, message: `保存エラー: ${e.message || '通信に失敗しました。'}` };
  }
}

/**
 * 単一イベントの削除（自動同期用）
 */
export async function deleteSingleEventFromGoogleSheets(
  eventId: string
): Promise<{ success: boolean; message: string; notConfigured?: boolean }> {
  const { url, autoSync } = getGasConfig();
  if (!url) {
    return { success: false, message: 'GoogleスプレッドシートのWebアプリURLが設定されていません。', notConfigured: true };
  }
  if (!autoSync) {
    return { success: false, message: 'Googleスプレッドシートへの自動同期がオフになっています。' };
  }

  try {
    const payload = { action: 'deleteEvent', eventId };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      return { success: false, message: `通信エラー: HTTP ${res.status}` };
    }
    const data = await res.json();
    if (data.success) {
      recordLastSyncTime();
      return { success: true, message: 'スプレッドシートのイベント管理から削除しました。' };
    }
    return { success: false, message: data.error || data.message || 'スプレッドシートからの削除に失敗しました。' };
  } catch (e: any) {
    console.warn('Background event delete from Google Sheets failed:', e);
    return { success: false, message: `削除エラー: ${e.message || '通信に失敗しました。'}` };
  }
}

