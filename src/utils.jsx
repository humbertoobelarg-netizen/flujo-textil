import { useState, useEffect, Fragment } from "react";

const EMAILJS_SERVICE = import.meta.env.VITE_EMAILJS_SERVICE;
const EMAILJS_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE;
const EMAILJS_KEY = import.meta.env.VITE_EMAILJS_KEY;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const H = { "Content-Type":"application/json","apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Prefer":"return=representation","x-app-secret":"FT2026_8x9kQm3vZpL7nR2wTy5sJh4cBn6dAe1g" };

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
const COLORES_TEJIDO=["Amarillo Oro","Naranja","Rojo","Bordo","Lila","Fucsia","Rosa Pastel","Blanco","Negro","Gris Fábrica","Gris Melange","Celeste Pastel","Celeste Fábrica","Turquesa","Azul Francia","Azul Marino","Verde Militar","Verde Musgo","Verde Hoja","Verde Manzana","Verde Limón","Verde Pastel","Amarillo Pastel","Amarillo Limón"];
const TIPOS_TEJIDO_LIST=["Jersey","Piqué","Dry","Deportivo especial","Elizabeth","Moleton frizado","Molerin terry","Polar","Tejido buzo PA","Acetato","Impermeable"];
const COSTO_CONFECCION={
  "Remera cuello redondo":2150,
  "Remera cuello V":2150,
  "Remera polo":4300,
  "Camisilla":1720,
  "Canguro":5700,
};
function calcCostoConfeccion(prendas){
  return(prendas||[]).reduce((s,pr)=>{
    const costo=COSTO_CONFECCION[pr.tipoPrenda]||0;
    const cant=parseFloat(pr.cantidad)||0;
    return s+(costo*cant);
  },0);
}
const MOLDERIA_LIST=["Unisex","Dama"];
const MANGA_TIPOS=["Corta","Larga"];
const CUELLO_TIPOS=["Redondo","V Cruzado","V Encontrado","Polo Comprado","Polo Preparado"];
const PUNO_OPCIONES=["Ruedo","Pretina"];

const TIPOS_PRENDA=["Remera cuello redondo","Remera cuello V","Remera Polo","Camisilla","Pantalón Buzo","Campera Buzo","Canguro","Campera","Chaleco","Bermuda","Short","Otro"];
const CONSUMO_REMERA={"2":{a90:0.28,a120:0.24},"4":{a90:0.29,a120:0.25},"6":{a90:0.30,a120:0.25},"8":{a90:0.31,a120:0.26},"10":{a90:0.42,a120:0.33},"12":{a90:0.43,a120:0.35},"14":{a90:0.45,a120:0.36},"16":{a90:0.47,a120:0.38},"P":{a90:0.64,a120:0.39},"M":{a90:0.66,a120:0.50},"G":{a90:0.68,a120:0.52},"XG":{a90:0.71,a120:0.54},"XXG":{a90:0.74,a120:0.58},"XXXG":{a90:0.78,a120:0.60},"XXXXG":{a90:1.15,a120:1.00},"Especial":{a90:1.20,a120:1.10}};
const PRENDA_INIT={tipoPrenda:"",tipoPrendaOtro:"",tipoTejido:"",molderia:"",cuerpo:"",manga:"",color:"",puno:"",colorPuno:"",cuello:"",colorCuello:"",talles:{},precioUnit:"",cantidad:""};
const FORM_INIT={cliente:"",prioridad:"media",fechaEntrega:"",descripcion:"",datosFactura:"",procesosActivos:["orden","terminacion"],prendas:[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}],anticipo:"",imagenes:[]};

