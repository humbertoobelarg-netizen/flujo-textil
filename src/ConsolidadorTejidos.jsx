import { useState, useMemo, Fragment } from "react";
import { calcTejidoRemera, isRemera } from "./utils.jsx";

/* ════════════════════════════════════════════════════════════════════════
 *  CONSOLIDADOR DE TEJIDOS
 *  ────────────────────────────────────────────────────────────────────────
 *  Permite seleccionar varios pedidos y consolida el consumo total de tela
 *  (en METROS) agrupado por color, separando:
 *    · Tela 90cm  (a90)  → agrupada por COLOR DE CUERPO
 *    · Tela 120cm (a120) → agrupada por COLOR DE CUERPO
 *    · RIB (cuello)       → agrupado por COLOR DE CUELLO
 *
 *  Usa calcTejidoRemera(talles) de utils.jsx, que devuelve
 *  { a90, a120, rib } en metros a partir del objeto de talles de la prenda.
 * ══════════════════════════════════════════════════════════════════════ */

const COLOR_90 = "#06b6d4";
const COLOR_120 = "#a855f7";
const COLOR_RIB = "#f59e0b";
const NARANJA = "#e85d26";

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const r3 = (n) => Math.round((n + Number.EPSILON) * 1000) / 1000;

// Suma metros en un acumulador agrupado por color (clave de color → metros).
function acumular(acc, color, metros) {
  if (!metros || metros <= 0) return;
  const key = color && String(color).trim() ? String(color).trim() : "Sin color";
  acc[key] = (acc[key] || 0) + metros;
}

