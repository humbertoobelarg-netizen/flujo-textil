// ════════════════════════════════════════════════════════════════════════
//  finanzas_ceo.js
//  Motor de KPIs financieros tipo CEO para "Flujo Textil" (técnica remeras)
//  ----------------------------------------------------------------------
//  Funciones puras (sin estado, sin dependencias externas) que calculan los
//  indicadores ejecutivos a partir de los datos ya existentes en la app:
//    - pedidos        : [{ id, cliente, prendas[], anticipo, pagos[],
//                          creado, fecha_entrega, entregado, descuento? }]
//    - gastos         : [{ id, fecha, categoria, monto, tipo, ... }]
//    - ingresos_extra : [{ id, fecha, monto, origen }]
//
//  Moneda: Guaraníes (Gs.). Todas las cifras son enteros.
// ════════════════════════════════════════════════════════════════════════

// ── COSTO DE CONFECCIÓN (mano de obra) ──────────────────────────────────
// Replicado desde utils.jsx para que el motor sea autónomo (plug-and-play).
const COSTO_CONFECCION_CEO = {
  "Remera cuello redondo": 2150,
  "Remera cuello V": 2150,
  "Remera polo": 4300,
  Camisilla: 1720,
  Canguro: 5700,
};

// ── CLASIFICACIÓN DE CATEGORÍAS DE GASTO ────────────────────────────────
// Separa claramente gastos OPERATIVOS (del negocio) de gastos PERSONALES
// (familia, préstamos, deudas informales) y de MATERIA PRIMA / MANO DE OBRA.
const CATEGORIAS_GASTO = {
  // Materia prima / costo directo de producción
  mat_tejido: { grupo: "materia_prima", label: "Tejido" },
  mat_serigrafia: { grupo: "materia_prima", label: "Serigrafía / DTF / Sublimación" },
  mat_confeccion: { grupo: "materia_prima", label: "Confección / Bordado" },
  mat_empaque: { grupo: "materia_prima", label: "Empaque / Limpieza" },
  // Mano de obra / tercerización (costo directo)
  mano_obra: { grupo: "mano_obra", label: "Mano de obra" },
  pago_terceros: { grupo: "mano_obra", label: "Pago Tercerizados" },
  // Gastos operativos (estructura del negocio)
  envio: { grupo: "operativo", label: "Envío de pedidos" },
  alquiler: { grupo: "operativo", label: "Alquiler" },
  servicios: { grupo: "operativo", label: "Servicios" },
  mantenimiento: { grupo: "operativo", label: "Mantenimiento" },
  combustible: { grupo: "operativo", label: "Combustible" },
  marketing: { grupo: "operativo", label: "Marketing" },
  impuestos: { grupo: "operativo", label: "Impuestos" },
  // Gastos personales (NO operativos del negocio)
  flia_obelar: { grupo: "personal", label: "Flia. Obelar Codas" },
  prestamos: { grupo: "personal", label: "Préstamos" },
  deuda_informal: { grupo: "personal", label: "Deuda Informal" },
  // Sin clasificar
  otros: { grupo: "otros", label: "Otros" },
};

function grupoDeCategoria(cat) {
  return (CATEGORIAS_GASTO[cat] || { grupo: "otros" }).grupo;
}

// ════════════════════════════════════════════════════════════════════════
//  HELPERS DE PERÍODO
// ════════════════════════════════════════════════════════════════════════
// periodo = { tipo: "mensual"|"trimestral"|"anual"|"todo", ref: "YYYY-MM" }
function fechaEnPeriodo(fecha, periodo) {
  if (!fecha) return false;
  if (!periodo || periodo.tipo === "todo") return true;
  const ref = periodo.ref || new Date().toISOString().slice(0, 7);
  const fym = fecha.slice(0, 7);
  if (periodo.tipo === "mensual") return fym === ref;
  const anoRef = ref.slice(0, 4);
  if (periodo.tipo === "anual") return fecha.startsWith(anoRef);
  if (periodo.tipo === "trimestral") {
    const mRef = parseInt(ref.slice(5, 7)) - 1;
    const tRef = Math.floor(mRef / 3);
    const m = parseInt(fym.slice(5, 7)) - 1;
    return fym.slice(0, 4) === anoRef && Math.floor(m / 3) === tRef;
  }
  return true;
}

