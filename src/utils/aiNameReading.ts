import { Vendor } from '../types';
import { getStoredGeminiApiKey, getStoredGeminiModel } from './gemini';

/**
 * 日本語カタカナをひらがなに変換する
 */
export function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * 英語・ローマ字の一般的な音訳マッピング（屋号によくある英語）
 */
const ROMAJI_AND_ENGLISH_MAP: Record<string, string> = {
  nanairo: 'なないろ',
  kishu: 'きしゅう',
  leather: 'れざー',
  accessories: 'あくせさりー',
  coffee: 'こーひー',
  cafe: 'かふぇ',
  café: 'かふぇ',
  stand: 'すたんど',
  bar: 'ばー',
  kitchen: 'きっちん',
  car: 'かー',
  crepe: 'くれーぷ',
  lemonade: 'れもねーど',
  craft: 'くらふと',
  sweets: 'すいーつ',
  bakery: 'べーかりー',
  bread: 'ぶれっど',
  shop: 'しょっぷ',
  store: 'すとあ',
  tacos: 'たこす',
  curry: 'かれー',
  pizza: 'ぴざ',
  burger: 'ばーがー',
  tea: 'てぃー',
  ice: 'あいす',
  cream: 'くりーむ',
  flower: 'ふらわー',
  workshop: 'わーくしょっぷ',
  atelier: 'あとりえ',
  studio: 'すたじお',
  lululu: 'るるる',
  benkei: 'べんけい'
};

/**
 * 屋号によく使われる漢字・言葉の読み仮名辞書（オフラインAI推論用）
 */
const KANJI_READING_DICT: Record<string, string> = {
  弁慶: 'べんけい',
  蛸源: 'たこげん',
  天狗: 'てんぐ',
  浪花亭: 'なにわてい',
  浪花: 'なにわ',
  扇ヶ浜: 'おうぎがはま',
  南紀: 'なんき',
  紀州: 'きしゅう',
  田辺: 'たなべ',
  白浜: 'しらはま',
  新庄: 'しんじょう',
  熊野: 'くまの',
  和歌山: 'わかやま',
  黒潮: 'くろしお',
  射的: 'しゃてき',
  炭火: 'すみび',
  焼き鳥: 'やきとり',
  焼鳥: 'やきとり',
  たこ焼き: 'たこやき',
  たこ焼: 'たこやき',
  唐揚げ: 'からあげ',
  からあげ: 'からあげ',
  空揚げ: 'からあげ',
  昔なつかし: 'むかしなつかし',
  振興会: 'しんこうかい',
  活性化: 'かっせいか'
};

/**
 * 屋号から修飾語・業態・注意書きを取り除き、AI判断で店名の本体を特定する
 */
export function extractCoreVendorName(name: string): string {
  if (!name) return '';

  // 1. 括弧内の注記（出禁、要注意、秋の陣、店舗、等）を削除
  let clean = name
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/【[^】]*】/g, '')
    .trim();

  // 2. プレフィックスの装飾語・業態語（スペース区切りや前置詞）をAI判定で整理
  const prefixPatterns = [
    /^(極旨|絶品|本場|元祖|本格|特製|秘伝|老舗|手作り|手づくり|名物|爆音激辛|炭火|備長炭)\s*/i,
    /^(アジアン屋台|屋台|露店|移動販売|キッチンカー|フードトラック|カフェ|喫茶|珈琲|Coffee\s*Stand)\s*/i,
    /^(黒潮炭火焼き鳥|炭火焼き鳥|炭火焼鳥|焼き鳥|焼鳥|たこ焼き|串カツ|からあげ|唐揚げ)\s*/i
  ];

  for (const pattern of prefixPatterns) {
    clean = clean.replace(pattern, '').trim();
  }

  return clean || name;
}

/**
 * オフラインAIエンジン：店名から五十音ソート用の読み仮名（ひらがな）を推論する
 */
export function inferReadingOffline(name: string): string {
  if (!name) return '';

  // 1. 店名のコア部分を抽出
  const coreName = extractCoreVendorName(name);

  // 2. 辞書に一致するものがあれば優先適用
  for (const [kanji, kana] of Object.entries(KANJI_READING_DICT)) {
    if (coreName.includes(kanji)) {
      // コア名の中で辞書語を置換
      return kana;
    }
  }

  // 3. 英語・ローマ字の単語チェック
  const words = coreName.toLowerCase().split(/[\s&・_/-]+/);
  const matchedWords: string[] = [];
  for (const w of words) {
    if (ROMAJI_AND_ENGLISH_MAP[w]) {
      matchedWords.push(ROMAJI_AND_ENGLISH_MAP[w]);
    }
  }
  if (matchedWords.length > 0) {
    return matchedWords.join('');
  }

  // 4. ひらがな・カタカナのみの場合はひらがなに正規化
  const kanaOnly = katakanaToHiragana(coreName).replace(/[^ぁ-ん]/g, '');
  if (kanaOnly.length > 0) {
    return kanaOnly;
  }

  // 5. 元の店名から辞書マッチング
  for (const [kanji, kana] of Object.entries(KANJI_READING_DICT)) {
    if (name.includes(kanji)) {
      return kana;
    }
  }

  // 6. 最終フォールバック：カタカナをひらがなに変換した文字列
  const fallback = katakanaToHiragana(coreName).toLowerCase();
  return fallback;
}

