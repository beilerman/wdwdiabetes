/* WDW Diabetes Guide Script
   Loads data.json and drives: Food Finder, Meal cart, Insulin Helper, Packing Checklist, Accessibility toggles.
*/
const state = {
  data: null,
  parks: [],
  currentParkId: null,
  meal: [], // {name, carbs, calories, fat}
  fontScale: 1.0,
  highContrast: false
};

// Utils
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const sanitize = s => String(s ?? '').trim();
const num = (v, d=0) => isNaN(+v) ? d : +v;

function saveLS() {
  try {
    localStorage.setItem('wdw_state', JSON.stringify({
      meal: state.meal,
      fontScale: state.fontScale,
      highContrast: state.highContrast,
      lastPark: state.currentParkId
    }));
  } catch {}
}
function loadLS() {
  try {
    const obj = JSON.parse(localStorage.getItem('wdw_state')||'{}');
    state.meal = Array.isArray(obj.meal) ? obj.meal : [];
    state.fontScale = obj.fontScale || 1.0;
    state.highContrast = !!obj.highContrast;
    state.currentParkId = obj.lastPark || null;
  } catch {}
}

// Accessibility controls
function applyFontScale() {
  document.documentElement.style.fontSize = (16*state.fontScale)+'px';
}
function applyContrast() {
  document.body.classList.toggle('hc', state.highContrast);
  const btn = $('#contrastToggle');
  if (btn) btn.setAttribute('aria-pressed', state.highContrast?'true':'false');
}

// Panels / Nav
function showPanel(id) {
  $$('.panel').forEach(p => p.classList.add('hidden'));
  $('#panel-'+id).classList.remove('hidden');
  saveLS();
}
function bindNav() {
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (!target) return;
      showPanel(target);
      // close mobile nav
      const m = $('#mobileNav');
      if (m && !m.classList.contains('hidden')) { m.classList.add('hidden'); $('#menuToggle').setAttribute('aria-expanded','false'); }
    });
  });
  const menuToggle = $('#menuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const m = $('#mobileNav');
      const isOpen = m.classList.toggle('hidden') ? false : true;
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }
}

// Data loading
async function loadData() {
  const res = await fetch('data.json', {cache:'no-store'});
  if (!res.ok) throw new Error('Failed to load data.json');
  const json = await res.json();
  state.data = json;
  state.parks = json.parks || [];
}

// Food Finder population
function unique(arr) { return Array.from(new Set(arr)); }

function populateParks() {
  const sel = $('#parkSel');
  sel.innerHTML = '';
  state.parks.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
  if (state.currentParkId && state.parks.some(p=>p.id===state.currentParkId)) {
    sel.value = state.currentParkId;
  } else {
    state.currentParkId = sel.value;
  }
  populateLands();
}

function populateLands() {
  const park = state.parks.find(p=>p.id===state.currentParkId);
  const landSel = $('#landSel');
  const restSel = $('#restSel');
  landSel.innerHTML = '';
  restSel.innerHTML = '';
  if (!park) return;
  // compute lands from menuItems to be safe
  const lands = unique((park.menuItems||[]).map(i=>sanitize(i.land)).filter(Boolean));
  lands.unshift('All lands');
  lands.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l;
    opt.textContent = l;
    landSel.appendChild(opt);
  });
  populateRestaurants();
}

function currentFilters() {
  const q = $('#q').value.toLowerCase();
  const carbMax = num($('#carbMax').value, Infinity);
  const onlyVeg = $('#onlyVeg').checked;
  const hideFried = $('#hideFried').checked;
  const drinksOnly = $('#typeDrink').checked;
  const sort = $('#sortSel').value;
  return {q, carbMax, onlyVeg, hideFried, drinksOnly, sort};
}

function populateRestaurants() {
  const park = state.parks.find(p=>p.id===state.currentParkId);
  const land = $('#landSel').value;
  const restSel = $('#restSel');
  restSel.innerHTML = '';
  if (!park) return;
  const items = (park.menuItems||[]).filter(i => (land==='All lands' || i.land===land));
  const rests = unique(items.map(i=>sanitize(i.restaurant))).filter(Boolean);
  rests.unshift('All restaurants');
  rests.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r;
    restSel.appendChild(opt);
  });
  renderItems();
}

