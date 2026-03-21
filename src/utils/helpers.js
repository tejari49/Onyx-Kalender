export const DEFAULT_EXTRAS_ORDER = ['workclock', 'goals', 'sollist', 'notes', 'weather'];

export function normalizeShoppingItems(input) {
  const rows = Array.isArray(input) ? input : [];
  return rows.map((item, idx) => ({
    id: String(item?.id || `item_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`),
    text: String(item?.text || ''),
    qty: String(item?.qty || ''),
    price: item?.price === 0 ? '0' : String(item?.price || ''),
    done: item?.done === true,
    checkedAt: Number(item?.checkedAt || 0) || 0,
  }));
}

export function normalizeShoppingLists(input) {
  const rows = Array.isArray(input) ? input : [];
  return rows
    .map((list, idx) => ({
      id: String(list?.id || `shop_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`),
      title: String(list?.title || 'Einkaufsliste'),
      store: String(list?.store || ''),
      createdAt: Number(list?.createdAt || Date.now()) || Date.now(),
      updatedAt: Number(list?.updatedAt || Date.now()) || Date.now(),
      items: normalizeShoppingItems(list?.items),
    }))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
}

export function formatCurrencyCHF(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 'CHF 0.00';
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(num);
}

export function normalizeDailyGoals(input) {
  const arr = Array.isArray(input) ? input : [];
  const out = arr.slice(0, 6).map((item, idx) => ({
    id: String(item?.id || `goal_${idx + 1}`),
    text: String(item?.text || ''),
    done: item?.done === true,
  }));
  while (out.length < 3) out.push({ id: `goal_${out.length + 1}`, text: '', done: false });
  return out;
}

export function normalizeQuickCaptureNotes(input) {
  const arr = Array.isArray(input) ? input : [];
  return arr
    .map((item, idx) => ({
      id: String(item?.id || `note_${idx + 1}`),
      text: String(item?.text || '').trim().slice(0, 400),
      createdAt: Number(item?.createdAt || Date.now()),
    }))
    .filter((item) => item.text.length > 0)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 40);
}

export function normalizeExtrasOrder(input) {
  const raw = Array.isArray(input)
    ? input.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean)
    : [];
  const seen = new Set();
  const ordered = [];
  for (const key of [...raw, ...DEFAULT_EXTRAS_ORDER]) {
    if (!DEFAULT_EXTRAS_ORDER.includes(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }
  return ordered;
}

export function reorderExtraKeys(list, draggedKey, targetKey) {
  const src = normalizeExtrasOrder(list);
  const from = src.indexOf(String(draggedKey || ''));
  const to = src.indexOf(String(targetKey || ''));
  if (from < 0 || to < 0 || from === to) return src;
  const next = src.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export const PASTEL_COLORS = ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8BAFF', '#D3D3D3', '#FFC8DD'];

export const QUOTES_URL = 'quotes.json';

export const DEFAULT_QUOTES = [
  'Struktur bringt Ruhe.',
  'Fokus ist eine Entscheidung.',
  'Kleine Schritte, große Wirkung.',
  'Wenn\'s brennt: Wasser. Wenn\'s chaotisch ist: Kalender.',
  'Planung ist die halbe Miete – die andere Hälfte ist Kaffee.',
];

export const stableHash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const _bufToHex = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += bytes[i].toString(16).padStart(2, '0');
  return out;
};

export const sha256Hex = async (input) => {
  const s = String(input ?? '');
  try {
    if (crypto?.subtle?.digest) {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(s));
      return _bufToHex(buf);
    }
  } catch (_) {}
  return String(stableHash(s));
};

export const randomToken = (byteLen = 16) => {
  try {
    const arr = new Uint8Array(byteLen);
    crypto.getRandomValues(arr);
    let str = '';
    for (let i = 0; i < arr.length; i += 1) str += String.fromCharCode(arr[i]);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch (_) {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
};

export const pickQuoteForDay = (quotes, dayKey) => {
  const list = Array.isArray(quotes) && quotes.length ? quotes : DEFAULT_QUOTES;
  const idx = stableHash(String(dayKey)) % list.length;
  return list[idx];
};

export const QUOTE_COLOR_CLASSES = [
  'text-emerald-300',
  'text-cyan-300',
  'text-sky-300',
  'text-violet-300',
  'text-fuchsia-300',
  'text-amber-300',
  'text-rose-300',
  'text-lime-300',
];

export const colorForQuote = (quote, prevColor = '') => {
  const text = String(quote || '').trim();
  if (!text) return 'text-neutral-100';
  const baseIdx = stableHash(text) % QUOTE_COLOR_CLASSES.length;
  let next = QUOTE_COLOR_CLASSES[baseIdx] || 'text-neutral-100';
  if (prevColor && QUOTE_COLOR_CLASSES.length > 1 && next === prevColor) {
    next = QUOTE_COLOR_CLASSES[(baseIdx + 1) % QUOTE_COLOR_CLASSES.length] || next;
  }
  return next;
};

export const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function safeTrim(v) {
  return (v ?? '').toString().trim();
}

export function initialsFrom(nameOrEmail) {
  const s = safeTrim(nameOrEmail);
  if (!s) return '??';
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0] || '';
  const second = parts[1] || '';
  const a = first.charAt(0);
  const b = second.charAt(0) || first.charAt(1);
  const out = (a + b).toUpperCase();
  return out || '??';
}

export function shortId(id, n = 6) {
  const s = String(id || '');
  if (s.length <= n) return s;
  return s.slice(0, n);
}
