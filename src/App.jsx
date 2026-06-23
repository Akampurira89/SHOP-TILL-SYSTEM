import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { loadAllFromSupabase, saveKeyToSupabase } from "./supabaseData";

/* ===================== STORAGE HELPERS (Supabase-backed) ===================== */
// Data now lives in a real shared Supabase database, so every device/staff
// member sees the same live data. See src/supabaseData.js for the actual
// network calls and the camelCase <-> snake_case field mapping.

/* ===================== SEED DATA ===================== */
const seedUsers = () => ([
  { id: "u1", name: "Admin", username: "admin", password: "admin123", role: "admin", active: true },
]);
const seedSettings = () => ({
  shopName: "My Supermarket",
  currency: "UGX",
  momoLines: [
    { id: "m1", label: "MTN MoMo", number: "0781137391" },
    { id: "m2", label: "Airtel Money", number: "0743111076" },
  ],
  lowStockThreshold: 5,
});

/* ===================== UTIL ===================== */
const fmt = (n) => "UGX " + Math.round(Number(n) || 0).toLocaleString("en-UG");
const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();
const niceTime = (iso) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/* ===================== ICONS (inline svg, no deps) ===================== */
const Icon = ({ d, size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);
const ICONS = {
  dashboard: "M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-18v6h8V3h-8z",
  sell: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18M16 10a4 4 0 01-8 0",
  box: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  cash: "M2 7h20v10H2zM12 12a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM6 7v10M18 7v10",
  history: "M3 3v5h5M3.05 13A9 9 0 106 5.3L3 8M12 7v5l4 2",
  users: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  printer: "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z",
  undo: "M3 7v6h6M21 17a9 9 0 00-15-6.7L3 13",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  unlock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 019.9-1.5",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
  close: "M18 6L6 18M6 6l12 12",
  receipt: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1V2l-2 1-2-1-2 1-2-1-2 1-2-1zM8 7h8M8 11h8M8 15h5",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  adjust: "M12 20v-6M12 14l-3 3M12 14l3 3M12 4v6M12 10l-3-3M12 10l3-3M4 12h4M16 12h4",
  inbound: "M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v5m18 0v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5m18 0H3m9-7v7m0 0l-3-3m3 3l3-3",
};

/* ===================== ROOT APP ===================== */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [session, setSession] = useState(null); // {userId, shiftId}
  const [toast, setToast] = useState(null);

  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const full = await loadAllFromSupabase();
        if (!full.users || full.users.length === 0) full.users = seedUsers();
        if (!full.settings) full.settings = seedSettings();
        setData(full);
      } catch (e) {
        console.error("Failed to load from Supabase", e);
        setLoadError("Could not connect to the database. Check your internet connection and try reloading the page.");
        setData({
          users: seedUsers(), products: [], sales: [], suppliers: [], supplierTx: [],
          expenses: [], shifts: [], auditLog: [], settings: seedSettings(), stockAdj: [],
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showToast = useCallback((msg, kind = "ok") => {
    setToast({ msg, kind, id: Date.now() });
    setTimeout(() => setToast((t) => (t && t.id === Date.now() ? null : t)), 0);
  }, []);

  // simpler toast auto-clear
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const patch = useCallback((key, updater) => {
    setData((prev) => {
      const next = { ...prev };
      const previousValue = prev[key];
      next[key] = typeof updater === "function" ? updater(prev[key]) : updater;
      saveKeyToSupabase(key, next[key], previousValue);
      return next;
    });
  }, []);

  const addAudit = useCallback((actorId, action, detail) => {
    patch("auditLog", (log) => [{ id: uid("aud"), actorId, action, detail, at: nowISO() }, ...log].slice(0, 500));
  }, [patch]);

  if (loading) {
    return (
      <div style={S.loadingScreen}>
        <div style={S.loadingMark}>𝍕</div>
        <div style={{ fontFamily: F.mono, color: C.cream, letterSpacing: 1 }}>OPENING TILL…</div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen users={data.users} settings={data.settings} onLogin={(u) => setSession({ userId: u.id, shiftId: null })} note={loadError || undefined} />;
  }

  const me = data.users.find((u) => u.id === session.userId);
  if (!me || !me.active) {
    return <LoginScreen users={data.users} settings={data.settings} onLogin={(u) => setSession({ userId: u.id, shiftId: null })} note="That account is no longer active." />;
  }

  return (
    <MainApp
      data={data}
      patch={patch}
      addAudit={addAudit}
      me={me}
      session={session}
      setSession={setSession}
      showToast={showToast}
      toast={toast}
    />
  );
}

/* ===================== FONTS / COLORS / STYLE TOKENS ===================== */
const F = {
  display: "'Fraunces', 'Georgia', serif",
  body: "'Inter', -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
};
const C = {
  green: "#1F4D3A",
  greenDeep: "#143329",
  cream: "#FBF7EE",
  paper: "#FFFFFF",
  charcoal: "#2B2B28",
  terracotta: "#C8602F",
  gold: "#B8923D",
  line: "#E4DDC9",
  muted: "#8A8473",
  danger: "#B23A2E",
  ok: "#2F6B4F",
};

const fontLink = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-thumb { background: #d8d0b8; border-radius: 4px; }
    button { font-family: inherit; cursor: pointer; }
    input, select, textarea { font-family: inherit; }
    .focus-ring:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  `}</style>
);

const S = {
  loadingScreen: { height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: C.greenDeep },
  loadingMark: { fontSize: 40, color: C.gold },
};

/* ===================== LOGIN ===================== */
function LoginScreen({ users, settings, onLogin, note }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(note || "");

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const uname = username.trim().toLowerCase();
    const pass = password.trim();
    if (!uname || !pass) {
      setErr("Enter both a username and password.");
      return;
    }
    const u = users.find((x) => x.username.trim().toLowerCase() === uname && x.password.trim() === pass);
    if (!u) {
      setErr(`No match for username "${username.trim()}". Check spelling — default is admin / admin123.`);
      return;
    }
    if (!u.active) {
      setErr("That account is no longer active.");
      return;
    }
    setErr("");
    onLogin(u);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.greenDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, padding: 20 }}>
      {fontLink}
      <form onSubmit={submit} style={{ background: C.cream, width: 380, maxWidth: "100%", borderRadius: 14, padding: "36px 32px", boxShadow: "0 30px 60px rgba(0,0,0,0.35)", border: `1px solid ${C.line}` }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: F.mono, color: C.gold, fontSize: 12, letterSpacing: 3, marginBottom: 6 }}>TILL SYSTEM</div>
          <h1 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 600, color: C.charcoal, margin: 0 }}>{settings.shopName}</h1>
        </div>
        {err && (
          <div style={{ background: "#FBEAE6", color: C.danger, padding: "10px 14px", borderRadius: 8, fontSize: 13.5, marginBottom: 16, border: `1px solid ${C.danger}33` }}>{err}</div>
        )}
        <label style={lbl}>Username</label>
        <input className="focus-ring" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} style={inp} placeholder="e.g. admin" />
        <label style={lbl}>Password</label>
        <input className="focus-ring" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inp} placeholder="••••••••" />
        <button type="submit" onClick={submit} style={{ ...btnPrimary, width: "100%", marginTop: 18, padding: "13px 0", fontSize: 15 }}>Sign in</button>
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12.5, color: C.muted }}>
          First time here? Default admin is <b>admin</b> / <b>admin123</b> — change the password in Settings.
        </div>
      </form>
    </div>
  );
}

const lbl = { display: "block", fontSize: 12.5, fontWeight: 600, color: C.charcoal, marginBottom: 6, marginTop: 14, letterSpacing: 0.2 };
const inp = { width: "100%", padding: "11px 13px", borderRadius: 8, border: `1.5px solid ${C.line}`, background: C.paper, fontSize: 14.5, color: C.charcoal };
const btnPrimary = { background: C.green, color: C.cream, border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, padding: "10px 18px" };
const btnGhost = { background: "transparent", color: C.green, border: `1.5px solid ${C.green}`, borderRadius: 8, fontWeight: 600, fontSize: 14, padding: "10px 18px" };
const btnDanger = { background: C.danger, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, padding: "10px 18px" };

/* ===================== MAIN APP SHELL ===================== */
function MainApp({ data, patch, addAudit, me, session, setSession, showToast, toast }) {
  const isAdmin = me.role === "admin";
  const activeShift = data.shifts.find((s) => s.userId === me.id && !s.closedAt);
  const [tab, setTab] = useState(activeShift || isAdmin ? "sell" : "openShift");

  const ADMIN_TABS = [
    { id: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
    { id: "sell", label: "Sell", icon: ICONS.sell },
    { id: "products", label: "Inventory", icon: ICONS.box },
    { id: "stockAdj", label: "Stock Adjustments", icon: ICONS.adjust },
    { id: "suppliers", label: "Suppliers", icon: ICONS.truck },
    { id: "expenses", label: "Expenses", icon: ICONS.cash },
    { id: "sales", label: "Sales History", icon: ICONS.history },
    { id: "staff", label: "Staff", icon: ICONS.users },
    { id: "audit", label: "Audit Log", icon: ICONS.alert },
    { id: "settings", label: "Settings", icon: ICONS.settings },
  ];
  const CASHIER_TABS = [
    { id: "sell", label: "Sell", icon: ICONS.sell },
    { id: "sales", label: "My Sales", icon: ICONS.history },
  ];
  const tabs = isAdmin ? ADMIN_TABS : CASHIER_TABS;

  const needsShift = !isAdmin && !activeShift;

  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: F.body, display: "flex" }}>
      {fontLink}
      <Sidebar tabs={tabs} tab={tab} setTab={setTab} me={me} setSession={setSession} shopName={data.settings.shopName} disabled={needsShift} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar me={me} activeShift={activeShift} settings={data.settings} />
        <div style={{ flex: 1, overflow: "auto", padding: "22px 26px 60px" }}>
          {needsShift ? (
            <OpenShiftScreen me={me} patch={patch} addAudit={addAudit} showToast={showToast} />
          ) : (
            <>
              {tab === "dashboard" && isAdmin && <Dashboard data={data} />}
              {tab === "sell" && <SellScreen data={data} patch={patch} addAudit={addAudit} me={me} activeShift={activeShift} showToast={showToast} isAdmin={isAdmin} />}
              {tab === "products" && isAdmin && <ProductsScreen data={data} patch={patch} addAudit={addAudit} me={me} showToast={showToast} />}
              {tab === "stockAdj" && isAdmin && <StockAdjustmentsScreen data={data} patch={patch} addAudit={addAudit} me={me} showToast={showToast} />}
              {tab === "suppliers" && isAdmin && <SuppliersScreen data={data} patch={patch} addAudit={addAudit} me={me} showToast={showToast} />}
              {tab === "expenses" && isAdmin && <ExpensesScreen data={data} patch={patch} addAudit={addAudit} me={me} showToast={showToast} />}
              {tab === "sales" && <SalesHistoryScreen data={data} patch={patch} addAudit={addAudit} me={me} isAdmin={isAdmin} showToast={showToast} />}
              {tab === "staff" && isAdmin && <StaffScreen data={data} patch={patch} addAudit={addAudit} me={me} showToast={showToast} />}
              {tab === "audit" && isAdmin && <AuditScreen data={data} />}
              {tab === "settings" && isAdmin && <SettingsScreen data={data} patch={patch} showToast={showToast} me={me} />}
            </>
          )}
        </div>
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );
}

function Toast({ toast }) {
  const bg = toast.kind === "error" ? C.danger : toast.kind === "warn" ? C.terracotta : C.ok;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: bg, color: "#fff", padding: "13px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", zIndex: 999, maxWidth: 360 }}>
      {toast.msg}
    </div>
  );
}

function Sidebar({ tabs, tab, setTab, me, setSession, shopName, disabled }) {
  return (
    <div style={{ width: 220, background: C.greenDeep, color: C.cream, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontFamily: F.mono, fontSize: 10.5, letterSpacing: 2.5, color: C.gold, marginBottom: 4 }}>TILL SYSTEM</div>
        <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 600, lineHeight: 1.25 }}>{shopName}</div>
      </div>
      <div style={{ flex: 1, padding: "14px 10px", display: "flex", flexDirection: "column", gap: 3, overflow: "auto" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            disabled={disabled}
            onClick={() => setTab(t.id)}
            className="focus-ring"
            style={{
              display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 8, border: "none",
              background: tab === t.id ? "rgba(255,255,255,0.14)" : "transparent",
              color: disabled ? "rgba(255,255,255,0.35)" : C.cream, fontSize: 13.5, fontWeight: 500, textAlign: "left",
              opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <Icon d={t.icon} size={17} />
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginBottom: 8, paddingLeft: 2 }}>
          Signed in as <b style={{ color: C.cream }}>{me.name}</b> · {me.role}
        </div>
        <button onClick={() => setSession(null)} className="focus-ring" style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: C.cream, fontSize: 13 }}>
          <Icon d={ICONS.logout} size={15} /> Sign out
        </button>
      </div>
    </div>
  );
}

function TopBar({ me, activeShift, settings }) {
  return (
    <div style={{ height: 56, background: C.paper, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
      <div style={{ fontSize: 13, color: C.muted }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      {activeShift && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.ok, fontWeight: 600 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: C.ok, display: "inline-block" }} />
          Till open · started {fmt(activeShift.openingCash)}
        </div>
      )}
    </div>
  );
}

/* ===================== OPEN SHIFT (CASHIER) ===================== */
function OpenShiftScreen({ me, patch, addAudit, showToast }) {
  const [cash, setCash] = useState("");
  const open = () => {
    const amt = Number(cash);
    if (isNaN(amt) || amt < 0) { showToast("Enter a valid starting cash amount.", "error"); return; }
    const shift = { id: uid("sh"), userId: me.id, openingCash: amt, openedAt: nowISO(), closedAt: null, closingCash: null, notes: "" };
    patch("shifts", (s) => [shift, ...s]);
    addAudit(me.id, "OPEN_SHIFT", `Opened till with ${fmt(amt)} starting cash.`);
    showToast("Till opened. Have a good shift!");
  };
  return (
    <div style={{ maxWidth: 420, margin: "60px auto", background: C.paper, border: `1px solid ${C.line}`, borderRadius: 14, padding: 32, textAlign: "center" }}>
      <Icon d={ICONS.cash} size={32} className="" />
      <h2 style={{ fontFamily: F.display, fontSize: 22, margin: "14px 0 6px" }}>Open your till</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Count the cash drawer and enter the starting amount before you start selling.</p>
      <input className="focus-ring" autoFocus value={cash} onChange={(e) => setCash(e.target.value)} placeholder="Starting cash (UGX)" style={{ ...inp, textAlign: "center", fontSize: 17, fontFamily: F.mono }} />
      <button onClick={open} style={{ ...btnPrimary, width: "100%", marginTop: 16, padding: "12px 0" }}>Open till</button>
    </div>
  );
}

/* ===================== DASHBOARD ===================== */
function Dashboard({ data }) {
  const [q, setQ] = useState("");
  const today = todayStr();
  const todaysSales = data.sales.filter((s) => todayStr(new Date(s.at)) === today && !s.reversed);
  const todaysExpenses = data.expenses.filter((e) => todayStr(new Date(e.at)) === today);
  const revenue = todaysSales.reduce((a, s) => a + s.total, 0);
  const cost = todaysSales.reduce((a, s) => a + s.items.reduce((x, i) => x + i.cost * i.qty, 0), 0);
  const expenseTotal = todaysExpenses.reduce((a, e) => a + e.amount, 0);
  const profit = revenue - cost - expenseTotal;

  const byMethod = {};
  todaysSales.forEach((s) => { byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.total; });

  const lowStock = data.products.filter((p) => p.stock <= (data.settings.lowStockThreshold ?? 5));
  const supplierDebt = data.suppliers.reduce((a, s) => a + (s.balance || 0), 0);

  const cashierTotals = {};
  todaysSales.forEach((s) => {
    cashierTotals[s.cashierName] = (cashierTotals[s.cashierName] || 0) + s.total;
  });

  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = todayStr(d);
      const dayTotal = data.sales.filter((s) => todayStr(new Date(s.at)) === ds && !s.reversed).reduce((a, s) => a + s.total, 0);
      days.push({ label: d.toLocaleDateString("en-GB", { weekday: "short" }), total: dayTotal });
    }
    return days;
  }, [data.sales]);
  const maxDay = Math.max(...last7.map((d) => d.total), 1);

  const searchResults = q.trim()
    ? data.products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku || "").toLowerCase().includes(q.toLowerCase()))
    : [];

  return (
    <div>
      <SectionHeader title="Today's Till Tape" subtitle={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} />

      <div style={{ position: "relative", maxWidth: 380, marginBottom: 18 }}>
        <input className="focus-ring" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any item — price, stock…" style={{ ...inp, paddingLeft: 36 }} />
        <Icon d={ICONS.search} size={15} className="" />
        {q.trim() && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 12px 30px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 260, overflow: "auto" }}>
            {searchResults.length === 0 && <div style={{ padding: 14, fontSize: 13, color: C.muted, fontStyle: "italic" }}>No items match "{q}".</div>}
            {searchResults.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${C.line}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: C.muted }}>{p.category || "Uncategorized"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 13, color: C.green }}>{fmt(p.salePrice)}</div>
                  <div style={{ fontSize: 11, color: p.stock <= (data.settings.lowStockThreshold ?? 5) ? C.danger : C.muted }}>{p.stock} in stock</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        <StatCard label="Revenue today" value={fmt(revenue)} color={C.green} />
        <StatCard label="Cost of goods sold" value={fmt(cost)} color={C.muted} />
        <StatCard label="Expenses today" value={fmt(expenseTotal)} color={C.terracotta} />
        <StatCard label="Net profit today" value={fmt(profit)} color={profit >= 0 ? C.ok : C.danger} emphasis />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <Card title="Last 7 days">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, padding: "10px 4px" }}>
            {last7.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", maxWidth: 36, height: Math.max(4, (d.total / maxDay) * 100), background: i === 6 ? C.green : C.gold, borderRadius: "4px 4px 0 0" }} title={fmt(d.total)} />
                <div style={{ fontSize: 11, color: C.muted }}>{d.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Payment methods today">
          {Object.keys(byMethod).length === 0 && <Empty text="No sales recorded yet today." />}
          {Object.entries(byMethod).map(([m, v]) => (
            <Row key={m} left={methodLabel(m)} right={fmt(v)} />
          ))}
        </Card>

        <Card title="Cashier performance today">
          {Object.keys(cashierTotals).length === 0 && <Empty text="No sales yet." />}
          {Object.entries(cashierTotals).sort((a, b) => b[1] - a[1]).map(([name, total]) => (
            <Row key={name} left={name} right={fmt(total)} />
          ))}
        </Card>

        <Card title="Alerts" accent={lowStock.length || supplierDebt > 0 ? C.terracotta : C.ok}>
          {lowStock.length === 0 && supplierDebt === 0 && <Empty text="Nothing needs your attention." good />}
          {lowStock.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.terracotta, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon d={ICONS.alert} size={14} /> {lowStock.length} item(s) low on stock
              </div>
              {lowStock.slice(0, 4).map((p) => <Row key={p.id} left={p.name} right={`${p.stock} left`} small />)}
            </div>
          )}
          {supplierDebt > 0 && (
            <Row left="Total owed to suppliers" right={fmt(supplierDebt)} bold />
          )}
        </Card>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
      <div>
        <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 600, color: C.charcoal, margin: 0 }}>{title}</h2>
        {subtitle && <div style={{ color: C.muted, fontSize: 13.5, marginTop: 3 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
function StatCard({ label, value, color, emphasis }) {
  return (
    <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: F.mono, fontSize: emphasis ? 22 : 19, fontWeight: 700, color: emphasis ? color : C.charcoal }}>{value}</div>
    </div>
  );
}
function Card({ title, children, accent }) {
  return (
    <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, borderTop: accent ? `3px solid ${accent}` : undefined }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.charcoal, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
function Row({ left, right, bold, small, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: small ? "5px 0" : "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: small ? 12.5 : 13.5 }}>
      <span style={{ color: bold ? C.charcoal : C.charcoal, fontWeight: bold ? 700 : 500 }}>{left}{sub && <div style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{sub}</div>}</span>
      <span style={{ fontFamily: F.mono, fontWeight: bold ? 700 : 500, color: bold ? C.terracotta : C.charcoal }}>{right}</span>
    </div>
  );
}
function Empty({ text, good }) {
  return <div style={{ color: good ? C.ok : C.muted, fontSize: 13, fontStyle: "italic", padding: "8px 0" }}>{text}</div>;
}
function methodLabel(m) {
  const map = { cash: "Cash", credit: "On credit (customer)", momo1: "MTN MoMo · 0781137391", momo2: "Airtel Money · 0743111076", card: "Credit/Debit Card" };
  return map[m] || m;
}

/* ===================== PRODUCTS / INVENTORY ===================== */
function ProductsScreen({ data, patch, addAudit, me, showToast }) {
  const [editing, setEditing] = useState(null); // product or "new"
  const [q, setQ] = useState("");

  const filtered = data.products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku || "").toLowerCase().includes(q.toLowerCase()));

  const remove = (p) => {
    if (!window.confirm(`Remove "${p.name}" from inventory? This can't be undone.`)) return;
    patch("products", (list) => list.filter((x) => x.id !== p.id));
    addAudit(me.id, "DELETE_PRODUCT", `Removed product "${p.name}".`);
    showToast("Product removed.");
  };

  return (
    <div>
      <SectionHeader title="Inventory" subtitle={`${data.products.length} items listed`} action={
        <button onClick={() => setEditing("new")} style={btnPrimary}><Icon d={ICONS.plus} size={14} /> Add item</button>
      } />

      <div style={{ marginBottom: 14, position: "relative", maxWidth: 320 }}>
        <input className="focus-ring" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items or SKU…" style={{ ...inp, paddingLeft: 36 }} />
        <Icon d={ICONS.search} size={15} className="" />
      </div>

      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        <Table
          head={["Item", "SKU", "Cost", "Sale price", "Pricing", "Stock", ""]}
          rows={filtered.map((p) => [
            <div><div style={{ fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 11.5, color: C.muted }}>{p.category}</div></div>,
            p.sku || "—",
            fmt(p.cost),
            <span>
              {fmt(p.salePrice)}
              {p.priceMode === "negotiable" && p.minSale ? <div style={{ fontSize: 11, color: C.muted }}>min {fmt(p.minSale)}</div> : null}
            </span>,
            <Badge color={p.priceMode === "fixed" ? C.green : C.gold}>{p.priceMode === "fixed" ? "Fixed" : "Negotiable"}</Badge>,
            <span style={{ color: p.stock <= (data.settings.lowStockThreshold ?? 5) ? C.danger : C.charcoal, fontWeight: p.stock <= (data.settings.lowStockThreshold ?? 5) ? 700 : 500 }}>{p.stock}</span>,
            <div style={{ display: "flex", gap: 8 }}>
              <IconBtn onClick={() => setEditing(p)} d={ICONS.edit} />
              <IconBtn onClick={() => remove(p)} d={ICONS.trash} danger />
            </div>,
          ])}
          emptyText="No items yet. Add your first product to get started."
        />
      </div>

      {editing && (
        <ProductModal
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(prod) => {
            if (editing === "new") {
              patch("products", (list) => [...list, prod]);
              addAudit(me.id, "ADD_PRODUCT", `Added product "${prod.name}".`);
              showToast("Item added to inventory.");
            } else {
              patch("products", (list) => list.map((x) => (x.id === prod.id ? prod : x)));
              addAudit(me.id, "EDIT_PRODUCT", `Edited product "${prod.name}".`);
              showToast("Item updated.");
            }
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(product || {
    id: uid("p"), name: "", sku: "", category: "", cost: "", salePrice: "", minSale: "", priceMode: "fixed", stock: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      cost: Number(form.cost) || 0,
      salePrice: Number(form.salePrice) || 0,
      minSale: form.priceMode === "negotiable" ? Number(form.minSale) || 0 : 0,
      stock: Number(form.stock) || 0,
    });
  };

  return (
    <Modal onClose={onClose} title={product ? "Edit item" : "Add item"}>
      <form onSubmit={submit}>
        <label style={lbl}>Item name</label>
        <input className="focus-ring" autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} style={inp} placeholder="e.g. Blue Band Margarine 500g" required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={lbl}>SKU / Barcode</label><input className="focus-ring" value={form.sku} onChange={(e) => set("sku", e.target.value)} style={inp} placeholder="optional" /></div>
          <div><label style={lbl}>Category</label><input className="focus-ring" value={form.category} onChange={(e) => set("category", e.target.value)} style={inp} placeholder="e.g. Dairy" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={lbl}>Cost price (UGX)</label><input className="focus-ring" value={form.cost} onChange={(e) => set("cost", e.target.value)} style={{ ...inp, fontFamily: F.mono }} placeholder="0" inputMode="numeric" required /></div>
          <div><label style={lbl}>Sale price (UGX)</label><input className="focus-ring" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} style={{ ...inp, fontFamily: F.mono }} placeholder="0" inputMode="numeric" required /></div>
        </div>
        <label style={lbl}>Pricing</label>
        <div style={{ display: "flex", gap: 10 }}>
          <ChoiceChip active={form.priceMode === "fixed"} onClick={() => set("priceMode", "fixed")} label="Fixed price" />
          <ChoiceChip active={form.priceMode === "negotiable"} onClick={() => set("priceMode", "negotiable")} label="Negotiable" />
        </div>
        {form.priceMode === "negotiable" && (
          <div style={{ marginTop: 10 }}>
            <label style={lbl}>Minimum sale price (UGX)</label>
            <input className="focus-ring" value={form.minSale} onChange={(e) => set("minSale", e.target.value)} style={{ ...inp, fontFamily: F.mono }} placeholder="Lowest price a cashier may accept" inputMode="numeric" />
          </div>
        )}
        <label style={lbl}>Stock on hand</label>
        <input className="focus-ring" value={form.stock} onChange={(e) => set("stock", e.target.value)} style={{ ...inp, fontFamily: F.mono }} placeholder="0" inputMode="numeric" required />
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button type="submit" onClick={submit} style={{ ...btnPrimary, flex: 1 }}>Save item</button>
          <button type="button" onClick={onClose} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function ChoiceChip({ active, onClick, label }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "8px 14px", borderRadius: 99, fontSize: 13, fontWeight: 600,
      border: `1.5px solid ${active ? C.green : C.line}`, background: active ? C.green : "transparent", color: active ? C.cream : C.charcoal,
    }}>{label}</button>
  );
}

/* ===================== STOCK ADJUSTMENTS ===================== */
const ADJ_REASONS = {
  restock: "Restock (received from supplier)",
  damage: "Damaged / spoiled",
  loss: "Lost / missing",
  theft: "Theft / shrinkage",
  recount: "Recount correction",
  return_to_supplier: "Returned to supplier",
  other: "Other",
};

function StockAdjustmentsScreen({ data, patch, addAudit, me, showToast }) {
  const [adding, setAdding] = useState(null); // "restock" | "adjust" | null
  const [q, setQ] = useState("");

  const filtered = [...data.stockAdj].sort((a, b) => new Date(b.at) - new Date(a.at))
    .filter((a) => a.productName.toLowerCase().includes(q.toLowerCase()) || (a.supplierName || "").toLowerCase().includes(q.toLowerCase()));

  const totalRestockValue = data.stockAdj.filter((a) => a.type === "restock").reduce((s, a) => s + (a.qtyChange * (a.unitCost || 0)), 0);
  const totalLossValue = data.stockAdj.filter((a) => a.qtyChange < 0).reduce((s, a) => s + (Math.abs(a.qtyChange) * (a.unitCost || 0)), 0);

  return (
    <div>
      <SectionHeader
        title="Stock adjustments"
        subtitle={`${data.stockAdj.length} adjustment(s) recorded · ${fmt(totalRestockValue)} restocked value · ${fmt(totalLossValue)} lost/damaged value`}
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setAdding("restock")} style={btnGhost}><Icon d={ICONS.inbound} size={14} /> Receive stock</button>
            <button onClick={() => setAdding("adjust")} style={btnPrimary}><Icon d={ICONS.adjust} size={14} /> Adjust quantity</button>
          </div>
        }
      />

      <div style={{ marginBottom: 14, maxWidth: 320 }}>
        <input className="focus-ring" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by item or supplier…" style={inp} />
      </div>

      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        <Table
          head={["When", "Item", "Type", "Qty change", "New stock", "Value", "Note", "By"]}
          rows={filtered.map((a) => [
            niceTime(a.at),
            a.productName,
            <Badge color={a.type === "restock" ? C.ok : a.qtyChange < 0 ? C.danger : C.gold}>{ADJ_REASONS[a.reason] || a.reason}</Badge>,
            <span style={{ fontFamily: F.mono, fontWeight: 700, color: a.qtyChange >= 0 ? C.ok : C.danger }}>{a.qtyChange >= 0 ? "+" : ""}{a.qtyChange}</span>,
            a.newStock,
            fmt(Math.abs(a.qtyChange) * (a.unitCost || 0)),
            a.note || (a.supplierName ? `Supplier: ${a.supplierName}` : "—"),
            a.byName,
          ])}
          emptyText="No stock adjustments recorded yet. Use 'Receive stock' when goods arrive, or 'Adjust quantity' for damage, loss, or recounts."
        />
      </div>

      {adding && (
        <StockAdjustModal
          mode={adding}
          data={data}
          onClose={() => setAdding(null)}
          onSave={({ product, qtyChange, reason, note, supplierId, unitCost, addSupplierDebt }) => {
            const newStock = Math.max(0, product.stock + qtyChange);
            patch("products", (list) => list.map((p) => (p.id === product.id ? { ...p, stock: newStock, ...(adding === "restock" && unitCost ? { cost: unitCost } : {}) } : p)));

            const supplier = supplierId ? data.suppliers.find((s) => s.id === supplierId) : null;
            const entry = {
              id: uid("adj"),
              productId: product.id,
              productName: product.name,
              type: adding === "restock" ? "restock" : "adjust",
              qtyChange,
              newStock,
              reason,
              note: note.trim(),
              unitCost: unitCost || product.cost || 0,
              supplierId: supplierId || null,
              supplierName: supplier ? supplier.name : "",
              at: nowISO(),
              byId: me.id,
              byName: me.name,
            };
            patch("stockAdj", (list) => [entry, ...list]);

            if (adding === "restock" && supplier && addSupplierDebt) {
              const debtAmount = qtyChange * (unitCost || product.cost || 0);
              patch("suppliers", (list) => list.map((s) => (s.id === supplier.id ? { ...s, balance: (s.balance || 0) + debtAmount } : s)));
              patch("supplierTx", (list) => [{ id: uid("stx"), supplierId: supplier.id, type: "credit_received", amount: debtAmount, note: `Stock received: ${qtyChange} × ${product.name}`, at: nowISO(), by: me.id }, ...list]);
            }

            addAudit(me.id, adding === "restock" ? "RECEIVE_STOCK" : "ADJUST_STOCK",
              `${adding === "restock" ? "Received" : "Adjusted"} ${Math.abs(qtyChange)} unit(s) of "${product.name}" (${qtyChange >= 0 ? "+" : ""}${qtyChange}). Reason: ${ADJ_REASONS[reason] || reason}. New stock: ${newStock}.${note ? " Note: " + note : ""}`);

            showToast(adding === "restock" ? "Stock received and inventory updated." : "Stock adjustment recorded.");
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}

function StockAdjustModal({ mode, data, onClose, onSave }) {
  const isRestock = mode === "restock";
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState(isRestock ? "restock" : "damage");
  const [note, setNote] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [addSupplierDebt, setAddSupplierDebt] = useState(true);
  const [err, setErr] = useState("");

  const product = data.products.find((p) => p.id === productId);

  useEffect(() => {
    if (product && isRestock && !unitCost) setUnitCost(String(product.cost || ""));
  }, [product]); // eslint-disable-line

  const adjReasonOptions = isRestock
    ? [["restock", ADJ_REASONS.restock]]
    : [["damage", ADJ_REASONS.damage], ["loss", ADJ_REASONS.loss], ["theft", ADJ_REASONS.theft], ["recount", ADJ_REASONS.recount], ["return_to_supplier", ADJ_REASONS.return_to_supplier], ["other", ADJ_REASONS.other]];

  const submit = (e) => {
    e.preventDefault();
    setErr("");
    if (!product) { setErr("Select an item first."); return; }
    const n = Number(qty);
    if (!n || n <= 0) { setErr("Enter a quantity greater than zero."); return; }

    let qtyChange;
    if (isRestock) {
      qtyChange = n; // always adds stock
    } else if (reason === "recount") {
      // For recount, the entered qty is the NEW total stock, not a delta
      qtyChange = n - product.stock;
      if (qtyChange === 0) { setErr("New count matches current stock — nothing to adjust."); return; }
    } else {
      qtyChange = -n; // damage/loss/theft/return reduce stock
      if (n > product.stock) { setErr(`Can't remove ${n} — only ${product.stock} in stock.`); return; }
    }

    onSave({
      product, qtyChange, reason, note,
      supplierId: isRestock ? (supplierId || null) : null,
      unitCost: isRestock ? Number(unitCost) || product.cost || 0 : product.cost || 0,
      addSupplierDebt: isRestock && addSupplierDebt,
    });
  };

  return (
    <Modal onClose={onClose} title={isRestock ? "Receive stock" : "Adjust stock quantity"}>
      <form onSubmit={submit}>
        {err && <div style={{ background: "#FBEAE6", color: C.danger, padding: "9px 13px", borderRadius: 8, fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <label style={lbl}>Item</label>
        <select className="focus-ring" value={productId} onChange={(e) => setProductId(e.target.value)} style={inp} required>
          <option value="">Select item…</option>
          {data.products.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.stock} in stock</option>)}
        </select>

        {!isRestock && (
          <>
            <label style={lbl}>Reason</label>
            <select className="focus-ring" value={reason} onChange={(e) => setReason(e.target.value)} style={inp}>
              {adjReasonOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </>
        )}

        <label style={lbl}>{!isRestock && reason === "recount" ? "Correct stock count (new total)" : isRestock ? "Quantity received" : "Quantity to remove"}</label>
        <input className="focus-ring" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} style={{ ...inp, fontFamily: F.mono }} inputMode="numeric" placeholder="0" required />
        {product && !isRestock && reason === "recount" && (
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>Current system stock: {product.stock}. Enter what you actually counted.</div>
        )}

        {isRestock && (
          <>
            <label style={lbl}>Unit cost (UGX) — updates item's cost price</label>
            <input className="focus-ring" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} style={{ ...inp, fontFamily: F.mono }} inputMode="numeric" placeholder="0" />

            <label style={lbl}>Supplier (optional)</label>
            <select className="focus-ring" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={inp}>
              <option value="">No supplier / cash purchase</option>
              {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {supplierId && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13 }}>
                <input type="checkbox" checked={addSupplierDebt} onChange={(e) => setAddSupplierDebt(e.target.checked)} />
                Add this to supplier's balance owed (bought on credit)
              </label>
            )}
          </>
        )}

        <label style={lbl}>Note {isRestock ? "(optional)" : "(recommended)"}</label>
        <input className="focus-ring" value={note} onChange={(e) => setNote(e.target.value)} style={inp} placeholder={isRestock ? "e.g. delivery note number" : "e.g. found broken during shelf check"} />

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="submit" onClick={submit} style={{ ...btnPrimary, flex: 1 }}>{isRestock ? "Confirm receipt" : "Save adjustment"}</button>
          <button type="button" onClick={onClose} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

/* ===================== SELL SCREEN ===================== */
function SellScreen({ data, patch, addAudit, me, activeShift, showToast, isAdmin }) {
  const [cart, setCart] = useState([]); // {productId, name, qty, price, cost, minSale, priceMode}
  const [q, setQ] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [lastReceipt, setLastReceipt] = useState(null);
  const [priceOverride, setPriceOverride] = useState({}); // productId -> override price

  const filtered = data.products.filter((p) => p.stock > 0 && (p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku || "").toLowerCase().includes(q.toLowerCase())));

  const addToCart = (p) => {
    setCart((c) => {
      const existing = c.find((x) => x.productId === p.id);
      if (existing) {
        if (existing.qty + 1 > p.stock) { showToast(`Only ${p.stock} of ${p.name} in stock.`, "warn"); return c; }
        return c.map((x) => (x.productId === p.id ? { ...x, qty: x.qty + 1 } : x));
      }
      return [...c, { productId: p.id, name: p.name, qty: 1, price: priceOverride[p.id] ?? p.salePrice, cost: p.cost, minSale: p.minSale, priceMode: p.priceMode, maxStock: p.stock }];
    });
  };

  const updateQty = (id, qty) => {
    setCart((c) => c.map((x) => (x.productId === id ? { ...x, qty: Math.max(1, Math.min(qty, x.maxStock)) } : x)));
  };
  const updatePrice = (id, price) => {
    setCart((c) => c.map((x) => {
      if (x.productId !== id) return x;
      let p = Number(price) || 0;
      if (x.priceMode === "negotiable" && x.minSale && p < x.minSale) {
        showToast(`Price can't go below the minimum of ${fmt(x.minSale)} for ${x.name}.`, "warn");
        p = x.minSale;
      }
      if (x.priceMode === "fixed") p = x.price; // fixed items can't be edited
      return { ...x, price: p };
    }));
  };
  const removeItem = (id) => setCart((c) => c.filter((x) => x.productId !== id));
  const total = cart.reduce((a, x) => a + x.qty * x.price, 0);

  const completeSale = () => {
    if (cart.length === 0) { showToast("Add at least one item first.", "error"); return; }
    if (paymentMethod === "credit" && !customerName.trim()) { showToast("Enter the customer's name for credit sales.", "error"); return; }

    const sale = {
      id: uid("sale"),
      receiptNo: "R" + Date.now().toString().slice(-8),
      at: nowISO(),
      cashierId: me.id,
      cashierName: me.name,
      items: cart.map((x) => ({ productId: x.productId, name: x.name, qty: x.qty, price: x.price, cost: x.cost })),
      total,
      paymentMethod,
      customerName: paymentMethod === "credit" ? customerName.trim() : "",
      reversed: false,
    };

    patch("products", (list) => list.map((p) => {
      const item = cart.find((x) => x.productId === p.id);
      return item ? { ...p, stock: p.stock - item.qty } : p;
    }));
    patch("sales", (list) => [sale, ...list]);
    addAudit(me.id, "SALE", `Sold ${cart.length} item(s) for ${fmt(total)} via ${methodLabel(paymentMethod)}, receipt ${sale.receiptNo}.`);

    setLastReceipt(sale);
    setCart([]);
    setCustomerName("");
    setPaymentMethod("cash");
    setPriceOverride({});
    showToast("Sale completed.");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, alignItems: "start" }}>
      <div>
        <SectionHeader title="New sale" subtitle={isAdmin ? "Selling as Admin" : `Cashier: ${me.name}`} />
        <div style={{ position: "relative", marginBottom: 14 }}>
          <input className="focus-ring" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items to add…" style={{ ...inp, paddingLeft: 36 }} />
          <Icon d={ICONS.search} size={15} className="" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, maxHeight: 480, overflow: "auto", paddingRight: 4 }}>
          {filtered.length === 0 && <Empty text={data.products.length === 0 ? "No items in inventory yet. Ask the admin to add stock." : "No matching items."} />}
          {filtered.map((p) => (
            <button key={p.id} onClick={() => addToCart(p)} className="focus-ring" style={{
              textAlign: "left", background: C.paper, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 13px", cursor: "pointer",
            }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontFamily: F.mono, fontSize: 13, color: C.green, fontWeight: 700 }}>{fmt(p.salePrice)}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{p.stock} in stock {p.priceMode === "negotiable" && "· negotiable"}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, position: "sticky", top: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon d={ICONS.receipt} size={16} /> Current sale
        </div>
        {cart.length === 0 && <Empty text="Cart is empty. Tap items on the left to add them." />}
        <div style={{ maxHeight: 280, overflow: "auto", marginBottom: 12 }}>
          {cart.map((x) => (
            <div key={x.productId} style={{ borderBottom: `1px solid ${C.line}`, padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{x.name}</span>
                <button onClick={() => removeItem(x.productId)} style={{ background: "none", border: "none", color: C.muted }}><Icon d={ICONS.close} size={14} /></button>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="number" min={1} max={x.maxStock} value={x.qty} onChange={(e) => updateQty(x.productId, Number(e.target.value))} style={{ ...inp, width: 56, padding: "6px 8px", fontFamily: F.mono, fontSize: 13 }} />
                <span style={{ color: C.muted, fontSize: 12 }}>×</span>
                <input
                  type="number"
                  value={x.price}
                  disabled={x.priceMode === "fixed"}
                  onChange={(e) => updatePrice(x.productId, e.target.value)}
                  style={{ ...inp, width: 110, padding: "6px 8px", fontFamily: F.mono, fontSize: 13, opacity: x.priceMode === "fixed" ? 0.6 : 1 }}
                />
                <span style={{ marginLeft: "auto", fontFamily: F.mono, fontWeight: 700, fontSize: 13.5 }}>{fmt(x.qty * x.price)}</span>
              </div>
              {x.priceMode === "negotiable" && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3 }}>Min: {fmt(x.minSale)}</div>}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700, marginBottom: 14, paddingTop: 8, borderTop: `2px solid ${C.charcoal}` }}>
          <span>Total</span><span style={{ fontFamily: F.mono, color: C.green }}>{fmt(total)}</span>
        </div>

        <label style={lbl}>Payment method</label>
        <select className="focus-ring" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ ...inp, marginBottom: 4 }}>
          <option value="cash">Cash</option>
          <option value="momo1">MTN MoMo · 0781137391</option>
          <option value="momo2">Airtel Money · 0743111076</option>
          <option value="card">Credit / Debit Card</option>
          <option value="credit">On credit (pay later)</option>
        </select>

        {paymentMethod === "credit" && (
          <div style={{ marginTop: 10 }}>
            <label style={lbl}>Customer name</label>
            <input className="focus-ring" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={inp} placeholder="Who is this credit for?" />
          </div>
        )}

        <button onClick={completeSale} style={{ ...btnPrimary, width: "100%", marginTop: 16, padding: "13px 0", fontSize: 15 }}>Complete sale · {fmt(total)}</button>
      </div>

      {lastReceipt && <ReceiptModal sale={lastReceipt} settings={data.settings} onClose={() => setLastReceipt(null)} />}
    </div>
  );
}

/* ===================== RECEIPT ===================== */
function ReceiptModal({ sale, settings, onClose }) {
  const printRef = useRef(null);
  const doPrint = () => {
    const w = window.open("", "_blank", "width=380,height=600");
    w.document.write(`<html><head><title>Receipt ${sale.receiptNo}</title>
      <style>
        body{font-family:'JetBrains Mono', monospace; padding:18px; color:#222; font-size:13px;}
        h2{font-size:15px; margin:0 0 2px;text-align:center}
        .c{text-align:center}
        table{width:100%; border-collapse:collapse; margin-top:10px;}
        td{padding:3px 0; font-size:12px;}
        .right{text-align:right}
        hr{border:none;border-top:1px dashed #999;margin:10px 0}
        .tot{font-weight:bold;font-size:14px}
      </style></head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };
  return (
    <Modal onClose={onClose} title="Sale complete">
      <div ref={printRef} style={{ fontFamily: F.mono, fontSize: 13, background: "#fff", border: `1px dashed ${C.line}`, borderRadius: 4, padding: 16 }}>
        <h2 className="c">{settings.shopName}</h2>
        <div className="c" style={{ fontSize: 11, color: C.muted }}>{niceTime(sale.at)}</div>
        <div className="c" style={{ fontSize: 11, color: C.muted }}>Receipt {sale.receiptNo} · Served by {sale.cashierName}</div>
        {sale.customerName && <div className="c" style={{ fontSize: 11, color: C.muted }}>Customer: {sale.customerName}</div>}
        <hr />
        <table>
          {sale.items.map((it, i) => (
            <tr key={i}>
              <td>{it.qty}× {it.name}</td>
              <td className="right">{fmt(it.qty * it.price)}</td>
            </tr>
          ))}
        </table>
        <hr />
        <table>
          <tr><td className="tot">TOTAL</td><td className="right tot">{fmt(sale.total)}</td></tr>
          <tr><td colSpan={2} style={{ paddingTop: 6 }}>Paid via: {methodLabel(sale.paymentMethod)}</td></tr>
        </table>
        <hr />
        <div className="c" style={{ fontSize: 11, color: C.muted }}>Thank you for shopping with us!</div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button onClick={doPrint} style={{ ...btnPrimary, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icon d={ICONS.printer} size={15} /> Print receipt</button>
        <button onClick={onClose} style={{ ...btnGhost, flex: 1 }}>Done</button>
      </div>
    </Modal>
  );
}

/* ===================== SALES HISTORY + REVERSE ===================== */
function SalesHistoryScreen({ data, patch, addAudit, me, isAdmin, showToast }) {
  const [q, setQ] = useState("");
  const [receiptSale, setReceiptSale] = useState(null);
  const [reverseTarget, setReverseTarget] = useState(null);
  const [reason, setReason] = useState("");

  const visible = (isAdmin ? data.sales : data.sales.filter((s) => s.cashierId === me.id))
    .filter((s) => s.receiptNo.toLowerCase().includes(q.toLowerCase()) || s.cashierName.toLowerCase().includes(q.toLowerCase()) || (s.customerName || "").toLowerCase().includes(q.toLowerCase()));

  const doReverse = () => {
    const s = reverseTarget;
    patch("sales", (list) => list.map((x) => (x.id === s.id ? { ...x, reversed: true, reversedAt: nowISO(), reversedBy: me.id, reverseReason: reason } : x)));
    patch("products", (list) => list.map((p) => {
      const item = s.items.find((i) => i.productId === p.id);
      return item ? { ...p, stock: p.stock + item.qty } : p;
    }));
    addAudit(me.id, "REVERSE_SALE", `Reversed sale ${s.receiptNo} (${fmt(s.total)}). Reason: ${reason || "none given"}.`);
    showToast("Sale reversed and stock restored.");
    setReverseTarget(null);
    setReason("");
  };

  return (
    <div>
      <SectionHeader title={isAdmin ? "Sales history" : "My sales"} subtitle={`${visible.length} transaction(s)`} />
      <div style={{ marginBottom: 14, maxWidth: 320 }}>
        <input className="focus-ring" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by receipt, cashier, customer…" style={inp} />
      </div>
      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        <Table
          head={["Receipt", "Time", isAdmin ? "Cashier" : null, "Items", "Total", "Payment", "Status", ""].filter(Boolean)}
          rows={visible.map((s) => [
            s.receiptNo,
            niceTime(s.at),
            isAdmin ? s.cashierName : null,
            `${s.items.length} item(s)`,
            fmt(s.total),
            methodLabel(s.paymentMethod),
            s.reversed ? <Badge color={C.danger}>Reversed</Badge> : <Badge color={C.ok}>Completed</Badge>,
            <div style={{ display: "flex", gap: 8 }}>
              <IconBtn onClick={() => setReceiptSale(s)} d={ICONS.receipt} />
              {isAdmin && !s.reversed && <IconBtn onClick={() => setReverseTarget(s)} d={ICONS.undo} danger />}
            </div>,
          ].filter((_, i) => true).filter((c) => c !== null))}
          emptyText="No sales recorded yet."
        />
      </div>

      {receiptSale && <ReceiptModal sale={receiptSale} settings={data.settings} onClose={() => setReceiptSale(null)} />}

      {reverseTarget && (
        <Modal onClose={() => setReverseTarget(null)} title="Reverse this sale?">
          <p style={{ fontSize: 13.5, color: C.charcoal, lineHeight: 1.5 }}>
            This will mark receipt <b>{reverseTarget.receiptNo}</b> ({fmt(reverseTarget.total)}) as reversed and put the {reverseTarget.items.reduce((a, i) => a + i.qty, 0)} item(s) back into stock. This is logged in the audit trail.
          </p>
          <label style={lbl}>Reason (optional but recommended)</label>
          <input className="focus-ring" value={reason} onChange={(e) => setReason(e.target.value)} style={inp} placeholder="e.g. customer returned item" />
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={doReverse} style={{ ...btnDanger, flex: 1 }}>Reverse sale</button>
            <button onClick={() => setReverseTarget(null)} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ===================== SUPPLIERS ===================== */
function SuppliersScreen({ data, patch, addAudit, me, showToast }) {
  const [editing, setEditing] = useState(null);
  const [ledgerFor, setLedgerFor] = useState(null);
  const [payModal, setPayModal] = useState(null);

  const remove = (s) => {
    if (!window.confirm(`Remove supplier "${s.name}"? Their transaction history will be kept in records.`)) return;
    patch("suppliers", (list) => list.filter((x) => x.id !== s.id));
    addAudit(me.id, "DELETE_SUPPLIER", `Removed supplier "${s.name}".`);
    showToast("Supplier removed.");
  };

  return (
    <div>
      <SectionHeader title="Suppliers" subtitle={`${data.suppliers.length} supplier(s)`} action={
        <button onClick={() => setEditing("new")} style={btnPrimary}><Icon d={ICONS.plus} size={14} /> Add supplier</button>
      } />
      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        <Table
          head={["Supplier", "Contact", "Balance owed", ""]}
          rows={data.suppliers.map((s) => [
            s.name,
            s.phone || "—",
            <span style={{ fontFamily: F.mono, fontWeight: 700, color: s.balance > 0 ? C.terracotta : C.ok }}>{fmt(s.balance || 0)}</span>,
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setLedgerFor(s)} style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}>Statement</button>
              <button onClick={() => setPayModal(s)} style={{ ...btnPrimary, padding: "6px 10px", fontSize: 12 }} disabled={!s.balance}>Record payment</button>
              <IconBtn onClick={() => setEditing(s)} d={ICONS.edit} />
              <IconBtn onClick={() => remove(s)} d={ICONS.trash} danger />
            </div>,
          ])}
          emptyText="No suppliers added yet."
        />
      </div>

      {editing && (
        <SupplierModal
          supplier={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(sup, initialDebt) => {
            if (editing === "new") {
              patch("suppliers", (list) => [...list, sup]);
              if (initialDebt > 0) {
                patch("supplierTx", (list) => [{ id: uid("stx"), supplierId: sup.id, type: "credit_received", amount: initialDebt, note: "Opening balance", at: nowISO(), by: me.id }, ...list]);
              }
              addAudit(me.id, "ADD_SUPPLIER", `Added supplier "${sup.name}".`);
              showToast("Supplier added.");
            } else {
              patch("suppliers", (list) => list.map((x) => (x.id === sup.id ? sup : x)));
              addAudit(me.id, "EDIT_SUPPLIER", `Edited supplier "${sup.name}".`);
              showToast("Supplier updated.");
            }
            setEditing(null);
          }}
        />
      )}

      {ledgerFor && (
        <Modal onClose={() => setLedgerFor(null)} title={`${ledgerFor.name} — Statement`} wide>
          <SupplierLedger supplier={ledgerFor} tx={data.supplierTx.filter((t) => t.supplierId === ledgerFor.id)} />
        </Modal>
      )}

      {payModal && (
        <RecordPaymentModal
          supplier={payModal}
          onClose={() => setPayModal(null)}
          onSave={(amount, note) => {
            patch("suppliers", (list) => list.map((s) => (s.id === payModal.id ? { ...s, balance: Math.max(0, (s.balance || 0) - amount) } : s)));
            patch("supplierTx", (list) => [{ id: uid("stx"), supplierId: payModal.id, type: "payment_made", amount, note, at: nowISO(), by: me.id }, ...list]);
            addAudit(me.id, "SUPPLIER_PAYMENT", `Paid ${fmt(amount)} to supplier "${payModal.name}". New balance: ${fmt(Math.max(0, (payModal.balance || 0) - amount))}.`);
            showToast("Payment recorded. Balance updated.");
            setPayModal(null);
          }}
        />
      )}
    </div>
  );
}

function SupplierModal({ supplier, onClose, onSave }) {
  const [form, setForm] = useState(supplier || { id: uid("sup"), name: "", phone: "", notes: "", balance: 0 });
  const [openingDebt, setOpeningDebt] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const debt = Number(openingDebt) || 0;
    onSave({ ...form, balance: supplier ? form.balance : debt }, debt);
  };
  return (
    <Modal onClose={onClose} title={supplier ? "Edit supplier" : "Add supplier"}>
      <form onSubmit={submit}>
        <label style={lbl}>Supplier name</label>
        <input className="focus-ring" autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} style={inp} required />
        <label style={lbl}>Phone</label>
        <input className="focus-ring" value={form.phone} onChange={(e) => set("phone", e.target.value)} style={inp} placeholder="07xx xxx xxx" />
        {!supplier && (
          <>
            <label style={lbl}>Opening balance owed (if any, UGX)</label>
            <input className="focus-ring" value={openingDebt} onChange={(e) => setOpeningDebt(e.target.value)} style={{ ...inp, fontFamily: F.mono }} placeholder="0" inputMode="numeric" />
          </>
        )}
        <label style={lbl}>Notes</label>
        <textarea className="focus-ring" value={form.notes} onChange={(e) => set("notes", e.target.value)} style={{ ...inp, minHeight: 70, resize: "vertical" }} placeholder="Items they supply, terms, etc." />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="submit" onClick={submit} style={{ ...btnPrimary, flex: 1 }}>Save supplier</button>
          <button type="button" onClick={onClose} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function RecordPaymentModal({ supplier, onClose, onSave }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    onSave(Math.min(amt, supplier.balance), note);
  };
  return (
    <Modal onClose={onClose} title={`Pay ${supplier.name}`}>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>Current balance owed: <b style={{ color: C.terracotta }}>{fmt(supplier.balance || 0)}</b></p>
      <form onSubmit={submit}>
        <label style={lbl}>Amount paid (UGX)</label>
        <input className="focus-ring" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...inp, fontFamily: F.mono }} inputMode="numeric" required />
        <label style={lbl}>Note</label>
        <input className="focus-ring" value={note} onChange={(e) => setNote(e.target.value)} style={inp} placeholder="optional" />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="submit" onClick={submit} style={{ ...btnPrimary, flex: 1 }}>Record payment</button>
          <button type="button" onClick={onClose} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function SupplierLedger({ supplier, tx }) {
  const sorted = [...tx].sort((a, b) => new Date(b.at) - new Date(a.at));
  return (
    <div>
      <div style={{ display: "flex", gap: 20, marginBottom: 16, padding: 14, background: C.cream, borderRadius: 10 }}>
        <div><div style={{ fontSize: 11.5, color: C.muted }}>Phone</div><div style={{ fontWeight: 600 }}>{supplier.phone || "—"}</div></div>
        <div><div style={{ fontSize: 11.5, color: C.muted }}>Current balance owed</div><div style={{ fontWeight: 700, color: supplier.balance > 0 ? C.terracotta : C.ok, fontFamily: F.mono }}>{fmt(supplier.balance || 0)}</div></div>
      </div>
      <Table
        head={["Date", "Type", "Amount", "Note", "By"]}
        rows={sorted.map((t) => [
          niceTime(t.at),
          <Badge color={t.type === "payment_made" ? C.ok : C.terracotta}>{t.type === "payment_made" ? "Payment made" : "Credit received"}</Badge>,
          fmt(t.amount),
          t.note || "—",
          "—",
        ])}
        emptyText="No transactions with this supplier yet."
      />
    </div>
  );
}

/* ===================== EXPENSES ===================== */
const EXPENSE_CATEGORIES = ["Rent", "Utilities (water/electricity)", "Transport/Fuel", "Staff wages", "Repairs & maintenance", "Packaging materials", "Airtime/Data", "Cleaning supplies", "Other"];

function ExpensesScreen({ data, patch, addAudit, me, showToast }) {
  const [adding, setAdding] = useState(false);
  const today = todayStr();
  const todays = data.expenses.filter((e) => todayStr(new Date(e.at)) === today);
  const monthTotal = data.expenses.filter((e) => new Date(e.at).getMonth() === new Date().getMonth() && new Date(e.at).getFullYear() === new Date().getFullYear()).reduce((a, e) => a + e.amount, 0);

  const remove = (e) => {
    if (!window.confirm("Delete this expense record?")) return;
    patch("expenses", (list) => list.filter((x) => x.id !== e.id));
    addAudit(me.id, "DELETE_EXPENSE", `Deleted expense "${e.description}" (${fmt(e.amount)}).`);
    showToast("Expense deleted.");
  };

  return (
    <div>
      <SectionHeader title="Daily expenditures" subtitle={`Today: ${fmt(todays.reduce((a, e) => a + e.amount, 0))} · This month: ${fmt(monthTotal)}`} action={
        <button onClick={() => setAdding(true)} style={btnPrimary}><Icon d={ICONS.plus} size={14} /> Add expense</button>
      } />
      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        <Table
          head={["Date", "Category", "Description", "Amount", "Recorded by", ""]}
          rows={[...data.expenses].sort((a, b) => new Date(b.at) - new Date(a.at)).map((e) => [
            niceTime(e.at), <Badge color={C.gold}>{e.category}</Badge>, e.description, fmt(e.amount), e.byName,
            <IconBtn onClick={() => remove(e)} d={ICONS.trash} danger />,
          ])}
          emptyText="No expenses recorded yet."
        />
      </div>
      {adding && (
        <ExpenseModal
          onClose={() => setAdding(false)}
          onSave={(exp) => {
            patch("expenses", (list) => [{ ...exp, id: uid("exp"), at: nowISO(), byName: me.name, byId: me.id }, ...list]);
            addAudit(me.id, "ADD_EXPENSE", `Recorded expense "${exp.description}" — ${fmt(exp.amount)}.`);
            showToast("Expense recorded.");
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

function ExpenseModal({ onClose, onSave }) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    onSave({ category, description: description.trim() || category, amount: Number(amount) });
  };
  return (
    <Modal onClose={onClose} title="Record expense">
      <form onSubmit={submit}>
        <label style={lbl}>Category</label>
        <select className="focus-ring" value={category} onChange={(e) => setCategory(e.target.value)} style={inp}>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={lbl}>Description</label>
        <input className="focus-ring" value={description} onChange={(e) => setDescription(e.target.value)} style={inp} placeholder="What was this for?" />
        <label style={lbl}>Amount (UGX)</label>
        <input className="focus-ring" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...inp, fontFamily: F.mono }} inputMode="numeric" required />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="submit" onClick={submit} style={{ ...btnPrimary, flex: 1 }}>Save expense</button>
          <button type="button" onClick={onClose} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

/* ===================== STAFF (ADMIN MANAGES CASHIERS) ===================== */
function StaffScreen({ data, patch, addAudit, me, showToast }) {
  const [editing, setEditing] = useState(null);

  const toggleActive = (u) => {
    patch("users", (list) => list.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)));
    addAudit(me.id, "TOGGLE_STAFF", `${u.active ? "Deactivated" : "Activated"} staff "${u.name}".`);
    showToast(`${u.name} ${u.active ? "deactivated" : "activated"}.`);
  };
  const remove = (u) => {
    if (u.role === "admin") { showToast("You can't remove an admin account here.", "error"); return; }
    if (!window.confirm(`Remove staff member "${u.name}"? Their past sales remain on record.`)) return;
    patch("users", (list) => list.filter((x) => x.id !== u.id));
    addAudit(me.id, "DELETE_STAFF", `Removed staff "${u.name}".`);
    showToast("Staff member removed.");
  };

  return (
    <div>
      <SectionHeader title="Staff" subtitle={`${data.users.length} account(s)`} action={
        <button onClick={() => setEditing("new")} style={btnPrimary}><Icon d={ICONS.plus} size={14} /> Add cashier</button>
      } />
      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        <Table
          head={["Name", "Username", "Role", "Status", ""]}
          rows={data.users.map((u) => [
            u.name, u.username,
            <Badge color={u.role === "admin" ? C.green : C.gold}>{u.role}</Badge>,
            <Badge color={u.active ? C.ok : C.muted}>{u.active ? "Active" : "Inactive"}</Badge>,
            <div style={{ display: "flex", gap: 8 }}>
              <IconBtn onClick={() => setEditing(u)} d={ICONS.edit} />
              {u.role !== "admin" && <IconBtn onClick={() => toggleActive(u)} d={u.active ? ICONS.lock : ICONS.unlock} />}
              {u.role !== "admin" && <IconBtn onClick={() => remove(u)} d={ICONS.trash} danger />}
            </div>,
          ])}
          emptyText="No staff yet."
        />
      </div>
      {editing && (
        <StaffModal
          user={editing === "new" ? null : editing}
          existingUsernames={data.users.map((u) => u.username.toLowerCase())}
          onClose={() => setEditing(null)}
          onSave={(u) => {
            if (editing === "new") {
              patch("users", (list) => [...list, u]);
              addAudit(me.id, "ADD_STAFF", `Added cashier "${u.name}".`);
              showToast("Cashier account created.");
            } else {
              patch("users", (list) => list.map((x) => (x.id === u.id ? u : x)));
              addAudit(me.id, "EDIT_STAFF", `Edited staff "${u.name}".`);
              showToast("Staff updated.");
            }
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function StaffModal({ user, existingUsernames, onClose, onSave }) {
  const [form, setForm] = useState(user || { id: uid("u"), name: "", username: "", password: "", role: "cashier", active: true });
  const [err, setErr] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    const uname = form.username.trim().toLowerCase();
    if (!user && existingUsernames.includes(uname)) { setErr("That username is already taken."); return; }
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) { setErr("All fields are required."); return; }
    onSave({ ...form, username: form.username.trim() });
  };
  return (
    <Modal onClose={onClose} title={user ? "Edit staff" : "Add cashier"}>
      <form onSubmit={submit}>
        {err && <div style={{ background: "#FBEAE6", color: C.danger, padding: "9px 13px", borderRadius: 8, fontSize: 13, marginBottom: 8 }}>{err}</div>}
        <label style={lbl}>Full name</label>
        <input className="focus-ring" autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} style={inp} required />
        <label style={lbl}>Username</label>
        <input className="focus-ring" value={form.username} onChange={(e) => set("username", e.target.value)} style={inp} required />
        <label style={lbl}>{user ? "New password (leave blank to keep current)" : "Password"}</label>
        <input className="focus-ring" type="text" value={form.password} onChange={(e) => set("password", e.target.value)} style={inp} placeholder={user ? "••••••••" : ""} required={!user} />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="submit" onClick={submit} style={{ ...btnPrimary, flex: 1 }}>Save</button>
          <button type="button" onClick={onClose} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

/* ===================== AUDIT LOG ===================== */
function AuditScreen({ data }) {
  const nameFor = (id) => data.users.find((u) => u.id === id)?.name || "Unknown";
  return (
    <div>
      <SectionHeader title="Audit log" subtitle="Every reversal, edit and account change, in case something needs explaining later" />
      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        <Table
          head={["When", "Who", "Action", "Detail"]}
          rows={data.auditLog.map((a) => [niceTime(a.at), nameFor(a.actorId), <Badge color={a.action.includes("REVERSE") || a.action.includes("DELETE") ? C.danger : C.green}>{a.action.replace(/_/g, " ")}</Badge>, a.detail])}
          emptyText="No activity logged yet."
        />
      </div>
    </div>
  );
}

/* ===================== SETTINGS ===================== */
function SettingsScreen({ data, patch, showToast, me }) {
  const [shopName, setShopName] = useState(data.settings.shopName);
  const [threshold, setThreshold] = useState(data.settings.lowStockThreshold);
  const [momoLines, setMomoLines] = useState(data.settings.momoLines);
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passErr, setPassErr] = useState("");

  const save = () => {
    patch("settings", { ...data.settings, shopName, lowStockThreshold: Number(threshold) || 5, momoLines });
    showToast("Settings saved.");
  };
  const updateLine = (id, field, val) => setMomoLines((lines) => lines.map((l) => (l.id === id ? { ...l, [field]: val } : l)));

  const changePassword = () => {
    setPassErr("");
    if (curPass.trim() !== me.password.trim()) { setPassErr("Current password is incorrect."); return; }
    if (!newPass.trim() || newPass.trim().length < 4) { setPassErr("New password should be at least 4 characters."); return; }
    if (newPass.trim() !== confirmPass.trim()) { setPassErr("New password and confirmation don't match."); return; }
    patch("users", (list) => list.map((u) => (u.id === me.id ? { ...u, password: newPass.trim() } : u)));
    setCurPass(""); setNewPass(""); setConfirmPass("");
    showToast("Password changed.");
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <SectionHeader title="Settings" />
      <Card title="Shop details">
        <label style={lbl}>Shop name</label>
        <input className="focus-ring" value={shopName} onChange={(e) => setShopName(e.target.value)} style={inp} />
        <label style={lbl}>Low stock alert threshold</label>
        <input className="focus-ring" value={threshold} onChange={(e) => setThreshold(e.target.value)} style={{ ...inp, fontFamily: F.mono, width: 120 }} inputMode="numeric" />
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>You'll be alerted on the dashboard when stock falls to or below this number.</div>
      </Card>

      <div style={{ height: 14 }} />

      <Card title="Mobile money lines">
        {momoLines.map((l) => (
          <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input className="focus-ring" value={l.label} onChange={(e) => updateLine(l.id, "label", e.target.value)} style={inp} placeholder="Network label" />
            <input className="focus-ring" value={l.number} onChange={(e) => updateLine(l.id, "number", e.target.value)} style={{ ...inp, fontFamily: F.mono }} placeholder="07xx xxx xxx" />
          </div>
        ))}
      </Card>

      <div style={{ marginTop: 20 }}>
        <button onClick={save} style={btnPrimary}>Save settings</button>
      </div>

      <div style={{ height: 20 }} />

      <Card title="Change my password">
        {passErr && <div style={{ background: "#FBEAE6", color: C.danger, padding: "9px 13px", borderRadius: 8, fontSize: 13, marginBottom: 10 }}>{passErr}</div>}
        <label style={lbl}>Current password</label>
        <input className="focus-ring" type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} style={inp} />
        <label style={lbl}>New password</label>
        <input className="focus-ring" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} style={inp} />
        <label style={lbl}>Confirm new password</label>
        <input className="focus-ring" type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} style={inp} />
        <button onClick={changePassword} style={{ ...btnPrimary, marginTop: 16 }}>Update password</button>
      </Card>
    </div>
  );
}

/* ===================== SHARED UI BITS ===================== */
function Modal({ children, onClose, title, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.cream, borderRadius: 14, padding: 26, width: wide ? 600 : 420, maxWidth: "100%", maxHeight: "88vh", overflow: "auto", boxShadow: "0 30px 70px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontFamily: F.display, fontSize: 19, fontWeight: 600, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted }}><Icon d={ICONS.close} size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Table({ head, rows, emptyText }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
      <thead>
        <tr style={{ background: C.cream }}>
          {head.map((h, i) => <th key={i} style={{ textAlign: "left", padding: "11px 16px", fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${C.line}` }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={head.length} style={{ padding: "30px 16px", textAlign: "center", color: C.muted, fontStyle: "italic" }}>{emptyText}</td></tr>}
        {rows.map((r, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
            {r.map((c, j) => <td key={j} style={{ padding: "11px 16px", verticalAlign: "middle" }}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function Badge({ children, color }) {
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + "1A", color }}>{children}</span>;
}
function IconBtn({ onClick, d, danger }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: `1px solid ${danger ? C.danger + "55" : C.line}`, borderRadius: 7, padding: 6, color: danger ? C.danger : C.charcoal, display: "flex" }}>
      <Icon d={d} size={14} />
    </button>
  );
}
