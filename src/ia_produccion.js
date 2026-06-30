/* ============================================================================
 *  ia_produccion.js  —  Motor de IA de Producción para Flujo Textil
 *  Técnica Remeras
 * ----------------------------------------------------------------------------
 *  Módulo PLUG-AND-PLAY (JavaScript puro, sin dependencias externas).
 *  Trabaja con los datos actuales de la app (tablas `pedidos` y `stock_tejido`)
 *  aunque los procesos NO guarden timestamps históricos: usa heurísticas
 *  robustas basadas en fechas de creación/entrega, prioridad, carga del taller
 *  y consumo de tejido por talle.
 *
 *  Todas las funciones son exportables y puras (no tocan el DOM ni la red).
 *
 *  Uso típico en App.jsx:
 *      import {
 *        analizarRetrasos,
 *        optimizarOrdenProduccion,
 *        detectarCuellosBotella,
 *        estimarFechaEntrega,
 *        calcularCompraTejido,
 *        generarResumenIA
 *      } from "./ia_produccion.js";
 *
 *      const resumen = generarResumenIA(pedidos, stock_tejido);
 * ==========================================================================*/

/* ----------------------------------------------------------------------------
 *  CONSTANTES DE DOMINIO  (replicadas de utils.jsx para que el módulo sea
 *  autónomo; si ya las importás desde utils, podés borrar estas y pasar las
 *  tuyas — las firmas son compatibles).
 * --------------------------------------------------------------------------*/

// Consumo de tejido en metros por unidad, según talle y ancho de tela.
export const CONSUMO_REMERA = {
  "2": { a90: 0.28, a120: 0.24 }, "4": { a90: 0.29, a120: 0.25 },
  "6": { a90: 0.30, a120: 0.25 }, "8": { a90: 0.31, a120: 0.26 },
  "10": { a90: 0.42, a120: 0.33 }, "12": { a90: 0.43, a120: 0.35 },
  "14": { a90: 0.45, a120: 0.36 }, "16": { a90: 0.47, a120: 0.38 },
  "P": { a90: 0.64, a120: 0.39 }, "M": { a90: 0.66, a120: 0.50 },
  "G": { a90: 0.68, a120: 0.52 }, "XG": { a90: 0.71, a120: 0.54 },
  "XXG": { a90: 0.74, a120: 0.58 }, "XXXG": { a90: 0.78, a120: 0.60 },
  "XXXXG": { a90: 1.15, a120: 1.00 }, "Especial": { a90: 1.20, a120: 1.10 },
};

// Rendimiento de corte: metros que rinde cada kg de tela por ancho.
export const RENDS = { "90": 3.6, "120": 3, "rib": 2.3 };

// Procesos del flujo productivo (orden secuencial real del taller).
export const PROCESOS_FLUJO = [
  { key: "orden", label: "Orden de Pedido", icon: "📋" },
  { key: "diseno", label: "Diseño", icon: "🎨" },
  { key: "corte", label: "Corte", icon: "✂️" },
  { key: "confeccion", label: "Confección", icon: "🧵" },
  { key: "serigrafia", label: "Serigrafía", icon: "🖨️" },
  { key: "bordado", label: "Bordado", icon: "🪡" },
  { key: "sublimacion", label: "Sublimación", icon: "🌈" },
  { key: "dtf", label: "DTF", icon: "🖼️" },
  { key: "terminacion", label: "Terminación", icon: "📦" },
];

// Días-estándar estimados que insume cada proceso (heurística inicial,
// editable). Sirve para estimar fechas y detectar retrasos por etapa hasta
// que se instrumente la tabla `eventos_proceso` con timestamps reales.
export const DIAS_ESTANDAR_PROCESO = {
  orden: 0,
  diseno: 2,
  corte: 1,
  confeccion: 4,
  serigrafia: 2,
  bordado: 3,
  sublimacion: 2,
  dtf: 2,
  terminacion: 1,
};

