import React from 'react';
import { PROCESOS, calcTotalGral, formatFecha, hoy } from '../utils.jsx';

const Dashboard = ({ pedidos }) => {
  // 1. Cálculos de Dinero
  const pedidosActivos = pedidos.filter(p => !p.entregado);
  const totalVentas = pedidosActivos.reduce((acc, p) => acc + calcTotalGral(p.prendas), 0);
  const totalCobrado = pedidosActivos.reduce((acc, p) => acc + (parseFloat(p.anticipo) || 0), 0);
  const saldoPendiente = totalVentas - totalCobrado;

  // 2. Conteo por Procesos
  const estadisticasProcesos = PROCESOS.map(proc => {
    const cant = pedidosActivos.filter(p => (p.procesos || {})[proc.key] === 'en_proceso').length;
    return { ...proc, cant };
  });

  return (
    <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '12px', marginBottom: '20px' }}>
      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', color: '#1a1208', marginBottom: '20px' }}>
        ESTADO DEL NEGOCIO 📊
      </h2>
      
      {/* Tarjetas de Dinero */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '5px solid #10b981' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>VENTAS ACTIVAS</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>${totalVentas.toLocaleString('es-PY')}</div>
        </div>
        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '5px solid #e85d26' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>SALDO POR COBRAR</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>${saldoPendiente.toLocaleString('es-PY')}</div>
        </div>
      </div>

      {/* Mini-Gráfico de Procesos */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
        {estadisticasProcesos.filter(s => s.cant > 0).map(s => (
          <div key={s.key} style={{ background: s.color + '15', color: s.color, padding: '8px 12px', borderRadius: '20px', fontSize: '12px', border: `1px solid ${s.color}`, whiteSpace: 'nowrap' }}>
            {s.icon} {s.label}: <strong>{s.cant}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
