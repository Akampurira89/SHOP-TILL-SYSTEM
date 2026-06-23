import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

/* =========================================================
   FIELD MAPPING
   App code (and the rest of this project) uses camelCase keys
   like `salePrice`, `priceMode`, `cashierName`. Postgres columns
   are snake_case like `sale_price`, `price_mode`, `cashier_name`.
   These helpers convert both ways so the rest of the app never
   has to know or care that a real database is underneath.
   ========================================================= */

function toSnake(str) {
  return str.replace(/[A-Z]/g, (l) => "_" + l.toLowerCase());
}
function toCamel(str) {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}
function rowToCamel(row) {
  if (row === null || typeof row !== "object" || Array.isArray(row)) return row;
  const out = {};
  for (const k of Object.keys(row)) out[toCamel(k)] = row[k];
  return out;
}
function rowToSnake(obj) {
  const out = {};
  for (const k of Object.keys(obj)) out[toSnake(k)] = obj[k];
  return out;
}

/* =========================================================
   TABLE MAP
   Maps the in-app "key" (e.g. "products") used throughout the
   UI code, to the actual Postgres table name (e.g. "products"),
   and the column used as the row's primary key.
   ========================================================= */
const TABLES = {
  users: "users",
  products: "products",
  sales: "sales",
  suppliers: "suppliers",
  supplierTx: "supplier_tx",
  expenses: "expenses",
  shifts: "shifts",
  auditLog: "audit_log",
  stockAdj: "stock_adj",
};

/* settings is a single-row table, handled separately */

export async function loadAllFromSupabase() {
  const out = {};
  const NO_AT_COLUMN = new Set(["users", "products", "suppliers"]);

  for (const [key, table] of Object.entries(TABLES)) {
    let query = supabase.from(table).select("*");
    if (!NO_AT_COLUMN.has(table)) {
      query = query.order("at", { ascending: false });
    }
    const { data, error } = await query;
    if (error) {
      console.error("Supabase load error on", table, error);
      out[key] = [];
    } else {
      out[key] = (data || []).map(rowToCamel);
    }
  }

  const { data: settingsRows } = await supabase.from("settings").select("*").eq("id", "main").limit(1);
  if (settingsRows && settingsRows.length) {
    const s = rowToCamel(settingsRows[0]);
    out.settings = { shopName: s.shopName, currency: s.currency, momoLines: s.momoLines || [], lowStockThreshold: s.lowStockThreshold };
  } else {
    out.settings = { shopName: "My Supermarket", currency: "UGX", momoLines: [], lowStockThreshold: 5 };
  }

  // normalize numeric fields that Postgres returns as strings for `numeric` columns
  out.products = (out.products || []).map((p) => ({ ...p, cost: Number(p.cost) || 0, salePrice: Number(p.salePrice) || 0, minSale: Number(p.minSale) || 0, stock: Number(p.stock) || 0 }));
  out.suppliers = (out.suppliers || []).map((s) => ({ ...s, balance: Number(s.balance) || 0 }));
  out.sales = (out.sales || []).map((s) => ({ ...s, total: Number(s.total) || 0, items: typeof s.items === "string" ? JSON.parse(s.items) : s.items }));
  out.expenses = (out.expenses || []).map((e) => ({ ...e, amount: Number(e.amount) || 0 }));
  out.shifts = (out.shifts || []).map((s) => ({ ...s, openingCash: Number(s.openingCash) || 0, closingCash: s.closingCash != null ? Number(s.closingCash) : null }));
  out.stockAdj = (out.stockAdj || []).map((a) => ({ ...a, qtyChange: Number(a.qtyChange) || 0, newStock: Number(a.newStock) || 0, unitCost: Number(a.unitCost) || 0 }));
  out.supplierTx = (out.supplierTx || []).map((t) => ({ ...t, amount: Number(t.amount) || 0 }));

  return out;
}

/* =========================================================
   SAVE / PATCH
   The app calls patch(key, fullNewArrayOrObject). Since the UI
   always hands us the *entire* new array for a key (it does
   `list => [...list, newItem]` etc. in memory first), the
   simplest and safest sync strategy is: diff is hard to compute
   generically, so instead we upsert every row in the new array,
   and delete any row that existed before but is missing now.
   This keeps behavior identical to the original local-storage
   version, where the whole array was simply replaced.
   ========================================================= */

export async function saveKeyToSupabase(key, newValue, previousValue) {
  if (key === "settings") {
    await supabase.from("settings").upsert(rowToSnake({ id: "main", ...newValue }));
    return;
  }

  const table = TABLES[key];
  if (!table) return;

  const newArr = Array.isArray(newValue) ? newValue : [];
  const prevArr = Array.isArray(previousValue) ? previousValue : [];

  const newIds = new Set(newArr.map((r) => r.id));
  const removedIds = prevArr.filter((r) => !newIds.has(r.id)).map((r) => r.id);

  if (removedIds.length) {
    await supabase.from(table).delete().in("id", removedIds);
  }

  if (newArr.length) {
    const rows = newArr.map((r) => {
      const snake = rowToSnake(r);
      // items column on sales must be sent as JSON, not double-stringified
      if (key === "sales" && r.items) snake.items = r.items;
      return snake;
    });
    const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
    if (error) console.error("Supabase upsert error on", table, error);
  }
}