function sortItems(items, key) {
  const by = {
    carbsAsc: (a,b)=>a.carbs-b.carbs,
    carbsDesc: (a,b)=>b.carbs-a.carbs,
    calAsc: (a,b)=>a.calories-b.calories,
    calDesc: (a,b)=>b.calories-a.calories,
    fatAsc: (a,b)=>a.fat-b.fat,
    fatDesc: (a,b)=>b.fat-a.fat,
    nameAsc: (a,b)=>a.name.localeCompare(b.name)
  }[key] || ((a,b)=>a.carbs-b.carbs);
  return items.sort(by);
}

function renderItems() {
  const park = state.parks.find(p=>p.id===state.currentParkId);
  const land = $('#landSel').value;
  const rest = $('#restSel').value;
  const {q, carbMax, onlyVeg, hideFried, drinksOnly, sort} = currentFilters();
  const wrap = $('#itemsList');
  wrap.innerHTML = '';

  if (!park) return;
  let items = (park.menuItems||[]).filter(i => {
    if (land!=='All lands' && i.land!==land) return false;
    if (rest!=='All restaurants' && i.restaurant!==rest) return false;
    if (drinksOnly && i.type!=='drink') return false;
    if (onlyVeg && !i.vegetarian) return false;
    if (hideFried && i.isFried) return false;
    if (num(i.carbs, 999999) > carbMax) return false;
    const text = (i.name+' '+(i.description||'')+' '+(i.restaurant||'')).toLowerCase();
    if (q && !text.includes(q)) return false;
    return true;
  });

  items = sortItems(items, sort);

  if (!items.length) {
    const d = document.createElement('p');
    d.className = 'text-sm text-[var(--muted)]';
    d.textContent = 'No items match your filters.';
    wrap.appendChild(d);
    return;
  }

  for (const i of items) {
    const card = document.createElement('div');
    card.className = 'rounded-xl border p-4 bg-white/80';

    const title = document.createElement('div');
    title.className = 'font-semibold';
    title.textContent = i.name;

    const badges = document.createElement('div');
    badges.className = 'mt-1 flex flex-wrap gap-1';
    if (i.type==='drink') {
      const b = document.createElement('span'); b.className='badge badge-drink'; b.textContent='Drink'; badges.appendChild(b);
    } else {
      const b = document.createElement('span'); b.className='badge'; b.style.background='#eef2ff'; b.style.color='#3730a3'; b.textContent=sanitize(i.restaurant); badges.appendChild(b);
    }
    if (i.vegetarian) { const b=document.createElement('span'); b.className='badge badge-veg'; b.textContent='Vegetarian'; badges.appendChild(b); }
    if (i.isFried) { const b=document.createElement('span'); b.className='badge badge-fried'; b.textContent='Fried'; badges.appendChild(b); }
    // Carb heaviness
    if (num(i.carbs,0) <= 15) { const b=document.createElement('span'); b.className='badge badge-lowcarb'; b.textContent='<=15g carbs'; badges.appendChild(b); }

    const meta = document.createElement('div');
    meta.className = 'mt-2 text-sm text-[var(--muted)]';
    meta.textContent = sanitize(i.description || '');

    const facts = document.createElement('div');
    facts.className = 'mt-2 text-sm';
    facts.innerHTML = `<strong>Carbs:</strong> ${num(i.carbs,0)} g • <strong>Calories:</strong> ${num(i.calories,0)} kcal • <strong>Fat:</strong> ${num(i.fat,0)} g`;

    const actions = document.createElement('div');
    actions.className = 'mt-3 flex gap-2';
    const addBtn = document.createElement('button');
    addBtn.className = 'px-3 py-2 rounded-lg border focus-ring';
    addBtn.textContent = 'Add to Meal';
    addBtn.addEventListener('click', () => addToMeal({ name: i.name, carbs: num(i.carbs,0), calories: num(i.calories,0), fat: num(i.fat,0) }));
    actions.appendChild(addBtn);

    card.appendChild(title);
    card.appendChild(badges);
    if (sanitize(i.description)) card.appendChild(meta);
    card.appendChild(facts);
    card.appendChild(actions);
    wrap.appendChild(card);
  }
}

