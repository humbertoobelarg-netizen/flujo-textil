import { useState, useEffect } from "react";

const EMAILJS_SERVICE = "service_dyev5fd";
const EMAILJS_TEMPLATE = "template_49esy8s";
const EMAILJS_KEY = "HkDT9ars93LJ1NhsY";

const SUPABASE_URL = "https://avybrjvhltvcybdiyvvv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2eWJyanZobHR2Y3liZGl5dnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTE4NDYsImV4cCI6MjA5NDc4Nzg0Nn0.wbiU8qmRTPiaKU6At97_djP0p0obKGyVRM9rn-nbr84";
const H = { "Content-Type":"application/json","apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Prefer":"return=representation" };

async function dbGet(t,q=""){const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}?${q}`,{headers:H});return r.json();}
async function dbInsert(t,d){const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}`,{method:"POST",headers:H,body:JSON.stringify(d)});return r.json();}
async function dbPatch(t,id,d){await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`,{method:"PATCH",headers:H,body:JSON.stringify(d)});}
async function dbDelete(t,id){await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`,{method:"DELETE",headers:H});}

const PROCESOS=[
  {key:"orden",label:"Orden de Pedido",icon:"📋",color:"#64748b"},
  {key:"diseno",label:"Diseño",icon:"🎨",color:"#f43f5e"},
  {key:"corte",label:"Corte",icon:"✂️",color:"#f59e0b"},
  {key:"confeccion",label:"Confección",icon:"🧵",color:"#ec4899"},
  {key:"serigrafia",label:"Serigrafía",icon:"🖨️",color:"#e85d26"},
  {key:"bordado",label:"Bordado",icon:"🪡",color:"#a855f7"},
  {key:"sublimacion",label:"Sublimación",icon:"🌈",color:"#06b6d4"},
  {key:"dtf",label:"DTF",icon:"🖼️",color:"#10b981"},
  {key:"terminacion",label:"Terminación",icon:"📦",color:"#3b82f6"},
];
const PRIORIDADES=[{key:"alta",label:"Alta",color:"#ef4444"},{key:"media",label:"Media",color:"#f59e0b"},{key:"baja",label:"Baja",color:"#10b981"}];
const ETAPA_LABEL={pendiente:"Pendiente",en_proceso:"En proceso",listo:"✓ Listo"};
const ETAPA_COLOR={pendiente:"#64748b",en_proceso:"#f59e0b",listo:"#10b981"};
const TALLES_LIST=["2","4","6","8","10","12","14","16","P","M","G","XG","XXG","XXXG","XXXXG","Especial"];
const TIPOS_PRENDA=["Remera cuello redondo","Remera cuello V","Remera Polo","Camisilla","Pantalón Buzo","Campera Buzo","Canguro","Campera","Chaleco","Bermuda","Short","Otro"];
const CONSUMO_REMERA={"2":{a90:0.28,a120:0.24},"4":{a90:0.29,a120:0.25},"6":{a90:0.30,a120:0.25},"8":{a90:0.31,a120:0.26},"10":{a90:0.42,a120:0.33},"12":{a90:0.43,a120:0.35},"14":{a90:0.45,a120:0.36},"16":{a90:0.47,a120:0.38},"P":{a90:0.64,a120:0.39},"M":{a90:0.66,a120:0.50},"G":{a90:0.68,a120:0.52},"XG":{a90:0.71,a120:0.54},"XXG":{a90:0.74,a120:0.58},"XXXG":{a90:0.78,a120:0.60},"XXXXG":{a90:1.15,a120:1.00},"Especial":{a90:1.20,a120:1.10}};
const PRENDA_INIT={tipoPrenda:"",tipoPrendaOtro:"",tipoTejido:"",molderia:"",cuerpo:"",manga:"",color:"",puno:"",cuello:"",colorCuello:"",talles:{},precioUnit:"",cantidad:""};
const FORM_INIT={cliente:"",prioridad:"media",fechaEntrega:"",descripcion:"",datosFactura:"",procesosActivos:["orden","terminacion"],prendas:[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}],anticipo:"",imagenes:[]};

function hoy(){return new Date().toISOString().split("T")[0];}
function diasHasta(fecha){
  if(!fecha)return 999;
  const hoyD=new Date();hoyD.setHours(0,0,0,0);
  const fechaD=new Date(fecha+"T00:00:00");
  return Math.round((fechaD-hoyD)/(1000*60*60*24));
}
function formatFecha(f){if(!f)return"-";const[y,m,d]=f.split("-");return`${d}/${m}/${y}`;}
function newId(pedidos){const nums=pedidos.map(p=>parseInt((p.id||"").replace("P",""))).filter(n=>!isNaN(n));const next=nums.length>0?Math.max(...nums)+1:1;return"P"+String(next).padStart(3,"0");}
function calcTalles(talles){return Object.values(talles||{}).reduce((s,v)=>s+(parseInt(v)||0),0);}
function calcTotal(p){return(parseFloat(p?.precioUnit)||0)*(parseFloat(p?.cantidad)||0);}
function calcTotalGral(prendas){return(prendas||[]).reduce((s,p)=>s+calcTotal(p),0);}
function pedidoProgreso(p){const a=p.procesos_activos||[];if(!a.length)return 0;const l=a.filter(k=>(p.procesos||{})[k]==="listo").length;return Math.round((l/a.length)*100);}
function calcTejidoRemera(talles){let a90=0,a120=0;Object.entries(talles||{}).forEach(([t,cant])=>{const c=parseInt(cant)||0;const cons=CONSUMO_REMERA[t];if(cons&&c>0){a90+=cons.a90*c;a120+=cons.a120*c;}});return{a90:Math.ceil(a90*100)/100,a120:Math.ceil(a120*100)/100};}
function isRemera(tipo){return tipo&&(tipo.toLowerCase().includes("remera")||tipo.toLowerCase().includes("camisilla"));}

function puedeVerPrecios(u){if(!u)return false;if(u.rol==="admin")return true;return["Vivi","Gabi","Romina","Vendedor2"].includes(u.nombre);}
function puedeVerTejido(u){if(!u)return false;if(u.rol==="admin")return true;return["Vivi","Gabi","Andrea"].includes(u.nombre);}
function puedeVerFinanciero(u){if(!u)return false;if(u.rol==="admin")return true;return u.nombre==="Gabi";}

async function enviarEmailPedido(pedido){
  try{
    const prendasData=(pedido.prendas||[]).filter(p=>p.tipoPrenda||p.precioUnit);
    const totalGral=prendasData.reduce((s,p)=>s+(parseFloat(p?.precioUnit)||0)*(parseFloat(p?.cantidad)||0),0);
    const anticipo=parseFloat(pedido.anticipo)||0;
    const prendasTexto=prendasData.map((p,i)=>{
      const total=(parseFloat(p.precioUnit)||0)*(parseFloat(p.cantidad)||0);
      const talles=p.talles?Object.entries(p.talles).filter(([k,v])=>parseInt(v)>0).map(([k,v])=>`${k}:${v}`).join(" "):"";
      return[`--- PRENDA ${i+1} ---`,p.tipoPrenda?`Tipo: ${p.tipoPrenda}`:"",p.tipoTejido?`Tejido: ${p.tipoTejido}`:"",p.molderia?`Moldería: ${p.molderia}`:"",p.cuerpo?`Cuerpo: ${p.cuerpo}`:"",p.manga?`Manga: ${p.manga}`:"",p.color?`Color manga: ${p.color}`:"",p.puno?`Puño: ${p.puno}`:"",p.cuello?`Cuello: ${p.cuello}`:"",p.colorCuello?`Color cuello: ${p.colorCuello}`:"",talles?`Talles: ${talles}`:"",p.cantidad?`Cantidad: ${p.cantidad} uds`:"",p.precioUnit?`Precio unit: $${parseFloat(p.precioUnit).toLocaleString("es-AR")}`:"",total>0?`Total: $${total.toLocaleString("es-AR")}`:""].filter(Boolean).join("\n");
    }).join("\n\n");
    await fetch("https://api.emailjs.com/api/v1.0/email/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_id:EMAILJS_SERVICE,template_id:EMAILJS_TEMPLATE,user_id:EMAILJS_KEY,template_params:{pedido_id:pedido.id,cliente:pedido.cliente,cantidad:pedido.cantidad,prioridad:pedido.prioridad,fecha_entrega:formatFecha(pedido.fecha_entrega),creado_por:pedido.creado_por||"-",descripcion:pedido.descripcion||"-",procesos_activos:(pedido.procesos_activos||[]).join(", "),prendas:prendasTexto||"-",total_general:`$${totalGral.toLocaleString("es-AR")}`,anticipo:anticipo>0?`$${anticipo.toLocaleString("es-AR")}`:"-",saldo:`$${(totalGral-anticipo).toLocaleString("es-AR")}`}})});
  }catch(e){console.error("Email error:",e);}
}

// ── COMPONENTES ──────────────────────────────────────────────

function ResumenPrecios({prendas,anticipo,pagos}){
  const tg=calcTotalGral(prendas);
  const ant=parseFloat(anticipo)||0;
  const pagado=(pagos||[]).reduce((s,pg)=>s+(parseFloat(pg.monto)||0),0);
  const saldo=tg-ant-pagado;
  if(tg===0)return null;
  return(
    <div style={{background:"#1a1208",color:"#f5f0e8",padding:"12px 14px",marginTop:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11,letterSpacing:1}}>TOTAL GENERAL</span><span style={{fontSize:15,fontWeight:600}}>${tg.toLocaleString("es-AR")}</span></div>
      {ant>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:6,color:"#b0a898"}}><span style={{fontSize:11}}>Anticipo</span><span>-${ant.toLocaleString("es-AR")}</span></div>}
      {pagado>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:6,color:"#b0a898"}}><span style={{fontSize:11}}>Pagos</span><span>-${pagado.toLocaleString("es-AR")}</span></div>}
      {(ant>0||pagado>0)&&<div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #3a3a3a",paddingTop:8}}><span style={{fontSize:11,letterSpacing:1,color:"#e85d26"}}>SALDO</span><span style={{fontSize:15,fontWeight:600,color:"#e85d26"}}>${saldo.toLocaleString("es-AR")}</span></div>}
    </div>
  );
}

