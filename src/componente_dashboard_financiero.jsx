// ════════════════════════════════════════════════════════════════════════
//  componente_dashboard_financiero.jsx
//  Dashboard Financiero Ejecutivo tipo CEO para "Flujo Textil"
//  ----------------------------------------------------------------------
//  Componente React plug-and-play. Estilos inline coherentes con la app
//  (paleta #e85d26 / #1a1208 / #f5f0e8). Moneda: Guaraníes (Gs.).
//
//  USO:
//    import DashboardFinanciero from "./components/componente_dashboard_financiero.jsx";
//    <DashboardFinanciero pedidos={pedidos} gastos={gastos}
//        ingresosExtra={ingresosExtra} usuario={usuario} />
// ════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import {
  calcularKPIs,
  rentabilidadPorCliente,
  rentabilidadPorPrenda,
  tendenciaMensual,
  generarAlertas,
  alertasDescuentos,
  proyecciones,
} from "./finanzas_ceo.js";

const C = {
  naranja: "#e85d26",
  oscuro: "#1a1208",
  crema: "#f5f0e8",
  borde: "#d8d0c0",
  verde: "#10b981",
  rojo: "#ef4444",
  amarillo: "#f59e0b",
  gris: "#8a7a6a",
  azul: "#3b82f6",
};

function gs(n) {
  return "Gs. " + (Math.round(n || 0)).toLocaleString("es-AR");
}

