import { getSupabaseClient } from './supabaseClient';
import { NightMarketEvent, Vendor, EventEntry } from '../types';

// ==============================================================================
// 型変換ヘルパー（キャメルケース ↔ スネークケース）
// ==============================================================================

function eventToRow(event: NightMarketEvent) {
  return {
    id: event.id,
    name: event.name,
    date: event.date || '',
    time: event.time || '',
    venue: event.venue || '',
    organizer: event.organizer || '',
    contact_phone: event.contactPhone || '',
    fire_department_name: event.fireDepartmentName || '',
    guidelines_notes: event.guidelinesNotes || [],
    areas: event.areas || [],
    updated_at: new Date().toISOString()
  };
}

function rowToEvent(row: any): NightMarketEvent {
  return {
    id: row.id,
    name: row.name,
    date: row.date || '',
    time: row.time || '',
    venue: row.venue || '',
    organizer: row.organizer || '',
    contactPhone: row.contact_phone || '',
    fireDepartmentName: row.fire_department_name || '',
    guidelinesNotes: Array.isArray(row.guidelines_notes) ? row.guidelines_notes : [],
    areas: Array.isArray(row.areas) ? row.areas : []
  };
}

function vendorToRow(vendor: Vendor) {
  return {
    id: vendor.id,
    name: vendor.name,
    reading_furigana: vendor.readingFurigana || null,
    owner_name: vendor.ownerName,
    furigana: vendor.furigana || null,
    phone: vendor.phone || '',
    email: vendor.email || null,
    line_id: vendor.lineId || null,
    instagram: vendor.instagram || null,
    address: vendor.address || null,
    category: vendor.category,
    organization_type: vendor.organizationType || 'store',
    organization_name: vendor.organizationName || null,
    menu_items: vendor.menuItems || '',
    has_food_license: Boolean(vendor.hasFoodLicense),
    food_license_number: vendor.foodLicenseNumber || null,
    license_expiry_date: vendor.licenseExpiryDate || null,
    submitted_licenses: vendor.submittedLicenses || [],
    status: vendor.status || 'active',
    status_reason: vendor.statusReason || null,
    blacklisted_at: vendor.blacklistedAt || null,
    tags: vendor.tags || [],
    internal_notes: vendor.internalNotes || null,
    past_participation_count: Number(vendor.pastParticipationCount) || 0,
    past_events: vendor.pastEvents || [],
    created_at: vendor.createdAt || new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString()
  };
}

function rowToVendor(row: any): Vendor {
  return {
    id: row.id,
    name: row.name,
    readingFurigana: row.reading_furigana || undefined,
    ownerName: row.owner_name || '',
    furigana: row.furigana || undefined,
    phone: row.phone || '',
    email: row.email || undefined,
    lineId: row.line_id || undefined,
    instagram: row.instagram || undefined,
    address: row.address || undefined,
    category: row.category || 'outdoor',
    organizationType: row.organization_type || 'store',
    organizationName: row.organization_name || undefined,
    menuItems: row.menu_items || '',
    hasFoodLicense: Boolean(row.has_food_license),
    foodLicenseNumber: row.food_license_number || undefined,
    licenseExpiryDate: row.license_expiry_date || undefined,
    submittedLicenses: Array.isArray(row.submitted_licenses) ? row.submitted_licenses : [],
    status: row.status || 'active',
    statusReason: row.status_reason || undefined,
    blacklistedAt: row.blacklisted_at || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    internalNotes: row.internal_notes || undefined,
    pastParticipationCount: Number(row.past_participation_count) || 0,
    pastEvents: Array.isArray(row.past_events) ? row.past_events : [],
    createdAt: row.created_at || ''
  };
}

function entryToRow(entry: EventEntry) {
  return {
    id: entry.id,
    event_id: entry.eventId,
    vendor_id: entry.vendorId,
    vendor_snapshot: entry.vendorSnapshot,
    booth_area: entry.boothArea,
    booth_number: entry.boothNumber,
    fee: entry.fee,
    fire_safety: entry.fireSafety,
    permit_issued: Boolean(entry.permitIssued),
    permit_issued_at: entry.permitIssuedAt || null,
    submitted_licenses: entry.submittedLicenses || [],
    entry_status: entry.entryStatus || 'pending',
    notes: entry.notes || null,
    updated_at: new Date().toISOString()
  };
}

function rowToEntry(row: any): EventEntry {
  return {
    id: row.id,
    eventId: row.event_id,
    vendorId: row.vendor_id,
    vendorSnapshot: row.vendor_snapshot,
    boothArea: row.booth_area,
    boothNumber: row.booth_number,
    fee: row.fee,
    fireSafety: row.fire_safety,
    permitIssued: Boolean(row.permit_issued),
    permitIssuedAt: row.permit_issued_at || undefined,
    submittedLicenses: Array.isArray(row.submitted_licenses) ? row.submitted_licenses : [],
    entryStatus: row.entry_status || 'pending',
    notes: row.notes || undefined
  };
}

// ==============================================================================
// 取得処理 (Fetch)
// ==============================================================================

