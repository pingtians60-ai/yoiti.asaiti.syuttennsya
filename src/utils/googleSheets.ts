import { Vendor, EventEntry, BoothArea, FireApplianceType, NightMarketEvent } from '../types';

export interface ColumnMapping {
  nameCol: number;          // 屋号・店名
  ownerNameCol: number;     // 代表者名
  phoneCol: number;         // 電話番号
  emailCol: number;         // メールアドレス
  lineIdCol: number;        // LINE ID
  addressCol: number;       // 住所
  categoryCol: number;      // 出店ジャンル
  menuItemsCol: number;     // 販売品目・メニュー
  hasFireCol: number;       // 火気使用の有無
  fireApplianceCol: number; // 使用火気器具
  fireFuelCol: number;      // 使用燃料
  fireExtinguisherCol: number; // 消火器持参
  boothAreaCol: number;     // 出店内容
  powerOptionCol: number;   // 電源希望
  powerWattsCol: number;    // 電源W数
  tentOptionCol: number;    // テント希望
  garbageOptionCol: number; // ゴミ回収希望
  notesCol: number;         // 備考・要望
}

const STORAGE_KEY_SAVED_SHEET_URL = 'night_market_google_sheet_url';

export function getSavedSheetUrl(): string {
  return localStorage.getItem(STORAGE_KEY_SAVED_SHEET_URL) || '';
}

export function saveSheetUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY_SAVED_SHEET_URL, url);
}

/**
 * GoogleスプレッドシートのURLからsheetIdとgidを抽出
 */
export function parseGoogleSheetUrl(url: string): { sheetId: string | null; gid: string | null; fetchUrl: string | null } {
  if (!url || typeof url !== 'string') {
    return { sheetId: null, gid: null, fetchUrl: null };
  }

  const trimmed = url.trim();

  // 1. 通常の編集リンクまたは共有リンク
  // 例: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=0#gid=0
  const matchId = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const sheetId = matchId ? matchId[1] : null;

  // gid の抽出
  const matchGid = trimmed.match(/[?&#]gid=([0-9]+)/);
  const gid = matchGid ? matchGid[1] : '0';

  if (sheetId) {
    // Google Visualization API経由のエクスポート（CORS許可ヘッダーが付くためフロントエンド直接fetch可能）
    const fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    return { sheetId, gid, fetchUrl };
  }

  // 2. Webに公開（pub / pubhtml）リンクの場合
  // 例: https://docs.google.com/spreadsheets/d/e/2PACX-.../pubhtml
  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (pubMatch) {
    const pubId = pubMatch[1];
    const fetchUrl = `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv`;
    return { sheetId: pubId, gid: '0', fetchUrl };
  }

  return { sheetId: null, gid: null, fetchUrl: null };
}

/**
 * 指定されたURLからCSVテキストをフェッチ
 */
export async function fetchGoogleSheetCsv(url: string): Promise<string> {
  const { sheetId, gid, fetchUrl } = parseGoogleSheetUrl(url);

  if (!fetchUrl || !sheetId) {
    throw new Error('Googleスプレッドシートの有効なURLが見つかりませんでした。「https://docs.google.com/spreadsheets/d/...」形式のURLを入力してください。');
  }

  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        throw new Error('スプレッドシートにアクセスできませんでした。\nGoogleスプレッドシート右上の「共有」ボタンをクリックし、一般的なアクセスを「リンクを知っている全員（閲覧者）」に変更してください。');
      }
      throw new Error(`スプレッドシートの取得に失敗しました (ステータス: ${response.status})`);
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) {
      throw new Error('スプレッドシートのデータが空でした。シートに回答が記録されているかご確認ください。');
    }

    // HTMLが返ってきた場合は権限エラー（ログイン画面等）
    if (text.trim().startsWith('<!DOCTYPE html>') || text.includes('<html')) {
      throw new Error('Googleスプレッドシートのアクセス権限が必要です。\nスプレッドシートの共有設定で「リンクを知っている全員（閲覧者）」に設定してください。');
    }

    return text;
  } catch (err: any) {
    if (err.message && err.message.includes('スプレッドシート')) {
      throw err;
    }
    // CORSやネットワーク切断の場合
    throw new Error('Googleスプレッドシートからの自動取得に失敗しました。\n・シートの共有設定が「リンクを知っている全員が閲覧可」になっているか確認してください。\n・または、シートのセルを全選択して「クリップボードから貼り付け」欄へ貼り付けて取り込むことも可能です。');
  }
}

