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
function pedidoProgreso(p){const a=p.procesos_activos||[];if(!a.length)return 0;const l=a.filter(k=>(p.procesos||{})[k]==="listo").length;return Math.round((l/a.length)*100);}
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
function PedidoCard({pedido,usuario,usuarios=[],pedidos=[],setPedidos,marcarEtapa,miProceso,gastos=[],stockTejido=[],setFormGasto,setShowNuevoGasto,setShowAsignarTejido,setShowEntregarModal,setFormEntrega,setShowModalCorte,showPagos,setShowPagos,nuevoPago,setNuevoPago,agregarPago,setShowAgregado,setFormAgregado,setEditandoPedido,setFormEditar,eliminarPedido}){
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

          {/* Indicadores Tejido/Tercerizado */}
          {(()=>{
            const puedeVerTejidoInd=usuario?.rol==="admin"||["Vivi","Andrea"].includes(usuario?.nombre)||usuario?.proceso==="corte"||usuario?.nombre===p.creado_por;
            const puedeMarcarTejido=usuario?.rol==="admin"||["Vivi","Andrea"].includes(usuario?.nombre);
            const puedeVerTercInd=usuario?.rol==="admin"||["Vivi","Andrea"].includes(usuario?.nombre);
            const puedeVerMontoTerc=usuario?.rol==="admin"||usuario?.nombre==="Gabi";
            const puedeRegistrarTerc=usuario?.rol==="admin"||["Vivi","Gabi"].includes(usuario?.nombre);
            if(!puedeVerTejidoInd&&!puedeVerTercInd)return null;
            const tieneGastoTejido=gastos.some(g=>normalizarVinculados(g.pedidos_vinculados,g.monto).some(v=>v.id===p.id));
            const tieneTejido=tieneGastoTejido||p.tejido_disponible===true;
            const gastosTerc=gastos.filter(g=>g.categoria==="pago_terceros"&&normalizarVinculados(g.pedidos_vinculados,g.monto).some(v=>v.id===p.id));
            return(
              <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
                {puedeVerTejidoInd&&(
                  <span className="badge" style={{background:tieneTejido?"#10b98122":"#ef444422",color:tieneTejido?"#10b981":"#ef4444",padding:"4px 10px"}}>
                    🧵 {tieneTejido?"HAY TEJIDO":"SIN TEJIDO"}{p.tejido_disponible===true&&!tieneGastoTejido?" (stock)":""}
                  </span>
                )}
                {puedeMarcarTejido&&!tieneGastoTejido&&(
                  <button className="btn" onClick={async()=>{
                    const nuevoValor=!p.tejido_disponible;
                    await dbPatch("pedidos",p.id,{tejido_disponible:nuevoValor});
                    setPedidos(prev=>prev.map(x=>x.id===p.id?{...x,tejido_disponible:nuevoValor}:x));
                  }} style={{fontSize:10,padding:"4px 10px",background:"transparent",border:"1.5px solid #10b981",color:"#10b981",letterSpacing:0.5}}>
                    {p.tejido_disponible?"✕ Quitar (stock)":"✓ Marcar hay tejido (stock)"}
                  </button>
                )}
                {puedeVerTercInd&&(gastosTerc.length>0||p.marcado_terceros)&&(
                  <span className="badge" style={{background:"#a855f722",color:"#a855f7",padding:"4px 10px"}}>
                    🪡 TERCERIZADO{puedeVerMontoTerc&&gastosTerc.length>0?` ($${gastosTerc.reduce((s,g)=>{const v=normalizarVinculados(g.pedidos_vinculados,g.monto).find(x=>x.id===p.id);return s+(parseFloat(v?.monto)||0);},0).toLocaleString("es-AR")})`:""}
                  </span>
                )}
                {puedeRegistrarTerc&&(
                  <button className="btn" onClick={()=>{setFormGasto({fecha:hoy(),categoria:"pago_terceros",descripcion:`Confección tercerizada - Pedido ${p.id}`,monto:"",tipo:"real",pedidosVinculados:[{id:p.id,monto:""}]});setShowNuevoGasto(true);}}
                    style={{fontSize:10,padding:"4px 10px",background:"transparent",border:"1.5px solid #a855f7",color:"#a855f7",letterSpacing:0.5}}>
                    + REGISTRAR TERCERIZADO
                  </button>
                )}
                {usuario?.nombre==="Andrea"&&(
                  <button className="btn" onClick={async()=>{
                    const nuevoValor=!p.marcado_terceros;
                    await dbPatch("pedidos",p.id,{marcado_terceros:nuevoValor});
                    setPedidos(prev=>prev.map(x=>x.id===p.id?{...x,marcado_terceros:nuevoValor}:x));
                  }} style={{fontSize:10,padding:"4px 10px",background:p.marcado_terceros?"#a855f722":"transparent",border:"1.5px solid #a855f7",color:"#a855f7",letterSpacing:0.5}}>
                    {p.marcado_terceros?"✓ Marcado para tercerizar":"Marcar para tercerizar"}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Boton asignar tejido del stock */}
          {(usuario?.rol==="admin"||usuario?.nombre==="Vivi")&&(p.prendas||[]).some(pr=>isRemera(pr.tipoPrenda))&&(
            <button className="btn" onClick={()=>setShowAsignarTejido(p)}
              style={{width:"100%",padding:"8px",fontSize:11,background:"transparent",border:"1.5px solid #06b6d4",color:"#06b6d4",letterSpacing:1,marginBottom:8}}>
              🧵 ASIGNAR TEJIDO DEL STOCK
            </button>
          )}
          {/* Costos vinculados al pedido (solo Admin/Gabi) */}
          {(usuario?.rol==="admin"||usuario?.nombre==="Gabi")&&(()=>{
            const costosVinc={};
            gastos.forEach(g=>{
              normalizarVinculados(g.pedidos_vinculados,g.monto).forEach(v=>{
                if(v.id===p.id&&parseFloat(v.monto)>0){
                  if(!costosVinc[g.categoria])costosVinc[g.categoria]=0;
                  costosVinc[g.categoria]+=parseFloat(v.monto)||0;
                }
              });
            });
            const tieneTercerizado=p.marcado_terceros||(gastos.some(g=>g.categoria==="pago_terceros"&&normalizarVinculados(g.pedidos_vinculados,g.monto).some(v=>v.id===p.id)));
            const costoConfeccion=tieneTercerizado?0:calcCostoConfeccion(p.prendas||[]);
            const totalCostos=Object.values(costosVinc).reduce((s,v)=>s+v,0)+costoConfeccion;
            if(totalCostos===0)return null;
            const LABELS={mat_tejido:"🧵 Tejido",pago_terceros:"🪡 Tercerizado",envio:"🚚 Envío",mat_serigrafia:"🖨️ Serigrafía/DTF/Sub",mat_confeccion:"🪡 Confección/Bordado",mat_empaque:"📦 Empaque"};
            return(
              <div style={{marginBottom:8,padding:"10px",background:"#1a1208",color:"#f5f0e8"}}>
                <div style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",marginBottom:6}}>COSTOS REGISTRADOS DE ESTE PEDIDO</div>
                {Object.entries(costosVinc).map(([cat,monto])=>(
                  <div key={cat} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                    <span>{LABELS[cat]||cat}</span>
                    <span>${monto.toLocaleString("es-AR")}</span>
                  </div>
                ))}
                {costoConfeccion>0&&(
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                    <span>🪡 Confección (mano de obra)</span>
                    <span>${costoConfeccion.toLocaleString("es-AR")}</span>
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,borderTop:"1px solid #3a3a3a",paddingTop:6,marginTop:4,color:"#e85d26"}}>
                  <span>TOTAL COSTOS</span>
                  <span>${totalCostos.toLocaleString("es-AR")}</span>
                </div>
                {(()=>{
                  const totalVenta=calcTotalGral(p.prendas||[]);
                  if(totalVenta===0)return null;
                  const margen=totalVenta-totalCostos;
                  const pct=totalVenta>0?Math.round((margen/totalVenta)*100):0;
                  return(
                    <>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:6,color:"#8a7a6a"}}>
                        <span>Precio de venta</span>
                        <span>${totalVenta.toLocaleString("es-AR")}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:600,marginTop:4,color:margen>=0?"#10b981":"#ef4444"}}>
                        <span>MARGEN ESTIMADO</span>
                        <span>${margen.toLocaleString("es-AR")} ({pct}%)</span>
                      </div>
                      <div style={{fontSize:9,color:"#8a7a6a",marginTop:2}}>* Solo incluye costos cargados (puede faltar mano de obra, etc.)</div>
                    </>
                  );
                })()}
              </div>
            );
          })()}

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
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px",background:"#fff",border:"1px solid #d8d0c0",marginBottom:3,fontSize:11}}>
                    <span style={{fontWeight:600}}>${parseFloat(pg.monto).toLocaleString("es-AR")}</span>
                    <span style={{color:"#8a7a6a"}}>{pg.tipo} · {formatFecha(pg.fecha)}</span>
                    {(usuario?.rol==="admin"||usuario?.nombre==="Gabi")&&(
                      <button onClick={async()=>{
                        const nuevosPagos=pagos.filter((_,idx)=>idx!==i);
                        await dbPatch("pedidos",p.id,{pagos:nuevosPagos});
                        setPedidos(prev=>prev.map(x=>x.id===p.id?{...x,pagos:nuevosPagos}:x));
                        showToast("✓ Pago eliminado");
                      }} style={{border:"none",background:"none",cursor:"pointer",color:"#ef4444",fontSize:13,padding:"0 4px"}}>✕</button>
                    )}
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
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"#fff",border:"1px solid #d8d0c0",marginBottom:4}}>
                  <span style={{fontSize:16}}>📎</span>
                  <a href={archivo.url} target="_blank" rel="noreferrer" style={{fontSize:12,flex:1,textDecoration:"none",color:"#1a1208"}}>{archivo.nombre}</a>
                  <span style={{fontSize:10,color:"#e85d26",marginRight:4}}>↓</span>
                  {(usuario?.rol==="admin"||["Gabi","David"].includes(usuario?.nombre))&&(
                    <button onClick={async()=>{
                      if(!window.confirm(`¿Eliminar "${archivo.nombre}"?`))return;
                      const nuevosArchivos=(p.archivos_urls||[]).filter((_,idx)=>idx!==i);
                      await dbPatch("pedidos",p.id,{archivos_urls:nuevosArchivos});
                      setPedidos(prev=>prev.map(x=>x.id===p.id?{...x,archivos_urls:nuevosArchivos}:x));
                      showToast("✓ Archivo eliminado");
                    }} style={{border:"none",background:"none",cursor:"pointer",color:"#ef4444",fontSize:14,padding:"0 4px"}}>✕</button>
                  )}
                </div>
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
          {/* Botón entregado */}
          {!p.entregado&&(usuario?.nombre===p.creado_por||usuario?.nombre==="Gabi"||usuario?.rol==="admin")&&(()=>{
            const tg=calcTotalGral(p.prendas||[]);
            const ant=parseFloat(p.anticipo)||0;
            const pagado=(p.pagos||[]).reduce((s,pg)=>s+(parseFloat(pg.monto)||0),0);
            const saldo=Math.round(tg-ant-pagado);
            const saldoCero=tg===0||saldo<=0;
            return(
              <button className="btn" onClick={async()=>{
                const procesosInc=(p.procesos_activos||[]).filter(k=>(p.procesos||{})[k]!=="listo");
                if(procesosInc.length>0){
                  const nombres=procesosInc.map(k=>PROCESOS.find(pr=>pr.key===k)?.label||k).join(", ");
                  if(!window.confirm(`⚠️ Hay procesos sin completar:\n${nombres}\n\n¿Querés entregar igual?`))return;
                }
                if(saldoCero){
                  const updates={entregado:true,fecha_entrega_real:hoy(),tipo_pago_entrega:"pagado",dias_credito:null,procesos_pendientes_al_entregar:procesosInc};
                  await dbPatch("pedidos",p.id,updates);
                  setPedidos(prev=>prev.map(x=>x.id===p.id?{...x,...updates}:x));
                  showToast("✓ Pedido marcado como entregado");
                }else{
                  setShowEntregarModal(p);
                  setFormEntrega({tipoPago:"pagado",montoCobrado:"",diasCredito:""});
                }
              }} style={{width:"100%",padding:"8px",fontSize:11,background:"transparent",border:"1.5px solid #64748b",color:"#64748b",letterSpacing:1,marginBottom:8}}>
                🚀 MARCAR COMO ENTREGADO{saldoCero?" (saldo $0)":` (saldo $${saldo.toLocaleString("es-AR")})`}
              </button>
            );
          })()}
          {p.entregado&&(usuario?.rol==="admin"||usuario?.nombre===p.creado_por)&&(
            <div style={{padding:"8px 10px",background:"#64748b15",border:"1.5px solid #64748b44",marginBottom:8}}>
              <div style={{fontSize:10,color:"#64748b",fontWeight:600}}>🚀 ENTREGADO el {formatFecha(p.fecha_entrega_real)}</div>
              {p.tipo_pago_entrega==="credito"&&<div style={{fontSize:10,color:"#f59e0b"}}>📋 A crédito {p.dias_credito} días</div>}
              {(usuario?.rol==="admin"||usuario?.nombre===p.creado_por)&&(
                <button className="btn" onClick={async()=>{
                  await dbPatch("pedidos",p.id,{entregado:false,fecha_entrega_real:null,tipo_pago_entrega:null,dias_credito:null});
                  setPedidos(prev=>prev.map(x=>x.id===p.id?{...x,entregado:false,fecha_entrega_real:null}:x));
                  showToast("↩ Movido a Terminados");
                }} style={{fontSize:10,padding:"4px 10px",background:"transparent",border:"1px solid #c8bfaf",color:"#8a7a6a",marginTop:6,letterSpacing:0.5}}>↩ DESHACER</button>
              )}
            </div>
          )}
          {/* Botones admin */}
          {!miProceso&&(
            <div style={{marginTop:10,display:"flex",gap:8,justifyContent:"flex-end"}}>
              {(usuario?.rol==="admin"||usuario?.nombre==="Vivi"||usuario?.nombre===p.creado_por)&&setShowAgregado&&(
                <button className="btn" onClick={()=>{setShowAgregado(p);setFormAgregado({prendas:[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}],anticipo:""}); }} style={{padding:"7px 14px",fontSize:11,background:"transparent",border:"1.5px solid #10b981",color:"#10b981",letterSpacing:1}}>+ AGREGAR</button>
              )}
              {(usuario?.rol==="admin"||usuario?.nombre==="Gabi")&&setEditandoPedido&&(
                <button className="btn" onClick={()=>{setEditandoPedido(p.id);setFormEditar({cliente:p.cliente,prioridad:p.prioridad,fechaEntrega:p.fecha_entrega,descripcion:p.descripcion||"",datosFactura:p.datos_factura||"",anticipo:p.anticipo||"",prendas:p.prendas||[{...PRENDA_INIT},{...PRENDA_INIT},{...PRENDA_INIT}],procesosActivos:p.procesos_activos||[]});}} style={{padding:"7px 14px",fontSize:11,background:"transparent",border:"1.5px solid #e85d26",color:"#e85d26",letterSpacing:1}}>✏️ EDITAR</button>
              )}
              {(usuario?.rol==="admin"||usuario?.nombre==="Gabi")&&eliminarPedido&&(
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

function PantallaMarcado({empleados}){
  const hash=window.location.hash.replace("#asistencia/","");
  const [empData,setEmpData]=useState(null);
  const [empCargado,setEmpCargado]=useState(false);
  const [marcando,setMarcando]=useState(false);
  const [resultado,setResultado]=useState(null);

  useEffect(()=>{
    const codigo=hash.toUpperCase();
    const empLocal=empleados.find(e=>e.codigo===codigo);
    if(empLocal){setEmpData(empLocal);setEmpCargado(true);return;}
    dbGet("empleados",`codigo=eq.${codigo}&activo=eq.true`).then(res=>{
      if(Array.isArray(res)&&res.length>0)setEmpData(res[0]);
      setEmpCargado(true);
    }).catch(()=>setEmpCargado(true));
  },[hash]);

  async function marcar(tipo){
    if(marcando||!empData)return;
    setMarcando(true);
    const fp=await getFingerprint();
    if(empData.dispositivo&&empData.dispositivo!==fp){
      setResultado({error:true,msg:"Este dispositivo no está autorizado. Solo podés marcar desde tu celular registrado."});
      setMarcando(false);return;
    }
    if(!navigator.geolocation){
      setResultado({error:true,msg:"Tu dispositivo no tiene GPS"});
      setMarcando(false);return;
    }
    navigator.geolocation.getCurrentPosition(async(pos)=>{
      try{
        const dist=calcDistancia(pos.coords.latitude,pos.coords.longitude,TALLER_LAT,TALLER_LNG);
        if(dist>RADIO_METROS){
          setResultado({error:true,msg:`Estás a ${Math.round(dist)}m del taller. Tenés que estar dentro de ${RADIO_METROS}m para marcar.`});
          setMarcando(false);return;
        }
        if(!empData.dispositivo){
          await dbPatch("empleados",empData.id,{dispositivo:fp});
        }
        // Usar Edge Function para calcular hora en servidor (Paraguay UTC-4)
        const edgeFnUrl=`${SUPABASE_URL}/functions/v1/registrar-asistencia`;
        const resp=await fetch(edgeFnUrl,{
          method:"POST",
          headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`},
          body:JSON.stringify({empleado_id:empData.id,tipo,distancia:Math.round(dist)})
        });
        if(resp.ok){
          const r=await resp.json();
          setResultado({tipo,hora:new Date(),distancia:Math.round(dist),primerVez:!empData.dispositivo});
        }else{
          const err=await resp.json();
          setResultado({error:true,msg:"Error al registrar: "+(err.error||"intentá de nuevo")});
        }
      }catch(e){setResultado({error:true,msg:"Error de conexión"});}
      setMarcando(false);
    },(err)=>{
      setResultado({error:true,msg:"Permiso de ubicación denegado. Activá el GPS para marcar asistencia."});
      setMarcando(false);
    },{enableHighAccuracy:true,timeout:10000,maximumAge:0});
  }

  if(!empCargado)return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,background:"#f5f0e8"}}>
      <div style={{marginBottom:16,textAlign:"center"}}><img src="https://raw.githubusercontent.com/humbertoobelarg-netizen/Flujo-textil/refs/heads/main/logo_tecnica.jpg" alt="Técnica Remeras" style={{maxWidth:200,maxHeight:80,objectFit:"contain"}}/></div>
      <div style={{fontSize:14,color:"#8a7a6a"}}>Cargando...</div>
    </div>
  );

  if(!empData)return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,background:"#f5f0e8"}}>
      <div style={{marginBottom:8,textAlign:"center"}}><img src="https://raw.githubusercontent.com/humbertoobelarg-netizen/Flujo-textil/refs/heads/main/logo_tecnica.jpg" alt="Técnica Remeras" style={{maxWidth:200,maxHeight:80,objectFit:"contain"}}/></div>
      <div style={{padding:32,background:"#fff",border:"1.5px solid #d8d0c0",textAlign:"center",maxWidth:320,width:"100%"}}>
        <div style={{fontSize:32,marginBottom:12}}>❌</div>
        <div style={{fontSize:14,color:"#ef4444",marginBottom:8}}>Código no encontrado</div>
        <div style={{fontSize:12,color:"#8a7a6a"}}>Código: <strong>{hash}</strong></div>
        <div style={{fontSize:11,color:"#8a7a6a",marginTop:8}}>Verificá el link con tu encargado</div>
      </div>
    </div>
  );

  if(resultado&&!resultado.error)return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,background:"#f5f0e8"}}>
      <div style={{marginBottom:8,textAlign:"center"}}><img src="https://raw.githubusercontent.com/humbertoobelarg-netizen/Flujo-textil/refs/heads/main/logo_tecnica.jpg" alt="Técnica Remeras" style={{maxWidth:200,maxHeight:80,objectFit:"contain"}}/></div>
      <div style={{padding:32,background:"#fff",border:"1.5px solid #d8d0c0",textAlign:"center",maxWidth:320,width:"100%"}}>
        <div style={{fontSize:48,marginBottom:12}}>{resultado.tipo==="entrada"?"☀️":"🌙"}</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:2,marginBottom:4}}>{resultado.tipo==="entrada"?"ENTRADA REGISTRADA":"SALIDA REGISTRADA"}</div>
        <div style={{fontSize:20,fontWeight:600,color:"#e85d26",marginBottom:4}}>{empData.nombre}</div>
        <div style={{fontSize:16,marginBottom:4}}>{resultado.hora.toLocaleTimeString("es-PY",{hour:"2-digit",minute:"2-digit",timeZone:"America/Asuncion"})}</div>
        <div style={{fontSize:11,color:"#8a7a6a",marginBottom:8}}>{resultado.hora.toLocaleDateString("es-PY",{weekday:"long",day:"numeric",month:"long"})}</div>
        {resultado.distancia&&<div style={{fontSize:11,color:"#10b981"}}>📍 A {resultado.distancia}m del taller</div>}
        {resultado.primerVez&&<div style={{fontSize:11,color:"#06b6d4",marginTop:6}}>✓ Dispositivo registrado automáticamente</div>}
        <button className="btn" onClick={()=>setResultado(null)} style={{marginTop:20,width:"100%",padding:"12px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf",letterSpacing:1}}>VOLVER</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,background:"#f5f0e8"}}>
      <div style={{marginBottom:8,textAlign:"center"}}><img src="https://raw.githubusercontent.com/humbertoobelarg-netizen/Flujo-textil/refs/heads/main/logo_tecnica.jpg" alt="Técnica Remeras" style={{maxWidth:200,maxHeight:80,objectFit:"contain"}}/></div>
      <div style={{padding:32,background:"#fff",border:"1.5px solid #d8d0c0",textAlign:"center",maxWidth:320,width:"100%"}}>
        <div style={{width:64,height:64,background:"#e85d26",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'Bebas Neue',sans-serif",fontSize:28,margin:"0 auto 16px"}}>{empData.nombre[0].toUpperCase()}</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:2,marginBottom:4}}>{empData.nombre}</div>
        <div style={{fontSize:12,color:"#8a7a6a",marginBottom:24}}>{new Date().toLocaleDateString("es-PY",{weekday:"long",day:"numeric",month:"long"})}</div>
        {resultado?.error&&(
          <div style={{padding:"10px 14px",background:"#ef444415",border:"1.5px solid #ef444444",marginBottom:12}}>
            <div style={{fontSize:20,marginBottom:4}}>❌</div>
            <div style={{fontSize:12,color:"#ef4444"}}>{resultado.msg}</div>
            <button className="btn" onClick={()=>setResultado(null)} style={{marginTop:8,width:"100%",padding:"8px",fontSize:11,background:"transparent",border:"1.5px solid #ef4444",color:"#ef4444",letterSpacing:1}}>INTENTAR DE NUEVO</button>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button className="btn" onClick={()=>marcar("entrada")} disabled={marcando} style={{padding:"16px",fontSize:14,background:"#10b981",color:"#fff",letterSpacing:2,fontFamily:"'Bebas Neue',sans-serif",border:"none",opacity:marcando?0.6:1}}>
            {marcando?"...":"☀️ ENTRADA (7:00)"}
          </button>
          <button className="btn" onClick={()=>marcar("salida_almuerzo")} disabled={marcando} style={{padding:"16px",fontSize:14,background:"#f59e0b",color:"#fff",letterSpacing:2,fontFamily:"'Bebas Neue',sans-serif",border:"none",opacity:marcando?0.6:1}}>
            {marcando?"...":"🍽️ SALIDA ALMUERZO (12:00)"}
          </button>
          <button className="btn" onClick={()=>marcar("vuelta_almuerzo")} disabled={marcando} style={{padding:"16px",fontSize:14,background:"#06b6d4",color:"#fff",letterSpacing:2,fontFamily:"'Bebas Neue',sans-serif",border:"none",opacity:marcando?0.6:1}}>
            {marcando?"...":"↩️ VUELTA ALMUERZO (12:45)"}
          </button>
          <button className="btn" onClick={()=>marcar("salida")} disabled={marcando} style={{padding:"16px",fontSize:14,background:"#e85d26",color:"#fff",letterSpacing:2,fontFamily:"'Bebas Neue',sans-serif",border:"none",opacity:marcando?0.6:1}}>
            {marcando?"...":"🌙 SALIDA (17:00)"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────
export default function App(){
  const [cargando,setCargando]=useState(true);
  const [pagina,setPagina]=useState(1);
  const ITEMS_POR_PAGINA=50;
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
  const [formGasto,setFormGasto]=useState({fecha:hoy(),categoria:"mat_tejido",descripcion:"",monto:"",tipo:"real",pedidosVinculados:[],itemsTejido:[{tipo:"90",kilos:"",precioKg:""}]});
  const [busquedaPedidoGasto,setBusquedaPedidoGasto]=useState("");
  const [stockTejido,setStockTejido]=useState([]);
  const [showNuevaCompra,setShowNuevaCompra]=useState(false);
  const [showAsignarTejido,setShowAsignarTejido]=useState(null); // pedido
  const [showModalCorte,setShowModalCorte]=useState(null); // {pedido, proceso}
  const [anchoCorte,setAnchoCorte]=useState("90");
  const [backupCerrado,setBackupCerrado]=useState(false);
  const [showEntregarModal,setShowEntregarModal]=useState(null); // pedido
  const [formEntrega,setFormEntrega]=useState({tipoPago:"pagado",montoCobrado:"",diasCredito:""});
  const [formCompra,setFormCompra]=useState({fecha:hoy(),proveedor:"",items:[{tipo:"90",kilos:"",precioKg:""}],pedidosVinculados:[],tipoGasto:"real"});
  const [busquedaPedidoStock,setBusquedaPedidoStock]=useState("");
  const [showNuevoAjuste,setShowNuevoAjuste]=useState(false);
  const [formAjuste,setFormAjuste]=useState({fecha:hoy(),tipo:"90",kilos:"",motivo:"sobrante",descripcion:""});
  const [ingresosExtra,setIngresosExtra]=useState([]);
  const [showNuevoIngreso,setShowNuevoIngreso]=useState(false);
  const [formIngreso,setFormIngreso]=useState({fecha:hoy(),descripcion:"",monto:"",origen:"pedido_viejo"});
  const [periodoFiltro,setPeriodoFiltro]=useState("mensual");
  const [filtroMes,setFiltroMes]=useState("");
  const [tipoFiltroMes,setTipoFiltroMes]=useState("entrega");
  const [mesSeleccionado,setMesSeleccionado]=useState(new Date().toISOString().slice(0,7));

  // ASISTENCIA
  const [empleados,setEmpleados]=useState([]);
  const [asistencia,setAsistencia]=useState([]);
  const [showNuevoEmpleado,setShowNuevoEmpleado]=useState(false);
  const [formEmpleado,setFormEmpleado]=useState({nombre:"",codigo:""});
  const [asistenciaFecha,setAsistenciaFecha]=useState(hoy());
  const [semanaOffset,setSemanaOffset]=useState(0);
  const [ordenPor,setOrdenPor]=useState("entrega");
  const [mesOffset,setMesOffset]=useState(0);
  const [vistaAsistencia,setVistaAsistencia]=useState("semana"); // semana | dia

  useEffect(()=>{
    cargarDatos();
    // Detectar pantalla de marcado via hash
    if(window.location.hash.startsWith("#asistencia/")){
      setPantalla("marcado");
    }
    // Realtime subscriptions
    const setupRealtime=async()=>{
      try{
        // Subscribe to pedidos changes
        const ws=new WebSocket(`${SUPABASE_URL.replace("https","wss")}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`);
        ws.onopen=()=>{
          ws.send(JSON.stringify({topic:"realtime:public:pedidos",event:"phx_join",payload:{},ref:"1"}));
          ws.send(JSON.stringify({topic:"realtime:public:gastos",event:"phx_join",payload:{},ref:"2"}));
          ws.send(JSON.stringify({topic:"realtime:public:asistencia",event:"phx_join",payload:{},ref:"3"}));
        };
        ws.onmessage=(e)=>{
          const msg=JSON.parse(e.data);
          if(msg.event==="INSERT"||msg.event==="UPDATE"||msg.event==="DELETE"){
            const tabla=msg.topic?.replace("realtime:public:","");
            if(tabla==="pedidos")cargarDatos();
            if(tabla==="gastos")dbGet("gastos").then(g=>setGastos(Array.isArray(g)?g:[]));
            if(tabla==="asistencia")dbGet("asistencia","order=hora.desc&limit=500").then(a=>setAsistencia(Array.isArray(a)?a:[]));
          }
        };
        ws.onerror=()=>{}; // Silent fail - realtime is optional
        return ()=>ws.close();
      }catch(e){}
    };
    const cleanup=setupRealtime();
    return()=>{cleanup.then(fn=>fn&&fn()).catch(()=>{});};
  },[]);

  async function cargarDatos(){
    setCargando(true);
    try{const[p,u,g,ie,st,emp,as]=await Promise.all([dbGet("pedidos"),dbGet("usuarios"),dbGet("gastos"),dbGet("ingresos_extra"),dbGet("stock_tejido"),dbGet("empleados","activo=eq.true&order=nombre.asc"),dbGet("asistencia","order=hora.desc&limit=500")]);setPedidos(Array.isArray(p)?p:[]);setUsuarios(Array.isArray(u)?u:[]);setGastos(Array.isArray(g)?g:[]);setIngresosExtra(Array.isArray(ie)?ie:[]);setStockTejido(Array.isArray(st)?st:[]);setEmpleados(Array.isArray(emp)?emp:[]);setAsistencia(Array.isArray(as)?as:[]);}
    catch(e){showToast("Error al cargar","#ef4444");}
    finally{setCargando(false);}
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

  async function crearAjusteStock(){
    if(!formAjuste.kilos){showToast("Ingresá los kilos","#ef4444");return;}
    const nuevo={id:"AJ"+Date.now(),fecha:formAjuste.fecha,proveedor:"AJUSTE",ancho:formAjuste.tipo,kilos:parseFloat(formAjuste.kilos),precio_kg:0,total:0,motivo:formAjuste.motivo,descripcion:formAjuste.descripcion,registrado_por:usuario?.nombre||"Admin"};
    const r=await fetch(`${SUPABASE_URL}/rest/v1/stock_tejido`,{method:"POST",headers:H,body:JSON.stringify(nuevo)});
    if(!r.ok){showToast("Error al guardar","#ef4444");return;}
    setStockTejido(prev=>[...prev,nuevo]);
    setFormAjuste({fecha:hoy(),tipo:"90",kilos:"",motivo:"sobrante",descripcion:""});
    setShowNuevoAjuste(false);
    showToast("✓ Ajuste registrado");
  }

  async function marcarEntregado(pedido, forzar=false){
    const {tipoPago,montoCobrado,diasCredito}=formEntrega;
    if(!montoCobrado){showToast("Ingresá el monto cobrado","#ef4444");return;}
    if(tipoPago==="credito"&&!diasCredito){showToast("Ingresá los días de crédito","#ef4444");return;}
    // Check incomplete processes
    const procesosIncompletos=(pedido.procesos_activos||[]).filter(k=>(pedido.procesos||{})[k]!=="listo");
    if(procesosIncompletos.length>0&&!forzar){
      const nombres=procesosIncompletos.map(k=>PROCESOS.find(p=>p.key===k)?.label||k).join(", ");
      if(!window.confirm(`⚠️ Hay procesos sin completar:
${nombres}

¿Querés entregar igual? Los operarios serán notificados.`))return;
    }
    const pagos=[...(pedido.pagos||[])];
    const pagoFinal={monto:parseFloat(montoCobrado),tipo:tipoPago==="credito"?`crédito ${diasCredito} días`:"efectivo",fecha:hoy(),registrado_por:usuario?.nombre||"Admin"};
    pagos.push(pagoFinal);
    const updates={entregado:true,fecha_entrega_real:hoy(),pagos,tipo_pago_entrega:tipoPago,dias_credito:tipoPago==="credito"?parseInt(diasCredito):null,procesos_pendientes_al_entregar:procesosIncompletos};
    await dbPatch("pedidos",pedido.id,updates);
    setPedidos(prev=>prev.map(x=>x.id===pedido.id?{...x,...updates}:x));
    setShowEntregarModal(null);
    setFormEntrega({tipoPago:"pagado",montoCobrado:"",diasCredito:""});
    showToast("✓ Pedido marcado como entregado");
  }

  async function confirmarCorte(pedido, ancho){
    const RENDS={"90":3.6,"120":3,"rib":2.3};
    // Calculate metros needed
    let mts90=0,mts120=0,mtsRib=0;
    (pedido.prendas||[]).forEach(pr=>{
      if(isRemera(pr.tipoPrenda)){
        const tej=calcTejidoRemera(pr.talles||{});
        mts90+=tej.a90;mts120+=tej.a120;mtsRib+=tej.rib;
      }
    });
    const mtsJersey=ancho==="90"?mts90:mts120;
    const kgJersey=mtsJersey/RENDS[ancho];
    const kgRib=mtsRib/RENDS["rib"];
    // Get color from prenda
    const colorCuerpo=(pedido.prendas||[]).find(pr=>isRemera(pr.tipoPrenda))?.cuerpo||"-";
    const colorRib=(pedido.prendas||[]).find(pr=>isRemera(pr.tipoPrenda))?.colorCuello||colorCuerpo;
    // Get PPP for jersey
    const stockJersey=stockTejido.filter(s=>s.ancho===ancho);
    const totalKgJ=stockJersey.reduce((s,i)=>s+(parseFloat(i.kilos)||0),0);
    const totalGsJ=stockJersey.reduce((s,i)=>s+(parseFloat(i.total)||0),0);
    const pppJersey=totalKgJ>0?totalGsJ/totalKgJ:0;
    // Get PPP for rib
    const stockRib=stockTejido.filter(s=>s.ancho==="rib");
    const totalKgR=stockRib.reduce((s,i)=>s+(parseFloat(i.kilos)||0),0);
    const totalGsR=stockRib.reduce((s,i)=>s+(parseFloat(i.total)||0),0);
    const pppRib=totalKgR>0?totalGsR/totalKgR:0;
    // Register descuentos in stock
    const descuentos=[];
    if(kgJersey>0&&pppJersey>0){
      const desc={id:"ST"+Date.now()+"_j",fecha:hoy(),proveedor:`Corte - ${pedido.id}`,ancho,color:colorCuerpo,kilos:-kgJersey,precio_kg:pppJersey,total:-(kgJersey*pppJersey),pedido_id:pedido.id,registrado_por:usuario?.nombre||"Guido"};
      const r=await fetch(`${SUPABASE_URL}/rest/v1/stock_tejido`,{method:"POST",headers:H,body:JSON.stringify(desc)});
      if(r.ok)descuentos.push(desc);
    }
    if(kgRib>0&&pppRib>0){
      const desc={id:"ST"+Date.now()+"_r",fecha:hoy(),proveedor:`Corte - ${pedido.id}`,ancho:"rib",color:colorRib,kilos:-kgRib,precio_kg:pppRib,total:-(kgRib*pppRib),pedido_id:pedido.id,registrado_por:usuario?.nombre||"Guido"};
      const r=await fetch(`${SUPABASE_URL}/rest/v1/stock_tejido`,{method:"POST",headers:H,body:JSON.stringify(desc)});
      if(r.ok)descuentos.push(desc);
    }
    if(descuentos.length>0)setStockTejido(prev=>[...prev,...descuentos]);
    // Mark proceso as listo
    await marcarEtapa(pedido.id,"corte","listo");
    setShowModalCorte(null);
    showToast(`✓ Corte marcado · ${mtsJersey.toFixed(1)} mts Jersey ${ancho==="90"?"90cm":"1.20m"} + ${mtsRib.toFixed(2)} mts Rib descontados del stock`);
  }

  async function asignarTejidoStock(pedido, ancho){
    const RENDS={"90":3.6,"120":3,"rib":2.3};
    const TIPOS={"90":"Jersey 90cm","120":"Jersey 1.20m","rib":"Rib 0.70m"};
    // Calculate metros needed from pedido prendas
    let metrosNecesarios=0;
    (pedido.prendas||[]).forEach(pr=>{
      if(isRemera(pr.tipoPrenda)){
        const tej=calcTejidoRemera(pr.talles||{});
        if(ancho==="90")metrosNecesarios+=tej.a90;
        else if(ancho==="120")metrosNecesarios+=tej.a120;
        else if(ancho==="rib")metrosNecesarios+=tej.rib;
      }
    });
    if(metrosNecesarios===0){showToast("No hay metros calculados para este pedido","#ef4444");return;}
    // Calculate kilos needed from metros
    const kilosNecesarios=metrosNecesarios/RENDS[ancho];
    // Get PPP for this ancho
    const stockAncho=stockTejido.filter(s=>s.ancho===ancho);
    const totalKg=stockAncho.reduce((s,i)=>s+(parseFloat(i.kilos)||0),0);
    const totalGs=stockAncho.reduce((s,i)=>s+(parseFloat(i.total)||0),0);
    const ppp=totalKg>0?totalGs/totalKg:0;
    if(ppp===0){showToast("No hay PPP disponible para este tejido","#ef4444");return;}
    const costoTejido=Math.round(kilosNecesarios*ppp);
    // Register as gasto linked to pedido
    const nuevoGasto={id:"G"+Date.now(),fecha:hoy(),categoria:"mat_tejido",descripcion:`${TIPOS[ancho]} del stock (${metrosNecesarios.toFixed(2)} mts · ${kilosNecesarios.toFixed(2)} kg · PPP $${Math.round(ppp).toLocaleString("es-AR")}/kg)`,monto:costoTejido,tipo:"real",registrado_por:usuario?.nombre||"Admin",pedidos_vinculados:[{id:pedido.id,monto:costoTejido}]};
    const r=await fetch(`${SUPABASE_URL}/rest/v1/gastos`,{method:"POST",headers:H,body:JSON.stringify(nuevoGasto)});
    if(!r.ok){showToast("Error al registrar","#ef4444");return;}
    // Discount from stock (register negative entry)
    const descuento={id:"ST"+Date.now(),fecha:hoy(),proveedor:"Descuento pedido "+pedido.id,ancho,kilos:-kilosNecesarios,precio_kg:ppp,total:-costoTejido,pedido_id:pedido.id,registrado_por:usuario?.nombre||"Admin"};
    await fetch(`${SUPABASE_URL}/rest/v1/stock_tejido`,{method:"POST",headers:H,body:JSON.stringify(descuento)});
    setGastos(prev=>[...prev,nuevoGasto]);
    setStockTejido(prev=>[...prev,descuento]);
    setShowAsignarTejido(null);
    showToast(`✓ ${metrosNecesarios.toFixed(2)} mts asignados al pedido · Costo: $${costoTejido.toLocaleString("es-AR")}`);
  }

  async function crearCompraTejido(){
    const itemsValidos=formCompra.items.filter(it=>it.kilos&&it.precioKg);
    if(itemsValidos.length===0){showToast("Completá al menos un ítem con kilos y precio","#ef4444");return;}
    const totalFactura=itemsValidos.reduce((s,it)=>s+((parseFloat(it.kilos)||0)*(parseFloat(it.precioKg)||0)),0);
    const vinc=formCompra.pedidosVinculados||[];
    // Validate vinculados sum
    if(vinc.length>0){
      const sumaVinc=vinc.reduce((s,v)=>s+(parseFloat(v.monto)||0),0);
      if(Math.abs(sumaVinc-totalFactura)>1){
        showToast(`La suma vinculada ($${sumaVinc.toLocaleString("es-AR")}) no coincide con el total ($${totalFactura.toLocaleString("es-AR")})`,"#ef4444");
        return;
      }
    }
    // Save stock items
    const nuevos=[];
    for(const it of itemsValidos){
      const kilos=parseFloat(it.kilos);
      const precioKg=parseFloat(it.precioKg);
      const nuevo={id:"ST"+Date.now()+"_"+Math.random().toString(36).slice(2,6),fecha:formCompra.fecha,proveedor:formCompra.proveedor||"-",ancho:it.tipo,kilos,precio_kg:precioKg,total:kilos*precioKg,registrado_por:usuario?.nombre||"Admin"};
      const r=await fetch(`${SUPABASE_URL}/rest/v1/stock_tejido`,{method:"POST",headers:H,body:JSON.stringify(nuevo)});
      if(r.ok)nuevos.push(nuevo);
    }
    setStockTejido(prev=>[...prev,...nuevos]);
    // Always create gasto
    const tiposTejido=itemsValidos.map(it=>({"90":"Jersey 90cm","120":"Jersey 1.20m","rib":"Rib"}[it.tipo]||it.tipo)).join(", ");
    const nuevoGasto={id:"G"+Date.now(),fecha:formCompra.fecha,categoria:"mat_tejido",descripcion:`Compra tejido (${tiposTejido}) - ${formCompra.proveedor||""}`,monto:totalFactura,tipo:formCompra.tipoGasto||"real",registrado_por:usuario?.nombre||"Admin",pedidos_vinculados:vinc};
    const rg=await fetch(`${SUPABASE_URL}/rest/v1/gastos`,{method:"POST",headers:H,body:JSON.stringify(nuevoGasto)});
    if(rg.ok){setGastos(prev=>[...prev,nuevoGasto]);showToast(`✓ Stock y gasto registrados`);}
    else showToast("Stock guardado pero error en gasto","#f59e0b");
    setFormCompra({fecha:hoy(),proveedor:"",items:[{tipo:"90",kilos:"",precioKg:""}],pedidosVinculados:[],tipoGasto:"real"});
    setBusquedaPedidoStock("");
    setShowNuevaCompra(false);
  }

  async function eliminarCompraTejido(id){
    await dbDelete("stock_tejido",id);
    setStockTejido(prev=>prev.filter(s=>s.id!==id));
    showToast("Compra eliminada");
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
    const montoTotal=parseFloat(formGasto.monto);
    const vinc=formGasto.pedidosVinculados||[];
    if(vinc.length>0){
      const sumaVinc=vinc.reduce((s,v)=>s+(parseFloat(v.monto)||0),0);
      if(Math.abs(sumaVinc-montoTotal)>1){
        showToast(`La suma de montos vinculados ($${sumaVinc.toLocaleString("es-AR")}) no coincide con el total ($${montoTotal.toLocaleString("es-AR")})`,"#ef4444");
        return;
      }
    }
    const nuevo={id:"G"+Date.now(),fecha:formGasto.fecha,categoria:formGasto.categoria,descripcion:formGasto.descripcion,monto:montoTotal,tipo:formGasto.tipo||"real",registrado_por:usuario?.nombre||"Admin",pedidos_vinculados:vinc};
    const r=await fetch(`${SUPABASE_URL}/rest/v1/gastos`,{method:"POST",headers:H,body:JSON.stringify(nuevo)});
    if(!r.ok){showToast("Error al guardar","#ef4444");return;}
    setGastos(prev=>[...prev,nuevo]);
    // If tejido, also update stock
    if(formGasto.categoria==="mat_tejido"&&(formGasto.itemsTejido||[]).some(it=>it.kilos&&it.precioKg)){
      for(const it of (formGasto.itemsTejido||[])){
        if(!it.kilos||!it.precioKg)continue;
        const kilos=parseFloat(it.kilos);const precioKg=parseFloat(it.precioKg);
        const st={id:"ST"+Date.now()+"_"+Math.random().toString(36).slice(2,6),fecha:formGasto.fecha,proveedor:formGasto.descripcion,ancho:it.tipo,kilos,precio_kg:precioKg,total:kilos*precioKg,registrado_por:usuario?.nombre||"Admin"};
        const rs=await fetch(`${SUPABASE_URL}/rest/v1/stock_tejido`,{method:"POST",headers:H,body:JSON.stringify(st)});
        if(rs.ok)setStockTejido(prev=>[...prev,st]);
      }
    }
    setFormGasto({fecha:hoy(),categoria:"mat_tejido",descripcion:"",monto:"",tipo:"real",pedidosVinculados:[],itemsTejido:[{tipo:"90",kilos:"",precioKg:""}]});
    setBusquedaPedidoGasto("");
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
    if(!editandoPedido){showToast("Error: no hay pedido seleccionado","#ef4444");return;}
    if(!formEditar){showToast("Error: no hay datos para guardar","#ef4444");return;}
    try{
      const updates={cliente:formEditar.cliente,prioridad:formEditar.prioridad,fecha_entrega:formEditar.fechaEntrega,descripcion:formEditar.descripcion,datos_factura:formEditar.datosFactura||"",anticipo:formEditar.anticipo||"",prendas:formEditar.prendas||[],procesos_activos:formEditar.procesosActivos||[]};
      const r=await fetch(`${SUPABASE_URL}/rest/v1/pedidos?id=eq.${editandoPedido}`,{method:"PATCH",headers:H,body:JSON.stringify(updates)});
      if(!r.ok){const err=await r.text();showToast("Error al guardar: "+err.slice(0,80),"#ef4444");return;}
      setPedidos(prev=>prev.map(p=>p.id===editandoPedido?{...p,...updates}:p));
      setEditandoPedido(null);setFormEditar(null);
      showToast("✓ Pedido actualizado");
    }catch(e){
      showToast("Error: "+e.message,"#ef4444");
    }
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
  }).sort((a,b)=>(ordenPor==="entrega"?(a.fecha_entrega||"9999").localeCompare(b.fecha_entrega||"9999"):(a.creado||"9999").localeCompare(b.creado||"9999")));

  const cardProps={pedidos,setPedidos,usuarios,gastos,stockTejido,setFormGasto,setShowNuevoGasto,setShowAsignarTejido,setShowEntregarModal,setFormEntrega,setShowModalCorte,showPagos,setShowPagos,nuevoPago,setNuevoPago,agregarPago,setShowAgregado,setFormAgregado,setEditandoPedido,setFormEditar,eliminarPedido};

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

      {/* RECORDATORIO BACKUP */}
      {usuario?.rol==="admin"&&(()=>{
        const hoyDate=new Date();
        const dia=hoyDate.getDate();
        const ultimoDia=new Date(hoyDate.getFullYear(),hoyDate.getMonth()+1,0).getDate();
        const mostrar=dia>=ultimoDia-1||dia<=2;
        if(!mostrar||backupCerrado)return null;
        const esPrimerDias=dia<=2;
        return(
          <div style={{position:"fixed",bottom:70,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:480,zIndex:999,background:"#1a1208",color:"#f5f0e8",padding:"12px 16px",border:"1.5px solid #e85d26",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>💾</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:600,letterSpacing:0.5}}>{esPrimerDias?"¿Ya hiciste el backup de fin de mes?":"Recordatorio: hacer backup antes de fin de mes"}</div>
              <div style={{fontSize:10,color:"#8a7a6a",marginTop:2}}>Supabase → Settings → Database → Backups → Download</div>
            </div>
            <button onClick={()=>setBackupCerrado(true)} style={{border:"none",background:"none",cursor:"pointer",color:"#8a7a6a",fontSize:18}}>✕</button>
          </div>
        );
      })()}

      {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 24px",fontSize:13,zIndex:100,letterSpacing:0.5}}>{toast.msg}</div>}



      {/* PANTALLA MARCADO EMPLEADO (pública via hash) */}
      {pantalla==="marcado"&&<PantallaMarcado empleados={empleados}/>}

      {/* LOGIN */}
      {pantalla==="login"&&(
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{marginBottom:32,textAlign:"center"}}>
            <div style={{textAlign:"center",marginBottom:8}}><img src="https://raw.githubusercontent.com/humbertoobelarg-netizen/Flujo-textil/refs/heads/main/logo_tecnica.jpg" alt="Técnica Remeras" style={{maxWidth:220,maxHeight:90,objectFit:"contain"}}/></div>
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
        }).sort((a,b)=>(ordenPor==="entrega"?(a.fecha_entrega||"9999").localeCompare(b.fecha_entrega||"9999"):(a.creado||"9999").localeCompare(b.creado||"9999")));
        const nuevos=filtrados.filter(p=>{
          if(p.entregado)return false;
          if(miProceso==="orden") return pedidoProgreso(pedidos.find(x=>x.id===p.id)||p)===0;
          const et=((pedidos.find(x=>x.id===p.id)||p).procesos||{})[miProceso]||"pendiente";
          return et==="pendiente";
        });
        const enProceso=filtrados.filter(p=>{
          if(p.entregado)return false;
          if(miProceso==="orden"){const prog=pedidoProgreso(pedidos.find(x=>x.id===p.id)||p);return prog>0&&prog<100;}
          const et=((pedidos.find(x=>x.id===p.id)||p).procesos||{})[miProceso]||"pendiente";
          return et==="en_proceso";
        });
        const listos=filtrados.filter(p=>{
          if(p.entregado)return false;
          if(miProceso==="orden") return pedidoProgreso(pedidos.find(x=>x.id===p.id)||p)===100;
          const et=((pedidos.find(x=>x.id===p.id)||p).procesos||{})[miProceso]||"pendiente";
          return et==="listo";
        });
        const entregadosOp=filtrados.filter(p=>p.entregado);
        const grupos=[{titulo:"PEDIDOS NUEVOS",icon:"📋",color:"#ef4444",items:nuevos},{titulo:"EN PROCESO",icon:"⚙️",color:"#f59e0b",items:enProceso},{titulo:"TERMINADOS",icon:"✅",color:"#10b981",items:listos},{titulo:"ENTREGADOS",icon:"🚀",color:"#64748b",items:entregadosOp}];
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
            <div style={{padding:"6px 16px",borderBottom:"1px solid #e8e0d0",background:"#fff",display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontSize:10,color:"#8a7a6a"}}>Ordenar:</span>
              {[["entrega","📅 Entrega"],["pedido","📝 Pedido"]].map(([k,l])=>(
                <button key={k} className="btn" onClick={()=>setOrdenPor(k)}
                  style={{padding:"4px 10px",fontSize:10,background:ordenPor===k?"#1a1208":"#f5f0e8",color:ordenPor===k?"#f5f0e8":"#1a1208",border:"1.5px solid #d8d0c0"}}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{flex:1,padding:16,overflowY:"auto"}}>
              <AlertasVencimiento pedidos={pedidos} usuario={usuario}/>
              {(()=>{
                const miProceso=usuario?.proceso;
                if(!miProceso||miProceso==="orden")return null;
                const pendientesEntregados=pedidos.filter(p=>
                  p.entregado&&
                  (p.procesos_activos||[]).includes(miProceso)&&
                  (p.procesos||{})[miProceso]!=="listo"
                );
                if(!pendientesEntregados.length)return null;
                return(
                  <div style={{background:"#f59e0b15",border:"1.5px solid #f59e0b44",padding:"10px 14px",marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#f59e0b",letterSpacing:1,marginBottom:6}}>📋 PEDIDOS ENTREGADOS SIN MARCAR ({pendientesEntregados.length})</div>
                    <div style={{fontSize:11,color:"#5a4a3a",marginBottom:8}}>Estos pedidos ya fueron entregados. Por favor marcá tu proceso como listo:</div>
                    {pendientesEntregados.map(p=>(
                      <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:"#fff",border:"1px solid #f59e0b44",marginBottom:4}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:500}}>{p.cliente}</div>
                          <div style={{fontSize:10,color:"#8a7a6a"}}>{p.id} · Entregado {formatFecha(p.fecha_entrega_real)}</div>
                        </div>
                        <button className="btn" onClick={()=>marcarEtapa(p.id,miProceso,"listo")}
                          style={{padding:"6px 12px",fontSize:10,background:"#10b981",color:"#fff",border:"none",letterSpacing:0.5}}>
                          ✓ MARCAR LISTO
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
            <div style={{display:"flex",alignItems:"center",gap:10}}><img src="https://raw.githubusercontent.com/humbertoobelarg-netizen/Flujo-textil/refs/heads/main/logo_tecnica.jpg" alt="Técnica Remeras" style={{height:36,objectFit:"contain"}}/><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:2,color:"#8a7a6a"}}>{usuario?.rol==="admin"?"ADMIN":usuario?.nombre?.toUpperCase()}</span></div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn" onClick={cargarDatos} style={{padding:"9px 12px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf"}}>↻</button>
              {(usuario?.rol==="admin"||usuario?.nombre==="Gabi")&&<button className="btn" onClick={()=>setShowNuevoPedido(true)} style={{padding:"9px 16px",fontSize:11,background:"#e85d26",color:"#fff",letterSpacing:1}}>+ PEDIDO</button>}
              {usuario?.nombre==="Vivi"&&<button className="btn" onClick={()=>setShowNuevoGasto(true)} style={{padding:"9px 16px",fontSize:11,background:"#1a1208",color:"#f5f0e8",letterSpacing:1}}>+ GASTO</button>}
              <button className="btn" onClick={handleLogout} style={{padding:"9px 14px",fontSize:11,background:"#f5f0e8",border:"1.5px solid #c8bfaf",letterSpacing:1}}>SALIR</button>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",borderBottom:"1.5px solid #d8d0c0",background:"#fff",paddingLeft:12}}>
            {[["pedidos","PEDIDOS"],["stock","STOCK"],["tablero","TABLERO"],["equipo","EQUIPO"],["asistencia","ASISTENCIA"],["finanzas","FINANZAS"],["mis_gastos","MIS GASTOS"]].filter(([k])=>{
              if(usuario?.rol==="admin")return true;
              if(k==="equipo")return false;
              if(k==="asistencia")return usuario?.rol==="admin"||["Vivi","Gabi"].includes(usuario?.nombre);
              if(k==="finanzas")return usuario?.nombre==="Gabi";
              if(k==="stock")return usuario?.rol==="admin"||usuario?.nombre==="Vivi";
              if(k==="mis_gastos")return usuario?.nombre==="Vivi";
              return true;
            }).map(([k,l])=>(
              <div key={k} className={`tab${adminTab===k?" active":""}`} onClick={()=>setAdminTab(k)} style={{fontSize:11,letterSpacing:2}}>{l}</div>
            ))}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:20}}>

            {adminTab==="pedidos"&&(
              <div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,display:"flex",alignItems:"center",gap:6}}>
                    ORDENAR POR:
                    {[["entrega","📅 F. Entrega"],["pedido","📝 F. Pedido"]].map(([k,l])=>(
                      <button key={k} className="btn" onClick={()=>setOrdenPor(k)}
                        style={{padding:"5px 10px",fontSize:11,background:ordenPor===k?"#1a1208":"#f5f0e8",color:ordenPor===k?"#f5f0e8":"#1a1208",border:"1.5px solid #d8d0c0",letterSpacing:0.5}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,background:"#fff",border:"1.5px solid #d8d0c0",padding:"10px 14px"}}>
                  <span style={{fontSize:16}}>🔍</span>
                  <input type="text" placeholder="Buscar por cliente, número o responsable..." value={busqueda} onChange={e=>setBusqueda(e.target.value);setPagina(1)} style={{flex:1,border:"none",background:"transparent",fontSize:13,outline:"none",padding:0}}/>
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
                  const nuevos=pedidosFiltrados.filter(p=>pedidoProgreso(p)===0&&!p.entregado);
                  const enProc=pedidosFiltrados.filter(p=>pedidoProgreso(p)>0&&pedidoProgreso(p)<100&&!p.entregado);
                  const term=pedidosFiltrados.filter(p=>pedidoProgreso(p)===100&&!p.entregado);
                  const entregados=pedidosFiltrados.filter(p=>p.entregado);
                  const totalPaginas=Math.ceil(pedidosFiltrados.length/ITEMS_POR_PAGINA);
                  const pedidosPaginados=pedidosFiltrados.slice((pagina-1)*ITEMS_POR_PAGINA,pagina*ITEMS_POR_PAGINA);
                  const nuevosP=pedidosPaginados.filter(p=>pedidoProgreso(p)===0&&!p.entregado);
                  const enProcP=pedidosPaginados.filter(p=>pedidoProgreso(p)>0&&pedidoProgreso(p)<100&&!p.entregado);
                  const termP=pedidosPaginados.filter(p=>pedidoProgreso(p)===100&&!p.entregado);
                  const entregadosP=pedidosPaginados.filter(p=>p.entregado);
                  const grupos=[{titulo:"PEDIDOS NUEVOS",icon:"📋",color:"#ef4444",items:nuevosP},{titulo:"EN PROCESO",icon:"⚙️",color:"#f59e0b",items:enProcP},{titulo:"TERMINADOS",icon:"✅",color:"#10b981",items:termP},{titulo:"ENTREGADOS",icon:"🚀",color:"#64748b",items:entregadosP}];
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
                {cargando&&<div style={{padding:40,textAlign:"center",color:"#b0a898",fontSize:13}}>⏳ Cargando...</div>}
                {!cargando&&!pedidosFiltrados.length&&<div style={{padding:40,textAlign:"center",color:"#b0a898",fontSize:13}}>{busqueda||filtroMes?"Sin resultados":"No hay pedidos."}</div>}
                {!cargando&&pedidosFiltrados.length>ITEMS_POR_PAGINA&&<div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:12,padding:"16px 0",borderTop:"1px solid #e8e0d0"}}>
                  <button className="btn" onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={pagina===1} style={{padding:"6px 14px",fontSize:12,background:pagina===1?"#f0ece4":"#f5f0e8",border:"1.5px solid #c8bfaf",opacity:pagina===1?0.5:1}}>← Anterior</button>
                  <span style={{fontSize:12,color:"#8a7a6a"}}>Página {pagina} de {Math.ceil(pedidosFiltrados.length/ITEMS_POR_PAGINA)}</span>
                  <button className="btn" onClick={()=>setPagina(p=>Math.min(Math.ceil(pedidosFiltrados.length/ITEMS_POR_PAGINA),p+1))} disabled={pagina===Math.ceil(pedidosFiltrados.length/ITEMS_POR_PAGINA)} style={{padding:"6px 14px",fontSize:12,background:"#f5f0e8",border:"1.5px solid #c8bfaf",opacity:pagina===Math.ceil(pedidosFiltrados.length/ITEMS_POR_PAGINA)?0.5:1}}>Siguiente →</button>
                </div>}
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
                {key:"combustible",label:"Combustible",icon:"⛽",grupo:"Operativo"},
                {key:"marketing",label:"Marketing",icon:"📢",grupo:"Comercial"},
                {key:"impuestos",label:"Impuestos",icon:"🏛️",grupo:"Comercial"},
                {key:"flia_obelar",label:"Flia. Obelar Codas",icon:"👨‍👩‍👧",grupo:"Personal"},
                {key:"prestamos",label:"Préstamos",icon:"🏦",grupo:"Personal"},
                {key:"deuda_informal",label:"Deuda Informal",icon:"📝",grupo:"Personal"},
                {key:"otros",label:"Otros",icon:"📦",grupo:"Otros"},
              ];
              const CATEGORIAS=CATEGORIAS_ALL.filter(cat=>{
                if(["flia_obelar","prestamos","deuda_informal"].includes(cat.key)){
                  return usuario?.rol==="admin"||usuario?.nombre==="Gabi";
                }
                return true;
              });
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
                  {/* Lista de gastos agrupados por categoría */}
                  <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:8}}>GASTOS REGISTRADOS</div>
                  {gastosFiltrados.length===0&&<div style={{padding:20,textAlign:"center",color:"#b0a898",fontSize:12}}>No hay gastos registrados en este período</div>}
                  {CATEGORIAS.map(catInfo=>{
                    const gastosCategoria=[...gastosFiltrados].filter(g=>g.categoria===catInfo.key).sort((a,b)=>b.fecha.localeCompare(a.fecha));
                    if(gastosCategoria.length===0)return null;
                    const totalCat=gastosCategoria.reduce((s,g)=>s+(parseFloat(g.monto)||0),0);
                    return(
                      <GrupoColapsable key={catInfo.key} titulo={`${catInfo.label} (${gastosCategoria.length})`} icon={catInfo.icon} color="#e85d26" count={"$"+totalCat.toLocaleString("es-AR")}>
                        {gastosCategoria.map(g=>(
                          <div key={g.id} className="card" style={{padding:"12px 16px",marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:500}}>{g.descripcion}</div>
                              <div style={{fontSize:10,color:"#8a7a6a",display:"flex",alignItems:"center",gap:6}}>
                                {formatFecha(g.fecha)}
                                {g.tipo==="previsto"&&<span style={{background:"#f59e0b22",color:"#f59e0b",fontSize:9,padding:"1px 6px",fontWeight:600}}>PREVISTO</span>}
                              </div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:14,fontWeight:600,color:"#ef4444"}}>${parseFloat(g.monto).toLocaleString("es-AR")}</div>
                            </div>
                            {usuario?.rol==="admin"&&<button className="btn" onClick={()=>eliminarGasto(g.id)} style={{padding:"4px 8px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",color:"#8a7a6a"}}>✕</button>}
                          </div>
                        ))}
                      </GrupoColapsable>
                    );
                  })}
                </div>
              );
            })()}

            {adminTab==="stock"&&(()=>{
              const TIPOS_TEJIDO={"90":{label:"Jersey 90cm",rendimiento:3.6,color:"#06b6d4"},"120":{label:"Jersey 1.20m",rendimiento:3,color:"#a855f7"},"rib":{label:"Rib 0.70m (cuello)",rendimiento:2.3,color:"#f59e0b"}};
              const calcPPP=(items)=>{
                const totalKg=items.reduce((s,i)=>s+(parseFloat(i.kilos)||0),0);
                const totalGs=items.reduce((s,i)=>s+(parseFloat(i.total)||0),0);
                const ppp=totalKg>0?totalGs/totalKg:0;
                return{totalKg,totalGs,ppp};
              };
              return(
                <div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8,marginBottom:16}}>
                    <button className="btn" onClick={()=>setShowNuevoAjuste(true)} style={{padding:"12px",fontSize:12,background:"#f59e0b",color:"#fff",letterSpacing:1}}>+ AJUSTE DE INVENTARIO (sin costo)</button>
                  </div>
                  <div style={{padding:"10px 14px",background:"#f5f0e8",border:"1.5px solid #d8d0c0",marginBottom:16,fontSize:12,color:"#8a7a6a"}}>
                    💡 Para registrar compras con factura, usá <strong>FINANZAS → + GASTO → Tejido</strong>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
                    {Object.entries(TIPOS_TEJIDO).map(([key,info])=>{
                      const items=stockTejido.filter(s=>s.ancho===key);
                      const datos=calcPPP(items);
                      const costoMetro=datos.ppp>0?datos.ppp/info.rendimiento:0;
                      return(
                        <div key={key} className="card" style={{padding:"12px"}}>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1,marginBottom:6,color:info.color}}>{info.label.toUpperCase()}</div>
                          <div style={{fontSize:9,color:"#8a7a6a",marginBottom:2}}>Stock total</div>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,marginBottom:4}}>{datos.totalKg.toFixed(1)} kg</div>
                          {(()=>{const pc={};items.forEach(s=>{const col=s.color||"-";if(!pc[col])pc[col]=0;pc[col]+=parseFloat(s.kilos)||0;});return Object.entries(pc).filter(([,kg])=>kg>0).map(([col,kg])=>(<div key={col} style={{display:"flex",justifyContent:"space-between",fontSize:9,padding:"2px 4px",background:"#f5f0e8",marginBottom:1}}><span>{col}</span><span style={{fontWeight:600}}>{kg.toFixed(1)}kg</span></div>));})()}
                          <div style={{fontSize:9,color:"#8a7a6a",marginTop:6,marginBottom:2}}>PPP</div>
                          <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>${Math.round(datos.ppp).toLocaleString("es-AR")}/kg</div>
                          <div style={{padding:"6px",background:info.color+"15",border:`1px solid ${info.color}44`}}>
                            <div style={{fontSize:9,color:"#8a7a6a"}}>Costo/metro</div>
                            <div style={{fontSize:14,fontWeight:600,color:info.color}}>${Math.round(costoMetro).toLocaleString("es-AR")}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:8}}>HISTORIAL DE COMPRAS</div>
                  {stockTejido.length===0&&<div style={{padding:20,textAlign:"center",color:"#b0a898",fontSize:12}}>No hay compras registradas</div>}
                  {[...stockTejido].sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(s=>{
                    const esAjuste=s.proveedor==="AJUSTE"||s.total===0;
                    return(
                      <div key={s.id} className="card" style={{padding:"12px 16px",marginBottom:6,display:"flex",alignItems:"center",gap:10,borderLeft:`3px solid ${esAjuste?"#f59e0b":TIPOS_TEJIDO[s.ancho]?.color||"#8a7a6a"}`}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:500}}>{TIPOS_TEJIDO[s.ancho]?.label||s.ancho} · {esAjuste?<span style={{background:"#f59e0b22",color:"#f59e0b",fontSize:10,padding:"1px 6px"}}>AJUSTE</span>:s.proveedor}</div>
                          <div style={{fontSize:10,color:"#8a7a6a"}}>{s.kilos}kg{esAjuste&&s.motivo?` · ${s.motivo}`:""}{esAjuste&&s.descripcion?` · ${s.descripcion}`:""} · {formatFecha(s.fecha)}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          {!esAjuste&&<div style={{fontSize:14,fontWeight:600,color:"#06b6d4"}}>${parseFloat(s.total).toLocaleString("es-AR")}</div>}
                          {esAjuste&&<div style={{fontSize:12,color:"#f59e0b"}}>{parseFloat(s.kilos)>0?"+":""}{s.kilos}kg</div>}
                        </div>
                        {(usuario?.rol==="admin"||usuario?.nombre==="Vivi")&&<button className="btn" onClick={()=>eliminarCompraTejido(s.id)} style={{padding:"4px 8px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",color:"#8a7a6a"}}>✕</button>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {adminTab==="mis_gastos"&&(()=>{
              const CATEGORIAS_VIVI=[
                {key:"mat_tejido",label:"Tejido",icon:"🧵"},
                {key:"mat_serigrafia",label:"Serigrafía / DTF / Sub",icon:"🖨️"},
                {key:"mat_confeccion",label:"Confección / Bordado",icon:"🪡"},
                {key:"mat_empaque",label:"Empaque / Limpieza",icon:"📦"},
                {key:"pago_terceros",label:"Pago Tercerizados",icon:"🤝"},
                {key:"mano_obra",label:"Mano de obra",icon:"👷"},
                {key:"envio",label:"Envío de pedidos",icon:"🚚"},
                {key:"combustible",label:"Combustible",icon:"⛽"},
                {key:"alquiler",label:"Alquiler",icon:"🏠"},
                {key:"servicios",label:"Servicios",icon:"💡"},
                {key:"mantenimiento",label:"Mantenimiento",icon:"🔧"},
                {key:"marketing",label:"Marketing",icon:"📢"},
                {key:"impuestos",label:"Impuestos",icon:"🏛️"},
                {key:"otros",label:"Otros",icon:"📦"},
              ];
              const misGastos=[...gastos].filter(g=>g.registrado_por===usuario?.nombre).sort((a,b)=>b.fecha.localeCompare(a.fecha));
              const total=misGastos.reduce((s,g)=>s+(parseFloat(g.monto)||0),0);
              return(
                <div>
                  <button className="btn" onClick={()=>setShowNuevoGasto(true)} style={{width:"100%",padding:"12px",fontSize:12,background:"#e85d26",color:"#fff",letterSpacing:1,marginBottom:12}}>+ REGISTRAR GASTO</button>
                  {misGastos.length>0&&(
                    <div style={{padding:"12px 16px",background:"#1a1208",color:"#f5f0e8",marginBottom:12}}>
                      <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1}}>TOTAL MIS GASTOS</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#e85d26"}}>${total.toLocaleString("es-AR")}</div>
                    </div>
                  )}
                  {misGastos.length===0&&<div style={{padding:20,textAlign:"center",color:"#b0a898",fontSize:12}}>No registraste gastos todavía</div>}
                  {CATEGORIAS_VIVI.map(catInfo=>{
                    const gastosCategoria=misGastos.filter(g=>g.categoria===catInfo.key);
                    if(gastosCategoria.length===0)return null;
                    const totalCat=gastosCategoria.reduce((s,g)=>s+(parseFloat(g.monto)||0),0);
                    return(
                      <GrupoColapsable key={catInfo.key} titulo={catInfo.label} icon={catInfo.icon} color="#e85d26" count={"$"+totalCat.toLocaleString("es-AR")}>
                        {gastosCategoria.map(g=>(
                          <div key={g.id} className="card" style={{padding:"12px 16px",marginBottom:4,display:"flex",alignItems:"center",gap:10}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:500}}>{g.descripcion}</div>
                              <div style={{fontSize:10,color:"#8a7a6a",display:"flex",alignItems:"center",gap:6}}>
                                {formatFecha(g.fecha)}
                                {g.tipo==="previsto"&&<span style={{background:"#f59e0b22",color:"#f59e0b",fontSize:9,padding:"1px 6px",fontWeight:600}}>PREVISTO</span>}
                              </div>
                              {(g.pedidos_vinculados||[]).length>0&&(
                                <div style={{fontSize:10,color:"#e85d26",marginTop:2}}>
                                  Pedidos: {normalizarVinculados(g.pedidos_vinculados,g.monto).map(v=>v.id).join(", ")}
                                </div>
                              )}
                            </div>
                            <div style={{fontSize:14,fontWeight:600,color:"#ef4444"}}>${parseFloat(g.monto).toLocaleString("es-AR")}</div>
                          </div>
                        ))}
                      </GrupoColapsable>
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

            {adminTab==="asistencia"&&(()=>{
              const registrosHoy=asistencia.filter(a=>a.hora&&a.hora.startsWith(asistenciaFecha));
              const presentes=new Set(registrosHoy.map(a=>a.empleado_id));
              async function crearEmpleado(){
                if(!formEmpleado.nombre||!formEmpleado.codigo){showToast("Nombre y código son requeridos","#ef4444");return;}
                const nuevo={nombre:formEmpleado.nombre,codigo:formEmpleado.codigo.toUpperCase(),activo:true};
                const r=await dbInsert("empleados",nuevo);
                if(r&&r[0]){setEmpleados(prev=>[...prev,r[0]]);setFormEmpleado({nombre:"",codigo:""});setShowNuevoEmpleado(false);showToast("✓ Empleado creado");}
                else showToast("Error al crear empleado","#ef4444");
              }
              async function eliminarEmpleado(id){
                if(!window.confirm("¿Eliminar empleado?"))return;
                await dbPatch("empleados",id,{activo:false});
                setEmpleados(prev=>prev.filter(e=>e.id!==id));
                showToast("Empleado eliminado");
              }
              async function eliminarRegistro(id){
                await dbDelete("asistencia",id);
                setAsistencia(prev=>prev.filter(a=>a.id!==id));
                showToast("Registro eliminado");
              }
              function formatHora(iso){if(!iso)return"-";return iso.length>=16?iso.slice(11,16):new Date(iso).toLocaleTimeString("es-PY",{hour:"2-digit",minute:"2-digit",timeZone:"America/Asuncion"});}
              const empleadosConRegistros=empleados.map(emp=>{
                const regs=registrosHoy.filter(a=>a.empleado_id===emp.id).sort((a,b)=>a.hora.localeCompare(b.hora));
                const entrada=regs.find(a=>a.tipo==="entrada");
                const salida=regs.find(a=>a.tipo==="salida");
                return{...emp,entrada,salida,presente:presentes.has(emp.id)};
              });
              const linkBase=`${window.location.origin}${window.location.pathname}#asistencia/`;
              return(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
                    <div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2}}>CONTROL DE ASISTENCIA</div>
                      <div style={{fontSize:11,color:"#8a7a6a"}}>Los empleados marcan desde su celular</div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <input type="date" value={asistenciaFecha} onChange={e=>setAsistenciaFecha(e.target.value)} style={{fontSize:12,padding:"7px 10px"}}/>
                      {(usuario?.rol==="admin"||usuario?.nombre==="Vivi")&&<button className="btn" onClick={()=>setShowNuevoEmpleado(true)} style={{padding:"9px 14px",fontSize:11,background:"#1a1208",color:"#f5f0e8",letterSpacing:1}}>+ EMPLEADO</button>}
                    </div>
                  </div>

                  {/* Resumen del día */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
                    <div className="card" style={{padding:"12px 14px"}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:"#10b981",lineHeight:1}}>{empleadosConRegistros.filter(e=>e.entrada).length}</div>
                      <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1}}>PRESENTES</div>
                    </div>
                    <div className="card" style={{padding:"12px 14px"}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:"#ef4444",lineHeight:1}}>{empleados.length-empleadosConRegistros.filter(e=>e.entrada).length}</div>
                      <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1}}>AUSENTES</div>
                    </div>
                    <div className="card" style={{padding:"12px 14px"}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:"#1a1208",lineHeight:1}}>{empleados.length}</div>
                      <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1}}>TOTAL EMPLS</div>
                    </div>
                  </div>

                  {/* Toggle vista */}
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    {[["semana","📅 SEMANA"],["mes","📆 MES"],["dia","📋 DÍA"]].map(([k,l])=>(
                      <button key={k} className="btn" onClick={()=>setVistaAsistencia(k)}
                        style={{flex:1,padding:"8px",fontSize:11,background:vistaAsistencia===k?"#1a1208":"#f5f0e8",color:vistaAsistencia===k?"#f5f0e8":"#1a1208",border:"1.5px solid #d8d0c0",letterSpacing:1}}>
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* VISTA SEMANAL */}
                  {vistaAsistencia==="semana"&&(()=>{
                    const lunes=getLunesDeSemana(semanaOffset);
                    const diasSemana=[0,1,2,3,4,5].map(i=>({
                      fecha:addDias(lunes,i),
                      nombre:["Lun","Mar","Mié","Jue","Vie","Sáb"][i],
                      diaSemana:i+1===7?0:i+1
                    }));
                    const DIAS_NOMBRES=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
                    return(
                      <div>
                        {/* Navegación semana */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                          <button className="btn" onClick={()=>setSemanaOffset(o=>o-1)} style={{padding:"8px 14px",fontSize:14,background:"transparent",border:"1.5px solid #d8d0c0"}}>←</button>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1}}>
                              {formatFecha(lunes)} — {formatFecha(addDias(lunes,5))}
                            </div>
                            {semanaOffset===0&&<div style={{fontSize:10,color:"#e85d26"}}>SEMANA ACTUAL</div>}
                          </div>
                          <button className="btn" onClick={()=>setSemanaOffset(o=>o+1)} style={{padding:"8px 14px",fontSize:14,background:"transparent",border:"1.5px solid #d8d0c0"}} disabled={semanaOffset>=0}>→</button>
                        </div>

                        {/* Planilla por empleado */}
                        {empleados.map(emp=>(
                          <div key={emp.id} className="card" style={{marginBottom:10,overflow:"hidden"}}>
                            <div style={{padding:"8px 12px",background:"#1a1208",color:"#f5f0e8",display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:28,height:28,background:"#e85d26",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>{emp.nombre[0]}</div>
                              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:1}}>{emp.nombre}</span>
                              <span style={{fontSize:10,color:"#8a7a6a",marginLeft:"auto"}}>{emp.codigo}</span>
                            </div>
                            <div style={{overflowX:"auto"}}>
                              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:400}}>
                                <thead>
                                  <tr style={{background:"#f5f0e8"}}>
                                    <th style={{padding:"5px 8px",textAlign:"left",fontSize:9,color:"#8a7a6a",letterSpacing:1,fontWeight:600}}>DÍA</th>
                                    <th style={{padding:"5px 8px",textAlign:"center",fontSize:9,color:"#8a7a6a",letterSpacing:1,fontWeight:600}}>ENTRADA</th>
                                    <th style={{padding:"5px 8px",textAlign:"center",fontSize:9,color:"#8a7a6a",letterSpacing:1,fontWeight:600}}>SAL. ALM.</th>
                                    <th style={{padding:"5px 8px",textAlign:"center",fontSize:9,color:"#8a7a6a",letterSpacing:1,fontWeight:600}}>VTA. ALM.</th>
                                    <th style={{padding:"5px 8px",textAlign:"center",fontSize:9,color:"#8a7a6a",letterSpacing:1,fontWeight:600}}>SALIDA</th>
                                    <th style={{padding:"5px 8px",textAlign:"center",fontSize:9,color:"#8a7a6a",letterSpacing:1,fontWeight:600}}>ESTADO</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {diasSemana.map(({fecha,nombre,diaSemana})=>{
                                    const esSabado=diaSemana===6;
                                    const tieneOblig=tieneHorario(emp.nombre,diaSemana);
                                    const regsdia=asistencia.filter(a=>a.empleado_id===emp.id&&a.hora&&a.hora.startsWith(fecha)).sort((a,b)=>a.hora.localeCompare(b.hora));
                                    const entrada=regsdia.find(a=>a.tipo==="entrada");
                                    const salidaAlm=regsdia.find(a=>a.tipo==="salida_almuerzo");
                                    const vueltas=regsdia.filter(a=>a.tipo==="vuelta_almuerzo"||a.tipo==="entrada_almuerzo");
                                    const vuelta=vueltas[0];
                                    const salida=regsdia.find(a=>a.tipo==="salida");
                                    const limiteEntrada=esSabado?"08:00":"07:00";
                                    const limiteVuelta="12:45";
                                    const entradaTarde=entrada&&esTarde(entrada.hora,limiteEntrada);
                                    const vueltaTarde=vuelta&&esTarde(vuelta.hora,limiteVuelta);
                                    const esHoy=fecha===hoy();
                                    return(
                                      <tr key={fecha} style={{borderBottom:"1px solid #f0ece4",background:esHoy?"#fef3ee":"#fff"}}>
                                        <td style={{padding:"6px 8px",fontWeight:esHoy?600:400}}>
                                          {nombre} <span style={{fontSize:9,color:"#8a7a6a"}}>{fecha.slice(8)}/{fecha.slice(5,7)}</span>
                                        </td>
                                        <td style={{padding:"6px 8px",textAlign:"center"}}>
                                          {entrada?(
                                            <span style={{fontWeight:600,color:entradaTarde?"#ef4444":"#10b981"}}>
                                              {formatHora(entrada.hora)}{entradaTarde?" ⚠":""}
                                            </span>
                                          ):(tieneOblig?<span style={{color:"#c8bfaf"}}>--:--</span>:<span style={{color:"#e8e0d0",fontSize:9}}>-</span>)}
                                        </td>
                                        <td style={{padding:"6px 8px",textAlign:"center"}}>
                                          {!esSabado?(salidaAlm?(
                                            <span style={{fontWeight:600,color:"#f59e0b"}}>{formatHora(salidaAlm.hora)}</span>
                                          ):(tieneOblig?<span style={{color:"#c8bfaf"}}>--:--</span>:<span style={{color:"#e8e0d0",fontSize:9}}>-</span>)):<span style={{color:"#e8e0d0",fontSize:9}}>-</span>}
                                        </td>
                                        <td style={{padding:"6px 8px",textAlign:"center"}}>
                                          {!esSabado?(vuelta?(
                                            <span style={{fontWeight:600,color:vueltaTarde?"#ef4444":"#10b981"}}>
                                              {formatHora(vuelta.hora)}{vueltaTarde?" ⚠":""}
                                            </span>
                                          ):(tieneOblig?<span style={{color:"#c8bfaf"}}>--:--</span>:<span style={{color:"#e8e0d0",fontSize:9}}>-</span>)):<span style={{color:"#e8e0d0",fontSize:9}}>-</span>}
                                        </td>
                                        <td style={{padding:"6px 8px",textAlign:"center"}}>
                                          {salida?(
                                            <span style={{fontWeight:600,color:"#64748b"}}>{formatHora(salida.hora)}</span>
                                          ):(tieneOblig?<span style={{color:"#c8bfaf"}}>--:--</span>:<span style={{color:"#e8e0d0",fontSize:9}}>-</span>)}
                                        </td>
                                        <td style={{padding:"6px 8px",textAlign:"center"}}>
                                          {!tieneOblig?<span style={{fontSize:9,color:"#c8bfaf"}}>LIBRE</span>:
                                          !entrada?<span style={{fontSize:9,color:"#ef4444",fontWeight:600}}>AUSENTE</span>:
                                          (entradaTarde||vueltaTarde)?<span style={{fontSize:9,color:"#f59e0b",fontWeight:600}}>TARDE</span>:
                                          <span style={{fontSize:9,color:"#10b981",fontWeight:600}}>OK</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                        {empleados.length===0&&<div style={{padding:40,textAlign:"center",color:"#b0a898",fontSize:13}}>No hay empleados registrados</div>}
                      </div>
                    );
                  })()}

                  {/* VISTA MENSUAL */}
                  {vistaAsistencia==="mes"&&(()=>{
                    const {diasDelMes,nombreMes,year}=getMesInfo(mesOffset);
                    return(
                      <div>
                        {/* Navegación mes */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                          <button className="btn" onClick={()=>setMesOffset(o=>o-1)} style={{padding:"8px 14px",fontSize:14,background:"transparent",border:"1.5px solid #d8d0c0"}}>←</button>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2}}>{nombreMes} {year}</div>
                            {mesOffset===0&&<div style={{fontSize:10,color:"#e85d26"}}>MES ACTUAL</div>}
                          </div>
                          <button className="btn" onClick={()=>setMesOffset(o=>o+1)} style={{padding:"8px 14px",fontSize:14,background:"transparent",border:"1.5px solid #d8d0c0"}} disabled={mesOffset>=0}>→</button>
                        </div>

                        {/* Resumen del mes por empleado */}
                        {empleados.map(emp=>{
                          let tardanzas=0,ausencias=0,presentes=0;
                          diasDelMes.forEach(({fecha,diaSemana})=>{
                            const tieneOblig=tieneHorario(emp.nombre,diaSemana);
                            if(!tieneOblig)return;
                            const regsdia=asistencia.filter(a=>a.empleado_id===emp.id&&a.hora&&a.hora.startsWith(fecha));
                            const entrada=regsdia.find(a=>a.tipo==="entrada");
                            const vuelta=regsdia.find(a=>a.tipo==="vuelta_almuerzo"||a.tipo==="entrada_almuerzo");
                            const esSabado=diaSemana===6;
                            const limiteEntrada=esSabado?"08:00":"07:00";
                            if(!entrada){ausencias++;return;}
                            presentes++;
                            if(esTarde(entrada.hora,limiteEntrada))tardanzas++;
                            if(!esSabado&&vuelta&&esTarde(vuelta.hora,"12:45"))tardanzas++;
                          });
                          return(
                            <div key={emp.id} className="card" style={{marginBottom:10,overflow:"hidden"}}>
                              <div style={{padding:"8px 12px",background:"#1a1208",color:"#f5f0e8",display:"flex",alignItems:"center",gap:10}}>
                                <div style={{width:28,height:28,background:"#e85d26",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>{emp.nombre[0]}</div>
                                <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:1,flex:1}}>{emp.nombre}</span>
                              </div>
                              {/* Resumen */}
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0,borderBottom:"1px solid #e8e0d0"}}>
                                <div style={{padding:"10px",textAlign:"center",borderRight:"1px solid #e8e0d0"}}>
                                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#10b981",lineHeight:1}}>{presentes}</div>
                                  <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1}}>PRESENTES</div>
                                </div>
                                <div style={{padding:"10px",textAlign:"center",borderRight:"1px solid #e8e0d0"}}>
                                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#ef4444",lineHeight:1}}>{ausencias}</div>
                                  <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1}}>AUSENCIAS</div>
                                </div>
                                <div style={{padding:"10px",textAlign:"center"}}>
                                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#f59e0b",lineHeight:1}}>{tardanzas}</div>
                                  <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1}}>TARDANZAS</div>
                                </div>
                              </div>
                              {/* Detalle por día */}
                              <div style={{overflowX:"auto"}}>
                                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,minWidth:500}}>
                                  <thead>
                                    <tr style={{background:"#f5f0e8"}}>
                                      <th style={{padding:"4px 8px",textAlign:"left",fontSize:9,color:"#8a7a6a",fontWeight:600}}>DÍA</th>
                                      <th style={{padding:"4px 8px",textAlign:"center",fontSize:9,color:"#8a7a6a",fontWeight:600}}>ENTRADA</th>
                                      <th style={{padding:"4px 8px",textAlign:"center",fontSize:9,color:"#8a7a6a",fontWeight:600}}>VUELTA</th>
                                      <th style={{padding:"4px 8px",textAlign:"center",fontSize:9,color:"#8a7a6a",fontWeight:600}}>SALIDA</th>
                                      <th style={{padding:"4px 8px",textAlign:"center",fontSize:9,color:"#8a7a6a",fontWeight:600}}>EST.</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {diasDelMes.map(({fecha,dia,diaSemana,nombre})=>{
                                      const esSabado=diaSemana===6;
                                      const tieneOblig=tieneHorario(emp.nombre,diaSemana);
                                      const regsdia=asistencia.filter(a=>a.empleado_id===emp.id&&a.hora&&a.hora.startsWith(fecha)).sort((a,b)=>a.hora.localeCompare(b.hora));
                                      const entrada=regsdia.find(a=>a.tipo==="entrada");
                                      const salidaAlm=regsdia.find(a=>a.tipo==="salida_almuerzo");
                                      const vuelta=regsdia.find(a=>a.tipo==="vuelta_almuerzo"||a.tipo==="entrada_almuerzo");
                                      const salida=regsdia.find(a=>a.tipo==="salida");
                                      const limiteEntrada=esSabado?"08:00":"07:00";
                                      const entradaTarde=entrada&&esTarde(entrada.hora,limiteEntrada);
                                      const vueltaTarde=vuelta&&esTarde(vuelta.hora,"12:45");
                                      const esHoy=fecha===hoy();
                                      return(
                                        <tr key={fecha} style={{borderBottom:"1px solid #f0ece4",background:esHoy?"#fef3ee":"#fff"}}>
                                          <td style={{padding:"4px 8px",fontWeight:esHoy?600:400,whiteSpace:"nowrap"}}>
                                            {nombre} {dia}
                                          </td>
                                          <td style={{padding:"4px 8px",textAlign:"center"}}>
                                            {entrada?<span style={{fontWeight:600,color:entradaTarde?"#ef4444":"#10b981"}}>{formatHora(entrada.hora)}</span>:tieneOblig?<span style={{color:"#c8bfaf"}}>--</span>:<span style={{color:"#e8e0d0"}}>-</span>}
                                          </td>
                                          <td style={{padding:"4px 8px",textAlign:"center"}}>
                                            {!esSabado?(salidaAlm?<span style={{fontWeight:600,color:"#f59e0b"}}>{formatHora(salidaAlm.hora)}</span>:tieneOblig?<span style={{color:"#c8bfaf"}}>--</span>:<span style={{color:"#e8e0d0"}}>-</span>):<span style={{color:"#e8e0d0"}}>-</span>}
                                          </td>
                                          <td style={{padding:"4px 8px",textAlign:"center"}}>
                                            {!esSabado?(vuelta?<span style={{fontWeight:600,color:vueltaTarde?"#ef4444":"#10b981"}}>{formatHora(vuelta.hora)}</span>:tieneOblig?<span style={{color:"#c8bfaf"}}>--</span>:<span style={{color:"#e8e0d0"}}>-</span>):<span style={{color:"#e8e0d0"}}>-</span>}
                                          </td>
                                          <td style={{padding:"4px 8px",textAlign:"center"}}>
                                            {salida?<span style={{fontWeight:600,color:"#64748b"}}>{formatHora(salida.hora)}</span>:tieneOblig?<span style={{color:"#c8bfaf"}}>--</span>:<span style={{color:"#e8e0d0"}}>-</span>}
                                          </td>
                                          <td style={{padding:"4px 8px",textAlign:"center"}}>
                                            {!tieneOblig?<span style={{fontSize:8,color:"#c8bfaf"}}>-</span>:
                                            !entrada?<span style={{fontSize:8,color:"#ef4444",fontWeight:600}}>AUS</span>:
                                            (entradaTarde||vueltaTarde)?<span style={{fontSize:8,color:"#f59e0b",fontWeight:600}}>⚠</span>:
                                            <span style={{fontSize:8,color:"#10b981",fontWeight:600}}>✓</span>}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* VISTA DIARIA */}
                  {vistaAsistencia==="dia"&&(
                    <div>
                      <div style={{marginBottom:12}}>
                        <input type="date" value={asistenciaFecha} onChange={e=>setAsistenciaFecha(e.target.value)} style={{width:"100%",fontSize:12,padding:"8px"}}/>
                      </div>
                      {empleadosConRegistros.map(emp=>(
                        <div key={emp.id} className="card" style={{padding:"12px 16px",marginBottom:8}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:36,height:36,background:emp.entrada?"#10b981":"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'Bebas Neue',sans-serif",fontSize:16,flexShrink:0}}>{emp.nombre[0].toUpperCase()}</div>
                              <div>
                                <div style={{fontWeight:500,fontSize:13}}>{emp.nombre}</div>
                                <div style={{fontSize:10,color:"#8a7a6a"}}>Código: {emp.codigo}</div>
                              </div>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                              <div style={{textAlign:"center"}}>
                                <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1}}>ENTRADA</div>
                                <div style={{fontSize:13,fontWeight:600,color:emp.entrada?esTarde(emp.entrada.hora,"07:00")?"#ef4444":"#10b981":"#c8bfaf"}}>{emp.entrada?formatHora(emp.entrada.hora):"--:--"}</div>
                              </div>
                              <div style={{textAlign:"center"}}>
                                <div style={{fontSize:9,color:"#8a7a6a",letterSpacing:1}}>SALIDA</div>
                                <div style={{fontSize:13,fontWeight:600,color:emp.salida?"#64748b":"#c8bfaf"}}>{emp.salida?formatHora(emp.salida.hora):"--:--"}</div>
                              </div>
                              <button className="btn" onClick={async()=>{
                                const txt=`${linkBase}${emp.codigo}`;
                                if(navigator.share){navigator.share({title:`Asistencia ${emp.nombre}`,url:txt});}
                                else{navigator.clipboard.writeText(txt).then(()=>showToast("✓ Link copiado"));}
                              }} style={{padding:"6px 10px",fontSize:10,background:"transparent",border:"1.5px solid #06b6d4",color:"#06b6d4",letterSpacing:0.5}}>🔗 LINK</button>
                              {usuario?.rol==="admin"&&<button className="btn" onClick={()=>eliminarEmpleado(emp.id)} style={{padding:"6px 10px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",color:"#8a7a6a"}}>✕</button>}
                            </div>
                          </div>
                        </div>
                      ))}
                      {empleados.length===0&&<div style={{padding:40,textAlign:"center",color:"#b0a898",fontSize:13}}>No hay empleados. Creá el primero con el botón + EMPLEADO</div>}
                    </div>
                  )}

                  {/* Modal nuevo empleado */}
                  {showNuevoEmpleado&&(
                    <div className="modal-bg" onClick={()=>setShowNuevoEmpleado(false)}>
                      <div className="modal" onClick={e=>e.stopPropagation()}>
                        <div style={{padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2}}>NUEVO EMPLEADO</div>
                        <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
                          <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>NOMBRE *</label><input type="text" style={{width:"100%"}} placeholder="Nombre completo" value={formEmpleado.nombre} onChange={e=>setFormEmpleado({...formEmpleado,nombre:e.target.value})}/></div>
                          <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>CÓDIGO ÚNICO *</label><input type="text" style={{width:"100%"}} placeholder="Ej: ANA01, JUAN02" value={formEmpleado.codigo} onChange={e=>setFormEmpleado({...formEmpleado,codigo:e.target.value.toUpperCase().replace(/\s/g,"")})}/>
                            <div style={{fontSize:10,color:"#8a7a6a",marginTop:4}}>Este código forma parte del link de marcado</div>
                          </div>
                          {formEmpleado.nombre&&formEmpleado.codigo&&(
                            <div style={{padding:"10px 12px",background:"#f0fdf4",border:"1.5px solid #10b98144",fontSize:11,color:"#10b981"}}>
                              🔗 Link: {linkBase}{formEmpleado.codigo.toUpperCase()}
                            </div>
                          )}
                          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                            <button className="btn" onClick={()=>setShowNuevoEmpleado(false)} style={{padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1}}>CANCELAR</button>
                            <button className="btn" onClick={crearEmpleado} style={{padding:"10px 20px",fontSize:11,background:"#1a1208",color:"#f5f0e8",letterSpacing:1}}>CREAR</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
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

      {/* MODAL AJUSTE STOCK */}
      {showNuevoAjuste&&(
        <div className="modal-bg" onClick={()=>setShowNuevoAjuste(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#f59e0b"}}>AJUSTE DE INVENTARIO</div>
            <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{padding:"10px",background:"#f59e0b15",border:"1.5px solid #f59e0b44",fontSize:12,color:"#8a7a6a"}}>
                Usá esto para: sobrantes de pedidos, tejido ya en stock, correcciones de inventario, mermas. <strong>Sin costo asociado.</strong>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>FECHA</label><input type="date" style={{width:"100%"}} value={formAjuste.fecha} onChange={e=>setFormAjuste({...formAjuste,fecha:e.target.value})}/></div>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>TIPO DE TEJIDO</label>
                  <select style={{width:"100%"}} value={formAjuste.tipo} onChange={e=>setFormAjuste({...formAjuste,tipo:e.target.value})}>
                    <option value="90">Jersey 90cm</option>
                    <option value="120">Jersey 1.20m</option>
                    <option value="rib">Rib 0.70m</option>
                  </select>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>KILOS *</label><input type="number" style={{width:"100%"}} placeholder="0" value={formAjuste.kilos} onChange={e=>setFormAjuste({...formAjuste,kilos:e.target.value})}/></div>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>MOTIVO</label>
                  <select style={{width:"100%"}} value={formAjuste.motivo} onChange={e=>setFormAjuste({...formAjuste,motivo:e.target.value})}>
                    <option value="sobrante">Sobrante de pedido</option>
                    <option value="stock_inicial">Stock inicial</option>
                    <option value="merma">Merma / descarte</option>
                    <option value="inventario">Corrección de inventario</option>
                  </select>
                </div>
              </div>
              <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>DESCRIPCIÓN (opcional)</label><input type="text" style={{width:"100%"}} placeholder="Ej: Sobrante pedido P085..." value={formAjuste.descripcion} onChange={e=>setFormAjuste({...formAjuste,descripcion:e.target.value})}/></div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn" onClick={()=>setShowNuevoAjuste(false)} style={{padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1}}>CANCELAR</button>
                <button className="btn" onClick={crearAjusteStock} style={{padding:"10px 20px",fontSize:11,background:"#f59e0b",color:"#fff",letterSpacing:1}}>REGISTRAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ENTREGAR PEDIDO */}
      {showEntregarModal&&(
        <div className="modal-bg" onClick={()=>setShowEntregarModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#64748b"}}>🚀 ENTREGAR PEDIDO</div>
            <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{padding:"10px 14px",background:"#f5f0e8",border:"1.5px solid #d8d0c0"}}>
                <div style={{fontSize:13,fontWeight:600}}>{showEntregarModal.cliente}</div>
                <div style={{fontSize:11,color:"#8a7a6a"}}>{showEntregarModal.id} · {showEntregarModal.cantidad} uds</div>
                {(()=>{
                  const tg=calcTotalGral(showEntregarModal.prendas||[]);
                  const pagado=(showEntregarModal.pagos||[]).reduce((s,pg)=>s+(parseFloat(pg.monto)||0),0);
                  const ant=parseFloat(showEntregarModal.anticipo)||0;
                  const saldo=tg-ant-pagado;
                  return tg>0?(
                    <div style={{marginTop:6,fontSize:11}}>
                      <span style={{color:"#8a7a6a"}}>Saldo pendiente: </span>
                      <span style={{fontWeight:600,color:"#e85d26"}}>${saldo.toLocaleString("es-AR")}</span>
                    </div>
                  ):null;
                })()}
              </div>
              <div>
                <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8}}>FORMA DE PAGO AL ENTREGAR</label>
                <div style={{display:"flex",gap:8}}>
                  {[["pagado","✅ Cobrado"],["credito","📋 A crédito"]].map(([k,l])=>(
                    <button key={k} className="btn" onClick={()=>setFormEntrega({...formEntrega,tipoPago:k})}
                      style={{flex:1,padding:"10px",fontSize:12,background:formEntrega.tipoPago===k?"#1a1208":"#f5f0e8",color:formEntrega.tipoPago===k?"#f5f0e8":"#1a1208",border:"1.5px solid #d8d0c0",letterSpacing:0.5}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>MONTO COBRADO AL ENTREGAR *</label>
                <input type="number" min="0" style={{width:"100%"}} placeholder="0.00" value={formEntrega.montoCobrado} onChange={e=>setFormEntrega({...formEntrega,montoCobrado:e.target.value})}/>
              </div>
              {formEntrega.tipoPago==="credito"&&(
                <div>
                  <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>DÍAS DE CRÉDITO *</label>
                  <input type="number" min="1" style={{width:"100%"}} placeholder="Ej: 30" value={formEntrega.diasCredito} onChange={e=>setFormEntrega({...formEntrega,diasCredito:e.target.value})}/>
                </div>
              )}
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn" onClick={()=>setShowEntregarModal(null)} style={{padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1}}>CANCELAR</button>
                <button className="btn" onClick={()=>marcarEntregado(showEntregarModal)} style={{padding:"10px 20px",fontSize:11,background:"#64748b",color:"#fff",letterSpacing:1}}>✓ CONFIRMAR ENTREGA</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CORTE - SELECCIONAR ANCHO */}
      {showModalCorte&&(()=>{
        const p=showModalCorte;
        let mts90=0,mts120=0,mtsRib=0;
        (p.prendas||[]).forEach(pr=>{
          if(isRemera(pr.tipoPrenda)){
            const tej=calcTejidoRemera(pr.talles||{});
            mts90+=tej.a90;mts120+=tej.a120;mtsRib+=tej.rib;
          }
        });
        const colorCuerpo=(p.prendas||[]).find(pr=>isRemera(pr.tipoPrenda))?.cuerpo||"-";
        const RENDS={"90":3.6,"120":3};
        return(
          <div className="modal-bg" onClick={()=>setShowModalCorte(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div style={{padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:"#1a1208"}}>✂️ CONFIRMAR CORTE</div>
              <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
                <div style={{padding:"10px 14px",background:"#f5f0e8"}}>
                  <div style={{fontSize:13,fontWeight:600}}>{p.cliente}</div>
                  <div style={{fontSize:11,color:"#8a7a6a"}}>{p.id} · Color: <strong>{colorCuerpo}</strong></div>
                </div>
                <div>
                  <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:8}}>¿CON QUÉ ANCHO CORTASTE?</label>
                  <div style={{display:"flex",gap:8}}>
                    {[["90","Jersey 90cm"],["120","Jersey 1.20m"]].map(([k,l])=>(
                      <button key={k} className="btn" onClick={()=>setAnchoCorte(k)}
                        style={{flex:1,padding:"14px",fontSize:12,background:anchoCorte===k?"#1a1208":"#f5f0e8",color:anchoCorte===k?"#f5f0e8":"#1a1208",border:"1.5px solid #d8d0c0",letterSpacing:1}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{padding:"10px 14px",background:"#1a1208",color:"#f5f0e8"}}>
                  <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:6}}>SE DESCONTARÁ DEL STOCK</div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                    <span>Jersey {anchoCorte==="90"?"90cm":"1.20m"} · {colorCuerpo}</span>
                    <span>{anchoCorte==="90"?mts90.toFixed(2):mts120.toFixed(2)} mts ({((anchoCorte==="90"?mts90:mts120)/RENDS[anchoCorte]).toFixed(2)} kg)</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                    <span>Rib · {(p.prendas||[]).find(pr=>isRemera(pr.tipoPrenda))?.colorCuello||colorCuerpo}</span>
                    <span>{mtsRib.toFixed(3)} mts ({(mtsRib/2.3).toFixed(3)} kg)</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button className="btn" onClick={()=>setShowModalCorte(null)} style={{padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1}}>CANCELAR</button>
                  <button className="btn" onClick={()=>confirmarCorte(p,anchoCorte)} style={{padding:"10px 20px",fontSize:11,background:"#1a1208",color:"#f5f0e8",letterSpacing:1}}>✓ CONFIRMAR Y DESCONTAR STOCK</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL ASIGNAR TEJIDO DEL STOCK */}
      {showAsignarTejido&&(()=>{
        const p=showAsignarTejido;
        const RENDS={"90":3.6,"120":3,"rib":2.3};
        const TIPOS={"90":{label:"Jersey 90cm",color:"#06b6d4"},"120":{label:"Jersey 1.20m",color:"#a855f7"},"rib":{label:"Rib 0.70m (cuello)",color:"#f59e0b"}};
        // Calculate metros per ancho
        let mts90=0,mts120=0,mtsRib=0;
        (p.prendas||[]).forEach(pr=>{
          if(isRemera(pr.tipoPrenda)){
            const tej=calcTejidoRemera(pr.talles||{});
            mts90+=tej.a90;mts120+=tej.a120;mtsRib+=tej.rib;
          }
        });
        const calcStock=(ancho)=>{
          const items=stockTejido.filter(s=>s.ancho===ancho);
          const totalKg=items.reduce((s,i)=>s+(parseFloat(i.kilos)||0),0);
          const totalGs=items.reduce((s,i)=>s+(parseFloat(i.total)||0),0);
          const ppp=totalKg>0?totalGs/totalKg:0;
          return{totalKg,ppp};
        };
        const stock90=calcStock("90");
        const stock120=calcStock("120");
        const stockRib=calcStock("rib");
        const opciones=[
          {ancho:"90",label:"Jersey 90cm",color:"#06b6d4",mts:mts90,kg:mts90/RENDS["90"],stock:stock90},
          {ancho:"120",label:"Jersey 1.20m",color:"#a855f7",mts:mts120,kg:mts120/RENDS["120"],stock:stock120},
          {ancho:"rib",label:"Rib 0.70m (cuello)",color:"#f59e0b",mts:mtsRib,kg:mtsRib/RENDS["rib"],stock:stockRib},
        ].filter(o=>o.mts>0);
        return(
          <div className="modal-bg" onClick={()=>setShowAsignarTejido(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div style={{padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:"#06b6d4"}}>ASIGNAR TEJIDO DEL STOCK</div>
              <div style={{padding:20}}>
                <div style={{padding:"10px 14px",background:"#f5f0e8",marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:600}}>{p.cliente}</div>
                  <div style={{fontSize:10,color:"#8a7a6a"}}>{p.id} · {p.cantidad} uds</div>
                  {(()=>{const cols=[...new Set((p.prendas||[]).filter(pr=>isRemera(pr.tipoPrenda)).map(pr=>pr.cuerpo).filter(Boolean))];return cols.length>0?(<div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}><span style={{fontSize:9,color:"#8a7a6a"}}>Colores:</span>{cols.map(col=>(<span key={col} style={{fontSize:10,background:"#e85d2222",color:"#e85d26",padding:"1px 6px",fontWeight:600}}>{col}</span>))}</div>):null;})()}
                </div>
                <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1,marginBottom:10}}>ELEGÍ EL TEJIDO A USAR</div>
                {opciones.map(op=>{
                  const costo=Math.round(op.kg*op.stock.ppp);
                  const hayStock=op.stock.totalKg>=op.kg;
                  return(
                    <div key={op.ancho} style={{padding:"14px",border:`1.5px solid ${op.color}44`,marginBottom:8,background:hayStock?"#fff":"#fff0f0"}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:op.color,marginBottom:8}}>{op.label}</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:9,color:"#8a7a6a"}}>NECESITÁS</div>
                          <div style={{fontSize:14,fontWeight:600}}>{op.mts.toFixed(2)} mts</div>
                          <div style={{fontSize:10,color:"#8a7a6a"}}>{op.kg.toFixed(2)} kg</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:9,color:"#8a7a6a"}}>EN STOCK</div>
                          <div style={{fontSize:14,fontWeight:600,color:hayStock?"#10b981":"#ef4444"}}>{op.stock.totalKg.toFixed(2)} kg</div>
                          <div style={{fontSize:10,color:"#8a7a6a"}}>PPP: ${Math.round(op.stock.ppp).toLocaleString("es-AR")}/kg</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:9,color:"#8a7a6a"}}>COSTO EST.</div>
                          <div style={{fontSize:14,fontWeight:600,color:op.color}}>${costo.toLocaleString("es-AR")}</div>
                        </div>
                      </div>
                      {(()=>{
                        const coloresPrenda=[...new Set((p.prendas||[]).filter(pr=>isRemera(pr.tipoPrenda)).map(pr=>pr.cuerpo).filter(Boolean))];
                        const pc={};stockTejido.filter(s=>s.ancho===op.ancho).forEach(s=>{const col=s.color||"-";if(!pc[col])pc[col]=0;pc[col]+=parseFloat(s.kilos)||0;});
                        const colsFilt=Object.entries(pc).filter(([,kg])=>kg>0);
                        return colsFilt.length>0?(<div style={{marginBottom:8}}>{colsFilt.map(([col,kg])=>{const match=coloresPrenda.some(c=>c?.toLowerCase()===col?.toLowerCase());return(<div key={col} style={{display:"flex",justifyContent:"space-between",fontSize:10,padding:"3px 8px",background:match?"#10b98115":"#f5f0e8",border:match?"1px solid #10b98144":"none",marginBottom:2}}><span>{match?"✓ ":""}{col}</span><span style={{fontWeight:600}}>{kg.toFixed(1)} kg</span></div>);})}</div>):null;
                      })()}
                      {!hayStock&&<div style={{fontSize:11,color:"#ef4444",marginBottom:8}}>⚠ Stock insuficiente ({op.stock.totalKg.toFixed(2)}kg disponibles)</div>}
                      <button className="btn" onClick={()=>asignarTejidoStock(p,op.ancho)} disabled={!hayStock||op.stock.ppp===0}
                        style={{width:"100%",padding:"10px",fontSize:11,background:hayStock&&op.stock.ppp>0?op.color:"#c8bfaf",color:"#fff",letterSpacing:1,cursor:hayStock&&op.stock.ppp>0?"pointer":"not-allowed"}}>
                        {op.stock.ppp===0?"SIN PRECIO EN STOCK":hayStock?"✓ USAR ESTE TEJIDO":"SIN STOCK SUFICIENTE"}
                      </button>
                    </div>
                  );
                })}
                <button className="btn" onClick={()=>setShowAsignarTejido(null)} style={{width:"100%",padding:"10px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",color:"#8a7a6a",marginTop:8,letterSpacing:1}}>CANCELAR</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL NUEVA COMPRA TEJIDO */}
      {showNuevaCompra&&(
        <div className="modal-bg" onClick={()=>setShowNuevaCompra(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{padding:"20px 24px",borderBottom:"1.5px solid #d8d0c0",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:"#06b6d4"}}>COMPRA DE TEJIDO</div>
            <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>FECHA</label><input type="date" style={{width:"100%"}} value={formCompra.fecha} onChange={e=>setFormCompra({...formCompra,fecha:e.target.value})}/></div>
                <div><label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>PROVEEDOR</label><input type="text" style={{width:"100%"}} placeholder="Nombre..." value={formCompra.proveedor} onChange={e=>setFormCompra({...formCompra,proveedor:e.target.value})}/></div>
              </div>
              <div style={{fontSize:10,letterSpacing:1,color:"#8a7a6a"}}>ÍTEMS DE LA FACTURA</div>
              {formCompra.items.map((item,idx)=>{
                const subtotal=(parseFloat(item.kilos)||0)*(parseFloat(item.precioKg)||0);
                const RENDS={"90":3.6,"120":3,"rib":2.3};
                const metros=item.kilos?((parseFloat(item.kilos)||0)*RENDS[item.tipo]).toFixed(1):0;
                const pedidoVinc=item.pedidoId?pedidos.find(p=>p.id===item.pedidoId):null;
                return(
                  <div key={idx} style={{padding:"10px",background:"#f5f0e8",border:"1.5px solid #d8d0c0",marginBottom:6}}>
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      <select style={{flex:1}} value={item.tipo} onChange={e=>{const its=[...formCompra.items];its[idx]={...its[idx],tipo:e.target.value};setFormCompra({...formCompra,items:its});}}>
                        <option value="90">Jersey 90cm</option>
                        <option value="120">Jersey 1.20m</option>
                        <option value="rib">Rib 0.70m (cuello)</option>
                      </select>
                      {formCompra.items.length>1&&(
                        <button onClick={()=>setFormCompra({...formCompra,items:formCompra.items.filter((_,i)=>i!==idx)})} style={{border:"none",background:"none",cursor:"pointer",color:"#ef4444",fontSize:16}}>✕</button>
                      )}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      <div><label style={{fontSize:9,color:"#8a7a6a",display:"block",marginBottom:3}}>KILOS</label><input type="number" min="0" style={{width:"100%"}} placeholder="0" value={item.kilos} onChange={e=>{const its=[...formCompra.items];its[idx]={...its[idx],kilos:e.target.value};setFormCompra({...formCompra,items:its});}}/></div>
                      <div><label style={{fontSize:9,color:"#8a7a6a",display:"block",marginBottom:3}}>PRECIO/KG</label><input type="number" min="0" style={{width:"100%"}} placeholder="0.00" value={item.precioKg} onChange={e=>{const its=[...formCompra.items];its[idx]={...its[idx],precioKg:e.target.value};setFormCompra({...formCompra,items:its});}}/></div>
                    </div>
                    {/* Vincular pedido */}
                    <div style={{marginBottom:6}}>
                      <label style={{fontSize:9,color:"#8a7a6a",display:"block",marginBottom:3}}>PEDIDO (opcional)</label>
                      {pedidoVinc?(
                        <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",background:"#e85d2215",border:"1px solid #e85d2244"}}>
                          <span style={{fontSize:11,flex:1}}>{pedidoVinc.id} — {pedidoVinc.cliente}</span>
                          <button onClick={()=>{const its=[...formCompra.items];its[idx]={...its[idx],pedidoId:"",busquedaPedido:""};setFormCompra({...formCompra,items:its});}} style={{border:"none",background:"none",cursor:"pointer",color:"#ef4444",fontSize:13}}>✕</button>
                        </div>
                      ):(
                        <div>
                          <input type="text" placeholder="Buscar pedido por cliente o número..." value={item.busquedaPedido||""} onChange={e=>{const its=[...formCompra.items];its[idx]={...its[idx],busquedaPedido:e.target.value};setFormCompra({...formCompra,items:its});}} style={{width:"100%",fontSize:11}}/>
                          {(item.busquedaPedido||"").trim()&&(
                            <div style={{maxHeight:100,overflowY:"auto",border:"1px solid #d8d0c0",background:"#fff"}}>
                              {pedidos.filter(p=>{const b=(item.busquedaPedido||"").toLowerCase();return(p.cliente||"").toLowerCase().includes(b)||(p.id||"").toLowerCase().includes(b);}).slice(0,5).map(p=>(
                                <div key={p.id} onClick={()=>{const its=[...formCompra.items];its[idx]={...its[idx],pedidoId:p.id,busquedaPedido:""};setFormCompra({...formCompra,items:its});}} style={{padding:"6px 10px",fontSize:11,cursor:"pointer",borderBottom:"1px solid #f0ece4"}}>
                                  {p.id} — {p.cliente} <span style={{color:"#8a7a6a"}}>({p.cantidad} uds)</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {subtotal>0&&(
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"5px 8px",background:"#fff",border:"1px solid #d8d0c0"}}>
                        <span style={{color:"#8a7a6a"}}>≈ {metros} mts</span>
                        <span style={{fontWeight:600,color:"#1a1208"}}>Subtotal: ${subtotal.toLocaleString("es-AR")}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              <button className="btn" onClick={()=>setFormCompra({...formCompra,items:[...formCompra.items,{tipo:"90",color:"",kilos:"",precioKg:"",pedidoId:"",busquedaPedido:""}]})} style={{padding:"8px",fontSize:11,background:"transparent",border:"1.5px dashed #c8bfaf",color:"#8a7a6a",letterSpacing:1}}>+ AGREGAR ÍTEM</button>
              {(()=>{
                const totalFactura=formCompra.items.reduce((s,it)=>s+((parseFloat(it.kilos)||0)*(parseFloat(it.precioKg)||0)),0);
                return totalFactura>0?(
                  <div style={{padding:"10px",background:"#1a1208",color:"#f5f0e8",textAlign:"center"}}>
                    <div style={{fontSize:10,color:"#8a7a6a",letterSpacing:1}}>TOTAL DE LA FACTURA</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#06b6d4"}}>${totalFactura.toLocaleString("es-AR")}</div>
                  </div>
                ):null;
              })()}
              {/* Vincular a pedidos */}
              <div>
                <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>VINCULAR A PEDIDO(S) (opcional)</label>
                <input type="text" placeholder="Buscar por cliente o número..." value={busquedaPedidoStock} onChange={e=>setBusquedaPedidoStock(e.target.value)} style={{width:"100%",marginBottom:6}}/>
                {(formCompra.pedidosVinculados||[]).length>0&&(
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:6}}>
                    {(formCompra.pedidosVinculados||[]).map((v,idx)=>{
                      const ped=pedidos.find(p=>p.id===v.id);
                      return(
                        <div key={v.id} style={{display:"flex",alignItems:"center",gap:6,background:"#e8f4fd",padding:"6px 10px",border:"1px solid #06b6d444"}}>
                          <span style={{fontSize:11,flex:1}}>{v.id} - {ped?.cliente}</span>
                          <input type="number" min="0" placeholder="Monto" value={v.monto}
                            onChange={e=>{const nuevos=[...formCompra.pedidosVinculados];nuevos[idx]={...nuevos[idx],monto:e.target.value};setFormCompra({...formCompra,pedidosVinculados:nuevos});}}
                            style={{width:110,fontSize:11,padding:"5px 8px"}}/>
                          <span onClick={()=>setFormCompra({...formCompra,pedidosVinculados:formCompra.pedidosVinculados.filter(x=>x.id!==v.id)})} style={{cursor:"pointer",fontWeight:600,color:"#ef4444",fontSize:14}}>✕</span>
                        </div>
                      );
                    })}
                    {(()=>{
                      const totalFactura=formCompra.items.reduce((s,it)=>s+((parseFloat(it.kilos)||0)*(parseFloat(it.precioKg)||0)),0);
                      const suma=(formCompra.pedidosVinculados||[]).reduce((s,v)=>s+(parseFloat(v.monto)||0),0);
                      const ok=Math.abs(suma-totalFactura)<=1;
                      return(
                        <div style={{fontSize:11,padding:"6px 10px",background:ok?"#10b98115":"#ef444415",color:ok?"#10b981":"#ef4444"}}>
                          Suma: ${suma.toLocaleString("es-AR")} / Total: ${totalFactura.toLocaleString("es-AR")} {ok?"✓":"⚠ no coincide"}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {busquedaPedidoStock.trim()&&(
                  <div style={{maxHeight:120,overflowY:"auto",border:"1.5px solid #d8d0c0",background:"#fff"}}>
                    {pedidos.filter(p=>{const b=busquedaPedidoStock.toLowerCase();return((p.cliente||"").toLowerCase().includes(b)||(p.id||"").toLowerCase().includes(b))&&!(formCompra.pedidosVinculados||[]).some(v=>v.id===p.id);}).slice(0,8).map(p=>(
                      <div key={p.id} onClick={()=>{
                        const yaHay=(formCompra.pedidosVinculados||[]).length>0;
                        setFormCompra({...formCompra,pedidosVinculados:[...(formCompra.pedidosVinculados||[]),{id:p.id,monto:yaHay?"":""}]});
                        setBusquedaPedidoStock("");
                      }} style={{padding:"8px 10px",fontSize:12,cursor:"pointer",borderBottom:"1px solid #f0ece4"}}>
                        {p.id} - {p.cliente} <span style={{color:"#8a7a6a"}}>({p.cantidad} uds)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {(formCompra.pedidosVinculados||[]).length>0&&(
                <div>
                  <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>TIPO DE GASTO</label>
                  <div style={{display:"flex",gap:8}}>
                    {[["real","✅ Real"],["previsto","🔮 Previsto"]].map(([k,l])=>(
                      <button key={k} className="btn" onClick={()=>setFormCompra({...formCompra,tipoGasto:k})}
                        style={{flex:1,padding:"8px",fontSize:11,background:formCompra.tipoGasto===k?"#1a1208":"#f5f0e8",color:formCompra.tipoGasto===k?"#f5f0e8":"#1a1208",border:"1.5px solid #d8d0c0"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn" onClick={()=>setShowNuevaCompra(false)} style={{padding:"10px 20px",fontSize:11,background:"transparent",border:"1.5px solid #c8bfaf",letterSpacing:1}}>CANCELAR</button>
                <button className="btn" onClick={crearCompraTejido} style={{padding:"10px 20px",fontSize:11,background:"#06b6d4",color:"#fff",letterSpacing:1}}>REGISTRAR</button>
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
                      {key:"combustible",label:"⛽ Combustible",grupo:null},
                      {key:"marketing",label:"📢 Marketing",grupo:"── Comercial ──"},
                      {key:"impuestos",label:"🏛️ Impuestos",grupo:null},
                      {key:"flia_obelar",label:"👨‍👩‍👧 Flia. Obelar Codas",grupo:"── Personal ──"},
                      {key:"prestamos",label:"🏦 Préstamos",grupo:null},
                      {key:"deuda_informal",label:"📝 Deuda Informal",grupo:null},
                      {key:"otros",label:"📦 Otros",grupo:"── Otros ──"},
                    ];
                    const privadas=["flia_obelar","prestamos","deuda_informal"];
                    const puedeVerPrivadas=usuario?.rol==="admin"||usuario?.nombre==="Gabi";
                    const catsFiltradas=cats.filter(c=>!privadas.includes(c.key)||puedeVerPrivadas);
                    return catsFiltradas.map(cat=>(
                      <Fragment key={cat.key}>
                        {cat.grupo&&<option disabled style={{color:"#8a7a6a",fontSize:10}}>{cat.grupo}</option>}
                        <option value={cat.key}>{cat.label}</option>
                      </Fragment>
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
              {formGasto.categoria==="mat_tejido"&&(
                <div style={{padding:"10px",background:"#06b6d415",border:"1.5px solid #06b6d444",fontSize:12}}>
                  <div style={{fontSize:10,color:"#06b6d4",letterSpacing:1,marginBottom:8,fontWeight:600}}>🧵 DETALLES DE COMPRA (se actualiza el stock automáticamente)</div>
                  {(formGasto.itemsTejido||[{tipo:"90",kilos:"",precioKg:""}]).map((item,idx)=>{
                    const RENDS={"90":3.6,"120":3,"rib":2.3};
                    const subtotal=(parseFloat(item.kilos)||0)*(parseFloat(item.precioKg)||0);
                    const metros=item.kilos?((parseFloat(item.kilos)||0)*RENDS[item.tipo]).toFixed(1):0;
                    const items=formGasto.itemsTejido||[{tipo:"90",kilos:"",precioKg:""}];
                    return(
                      <div key={idx} style={{padding:"8px",background:"#fff",border:"1px solid #d8d0c0",marginBottom:6}}>
                        <div style={{display:"flex",gap:8,marginBottom:6}}>
                          <select style={{flex:1,fontSize:11}} value={item.tipo} onChange={e=>{const its=[...items];its[idx]={...its[idx],tipo:e.target.value};setFormGasto({...formGasto,itemsTejido:its});}}>
                            <option value="90">Jersey 90cm (3.6m/kg)</option>
                            <option value="120">Jersey 1.20m (3m/kg)</option>
                            <option value="rib">Rib 0.70m (2.3m/kg)</option>
                          </select>
                          {items.length>1&&<span onClick={()=>setFormGasto({...formGasto,itemsTejido:items.filter((_,i)=>i!==idx)})} style={{cursor:"pointer",color:"#ef4444",fontSize:16,fontWeight:600}}>✕</span>}
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                          <div><label style={{fontSize:9,color:"#8a7a6a",display:"block",marginBottom:2}}>KILOS</label><input type="number" min="0" style={{width:"100%",fontSize:11}} placeholder="0" value={item.kilos} onChange={e=>{const its=[...items];its[idx]={...its[idx],kilos:e.target.value};const total=its.reduce((s,i)=>s+((parseFloat(i.kilos)||0)*(parseFloat(i.precioKg)||0)),0);setFormGasto({...formGasto,itemsTejido:its,monto:total>0?String(total):formGasto.monto});}}/></div>
                          <div><label style={{fontSize:9,color:"#8a7a6a",display:"block",marginBottom:2}}>PRECIO/KG</label><input type="number" min="0" style={{width:"100%",fontSize:11}} placeholder="0" value={item.precioKg} onChange={e=>{const its=[...items];its[idx]={...its[idx],precioKg:e.target.value};const total=its.reduce((s,i)=>s+((parseFloat(i.kilos)||0)*(parseFloat(i.precioKg)||0)),0);setFormGasto({...formGasto,itemsTejido:its,monto:total>0?String(total):formGasto.monto});}}/></div>
                        </div>
                        {subtotal>0&&<div style={{fontSize:10,color:"#8a7a6a",marginTop:4,display:"flex",justifyContent:"space-between"}}><span>≈ {metros} mts</span><span style={{fontWeight:600}}>${subtotal.toLocaleString("es-AR")}</span></div>}
                      </div>
                    );
                  })}
                  <button onClick={()=>setFormGasto({...formGasto,itemsTejido:[...(formGasto.itemsTejido||[{tipo:"90",kilos:"",precioKg:""}]),{tipo:"90",kilos:"",precioKg:""}]})} style={{width:"100%",padding:"6px",fontSize:11,background:"transparent",border:"1.5px dashed #c8bfaf",color:"#8a7a6a",cursor:"pointer"}}>+ AGREGAR ÍTEM</button>
                </div>
              )}
              {(formGasto.categoria==="mat_tejido"||formGasto.categoria==="pago_terceros"||formGasto.categoria==="envio")&&(
                <div>
                  <label style={{fontSize:10,letterSpacing:1,color:"#8a7a6a",display:"block",marginBottom:5}}>VINCULAR A PEDIDO(S) (opcional)</label>
                  <input type="text" placeholder="Buscar por cliente o número..." value={busquedaPedidoGasto} onChange={e=>setBusquedaPedidoGasto(e.target.value)} style={{width:"100%",marginBottom:6}}/>
                  {(formGasto.pedidosVinculados||[]).length>0&&(
                    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:6}}>
                      {(formGasto.pedidosVinculados||[]).map((v,idx)=>{
                        const ped=pedidos.find(p=>p.id===v.id);
                        return(
                          <div key={v.id} style={{display:"flex",alignItems:"center",gap:6,background:"#fef3ee",padding:"6px 10px",border:"1px solid #e85d2644"}}>
                            <span style={{fontSize:11,flex:1}}>{v.id} - {ped?.cliente}</span>
                            <input type="number" min="0" placeholder="Monto" value={v.monto}
                              onChange={e=>{
                                const nuevos=[...formGasto.pedidosVinculados];
                                nuevos[idx]={...nuevos[idx],monto:e.target.value};
                                setFormGasto({...formGasto,pedidosVinculados:nuevos});
                              }}
                              style={{width:110,fontSize:11,padding:"5px 8px"}}/>
                            <span onClick={()=>setFormGasto({...formGasto,pedidosVinculados:formGasto.pedidosVinculados.filter(x=>x.id!==v.id)})} style={{cursor:"pointer",fontWeight:600,color:"#ef4444",fontSize:14}}>✕</span>
                          </div>
                        );
                      })}
                      {(()=>{
                        const suma=(formGasto.pedidosVinculados||[]).reduce((s,v)=>s+(parseFloat(v.monto)||0),0);
                        const total=parseFloat(formGasto.monto)||0;
                        const ok=Math.abs(suma-total)<=1;
                        return(
                          <div style={{fontSize:11,padding:"6px 10px",background:ok?"#10b98115":"#ef444415",color:ok?"#10b981":"#ef4444"}}>
                            Suma vinculada: ${suma.toLocaleString("es-AR")} / Total: ${total.toLocaleString("es-AR")} {ok?"✓":"⚠ no coincide"}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {busquedaPedidoGasto.trim()&&(
                    <div style={{maxHeight:120,overflowY:"auto",border:"1.5px solid #d8d0c0",background:"#fff"}}>
                      {pedidos.filter(p=>{
                        const b=busquedaPedidoGasto.toLowerCase();
                        return((p.cliente||"").toLowerCase().includes(b)||(p.id||"").toLowerCase().includes(b))&&!(formGasto.pedidosVinculados||[]).some(v=>v.id===p.id);
                      }).slice(0,8).map(p=>(
                        <div key={p.id} onClick={()=>{
                          const yaHayOtros=(formGasto.pedidosVinculados||[]).length>0;
                          const montoSugerido=yaHayOtros?"":formGasto.monto;
                          setFormGasto({...formGasto,pedidosVinculados:[...(formGasto.pedidosVinculados||[]),{id:p.id,monto:montoSugerido}]});
                          setBusquedaPedidoGasto("");
                        }}
                          style={{padding:"8px 10px",fontSize:12,cursor:"pointer",borderBottom:"1px solid #f0ece4"}}>
                          {p.id} - {p.cliente} <span style={{color:"#8a7a6a"}}>({p.cantidad} uds)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