// Capacidad sugerida (pedidos simultáneos saludables) por área. Si se supera,
// el área se considera potencial cuello de botella.
export const CAPACIDAD_AREA = {
  diseno: 6,
  corte: 8,
  confeccion: 10,
  serigrafia: 6,
  bordado: 4,
  sublimacion: 5,
  dtf: 5,
  terminacion: 10,
};

const PESO_PRIORIDAD = { alta: 3, media: 2, baja: 1 };
const MARGEN_SEGURIDAD_TEJIDO = 0.10; // 10%

/* ----------------------------------------------------------------------------
 *  UTILIDADES INTERNAS
 * --------------------------------------------------------------------------*/

const _label = (k) => (PROCESOS_FLUJO.find((p) => p.key === k) || {}).label || k;

function _hoyStr(refDate) {
  const d = refDate ? new Date(refDate) : new Date();
  return d.toISOString().split("T")[0];
}

/** Días desde hoy (o refDate) hasta `fecha`. Negativo = ya venció. */
export function diasHasta(fecha, refDate) {
  if (!fecha) return 999;
  const base = refDate ? new Date(refDate + "T00:00:00") : new Date();
  base.setHours(0, 0, 0, 0);
  const f = new Date(fecha + "T00:00:00");
  return Math.round((f - base) / (1000 * 60 * 60 * 24));
}

/** Días transcurridos desde `fecha` hasta hoy (o refDate). */
export function diasTranscurridos(fecha, refDate) {
  if (!fecha) return 0;
  return -diasHasta(fecha, refDate);
}

/** ¿Es una prenda con cálculo de tejido (remera/camisilla)? */
export function isRemera(tipo) {
  return !!tipo && (tipo.toLowerCase().includes("remera") || tipo.toLowerCase().includes("camisilla"));
}

/** Suma de unidades de todos los talles de una prenda. */
export function calcTalles(talles) {
  return Object.values(talles || {}).reduce((s, v) => s + (parseInt(v) || 0), 0);
}

/** Metros de tejido (a90 / a120) y rib (kg-equivalente en m) por talles. */
export function calcTejidoRemera(talles) {
  let a90 = 0, a120 = 0, rib = 0;
  Object.entries(talles || {}).forEach(([t, cant]) => {
    const c = parseInt(cant) || 0;
    const cons = CONSUMO_REMERA[t];
    if (cons && c > 0) { a90 += cons.a90 * c; a120 += cons.a120 * c; rib += 0.025 * c; }
  });
  return {
    a90: Math.ceil(a90 * 100) / 100,
    a120: Math.ceil(a120 * 100) / 100,
    rib: Math.ceil(rib * 1000) / 1000,
  };
}

/** Lista de procesos activos (excluyendo "orden") de un pedido. */
function _procesosActivos(p) {
  return (p.procesos_activos || []).filter((k) => k !== "orden");
}

/** % de avance del pedido (procesos "listo" / activos). */
export function pedidoProgreso(p) {
  const a = _procesosActivos(p);
  if (!a.length) return 0;
  const listos = a.filter((k) => (p.procesos || {})[k] === "listo").length;
  return Math.round((listos / a.length) * 100);
}

/** Procesos aún no terminados (pendiente o en_proceso). */
export function procesosPendientes(p) {
  return _procesosActivos(p).filter((k) => (p.procesos || {})[k] !== "listo");
}

/** ¿El pedido está cerrado/entregado? */
function _estaCerrado(p) {
  return !!p.entregado || pedidoProgreso(p) === 100;
}

/** Total de unidades del pedido (suma de prendas). */
export function cantidadPedido(p) {
  if (p.cantidad != null && !isNaN(parseInt(p.cantidad))) return parseInt(p.cantidad);
  return (p.prendas || []).reduce((s, pr) => s + (parseInt(pr.cantidad) || calcTalles(pr.talles)), 0);
}

