import type { IncomingMessage, ServerResponse } from 'http';

export interface VendorInspectionResult {
  category: 'kitchen_car' | 'food' | 'outdoor';
  hasFireAppliance: boolean;
  requiresFireExtinguisher: boolean;
  fireSafetyRisk: 'high' | 'medium' | 'none';
  suggestedAppliances: { name: string; fuel: string }[];
  reason: string;
}

/**
 * リクエストボディをJSONとしてパースするヘルパー
 */
function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * JSONレスポンスを返すヘルパー
 */
function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

/**
 * AI未設定時の高精度ヒューリスティック判定（フォールバック）
 */
function fallbackInspectVendor(name: string, menu: string): VendorInspectionResult {
  const text = `${name} ${menu}`.toLowerCase();

  const isKitchenCar = /キッチンカー|フードトラック|移動販売車|号車/.test(text);
  const isOutdoor = /雑貨|アクセサリ|ハンドメイド|服|工芸|植物|花|ワークショップ|体験|射的|スーパーボール|くじ|ヨーヨー|輪投げ|おもちゃ|ガチャ|物販/.test(text) && !/たこ焼き|焼きそば|お好み焼き|串焼き|焼き鳥|ステーキ|から揚げ|唐揚げ|フライドポテト|ラーメン|餃子|天ぷら|フランクフルト|五平餅|ビール|酒|ドリンク|珈琲/.test(text);

  let category: VendorInspectionResult['category'] = 'food';
  if (isKitchenCar) category = 'kitchen_car';
  else if (isOutdoor) category = 'outdoor';

  // 火気判定
  const needsGas = /たこ焼き|焼きそば|お好み焼き|串焼き|焼き鳥|ステーキ|から揚げ|唐揚げ|フライドポテト|ラーメン|餃子|天ぷら|フランクフルト|五平餅/.test(text);
  const needsElectric = /クレープ|ワッフル|ベビーカステラ|ホットサンド|チュロス|ポテト/.test(text);
  const needsCharcoal = /炭火|鮎|七輪|バーベキュー|bbq/.test(text);

  const hasFire = needsGas || needsElectric || needsCharcoal;
  const requiresExtinguisher = hasFire;

  const suggestedAppliances: { name: string; fuel: string }[] = [];
  if (needsGas) {
    suggestedAppliances.push({ name: '業務用ガスコンロ / 鉄板焼器', fuel: 'LPガス (プロパン)' });
  }
  if (needsElectric) {
    suggestedAppliances.push({ name: '電気クレープ焼き器 / フライヤー', fuel: '電気 (1500W)' });
  }
  if (needsCharcoal) {
    suggestedAppliances.push({ name: '炭火焼き台 / 七輪', fuel: '木炭・備長炭' });
  }

  const fireSafetyRisk: VendorInspectionResult['fireSafetyRisk'] = needsCharcoal || needsGas ? 'high' : (needsElectric ? 'medium' : 'none');

  let reason = '販売品目に火気加熱を伴う調理は見当たりません。';
  if (needsGas) {
    reason = `「${menu}」の調理にはLPガス等の高火力火気器具が使用される可能性が高く、業務用消火器の設置が義務付けられます。`;
  } else if (needsElectric) {
    reason = `「${menu}」の調理には電気熱源器具が使用されると推測されます。高ワット数になるため電源容量の確認が必要です。`;
  } else if (needsCharcoal) {
    reason = `炭火調理を行うため火災リスクが高く、消火器設置と不燃シートの敷設が必要です。`;
  }

  return {
    category,
    hasFireAppliance: hasFire,
    requiresFireExtinguisher: requiresExtinguisher,
    fireSafetyRisk,
    suggestedAppliances,
    reason
  };
}

/**
 * サーバー側でGemini APIを安全に呼び出す
 */
