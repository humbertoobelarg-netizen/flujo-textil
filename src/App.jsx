// ── SUPABASE ─────────────────────────────────────────────────
const SUPABASE_URL = "https://avybrjvhltvcybdiyvvv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2eWJyanZobHR2Y3liZGl5dnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTE4NDYsImV4cCI6MjA5NDc4Nzg0Nn0.wbiU8qmRTPiaKU6At97_djP0p0obKGyVRM9rn-nbr84";
const H = { "Content-Type":"application/json", "apikey":SUPABASE_KEY, "Authorization":`Bearer ${SUPABASE_KEY}`, "Prefer":"return=representation" };

async function dbGet(table, q="") {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, { headers: H });
  return r.json();
}
async function dbInsert(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method:"POST", headers:H, body:JSON.stringify(data) });
  return r.json();
}
async function dbPatch(table, id, data) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method:"PATCH", headers:H, body:JSON.stringify(data) });
}
async function dbDelete(table, id) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method:"DELETE", headers:H });
}

import { useState, useEffect, useRef } from "react";

const PROCESOS = [
  { key:"orden",       label:"Orden de Pedido", icon:"📋", color:"#64748b" },
  { key:"diseno",      label:"Diseño",           icon:"🎨", color:"#f43f5e" },
  { key:"corte",       label:"Corte",            icon:"✂️",  color:"#f59e0b" },
  { key:"confeccion",  label:"Confección",       icon:"🧵", color:"#ec4899" },
  { key:"serigrafia",  label:"Serigrafía",       icon:"🖨️", color:"#e85d26" },
  { key:"bordado",     label:"Bordado",          icon:"🪡", color:"#a855f7" },
  { key:"sublimacion", label:"Sublimación",      icon:"🌈", color:"#06b6d4" },
  { key:"dtf",         label:"DTF",              icon:"🖼️", color:"#10b981" },
  { key:"terminacion", label:"Terminación",      icon:"📦", color:"#3b82f6" },
];

const PRIORIDADES = [
  { key:"alta",  label:"Alta",  color:"#ef4444" },
  { key:"media", label:"Media", color:"#f59e0b" },
  { key:"baja",  label:"Baja",  color:"#10b981" },
];

const ETAPA_LABEL = { pendiente:"Pendiente", en_proceso:"En proceso", listo:"✓ Listo" };
const ETAPA_COLOR = { pendiente:"#64748b", en_proceso:"#f59e0b", listo:"#10b981" };