function PrendaDetalle({prenda,idx,showTejido=false,showPrecios=false}){
  const [abierto,setAbierto]=useState(false);
  const total=calcTotal(prenda);
  const tipoPrendaMostrar=prenda.tipoPrenda==="Otro"?(prenda.tipoPrendaOtro||"Otro"):prenda.tipoPrenda;
  if(!prenda.tipoPrenda&&!prenda.precioUnit)return null;
  return(
    <div style={{border:"1.5px solid #d8d0c0",marginBottom:6}}>
      <div onClick={()=>setAbierto(!abierto)} style={{padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",background:"#fef3ee"}}>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:1,color:"#e85d26"}}>
          PRENDA {idx+1}{tipoPrendaMostrar?` — ${tipoPrendaMostrar}`:""}
        </span>
        <span style={{color:"#8a7a6a",fontSize:12}}>{abierto?"▲":"▼"}</span>
      </div>
      {abierto&&(
        <div style={{padding:"10px 12px",borderTop:"1px solid #e8e0d0"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
            {prenda.tipoTejido&&<div style={{padding:"5px 8px",background:"#f5f0e8"}}><div style={{fontSize:9,color:"#8a7a6a"}}>TIPO TEJIDO</div><div style={{fontSize:11,fontWeight:500}}>{prenda.tipoTejido}</div></div>}
            {prenda.molderia&&<div style={{padding:"5px 8px",background:"#f5f0e8"}}><div style={{fontSize:9,color:"#8a7a6a"}}>MOLDERÍA</div><div style={{fontSize:11,fontWeight:500}}>{prenda.molderia}</div></div>}
            {prenda.cuerpo&&<div style={{padding:"5px 8px",background:"#f5f0e8"}}><div style={{fontSize:9,color:"#8a7a6a"}}>CUERPO COLOR</div><div style={{fontSize:11,fontWeight:500}}>{prenda.cuerpo}</div></div>}
            {prenda.manga&&<div style={{padding:"5px 8px",background:"#f5f0e8"}}><div style={{fontSize:9,color:"#8a7a6a"}}>MANGA TIPO</div><div style={{fontSize:11,fontWeight:500}}>{prenda.manga}</div></div>}
            {prenda.color&&<div style={{padding:"5px 8px",background:"#f5f0e8"}}><div style={{fontSize:9,color:"#8a7a6a"}}>MANGA COLOR</div><div style={{fontSize:11,fontWeight:500}}>{prenda.color}</div></div>}
            {prenda.puno&&<div style={{padding:"5px 8px",background:"#f5f0e8"}}><div style={{fontSize:9,color:"#8a7a6a"}}>PUÑO</div><div style={{fontSize:11,fontWeight:500}}>{prenda.puno}</div></div>}
            {prenda.cuello&&<div style={{padding:"5px 8px",background:"#f5f0e8"}}><div style={{fontSize:9,color:"#8a7a6a"}}>CUELLO TIPO</div><div style={{fontSize:11,fontWeight:500}}>{prenda.cuello}</div></div>}
            {prenda.colorCuello&&<div style={{padding:"5px 8px",background:"#f5f0e8"}}><div style={{fontSize:9,color:"#8a7a6a"}}>COLOR CUELLO</div><div style={{fontSize:11,fontWeight:500}}>{prenda.colorCuello}</div></div>}
          </div>
          {prenda.talles&&Object.keys(prenda.talles).some(k=>parseInt(prenda.talles[k])>0)&&(
            <div style={{marginBottom:8}}>
              <div style={{fontSize:9,color:"#8a7a6a",marginBottom:4}}>TALLES</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:3}}>
                {Object.entries(prenda.talles).filter(([k,v])=>parseInt(v)>0).map(([t,cant])=>(
                  <div key={t} style={{textAlign:"center",padding:"3px",background:"#fff",border:"1px solid #d8d0c0"}}>
                    <div style={{fontSize:9,color:"#8a7a6a",fontWeight:600}}>{t}</div>
                    <div style={{fontSize:12,fontWeight:600}}>{cant}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showPrecios===true&&total>0&&(
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 8px",background:"#e85d26",color:"#fff",fontSize:12}}>
              <span>Precio: ${parseFloat(prenda.precioUnit||0).toLocaleString("es-AR")} x {prenda.cantidad}</span>
              <span style={{fontWeight:600}}>${total.toLocaleString("es-AR")}</span>
            </div>
          )}
          {showTejido===true&&isRemera(prenda.tipoPrenda)&&Object.keys(prenda.talles||{}).some(k=>parseInt(prenda.talles[k])>0)&&(()=>{
            const tej=calcTejidoRemera(prenda.talles);
            return(
              <div style={{marginTop:6,padding:"8px 10px",background:"#e8f4fd",border:"1.5px solid #06b6d444"}}>
                <div style={{fontSize:9,color:"#06b6d4",letterSpacing:1,marginBottom:6,fontWeight:600}}>🧶 CONSUMO DE TEJIDO</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{padding:"8px",background:"#fff",border:"1px solid #d8d0c0",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#8a7a6a",marginBottom:2}}>ANCHO 90cm</div>
                    <div style={{fontSize:18,fontWeight:600,color:"#06b6d4",fontFamily:"'Bebas Neue',sans-serif"}}>{tej.a90} mts</div>
                  </div>
                  <div style={{padding:"8px",background:"#fff",border:"1px solid #d8d0c0",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#8a7a6a",marginBottom:2}}>ANCHO 1.20m</div>
                    <div style={{fontSize:18,fontWeight:600,color:"#06b6d4",fontFamily:"'Bebas Neue',sans-serif"}}>{tej.a120} mts</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function PrendaForm({prenda,idx,onChange}){
  const [abierto,setAbierto]=useState(idx===0);
  const total=calcTotal(prenda);
  const cantTalles=calcTalles(prenda.talles);
  const tieneData=prenda.tipoPrenda||prenda.precioUnit;
  const tipoPrendaMostrar=prenda.tipoPrenda==="Otro"?(prenda.tipoPrendaOtro||"Otro"):prenda.tipoPrenda;
  return(
    <div style={{border:`1.5px solid ${tieneData?"#e85d26":"#d8d0c0"}`,marginBottom:8}}>
      <div onClick={()=>setAbierto(!abierto)} style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",background:tieneData?"#fef3ee":"#fff"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:tieneData?"#e85d26":"#8a7a6a"}}>PRENDA {idx+1}</span>
          {tieneData&&<span style={{fontSize:11,color:"#8a7a6a"}}>{tipoPrendaMostrar}{total>0?` · $${total.toLocaleString("es-AR")}`:""}</span>}
        </div>
        <span style={{color:"#8a7a6a"}}>{abierto?"▲":"▼"}</span>
      </div>
      {abierto&&(
        <div style={{padding:"14px",borderTop:"1px solid #e8e0d0",display:"flex",flexDirection:"column",gap:10}}>
          <div>
            <label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>TIPO DE PRENDA</label>
            <select style={{width:"100%",marginBottom:prenda.tipoPrenda==="Otro"?6:0}} value={prenda.tipoPrenda||""} onChange={e=>onChange({...prenda,tipoPrenda:e.target.value,tipoPrendaOtro:""})}>
              <option value="">Seleccionar...</option>
              {TIPOS_PRENDA.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            {prenda.tipoPrenda==="Otro"&&<input type="text" style={{width:"100%"}} placeholder="Especificar..." value={prenda.tipoPrendaOtro||""} onChange={e=>onChange({...prenda,tipoPrendaOtro:e.target.value})}/>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>TIPO DE TEJIDO</label><input type="text" style={{width:"100%"}} placeholder="Algodón..." value={prenda.tipoTejido||""} onChange={e=>onChange({...prenda,tipoTejido:e.target.value})}/></div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>MOLDERÍA</label><input type="text" style={{width:"100%"}} placeholder="Moldería..." value={prenda.molderia||""} onChange={e=>onChange({...prenda,molderia:e.target.value})}/></div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>CUERPO COLOR</label><input type="text" style={{width:"100%"}} value={prenda.cuerpo||""} onChange={e=>onChange({...prenda,cuerpo:e.target.value})}/></div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>MANGA TIPO</label><input type="text" style={{width:"100%"}} value={prenda.manga||""} onChange={e=>onChange({...prenda,manga:e.target.value})}/></div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>MANGA COLOR</label><input type="text" style={{width:"100%"}} value={prenda.color||""} onChange={e=>onChange({...prenda,color:e.target.value})}/></div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>PUÑO</label><input type="text" style={{width:"100%"}} value={prenda.puno||""} onChange={e=>onChange({...prenda,puno:e.target.value})}/></div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>CUELLO TIPO</label><input type="text" style={{width:"100%"}} value={prenda.cuello||""} onChange={e=>onChange({...prenda,cuello:e.target.value})}/></div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>COLOR CUELLO</label><input type="text" style={{width:"100%"}} value={prenda.colorCuello||""} onChange={e=>onChange({...prenda,colorCuello:e.target.value})}/></div>
          </div>
          <div>
            <label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:6}}>TALLES Y CANTIDADES</label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
              {TALLES_LIST.map(t=>(
                <div key={t} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <div style={{fontSize:9,color:"#8a7a6a",fontWeight:600}}>{t}</div>
                  <input type="number" min="0" style={{width:"100%",textAlign:"center",padding:"4px 2px",fontSize:11}} placeholder="0"
                    value={(prenda.talles||{})[t]||""}
                    onChange={e=>{const newT={...(prenda.talles||{}),[t]:e.target.value};const cant=calcTalles(newT);onChange({...prenda,talles:newT,cantidad:String(cant)});}}
                  />
                </div>
              ))}
            </div>
            {cantTalles>0&&<div style={{fontSize:11,color:"#8a7a6a",marginTop:6,textAlign:"right"}}>Total: {cantTalles} uds</div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>PRECIO UNITARIO</label><input type="number" min="0" style={{width:"100%"}} placeholder="0.00" value={prenda.precioUnit||""} onChange={e=>onChange({...prenda,precioUnit:e.target.value})}/></div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>CANTIDAD</label><div style={{background:"#f5f0e8",border:"1.5px solid #c8bfaf",padding:"10px 14px",fontSize:13,fontWeight:600}}>{prenda.cantidad||"0"}</div></div>
          </div>
          {total>0&&<div style={{background:"#e85d26",color:"#fff",padding:"8px 14px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,letterSpacing:1}}>TOTAL PRENDA {idx+1}</span><span style={{fontSize:14,fontWeight:600}}>${total.toLocaleString("es-AR")}</span></div>}
        </div>
      )}
    </div>
  );
}

function AlertasVencimiento({pedidos,usuario}){
  const [cerrado,setCerrado]=useState(false);
  if(cerrado)return null;
  const puedeVer=usuario?.rol==="admin"||["Vivi","Romina","Andrea"].includes(usuario?.nombre)||usuario?.proceso==="orden";
  if(!puedeVer)return null;
  const porVencer=pedidos.filter(p=>{
    const dias=diasHasta(p.fecha_entrega);
    const prog=pedidoProgreso(p);
    if(prog===100||dias<0||dias>4)return false;
    if(usuario?.rol==="admin"||usuario?.nombre==="Vivi")return true;
    if(usuario?.proceso==="orden")return p.creado_por===usuario.nombre;
    if(usuario?.nombre==="Andrea")return(p.procesos_activos||[]).includes("terminacion");
    return false;
  });
  const vencidos=pedidos.filter(p=>{
    const dias=diasHasta(p.fecha_entrega);
    const prog=pedidoProgreso(p);
    if(prog===100||dias>=0)return false;
    if(usuario?.rol==="admin"||usuario?.nombre==="Vivi")return true;
    if(usuario?.proceso==="orden")return p.creado_por===usuario.nombre;
    if(usuario?.nombre==="Andrea")return(p.procesos_activos||[]).includes("terminacion");
    return false;
  });
  if(!porVencer.length&&!vencidos.length)return null;
  return(
    <div style={{marginBottom:12}}>
      {vencidos.length>0&&(
        <div style={{background:"#ef444415",border:"1.5px solid #ef444444",padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"flex-start",gap:10}}>
          <span style={{fontSize:18}}>🚨</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:"#ef4444",letterSpacing:1,marginBottom:4}}>PEDIDOS VENCIDOS ({vencidos.length})</div>
            {vencidos.map(p=>(
              <div key={p.id} style={{fontSize:11,color:"#1a1208",marginBottom:2}}>• {p.cliente} <span style={{color:"#ef4444"}}>({formatFecha(p.fecha_entrega)})</span></div>
            ))}
          </div>
          <button onClick={()=>setCerrado(true)} style={{border:"none",background:"none",cursor:"pointer",fontSize:16,color:"#8a7a6a"}}>✕</button>
        </div>
      )}
      {porVencer.length>0&&(
        <div style={{background:"#f59e0b15",border:"1.5px solid #f59e0b44",padding:"10px 14px",display:"flex",alignItems:"flex-start",gap:10}}>
          <span style={{fontSize:18}}>⚠️</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:"#f59e0b",letterSpacing:1,marginBottom:4}}>VENCEN EN MENOS DE 4 DÍAS ({porVencer.length})</div>
            {porVencer.map(p=>(
              <div key={p.id} style={{fontSize:11,color:"#1a1208",marginBottom:2}}>• {p.cliente} <span style={{color:"#f59e0b"}}>({diasHasta(p.fecha_entrega)} días — {formatFecha(p.fecha_entrega)})</span></div>
            ))}
          </div>
          <button onClick={()=>setCerrado(true)} style={{border:"none",background:"none",cursor:"pointer",fontSize:16,color:"#8a7a6a"}}>✕</button>
        </div>
      )}
    </div>
  );
}

function GrupoColapsable({titulo,icon,color,count,children}){
  const [abierto,setAbierto]=useState(false);
  return(
    <div style={{marginBottom:12}}>
      <div onClick={()=>setAbierto(!abierto)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:color+"15",border:`1.5px solid ${color}44`,cursor:"pointer",marginBottom:abierto?8:0}}>
        <span style={{fontSize:18}}>{icon}</span>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:color,flex:1}}>{titulo}</span>
        <span style={{background:color,color:"#fff",fontSize:11,fontWeight:600,padding:"2px 10px",borderRadius:20}}>{count}</span>
        <span style={{color:color,fontSize:14,fontWeight:600}}>{abierto?"▲":"▼"}</span>
      </div>
      {abierto&&<div>{children}</div>}
    </div>
  );
}

// Card colapsable genérico
function PedidoCard({pedido,usuario,usuarios=[],pedidos=[],setPedidos,marcarEtapa,miProceso,showPagos,setShowPagos,nuevoPago,setNuevoPago,agregarPago,setShowAgregado,setFormAgregado,setEditandoPedido,setFormEditar,eliminarPedido}){
  const [exp,setExp]=useState(false);
  const p=pedidos.find(x=>x.id===pedido.id)||pedido;
  const prog=pedidoProgreso(p);
  const pri=PRIORIDADES.find(pr=>pr.key===p.prioridad);
  const vencido=p.fecha_entrega<hoy()&&prog<100;
  const etapa=miProceso?(p.procesos||{})[miProceso]||"pendiente":null;
  const proc=miProceso?PROCESOS.find(pr=>pr.key===miProceso):null;
  const verPrecios=puedeVerPrecios(usuario);
  const verTejido=puedeVerTejido(usuario);
  const borderColor=etapa?(etapa==="listo"?"#10b981":etapa==="en_proceso"?"#f59e0b":pri?.color):pri?.color;
  const bgColor=prog===0?"#fff0f4":"#f0fff4";

  return(
    <div className="card fade" style={{marginBottom:8,overflow:"hidden",borderLeft:`4px solid ${borderColor}`,background:bgColor}}>
      <div style={{padding:"12px 16px",cursor:"pointer"}} onClick={()=>setExp(!exp)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:500,fontSize:14}}>{p.cliente}</div>
            <div style={{fontSize:11,color:"#8a7a6a",marginTop:1}}>
              {p.id} · {p.cantidad} uds · 📝 {formatFecha(p.creado)} · 📅 {formatFecha(p.fecha_entrega)}
              {p.creado_por&&<span style={{marginLeft:6,background:"#e85d26",color:"#fff",fontSize:9,padding:"1px 5px",fontWeight:600}}>{p.creado_por.toUpperCase()}</span>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span className="badge" style={{background:pri?.color+"22",color:pri?.color}}>{pri?.label?.toUpperCase()}</span>
            {vencido&&<span className="badge" style={{background:"#ef444422",color:"#ef4444"}}>⚠</span>}
            <span style={{color:"#8a7a6a",fontSize:12}}>{exp?"▲":"▼"}</span>
          </div>
        </div>
        <div className="prog-bar"><div className="prog-fill" style={{width:prog+"%",background:prog===100?"#10b981":"#e85d26"}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
          <span style={{fontSize:10,color:"#8a7a6a"}}>{prog}% completado</span>
          {vencido&&<span style={{fontSize:10,color:"#ef4444"}}>⚠ VENCIDO</span>}
        </div>
      </div>

      {exp&&(
        <div style={{padding:"0 16px 14px",borderTop:"1px solid #e8e0d0",paddingTop:10}} onClick={e=>e.stopPropagation()}>
          {/* Estado procesos */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:6}}>ESTADO DE PROCESOS</div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {PROCESOS.filter(pr=>(p.procesos_activos||[]).includes(pr.key)).map(pr=>{
                const et=(p.procesos||{})[pr.key]||"pendiente";
                const esMio=pr.key===miProceso;
                const op=usuarios.find(u=>u.proceso===pr.key&&u.rol==="operario");
                return(
                  <div key={pr.key} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",background:esMio?"#fef3ee":"#f5f0e8",border:`1px solid ${esMio?"#e85d26":ETAPA_COLOR[et]+"44"}`}}>
                    <span style={{fontSize:13}}>{pr.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,fontWeight:esMio?600:400}}>{pr.label}</div>
                      {op&&!miProceso&&<div style={{fontSize:9,color:"#8a7a6a"}}>{op.nombre}</div>}
                    </div>
                    <span className="badge" style={{background:ETAPA_COLOR[et]+"22",color:ETAPA_COLOR[et],fontSize:8}}>{ETAPA_LABEL[et].toUpperCase()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prendas */}
          {(p.prendas||[]).filter(pr=>pr.tipoPrenda).map((pr,i)=>(
            <PrendaDetalle key={i} prenda={pr} idx={i} showTejido={verTejido} showPrecios={verPrecios}/>
          ))}
          {verPrecios&&<ResumenPrecios prendas={p.prendas||[]} anticipo={p.anticipo} pagos={p.pagos||[]}/>}

          {/* Descripcion */}
          {p.descripcion&&<div style={{marginTop:8,fontSize:12,color:"#5a4a3a",padding:"8px 10px",background:"#f5f0e8",borderLeft:"3px solid #c8bfaf"}}>{p.descripcion}</div>}

          {/* Datos factura */}
          {p.datos_factura&&(usuario?.rol==="admin"||usuario?.nombre==="Vivi"||usuario?.nombre===p.creado_por)&&(
            <div style={{marginTop:6,padding:"8px 10px",background:"#fff8e1",border:"1.5px solid #f59e0b44"}}>
              <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:4}}>DATOS PARA FACTURA</div>
              <div style={{fontSize:12,whiteSpace:"pre-wrap"}}>{p.datos_factura}</div>
            </div>
          )}

          {/* Imagenes */}
          {(p.imagenes_urls||[]).length>0&&(
            <div style={{marginTop:8,padding:"8px 10px",background:"#f5f0e8"}}>
              <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:6}}>IMÁGENES</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {(p.imagenes_urls||[]).map((url,i)=>(
                  <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" style={{width:80,height:80,objectFit:"cover",border:"1.5px solid #d8d0c0"}}/></a>
                ))}
              </div>
            </div>
          )}

          {/* Botones operario */}
          {miProceso&&(
            <div style={{marginTop:10}}>
              {miProceso==="diseno"&&(
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:6}}>SUBIR IMÁGENES (máx. 3)</label>
                  <input type="file" accept="image/*" multiple style={{width:"100%",background:"#f5f0e8",border:"1.5px solid #c8bfaf",padding:"8px",fontSize:11}}
                    onChange={async e=>{
                      const files=Array.from(e.target.files).slice(0,3);
                      const urls=[];
                      for(let i=0;i<files.length;i++){
                        const f=files[i];const ext=f.name.split('.').pop().toLowerCase();
                        const path=`${p.id}/img_${Date.now()}_${i}.${ext}`;
                        const res=await fetch(`${SUPABASE_URL}/storage/v1/object/imagenes-pedidos/${path}`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,'Content-Type':f.type,'x-upsert':'true'},body:f});
                        if(res.ok)urls.push(`${SUPABASE_URL}/storage/v1/object/public/imagenes-pedidos/${path}`);
                      }
                      if(urls.length>0){const nu=[...(p.imagenes_urls||[]),...urls].slice(0,3);await dbPatch("pedidos",p.id,{imagenes_urls:nu});setPedidos(prev=>prev.map(x=>x.id===p.id?{...x,imagenes_urls:nu}:x));}
                    }}
                  />
                </div>
              )}
              <div style={{padding:"10px 14px",background:ETAPA_COLOR[etapa]+"15",border:`1.5px solid ${ETAPA_COLOR[etapa]}33`,display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:20}}>{proc?.icon}</span>
                <div><div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1}}>ESTADO ACTUAL</div><div style={{fontSize:14,fontWeight:500,color:ETAPA_COLOR[etapa]}}>{ETAPA_LABEL[etapa]}</div></div>
              </div>
              {etapa!=="listo"&&(
                <div style={{display:"flex",gap:8}}>
                  {etapa==="pendiente"&&<button className="etapa-btn" onClick={()=>marcarEtapa(p.id,miProceso,"en_proceso")} style={{borderColor:"#f59e0b",color:"#f59e0b",background:"transparent",letterSpacing:1}}>▶ INICIAR</button>}
                  {etapa==="en_proceso"&&<button className="etapa-btn" onClick={()=>marcarEtapa(p.id,miProceso,"pendiente")} style={{borderColor:"#c8bfaf",color:"#8a7a6a",background:"transparent",letterSpacing:1}}>◀ PAUSAR</button>}
                  <button className="etapa-btn" onClick={()=>marcarEtapa(p.id,miProceso,"listo")} style={{borderColor:"#10b981",color:"#10b981",background:"transparent",letterSpacing:1,flex:2}}>✓ MARCAR LISTO</button>
                </div>
              )}
              {etapa==="listo"&&<button className="etapa-btn" onClick={()=>marcarEtapa(p.id,miProceso,"en_proceso")} style={{borderColor:"#c8bfaf",color:"#8a7a6a",background:"transparent",width:"100%",letterSpacing:1}}>↩ DESHACER</button>}
            </div>
          )}

          {/* Pagos */}
          {verPrecios&&(()=>{
            const tg=calcTotalGral(p.prendas||[]);
            const pagos=p.pagos||[];
            const pagado=pagos.reduce((s,pg)=>s+(parseFloat(pg.monto)||0),0);
            const ant=parseFloat(p.anticipo)||0;
            const saldo=tg-ant-pagado;
            return tg>0?(
              <div style={{marginTop:8,padding:"10px",background:"#f5f0e8",border:"1.5px solid #d8d0c0"}}>
                <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:6}}>PAGOS</div>
                {pagos.length===0&&<div style={{fontSize:11,color:"#b0a898",marginBottom:6}}>Sin pagos</div>}
                {pagos.map((pg,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",background:"#fff",border:"1px solid #d8d0c0",marginBottom:3,fontSize:11}}>
                    <span style={{fontWeight:600}}>${parseFloat(pg.monto).toLocaleString("es-AR")}</span>
                    <span style={{color:"#8a7a6a"}}>{pg.tipo} · {formatFecha(pg.fecha)}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",background:"#1a1208",color:"#f5f0e8",fontSize:11,marginTop:4,marginBottom:6}}>
                  <span>Pagado: ${(ant+pagado).toLocaleString("es-AR")}</span>
                  <span style={{color:"#e85d26",fontWeight:600}}>Saldo: ${saldo.toLocaleString("es-AR")}</span>
                </div>
                {showPagos===p.id?(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div><label style={{fontSize:9,color:"#8a7a6a",display:"block",marginBottom:3}}>MONTO</label><input type="number" style={{width:"100%"}} placeholder="0.00" value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago,monto:e.target.value})}/></div>
                      <div><label style={{fontSize:9,color:"#8a7a6a",display:"block",marginBottom:3}}>TIPO</label><select style={{width:"100%"}} value={nuevoPago.tipo} onChange={e=>setNuevoPago({...nuevoPago,tipo:e.target.value})}><option value="efectivo">Efectivo</option><option value="cheque">Cheque</option><option value="transferencia">Transferencia</option></select></div>
                    </div>
                    <input type="date" style={{width:"100%"}} value={nuevoPago.fecha} onChange={e=>setNuevoPago({...nuevoPago,fecha:e.target.value})}/>
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn" onClick={()=>setShowPagos(null)} style={{flex:1,padding:"8px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",color:"#8a7a6a"}}>CANCELAR</button>
                      <button className="btn" onClick={()=>agregarPago(p.id)} style={{flex:2,padding:"8px",fontSize:11,background:"#10b981",color:"#fff"}}>✓ REGISTRAR PAGO</button>
                    </div>
                  </div>
                ):(
                  <button className="btn" onClick={()=>setShowPagos(p.id)} style={{width:"100%",padding:"8px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1}}>+ AGREGAR PAGO</button>
                )}
              </div>
            ):null;
          })()}

          {/* Pedidos agregados */}
          {pedidos.filter(x=>x.pedido_original===p.id).length>0&&(
            <div style={{marginTop:8,padding:"8px 10px",background:"#f5f0e8",border:"1.5px solid #10b98144"}}>
              <div style={{fontSize:9,color:"#10b981",letterSpacing:1,marginBottom:4}}>PEDIDOS AGREGADOS</div>
              {pedidos.filter(x=>x.pedido_original===p.id).map(ag=>(
                <div key={ag.id} style={{display:"flex",justifyContent:"space-between",padding:"3px 8px",background:"#fff",border:"1px solid #d8d0c0",marginBottom:2,fontSize:11}}>
                  <span style={{fontWeight:600}}>{ag.id}</span><span style={{color:"#8a7a6a"}}>{ag.cantidad} uds</span>
                </div>
              ))}
            </div>
          )}

          {/* Archivos adjuntos */}
          {(p.archivos_urls||[]).length>0&&(
            <div style={{marginTop:8,padding:"8px 10px",background:"#f5f0e8"}}>
              <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:6}}>ARCHIVOS ADJUNTOS</div>
              {(p.archivos_urls||[]).map((archivo,i)=>(
                <a key={i} href={archivo.url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"#fff",border:"1px solid #d8d0c0",marginBottom:4,textDecoration:"none",color:"#1a1208"}}>
                  <span style={{fontSize:16}}>📎</span>
                  <span style={{fontSize:12,flex:1}}>{archivo.nombre}</span>
                  <span style={{fontSize:10,color:"#e85d26"}}>Descargar</span>
                </a>
              ))}
            </div>
          )}
          {/* Subir archivos - para diseno y orden */}
          {(miProceso==="diseno"||(miProceso==="orden"&&(usuario?.nombre==="Vivi"||usuario?.nombre===p.creado_por)))&&(
            <div style={{marginTop:8}}>
              <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:6}}>SUBIR ARCHIVOS (PDF, Excel, Word)</label>
              <input type="file" accept="*/*" multiple
                style={{width:"100%",background:"#f5f0e8",border:"1.5px solid #c8bfaf",padding:"8px",fontSize:11}}
                onChange={async e=>{
                  const files=Array.from(e.target.files).slice(0,5);
                  const aurls=[];
                  for(let i=0;i<files.length;i++){
                    const f=files[i];const ext=f.name.split('.').pop().toLowerCase();
                    const path=`${p.id}/archivo_${Date.now()}_${i}.${ext}`;
                    const res=await fetch(`${SUPABASE_URL}/storage/v1/object/imagenes-pedidos/${path}`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,'Content-Type':f.type||'application/octet-stream','x-upsert':'true'},body:f});
                    if(res.ok){aurls.push({nombre:f.name,url:`${SUPABASE_URL}/storage/v1/object/public/imagenes-pedidos/${path}`});}
                    else{const err=await res.text();showToast(`Error: ${err.slice(0,50)}`,"#ef4444");}
                  }
                  if(aurls.length>0){
                    const existentes=p.archivos_urls||[];
                    const nuevos=[...existentes,...aurls];
                    await dbPatch("pedidos",p.id,{archivos_urls:nuevos});
                    setPedidos(prev=>prev.map(x=>x.id===p.id?{...x,archivos_urls:nuevos}:x));
                    showToast("✓ Archivos subidos");
                  }
                }}
              />
            </div>
          )}
          {/* Botones admin */}
          {!miProceso&&(
            <div style={{marginTop:10,display:"flex",gap:8,justifyContent:"flex-end"}}>
              {(usuario?.rol==="admin"||usuario?.nombre==="Vivi"||usuario?.nombre===p.creado_por)&&setShowAgregado&&(
                <button className="btn" onClick={()=>{setShowAgregado(p);setFormAgregado({prendas:[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}],anticipo:""}); }} style={{padding:"7px 14px",fontSize:11,background:"transparent",border:"1.5px solid #10b981",color:"#10b981",letterSpacing:1}}>+ AGREGAR</button>
              )}
              {usuario?.rol==="admin"&&setEditandoPedido&&(
                <button className="btn" onClick={()=>{setEditandoPedido(p.id);setFormEditar({cliente:p.cliente,prioridad:p.prioridad,fechaEntrega:p.fecha_entrega,descripcion:p.descripcion||"",datosFactura:p.datos_factura||"",anticipo:p.anticipo||"",prendas:p.prendas||[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}],procesosActivos:p.procesos_activos||[]});}} style={{padding:"7px 14px",fontSize:11,background:"transparent",border:"1.5px solid #e85d26",color:"#e85d26",letterSpacing:1}}>✏️ EDITAR</button>
              )}
              {usuario?.rol==="admin"&&eliminarPedido&&(
                <button className="btn" onClick={()=>eliminarPedido(p.id)} style={{padding:"7px 14px",fontSize:11,background:"transparent",border:"1.5px solid #ef4444",color:"#ef4444",letterSpacing:1}}>ELIMINAR</button>
              )}
            </div>
          )}
          {/* Boton agregar para vista orden */}
          {miProceso==="orden"&&setShowAgregado&&(usuario?.nombre==="Vivi"||usuario?.nombre===p.creado_por)&&(
            <button className="btn" onClick={()=>{setShowAgregado(p);setFormAgregado({prendas:[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}],anticipo:""}); }} style={{width:"100%",padding:"8px",fontSize:11,background:"transparent",border:"1.5px solid #10b981",color:"#10b981",letterSpacing:1,marginTop:8}}>+ AGREGAR AL PEDIDO</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────
export default function App(){
  const [pedidos,setPedidos]=useState([]);
  const [usuarios,setUsuarios]=useState([]);
  const [usuario,setUsuario]=useState(null);
  const [pantalla,setPantalla]=useState("login");
  const [adminTab,setAdminTab]=useState("pedidos");
  const [pinInput,setPinInput]=useState("");
  const [pinError,setPinError]=useState("");
  const [toast,setToast]=useState(null);
  const [formPedido,setFormPedido]=useState(FORM_INIT);
  const [formUser,setFormUser]=useState({nombre:"",pin:"",proceso:"corte"});
  const [busqueda,setBusqueda]=useState("");
  const [busquedaOp,setBusquedaOp]=useState("");
  const [showNuevoPedido,setShowNuevoPedido]=useState(false);
  const [showNuevoUser,setShowNuevoUser]=useState(false);
  const [showPagos,setShowPagos]=useState(null);
  const [nuevoPago,setNuevoPago]=useState({monto:"",tipo:"efectivo",fecha:hoy()});
  const [showAgregado,setShowAgregado]=useState(null);
  const [formAgregado,setFormAgregado]=useState({prendas:[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}],anticipo:""});
  const [editandoPedido,setEditandoPedido]=useState(null);
  const [formEditar,setFormEditar]=useState(null);
  const [selectedPedido,setSelectedPedido]=useState(null);
  const [gastos,setGastos]=useState([]);
  const [showNuevoGasto,setShowNuevoGasto]=useState(false);
  const [formGasto,setFormGasto]=useState({fecha:hoy(),categoria:"mat_tejido",descripcion:"",monto:"",tipo:"real"});
  const [ingresosExtra,setIngresosExtra]=useState([]);
  const [showNuevoIngreso,setShowNuevoIngreso]=useState(false);
  const [formIngreso,setFormIngreso]=useState({fecha:hoy(),descripcion:"",monto:"",origen:"pedido_viejo"});
  const [periodoFiltro,setPeriodoFiltro]=useState("mensual");
  const [filtroMes,setFiltroMes]=useState("");
  const [tipoFiltroMes,setTipoFiltroMes]=useState("entrega");
  const [mesSeleccionado,setMesSeleccionado]=useState(new Date().toISOString().slice(0,7));

  useEffect(()=>{cargarDatos();},[]);

  async function cargarDatos(){
    try{const[p,u,g,ie]=await Promise.all([dbGet("pedidos"),dbGet("usuarios"),dbGet("gastos"),dbGet("ingresos_extra")]);setPedidos(Array.isArray(p)?p:[]);setUsuarios(Array.isArray(u)?u:[]);setGastos(Array.isArray(g)?g:[]);setIngresosExtra(Array.isArray(ie)?ie:[]);}
    catch(e){showToast("Error al cargar","#ef4444");}
  }

  function showToast(msg,color="#10b981"){setToast({msg,color});setTimeout(()=>setToast(null),2500);}

  async function handleLogin(){
    const u=usuarios.find(u=>u.pin===pinInput);
    if(!u){setPinError("PIN incorrecto");setPinInput("");return;}
    setUsuario(u);setPinInput("");setPinError("");
    if(u.rol==="admin"||["Vivi","Gabi"].includes(u.nombre))setPantalla("admin");
    else setPantalla("operario");
  }

  function handleLogout(){setUsuario(null);setPantalla("login");}

  async function marcarEtapa(pedidoId,procesoKey,etapa){
    setPedidos(prev=>{
      const p=prev.find(x=>x.id===pedidoId);if(!p)return prev;
      const np={...(p.procesos||{}),[procesoKey]:etapa};
      dbPatch("pedidos",pedidoId,{procesos:np});
      return prev.map(x=>x.id===pedidoId?{...x,procesos:np}:x);
    });
    showToast(etapa==="listo"?"✓ Marcado como listo":"Actualizado");
  }

  async function agregarPago(pedidoId){
    if(!nuevoPago.monto)return;
    const p=pedidos.find(x=>x.id===pedidoId);if(!p)return;
    const pago={monto:parseFloat(nuevoPago.monto),tipo:nuevoPago.tipo,fecha:nuevoPago.fecha,registrado_por:usuario?.nombre||"Admin"};
    const pagosNuevos=[...(p.pagos||[]),pago];
    await dbPatch("pedidos",pedidoId,{pagos:pagosNuevos});
    setPedidos(prev=>prev.map(x=>x.id===pedidoId?{...x,pagos:pagosNuevos}:x));
    setNuevoPago({monto:"",tipo:"efectivo",fecha:hoy()});
    showToast("✓ Pago registrado");
  }

  async function crearIngresoExtra(){
    if(!formIngreso.descripcion||!formIngreso.monto)return;
    const nuevo={id:"IE"+Date.now(),fecha:formIngreso.fecha,descripcion:formIngreso.descripcion,monto:parseFloat(formIngreso.monto),origen:formIngreso.origen,registrado_por:usuario?.nombre||"Admin"};
    await dbInsert("ingresos_extra",nuevo);
    setIngresosExtra(prev=>[...prev,nuevo]);
    setFormIngreso({fecha:hoy(),descripcion:"",monto:"",origen:"pedido_viejo"});
    setShowNuevoIngreso(false);
    showToast("✓ Ingreso registrado");
  }

  async function eliminarIngresoExtra(id){
    await dbDelete("ingresos_extra",id);
    setIngresosExtra(prev=>prev.filter(i=>i.id!==id));
    showToast("Ingreso eliminado");
  }

  async function crearGasto(){
    if(!formGasto.descripcion||!formGasto.monto){showToast("Completá descripción y monto","#ef4444");return;}
    const nuevo={id:"G"+Date.now(),fecha:formGasto.fecha,categoria:formGasto.categoria,descripcion:formGasto.descripcion,monto:parseFloat(formGasto.monto),tipo:formGasto.tipo||"real",registrado_por:usuario?.nombre||"Admin"};
    const result=await dbInsert("gastos",nuevo);
    if(result&&result.error){
      showToast("Error: "+JSON.stringify(result).slice(0,80),"#ef4444");
      return;
    }
    setGastos(prev=>[...prev,nuevo]);
    setFormGasto({fecha:hoy(),categoria:"mat_tejido",descripcion:"",monto:"",tipo:"real"});
    setShowNuevoGasto(false);
    showToast("✓ Gasto registrado");
  }

  async function eliminarGasto(id){
    await dbDelete("gastos",id);
    setGastos(prev=>prev.filter(g=>g.id!==id));
    showToast("Gasto eliminado");
  }

  async function crearPedido(){
    if(!formPedido.cliente||!formPedido.fechaEntrega)return;
    const prendas=formPedido.prendas.filter(p=>p.tipoPrenda||p.precioUnit);
    const cantidad=prendas.reduce((s,p)=>s+(parseInt(p.cantidad)||0),0);
    const procesos={};PROCESOS.forEach(p=>{procesos[p.key]="pendiente";});procesos["orden"]="listo";
    const nuevo={id:newId(pedidos),cliente:formPedido.cliente,cantidad,prioridad:formPedido.prioridad,fecha_entrega:formPedido.fechaEntrega,descripcion:formPedido.descripcion,datos_factura:formPedido.datosFactura||"",prendas,anticipo:formPedido.anticipo||"",procesos_activos:[...formPedido.procesosActivos],procesos,creado:hoy(),creado_por:usuario?.nombre||"Admin",imagenes_urls:[],pagos:[]};
    await dbInsert("pedidos",nuevo);
    if((formPedido.imagenes||[]).length>0){
      const urls=[];
      for(let i=0;i<formPedido.imagenes.length;i++){const f=formPedido.imagenes[i];const ext=f.name.split('.').pop().toLowerCase();const path=`${nuevo.id}/img_${Date.now()}_${i}.${ext}`;const res=await fetch(`${SUPABASE_URL}/storage/v1/object/imagenes-pedidos/${path}`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,'Content-Type':f.type,'x-upsert':'true'},body:f});if(res.ok)urls.push(`${SUPABASE_URL}/storage/v1/object/public/imagenes-pedidos/${path}`);}
      if(urls.length>0){await dbPatch("pedidos",nuevo.id,{imagenes_urls:urls});nuevo.imagenes_urls=urls;}
    }
    if((formPedido.archivos||[]).length>0){
      const aurls=[];
      for(let i=0;i<formPedido.archivos.length;i++){const f=formPedido.archivos[i];const ext=f.name.split('.').pop().toLowerCase();const path=`${nuevo.id}/archivo_${Date.now()}_${i}.${ext}`;const res=await fetch(`${SUPABASE_URL}/storage/v1/object/imagenes-pedidos/${path}`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,'Content-Type':f.type||'application/octet-stream','x-upsert':'true'},body:f});if(res.ok)aurls.push({nombre:f.name,url:`${SUPABASE_URL}/storage/v1/object/public/imagenes-pedidos/${path}`});}
      if(aurls.length>0){await dbPatch("pedidos",nuevo.id,{archivos_urls:aurls});nuevo.archivos_urls=aurls;}
    }
    setPedidos(prev=>[...prev,nuevo]);
    enviarEmailPedido(nuevo);
    setFormPedido(FORM_INIT);setShowNuevoPedido(false);showToast("Pedido creado ✓");
  }

  async function crearAgregado(pedidoOriginal){
    const prendas=formAgregado.prendas.filter(p=>p.tipoPrenda||p.precioUnit);
    if(prendas.length===0){showToast("Agregá al menos una prenda","#ef4444");return;}
    const cantidad=prendas.reduce((s,p)=>s+(parseInt(p.cantidad)||0),0);
    const existentes=pedidos.filter(p=>p.id.startsWith(pedidoOriginal.id+"-"));
    const letra=String.fromCharCode(65+existentes.length);
    const procesos={};PROCESOS.forEach(p=>{procesos[p.key]="pendiente";});procesos["orden"]="listo";
    const nuevo={id:`${pedidoOriginal.id}-${letra}`,cliente:pedidoOriginal.cliente,cantidad,prioridad:pedidoOriginal.prioridad,fecha_entrega:pedidoOriginal.fecha_entrega,descripcion:`AGREGADO al pedido ${pedidoOriginal.id}`,prendas,anticipo:formAgregado.anticipo||"",procesos_activos:[...(pedidoOriginal.procesos_activos||[])],procesos,creado:hoy(),creado_por:usuario?.nombre||"Admin",imagenes_urls:[],pagos:[],pedido_original:pedidoOriginal.id};
    await dbInsert("pedidos",nuevo);
    setPedidos(prev=>[...prev,nuevo]);
    enviarEmailPedido(nuevo);
    setShowAgregado(null);setFormAgregado({prendas:[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}],anticipo:""});
    showToast(`✓ Agregado ${nuevo.id} creado`);
  }

  async function guardarEdicion(){
    if(!editandoPedido||!formEditar)return;
    const updates={cliente:formEditar.cliente,prioridad:formEditar.prioridad,fecha_entrega:formEditar.fechaEntrega,descripcion:formEditar.descripcion,datos_factura:formEditar.datosFactura||"",anticipo:formEditar.anticipo||"",prendas:formEditar.prendas||[],procesos_activos:formEditar.procesosActivos||[]};
    await dbPatch("pedidos",editandoPedido,updates);
    setPedidos(prev=>prev.map(p=>p.id===editandoPedido?{...p,...updates}:p));
    setEditandoPedido(null);setFormEditar(null);showToast("✓ Pedido actualizado");
  }

  async function crearUsuario(){
    if(!formUser.nombre||!formUser.pin)return;
    if(usuarios.find(u=>u.pin===formUser.pin)){showToast("PIN ya existe","#ef4444");return;}
    const nuevo={id:"u"+Date.now(),nombre:formUser.nombre,rol:"operario",pin:formUser.pin,proceso:formUser.proceso};
    await dbInsert("usuarios",nuevo);setUsuarios(prev=>[...prev,nuevo]);setFormUser({nombre:"",pin:"",proceso:"corte"});setShowNuevoUser(false);showToast("Usuario creado ✓");
  }

  async function eliminarUsuario(id){await dbDelete("usuarios",id);setUsuarios(prev=>prev.filter(u=>u.id!==id));}
  async function eliminarPedido(id){await dbDelete("pedidos",id);setPedidos(prev=>prev.filter(p=>p.id!==id));showToast("Pedido eliminado");}

  const MESES_NOMBRES={"enero":"01","febrero":"02","marzo":"03","abril":"04","mayo":"05","junio":"06","julio":"07","agosto":"08","septiembre":"09","octubre":"10","noviembre":"11","diciembre":"12"};
  const pedidosFiltrados=[...pedidos].filter(p=>{
    // Filter by text search
    if(busqueda){
      const b=busqueda.toLowerCase().trim();
      const match=(p.cliente||"").toLowerCase().includes(b)||(p.id||"").toLowerCase().includes(b)||(p.creado_por||"").toLowerCase().includes(b);
      if(!match)return false;
    }
    // Filter by month
    if(filtroMes){
      const b=filtroMes.toLowerCase().trim();
      const mesNum=MESES_NOMBRES[b]||(b.length<=2?b.padStart(2,"0"):null);
      const fechaRef=tipoFiltroMes==="entrega"?(p.fecha_entrega||""):(p.creado||"");
      if(mesNum){
        if(fechaRef.slice(5,7)!==mesNum)return false;
      } else if(b.length===7){
        if(!fechaRef.startsWith(b))return false;
      }
    }
    return true;
  }).sort((a,b)=>(a.fecha_entrega||"9999").localeCompare(b.fecha_entrega||"9999"));

  const cardProps={pedidos,setPedidos,usuarios,showPagos,setShowPagos,nuevoPago,setNuevoPago,agregarPago,setShowAgregado,setFormAgregado,setEditandoPedido,setFormEditar,eliminarPedido};

  return(
    <div style={{fontFamily:"'DM Mono','Courier New',monospace",minHeight:"100vh",background:"#f5f0e8",color:"#1a1208"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        .btn{cursor:pointer;border:none;font-family:'DM Mono',monospace;font-weight:500;transition:all 0.15s;letter-spacing:0.3px;}
        .btn:active{transform:scale(0.96);}
        .card{background:#fff;border:1.5px solid #d8d0c0;}
        input,select,textarea{font-family:'DM Mono',monospace;background:#f5f0e8;border:1.5px solid #c8bfaf;color:#1a1208;padding:10px 14px;outline:none;font-size:13px;}
        input:focus,select:focus,textarea:focus{border-color:#e85d26;}
        .fade{animation:fd 0.2s ease;}@keyframes fd{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .prog-bar{height:5px;background:#e8e0d0;overflow:hidden;}
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

      {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 24px",fontSize:13,zIndex:100,letterSpacing:0.5}}>{toast.msg}</div>}



      {/* LOGIN */}
      {pantalla==="login"&&(
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{marginBottom:32,textAlign:"center"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:52,letterSpacing:4,lineHeight:1}}>FLUJO TEXTIL</div>
            <div style={{fontSize:11,color:"#8a7a6a",letterSpacing:3,marginTop:4}}>SISTEMA DE PRODUCCIÓN</div>
          </div>
          <div className="card" style={{padding:32,width:"100%",maxWidth:340}}>
            <div style={{fontSize:11,letterSpacing:2,color:"#8a7a6a",marginBottom:16}}>INGRESA TU PIN</div>
            <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:24}}>
              {[0,1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:"50%",border:"1.5px solid #c8bfaf",background:pinInput.length>i?"#e85d26":"transparent"}}/>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
              {[1,2,3,4,5,6,7,8,9].map(n=><button key={n} className="pin-btn" onClick={()=>{if(pinInput.length<4)setPinInput(p=>p+String(n));setPinError("");}}>{n}</button>)}
              <button className="pin-btn" style={{fontSize:14}} onClick={()=>{setPinInput("");setPinError("");}}>C</button>
              <button className="pin-btn" onClick={()=>{if(pinInput.length<4)setPinInput(p=>p+"0");setPinError("");}}>0</button>
              <button className="pin-btn" style={{background:"#e85d26",color:"#fff",borderColor:"#e85d26"}} onClick={handleLogin}>→</button>
            </div>
            {pinError&&<div style={{color:"#ef4444",fontSize:12,textAlign:"center",marginTop:8}}>{pinError}</div>}
          </div>
        </div>
      )}

      {/* OPERARIO */}
      {pantalla==="operario"&&usuario&&(()=>{
        const miProceso=usuario.proceso;
        const misPedidos=pedidos.filter(p=>{
          if(!(p.procesos_activos||[]).includes(miProceso))return false;
          if(miProceso==="orden")return p.creado_por===usuario.nombre;
          return true;
        });
        const filtrados=[...misPedidos].filter(p=>{
          if(!busquedaOp.trim())return true;
          const b=busquedaOp.toLowerCase();
          return(p.cliente||"").toLowerCase().includes(b)||(p.id||"").toLowerCase().includes(b);
        }).sort((a,b)=>(a.fecha_entrega||"9999").localeCompare(b.fecha_entrega||"9999"));
        const nuevos=filtrados.filter(p=>{const et=((pedidos.find(x=>x.id===p.id)||p).procesos||{})[miProceso]||"pendiente";return et==="pendiente";});
        const enProceso=filtrados.filter(p=>{const et=((pedidos.find(x=>x.id===p.id)||p).procesos||{})[miProceso]||"pendiente";return et==="en_proceso";});
        const listos=filtrados.filter(p=>{const et=((pedidos.find(x=>x.id===p.id)||p).procesos||{})[miProceso]||"pendiente";return et==="listo";});
        const grupos=[{titulo:"PEDIDOS NUEVOS",icon:"📋",color:"#ef4444",items:nuevos},{titulo:"EN PROCESO",icon:"⚙️",color:"#f59e0b",items:enProceso},{titulo:"TERMINADOS",icon:"✅",color:"#10b981",items:listos}];
        return(
          <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"16px 20px",borderBottom:"1.5px solid #d8d0c0",background:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2}}>{usuario.nombre}</div>
                <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1}}>{PROCESOS.find(p=>p.key===miProceso)?.icon} {PROCESOS.find(p=>p.key===miProceso)?.label?.toUpperCase()}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn" onClick={cargarDatos} style={{padding:"8px 12px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf"}}>↻</button>
                {miProceso==="orden"&&<button className="btn" onClick={()=>setShowNuevoPedido(true)} style={{padding:"8px 14px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1}}>+ PEDIDO</button>}
                <button className="btn" onClick={handleLogout} style={{padding:"8px 14px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf",letterSpacing:1}}>SALIR</button>
              </div>
            </div>
            <div style={{padding:"8px 16px",borderBottom:"1.5px solid #d8d0c0",background:"#fff",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>🔍</span>
              <input type="text" placeholder="Buscar pedido..." value={busquedaOp} onChange={e=>setBusquedaOp(e.target.value)} style={{flex:1,border:"none",background:"transparent",fontSize:13,outline:"none",padding:0}}/>
              {busquedaOp&&<button onClick={()=>setBusquedaOp("")} style={{border:"none",background:"none",cursor:"pointer",fontSize:16,color:"#8a7a6a"}}>✕</button>}
            </div>
            <div style={{flex:1,padding:16,overflowY:"auto"}}>
              <AlertasVencimiento pedidos={pedidos} usuario={usuario}/>
              {!filtrados.length&&<div style={{padding:40,textAlign:"center",color:"#b0a898"}}><div style={{fontSize:40,marginBottom:12}}>🎉</div><div style={{fontSize:14}}>Sin pedidos</div></div>}
              {grupos.map(grupo=>(
                <GrupoColapsable key={grupo.titulo} titulo={grupo.titulo} icon={grupo.icon} color={grupo.color} count={grupo.items.length}>
                  {grupo.items.map(p=>(
                    <PedidoCard key={p.id} pedido={p} usuario={usuario} miProceso={miProceso} marcarEtapa={marcarEtapa} {...cardProps}/>
                  ))}
                  {grupo.items.length===0&&<div style={{padding:20,textAlign:"center",color:"#b0a898",fontSize:12}}>Sin pedidos</div>}
                </GrupoColapsable>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ADMIN */}
      {pantalla==="admin"&&(
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"14px 24px",borderBottom:"1.5px solid #d8d0c0",background:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:3}}>FLUJO TEXTIL <span style={{fontSize:14,letterSpacing:2,color:"#8a7a6a"}}>{usuario?.rol==="admin"?"ADMIN":usuario?.nombre?.toUpperCase()}</span></div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn" onClick={cargarDatos} style={{padding:"9px 12px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf"}}>↻</button>
              {(usuario?.rol==="admin"||usuario?.nombre==="Gabi")&&<button className="btn" onClick={()=>setShowNuevoPedido(true)} style={{padding:"9px 16px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1}}>+ PEDIDO</button>}
              {usuario?.nombre==="Vivi"&&<button className="btn" onClick={()=>setShowNuevoGasto(true)} style={{padding:"9px 16px",fontSize:11,background:"#1a1208",color:"#f5f0e8",letterSpacing:1}}>+ GASTO</button>}
              <button className="btn" onClick={handleLogout} style={{padding:"9px 14px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf",letterSpacing:1}}>SALIR</button>
            </div>
          </div>
          <div style={{display:"flex",borderBottom:"1.5px solid #d8d0c0",background:"#fff",paddingLeft:24}}>
            {[["pedidos","PEDIDOS"],["tablero","TABLERO"],["equipo","EQUIPO"],["finanzas","FINANZAS"]].filter(([k])=>{
              if(usuario?.rol==="admin")return true;
              if(k==="equipo")return false;
              if(k==="finanzas")return usuario?.nombre==="Gabi";
              return true;
            }).map(([k,l])=>(
              <div key={k} className={`tab${adminTab===k?" active":""}`} onClick={()=>setAdminTab(k)} style={{fontSize:11,letterSpacing:2}}>{l}</div>
            ))}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:20}}>

            {adminTab==="pedidos"&&(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,background:"#fff",border:"1.5px solid #d8d0c0",padding:"10px 14px"}}>
                  <span style={{fontSize:16}}>🔍</span>
                  <input type="text" placeholder="Buscar por cliente, número o responsable..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} style={{flex:1,border:"none",background:"transparent",fontSize:13,outline:"none",padding:0}}/>
                  {busqueda&&<button onClick={()=>setBusqueda("")} style={{border:"none",background:"none",cursor:"pointer",fontSize:16,color:"#8a7a6a"}}>✕</button>}
                </div>
                <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                  {[{l:"Total",v:pedidos.length,c:"#1a1208"},{l:"En proceso",v:pedidos.filter(p=>pedidoProgreso(p)>0&&pedidoProgreso(p)<100).length,c:"#f59e0b"},{l:"Completados",v:pedidos.filter(p=>pedidoProgreso(p)===100).length,c:"#10b981"},{l:"Vencidos",v:pedidos.filter(p=>p.fecha_entrega<hoy()&&pedidoProgreso(p)<100).length,c:"#ef4444"}].map(s=>(
                    <div key={s.l} className="card" style={{padding:"14px 18px",flex:"1 1 100px",minWidth:100}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,color:s.c,lineHeight:1}}>{s.v}</div>
                      <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,marginTop:2}}>{s.l.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <AlertasVencimiento pedidos={pedidos} usuario={usuario}/>
                {(()=>{
                  const nuevos=pedidosFiltrados.filter(p=>pedidoProgreso(p)===0);
                  const enProc=pedidosFiltrados.filter(p=>pedidoProgreso(p)>0&&pedidoProgreso(p)<100);
                  const term=pedidosFiltrados.filter(p=>pedidoProgreso(p)===100);
                  const grupos=[{titulo:"PEDIDOS NUEVOS",icon:"📋",color:"#ef4444",items:nuevos},{titulo:"EN PROCESO",icon:"⚙️",color:"#f59e0b",items:enProc},{titulo:"TERMINADOS",icon:"✅",color:"#10b981",items:term}];
                  return grupos.map(grupo=>(
                    <GrupoColapsable key={grupo.titulo} titulo={grupo.titulo} icon={grupo.icon} color={grupo.color} count={grupo.items.length}>
                      {grupo.items.map(p=><PedidoCard key={p.id} pedido={p} usuario={usuario} {...cardProps}/>)}
                      {grupo.items.length===0&&<div style={{padding:20,textAlign:"center",color:"#b0a898",fontSize:12}}>Sin pedidos</div>}
                    </GrupoColapsable>
                  ));
                })()}
                {/* Filtro por mes */}
                <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
                  <input type="text" placeholder="Filtrar por mes (ej: junio, 06)" value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}
                    style={{flex:1,fontSize:12,padding:"8px 12px"}}/>
                  <select value={tipoFiltroMes} onChange={e=>setTipoFiltroMes(e.target.value)} style={{fontSize:11,padding:"8px"}}>
                    <option value="entrega">F. entrega</option>
                    <option value="pedido">F. pedido</option>
                  </select>
                  {filtroMes&&<button onClick={()=>setFiltroMes("")} style={{border:"none",background:"none",cursor:"pointer",fontSize:16,color:"#8a7a6a"}}>✕</button>}
                </div>
                {!pedidosFiltrados.length&&<div style={{padding:40,textAlign:"center",color:"#b0a898",fontSize:13}}>{busqueda||filtroMes?"Sin resultados":"No hay pedidos."}</div>}
                {puedeVerFinanciero(usuario)&&pedidos.length>0&&(()=>{
                  const tg=pedidos.reduce((s,p)=>s+calcTotalGral(p.prendas||[]),0);
                  const saldo=pedidos.reduce((s,p)=>{const t=calcTotalGral(p.prendas||[]);const ant=parseFloat(p.anticipo)||0;const pagado=(p.pagos||[]).reduce((sp,pg)=>sp+(parseFloat(pg.monto)||0),0);return s+(t-ant-pagado);},0);
                  const porMes={};
                  pedidos.forEach(p=>{const f=p.creado||p.fecha_entrega;if(!f)return;const mes=f.slice(0,7);if(!porMes[mes])porMes[mes]={total:0,saldo:0,cantidad:0,pedidosCount:0};const t=calcTotalGral(p.prendas||[]);const ant=parseFloat(p.anticipo)||0;const pagado=(p.pagos||[]).reduce((sp,pg)=>sp+(parseFloat(pg.monto)||0),0);const cantPrendas=(p.prendas||[]).reduce((s,pr)=>s+(parseInt(pr.cantidad)||0),0);porMes[mes].total+=t;porMes[mes].saldo+=(t-ant-pagado);porMes[mes].cantidad+=cantPrendas;porMes[mes].pedidosCount+=1;});
                  return(
                    <div style={{marginTop:20,padding:"16px",background:"#1a1208",color:"#f5f0e8"}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,marginBottom:12}}>RESUMEN FINANCIERO</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                        <div style={{padding:"12px",background:"#2a2a2a"}}><div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:4}}>TOTAL GENERAL</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28}}>${tg.toLocaleString("es-AR")}</div></div>
                        <div style={{padding:"12px",background:"#2a2a2a"}}><div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:4}}>SALDO A COBRAR</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#e85d26"}}>${saldo.toLocaleString("es-AR")}</div></div>
                      </div>
                      <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:8}}>POR MES (fecha de pedido)</div>
                      {Object.keys(porMes).sort().map(mes=>{const[y,m]=mes.split("-");return(
                        <div key={mes} style={{padding:"10px",background:"#2a2a2a",marginBottom:4}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                            <span style={{fontSize:12,letterSpacing:1,fontWeight:600}}>{["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][parseInt(m)]} {y}</span>
                            <span style={{fontSize:10,color:"#8a7a6a"}}>{porMes[mes].pedidosCount} pedidos</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                            <div style={{padding:"6px 8px",background:"#1a1208"}}><div style={{fontSize:9,color:"#8a7a6a",marginBottom:2}}>TOTAL</div><div style={{fontSize:13,fontWeight:600}}>${porMes[mes].total.toLocaleString("es-AR")}</div></div>
                            <div style={{padding:"6px 8px",background:"#1a1208"}}><div style={{fontSize:9,color:"#8a7a6a",marginBottom:2}}>SALDO</div><div style={{fontSize:13,fontWeight:600,color:"#e85d26"}}>${porMes[mes].saldo.toLocaleString("es-AR")}</div></div>
                            <div style={{padding:"6px 8px",background:"#1a1208"}}><div style={{fontSize:9,color:"#8a7a6a",marginBottom:2}}>PRENDAS</div><div style={{fontSize:13,fontWeight:600,color:"#06b6d4"}}>{porMes[mes].cantidad} uds</div></div>
                            <div style={{padding:"6px 8px",background:"#1a1208"}}><div style={{fontSize:9,color:"#8a7a6a",marginBottom:2}}>PRECIO PROM.</div><div style={{fontSize:13,fontWeight:600,color:"#a855f7"}}>${porMes[mes].cantidad>0?Math.round(porMes[mes].total/porMes[mes].cantidad).toLocaleString("es-AR"):0}</div></div>
                          </div>
                        </div>
                      );})}
                    </div>
                  );
                })()}
              </div>
            )}

            {adminTab==="tablero"&&(
              <div style={{overflowX:"auto"}}>
                <div style={{display:"flex",gap:10,minWidth:900}}>
                  {PROCESOS.map(proc=>{
                    const cols=pedidos.filter(p=>(p.procesos_activos||[]).includes(proc.key));
                    const ep=cols.filter(p=>(p.procesos||{})[proc.key]!=="listo");
                    const lt=cols.filter(p=>(p.procesos||{})[proc.key]==="listo");
                    return(
                      <div key={proc.key} style={{flex:1,minWidth:140}}>
                        <div style={{padding:"10px 12px",background:"#fff",border:"1.5px solid #d8d0c0",borderBottom:"3px solid "+proc.color,marginBottom:8}}>
                          <div style={{fontSize:16}}>{proc.icon}</div>
                          <div style={{fontSize:10,letterSpacing:1,fontWeight:500,marginTop:2}}>{proc.label.toUpperCase()}</div>
                          <div style={{fontSize:10,color:"#8a7a6a",marginTop:2}}>{lt.length}/{cols.length} listos</div>
                        </div>
                        {ep.length>0&&<div style={{marginBottom:4,padding:"3px 8px",background:"#f59e0b15",borderBottom:"2px solid #f59e0b33"}}><span style={{fontSize:9,letterSpacing:1,color:"#f59e0b",fontWeight:600}}>EN PROCESO</span></div>}
                        {ep.map(p=>{const et=(p.procesos||{})[proc.key]||"pendiente";return(<div key={p.id} className="card" style={{padding:"10px 12px",marginBottom:6,borderLeft:`3px solid ${ETAPA_COLOR[et]}`}}><div style={{fontSize:11,fontWeight:500,marginBottom:2}}>{p.cliente}</div><div style={{fontSize:10,color:"#8a7a6a",marginBottom:4}}>{p.cantidad} uds</div><span className="badge" style={{background:ETAPA_COLOR[et]+"22",color:ETAPA_COLOR[et],fontSize:9}}>{ETAPA_LABEL[et].toUpperCase()}</span></div>);})}
                        {lt.length>0&&<div style={{marginBottom:4,padding:"3px 8px",background:"#10b98115",borderBottom:"2px solid #10b98133"}}><span style={{fontSize:9,letterSpacing:1,color:"#10b981",fontWeight:600}}>LISTOS</span></div>}
                        {lt.map(p=>(<div key={p.id} className="card" style={{padding:"10px 12px",marginBottom:6,borderLeft:"3px solid #10b981",opacity:0.7}}><div style={{fontSize:11,fontWeight:500,marginBottom:2}}>{p.cliente}</div><div style={{fontSize:10,color:"#8a7a6a",marginBottom:4}}>{p.cantidad} uds</div><span className="badge" style={{background:"#10b98122",color:"#10b981",fontSize:9}}>✓ LISTO</span></div>))}
                        {!cols.length&&<div style={{padding:12,textAlign:"center",color:"#c8bfaf",fontSize:11,border:"1.5px dashed #d8d0c0"}}>Sin pedidos</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {adminTab==="finanzas"&&(()=>{
              const CATEGORIAS_ALL=[
                {key:"mat_tejido",label:"Tejido",icon:"🧵",grupo:"Materiales"},
                {key:"mat_serigrafia",label:"Serigrafía / DTF / Sublimación",icon:"🖨️",grupo:"Materiales"},
                {key:"mat_confeccion",label:"Confección / Bordado",icon:"🪡",grupo:"Materiales"},
                {key:"mat_empaque",label:"Empaque / Limpieza",icon:"📦",grupo:"Materiales"},
                {key:"pago_terceros",label:"Pago Tercerizados",icon:"🤝",grupo:"Operativo"},
                {key:"mano_obra",label:"Mano de obra",icon:"👷",grupo:"Operativo"},
                {key:"envio",label:"Envío de pedidos",icon:"🚚",grupo:"Operativo"},
                {key:"alquiler",label:"Alquiler",icon:"🏠",grupo:"Operativo"},
                {key:"servicios",label:"Servicios",icon:"💡",grupo:"Operativo"},
                {key:"mantenimiento",label:"Mantenimiento",icon:"🔧",grupo:"Operativo"},
                {key:"marketing",label:"Marketing",icon:"📢",grupo:"Comercial"},
                {key:"impuestos",label:"Impuestos",icon:"🏛️",grupo:"Comercial"},
                {key:"flia_obelar",label:"Flia. Obelar Codas",icon:"👨‍👩‍👧",grupo:"Personal"},
                {key:"otros",label:"Otros",icon:"📦",grupo:"Otros"},
              ];
              const CATEGORIAS=CATEGORIAS_ALL.filter(cat=>usuario?.nombre!=="Vivi"||cat.key!=="flia_obelar");
              const mesActual=mesSeleccionado||new Date().toISOString().slice(0,7);
              const mesDate=new Date(mesActual+"-01T12:00:00");
              const trimestre=Math.floor(mesDate.getMonth()/3);
              const anoActual=mesDate.getFullYear();
              const mesesNombres=["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
              const nombreMes=mesesNombres[mesDate.getMonth()+1]+" "+anoActual;

              // Filter by period
              const gastosFiltrados=gastos.filter(g=>{
                if(!g.fecha)return false;
                const fg=g.fecha.slice(0,7);
                if(periodoFiltro==="mensual")return fg===mesActual;
                if(periodoFiltro==="trimestral"){const m=new Date(g.fecha+"-01").getMonth();return new Date(g.fecha+"-01").getFullYear()===anoActual&&Math.floor(m/3)===trimestre;}
                if(periodoFiltro==="anual")return g.fecha.startsWith(String(anoActual));
                return true;
              });

              // Ingresos por fecha de cobro (base percibido)
              // Suma anticipos y pagos según su fecha
              const ingresosPorFecha=[];
              pedidos.forEach(p=>{
                // Anticipo - usar fecha de creación del pedido
                const ant=parseFloat(p.anticipo)||0;
                if(ant>0){
                  const f=p.creado||p.fecha_entrega;
                  if(f)ingresosPorFecha.push({fecha:f,monto:ant,pedido:p.id});
                }
                // Pagos registrados - usar fecha de cada pago
                (p.pagos||[]).forEach(pg=>{
                  if(pg.fecha&&parseFloat(pg.monto)>0){
                    ingresosPorFecha.push({fecha:pg.fecha,monto:parseFloat(pg.monto),pedido:p.id});
                  }
                });
              });

              const ingresosFiltrados=ingresosPorFecha.filter(i=>{
                if(!i.fecha)return false;
                const fi=i.fecha.slice(0,7);
                if(periodoFiltro==="mensual")return fi===mesActual;
                if(periodoFiltro==="trimestral"){const m=new Date(i.fecha+"-01").getMonth();return new Date(i.fecha+"-01").getFullYear()===anoActual&&Math.floor(m/3)===trimestre;}
                if(periodoFiltro==="anual")return i.fecha.startsWith(String(anoActual));
                return true;
              });

              const ingrExtraFiltrados=ingresosExtra.filter(i=>{
                if(!i.fecha)return false;
                const fi=i.fecha.slice(0,7);
                if(periodoFiltro==="mensual")return fi===mesActual;
                if(periodoFiltro==="trimestral"){const m=new Date(i.fecha+"-01T12:00:00").getMonth();return new Date(i.fecha+"-01T12:00:00").getFullYear()===anoActual&&Math.floor(m/3)===trimestre;}
                if(periodoFiltro==="anual")return i.fecha.startsWith(String(anoActual));
                return true;
              });
              const totalIngresosApp=ingresosFiltrados.reduce((s,i)=>s+i.monto,0);
              const totalIngresosExtra=ingrExtraFiltrados.reduce((s,i)=>s+(parseFloat(i.monto)||0),0);
              const totalIngresos=totalIngresosApp+totalIngresosExtra;
              const totalGastosReal=gastosFiltrados.filter(g=>g.tipo!=="previsto").reduce((s,g)=>s+(parseFloat(g.monto)||0),0);
              const totalGastosPrevisto=gastosFiltrados.filter(g=>g.tipo==="previsto").reduce((s,g)=>s+(parseFloat(g.monto)||0),0);
              const totalGastos=totalGastosReal+totalGastosPrevisto;
              const margen=totalIngresos-totalGastos;
              const margenPct=totalIngresos>0?Math.round((margen/totalIngresos)*100):0;

              // Group gastos by categoria
              const porCategoria={};
              gastosFiltrados.forEach(g=>{if(!porCategoria[g.categoria])porCategoria[g.categoria]=0;porCategoria[g.categoria]+=parseFloat(g.monto)||0;});

              return(
                <div>
                  {/* Título y selector de mes */}
                  <div style={{marginBottom:16}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:2,color:"#1a1208",marginBottom:8}}>
                      {periodoFiltro==="mensual"?nombreMes:periodoFiltro==="trimestral"?("T"+(trimestre+1)+" "+anoActual):("Año "+anoActual)}
                    </div>
                    {periodoFiltro==="mensual"&&(
                      <input type="month" style={{width:"100%",marginBottom:8}} value={mesSeleccionado} onChange={e=>setMesSeleccionado(e.target.value)}/>
                    )}
                    {periodoFiltro==="anual"&&(
                      <input type="number" min="2020" max="2030" style={{width:"100%",marginBottom:8}} value={anoActual} onChange={e=>setMesSeleccionado(e.target.value+"-01")}/>
                    )}
                  </div>
                  {/* Filtro período */}
                  <div style={{display:"flex",gap:8,marginBottom:16}}>
                    {[["mensual","Mensual"],["trimestral","Trimestral"],["anual","Anual"]].map(([k,l])=>(
                      <button key={k} className="btn" onClick={()=>setPeriodoFiltro(k)} style={{flex:1,padding:"8px",fontSize:11,background:periodoFiltro===k?"#1a1208":"#f5f0e8",color:periodoFiltro===k?"#f5f0e8":"#1a1208",border:"1.5px solid #d8d0c0",letterSpacing:1}}>{l.toUpperCase()}</button>
                    ))}
                  </div>

                  {/* ── FLUJO DE CAJA ── */}
                  <div style={{marginBottom:16,padding:"14px",background:"#1a1208",color:"#f5f0e8"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,marginBottom:12,color:"#06b6d4"}}>💰 FLUJO DE CAJA REAL</div>
                    <div style={{fontSize:10,color:"#8a7a6a",marginBottom:10}}>Solo lo efectivamente cobrado y pagado</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      <div style={{padding:"10px",background:"#2a2a2a"}}>
                        <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:2}}>COBRADO</div>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#10b981"}}>${totalIngresos.toLocaleString("es-AR")}</div>
                        {totalIngresosExtra>0&&<div style={{fontSize:9,color:"#10b981",marginTop:2}}>💵 Extra: ${totalIngresosExtra.toLocaleString("es-AR")}</div>}
                      </div>
                      <div style={{padding:"10px",background:"#2a2a2a"}}>
                        <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:2}}>PAGADO</div>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#ef4444"}}>${totalGastosReal.toLocaleString("es-AR")}</div>
                      </div>
                    </div>
                    {(()=>{
                      const cajaNeta=totalIngresos-totalGastosReal;
                      return(
                        <div style={{padding:"10px",background:cajaNeta>=0?"#10b98133":"#ef444433",border:`1px solid ${cajaNeta>=0?"#10b981":"#ef4444"}`}}>
                          <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:2}}>SALDO DE CAJA</div>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:cajaNeta>=0?"#10b981":"#ef4444"}}>${cajaNeta.toLocaleString("es-AR")}</div>
                          <div style={{fontSize:10,color:"#8a7a6a",marginTop:2}}>Dinero real disponible en el período</div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── RESULTADO ECONÓMICO ── */}
                  <div style={{marginBottom:16,padding:"14px",background:"#2a1a08",color:"#f5f0e8"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,marginBottom:12,color:"#f59e0b"}}>📊 RESULTADO ECONÓMICO</div>
                    <div style={{fontSize:10,color:"#8a7a6a",marginBottom:10}}>Rentabilidad real incluyendo costos previstos</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      <div style={{padding:"10px",background:"#1a1208"}}>
                        <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:2}}>INGRESOS PERÍODO</div>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#10b981"}}>${totalIngresos.toLocaleString("es-AR")}</div>
                      </div>
                      <div style={{padding:"10px",background:"#1a1208"}}>
                        <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:2}}>GASTOS TOTALES</div>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#ef4444"}}>${totalGastos.toLocaleString("es-AR")}</div>
                        {totalGastosPrevisto>0&&<div style={{fontSize:9,color:"#f59e0b",marginTop:2}}>🔮 ${totalGastosPrevisto.toLocaleString("es-AR")} previsto</div>}
                      </div>
                    </div>
                    {(()=>{
                      const resultado=totalIngresos-totalGastos;
                      const pct=totalIngresos>0?Math.round((resultado/totalIngresos)*100):0;
                      return(
                        <div style={{padding:"10px",background:resultado>=0?"#10b98133":"#ef444433",border:`1px solid ${resultado>=0?"#10b981":"#ef4444"}`}}>
                          <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:2}}>RESULTADO / MARGEN</div>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:resultado>=0?"#10b981":"#ef4444"}}>${resultado.toLocaleString("es-AR")}</div>
                          <div style={{fontSize:10,color:"#8a7a6a",marginTop:2}}>{pct}% sobre ingresos · Rentabilidad del período</div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Gastos por categoría */}
                  {Object.keys(porCategoria).length>0&&(
                    <div style={{marginBottom:16,padding:"14px",background:"#fff",border:"1.5px solid #d8d0c0"}}>
                      <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:10}}>GASTOS POR CATEGORÍA</div>
                      {Object.entries(porCategoria).sort(([,a],[,b])=>b-a).map(([cat,monto])=>{
                        const catInfo=CATEGORIAS.find(c=>c.key===cat);
                        const pct=totalGastos>0?Math.round((monto/totalGastos)*100):0;
                        return(
                          <div key={cat} style={{marginBottom:8}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                              <span style={{fontSize:12}}>{catInfo?.icon} {catInfo?.label||cat}</span>
                              <span style={{fontSize:12,fontWeight:600}}>${monto.toLocaleString("es-AR")} <span style={{color:"#8a7a6a",fontWeight:400}}>({pct}%)</span></span>
                            </div>
                            <div style={{height:4,background:"#f5f0e8",overflow:"hidden"}}><div style={{height:"100%",background:"#e85d26",width:pct+"%"}}/></div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Botón agregar gasto */}
                  <button className="btn" onClick={()=>setShowNuevoGasto(true)} style={{width:"100%",padding:"12px",fontSize:12,background:"#e85d26",color:"#fff",letterSpacing:1,marginBottom:16}}>+ REGISTRAR GASTO</button>

                  {/* Ingresos extraordinarios */}
                  <button className="btn" onClick={()=>setShowNuevoIngreso(true)} style={{width:"100%",padding:"12px",fontSize:12,background:"#10b981",color:"#fff",letterSpacing:1,marginBottom:8}}>+ INGRESO EXTRAORDINARIO</button>
                  {ingrExtraFiltrados.length>0&&(
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:8}}>INGRESOS EXTRAORDINARIOS</div>
                      {ingrExtraFiltrados.map(i=>(
                        <div key={i.id} className="card" style={{padding:"12px 16px",marginBottom:6,display:"flex",alignItems:"center",gap:10,borderLeft:"3px solid #10b981"}}>
                          <span style={{fontSize:20}}>💵</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:500}}>{i.descripcion}</div>
                            <div style={{fontSize:10,color:"#8a7a6a"}}>{i.origen==="pedido_viejo"?"Pedido anterior":i.origen==="otro"?"Otro ingreso":"Ingreso"} · {formatFecha(i.fecha)}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:14,fontWeight:600,color:"#10b981"}}>${parseFloat(i.monto).toLocaleString("es-AR")}</div>
                          </div>
                          {usuario?.rol==="admin"&&<button className="btn" onClick={()=>eliminarIngresoExtra(i.id)} style={{padding:"4px 8px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",color:"#8a7a6a"}}>✕</button>}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Lista de gastos */}
                  <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:8}}>GASTOS REGISTRADOS</div>
                  {gastosFiltrados.length===0&&<div style={{padding:20,textAlign:"center",color:"#b0a898",fontSize:12}}>No hay gastos registrados en este período</div>}
                  {[...gastosFiltrados].sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(g=>{
                    const catInfo=CATEGORIAS.find(c=>c.key===g.categoria);
                    return(
                      <div key={g.id} className="card" style={{padding:"12px 16px",marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:20}}>{catInfo?.icon||"📦"}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:500}}>{g.descripcion}</div>
                          <div style={{fontSize:10,color:"#8a7a6a",display:"flex",alignItems:"center",gap:6}}>
                            {catInfo?.label} · {formatFecha(g.fecha)}
                            {g.tipo==="previsto"&&<span style={{background:"#f59e0b22",color:"#f59e0b",fontSize:9,padding:"1px 6px",fontWeight:600}}>PREVISTO</span>}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:14,fontWeight:600,color:"#ef4444"}}>${parseFloat(g.monto).toLocaleString("es-AR")}</div>
                        </div>
                        {usuario?.rol==="admin"&&<button className="btn" onClick={()=>eliminarGasto(g.id)} style={{padding:"4px 8px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",color:"#8a7a6a"}}>✕</button>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {adminTab==="equipo"&&(
              <div>
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
                  <button className="btn" onClick={()=>setShowNuevoUser(true)} style={{padding:"9px 16px",fontSize:11,background:"#1a1208",color:"#f5f0e8",letterSpacing:1}}>+ USUARIO</button>
                </div>
                {usuarios.map(u=>{
                  const proc=PROCESOS.find(p=>p.key===u.proceso);
                  const asig=u.proceso?pedidos.filter(p=>(p.procesos_activos||[]).includes(u.proceso)).length:0;
                  const lt=u.proceso?pedidos.filter(p=>(p.procesos_activos||[]).includes(u.proceso)&&(p.procesos||{})[u.proceso]==="listo").length:0;
                  return(
                    <div key={u.id} className="card" style={{padding:"14px 18px",marginBottom:8,display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:40,height:40,background:u.rol==="admin"?"#1a1208":"#e85d26",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'Bebas Neue',sans-serif",fontSize:18,flexShrink:0}}>{u.nombre[0].toUpperCase()}</div>
                      <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{u.nombre}</div><div style={{fontSize:11,color:"#8a7a6a"}}>{u.rol==="admin"?"Administrador":`${proc?.icon||""} ${proc?.label||"Sin proceso"}`}</div></div>
                      <div style={{textAlign:"right"}}>
                        {u.rol!=="admin"&&<div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#e85d26",lineHeight:1}}>{lt}/{asig}</div>}
                        {u.rol!=="admin"&&<div style={{fontSize:10,color:"#8a7a6a"}}>listos</div>}
                        <div style={{fontSize:10,color:"#c8bfaf",marginTop:2}}>PIN: {u.pin}</div>
                      </div>
                      {u.id!=="u0"&&<button className="btn" onClick={()=>eliminarUsuario(u.id)} style={{padding:"6px 10px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",color:"#8a7a6a"}}>✕</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL NUEVO PEDIDO */}
      {showNuevoPedido&&(
        <div className="modal-bg" onClick={()=>setShowNuevoPedido(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#1a1208"}}>NUEVO PEDIDO</div>
            <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
              <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>CLIENTE *</label><input type="text" style={{width:"100%"}} placeholder="Nombre del cliente" value={formPedido.cliente} onChange={e=>setFormPedido({...formPedido,cliente:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>PRIORIDAD</label><select style={{width:"100%"}} value={formPedido.prioridad} onChange={e=>setFormPedido({...formPedido,prioridad:e.target.value})}>{PRIORIDADES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>FECHA DE ENTREGA *</label><input type="date" style={{width:"100%"}} value={formPedido.fechaEntrega} onChange={e=>setFormPedido({...formPedido,fechaEntrega:e.target.value})}/></div>
              </div>
              <div>
                <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8}}>PRENDAS</label>
                {[0,1,2].map(i=><PrendaForm key={i} prenda={formPedido.prendas[i]||{...PRENDA_INIT}} idx={i} onChange={prenda=>{const ps=[...formPedido.prendas];ps[i]=prenda;setFormPedido(prev=>({...prev,prendas:ps}));}}/>)}
              </div>
              {calcTotalGral(formPedido.prendas)>0&&(
                <div>
                  <ResumenPrecios prendas={formPedido.prendas} anticipo={formPedido.anticipo} pagos={[]}/>
                  <div style={{marginTop:8}}><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>ANTICIPO</label><input type="number" min="0" style={{width:"100%"}} placeholder="0.00" value={formPedido.anticipo||""} onChange={e=>setFormPedido({...formPedido,anticipo:e.target.value})}/></div>
                </div>
              )}
              <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>DESCRIPCIÓN / OBSERVACIONES</label><textarea rows={2} style={{width:"100%",resize:"vertical"}} placeholder="Observaciones..." value={formPedido.descripcion} onChange={e=>setFormPedido({...formPedido,descripcion:e.target.value})}/></div>
              <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>DATOS PARA FACTURA</label><textarea rows={2} style={{width:"100%",resize:"vertical"}} placeholder="Razón social, CUIT..." value={formPedido.datosFactura||""} onChange={e=>setFormPedido({...formPedido,datosFactura:e.target.value})}/></div>
              <div>
                <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8}}>PROCESOS REQUERIDOS</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {PROCESOS.map(proc=>{const active=formPedido.procesosActivos.includes(proc.key);return(<div key={proc.key} className={`checkbox-proceso${active?" active":""}`} onClick={()=>{const next=active?formPedido.procesosActivos.filter(k=>k!==proc.key):[...formPedido.procesosActivos,proc.key];setFormPedido({...formPedido,procesosActivos:next});}}><div style={{width:14,height:14,border:`1.5px solid ${active?"#e85d26":"#c8bfaf"}`,background:active?"#e85d26":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{active&&<span style={{color:"#fff",fontSize:9}}>✓</span>}</div>{proc.icon} {proc.label}</div>);})}
                </div>
              </div>
              <div>
                <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8}}>IMÁGENES DEL DISEÑO (máx. 3)</label>
                <input type="file" accept="image/*" multiple style={{width:"100%",background:"#f5f0e8",border:"1.5px solid #c8bfaf",padding:"8px",fontSize:12}} onChange={e=>setFormPedido(prev=>({...prev,imagenes:Array.from(e.target.files).slice(0,3)}))}/>
              </div>
              <div>
                <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8}}>ARCHIVOS ADJUNTOS (PDF, Excel, Word, etc.)</label>
                <input type="file" accept="*/*" multiple style={{width:"100%",background:"#f5f0e8",border:"1.5px solid #c8bfaf",padding:"8px",fontSize:12}} onChange={e=>setFormPedido(prev=>({...prev,archivos:Array.from(e.target.files).slice(0,5)}))}/>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn" onClick={()=>setShowNuevoPedido(false)} style={{padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1}}>CANCELAR</button>
                <button className="btn" onClick={crearPedido} style={{padding:"10px 20px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1}}>CREAR PEDIDO</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR */}
      {showAgregado&&(
        <div className="modal-bg" onClick={()=>setShowAgregado(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#10b981"}}>AGREGAR AL PEDIDO {showAgregado.id}</div>
            <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{padding:"12px",background:"#f5f0e8",border:"1.5px solid #d8d0c0"}}>
                <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1,marginBottom:6}}>DATOS ORIGINALES (sin cambios)</div>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{showAgregado.cliente}</div>
                <div style={{fontSize:11,color:"#8a7a6a",marginBottom:2}}>📅 {formatFecha(showAgregado.fecha_entrega)}</div>
                <div style={{fontSize:11,color:"#8a7a6a"}}>Procesos: {(showAgregado.procesos_activos||[]).map(k=>PROCESOS.find(p=>p.key===k)?.label).filter(Boolean).join(", ")}</div>
              </div>
              <div>
                <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8}}>PRENDAS A AGREGAR</label>
                {[0,1,2].map(i=><PrendaForm key={i} prenda={formAgregado.prendas[i]||{...PRENDA_INIT}} idx={i} onChange={prenda=>{const ps=[...formAgregado.prendas];ps[i]=prenda;setFormAgregado(prev=>({...prev,prendas:ps}));}}/>)}
              </div>
              {calcTotalGral(formAgregado.prendas)>0&&(
                <div>
                  <ResumenPrecios prendas={formAgregado.prendas} anticipo={formAgregado.anticipo} pagos={[]}/>
                  <div style={{marginTop:8}}><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>ANTICIPO</label><input type="number" min="0" style={{width:"100%"}} placeholder="0.00" value={formAgregado.anticipo||""} onChange={e=>setFormAgregado({...formAgregado,anticipo:e.target.value})}/></div>
                </div>
              )}
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn" onClick={()=>setShowAgregado(null)} style={{padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1}}>CANCELAR</button>
                <button className="btn" onClick={()=>crearAgregado(showAgregado)} style={{padding:"10px 20px",fontSize:11,background:"#10b981",color:"#fff",letterSpacing:1}}>CREAR AGREGADO</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editandoPedido&&formEditar&&(
        <div className="modal-bg" onClick={()=>{setEditandoPedido(null);setFormEditar(null);}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#e85d26"}}>EDITAR PEDIDO</div>
            <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
              <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>CLIENTE</label><input type="text" style={{width:"100%"}} value={formEditar.cliente} onChange={e=>setFormEditar({...formEditar,cliente:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>PRIORIDAD</label><select style={{width:"100%"}} value={formEditar.prioridad} onChange={e=>setFormEditar({...formEditar,prioridad:e.target.value})}>{PRIORIDADES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>FECHA DE ENTREGA</label><input type="date" style={{width:"100%"}} value={formEditar.fechaEntrega} onChange={e=>setFormEditar({...formEditar,fechaEntrega:e.target.value})}/></div>
              </div>
              <div>
                <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8}}>PRENDAS</label>
                {[0,1,2].map(i=><PrendaForm key={i} prenda={formEditar.prendas[i]||{...PRENDA_INIT}} idx={i} onChange={prenda=>{const ps=[...formEditar.prendas];ps[i]=prenda;setFormEditar(prev=>({...prev,prendas:ps}));}}/>)}
              </div>
              {calcTotalGral(formEditar.prendas)>0&&(
                <div>
                  <ResumenPrecios prendas={formEditar.prendas} anticipo={formEditar.anticipo} pagos={[]}/>
                  <div style={{marginTop:8}}><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>ANTICIPO</label><input type="number" min="0" style={{width:"100%"}} value={formEditar.anticipo||""} onChange={e=>setFormEditar({...formEditar,anticipo:e.target.value})}/></div>
                </div>
              )}
              <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>DESCRIPCIÓN</label><textarea rows={2} style={{width:"100%",resize:"vertical"}} value={formEditar.descripcion} onChange={e=>setFormEditar({...formEditar,descripcion:e.target.value})}/></div>
              <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>DATOS PARA FACTURA</label><textarea rows={2} style={{width:"100%",resize:"vertical"}} value={formEditar.datosFactura||""} onChange={e=>setFormEditar({...formEditar,datosFactura:e.target.value})}/></div>
              <div>
                <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8}}>PROCESOS REQUERIDOS</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {PROCESOS.map(proc=>{const active=(formEditar.procesosActivos||[]).includes(proc.key);return(<div key={proc.key} className={`checkbox-proceso${active?" active":""}`} onClick={()=>{const next=active?formEditar.procesosActivos.filter(k=>k!==proc.key):[...(formEditar.procesosActivos||[]),proc.key];setFormEditar({...formEditar,procesosActivos:next});}}><div style={{width:14,height:14,border:`1.5px solid ${active?"#e85d26":"#c8bfaf"}`,background:active?"#e85d26":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{active&&<span style={{color:"#fff",fontSize:9}}>✓</span>}</div>{proc.icon} {proc.label}</div>);})}
                </div>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn" onClick={()=>{setEditandoPedido(null);setFormEditar(null);}} style={{padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1}}>CANCELAR</button>
                <button className="btn" onClick={guardarEdicion} style={{padding:"10px 20px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1}}>GUARDAR CAMBIOS</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO INGRESO EXTRAORDINARIO */}
      {showNuevoIngreso&&(
        <div className="modal-bg" onClick={()=>setShowNuevoIngreso(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#10b981"}}>INGRESO EXTRAORDINARIO</div>
            <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>FECHA</label><input type="date" style={{width:"100%"}} value={formIngreso.fecha} onChange={e=>setFormIngreso({...formIngreso,fecha:e.target.value})}/></div>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>MONTO *</label><input type="number" min="0" style={{width:"100%"}} placeholder="0.00" value={formIngreso.monto} onChange={e=>setFormIngreso({...formIngreso,monto:e.target.value})}/></div>
              </div>
              <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>ORIGEN</label>
                <select style={{width:"100%"}} value={formIngreso.origen} onChange={e=>setFormIngreso({...formIngreso,origen:e.target.value})}>
                  <option value="pedido_viejo">Pedido anterior (no registrado en app)</option>
                  <option value="adelanto">Adelanto de cliente</option>
                  <option value="otro">Otro ingreso</option>
                </select>
              </div>
              <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>DESCRIPCIÓN *</label><input type="text" style={{width:"100%"}} placeholder="Ej: Cobro pedido escuela marzo 2025..." value={formIngreso.descripcion} onChange={e=>setFormIngreso({...formIngreso,descripcion:e.target.value})}/></div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn" onClick={()=>setShowNuevoIngreso(false)} style={{padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1}}>CANCELAR</button>
                <button className="btn" onClick={crearIngresoExtra} style={{padding:"10px 20px",fontSize:11,background:"#10b981",color:"#fff",letterSpacing:1}}>REGISTRAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO GASTO */}
      {showNuevoGasto&&(
        <div className="modal-bg" onClick={()=>setShowNuevoGasto(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#1a1208"}}>REGISTRAR GASTO</div>
            <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>FECHA</label><input type="date" style={{width:"100%"}} value={formGasto.fecha} onChange={e=>setFormGasto({...formGasto,fecha:e.target.value})}/></div>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>MONTO *</label><input type="number" min="0" style={{width:"100%"}} placeholder="0.00" value={formGasto.monto} onChange={e=>setFormGasto({...formGasto,monto:e.target.value})}/></div>
              </div>
              <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>CATEGORÍA</label>
                <select style={{width:"100%"}} value={formGasto.categoria} onChange={e=>setFormGasto({...formGasto,categoria:e.target.value})}>
                  {(()=>{
                    const cats=[
                      {key:"mat_tejido",label:"🧵 Tejido",grupo:"── Materiales ──"},
                      {key:"mat_serigrafia",label:"🖨️ Serigrafía / DTF / Sublimación",grupo:null},
                      {key:"mat_confeccion",label:"🪡 Confección / Bordado",grupo:null},
                      {key:"mat_empaque",label:"📦 Empaque / Limpieza",grupo:null},
                      {key:"pago_terceros",label:"🤝 Pago Tercerizados",grupo:"── Operativo ──"},
                      {key:"mano_obra",label:"👷 Mano de obra",grupo:null},
                      {key:"envio",label:"🚚 Envío de pedidos",grupo:null},
                      {key:"alquiler",label:"🏠 Alquiler",grupo:null},
                      {key:"servicios",label:"💡 Servicios",grupo:null},
                      {key:"mantenimiento",label:"🔧 Mantenimiento",grupo:null},
                      {key:"marketing",label:"📢 Marketing",grupo:"── Comercial ──"},
                      {key:"impuestos",label:"🏛️ Impuestos",grupo:null},
                      {key:"flia_obelar",label:"👨‍👩‍👧 Flia. Obelar Codas",grupo:"── Personal ──"},
                      {key:"otros",label:"📦 Otros",grupo:"── Otros ──"},
                    ].filter(c=>usuario?.nombre!=="Vivi"||c.key!=="flia_obelar");
                    return cats.map(cat=>(
                      cat.grupo
                        ? [<option key={"g-"+cat.key} disabled style={{color:"#8a7a6a",fontSize:10}}>{cat.grupo}</option>,
                           <option key={cat.key} value={cat.key}>{cat.label}</option>]
                        : <option key={cat.key} value={cat.key}>{cat.label}</option>
                    ));
                  })()}
                </select>
              </div>
              <div>
                <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>TIPO DE GASTO</label>
                <div style={{display:"flex",gap:8}}>
                  {[["real","✅ Real"],["previsto","🔮 Previsto"]].map(([k,l])=>(
                    <button key={k} className="btn" onClick={()=>setFormGasto({...formGasto,tipo:k})}
                      style={{flex:1,padding:"10px",fontSize:12,background:formGasto.tipo===k?"#1a1208":"#f5f0e8",color:formGasto.tipo===k?"#f5f0e8":"#1a1208",border:"1.5px solid #d8d0c0",letterSpacing:1}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>DESCRIPCIÓN *</label><input type="text" style={{width:"100%"}} placeholder="Ej: Compra de tela algodón..." value={formGasto.descripcion} onChange={e=>setFormGasto({...formGasto,descripcion:e.target.value})}/></div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn" onClick={()=>setShowNuevoGasto(false)} style={{padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1}}>CANCELAR</button>
                <button className="btn" onClick={crearGasto} style={{padding:"10px 20px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1}}>REGISTRAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO USUARIO */}
      {showNuevoUser&&(
        <div className="modal-bg" onClick={()=>setShowNuevoUser(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2}}>NUEVO USUARIO</div>
            <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
              <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>NOMBRE *</label><input type="text" style={{width:"100%"}} placeholder="Nombre del operario" value={formUser.nombre} onChange={e=>setFormUser({...formUser,nombre:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>PIN (4 dígitos) *</label><input type="text" maxLength={4} style={{width:"100%"}} placeholder="0000" value={formUser.pin} onChange={e=>setFormUser({...formUser,pin:e.target.value.replace(/\D/g,"")})}/></div>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>PROCESO</label><select style={{width:"100%"}} value={formUser.proceso} onChange={e=>setFormUser({...formUser,proceso:e.target.value})}>{PROCESOS.map(p=><option key={p.key} value={p.key}>{p.icon} {p.label}</option>)}</select></div>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn" onClick={()=>setShowNuevoUser(false)} style={{padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1}}>CANCELAR</button>
                <button className="btn" onClick={crearUsuario} style={{padding:"10px 20px",fontSize:11,background:"#1a1208",color:"#f5f0e8",letterSpacing:1}}>CREAR USUARIO</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
