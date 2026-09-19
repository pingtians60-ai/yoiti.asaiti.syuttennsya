import { NightMarketEvent, Vendor, EventEntry } from '../types';

export const GEMINI_API_KEY_STORAGE = 'yoiti_gemini_api_key';
export const GEMINI_MODEL_STORAGE = 'yoiti_gemini_model';

export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

export interface GeminiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isQuickAction?: boolean;
}

export function getStoredGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setStoredGeminiApiKey(key: string): void {
  try {
    if (!key) {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    } else {
      localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
    }
  } catch (e) {
    console.error('Failed to save Gemini API key:', e);
  }
}

export function getStoredGeminiModel(): string {
  try {
    return localStorage.getItem(GEMINI_MODEL_STORAGE) || DEFAULT_GEMINI_MODEL;
  } catch {
    return DEFAULT_GEMINI_MODEL;
  }
}

export function setStoredGeminiModel(model: string): void {
  try {
    localStorage.setItem(GEMINI_MODEL_STORAGE, model);
  } catch (e) {
    console.error('Failed to save Gemini model:', e);
  }
}

/**
 * 現在の夜市・出店者情報からAI用コンテキストプロンプトを構築する
 */
export function buildNightMarketContext(
  event: NightMarketEvent,
  vendors: Vendor[],
  entries: EventEntry[]
): string {
  const currentEventEntries = entries.filter(
    (e) => e.eventId === event.id || (!e.eventId && event.id === 'event-all')
  );

  const totalVendors = vendors.length;
  const currentEntriesCount = currentEventEntries.length;

  // カテゴリ別集計
  const categoryCounts: Record<string, number> = {};
  vendors.forEach((v) => {
    categoryCounts[v.category] = (categoryCounts[v.category] || 0) + 1;
  });

  // 火気使用状況
  const fireEntries = currentEventEntries.filter((e) => e.fireSafety?.hasFireAppliance);
  const appliancesList = fireEntries.map((e) => {
    const v = vendors.find((v) => v.id === e.vendorId) || e.vendorSnapshot;
    const apps = e.fireSafety.appliances.map((a) => `${a.name}(${a.fuel}×${a.count})`).join(', ');
    return `- ${v?.name || '名称未設定'} [ブース: ${e.boothNumber || '未定'}]: ${apps || '器具詳細未記入'}, 消火器: ${e.fireSafety.fireExtinguisher?.installed ? '設置有' : '未設置'}, スタッフ点検: ${e.fireSafety.checkedByStaff ? '点検済' : '未点検'}`;
  });

  // 未払い状況
  const unpaidEntries = currentEventEntries.filter((e) => e.fee?.paymentStatus !== 'paid');
  const unpaidList = unpaidEntries.map((e) => {
    const v = vendors.find((v) => v.id === e.vendorId) || e.vendorSnapshot;
    return `- ${v?.name || '名称未設定'}: 請求額 ¥${e.fee?.totalAmount?.toLocaleString() || 0} (${e.fee?.paymentStatus === 'unbilled' ? '未請求' : '請求済・未入金'})`;
  });

  // 出禁・要注意店舗
  const warningOrBanned = vendors.filter((v) => v.status === 'warning' || v.status === 'banned');
  const warningList = warningOrBanned.map((v) => {
    return `- ${v.name} (${v.status === 'banned' ? '【出禁】' : '【要注意】'}): 理由「${v.statusReason || '記載なし'}」`;
  });

  // 主な出店者と品目（最大15件抜粋）
  const sampleVendors = vendors.slice(0, 15).map((v) => {
    return `- ${v.name} (${v.category}): 販売品目「${v.menuItems || '未設定'}」`;
  });

  return `
【夜市出店者管理システム 現在の稼働データ】
■ イベント概要
- イベント名: ${event.name}
- 開催日: ${event.date}
- 開催時間: ${event.time}
- 場所: ${event.venue || '扇ヶ浜周辺'}
- 登録出店者総数: ${totalVendors}件
- 本イベント出店ブース数: ${currentEntriesCount}ブース

■ 出店ジャンル内訳
${Object.entries(categoryCounts)
  .map(([cat, count]) => `  - ${cat}: ${count}件`)
  .join('\n')}

■ 火気使用店舗（全${fireEntries.length}件）
${appliancesList.length > 0 ? appliancesList.join('\n') : '  火気使用店舗はありません。'}

■ 出店料未納・未請求リスト（全${unpaidEntries.length}件）
${unpaidList.length > 0 ? unpaidList.join('\n') : '  未納店舗はありません（すべて入金完了）。'}

■ 出禁・要注意店舗リスト（全${warningOrBanned.length}件）
${warningList.length > 0 ? warningList.join('\n') : '  要注意・出禁店舗はありません。'}

■ 出店者と品目サンプル（抜粋）
${sampleVendors.join('\n')}
`;
}

