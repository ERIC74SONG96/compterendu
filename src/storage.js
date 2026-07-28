import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client = null;

function getClient() {
  if (!url || !key) throw new Error("SUPABASE_NON_CONFIGURE");
  if (!client) client = createClient(url, key);
  return client;
}

export function isConfigured() {
  return Boolean(url && key);
}

/** Chargement optimisé en une seule requête */
export async function loadRapports() {
  const { data, error } = await getClient()
    .from("rapports")
    .select("data")
    .order("ts", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => row.data);
}

export const storage = {
  async list(prefix) {
    const { data, error } = await getClient().from("rapports").select("id");
    if (error) throw error;
    return { keys: (data || []).map((r) => `${prefix}${r.id}`) };
  },

  async get(key) {
    const id = key.replace(/^rapport:/, "");
    const { data, error } = await getClient().from("rapports").select("data").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return { value: JSON.stringify(data.data) };
  },

  async set(_key, value) {
    const rapport = JSON.parse(value);
    const { error } = await getClient().from("rapports").upsert({
      id: rapport.id,
      data: rapport,
      ts: rapport.ts || Date.now(),
      updated_at: new Date().toISOString(),
    });
    return !error;
  },

  async delete(key) {
    const id = key.replace(/^rapport:/, "");
    const { error } = await getClient().from("rapports").delete().eq("id", id);
    return !error;
  },
};