// ════════════════════════════════════════════════════════════════════════
//  CÁLCULOS POR PEDIDO
// ════════════════════════════════════════════════════════════════════════

// Total facturado del pedido (suma de prendas precioUnit * cantidad),
// neto de descuento formal si existe.
function totalPedido(p) {
  const bruto = (p.prendas || []).reduce(
    (s, pr) => s + (parseFloat(pr.precioUnit) || 0) * (parseFloat(pr.cantidad) || 0),
    0
  );
  // Aplicar descuento formal registrado en el pedido
  if (p.descuento && p.descuento.pct) {
    return Math.round(bruto * (1 - (parseFloat(p.descuento.pct) || 0) / 100));
  }
  return bruto;
}

// Total cobrado del pedido (anticipo + pagos registrados).
function cobradoPedido(p) {
  const ant = parseFloat(p.anticipo) || 0;
  const pagos = (p.pagos || []).reduce((s, pg) => s + (parseFloat(pg.monto) || 0), 0);
  return ant + pagos;
}

// Saldo pendiente del pedido.
function saldoPedido(p) {
  return Math.max(0, totalPedido(p) - cobradoPedido(p));
}

// Cantidad total de prendas del pedido.
function unidadesPedido(p) {
  return (p.prendas || []).reduce((s, pr) => s + (parseFloat(pr.cantidad) || 0), 0);
}

// Costo de mano de obra (confección) estimado del pedido.
function costoManoObraPedido(p) {
  return (p.prendas || []).reduce((s, pr) => {
    const costo = COSTO_CONFECCION_CEO[pr.tipoPrenda] || 0;
    return s + costo * (parseFloat(pr.cantidad) || 0);
  }, 0);
}

