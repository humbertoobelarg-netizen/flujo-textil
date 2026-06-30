import { useState, Fragment } from "react";
import {
  SUPABASE_URL, SUPABASE_KEY, dbPatch,
  PROCESOS, PRIORIDADES, ETAPA_LABEL, ETAPA_COLOR,
  calcCostoConfeccion, PRENDA_INIT,
  hoy, normalizarVinculados, formatFecha,
  calcTotalGral, pedidoProgreso,
  isRemera, puedeVerPrecios, puedeVerTejido,
  ResumenPrecios, PrendaDetalle
} from "./utils.jsx";

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
function PedidoCard({pedido,usuario,usuarios=[],pedidos=[],setPedidos,marcarEtapa,miProceso,gastos=[],stockTejido=[],setFormGasto,setShowNuevoGasto,setShowAsignarTejido,setShowEntregarModal,setFormEntrega,setShowModalCorte,showPagos,setShowPagos,nuevoPago,setNuevoPago,agregarPago,setShowAgregado,setFormAgregado,setEditandoPedido,setFormEditar,eliminarPedido,onAplicarDescuento}){
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
                  <button className="btn" onClick={()=>{setFormGasto({fecha:hoy(),categoria:"pago_terceros",descripcion:`Confección tercerizada - Pedido ${p.id}`,monto:"",tipo:"real",pedidosVinculados:[{id:p.id,monto:""}]});window.history.pushState({modal:"setShowNuevoGasto"},"");setShowNuevoGasto(true);}}
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
                    <span>{"$"}{monto.toLocaleString("es-AR")}</span>
                  </div>
                ))}
                {costoConfeccion>0&&(
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                    <span>🪡 Confección (mano de obra)</span>
                    <span>{"$"}{costoConfeccion.toLocaleString("es-AR")}</span>
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,borderTop:"1px solid #3a3a3a",paddingTop:6,marginTop:4,color:"#e85d26"}}>
                  <span>TOTAL COSTOS</span>
                  <span>{"$"}{totalCostos.toLocaleString("es-AR")}</span>
                </div>
                {(()=>{
                  const totalVenta=calcTotalGral(p.prendas?p.prendas:[]);
                  if(totalVenta===0)return null;
                  const margen=totalVenta-totalCostos;
                  const pct=totalVenta>0?Math.round((margen/totalVenta)*100):0;
                  return(
                    <>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:6,color:"#8a7a6a"}}>
                        <span>Precio de venta</span>
                        <span>{"$"}{totalVenta.toLocaleString("es-AR")}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:600,marginTop:4,color:margen>=0?"#10b981":"#ef4444"}}>
                        <span>MARGEN ESTIMADO</span>
                        <span>{"$"}{margen.toLocaleString("es-AR")} ({pct}%)</span>
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
            const tg=calcTotalGral(p.prendas?p.prendas:[]);
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
                    <span style={{fontWeight:600}}>{"$"}{parseFloat(pg.monto).toLocaleString("es-AR")}</span>
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
            const tg=calcTotalGral(p.prendas?p.prendas:[]);
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
              {(usuario?.rol==="admin"||usuario?.nombre==="Gabi")&&onAplicarDescuento&&(
                <button className="btn" onClick={()=>onAplicarDescuento(p)} style={{padding:"7px 14px",fontSize:11,background:"transparent",border:"1.5px solid #f59e0b",color:"#b45309",letterSpacing:1}}>💸 DESCUENTO</button>
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



export { GrupoColapsable, PedidoCard };
