/**
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

/**
 * ★手動セットアップ用関数★
 * スプレッドシートのスクリプトエディタ上でこの関数を選択し、「実行」を押すと、
 * 必要なテーブル（シート）とそのヘッダー行が自動的にすべて作成・初期化されます。
 */
function setupDatabase() {
  getOrCreateSheet(SHEET_NAME, HEADERS);
  getOrCreateSheet(ENTRIES_SHEET_NAME, ENTRY_HEADERS);
  getOrCreateSheet(EVENTS_SHEET_NAME, EVENT_HEADERS);
  
  // もしデフォルトの「シート1」などが残っていれば削除（エラー回避のためtry-catch）
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet1 = ss.getSheetByName('シート1');
    if (sheet1) ss.deleteSheet(sheet1);
  } catch(e) {}
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

