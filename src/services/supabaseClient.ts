import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'yoichi_supabase_project_url';
const STORAGE_KEY_ANON_KEY = 'yoichi_supabase_anon_key';

// デフォルト設定（環境変数または既知のWCPプロジェクト設定）
export const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let cachedClient: SupabaseClient | null = null;
let currentClientConfig = { url: '', key: '' };

/**
 * 現在設定されているSupabaseの接続情報を取得
 */
export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  const localUrl = localStorage.getItem(STORAGE_KEY_URL);
  const localKey = localStorage.getItem(STORAGE_KEY_ANON_KEY);

  const url = (localUrl !== null ? localUrl : DEFAULT_SUPABASE_URL).trim();
  const anonKey = (localKey !== null ? localKey : DEFAULT_SUPABASE_ANON_KEY).trim();

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey)
  };
}

/**
 * Supabase接続情報を保存
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_ANON_KEY, anonKey.trim());
  cachedClient = null; // キャッシュクリア
}

/**
 * Supabase設定をリセット（デフォルトに戻す）
 */
export function resetSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON_KEY);
  cachedClient = null;
}

/**
 * Supabaseクライアントインスタンスを取得
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (!cachedClient || currentClientConfig.url !== url || currentClientConfig.key !== anonKey) {
    try {
      cachedClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      currentClientConfig = { url, key: anonKey };
    } catch (e) {
      console.error('[Supabase] クライアント初期化エラー:', e);
      return null;
    }
  }

  return cachedClient;
}

/**
 * Supabaseとの接続テスト
 */
export async function testSupabaseConnection(
  targetUrl?: string,
  targetKey?: string
): Promise<{ success: boolean; message: string; tablesFound?: string[] }> {
  try {
    const config = getSupabaseConfig();
    const url = (targetUrl ?? config.url).trim();
    const key = (targetKey ?? config.anonKey).trim();

    if (!url || !key) {
      return { success: false, message: 'Supabase URL または Anon Key が入力されていません。' };
    }

    const testClient = createClient(url, key);

    // yoichi_events テーブルの存在と疎通をテスト
    const { data: eventsData, error: eventsErr } = await testClient
      .from('yoichi_events')
      .select('id')
      .limit(1);

    if (eventsErr) {
      // テーブルが存在しないエラー（PGRST205 / 42P01等）か、認証エラーかを判別
      if (eventsErr.message.includes('relation "public.yoichi_events" does not exist') || eventsErr.code === 'PGRST205' || eventsErr.code === '42P01') {
        return {
          success: false,
          message: 'Supabaseへの接続は成功しましたが、専用テーブル（yoichi_events等）がまだ作成されていません。画面内のSQLスクリプトを実行してテーブルを作成してください。'
        };
      }
      return { success: false, message: `接続テスト失敗: ${eventsErr.message}` };
    }

    return {
      success: true,
      message: 'Supabaseクラウドデータベースに正常に接続できました！'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `通信エラー: ${err?.message || 'Supabase URLが正しいかご確認ください。'}`
    };
  }
}