/**
 * サーバー側（裏側）のAIステータスを取得
 */
export async function checkServerAiStatus(): Promise<{ hasServerKey: boolean; configuredModel?: string }> {
  try {
    const res = await fetch('/api/ai/status');
    if (res.ok) {
      const data = await res.json();
      return { hasServerKey: !!data.hasServerKey, configuredModel: data.configuredModel };
    }
  } catch {
    // サーバーエンドポイントがない場合はクライアント単体モードとして扱う
  }
  return { hasServerKey: false };
}

export interface VendorAiInspectionResult {
  category: 'food' | 'drink' | 'kitchen_car' | 'goods' | 'game' | 'other';
  hasFireAppliance: boolean;
  requiresFireExtinguisher: boolean;
  fireSafetyRisk: 'high' | 'medium' | 'none';
  suggestedAppliances: { name: string; fuel: string }[];
  reason: string;
}

/**
 * 出店者の屋号・品目から、裏でAIが自動的に火気リスクやカテゴリを推論する
 */
export async function inspectVendorWithAi(
  name: string,
  menuItems: string,
  clientApiKey?: string
): Promise<VendorAiInspectionResult> {
  const key = clientApiKey || getStoredGeminiApiKey();

  try {
    const res = await fetch('/api/ai/inspect-vendor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, menuItems, clientApiKey: key }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        return data.result;
      }
    }
  } catch (err) {
    console.warn('Backend AI inspect failed, using fallback:', err);
  }

  // クライアント側フォールバック（ヒューリスティック判定）
  const text = `${name} ${menuItems}`.toLowerCase();
  const isKitchenCar = /キッチンカー|フードトラック|移動販売車/.test(text);
  const isDrink = /ドリンク|ジュース|珈琲|コーヒー|お茶|タピオカ|ビール|酒/.test(text) && !/焼き|揚げ/.test(text);
  const isGame = /射的|スーパーボール|くじ|ヨーヨー|輪投げ/.test(text);
  const isGoods = /雑貨|アクセサリ|ハンドメイド|服|工芸/.test(text);

  let category: VendorAiInspectionResult['category'] = 'food';
  if (isKitchenCar) category = 'kitchen_car';
  else if (isDrink) category = 'drink';
  else if (isGame) category = 'game';
  else if (isGoods) category = 'goods';

  const hasFire = /焼き|揚げ|たこ焼き|クレープ|ラーメン|ステーキ|炭火|フライヤー|ガス|コンロ|発電機/.test(text);

  return {
    category,
    hasFireAppliance: hasFire,
    requiresFireExtinguisher: hasFire,
    fireSafetyRisk: hasFire ? 'high' : 'none',
    suggestedAppliances: hasFire ? [{ name: '加熱調理器具 (推定)', fuel: 'LPガス / 電気' }] : [],
    reason: hasFire ? `品目「${menuItems}」から加熱器具の使用が推測されます。` : '火気の使用は見当たりません。'
  };
}

/**
 * Gemini APIへのリクエストを送信する（裏側サーバーAPI優先）
 */