/* ============================================================================
 *  1) MOTOR DE PREDICCIÓN DE RETRASOS
 * ==========================================================================*/

/**
 * Analiza un pedido y calcula su riesgo de retraso con reglas heurísticas.
 *
 * Lógica:
 *  - Estima los días de trabajo restantes sumando DIAS_ESTANDAR_PROCESO de los
 *    procesos pendientes (los "en_proceso" cuentan a mitad).
 *  - Compara contra los días calendario disponibles hasta la fecha de entrega.
 *  - Penaliza falta de tejido, prioridad alta y pedidos grandes (más unidades).
 *  - Devuelve un score 0-100 y un nivel (bajo / medio / alto).
 *
 * @returns {object} análisis de riesgo del pedido.
 */
export function analizarRetrasoPedido(p, opciones = {}) {
  const refDate = opciones.refDate;
  const cargaFactor = opciones.cargaFactor || 1; // >1 si el taller está saturado

  const diasDisponibles = diasHasta(p.fecha_entrega, refDate);
  const pendientes = procesosPendientes(p);

  // Días de trabajo estimados restantes.
  let diasTrabajo = 0;
  pendientes.forEach((k) => {
    const base = DIAS_ESTANDAR_PROCESO[k] != null ? DIAS_ESTANDAR_PROCESO[k] : 2;
    const estado = (p.procesos || {})[k];
    diasTrabajo += estado === "en_proceso" ? base * 0.5 : base;
  });
  // Ajuste por tamaño del pedido (cada 50 uds suma ~1 día de margen).
  const uds = cantidadPedido(p);
  diasTrabajo += Math.floor(uds / 50);
  // Ajuste por carga global del taller.
  diasTrabajo = diasTrabajo * cargaFactor;

  const holgura = diasDisponibles - diasTrabajo; // días de colchón

  // --- Score de riesgo (0-100) ---
  let score = 0;
  if (_estaCerrado(p)) {
    return _resultadoRetraso(p, 0, "bajo", diasDisponibles, diasTrabajo, holgura, ["Pedido completado / entregado"]);
  }

  const motivos = [];

  if (diasDisponibles < 0) {
    score += 60;
    motivos.push(`Fecha de entrega vencida hace ${Math.abs(diasDisponibles)} día(s)`);
  } else if (holgura < 0) {
    score += 45;
    motivos.push(`Faltan ~${Math.ceil(diasTrabajo)} días de trabajo y solo quedan ${diasDisponibles} días`);
  } else if (holgura <= 2) {
    score += 30;
    motivos.push(`Holgura crítica: solo ${Math.round(holgura)} día(s) de margen`);
  } else if (holgura <= 5) {
    score += 15;
    motivos.push(`Holgura ajustada (${Math.round(holgura)} días de margen)`);
  }

  // Falta de tejido si tiene corte pendiente.
  const necesitaCorte = (p.procesos_activos || []).includes("corte") && (p.procesos || {}).corte !== "listo";
  if (necesitaCorte && p.tejido_disponible === false) {
    score += 20;
    motivos.push("Corte pendiente y sin tejido confirmado en stock");
  }

  // Prioridad alta amplifica el riesgo percibido.
  if (p.prioridad === "alta" && score > 0) {
    score += 10;
    motivos.push("Pedido marcado como prioridad ALTA");
  }

  // Pedido grande con poco avance.
  const progreso = pedidoProgreso(p);
  if (uds >= 100 && progreso < 30 && diasDisponibles < 10) {
    score += 10;
    motivos.push(`Pedido grande (${uds} uds) con ${progreso}% de avance y poco tiempo`);
  }

  // Pedido sin iniciar y con fecha cercana.
  if (progreso === 0 && diasDisponibles <= 3 && diasDisponibles >= 0) {
    score += 10;
    motivos.push("Pedido sin iniciar y entrega muy cercana");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  let nivel = "bajo";
  if (score >= 60) nivel = "alto";
  else if (score >= 30) nivel = "medio";

  if (!motivos.length) motivos.push("Pedido dentro de los tiempos esperados");

  return _resultadoRetraso(p, score, nivel, diasDisponibles, diasTrabajo, holgura, motivos);
}

function _resultadoRetraso(p, score, nivel, diasDisponibles, diasTrabajo, holgura, motivos) {
  return {
    id: p.id,
    cliente: p.cliente,
    fecha_entrega: p.fecha_entrega,
    prioridad: p.prioridad || "media",
    progreso: pedidoProgreso(p),
    unidades: cantidadPedido(p),
    diasDisponibles,
    diasTrabajoEstimado: Math.round(diasTrabajo * 10) / 10,
    holgura: Math.round(holgura * 10) / 10,
    score,
    nivel, // "bajo" | "medio" | "alto"
    motivos,
    procesosPendientes: procesosPendientes(p).map(_label),
  };
}

/**
 * Analiza TODOS los pedidos y devuelve los que están en riesgo, ordenados de
 * mayor a menor score. Excluye entregados/completados.
 */
export function analizarRetrasos(pedidos, opciones = {}) {
  const abiertos = (pedidos || []).filter((p) => !_estaCerrado(p));
  // Factor de carga global: si hay muchos pedidos abiertos, todo tarda más.
  const cargaFactor = 1 + Math.max(0, abiertos.length - 20) * 0.01;
  const analisis = abiertos
    .map((p) => analizarRetrasoPedido(p, { ...opciones, cargaFactor }))
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score);

  const resumen = {
    total: abiertos.length,
    enRiesgo: analisis.length,
    alto: analisis.filter((a) => a.nivel === "alto").length,
    medio: analisis.filter((a) => a.nivel === "medio").length,
    bajo: analisis.filter((a) => a.nivel === "bajo").length,
  };
  return { resumen, alertas: analisis };
}

