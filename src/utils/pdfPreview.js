export function esDispositivoMovilPdf() {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const esMovilUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const esPantallaTactil = navigator.maxTouchPoints > 0 && window.matchMedia('(max-width: 768px)').matches;

  return esMovilUa || esPantallaTactil;
}

export function downloadPdfBlob(blob, filename) {
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'informe.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** En móvil el visor embebido falla; abrir el PDF en pestaña del navegador. */
export function abrirPdfEnNuevaPestana(blob, filename) {
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const name = filename || 'informe.pdf';

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  if (!esDispositivoMovilPdf()) {
    link.download = name;
  }

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  return true;
}

export function revokePdfPreview(preview) {
  if (preview?.url) {
    URL.revokeObjectURL(preview.url);
  }
}
