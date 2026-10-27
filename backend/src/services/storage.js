const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);
const BUCKET = process.env.SUPABASE_BUCKET;

async function uploadFile(key, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, buffer, { contentType, upsert: false });
  if (error) throw error;
}

async function downloadFile(key) {
  const { data, error } = await supabase.storage.from(BUCKET).download(key);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

module.exports = { uploadFile, downloadFile };