// ── Card de KPI ─────────────────────────────────────────────────────────
function KpiCard({ icon, label, valor, sub, color = C.oscuro, ancho }) {
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.borde}`, padding: "14px 16px", flex: ancho || "1 1 180px", minWidth: 160 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 10, letterSpacing: 1, color: C.gris, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color, lineHeight: 1 }}>{valor}</div>
      {sub != null && <div style={{ fontSize: 10, color: C.gris, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Mini gráfico de barras (tendencias) ─────────────────────────────────
function BarrasTendencia({ serie, claves }) {
  const max = Math.max(1, ...serie.flatMap((s) => claves.map((c) => Math.abs(s[c.key]))));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 160, padding: "10px 4px", overflowX: "auto" }}>
      {serie.map((s, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 54 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120 }}>
            {claves.map((c) => (
              <div key={c.key} title={`${c.label}: ${gs(s[c.key])}`}
                style={{ width: 12, height: Math.max(2, (Math.abs(s[c.key]) / max) * 115), background: s[c.key] < 0 ? C.rojo : c.color, borderRadius: "2px 2px 0 0" }} />
            ))}
          </div>
          <span style={{ fontSize: 9, color: C.gris }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Barra de progreso horizontal (rankings) ─────────────────────────────
function BarraRank({ label, valor, max, sub, color = C.naranja }) {
  const pct = max > 0 ? Math.min(100, (valor / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: C.oscuro, fontWeight: 500 }}>{label}</span>
        <span style={{ color: C.gris }}>{sub}</span>
      </div>
      <div style={{ background: C.crema, height: 16, border: `1px solid ${C.borde}` }}>
        <div style={{ width: pct + "%", height: "100%", background: color, transition: "width .3s" }} />
      </div>
    </div>
  );
}

export default function DashboardFinanciero({ pedidos = [], gastos = [], ingresosExtra = [], usuario = null }) {
  const [periodoTipo, setPeriodoTipo] = useState("mensual");
  const [ref, setRef] = useState(new Date().toISOString().slice(0, 7));

  const periodo = useMemo(() => ({ tipo: periodoTipo, ref }), [periodoTipo, ref]);
  const datos = useMemo(() => ({ pedidos, gastos, ingresosExtra }), [pedidos, gastos, ingresosExtra]);

  const k = useMemo(() => calcularKPIs(datos, periodo), [datos, periodo]);
  const topClientes = useMemo(() => rentabilidadPorCliente(pedidos, periodo, 10), [pedidos, periodo]);
  const porPrenda = useMemo(() => rentabilidadPorPrenda(pedidos, periodo), [pedidos, periodo]);
  const serie = useMemo(() => tendenciaMensual(datos, 6), [datos]);
  const proy = useMemo(() => proyecciones(pedidos), [pedidos]);
  const alertas = useMemo(
    () => [...generarAlertas(k), ...alertasDescuentos(pedidos)],
    [k, pedidos]
  );

  const maxFact = Math.max(1, ...topClientes.map((c) => c.facturado));
  const maxPrenda = Math.max(1, ...porPrenda.map((p) => p.ingresos));

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* ── Encabezado + selector de período ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, letterSpacing: 2, color: C.oscuro }}>
          📊 TABLERO FINANCIERO CEO
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {[["mensual", "Mensual"], ["trimestral", "Trimestral"], ["anual", "Anual"], ["todo", "Histórico"]].map(([key, lbl]) => (
            <button key={key} onClick={() => setPeriodoTipo(key)}
              style={{ padding: "6px 12px", fontSize: 11, letterSpacing: 1, border: `1.5px solid ${periodoTipo === key ? C.naranja : C.borde}`, background: periodoTipo === key ? C.naranja : "#fff", color: periodoTipo === key ? "#fff" : C.gris, cursor: "pointer" }}>
              {lbl}
            </button>
          ))}
          {periodoTipo === "mensual" && (
            <input type="month" value={ref} onChange={(e) => setRef(e.target.value)} style={{ padding: "5px 8px", border: `1.5px solid ${C.borde}` }} />
          )}
          {periodoTipo === "anual" && (
            <input type="number" min="2020" max="2035" value={ref.slice(0, 4)} onChange={(e) => setRef(e.target.value + "-01")} style={{ padding: "5px 8px", width: 90, border: `1.5px solid ${C.borde}` }} />
          )}
        </div>
      </div>

      {/* ── Alertas financieras ── */}
      {alertas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {alertas.map((a, i) => {
            const col = a.nivel === "critico" ? C.rojo : a.nivel === "alto" ? C.amarillo : C.gris;
            return (
              <div key={i} style={{ background: col + "15", border: `1.5px solid ${col}44`, padding: "10px 14px", marginBottom: 6, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: col }}>{a.titulo}</div>
                  <div style={{ fontSize: 11, color: C.oscuro }}>{a.detalle}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Panel de KPIs principales ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <KpiCard icon="💰" label="INGRESOS TOTALES" valor={gs(k.ingresosTotales)} sub={`Facturado: ${gs(k.ingresosFacturados)}`} color={C.verde} />
        <KpiCard icon="🏭" label="COSTOS TOTALES" valor={gs(k.costosTotales)} sub={`MP ${gs(k.costoMateriaPrima)} · MO ${gs(k.costoManoObra)}${k.manoObraEsEstimada ? " (est.)" : ""}`} color={C.oscuro} />
        <KpiCard icon="📈" label="MARGEN BRUTO" valor={k.margenBrutoPct + "%"} sub={gs(k.margenBruto)} color={k.margenBruto >= 0 ? C.verde : C.rojo} />
        <KpiCard icon="⚙️" label="EBITDA" valor={gs(k.ebitda)} sub={`${k.ebitdaPct}% s/ ingresos`} color={k.ebitda >= 0 ? C.verde : C.rojo} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <KpiCard icon="🧾" label="GASTOS OPERATIVOS" valor={gs(k.gastosOperativos)} color={C.amarillo} />
        <KpiCard icon="👨‍👩‍👧" label="GASTOS PERSONALES" valor={gs(k.gastosPersonales)} sub="Separados del negocio" color={C.naranja} />
        <KpiCard icon="🎫" label="TICKET PROMEDIO" valor={gs(k.ticketPromedio)} sub={`${k.cantPedidos} pedidos · ${k.totalUnidades} uds`} color={C.azul} />
        <KpiCard icon="⏳" label="DSO (COBRANZA)" valor={k.dso + " días"} sub="Promedio de cobro" color={k.dso > 30 ? C.rojo : C.verde} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <KpiCard icon="💵" label="FLUJO DE CAJA" valor={gs(k.flujoCajaDisponible)} sub={`Comprometido: ${gs(k.saldoPorCobrar)}`} color={k.flujoCajaDisponible >= 0 ? C.verde : C.rojo} />
        <KpiCard icon="🏦" label="CAPITAL DE TRABAJO" valor={gs(k.capitalTrabajo)} sub={`Activo ${gs(k.activoCirculante)} − Pasivo ${gs(k.pasivoCirculante)}`} color={k.capitalTrabajo >= 0 ? C.verde : C.rojo} />
        <KpiCard icon="🧮" label="RESULTADO NETO" valor={gs(k.resultadoNeto)} sub="Incluye gastos personales" color={k.resultadoNeto >= 0 ? C.verde : C.rojo} />
      </div>

      {/* ── Gráfico de tendencias ── */}
      <div style={{ background: "#fff", border: `1.5px solid ${C.borde}`, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 12, letterSpacing: 1, color: C.gris, fontWeight: 600, marginBottom: 8 }}>📉 TENDENCIA — ÚLTIMOS 6 MESES</div>
        <BarrasTendencia serie={serie} claves={[
          { key: "ingresos", label: "Ingresos", color: C.verde },
          { key: "costos", label: "Costos", color: C.oscuro },
          { key: "ebitda", label: "EBITDA", color: C.azul },
        ]} />
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6 }}>
          {[["Ingresos", C.verde], ["Costos", C.oscuro], ["EBITDA", C.azul]].map(([l, c]) => (
            <span key={l} style={{ fontSize: 10, color: C.gris, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, background: c, display: "inline-block" }} />{l}
            </span>
          ))}
        </div>
      </div>

      {/* ── Top clientes + Rentabilidad por prenda ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: "1 1 320px", background: "#fff", border: `1.5px solid ${C.borde}`, padding: 14 }}>
          <div style={{ fontSize: 12, letterSpacing: 1, color: C.gris, fontWeight: 600, marginBottom: 10 }}>🏆 TOP CLIENTES POR FACTURACIÓN</div>
          {topClientes.length === 0 && <div style={{ fontSize: 11, color: C.gris }}>Sin datos en el período.</div>}
          {topClientes.map((c) => (
            <BarraRank key={c.cliente} label={c.cliente} valor={c.facturado} max={maxFact}
              sub={`${gs(c.facturado)} · ${c.margenPct}% mg`} color={C.naranja} />
          ))}
        </div>
        <div style={{ flex: "1 1 320px", background: "#fff", border: `1.5px solid ${C.borde}`, padding: 14 }}>
          <div style={{ fontSize: 12, letterSpacing: 1, color: C.gris, fontWeight: 600, marginBottom: 10 }}>👕 RENTABILIDAD POR PRENDA</div>
          {porPrenda.length === 0 && <div style={{ fontSize: 11, color: C.gris }}>Sin datos en el período.</div>}
          {porPrenda.map((p) => (
            <BarraRank key={p.tipo} label={p.tipo} valor={p.ingresos} max={maxPrenda}
              sub={`${gs(p.ingresos)} · ${p.unidades} uds`} color={C.azul} />
          ))}
        </div>
      </div>

      {/* ── Proyecciones ── */}
      <div style={{ background: C.oscuro, color: C.crema, padding: 16 }}>
        <div style={{ fontSize: 12, letterSpacing: 1, fontWeight: 600, marginBottom: 12 }}>🔮 PROYECCIONES (pedidos pendientes)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontSize: 10, color: "#b0a898", letterSpacing: 1 }}>POR COBRAR (TOTAL)</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.naranja }}>{gs(proy.porCobrarTotal)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#b0a898", letterSpacing: 1 }}>POR COBRAR (PRÓX. 30 DÍAS)</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: "#fff" }}>{gs(proy.porCobrar30dias)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#b0a898", letterSpacing: 1 }}>BACKLOG FACTURACIÓN</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.verde }}>{gs(proy.backlogFacturacion)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
