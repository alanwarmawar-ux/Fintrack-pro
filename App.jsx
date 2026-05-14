import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, ArrowUpDown, TrendingUp, BarChart3, Settings,
  Plus, X, Edit2, Trash2, Search, Wallet
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

// ─── HELPERS ──────────────────────────────────────────────
const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtShort = (v) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}M`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}jt`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}rb`;
  return String(v);
};
const genId = () => Math.random().toString(36).substr(2, 9);
const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
const getMonthYear = (d) => { const dt = new Date(d); return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`; };
const TODAY = new Date().toISOString().split("T")[0];
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().split("T")[0];

// ─── CONSTANTS ────────────────────────────────────────────
const ACCENT_PRESETS = [
  "#06b6d4","#10b981","#8b5cf6","#f43f5e","#f59e0b","#3b82f6"
];
const PIE_COLORS = ["#06b6d4","#10b981","#8b5cf6","#f43f5e","#f59e0b","#3b82f6","#ec4899","#14b8a6"];
const ASSET_TYPES = [
  { value: "stock", label: "📈 Saham" },
  { value: "crypto", label: "₿ Kripto" },
  { value: "mutual_fund", label: "📊 Reksa Dana" },
  { value: "gold", label: "🥇 Emas" },
  { value: "bonds", label: "🏦 Obligasi" },
  { value: "custom", label: "📦 Lainnya" },
];
const TYPE_LABELS = { stock:"Saham", crypto:"Kripto", mutual_fund:"Reksa Dana", gold:"Emas", bonds:"Obligasi", custom:"Lainnya" };
const TYPE_ICONS  = { stock:"📈", crypto:"₿", mutual_fund:"📊", gold:"🥇", bonds:"🏦", custom:"📦" };

const DEFAULT_CATEGORIES = {
  expense: ["Makan & Minum","Transport","Tagihan","Belanja","Hiburan","Kesehatan","Investasi","Lainnya"],
  income:  ["Freelance","Gaji","Investasi","Bisnis","Bonus","Lainnya"],
};

const SAMPLE_TX = [
  { id:genId(), date:TODAY,       amount:2500000,  category:"Freelance",     label:"Project Website Client A", type:"income",  tags:[] },
  { id:genId(), date:TODAY,       amount:85000,    category:"Makan & Minum", label:"Makan siang",              type:"expense", tags:[] },
  { id:genId(), date:daysAgo(5),  amount:1200000,  category:"Freelance",     label:"Konsultasi UI/UX",         type:"income",  tags:[] },
  { id:genId(), date:daysAgo(7),  amount:500000,   category:"Tagihan",       label:"Internet bulanan",         type:"expense", tags:[] },
  { id:genId(), date:daysAgo(10), amount:3000000,  category:"Freelance",     label:"Project Desain Logo",      type:"income",  tags:[] },
  { id:genId(), date:daysAgo(15), amount:200000,   category:"Transport",     label:"Bensin",                   type:"expense", tags:[] },
  { id:genId(), date:daysAgo(32), amount:800000,   category:"Freelance",     label:"Review kode",              type:"income",  tags:[] },
  { id:genId(), date:daysAgo(33), amount:350000,   category:"Belanja",       label:"Peralatan kantor",         type:"expense", tags:[] },
  { id:genId(), date:daysAgo(65), amount:1500000,  category:"Freelance",     label:"Maintenance web",          type:"income",  tags:[] },
  { id:genId(), date:daysAgo(66), amount:750000,   category:"Investasi",     label:"Top-up reksa dana",        type:"expense", tags:[] },
];

const SAMPLE_ASSETS = [
  { id:genId(), name:"Bank Central Asia", ticker:"BBCA",  type:"stock",       buyPrice:9200,      quantity:10,    buyDate:daysAgo(60), currentPrice:9450,      notes:"Blue chip IDX" },
  { id:genId(), name:"Bitcoin",           ticker:"BTC",   type:"crypto",      buyPrice:850000000, quantity:0.002, buyDate:daysAgo(30), currentPrice:920000000, notes:"" },
  { id:genId(), name:"Reksa Dana Pasar Uang", ticker:"RDPU", type:"mutual_fund", buyPrice:1000000, quantity:5,  buyDate:daysAgo(60), currentPrice:1035000,   notes:"Likuid" },
  { id:genId(), name:"Ethereum",          ticker:"ETH",   type:"crypto",      buyPrice:48000000,  quantity:0.05,  buyDate:daysAgo(45), currentPrice:52000000,  notes:"" },
];

