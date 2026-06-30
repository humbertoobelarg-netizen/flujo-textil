// ════════════════════════════════════════════════════════════════════════
//  politicas_descuento.js
//  Sistema formal de descuentos para "Flujo Textil" (técnica remeras)
//  ----------------------------------------------------------------------
//  Configuración de políticas por rol, razones predefinidas, validación
//  automática y helpers de trazabilidad. 100% plug-and-play, sin
//  dependencias externas. Moneda: Guaraníes (Gs.).
// ════════════════════════════════════════════════════════════════════════

// ── 1. POLÍTICAS DE DESCUENTO POR ROL ───────────────────────────────────
// Cada rol tiene un tope máximo de descuento (%) que puede autorizar por sí
// mismo. Descuentos por encima del tope requieren aprobación de un rol
// superior (campo "requiereAprobacion").
//
// La app maneja usuarios con { rol:"admin"|... , nombre:"Gabi"|"Vivi"|... }.
// Mapeamos tanto por "rol" como por "nombre" para cubrir los nombres reales
// usados en el sistema (Gabi = finanzas, Vivi/Romina = ventas, etc.).

const POLITICAS_DESCUENTO = {
  // Rol técnico de la app
  admin: {
    label: "Administrador / Dueño",
    maxPct: 30,
    requiereAprobacionSobre: 30,
    puedeAprobar: true,
  },
  supervisor: {
    label: "Supervisor",
    maxPct: 15,
    requiereAprobacionSobre: 15,
    puedeAprobar: true,
  },
  vendedor: {
    label: "Vendedor",
    maxPct: 5,
    requiereAprobacionSobre: 5,
    puedeAprobar: false,
  },
};

// Mapeo de nombres reales del sistema → rol de descuentos.
// Permite que la política se aplique aunque la app no tenga el campo "rol".
const MAPEO_NOMBRE_ROL = {
  // Dueño / administración
  admin: "admin",
  Humberto: "admin",
  // Finanzas / gerencia comercial → supervisor
  Gabi: "supervisor",
  Romina: "supervisor",
  // Ventas
  Vivi: "vendedor",
  Vendedor2: "vendedor",
};

// Determina el rol de descuentos efectivo de un usuario de la app.
function getRolDescuento(usuario) {
  if (!usuario) return "vendedor";
  if (usuario.rol === "admin") return "admin";
  if (usuario.nombre && MAPEO_NOMBRE_ROL[usuario.nombre]) {
    return MAPEO_NOMBRE_ROL[usuario.nombre];
  }
  // Roles directos
  if (POLITICAS_DESCUENTO[usuario.rol]) return usuario.rol;
  return "vendedor";
}

// Devuelve la política completa de un usuario.
function getPoliticaUsuario(usuario) {
  const rol = getRolDescuento(usuario);
  return { rol, ...POLITICAS_DESCUENTO[rol] };
}

// Tope máximo de descuento (%) que un usuario puede aplicar sin aprobación.
function getMaxDescuento(usuario) {
  return getPoliticaUsuario(usuario).maxPct;
}

// ── 2. RAZONES DE DESCUENTO PREDEFINIDAS ────────────────────────────────
const RAZONES_DESCUENTO = [
  {
    key: "volumen",
    label: "Volumen / Cantidad",
    icon: "📦",
    descripcion: "Descuento por compra en gran cantidad.",
    maxSugerido: 24,
  },
  {
    key: "cliente_frecuente",
    label: "Cliente frecuente",
    icon: "⭐",
    descripcion: "Fidelización de cliente recurrente.",
    maxSugerido: 15,
  },
  {
    key: "promocion",
    label: "Promoción / Campaña",
    icon: "🎯",
    descripcion: "Descuento por promoción vigente.",
    maxSugerido: 20,
  },
  {
    key: "ajuste",
    label: "Ajuste comercial",
    icon: "🤝",
    descripcion: "Ajuste puntual de negociación.",
    maxSugerido: 10,
  },
  {
    key: "demora",
    label: "Compensación por demora",
    icon: "⏱️",
    descripcion: "Compensación por retraso en la entrega.",
    maxSugerido: 15,
  },
  {
    key: "fidelizacion_pago",
    label: "Pronto pago / Contado",
    icon: "💵",
    descripcion: "Descuento por pago anticipado o de contado.",
    maxSugerido: 10,
  },
];

function getRazon(key) {
  return RAZONES_DESCUENTO.find((r) => r.key === key) || null;
}