/* ============================================================================
 *  2) OPTIMIZADOR DE ORDEN DE PRODUCCIÓN
 * ==========================================================================*/

/**
 * Calcula un puntaje de prioridad de producción para un pedido combinando:
 *   - Urgencia por fecha de entrega (cuanto menos días, más urgente)
 *   - Prioridad del pedido (alta/media/baja)
 *   - Complejidad (unidades + procesos pendientes)
 *   - Dependencias bloqueantes (sin tejido para cortar => penaliza arranque)
 *
 * Mayor score = hacer primero.
 */
export function scoreOrdenProduccion(p, opciones = {}) {
  const dias = diasHasta(p.fecha_entrega, opciones.refDate);

  // Urgencia: 100 si vencido, decae con días disponibles.
  let urgencia;
  if (dias <= 0) urgencia = 100;
  else if (dias >= 30) urgencia = 10;
  else urgencia = Math.round(100 - (dias / 30) * 90);

  const prioridad = (PESO_PRIORIDAD[p.prioridad] || 2) * 10; // 10 / 20 / 30
  const pendientes = procesosPendientes(p);
  const uds = cantidadPedido(p);

  // Complejidad: más procesos pendientes y más unidades => requiere arrancar antes.
  const complejidad = pendientes.length * 4 + Math.min(20, Math.floor(uds / 25));

  // Dependencia bloqueante de tejido.
  const necesitaCorte = (p.procesos_activos || []).includes("corte") && (p.procesos || {}).corte !== "listo";
  const bloqueadoPorTejido = necesitaCorte && p.tejido_disponible === false;
  const penalDependencia = bloqueadoPorTejido ? -15 : 0;

  const score = Math.round(urgencia * 0.5 + prioridad + complejidad + penalDependencia);

  return {
    id: p.id,
    cliente: p.cliente,
    fecha_entrega: p.fecha_entrega,
    diasDisponibles: dias,
    prioridad: p.prioridad || "media",
    unidades: uds,
    procesosPendientes: pendientes.map(_label),
    bloqueadoPorTejido,
    score,
    factores: { urgencia, prioridad, complejidad, penalDependencia },
  };
}

