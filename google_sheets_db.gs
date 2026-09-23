/**
 * 🏮 夜市出店者管理システム - Googleスプレッドシート データベースAPI
 * 
 * ==============================================================================
 * 【設定手順（3分で完了します）】
 * ==============================================================================
 * 1. Googleドライブで「新しいGoogleスプレッドシート」を作成します。
 *    （ファイル名は何でも構いません。例：「夜市出店者マスター」）
 * 
 * 2. スプレッドシート上部メニューの「拡張機能」>「Apps Script」をクリックします。
 * 
 * 3. 画面のエディタ（コード.gs）にある内容をすべて削除し、このファイルの内容を
 *    そのまま貼り付けて、フロッピーアイコン「保存(💾)」を押します。
 * 
 * 4. 画面右上の青い「デプロイ」ボタン >「新しいデプロイ」をクリックします。
 * 
 * 5. 左上の歯車アイコン（種類の選択）をクリックし、「ウェブアプリ」を選択します。
 * 
 * 6. 次の項目を設定します：
 *    - 説明: 「夜市出店者DB」など（任意）
 *    - 次のユーザーとして実行: 「自分（Me）」
 *    - アクセスできるユーザー: ★重要★「全員（Anyone）」
 *      ※「全員」に設定しないと、アプリからアクセス・保存ができません。
 * 
 * 7. 「デプロイ」ボタンをクリックし、Googleアカウントの承認画面が出たら許可します。
 * 
 * 8. 発行された「ウェブアプリURL」（https://script.google.com/macros/s/.../exec）を
 *    コピーして、夜市管理システムの「スプレッドシートDB」画面に貼り付けます。
 * ==============================================================================
 */

// 出店者を保存するシート名
const SHEET_NAME = '出店者マスター';

// シートのカラム定義（行1の見出しヘッダー）
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

/**
 * シートを取得（存在しない場合は新規作成し、ヘッダーを装飾付きで初期化）
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // ヘッダー行が未作成の場合、自動で作成・スタイル設定
  if (sheet.getLastRow() === 0) {
    const headerRow = HEADERS.map(h => h.title);
    sheet.appendRow(headerRow);
    const range = sheet.getRange(1, 1, 1, headerRow.length);
    range.setBackground('#1e293b'); // スレートダーク背景
    range.setFontColor('#ffffff'); // 白文字
    range.setFontWeight('bold');
    range.setHorizontalAlignment('center');
    sheet.setFrozenRows(1); // 1行目を固定
  }
  return sheet;
}

/**
 * GETリクエスト処理（接続テスト & 出店者データ全件取得）
 */
function doGet(e) {
  const params = e ? e.parameter : {};
  const action = params.action || 'ping';

  try {
    const sheet = getOrCreateSheet();

    // 1. 接続テスト用
    if (action === 'ping') {
      const vendorCount = Math.max(0, sheet.getLastRow() - 1);
      return createJsonResponse({
        success: true,
        message: 'Googleスプレッドシート データベースに正常に接続されました。',
        sheetName: sheet.getName(),
        vendorCount: vendorCount
      });
    }

    // 2. 出店者全件取得
    if (action === 'getVendors') {
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({ success: true, vendors: [], count: 0 });
      }

      const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      const vendors = values.map(row => {
        const item = {};
        HEADERS.forEach((h, index) => {
          item[h.key] = row[index];
        });
        return item;
      });

      return createJsonResponse({
        success: true,
        vendors: vendors,
        count: vendors.length
      });
    }

    return createJsonResponse({ success: false, error: '不明なアクション: ' + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * POSTリクエスト処理（全件保存、個別追加・更新、削除）
 */
function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    const content = e && e.postData ? e.postData.contents : '{}';
    const body = JSON.parse(content);
    const action = body.action;

    // 1. 全出店者一括同期（上書き保存）
    if (action === 'syncVendors') {
      const vendors = body.vendors || [];
      
      // 既存データ行を全削除（ヘッダー行は保持）
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
        message: vendors.length + '件の出店者データをスプレッドシートに保存しました。',
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
        // 既存行を更新
        sheet.getRange(targetRowIndex, 1, 1, HEADERS.length).setValues([rowData]);
      } else {
        // 新規行を追加
        sheet.appendRow(rowData);
      }

      return createJsonResponse({
        success: true,
        message: '出店者を保存しました。',
        vendorId: v.id
      });
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

/**
 * JSONレスポンスの生成（CORS対応ヘッダー付き）
 */
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
