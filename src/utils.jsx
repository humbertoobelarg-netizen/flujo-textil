import { useState, useEffect, Fragment } from "react";

// --- CONFIGURACIÓN CENTRAL (Variables de Entorno) ---
export const EMAILJS_SERVICE = import.meta.env.VITE_EMAILJS_SERVICE;
export const EMAILJS_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE;
export const EMAILJS_KEY = import.meta.env.VITE_EMAILJS_KEY;

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const H = { 
  "Content-Type": "application/json", 
  "apikey": SUPABASE_KEY, 
  "Authorization": `Bearer ${SUPABASE_KEY}`, 
  "Prefer": "return=representation",
  "x-app-secret": "FT2026_8x9kQm3vZpL7nR2wTy5sJh4cBn6dAe1g" 
};

// --- MÓDULO DE BASE DE DATOS ---
export const db = {
  get: async (t, q = "") => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?${q}`, { headers: H });
    return r.json();
  },
  insert: async (t, d) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}`, { method: "POST", headers: H, body: JSON.stringify(d) });
    return r.json();
  },
  patch: async (t, id, d) => {
    return await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`, { method: "PATCH", headers: H, body: JSON.stringify(d) });
  },
  delete: async (t, id) => {
    return await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`, { method: "DELETE", headers: H });
  }
};

// --- CONSTANTES ---
export const PROCESOS = [
  { key: "orden", label: "Orden de Pedido", icon: "📋", color: "#64748b" },
  { key: "diseno", label: "Diseño", icon: "🎨", color: "#f43f5e" },
  { key: "corte", label: "Corte", icon: "✂️", color: "#f59e0b" },
  { key: "confeccion", label: "Confección", icon: "🧵", color: "#ec4899" },
  { key: "serigrafia", label: "Serigrafía", icon: "🖨️", color: "#e85d26" },
  { key: "bordado", label: "Bordado", icon: "🪡", color: "#a855f7" },
  { key: "sublimacion", label: "Sublimación", icon: "🌈", color: "#06b6d4" },
  { key: "dtf", label: "DTF", icon: "🖼️", color: "#10b981" },
  { key: "terminacion", label: "Terminación", icon: "📦", color: "#3b82f6" },
];

export const PRIORIDADES = [
  { key: "alta", label: "Alta", color: "#ef4444" },
  { key: "media", label: "Media", color: "#f59e0b" },
  { key: "baja", label: "Baja", color: "#10b981" }
];

export const ETAPA_LABEL = { pendiente: "Pendiente", en_proceso: "En proceso", listo: "✓ Listo" };
export const ETAPA_COLOR = { pendiente: "#64748b", en_proceso: "#f59e0b", listo: "#10b981" };

export const TALLES_LIST = ["2", "4", "6", "8", "10", "12", "14", "16", "S", "M", "L", "XL", "XXL", "3XL", "ESP"];

// --- FUNCIONES DE CÁLCULO ---
export const hoy = () => new Date().toISOString().split("T")[0];

export const formatFecha = (f) => {
  if (!f) return "-";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y.slice(-2)}`;
};

export const pedidoProgreso = (p) => {
  if (!p?.procesos) return 0;
  const vals = Object.values(p.procesos);
  const listos = vals.filter(v => v === "listo").length;
  return Math.round((listos / PROCESOS.length) * 100);
};

// ... (Aquí puedes mantener tus otras funciones de cálculo textil que tenías)
