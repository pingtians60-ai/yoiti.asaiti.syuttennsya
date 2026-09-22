-- ==============================================================================
-- 夜市出店者管理システム：Supabase用テーブル定義（SQL）
-- Supabaseダッシュボードの「SQL Editor」に貼り付けて「RUN」を押すだけで完了します。
-- ==============================================================================

-- 1. イベント管理テーブル (yoichi_events)
CREATE TABLE IF NOT EXISTS public.yoichi_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT DEFAULT '',
  time TEXT DEFAULT '',
  venue TEXT DEFAULT '',
  organizer TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  fire_department_name TEXT DEFAULT '',
  guidelines_notes JSONB DEFAULT '[]'::jsonb,
  areas JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 過去出店店舗・一般出店者マスター名簿 (yoichi_vendors)
CREATE TABLE IF NOT EXISTS public.yoichi_vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reading_furigana TEXT,
  owner_name TEXT NOT NULL,
  furigana TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  line_id TEXT,
  instagram TEXT,
  address TEXT,
  category TEXT NOT NULL,
  organization_type TEXT DEFAULT 'store',
  organization_name TEXT,
  menu_items TEXT,
  has_food_license BOOLEAN DEFAULT FALSE,
  food_license_number TEXT,
  license_expiry_date TEXT,
  submitted_licenses JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  status_reason TEXT,
  blacklisted_at TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  internal_notes TEXT,
  past_participation_count INTEGER DEFAULT 0,
  past_events JSONB DEFAULT '[]'::jsonb,
  created_at TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 各イベント出店エントリー・ブース割当・料金・消防情報 (yoichi_entries)