/**
 * 堅牢なCSV/TSVパーサー（クォート、改行、カンマ/タブに対応）
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  // 区切り文字判定（TSVかCSVか）
  const firstLine = csvText.split(/\r?\n/)[0] || '';
  const delimiter = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // エスケープされたダブルクォート
          currentField += '"';
          i++;
        } else {
          // クォート終了
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  // 最終フィールド
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Googleフォームの設問ヘッダー行からカラムインデックスをスマート自動判定
 */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    nameCol: -1,
    ownerNameCol: -1,
    phoneCol: -1,
    emailCol: -1,
    lineIdCol: -1,
    addressCol: -1,
    categoryCol: -1,
    menuItemsCol: -1,
    hasFireCol: -1,
    fireApplianceCol: -1,
    fireFuelCol: -1,
    fireExtinguisherCol: -1,
    boothAreaCol: -1,
    powerOptionCol: -1,
    powerWattsCol: -1,
    tentOptionCol: -1,
    garbageOptionCol: -1,
    notesCol: -1,
  };

  headers.forEach((h, idx) => {
    const header = h.toLowerCase().trim();

    // 屋号・店名
    if (mapping.nameCol === -1 && /屋号|店舗名|店名|出店名|ブース名|グループ名|ショップ名/.test(header)) {
      mapping.nameCol = idx;
    }
    // 代表者名（屋号と誤認しないように）
    else if (mapping.ownerNameCol === -1 && /代表者|お名前|氏名|責任者|担当者|申込者/.test(header) && !/屋号|店舗/.test(header)) {
      mapping.ownerNameCol = idx;
    }
    // 電話番号
    else if (mapping.phoneCol === -1 && /電話|tel|携帯|連絡先/.test(header)) {
      mapping.phoneCol = idx;
    }
    // メール
    else if (mapping.emailCol === -1 && /メール|mail|email|アドレス/.test(header)) {
      mapping.emailCol = idx;
    }
    // LINE
    else if (mapping.lineIdCol === -1 && /line|ライン/.test(header)) {
      mapping.lineIdCol = idx;
    }
    // 住所
    else if (mapping.addressCol === -1 && /住所|所在地|居所/.test(header)) {
      mapping.addressCol = idx;
    }
    // カテゴリ・ジャンル
    else if (mapping.categoryCol === -1 && /ジャンル|カテゴリ|形態|区分|種別|出店内容/.test(header) && !/品目|メニュー/.test(header)) {
      mapping.categoryCol = idx;
    }
    // 販売品目・メニュー
    else if (mapping.menuItemsCol === -1 && /品目|メニュー|商品|取扱|販売予定|何を出品|出品物/.test(header)) {
      mapping.menuItemsCol = idx;
    }
    // 火気使用
    else if (mapping.hasFireCol === -1 && /火気|火を使用|熱源|ガス・火|発電機/.test(header) && !/器具|燃料|消火器/.test(header)) {
      mapping.hasFireCol = idx;
    }
    // 火気器具
    else if (mapping.fireApplianceCol === -1 && /器具|使用する器具|コンロ|焼き台|フライヤー/.test(header)) {
      mapping.fireApplianceCol = idx;
    }
    // 燃料
    else if (mapping.fireFuelCol === -1 && /燃料|ガス種|lpガス|プロパン|ボンベ|炭/.test(header)) {
      mapping.fireFuelCol = idx;
    }
    // 消火器
    else if (mapping.fireExtinguisherCol === -1 && /消火器/.test(header)) {
      mapping.fireExtinguisherCol = idx;
    }
    // 出店内容
    else if (mapping.boothAreaCol === -1 && /出店内容|出店区分|出店種別|出店形態|エリア|ブース希望|配置希望|希望場所/.test(header)) {
      mapping.boothAreaCol = idx;
    }
    // 電源
    else if (mapping.powerOptionCol === -1 && /電源|コンセント|電気/.test(header) && !/w数|ワット/.test(header)) {
      mapping.powerOptionCol = idx;
    }
    // 電源W数
    else if (mapping.powerWattsCol === -1 && /w数|ワット|消費電力/.test(header)) {
      mapping.powerWattsCol = idx;
    }
    // テントレンタル
    else if (mapping.tentOptionCol === -1 && /テント|タープ|張り/.test(header)) {
      mapping.tentOptionCol = idx;
    }
    // ゴミ
    else if (mapping.garbageOptionCol === -1 && /ゴミ|ごみ|廃棄/.test(header)) {
      mapping.garbageOptionCol = idx;
    }
    // 備考
    else if (mapping.notesCol === -1 && /備考|要望|特記|メッセージ|ご意見|連絡事項/.test(header)) {
      mapping.notesCol = idx;
    }
  });

  // フォールバック: 屋号が未設定なら、タイムスタンプ以外の最初の列を屋号とみなす
  if (mapping.nameCol === -1) {
    for (let idx = 0; idx < headers.length; idx++) {
      const h = headers[idx].toLowerCase();
      if (!/タイムスタンプ|日時|timestamp|id|番号/.test(h)) {
        mapping.nameCol = idx;
        break;
      }
    }
  }

  // フォールバック: 代表者名が未設定なら、屋号の次の列を候補にする
  if (mapping.ownerNameCol === -1 && mapping.nameCol !== -1 && headers.length > mapping.nameCol + 1) {
    mapping.ownerNameCol = mapping.nameCol + 1;
  }

  return mapping;
}

