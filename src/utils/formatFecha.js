/** Utilidades de formato de fecha para visualización (dd/MM/aaaa). */

export function parseFechaLocal(dateString) {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  const s = String(dateString);
  if (s.includes('T')) return new Date(s);
  return new Date(`${s}T00:00:00`);
}

export function formatFechaEU(dateString) {
  const date = parseFechaLocal(dateString);
  if (!date || Number.isNaN(date.getTime())) return '—';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function formatFechaEUCorta(dateString) {
  const date = parseFechaLocal(dateString);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatFechaRegistro(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatEuro(amount, decimals = 2) {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = typeof amount === 'number' ? amount : parseFloat(amount);
  if (Number.isNaN(n)) return '—';
  return `€${n.toFixed(decimals)}`;
}

export function formatEuroPorHora(amount) {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = typeof amount === 'number' ? amount : parseFloat(amount);
  if (Number.isNaN(n)) return '—';
  return `€${n}/h`;
}
