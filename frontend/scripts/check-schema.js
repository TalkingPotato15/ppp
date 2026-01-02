require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('Missing Supabase credentials in .env.local');
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', url ? 'set' : 'missing');
  console.log('  SUPABASE_SERVICE_ROLE_KEY:', key ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkSchema() {
  console.log('Checking Supabase schema...\n');
  console.log('Connected to:', url.split('.')[0].replace('https://', '') + '.supabase.co\n');

  const tables = [
    'users',
    'refresh_tokens',
    'document_summaries',
    'document_relationships',
    'generation_sessions',
    'generated_ideas',
    'saved_ideas',
    'collection_jobs',
    'raw_posts'
  ];

  console.log('Tables:');
  let allGood = true;
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    const status = error ? 'X' : 'OK';
    const msg = error ? '(' + error.code + ': ' + error.message + ')' : '';
    console.log('  [' + status + '] ' + table + ' ' + msg);
    if (error) allGood = false;
  }

  console.log('\nFunctions:');
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: new Array(1536).fill(0),
    match_threshold: 0.5,
    match_count: 1,
    filter_domain: null
  });
  const status = error ? 'X' : 'OK';
  const msg = error ? '(' + error.message + ')' : '';
  console.log('  [' + status + '] match_documents ' + msg);
  if (error) allGood = false;

  console.log('\n' + (allGood ? 'All schema checks passed!' : 'Some checks failed'));
}

checkSchema().catch(e => console.error('Error:', e.message));
