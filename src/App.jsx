import { useState, useEffect } from "react";

// ── EMAILJS ──────────────────────────────────────────────────
const EMAILJS_SERVICE = "service_dyev5fd";
const EMAILJS_TEMPLATE = "template_49esy8s";
const EMAILJS_KEY = "HkDT9ars93LJ1NhsY";

async function enviarEmailPedido(pedido) {
  try {
    const prendasData = (pedido.prendas||[]).filter(p=>p.tipoPrenda||p.precioUnit);
    const totalGral = prendasData.reduce((s,p)=>s+(parseFloat(p?.precioUnit)||0)*(parseFloat(p?.cantidad)||0),0);
    const anticipo = parseFloat(pedido.anticipo)||0;

    // Build detailed prendas text
    const prendasTexto = prendasData.map((p,i) => {
      const total = (parseFloat(p.precioUnit)||0)*(parseFloat(p.cantidad)||0);
      const talles = p.talles ? Object.entries(p.talles).filter(([k,v])=>parseInt(v)>0).map(([k,v])=>`${k}:${v}`).join(" ") : "";
      return [
        `--- PRENDA ${i+1} ---`,
        p.tipoPrenda ? `Tipo: ${p.tipoPrenda}` : "",
        p.tipoTejido ? `Tejido: ${p.tipoTejido}` : "",
        p.molderia ? `Moldería: ${p.molderia}` : "",
        p.cuerpo ? `Cuerpo color: ${p.cuerpo}` : "",
        p.manga ? `Manga tipo: ${p.manga}` : "",
        p.color ? `Manga color: ${p.color}` : "",
        p.puno ? `Puño: ${p.puno}` : "",
        p.cuello ? `Cuello tipo: ${p.cuello}` : "",
        p.colorCuello ? `Color cuello: ${p.colorCuello}` : "",
        talles ? `Talles: ${talles}` : "",
        p.cantidad ? `Cantidad: ${p.cantidad} uds` : "",
        p.precioUnit ? `Precio unit: $${parseFloat(p.precioUnit).toLocaleString("es-AR")}` : "",
        total > 0 ? `Total prenda: $${total.toLocaleString("es-AR")}` : "",
      ].filter(Boolean).join("\n");
    }).join("\n\n");

    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE,
        template_id: EMAILJS_TEMPLATE,
        user_id: EMAILJS_KEY,
        template_params: {
          pedido_id: pedido.id,
          cliente: pedido.cliente,
          cantidad: pedido.cantidad,
          prioridad: pedido.prioridad,
          fecha_entrega: formatFecha(pedido.fecha_entrega),
          creado_por: pedido.creado_por || "-",
          descripcion: pedido.descripcion || "-",
          procesos_activos: (pedido.procesos_activos||[]).join(", "),
          prendas: prendasTexto || "-",
          total_general: `$${totalGral.toLocaleString("es-AR")}`,
          anticipo: anticipo > 0 ? `$${anticipo.toLocaleString("es-AR")}` : "-",
          saldo: anticipo > 0 ? `$${(totalGral-anticipo).toLocaleString("es-AR")}` : `$${totalGral.toLocaleString("es-AR")}`,
        }
      })
    });
  } catch(e) { console.error("Error enviando email:", e); }
}

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
const TALLES_LIST = ["2","4","6","8","10","12","14","16","P","M","G","XG","XXG","XXXG","XXXXG","Especial"];

const CONSUMO_REMERA = {
  "2":    { a90: 0.28, a120: 0.24 },
  "4":    { a90: 0.29, a120: 0.25 },
  "6":    { a90: 0.30, a120: 0.25 },
  "8":    { a90: 0.31, a120: 0.26 },
  "10":   { a90: 0.42, a120: 0.33 },
  "12":   { a90: 0.43, a120: 0.35 },
  "14":   { a90: 0.45, a120: 0.36 },
  "16":   { a90: 0.47, a120: 0.38 },
  "P":    { a90: 0.64, a120: 0.39 },
  "M":    { a90: 0.66, a120: 0.50 },
  "G":    { a90: 0.68, a120: 0.52 },
  "XG":   { a90: 0.71, a120: 0.54 },
  "XXG":  { a90: 0.74, a120: 0.58 },
  "XXXG": { a90: 0.78, a120: 0.60 },
  "XXXXG":{ a90: 1.15, a120: 1.00 },
  "Especial":{ a90: 1.20, a120: 1.10 },
};

function calcTejidoRemera(talles) {
  let a90 = 0, a120 = 0;
  Object.entries(talles||{}).forEach(([talle, cant]) => {
    const c = parseInt(cant)||0;
    const cons = CONSUMO_REMERA[talle];
    if (cons && c > 0) {
      a90 += cons.a90 * c;
      a120 += cons.a120 * c;
    }
  });
  return { a90: Math.ceil(a90 * 100) / 100, a120: Math.ceil(a120 * 100) / 100 };
}

const TIPOS_PRENDA = [
  "Remera cuello redondo",
  "Remera cuello V",
  "Remera Polo",
  "Camisilla",
  "Pantalón Buzo",
  "Campera Buzo",
  "Canguro",
  "Campera",
  "Chaleco",
  "Bermuda",
  "Short",
  "Otro",
];

const PRENDA_INIT = { tipoPrenda:"", tipoPrendaOtro:"", tipoTejido:"", molderia:"", cuerpo:"", manga:"", color:"", puno:"", cuello:"", colorCuello:"", talles:{}, precioUnit:"", cantidad:"" };