function hoy(){return new Date().toISOString().split("T")[0];}
function getMesInfo(offset=0){
  const d=new Date();
  d.setMonth(d.getMonth()+offset);
  d.setDate(1);
  const year=d.getFullYear();
  const mes=d.getMonth();
  const primerDia=new Date(year,mes,1);
  const ultimoDia=new Date(year,mes+1,0);
  const diasDelMes=[];
  for(let i=1;i<=ultimoDia.getDate();i++){
    const fecha=new Date(year,mes,i);
    const diaSemana=fecha.getDay();
    if(diaSemana!==0){ // Excluir domingos
      diasDelMes.push({
        fecha:fecha.toISOString().split("T")[0],
        dia:i,
        diaSemana,
        nombre:["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][diaSemana]
      });
    }
  }
  const meses=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return{diasDelMes,nombreMes:meses[mes],year};
}

function getLunesDeSemana(offset=0){
  const d=new Date();
  const dia=d.getDay();
  const diff=d.getDate()-(dia===0?6:dia-1)+(offset*7);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}
function addDias(fecha,dias){
  const d=new Date(fecha+"T12:00:00");
  d.setDate(d.getDate()+dias);
  return d.toISOString().split("T")[0];
}
function esTarde(hora,limite){
  if(!hora)return false;
  const [h,m]=hora.slice(11,16).split(":").map(Number);
  const [lh,lm]=limite.split(":").map(Number);
  return h>lh||(h===lh&&m>lm);
}
function tieneHorario(nombreEmp,diaSemana){
  // 0=Dom,1=Lun...6=Sab
  const SABADO_OBLIGATORIO=["Viviana","David","Romina"];
  if(diaSemana===0)return false; // Domingo no
  if(diaSemana===6)return SABADO_OBLIGATORIO.some(n=>nombreEmp.includes(n)); // Sabado solo algunos
  return true; // Lun-Vie todos
}
// Horarios: Entrada 7:00, Salida almuerzo 12:00, Vuelta almuerzo 12:45, Salida 17:00
// Sabado (obligatorios): Entrada 8:00, Salida 12:00
// Device fingerprint
async function getFingerprint(){
  const data=[
    navigator.userAgent,
    navigator.language,
    screen.width+"x"+screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency||"",
    navigator.platform||"",
  ].join("|");
  // Simple hash
  let hash=0;
  for(let i=0;i<data.length;i++){hash=((hash<<5)-hash)+data.charCodeAt(i);hash|=0;}
  return "fp_"+Math.abs(hash).toString(36);
}

const TALLER_LAT=-25.282475;
const TALLER_LNG=-57.618849;
const RADIO_METROS=150;
function calcDistancia(lat1,lng1,lat2,lng2){
  const R=6371000;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function normalizarVinculados(arr,montoTotal){
  if(!Array.isArray(arr)||arr.length===0)return[];
  // Separate strings (old format) and objects (new format)
  const objetos=arr.filter(v=>typeof v==="object"&&v!==null);
  const strings=arr.filter(v=>typeof v==="string");
  const idsConObjeto=objetos.map(o=>o.id);
  const stringsSinDuplicar=strings.filter(id=>!idsConObjeto.includes(id));
  const result=[...objetos];
  if(stringsSinDuplicar.length===1&&objetos.length===0){
    result.push({id:stringsSinDuplicar[0],monto:montoTotal});
  }else{
    stringsSinDuplicar.forEach(id=>result.push({id,monto:0}));
  }
  return result;
}
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
function pedidoProgreso(p){const a=(p.procesos_activos||[]).filter(k=>k!=="orden");if(!a.length)return 0;const l=a.filter(k=>(p.procesos||{})[k]==="listo").length;return Math.round((l/a.length)*100);}
function pedidoIniciado(p){const a=(p.procesos_activos||[]).filter(k=>k!=="orden");return a.some(k=>(p.procesos||{})[k]==="en_proceso"||(p.procesos||{})[k]==="listo");}
function calcTejidoRemera(talles){
  let a90=0,a120=0,rib=0;
  Object.entries(talles||{}).forEach(([t,cant])=>{
    const c=parseInt(cant)||0;
    const cons=CONSUMO_REMERA[t];
    if(cons&&c>0){a90+=cons.a90*c;a120+=cons.a120*c;rib+=0.025*c;}
  });
  return{a90:Math.ceil(a90*100)/100,a120:Math.ceil(a120*100)/100,rib:Math.ceil(rib*1000)/1000};
}
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
            {prenda.puno&&<div style={{padding:"5px 8px",background:"#f5f0e8"}}><div style={{fontSize:9,color:"#8a7a6a"}}>PUÑO</div><div style={{fontSize:11,fontWeight:500}}>{prenda.puno}{prenda.colorPuno?" - "+prenda.colorPuno:""}</div></div>}
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
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  <div style={{padding:"8px",background:"#fff",border:"1px solid #d8d0c0",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#8a7a6a",marginBottom:2}}>90cm</div>
                    <div style={{fontSize:15,fontWeight:600,color:"#06b6d4",fontFamily:"'Bebas Neue',sans-serif"}}>{tej.a90} mts</div>
                  </div>
                  <div style={{padding:"8px",background:"#fff",border:"1px solid #d8d0c0",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#8a7a6a",marginBottom:2}}>1.20m</div>
                    <div style={{fontSize:15,fontWeight:600,color:"#a855f7",fontFamily:"'Bebas Neue',sans-serif"}}>{tej.a120} mts</div>
                  </div>
                  <div style={{padding:"8px",background:"#fff",border:"1px solid #d8d0c0",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#8a7a6a",marginBottom:2}}>RIB (cuello)</div>
                    <div style={{fontSize:15,fontWeight:600,color:"#f59e0b",fontFamily:"'Bebas Neue',sans-serif"}}>{tej.rib} mts</div>
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
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>TIPO DE TEJIDO</label>
              <select style={{width:"100%"}} value={prenda.tipoTejido||""} onChange={e=>onChange({...prenda,tipoTejido:e.target.value})}>
                <option value="">Seleccionar...</option>
                {TIPOS_TEJIDO_LIST.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>MOLDERÍA</label>
              <select style={{width:"100%"}} value={prenda.molderia||""} onChange={e=>onChange({...prenda,molderia:e.target.value})}>
                <option value="">Seleccionar...</option>
                {MOLDERIA_LIST.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>COLOR CUERPO</label>
              <select style={{width:"100%"}} value={prenda.cuerpo||""} onChange={e=>onChange({...prenda,cuerpo:e.target.value})}>
                <option value="">Seleccionar...</option>
                {COLORES_TEJIDO.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>MANGA TIPO</label>
              <select style={{width:"100%"}} value={prenda.manga||""} onChange={e=>onChange({...prenda,manga:e.target.value})}>
                <option value="">Seleccionar...</option>
                {MANGA_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>COLOR MANGA</label>
              <select style={{width:"100%"}} value={prenda.color||""} onChange={e=>onChange({...prenda,color:e.target.value})}>
                <option value="">Seleccionar...</option>
                {COLORES_TEJIDO.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>PUÑO</label>
              <select style={{width:"100%",marginBottom:prenda.puno==="Pretina"?6:0}} value={prenda.puno||""} onChange={e=>onChange({...prenda,puno:e.target.value,colorPuno:""})}>
                <option value="">Seleccionar...</option>
                {PUNO_OPCIONES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              {prenda.puno==="Pretina"&&(
                <select style={{width:"100%"}} value={prenda.colorPuno||""} onChange={e=>onChange({...prenda,colorPuno:e.target.value})}>
                  <option value="">Color de pretina...</option>
                  {COLORES_TEJIDO.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>TIPO CUELLO</label>
              <select style={{width:"100%"}} value={prenda.cuello||""} onChange={e=>onChange({...prenda,cuello:e.target.value})}>
                <option value="">Seleccionar...</option>
                {CUELLO_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:9,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:4}}>COLOR CUELLO (RIB)</label>
              <select style={{width:"100%"}} value={prenda.colorCuello||""} onChange={e=>onChange({...prenda,colorCuello:e.target.value})}>
                <option value="">Seleccionar...</option>
                {COLORES_TEJIDO.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
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
  const puedeVer=usuario?.rol==="admin"||["Vivi","Romina","Andrea"].includes(usuario?.nombre)||usuario?.proceso==="orden";
  if(!puedeVer)return null;
  const porVencer=pedidos.filter(p=>{
    const dias=diasHasta(p.fecha_entrega);
    const prog=pedidoProgreso(p);
    if(prog===100||p.entregado||dias<0||dias>4)return false;
    if(usuario?.rol==="admin"||usuario?.nombre==="Vivi")return true;
    if(usuario?.proceso==="orden")return p.creado_por===usuario.nombre;
    if(usuario?.nombre==="Andrea")return(p.procesos_activos||[]).includes("terminacion");
    return false;
  });
  const vencidos=pedidos.filter(p=>{
    const dias=diasHasta(p.fecha_entrega);
    const prog=pedidoProgreso(p);
    if(prog===100||p.entregado||dias>=0)return false;
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

        </div>
      )}
    </div>
  );
}


export {
  EMAILJS_SERVICE, EMAILJS_TEMPLATE, EMAILJS_KEY,
  SUPABASE_URL, SUPABASE_KEY, H,
  dbGet, dbInsert, dbPatch, dbDelete,
  PROCESOS, PRIORIDADES, ETAPA_LABEL, ETAPA_COLOR,
  TALLES_LIST, COLORES_TEJIDO, TIPOS_TEJIDO_LIST, COSTO_CONFECCION,
  calcCostoConfeccion, MOLDERIA_LIST, MANGA_TIPOS, CUELLO_TIPOS, PUNO_OPCIONES,
  TIPOS_PRENDA, CONSUMO_REMERA, PRENDA_INIT, FORM_INIT,
  hoy, getMesInfo, getLunesDeSemana, addDias, esTarde, tieneHorario,
  getFingerprint, TALLER_LAT, TALLER_LNG, RADIO_METROS,
  calcDistancia, normalizarVinculados, diasHasta, formatFecha,
  newId, calcTalles, calcTotal, calcTotalGral, pedidoProgreso, pedidoIniciado,
  calcTejidoRemera, isRemera, puedeVerPrecios, puedeVerTejido, puedeVerFinanciero,
  enviarEmailPedido, ResumenPrecios, PrendaDetalle, PrendaForm, AlertasVencimiento
};


/* ════════════════════════════════════════════════════════════════════════
 *  MÓDULOS DE INTELIGENCIA — Re-exportados desde utils.jsx
 *  ────────────────────────────────────────────────────────────────────────
 *  Para no duplicar lógica ni romper el build, los helpers de los nuevos
 *  módulos viven en archivos propios y se re-exportan acá. Así App.jsx y
 *  los componentes pueden importarlos desde "./utils.jsx" si lo prefieren,
 *  manteniendo utils.jsx como hub central.
 *
 *  NOTA: Se excluyen funciones que ya existen arriba en este archivo
 *  (diasHasta, calcTalles, calcTejidoRemera, isRemera, pedidoProgreso,
 *  CONSUMO_REMERA) para evitar declaraciones duplicadas.
 * ══════════════════════════════════════════════════════════════════════ */

// ── IA de producción (ia_produccion.js) ──────────────────────────────────
export {
  RENDS, PROCESOS_FLUJO, DIAS_ESTANDAR_PROCESO, CAPACIDAD_AREA,
  diasTranscurridos, procesosPendientes, cantidadPedido,
  analizarRetrasoPedido, analizarRetrasos,
  scoreOrdenProduccion, optimizarOrdenProduccion,
  detectarCuellosBotella, estimarFechaEntrega,
  calcularStockTejido, calcularCompraTejido, generarResumenIA,
} from "./ia_produccion.js";

// ── Finanzas CEO (finanzas_ceo.js) ────────────────────────────────────────
export {
  COSTO_CONFECCION_CEO, CATEGORIAS_GASTO, grupoDeCategoria, fechaEnPeriodo,
  totalPedido, cobradoPedido, saldoPedido, unidadesPedido, costoManoObraPedido,
  calcularKPIs, calcularDSO, rentabilidadPorCliente, rentabilidadPorPrenda,
  tendenciaMensual, generarAlertas, alertasDescuentos, proyecciones,
} from "./finanzas_ceo.js";

// ── Políticas de descuento (politicas_descuento.js) ──────────────────────
export {
  POLITICAS_DESCUENTO, MAPEO_NOMBRE_ROL, RAZONES_DESCUENTO,
  getRolDescuento, getPoliticaUsuario, getMaxDescuento, getRazon,
  validarDescuento, construirRegistroDescuento,
  historialDescuentosPorCliente, listarTodosDescuentos, impactoEnMargen,
} from "./politicas_descuento.js";