/**
 * 解析された行データとマッピングから Vendor と EventEntry を自動生成
 */
export function buildVendorsAndEntriesFromSheet(
  rows: string[][],
  mapping: ColumnMapping,
  event: NightMarketEvent,
  existingVendors: Vendor[],
  existingEntries: EventEntry[]
): { vendors: Vendor[]; entries: EventEntry[]; importedCount: number; removedDuplicatesCount?: number } {
  if (rows.length <= 1) {
    return { vendors: existingVendors, entries: existingEntries, importedCount: 0, removedDuplicatesCount: 0 };
  }

  // 1行目はヘッダー
  const dataRows = rows.slice(1);
  const updatedVendors = [...existingVendors];
  const updatedEntries = [...existingEntries];
  let importedCount = 0;

  dataRows.forEach((row, rowIdx) => {
    const getVal = (col: number) => (col >= 0 && col < row.length ? row[col].trim() : '');

    const name = getVal(mapping.nameCol) || `出店者_${rowIdx + 1}`;
    if (!name || name === '屋号' || name === '店舗名') return;

    const ownerName = getVal(mapping.ownerNameCol) || '代表者未定';
    const phone = getVal(mapping.phoneCol);
    const email = getVal(mapping.emailCol);
    const lineId = getVal(mapping.lineIdCol);
    const address = getVal(mapping.addressCol);
    const categoryRaw = getVal(mapping.categoryCol);
    const menuItems = getVal(mapping.menuItemsCol) || '出店品目未定';
    const notes = getVal(mapping.notesCol);

    // カテゴリ判定
    let category: Vendor['category'] = 'food';
    const catSearch = (categoryRaw + ' ' + menuItems).toLowerCase();
    if (/キッチンカー|車両|フードトラック/.test(catSearch)) {
      category = 'kitchen_car';
    } else if (/ドリンク|カフェ|生ビール|珈琲|お酒|アルコール|ジュース/.test(catSearch)) {
      category = 'drink';
    } else if (/雑貨|クラフト|ハンドメイド|物販|アクセサリー|服|陶器/.test(catSearch)) {
      category = 'goods';
    } else if (/縁日|ゲーム|スーパーボール|射的|くじ|体験|ワークショップ/.test(catSearch)) {
      category = 'game';
    }

    // 火気使用判定
    const fireVal = getVal(mapping.hasFireCol).toLowerCase();
    const applianceVal = getVal(mapping.fireApplianceCol);
    const fuelVal = getVal(mapping.fireFuelCol);
    const fullRowText = row.join(' ').toLowerCase();

    const hasFireAppliance = /あり|有|使用する|使う|はい|yes|true|lpガス|コンロ|炭|フライヤー/.test(fireVal) ||
      /ガス|コンロ|プロパン|炭火|発電機|フライヤー/.test(applianceVal) ||
      /ガス|プロパン|炭|ガソリン/.test(fuelVal);

    // 燃料と器具
    let fireFuel = fuelVal || 'LPガス';
    if (/炭/.test(applianceVal + fuelVal)) fireFuel = '木炭・備長炭';
    else if (/カセット/.test(applianceVal + fuelVal)) fireFuel = 'カセットボンベ';
    else if (/発電機|ガソリン/.test(applianceVal + fuelVal)) fireFuel = 'ガソリン (発電機)';

    let applianceType: FireApplianceType = 'propane_gas';
    if (fireFuel.includes('炭')) applianceType = 'charcoal';
    else if (fireFuel.includes('カセット')) applianceType = 'cassette_stove';
    else if (fireFuel.includes('ガソリン')) applianceType = 'generator';

    // 消火器持参判定
    const extVal = getVal(mapping.fireExtinguisherCol).toLowerCase();
    const hasFireExtinguisher = !/なし|無|いいえ|no/.test(extVal);

    // 出店内容判定（屋外出店（物販・体験）、飲食露店、キッチンカー）
    const areaVal = getVal(mapping.boothAreaCol);
    let boothArea: BoothArea = 'OUTDOOR';
    if (category === 'kitchen_car' || /キッチン|キッチンカー|kitchen|car/i.test(areaVal)) {
      boothArea = 'KITCHEN_CAR';
    } else if (/飲食|露店|食品|フード|food|酒|drink/i.test(areaVal) || category === 'food' || category === 'drink') {
      boothArea = 'FOOD_STALL';
    } else if (/屋外|物販|体験|クラフト|雑貨|ワークショップ|ゲーム|縁日/i.test(areaVal) || category === 'goods' || category === 'game') {
      boothArea = 'OUTDOOR';
    } else {
      boothArea = 'OUTDOOR';
    }

    // 電源判定
    const powerVal = getVal(mapping.powerOptionCol).toLowerCase();
    const powerOption = /希望|あり|有|必要|はい|yes|1500|1000/.test(powerVal);
    const powerWattsRaw = parseInt(getVal(mapping.powerWattsCol), 10);
    const powerWatts = !isNaN(powerWattsRaw) && powerWattsRaw > 0 ? powerWattsRaw : (powerOption ? 1500 : 0);

    // ゴミ回収判定
    const garbageVal = getVal(mapping.garbageOptionCol).toLowerCase();
    const garbageOption = /希望|あり|有|必要|はい|yes/.test(garbageVal);

    // テントレンタル判定
    const tentVal = getVal(mapping.tentOptionCol).toLowerCase();
    const tentOption = /希望|あり|有|必要|はい|yes|1張|2張/.test(tentVal);
    const tentCount = /2/.test(tentVal) ? 2 : (tentOption ? 1 : 0);
    const tentFee = tentCount === 2 ? 5000 : (tentOption ? 3000 : 0);

    // 出禁・要注意判定
    let status: Vendor['status'] = 'active';
    let statusReason = '';
    if (/出禁|ブラック|トラブル/.test(fullRowText)) {
      status = 'banned';
      statusReason = 'スプレッドシート記録に基づく出禁';
    } else if (/注意|要注意|要確認/.test(fullRowText)) {
      status = 'warning';
      statusReason = 'スプレッドシート記録に基づく要注意';
    }

    // 料金計算
    const areaDef = event.areas.find(a => a.code === boothArea);
    const baseFee = areaDef?.defaultBaseFee || (boothArea === 'KITCHEN_CAR' ? 12000 : boothArea === 'FOOD_STALL' ? 8000 : 5000);
    const powerFee = powerOption ? 1500 : 0;
    const garbageFee = garbageOption ? 500 : 0;
    const totalAmount = baseFee + powerFee + tentFee + garbageFee;

    // 既存ベンダーとの突合（電話番号一致または完全一致する屋号）
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const matchedVendorIndex = updatedVendors.findIndex(v => 
      (cleanPhone && v.phone.replace(/[^0-9]/g, '') === cleanPhone) ||
      (v.name.trim() === name.trim())
    );

    const vendorId = matchedVendorIndex >= 0 ? updatedVendors[matchedVendorIndex].id : `v-sheet-${Date.now()}-${rowIdx}`;

    const vendorObj: Vendor = {
      id: vendorId,
      name,
      ownerName,
      phone,
      email,
      lineId: lineId || undefined,
      address: address || undefined,
      category,
      menuItems,
      hasFoodLicense: category === 'food' || category === 'kitchen_car',
      status: matchedVendorIndex >= 0 && updatedVendors[matchedVendorIndex].status !== 'active' ? updatedVendors[matchedVendorIndex].status : status,
      statusReason: matchedVendorIndex >= 0 ? (updatedVendors[matchedVendorIndex].statusReason || statusReason) : statusReason,
      tags: ['スプレッドシート連携', category === 'kitchen_car' ? 'キッチンカー' : '一般ブース'],
      internalNotes: notes,
      pastParticipationCount: (matchedVendorIndex >= 0 ? updatedVendors[matchedVendorIndex].pastParticipationCount : 0) + 1,
      pastEvents: [event.name],
      createdAt: matchedVendorIndex >= 0 ? updatedVendors[matchedVendorIndex].createdAt : new Date().toISOString().split('T')[0]
    };

    if (matchedVendorIndex >= 0) {
      updatedVendors[matchedVendorIndex] = vendorObj;
    } else {
      updatedVendors.push(vendorObj);
    }

    // 既存エントリーとの突合
    const matchedEntryIndex = updatedEntries.findIndex(e => e.vendorId === vendorId && e.eventId === event.id);

    // ブース番号の自動採番（未登録の場合）
    const existingAreaCount = updatedEntries.filter(e => e.boothArea === boothArea).length;
    const prefix = boothArea === 'OUTDOOR' ? 'O' : boothArea === 'FOOD_STALL' ? 'F' : 'K';
    const boothNumber = matchedEntryIndex >= 0 ? updatedEntries[matchedEntryIndex].boothNumber : `${prefix}-${String(existingAreaCount + 1).padStart(2, '0')}`;

    const entryObj: EventEntry = {
      id: matchedEntryIndex >= 0 ? updatedEntries[matchedEntryIndex].id : `entry-sheet-${Date.now()}-${rowIdx}`,
      eventId: event.id,
      vendorId: vendorObj.id,
      vendorSnapshot: vendorObj,
      boothArea,
      boothNumber,
      fee: {
        baseFee,
        powerOption,
        powerFee,
        powerWatts,
        tentOption,
        tentCount,
        tentFee,
        garbageOption,
        garbageFee,
        equipmentRentalFee: 0,
        discount: 0,
        totalAmount,
        paymentStatus: matchedEntryIndex >= 0 ? updatedEntries[matchedEntryIndex].fee.paymentStatus : 'unbilled',
        receiptIssued: matchedEntryIndex >= 0 ? updatedEntries[matchedEntryIndex].fee.receiptIssued : false
      },
      fireSafety: {
        hasFireAppliance,
        appliances: hasFireAppliance ? [
          {
            type: applianceType,
            name: applianceVal || (category === 'kitchen_car' ? 'キッチンカー車載厨房' : '調理用火気器具'),
            fuel: fireFuel,
            count: 1
          }
        ] : [],
        fireExtinguisher: {
          installed: hasFireExtinguisher,
          count: hasFireExtinguisher ? 1 : 0,
          type: '10型 業務用粉末消火器',
          capacity: '10型 3.0kg以上',
          manufacturingYear: '点検済',
          inspectionValid: true
        },
        submittedDocuments: matchedEntryIndex >= 0 ? updatedEntries[matchedEntryIndex].fireSafety.submittedDocuments : [],
        checkedByStaff: matchedEntryIndex >= 0 ? updatedEntries[matchedEntryIndex].fireSafety.checkedByStaff : false,
        notes: applianceVal ? `器具: ${applianceVal} / 燃料: ${fireFuel}` : undefined
      },
      permitIssued: matchedEntryIndex >= 0 ? updatedEntries[matchedEntryIndex].permitIssued : false,
      entryStatus: 'confirmed',
      notes: notes ? `Googleフォーム回答より自動記入: ${notes}` : 'Googleフォーム回答より自動記入'
    };

    if (matchedEntryIndex >= 0) {
      updatedEntries[matchedEntryIndex] = entryObj;
    } else {
      updatedEntries.push(entryObj);
    }

    importedCount++;
  });

  // 出店者・エントリーの被り（重複）を自動検知して片方を自動削除
  const deduped = deduplicateVendorsAndEntries(updatedVendors, updatedEntries);

  return {
    vendors: deduped.vendors,
    entries: deduped.entries,
    importedCount,
    removedDuplicatesCount: deduped.removedVendorCount
  };
}

