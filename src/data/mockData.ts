import { NightMarketEvent, Vendor, EventEntry } from '../types';

export const initialEvent: NightMarketEvent = {
  id: 'event-tanabe-2026-10',
  name: '第15回 たなべ夜市（秋の陣）',
  date: '2026-10-17',
  time: '16:00 - 21:00 (搬入 14:00〜 / 撤収 22:00完了)',
  venue: '扇ヶ浜公園 海浜特設広場',
  organizer: 'たなべ夜市実行委員会',
  contactPhone: '090-1234-5678 (本部携帯)',
  fireDepartmentName: '田辺市消防本部 予防課',
  guidelinesNotes: [
    '火気器具を使用するブースは必ず「業務用粉末消火器(10型以上)」を手の届く場所に設置すること。',
    '発電機への給油は必ずエンジン停止状態で行い、周囲5m以内での火気使用を禁止します。',
    '廃油・生ゴミの現地廃棄は一切禁止です。各ブースで必ず全量持ち帰りを徹底してください。',
    '許可証はブース正面の客から見える位置、またはスタッフの見やすい位置に常時掲示してください。',
    '終了時刻 21:00 以降の販売は厳禁です。消灯・完全撤収 22:00 を厳守してください。'
  ],
  areas: [
    { code: 'OUTDOOR', name: '屋外出店（物販・体験）', defaultBaseFee: 5000, description: '手作り雑貨・アート・ゲーム体験・ワークショップ' },
    { code: 'FOOD_STALL', name: '飲食露店', defaultBaseFee: 8000, description: 'メイン通路沿い・調理および食品販売ブース（火気使用可）' },
    { code: 'KITCHEN_CAR', name: 'キッチンカー', defaultBaseFee: 12000, description: '海沿い特設車輛スペース（自立営業・電源有）' }
  ]
};