// ════════════════════════════════════════════════════════════════════════
//  MOTOR PRINCIPAL DE KPIs
// ════════════════════════════════════════════════════════════════════════
// Calcula el set completo de KPIs financieros tipo CEO.
//   datos    = { pedidos, gastos, ingresosExtra }
//   periodo  = { tipo, ref }
function calcularKPIs({ pedidos = [], gastos = [], ingresosExtra = [] }, periodo = { tipo: "mensual", ref: new Date().toISOString().slice(0, 7) }) {
  // ── INGRESOS (base percibido: cobranzas en el período) ──────────────
  const cobranzas = [];
  pedidos.forEach((p) => {
    const ant = parseFloat(p.anticipo) || 0;
    if (ant > 0) {
      const f = p.creado || p.fecha_entrega;
      if (f) cobranzas.push({ fecha: f, monto: ant, pedido: p.id, cliente: p.cliente });
    }
    (p.pagos || []).forEach((pg) => {
      if (pg.fecha && parseFloat(pg.monto) > 0) {
        cobranzas.push({ fecha: pg.fecha, monto: parseFloat(pg.monto), pedido: p.id, cliente: p.cliente });
      }
    });
  });
  const cobranzasPeriodo = cobranzas.filter((c) => fechaEnPeriodo(c.fecha, periodo));
  const ingresosCobrados = cobranzasPeriodo.reduce((s, c) => s + c.monto, 0);

  const ingrExtraPeriodo = (ingresosExtra || []).filter((i) => fechaEnPeriodo(i.fecha, periodo));
  const totalIngresosExtra = ingrExtraPeriodo.reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);

  // Ingresos devengados (facturación de pedidos creados en el período)
  const pedidosPeriodo = pedidos.filter((p) => fechaEnPeriodo(p.creado, periodo));
  const ingresosFacturados = pedidosPeriodo.reduce((s, p) => s + totalPedido(p), 0);

  const ingresosTotales = ingresosCobrados + totalIngresosExtra;

  // ── GASTOS clasificados ─────────────────────────────────────────────
  const gastosPeriodo = (gastos || []).filter(
    (g) => g.tipo !== "previsto" && fechaEnPeriodo(g.fecha, periodo)
  );
  const grupos = { materia_prima: 0, mano_obra: 0, operativo: 0, personal: 0, otros: 0 };
  const porCategoria = {};
  gastosPeriodo.forEach((g) => {
    const monto = parseFloat(g.monto) || 0;
    const grupo = grupoDeCategoria(g.categoria);
    grupos[grupo] = (grupos[grupo] || 0) + monto;
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + monto;
  });

  // Costos de producción = materia prima + mano de obra registrada en gastos.
  // Si no hay mano de obra registrada como gasto, se estima por confección.
  const costoMateriaPrima = grupos.materia_prima;
  const manoObraGastos = grupos.mano_obra;
  const manoObraEstimada = pedidosPeriodo.reduce((s, p) => s + costoManoObraPedido(p), 0);
  const costoManoObra = manoObraGastos > 0 ? manoObraGastos : manoObraEstimada;
  const costosTotales = costoMateriaPrima + costoManoObra;

  const gastosOperativos = grupos.operativo;
  const gastosPersonales = grupos.personal;
  const gastosOtros = grupos.otros;

  // ── MÁRGENES ────────────────────────────────────────────────────────
  // Margen bruto sobre ingresos cobrados.
  const margenBruto = ingresosTotales - costosTotales;
  const margenBrutoPct = ingresosTotales > 0 ? (margenBruto / ingresosTotales) * 100 : 0;

  // ── EBITDA ──────────────────────────────────────────────────────────
  // EBITDA = Ingresos - Costos producción - Gastos operativos.
  // (No incluye impuestos financieros, depreciación ni gastos personales)
  const ebitda = ingresosTotales - costosTotales - gastosOperativos;
  const ebitdaPct = ingresosTotales > 0 ? (ebitda / ingresosTotales) * 100 : 0;

  // Resultado neto del negocio (incluye gastos personales, visión de caja real)
  const resultadoNeto = ingresosTotales - costosTotales - gastosOperativos - gastosPersonales - gastosOtros;

  // ── FLUJO DE CAJA ───────────────────────────────────────────────────
  const totalGastosReales = gastosPeriodo.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
  const flujoCajaDisponible = ingresosTotales - totalGastosReales;
  // Comprometido = saldos pendientes por cobrar (capital en calle global)
  const saldoPorCobrar = pedidos.reduce((s, p) => (p.entregado ? s : s + saldoPedido(p)), 0);

  // ── CAPITAL DE TRABAJO ──────────────────────────────────────────────
  // Activo circulante ≈ caja disponible + cuentas por cobrar.
  // Pasivo circulante ≈ gastos previstos pendientes (tipo "previsto").
  const gastosPrevistos = (gastos || [])
    .filter((g) => g.tipo === "previsto" && fechaEnPeriodo(g.fecha, periodo))
    .reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
  const activoCirculante = flujoCajaDisponible + saldoPorCobrar;
  const pasivoCirculante = gastosPrevistos;
  const capitalTrabajo = activoCirculante - pasivoCirculante;

  // ── TICKET PROMEDIO ─────────────────────────────────────────────────
  const cantPedidos = pedidosPeriodo.length;
  const ticketPromedio = cantPedidos > 0 ? Math.round(ingresosFacturados / cantPedidos) : 0;
  const totalUnidades = pedidosPeriodo.reduce((s, p) => s + unidadesPedido(p), 0);
  const precioPromedioUnidad = totalUnidades > 0 ? Math.round(ingresosFacturados / totalUnidades) : 0;

  // ── DSO (Days Sales Outstanding) ────────────────────────────────────
  const dso = calcularDSO(pedidos, periodo);

  return {
    periodo,
    // Ingresos
    ingresosTotales: Math.round(ingresosTotales),
    ingresosCobrados: Math.round(ingresosCobrados),
    ingresosFacturados: Math.round(ingresosFacturados),
    ingresosExtra: Math.round(totalIngresosExtra),
    // Costos
    costosTotales: Math.round(costosTotales),
    costoMateriaPrima: Math.round(costoMateriaPrima),
    costoManoObra: Math.round(costoManoObra),
    manoObraEsEstimada: manoObraGastos === 0,
    // Gastos
    gastosOperativos: Math.round(gastosOperativos),
    gastosPersonales: Math.round(gastosPersonales),
    gastosOtros: Math.round(gastosOtros),
    totalGastos: Math.round(totalGastosReales),
    porCategoria,
    grupos,
    // Márgenes
    margenBruto: Math.round(margenBruto),
    margenBrutoPct: Math.round(margenBrutoPct * 10) / 10,
    ebitda: Math.round(ebitda),
    ebitdaPct: Math.round(ebitdaPct * 10) / 10,
    resultadoNeto: Math.round(resultadoNeto),
    // Flujo de caja y capital
    flujoCajaDisponible: Math.round(flujoCajaDisponible),
    saldoPorCobrar: Math.round(saldoPorCobrar),
    capitalTrabajo: Math.round(capitalTrabajo),
    activoCirculante: Math.round(activoCirculante),
    pasivoCirculante: Math.round(pasivoCirculante),
    gastosPrevistos: Math.round(gastosPrevistos),
    // Operación
    ticketPromedio,
    precioPromedioUnidad,
    cantPedidos,
    totalUnidades,
    dso,
  };
}