/**
 * 屋号・店名の表記揺れ正規化
 */
export function normalizeVendorName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)) // 全角英数を半角
    .replace(/[\s　・_‐－-]/g, '') // 空白・記号の除去
    .replace(/[（\(][^）\)]*[）\)]/g, ''); // (株)などのカッコ内を除去
}

/**
 * 電話番号の正規化（数字のみ）
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * メールアドレスの正規化
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * 2つの出店者が同一（被り）であるか判定
 */
export function isSameVendor(v1: Vendor, v2: Vendor): boolean {
  if (v1.id === v2.id) return true;

  const n1 = normalizeVendorName(v1.name);
  const n2 = normalizeVendorName(v2.name);
  if (n1 && n2 && n1 === n2) return true;

  const p1 = normalizePhone(v1.phone);
  const p2 = normalizePhone(v2.phone);
  if (p1 && p2 && p1.length >= 8 && p1 === p2) return true;

  const e1 = normalizeEmail(v1.email);
  const e2 = normalizeEmail(v2.email);
  if (e1 && e2 && e1 === e2) return true;

  // 代表者名が完全一致し、かつ屋号が部分一致する場合
  const o1 = v1.ownerName.trim().replace(/[\s　]/g, '');
  const o2 = v2.ownerName.trim().replace(/[\s　]/g, '');
  if (o1 && o2 && o1 === o2 && n1 && n2 && (n1.includes(n2) || n2.includes(n1))) {
    return true;
  }

  return false;
}