export async function fetchSupabaseData(): Promise<{
  events: NightMarketEvent[];
  vendors: Vendor[];
  entries: EventEntry[];
} | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const [eventsRes, vendorsRes, entriesRes] = await Promise.all([
      supabase.from('yoichi_events').select('*').order('date', { ascending: true }),
      supabase.from('yoichi_vendors').select('*').order('name', { ascending: true }),
      supabase.from('yoichi_entries').select('*')
    ]);

    if (eventsRes.error || vendorsRes.error || entriesRes.error) {
      console.warn('[Supabase] データ取得エラー:', eventsRes.error || vendorsRes.error || entriesRes.error);
      return null;
    }

    const events = (eventsRes.data || []).map(rowToEvent);
    const vendors = (vendorsRes.data || []).map(rowToVendor);
    const entries = (entriesRes.data || []).map(rowToEntry);

    return { events, vendors, entries };
  } catch (err) {
    console.error('[Supabase] 通信エラー:', err);
    return null;
  }
}

/**
 * Supabase Realtimeでテーブル変更を検知・自動更新コールバックを登録
 */
export function subscribeToSupabaseChanges(onChange: () => void): (() => void) | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const channel = supabase
      .channel('yoichi_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yoichi_events' }, () => {
        console.log('[Supabase Realtime] yoichi_events 変更検知');
        onChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yoichi_vendors' }, () => {
        console.log('[Supabase Realtime] yoichi_vendors 変更検知');
        onChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yoichi_entries' }, () => {
        console.log('[Supabase Realtime] yoichi_entries 変更検知');
        onChange();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.error('[Supabase Realtime] 購読設定エラー:', err);
    return null;
  }
}

// ==============================================================================
// 保存・更新・同期処理 (Upsert / Delete)
// ==============================================================================

export async function syncEventToSupabase(event: NightMarketEvent): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const row = eventToRow(event);
    const { error } = await supabase.from('yoichi_events').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] イベント同期エラー:', e);
    return false;
  }
}

export async function deleteEventFromSupabase(eventId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    // 関連するエントリーも削除
    await supabase.from('yoichi_entries').delete().eq('event_id', eventId);
    const { error } = await supabase.from('yoichi_events').delete().eq('id', eventId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] イベント削除エラー:', e);
    return false;
  }
}

export async function syncVendorToSupabase(vendor: Vendor): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const row = vendorToRow(vendor);
    const { error } = await supabase.from('yoichi_vendors').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] 出店者同期エラー:', e);
    return false;
  }
}

export async function deleteVendorFromSupabase(vendorId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    // 関連エントリーも削除
    await supabase.from('yoichi_entries').delete().eq('vendor_id', vendorId);
    const { error } = await supabase.from('yoichi_vendors').delete().eq('id', vendorId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] 出店者削除エラー:', e);
    return false;
  }
}

export async function syncEntryToSupabase(entry: EventEntry): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const row = entryToRow(entry);
    const { error } = await supabase.from('yoichi_entries').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] エントリー同期エラー:', e);
    return false;
  }
}

export async function deleteEntryFromSupabase(entryId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('yoichi_entries').delete().eq('id', entryId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] エントリー削除エラー:', e);
    return false;
  }
}

// ==============================================================================
// 初期データ一括アップロード（ローカルデータをSupabaseに全件投入）
// ==============================================================================

export async function pushAllLocalDataToSupabase(
  events: NightMarketEvent[],
  vendors: Vendor[],
  entries: EventEntry[]
): Promise<{
  success: boolean;
  count: { events: number; vendors: number; entries: number };
  error?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, count: { events: 0, vendors: 0, entries: 0 }, error: 'Supabaseクライアントが未接続です。' };
  }

  try {
    // 1. イベント一括投入
    const eventRows = events.map(eventToRow);
    if (eventRows.length > 0) {
      const { error: evErr } = await supabase.from('yoichi_events').upsert(eventRows, { onConflict: 'id' });
      if (evErr) throw new Error(`イベント登録失敗: ${evErr.message}`);
    }

    // 2. 出店者一括投入（チャンク分割して安全に投入）
    const vendorRows = vendors.map(vendorToRow);
    const CHUNK_SIZE = 50;
    for (let i = 0; i < vendorRows.length; i += CHUNK_SIZE) {
      const chunk = vendorRows.slice(i, i + CHUNK_SIZE);
      const { error: vErr } = await supabase.from('yoichi_vendors').upsert(chunk, { onConflict: 'id' });
      if (vErr) throw new Error(`店舗マスター登録失敗: ${vErr.message}`);
    }

    // 3. エントリー一括投入
    const entryRows = entries.map(entryToRow);
    for (let i = 0; i < entryRows.length; i += CHUNK_SIZE) {
      const chunk = entryRows.slice(i, i + CHUNK_SIZE);
      const { error: enErr } = await supabase.from('yoichi_entries').upsert(chunk, { onConflict: 'id' });
      if (enErr) throw new Error(`ブースエントリー登録失敗: ${enErr.message}`);
    }

    return {
      success: true,
      count: {
        events: eventRows.length,
        vendors: vendorRows.length,
        entries: entryRows.length
      }
    };
  } catch (err: any) {
    console.error('[Supabase] 一括アップロード失敗:', err);
    return {
      success: false,
      count: { events: 0, vendors: 0, entries: 0 },
      error: err?.message || 'データアップロード中にエラーが発生しました。'
    };
  }
}