export const initialVendors: Vendor[] = [
  {
    id: 'v-001',
    name: '黒潮炭火焼き鳥 弁慶',
    ownerName: '山本 健一',
    furigana: 'ヤマモト ケンイチ',
    phone: '080-9876-1111',
    email: 'benkei.yakitori@example.com',
    lineId: 'benkei_yakitori',
    instagram: '@benkei_yakitori',
    address: '和歌山県田辺市新庄町1234',
    category: 'food',
    menuItems: '紀州うめどり焼き鳥、牛串、つくね串、生ビール',
    hasFoodLicense: true,
    foodLicenseNumber: '和歌保 第012345号',
    licenseExpiryDate: '2028-06-30',
    status: 'active',
    tags: ['常連優良店', '火気あり(炭火)', '人気店'],
    internalNotes: '毎回大盛況。消火器も新品持参で防火マナー完璧。',
    pastParticipationCount: 8,
    pastEvents: ['第12回 たなべ夜市', '第13回 たなべ夜市', '第14回 たなべ夜市'],
    createdAt: '2024-04-01'
  },
  {
    id: 'v-002',
    name: '極旨たこ焼き 蛸源',
    ownerName: '田中 誠一郎',
    furigana: 'タナカ セイイチロウ',
    phone: '090-3344-5566',
    email: 'takogen.tanabe@example.com',
    instagram: '@takogen_tanabe',
    address: '和歌山県田辺市湊45-6',
    category: 'food',
    menuItems: '大玉たこ焼き（ソース・醤油マヨ・ねぎ塩）、フランクフルト',
    hasFoodLicense: true,
    foodLicenseNumber: '和歌保 第024680号',
    licenseExpiryDate: '2027-11-15',
    status: 'active',
    tags: ['プロパンガス', '長机希望'],
    internalNotes: 'ガス器具の安全弁点検済み。対応良好。',
    pastParticipationCount: 5,
    pastEvents: ['第11回 たなべ夜市', '第13回 たなべ夜市', '第14回 たなべ夜市'],
    createdAt: '2024-08-10'
  },
  {
    id: 'v-003',
    name: 'Nanairo クレープ＆タピオカ',
    ownerName: '佐々木 萌香',
    furigana: 'ササキ モエカ',
    phone: '080-2211-9988',
    email: 'info@nanairo-crepe.jp',
    instagram: '@nanairo_crepe',
    address: '和歌山県白浜町332',
    category: 'kitchen_car',
    menuItems: '自家製モチモチクレープ、黒糖タピオカラテ、自家製レモネード',
    hasFoodLicense: true,
    foodLicenseNumber: '和歌保 自動車 第9876号',
    licenseExpiryDate: '2029-03-31',
    status: 'active',
    tags: ['キッチンカー', '電源必須(1500W)', '若者に大人気'],
    internalNotes: '女性・ファミリー層の集客力が高い。電源容量の確保必須。',
    pastParticipationCount: 6,
    pastEvents: ['第10回 たなべ夜市', '第12回 たなべ夜市', '第14回 たなべ夜市'],
    createdAt: '2024-05-15'
  },
  {
    id: 'v-004',
    name: '南紀レモネード STAND',
    ownerName: '林 翔太',
    furigana: 'ハヤシ ショウタ',
    phone: '070-5555-1234',
    email: 'hayashi@nanki-lemon.com',
    instagram: 'https://www.instagram.com/nanki_lemonade/',
    address: '和歌山県田辺市上芳養10',
    category: 'drink',
    menuItems: '地元産生搾りクラフトレモネード、レモンスカッシュ、かき氷',
    hasFoodLicense: true,
    foodLicenseNumber: '和歌保 第055432号',
    licenseExpiryDate: '2028-09-20',
    status: 'active',
    tags: ['火気なし', '電源使用(氷削機)'],
    internalNotes: '爽やかで好印象。ゴミ回収マナー良好。',
    pastParticipationCount: 3,
    pastEvents: ['第13回 たなべ夜市', '第14回 たなべ夜市'],
    createdAt: '2025-06-01'
  },
  {
    id: 'v-005',
    name: 'Kishu Leather & Accessories',
    ownerName: '中村 彩乃',
    furigana: 'ナカムラ アヤノ',
    phone: '090-7766-3322',
    email: 'nakamura@kishu-craft.com',
    instagram: '@kishu_leather',
    address: '和歌山県上富田町朝来888',
    category: 'goods',
    menuItems: '本革ハンドメイドキーケース・財布、天然石アクセサリー',
    hasFoodLicense: false,
    status: 'active',
    tags: ['火気なし', '電源なし', 'クラフト'],
    internalNotes: 'ディスプレイが洗練されている。リピーター多数。',
    pastParticipationCount: 4,
    pastEvents: ['第12回 たなべ夜市', '第13回 たなべ夜市', '第14回 たなべ夜市'],
    createdAt: '2024-10-10'
  },
  {
    id: 'v-006',
    name: '昔なつかし射的＆スーパーボールすくい',
    ownerName: '鈴木 辰男',
    furigana: 'スズキ タツオ',
    phone: '090-4444-8888',
    email: 'suzuki_ennichi@example.com',
    address: '和歌山県田辺市新万2-1',
    category: 'game',
    menuItems: 'コルク銃射的、キャラクター人形すくい、光るおもちゃ',
    hasFoodLicense: false,
    status: 'active',
    organizationType: 'organization',
    organizationName: '田辺青年ボランティアサークル',
    tags: ['登録団体', '縁日', '子供向け', '角ブース希望'],
    internalNotes: '子供に大人気。列ができるため広めのスペース推奨。',
    pastParticipationCount: 7,
    pastEvents: ['第9回 たなべ夜市', '第11回 たなべ夜市', '第13回 たなべ夜市'],
    createdAt: '2024-01-20'
  },
  {
    id: 'v-007',
    name: 'アジアン屋台 ナマステ (要注意)',
    ownerName: '松田 洋介',
    furigana: 'マツダ ヨウスケ',
    phone: '080-6677-8899',
    email: 'matsuda@asian-curry.net',
    instagram: '@namaste_tanabe',
    address: '大阪府泉南市新家44',
    category: 'food',
    menuItems: 'タンドリーチキン、スパイスカレー、ナン、マンゴーラッシー',
    hasFoodLicense: true,
    foodLicenseNumber: '泉州保 第33211号',
    licenseExpiryDate: '2026-12-10',
    status: 'warning',
    statusReason: '【要注意】前回搬入時に2時間の大幅遅刻。また指定分別ゴミ箱に油まみれのダンボールを詰め込み放置した履歴あり。今回は誓約書受領済み。',
    tags: ['【要注意】', '遅刻常習', 'ゴミ要確認', 'プロパンガス'],
    internalNotes: '味は美味しいが運営ルール順守に難あり。当日はスタッフがゴミ片付けを現地立会で確認すること。',
    pastParticipationCount: 2,
    pastEvents: ['第13回 たなべ夜市', '第14回 たなべ夜市'],
    createdAt: '2025-07-01'
  },
  {
    id: 'v-008',
    name: '爆音激辛からあげ 天狗 (※出禁・受付不可)',
    ownerName: '鬼頭 龍馬',
    furigana: 'キトウ リュウマ',
    phone: '090-9999-0000',
    email: 'tengu.karaage.danger@example.com',
    address: '和歌山県海南市1-2-3',
    category: 'food',
    menuItems: '大盛り唐揚げ、メガ盛りポテト',
    hasFoodLicense: false,
    status: 'banned',
    statusReason: '【出禁指定】2025年夏祭りにて消火器未持参でガスフライヤーを勝手に使用し小火騒ぎを起こした。さらに注意した実行委員長に恫喝暴言、使用済み廃油を側溝に流したため永久追放。エントリー受付絶対不可。',
    blacklistedAt: '2025-08-20',
    tags: ['【永久出禁】', '危険物違反', '暴言トラブル', '環境汚染'],
    internalNotes: '絶対にエントリーを許可しないこと。代表者名や電話番号を変えて応募してくる可能性があるので要注意。',
    pastParticipationCount: 1,
    pastEvents: ['第12回 たなべ夜市(出禁処分)'],
    createdAt: '2024-06-01'
  },
  {
    id: 'v-009',
    name: '串カツ浪花亭 (※出禁・無断キャンセル常習)',
    ownerName: '坂本 幸治',
    furigana: 'サカモト コウジ',
    phone: '080-1122-3344',
    email: 'sakamoto.kushikatsu@example.com',
    category: 'food',
    menuItems: '秘伝串カツ盛り合わせ、どて焼き',
    hasFoodLicense: true,
    foodLicenseNumber: '大阪保 第55123号',
    status: 'banned',
    statusReason: '【出禁指定】過去2回連続で当日15分前に連絡なしのドタキャン（ブース穴あき損害発生）。出店料も未払い踏み倒しのため出禁処分。',
    blacklistedAt: '2025-10-05',
    tags: ['【出禁】', '無断ドタキャン', '出店料未払い'],
    internalNotes: '他イベントでも同様のトラブルを起こしている報告あり。受付不可。',
    pastParticipationCount: 2,
    pastEvents: ['第10回 たなべ夜市', '第11回 たなべ夜市(無断欠席)'],
    createdAt: '2024-03-10',
    organizationType: 'store'
  },
  {
    id: 'v-010',
    name: '扇ヶ浜地域活性化振興会',
    ownerName: '木村 浩二',
    furigana: 'キムラ コウジ',
    phone: '0739-22-9988',
    email: 'info@ogigahama-shinko.org',
    instagram: '@ogigahama_shinko',
    address: '和歌山県田辺市扇ヶ浜1-1',
    category: 'other',
    organizationType: 'organization',
    organizationName: '扇ヶ浜地域活性化振興会',
    menuItems: '地域特産品PR、観光パンフレット配布、オリジナル梅ジュース試飲・直売',
    hasFoodLicense: false,
    status: 'active',
    tags: ['登録団体', '地域振興', '広報活動'],
    internalNotes: '地域密着の協力団体。夜市本部・安全見回り等にも協力いただいている。',
    pastParticipationCount: 10,
    pastEvents: ['第12回 たなべ夜市', '第13回 たなべ夜市', '第14回 たなべ夜市'],
    createdAt: '2024-01-10'
  }
];