// Meal
function addToMeal(item) {
  state.meal.push(item);
  renderMeal();
  saveLS();
}
function removeFromMeal(idx) {
  state.meal.splice(idx,1);
  renderMeal();
  saveLS();
}
function renderMeal() {
  const ul = $('#mealList');
  ul.innerHTML = '';
  let c=0,k=0,f=0;
  state.meal.forEach((m, idx) => {
    c += num(m.carbs,0);
    k += num(m.calories,0);
    f += num(m.fat,0);
    const li = document.createElement('li');
    li.className = 'flex items-center justify-between gap-2';
    li.innerHTML = `<span>${m.name}</span><span class="text-sm text-[var(--muted)]">${m.carbs}g • ${m.calories}kcal</span>`;
    const del = document.createElement('button');
    del.className = 'px-2 py-1 rounded border text-sm focus-ring';
    del.textContent = 'Remove';
    del.addEventListener('click', ()=>removeFromMeal(idx));
    li.appendChild(del);
    ul.appendChild(li);
  });
  $('#mealTotals').textContent = `Carbs: ${Math.round(c)} g • Calories: ${Math.round(k)} kcal • Fat: ${Math.round(f)} g`;
}
function clearMeal() {
  state.meal = [];
  renderMeal(); saveLS();
}

// Insulin Helper
function insulinHelperCalc() {
  const bg = num($('#ih-bg').value);
  const target = num($('#ih-target').value);
  const carbs = num($('#ih-carbs').value);
  const icr = num($('#ih-icr').value); // grams per unit
  const cf = num($('#ih-cf').value);   // mg/dL per unit
  const activity = $('#ih-activity').value;

  const result = $('#ih-result');
  if (!icr || isNaN(carbs)) {
    result.innerHTML = `<p class="text-red-600">Enter at least carbs and your insulin-to-carb ratio.</p>`;
    return;
  }
  let bolusCarb = carbs / icr; // units
  let corr = 0;
  if (cf && bg > target) corr = Math.max(0, (bg - target) / cf);
  if (cf && bg < target) corr = (bg - target) / cf; // negative correction (reduce)

  let baseDose = bolusCarb + corr;

  // Activity adjustment: mod −25%, high −50%
  let adjPct = 0;
  if (activity==='mod') adjPct = 0.25;
  if (activity==='high') adjPct = 0.50;
  const suggested = Math.max(0, baseDose * (1 - adjPct));

  result.innerHTML = `
    <div class="rounded-lg border p-3 bg-white/70">
      <div class="font-semibold">Results (educational)</div>
      <ul class="text-sm mt-1 space-y-1">
        <li>Carb bolus: <strong>${bolusCarb.toFixed(2)} u</strong> (carbs ${carbs}g @ ICR ${icr}:1)</li>
        <li>Correction: <strong>${corr.toFixed(2)} u</strong> (BG ${bg} → target ${target}, CF ${cf||'—'})</li>
        <li>Base dose: <strong>${baseDose.toFixed(2)} u</strong></li>
        <li>Activity adjustment: <strong>${activity==='none'?'0%':'−'+(adjPct*100)+'%'}</strong></li>
        <li class="mt-1">Suggested dose: <strong>${suggested.toFixed(2)} u</strong></li>
      </ul>
      <p class="text-xs text-[var(--muted)] mt-2">Use your clinician’s instructions and device wizard. Typical exercise reductions are ~25% (moderate) to ~50% (high) of prandial insulin.</p>
    </div>`;
}

function loadCarbsFromMeal() {
  const total = state.meal.reduce((acc,m)=>acc+num(m.carbs,0),0);
  $('#ih-carbs').value = Math.round(total);
}