/**
 * Devuelve la lista de pedidos abiertos ordenada por prioridad de producción
 * (qué hacer primero). Marca posición #1, #2, ...
 */
export function optimizarOrdenProduccion(pedidos, opciones = {}) {
  const abiertos = (pedidos || []).filter((p) => !_estaCerrado(p));
  const ordenado = abiertos
    .map((p) => scoreOrdenProduccion(p, opciones))
    .sort((a, b) => b.score - a.score)
    .map((x, i) => ({ ...x, posicion: i + 1 }));

  // Sugerencia textual para las primeras N (default 5).
  const topN = opciones.topN || 5;
  ordenado.sugerencia = ordenado.slice(0, topN).map(
    (x) => `#${x.posicion} ${x.id} · ${x.cliente} (entrega en ${x.diasDisponibles}d, ${x.unidades} uds)` +
           (x.bloqueadoPorTejido ? " ⚠ sin tejido" : "")
  );
  return ordenado;
}

/* ============================================================================
 *  3) DETECTOR DE CUELLOS DE BOTELLA
 * ==========================================================================*/

/**
 * Calcula la carga de trabajo por proceso/área sumando pedidos abiertos que
 * tienen ese proceso pendiente o en curso. Identifica el área más cargada y
 * compara contra la capacidad sugerida (CAPACIDAD_AREA).
 */
export function detectarCuellosBotella(pedidos, opciones = {}) {
  const capacidad = { ...CAPACIDAD_AREA, ...(opciones.capacidad || {}) };
  const abiertos = (pedidos || []).filter((p) => !_estaCerrado(p));

  const carga = {}; // key -> { pendientes, enProceso, unidades, pedidos[] }
  PROCESOS_FLUJO.filter((x) => x.key !== "orden").forEach((proc) => {
    carga[proc.key] = { key: proc.key, label: proc.label, icon: proc.icon, pendientes: 0, enProceso: 0, unidades: 0, pedidos: [] };
  });

  abiertos.forEach((p) => {
    _procesosActivos(p).forEach((k) => {
      const estado = (p.procesos || {})[k];
      if (estado === "listo") return;
      if (!carga[k]) carga[k] = { key: k, label: _label(k), icon: "🔧", pendientes: 0, enProceso: 0, unidades: 0, pedidos: [] };
      if (estado === "en_proceso") carga[k].enProceso += 1;
      else carga[k].pendientes += 1;
      carga[k].unidades += cantidadPedido(p);
      carga[k].pedidos.push(p.id);
    });
  });

  const areas = Object.values(carga)
    .map((a) => {
      const total = a.pendientes + a.enProceso;
      const cap = capacidad[a.key] || 8;
      const ocupacion = cap > 0 ? Math.round((total / cap) * 100) : 0;
      let nivel = "ok";
      if (ocupacion >= 120) nivel = "critico";
      else if (ocupacion >= 90) nivel = "alto";
      else if (ocupacion >= 60) nivel = "medio";
      return { ...a, total, capacidad: cap, ocupacion, nivel };
    })
    .filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total);

  const cuello = areas[0] || null;
  const sugerencias = [];
  areas.filter((a) => a.nivel === "critico" || a.nivel === "alto").forEach((a) => {
    sugerencias.push(
      `${a.icon} ${a.label}: ${a.total} pedidos en cola (${a.ocupacion}% de capacidad). ` +
      `Sugerencia: reforzar el área, tercerizar o repriorizar.`
    );
  });
  if (!sugerencias.length && cuello) {
    sugerencias.push(`El proceso con más carga es ${cuello.icon} ${cuello.label} (${cuello.total} pedidos), dentro de capacidad.`);
  }

  return { cuello, areas, sugerencias };
}

