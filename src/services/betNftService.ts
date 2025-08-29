import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export async function uploadBetMetadataAndGetUri(params: {
  betId: string;
  lifecycle: 'created' | 'accepted' | 'settled' | 'cancelled';
  payload: Record<string, any>;
}): Promise<string> {
  const json = JSON.stringify({
    name: `Bet ${params.lifecycle} — ${params.betId}`,
    description: `Receipt for bet ${params.betId} (${params.lifecycle}).`,
    attributes: Object.entries(params.payload).map(([trait_type, value]) => ({ trait_type, value })),
  });
  const bytes = new Blob([json], { type: 'application/json' });
  // Use dedicated public bucket 'nft-metadata'
  const path = `${params.betId}/${params.lifecycle}.json`;
  const { error } = await supabase.storage
    .from('nft-metadata')
    .upload(path, bytes, { upsert: true, contentType: 'application/json' });
  if (error) throw error;
  const { data } = supabase.storage.from('nft-metadata').getPublicUrl(path);
  return data.publicUrl;
}


