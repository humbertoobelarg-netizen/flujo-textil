import { useState, useEffect } from "react";
import {
  SUPABASE_URL, SUPABASE_KEY, dbGet, dbPatch,
  getFingerprint, TALLER_LAT, TALLER_LNG, RADIO_METROS, calcDistancia
} from "../utils.jsx";

function PantallaMarcado({empleados}){
  const hash=window.location.hash.replace("#asistencia/","");
  const [empData,setEmpData]=useState(null);
  const [empCargado,setEmpCargado]=useState(false);
  const [marcando,setMarcando]=useState(false);
  const [resultado,setResultado]=useState(null);

  // Manejo del botón atrás
  useEffect(()=>{
    // Siempre mantener al menos 2 entradas en el historial
    window.history.pushState({app:true},"");
    window.history.pushState({app:true},"");
    function handlePopState(e){
      // Cerrar cualquier modal abierto
      setShowNuevoPedido(false);
      setShowNuevoGasto(false);
      setShowNuevaCompra(false);
      setShowNuevoAjuste(false);
      setShowNuevoIngreso(false);
      setShowNuevoEmpleado(false);
      setShowNuevoUser(false);
      setShowPagos(null);
      setShowAgregado(null);
      setShowAsignarTejido(null);
      setShowModalCorte(null);
      setShowEntregarModal(null);
      setEditandoPedido(null);
      // Volver a tab pedidos
      setAdminTab("pedidos");
      // Volver a agregar entrada para el siguiente atrás
      window.history.pushState({app:true},"");
    }
    window.addEventListener("popstate",handlePopState);
    return()=>window.removeEventListener("popstate",handlePopState);
  },[]);

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


export { PantallaMarcado };
