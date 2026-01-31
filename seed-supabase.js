/*
  Seed script — loads data.json into your Supabase database.

  Usage:
    1. Install dependency:  npm install @supabase/supabase-js
    2. Set env vars:
         export SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
         export SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY"
    3. Run:  node seed-supabase.js

  Uses the SERVICE ROLE key (not anon) so it can bypass RLS for inserts.
*/
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.');
  process.exit(1);
}

const sb = createClient(url, key);
const data = JSON.parse(readFileSync('data.json', 'utf-8'));

async function seed() {
  for (const park of data.parks) {
    // Upsert park
    const { error: parkErr } = await sb
      .from('parks')
      .upsert({ id: park.id, name: park.name, subtitle: park.subtitle || null, lands: park.lands });
    if (parkErr) { console.error('Park insert error:', parkErr); continue; }

    // Insert menu items (delete existing first to avoid duplicates)
    await sb.from('menu_items').delete().eq('park_id', park.id);

    const rows = (park.menuItems || []).map(i => ({
      park_id: park.id,
      land: i.land,
      restaurant: i.restaurant,
      name: i.name,
      description: i.description || null,
      calories: i.calories || 0,
      carbs: i.carbs || 0,
      fat: i.fat || 0,
      type: i.type || 'food',
      vegetarian: !!i.vegetarian,
      is_fried: !!i.isFried
    }));

    if (rows.length) {
      const { error: itemErr } = await sb.from('menu_items').insert(rows);
      if (itemErr) { console.error(`Menu items error for ${park.id}:`, itemErr); }
      else { console.log(`Seeded ${rows.length} items for ${park.name}`); }
    }
  }
  console.log('Done.');
}

seed();
