import ConsolidadorTejidos from "./ConsolidadorTejidos";

// Dentro de tu componente App:
const [mostrarConsolidador, setMostrarConsolidador] = useState(false);

// Botón para abrir (ponelo donde quieras en tu UI)
<button
  onClick={() => setMostrarConsolidador(true)}
  className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
>
  🧶 Consolidar Tejidos
</button>

// Render del modal (al final del return, junto a tus otros modales)
{mostrarConsolidador && (
  <ConsolidadorTejidos
    pedidos={pedidos}
    onClose={() => setMostrarConsolidador(false)}
  />
)}
