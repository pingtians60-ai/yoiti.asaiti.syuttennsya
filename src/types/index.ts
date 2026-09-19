export type VendorStatus = 'active' | 'warning' | 'banned';

export type BoothArea = 'OUTDOOR' | 'FOOD_STALL' | 'KITCHEN_CAR' | 'A' | 'B' | 'C' | 'WORKSHOP';

export type PaymentStatus = 'unbilled' | 'billed' | 'paid' | 'overdue' | 'refunded';

export type FireApplianceType =
  | 'propane_gas'        // プロパンガス
  | 'cassette_stove'     // 卓上カセットコンロ
  | 'charcoal'           // 炭火・七輪
  | 'electric_fryer'     // 電気フライヤー・ホットプレート
  | 'generator'          // 発電機
  | 'other';             // その他

export interface FireSafetyInfo {
  hasFireAppliance: boolean;             // 火気使用の有無
  appliances: {
    type: FireApplianceType;
    name: string;                        // 器具名（例: 2口ガスコンロ、10L電気フライヤー等）
    fuel: string;                        // 使用燃料（例: LPガス 5kg, ガソリン 10L 等）
    count: number;                       // 数量
  }[];
  fireExtinguisher: {
    installed: boolean;                  // 消火器設置の有無（必須）
    count: number;                       // 設置本数
    type: string;                        // 種類（粉末ABC等）
    capacity: string;                    // 能力単位（例: 10型 3.0kg）
    manufacturingYear: string;           // 製造年
    inspectionValid: boolean;            // 点検期限内か
  };
  submittedDocuments: {
    id: string;
    title: string;                       // 書類名（例: 消火器写真・点検票、器具仕様書、配置略図等）
    fileUrl?: string;                    // 保存URLまたはBlob
    fileName?: string;
    fileSize?: number;
    uploadedAt?: string;
    pdfDataUri?: string;                 // Base64データ（マージ・プレビュー用）
  }[];
  notes?: string;                        // 消防特記事項
  checkedByStaff: boolean;               // 運営側確認済フラグ
}

export interface VendorFee {
  baseFee: number;                       // 基本出店料金
  powerOption: boolean;                  // 電源利用
  powerFee: number;                      // 電源利用料（例: 1,500円）
  powerWatts?: number;                   // 使用W数（例: 1500W）
  tentOption?: boolean;                  // テントレンタル利用有無
  tentCount?: number;                    // テント張り数（例: 1張, 2張）
  tentFee?: number;                      // テントレンタル料金（例: 3,000円）
  garbageOption: boolean;                // ゴミ回収オプション
  garbageFee: number;                    // ゴミ回収費（例: 500円）
  equipmentRentalFee: number;            // テーブル・椅子など貸出料
  discount: number;                      // 割引（地元割引・早割など）
  totalAmount: number;                   // 合計請求額
  paymentStatus: PaymentStatus;          // 支払い状況
  paidAt?: string;                       // 入金確認日
  receiptIssued: boolean;                // 領収書発行済フラグ
  invoiceNumber?: string;                // 請求書/領収書番号
}

export interface Vendor {
  id: string;
  name: string;                          // 屋号・店名
  readingFurigana?: string;              // 屋号・店名の五十音順用よみがな（AI判定・ソートキー）
  ownerName: string;                     // 代表者名
  furigana?: string;                     // 代表者フリガナ
  phone: string;                         // 電話番号
  email: string;                         // メールアドレス
  lineId?: string;                       // LINE ID
  instagram?: string;                    // Instagram (@アカウント名 または URL)
  address?: string;                      // 住所・所在地
  category: 'food' | 'drink' | 'kitchen_car' | 'goods' | 'game' | 'other'; // 出店ジャンル
  organizationType?: 'store' | 'organization'; // 出店区分: 'store'(店舗) | 'organization'(団体)
  organizationName?: string;             // 所属団体名・グループ名（例: 扇ヶ浜地域振興会、田辺まちづくりサークル等）
  menuItems: string;                     // 出店・販売品目（例: たこ焼き、フルーツ飴、ハンドメイド雑貨など）
  
