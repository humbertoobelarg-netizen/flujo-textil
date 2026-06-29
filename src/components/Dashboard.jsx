import React from 'react';
import { PROCESOS, calcTotalGral, diasHasta } from '../utils.jsx';

const Dashboard = ({ pedidos, usuario }) => {
  const activos = (pedidos || []).filter(p => !p.entregado && p.id);

  const totalVentas = activos.reduce((acc, p) => acc + (calcTotalGral(p.prendas) || 0), 0);
  const totalCobrado = activos.reduce((acc, p) => {
    const ant = parseFloat(p.anticipo) || 0;
    const pagos = (p.pagos || []).reduce((s, pg) => s + (parseFloat(pg.monto) || 0), 0);
    return acc + ant + pagos;
  }, 0);
  const saldo = totalVentas - totalCobrado;

  const criticos = activos.filter(p => p.fecha_entrega && diasHasta(p.fecha_entrega) <= 0);
  const proximos = activos.filter(p => p.fecha_entrega && diasHasta(p.fecha_entrega) > 0 && diasHasta(p.fecha_entrega) <= 3);

  const statsProcesos = PROCESOS.map(proc => ({
    ...proc,
    enCurso: activos.filter(p => (p.procesos || {})[proc.key] === 'en_proceso').length
  })).filter(s => s.enCurso > 0);

  return (
    <div style={{background:'#fff',border:'1.5px solid #d8d0c0',borderRadius:8,padding:16,marginBottom:16}}>

      {/* ALERTAS */}
      {(criticos.length > 0 || proximos.length > 0) && (
        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
          {criticos.length > 0 && (
            <div style={{background:'#fee2e2',color:'#991b1b',padding:'6px 12px',borderRadius:6,fontSize:12,border:'1px solid #ef4444'}}>
              🚨 <strong>{criticos.length} vencidos/hoy</strong>
            </div>
          )}
          {proximos.length > 0 && (
            <div style={{background:'#fef3c7',color:'#92400e',padding:'6px 12px',borderRadius:6,fontSize:12,border:'1px solid #f59e0b'}}>
              ⏳ <strong>{proximos.length} vencen pronto</strong>
            </div>
          )}
        </div>
      )}

      {/* FINANZAS - solo admin/Gabi */}
      {(usuario?.rol === 'admin' || usuario?.nombre === 'Gabi') && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div style={{background:'#f0fdf4',padding:12,borderRadius:8,border:'1.5px solid #10b981'}}>
            <div style={{fontSize:10,color:'#64748b',fontWeight:800,letterSpacing:0.5}}>CAPITAL EN CALLE</div>
            <div style={{fontSize:18,fontWeight:'bold',color:'#065f46'}}>₲ {totalVentas.toLocaleString('es-PY')}</div>
          </div>
          <div style={{background:'#fff7ed',padding:12,borderRadius:8,border:'1.5px solid #e85d26'}}>
            <div style={{fontSize:10,color:'#64748b',fontWeight:800,letterSpacing:0.5}}>SALDO PENDIENTE</div>
            <div style={{fontSize:18,fontWeight:'bold',color:'#9a3412'}}>₲ {saldo.toLocaleString('es-PY')}</div>
          </div>
        </div>
      )}

      {/* PROCESOS EN CURSO */}
      {statsProcesos.length > 0 && (
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {statsProcesos.map(s => (
            <div key={s.key} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',background:'#f5f0e8',borderRadius:6,border:'1px solid #e8e0d0',fontSize:12}}>
              <span>{s.icon}</span>
              <span style={{color:s.color,fontWeight:700}}>{s.enCurso}</span>
              <span style={{color:'#8a7a6a'}}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Dashboard;
