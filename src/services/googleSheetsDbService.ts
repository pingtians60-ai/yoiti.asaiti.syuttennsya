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

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyV94UanQzPnaBKJ9QfruibP23SBf-cWJovZi7zuctqQFHZlTm_qNow9E5APwHmXpkrcQ/exec';

/**
 * 保存された設定を取得
 */
export function getGasConfig(): GasConfig {
  const url = localStorage.getItem(STORAGE_KEYS.GAS_API_URL) || DEFAULT_GAS_URL;
  const autoSync = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC) === 'true';
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
    pastParticipationCount: v.pastParticipationCount || 0,
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
    pastParticipationCount: Number(row.pastParticipationCount) || 0,
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
  { key: 'pastParticipationCount', title: '過去出店回数' },
  { key: 'submittedLicensesJson', title: '許可証データ(JSON)' },
  { key: 'createdAt', title: '登録日時' },
  { key: 'updatedAt', title: '最終更新日時' }
];

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // ヘッダーが未設定の場合は初期化
  if (sheet.getLastRow() === 0) {
    const headerRow = HEADERS.map(h => h.title);
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
    const sheet = getOrCreateSheet();

    if (action === 'ping') {
      const vendorCount = Math.max(0, sheet.getLastRow() - 1);
      return createJsonResponse({
        success: true,
        message: 'Googleスプレッドシート データベースに正常に接続されました。',
        sheetName: sheet.getName(),
        vendorCount: vendorCount
      });
    }

    if (action === 'getVendors') {
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({ success: true, vendors: [] });
      }

      const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      const vendors = values.map(row => {
        const item = {};
        HEADERS.forEach((h, index) => {
          item[h.key] = row[index];
        });
        return item;
      });

      return createJsonResponse({ success: true, vendors: vendors, count: vendors.length });
    }

    return createJsonResponse({ success: false, error: '不明なアクション: ' + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    const content = e && e.postData ? e.postData.contents : '{}';
    const body = JSON.parse(content);
    const action = body.action;

    // 1. 全出店者一括同期（上書き）
    if (action === 'syncVendors') {
      const vendors = body.vendors || [];
      
      // 既存のデータ行をクリア（ヘッダー行は残す）
      if (sheet.getLastRow() > 1) {
        sheet.deleteRows(2, sheet.getLastRow() - 1);
      }

      if (vendors.length > 0) {
        const rows = vendors.map(v => {
          return HEADERS.map(h => {
            const val = v[h.key];
            return val !== undefined && val !== null ? val : '';
          });
        });
        sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
      }

      return createJsonResponse({
        success: true,
        message: vendors.length + '件の出店者を保存しました。',
        count: vendors.length
      });
    }

    // 2. 単一出店者の追加または更新 (upsert)
    if (action === 'upsertVendor') {
      const v = body.vendor;
      if (!v || !v.id) {
        return createJsonResponse({ success: false, error: '出店者IDが指定されていません。' });
      }

      const lastRow = sheet.getLastRow();
      let targetRowIndex = -1;

      if (lastRow > 1) {
        const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
        const found = ids.indexOf(String(v.id));
        if (found !== -1) {
          targetRowIndex = found + 2; // 2行目起点
        }
      }

      const rowData = HEADERS.map(h => {
        const val = v[h.key];
        return val !== undefined && val !== null ? val : '';
      });

      if (targetRowIndex !== -1) {
        // 更新
        sheet.getRange(targetRowIndex, 1, 1, HEADERS.length).setValues([rowData]);
      } else {
        // 新規追加
        sheet.appendRow(rowData);
      }

      return createJsonResponse({ success: true, message: '出店者を保存しました。', vendorId: v.id });
    }

    // 3. 単一出店者の削除
    if (action === 'deleteVendor') {
      const vendorId = String(body.vendorId || '');
      const lastRow = sheet.getLastRow();
      if (lastRow > 1 && vendorId) {
        const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
        const found = ids.indexOf(vendorId);
        if (found !== -1) {
          sheet.deleteRow(found + 2);
          return createJsonResponse({ success: true, message: '出店者を削除しました。' });
        }
      }
      return createJsonResponse({ success: true, message: '対象の出店者が見つかりませんでした。' });
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