/* ============================================================================
 *  4) ESTIMADOR DE FECHAS DE ENTREGA
 * ==========================================================================*/

/**
 * Estima la fecha de entrega para un pedido (nuevo o existente).
 *
 * @param {object} pedido   Pedido o borrador { procesos_activos, prendas/cantidad, prioridad }
 * @param {array}  pedidos  Lista actual (para medir carga del taller)
 * @param {object} opciones { refDate, diasPorProceso, diasSemana }
 */
export function estimarFechaEntrega(pedido, pedidos = [], opciones = {}) {
  const diasMap = { ...DIAS_ESTANDAR_PROCESO, ...(opciones.diasPorProceso || {}) };
  const activos = (pedido.procesos_activos && pedido.procesos_activos.length)
    ? pedido.procesos_activos
    : ["orden", "diseno", "corte", "confeccion", "terminacion"];

  // Días base de trabajo (suma de procesos del pedido).
  let diasBase = 0;
  activos.filter((k) => k !== "orden").forEach((k) => {
    diasBase += diasMap[k] != null ? diasMap[k] : 2;
  });

  // Ajuste por tamaño.
  const uds = cantidadPedido(pedido);
  diasBase += Math.floor(uds / 50);

  // Ajuste por carga actual del taller.
  const abiertos = (pedidos || []).filter((p) => !_estaCerrado(p));
  const cargaFactor = 1 + Math.max(0, abiertos.length - 15) * 0.02;
  let diasHabiles = Math.ceil(diasBase * cargaFactor);

  // Ajuste por prioridad: alta acelera (-20%), baja relaja (+20%).
  if (pedido.prioridad === "alta") diasHabiles = Math.ceil(diasHabiles * 0.8);
  else if (pedido.prioridad === "baja") diasHabiles = Math.ceil(diasHabiles * 1.2);

  // Convertir días hábiles (lun-sáb) a fecha calendario.
  const fechaEstimada = _sumarDiasHabiles(opciones.refDate ? new Date(opciones.refDate) : new Date(), diasHabiles);

  return {
    fechaEstimada: _hoyStr(fechaEstimada),
    diasHabiles,
    diasBaseTrabajo: Math.round(diasBase * 10) / 10,
    cargaFactor: Math.round(cargaFactor * 100) / 100,
    unidades: uds,
    procesos: activos.filter((k) => k !== "orden").map(_label),
    nota: "Estimación heurística basada en días estándar por proceso + carga actual del taller. " +
          "Precisión mejora al instrumentar timestamps reales por etapa (tabla eventos_proceso).",
  };
}

/** Suma N días hábiles (excluye domingos) a una fecha. */
function _sumarDiasHabiles(desde, n) {
  const d = new Date(desde);
  let agregados = 0;
  while (agregados < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) agregados++; // salta domingos
  }
  return d;
}

/* ============================================================================
 *  5) CALCULADORA INTELIGENTE DE COMPRA DE TEJIDO
 * ==========================================================================*/

/**
 * Calcula el stock disponible por ancho a partir del libro de movimientos
 * `stock_tejido` (kilos positivos = compra, negativos = corte/descuento).
 * Devuelve también el PPP (precio promedio ponderado) por ancho.
 */
export function calcularStockTejido(stock_tejido = []) {
  const porAncho = {}; // ancho -> { kilos, total }
  (stock_tejido || []).forEach((m) => {
    const ancho = String(m.ancho || "90");
    if (!porAncho[ancho]) porAncho[ancho] = { kilos: 0, total: 0 };
    porAncho[ancho].kilos += parseFloat(m.kilos) || 0;
    porAncho[ancho].total += parseFloat(m.total) || 0;
  });
  const resultado = {};
  Object.entries(porAncho).forEach(([ancho, v]) => {
    // PPP solo sobre ingresos (kilos positivos) para evitar distorsión por cortes.
    resultado[ancho] = {
      kilosDisponibles: Math.round(v.kilos * 100) / 100,
      ppp: v.kilos > 0 ? Math.round((v.total / v.kilos)) : 0,
    };
  });
  return resultado;
}

