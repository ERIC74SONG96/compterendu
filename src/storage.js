import { getSession, isConfigured, supabase } from "./auth";

export { isConfigured };

export async function loadRapports() {
  const { data, error } = await supabase
    .from("rapports")
    .select("data, user_id")
    .order("ts", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    ...row.data,
    user_id: row.user_id || row.data?.user_id,
  }));
}

export async function saveRapport(rapport) {
  const session = await getSession();
  if (!session) throw new Error("NON_CONNECTE");

  const payload = { ...rapport, user_id: session.user.id };
  const { error } = await supabase.from("rapports").upsert({
    id: rapport.id,
    user_id: session.user.id,
    data: payload,
    ts: rapport.ts || Date.now(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return true;
}

export async function deleteRapport(id) {
  const { error } = await supabase.from("rapports").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/** @deprecated compatibilité */
export const storage = {
  async set(_key, value) {
    return saveRapport(JSON.parse(value));
  },
  async delete(key) {
    return deleteRapport(key.replace(/^rapport:/, ""));
  },
};