// ════════════════════════════════════════════════════════════════════════
//  DSO — Days Sales Outstanding (días promedio de cobranza)
// ════════════════════════════════════════════════════════════════════════
// Mide cuántos días tarda en promedio el negocio en cobrar sus ventas.
// Para pedidos con pagos: usa la diferencia entre creación y último pago.
// Para pedidos con saldo pendiente: usa los días transcurridos desde creación.
function calcularDSO(pedidos, periodo) {
  let totalDias = 0;
  let n = 0;
  const hoyMs = Date.now();
  (pedidos || []).forEach((p) => {
    if (!fechaEnPeriodo(p.creado, periodo)) return;
    const total = totalPedido(p);
    if (total <= 0) return;
    const creadoMs = new Date((p.creado || "") + "T12:00:00").getTime();
    if (isNaN(creadoMs)) return;
    let finMs;
    const pagos = (p.pagos || []).filter((pg) => pg.fecha && parseFloat(pg.monto) > 0);
    const cobrado = cobradoPedido(p);
    if (cobrado >= total && pagos.length) {
      // Cobrado totalmente → usar fecha del último pago
      const ultima = pagos.reduce((max, pg) => (pg.fecha > max ? pg.fecha : max), pagos[0].fecha);
      finMs = new Date(ultima + "T12:00:00").getTime();
    } else {
      // Aún con saldo → días corridos hasta hoy
      finMs = hoyMs;
    }
    const dias = Math.max(0, Math.round((finMs - creadoMs) / (1000 * 60 * 60 * 24)));
    totalDias += dias;
    n += 1;
  });
  return n > 0 ? Math.round(totalDias / n) : 0;
}

// ════════════════════════════════════════════════════════════════════════
//  RENTABILIDAD POR CLIENTE (Top N)
// ════════════════════════════════════════════════════════════════════════
function rentabilidadPorCliente(pedidos, periodo, topN = 10) {
  const mapa = {};
  (pedidos || []).forEach((p) => {
    if (periodo && !fechaEnPeriodo(p.creado, periodo)) return;
    const cli = p.cliente || "Sin cliente";
    if (!mapa[cli]) {
      mapa[cli] = { cliente: cli, facturado: 0, cobrado: 0, saldo: 0, costoMO: 0, pedidos: 0, unidades: 0 };
    }
    mapa[cli].facturado += totalPedido(p);
    mapa[cli].cobrado += cobradoPedido(p);
    mapa[cli].saldo += saldoPedido(p);
    mapa[cli].costoMO += costoManoObraPedido(p);
    mapa[cli].pedidos += 1;
    mapa[cli].unidades += unidadesPedido(p);
  });
  const lista = Object.values(mapa).map((c) => {
    const margen = c.facturado - c.costoMO;
    return {
      ...c,
      facturado: Math.round(c.facturado),
      cobrado: Math.round(c.cobrado),
      saldo: Math.round(c.saldo),
      costoMO: Math.round(c.costoMO),
      margenEstimado: Math.round(margen),
      margenPct: c.facturado > 0 ? Math.round((margen / c.facturado) * 1000) / 10 : 0,
      ticketPromedio: c.pedidos > 0 ? Math.round(c.facturado / c.pedidos) : 0,
    };
  });
  lista.sort((a, b) => b.facturado - a.facturado);
  return topN ? lista.slice(0, topN) : lista;
}

