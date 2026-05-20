import { useState, useEffect, useRef } from "react";

// ── STORAGE KEY ──────────────────────────────────────────────
const SK = "flujo_textil_v1";

// ── PROCESOS ─────────────────────────────────────────────────
const PROCESOS = [
  { key: "orden",       label: "Orden de Pedido", icon: "📋", color: "#64748b" },
  { key: "corte",       label: "Corte",            icon: "✂️",  color: "#f59e0b" },
  { key: "confeccion",  label: "Confección",       icon: "🧵", color: "#ec4899" },
  { key: "serigrafia",  label: "Serigrafía",       icon: "🖨️", color: "#e85d26" },
  { key: "bordado",     label: "Bordado",          icon: "🪡", color: "#a855f7" },
  { key: "sublimacion", label: "Sublimación",      icon: "🌈", color: "#06b6d4" },
  { key: "dtf",         label: "DTF",              icon: "🖼️", color: "#10b981" },
  { key: "terminacion", label: "Terminación",      icon: "📦", color: "#3b82f6" },
];

const ETAPAS = ["pendiente", "en_proceso", "listo"];
const ETAPA_LABEL = { pendiente: "Pendiente", en_proceso: "En proceso", listo: "✓ Listo" };
const ETAPA_COLOR = { pendiente: "#64748b", en_proceso: "#f59e0b", listo: "#10b981" };

const PRIORIDADES = [
  { key: "alta",  label: "Alta",  color: "#ef4444" },
  { key: "media", label: "Media", color: "#f59e0b" },
  { key: "baja",  label: "Baja",  color: "#10b981" },
];

// ── SEED DATA ────────────────────────────────────────────────
const SEED_PEDIDOS = [
  {
    id: "P001", cliente: "Tienda Deportiva Ríos", cantidad: 50,
    prioridad: "alta", fechaEntrega: "2026-05-22",
    descripcion: "Camisetas con logo en frente",
    procesos: { orden: "listo", corte: "listo", confeccion: "en_proceso", serigrafia: "pendiente", bordado: "pendiente", sublimacion: "pendiente", dtf: "pendiente", terminacion: "pendiente" },
    procesosActivos: ["orden","corte","confeccion","serigrafia"],
    creado: "2026-05-15",
  },
  {
    id: "P002", cliente: "Colegio San Marcos", cantidad: 30,
    prioridad: "media", fechaEntrega: "2026-05-28",
    descripcion: "Chaquetas con escudo bordado",
    procesos: { orden: "listo", corte: "pendiente", confeccion: "pendiente", serigrafia: "pendiente", bordado: "pendiente", sublimacion: "pendiente", dtf: "pendiente", terminacion: "pendiente" },
    procesosActivos: ["orden","corte","confeccion","bordado","terminacion"],
    creado: "2026-05-17",
  },
  {
    id: "P003", cliente: "Restaurante La Fogata", cantidad: 20,
    prioridad: "alta", fechaEntrega: "2026-05-20",
    descripcion: "Delantales sublimados",
    procesos: { orden: "listo", corte: "listo", confeccion: "listo", serigrafia: "pendiente", bordado: "pendiente", sublimacion: "en_proceso", dtf: "pendiente", terminacion: "pendiente" },
    procesosActivos: ["orden","corte","confeccion","sublimacion","terminacion"],
    creado: "2026-05-14",
  },
];

const SEED_USUARIOS = [
  { id: "u1", nombre: "Admin", rol: "admin",       pin: "0000", proceso: null },
  { id: "u2", nombre: "Carlos",  rol: "operario",  pin: "1111", proceso: "corte" },
  { id: "u3", nombre: "María",   rol: "operario",  pin: "2222", proceso: "confeccion" },
  { id: "u4", nombre: "Luis",    rol: "operario",  pin: "3333", proceso: "serigrafia" },
  { id: "u5", nombre: "Ana",     rol: "operario",  pin: "4444", proceso: "bordado" },
  { id: "u6", nombre: "Pedro",   rol: "operario",  pin: "5555", proceso: "sublimacion" },
  { id: "u7", nombre: "Sofía",   rol: "operario",  pin: "6666", proceso: "dtf" },
  { id: "u8", nombre: "Jorge",   rol: "operario",  pin: "7777", proceso: "terminacion" },
  { id: "u9", nombre: "Lucía",   rol: "operario",  pin: "8888", proceso: "orden" },
];

