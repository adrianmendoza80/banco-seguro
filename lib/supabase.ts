import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kqrwvlsxysvmfpwnowap.supabase.co';
const SUPABASE_KEY = 'sb_publishable_P7Snv-eAQ-9Q5RrMp-CKaQ_mu9pKOcZ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);