// ════════════════════════════════════════════════════════════════════════
//  RENTABILIDAD POR TIPO DE PRENDA
// ════════════════════════════════════════════════════════════════════════
function rentabilidadPorPrenda(pedidos, periodo) {
  const mapa = {};
  (pedidos || []).forEach((p) => {
    if (periodo && !fechaEnPeriodo(p.creado, periodo)) return;
    (p.prendas || []).forEach((pr) => {
      const tipo = pr.tipoPrenda || "Sin tipo";
      if (!tipo || tipo === "Sin tipo") return;
      const cant = parseFloat(pr.cantidad) || 0;
      const ingreso = (parseFloat(pr.precioUnit) || 0) * cant;
      const costoMO = (COSTO_CONFECCION_CEO[tipo] || 0) * cant;
      if (!mapa[tipo]) mapa[tipo] = { tipo, unidades: 0, ingresos: 0, costoMO: 0 };
      mapa[tipo].unidades += cant;
      mapa[tipo].ingresos += ingreso;
      mapa[tipo].costoMO += costoMO;
    });
  });
  const lista = Object.values(mapa).map((t) => {
    const margen = t.ingresos - t.costoMO;
    return {
      ...t,
      ingresos: Math.round(t.ingresos),
      costoMO: Math.round(t.costoMO),
      margenEstimado: Math.round(margen),
      margenPct: t.ingresos > 0 ? Math.round((margen / t.ingresos) * 1000) / 10 : 0,
      precioPromedio: t.unidades > 0 ? Math.round(t.ingresos / t.unidades) : 0,
    };
  });
  return lista.sort((a, b) => b.ingresos - a.ingresos);
}

// ════════════════════════════════════════════════════════════════════════
//  TENDENCIAS (serie temporal de los últimos N meses)
// ════════════════════════════════════════════════════════════════════════
function tendenciaMensual({ pedidos = [], gastos = [], ingresosExtra = [] }, meses = 6) {
  const serie = [];
  const base = new Date();
  base.setDate(1);
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const ref = d.toISOString().slice(0, 7);
    const periodo = { tipo: "mensual", ref };
    const k = calcularKPIs({ pedidos, gastos, ingresosExtra }, periodo);
    const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    serie.push({
      ref,
      label: mesesNombres[d.getMonth()] + " " + String(d.getFullYear()).slice(2),
      ingresos: k.ingresosTotales,
      costos: k.costosTotales,
      gastosOperativos: k.gastosOperativos,
      margenBruto: k.margenBruto,
      ebitda: k.ebitda,
      resultadoNeto: k.resultadoNeto,
    });
  }
  return serie;
}