/**
 * Analiza todos los pedidos pendientes que necesitan corte y calcula el tejido
 * necesario agrupado por (color de cuerpo, ancho) y rib por (color de rib).
 * Resta el stock disponible y sugiere la compra neta con margen de seguridad.
 *
 * @param {array} pedidos        Lista de pedidos.
 * @param {array} stock_tejido   Movimientos de stock.
 * @param {object} opciones      { margenSeguridad (0-1), anchoPreferido ("90"|"120") }
 */
export function calcularCompraTejido(pedidos, stock_tejido = [], opciones = {}) {
  const margen = opciones.margenSeguridad != null ? opciones.margenSeguridad : MARGEN_SEGURIDAD_TEJIDO;
  const anchoPref = opciones.anchoPreferido || "90"; // qué ancho usar para cubrir el jersey

  // 1) Filtrar pedidos no entregados con corte pendiente.
  const candidatos = (pedidos || []).filter((p) => {
    if (_estaCerrado(p)) return false;
    const tieneCorte = (p.procesos_activos || []).includes("corte");
    const corteHecho = (p.procesos || {}).corte === "listo";
    return tieneCorte && !corteHecho;
  });

  // 2) Acumular metros por (color jersey + ancho) y rib por color.
  const jersey = {}; // clave `${color}` -> { metros (segun anchoPref) }
  const rib = {};    // clave `${color}` -> { metros }
  const pedidosConsiderados = [];

  candidatos.forEach((p) => {
    let aportoAlgo = false;
    (p.prendas || []).forEach((pr) => {
      if (!isRemera(pr.tipoPrenda)) return;
      const tej = calcTejidoRemera(pr.talles);
      const colorCuerpo = (pr.cuerpo || "Sin color").trim();
      const colorRib = (pr.colorCuello || pr.colorPuno || colorCuerpo || "Sin color").trim();
      const metrosJersey = anchoPref === "120" ? tej.a120 : tej.a90;
      if (metrosJersey > 0) {
        if (!jersey[colorCuerpo]) jersey[colorCuerpo] = { color: colorCuerpo, metros: 0 };
        jersey[colorCuerpo].metros += metrosJersey;
        aportoAlgo = true;
      }
      if (tej.rib > 0) {
        if (!rib[colorRib]) rib[colorRib] = { color: colorRib, metros: 0 };
        rib[colorRib].metros += tej.rib;
        aportoAlgo = true;
      }
    });
    if (aportoAlgo) pedidosConsiderados.push(p.id);
  });

  // 3) Convertir metros -> kg con RENDS.
  const stock = calcularStockTejido(stock_tejido);
  const rendJersey = RENDS[anchoPref] || RENDS["90"];
  const rendRib = RENDS["rib"];

  let kgJerseyNecesario = 0;
  const detalleJersey = Object.values(jersey).map((j) => {
    const kg = j.metros / rendJersey;
    kgJerseyNecesario += kg;
    return {
      tipo: "jersey",
      ancho: anchoPref,
      color: j.color,
      metros: Math.round(j.metros * 100) / 100,
      kg: Math.round(kg * 100) / 100,
    };
  });

  let kgRibNecesario = 0;
  const detalleRib = Object.values(rib).map((r) => {
    const kg = r.metros / rendRib;
    kgRibNecesario += kg;
    return {
      tipo: "rib",
      ancho: "rib",
      color: r.color,
      metros: Math.round(r.metros * 100) / 100,
      kg: Math.round(kg * 100) / 100,
    };
  });

  // 4) Restar stock disponible y aplicar margen de seguridad.
  const stockJersey = (stock[anchoPref] || {}).kilosDisponibles || 0;
  const stockRib = (stock["rib"] || {}).kilosDisponibles || 0;
  const pppJersey = (stock[anchoPref] || {}).ppp || 0;
  const pppRib = (stock["rib"] || {}).ppp || 0;

  const netoJersey = Math.max(0, kgJerseyNecesario - stockJersey);
  const netoRib = Math.max(0, kgRibNecesario - stockRib);
  const comprarJersey = Math.ceil(netoJersey * (1 + margen) * 10) / 10;
  const comprarRib = Math.ceil(netoRib * (1 + margen) * 10) / 10;

  const costoEstimado = Math.round(comprarJersey * pppJersey + comprarRib * pppRib);

  const sugerencias = [];
  if (comprarJersey > 0) {
    sugerencias.push(`Comprar ~${comprarJersey} kg de jersey (ancho ${anchoPref}cm) — incluye ${Math.round(margen * 100)}% de margen.`);
  } else if (kgJerseyNecesario > 0) {
    sugerencias.push(`Jersey ancho ${anchoPref}cm: stock suficiente (${stockJersey} kg disponibles vs ${Math.round(kgJerseyNecesario * 100) / 100} kg necesarios).`);
  }
  if (comprarRib > 0) {
    sugerencias.push(`Comprar ~${comprarRib} kg de rib — incluye ${Math.round(margen * 100)}% de margen.`);
  } else if (kgRibNecesario > 0) {
    sugerencias.push(`Rib: stock suficiente (${stockRib} kg disponibles vs ${Math.round(kgRibNecesario * 100) / 100} kg necesarios).`);
  }
  if (!sugerencias.length) sugerencias.push("No hay pedidos con corte pendiente que requieran tejido.");

  return {
    pedidosConsiderados,
    margenSeguridad: margen,
    anchoPreferido: anchoPref,
    detallePorColor: { jersey: detalleJersey, rib: detalleRib },
    totales: {
      kgJerseyNecesario: Math.round(kgJerseyNecesario * 100) / 100,
      kgRibNecesario: Math.round(kgRibNecesario * 100) / 100,
      stockJersey,
      stockRib,
      netoJersey: Math.round(netoJersey * 100) / 100,
      netoRib: Math.round(netoRib * 100) / 100,
    },
    compraSugerida: {
      jerseyKg: comprarJersey,
      ribKg: comprarRib,
      pppJersey,
      pppRib,
      costoEstimado,
    },
    sugerencias,
  };
}

