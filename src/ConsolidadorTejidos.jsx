import React, { useState } from 'react';
import { calcTejidoRemera, isRemera } from './utils.jsx';

const ConsolidadorTejidos = ({ pedidos, onClose }) => {
  const [seleccionados, setSeleccionados] = useState([]);

  const pedidosPendientes = pedidos.filter(p => p.estado !== 'entregado');

  const togglePedido = (id) => {
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const calcularResumen = () => {
    const resumen = { a90: 0, a120: 0, rib: 0, otros: [] };

    pedidos
      .filter(p => seleccionados.includes(p.id))
      .forEach(pedido => {
        pedido.prendas?.forEach(prenda => {
          if (isRemera(prenda.tipoPrenda)) {
            const { totalMetros, ribMetros, anchoUsado } = calcTejidoRemera(prenda);
            if (anchoUsado === 90) resumen.a90 += totalMetros;
            else resumen.a120 += totalMetros;
            resumen.rib += ribMetros;
          } else {
            resumen.otros.push({ pedido: pedido.cliente, prenda: prenda.tipoPrenda, cant: prenda.cantidad });
          }
        });
      });

    return resumen;
  };

  const resumen = calcularResumen();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
          <div>