// Packing Checklist
function buildChecklist(opts) {
  const out = [];
  // Always
  out.push('Medical ID (bracelet/necklace)');
  out.push('Physician letter listing diagnosis, meds, and supplies');
  out.push('Health insurance card & emergency contacts');
  out.push('Medications & supplies packed in CARRY-ON (not checked)');
  out.push('Twice the quantity of all meds & supplies for trip length');
  out.push('Rapid-acting carbs (glucose tabs/gel), snacks, water bottle');
  out.push('Cooling pouch/ice pack for insulin; avoid heat exposure');
  out.push('Portable charger / spare batteries for devices');
  // Device-agnostic
  if (opts.t1 || opts.t2) out.push('BG meter + strips + lancets (even if you use CGM)');
  if (opts.cgm) {
    out.push('CGM sensors (extra), charger/transmitter, alcohol swabs');
    out.push('Phone/watch with CGM app; enable alerts & sharing');
  }
  if (opts.pump) {
    out.push('Pump infusion sets & reservoirs (extra)');
    out.push('Backup insulin pens/syringes in case of pump failure');
    out.push('Ketone strips if on insulin & prone to hyperglycemia');
  }
  if (opts.t1) {
    out.push('Rapid-acting insulin (extra) + long-acting backup');
    out.push('Glucagon emergency kit (and ensure companions trained)');
  }
  if (opts.t2) {
    out.push('Oral meds in original bottles (metformin, etc.)');
    out.push('GLP-1/SGLT2/other injectables + pen needles');
    out.push('If on insulin or sulfonylurea: extra hypoglycemia supplies');
  }
  if (opts.child) {
    out.push('Child’s DMMP (Diabetes Medical Management Plan)');
    out.push('Consent/authorization for caregivers to administer care');
    out.push('Small comfort items for checks; spare clothes');
  }
  out.push('Broken-in walking shoes; blister care (bandages/moleskin)');
  return out;
}

function renderChecklist(list) {
  const ul = $('#pc-list'); ul.innerHTML='';
  list.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<label class="inline-flex items-center gap-2">
      <input type="checkbox" class="focus-ring"/> <span>${item}</span>
    </label>`;
    ul.appendChild(li);
  });
}

// Init
async function init() {
  loadLS();
  applyFontScale(); applyContrast();
  bindNav();
  // Accessibility buttons
  $('#fontSm').addEventListener('click', ()=>{ state.fontScale=Math.max(0.8, state.fontScale-0.1); applyFontScale(); saveLS(); });
  $('#fontLg').addEventListener('click', ()=>{ state.fontScale=Math.min(1.6, state.fontScale+0.1); applyFontScale(); saveLS(); });
  $('#contrastToggle').addEventListener('click', ()=>{ state.highContrast=!state.highContrast; applyContrast(); saveLS(); });
  // Meal buttons
  $('#clearMeal').addEventListener('click', clearMeal);
  $('#useInCalc').addEventListener('click', ()=>{ showPanel('tools'); loadCarbsFromMeal(); });
  // Insulin helper
  $('#ih-calc').addEventListener('click', insulinHelperCalc);
  $('#ih-loadmeal').addEventListener('click', loadCarbsFromMeal);
  // Checklist
  $('#pc-build').addEventListener('click', ()=>{
    const list = buildChecklist({
      t1: $('#pc-t1').checked,
      t2: $('#pc-t2').checked,
      pump: $('#pc-pump').checked,
      cgm: $('#pc-cgm').checked,
      child: $('#pc-child').checked,
    });
    renderChecklist(list);
  });
  $('#pc-print').addEventListener('click', ()=>window.print());

  // Load data
  try {
    await loadData();
    populateParks();
    renderMeal();
    // Event bindings for Food Finder
    $('#parkSel').addEventListener('change', (e)=>{ state.currentParkId = e.target.value; populateLands(); saveLS(); });
    $('#landSel').addEventListener('change', populateRestaurants);
    $('#restSel').addEventListener('change', renderItems);
    $('#q').addEventListener('input', renderItems);
    $('#carbMax').addEventListener('input', renderItems);
    $('#onlyVeg').addEventListener('change', renderItems);
    $('#hideFried').addEventListener('change', renderItems);
    $('#typeDrink').addEventListener('change', renderItems);
    $('#sortSel').addEventListener('change', renderItems);
  } catch (e) {
    console.error(e);
    const foodPanel = document.getElementById('panel-food');
    const p = document.createElement('p');
    p.className = 'text-red-600';
    p.textContent = 'Could not load data.json. Ensure the file is present next to index.html.';
    foodPanel.prepend(p);
  }

  // Default panel
  showPanel('home');
}

document.addEventListener('DOMContentLoaded', init);