// ── 3. VALIDACIÓN DE DESCUENTOS ─────────────────────────────────────────
// Valida un descuento contra la política del usuario y la razón elegida.
// Devuelve { ok, requiereAprobacion, motivo, advertencias[], politica }.
function validarDescuento({ pct, usuario, razonKey }) {
  const advertencias = [];
  const politica = getPoliticaUsuario(usuario);
  const pctNum = parseFloat(pct);

  // Validaciones básicas de formato
  if (isNaN(pctNum)) {
    return { ok: false, motivo: "El porcentaje no es válido.", requiereAprobacion: false, advertencias, politica };
  }
  if (pctNum < 0) {
    return { ok: false, motivo: "El descuento no puede ser negativo.", requiereAprobacion: false, advertencias, politica };
  }
  if (pctNum > 100) {
    return { ok: false, motivo: "El descuento no puede superar el 100%.", requiereAprobacion: false, advertencias, politica };
  }

  // Razón obligatoria
  const razon = getRazon(razonKey);
  if (!razon) {
    return { ok: false, motivo: "Debe seleccionar una razón de descuento.", requiereAprobacion: false, advertencias, politica };
  }

  // Sugerencia (no bloqueante) según razón
  if (pctNum > razon.maxSugerido) {
    advertencias.push(
      `El descuento (${pctNum}%) supera el máximo sugerido para "${razon.label}" (${razon.maxSugerido}%).`
    );
  }

  // Tope por política de rol
  if (pctNum > politica.maxPct) {
    if (politica.puedeAprobar) {
      // admin/supervisor: por encima de su tope se rechaza (no hay rol superior)
      return {
        ok: false,
        motivo: `${politica.label} puede autorizar hasta ${politica.maxPct}%. El descuento de ${pctNum}% excede la política.`,
        requiereAprobacion: false,
        advertencias,
        politica,
      };
    }
    // vendedor: requiere aprobación de un superior
    return {
      ok: false,
      requiereAprobacion: true,
      motivo: `${politica.label} puede autorizar hasta ${politica.maxPct}%. El descuento de ${pctNum}% requiere aprobación de un supervisor o administrador.`,
      advertencias,
      politica,
    };
  }

  // Alerta de margen agresivo (no bloqueante)
  if (pctNum >= 20) {
    advertencias.push("Descuento alto: verificar impacto en el margen bruto antes de confirmar.");
  }

  return { ok: true, requiereAprobacion: false, motivo: "Descuento dentro de política.", advertencias, politica };
}

// ── 4. CONSTRUCCIÓN DE REGISTRO DE DESCUENTO (TRAZABILIDAD) ──────────────
// Genera el objeto que se guarda en el pedido (campo "descuento") con
// trazabilidad completa: quién, cuándo, por qué y cuánto.
function construirRegistroDescuento({ pct, razonKey, usuario, montoOriginal, nota = "", aprobadoPor = null }) {
  const pctNum = parseFloat(pct) || 0;
  const original = parseFloat(montoOriginal) || 0;
  const montoDescuento = Math.round(original * pctNum / 100);
  const razon = getRazon(razonKey);
  return {
    id: "DSC" + Date.now(),
    pct: pctNum,
    razon: razonKey,
    razon_label: razon ? razon.label : razonKey,
    monto_original: original,
    monto_descuento: montoDescuento,
    monto_final: original - montoDescuento,
    autorizado_por: usuario?.nombre || usuario?.rol || "Desconocido",
    rol_autoriza: getRolDescuento(usuario),
    aprobado_por: aprobadoPor,
    fecha: new Date().toISOString(),
    nota: nota || "",
  };
}

// ── 5. HISTORIAL DE DESCUENTOS POR CLIENTE ──────────────────────────────
// Recorre la lista de pedidos y agrupa los descuentos aplicados por cliente.
function historialDescuentosPorCliente(pedidos) {
  const mapa = {};
  (pedidos || []).forEach((p) => {
    const descs = [];
    if (p.descuento) descs.push(p.descuento);
    if (Array.isArray(p.descuentos)) descs.push(...p.descuentos);
    if (!descs.length) return;
    const cli = p.cliente || "Sin cliente";
    if (!mapa[cli]) mapa[cli] = { cliente: cli, descuentos: [], totalDescontado: 0, cantidad: 0 };
    descs.forEach((d) => {
      mapa[cli].descuentos.push({ ...d, pedido: p.id });
      mapa[cli].totalDescontado += parseFloat(d.monto_descuento) || 0;
      mapa[cli].cantidad += 1;
    });
  });
  return Object.values(mapa).sort((a, b) => b.totalDescontado - a.totalDescontado);
}

// Lista plana de todos los descuentos (para auditoría / dashboard).
function listarTodosDescuentos(pedidos) {
  const out = [];
  (pedidos || []).forEach((p) => {
    const descs = [];
    if (p.descuento) descs.push(p.descuento);
    if (Array.isArray(p.descuentos)) descs.push(...p.descuentos);
    descs.forEach((d) => out.push({ ...d, pedido: p.id, cliente: p.cliente }));
  });
  return out.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
}

// ── 6. IMPACTO EN MARGEN ────────────────────────────────────────────────
// Calcula cómo un descuento afecta el margen bruto de una venta.
//   precio  = precio de venta antes de descuento
//   costo   = costo total del producto (materia prima + mano de obra)
function impactoEnMargen({ precio, costo, pct }) {
  const p = parseFloat(precio) || 0;
  const c = parseFloat(costo) || 0;
  const d = parseFloat(pct) || 0;
  const precioFinal = Math.round(p * (1 - d / 100));
  const margenAntes = p - c;
  const margenDespues = precioFinal - c;
  const margenPctAntes = p > 0 ? (margenAntes / p) * 100 : 0;
  const margenPctDespues = precioFinal > 0 ? (margenDespues / precioFinal) * 100 : 0;
  return {
    precioOriginal: p,
    precioFinal,
    montoDescuento: p - precioFinal,
    costo: c,
    margenAntes,
    margenDespues,
    margenPctAntes: Math.round(margenPctAntes * 10) / 10,
    margenPctDespues: Math.round(margenPctDespues * 10) / 10,
    caidaPuntos: Math.round((margenPctAntes - margenPctDespues) * 10) / 10,
    quedaEnPerdida: margenDespues < 0,
  };
}

export {
  POLITICAS_DESCUENTO,
  MAPEO_NOMBRE_ROL,
  RAZONES_DESCUENTO,
  getRolDescuento,
  getPoliticaUsuario,
  getMaxDescuento,
  getRazon,
  validarDescuento,
  construirRegistroDescuento,
  historialDescuentosPorCliente,
  listarTodosDescuentos,
  impactoEnMargen,
};