// ── HELPERS ──────────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(SK);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
function saveState(s) {
  try { localStorage.setItem(SK, JSON.stringify(s)); } catch {}
}
function pedidoProgreso(p) {
  const activos = p.procesosActivos || [];
  if (!activos.length) return 0;
  const listos = activos.filter(k => p.procesos[k] === "listo").length;
  return Math.round((listos / activos.length) * 100);
}
function pedidoEstadoGeneral(p) {
  const prog = pedidoProgreso(p);
  if (prog === 100) return "entregado";
  if (prog > 0) return "en_proceso";
  return "pendiente";
}
function hoy() { return new Date().toISOString().split("T")[0]; }

// ── APP ──────────────────────────────────────────────────────
export default function App() {
  const init = loadState() || { pedidos: SEED_PEDIDOS, usuarios: SEED_USUARIOS };
  const [pedidos, setPedidos] = useState(init.pedidos);
  const [usuarios, setUsuarios] = useState(init.usuarios);
  const [usuario, setUsuario] = useState(null); // sesión actual
  const [pantalla, setPantalla] = useState("login"); // login | admin | operario
  const [adminTab, setAdminTab] = useState("pedidos"); // pedidos | equipo | nuevo
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showNuevoPedido, setShowNuevoPedido] = useState(false);
  const [showNuevoUser, setShowNuevoUser] = useState(false);
  const [formPedido, setFormPedido] = useState({ cliente: "", cantidad: "", prioridad: "media", fechaEntrega: "", descripcion: "", procesosActivos: ["orden","terminacion"] });
  const [formUser, setFormUser] = useState({ nombre: "", pin: "", proceso: "corte" });
  const [toast, setToast] = useState(null);
  const nextPedidoId = useRef(pedidos.length + 1);

  useEffect(() => { saveState({ pedidos, usuarios }); }, [pedidos, usuarios]);

  function showToast(msg, color = "#10b981") {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  }

  // ── LOGIN ─────────────────────────────────────────────────
  function handleLogin() {
    const u = usuarios.find(u => u.pin === pinInput);
    if (!u) { setPinError("PIN incorrecto"); setPinInput(""); return; }
    setUsuario(u);
    setPinInput("");
    setPinError("");
    setPantalla(u.rol === "admin" ? "admin" : "operario");
  }
  function handleLogout() { setUsuario(null); setPantalla("login"); }

  // ── OPERARIO: marcar etapa ────────────────────────────────
  function marcarEtapa(pedidoId, procesoKey, etapa) {
    setPedidos(prev => prev.map(p => {
      if (p.id !== pedidoId) return p;
      return { ...p, procesos: { ...p.procesos, [procesoKey]: etapa } };
    }));
    showToast(etapa === "listo" ? "✓ Marcado como listo" : "Actualizado");
  }

  // ── ADMIN: crear pedido ───────────────────────────────────
  function crearPedido() {
    if (!formPedido.cliente || !formPedido.cantidad || !formPedido.fechaEntrega) return;
    if (!formPedido.procesosActivos.length) return;
    const id = "P" + String(nextPedidoId.current++).padStart(3, "0");
    const procesos = {};
    PROCESOS.forEach(p => { procesos[p.key] = "pendiente"; });
    const nuevo = { id, cliente: formPedido.cliente, cantidad: parseInt(formPedido.cantidad), prioridad: formPedido.prioridad, fechaEntrega: formPedido.fechaEntrega, descripcion: formPedido.descripcion, procesos, procesosActivos: [...formPedido.procesosActivos], creado: hoy() };
    setPedidos(prev => [...prev, nuevo]);
    setFormPedido({ cliente: "", cantidad: "", prioridad: "media", fechaEntrega: "", descripcion: "", procesosActivos: ["orden","terminacion"] });
    setShowNuevoPedido(false);
    showToast("Pedido creado ✓");
  }

  // ── ADMIN: crear usuario ──────────────────────────────────
  function crearUsuario() {
    if (!formUser.nombre || !formUser.pin) return;
    if (usuarios.find(u => u.pin === formUser.pin)) { showToast("PIN ya existe", "#ef4444"); return; }
    const nuevo = { id: "u" + Date.now(), nombre: formUser.nombre, rol: "operario", pin: formUser.pin, proceso: formUser.proceso };
    setUsuarios(prev => [...prev, nuevo]);
    setFormUser({ nombre: "", pin: "", proceso: "corte" });
    setShowNuevoUser(false);
    showToast("Usuario creado ✓");
  }

  function eliminarUsuario(id) {
    setUsuarios(prev => prev.filter(u => u.id !== id));
  }

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", minHeight: "100vh", background: "#f5f0e8", color: "#1a1208" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:#e8e0d0;} ::-webkit-scrollbar-thumb{background:#b0a898;border-radius:2px;}
        .btn{cursor:pointer;border:none;font-family:'DM Mono',monospace;font-weight:500;transition:all 0.15s;letter-spacing:0.3px;}
        .btn:active{transform:scale(0.96);}
        .card{background:#fff;border:1.5px solid #d8d0c0;border-radius:0;}
        input,select,textarea{font-family:'DM Mono',monospace;background:#f5f0e8;border:1.5px solid #c8bfaf;color:#1a1208;padding:10px 14px;border-radius:0;outline:none;font-size:13px;}
        input:focus,select:focus,textarea:focus{border-color:#e85d26;}
        select option{background:#f5f0e8;}
        .fade{animation:fd 0.25s ease;}
        @keyframes fd{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .prog-bar{height:6px;background:#e8e0d0;border-radius:0;overflow:hidden;}
        .prog-fill{height:100%;transition:width 0.4s ease;background:#e85d26;}
        .checkbox-proceso{display:flex;align-items:center;gap:8px;padding:7px 12px;border:1.5px solid #d8d0c0;cursor:pointer;user-select:none;font-size:12px;}
        .checkbox-proceso.active{border-color:#e85d26;background:#fef3ee;}
        .tab{cursor:pointer;padding:10px 18px;font-size:12px;letter-spacing:1px;border-bottom:2px solid transparent;transition:all 0.15s;}
        .tab.active{border-color:#e85d26;color:#e85d26;}
        .pin-btn{width:64px;height:64px;font-size:22px;border:1.5px solid #c8bfaf;background:#fff;cursor:pointer;font-family:'DM Mono',monospace;transition:all 0.1s;}
        .pin-btn:active{background:#fef3ee;border-color:#e85d26;}
        .badge{display:inline-flex;align-items:center;padding:2px 8px;font-size:10px;letter-spacing:0.5px;font-weight:500;}
        .modal-bg{position:fixed;inset:0;background:rgba(26,18,8,0.6);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;}
        .modal{background:#f5f0e8;border:1.5px solid #c8bfaf;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;}
        .etapa-btn{flex:1;padding:10px 6px;font-size:11px;letter-spacing:0.5px;border:1.5px solid;cursor:pointer;font-family:'DM Mono',monospace;text-align:center;transition:all 0.15s;}
        .etapa-btn:active{transform:scale(0.97);}
      `}</style>

      {/* TOAST */}
      {toast && (
        <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:toast.color, color:"#fff", padding:"10px 24px", fontSize:13, zIndex:100, letterSpacing:0.5 }}>
          {toast.msg}
        </div>
      )}

      {/* ══════════ LOGIN ══════════ */}
      {pantalla === "login" && (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ marginBottom:32, textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:52, letterSpacing:4, lineHeight:1 }}>FLUJO TEXTIL</div>
            <div style={{ fontSize:11, color:"#8a7a6a", letterSpacing:3, marginTop:4 }}>SISTEMA DE PRODUCCIÓN</div>
          </div>
          <div className="card" style={{ padding:32, width:"100%", maxWidth:340 }}>
            <div style={{ fontSize:11, letterSpacing:2, color:"#8a7a6a", marginBottom:16 }}>INGRESA TU PIN</div>
            {/* Dots */}
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:24 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width:14, height:14, borderRadius:"50%", border:"1.5px solid #c8bfaf", background: pinInput.length > i ? "#e85d26" : "transparent", transition:"background 0.1s" }} />
              ))}
            </div>
            {/* PIN pad */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} className="pin-btn" onClick={() => { if(pinInput.length < 4) setPinInput(p=>p+n); setPinError(""); }}>{n}</button>
              ))}
              <button className="pin-btn" style={{ fontSize:14 }} onClick={() => { setPinInput(""); setPinError(""); }}>C</button>
              <button className="pin-btn" onClick={() => { if(pinInput.length < 4) setPinInput(p=>p+"0"); setPinError(""); }}>0</button>
              <button className="pin-btn" style={{ background:"#e85d26", color:"#fff", borderColor:"#e85d26" }} onClick={handleLogin}>→</button>
            </div>
            {pinError && <div style={{ color:"#ef4444", fontSize:12, textAlign:"center", marginTop:8 }}>{pinError}</div>}
            <div style={{ marginTop:20, fontSize:10, color:"#b0a898", letterSpacing:1, textAlign:"center" }}>
              DEMO: Admin=0000 · Corte=1111 · Confección=2222
            </div>
          </div>
        </div>
      )}

      {/* ══════════ VISTA OPERARIO ══════════ */}
      {pantalla === "operario" && usuario && (
        <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
          {/* Header operario */}
          <div style={{ padding:"16px 20px", borderBottom:"1.5px solid #d8d0c0", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#fff" }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2 }}>{usuario.nombre}</div>
              <div style={{ fontSize:10, color:"#8a7a6a", letterSpacing:1 }}>
                {PROCESOS.find(p=>p.key===usuario.proceso)?.icon} {PROCESOS.find(p=>p.key===usuario.proceso)?.label?.toUpperCase()}
              </div>
            </div>
            <button className="btn" onClick={handleLogout} style={{ padding:"8px 14px", fontSize:11, background:"#f5f0e8", border:"1.5px solid #c8bfaf", letterSpacing:1 }}>SALIR</button>
          </div>

          {/* Pedidos del operario */}
          <div style={{ flex:1, padding:16, overflowY:"auto" }}>
            {(() => {
              const miProceso = usuario.proceso;
              const misPedidos = pedidos.filter(p => p.procesosActivos.includes(miProceso));
              if (!misPedidos.length) return (
                <div style={{ padding:40, textAlign:"center", color:"#b0a898" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
                  <div style={{ fontSize:14 }}>Sin pedidos pendientes</div>
                </div>
              );
              // Ordenar: primero en_proceso, luego por prioridad
              const sorted = [...misPedidos].sort((a,b) => {
                const ea = a.procesos[miProceso]; const eb = b.procesos[miProceso];
                if(ea==="en_proceso" && eb!=="en_proceso") return -1;
                if(ea!=="en_proceso" && eb==="en_proceso") return 1;
                if(ea==="listo" && eb!=="listo") return 1;
                if(ea!=="listo" && eb==="listo") return -1;
                const pa = {alta:0,media:1,baja:2}[a.prioridad];
                const pb = {alta:0,media:1,baja:2}[b.prioridad];
                return pa - pb;
              });
              return sorted.map(p => {
                const etapa = p.procesos[miProceso];
                const pri = PRIORIDADES.find(pr=>pr.key===p.prioridad);
                const vencido = p.fechaEntrega < hoy() && etapa !== "listo";
                const proc = PROCESOS.find(pr=>pr.key===miProceso);
                return (
                  <div key={p.id} className="card fade" style={{ marginBottom:12, overflow:"hidden", borderLeft:`4px solid ${etapa==="listo"?"#10b981":etapa==="en_proceso"?"#f59e0b":pri?.color}` }}>
                    <div style={{ padding:"14px 16px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                        <div>
                          <div style={{ fontWeight:500, fontSize:15, letterSpacing:0.3 }}>{p.cliente}</div>
                          <div style={{ fontSize:11, color:"#8a7a6a", marginTop:2 }}>{p.id} · {p.cantidad} unidades</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                          <span className="badge" style={{ background:pri?.color+"22", color:pri?.color }}>{pri?.label?.toUpperCase()}</span>
                          {vencido && <span className="badge" style={{ background:"#ef444422", color:"#ef4444" }}>⚠ VENCIDO</span>}
                        </div>
                      </div>
                      {p.descripcion && <div style={{ fontSize:12, color:"#5a4a3a", marginBottom:10, padding:"8px 10px", background:"#f5f0e8", borderLeft:"3px solid #c8bfaf" }}>{p.descripcion}</div>}
                      <div style={{ fontSize:11, color:"#8a7a6a", marginBottom:12 }}>📅 Entrega: {p.fechaEntrega}</div>

                      {/* Estado actual grande */}
                      <div style={{ marginBottom:12, padding:"10px 14px", background:ETAPA_COLOR[etapa]+"15", border:`1.5px solid ${ETAPA_COLOR[etapa]}33`, display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:20 }}>{proc?.icon}</span>
                        <div>
                          <div style={{ fontSize:10, color:"#8a7a6a", letterSpacing:1 }}>ESTADO ACTUAL</div>
                          <div style={{ fontSize:15, fontWeight:500, color:ETAPA_COLOR[etapa] }}>{ETAPA_LABEL[etapa]}</div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      {etapa !== "listo" && (
                        <div style={{ display:"flex", gap:8 }}>
                          {etapa === "pendiente" && (
                            <button className="etapa-btn" onClick={() => marcarEtapa(p.id, miProceso, "en_proceso")}
                              style={{ borderColor:"#f59e0b", color:"#f59e0b", background:"transparent", letterSpacing:1 }}>
                              ▶ INICIAR
                            </button>
                          )}
                          {etapa === "en_proceso" && (
                            <button className="etapa-btn" onClick={() => marcarEtapa(p.id, miProceso, "pendiente")}
                              style={{ borderColor:"#c8bfaf", color:"#8a7a6a", background:"transparent", letterSpacing:1 }}>
                              ◀ PAUSAR
                            </button>
                          )}
                          <button className="etapa-btn" onClick={() => marcarEtapa(p.id, miProceso, "listo")}
                            style={{ borderColor:"#10b981", color:"#10b981", background:"transparent", letterSpacing:1, flex:2 }}>
                            ✓ MARCAR LISTO
                          </button>
                        </div>
                      )}
                      {etapa === "listo" && (
                        <button className="etapa-btn" onClick={() => marcarEtapa(p.id, miProceso, "en_proceso")}
                          style={{ borderColor:"#c8bfaf", color:"#8a7a6a", background:"transparent", width:"100%", letterSpacing:1 }}>
                          ↩ DESHACER
                        </button>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* ══════════ VISTA ADMIN ══════════ */}
      {pantalla === "admin" && (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
          {/* Header admin */}
          <div style={{ padding:"14px 24px", borderBottom:"1.5px solid #d8d0c0", background:"#fff", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:3 }}>FLUJO TEXTIL <span style={{ fontSize:14, letterSpacing:2, color:"#8a7a6a" }}>ADMIN</span></div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn" onClick={() => setShowNuevoPedido(true)} style={{ padding:"9px 16px", fontSize:11, background:"#e85d26", color:"#fff", letterSpacing:1 }}>+ PEDIDO</button>
              <button className="btn" onClick={handleLogout} style={{ padding:"9px 14px", fontSize:11, background:"#f5f0e8", border:"1.5px solid #c8bfaf", letterSpacing:1 }}>SALIR</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", borderBottom:"1.5px solid #d8d0c0", background:"#fff", paddingLeft:24 }}>
            {[["pedidos","PEDIDOS"],["tablero","TABLERO"],["equipo","EQUIPO"]].map(([k,l]) => (
              <div key={k} className={`tab${adminTab===k?" active":""}`} onClick={() => setAdminTab(k)} style={{ fontSize:11, letterSpacing:2 }}>{l}</div>
            ))}
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:20 }}>

            {/* ── TAB PEDIDOS ── */}
            {adminTab === "pedidos" && (
              <div>
                {/* Stats */}
                <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
                  {[
                    { l:"Total", v:pedidos.length, c:"#1a1208" },
                    { l:"En proceso", v:pedidos.filter(p=>pedidoEstadoGeneral(p)==="en_proceso").length, c:"#f59e0b" },
                    { l:"Completados", v:pedidos.filter(p=>pedidoProgreso(p)===100).length, c:"#10b981" },
                    { l:"Vencidos", v:pedidos.filter(p=>p.fechaEntrega<hoy()&&pedidoProgreso(p)<100).length, c:"#ef4444" },
                  ].map(s => (
                    <div key={s.l} className="card" style={{ padding:"14px 18px", flex:"1 1 100px", minWidth:100 }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, color:s.c, lineHeight:1 }}>{s.v}</div>
                      <div style={{ fontSize:10, color:"#8a7a6a", letterSpacing:1, marginTop:2 }}>{s.l.toUpperCase()}</div>
                    </div>
                  ))}
                </div>

                {pedidos.map(p => {
                  const prog = pedidoProgreso(p);
                  const pri = PRIORIDADES.find(pr=>pr.key===p.prioridad);
                  const vencido = p.fechaEntrega < hoy() && prog < 100;
                  return (
                    <div key={p.id} className="card fade" style={{ marginBottom:10, overflow:"hidden", cursor:"pointer", borderLeft:`4px solid ${pri?.color}` }}
                      onClick={() => setSelectedPedido(selectedPedido?.id===p.id ? null : p)}>
                      <div style={{ padding:"14px 18px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                          <div>
                            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1 }}>{p.cliente}</span>
                            <span style={{ fontSize:11, color:"#8a7a6a", marginLeft:10 }}>{p.id} · {p.cantidad} uds</span>
                          </div>
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                            {vencido && <span className="badge" style={{ background:"#ef444422", color:"#ef4444" }}>⚠ VENCIDO</span>}
                            <span className="badge" style={{ background:pri?.color+"22", color:pri?.color }}>{pri?.label?.toUpperCase()}</span>
                            <span style={{ fontSize:13, color:"#8a7a6a" }}>{selectedPedido?.id===p.id?"▲":"▼"}</span>
                          </div>
                        </div>
                        {/* Barra de progreso */}
                        <div className="prog-bar">
                          <div className="prog-fill" style={{ width:prog+"%", background: prog===100?"#10b981":"#e85d26" }} />
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                          <span style={{ fontSize:10, color:"#8a7a6a" }}>📅 {p.fechaEntrega}</span>
                          <span style={{ fontSize:10, color: prog===100?"#10b981":"#e85d26", fontWeight:500 }}>{prog}% completado</span>
                        </div>
                      </div>

                      {/* Detalle expandido */}
                      {selectedPedido?.id===p.id && (
                        <div style={{ padding:"0 18px 16px", borderTop:"1.5px solid #e8e0d0" }} onClick={e=>e.stopPropagation()}>
                          <div style={{ fontSize:10, letterSpacing:2, color:"#8a7a6a", margin:"14px 0 10px" }}>PROCESOS</div>
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            {PROCESOS.filter(pr=>p.procesosActivos.includes(pr.key)).map(pr => {
                              const etapa = p.procesos[pr.key];
                              const operario = usuarios.find(u=>u.proceso===pr.key && u.rol==="operario");
                              return (
                                <div key={pr.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"#f5f0e8", border:`1.5px solid ${ETAPA_COLOR[etapa]}44` }}>
                                  <span style={{ fontSize:18 }}>{pr.icon}</span>
                                  <div style={{ flex:1 }}>
                                    <div style={{ fontSize:12, fontWeight:500 }}>{pr.label}</div>
                                    {operario && <div style={{ fontSize:10, color:"#8a7a6a" }}>{operario.nombre}</div>}
                                  </div>
                                  <span className="badge" style={{ background:ETAPA_COLOR[etapa]+"22", color:ETAPA_COLOR[etapa] }}>{ETAPA_LABEL[etapa].toUpperCase()}</span>
                                </div>
                              );
                            })}
                          </div>
                          {p.descripcion && <div style={{ marginTop:12, fontSize:12, color:"#5a4a3a", padding:"8px 12px", background:"#f5f0e8", borderLeft:"3px solid #c8bfaf" }}>{p.descripcion}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TAB TABLERO ── */}
            {adminTab === "tablero" && (
              <div style={{ overflowX:"auto" }}>
                <div style={{ display:"flex", gap:10, minWidth:800 }}>
                  {PROCESOS.map(proc => {
                    const cols = pedidos.filter(p => p.procesosActivos.includes(proc.key));
                    return (
                      <div key={proc.key} style={{ flex:1, minWidth:140 }}>
                        <div style={{ padding:"10px 12px", background:"#fff", border:"1.5px solid #d8d0c0", borderBottom:"3px solid "+proc.color, marginBottom:8 }}>
                          <div style={{ fontSize:16 }}>{proc.icon}</div>
                          <div style={{ fontSize:10, letterSpacing:1, fontWeight:500, marginTop:2 }}>{proc.label.toUpperCase()}</div>
                          <div style={{ fontSize:10, color:"#8a7a6a", marginTop:2 }}>{cols.filter(p=>p.procesos[proc.key]==="listo").length}/{cols.length} listos</div>
                        </div>
                        {cols.map(p => {
                          const etapa = p.procesos[proc.key];
                          const pri = PRIORIDADES.find(pr=>pr.key===p.prioridad);
                          return (
                            <div key={p.id} className="card" style={{ padding:"10px 12px", marginBottom:6, borderLeft:`3px solid ${ETAPA_COLOR[etapa]}` }}>
                              <div style={{ fontSize:11, fontWeight:500, marginBottom:2 }}>{p.cliente}</div>
                              <div style={{ fontSize:10, color:"#8a7a6a", marginBottom:4 }}>{p.cantidad} uds</div>
                              <span className="badge" style={{ background:ETAPA_COLOR[etapa]+"22", color:ETAPA_COLOR[etapa], fontSize:9 }}>{ETAPA_LABEL[etapa].toUpperCase()}</span>
                            </div>
                          );
                        })}
                        {!cols.length && <div style={{ padding:12, textAlign:"center", color:"#c8bfaf", fontSize:11, border:"1.5px dashed #d8d0c0" }}>Sin pedidos</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TAB EQUIPO ── */}
            {adminTab === "equipo" && (
              <div>
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
                  <button className="btn" onClick={() => setShowNuevoUser(true)} style={{ padding:"9px 16px", fontSize:11, background:"#1a1208", color:"#f5f0e8", letterSpacing:1 }}>+ USUARIO</button>
                </div>
                {usuarios.map(u => {
                  const proc = PROCESOS.find(p=>p.key===u.proceso);
                  const pedidosAsig = u.proceso ? pedidos.filter(p=>p.procesosActivos.includes(u.proceso)).length : 0;
                  const listos = u.proceso ? pedidos.filter(p=>p.procesosActivos.includes(u.proceso) && p.procesos[u.proceso]==="listo").length : 0;
                  return (
                    <div key={u.id} className="card" style={{ padding:"14px 18px", marginBottom:8, display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:40, height:40, background: u.rol==="admin"?"#1a1208":"#e85d26", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, flexShrink:0 }}>
                        {u.nombre[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:500, fontSize:14 }}>{u.nombre}</div>
                        <div style={{ fontSize:11, color:"#8a7a6a" }}>
                          {u.rol==="admin" ? "Administrador" : `${proc?.icon||""} ${proc?.label||"Sin proceso"}`}
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#e85d26", lineHeight:1 }}>{u.rol!=="admin"?`${listos}/${pedidosAsig}`:""}</div>
                        <div style={{ fontSize:10, color:"#8a7a6a", letterSpacing:0.5 }}>{u.rol!=="admin"?"listos":""}</div>
                        <div style={{ fontSize:10, color:"#c8bfaf", marginTop:2 }}>PIN: {u.pin}</div>
                      </div>
                      {u.id !== "u1" && (
                        <button className="btn" onClick={()=>eliminarUsuario(u.id)} style={{ padding:"6px 10px", fontSize:11, background:"transparent", border:"1.5px solid #c8bfaf", color:"#8a7a6a" }}>✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL: Nuevo Pedido ══ */}
      {showNuevoPedido && (
        <div className="modal-bg" onClick={()=>setShowNuevoPedido(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"20px 24px", borderBottom:"1.5px solid #d8d0c0", fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2 }}>NUEVO PEDIDO</div>
            <div style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ fontSize:10, letterSpacing:1, color:"#8a7a6a", display:"block", marginBottom:5 }}>CLIENTE *</label>
                <input type="text" style={{ width:"100%" }} placeholder="Nombre del cliente" value={formPedido.cliente} onChange={e=>setFormPedido({...formPedido,cliente:e.target.value})} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:10, letterSpacing:1, color:"#8a7a6a", display:"block", marginBottom:5 }}>CANTIDAD *</label>
                  <input type="number" style={{ width:"100%" }} placeholder="# unidades" value={formPedido.cantidad} onChange={e=>setFormPedido({...formPedido,cantidad:e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize:10, letterSpacing:1, color:"#8a7a6a", display:"block", marginBottom:5 }}>PRIORIDAD</label>
                  <select style={{ width:"100%" }} value={formPedido.prioridad} onChange={e=>setFormPedido({...formPedido,prioridad:e.target.value})}>
                    {PRIORIDADES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize:10, letterSpacing:1, color:"#8a7a6a", display:"block", marginBottom:5 }}>FECHA DE ENTREGA *</label>
                <input type="date" style={{ width:"100%" }} value={formPedido.fechaEntrega} onChange={e=>setFormPedido({...formPedido,fechaEntrega:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:10, letterSpacing:1, color:"#8a7a6a", display:"block", marginBottom:8 }}>PROCESOS REQUERIDOS</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {PROCESOS.map(proc => {
                    const active = formPedido.procesosActivos.includes(proc.key);
                    return (
                      <div key={proc.key} className={`checkbox-proceso${active?" active":""}`}
                        onClick={() => {
                          const next = active ? formPedido.procesosActivos.filter(k=>k!==proc.key) : [...formPedido.procesosActivos, proc.key];
                          setFormPedido({...formPedido, procesosActivos: next});
                        }}>
                        <div style={{ width:14, height:14, border:`1.5px solid ${active?"#e85d26":"#c8bfaf"}`, background:active?"#e85d26":"transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {active && <span style={{ color:"#fff", fontSize:9 }}>✓</span>}
                        </div>
                        {proc.icon} {proc.label}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize:10, letterSpacing:1, color:"#8a7a6a", display:"block", marginBottom:5 }}>DESCRIPCIÓN</label>
                <textarea rows={2} style={{ width:"100%", resize:"vertical" }} placeholder="Detalles del pedido..." value={formPedido.descripcion} onChange={e=>setFormPedido({...formPedido,descripcion:e.target.value})} />
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button className="btn" onClick={()=>setShowNuevoPedido(false)} style={{ padding:"10px 20px", fontSize:11, background:"transparent", border:"1.5px solid #c8bfaf", letterSpacing:1 }}>CANCELAR</button>
                <button className="btn" onClick={crearPedido} style={{ padding:"10px 20px", fontSize:11, background:"#e85d26", color:"#fff", letterSpacing:1 }}>CREAR PEDIDO</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Nuevo Usuario ══ */}
      {showNuevoUser && (
        <div className="modal-bg" onClick={()=>setShowNuevoUser(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"20px 24px", borderBottom:"1.5px solid #d8d0c0", fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2 }}>NUEVO USUARIO</div>
            <div style={{ padding:24, display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ fontSize:10, letterSpacing:1, color:"#8a7a6a", display:"block", marginBottom:5 }}>NOMBRE *</label>
                <input type="text" style={{ width:"100%" }} placeholder="Nombre del operario" value={formUser.nombre} onChange={e=>setFormUser({...formUser,nombre:e.target.value})} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:10, letterSpacing:1, color:"#8a7a6a", display:"block", marginBottom:5 }}>PIN (4 dígitos) *</label>
                  <input type="text" maxLength={4} style={{ width:"100%" }} placeholder="0000" value={formUser.pin} onChange={e=>setFormUser({...formUser,pin:e.target.value.replace(/\D/g,"")})} />
                </div>
                <div>
                  <label style={{ fontSize:10, letterSpacing:1, color:"#8a7a6a", display:"block", marginBottom:5 }}>PROCESO</label>
                  <select style={{ width:"100%" }} value={formUser.proceso} onChange={e=>setFormUser({...formUser,proceso:e.target.value})}>
                    {PROCESOS.map(p=><option key={p.key} value={p.key}>{p.icon} {p.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button className="btn" onClick={()=>setShowNuevoUser(false)} style={{ padding:"10px 20px", fontSize:11, background:"transparent", border:"1.5px solid #c8bfaf", letterSpacing:1 }}>CANCELAR</button>
                <button className="btn" onClick={crearUsuario} style={{ padding:"10px 20px", fontSize:11, background:"#1a1208", color:"#f5f0e8", letterSpacing:1 }}>CREAR USUARIO</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