export const initialEntries: EventEntry[] = [
  {
    id: 'entry-001',
    eventId: 'event-tanabe-2026-10',
    vendorId: 'v-001',
    vendorSnapshot: initialVendors[0],
    boothArea: 'FOOD_STALL',
    boothNumber: 'A-01',
    fee: {
      baseFee: 8000,
      powerOption: true,
      powerFee: 1500,
      powerWatts: 500,
      garbageOption: true,
      garbageFee: 500,
      equipmentRentalFee: 1000, // 長机1, イス2
      discount: 0,
      totalAmount: 11000,
      paymentStatus: 'paid',
      paidAt: '2026-09-10',
      receiptIssued: true,
      invoiceNumber: 'INV-2026-001'
    },
    fireSafety: {
      hasFireAppliance: true,
      appliances: [
        { type: 'charcoal', name: '業務用木炭焼き台 (120cm)', fuel: '紀州備長炭 10kg', count: 1 },
        { type: 'cassette_stove', name: '保温用カセットコンロ', fuel: 'カセットボンベ 3本', count: 1 }
      ],
      fireExtinguisher: {
        installed: true,
        count: 1,
        type: 'ABC粉末消火器 (ヤマトプロテック)',
        capacity: '10型 3.5kg',
        manufacturingYear: '2025年製',
        inspectionValid: true
      },
      submittedDocuments: [
        { id: 'doc-1', title: '消火器点検表・写真.pdf', uploadedAt: '2026-09-08' },
        { id: 'doc-2', title: '炭火焼き台配置見取図.pdf', uploadedAt: '2026-09-08' }
      ],
      notes: '炭火消火用の火消し壷を必ずブース奥に配置すること。',
      checkedByStaff: true
    },
    permitIssued: true,
    permitIssuedAt: '2026-09-12',
    entryStatus: 'confirmed',
    notes: 'メイン入口付近の角ブース。集客期待。'
  },
  {
    id: 'entry-002',
    eventId: 'event-tanabe-2026-10',
    vendorId: 'v-002',
    vendorSnapshot: initialVendors[1],
    boothArea: 'FOOD_STALL',
    boothNumber: 'A-02',
    fee: {
      baseFee: 8000,
      powerOption: false,
      powerFee: 0,
      garbageOption: true,
      garbageFee: 500,
      equipmentRentalFee: 1000,
      discount: 500, // リピート割
      totalAmount: 9000,
      paymentStatus: 'paid',
      paidAt: '2026-09-11',
      receiptIssued: false,
      invoiceNumber: 'INV-2026-002'
    },
    fireSafety: {
      hasFireAppliance: true,
      appliances: [
        { type: 'propane_gas', name: '4連式大玉たこ焼き器', fuel: 'LPガスボンベ 8kg', count: 1 }
      ],
      fireExtinguisher: {
        installed: true,
        count: 1,
        type: 'ABC粉末消火器',
        capacity: '10型 3.0kg',
        manufacturingYear: '2024年製',
        inspectionValid: true
      },
      submittedDocuments: [
        { id: 'doc-3', title: 'LPガス保安点検票.pdf', uploadedAt: '2026-09-09' }
      ],
      notes: 'ガスホースの亀裂点検済み、チェーン固定必須。',
      checkedByStaff: true
    },
    permitIssued: true,
    permitIssuedAt: '2026-09-12',
    entryStatus: 'confirmed'
  },
  {
    id: 'entry-003',
    eventId: 'event-tanabe-2026-10',
    vendorId: 'v-003',
    vendorSnapshot: initialVendors[2],
    boothArea: 'KITCHEN_CAR',
    boothNumber: 'K-01',
    fee: {
      baseFee: 12000,
      powerOption: true,
      powerFee: 2000,
      powerWatts: 1500,
      garbageOption: true,
      garbageFee: 500,
      equipmentRentalFee: 0,
      discount: 0,
      totalAmount: 14500,
      paymentStatus: 'billed',
      paidAt: undefined,
      receiptIssued: false,
      invoiceNumber: 'INV-2026-003'
    },
    fireSafety: {
      hasFireAppliance: true,
      appliances: [
        { type: 'generator', name: 'インバーター発電機 (防音型)', fuel: 'ガソリン 10L (携行缶あり)', count: 1 },
        { type: 'electric_fryer', name: '電気クレープ焼き器 (1500W)', fuel: '電気', count: 2 }
      ],
      fireExtinguisher: {
        installed: true,
        count: 1,
        type: 'ABC粉末消火器 (自動車搭載用)',
        capacity: '10型 3.5kg',
        manufacturingYear: '2025年製',
        inspectionValid: true
      },
      submittedDocuments: [
        { id: 'doc-4', title: 'キッチンカー車輛車検証・営業許可書.pdf', uploadedAt: '2026-09-09' },
        { id: 'doc-5', title: '消火器搭載写真.pdf', uploadedAt: '2026-09-09' }
      ],
      notes: '車両進入は14:30厳守。発電機排気口を歩行者通路に向けないこと。',
      checkedByStaff: true
    },
    permitIssued: false,
    entryStatus: 'confirmed'
  },
  {
    id: 'entry-004',
    eventId: 'event-tanabe-2026-10',
    vendorId: 'v-004',
    vendorSnapshot: initialVendors[3],
    boothArea: 'FOOD_STALL',
    boothNumber: 'B-01',
    fee: {
      baseFee: 8000,
      powerOption: true,
      powerFee: 1500,
      powerWatts: 800,
      garbageOption: true,
      garbageFee: 500,
      equipmentRentalFee: 500,
      discount: 0,
      totalAmount: 10500,
      paymentStatus: 'paid',
      paidAt: '2026-09-07',
      receiptIssued: true,
      invoiceNumber: 'INV-2026-004'
    },
    fireSafety: {
      hasFireAppliance: false,
      appliances: [],
      fireExtinguisher: {
        installed: false,
        count: 0,
        type: '-',
        capacity: '-',
        manufacturingYear: '-',
        inspectionValid: true
      },
      submittedDocuments: [],
      notes: '火気不使用。電動氷削機使用。',
      checkedByStaff: true
    },
    permitIssued: true,
    permitIssuedAt: '2026-09-12',
    entryStatus: 'confirmed'
  },
  {
    id: 'entry-005',
    eventId: 'event-tanabe-2026-10',
    vendorId: 'v-005',
    vendorSnapshot: initialVendors[4],
    boothArea: 'OUTDOOR',
    boothNumber: 'C-01',
    fee: {
      baseFee: 5000,
      powerOption: false,
      powerFee: 0,
      garbageOption: false,
      garbageFee: 0,
      equipmentRentalFee: 500,
      discount: 0,
      totalAmount: 5500,
      paymentStatus: 'paid',
      paidAt: '2026-09-05',
      receiptIssued: true,
      invoiceNumber: 'INV-2026-005'
    },
    fireSafety: {
      hasFireAppliance: false,
      appliances: [],
      fireExtinguisher: {
        installed: false,
        count: 0,
        type: '-',
        capacity: '-',
        manufacturingYear: '-',
        inspectionValid: true
      },
      submittedDocuments: [],
      checkedByStaff: true
    },
    permitIssued: true,
    permitIssuedAt: '2026-09-12',
    entryStatus: 'confirmed'
  },
  {
    id: 'entry-006',
    eventId: 'event-tanabe-2026-10',
    vendorId: 'v-006',
    vendorSnapshot: initialVendors[5],
    boothArea: 'OUTDOOR',
    boothNumber: 'C-02',
    fee: {
      baseFee: 5000,
      powerOption: false,
      powerFee: 0,
      garbageOption: false,
      garbageFee: 0,
      equipmentRentalFee: 1500, // 机2台
      discount: 0,
      totalAmount: 6500,
      paymentStatus: 'unbilled',
      paidAt: undefined,
      receiptIssued: false,
      invoiceNumber: 'INV-2026-006'
    },
    fireSafety: {
      hasFireAppliance: false,
      appliances: [],
      fireExtinguisher: {
        installed: false,
        count: 0,
        type: '-',
        capacity: '-',
        manufacturingYear: '-',
        inspectionValid: true
      },
      submittedDocuments: [],
      checkedByStaff: true
    },
    permitIssued: false,
    entryStatus: 'confirmed'
  },
  {
    id: 'entry-007',
    eventId: 'event-tanabe-2026-10',
    vendorId: 'v-007',
    vendorSnapshot: initialVendors[6],
    boothArea: 'FOOD_STALL',
    boothNumber: 'A-03',
    fee: {
      baseFee: 8000,
      powerOption: false,
      powerFee: 0,
      garbageOption: true,
      garbageFee: 1000, // ゴミ預かり保証金含む
      equipmentRentalFee: 1000,
      discount: 0,
      totalAmount: 10000,
      paymentStatus: 'unbilled',
      paidAt: undefined,
      receiptIssued: false,
      invoiceNumber: 'INV-2026-007'
    },
    fireSafety: {
      hasFireAppliance: true,
      appliances: [
        { type: 'propane_gas', name: 'タンドール用ガスバーナー', fuel: 'LPガス 5kg', count: 1 }
      ],
      fireExtinguisher: {
        installed: true,
        count: 1,
        type: 'ABC粉末消火器',
        capacity: '10型 3.0kg',
        manufacturingYear: '2023年製',
        inspectionValid: true
      },
      submittedDocuments: [],
      notes: '【誓約書確認要】油廃棄・ゴミ回収の誓約書をまだ受領していないため確認必須！',
      checkedByStaff: false
    },
    permitIssued: false,
    entryStatus: 'pending',
    notes: '【要注意出店者】誓約書と消火器の現物確認が済むまで許可証発行禁止！'
  }
];