export async function callGeminiApi(
  userPrompt: string,
  systemContext: string,
  apiKey: string,
  modelName: string = DEFAULT_GEMINI_MODEL
): Promise<string> {
  // 1. まず裏側のバックエンドAPI (/api/ai/chat) へリクエスト
  try {
    const backendRes = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        systemContext,
        model: modelName,
        clientApiKey: apiKey
      }),
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.ok && data.text) {
        return data.text;
      }
    }
  } catch {
    // バックエンド通信が失敗した場合は直接Google APIへフォールバック
  }

  // 2. 直接Google APIを呼び出し（フォールバック）
  if (!apiKey) {
    throw new Error('APIキーが設定されていません。裏側(.env)またはブラウザ設定で登録してください。');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `あなたは「夜市出店者管理システム」の優秀な専属AI運営アドバイザー「Gemini（ジェミニ）」です。
夜市・朝市などの地域イベントの出店者管理、ブース配置、消防安全、出店料回収、出店者への連絡メール・LINE文面作成、集客アドバイスを専門としています。

以下の現在の夜市のリアルタイムデータを参照し、質問や要望に対して具体的、親切、的確、かつ実用的に日本語で回答してください。
装飾や箇条書きを活用して読みやすく、コピーしてそのまま使える文章やアドバイスを提供してください。

${systemContext}

---
ユーザーの指示・質問:
${userPrompt}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `HTTPエラー ${response.status}: ${response.statusText}`;
    throw new Error(`Gemini API呼び出しに失敗しました: ${message}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Geminiからの回答が空でした。再度お試しください。');
  }

  return text;
}

/**
 * APIキー未設定時などに使用する、データに連動した高品質なデモ応答ジェネレーター
 */
