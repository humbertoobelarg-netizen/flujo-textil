// ════════════════════════════════════════════════════════════════════════
//  componente_aplicar_descuento.jsx
//  Modal para aplicar descuentos formales con validación en tiempo real
//  ----------------------------------------------------------------------
//  Componente React plug-and-play. Estilos inline coherentes con la app.
//  Moneda: Guaraníes (Gs.).
//
//  USO:
//    import ModalAplicarDescuento from "./components/componente_aplicar_descuento.jsx";
//
//    {showDescuento && (
//      <ModalAplicarDescuento
//        pedido={pedidoSeleccionado}
//        usuario={usuario}
//        montoOriginal={totalDelPedido}
//        costoEstimado={costoManoObra}          // opcional, para impacto en margen
//        onCerrar={() => setShowDescuento(false)}
//        onAplicar={(registro) => {
//          // registro listo para guardar en supabase (campo "descuento")
//          dbPatch("pedidos", pedido.id, { descuento: registro });
//        }}
//      />
//    )}
// ════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import {
  RAZONES_DESCUENTO,
  validarDescuento,
  construirRegistroDescuento,
  impactoEnMargen,
  getPoliticaUsuario,
} from "./politicas_descuento.js";

const C = {
  naranja: "#e85d26",
  oscuro: "#1a1208",
  crema: "#f5f0e8",
  borde: "#d8d0c0",
  verde: "#10b981",
  rojo: "#ef4444",
  amarillo: "#f59e0b",
  gris: "#8a7a6a",
};

function gs(n) {
  return "Gs. " + (Math.round(n || 0)).toLocaleString("es-AR");
}

