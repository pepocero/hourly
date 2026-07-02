export function downloadPdfBlob(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'informe.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function revokePdfPreview(preview) {
  if (preview?.url) {
    URL.revokeObjectURL(preview.url);
  }
}