// ─── MODAL WRAPPER ────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
         style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
      <div className="w-full max-w-md rounded-2xl p-5"
           style={{ background:"#131929", border:"1px solid rgba(255,255,255,0.09)" }}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-black text-white text-base">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── INPUT HELPERS ────────────────────────────────────────
const inputCls = "w-full rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none";
const inputStyle = { background:"#0d1424", border:"1px solid rgba(255,255,255,0.07)", colorScheme:"dark" };

// ─── TRANSACTION MODAL ────────────────────────────────────
function TransactionModal({ transaction, categories, accent, onSave, onClose }) {
  const isEdit = !!transaction?.id;
  const [form, setForm] = useState(transaction || {
    date:TODAY, amount:"", category:categories.income[0], label:"", type:"income", tags:[]
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const cats = categories[form.type] || [];

  const submit = () => {
    if (!form.amount || !form.label) return;
    onSave({ ...form, id: form.id || genId(), amount: parseFloat(form.amount) });
  };

  return (
    <Modal title={isEdit ? "Edit Transaksi" : "Tambah Transaksi"} onClose={onClose}>
      <div className="space-y-3">
        {/* Type toggle */}
        <div className="flex rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
          {["income","expense"].map(t => (
            <button key={t} onClick={() => { set("type", t); set("category", categories[t][0]); }}
              className="flex-1 py-2.5 text-sm font-bold transition-all"
              style={{
                background: form.type === t ? (t==="income" ? "#10b981" : "#f43f5e") : "transparent",
                color: form.type === t ? "white" : "#6b7280"
              }}>
              {t === "income" ? "💰 Pemasukan" : "💸 Pengeluaran"}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Jumlah (Rp)</label>
          <input type="number" placeholder="0" value={form.amount}
            onChange={e => set("amount", e.target.value)}
            className={inputCls + " text-xl font-black"} style={{ ...inputStyle, border:`1px solid ${accent}40` }} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Keterangan</label>
          <input type="text" placeholder="Nama transaksi..." value={form.label}
            onChange={e => set("label", e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Kategori</label>
          <select value={form.category} onChange={e => set("category", e.target.value)}
            className={inputCls} style={inputStyle}>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Tanggal</label>
          <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
            className={inputCls} style={inputStyle} />
        </div>
        <button onClick={submit}
          className="w-full py-3.5 rounded-xl font-black text-white text-sm transition-all hover:opacity-90 active:scale-95 mt-1"
          style={{ background: accent }}>
          {isEdit ? "Simpan Perubahan" : "Tambah Transaksi"}
        </button>
      </div>
    </Modal>
  );
}

// ─── ASSET MODAL ──────────────────────────────────────────
function AssetModal({ asset, accent, onSave, onClose }) {
  const isEdit = !!asset?.id;
  const [form, setForm] = useState(asset || {
    name:"", ticker:"", type:"stock", buyPrice:"", quantity:"", buyDate:TODAY, currentPrice:"", notes:""
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = () => {
    if (!form.name || !form.buyPrice || !form.quantity) return;
    onSave({
      ...form, id: form.id || genId(),
      buyPrice: parseFloat(form.buyPrice),
      quantity: parseFloat(form.quantity),
      currentPrice: parseFloat(form.currentPrice || form.buyPrice),
    });
  };

  return (
    <Modal title={isEdit ? "Edit Aset" : "Tambah Aset"} onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-3 gap-2">
          {ASSET_TYPES.map(t => (
            <button key={t.value} onClick={() => set("type", t.value)}
              className="py-2 px-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: form.type === t.value ? accent+"30" : "#0d1424",
                border: `1px solid ${form.type === t.value ? accent : "rgba(255,255,255,0.07)"}`,
                color: form.type === t.value ? accent : "#6b7280"
              }}>
              {t.label}
            </button>
          ))}
        </div>
        {[
          { key:"name",         label:"Nama Aset",               placeholder:"e.g. Bank BCA",  type:"text"   },
          { key:"ticker",       label:"Kode / Ticker",           placeholder:"e.g. BBCA",      type:"text"   },
          { key:"buyPrice",     label:"Harga Beli (Rp)",         placeholder:"0",              type:"number" },
          { key:"quantity",     label:"Jumlah / Lot / Unit",     placeholder:"0",              type:"number" },
          { key:"currentPrice", label:"Harga Sekarang (Rp)",     placeholder:"0 (opsional)",   type:"number" },
          { key:"buyDate",      label:"Tanggal Beli",            placeholder:"",               type:"date"   },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
              onChange={e => set(f.key, e.target.value)} className={inputCls} style={inputStyle} />
          </div>
        ))}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Catatan (opsional)</label>
          <textarea placeholder="Strategi, alasan beli, dll..."
            value={form.notes} onChange={e => set("notes", e.target.value)}
            rows={2} className={inputCls + " resize-none"} style={inputStyle} />
        </div>
      </div>
      <button onClick={submit}
        className="w-full py-3.5 rounded-xl font-black text-white text-sm transition-all hover:opacity-90 active:scale-95 mt-4"
        style={{ background: accent }}>
        {isEdit ? "Simpan Perubahan" : "Tambah Aset"}
      </button>
    </Modal>
  );
}

// ─── STAT CARD ────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="rounded-2xl p-4" style={{ background:"#131929", border:"1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        {icon && <span className="text-base">{icon}</span>}
      </div>
      <div className="text-lg font-black leading-tight" style={{ color: color || "white" }}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

// ─── FAB ──────────────────────────────────────────────────
function FAB({ accent, onClick }) {
  return (
    <button onClick={onClick}
      className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center z-40 transition-all hover:scale-105 active:scale-95"
      style={{ background: accent, boxShadow:`0 8px 32px ${accent}70` }}>
      <Plus size={22} color="white" strokeWidth={2.5} />
    </button>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────
function Dashboard({ transactions, assets, accent }) {
  const totalIncome  = transactions.filter(t => t.type==="income").reduce((s,t)=>s+t.amount,0);
  const totalExpense = transactions.filter(t => t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const cashBalance  = totalIncome - totalExpense;
  const portValue    = assets.reduce((s,a)=>s+(a.currentPrice*a.quantity),0);
  const portCost     = assets.reduce((s,a)=>s+(a.buyPrice*a.quantity),0);
  const portPnL      = portValue - portCost;
  const portPct      = portCost>0 ? (portPnL/portCost*100) : 0;
  const netWorth     = cashBalance + portValue;

  const monthlyData = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const m = getMonthYear(t.date);
      if (!map[m]) map[m] = { month:m, income:0, expense:0 };
      t.type==="income" ? (map[m].income+=t.amount) : (map[m].expense+=t.amount);
    });
    return Object.values(map).slice(-6);
  }, [transactions]);

  const allocationData = useMemo(() => {
    const map = {};
    assets.forEach(a => {
      if (!map[a.type]) map[a.type] = { name:a.type, value:0 };
      map[a.type].value += a.currentPrice * a.quantity;
    });
    return Object.values(map);
  }, [assets]);

  const recentTx = [...transactions].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);

  return (
    <div className="space-y-4 pb-28">
      {/* Net Worth Hero */}
      <div className="rounded-2xl p-5 relative overflow-hidden"
           style={{ background:`linear-gradient(135deg,${accent}22,${accent}08)`, border:`1px solid ${accent}35` }}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full"
             style={{ background:accent, filter:"blur(50px)", opacity:0.15 }} />
        <p className="text-xs text-gray-400 mb-1">Total Net Worth</p>
        <p className="text-3xl font-black text-white tracking-tight">{fmtRp(netWorth)}</p>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          <span className="text-gray-400">💼 Kas: <span className="text-white font-bold">Rp {fmtShort(cashBalance)}</span></span>
          <span className="text-gray-400">📊 Porto: <span className="font-bold" style={{color:accent}}>Rp {fmtShort(portValue)}</span></span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Pemasukan"   value={`Rp ${fmtShort(totalIncome)}`}           color="#10b981"                              icon="💰" />
        <StatCard label="Total Pengeluaran" value={`Rp ${fmtShort(totalExpense)}`}          color="#f43f5e"                              icon="💸" />
        <StatCard label="Nilai Portofolio"  value={`Rp ${fmtShort(portValue)}`}             color={accent}                               icon="📈" />
        <StatCard label="P&L Portofolio"
          value={`${portPct>=0?"+":""}${portPct.toFixed(1)}%`}
          sub={`${portPnL>=0?"+":"-"}Rp ${fmtShort(Math.abs(portPnL))}`}
          color={portPnL>=0 ? "#10b981" : "#f43f5e"}
          icon="🎯" />
      </div>

      {/* Monthly Cash Flow */}
      <div className="rounded-2xl p-4" style={{ background:"#131929", border:"1px solid rgba(255,255,255,0.06)" }}>
        <p className="font-bold text-white text-sm mb-3">Arus Kas Bulanan</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={monthlyData} barGap={3}>
            <XAxis dataKey="month" tick={{fill:"#6b7280",fontSize:10}} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{background:"#1a2438",border:"none",borderRadius:10,fontSize:11}}
                     formatter={v=>[fmtRp(v)]} />
            <Bar dataKey="income"  fill="#10b981" radius={[4,4,0,0]} name="Pemasukan" />
            <Bar dataKey="expense" fill="#f43f5e" radius={[4,4,0,0]} name="Pengeluaran" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Portfolio Allocation */}
      {assets.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background:"#131929", border:"1px solid rgba(255,255,255,0.06)" }}>
          <p className="font-bold text-white text-sm mb-3">Alokasi Portofolio</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="45%" height={110}>
              <PieChart>
                <Pie data={allocationData} cx="50%" cy="50%" innerRadius={28} outerRadius={52}
                  dataKey="value" paddingAngle={4}>
                  {allocationData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {allocationData.map((d,i)=>(
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{background:PIE_COLORS[i%PIE_COLORS.length]}} />
                    <span className="text-gray-400">{TYPE_LABELS[d.name]||d.name}</span>
                  </div>
                  <span className="text-white font-semibold">{((d.value/portValue)*100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="rounded-2xl p-4" style={{ background:"#131929", border:"1px solid rgba(255,255,255,0.06)" }}>
        <p className="font-bold text-white text-sm mb-3">Transaksi Terkini</p>
        <div className="space-y-3">
          {recentTx.map(tx => (
            <div key={tx.id} className="flex items-center justify-between gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                   style={{background:tx.type==="income"?"#10b98118":"#f43f5e18",color:tx.type==="income"?"#10b981":"#f43f5e"}}>
                {tx.type==="income"?"↑":"↓"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-semibold truncate">{tx.label}</p>
                <p className="text-xs text-gray-500">{tx.category} · {tx.date}</p>
              </div>
              <span className="font-bold text-sm whitespace-nowrap"
                    style={{color:tx.type==="income"?"#10b981":"#f43f5e"}}>
                {tx.type==="income"?"+":"-"}Rp {fmtShort(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TRANSACTIONS ─────────────────────────────────────────
function Transactions({ transactions, setTransactions, categories, accent }) {
  const [modal, setModal]       = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch]     = useState("");
  const [ft, setFt]             = useState("all");

  const filtered = transactions
    .filter(t => {
      const ms = t.label.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
      const mt = ft==="all" || t.type===ft;
      return ms && mt;
    })
    .sort((a,b) => new Date(b.date)-new Date(a.date));

  const sumIn  = filtered.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const sumOut = filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);

  const save = (tx) => {
    setTransactions(prev => prev.find(t=>t.id===tx.id) ? prev.map(t=>t.id===tx.id?tx:t) : [tx,...prev]);
    setModal(false); setEditItem(null);
  };
  const del = (id) => setTransactions(prev=>prev.filter(t=>t.id!==id));

  return (
    <div className="space-y-4 pb-28">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{background:"#10b98112",border:"1px solid #10b98130"}}>
          <p className="text-xs text-gray-500">Pemasukan</p>
          <p className="text-base font-black text-emerald-400">Rp {fmtShort(sumIn)}</p>
        </div>
        <div className="rounded-xl p-3" style={{background:"#f43f5e12",border:"1px solid #f43f5e30"}}>
          <p className="text-xs text-gray-500">Pengeluaran</p>
          <p className="text-base font-black text-rose-400">Rp {fmtShort(sumOut)}</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
             style={{background:"#131929",border:"1px solid rgba(255,255,255,0.06)"}}>
          <Search size={14} className="text-gray-500 flex-shrink-0" />
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Cari transaksi..." style={{background:"transparent"}}
            className="flex-1 text-white text-sm placeholder-gray-600 focus:outline-none" />
        </div>
        <div className="flex rounded-xl overflow-hidden" style={{border:"1px solid rgba(255,255,255,0.06)"}}>
          {[["all","Semua"],["income","↑"],["expense","↓"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFt(v)}
              className="px-3 py-2 text-xs font-bold transition-all"
              style={{background:ft===v?accent:"#131929", color:ft===v?"white":"#6b7280"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length===0
        ? <div className="text-center py-16 text-gray-600"><Wallet size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Belum ada transaksi</p></div>
        : <div className="space-y-2">
            {filtered.map(tx=>(
              <div key={tx.id} className="rounded-xl p-3.5 flex items-center gap-3 group transition-all"
                   style={{background:"#131929",border:"1px solid rgba(255,255,255,0.06)"}}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                     style={{background:tx.type==="income"?"#10b98118":"#f43f5e18",color:tx.type==="income"?"#10b981":"#f43f5e"}}>
                  {tx.type==="income"?"↑":"↓"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{tx.label}</p>
                  <p className="text-xs text-gray-500">{tx.category} · {tx.date}</p>
                </div>
                <div className="flex items-center gap-2 ml-1">
                  <span className="font-black text-sm whitespace-nowrap"
                        style={{color:tx.type==="income"?"#10b981":"#f43f5e"}}>
                    {tx.type==="income"?"+":"-"}Rp {fmtShort(tx.amount)}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={()=>{setEditItem(tx);setModal(true);}}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
                      style={{background:"rgba(255,255,255,0.05)"}}>
                      <Edit2 size={12}/>
                    </button>
                    <button onClick={()=>del(tx.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 transition-colors"
                      style={{background:"rgba(255,255,255,0.05)"}}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
      }

      <FAB accent={accent} onClick={()=>{setEditItem(null);setModal(true);}} />
      {modal && <TransactionModal transaction={editItem} categories={categories} accent={accent}
        onSave={save} onClose={()=>{setModal(false);setEditItem(null);}} />}
    </div>
  );
}

// ─── PORTFOLIO ────────────────────────────────────────────
function Portfolio({ assets, setAssets, accent }) {
  const [modal, setModal]       = useState(false);
  const [editItem, setEditItem] = useState(null);

  const totalValue = assets.reduce((s,a)=>s+(a.currentPrice*a.quantity),0);
  const totalCost  = assets.reduce((s,a)=>s+(a.buyPrice*a.quantity),0);
  const totalPnL   = totalValue - totalCost;
  const totalPct   = totalCost>0 ? (totalPnL/totalCost*100) : 0;

  const save = (asset) => {
    setAssets(prev => prev.find(a=>a.id===asset.id) ? prev.map(a=>a.id===asset.id?asset:a) : [asset,...prev]);
    setModal(false); setEditItem(null);
  };
  const del = (id) => setAssets(prev=>prev.filter(a=>a.id!==id));

  return (
    <div className="space-y-4 pb-28">
      {/* Summary Hero */}
      <div className="rounded-2xl p-5 relative overflow-hidden"
           style={{background:`linear-gradient(135deg,${accent}22,${accent}08)`,border:`1px solid ${accent}35`}}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full"
             style={{background:accent,filter:"blur(50px)",opacity:0.15}}/>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs text-gray-400">Total Nilai Portofolio</p>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{background:"#10b98120",color:"#10b981"}}>
            ● Live Sim
          </span>
        </div>
        <p className="text-3xl font-black text-white tracking-tight">{fmtRp(totalValue)}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                style={{background:totalPnL>=0?"#10b98120":"#f43f5e20",color:totalPnL>=0?"#10b981":"#f43f5e"}}>
            {totalPnL>=0?"▲":"▼"} {Math.abs(totalPct).toFixed(2)}%
            &nbsp;({totalPnL>=0?"+":"-"}Rp {fmtShort(Math.abs(totalPnL))})
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Modal: {fmtRp(totalCost)}</p>
      </div>

      {/* Assets */}
      {assets.length===0
        ? <div className="text-center py-16 text-gray-600"><TrendingUp size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Belum ada aset portofolio</p></div>
        : <div className="space-y-3">
            {assets.map(a=>{
              const cost = a.buyPrice * a.quantity;
              const val  = a.currentPrice * a.quantity;
              const pnl  = val - cost;
              const pct  = cost>0 ? (pnl/cost*100) : 0;
              const up   = pnl >= 0;
              return (
                <div key={a.id} className="rounded-xl p-4 group transition-all"
                     style={{background:"#131929",border:"1px solid rgba(255,255,255,0.06)"}}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                           style={{background:accent+"18"}}>
                        {TYPE_ICONS[a.type]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black text-white">{a.ticker}</p>
                          <span className="text-xs px-1.5 py-0.5 rounded-md text-gray-500"
                                style={{background:"rgba(255,255,255,0.05)"}}>
                            {TYPE_LABELS[a.type]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate max-w-[160px]">{a.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>{setEditItem(a);setModal(true);}}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
                        style={{background:"rgba(255,255,255,0.05)"}}>
                        <Edit2 size={12}/>
                      </button>
                      <button onClick={()=>del(a.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 transition-colors"
                        style={{background:"rgba(255,255,255,0.05)"}}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Harga Kini", `Rp ${fmtShort(a.currentPrice)}`, "white"],
                      ["Nilai",      `Rp ${fmtShort(val)}`,            accent],
                      ["P&L",        `${up?"+":""}${pct.toFixed(1)}%`, up?"#10b981":"#f43f5e"],
                    ].map(([l,v,c])=>(
                      <div key={l} className="rounded-lg py-2" style={{background:"rgba(255,255,255,0.03)"}}>
                        <p className="text-xs text-gray-500 mb-0.5">{l}</p>
                        <p className="text-sm font-black" style={{color:c}}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 flex justify-between text-xs text-gray-600">
                    <span>Qty: <span className="text-gray-400">{a.quantity}</span></span>
                    <span>Beli: <span className="text-gray-400">Rp {fmtShort(a.buyPrice)}</span></span>
                    <span>Tgl: <span className="text-gray-400">{a.buyDate}</span></span>
                  </div>
                  {a.notes && <p className="text-xs text-gray-600 mt-1.5 italic">"{a.notes}"</p>}
                </div>
              );
            })}
          </div>
      }

      <FAB accent={accent} onClick={()=>{setEditItem(null);setModal(true);}} />
      {modal && <AssetModal asset={editItem} accent={accent}
        onSave={save} onClose={()=>{setModal(false);setEditItem(null);}} />}
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────
function Analytics({ transactions, assets, accent }) {
  const monthlyData = useMemo(()=>{
    const map = {};
    transactions.forEach(t=>{
      const m = getMonthYear(t.date);
      if(!map[m]) map[m]={month:m,income:0,expense:0};
      t.type==="income"?(map[m].income+=t.amount):(map[m].expense+=t.amount);
    });
    return Object.values(map).slice(-6).map(d=>({...d,net:d.income-d.expense}));
  },[transactions]);

  const expenseCats = useMemo(()=>{
    const map={};
    transactions.filter(t=>t.type==="expense").forEach(t=>{
      if(!map[t.category])map[t.category]={name:t.category,value:0};
      map[t.category].value+=t.amount;
    });
    return Object.values(map).sort((a,b)=>b.value-a.value);
  },[transactions]);

  const incomeCats = useMemo(()=>{
    const map={};
    transactions.filter(t=>t.type==="income").forEach(t=>{
      if(!map[t.category])map[t.category]={name:t.category,value:0};
      map[t.category].value+=t.amount;
    });
    return Object.values(map).sort((a,b)=>b.value-a.value);
  },[transactions]);

  const totalExp  = expenseCats.reduce((s,d)=>s+d.value,0);
  const totalInc  = incomeCats.reduce((s,d)=>s+d.value,0);

  return (
    <div className="space-y-4 pb-28">
      {/* Area Chart */}
      <div className="rounded-2xl p-4" style={{background:"#131929",border:"1px solid rgba(255,255,255,0.06)"}}>
        <p className="font-bold text-white text-sm">Tren Arus Kas</p>
        <p className="text-xs text-gray-500 mb-3">6 bulan terakhir</p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="gIn"  x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{fill:"#6b7280",fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:"#1a2438",border:"none",borderRadius:10,fontSize:11}}
                     formatter={(v,n)=>[fmtRp(v),n==="income"?"Pemasukan":"Pengeluaran"]}/>
            <Area type="monotone" dataKey="income"  stroke="#10b981" fill="url(#gIn)"  strokeWidth={2}/>
            <Area type="monotone" dataKey="expense" stroke="#f43f5e" fill="url(#gOut)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Expense by category */}
      <div className="rounded-2xl p-4" style={{background:"#131929",border:"1px solid rgba(255,255,255,0.06)"}}>
        <p className="font-bold text-white text-sm mb-3">Pengeluaran per Kategori</p>
        {expenseCats.length===0
          ? <p className="text-gray-600 text-xs text-center py-4">Belum ada data</p>
          : <div className="flex items-center gap-4">
              <ResponsiveContainer width="40%" height={120}>
                <PieChart>
                  <Pie data={expenseCats} cx="50%" cy="50%" innerRadius={25} outerRadius={52}
                    dataKey="value" paddingAngle={4}>
                    {expenseCats.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {expenseCats.map((d,i)=>(
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                        <span className="text-gray-400 truncate">{d.name}</span>
                      </div>
                      <span className="text-gray-500 ml-1 flex-shrink-0">{((d.value/totalExp)*100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1 rounded-full" style={{background:"rgba(255,255,255,0.05)"}}>
                      <div className="h-1 rounded-full" style={{width:`${(d.value/totalExp)*100}%`,background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        }
      </div>

      {/* Income sources */}
      <div className="rounded-2xl p-4" style={{background:"#131929",border:"1px solid rgba(255,255,255,0.06)"}}>
        <p className="font-bold text-white text-sm mb-3">Sumber Pemasukan</p>
        <div className="space-y-3">
          {incomeCats.map((d,i)=>(
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                   style={{background:PIE_COLORS[i%PIE_COLORS.length]+"20",color:PIE_COLORS[i%PIE_COLORS.length]}}>
                {d.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300 truncate">{d.name}</span>
                  <span className="font-bold ml-2 flex-shrink-0" style={{color:accent}}>Rp {fmtShort(d.value)}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{background:"rgba(255,255,255,0.05)"}}>
                  <div className="h-1.5 rounded-full" style={{width:`${(d.value/totalInc)*100}%`,background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio P&L per asset */}
      {assets.length>0 && (
        <div className="rounded-2xl p-4" style={{background:"#131929",border:"1px solid rgba(255,255,255,0.06)"}}>
          <p className="font-bold text-white text-sm mb-3">P&L per Aset</p>
          <div className="space-y-2.5">
            {assets.map(a=>{
              const cost=a.buyPrice*a.quantity, val=a.currentPrice*a.quantity;
              const pnl=val-cost, pct=cost>0?(pnl/cost*100):0, up=pnl>=0;
              return (
                <div key={a.id} className="flex items-center justify-between py-2"
                     style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{TYPE_ICONS[a.type]}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{a.ticker}</p>
                      <p className="text-xs text-gray-500">{a.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm" style={{color:up?"#10b981":"#f43f5e"}}>
                      {up?"+":""}{pct.toFixed(2)}%
                    </p>
                    <p className="text-xs" style={{color:up?"#10b981":"#f43f5e"}}>
                      {up?"+":"-"}Rp {fmtShort(Math.abs(pnl))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CATEGORY SECTION ─────────────────────────────────────
function CategorySection({ type, label, categories, setCategories, accent }) {
  const [newName, setNewName] = useState("");
  const add = () => {
    if (!newName.trim()) return;
    setCategories(prev => ({ ...prev, [type]: [...prev[type], newName.trim()] }));
    setNewName("");
  };
  const remove = (cat) => setCategories(prev => ({ ...prev, [type]: prev[type].filter(c=>c!==cat) }));
  return (
    <div className="rounded-2xl p-4" style={{background:"#131929",border:"1px solid rgba(255,255,255,0.06)"}}>
      <p className="font-bold text-white text-sm mb-3">{label}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {categories[type].map(cat=>(
          <div key={cat} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs"
               style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"}}>
            <span className="text-gray-300">{cat}</span>
            <button onClick={()=>remove(cat)} className="text-gray-600 hover:text-rose-400 transition-colors ml-0.5">
              <X size={10}/>
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={e=>setNewName(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&add()}
          placeholder="Tambah kategori baru..."
          className="flex-1 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none"
          style={{background:"#0d1424",border:"1px solid rgba(255,255,255,0.06)"}}/>
        <button onClick={add}
          className="px-4 py-2 rounded-xl text-sm font-black text-white transition-all hover:opacity-90"
          style={{background:accent}}>+</button>
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────
function SettingsPage({ accent, setAccent, categories, setCategories }) {
  const [custom, setCustom] = useState(accent);

  return (
    <div className="space-y-4 pb-28">
      {/* Theme Color */}
      <div className="rounded-2xl p-4" style={{background:"#131929",border:"1px solid rgba(255,255,255,0.06)"}}>
        <p className="font-bold text-white text-sm mb-3">🎨 Warna Tema</p>
        <div className="grid grid-cols-6 gap-2.5 mb-4">
          {ACCENT_PRESETS.map(p=>(
            <button key={p} onClick={()=>{setAccent(p);setCustom(p);}}
              className="aspect-square rounded-xl transition-all hover:scale-110 active:scale-95 relative"
              style={{background:p}}>
              {accent===p && <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white shadow"/>
              </div>}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mb-2">Custom warna (hex)</p>
        <div className="flex gap-2">
          <input type="color" value={custom} onChange={e=>setCustom(e.target.value)}
            className="w-11 h-10 rounded-lg cursor-pointer border-0 p-1 flex-shrink-0"
            style={{background:"#0d1424"}}/>
          <input type="text" value={custom} onChange={e=>setCustom(e.target.value)}
            maxLength={7} placeholder="#06b6d4"
            className="flex-1 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
            style={{background:"#0d1424",border:"1px solid rgba(255,255,255,0.07)"}}/>
          <button onClick={()=>setAccent(custom)}
            className="px-4 py-2 rounded-xl text-sm font-black text-white transition-all hover:opacity-90"
            style={{background:custom}}>Terapkan</button>
        </div>
        <div className="mt-3 rounded-xl h-8 transition-all"
             style={{background:`linear-gradient(90deg,${accent},${accent}80)`,border:`1px solid ${accent}40`}}/>
      </div>

      <CategorySection type="expense" label="💸 Kategori Pengeluaran" categories={categories} setCategories={setCategories} accent={accent}/>
      <CategorySection type="income"  label="💰 Kategori Pemasukan"  categories={categories} setCategories={setCategories} accent={accent}/>

      {/* About */}
      <div className="rounded-2xl p-5 text-center" style={{background:"#131929",border:"1px solid rgba(255,255,255,0.06)"}}>
        <div className="text-3xl mb-2">💼</div>
        <p className="font-black text-white">FinTrack Pro</p>
        <p className="text-gray-500 text-xs mt-1">v1.0.0 · Data tersimpan di browser</p>
        <p className="text-gray-600 text-xs mt-0.5">Built for Freelancers & Investors 🚀</p>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────
export default function App() {
  const load = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  };

  const [page,         setPage]        = useState("dashboard");
  const [accent,       setAccent]      = useState(()=>localStorage.getItem("ftp_accent")||"#06b6d4");
  const [transactions, setTransactions]= useState(()=>load("ftp_transactions", SAMPLE_TX));
  const [assets,       setAssets]      = useState(()=>load("ftp_assets",       SAMPLE_ASSETS));
  const [categories,   setCategories]  = useState(()=>load("ftp_categories",   DEFAULT_CATEGORIES));

  useEffect(()=>{ localStorage.setItem("ftp_transactions", JSON.stringify(transactions)); },[transactions]);
  useEffect(()=>{ localStorage.setItem("ftp_assets",       JSON.stringify(assets));       },[assets]);
  useEffect(()=>{ localStorage.setItem("ftp_categories",   JSON.stringify(categories));   },[categories]);
  useEffect(()=>{ localStorage.setItem("ftp_accent",       accent);                       },[accent]);

  // Simulated real-time price fluctuation every 5 sec
  useEffect(()=>{
    const id = setInterval(()=>{
      setAssets(prev=>prev.map(a=>({
        ...a,
        currentPrice: Math.round(a.currentPrice * (1 + (Math.random()-0.498)*0.004))
      })));
    }, 5000);
    return ()=>clearInterval(id);
  },[]);

  const NAV = [
    { id:"dashboard",   Icon:LayoutDashboard, label:"Beranda"   },
    { id:"transactions",Icon:ArrowUpDown,     label:"Transaksi" },
    { id:"portfolio",   Icon:TrendingUp,      label:"Portofolio"},
    { id:"analytics",   Icon:BarChart3,       label:"Analitik"  },
    { id:"settings",    Icon:Settings,        label:"Setelan"   },
  ];

  const TITLES = { dashboard:"Dashboard", transactions:"Transaksi", portfolio:"Portofolio", analytics:"Analitik", settings:"Setelan" };

  return (
    <div className="min-h-screen" style={{background:"#0a0f1e",color:"white",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.4)}
        select option{background:#131929;color:white}
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3.5 flex items-center justify-between"
           style={{background:"rgba(10,15,30,0.92)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div>
          <h1 className="font-black text-lg text-white leading-tight">{TITLES[page]}</h1>
          <p className="text-xs font-semibold" style={{color:accent}}>FinTrack Pro</p>
        </div>
        {page==="portfolio" && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
               style={{background:accent+"18",color:accent}}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{background:accent}}/>
            Harga Simulasi Live
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {page==="dashboard"    && <Dashboard    transactions={transactions} assets={assets} accent={accent}/>}
        {page==="transactions" && <Transactions transactions={transactions} setTransactions={setTransactions} categories={categories} accent={accent}/>}
        {page==="portfolio"    && <Portfolio    assets={assets} setAssets={setAssets} accent={accent}/>}
        {page==="analytics"    && <Analytics    transactions={transactions} assets={assets} accent={accent}/>}
        {page==="settings"     && <SettingsPage accent={accent} setAccent={setAccent} categories={categories} setCategories={setCategories}/>}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-30"
           style={{background:"rgba(10,15,30,0.96)",backdropFilter:"blur(16px)",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
        <div className="flex">
          {NAV.map(({id,Icon,label})=>{
            const active = page===id;
            return (
              <button key={id} onClick={()=>setPage(id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all"
                style={{color:active?accent:"#4b5563"}}>
                <Icon size={20} strokeWidth={active?2.5:1.8}/>
                <span className="text-xs font-semibold">{label}</span>
                {active && <div className="w-1 h-1 rounded-full mt-0.5" style={{background:accent}}/>}
              </button>
            );
          })}
        </div>
        {/* Safe area bottom */}
        <div style={{height:"env(safe-area-inset-bottom,0px)"}}/>
      </div>
    </div>
  );
}