/**
 * Gemini AIによる屋号の五十音読み判定
 * （オンライン時はGeminiの自然言語理解を活用し、オフライン時は自動フォールバック）
 */
export async function inferVendorReadingWithAi(vendorName: string, clientApiKey?: string): Promise<string> {
  const offlineResult = inferReadingOffline(vendorName);
  const key = clientApiKey || getStoredGeminiApiKey();

  if (!key) {
    return offlineResult;
  }

  try {
    const prompt = `以下の出店者・屋号について、五十音順（あいうえお順）に並べ替えるための正式な「読み仮名（すべて全角ひらがな）」を判定してください。
「極旨」「炭火焼き」「本格」「アジアン屋台」などの装飾句・枕詞がある場合は、店名の主要本体（例: 極旨たこ焼き 蛸源 → たこげん、黒潮炭火焼き鳥 弁慶 → べんけい、Coffee Stand Lululu → るるる）の読みを最優先してください。
回答はひらがなのみ（解説や記号は不要）で出力してください。

出店者名: "${vendorName}"`;

    const model = getStoredGeminiModel() || 'gemini-flash-latest';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 20 }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
        // ひらがな・カタカナ部分を抽出してひらがなに変換
        const cleaned = katakanaToHiragana(text.replace(/[^ぁ-んァ-ヶ]/g, ''));
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    }
  } catch (e) {
    console.warn('AI reading inference fallback to offline:', e);
  }

  return offlineResult;
}

/**
 * 出店者から五十音ソート用の読み仮名（ひらがな）を取得する
 * 1. 明示的に設定された readingFurigana
 * 2. 代表者 furigana からの推論
 * 3. AI・ヒューリスティックによる屋号名からの推論
 */
export function getVendorReading(vendor: Partial<Vendor>): string {
  if (vendor.readingFurigana && vendor.readingFurigana.trim()) {
    return katakanaToHiragana(vendor.readingFurigana.trim());
  }
  return inferReadingOffline(vendor.name || '');
}

/**
 * 読み仮名の先頭文字から五十音の「行」を判定する（あ行、か行、さ行...）
 */
export function getKanaInitialGroup(reading: string): string {
  if (!reading) return 'その他';

  const firstChar = katakanaToHiragana(reading.trim())[0];
  if (!firstChar) return 'その他';

  if (/[あいうえおぁぃぅぇぉ]/.test(firstChar)) return 'あ行';
  if (/[かきくけこがぎぐげごカキクケコガギグゲゴ]/.test(firstChar)) return 'か行';
  if (/[さしすせそざじずぜぞサシスセソザジズゼゾ]/.test(firstChar)) return 'さ行';
  if (/[たちつてとだぢづでどタチツテトダヂヅデドっ]/.test(firstChar)) return 'た行';
  if (/[なにぬねのナニヌネノ]/.test(firstChar)) return 'な行';
  if (/[はひふへほばびぶべぼぱぴぷぺぽハヒフヘホバビブベボパピプペポ]/.test(firstChar)) return 'は行';
  if (/[まみむめもマミムメモ]/.test(firstChar)) return 'ま行';
  if (/[やゆよゃゅょヤユヨャュョ]/.test(firstChar)) return 'や行';
  if (/[らりるれろラリルレロ]/.test(firstChar)) return 'ら行';
  if (/[わをんワヲン]/.test(firstChar)) return 'わ行';
  if (/[a-zA-Z0-9]/.test(firstChar)) return '英数';

  return 'その他';
}

/**
 * 出店者リストを五十音順（あいうえお順）に並べ替える
 */
export function sortVendorsByJapaneseAlphabet(vendors: Vendor[]): Vendor[] {
  return [...vendors].sort((a, b) => {
    const readingA = getVendorReading(a);
    const readingB = getVendorReading(b);

    // 日本語の標準照合規則（Intl.Collator）で五十音順ソート
    const cmp = readingA.localeCompare(readingB, 'ja', { sensitivity: 'base' });
    if (cmp !== 0) return cmp;

    // 読みが同じ場合は店名そのもので比較
    return a.name.localeCompare(b.name, 'ja');
  });
}
