/* ============================================================================
 *  componente_alertas_ia.jsx — Panel de IA de Producción (Flujo Textil)
 * ----------------------------------------------------------------------------
 *  Componente React PLUG-AND-PLAY. Muestra:
 *    1. Alertas de retrasos (score de riesgo bajo/medio/alto)
 *    2. Sugerencias de orden de producción (qué hacer primero)
 *    3. Cuellos de botella detectados por área/proceso
 *    4. Compra de tejido sugerida (por color/ancho, con margen)
 *
 *  Integración en App.jsx:
 *      import PanelAlertasIA from "./componente_alertas_ia.jsx";
 *      ...
 *      <PanelAlertasIA pedidos={pedidos} stockTejido={stock} usuario={usuario} />
 *
 *  Estilos inline (consistente con el resto de la app). No requiere CSS extra.
 * ==========================================================================*/

import { useMemo, useState } from "react";
import {
  generarResumenIA,
  estimarFechaEntrega,
} from "./ia_produccion.js";

/* ----------------------------- helpers UI ------------------------------- */
const COLOR_NIVEL = {
  alto: { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c", chip: "#ef4444" },
  medio: { bg: "#fffbeb", border: "#fcd34d", text: "#b45309", chip: "#f59e0b" },
  bajo: { bg: "#f0fdf4", border: "#86efac", text: "#15803d", chip: "#10b981" },
  critico: { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c", chip: "#ef4444" },
  ok: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", chip: "#10b981" },
};

function fmtFecha(f) {
  if (!f) return "-";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}
function fmtNum(n) {
  return (Math.round((parseFloat(n) || 0) * 100) / 100).toLocaleString("es-AR");
}

const Card = ({ children, style }) => (
  <div style={{ background: "#fff", border: "1px solid #ece5dc", borderRadius: 14, padding: 16, marginBottom: 16, ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ icon, children, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1208", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>{children}
    </h3>
    {right}
  </div>
);

const Chip = ({ color, children }) => (
  <span style={{ background: color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, letterSpacing: 0.4, textTransform: "uppercase" }}>
    {children}
  </span>
);

/* ====================================================================== */
export default function PanelAlertasIA({ pedidos = [], stockTejido = [], usuario, opciones = {} }) {
  const [tab, setTab] = useState("retrasos");
  const [margen, setMargen] = useState(10);
  const [anchoPref, setAnchoPref] = useState("90");

  const resumen = useMemo(
    () => generarResumenIA(pedidos, stockTejido, { ...opciones, margenSeguridad: margen / 100, anchoPreferido: anchoPref }),
    [pedidos, stockTejido, margen, anchoPref, opciones]
  );

  const { retrasos, ordenProduccion, cuellosBotella, compraTejido } = resumen;

  const TABS = [
    { key: "retrasos", label: "Retrasos", icon: "⏰", badge: retrasos.resumen.enRiesgo },
    { key: "orden", label: "Orden producción", icon: "📑", badge: null },
    { key: "cuellos", label: "Cuellos de botella", icon: "🚧", badge: cuellosBotella.areas.filter(a => a.nivel === "critico" || a.nivel === "alto").length || null },
    { key: "tejido", label: "Compra tejido", icon: "🧶", badge: (compraTejido.compraSugerida.jerseyKg + compraTejido.compraSugerida.ribKg) > 0 ? "!" : null },
  ];

  return (
    <div style={{ fontFamily: "inherit", maxWidth: 1100, margin: "0 auto" }}>
      {/* Encabezado */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 26 }}>🤖</span>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1a1208" }}>IA de Producción</h2>
          <div style={{ fontSize: 12, color: "#8a7a6a" }}>Predicción de retrasos · orden óptimo · cuellos de botella · compra de tejido</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: 6, border: "1px solid",
              borderColor: tab === t.key ? "#e85d26" : "#ece5dc",
              background: tab === t.key ? "#e85d26" : "#fff",
              color: tab === t.key ? "#fff" : "#1a1208",
              borderRadius: 99, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <span>{t.icon}</span>{t.label}
            {t.badge ? (
              <span style={{ background: tab === t.key ? "#fff" : "#e85d26", color: tab === t.key ? "#e85d26" : "#fff", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 99 }}>{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ----------------------------- RETRASOS ----------------------------- */}
      {tab === "retrasos" && (
        <div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <MiniStat label="En riesgo" value={retrasos.resumen.enRiesgo} color="#e85d26" />
            <MiniStat label="Alto" value={retrasos.resumen.alto} color="#ef4444" />
            <MiniStat label="Medio" value={retrasos.resumen.medio} color="#f59e0b" />
            <MiniStat label="Bajo" value={retrasos.resumen.bajo} color="#10b981" />
          </div>
          {retrasos.alertas.length === 0 ? (
            <EmptyMsg>✅ No hay pedidos en riesgo de retraso. ¡Todo bajo control!</EmptyMsg>
          ) : (
            retrasos.alertas.map((a) => {
              const c = COLOR_NIVEL[a.nivel];
              return (
                <Card key={a.id} style={{ background: c.bg, borderColor: c.border, marginBottom: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ color: "#1a1208" }}>{a.id} · {a.cliente}</strong>
                        <Chip color={c.chip}>{a.nivel} · {a.score}</Chip>
                        {a.prioridad === "alta" && <Chip color="#ef4444">prioridad alta</Chip>}
                      </div>
                      <div style={{ fontSize: 12, color: c.text, marginTop: 4 }}>
                        Entrega {fmtFecha(a.fecha_entrega)} · {a.diasDisponibles < 0 ? `vencido hace ${Math.abs(a.diasDisponibles)}d` : `en ${a.diasDisponibles}d`} ·
                        {" "}avance {a.progreso}% · {a.unidades} uds · trabajo estimado {a.diasTrabajoEstimado}d
                      </div>
                      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#52463a" }}>
                        {a.motivos.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                      {a.procesosPendientes.length > 0 && (
                        <div style={{ fontSize: 11, color: "#8a7a6a", marginTop: 6 }}>
                          Pendiente: {a.procesosPendientes.join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ------------------------ ORDEN DE PRODUCCIÓN ----------------------- */}
      {tab === "orden" && (
        <Card>
          <SectionTitle icon="📑">Orden sugerido de producción</SectionTitle>
          <p style={{ fontSize: 12, color: "#8a7a6a", marginTop: 0 }}>
            Combina urgencia de entrega, prioridad, complejidad y dependencias (tejido). Hacer de arriba hacia abajo.
          </p>
          {ordenProduccion.length === 0 ? (
            <EmptyMsg>No hay pedidos abiertos para ordenar.</EmptyMsg>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#8a7a6a", fontSize: 11, textTransform: "uppercase" }}>
                    <th style={th}>#</th><th style={th}>Pedido</th><th style={th}>Entrega</th>
                    <th style={th}>Prioridad</th><th style={th}>Uds</th><th style={th}>Pendiente</th><th style={th}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenProduccion.map((x) => (
                    <tr key={x.id} style={{ borderTop: "1px solid #f0eadf" }}>
                      <td style={{ ...td, fontWeight: 800, color: "#e85d26" }}>{x.posicion}</td>
                      <td style={td}><strong>{x.id}</strong> · {x.cliente}{x.bloqueadoPorTejido && <span title="Sin tejido" style={{ marginLeft: 6 }}>⚠️</span>}</td>
                      <td style={td}>{fmtFecha(x.fecha_entrega)} <span style={{ color: x.diasDisponibles < 0 ? "#ef4444" : "#8a7a6a" }}>({x.diasDisponibles}d)</span></td>
                      <td style={td}>{x.prioridad}</td>
                      <td style={td}>{x.unidades}</td>
                      <td style={{ ...td, fontSize: 11, color: "#8a7a6a" }}>{x.procesosPendientes.join(", ") || "-"}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{x.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ------------------------ CUELLOS DE BOTELLA ------------------------ */}
      {tab === "cuellos" && (
        <Card>
          <SectionTitle icon="🚧">Carga de trabajo por área</SectionTitle>
          {cuellosBotella.cuello && (
            <div style={{ fontSize: 13, color: "#1a1208", marginBottom: 12 }}>
              Proceso más cargado: <strong>{cuellosBotella.cuello.icon} {cuellosBotella.cuello.label}</strong> — {cuellosBotella.cuello.total} pedidos en cola.
            </div>
          )}
          {cuellosBotella.areas.length === 0 ? (
            <EmptyMsg>No hay carga de trabajo activa.</EmptyMsg>
          ) : (
            cuellosBotella.areas.map((a) => {
              const c = COLOR_NIVEL[a.nivel] || COLOR_NIVEL.ok;
              return (
                <div key={a.key} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span><strong>{a.icon} {a.label}</strong> <span style={{ color: "#8a7a6a" }}>· {a.total} pedidos ({a.enProceso} en curso, {a.pendientes} pend.) · {a.unidades} uds</span></span>
                    <Chip color={c.chip}>{a.ocupacion}%</Chip>
                  </div>
                  <div style={{ background: "#f0eadf", borderRadius: 99, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, a.ocupacion)}%`, height: "100%", background: c.chip }} />
                  </div>
                </div>
              );
            })
          )}
          {cuellosBotella.sugerencias.length > 0 && (
            <div style={{ marginTop: 14, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: 12 }}>
              <strong style={{ fontSize: 12, color: "#b45309" }}>💡 Sugerencias</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#52463a" }}>
                {cuellosBotella.sugerencias.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* --------------------------- COMPRA TEJIDO -------------------------- */}
      {tab === "tejido" && (
        <Card>
          <SectionTitle
            icon="🧶"
            right={
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
                <label style={{ color: "#8a7a6a" }}>Ancho:</label>
                <select value={anchoPref} onChange={(e) => setAnchoPref(e.target.value)} style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #ece5dc" }}>
                  <option value="90">90 cm</option>
                  <option value="120">120 cm</option>
                </select>
                <label style={{ color: "#8a7a6a" }}>Margen %:</label>
                <input type="number" min="0" max="50" value={margen} onChange={(e) => setMargen(parseInt(e.target.value) || 0)} style={{ width: 56, padding: "4px 8px", borderRadius: 8, border: "1px solid #ece5dc" }} />
              </div>
            }
          >
            Compra de tejido sugerida
          </SectionTitle>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <MiniStat label={`Jersey ${anchoPref}cm a comprar`} value={`${fmtNum(compraTejido.compraSugerida.jerseyKg)} kg`} color="#e85d26" />
            <MiniStat label="Rib a comprar" value={`${fmtNum(compraTejido.compraSugerida.ribKg)} kg`} color="#a855f7" />
            <MiniStat label="Costo estimado" value={`$ ${fmtNum(compraTejido.compraSugerida.costoEstimado)}`} color="#10b981" />
            <MiniStat label="Pedidos analizados" value={compraTejido.pedidosConsiderados.length} color="#3b82f6" />
          </div>

          {/* Desglose por color */}
          {(compraTejido.detallePorColor.jersey.length > 0 || compraTejido.detallePorColor.rib.length > 0) ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#8a7a6a", fontSize: 11, textTransform: "uppercase" }}>
                    <th style={th}>Tipo</th><th style={th}>Color</th><th style={th}>Ancho</th><th style={th}>Metros</th><th style={th}>Kg necesarios</th>
                  </tr>
                </thead>
                <tbody>
                  {[...compraTejido.detallePorColor.jersey, ...compraTejido.detallePorColor.rib].map((d, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f0eadf" }}>
                      <td style={td}>{d.tipo === "rib" ? "🧵 Rib" : "🟦 Jersey"}</td>
                      <td style={td}>{d.color}</td>
                      <td style={td}>{d.ancho}</td>
                      <td style={td}>{fmtNum(d.metros)} m</td>
                      <td style={{ ...td, fontWeight: 600 }}>{fmtNum(d.kg)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyMsg>No hay pedidos con corte pendiente que requieran compra de tejido.</EmptyMsg>
          )}

          {/* Resumen stock vs necesidad */}
          <div style={{ marginTop: 14, fontSize: 12, color: "#52463a", display: "flex", gap: 18, flexWrap: "wrap" }}>
            <span>Jersey {anchoPref}cm: necesita <strong>{fmtNum(compraTejido.totales.kgJerseyNecesario)} kg</strong> · stock <strong>{fmtNum(compraTejido.totales.stockJersey)} kg</strong> · neto <strong>{fmtNum(compraTejido.totales.netoJersey)} kg</strong></span>
            <span>Rib: necesita <strong>{fmtNum(compraTejido.totales.kgRibNecesario)} kg</strong> · stock <strong>{fmtNum(compraTejido.totales.stockRib)} kg</strong> · neto <strong>{fmtNum(compraTejido.totales.netoRib)} kg</strong></span>
          </div>

          {compraTejido.sugerencias.length > 0 && (
            <div style={{ marginTop: 14, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 12 }}>
              <strong style={{ fontSize: 12, color: "#15803d" }}>🛒 Recomendación de compra</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#52463a" }}>
                {compraTejido.sugerencias.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}

      <div style={{ fontSize: 11, color: "#b0a596", textAlign: "center", marginTop: 8 }}>
        Estimaciones heurísticas con los datos actuales. La precisión mejora al registrar timestamps por proceso (tabla <code>eventos_proceso</code>).
      </div>
    </div>
  );
}

/* --------- componentes internos reutilizables ---------- */
const th = { padding: "8px 10px" };
const td = { padding: "8px 10px", color: "#1a1208" };

function MiniStat({ label, value, color }) {
  return (
    <div style={{ flex: "1 1 140px", minWidth: 120, background: "#fff", border: "1px solid #ece5dc", borderRadius: 12, padding: "10px 14px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || "#1a1208" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#8a7a6a", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function EmptyMsg({ children }) {
  return (
    <div style={{ padding: 24, textAlign: "center", color: "#8a7a6a", fontSize: 13, background: "#faf7f2", borderRadius: 12, border: "1px dashed #ece5dc" }}>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 *  Componente auxiliar opcional: estimador de fecha para un pedido nuevo.
 *  Útil dentro del formulario crearPedido(). Plug-and-play.
 * --------------------------------------------------------------------------*/
export function EstimadorFechaEntrega({ borradorPedido, pedidos = [], onSugerir }) {
  const est = useMemo(() => estimarFechaEntrega(borradorPedido || {}, pedidos), [borradorPedido, pedidos]);
  return (
    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: 12, fontSize: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <strong style={{ color: "#0369a1" }}>📅 Fecha estimada por IA: {fmtFecha(est.fechaEstimada)}</strong>
          <div style={{ fontSize: 11, color: "#52463a", marginTop: 2 }}>
            {est.diasHabiles} días hábiles · {est.unidades} uds · carga taller x{est.cargaFactor}
          </div>
        </div>
        {onSugerir && (
          <button onClick={() => onSugerir(est.fechaEstimada)} style={{ background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Usar fecha
          </button>
        )}
      </div>
    </div>
  );
}