function pedidoProgreso(p) {
  const activos = p.procesos_activos || [];
  if (!activos.length) return 0;
  const proc = p.procesos || {};
  const listos = activos.filter(k => proc[k] === "listo").length;
  return Math.round((listos / activos.length) * 100);
}
function hoy() { return new Date().toISOString().split("T")[0]; }
function formatFecha(fecha) {
  if (!fecha) return "-";
  const [y,m,d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}
function newId(pedidos) {
  const nums = pedidos.map(p => parseInt((p.id||"").replace("P",""))).filter(n=>!isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return "P" + String(next).padStart(3, "0");
}
function calcTalles(talles) {
  return Object.values(talles||{}).reduce((s,v)=>s+(parseInt(v)||0),0);
}
function calcTotal(p) {
  return (parseFloat(p?.precioUnit)||0) * (parseFloat(p?.cantidad)||0);
}
function calcTotalGral(prendas) {
  return (prendas||[]).reduce((s,p)=>s+calcTotal(p),0);
}

const FORM_INIT = {
  cliente:"", prioridad:"media", fechaEntrega:"", descripcion:"",
  procesosActivos:["orden","terminacion"],
  prendas:[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}],
  anticipo:"", imagenes:[]
};

// ── COMPONENTE PRENDA ─────────────────────────────────────────
function PrendaForm({ prenda, idx, onChange }) {
  const [abierto, setAbierto] = useState(idx === 0);
  const total = calcTotal(prenda);
  const cantTalles = calcTalles(prenda.talles);
  const tieneData = prenda.tipoPrenda || prenda.precioUnit;

  return (
    <div style={{ border:`1.5px solid ${tieneData?"#e85d26":"#d8d0c0"}`,marginBottom:8 }}>
      <div onClick={()=>setAbierto(!abierto)} style={{ padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",background:tieneData?"#fef3ee":"#fff" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:tieneData?"#e85d26":"#8a7a6a" }}>PRENDA {idx+1}</span>
          {tieneData && <span style={{ fontSize:11,color:"#8a7a6a" }}>{prenda.tipoPrenda} {total>0?`· $${total.toLocaleString("es-AR")}`:""}</span>}
        </div>
        <span style={{ color:"#8a7a6a" }}>{abierto?"▲":"▼"}</span>
      </div>
      {abierto && (
        <div style={{ padding:"14px",borderTop:"1px solid #e8e0d0",display:"flex",flexDirection:"column",gap:10 }}>
          <div>
            <label style={{ fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4 }}>TIPO DE PRENDA</label>
            <select style={{ width:"100%",marginBottom:prenda.tipoPrenda==="Otro"?6:0 }} value={prenda.tipoPrenda||""} onChange={e=>onChange({...prenda,tipoPrenda:e.target.value,tipoPrendaOtro:""})}>
              <option value="">Seleccionar...</option>
              {TIPOS_PRENDA.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            {prenda.tipoPrenda==="Otro" && (
              <input type="text" style={{ width:"100%" }} placeholder="Especificar tipo de prenda..." value={prenda.tipoPrendaOtro||""} onChange={e=>onChange({...prenda,tipoPrendaOtro:e.target.value})} />
            )}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            <div>
              <label style={{ fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4 }}>TIPO DE TEJIDO</label>
              <input type="text" style={{ width:"100%" }} placeholder="Algodón, poliéster..." value={prenda.tipoTejido||""} onChange={e=>onChange({...prenda,tipoTejido:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4 }}>MOLDERÍA</label>
              <input type="text" style={{ width:"100%" }} placeholder="Moldería..." value={prenda.molderia||""} onChange={e=>onChange({...prenda,molderia:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4 }}>CUERPO COLOR</label>
              <input type="text" style={{ width:"100%" }} placeholder="Color cuerpo..." value={prenda.cuerpo||""} onChange={e=>onChange({...prenda,cuerpo:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4 }}>MANGA TIPO</label>
              <input type="text" style={{ width:"100%" }} placeholder="Tipo manga..." value={prenda.manga||""} onChange={e=>onChange({...prenda,manga:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4 }}>MANGA COLOR</label>
              <input type="text" style={{ width:"100%" }} placeholder="Color manga..." value={prenda.color||""} onChange={e=>onChange({...prenda,color:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4 }}>PUÑO</label>
              <input type="text" style={{ width:"100%" }} placeholder="Puño..." value={prenda.puno||""} onChange={e=>onChange({...prenda,puno:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4 }}>CUELLO TIPO</label>
              <input type="text" style={{ width:"100%" }} placeholder="Tipo cuello..." value={prenda.cuello||""} onChange={e=>onChange({...prenda,cuello:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4 }}>COLOR CUELLO</label>
              <input type="text" style={{ width:"100%" }} placeholder="Color cuello..." value={prenda.colorCuello||""} onChange={e=>onChange({...prenda,colorCuello:e.target.value})} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:6 }}>TALLES Y CANTIDADES</label>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4 }}>
              {TALLES_LIST.map(t => (
                <div key={t} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
                  <div style={{ fontSize:9,color:"#8a7a6a",fontWeight:600 }}>{t}</div>
                  <input type="number" min="0" style={{ width:"100%",textAlign:"center",padding:"4px 2px",fontSize:11 }}
                    placeholder="0"
                    value={(prenda.talles||{})[t]||""}
                    onChange={e => {
                      const newTalles = {...(prenda.talles||{}), [t]: e.target.value};
                      const cant = calcTalles(newTalles);
                      onChange({...prenda, talles:newTalles, cantidad:String(cant)});
                    }}
                  />
                </div>
              ))}
            </div>
            {cantTalles > 0 && <div style={{ fontSize:11,color:"#8a7a6a",marginTop:6,textAlign:"right" }}>Total talles: {cantTalles}</div>}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            <div>
              <label style={{ fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4 }}>PRECIO UNITARIO</label>
              <input type="number" min="0" style={{ width:"100%" }} placeholder="0.00" value={prenda.precioUnit||""} onChange={e=>onChange({...prenda,precioUnit:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4 }}>CANTIDAD</label>
              <div style={{ background:"#f5f0e8",border:"1.5px solid #c8bfaf",padding:"10px 14px",fontSize:13,fontWeight:600 }}>{prenda.cantidad||"0"}</div>
            </div>
          </div>
          {total > 0 && (
            <div style={{ background:"#e85d26",color:"#fff",padding:"8px 14px",display:"flex",justifyContent:"space-between" }}>
              <span style={{ fontSize:11,letterSpacing:1 }}>TOTAL PRENDA {idx+1}</span>
              <span style={{ fontSize:14,fontWeight:600 }}>${total.toLocaleString("es-AR")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE DETALLE PRENDA ─────────────────────────────────
function PrendaDetalle({ prenda, idx, showTejido=false, showPrecios=false }) {
  const [abierto, setAbierto] = useState(false);
  const total = calcTotal(prenda);
  if (!prenda.tipoPrenda && !prenda.precioUnit) return null;
  return (
    <div style={{ border:"1.5px solid #d8d0c0",marginBottom:6 }}>
      <div onClick={()=>setAbierto(!abierto)} style={{ padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",background:"#fef3ee" }}>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:1,color:"#e85d26" }}>
          PRENDA {idx+1} {prenda.tipoPrenda ? `— ${prenda.tipoPrenda==="Otro" ? (prenda.tipoPrendaOtro||"Otro") : prenda.tipoPrenda}` : ""} 
        </span>
        <span style={{ color:"#8a7a6a",fontSize:12 }}>{abierto?"▲":"▼"}</span>
      </div>
      {abierto && (
        <div style={{ padding:"10px 12px",borderTop:"1px solid #e8e0d0" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8 }}>
            {prenda.tipoPrenda && <div style={{ padding:"5px 8px",background:"#f5f0e8" }}><div style={{ fontSize:9,color:"#8a7a6a" }}>TIPO PRENDA</div><div style={{ fontSize:11,fontWeight:500 }}>{prenda.tipoPrenda}</div></div>}
            {prenda.tipoTejido && <div style={{ padding:"5px 8px",background:"#f5f0e8" }}><div style={{ fontSize:9,color:"#8a7a6a" }}>TIPO TEJIDO</div><div style={{ fontSize:11,fontWeight:500 }}>{prenda.tipoTejido}</div></div>}
            {prenda.molderia && <div style={{ padding:"5px 8px",background:"#f5f0e8" }}><div style={{ fontSize:9,color:"#8a7a6a" }}>MOLDERÍA</div><div style={{ fontSize:11,fontWeight:500 }}>{prenda.molderia}</div></div>}
            {prenda.cuerpo && <div style={{ padding:"5px 8px",background:"#f5f0e8" }}><div style={{ fontSize:9,color:"#8a7a6a" }}>CUERPO COLOR</div><div style={{ fontSize:11,fontWeight:500 }}>{prenda.cuerpo}</div></div>}
            {prenda.manga && <div style={{ padding:"5px 8px",background:"#f5f0e8" }}><div style={{ fontSize:9,color:"#8a7a6a" }}>MANGA TIPO</div><div style={{ fontSize:11,fontWeight:500 }}>{prenda.manga}</div></div>}
            {prenda.color && <div style={{ padding:"5px 8px",background:"#f5f0e8" }}><div style={{ fontSize:9,color:"#8a7a6a" }}>MANGA COLOR</div><div style={{ fontSize:11,fontWeight:500 }}>{prenda.color}</div></div>}
            {prenda.puno && <div style={{ padding:"5px 8px",background:"#f5f0e8" }}><div style={{ fontSize:9,color:"#8a7a6a" }}>PUÑO</div><div style={{ fontSize:11,fontWeight:500 }}>{prenda.puno}</div></div>}
            {prenda.cuello && <div style={{ padding:"5px 8px",background:"#f5f0e8" }}><div style={{ fontSize:9,color:"#8a7a6a" }}>CUELLO TIPO</div><div style={{ fontSize:11,fontWeight:500 }}>{prenda.cuello}</div></div>}
            {prenda.colorCuello && <div style={{ padding:"5px 8px",background:"#f5f0e8" }}><div style={{ fontSize:9,color:"#8a7a6a" }}>COLOR CUELLO</div><div style={{ fontSize:11,fontWeight:500 }}>{prenda.colorCuello}</div></div>}
          </div>
          {prenda.talles && Object.keys(prenda.talles).some(k=>parseInt(prenda.talles[k])>0) && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:9,color:"#8a7a6a",marginBottom:4 }}>TALLES</div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:3 }}>
                {Object.entries(prenda.talles).filter(([k,v])=>parseInt(v)>0).map(([t,cant])=>(
                  <div key={t} style={{ textAlign:"center",padding:"3px",background:"#fff",border:"1px solid #d8d0c0" }}>
                    <div style={{ fontSize:9,color:"#8a7a6a",fontWeight:600 }}>{t}</div>
                    <div style={{ fontSize:12,fontWeight:600 }}>{cant}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showPrecios === true && total > 0 && (
            <div style={{ display:"flex",justifyContent:"space-between",padding:"6px 8px",background:"#e85d26",color:"#fff",fontSize:12 }}>
              <span>Precio: ${parseFloat(prenda.precioUnit||0).toLocaleString("es-AR")} x {prenda.cantidad}</span>
              <span style={{ fontWeight:600 }}>${total.toLocaleString("es-AR")}</span>
            </div>
          )}
          {prenda.tipoPrenda && (prenda.tipoPrenda.toLowerCase().includes("remera") || prenda.tipoPrenda.toLowerCase().includes("camisilla")) && Object.keys(prenda.talles||{}).some(k=>parseInt(prenda.talles[k])>0) && showTejido && (
            <div style={{ marginTop:6,padding:"8px 10px",background:"#e8f4fd",border:"1.5px solid #06b6d444" }}>
              <div style={{ fontSize:9,color:"#06b6d4",letterSpacing:1,marginBottom:6,fontWeight:600 }}>🧶 CONSUMO DE TEJIDO</div>
              {(() => {
                const tej = calcTejidoRemera(prenda.talles);
                return (
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                    <div style={{ padding:"8px",background:"#fff",border:"1px solid #d8d0c0",textAlign:"center" }}>
                      <div style={{ fontSize:9,color:"#8a7a6a",marginBottom:2 }}>ANCHO 90cm</div>
                      <div style={{ fontSize:18,fontWeight:600,color:"#06b6d4",fontFamily:"'Bebas Neue',sans-serif" }}>{tej.a90} mts</div>
                    </div>
                    <div style={{ padding:"8px",background:"#fff",border:"1px solid #d8d0c0",textAlign:"center" }}>
                      <div style={{ fontSize:9,color:"#8a7a6a",marginBottom:2 }}>ANCHO 1.20m</div>
                      <div style={{ fontSize:18,fontWeight:600,color:"#06b6d4",fontFamily:"'Bebas Neue',sans-serif" }}>{tej.a120} mts</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── RESUMEN PRECIOS ───────────────────────────────────────────
function ResumenPrecios({ prendas, anticipo, pagos }) {
  const totalGral = calcTotalGral(prendas);
  const ant = parseFloat(anticipo)||0;
  const totalPagos = (pagos||[]).reduce((s,pg)=>s+(parseFloat(pg.monto)||0),0);
  const saldo = totalGral - ant - totalPagos;
  if (totalGral === 0) return null;
  return (
    <div style={{ background:"#1a1208",color:"#f5f0e8",padding:"12px 14px",marginTop:8 }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
        <span style={{ fontSize:11,letterSpacing:1 }}>TOTAL GENERAL</span>
        <span style={{ fontSize:15,fontWeight:600 }}>${totalGral.toLocaleString("es-AR")}</span>
      </div>
      {ant > 0 && (
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6,color:"#b0a898" }}>
          <span style={{ fontSize:11 }}>Anticipo</span>
          <span style={{ fontSize:13 }}>-${ant.toLocaleString("es-AR")}</span>
        </div>
      )}
      {totalPagos > 0 && (
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6,color:"#b0a898" }}>
          <span style={{ fontSize:11 }}>Pagos registrados</span>
          <span style={{ fontSize:13 }}>-${totalPagos.toLocaleString("es-AR")}</span>
        </div>
      )}
      {(ant > 0 || totalPagos > 0) && (
        <div style={{ display:"flex",justifyContent:"space-between",borderTop:"1px solid #3a3a3a",paddingTop:8 }}>
          <span style={{ fontSize:11,letterSpacing:1,color:"#e85d26" }}>SALDO</span>
          <span style={{ fontSize:15,fontWeight:600,color:"#e85d26" }}>${saldo.toLocaleString("es-AR")}</span>
        </div>
      )}
    </div>
  );
}

function PedidoCardOperario({ p, miProceso, pedidos, usuario, marcarEtapa, subirImagenes, setPedidos, showToast, puedeVerTejido, puedeVerPrecios, dbPatchFn }) {
  const [expandido, setExpandido] = useState(false);
  const pedidoActual = pedidos.find(x => x.id === p.id) || p;
  const etapa = (pedidoActual.procesos||{})[miProceso] || "pendiente";
  const pri = PRIORIDADES.find(pr=>pr.key===pedidoActual.prioridad);
  const vencido = pedidoActual.fecha_entrega < new Date().toISOString().split("T")[0] && etapa !== "listo";
  const proc = PROCESOS.find(pr=>pr.key===miProceso);
  const progActual = pedidoActual.procesos_activos ? (() => {
    const activos = pedidoActual.procesos_activos;
    const listos = activos.filter(k => (pedidoActual.procesos||{})[k] === "listo").length;
    return Math.round((listos / activos.length) * 100);
  })() : 0;
  const bgColor = progActual === 0 ? "#fff0f4" : "#f0fff4";
  const borderColor = etapa==="listo" ? "#10b981" : etapa==="en_proceso" ? "#f59e0b" : pri?.color;
  const verPrecios = puedeVerPrecios(usuario);
  const verTejido = puedeVerTejido(usuario);

  return (
    <div className="card fade" style={{ marginBottom:8,overflow:"hidden",borderLeft:`4px solid ${borderColor}`,background:bgColor }}>
      <div style={{ padding:"12px 16px",cursor:"pointer" }} onClick={()=>setExpandido(!expandido)}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:500,fontSize:14 }}>{pedidoActual.cliente}</div>
            <div style={{ fontSize:11,color:"#8a7a6a",marginTop:1 }}>{pedidoActual.id} · {pedidoActual.cantidad} uds · 📅 {formatFecha(pedidoActual.fecha_entrega)}</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span className="badge" style={{ background:pri?.color+"22",color:pri?.color }}>{pri?.label?.toUpperCase()}</span>
            {vencido && <span className="badge" style={{ background:"#ef444422",color:"#ef4444" }}>⚠</span>}
            <span style={{ color:"#8a7a6a",fontSize:12 }}>{expandido?"▲":"▼"}</span>
          </div>
        </div>
      </div>
      {expandido && (
        <div style={{ padding:"0 16px 14px",borderTop:"1px solid #e8e0d0" }}>
          <div style={{ paddingTop:10,marginBottom:6 }}>
            {pedidoActual.creado_por && <div style={{ fontSize:10,marginBottom:6 }}><span style={{ background:"#e85d26",color:"#fff",padding:"1px 6px",fontSize:9,fontWeight:600 }}>{pedidoActual.creado_por.toUpperCase()}</span></div>}
            {vencido && <span className="badge" style={{ background:"#ef444422",color:"#ef4444",marginBottom:6 }}>⚠ VENCIDO</span>}
          </div>
          {pedidoActual.descripcion && <div style={{ fontSize:12,color:"#5a4a3a",marginBottom:8,padding:"8px 10px",background:"#f5f0e8",borderLeft:"3px solid #c8bfaf" }}>{pedidoActual.descripcion}</div>}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:4 }}>ESTADO DE PROCESOS</div>
            <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
              {PROCESOS.filter(pr=>(pedidoActual.procesos_activos||[]).includes(pr.key)).map(pr => {
                const et = (pedidoActual.procesos||{})[pr.key]||"pendiente";
                const esMio = pr.key === miProceso;
                return (
                  <div key={pr.key} style={{ display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:esMio?"#fef3ee":"#f5f0e8",border:`1px solid ${esMio?"#e85d26":ETAPA_COLOR[et]+"44"}` }}>
                    <span style={{ fontSize:12 }}>{pr.icon}</span>
                    <span style={{ fontSize:10,flex:1,fontWeight:esMio?600:400 }}>{pr.label}</span>
                    <span className="badge" style={{ background:ETAPA_COLOR[et]+"22",color:ETAPA_COLOR[et],fontSize:8 }}>{ETAPA_LABEL[et].toUpperCase()}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {(pedidoActual.prendas||[]).filter(pr=>pr.tipoPrenda).map((pr,i) => (
            <PrendaDetalle key={i} prenda={pr} idx={i} showTejido={verTejido} showPrecios={verPrecios} />
          ))}
          {verPrecios && <ResumenPrecios prendas={pedidoActual.prendas||[]} anticipo={pedidoActual.anticipo} pagos={pedidoActual.pagos||[]} />}
          {(pedidoActual.imagenes_urls||[]).length > 0 && (
            <div style={{ marginBottom:8,padding:"8px 10px",background:"#f5f0e8" }}>
              <div style={{ fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:6 }}>IMÁGENES</div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                {(pedidoActual.imagenes_urls||[]).map((url,i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" style={{ width:80,height:80,objectFit:"cover",border:"1.5px solid #d8d0c0" }} />
                  </a>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginBottom:10,padding:"10px 14px",background:ETAPA_COLOR[etapa]+"15",border:`1.5px solid ${ETAPA_COLOR[etapa]}33`,display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:20 }}>{proc?.icon}</span>
            <div>
              <div style={{ fontSize:10,color:"#8a7a6a",letterSpacing:1 }}>ESTADO ACTUAL</div>
              <div style={{ fontSize:15,fontWeight:500,color:ETAPA_COLOR[etapa] }}>{ETAPA_LABEL[etapa]}</div>
            </div>
          </div>
          <div style={{ fontSize:11,color:"#8a7a6a",marginBottom:10 }}>📅 Entrega: {formatFecha(pedidoActual.fecha_entrega)}</div>
          {miProceso === "diseno" && (
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:6 }}>SUBIR IMÁGENES (máx. 3)</label>
              <input type="file" accept="image/*" multiple
                style={{ width:"100%",background:"#f5f0e8",border:"1.5px solid #c8bfaf",padding:"8px",fontSize:11,color:"#1a1208" }}
                onChange={async e => {
                  const files = Array.from(e.target.files).slice(0,3);
                  const urls = await subirImagenes(pedidoActual.id, files);
                  if (urls.length > 0) {
                    const existentes = pedidoActual.imagenes_urls || [];
                    const nuevasUrls = [...existentes, ...urls].slice(0,3);
                    await dbPatchFn("pedidos", pedidoActual.id, { imagenes_urls: nuevasUrls });
                    setPedidos(prev => prev.map(x => x.id === pedidoActual.id ? { ...x, imagenes_urls: nuevasUrls } : x));
                    showToast("✓ Imágenes subidas");
                  }
                }}
              />
            </div>
          )}
          {etapa !== "listo" && (
            <div style={{ display:"flex",gap:8 }}>
              {etapa === "pendiente" && (
                <button className="etapa-btn" onClick={() => marcarEtapa(pedidoActual.id,miProceso,"en_proceso")} style={{ borderColor:"#f59e0b",color:"#f59e0b",background:"transparent",letterSpacing:1 }}>▶ INICIAR</button>
              )}
              {etapa === "en_proceso" && (
                <button className="etapa-btn" onClick={() => marcarEtapa(pedidoActual.id,miProceso,"pendiente")} style={{ borderColor:"#c8bfaf",color:"#8a7a6a",background:"transparent",letterSpacing:1 }}>◀ PAUSAR</button>
              )}
              <button className="etapa-btn" onClick={() => marcarEtapa(pedidoActual.id,miProceso,"listo")} style={{ borderColor:"#10b981",color:"#10b981",background:"transparent",letterSpacing:1,flex:2 }}>✓ MARCAR LISTO</button>
            </div>
          )}
          {etapa === "listo" && (
            <button className="etapa-btn" onClick={() => marcarEtapa(pedidoActual.id,miProceso,"en_proceso")} style={{ borderColor:"#c8bfaf",color:"#8a7a6a",background:"transparent",width:"100%",letterSpacing:1 }}>↩ DESHACER</button>
          )}
        </div>
      )}
    </div>
  );
}

function puedeVerTejido(usuario) {
  if (!usuario) return false;
  if (usuario.rol === "admin") return true;
  const PUEDEN_VER = ["Vivi", "Gabi", "Andrea"];
  return PUEDEN_VER.includes(usuario.nombre);
}

function puedeVerPrecios(usuario) {
  if (!usuario) return false;
  if (usuario.rol === "admin") return true;
  const PUEDEN_VER = ["Vivi", "Gabi", "Romina", "Vendedor2"];
  return PUEDEN_VER.includes(usuario.nombre);
}
function puedeVerFinanciero(usuario) {
  return usuario?.rol === "admin" || usuario?.nombre === "Gabi";
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
  const [formPedido, setFormPedido] = useState(FORM_INIT);
  const [formUser, setFormUser] = useState({ nombre:"", pin:"", proceso:"corte" });
  const [busqueda, setBusqueda] = useState("");
  const [busquedaOp, setBusquedaOp] = useState("");
  const [showPagos, setShowPagos] = useState(null); // pedido id
  const [editandoPedido, setEditandoPedido] = useState(null);
  const [formEditar, setFormEditar] = useState(null);
  const [showAgregado, setShowAgregado] = useState(null); // pedido original
  const [formAgregado, setFormAgregado] = useState({ prendas:[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}], anticipo:"" });
  const [nuevoPago, setNuevoPago] = useState({ monto:"", tipo:"efectivo", fecha:hoy() });

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
    if (u.rol === "admin" || u.nombre === "Vivi") setPantalla("admin");
    else setPantalla("operario");
  }

  function handleLogout() { setUsuario(null); setPantalla("login"); }

  async function marcarEtapa(pedidoId, procesoKey, etapa) {
    setPedidos(prev => {
      const p = prev.find(x => x.id === pedidoId);
      if (!p) return prev;
      const nuevoProcesos = { ...(p.procesos || {}), [procesoKey]: etapa };
      dbPatch("pedidos", pedidoId, { procesos: nuevoProcesos });
      return prev.map(x => x.id === pedidoId ? { ...x, procesos: nuevoProcesos } : x);
    });
    showToast(etapa === "listo" ? "✓ Marcado como listo" : "Actualizado");
  }

  async function subirImagenes(pedidoId, imagenes) {
    const urls = [];
    for (let i = 0; i < imagenes.length; i++) {
      const file = imagenes[i];
      const ext = file.name.split('.').pop().toLowerCase();
      const path = `${pedidoId}/imagen_${Date.now()}_${i+1}.${ext}`;
      try {
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/imagenes-pedidos/${path}`, {
          method: 'POST',
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': file.type, 'x-upsert': 'true' },
          body: file,
        });
        if (res.ok) {
          urls.push(`${SUPABASE_URL}/storage/v1/object/public/imagenes-pedidos/${path}`);
          showToast(`✓ Imagen ${i+1} subida`);
        }
      } catch(e) { showToast("Error al subir imagen", "#ef4444"); }
    }
    return urls;
  }

  async function crearPedido() {
    if (!formPedido.cliente || !formPedido.fechaEntrega) return;
    const prendas = formPedido.prendas.filter(p => p.tipoPrenda || p.precioUnit);
    const cantidad = prendas.reduce((s,p) => s + (parseInt(p.cantidad)||0), 0);
    const procesos = {};
    PROCESOS.forEach(p => { procesos[p.key] = "pendiente"; });
    procesos["orden"] = "listo";
    const nuevo = {
      id: newId(pedidos),
      cliente: formPedido.cliente,
      cantidad,
      prioridad: formPedido.prioridad,
      fecha_entrega: formPedido.fechaEntrega,
      descripcion: formPedido.descripcion,
      prendas,
      anticipo: formPedido.anticipo||"",
      datos_factura: formPedido.datosFactura||"",
      pagos: [],
      procesos_activos: [...formPedido.procesosActivos],
      procesos,
      creado: hoy(),
      creado_por: usuario?.nombre || "Admin",
      imagenes_urls: [],
    };
    await dbInsert("pedidos", nuevo);
    if ((formPedido.imagenes||[]).length > 0) {
      const urls = await subirImagenes(nuevo.id, formPedido.imagenes);
      if (urls.length > 0) {
        await dbPatch("pedidos", nuevo.id, { imagenes_urls: urls });
        nuevo.imagenes_urls = urls;
      }
    }
    setPedidos(prev => [...prev, nuevo]);
    enviarEmailPedido(nuevo);
    setFormPedido(FORM_INIT);
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

  async function agregarPago(pedidoId) {
    if (!nuevoPago.monto) return;
    const p = pedidos.find(x => x.id === pedidoId);
    if (!p) return;
    const pago = { monto: parseFloat(nuevoPago.monto), tipo: nuevoPago.tipo, fecha: nuevoPago.fecha, registrado_por: usuario?.nombre || "Admin" };
    const pagosActuales = [...(p.pagos||[]), pago];
    await dbPatch("pedidos", pedidoId, { pagos: pagosActuales });
    setPedidos(prev => prev.map(x => x.id === pedidoId ? { ...x, pagos: pagosActuales } : x));
    setNuevoPago({ monto:"", tipo:"efectivo", fecha:hoy() });
    showToast("✓ Pago registrado");
  }

  async function guardarEdicion() {
    if (!editandoPedido || !formEditar) return;
    const updates = {
      cliente: formEditar.cliente,
      prioridad: formEditar.prioridad,
      fecha_entrega: formEditar.fechaEntrega,
      descripcion: formEditar.descripcion,
      datos_factura: formEditar.datosFactura||"",
      anticipo: formEditar.anticipo||"",
      prendas: formEditar.prendas||[],
      procesos_activos: formEditar.procesosActivos||[],
    };
    await dbPatch("pedidos", editandoPedido, updates);
    setPedidos(prev => prev.map(p => p.id === editandoPedido ? { ...p, ...updates } : p));
    setEditandoPedido(null);
    setFormEditar(null);
    showToast("✓ Pedido actualizado");
  }

  async function crearAgregado(pedidoOriginal) {
    const prendas = formAgregado.prendas.filter(p => p.tipoPrenda || p.precioUnit);
    if (prendas.length === 0) { showToast("Agregá al menos una prenda", "#ef4444"); return; }
    const cantidad = prendas.reduce((s,p) => s + (parseInt(p.cantidad)||0), 0);
    // Generate ID like P001-A, P001-B
    const existentes = pedidos.filter(p => p.id.startsWith(pedidoOriginal.id + "-"));
    const letra = String.fromCharCode(65 + existentes.length); // A, B, C...
    const procesos = {};
    PROCESOS.forEach(p => { procesos[p.key] = "pendiente"; });
    procesos["orden"] = "listo";
    const nuevo = {
      id: `${pedidoOriginal.id}-${letra}`,
      cliente: pedidoOriginal.cliente,
      cantidad,
      prioridad: pedidoOriginal.prioridad,
      fecha_entrega: pedidoOriginal.fecha_entrega,
      descripcion: `AGREGADO al pedido ${pedidoOriginal.id}`,
      prendas,
      anticipo: formAgregado.anticipo||"",
      procesos_activos: [...(pedidoOriginal.procesos_activos||[])],
      procesos,
      creado: hoy(),
      creado_por: usuario?.nombre || "Admin",
      imagenes_urls: [],
      pagos: [],
      pedido_original: pedidoOriginal.id,
    };
    await dbInsert("pedidos", nuevo);
    setPedidos(prev => [...prev, nuevo]);
    enviarEmailPedido(nuevo);
    setShowAgregado(null);
    setFormAgregado({ prendas:[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}], anticipo:"" });
    showToast(`✓ Agregado ${nuevo.id} creado`);
  }

  const pedidosFiltrados = pedidos.filter(p => {
    if (!busqueda) return true;
    const b = busqueda.toLowerCase();
    return (p.cliente||"").toLowerCase().includes(b) ||
           (p.id||"").toLowerCase().includes(b) ||
           (p.creado_por||"").toLowerCase().includes(b);
  });

  return (
    <div style={{ fontFamily:"'DM Mono','Courier New',monospace", minHeight:"100vh", background:"#f5f0e8", color:"#1a1208" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        .btn{cursor:pointer;border:none;font-family:'DM Mono',monospace;font-weight:500;transition:all 0.15s;letter-spacing:0.3px;}
        .btn:active{transform:scale(0.96);}
        .card{background:#fff;border:1.5px solid #d8d0c0;}
        input,select,textarea{font-family:'DM Mono',monospace;background:#f5f0e8;border:1.5px solid #c8bfaf;color:#1a1208;padding:10px 14px;outline:none;font-size:13px;}
        input:focus,select:focus,textarea:focus{border-color:#e85d26;}
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
        .modal{background:#f5f0e8;border:1.5px solid #c8bfaf;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;}
        .etapa-btn{flex:1;padding:10px 6px;font-size:11px;letter-spacing:0.5px;border:1.5px solid;cursor:pointer;font-family:'DM Mono',monospace;text-align:center;transition:all 0.15s;}
        .etapa-btn:active{transform:scale(0.97);}
        .grupo-header{display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 12px;}
      `}</style>

      {toast && (
        <div style={{ position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 24px",fontSize:13,zIndex:100,letterSpacing:0.5 }}>
          {toast.msg}
        </div>
      )}

      {/* ══ LOGIN ══ */}
      {pantalla === "login" && (
        <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24 }}>
          <div style={{ marginBottom:32,textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:52,letterSpacing:4,lineHeight:1 }}>FLUJO TEXTIL</div>
            <div style={{ fontSize:11,color:"#8a7a6a",letterSpacing:3,marginTop:4 }}>SISTEMA DE PRODUCCIÓN</div>
          </div>
          <div className="card" style={{ padding:32,width:"100%",maxWidth:340 }}>
            <div style={{ fontSize:11,letterSpacing:2,color:"#8a7a6a",marginBottom:16 }}>INGRESA TU PIN</div>
            <div style={{ display:"flex",gap:10,justifyContent:"center",marginBottom:24 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width:14,height:14,borderRadius:"50%",border:"1.5px solid #c8bfaf",background:pinInput.length>i?"#e85d26":"transparent" }} />
              ))}
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8 }}>
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} className="pin-btn" onClick={() => { if(pinInput.length<4) setPinInput(p=>p+String(n)); setPinError(""); }}>{n}</button>
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
              {usuario.proceso === "orden" && (
                <button className="btn" onClick={() => setShowNuevoPedido(true)} style={{ padding:"8px 14px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1 }}>+ PEDIDO</button>
              )}
              <button className="btn" onClick={handleLogout} style={{ padding:"8px 14px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf",letterSpacing:1 }}>SALIR</button>
            </div>
          </div>
          <div style={{ padding:"8px 16px",borderBottom:"1.5px solid #d8d0c0",background:"#fff",display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:16 }}>🔍</span>
            <input type="text" placeholder="Buscar pedido..." value={busquedaOp} onChange={e=>setBusquedaOp(e.target.value)}
              style={{ flex:1,border:"none",background:"transparent",fontSize:13,outline:"none",padding:0 }} />
            {busquedaOp && <button onClick={()=>setBusquedaOp("")} style={{ border:"none",background:"none",cursor:"pointer",fontSize:16,color:"#8a7a6a" }}>✕</button>}
          </div>
          <div style={{ flex:1,padding:16,overflowY:"auto" }}>
            {(() => {
              const miProceso = usuario.proceso;
              const misPedidos = pedidos.filter(p => {
                if (!(p.procesos_activos||[]).includes(miProceso)) return false;
                if (miProceso === "orden") {
                  // All orden users only see their own pedidos
                  return p.creado_por === usuario.nombre;
                }
                return true;
              });
              const misPedidosFiltrados = [...misPedidos]
                .filter(p => {
                  if (!busquedaOp || !busquedaOp.trim()) return true;
                  const b = busquedaOp.toLowerCase().trim();
                  return (p.cliente||"").toLowerCase().includes(b) || 
                         (p.id||"").toLowerCase().includes(b) ||
                         (p.creado_por||"").toLowerCase().includes(b);
                })
                .sort((a,b) => {
                  const fa = a.fecha_entrega||"9999";
                  const fb = b.fecha_entrega||"9999";
                  return fa.localeCompare(fb);
                });

              if (!misPedidos.length) return (
                <div style={{ padding:40,textAlign:"center",color:"#b0a898" }}>
                  <div style={{ fontSize:40,marginBottom:12 }}>🎉</div>
                  <div style={{ fontSize:14 }}>Sin pedidos pendientes</div>
                </div>
              );

              // Vista orden - progreso general
              const verPreciosOp = puedeVerPrecios(usuario);
              if (miProceso === "orden") {
                return misPedidosFiltrados.map(p => {
                  const pedidoActual = pedidos.find(x => x.id === p.id) || p;
                  const prog = pedidoProgreso(pedidoActual);
                  const pri = PRIORIDADES.find(pr=>pr.key===pedidoActual.prioridad);
                  const vencido = pedidoActual.fecha_entrega < hoy() && prog < 100;
                  return (
                    <div key={pedidoActual.id} className="card fade" style={{ marginBottom:12,overflow:"hidden",borderLeft:`4px solid ${prog===100?"#10b981":prog>0?"#f59e0b":pri?.color}` }}>
                      <div style={{ padding:"14px 16px" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                          <div>
                            <div style={{ fontWeight:500,fontSize:15 }}>{pedidoActual.cliente}</div>
                            <div style={{ fontSize:11,color:"#8a7a6a",marginTop:2 }}>{pedidoActual.id} · {pedidoActual.cantidad} uds</div>
                          </div>
                          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4 }}>
                            <span className="badge" style={{ background:pri?.color+"22",color:pri?.color }}>{pri?.label?.toUpperCase()}</span>
                            {vencido && <span className="badge" style={{ background:"#ef444422",color:"#ef4444" }}>⚠ VENCIDO</span>}
                          </div>
                        </div>
                        <div className="prog-bar" style={{ marginBottom:4 }}>
                          <div className="prog-fill" style={{ width:prog+"%",background:prog===100?"#10b981":"#e85d26" }} />
                        </div>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
                          <span style={{ fontSize:10,color:"#8a7a6a" }}>📅 {formatFecha(pedidoActual.fecha_entrega)}</span>
                          <span style={{ fontSize:10,color:prog===100?"#10b981":"#e85d26",fontWeight:500 }}>{prog}% completado</span>
                        </div>
                        {/* Prendas */}
                        {(pedidoActual.prendas||[]).filter(pr=>pr.tipoPrenda).map((pr,i) => (
                          <PrendaDetalle key={i} prenda={pr} idx={i} showTejido={puedeVerTejido(usuario)} showPrecios={verPreciosOp} />
                        ))}
                        {verPreciosOp && <ResumenPrecios prendas={pedidoActual.prendas||[]} anticipo={pedidoActual.anticipo} pagos={pedidoActual.pagos||[]} />}
                        {pedidoActual.descripcion && <div style={{ fontSize:12,color:"#5a4a3a",marginTop:8,padding:"8px 10px",background:"#f5f0e8",borderLeft:"3px solid #c8bfaf" }}>{pedidoActual.descripcion}</div>}
                        {pedidoActual.datos_factura && (usuario?.nombre==="Vivi" || usuario?.nombre===pedidoActual.creado_por) && (
                          <div style={{ marginTop:6,padding:"8px 10px",background:"#fff8e1",border:"1.5px solid #f59e0b44" }}>
                            <div style={{ fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:4 }}>DATOS PARA FACTURA</div>
                            <div style={{ fontSize:12,color:"#1a1208",whiteSpace:"pre-wrap" }}>{pedidoActual.datos_factura}</div>
                          </div>
                        )}
                        {(usuario?.nombre==="Vivi" || usuario?.nombre===pedidoActual.creado_por) && (
                          <button className="btn" onClick={()=>{
                            setShowAgregado(pedidoActual);
                            setFormAgregado({ prendas:[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}], anticipo:"" });
                          }} style={{ width:"100%",padding:"8px",fontSize:11,background:"transparent",border:"1.5px solid #10b981",color:"#10b981",letterSpacing:1,marginBottom:8 }}>+ AGREGAR AL PEDIDO</button>
                        )}
                        {verPreciosOp && (() => {
                          const totalGral = calcTotalGral(pedidoActual.prendas||[]);
                          const pagos = pedidoActual.pagos||[];
                          const totalPagado = pagos.reduce((s,pg)=>s+(parseFloat(pg.monto)||0),0);
                          const saldo = totalGral - totalPagado;
                          return totalGral > 0 ? (
                            <div style={{ marginTop:8,padding:"10px",background:"#f5f0e8",border:"1.5px solid #d8d0c0" }}>
                              <div style={{ fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:6 }}>PAGOS</div>
                              {pagos.map((pg,i) => (
                                <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"5px 8px",background:"#fff",border:"1px solid #d8d0c0",marginBottom:3,fontSize:11 }}>
                                  <span style={{ fontWeight:600 }}>${parseFloat(pg.monto).toLocaleString("es-AR")} <span style={{ fontWeight:400,color:"#8a7a6a" }}>{pg.tipo} · {formatFecha(pg.fecha)}</span></span>
                                </div>
                              ))}
                              <div style={{ display:"flex",justifyContent:"space-between",padding:"6px 8px",background:"#1a1208",color:"#f5f0e8",fontSize:11,marginTop:4,marginBottom:8 }}>
                                <span>Pagado: ${totalPagado.toLocaleString("es-AR")}</span>
                                <span style={{ color:"#e85d26",fontWeight:600 }}>Saldo: ${saldo.toLocaleString("es-AR")}</span>
                              </div>
                              {showPagos === pedidoActual.id ? (
                                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                                    <div>
                                      <label style={{ fontSize:9,color:"#8a7a6a",display:"block",marginBottom:3 }}>MONTO</label>
                                      <input type="number" style={{ width:"100%" }} placeholder="0.00" value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago,monto:e.target.value})} />
                                    </div>
                                    <div>
                                      <label style={{ fontSize:9,color:"#8a7a6a",display:"block",marginBottom:3 }}>TIPO</label>
                                      <select style={{ width:"100%" }} value={nuevoPago.tipo} onChange={e=>setNuevoPago({...nuevoPago,tipo:e.target.value})}>
                                        <option value="efectivo">Efectivo</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="transferencia">Transferencia</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize:9,color:"#8a7a6a",display:"block",marginBottom:3 }}>FECHA</label>
                                    <input type="date" style={{ width:"100%" }} value={nuevoPago.fecha} onChange={e=>setNuevoPago({...nuevoPago,fecha:e.target.value})} />
                                  </div>
                                  <div style={{ display:"flex",gap:8 }}>
                                    <button className="btn" onClick={()=>setShowPagos(null)} style={{ flex:1,padding:"8px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",color:"#8a7a6a" }}>CANCELAR</button>
                                    <button className="btn" onClick={()=>agregarPago(pedidoActual.id)} style={{ flex:2,padding:"8px",fontSize:11,background:"#10b981",color:"#fff" }}>✓ REGISTRAR PAGO</button>
                                  </div>
                                </div>
                              ) : (
                                <button className="btn" onClick={()=>setShowPagos(pedidoActual.id)} style={{ width:"100%",padding:"8px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1 }}>+ AGREGAR PAGO</button>
                              )}
                            </div>
                          ) : null;
                        })()}
                        {(pedidoActual.imagenes_urls||[]).length > 0 && (
                          <div style={{ marginTop:8,padding:"8px 10px",background:"#f5f0e8" }}>
                            <div style={{ fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:6 }}>IMÁGENES</div>
                            <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                              {(pedidoActual.imagenes_urls||[]).map((url,i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt="" style={{ width:80,height:80,objectFit:"cover",border:"1.5px solid #d8d0c0" }} />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ marginTop:10,fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:6 }}>ESTADO DE PROCESOS</div>
                        <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                          {PROCESOS.filter(pr=>(pedidoActual.procesos_activos||[]).includes(pr.key)).map(pr => {
                            const etapa = (pedidoActual.procesos||{})[pr.key] || "pendiente";
                            return (
                              <div key={pr.key} style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"#f5f0e8",border:`1px solid ${ETAPA_COLOR[etapa]}44` }}>
                                <span style={{ fontSize:14 }}>{pr.icon}</span>
                                <span style={{ fontSize:11,flex:1 }}>{pr.label}</span>
                                <span className="badge" style={{ background:ETAPA_COLOR[etapa]+"22",color:ETAPA_COLOR[etapa],fontSize:9 }}>{ETAPA_LABEL[etapa].toUpperCase()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                });
              }

              // Vista operario normal
              const verPrecios = puedeVerPrecios(usuario);
              const enProceso = misPedidosFiltrados.filter(p => ((pedidos.find(x=>x.id===p.id)||p).procesos||{})[miProceso] !== "listo");
              const listos = misPedidosFiltrados.filter(p => ((pedidos.find(x=>x.id===p.id)||p).procesos||{})[miProceso] === "listo");
              const grupos = [
                { titulo:"EN PROCESO", color:"#f59e0b", items: enProceso },
                { titulo:"LISTOS", color:"#10b981", items: listos },
              ];
              return (
                <>
                  {grupos.map(grupo => grupo.items.length === 0 ? null : (
                    <div key={grupo.titulo} style={{ marginBottom:20 }}>
                      <div className="grupo-header" style={{ background:grupo.color+"15",border:`1.5px solid ${grupo.color}33` }}>
                        <div style={{ width:8,height:8,borderRadius:"50%",background:grupo.color }} />
                        <span style={{ fontSize:11,letterSpacing:2,fontWeight:600,color:grupo.color }}>{grupo.titulo}</span>
                        <span style={{ marginLeft:"auto",fontSize:11,color:grupo.color }}>{grupo.items.length}</span>
                      </div>
                      {grupo.items.map(p => (
                        <PedidoCardOperario key={p.id} p={p} miProceso={miProceso} pedidos={pedidos} usuario={usuario} marcarEtapa={marcarEtapa} subirImagenes={subirImagenes} setPedidos={setPedidos} showToast={showToast} puedeVerTejido={puedeVerTejido} puedeVerPrecios={puedeVerPrecios} dbPatchFn={dbPatch} />
                      ))}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══ ADMIN ══ */}
      {pantalla === "admin" && (
        <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column" }}>
          <div style={{ padding:"14px 24px",borderBottom:"1.5px solid #d8d0c0",background:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:3 }}>FLUJO TEXTIL <span style={{ fontSize:14,letterSpacing:2,color:"#8a7a6a" }}>{usuario?.rol==="admin"?"ADMIN":usuario?.nombre?.toUpperCase()}</span></div>
            <div style={{ display:"flex",gap:8 }}>
              <button className="btn" onClick={cargarDatos} style={{ padding:"9px 12px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf" }}>↻</button>
              {usuario?.rol === "admin" && <button className="btn" onClick={() => setShowNuevoPedido(true)} style={{ padding:"9px 16px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1 }}>+ PEDIDO</button>}
              <button className="btn" onClick={handleLogout} style={{ padding:"9px 14px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf",letterSpacing:1 }}>SALIR</button>
            </div>
          </div>
          <div style={{ display:"flex",borderBottom:"1.5px solid #d8d0c0",background:"#fff",paddingLeft:24 }}>
            {[["pedidos","PEDIDOS"],["tablero","TABLERO"],["equipo","EQUIPO"]].filter(([k]) => usuario?.rol === "admin" || k !== "equipo").map(([k,l]) => (
              <div key={k} className={`tab${adminTab===k?" active":""}`} onClick={() => setAdminTab(k)} style={{ fontSize:11,letterSpacing:2 }}>{l}</div>
            ))}
          </div>
          <div style={{ flex:1,overflowY:"auto",padding:20 }}>

            {adminTab === "pedidos" && (
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16,background:"#fff",border:"1.5px solid #d8d0c0",padding:"10px 14px" }}>
                  <span style={{ fontSize:16 }}>🔍</span>
                  <input type="text" placeholder="Buscar por cliente, número o responsable..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}
                    style={{ flex:1,border:"none",background:"transparent",fontSize:13,outline:"none",padding:0 }} />
                  {busqueda && <button onClick={()=>setBusqueda("")} style={{ border:"none",background:"none",cursor:"pointer",fontSize:16,color:"#8a7a6a" }}>✕</button>}
                </div>
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
                {[...pedidosFiltrados].sort((a,b)=>(a.fecha_entrega||"9999").localeCompare(b.fecha_entrega||"9999")).map(p => {
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
                          <span style={{ fontSize:10,color:"#8a7a6a" }}>📅 {formatFecha(p.fecha_entrega)}</span>
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
                          <div style={{ marginTop:10 }}>
                            {(p.prendas||[]).filter(pr=>pr.tipoPrenda).map((pr,i) => (
                              <PrendaDetalle key={i} prenda={pr} idx={i} showTejido={puedeVerTejido(usuario)} showPrecios={puedeVerPrecios(usuario)} />
                            ))}
                            {puedeVerPrecios(usuario) && <ResumenPrecios prendas={p.prendas||[]} anticipo={p.anticipo} pagos={p.pagos||[]} />}
                          </div>
                          {p.descripcion && <div style={{ marginTop:8,fontSize:12,color:"#5a4a3a",padding:"8px 12px",background:"#f5f0e8",borderLeft:"3px solid #c8bfaf" }}>{p.descripcion}</div>}
                          {p.datos_factura && (usuario?.rol==="admin" || usuario?.nombre==="Vivi" || usuario?.nombre===p.creado_por) && (
                            <div style={{ marginTop:6,padding:"8px 12px",background:"#fff8e1",border:"1.5px solid #f59e0b44" }}>
                              <div style={{ fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:4 }}>DATOS PARA FACTURA</div>
                              <div style={{ fontSize:12,color:"#1a1208",whiteSpace:"pre-wrap" }}>{p.datos_factura}</div>
                            </div>
                          )}
                          {(p.imagenes_urls||[]).length > 0 && (
                            <div style={{ marginTop:8,padding:"8px 12px",background:"#f5f0e8" }}>
                              <div style={{ fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:8 }}>IMÁGENES</div>
                              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                                {(p.imagenes_urls||[]).map((url,i) => (
                                  <a key={i} href={url} target="_blank" rel="noreferrer">
                                    <img src={url} alt="" style={{ width:100,height:100,objectFit:"cover",border:"1.5px solid #d8d0c0" }} />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* PAGOS */}
                          {puedeVerPrecios(usuario) && (() => {
                            const totalGral = calcTotalGral(p.prendas||[]);
                            const pagos = p.pagos||[];
                            const totalPagado = pagos.reduce((s,pg)=>s+(parseFloat(pg.monto)||0),0);
                            const saldo = totalGral - totalPagado;
                            return totalGral > 0 ? (
                              <div style={{ marginTop:10,padding:"10px 12px",background:"#f5f0e8",border:"1.5px solid #d8d0c0" }}>
                                <div style={{ fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:8 }}>PAGOS REGISTRADOS</div>
                                {pagos.length === 0 && <div style={{ fontSize:11,color:"#b0a898",marginBottom:8 }}>Sin pagos registrados</div>}
                                {pagos.map((pg,i) => (
                                  <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 8px",background:"#fff",border:"1px solid #d8d0c0",marginBottom:4,fontSize:11 }}>
                                    <div>
                                      <span style={{ fontWeight:600 }}>${parseFloat(pg.monto).toLocaleString("es-AR")}</span>
                                      <span style={{ marginLeft:8,color:"#8a7a6a" }}>{pg.tipo}</span>
                                      <span style={{ marginLeft:8,color:"#8a7a6a" }}>{formatFecha(pg.fecha)}</span>
                                    </div>
                                    <span style={{ fontSize:10,color:"#b0a898" }}>{pg.registrado_por}</span>
                                  </div>
                                ))}
                                <div style={{ display:"flex",justifyContent:"space-between",padding:"6px 8px",background:"#1a1208",color:"#f5f0e8",fontSize:12,marginBottom:10 }}>
                                  <span>Total pagado: ${totalPagado.toLocaleString("es-AR")}</span>
                                  <span style={{ color:"#e85d26",fontWeight:600 }}>Saldo: ${saldo.toLocaleString("es-AR")}</span>
                                </div>
                                {showPagos === p.id ? (
                                  <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                                      <div>
                                        <label style={{ fontSize:9,color:"#8a7a6a",display:"block",marginBottom:3 }}>MONTO</label>
                                        <input type="number" style={{ width:"100%" }} placeholder="0.00" value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago,monto:e.target.value})} />
                                      </div>
                                      <div>
                                        <label style={{ fontSize:9,color:"#8a7a6a",display:"block",marginBottom:3 }}>TIPO</label>
                                        <select style={{ width:"100%" }} value={nuevoPago.tipo} onChange={e=>setNuevoPago({...nuevoPago,tipo:e.target.value})}>
                                          <option value="efectivo">Efectivo</option>
                                          <option value="cheque">Cheque</option>
                                          <option value="transferencia">Transferencia</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div>
                                      <label style={{ fontSize:9,color:"#8a7a6a",display:"block",marginBottom:3 }}>FECHA</label>
                                      <input type="date" style={{ width:"100%" }} value={nuevoPago.fecha} onChange={e=>setNuevoPago({...nuevoPago,fecha:e.target.value})} />
                                    </div>
                                    <div style={{ display:"flex",gap:8 }}>
                                      <button className="btn" onClick={()=>setShowPagos(null)} style={{ flex:1,padding:"8px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",color:"#8a7a6a" }}>CANCELAR</button>
                                      <button className="btn" onClick={()=>agregarPago(p.id)} style={{ flex:2,padding:"8px",fontSize:11,background:"#10b981",color:"#fff" }}>✓ REGISTRAR PAGO</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button className="btn" onClick={()=>setShowPagos(p.id)} style={{ width:"100%",padding:"8px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1 }}>+ AGREGAR PAGO</button>
                                )}
                              </div>
                            ) : null;
                          })()}
                          {pedidos.filter(x=>x.pedido_original===p.id).length > 0 && (
                            <div style={{ marginTop:8,padding:"8px 12px",background:"#f5f0e8",border:"1.5px solid #10b98144" }}>
                              <div style={{ fontSize:9,color:"#10b981",letterSpacing:1,marginBottom:6 }}>PEDIDOS AGREGADOS</div>
                              {pedidos.filter(x=>x.pedido_original===p.id).map(ag => (
                                <div key={ag.id} style={{ display:"flex",justifyContent:"space-between",padding:"5px 8px",background:"#fff",border:"1px solid #d8d0c0",marginBottom:3,fontSize:11 }}>
                                  <span style={{ fontWeight:600 }}>{ag.id}</span>
                                  <span style={{ color:"#8a7a6a" }}>{ag.cantidad} uds · ${calcTotalGral(ag.prendas||[]).toLocaleString("es-AR")}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {usuario?.rol === "admin" && <div style={{ marginTop:12,display:"flex",justifyContent:"flex-end",gap:8 }}>
                            {(usuario?.rol==="admin" || usuario?.nombre==="Vivi" || usuario?.nombre===p.creado_por) && (
                              <button className="btn" onClick={()=>{
                                setShowAgregado(p);
                                setFormAgregado({ prendas:[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}], anticipo:"" });
                                setSelectedPedido(null);
                              }} style={{ padding:"7px 14px",fontSize:11,background:"transparent",border:"1.5px solid #10b981",color:"#10b981",letterSpacing:1 }}>+ AGREGAR</button>
                            )}
                            <button className="btn" onClick={()=>{
                              setEditandoPedido(p.id);
                              setFormEditar({
                                cliente: p.cliente,
                                prioridad: p.prioridad,
                                fechaEntrega: p.fecha_entrega,
                                descripcion: p.descripcion||"",
                                datosFactura: p.datos_factura||"",
                                anticipo: p.anticipo||"",
                                prendas: p.prendas||[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}],
                                procesosActivos: p.procesos_activos||[],
                              });
                              setSelectedPedido(null);
                            }} style={{ padding:"7px 14px",fontSize:11,background:"transparent",border:"1.5px solid #e85d26",color:"#e85d26",letterSpacing:1 }}>✏️ EDITAR</button>
                            <button className="btn" onClick={()=>eliminarPedido(p.id)} style={{ padding:"7px 14px",fontSize:11,background:"transparent",border:"1.5px solid #ef4444",color:"#ef4444",letterSpacing:1 }}>ELIMINAR</button>
                          </div>}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!pedidosFiltrados.length && <div style={{ padding:40,textAlign:"center",color:"#b0a898",fontSize:13 }}>{busqueda?"Sin resultados para tu búsqueda":"No hay pedidos aún."}</div>}
                {puedeVerFinanciero(usuario) && pedidos.length > 0 && (() => {
                  const totalGral = pedidos.reduce((s,p) => s + calcTotalGral(p.prendas||[]), 0);
                  const totalSaldo = pedidos.reduce((s,p) => {
                    const tg = calcTotalGral(p.prendas||[]);
                    const anticipo = parseFloat(p.anticipo)||0;
                    const pagado = (p.pagos||[]).reduce((sp,pg)=>sp+(parseFloat(pg.monto)||0),0);
                    return s + (tg - anticipo - pagado);
                  }, 0);
                  // Group by month
                  const porMes = {};
                  pedidos.forEach(p => {
                    const fechaRef = p.creado || p.fecha_entrega;
                    if (!fechaRef) return;
                    const mes = fechaRef.slice(0,7);
                    if (!porMes[mes]) porMes[mes] = { total:0, saldo:0 };
                    const tg = calcTotalGral(p.prendas||[]);
                    const ant = parseFloat(p.anticipo)||0;
                    const pagado = (p.pagos||[]).reduce((sp,pg)=>sp+(parseFloat(pg.monto)||0),0);
                    porMes[mes].total += tg;
                    porMes[mes].saldo += (tg - ant - pagado);
                  });
                  return (
                    <div style={{ marginTop:20,padding:"16px",background:"#1a1208",color:"#f5f0e8" }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,marginBottom:12 }}>RESUMEN FINANCIERO</div>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
                        <div style={{ padding:"12px",background:"#2a2a2a" }}>
                          <div style={{ fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:4 }}>TOTAL GENERAL</div>
                          <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#f5f0e8" }}>${totalGral.toLocaleString("es-AR")}</div>
                        </div>
                        <div style={{ padding:"12px",background:"#2a2a2a" }}>
                          <div style={{ fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:4 }}>SALDO A COBRAR</div>
                          <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#e85d26" }}>${totalSaldo.toLocaleString("es-AR")}</div>
                        </div>
                      </div>
                      <div style={{ fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:8 }}>POR MES (fecha de pedido)</div>
                      {Object.keys(porMes).sort().map(mes => {
                        const [y,m] = mes.split("-");
                        const meses = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
                        return (
                          <div key={mes} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"#2a2a2a",marginBottom:4 }}>
                            <span style={{ fontSize:12,letterSpacing:1 }}>{meses[parseInt(m)]} {y}</span>
                            <div style={{ display:"flex",gap:16 }}>
                              <span style={{ fontSize:11,color:"#b0a898" }}>Total: ${porMes[mes].total.toLocaleString("es-AR")}</span>
                              <span style={{ fontSize:11,color:"#e85d26" }}>Saldo: ${porMes[mes].saldo.toLocaleString("es-AR")}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {adminTab === "tablero" && (
              <div style={{ overflowX:"auto" }}>
                <div style={{ display:"flex",gap:10,minWidth:900 }}>
                  {PROCESOS.map(proc => {
                    const cols = pedidos.filter(p=>(p.procesos_activos||[]).includes(proc.key));
                    const enProceso = cols.filter(p=>(p.procesos||{})[proc.key]!=="listo");
                    const listos = cols.filter(p=>(p.procesos||{})[proc.key]==="listo");
                    return (
                      <div key={proc.key} style={{ flex:1,minWidth:140 }}>
                        <div style={{ padding:"10px 12px",background:"#fff",border:"1.5px solid #d8d0c0",borderBottom:"3px solid "+proc.color,marginBottom:8 }}>
                          <div style={{ fontSize:16 }}>{proc.icon}</div>
                          <div style={{ fontSize:10,letterSpacing:1,fontWeight:500,marginTop:2 }}>{proc.label.toUpperCase()}</div>
                          <div style={{ fontSize:10,color:"#8a7a6a",marginTop:2 }}>{listos.length}/{cols.length} listos</div>
                        </div>
                        {enProceso.length > 0 && <div style={{ marginBottom:4,padding:"3px 8px",background:"#f59e0b15",borderBottom:"2px solid #f59e0b33" }}><span style={{ fontSize:9,letterSpacing:1,color:"#f59e0b",fontWeight:600 }}>EN PROCESO</span></div>}
                        {enProceso.map(p => {
                          const etapa = (p.procesos||{})[proc.key]||"pendiente";
                          return (
                            <div key={p.id} className="card" style={{ padding:"10px 12px",marginBottom:6,borderLeft:`3px solid ${ETAPA_COLOR[etapa]}` }}>
                              <div style={{ fontSize:11,fontWeight:500,marginBottom:2 }}>{p.cliente}</div>
                              <div style={{ fontSize:10,color:"#8a7a6a",marginBottom:4 }}>{p.cantidad} uds</div>
                              <span className="badge" style={{ background:ETAPA_COLOR[etapa]+"22",color:ETAPA_COLOR[etapa],fontSize:9 }}>{ETAPA_LABEL[etapa].toUpperCase()}</span>
                            </div>
                          );
                        })}
                        {listos.length > 0 && <div style={{ marginBottom:4,padding:"3px 8px",background:"#10b98115",borderBottom:"2px solid #10b98133" }}><span style={{ fontSize:9,letterSpacing:1,color:"#10b981",fontWeight:600 }}>LISTOS</span></div>}
                        {listos.map(p => (
                          <div key={p.id} className="card" style={{ padding:"10px 12px",marginBottom:6,borderLeft:"3px solid #10b981",opacity:0.7 }}>
                            <div style={{ fontSize:11,fontWeight:500,marginBottom:2 }}>{p.cliente}</div>
                            <div style={{ fontSize:10,color:"#8a7a6a",marginBottom:4 }}>{p.cantidad} uds</div>
                            <span className="badge" style={{ background:"#10b98122",color:"#10b981",fontSize:9 }}>✓ LISTO</span>
                          </div>
                        ))}
                        {!cols.length && <div style={{ padding:12,textAlign:"center",color:"#c8bfaf",fontSize:11,border:"1.5px dashed #d8d0c0" }}>Sin pedidos</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                      {u.id !== "u0" && (
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

      {/* MODAL AGREGADO */}
      {showAgregado && (
        <div className="modal-bg" onClick={()=>setShowAgregado(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#10b981" }}>
              AGREGAR AL PEDIDO {showAgregado.id}
            </div>
            <div style={{ padding:24,display:"flex",flexDirection:"column",gap:14 }}>
              {/* Datos originales - solo lectura */}
              <div style={{ padding:"12px",background:"#f5f0e8",border:"1.5px solid #d8d0c0" }}>
                <div style={{ fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:8 }}>DATOS DEL PEDIDO ORIGINAL (sin cambios)</div>
                <div style={{ fontSize:13,fontWeight:600,marginBottom:4 }}>{showAgregado.cliente}</div>
                <div style={{ fontSize:11,color:"#8a7a6a",marginBottom:4 }}>📅 Entrega: {formatFecha(showAgregado.fecha_entrega)}</div>
                <div style={{ fontSize:11,color:"#8a7a6a" }}>Procesos: {(showAgregado.procesos_activos||[]).map(k=>PROCESOS.find(p=>p.key===k)?.label).filter(Boolean).join(", ")}</div>
              </div>
              {/* Nuevas prendas */}
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8 }}>PRENDAS A AGREGAR</label>
                {[0,1,2].map(i => (
                  <PrendaForm key={i} prenda={formAgregado.prendas[i]||{...PRENDA_INIT}} idx={i}
                    onChange={prenda => {
                      const ps = [...formAgregado.prendas];
                      ps[i] = prenda;
                      setFormAgregado(prev=>({...prev,prendas:ps}));
                    }}
                  />
                ))}
              </div>
              {calcTotalGral(formAgregado.prendas) > 0 && (
                <div>
                  <ResumenPrecios prendas={formAgregado.prendas} anticipo={formAgregado.anticipo} pagos={[]} />
                  <div style={{ marginTop:8 }}>
                    <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>ANTICIPO</label>
                    <input type="number" min="0" style={{ width:"100%" }} placeholder="0.00" value={formAgregado.anticipo||""} onChange={e=>setFormAgregado({...formAgregado,anticipo:e.target.value})} />
                  </div>
                </div>
              )}
              <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
                <button className="btn" onClick={()=>setShowAgregado(null)} style={{ padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1 }}>CANCELAR</button>
                <button className="btn" onClick={()=>crearAgregado(showAgregado)} style={{ padding:"10px 20px",fontSize:11,background:"#10b981",color:"#fff",letterSpacing:1 }}>CREAR AGREGADO</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PEDIDO */}
      {editandoPedido && formEditar && (
        <div className="modal-bg" onClick={()=>{setEditandoPedido(null);setFormEditar(null);}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#e85d26" }}>EDITAR PEDIDO</div>
            <div style={{ padding:24,display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>CLIENTE</label>
                <input type="text" style={{ width:"100%" }} value={formEditar.cliente} onChange={e=>setFormEditar({...formEditar,cliente:e.target.value})} />
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div>
                  <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>PRIORIDAD</label>
                  <select style={{ width:"100%" }} value={formEditar.prioridad} onChange={e=>setFormEditar({...formEditar,prioridad:e.target.value})}>
                    {PRIORIDADES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>FECHA DE ENTREGA</label>
                  <input type="date" style={{ width:"100%" }} value={formEditar.fechaEntrega} onChange={e=>setFormEditar({...formEditar,fechaEntrega:e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8 }}>PRENDAS</label>
                {[0,1,2].map(i => (
                  <PrendaForm key={i} prenda={formEditar.prendas[i]||{...PRENDA_INIT}} idx={i}
                    onChange={prenda => {
                      const ps = [...formEditar.prendas];
                      ps[i] = prenda;
                      setFormEditar(prev=>({...prev,prendas:ps}));
                    }}
                  />
                ))}
              </div>
              {calcTotalGral(formEditar.prendas) > 0 && (
                <div>
                  <ResumenPrecios prendas={formEditar.prendas} anticipo={formEditar.anticipo} pagos={[]} />
                  <div style={{ marginTop:8 }}>
                    <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>ANTICIPO</label>
                    <input type="number" min="0" style={{ width:"100%" }} placeholder="0.00" value={formEditar.anticipo||""} onChange={e=>setFormEditar({...formEditar,anticipo:e.target.value})} />
                  </div>
                </div>
              )}
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>DESCRIPCIÓN / OBSERVACIONES</label>
                <textarea rows={2} style={{ width:"100%",resize:"vertical" }} value={formEditar.descripcion} onChange={e=>setFormEditar({...formEditar,descripcion:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>DATOS PARA FACTURA</label>
                <textarea rows={2} style={{ width:"100%",resize:"vertical" }} value={formEditar.datosFactura||""} onChange={e=>setFormEditar({...formEditar,datosFactura:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8 }}>PROCESOS REQUERIDOS</label>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
                  {PROCESOS.map(proc => {
                    const active = (formEditar.procesosActivos||[]).includes(proc.key);
                    return (
                      <div key={proc.key} className={`checkbox-proceso${active?" active":""}`}
                        onClick={() => {
                          const next = active ? formEditar.procesosActivos.filter(k=>k!==proc.key) : [...(formEditar.procesosActivos||[]),proc.key];
                          setFormEditar({...formEditar,procesosActivos:next});
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
                <button className="btn" onClick={()=>{setEditandoPedido(null);setFormEditar(null);}} style={{ padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1 }}>CANCELAR</button>
                <button className="btn" onClick={guardarEdicion} style={{ padding:"10px 20px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1 }}>GUARDAR CAMBIOS</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PEDIDO */}
      {showNuevoPedido && (
        <div className="modal-bg" onClick={()=>setShowNuevoPedido(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#1a1208" }}>NUEVO PEDIDO</div>
            <div style={{ padding:24,display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>CLIENTE *</label>
                <input type="text" style={{ width:"100%" }} placeholder="Nombre del cliente" value={formPedido.cliente} onChange={e=>setFormPedido({...formPedido,cliente:e.target.value})} />
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div>
                  <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>PRIORIDAD</label>
                  <select style={{ width:"100%" }} value={formPedido.prioridad} onChange={e=>setFormPedido({...formPedido,prioridad:e.target.value})}>
                    {PRIORIDADES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>FECHA DE ENTREGA *</label>
                  <input type="date" style={{ width:"100%" }} value={formPedido.fechaEntrega} onChange={e=>setFormPedido({...formPedido,fechaEntrega:e.target.value})} />
                </div>
              </div>

              {/* PRENDAS */}
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8 }}>PRENDAS</label>
                {[0,1,2].map(i => (
                  <PrendaForm key={i} prenda={formPedido.prendas[i]||{...PRENDA_INIT}} idx={i}
                    onChange={prenda => {
                      const ps = [...formPedido.prendas];
                      ps[i] = prenda;
                      setFormPedido(prev=>({...prev,prendas:ps}));
                    }}
                  />
                ))}
              </div>

              {/* RESUMEN PRECIOS */}
              {calcTotalGral(formPedido.prendas) > 0 && (
                <div>
                  <ResumenPrecios prendas={formPedido.prendas} anticipo={formPedido.anticipo} pagos={[]} />
                  <div style={{ marginTop:8 }}>
                    <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>ANTICIPO</label>
                    <input type="number" min="0" style={{ width:"100%" }} placeholder="0.00" value={formPedido.anticipo||""} onChange={e=>setFormPedido({...formPedido,anticipo:e.target.value})} />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>DESCRIPCIÓN / OBSERVACIONES</label>
                <textarea rows={2} style={{ width:"100%",resize:"vertical" }} placeholder="Observaciones..." value={formPedido.descripcion} onChange={e=>setFormPedido({...formPedido,descripcion:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5 }}>DATOS PARA FACTURA</label>
                <textarea rows={3} style={{ width:"100%",resize:"vertical" }} placeholder="Razón social, CUIT, dirección, condición de IVA..." value={formPedido.datosFactura||""} onChange={e=>setFormPedido({...formPedido,datosFactura:e.target.value})} />
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

              <div>
                <label style={{ fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8 }}>IMÁGENES DEL DISEÑO (máx. 3)</label>
                <input type="file" accept="image/*" multiple style={{ width:"100%",background:"#f5f0e8",border:"1.5px solid #c8bfaf",padding:"8px",fontSize:12,color:"#1a1208" }}
                  onChange={e => setFormPedido(prev => ({...prev, imagenes: Array.from(e.target.files).slice(0,3)}))}
                />
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