export default function ModalAplicarDescuento({
  pedido = null,
  usuario = null,
  montoOriginal = 0,
  costoEstimado = 0,
  onCerrar = () => {},
  onAplicar = () => {},
}) {
  const [pct, setPct] = useState("");
  const [razon, setRazon] = useState("");
  const [nota, setNota] = useState("");
  const [aplicado, setAplicado] = useState(null);

  const politica = useMemo(() => getPoliticaUsuario(usuario), [usuario]);

  const validacion = useMemo(
    () => validarDescuento({ pct, usuario, razonKey: razon }),
    [pct, usuario, razon]
  );

  const impacto = useMemo(
    () => impactoEnMargen({ precio: montoOriginal, costo: costoEstimado, pct: parseFloat(pct) || 0 }),
    [montoOriginal, costoEstimado, pct]
  );

  const pctNum = parseFloat(pct) || 0;
  const puedeConfirmar = validacion.ok && pctNum > 0;

  function confirmar() {
    if (!puedeConfirmar) return;
    const registro = construirRegistroDescuento({
      pct: pctNum,
      razonKey: razon,
      usuario,
      montoOriginal,
      nota,
    });
    setAplicado(registro);
    onAplicar(registro);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,18,8,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: C.crema, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", border: `2px solid ${C.oscuro}` }}>
        {/* Encabezado */}
        <div style={{ background: C.oscuro, color: C.crema, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1 }}>🏷️ APLICAR DESCUENTO</div>
            {pedido && <div style={{ fontSize: 11, color: "#b0a898" }}>{pedido.id} · {pedido.cliente}</div>}
          </div>
          <button onClick={onCerrar} style={{ background: "none", border: "none", color: C.crema, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: 18 }}>
          {/* Política del usuario */}
          <div style={{ background: "#fff", border: `1.5px solid ${C.borde}`, padding: "8px 12px", marginBottom: 14, fontSize: 11, color: C.gris }}>
            Autoriza: <b style={{ color: C.oscuro }}>{usuario?.nombre || usuario?.rol || "—"}</b> ({politica.label}) ·
            Tope: <b style={{ color: C.naranja }}>{politica.maxPct}%</b>
          </div>

          {aplicado ? (
            /* ── Log visual del descuento aplicado ── */
            <div>
              <div style={{ background: C.verde + "15", border: `1.5px solid ${C.verde}`, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.verde, marginBottom: 8 }}>✓ DESCUENTO APLICADO</div>
                <Fila l="Razón" v={aplicado.razon_label} />
                <Fila l="Porcentaje" v={aplicado.pct + "%"} />
                <Fila l="Precio original" v={gs(aplicado.monto_original)} />
                <Fila l="Descuento" v={"− " + gs(aplicado.monto_descuento)} color={C.rojo} />
                <Fila l="Precio final" v={gs(aplicado.monto_final)} color={C.naranja} bold />
                <div style={{ borderTop: `1px dashed ${C.borde}`, marginTop: 8, paddingTop: 8, fontSize: 10, color: C.gris }}>
                  Autorizado por <b>{aplicado.autorizado_por}</b> · {new Date(aplicado.fecha).toLocaleString("es-AR")}
                  {aplicado.nota && <div style={{ marginTop: 2 }}>Nota: {aplicado.nota}</div>}
                </div>
              </div>
              <button onClick={onCerrar} style={btnPrimary}>CERRAR</button>
            </div>
          ) : (
            <>
              {/* Selector de razón */}
              <label style={lbl}>RAZÓN DEL DESCUENTO</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                {RAZONES_DESCUENTO.map((r) => (
                  <button key={r.key} onClick={() => setRazon(r.key)}
                    style={{ padding: "8px 10px", fontSize: 11, textAlign: "left", border: `1.5px solid ${razon === r.key ? C.naranja : C.borde}`, background: razon === r.key ? C.naranja + "15" : "#fff", cursor: "pointer", color: C.oscuro }}>
                    <span style={{ fontSize: 14, marginRight: 4 }}>{r.icon}</span>{r.label}
                    <div style={{ fontSize: 9, color: C.gris, marginTop: 2 }}>sug. máx {r.maxSugerido}%</div>
                  </button>
                ))}
              </div>

              {/* Input de porcentaje */}
              <label style={lbl}>PORCENTAJE DE DESCUENTO</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <input type="number" min="0" max="100" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="0"
                  style={{ flex: 1, padding: "10px 12px", fontSize: 18, border: `2px solid ${validacion.ok || !pct ? C.borde : C.rojo}`, fontFamily: "'Bebas Neue',sans-serif" }} />
                <span style={{ fontSize: 22, color: C.gris }}>%</span>
              </div>

              {/* Validación en tiempo real */}
              {pct !== "" && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, padding: "6px 10px", background: validacion.ok ? C.verde + "15" : (validacion.requiereAprobacion ? C.amarillo + "15" : C.rojo + "15"), border: `1px solid ${validacion.ok ? C.verde : (validacion.requiereAprobacion ? C.amarillo : C.rojo)}44`, color: validacion.ok ? C.verde : (validacion.requiereAprobacion ? "#b45309" : C.rojo) }}>
                    {validacion.ok ? "✓ " : (validacion.requiereAprobacion ? "🔒 " : "✕ ")}{validacion.motivo}
                  </div>
                  {validacion.advertencias.map((a, i) => (
                    <div key={i} style={{ fontSize: 10, color: C.amarillo, marginTop: 4 }}>⚠️ {a}</div>
                  ))}
                </div>
              )}

              {/* Vista previa del impacto */}
              <div style={{ background: "#fff", border: `1.5px solid ${C.borde}`, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: 1, color: C.gris, fontWeight: 600, marginBottom: 8 }}>VISTA PREVIA DEL IMPACTO</div>
                <Fila l="Precio original" v={gs(impacto.precioOriginal)} />
                <Fila l={`Descuento (${pctNum}%)`} v={"− " + gs(impacto.montoDescuento)} color={C.rojo} />
                <Fila l="Precio final" v={gs(impacto.precioFinal)} color={C.naranja} bold />
                {costoEstimado > 0 && (
                  <div style={{ borderTop: `1px dashed ${C.borde}`, marginTop: 8, paddingTop: 8 }}>
                    <Fila l="Margen antes" v={`${impacto.margenPctAntes}%`} />
                    <Fila l="Margen después" v={`${impacto.margenPctDespues}%`} color={impacto.quedaEnPerdida ? C.rojo : C.verde} bold />
                    <div style={{ fontSize: 10, color: impacto.quedaEnPerdida ? C.rojo : C.gris, marginTop: 4 }}>
                      {impacto.quedaEnPerdida ? "🔴 La venta quedaría en pérdida." : `Caída de margen: ${impacto.caidaPuntos} puntos.`}
                    </div>
                  </div>
                )}
              </div>

              {/* Nota opcional */}
              <label style={lbl}>NOTA (OPCIONAL)</label>
              <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Detalle de la autorización..."
                style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: `1.5px solid ${C.borde}`, marginBottom: 14, resize: "vertical", boxSizing: "border-box" }} />

              {/* Botones */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onCerrar} style={{ ...btnPrimary, background: "#fff", color: C.gris, border: `1.5px solid ${C.borde}`, flex: 1 }}>CANCELAR</button>
                <button onClick={confirmar} disabled={!puedeConfirmar}
                  style={{ ...btnPrimary, flex: 2, opacity: puedeConfirmar ? 1 : 0.5, cursor: puedeConfirmar ? "pointer" : "not-allowed" }}>
                  CONFIRMAR DESCUENTO
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Fila({ l, v, color, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
      <span style={{ color: "#8a7a6a" }}>{l}</span>
      <span style={{ color: color || "#1a1208", fontWeight: bold ? 700 : 500 }}>{v}</span>
    </div>
  );
}

const lbl = { fontSize: 10, letterSpacing: 1, color: "#8a7a6a", fontWeight: 600, display: "block", marginBottom: 6 };
const btnPrimary = { width: "100%", padding: "12px", background: "#e85d26", color: "#fff", border: "none", fontSize: 13, letterSpacing: 1, fontWeight: 600, cursor: "pointer" };
