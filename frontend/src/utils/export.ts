/**
 * Utilitários de exportação de dados (CSV) e de gráficos (PNG).
 */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Gera e descarrega um ficheiro CSV a partir de cabeçalhos e linhas.
 * Inclui BOM para que o Excel abra acentos corretamente.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  triggerDownload(blob, filename);
}

/**
 * Exporta o primeiro SVG dentro de `container` (um gráfico Recharts)
 * como imagem PNG de alta resolução (2x), com fundo preenchido.
 */
export async function downloadChartPng(
  container: HTMLElement | null,
  filename: string,
): Promise<boolean> {
  if (!container) return false;
  const svg = container.querySelector('svg');
  if (!svg) return false;

  const width = svg.clientWidth || svg.getBoundingClientRect().width;
  const height = svg.clientHeight || svg.getBoundingClientRect().height;
  if (!width || !height) return false;

  // Fundo com a cor de superfície atual (claro ou escuro)
  const bg =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--surface')
      .trim() || '#ffffff';

  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Falha ao rasterizar o gráfico.'));
      img.src = url;
    });

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise<boolean>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          triggerDownload(blob, filename);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