/**
 * 出店者とエントリーの被り（重複）を自動検知して片方を自動削除・統合する
 */
export function deduplicateVendorsAndEntries(
  vendors: Vendor[],
  entries: EventEntry[]
): {
  vendors: Vendor[];
  entries: EventEntry[];
  removedVendorCount: number;
  removedEntryCount: number;
} {
  const uniqueVendors: Vendor[] = [];
  const idReplacementMap = new Map<string, string>(); // 削除したid -> 残したid
  let removedVendorCount = 0;

  for (const v of vendors) {
    const existingIndex = uniqueVendors.findIndex((u) => isSameVendor(u, v));
    if (existingIndex >= 0) {
      // 被り発見！片方を自動削除し、最新・充実した情報で統合
      const existing = uniqueVendors[existingIndex];
      idReplacementMap.set(v.id, existing.id);

      uniqueVendors[existingIndex] = {
        ...existing,
        ...v,
        name: v.name.trim() || existing.name,
        ownerName: v.ownerName.trim() || existing.ownerName,
        phone: v.phone || existing.phone,
        email: v.email || existing.email,
        lineId: v.lineId || existing.lineId,
        instagram: v.instagram || existing.instagram,
        address: v.address || existing.address,
        category: v.category || existing.category,
        menuItems: v.menuItems || existing.menuItems,
        tags: (v.tags && v.tags.length > 0) ? v.tags : existing.tags,
        hasFoodLicense: v.hasFoodLicense ?? existing.hasFoodLicense,
        foodLicenseNumber: v.foodLicenseNumber || existing.foodLicenseNumber,
        licenseExpiryDate: v.licenseExpiryDate || existing.licenseExpiryDate,
        submittedLicenses: (v.submittedLicenses && v.submittedLicenses.length > 0) ? v.submittedLicenses : existing.submittedLicenses,
        status: (v.status === 'banned' || existing.status === 'banned') ? 'banned' : (v.status === 'warning' || existing.status === 'warning') ? 'warning' : (v.status || existing.status),
        statusReason: v.statusReason || existing.statusReason,
        internalNotes: [existing.internalNotes, v.internalNotes].filter(Boolean).join(' / ') || undefined
      };
      removedVendorCount++;
    } else {
      uniqueVendors.push(v);
    }
  }

  // エントリーの被りも自動削除
  const uniqueEntries: EventEntry[] = [];
  let removedEntryCount = 0;

  for (const e of entries) {
    const actualVendorId = idReplacementMap.get(e.vendorId) || e.vendorId;
    const baseVendor = uniqueVendors.find((v) => v.id === actualVendorId) || e.vendorSnapshot;
    // エントリー側に更新された情報がある場合は優先統合
    const vendor: Vendor = {
      ...baseVendor,
      ...e.vendorSnapshot,
      id: actualVendorId
    };
    const vIdx = uniqueVendors.findIndex(v => v.id === actualVendorId);
    if (vIdx >= 0) {
      uniqueVendors[vIdx] = { ...uniqueVendors[vIdx], ...vendor };
    }

    // 同じイベント内で同一ベンダーのエントリーがあるか
    const existingEntryIndex = uniqueEntries.findIndex(
      (ue) => ue.eventId === e.eventId && ue.vendorId === actualVendorId
    );

    if (existingEntryIndex >= 0) {
      // エントリー被り発見！片方を自動削除
      removedEntryCount++;
      const existingEntry = uniqueEntries[existingEntryIndex];
      uniqueEntries[existingEntryIndex] = {
        ...existingEntry,
        vendorSnapshot: vendor,
        fee: {
          ...existingEntry.fee,
          totalAmount: Math.max(existingEntry.fee.totalAmount, e.fee.totalAmount)
        },
        fireSafety: {
          ...existingEntry.fireSafety,
          hasFireAppliance: existingEntry.fireSafety.hasFireAppliance || e.fireSafety.hasFireAppliance,
          appliances: e.fireSafety.appliances.length > 0 ? e.fireSafety.appliances : existingEntry.fireSafety.appliances,
          fireExtinguisher: e.fireSafety.fireExtinguisher.installed ? e.fireSafety.fireExtinguisher : existingEntry.fireSafety.fireExtinguisher
        }
      };
    } else {
      uniqueEntries.push({
        ...e,
        vendorId: actualVendorId,
        vendorSnapshot: vendor
      });
    }
  }

  return {
    vendors: uniqueVendors,
    entries: uniqueEntries,
    removedVendorCount,
    removedEntryCount
  };
}