export function generateMockGeminiResponse(
  prompt: string,
  event: NightMarketEvent,
  vendors: Vendor[],
  entries: EventEntry[]
): string {
  const p = prompt.toLowerCase();

  const currentEventEntries = entries.filter(
    (e) => e.eventId === event.id || (!e.eventId && event.id === 'event-all')
  );
  const unpaidCount = currentEventEntries.filter((e) => e.fee?.paymentStatus !== 'paid').length;
  const fireCount = currentEventEntries.filter((e) => e.fireSafety?.hasFireAppliance).length;
  const warningCount = vendors.filter((v) => v.status === 'warning' || v.status === 'banned').length;

  if (p.includes('要約') || p.includes('状況') || p.includes('まとめ') || p.includes('サマリー')) {
    return `### 🏮「${event.name}」の開催・出店状況サマリー（AI分析）

現在の登録状況および優先対応が必要なタスクをまとめました。

1. **出店規模**: 
   - 登録出店者数: **${vendors.length}件** / 本イベント出店ブース: **${currentEventEntries.length}ブース**
2. **消防安全確認 (${fireCount}店舗)**:
   - 火気使用（LPガス・炭火・発電機等）を行う店舗が **${fireCount}件** あります。
   - ${fireCount > 0 ? '消火器の設置義務（10型ABC消火器等）および消防署への届出書類・点検票の回収状況を「消防安全」画面で確認してください。' : '現在火気使用店舗はありません。'}
3. **出店料の入金状況**:
   - 未納・未請求の店舗が **${unpaidCount}件** あります。${unpaidCount > 0 ? '早めのリマインド通知をおすすめします。' : '全店舗の支払いが完了しており順調です！'}
4. **注意・リスク管理**:
   - 出禁・要注意に指定されている出店者が **${warningCount}件** 登録されています。

> 💡 **Geminiからのアドバイス**:
> 次回告知やブース配置の確定を進めると同時に、火気使用店舗の安全点検を完了させましょう！`;
  }

  if (p.includes('催促') || p.includes('未払い') || p.includes('請求') || p.includes('入金')) {
    return `### ✉️ 出店料未払い店舗へのリマインド文面案（LINE・メール用）

以下の文面をコピーし、店舗名や振込先を書き換えてそのまま送信いただけます。

---
**件名: 【重要】${event.name} 出店料のお振込みに関するご案内**

◯◯（出店者様 屋号）
代表 ◯◯様

いつも大変お世話になっております。夜市実行委員会です。
この度は「${event.name}」への出店お申し込みをいただき誠にありがとうございます。

出店に伴う出店料のお支払いにつきまして、期日が近づいておりますのでご連絡いたしました。

■ イベント名: ${event.name}
■ 開催日: ${event.date} (${event.time})
■ ご請求金額: ¥[請求金額]
■ お支払い期日: [期日を入力]
■ お振込先口座:
  [銀行名・支店名・口座番号・口座名義]

※既にお手続き済みの場合、行き違いのご連絡となりましたことをご容赦ください。
ご不明な点がございましたら、お気軽に本連絡までご返信ください。

何卒よろしくお願い申し上げます。
夜市実行委員会
---`;
  }

  if (p.includes('消防') || p.includes('火気') || p.includes('消火器') || p.includes('安全')) {
    return `### 🔥 消防安全・火気チェックのポイントと対策

「${event.name}」には火気使用店舗が **${fireCount}件** 含まれています。管轄消防署の指導に即したチェックポイントです。

1. **消火器の設置（必須）**
   - 火気（LPガスコンロ、炭火、発電機、電気フライヤーなど）を使用する全ブースに、**業務用消火器（粉末ABC・10型以上推奨）**の設置が必要です。
   - 点検期限（製造後10年以内・変形や腐食のないもの）を現地で目視確認してください。
2. **燃料の取り扱いと離隔距離**
   - LPガスボンベは直射日光を避け、転倒防止（鎖やバンド等）を施してください。
   - コンロ周囲に燃えやすい段ボールやプラカップを置かないよう、**火源から周囲1m以上の離隔距離**を確保させます。
3. **発電機の給油注意**
   - ガソリン発電機への給油は**必ずエンジンを停止し、十分に冷えてから**行うよう事前に周知してください。

> 📌 **書類確認**: 出店者管理システムの「消防安全」タブから、提出書類とスタッフ点検チェックを済ませておくと安心です。`;
  }

  if (p.includes('募集') || p.includes('告知') || p.includes('sns') || p.includes('instagram') || p.includes('line')) {
    return `### 📱 夜市出店募集 / 来場告知のSNS・LINE投稿文案

Instagramや公式LINEでそのまま使える文面案を作成しました。

---
🏮 **【出店者大募集！】「${event.name}」開催決定！** 🏮

潮風香る開放的な空間で、一緒に夜市を盛り上げてくださる出店者様を募集します！✨
グルメ・スイーツ・ハンドメイド雑貨・体験型ワークショップなど、多彩なご出店をお待ちしております！

📅 **開催日程**: ${event.date} (${event.time})
📍 **開催場所**: ${event.venue || '扇ヶ浜特設会場'}
👥 **募集ブース数**: 限定ブース（定員に達し次第締切）

美味しい香りと提灯の灯りが広がる特別な夜を、一緒につくりませんか？
出店希望の方はプロフィールのリンク（Googleフォーム）よりお気軽にご応募ください！

皆様のご応募を心よりお待ちしております！

#夜市 #出店者募集 #フードトラック #キッチンカー #ハンドメイド #マーケット #マルシェ #地域の輪
---`;
  }

  if (p.includes('配置') || p.includes('ブース') || p.includes('レイアウト')) {
    return `### 💡 ブース配置とレイアウトの最適化アドバイス

登録出店者数 **${vendors.length}件** に基づく配置計画のヒントです。

1. **火気使用店舗・キッチンカーの集中配置**:
   - 火気店舗（${fireCount}件）は、風下や避難経路・水回り（消火栓）に近い外周エリア（FOOD_STALL / KITCHEN_CARエリア）にまとめると、消防点検や配線がスムーズです。
2. **競合メニューの分散**:
   - 例えば「たこ焼き」「から揚げ」「ドリンク」などの主力同種メニューが隣接しないよう、物販（GOODS）やワークショップ（WORKSHOP）を間に挟むと全体の回遊性が高まります。
3. **電源供給ルートの確保**:
   - 発電機や電源コードを這わせる通路には、来場者の転倒を防ぐケーブルプロテクターやマットを設置してください。

> 「出店・ブース管理」タブからドラッグ＆ドロップ感覚でブース番号を割り振れます。`;
  }

  // デフォルト応答
  return `### 🤖 Gemini 夜市運営アシスタントへようこそ！

「${event.name}」（${event.date}）の管理データ（出店者: ${vendors.length}件 / 未納: ${unpaidCount}件 / 火気: ${fireCount}件）を読み込みました。

以下のようなサポートが可能です。画面のボタンを押すか、自由に入力してください：

- 📊 **「出店状況を要約して」**: 現在の参加状況や残タスクを即座にレポート
- ✉️ **「未納出店者への催促文を作って」**: メールやLINEで送れる丁寧な文面作成
- 🔥 **「消防安全のチェックポイントは？」**: 火気器具や消火器の指導ポイント
- 💡 **「ブース配置のコツを教えて」**: 同種店舗の分散や動線配慮のアドバイス
- 📱 **「SNS出店募集文を作って」**: Instagramや告知用テキストの生成

*(※Google AI Studioで取得したAPIキーを設定すると、さらに自由で高度なオリジナル回答が得られます。)*`;
}