// ════════════════════════════════════════════════════════════════════════
//  ALERTAS FINANCIERAS
// ════════════════════════════════════════════════════════════════════════
function generarAlertas(kpis, opts = {}) {
  const alertas = [];
  const umbralCaja = opts.umbralCajaMin != null ? opts.umbralCajaMin : 0;
  const umbralDSO = opts.umbralDSO != null ? opts.umbralDSO : 30;
  const umbralMargen = opts.umbralMargenMin != null ? opts.umbralMargenMin : 20;

  if (kpis.flujoCajaDisponible < umbralCaja) {
    alertas.push({
      nivel: "critico",
      icon: "🔴",
      titulo: "Flujo de caja negativo",
      detalle: `El flujo de caja disponible del período es Gs. ${kpis.flujoCajaDisponible.toLocaleString("es-AR")}.`,
    });
  }
  if (kpis.dso > umbralDSO) {
    alertas.push({
      nivel: "alto",
      icon: "🟠",
      titulo: "DSO elevado",
      detalle: `Se está tardando en promedio ${kpis.dso} días en cobrar (umbral ${umbralDSO}). Revisar cobranzas.`,
    });
  }
  if (kpis.margenBrutoPct < umbralMargen && kpis.ingresosTotales > 0) {
    alertas.push({
      nivel: "alto",
      icon: "🟠",
      titulo: "Margen bruto bajo",
      detalle: `El margen bruto es ${kpis.margenBrutoPct}% (umbral ${umbralMargen}%).`,
    });
  }
  if (kpis.ebitda < 0) {
    alertas.push({
      nivel: "critico",
      icon: "🔴",
      titulo: "EBITDA negativo",
      detalle: "La operación está generando pérdidas antes de gastos personales.",
    });
  }
  if (kpis.saldoPorCobrar > kpis.ingresosTotales && kpis.ingresosTotales > 0) {
    alertas.push({
      nivel: "medio",
      icon: "🟡",
      titulo: "Capital en calle alto",
      detalle: `Hay Gs. ${kpis.saldoPorCobrar.toLocaleString("es-AR")} por cobrar, más que los ingresos del período.`,
    });
  }
  if (kpis.gastosPersonales > kpis.gastosOperativos && kpis.gastosPersonales > 0) {
    alertas.push({
      nivel: "medio",
      icon: "🟡",
      titulo: "Gastos personales altos",
      detalle: `Los gastos personales (Gs. ${kpis.gastosPersonales.toLocaleString("es-AR")}) superan los operativos.`,
    });
  }
  return alertas;
}

// Alerta específica: descuentos excesivos detectados en pedidos.
function alertasDescuentos(pedidos, opts = {}) {
  const umbral = opts.umbralPct != null ? opts.umbralPct : 20;
  const alertas = [];
  (pedidos || []).forEach((p) => {
    const d = p.descuento;
    if (d && parseFloat(d.pct) >= umbral) {
      alertas.push({
        nivel: "medio",
        icon: "🏷️",
        titulo: `Descuento ${d.pct}% en ${p.cliente}`,
        detalle: `Pedido ${p.id}: ${d.razon_label || d.razon || "sin razón"} · Gs. ${(parseFloat(d.monto_descuento) || 0).toLocaleString("es-AR")} autorizado por ${d.autorizado_por || "?"}.`,
      });
    }
  });
  return alertas;
}

// ════════════════════════════════════════════════════════════════════════
//  PROYECCIONES (basadas en pedidos pendientes / saldos por cobrar)
// ════════════════════════════════════════════════════════════════════════
function proyecciones(pedidos) {
  let porCobrarTotal = 0;
  let porCobrar30 = 0;
  let backlogFacturacion = 0;
  const hoyMs = Date.now();
  (pedidos || []).forEach((p) => {
    if (p.entregado) return;
    const saldo = saldoPedido(p);
    porCobrarTotal += saldo;
    backlogFacturacion += totalPedido(p);
    // Estimación: saldos de pedidos con entrega dentro de 30 días
    if (p.fecha_entrega) {
      const fMs = new Date(p.fecha_entrega + "T12:00:00").getTime();
      const dias = (fMs - hoyMs) / (1000 * 60 * 60 * 24);
      if (dias <= 30) porCobrar30 += saldo;
    }
  });
  return {
    porCobrarTotal: Math.round(porCobrarTotal),
    porCobrar30dias: Math.round(porCobrar30),
    backlogFacturacion: Math.round(backlogFacturacion),
  };
}

export {
  COSTO_CONFECCION_CEO,
  CATEGORIAS_GASTO,
  grupoDeCategoria,
  fechaEnPeriodo,
  totalPedido,
  cobradoPedido,
  saldoPedido,
  unidadesPedido,
  costoManoObraPedido,
  calcularKPIs,
  calcularDSO,
  rentabilidadPorCliente,
  rentabilidadPorPrenda,
  tendenciaMensual,
  generarAlertas,
  alertasDescuentos,
  proyecciones,
};