async function callGeminiFromBackend(
  prompt: string,
  systemContext: string,
  apiKey: string,
  modelName: string = 'gemini-flash-latest'
): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `あなたは夜市出店者管理システムのバックエンドAIエンジンです。\n${systemContext}\n\n質問・指示:\n${prompt}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 2048,
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as any;
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini APIからの回答が空でした');
  return text;
}

/**
 * Vite開発サーバー用ミドルウェアハンドラー
 */
export async function handleAiApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  serverApiKey: string = ''
): Promise<boolean> {
  const url = req.url || '';

  // /api/ai/ で始まるリクエストのみ処理
  if (!url.startsWith('/api/ai')) {
    return false;
  }

  try {
    // 1. GET /api/ai/status
    if (url === '/api/ai/status' && req.method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        hasServerKey: !!serverApiKey,
        configuredModel: 'gemini-flash-latest'
      });
      return true;
    }

    // 2. POST /api/ai/chat
    if (url === '/api/ai/chat' && req.method === 'POST') {
      const body = await parseJsonBody<{
        prompt: string;
        systemContext?: string;
        model?: string;
        clientApiKey?: string;
      }>(req);

      const effectiveKey = serverApiKey || body.clientApiKey || '';
      if (!effectiveKey) {
        sendJson(res, 400, {
          ok: false,
          error: 'サーバー側およびクライアント側にGemini APIキーが設定されていません。'
        });
        return true;
      }

      const reply = await callGeminiFromBackend(
        body.prompt || '',
        body.systemContext || '',
        effectiveKey,
        body.model || 'gemini-flash-latest'
      );

      sendJson(res, 200, { ok: true, text: reply });
      return true;
    }

    // 3. POST /api/ai/inspect-vendor (出店者データの裏側自動精査)
    if (url === '/api/ai/inspect-vendor' && req.method === 'POST') {
      const body = await parseJsonBody<{
        name: string;
        menuItems: string;
        clientApiKey?: string;
      }>(req);

      const effectiveKey = serverApiKey || body.clientApiKey || '';

      if (!effectiveKey) {
        // キーがない場合は高精度ヒューリスティックで即時応答
        const result = fallbackInspectVendor(body.name || '', body.menuItems || '');
        sendJson(res, 200, { ok: true, result, mode: 'heuristic' });
        return true;
      }

      // Gemini AIによる精密判定
      const prompt = `出店者の屋号:「${body.name || '未定'}」
販売品目・メニュー:「${body.menuItems || '未定'}」

出店区分（ジャンル）および火気安全リスクを判定してください。
categoryは必ず次の3つのいずれか1つを指定してください:
- "kitchen_car"（キッチンカー・移動販売車）
- "food"（飲食露店・調理・ドリンク含む食品）
- "outdoor"（屋外出店（物販・体験・縁日・クラフト・その他））

回答は必ず以下の純粋なJSONオブジェクトのみを出力してください（Markdownの\`\`\`json等の装飾は不要です）:
{
  "category": "kitchen_car" | "food" | "outdoor",
  "hasFireAppliance": boolean,
  "requiresFireExtinguisher": boolean,
  "fireSafetyRisk": "high" | "medium" | "none",
  "suggestedAppliances": [
    { "name": "器具名（例: 鉄板焼器、電気フライヤーなど）", "fuel": "燃料（例: LPガス、電気1500W、炭火など）" }
  ],
  "reason": "判定理由を1〜2文で"
}`;

      try {
        const text = await callGeminiFromBackend(
          prompt,
          'あなたは出店者の安全検査・ジャンル仕分けを担当するAIです。指定フォーマットのJSONのみを返してください。',
          effectiveKey,
          'gemini-flash-latest'
        );

        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResult = JSON.parse(cleanJson) as VendorInspectionResult;
        sendJson(res, 200, { ok: true, result: parsedResult, mode: 'gemini' });
        return true;
      } catch (aiErr) {
        // AIパース失敗時はヒューリスティックにフォールバック
        const result = fallbackInspectVendor(body.name || '', body.menuItems || '');
        sendJson(res, 200, { ok: true, result, mode: 'fallback' });
        return true;
      }
    }

    // 4. POST /api/ai/infer-reading (屋号の五十音読み判定)
    if (url === '/api/ai/infer-reading' && req.method === 'POST') {
      const body = await parseJsonBody<{
        name: string;
        clientApiKey?: string;
      }>(req);

      const effectiveKey = serverApiKey || body.clientApiKey || '';
      const vendorName = body.name || '';

      if (!vendorName.trim()) {
        sendJson(res, 200, { ok: true, reading: '' });
        return true;
      }

      if (!effectiveKey) {
        sendJson(res, 200, { ok: true, reading: '', mode: 'no-key' });
        return true;
      }

      const prompt = `以下の出店者・屋号について、五十音順（あいうえお順）に並べ替えるための正式な「読み仮名（すべて全角ひらがな）」を判定してください。
「極旨」「炭火焼き」「本格」「アジアン屋台」などの装飾句・枕詞がある場合は、店名の主要本体（例: 極旨たこ焼き 蛸源 → たこげん、黒潮炭火焼き鳥 弁慶 → べんけい、Coffee Stand Lululu → るるる）の読みを最優先してください。
回答はひらがなのみ（解説や記号は不要）で出力してください。

出店者名: "${vendorName}"`;

      try {
        const text = await callGeminiFromBackend(
          prompt,
          'あなたは屋号の五十音順よみがなを判定するAIです。ひらがなのみを出力してください。',
          effectiveKey,
          'gemini-flash-latest'
        );

        const cleaned = text.replace(/[^ぁ-んァ-ヶ]/g, '').trim();
        sendJson(res, 200, { ok: true, reading: cleaned, mode: 'gemini' });
        return true;
      } catch (aiErr) {
        sendJson(res, 200, { ok: true, reading: '', mode: 'fallback' });
        return true;
      }
    }

    sendJson(res, 404, { ok: false, error: 'Endpoint not found' });
    return true;
  } catch (err: any) {
    sendJson(res, 500, { ok: false, error: err.message || 'Internal Server Error' });
    return true;
  }
}