function pedidoProgreso(p) {
  const activos = p.procesos_activos || [];
  if (!activos.length) return 0;
  const proc = p.procesos || {};
  const listos = activos.filter(k => proc[k] === "listo").length;
  return Math.round((listos / activos.length) * 100);
}
function hoy() { return new Date().toISOString().split("T")[0]; }
function newId(pedidos) { 
  const nums = pedidos.map(p => parseInt((p.id||"").replace("P",""))).filter(n=>!isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return "P" + String(next).padStart(3, "0");
}

export default function App() {
  const [pedidos, setPedidos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [pantalla, setPantalla] = useState("login");
  const [adminTab, setAdminTab] = useState("pedidos");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showNuevoPedido, setShowNuevoPedido] = useState(false);
  const [showNuevoUser, setShowNuevoUser] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [toast, setToast] = useState(null);
  const [formPedido, setFormPedido] = useState({ cliente:"", cantidad:"", prioridad:"media", fechaEntrega:"", descripcion:"", procesosActivos:["orden","terminacion"] });
  const [formUser, setFormUser] = useState({ nombre:"", pin:"", proceso:"corte" });

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    try {
      const [p, u] = await Promise.all([dbGet("pedidos"), dbGet("usuarios")]);
      setPedidos(Array.isArray(p) ? p : []);
      setUsuarios(Array.isArray(u) ? u : []);
    } catch(e) { showToast("Error al cargar datos", "#ef4444"); }
    setCargando(false);
  }

  function showToast(msg, color="#10b981") {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  }

  async function handleLogin() {
    const u = usuarios.find(u => u.pin === pinInput);
    if (!u) { setPinError("PIN incorrecto"); setPinInput(""); return; }
    setUsuario(u); setPinInput(""); setPinError("");
    setPantalla(u.rol === "admin" ? "admin" : "operario");
  }

  function handleLogout() { setUsuario(null); setPantalla("login"); }

  async function marcarEtapa(pedidoId, procesoKey, etapa) {
    const p = pedidos.find(x => x.id === pedidoId);
    if (!p) return;
    const nuevoProcesos = { ...(p.procesos || {}), [procesoKey]: etapa };
    await dbPatch("pedidos", pedidoId, { procesos: nuevoProcesos });
    setPedidos(prev => prev.map(x => x.id === pedidoId ? { ...x, procesos: nuevoProcesos } : x));
    showToast(etapa === "listo" ? "✓ Marcado como listo" : "Actualizado");
  }

  async function crearPedido() {
    if (!formPedido.cliente || !formPedido.fechaEntrega) return;
    const procesos = {};
    PROCESOS.forEach(p => { procesos[p.key] = "pendiente"; });
    // Orden de pedido se marca automáticamente como listo al crear
    if (procesos["orden"] !== undefined) procesos["orden"] = "listo";
    const nuevo = {
      id: newId(pedidos),
      cliente: formPedido.cliente,
      cantidad: Object.values(formPedido.talles||{}).reduce((sum,v)=>sum+(parseInt(v)||0),0) || parseInt(formPedido.cantidad) || 0,
      prioridad: formPedido.prioridad,
      fecha_entrega: formPedido.fechaEntrega,
      descripcion: formPedido.descripcion,
      tipo_prenda: formPedido.tipoPrenda||"",
      tipo_tejido: formPedido.tipoTejido||"",
      talles: formPedido.talles||{},
      procesos_activos: [...formPedido.procesosActivos],
      procesos,
      creado: hoy(),
      creado_por: usuario?.nombre || "Admin",
    };
    await dbInsert("pedidos", nuevo);
    setPedidos(prev => [...prev, nuevo]);
    setFormPedido({ cliente:"", cantidad:"", prioridad:"media", fechaEntrega:"", descripcion:"", procesosActivos:["orden","terminacion"], tipoPrenda:"", tipoTejido:"", talles:{} });
    setShowNuevoPedido(false);
    showToast("Pedido creado ✓");
  }

  async function crearUsuario() {
    if (!formUser.nombre || !formUser.pin) return;
    if (usuarios.find(u => u.pin === formUser.pin)) { showToast("PIN ya existe", "#ef4444"); return; }
    const nuevo = { id:"u"+Date.now(), nombre:formUser.nombre, rol:"operario", pin:formUser.pin, proceso:formUser.proceso };
    await dbInsert("usuarios", nuevo);
    setUsuarios(prev => [...prev, nuevo]);
    setFormUser({ nombre:"", pin:"", proceso:"corte" });
    setShowNuevoUser(false);
    showToast("Usuario creado ✓");
  }

  async function eliminarUsuario(id) {
    await dbDelete("usuarios", id);
    setUsuarios(prev => prev.filter(u => u.id !== id));
  }

  async function eliminarPedido(id) {
    await dbDelete("pedidos", id);
    setPedidos(prev => prev.filter(p => p.id !== id));
    setSelectedPedido(null);
    showToast("Pedido eliminado");
  }

  return (
    <div style={{ fontFamily:"'DM Mono','Courier New',monospace", minHeight:"100vh", background:"#f5f0e8", color:"#1a1208" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:#e8e0d0;} ::-webkit-scrollbar-thumb{background:#b0a898;border-radius:2px;}
        .btn{cursor:pointer;border:none;font-family:'DM Mono',monospace;font-weight:500;transition:all 0.15s;letter-spacing:0.3px;}
        .btn:active{transform:scale(0.96);}
        .card{background:#fff;border:1.5px solid #d8d0c0;}
        input,select,textarea{font-family:'DM Mono',monospace;background:#f5f0e8;border:1.5px solid #c8bfaf;color:#1a1208;padding:10px 14px;outline:none;font-size:13px;}
        input:focus,select:focus,textarea:focus{border-color:#e85d26;}
        select option{background:#f5f0e8;}
        .fade{animation:fd 0.25s ease;}
        @keyframes fd{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .prog-bar{height:6px;background:#e8e0d0;overflow:hidden;}
        .prog-fill{height:100%;transition:width 0.4s ease;}
        .checkbox-proceso{display:flex;align-items:center;gap:8px;padding:7px 12px;border:1.5px solid #d8d0c0;cursor:pointer;user-select:none;font-size:12px;}
        .checkbox-proceso.active{border-color:#e85d26;background:#fef3ee;}
        .tab{cursor:pointer;padding:10px 18px;font-size:11px;letter-spacing:1px;border-bottom:2px solid transparent;transition:all 0.15s;}
        .tab.active{border-color:#e85d26;color:#e85d26;}
        .pin-btn{width:64px;height:64px;font-size:22px;border:1.5px solid #c8bfaf;background:#fff;cursor:pointer;font-family:'DM Mono',monospace;transition:all 0.1s;}
        .pin-btn:active{background:#fef3ee;border-color:#e85d26;}
        .badge{display:inline-flex;align-items:center;padding:2px 8px;font-size:10px;letter-spacing:0.5px;font-weight:500;}
        .modal-bg{position:fixed;inset:0;background:rgba(26,18,8,0.6);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;}
        .modal{background:#f5f0e8;border:1.5px solid #c8bfaf;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;}
        .etapa-btn{flex:1;padding:10px 6px;font-size:11px;letter-spacing:0.5px;border:1.5px solid;cursor:pointer;font-family:'DM Mono',monospace;text-align:center;transition:all 0.15s;}
        .etapa-btn:active{transform:scale(0.97);}
      `}</style>

      {toast && (
        <div style={{ position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 24px",fontSize:13,zIndex:100,letterSpacing:0.5 }}>
          {toast.msg}
        </div>
      )}

      {cargando && pantalla === "login" && (
        <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#8a7a6a",letterSpacing:2 }}>
          CARGANDO...
        </div>
      )}

      {/* ══ LOGIN ══ */}
      {!cargando && pantalla === "login" && (
        <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24 }}>
          <div style={{ marginBottom:32,textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:52,letterSpacing:4,lineHeight:1 }}>FLUJO TEXTIL</div>
            <div style={{ fontSize:11,color:"#8a7a6a",letterSpacing:3,marginTop:4 }}>SISTEMA DE PRODUCCIÓN</div>
          </div>
          <div className="card" style={{ padding:32,width:"100%",maxWidth:340 }}>
            <div style={{ fontSize:11,letterSpacing:2,color:"#8a7a6a",marginBottom:16 }}>INGRESA TU PIN</div>
            <div style={{ display:"flex",gap:10,justifyContent:"center",marginBottom:24 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width:14,height:14,borderRadius:"50%",border:"1.5px solid #c8bfaf",background:pinInput.length>i?"#e85d26":"transparent",transition:"background 0.1s" }} />
              ))}
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8 }}>
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} className="pin-btn" onClick={() => { if(pinInput.length<4) setPinInput(p=>p+n); setPinError(""); }}>{n}</button>
              ))}
              <button className="pin-btn" style={{ fontSize:14 }} onClick={() => { setPinInput(""); setPinError(""); }}>C</button>
              <button className="pin-btn" onClick={() => { if(pinInput.length<4) setPinInput(p=>p+"0"); setPinError(""); }}>0</button>
              <button className="pin-btn" style={{ background:"#e85d26",color:"#fff",borderColor:"#e85d26" }} onClick={handleLogin}>→</button>
            </div>
            {pinError && <div style={{ color:"#ef4444",fontSize:12,textAlign:"center",marginTop:8 }}>{pinError}</div>}
          </div>
        </div>
      )}

      {/* ══ OPERARIO ══ */}
      {pantalla === "operario" && usuario && (
        <div style={{ maxWidth:480,margin:"0 auto",minHeight:"100vh",display:"flex",flexDirection:"column" }}>
          <div style={{ padding:"16px 20px",borderBottom:"1.5px solid #d8d0c0",background:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2 }}>{usuario.nombre}</div>
              <div style={{ fontSize:10,color:"#8a7a6a",letterSpacing:1 }}>
                {PROCESOS.find(p=>p.key===usuario.proceso)?.icon} {PROCESOS.find(p=>p.key===usuario.proceso)?.label?.toUpperCase()}
              </div>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button className="btn" onClick={cargarDatos} style={{ padding:"8px 12px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf" }}>↻</button>
              <button className="btn" onClick={handleLogout} style={{ padding:"8px 14px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf",letterSpacing:1 }}>SALIR</button>
            </div>
          </div>
          <div style={{ flex:1,padding:16,overflowY:"auto" }}>
            {(() => {
              const miProceso = usuario.proceso;
              const misPedidos = pedidos.filter(p => {
                if (!(p.procesos_activos||[]).includes(miProceso)) return false;
                // Romina y Vendedor2 solo ven sus propios pedidos
                if (miProceso === "orden" && (usuario.nombre === "Romina" || usuario.nombre === "Vendedor2")) {
                  return p.creado_por === usuario.nombre;
                }
                return true;
              });
              if (!misPedidos.length) return (
                <div style={{ padding:40,textAlign:"center",color:"#b0a898" }}>
                  <div style={{ fontSize:40,marginBottom:12 }}>🎉</div>
                  <div style={{ fontSize:14 }}>Sin pedidos pendientes</div>
                </div>
              );
              const sorted = [...misPedidos].sort((a,b) => {
                const ea = (a.procesos||{})[miProceso]; const eb = (b.procesos||{})[miProceso];
                if(ea==="en_proceso"&&eb!=="en_proceso") return -1;
                if(ea!=="en_proceso"&&eb==="en_proceso") return 1;
                if(ea==="listo"&&eb!=="listo") return 1;
                if(ea!=="listo"&&eb==="listo") return -1;
                return ({alta:0,media:1,baja:2}[a.prioridad]||1) - ({alta:0,media:1,baja:2}[b.prioridad]||1);
              });
              return sorted.map(p => {
                const pedidoActual = pedidos.find(x => x.id === p.id) || p;
                const etapa = (pedidoActual.procesos||{})[miProceso] || "pendiente";
                const pri = PRIORIDADES.find(pr=>pr.key===pedidoActual.prioridad);
                const vencido = pedidoActual.fecha_entrega < hoy() && etapa !== "listo";
                const proc = PROCESOS.find(pr=>pr.key===miProceso);
                return (
                  <div key={pedidoActual.id} className="card fade" style={{ marginBottom:12,overflow:"hidden",borderLeft:`4px solid ${etapa==="listo"?"#10b981":etapa==="en_proceso"?"#f59e0b":pri?.color}` }}>
                    <div style={{ padding:"14px 16px" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
                        <div>
                          <div style={{ fontWeight:500,fontSize:15 }}>{p.cliente}</div>
                          <div style={{ fontSize:11,color:"#8a7a6a",marginTop:2 }}>{p.id} · {p.cantidad} unidades</div>
                        </div>
                        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4 }}>
                          <span className="badge" style={{ background:pri?.color+"22",color:pri?.color }}>{pri?.label?.toUpperCase()}</span>
                          {vencido && <span className="badge" style={{ background:"#ef444422",color:"#ef4444" }}>⚠ VENCIDO</span>}
                        </div>
                      </div>
                      {p.descripcion && <div style={{ fontSize:12,color:"#5a4a3a",marginBottom:10,padding:"8px 10px",background:"#f5f0e8",borderLeft:"3px solid #c8bfaf" }}>{p.descripcion}</div>}
                      <div style={{ fontSize:11,color:"#8a7a6a",marginBottom:12 }}>📅 Entrega: {p.fecha_entrega}</div>
                      <div style={{ marginBottom:12,padding:"10px 14px",background:ETAPA_COLOR[etapa]+"15",border:`1.5px solid ${ETAPA_COLOR[etapa]}33`,display:"flex",alignItems:"center",gap:10 }}>
                        <span style={{ fontSize:20 }}>{proc?.icon}</span>
                        <div>
                          <div style={{ fontSize:10,color:"#8a7a6a",letterSpacing:1 }}>ESTADO ACTUAL</div>
                          <div style={{ fontSize:15,fontWeight:500,color:ETAPA_COLOR[etapa] }}>{ETAPA_LABEL[etapa]}</div>
                        </div>
                      </div>
                      {etapa !== "listo" && (
                        <div style={{ display:"flex",gap:8 }}>
                          {etapa === "pendiente" && (
                            <button className="etapa-btn" onClick={() => marcarEtapa(p.id,miProceso,"en_proceso")} style={{ borderColor:"#f59e0b",color:"#f59e0b",background:"transparent",letterSpacing:1 }}>▶ INICIAR</button>
                          )}
                          {etapa === "en_proceso" && (
                            <button className="etapa-btn" onClick={() => marcarEtapa(p.id,miProceso,"pendiente")} style={{ borderColor:"#c8bfaf",color:"#8a7a6a",background:"transparent",letterSpacing:1 }}>◀ PAUSAR</button>
                          )}
                          <button className="etapa-btn" onClick={() => marcarEtapa(p.id,miProceso,"listo")} style={{ borderColor:"#10b981",color:"#10b981",background:"transparent",letterSpacing:1,flex:2 }}>✓ MARCAR LISTO</button>
                        </div>
                      )}
                      {etapa === "listo" && (
                        <button className="etapa-btn" onClick={() => marcarEtapa(p.id,miProceso,"en_proceso")} style={{ borderColor:"#c8bfaf",color:"#8a7a6a",background:"transparent",width:"100%",letterSpacing:1 }}>↩ DESHACER</button>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* ══ ADMIN ══ */}
      {pantalla === "admin" && (
        <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column" }}>
          <div style={{ padding:"14px 24px",borderBottom:"1.5px solid #d8d0c0",background:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:3 }}>FLUJO TEXTIL <span style={{ fontSize:14,letterSpacing:2,color:"#8a7a6a" }}>ADMIN</span></div>
            <div style={{ display:"flex",gap:8 }}>
              <button className="btn" onClick={cargarDatos} style={{ padding:"9px 12px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf" }}>↻</button>
              <button className="btn" onClick={() => setShowNuevoPedido(true)} style={{ padding:"9px 16px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1 }}>+ PEDIDO</button>
              <button className="btn" onClick={handleLogout} style={{ padding:"9px 14px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf",letterSpacing:1 }}>SALIR</button>
            </div>
          </div>
          <div style={{ display:"flex",borderBottom:"1.5px solid #d8d0c0",background:"#fff",paddingLeft:24 }}>
            {[["pedidos","PEDIDOS"],["tablero","TABLERO"],["equipo","EQUIPO"]].map(([k,l]) => (
              <div key={k} className={`tab${adminTab===k?" active":""}`} onClick={() => setAdminTab(k)} style={{ fontSize:11,letterSpacing:2 }}>{l}</div>
            ))}
          </div>
          <div style={{ flex:1,overflowY:"auto",padding:20 }}>

            {/* PEDIDOS */}
            {adminTab === "pedidos" && (
              <div>
                <div style={{ display:"flex",gap:10,marginBottom:20,flexWrap:"wrap" }}>
                  {[
                    { l:"Total",v:pedidos.length,c:"#1a1208" },
                    { l:"En proceso",v:pedidos.filter(p=>pedidoProgreso(p)>0&&pedidoProgreso(p)<100).length,c:"#f59e0b" },
                    { l:"Completados",v:pedidos.filter(p=>pedidoProgreso(p)===100).length,c:"#10b981" },
                    { l:"Vencidos",v:pedidos.filter(p=>p.fecha_entrega<hoy()&&pedidoProgreso(p)<100).length,c:"#ef4444" },
                  ].map(s => (
                    <div key={s.l} className="card" style={{ padding:"14px 18px",flex:"1 1 100px",minWidth:100 }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:34,color:s.c,lineHeight:1 }}>{s.v}</div>
                      <div style={{ fontSize:10,color:"#8a7a6a",letterSpacing:1,marginTop:2 }}>{s.l.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                {pedidos.map(p => {
                  const prog = pedidoProgreso(p);
                  const pri = PRIORIDADES.find(pr=>pr.key===p.prioridad);
                  const vencido = p.fecha_entrega < hoy() && prog < 100;
                  const open = selectedPedido?.id === p.id;
                  return (
                    <div key={p.id} className="card fade" style={{ marginBottom:10,overflow:"hidden",cursor:"pointer",borderLeft:`4px solid ${pri?.color}` }} onClick={() => setSelectedPedido(open?null:p)}>
                      <div style={{ padding:"14px 18px" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                          <div>
                            <span style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1 }}>{p.cliente}</span>
                            <span style={{ fontSize:11,color:"#8a7a6a",marginLeft:10 }}>{p.id} · {p.cantidad} uds</span>
                            {p.creado_por && <span style={{ marginLeft:8,background:"#e85d26",color:"#fff",fontSize:9,padding:"2px 7px",letterSpacing:0.5,fontWeight:600 }}>{p.creado_por.toUpperCase()}</span>}
                          </div>
                          <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                            {vencido && <span className="badge" style={{ background:"#ef444422",color:"#ef4444" }}>⚠ VENCIDO</span>}
                            <span className="badge" style={{ background:pri?.color+"22",color:pri?.color }}>{pri?.label?.toUpperCase()}</span>
                            <span style={{ fontSize:13,color:"#8a7a6a" }}>{open?"▲":"▼"}</span>
                          </div>
                        </div>
                        <div className="prog-bar">
                          <div className="prog-fill" style={{ width:prog+"%",background:prog===100?"#10b981":"#e85d26" }} />
                        </div>
                        <div style={{ display:"flex",justifyContent:"space-between",marginTop:4 }}>
                          <span style={{ fontSize:10,color:"#8a7a6a" }}>📅 {p.fecha_entrega}</span>
                          <span style={{ fontSize:10,color:prog===100?"#10b981":"#e85d26",fontWeight:500 }}>{prog}% completado</span>
                        </div>
                      </div>
                      {open && (
                        <div style={{ padding:"0 18px 16px",borderTop:"1.5px solid #e8e0d0" }} onClick={e=>e.stopPropagation()}>
                          <div style={{ fontSize:10,letterSpacing:2,color:"#8a7a6a",margin:"14px 0 10px" }}>PROCESOS</div>
                          {PROCESOS.filter(pr=>(p.procesos_activos||[]).includes(pr.key)).map(pr => {
                            const etapa = (p.procesos||{})[pr.key] || "pendiente";
                            const op = usuarios.find(u=>u.proceso===pr.key&&u.rol==="operario");
                            return (
                              <div key={pr.key} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#f5f0e8",border:`1.5px solid ${ETAPA_COLOR[etapa]}44`,marginBottom:4 }}>
                                <span style={{ fontSize:18 }}>{pr.icon}</span>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontSize:12,fontWeight:500 }}>{pr.label}</div>
                                  {op && <div style={{ fontSize:10,color:"#8a7a6a" }}>{op.nombre}</div>}
                                </div>
                                <span className="badge" style={{ background:ETAPA_COLOR[etapa]+"22",color:ETAPA_COLOR[etapa] }}>{ETAPA_LABEL[etapa].toUpperCase()}</span>
                              </div>
                            );
                          })}
                          {p.tipo_prenda && <div style={{ marginTop:10,padding:"8px 12px",background:"#f5f0e8" }}>
                            <div style={{ fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:2 }}>TIPO DE PRENDA</div>
                            <div style={{ fontSize:13 }}>{p.tipo_prenda}</div>
                          </div>}
                          {p.tipo_tejido && <div style={{ marginTop:6,padding:"8px 12px",background:"#f5f0e8" }}>
                            <div style={{ fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:2 }}>TIPO DE TEJIDO</div>
                            <div style={{ fontSize:13 }}>{p.tipo_tejido}</div>
                          </div>}
                          {p.talles && Object.keys(p.talles).some(k=>parseInt(p.talles[k])>0) && (
                            <div style={{ marginTop:6,padding:"8px 12px",background:"#f5f0e8" }}>
                              <div style={{ fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:8 }}>TALLES</div>
                              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6 }}>
                                {Object.entries(p.talles).filter(([k,v])=>parseInt(v)>0).map(([talle,cant])=>(
                                  <div key={talle} style={{ textAlign:"center",padding:"4px",background:"#fff",border:"1px solid #d8d0c0" }}>
                                    <div style={{ fontSize:10,color:"#8a7a6a",fontWeight:600 }}>{talle}</div>
                                    <div style={{ fontSize:14,fontWeight:600,color:"#1a1208" }}>{cant}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {p.descripcion && <div style={{ marginTop:6,fontSize:12,color:"#5a4a3a",padding:"8px 12px",background:"#f5f0e8",borderLeft:"3px solid #c8bfaf" }}>{p.descripcion}</div>}
                          <div style={{ marginTop:12,display:"flex",justifyContent:"flex-end" }}>
                            <button className="btn" onClick={()=>eliminarPedido(p.id)} style={{ padding:"7px 14px",fontSize:11,background:"transparent",border:"1.5px solid #ef4444",color:"#ef4444",letterSpacing:1 }}>ELIMINAR</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!pedidos.length && <div style={{ padding:40,textAlign:"center",color:"#b0a898",fontSize:13 }}>No hay pedidos aún. Toca + PEDIDO para crear uno.</div>}
              </div>
            )}

            {/* TABLERO */}
            {adminTab === "tablero" && (
              <div style={{ overflowX:"auto" }}>
                <div style={{ display:"flex",gap:10,minWidth:800 }}>
                  {PROCESOS.map(proc => {
                    const cols = pedidos.filter(p=>(p.procesos_activos||[]).includes(proc.key));
                    return (
                      <div key={proc.key} style={{ flex:1,minWidth:140 }}>
                        <div style={{ padding:"10px 12px",background:"#fff",border:"1.5px solid #d8d0c0",borderBottom:"3px solid "+proc.color,marginBottom:8 }}>
                          <div style={{ fontSize:16 }}>{proc.icon}</div>
                          <div style={{ fontSize:10,letterSpacing:1,fontWeight:500,marginTop:2 }}>{proc.label.toUpperCase()}</div>
                          <div style={{ fontSize:10,color:"#8a7a6a",marginTop:2 }}>{cols.filter(p=>(p.procesos||{})[proc.key]==="listo").length}/{cols.length} listos</div>
                        </div>
                        {cols.map(p => {
                          const etapa = (p.procesos||{})[proc.key]||"pendiente";
                          return (
                            <div key={p.id} className="card" style={{ padding:"10px 12px",marginBottom:6,borderLeft:`3px solid ${ETAPA_COLOR[etapa]}` }}>
                              <div style={{ fontSize:11,fontWeight:500,marginBottom:2 }}>{p.cliente}</div>
                              <div style={{ fontSize:10,color:"#8a7a6a",marginBottom:4 }}>{p.cantidad} uds</div>
                              <span className="badge" style={{ background:ETAPA_COLOR[etapa]+"22",color:ETAPA_COLOR[etapa],fontSize:9 }}>{ETAPA_LABEL[etapa].toUpperCase()}</span>
                            </div>
                          );
                        })}
                        {!cols.length && <div style={{ padding:12,textAlign:"center",color:"#c8bfaf",fontSize:11,border:"1.5px dashed #d8d0c0" }}>Sin pedidos</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* EQUIPO */}
            {adminTab === "equipo" && (
              <div>
                <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:14 }}>
                  <button className="btn" onClick={() => setShowNuevoUser(true)} style={{ padding:"9px 16px",fontSize:11,background:"#1a1208",color:"#f5f0e8",letterSpacing:1 }}>+ USUARIO</button>
                </div>
                {usuarios.map(u => {
                  const proc = PROCESOS.find(p=>p.key===u.proceso);
                  const asig = u.proceso ? pedidos.filter(p=>(p.procesos_activos||[]).includes(u.proceso)).length : 0;
                  const listos = u.proceso ? pedidos.filter(p=>(p.procesos_activos||[]).includes(u.proceso)&&(p.procesos||{})[u.proceso]==="listo").length : 0;
                  return (
                    <div key={u.id} className="card" style={{ padding:"14px 18px",marginBottom:8,display:"flex",alignItems:"center",gap:14 }}>
                      <div style={{ width:40,height:40,background:u.rol==="admin"?"#1a1208":"#e85d26",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'Bebas Neue',sans-serif",fontSize:18,flexShrink:0 }}>
                        {u.nombre[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:500,fontSize:14 }}>{u.nombre}</div>
                        <div style={{ fontSize:11,color:"#8a7a6a" }}>{u.rol==="admin"?"Administrador":`${proc?.icon||""} ${proc?.label||"Sin proceso"}`}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        {u.rol!=="admin" && <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#e85d26",lineHeight:1 }}>{listos}/{asig}</div>}
                        {u.rol!=="admin" && <div style={{ fontSize:10,color:"#8a7a6a" }}>listos</div>}
                        <div style={{ fontSize:10,color:"#c8bfaf",marginTop:2 }}>PIN: {u.pin}</div>
                      </div>
                      {u.id !== "u1" && (
                        <button className="btn" onClick={()=>eliminarUsuario(u.id)} style={{ padding:"6px 10px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",color:"#8a7a6a" }}>✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL NUEVO PEDIDO */}
      {showNuevoPedido && (
        <div className="modal-bg" onClick={()=>setShowNuevoPedido(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2 }}>NUEVO PEDIDO</div>
            <div style={{ padding:24,display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>CLIENTE *</label>
                <input type="text" style={{ width:"100%" }} placeholder="Nombre del cliente" value={formPedido.cliente} onChange={e=>setFormPedido({...formPedido,cliente:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>TIPO DE PRENDA</label>
                <input type="text" style={{ width:"100%" }} placeholder="Ej: Remeras, buzos, pantalones..." value={formPedido.tipoPrenda||""} onChange={e=>setFormPedido({...formPedido,tipoPrenda:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>TIPO DE TEJIDO</label>
                <input type="text" style={{ width:"100%" }} placeholder="Ej: Algodón, poliéster, jersey..." value={formPedido.tipoTejido||""} onChange={e=>setFormPedido({...formPedido,tipoTejido:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8 }}>TALLES Y CANTIDADES</label>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6 }}>
                  {["2","4","6","8","10","12","14","16","P","M","G","XG","XXG","XXXG","XXXXG","Especial"].map(talle => (
                    <div key={talle} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
                      <div style={{ fontSize:10,letterSpacing:0.5,color:"#8a7a6a",fontWeight:600 }}>{talle}</div>
                      <input type="number" min="0" style={{ width:"100%",textAlign:"center",padding:"6px 4px",fontSize:12 }}
                        placeholder="0"
                        value={(formPedido.talles||{})[talle]||""}
                        onChange={e => setFormPedido({...formPedido, talles:{...(formPedido.talles||{}), [talle]: e.target.value}})}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>DESCRIPCIÓN</label>
                <textarea rows={2} style={{ width:"100%",resize:"vertical" }} placeholder="Detalles del pedido..." value={formPedido.descripcion} onChange={e=>setFormPedido({...formPedido,descripcion:e.target.value})} />
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div>
                  <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>CANTIDAD TOTAL</label>
                  <div style={{ background:"#f5f0e8",border:"1.5px solid #c8bfaf",padding:"10px 14px",fontSize:13,color:"#1a1208",fontWeight:600 }}>
                    {Object.values(formPedido.talles||{}).reduce((sum,v)=>sum+(parseInt(v)||0),0)} uds
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>PRIORIDAD</label>
                  <select style={{ width:"100%" }} value={formPedido.prioridad} onChange={e=>setFormPedido({...formPedido,prioridad:e.target.value})}>
                    {PRIORIDADES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>FECHA DE ENTREGA *</label>
                <input type="date" style={{ width:"100%" }} value={formPedido.fechaEntrega} onChange={e=>setFormPedido({...formPedido,fechaEntrega:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8 }}>PROCESOS REQUERIDOS</label>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
                  {PROCESOS.map(proc => {
                    const active = formPedido.procesosActivos.includes(proc.key);
                    return (
                      <div key={proc.key} className={`checkbox-proceso${active?" active":""}`}
                        onClick={() => {
                          const next = active ? formPedido.procesosActivos.filter(k=>k!==proc.key) : [...formPedido.procesosActivos,proc.key];
                          setFormPedido({...formPedido,procesosActivos:next});
                        }}>
                        <div style={{ width:14,height:14,border:`1.5px solid ${active?"#e85d26":"#c8bfaf"}`,background:active?"#e85d26":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
                          {active && <span style={{ color:"#fff",fontSize:9 }}>✓</span>}
                        </div>
                        {proc.icon} {proc.label}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
                <button className="btn" onClick={()=>setShowNuevoPedido(false)} style={{ padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1 }}>CANCELAR</button>
                <button className="btn" onClick={crearPedido} style={{ padding:"10px 20px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1 }}>CREAR PEDIDO</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO USUARIO */}
      {showNuevoUser && (
        <div className="modal-bg" onClick={()=>setShowNuevoUser(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2 }}>NUEVO USUARIO</div>
            <div style={{ padding:24,display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>NOMBRE *</label>
                <input type="text" style={{ width:"100%" }} placeholder="Nombre del operario" value={formUser.nombre} onChange={e=>setFormUser({...formUser,nombre:e.target.value})} />
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div>
                  <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>PIN (4 dígitos) *</label>
                  <input type="text" maxLength={4} style={{ width:"100%" }} placeholder="0000" value={formUser.pin} onChange={e=>setFormUser({...formUser,pin:e.target.value.replace(/\D/g,"")})} />
                </div>
                <div>
                  <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>PROCESO</label>
                  <select style={{ width:"100%" }} value={formUser.proceso} onChange={e=>setFormUser({...formUser,proceso:e.target.value})}>
                    {PROCESOS.map(p=><option key={p.key} value={p.key}>{p.icon} {p.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
                <button className="btn" onClick={()=>setShowNuevoUser(false)} style={{ padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1 }}>CANCELAR</button>
                <button className="btn" onClick={crearUsuario} style={{ padding:"10px 20px",fontSize:11,background:"#1a1208",color:"#f5f0e8",letterSpacing:1 }}>CREAR USUARIO</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