export default function ConsolidadorTejidos({ pedidos = [], onClose }) {
  const [tab, setTab] = useState("seleccion"); // "seleccion" | "resumen"
  const [seleccionados, setSeleccionados] = useState({}); // { [pedidoId]: true }

  // Solo pedidos que tienen al menos una prenda tipo remera con talles cargados.
  const pedidosConRemera = useMemo(() => {
    return (pedidos || []).filter((p) =>
      (p?.prendas || []).some(
        (pr) =>
          isRemera(pr?.tipoPrenda) &&
          Object.keys(pr?.talles || {}).some((t) => parseInt(pr.talles[t]) > 0)
      )
    );
  }, [pedidos]);

  const toggle = (id) =>
    setSeleccionados((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });

  const todosSeleccionados =
    pedidosConRemera.length > 0 &&
    pedidosConRemera.every((p) => seleccionados[p.id]);

  const toggleTodos = () => {
    if (todosSeleccionados) {
      setSeleccionados({});
    } else {
      const next = {};
      pedidosConRemera.forEach((p) => {
        next[p.id] = true;
      });
      setSeleccionados(next);
    }
  };

  const idsSeleccionados = useMemo(
    () => Object.keys(seleccionados).filter((k) => seleccionados[k]),
    [seleccionados]
  );

  // ── Consolidación ───────────────────────────────────────────────────────
  const resumen = useMemo(() => {
    const tela90 = {}; // color → metros
    const tela120 = {}; // color → metros
    const rib = {}; // color → metros
    let totalUnidades = 0;
    let totalA90 = 0;
    let totalA120 = 0;
    let totalRib = 0;

    pedidosConRemera
      .filter((p) => seleccionados[p.id])
      .forEach((pedido) => {
        (pedido.prendas || []).forEach((pr) => {
          if (!isRemera(pr?.tipoPrenda)) return;
          const talles = pr?.talles || {};
          const tieneTalles = Object.keys(talles).some(
            (t) => parseInt(talles[t]) > 0
          );
          if (!tieneTalles) return;

          const tej = calcTejidoRemera(talles); // { a90, a120, rib }
          const colorCuerpo = pr.cuerpo || pr.color || "";
          const colorRib = pr.colorCuello || colorCuerpo || "";

          acumular(tela90, colorCuerpo, tej.a90);
          acumular(tela120, colorCuerpo, tej.a120);
          acumular(rib, colorRib, tej.rib);

          totalA90 += tej.a90;
          totalA120 += tej.a120;
          totalRib += tej.rib;
          totalUnidades += Object.values(talles).reduce(
            (s, c) => s + (parseInt(c) || 0),
            0
          );
        });
      });

    return {
      tela90,
      tela120,
      rib,
      totalUnidades,
      totalA90: r2(totalA90),
      totalA120: r2(totalA120),
      totalRib: r3(totalRib),
    };
  }, [pedidosConRemera, seleccionados]);

  // ── UI helpers ────────────────────────────────────────────────────────
  const tabStyle = (activo) => ({
    flex: 1,
    padding: "12px 10px",
    background: activo ? NARANJA : "#fff",
    color: activo ? "#fff" : "#8a7a6a",
    border: "1.5px solid " + (activo ? NARANJA : "#d8d0c0"),
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 15,
    letterSpacing: 1,
    cursor: "pointer",
  });

  const renderGrupoColor = (titulo, datos, color, decimales) => {
    const entradas = Object.entries(datos).sort((a, b) => b[1] - a[1]);
    const total = entradas.reduce((s, [, m]) => s + m, 0);
    const fmt = (n) => (decimales === 3 ? r3(n) : r2(n));
    return (
      <div
        style={{
          border: "1.5px solid #d8d0c0",
          marginBottom: 14,
          background: "#fff",
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            background: color + "1a",
            borderBottom: "1.5px solid " + color + "44",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 15,
              letterSpacing: 1,
              color,
            }}
          >
            {titulo}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color }}>
            {fmt(total)} mts
          </span>
        </div>
        {entradas.length === 0 ? (
          <div style={{ padding: "12px 14px", fontSize: 12, color: "#8a7a6a" }}>
            Sin datos.
          </div>
        ) : (
          <div>
            {entradas.map(([colorNombre, metros]) => (
              <div
                key={colorNombre}
                style={{
                  padding: "9px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #f0ebe2",
                }}
              >
                <span style={{ fontSize: 13, color: "#5a4a3a" }}>
                  {colorNombre}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1a1208",
                    fontFamily: "'Bebas Neue', sans-serif",
                  }}
                >
                  {fmt(metros)} mts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 100000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
    >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        maxWidth: 760,
        width: "100%",
        margin: "20px auto",
        padding: 16,
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        fontFamily: "system-ui, sans-serif",
        color: "#1a1208",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h2
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 26,
            letterSpacing: 2,
            color: NARANJA,
            margin: "0 0 4px",
          }}
        >
          🧶 CONSOLIDADOR DE TEJIDOS
        </h2>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            fontSize: 26,
            lineHeight: 1,
            cursor: "pointer",
            color: "#8a7a6a",
            padding: 0,
          }}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
      <p style={{ fontSize: 12, color: "#8a7a6a", margin: "0 0 16px" }}>
        Seleccioná pedidos y obtené el consumo total de tela en metros, agrupado
        por color.
      </p>

      {/* Pestañas */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button style={tabStyle(tab === "seleccion")} onClick={() => setTab("seleccion")}>
          SELECCIÓN DE PEDIDOS
          {idsSeleccionados.length > 0 ? ` (${idsSeleccionados.length})` : ""}
        </button>
        <button style={tabStyle(tab === "resumen")} onClick={() => setTab("resumen")}>
          RESUMEN DE INSUMOS
        </button>
      </div>

      {/* ── Pestaña 1: Selección ───────────────────────────────────────── */}
      {tab === "seleccion" && (
        <div>
          {pedidosConRemera.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "#8a7a6a",
                border: "1.5px dashed #d8d0c0",
              }}
            >
              No hay pedidos con remeras y talles cargados para consolidar.
            </div>
          ) : (
            <Fragment>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontSize: 12,
                    color: "#5a4a3a",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={toggleTodos}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  Seleccionar todos
                </label>
                <span style={{ fontSize: 12, color: "#8a7a6a" }}>
                  {idsSeleccionados.length} de {pedidosConRemera.length} seleccionados
                </span>
              </div>

              {pedidosConRemera.map((pedido) => {
                const activo = !!seleccionados[pedido.id];
                const remeras = (pedido.prendas || []).filter((pr) =>
                  isRemera(pr?.tipoPrenda)
                );
                const unidades = remeras.reduce(
                  (s, pr) =>
                    s +
                    Object.values(pr?.talles || {}).reduce(
                      (a, c) => a + (parseInt(c) || 0),
                      0
                    ),
                  0
                );
                return (
                  <div
                    key={pedido.id}
                    onClick={() => toggle(pedido.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      marginBottom: 8,
                      cursor: "pointer",
                      background: activo ? "#fef3ee" : "#fff",
                      border: "1.5px solid " + (activo ? NARANJA : "#d8d0c0"),
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={activo}
                      onChange={() => toggle(pedido.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: 15,
                          letterSpacing: 1,
                          color: "#1a1208",
                        }}
                      >
                        {pedido.cliente || "Sin cliente"}
                      </div>
                      <div style={{ fontSize: 11, color: "#8a7a6a" }}>
                        #{pedido.id} · {remeras.length} prenda
                        {remeras.length === 1 ? "" : "s"} · {unidades} uds
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => setTab("resumen")}
                disabled={idsSeleccionados.length === 0}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "14px",
                  background: idsSeleccionados.length === 0 ? "#d8d0c0" : NARANJA,
                  color: "#fff",
                  border: "none",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 16,
                  letterSpacing: 1,
                  cursor: idsSeleccionados.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                VER RESUMEN DE INSUMOS →
              </button>
            </Fragment>
          )}
        </div>
      )}

      {/* ── Pestaña 2: Resumen ─────────────────────────────────────────── */}
      {tab === "resumen" && (
        <div>
          {idsSeleccionados.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "#8a7a6a",
                border: "1.5px dashed #d8d0c0",
              }}
            >
              No hay pedidos seleccionados. Volvé a la pestaña anterior para elegir.
            </div>
          ) : (
            <Fragment>
              {/* Totales generales */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    padding: "12px",
                    background: "#fff",
                    border: "1.5px solid " + COLOR_90 + "55",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#8a7a6a", marginBottom: 4 }}>
                    TELA 90cm
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: COLOR_90,
                      fontFamily: "'Bebas Neue', sans-serif",
                    }}
                  >
                    {resumen.totalA90}
                  </div>
                  <div style={{ fontSize: 10, color: "#8a7a6a" }}>mts</div>
                </div>
                <div
                  style={{
                    padding: "12px",
                    background: "#fff",
                    border: "1.5px solid " + COLOR_120 + "55",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#8a7a6a", marginBottom: 4 }}>
                    TELA 120cm
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: COLOR_120,
                      fontFamily: "'Bebas Neue', sans-serif",
                    }}
                  >
                    {resumen.totalA120}
                  </div>
                  <div style={{ fontSize: 10, color: "#8a7a6a" }}>mts</div>
                </div>
                <div
                  style={{
                    padding: "12px",
                    background: "#fff",
                    border: "1.5px solid " + COLOR_RIB + "55",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#8a7a6a", marginBottom: 4 }}>
                    RIB (cuello)
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: COLOR_RIB,
                      fontFamily: "'Bebas Neue', sans-serif",
                    }}
                  >
                    {resumen.totalRib}
                  </div>
                  <div style={{ fontSize: 10, color: "#8a7a6a" }}>mts</div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: "#8a7a6a", marginBottom: 14 }}>
                {idsSeleccionados.length} pedido
                {idsSeleccionados.length === 1 ? "" : "s"} · {resumen.totalUnidades}{" "}
                unidades en total
              </div>

              {/* Desglose por color */}
              {renderGrupoColor("TELA 90cm POR COLOR", resumen.tela90, COLOR_90, 2)}
              {renderGrupoColor("TELA 120cm POR COLOR", resumen.tela120, COLOR_120, 2)}
              {renderGrupoColor("RIB POR COLOR", resumen.rib, COLOR_RIB, 3)}

              <button
                onClick={() => setTab("seleccion")}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "12px",
                  background: "#fff",
                  color: "#5a4a3a",
                  border: "1.5px solid #c8bfaf",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 15,
                  letterSpacing: 1,
                  cursor: "pointer",
                }}
              >
                ← MODIFICAR SELECCIÓN
              </button>
            </Fragment>
          )}
        </div>
      )}
    </div>
    </div>
  );
}