CREATE TABLE IF NOT EXISTS public.yoichi_entries (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  vendor_snapshot JSONB NOT NULL,
  booth_area TEXT NOT NULL,
  booth_number TEXT NOT NULL,
  fee JSONB NOT NULL,
  fire_safety JSONB NOT NULL,
  permit_issued BOOLEAN DEFAULT FALSE,
  permit_issued_at TEXT,
  submitted_licenses JSONB DEFAULT '[]'::jsonb,
  entry_status TEXT DEFAULT 'pending',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 検索用インデックスの作成
CREATE INDEX IF NOT EXISTS idx_yoichi_vendors_phone ON public.yoichi_vendors (phone);
CREATE INDEX IF NOT EXISTS idx_yoichi_vendors_name ON public.yoichi_vendors (name);
CREATE INDEX IF NOT EXISTS idx_yoichi_entries_event_id ON public.yoichi_entries (event_id);
CREATE INDEX IF NOT EXISTS idx_yoichi_entries_vendor_id ON public.yoichi_entries (vendor_id);

-- ==============================================================================
-- セキュリティ（Row Level Security: RLS）ポリシーの設定
-- アプリ（Anonキー）から自由に読み書きできるように設定します。
-- ==============================================================================

ALTER TABLE public.yoichi_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yoichi_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yoichi_entries ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーをリセット
DROP POLICY IF EXISTS "Allow anon all on yoichi_events" ON public.yoichi_events;
DROP POLICY IF EXISTS "Allow anon all on yoichi_vendors" ON public.yoichi_vendors;
DROP POLICY IF EXISTS "Allow anon all on yoichi_entries" ON public.yoichi_entries;

-- 匿名ユーザー(Anon)および認証済みユーザーに全操作(SELECT/INSERT/UPDATE/DELETE)を許可
CREATE POLICY "Allow anon all on yoichi_events" ON public.yoichi_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on yoichi_vendors" ON public.yoichi_vendors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on yoichi_entries" ON public.yoichi_entries FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 夜市出店者管理システム：初期データ投入（SEED DATA）
-- Supabaseの「SQL Editor」で実行すると、イベント情報・過去出店店舗・ブース割当が直接登録されます。
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. イベント初期データ（夜市全体 ＆ 直近の夜市イベント）
-- ------------------------------------------------------------------------------
INSERT INTO public.yoichi_events (
  id, name, date, time, venue, organizer, contact_phone, fire_department_name, guidelines_notes, areas, updated_at
) VALUES (
  'event-all',
  '夜市全体',
  '',
  '',
  '全会場 / 出店者マスター',
  '夜市実行委員会',
  '090-0000-0000',
  '所轄消防本部 予防課',
  $$["火気器具を使用するブースは必ず「業務用粉末消火器(10型以上)」を持参・設置してください。","発電機への給油は必ずエンジン停止状態で行い、火気厳禁です。","廃油・ゴミの現地廃棄は一切禁止です。全量持ち帰りを徹底してください。","許可証はブース正面の視認しやすい位置に常時掲示してください。","終了時刻 21:00 以降の販売は厳禁です。22:00完全撤収を厳守してください。"]$$::jsonb,
  $$[{"code":"OUTDOOR","name":"屋外出店（物販・体験）","defaultBaseFee":5000,"description":"物販・ハンドメイド雑貨・展示・体験型ワークショップ"},{"code":"FOOD_STALL","name":"飲食露店","defaultBaseFee":8000,"description":"調理・食品販売・露店（火気器具使用可）"},{"code":"KITCHEN_CAR","name":"キッチンカー","defaultBaseFee":12000,"description":"移動販売車輛スペース（自立営業）"}]$$::jsonb,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  date = EXCLUDED.date,
  time = EXCLUDED.time,
  venue = EXCLUDED.venue,
  organizer = EXCLUDED.organizer,
  contact_phone = EXCLUDED.contact_phone,
  fire_department_name = EXCLUDED.fire_department_name,
  guidelines_notes = EXCLUDED.guidelines_notes,
  areas = EXCLUDED.areas,
  updated_at = NOW();

INSERT INTO public.yoichi_events (
  id, name, date, time, venue, organizer, contact_phone, fire_department_name, guidelines_notes, areas, updated_at
) VALUES (
  'event-tanabe-2026-10',
  '第15回 たなべ夜市（秋の陣）',
  '2026-10-17',
  '16:00 - 21:00 (搬入 14:00〜 / 撤収 22:00完了)',
  '扇ヶ浜公園 海浜特設広場',
  'たなべ夜市実行委員会',
  '090-1234-5678 (本部携帯)',
  '田辺市消防本部 予防課',
  $$["火気器具を使用するブースは必ず「業務用粉末消火器(10型以上)」を手の届く場所に設置すること。","発電機への給油は必ずエンジン停止状態で行い、周囲5m以内での火気使用を禁止します。","廃油・生ゴミの現地廃棄は一切禁止です。各ブースで必ず全量持ち帰りを徹底してください。","許可証はブース正面の客から見える位置、またはスタッフの見やすい位置に常時掲示してください。","終了時刻 21:00 以降の販売は厳禁です。消灯・完全撤収 22:00 を厳守してください。"]$$::jsonb,
  $$[{"code":"OUTDOOR","name":"屋外出店（物販・体験）","defaultBaseFee":5000,"description":"手作り雑貨・アート・ゲーム体験・ワークショップ"},{"code":"FOOD_STALL","name":"飲食露店","defaultBaseFee":8000,"description":"メイン通路沿い・調理および食品販売ブース（火気使用可）"},{"code":"KITCHEN_CAR","name":"キッチンカー","defaultBaseFee":12000,"description":"海沿い特設車輛スペース（自立営業・電源有）"}]$$::jsonb,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  date = EXCLUDED.date,
  time = EXCLUDED.time,
  venue = EXCLUDED.venue,
  organizer = EXCLUDED.organizer,
  contact_phone = EXCLUDED.contact_phone,
  fire_department_name = EXCLUDED.fire_department_name,
  guidelines_notes = EXCLUDED.guidelines_notes,
  areas = EXCLUDED.areas,
  updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 2. 過去出店店舗・一般出店者マスター名簿（10店舗・団体）
-- ------------------------------------------------------------------------------
INSERT INTO public.yoichi_vendors (
  id, name, reading_furigana, owner_name, furigana, phone, email, line_id, instagram, address, category, organization_type, organization_name, menu_items, has_food_license, food_license_number, license_expiry_date, submitted_licenses, status, status_reason, blacklisted_at, tags, internal_notes, past_participation_count, past_events, created_at, updated_at
) VALUES (
  'v-001',
  '黒潮炭火焼き鳥 弁慶',
  'べんけい',
  '山本 健一',
  'ヤマモト ケンイチ',
  '080-9876-1111',
  'benkei.yakitori@example.com',
  'benkei_yakitori',
  '@benkei_yakitori',
  '和歌山県田辺市新庄町1234',
  'food',
  'store',
  NULL,
  '紀州うめどり焼き鳥、牛串、つくね串、生ビール',
  TRUE,
  '和歌保 第012345号',
  '2028-06-30',
  $$[]$$::jsonb,
  'active',
  NULL,
  NULL,
  $$["常連優良店","火気あり(炭火)","人気店"]$$::jsonb,
  '毎回大盛況。消火器も新品持参で防火マナー完璧。',
  8,
  $$["第12回 たなべ夜市","第13回 たなべ夜市","第14回 たなべ夜市"]$$::jsonb,
  '2024-04-01',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  reading_furigana = EXCLUDED.reading_furigana,
  owner_name = EXCLUDED.owner_name,
  furigana = EXCLUDED.furigana,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  line_id = EXCLUDED.line_id,
  instagram = EXCLUDED.instagram,
  address = EXCLUDED.address,
  category = EXCLUDED.category,
  organization_type = EXCLUDED.organization_type,
  organization_name = EXCLUDED.organization_name,
  menu_items = EXCLUDED.menu_items,
  has_food_license = EXCLUDED.has_food_license,
  food_license_number = EXCLUDED.food_license_number,
  license_expiry_date = EXCLUDED.license_expiry_date,
  submitted_licenses = EXCLUDED.submitted_licenses,
  status = EXCLUDED.status,
  status_reason = EXCLUDED.status_reason,
  blacklisted_at = EXCLUDED.blacklisted_at,
  tags = EXCLUDED.tags,
  internal_notes = EXCLUDED.internal_notes,
  past_participation_count = EXCLUDED.past_participation_count,
  past_events = EXCLUDED.past_events,
  updated_at = NOW();

INSERT INTO public.yoichi_vendors (
  id, name, reading_furigana, owner_name, furigana, phone, email, line_id, instagram, address, category, organization_type, organization_name, menu_items, has_food_license, food_license_number, license_expiry_date, submitted_licenses, status, status_reason, blacklisted_at, tags, internal_notes, past_participation_count, past_events, created_at, updated_at
) VALUES (
  'v-002',
  '極旨たこ焼き 蛸源',
  'たこげん',
  '田中 誠一郎',
  'タナカ セイイチロウ',
  '090-3344-5566',
  'takogen.tanabe@example.com',
  NULL,
  '@takogen_tanabe',
  '和歌山県田辺市湊45-6',
  'food',
  'store',
  NULL,
  '大玉たこ焼き（ソース・醤油マヨ・ねぎ塩）、フランクフルト',
  TRUE,
  '和歌保 第024680号',
  '2027-11-15',
  $$[]$$::jsonb,
  'active',
  NULL,
  NULL,
  $$["プロパンガス","長机希望"]$$::jsonb,
  'ガス器具の安全弁点検済み。対応良好。',
  5,
  $$["第11回 たなべ夜市","第13回 たなべ夜市","第14回 たなべ夜市"]$$::jsonb,
  '2024-08-10',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  reading_furigana = EXCLUDED.reading_furigana,
  owner_name = EXCLUDED.owner_name,
  furigana = EXCLUDED.furigana,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  line_id = EXCLUDED.line_id,
  instagram = EXCLUDED.instagram,
  address = EXCLUDED.address,
  category = EXCLUDED.category,
  organization_type = EXCLUDED.organization_type,
  organization_name = EXCLUDED.organization_name,
  menu_items = EXCLUDED.menu_items,
  has_food_license = EXCLUDED.has_food_license,
  food_license_number = EXCLUDED.food_license_number,
  license_expiry_date = EXCLUDED.license_expiry_date,
  submitted_licenses = EXCLUDED.submitted_licenses,
  status = EXCLUDED.status,
  status_reason = EXCLUDED.status_reason,
  blacklisted_at = EXCLUDED.blacklisted_at,
  tags = EXCLUDED.tags,
  internal_notes = EXCLUDED.internal_notes,
  past_participation_count = EXCLUDED.past_participation_count,
  past_events = EXCLUDED.past_events,
  updated_at = NOW();

INSERT INTO public.yoichi_vendors (
  id, name, reading_furigana, owner_name, furigana, phone, email, line_id, instagram, address, category, organization_type, organization_name, menu_items, has_food_license, food_license_number, license_expiry_date, submitted_licenses, status, status_reason, blacklisted_at, tags, internal_notes, past_participation_count, past_events, created_at, updated_at
) VALUES (
  'v-003',
  'Nanairo クレープ＆タピオカ',
  'なないろ',
  '佐々木 萌香',
  'ササキ モエカ',
  '080-2211-9988',
  'info@nanairo-crepe.jp',
  NULL,
  '@nanairo_crepe',
  '和歌山県白浜町332',
  'kitchen_car',
  'store',
  NULL,
  '自家製モチモチクレープ、黒糖タピオカラテ、自家製レモネード',
  TRUE,
  '和歌保 自動車 第9876号',
  '2029-03-31',
  $$[]$$::jsonb,
  'active',
  NULL,
  NULL,
  $$["キッチンカー","電源必須(1500W)","若者に大人気"]$$::jsonb,
  '女性・ファミリー層の集客力が高い。電源容量の確保必須。',
  6,
  $$["第10回 たなべ夜市","第12回 たなべ夜市","第14回 たなべ夜市"]$$::jsonb,
  '2024-05-15',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  reading_furigana = EXCLUDED.reading_furigana,
  owner_name = EXCLUDED.owner_name,
  furigana = EXCLUDED.furigana,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  line_id = EXCLUDED.line_id,
  instagram = EXCLUDED.instagram,
  address = EXCLUDED.address,
  category = EXCLUDED.category,
  organization_type = EXCLUDED.organization_type,
  organization_name = EXCLUDED.organization_name,
  menu_items = EXCLUDED.menu_items,
  has_food_license = EXCLUDED.has_food_license,
  food_license_number = EXCLUDED.food_license_number,
  license_expiry_date = EXCLUDED.license_expiry_date,
  submitted_licenses = EXCLUDED.submitted_licenses,
  status = EXCLUDED.status,
  status_reason = EXCLUDED.status_reason,
  blacklisted_at = EXCLUDED.blacklisted_at,
  tags = EXCLUDED.tags,
  internal_notes = EXCLUDED.internal_notes,
  past_participation_count = EXCLUDED.past_participation_count,
  past_events = EXCLUDED.past_events,
  updated_at = NOW();

INSERT INTO public.yoichi_vendors (
  id, name, reading_furigana, owner_name, furigana, phone, email, line_id, instagram, address, category, organization_type, organization_name, menu_items, has_food_license, food_license_number, license_expiry_date, submitted_licenses, status, status_reason, blacklisted_at, tags, internal_notes, past_participation_count, past_events, created_at, updated_at
) VALUES (
  'v-004',
  '南紀レモネード STAND',
  'なんきれもねーど',
  '林 翔太',
  'ハヤシ ショウタ',
  '070-5555-1234',
  'hayashi@nanki-lemon.com',
  NULL,
  'https://www.instagram.com/nanki_lemonade/',
  '和歌山県田辺市上芳養10',
  'drink',
  'store',
  NULL,
  '地元産生搾りクラフトレモネード、レモンスカッシュ、かき氷',
  TRUE,
  '和歌保 第055432号',
  '2028-09-20',
  $$[]$$::jsonb,
  'active',
  NULL,
  NULL,
  $$["火気なし","電源使用(氷削機)"]$$::jsonb,
  '爽やかで好印象。ゴミ回収マナー良好。',
  3,
  $$["第13回 たなべ夜市","第14回 たなべ夜市"]$$::jsonb,
  '2025-06-01',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  reading_furigana = EXCLUDED.reading_furigana,
  owner_name = EXCLUDED.owner_name,
  furigana = EXCLUDED.furigana,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  line_id = EXCLUDED.line_id,
  instagram = EXCLUDED.instagram,
  address = EXCLUDED.address,
  category = EXCLUDED.category,
  organization_type = EXCLUDED.organization_type,
  organization_name = EXCLUDED.organization_name,
  menu_items = EXCLUDED.menu_items,
  has_food_license = EXCLUDED.has_food_license,
  food_license_number = EXCLUDED.food_license_number,
  license_expiry_date = EXCLUDED.license_expiry_date,
  submitted_licenses = EXCLUDED.submitted_licenses,
  status = EXCLUDED.status,
  status_reason = EXCLUDED.status_reason,
  blacklisted_at = EXCLUDED.blacklisted_at,
  tags = EXCLUDED.tags,
  internal_notes = EXCLUDED.internal_notes,
  past_participation_count = EXCLUDED.past_participation_count,
  past_events = EXCLUDED.past_events,
  updated_at = NOW();

INSERT INTO public.yoichi_vendors (
  id, name, reading_furigana, owner_name, furigana, phone, email, line_id, instagram, address, category, organization_type, organization_name, menu_items, has_food_license, food_license_number, license_expiry_date, submitted_licenses, status, status_reason, blacklisted_at, tags, internal_notes, past_participation_count, past_events, created_at, updated_at
) VALUES (
  'v-005',
  'Kishu Leather & Accessories',
  'きしゅうれざー',
  '中村 彩乃',
  'ナカムラ アヤノ',
  '090-7766-3322',
  'nakamura@kishu-craft.com',
  NULL,
  '@kishu_leather',
  '和歌山県上富田町朝来888',
  'outdoor',
  'store',
  NULL,
  '本革ハンドメイドキーケース・財布、天然石アクセサリー',
  FALSE,
  NULL,
  NULL,
  $$[]$$::jsonb,
  'active',
  NULL,
  NULL,
  $$["火気なし","電源なし","クラフト"]$$::jsonb,
  'ディスプレイが洗練されている。リピーター多数。',
  4,
  $$["第12回 たなべ夜市","第13回 たなべ夜市","第14回 たなべ夜市"]$$::jsonb,
  '2024-10-10',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  reading_furigana = EXCLUDED.reading_furigana,
  owner_name = EXCLUDED.owner_name,
  furigana = EXCLUDED.furigana,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  line_id = EXCLUDED.line_id,
  instagram = EXCLUDED.instagram,
  address = EXCLUDED.address,
  category = EXCLUDED.category,
  organization_type = EXCLUDED.organization_type,
  organization_name = EXCLUDED.organization_name,
  menu_items = EXCLUDED.menu_items,
  has_food_license = EXCLUDED.has_food_license,
  food_license_number = EXCLUDED.food_license_number,
  license_expiry_date = EXCLUDED.license_expiry_date,
  submitted_licenses = EXCLUDED.submitted_licenses,
  status = EXCLUDED.status,
  status_reason = EXCLUDED.status_reason,
  blacklisted_at = EXCLUDED.blacklisted_at,
  tags = EXCLUDED.tags,
  internal_notes = EXCLUDED.internal_notes,
  past_participation_count = EXCLUDED.past_participation_count,
  past_events = EXCLUDED.past_events,
  updated_at = NOW();

INSERT INTO public.yoichi_vendors (
  id, name, reading_furigana, owner_name, furigana, phone, email, line_id, instagram, address, category, organization_type, organization_name, menu_items, has_food_license, food_license_number, license_expiry_date, submitted_licenses, status, status_reason, blacklisted_at, tags, internal_notes, past_participation_count, past_events, created_at, updated_at
) VALUES (
  'v-006',
  '昔なつかし射的＆スーパーボールすくい',
  'むかしなつかし',
  '鈴木 辰男',
  'スズキ タツオ',
  '090-4444-8888',
  'suzuki_ennichi@example.com',
  NULL,
  NULL,
  '和歌山県田辺市新万2-1',
  'outdoor',
  'organization',
  NULL,
  'コルク銃射的、キャラクター人形すくい、光るおもちゃ',
  FALSE,
  NULL,
  NULL,
  $$[]$$::jsonb,
  'active',
  NULL,
  NULL,
  $$["登録団体","縁日","子供向け","角ブース希望"]$$::jsonb,
  '子供に大人気。列ができるため広めのスペース推奨。',
  7,
  $$["第9回 たなべ夜市","第11回 たなべ夜市","第13回 たなべ夜市"]$$::jsonb,
  '2024-01-20',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  reading_furigana = EXCLUDED.reading_furigana,
  owner_name = EXCLUDED.owner_name,
  furigana = EXCLUDED.furigana,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  line_id = EXCLUDED.line_id,
  instagram = EXCLUDED.instagram,
  address = EXCLUDED.address,
  category = EXCLUDED.category,
  organization_type = EXCLUDED.organization_type,
  organization_name = EXCLUDED.organization_name,
  menu_items = EXCLUDED.menu_items,
  has_food_license = EXCLUDED.has_food_license,
  food_license_number = EXCLUDED.food_license_number,
  license_expiry_date = EXCLUDED.license_expiry_date,
  submitted_licenses = EXCLUDED.submitted_licenses,
  status = EXCLUDED.status,
  status_reason = EXCLUDED.status_reason,
  blacklisted_at = EXCLUDED.blacklisted_at,
  tags = EXCLUDED.tags,
  internal_notes = EXCLUDED.internal_notes,
  past_participation_count = EXCLUDED.past_participation_count,
  past_events = EXCLUDED.past_events,
  updated_at = NOW();

INSERT INTO public.yoichi_vendors (
  id, name, reading_furigana, owner_name, furigana, phone, email, line_id, instagram, address, category, organization_type, organization_name, menu_items, has_food_license, food_license_number, license_expiry_date, submitted_licenses, status, status_reason, blacklisted_at, tags, internal_notes, past_participation_count, past_events, created_at, updated_at
) VALUES (
  'v-007',
  'アジアン屋台 ナマステ (要注意)',
  'なますて',
  '松田 洋介',
  'マツダ ヨウスケ',
  '080-6677-8899',
  'matsuda@asian-curry.net',
  NULL,
  '@namaste_tanabe',
  '大阪府泉南市新家44',
  'food',
  'store',
  NULL,
  'タンドリーチキン、スパイスカレー、ナン、マンゴーラッシー',
  TRUE,
  '泉州保 第33211号',
  '2026-12-10',
  $$[]$$::jsonb,
  'warning',
  '【要注意】前回搬入時に2時間の大幅遅刻。また指定分別ゴミ箱に油まみれのダンボールを詰め込み放置した履歴あり。今回は誓約書受領済み。',
  NULL,
  $$["【要注意】","遅刻常習","ゴミ要確認","プロパンガス"]$$::jsonb,
  '味は美味しいが運営ルール順守に難あり。当日はスタッフがゴミ片付けを現地立会で確認すること。',
  2,
  $$["第13回 たなべ夜市","第14回 たなべ夜市"]$$::jsonb,
  '2025-07-01',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  reading_furigana = EXCLUDED.reading_furigana,
  owner_name = EXCLUDED.owner_name,
  furigana = EXCLUDED.furigana,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  line_id = EXCLUDED.line_id,
  instagram = EXCLUDED.instagram,
  address = EXCLUDED.address,
  category = EXCLUDED.category,
  organization_type = EXCLUDED.organization_type,
  organization_name = EXCLUDED.organization_name,
  menu_items = EXCLUDED.menu_items,
  has_food_license = EXCLUDED.has_food_license,
  food_license_number = EXCLUDED.food_license_number,
  license_expiry_date = EXCLUDED.license_expiry_date,
  submitted_licenses = EXCLUDED.submitted_licenses,
  status = EXCLUDED.status,
  status_reason = EXCLUDED.status_reason,
  blacklisted_at = EXCLUDED.blacklisted_at,
  tags = EXCLUDED.tags,
  internal_notes = EXCLUDED.internal_notes,
  past_participation_count = EXCLUDED.past_participation_count,
  past_events = EXCLUDED.past_events,
  updated_at = NOW();

INSERT INTO public.yoichi_vendors (
  id, name, reading_furigana, owner_name, furigana, phone, email, line_id, instagram, address, category, organization_type, organization_name, menu_items, has_food_license, food_license_number, license_expiry_date, submitted_licenses, status, status_reason, blacklisted_at, tags, internal_notes, past_participation_count, past_events, created_at, updated_at
) VALUES (
  'v-008',
  '爆音激辛からあげ 天狗 (※出禁・受付不可)',
  'てんぐ',
  '鬼頭 龍馬',
  'キトウ リュウマ',
  '090-9999-0000',
  'tengu.karaage.danger@example.com',
  NULL,
  NULL,
  '和歌山県海南市1-2-3',
  'food',
  'store',
  NULL,
  '大盛り唐揚げ、メガ盛りポテト',
  FALSE,
  NULL,
  NULL,
  $$[]$$::jsonb,
  'banned',
  '【出禁指定】2025年夏祭りにて消火器未持参でガスフライヤーを勝手に使用し小火騒ぎを起こした。さらに注意した実行委員長に恫喝暴言、使用済み廃油を側溝に流したため永久追放。エントリー受付絶対不可。',
  '2025-08-20',
  $$["【永久出禁】","危険物違反","暴言トラブル","環境汚染"]$$::jsonb,
  '絶対にエントリーを許可しないこと。代表者名や電話番号を変えて応募してくる可能性があるので要注意。',
  1,
  $$["第12回 たなべ夜市(出禁処分)"]$$::jsonb,
  '2024-06-01',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  reading_furigana = EXCLUDED.reading_furigana,
  owner_name = EXCLUDED.owner_name,
  furigana = EXCLUDED.furigana,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  line_id = EXCLUDED.line_id,
  instagram = EXCLUDED.instagram,
  address = EXCLUDED.address,
  category = EXCLUDED.category,
  organization_type = EXCLUDED.organization_type,
  organization_name = EXCLUDED.organization_name,
  menu_items = EXCLUDED.menu_items,
  has_food_license = EXCLUDED.has_food_license,
  food_license_number = EXCLUDED.food_license_number,
  license_expiry_date = EXCLUDED.license_expiry_date,
  submitted_licenses = EXCLUDED.submitted_licenses,
  status = EXCLUDED.status,
  status_reason = EXCLUDED.status_reason,
  blacklisted_at = EXCLUDED.blacklisted_at,
  tags = EXCLUDED.tags,
  internal_notes = EXCLUDED.internal_notes,
  past_participation_count = EXCLUDED.past_participation_count,
  past_events = EXCLUDED.past_events,
  updated_at = NOW();

INSERT INTO public.yoichi_vendors (
  id, name, reading_furigana, owner_name, furigana, phone, email, line_id, instagram, address, category, organization_type, organization_name, menu_items, has_food_license, food_license_number, license_expiry_date, submitted_licenses, status, status_reason, blacklisted_at, tags, internal_notes, past_participation_count, past_events, created_at, updated_at
) VALUES (
  'v-009',
  '串カツ浪花亭 (※出禁・無断キャンセル常習)',
  'なにわてい',
  '坂本 幸治',
  'サカモト コウジ',
  '080-1122-3344',
  'sakamoto.kushikatsu@example.com',
  NULL,
  NULL,
  NULL,
  'food',
  'store',
  NULL,
  '秘伝串カツ盛り合わせ、どて焼き',
  TRUE,
  '大阪保 第55123号',
  NULL,
  $$[]$$::jsonb,
  'banned',
  '【出禁指定】過去2回連続で当日15分前に連絡なしのドタキャン（ブース穴あき損害発生）。出店料も未払い踏み倒しのため出禁処分。',
  '2025-10-05',
  $$["【出禁】","無断ドタキャン","出店料未払い"]$$::jsonb,
  '他イベントでも同様のトラブルを起こしている報告あり。受付不可。',
  2,
  $$["第10回 たなべ夜市","第11回 たなべ夜市(無断欠席)"]$$::jsonb,
  '2024-03-10',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  reading_furigana = EXCLUDED.reading_furigana,
  owner_name = EXCLUDED.owner_name,
  furigana = EXCLUDED.furigana,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  line_id = EXCLUDED.line_id,
  instagram = EXCLUDED.instagram,
  address = EXCLUDED.address,
  category = EXCLUDED.category,
  organization_type = EXCLUDED.organization_type,
  organization_name = EXCLUDED.organization_name,
  menu_items = EXCLUDED.menu_items,
  has_food_license = EXCLUDED.has_food_license,
  food_license_number = EXCLUDED.food_license_number,
  license_expiry_date = EXCLUDED.license_expiry_date,
  submitted_licenses = EXCLUDED.submitted_licenses,
  status = EXCLUDED.status,
  status_reason = EXCLUDED.status_reason,
  blacklisted_at = EXCLUDED.blacklisted_at,
  tags = EXCLUDED.tags,
  internal_notes = EXCLUDED.internal_notes,
  past_participation_count = EXCLUDED.past_participation_count,
  past_events = EXCLUDED.past_events,
  updated_at = NOW();

INSERT INTO public.yoichi_vendors (
  id, name, reading_furigana, owner_name, furigana, phone, email, line_id, instagram, address, category, organization_type, organization_name, menu_items, has_food_license, food_license_number, license_expiry_date, submitted_licenses, status, status_reason, blacklisted_at, tags, internal_notes, past_participation_count, past_events, created_at, updated_at
) VALUES (
  'v-010',
  '扇ヶ浜地域活性化振興会',
  'おうぎがはま',
  '木村 浩二',
  'キムラ コウジ',
  '0739-22-9988',
  'info@ogigahama-shinko.org',
  NULL,
  '@ogigahama_shinko',
  '和歌山県田辺市扇ヶ浜1-1',
  'outdoor',
  'organization',
  NULL,
  '地域特産品PR、観光パンフレット配布、オリジナル梅ジュース試飲・直売',
  FALSE,
  NULL,
  NULL,
  $$[]$$::jsonb,
  'active',
  NULL,
  NULL,
  $$["登録団体","地域振興","広報活動"]$$::jsonb,
  '地域密着の協力団体。夜市本部・安全見回り等にも協力いただいている。',
  10,
  $$["第12回 たなべ夜市","第13回 たなべ夜市","第14回 たなべ夜市"]$$::jsonb,
  '2024-01-10',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  reading_furigana = EXCLUDED.reading_furigana,
  owner_name = EXCLUDED.owner_name,
  furigana = EXCLUDED.furigana,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  line_id = EXCLUDED.line_id,
  instagram = EXCLUDED.instagram,
  address = EXCLUDED.address,
  category = EXCLUDED.category,
  organization_type = EXCLUDED.organization_type,
  organization_name = EXCLUDED.organization_name,
  menu_items = EXCLUDED.menu_items,
  has_food_license = EXCLUDED.has_food_license,
  food_license_number = EXCLUDED.food_license_number,
  license_expiry_date = EXCLUDED.license_expiry_date,
  submitted_licenses = EXCLUDED.submitted_licenses,
  status = EXCLUDED.status,
  status_reason = EXCLUDED.status_reason,
  blacklisted_at = EXCLUDED.blacklisted_at,
  tags = EXCLUDED.tags,
  internal_notes = EXCLUDED.internal_notes,
  past_participation_count = EXCLUDED.past_participation_count,
  past_events = EXCLUDED.past_events,
  updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 3. イベント出店エントリー・ブース割当・料金・消防安全情報（7件）
-- ------------------------------------------------------------------------------
INSERT INTO public.yoichi_entries (
  id, event_id, vendor_id, vendor_snapshot, booth_area, booth_number, fee, fire_safety, permit_issued, permit_issued_at, submitted_licenses, entry_status, notes, updated_at
) VALUES (
  'entry-001',
  'event-tanabe-2026-10',
  'v-001',
  $${"id":"v-001","name":"黒潮炭火焼き鳥 弁慶","readingFurigana":"べんけい","ownerName":"山本 健一","furigana":"ヤマモト ケンイチ","phone":"080-9876-1111","email":"benkei.yakitori@example.com","lineId":"benkei_yakitori","instagram":"@benkei_yakitori","address":"和歌山県田辺市新庄町1234","category":"food","menuItems":"紀州うめどり焼き鳥、牛串、つくね串、生ビール","hasFoodLicense":true,"foodLicenseNumber":"和歌保 第012345号","licenseExpiryDate":"2028-06-30","status":"active","tags":["常連優良店","火気あり(炭火)","人気店"],"internalNotes":"毎回大盛況。消火器も新品持参で防火マナー完璧。","pastParticipationCount":8,"pastEvents":["第12回 たなべ夜市","第13回 たなべ夜市","第14回 たなべ夜市"],"createdAt":"2024-04-01"}$$::jsonb,
  'FOOD_STALL',
  'A-01',
  $${"baseFee":8000,"powerOption":true,"powerFee":1000,"powerWatts":500,"garbageOption":true,"garbageFee":500,"equipmentRentalFee":1000,"discount":0,"totalAmount":11000,"paymentStatus":"paid","paidAt":"2026-09-10","receiptIssued":true,"invoiceNumber":"INV-2026-001"}$$::jsonb,
  $${"hasFireAppliance":true,"appliances":[{"type":"charcoal","name":"業務用木炭焼き台 (120cm)","fuel":"紀州備長炭 10kg","count":1},{"type":"cassette_stove","name":"保温用カセットコンロ","fuel":"カセットボンベ 3本","count":1}],"fireExtinguisher":{"installed":true,"count":1,"type":"ABC粉末消火器 (ヤマトプロテック)","capacity":"10型 3.5kg","manufacturingYear":"2025年製","inspectionValid":true},"submittedDocuments":[{"id":"doc-1","title":"消火器点検表・写真.pdf","uploadedAt":"2026-09-08"},{"id":"doc-2","title":"炭火焼き台配置見取図.pdf","uploadedAt":"2026-09-08"}],"notes":"炭火消火用の火消し壷を必ずブース奥に配置すること。","checkedByStaff":true}$$::jsonb,
  TRUE,
  '2026-09-12',
  $$[]$$::jsonb,
  'confirmed',
  'メイン入口付近の角ブース。集客期待。',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  event_id = EXCLUDED.event_id,
  vendor_id = EXCLUDED.vendor_id,
  vendor_snapshot = EXCLUDED.vendor_snapshot,
  booth_area = EXCLUDED.booth_area,
  booth_number = EXCLUDED.booth_number,
  fee = EXCLUDED.fee,
  fire_safety = EXCLUDED.fire_safety,
  permit_issued = EXCLUDED.permit_issued,
  permit_issued_at = EXCLUDED.permit_issued_at,
  submitted_licenses = EXCLUDED.submitted_licenses,
  entry_status = EXCLUDED.entry_status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO public.yoichi_entries (
  id, event_id, vendor_id, vendor_snapshot, booth_area, booth_number, fee, fire_safety, permit_issued, permit_issued_at, submitted_licenses, entry_status, notes, updated_at
) VALUES (
  'entry-002',
  'event-tanabe-2026-10',
  'v-002',
  $${"id":"v-002","name":"極旨たこ焼き 蛸源","readingFurigana":"たこげん","ownerName":"田中 誠一郎","furigana":"タナカ セイイチロウ","phone":"090-3344-5566","email":"takogen.tanabe@example.com","instagram":"@takogen_tanabe","address":"和歌山県田辺市湊45-6","category":"food","menuItems":"大玉たこ焼き（ソース・醤油マヨ・ねぎ塩）、フランクフルト","hasFoodLicense":true,"foodLicenseNumber":"和歌保 第024680号","licenseExpiryDate":"2027-11-15","status":"active","tags":["プロパンガス","長机希望"],"internalNotes":"ガス器具の安全弁点検済み。対応良好。","pastParticipationCount":5,"pastEvents":["第11回 たなべ夜市","第13回 たなべ夜市","第14回 たなべ夜市"],"createdAt":"2024-08-10"}$$::jsonb,
  'FOOD_STALL',
  'A-02',
  $${"baseFee":8000,"powerOption":false,"powerFee":0,"tentOption":true,"tentCount":1,"tentFee":2000,"garbageOption":true,"garbageFee":500,"equipmentRentalFee":1000,"discount":500,"totalAmount":11000,"paymentStatus":"paid","paidAt":"2026-09-11","receiptIssued":false,"invoiceNumber":"INV-2026-002"}$$::jsonb,
  $${"hasFireAppliance":true,"appliances":[{"type":"propane_gas","name":"4連式大玉たこ焼き器","fuel":"LPガスボンベ 8kg","count":1}],"fireExtinguisher":{"installed":true,"count":1,"type":"ABC粉末消火器","capacity":"10型 3.0kg","manufacturingYear":"2024年製","inspectionValid":true},"submittedDocuments":[{"id":"doc-3","title":"LPガス保安点検票.pdf","uploadedAt":"2026-09-09"}],"notes":"ガスホースの亀裂点検済み、チェーン固定必須。","checkedByStaff":true}$$::jsonb,
  TRUE,
  '2026-09-12',
  $$[]$$::jsonb,
  'confirmed',
  NULL,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  event_id = EXCLUDED.event_id,
  vendor_id = EXCLUDED.vendor_id,
  vendor_snapshot = EXCLUDED.vendor_snapshot,
  booth_area = EXCLUDED.booth_area,
  booth_number = EXCLUDED.booth_number,
  fee = EXCLUDED.fee,
  fire_safety = EXCLUDED.fire_safety,
  permit_issued = EXCLUDED.permit_issued,
  permit_issued_at = EXCLUDED.permit_issued_at,
  submitted_licenses = EXCLUDED.submitted_licenses,
  entry_status = EXCLUDED.entry_status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO public.yoichi_entries (
  id, event_id, vendor_id, vendor_snapshot, booth_area, booth_number, fee, fire_safety, permit_issued, permit_issued_at, submitted_licenses, entry_status, notes, updated_at
) VALUES (
  'entry-003',
  'event-tanabe-2026-10',
  'v-003',
  $${"id":"v-003","name":"Nanairo クレープ＆タピオカ","readingFurigana":"なないろ","ownerName":"佐々木 萌香","furigana":"ササキ モエカ","phone":"080-2211-9988","email":"info@nanairo-crepe.jp","instagram":"@nanairo_crepe","address":"和歌山県白浜町332","category":"kitchen_car","menuItems":"自家製モチモチクレープ、黒糖タピオカラテ、自家製レモネード","hasFoodLicense":true,"foodLicenseNumber":"和歌保 自動車 第9876号","licenseExpiryDate":"2029-03-31","status":"active","tags":["キッチンカー","電源必須(1500W)","若者に大人気"],"internalNotes":"女性・ファミリー層の集客力が高い。電源容量の確保必須。","pastParticipationCount":6,"pastEvents":["第10回 たなべ夜市","第12回 たなべ夜市","第14回 たなべ夜市"],"createdAt":"2024-05-15"}$$::jsonb,
  'KITCHEN_CAR',
  'K-01',
  $${"baseFee":12000,"powerOption":true,"powerFee":1000,"powerWatts":1500,"garbageOption":true,"garbageFee":500,"equipmentRentalFee":0,"discount":0,"totalAmount":14500,"paymentStatus":"billed","receiptIssued":false,"invoiceNumber":"INV-2026-003"}$$::jsonb,
  $${"hasFireAppliance":true,"appliances":[{"type":"generator","name":"インバーター発電機 (防音型)","fuel":"ガソリン 10L (携行缶あり)","count":1},{"type":"electric_fryer","name":"電気クレープ焼き器 (1500W)","fuel":"電気","count":2}],"fireExtinguisher":{"installed":true,"count":1,"type":"ABC粉末消火器 (自動車搭載用)","capacity":"10型 3.5kg","manufacturingYear":"2025年製","inspectionValid":true},"submittedDocuments":[{"id":"doc-4","title":"キッチンカー車輛車検証・営業許可書.pdf","uploadedAt":"2026-09-09"},{"id":"doc-5","title":"消火器搭載写真.pdf","uploadedAt":"2026-09-09"}],"notes":"車両進入は14:30厳守。発電機排気口を歩行者通路に向けないこと。","checkedByStaff":true}$$::jsonb,
  FALSE,
  NULL,
  $$[]$$::jsonb,
  'confirmed',
  NULL,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  event_id = EXCLUDED.event_id,
  vendor_id = EXCLUDED.vendor_id,
  vendor_snapshot = EXCLUDED.vendor_snapshot,
  booth_area = EXCLUDED.booth_area,
  booth_number = EXCLUDED.booth_number,
  fee = EXCLUDED.fee,
  fire_safety = EXCLUDED.fire_safety,
  permit_issued = EXCLUDED.permit_issued,
  permit_issued_at = EXCLUDED.permit_issued_at,
  submitted_licenses = EXCLUDED.submitted_licenses,
  entry_status = EXCLUDED.entry_status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO public.yoichi_entries (
  id, event_id, vendor_id, vendor_snapshot, booth_area, booth_number, fee, fire_safety, permit_issued, permit_issued_at, submitted_licenses, entry_status, notes, updated_at
) VALUES (
  'entry-004',
  'event-tanabe-2026-10',
  'v-004',
  $${"id":"v-004","name":"南紀レモネード STAND","readingFurigana":"なんきれもねーど","ownerName":"林 翔太","furigana":"ハヤシ ショウタ","phone":"070-5555-1234","email":"hayashi@nanki-lemon.com","instagram":"https://www.instagram.com/nanki_lemonade/","address":"和歌山県田辺市上芳養10","category":"drink","menuItems":"地元産生搾りクラフトレモネード、レモンスカッシュ、かき氷","hasFoodLicense":true,"foodLicenseNumber":"和歌保 第055432号","licenseExpiryDate":"2028-09-20","status":"active","tags":["火気なし","電源使用(氷削機)"],"internalNotes":"爽やかで好印象。ゴミ回収マナー良好。","pastParticipationCount":3,"pastEvents":["第13回 たなべ夜市","第14回 たなべ夜市"],"createdAt":"2025-06-01"}$$::jsonb,
  'FOOD_STALL',
  'B-01',
  $${"baseFee":8000,"powerOption":true,"powerFee":1000,"powerWatts":800,"garbageOption":true,"garbageFee":500,"equipmentRentalFee":500,"discount":0,"totalAmount":10500,"paymentStatus":"paid","paidAt":"2026-09-07","receiptIssued":true,"invoiceNumber":"INV-2026-004"}$$::jsonb,
  $${"hasFireAppliance":false,"appliances":[],"fireExtinguisher":{"installed":false,"count":0,"type":"-","capacity":"-","manufacturingYear":"-","inspectionValid":true},"submittedDocuments":[],"notes":"火気不使用。電動氷削機使用。","checkedByStaff":true}$$::jsonb,
  TRUE,
  '2026-09-12',
  $$[]$$::jsonb,
  'confirmed',
  NULL,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  event_id = EXCLUDED.event_id,
  vendor_id = EXCLUDED.vendor_id,
  vendor_snapshot = EXCLUDED.vendor_snapshot,
  booth_area = EXCLUDED.booth_area,
  booth_number = EXCLUDED.booth_number,
  fee = EXCLUDED.fee,
  fire_safety = EXCLUDED.fire_safety,
  permit_issued = EXCLUDED.permit_issued,
  permit_issued_at = EXCLUDED.permit_issued_at,
  submitted_licenses = EXCLUDED.submitted_licenses,
  entry_status = EXCLUDED.entry_status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO public.yoichi_entries (
  id, event_id, vendor_id, vendor_snapshot, booth_area, booth_number, fee, fire_safety, permit_issued, permit_issued_at, submitted_licenses, entry_status, notes, updated_at
) VALUES (
  'entry-005',
  'event-tanabe-2026-10',
  'v-005',
  $${"id":"v-005","name":"Kishu Leather & Accessories","readingFurigana":"きしゅうれざー","ownerName":"中村 彩乃","furigana":"ナカムラ アヤノ","phone":"090-7766-3322","email":"nakamura@kishu-craft.com","instagram":"@kishu_leather","address":"和歌山県上富田町朝来888","category":"outdoor","menuItems":"本革ハンドメイドキーケース・財布、天然石アクセサリー","hasFoodLicense":false,"status":"active","tags":["火気なし","電源なし","クラフト"],"internalNotes":"ディスプレイが洗練されている。リピーター多数。","pastParticipationCount":4,"pastEvents":["第12回 たなべ夜市","第13回 たなべ夜市","第14回 たなべ夜市"],"createdAt":"2024-10-10"}$$::jsonb,
  'OUTDOOR',
  'C-01',
  $${"baseFee":5000,"powerOption":false,"powerFee":0,"garbageOption":false,"garbageFee":0,"equipmentRentalFee":500,"discount":0,"totalAmount":5500,"paymentStatus":"paid","paidAt":"2026-09-05","receiptIssued":true,"invoiceNumber":"INV-2026-005"}$$::jsonb,
  $${"hasFireAppliance":false,"appliances":[],"fireExtinguisher":{"installed":false,"count":0,"type":"-","capacity":"-","manufacturingYear":"-","inspectionValid":true},"submittedDocuments":[],"checkedByStaff":true}$$::jsonb,
  TRUE,
  '2026-09-12',
  $$[]$$::jsonb,
  'confirmed',
  NULL,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  event_id = EXCLUDED.event_id,
  vendor_id = EXCLUDED.vendor_id,
  vendor_snapshot = EXCLUDED.vendor_snapshot,
  booth_area = EXCLUDED.booth_area,
  booth_number = EXCLUDED.booth_number,
  fee = EXCLUDED.fee,
  fire_safety = EXCLUDED.fire_safety,
  permit_issued = EXCLUDED.permit_issued,
  permit_issued_at = EXCLUDED.permit_issued_at,
  submitted_licenses = EXCLUDED.submitted_licenses,
  entry_status = EXCLUDED.entry_status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO public.yoichi_entries (
  id, event_id, vendor_id, vendor_snapshot, booth_area, booth_number, fee, fire_safety, permit_issued, permit_issued_at, submitted_licenses, entry_status, notes, updated_at
) VALUES (
  'entry-006',
  'event-tanabe-2026-10',
  'v-006',
  $${"id":"v-006","name":"昔なつかし射的＆スーパーボールすくい","readingFurigana":"むかしなつかし","ownerName":"鈴木 辰男","furigana":"スズキ タツオ","phone":"090-4444-8888","email":"suzuki_ennichi@example.com","address":"和歌山県田辺市新万2-1","category":"outdoor","menuItems":"コルク銃射的、キャラクター人形すくい、光るおもちゃ","hasFoodLicense":false,"status":"active","organizationType":"organization","tags":["登録団体","縁日","子供向け","角ブース希望"],"internalNotes":"子供に大人気。列ができるため広めのスペース推奨。","pastParticipationCount":7,"pastEvents":["第9回 たなべ夜市","第11回 たなべ夜市","第13回 たなべ夜市"],"createdAt":"2024-01-20"}$$::jsonb,
  'OUTDOOR',
  'C-02',
  $${"baseFee":5000,"powerOption":false,"powerFee":0,"garbageOption":false,"garbageFee":0,"equipmentRentalFee":1500,"discount":0,"totalAmount":6500,"paymentStatus":"unbilled","receiptIssued":false,"invoiceNumber":"INV-2026-006"}$$::jsonb,
  $${"hasFireAppliance":false,"appliances":[],"fireExtinguisher":{"installed":false,"count":0,"type":"-","capacity":"-","manufacturingYear":"-","inspectionValid":true},"submittedDocuments":[],"checkedByStaff":true}$$::jsonb,
  FALSE,
  NULL,
  $$[]$$::jsonb,
  'confirmed',
  NULL,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  event_id = EXCLUDED.event_id,
  vendor_id = EXCLUDED.vendor_id,
  vendor_snapshot = EXCLUDED.vendor_snapshot,
  booth_area = EXCLUDED.booth_area,
  booth_number = EXCLUDED.booth_number,
  fee = EXCLUDED.fee,
  fire_safety = EXCLUDED.fire_safety,
  permit_issued = EXCLUDED.permit_issued,
  permit_issued_at = EXCLUDED.permit_issued_at,
  submitted_licenses = EXCLUDED.submitted_licenses,
  entry_status = EXCLUDED.entry_status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO public.yoichi_entries (
  id, event_id, vendor_id, vendor_snapshot, booth_area, booth_number, fee, fire_safety, permit_issued, permit_issued_at, submitted_licenses, entry_status, notes, updated_at
) VALUES (
  'entry-007',
  'event-tanabe-2026-10',
  'v-007',
  $${"id":"v-007","name":"アジアン屋台 ナマステ (要注意)","readingFurigana":"なますて","ownerName":"松田 洋介","furigana":"マツダ ヨウスケ","phone":"080-6677-8899","email":"matsuda@asian-curry.net","instagram":"@namaste_tanabe","address":"大阪府泉南市新家44","category":"food","menuItems":"タンドリーチキン、スパイスカレー、ナン、マンゴーラッシー","hasFoodLicense":true,"foodLicenseNumber":"泉州保 第33211号","licenseExpiryDate":"2026-12-10","status":"warning","statusReason":"【要注意】前回搬入時に2時間の大幅遅刻。また指定分別ゴミ箱に油まみれのダンボールを詰め込み放置した履歴あり。今回は誓約書受領済み。","tags":["【要注意】","遅刻常習","ゴミ要確認","プロパンガス"],"internalNotes":"味は美味しいが運営ルール順守に難あり。当日はスタッフがゴミ片付けを現地立会で確認すること。","pastParticipationCount":2,"pastEvents":["第13回 たなべ夜市","第14回 たなべ夜市"],"createdAt":"2025-07-01"}$$::jsonb,
  'FOOD_STALL',
  'A-03',
  $${"baseFee":8000,"powerOption":false,"powerFee":0,"garbageOption":true,"garbageFee":1000,"equipmentRentalFee":1000,"discount":0,"totalAmount":10000,"paymentStatus":"unbilled","receiptIssued":false,"invoiceNumber":"INV-2026-007"}$$::jsonb,
  $${"hasFireAppliance":true,"appliances":[{"type":"propane_gas","name":"タンドール用ガスバーナー","fuel":"LPガス 5kg","count":1}],"fireExtinguisher":{"installed":true,"count":1,"type":"ABC粉末消火器","capacity":"10型 3.0kg","manufacturingYear":"2023年製","inspectionValid":true},"submittedDocuments":[],"notes":"【誓約書確認要】油廃棄・ゴミ回収の誓約書をまだ受領していないため確認必須！","checkedByStaff":false}$$::jsonb,
  FALSE,
  NULL,
  $$[]$$::jsonb,
  'pending',
  '【要注意出店者】誓約書と消火器の現物確認が済むまで許可証発行禁止！',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  event_id = EXCLUDED.event_id,
  vendor_id = EXCLUDED.vendor_id,
  vendor_snapshot = EXCLUDED.vendor_snapshot,
  booth_area = EXCLUDED.booth_area,
  booth_number = EXCLUDED.booth_number,
  fee = EXCLUDED.fee,
  fire_safety = EXCLUDED.fire_safety,
  permit_issued = EXCLUDED.permit_issued,
  permit_issued_at = EXCLUDED.permit_issued_at,
  submitted_licenses = EXCLUDED.submitted_licenses,
  entry_status = EXCLUDED.entry_status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