  // 食品衛生・営業許可関連（出店者から提出される許可証）
  hasFoodLicense: boolean;               // 飲食店営業許可等の有無
  foodLicenseNumber?: string;            // 許可番号
  licenseExpiryDate?: string;            // 有効期限
  submittedLicenses?: SubmittedLicense[]; // 提出された許可証（画像・PDF・URL）一覧
  
  // 出禁・要注意管理
  status: VendorStatus;                  // 'active' | 'warning' | 'banned'
  statusReason?: string;                 // 出禁・要注意理由（例: 2025年夏祭りで無断キャンセル、油の不法投棄等）
  blacklistedAt?: string;                // 出禁指定日
  tags: string[];                        // タグ（例: "人気店", "要注意", "電源必要", "大型車両" 等）
  internalNotes?: string;                // 運営用メモ
  pastParticipationCount: number;        // 過去参加回数
  pastEvents: string[];                  // 過去参加したイベント名
  createdAt: string;
}

/**
 * 出店者が「登録団体」かどうかを判定するヘルパー
 */
export function isVendorOrganization(vendor?: { 
  organizationType?: string; 
  tags?: string[]; 
  name?: string; 
  organizationName?: string;
  category?: string;
}): boolean {
  if (!vendor) return false;
  if (vendor.organizationType === 'organization') return true;
  if (vendor.organizationType === 'store') return false;
  if (vendor.tags && vendor.tags.some(t => /団体|振興会|サークル|NPO|実行委|青年部|地域|PTA|協議会/.test(t))) return true;
  if (/振興会|サークル|実行委員会|協議会|連合会|青年部|ボランティア/.test(vendor.name || '')) return true;
  if (vendor.organizationName && vendor.organizationName.trim().length > 0) return true;
  return false;
}

/**
 * 出店者から提出された許可証（食品営業許可・露店許可・キッチンカー車検証等）
 */
export interface SubmittedLicense {
  id: string;
  title: string;                         // 許可証の名称（例: 飲食店営業許可証、露店営業許可証、自動車営業許可証等）
  fileType: 'image' | 'pdf' | 'url' | 'text';     // 形式
  fileData?: string;                     // Base64データURL、または画像・PDF・Google Drive URL
  fileName?: string;                     // ファイル名（例: 営業許可証_和歌山県.pdf / Google Drive共有リンク）
  licenseNumber?: string;                // 許可番号
  expiryDate?: string;                   // 有効期限（例: 2028-03-31）
  submittedAt: string;                   // 提出・登録日
  verified: boolean;                     // 運営本部確認済フラグ
  notes?: string;                        // 不備内容・確認メモ
}

export interface EventEntry {
  id: string;
  eventId: string;                       // 対象イベントID
  vendorId: string;                      // 出店者マスターID
  vendorSnapshot: Vendor;                // 出店者情報スナップショット
  boothArea: BoothArea;                  // 出店内容（屋外出店（物販・体験）、飲食露店、キッチンカー）
  boothNumber: string;                   // ブース番号（例: A-01, K-03）
  fee: VendorFee;                        // 料金・入金情報
  fireSafety: FireSafetyInfo;            // 消防・火気情報
  permitIssued: boolean;                 // 出店許可証・提出確認済フラグ（旧互換）
  permitIssuedAt?: string;
  submittedLicenses?: SubmittedLicense[]; // 当該イベントエントリー提出済み許可証
  entryStatus: 'pending' | 'confirmed' | 'cancelled'; // エントリー確定ステータス
  notes?: string;                        // 当日の特記事項
}

export interface NightMarketEvent {
  id: string;
  name: string;                          // イベント名（例: 「第12回 たなべ夜市」）
  date: string;                          // 開催日（例: 2026-10-18）
  time: string;                          // 開催時間（例: 16:00 - 21:00）
  venue: string;                         // 開催場所（例: 扇ヶ浜公園 特設会場）
  organizer: string;                     // 主催者名（例: たなべ夜市実行委員会）
  contactPhone: string;                  // 運営本部緊急連絡先
  fireDepartmentName: string;            // 所轄消防署（例: 田辺市消防本部 予防課）
  guidelinesNotes: string[];             // 許可証に記載する注意事項
  areas: {
    code: BoothArea;
    name: string;
    defaultBaseFee: number;
    description: string;
  }[];
}