/* ============================================================================
 *  RESUMEN INTEGRAL (one-call para el componente de UI)
 * ==========================================================================*/

/**
 * Ejecuta los 5 motores y devuelve un objeto listo para renderizar en el panel
 * de alertas IA. No realiza llamadas de red ni efectos secundarios.
 */
export function generarResumenIA(pedidos = [], stock_tejido = [], opciones = {}) {
  const retrasos = analizarRetrasos(pedidos, opciones);
  const orden = optimizarOrdenProduccion(pedidos, opciones);
  const cuellos = detectarCuellosBotella(pedidos, opciones);
  const tejido = calcularCompraTejido(pedidos, stock_tejido, opciones);

  return {
    generadoEn: new Date().toISOString(),
    retrasos,
    ordenProduccion: orden,
    cuellosBotella: cuellos,
    compraTejido: tejido,
  };
}

export default {
  // constantes
  CONSUMO_REMERA, RENDS, PROCESOS_FLUJO, DIAS_ESTANDAR_PROCESO, CAPACIDAD_AREA,
  // helpers
  diasHasta, diasTranscurridos, isRemera, calcTalles, calcTejidoRemera,
  pedidoProgreso, procesosPendientes, cantidadPedido,
  // motores
  analizarRetrasoPedido, analizarRetrasos,
  scoreOrdenProduccion, optimizarOrdenProduccion,
  detectarCuellosBotella,
  estimarFechaEntrega,
  calcularStockTejido, calcularCompraTejido,
  generarResumenIA,
};
