const MAX_BYTES = 8 * 1024 * 1024;
// Fotos são reduzidas antes do envio para economizar o armazenamento (≈300–500 KB cada).
// 1600 px no maior lado mantém detalhes legíveis em relatórios A4.
const MAX_SIDE = 1600;
const TARGET_BYTES = 500 * 1024;
const KEEP_AS_IS_BYTES = 350 * 1024;
const SUPPORTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function decodePhoto(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch { /* Try the browser image decoder below. */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Este celular não conseguiu abrir a foto. Escolha uma imagem JPG ou tire outra foto com o formato “Mais compatível” da câmera.'));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function jpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a foto neste celular. Tente uma imagem JPG.')),
    'image/jpeg', quality,
  ));
}

export async function preparePhoto(file: File): Promise<File> {
  const type = file.type.toLowerCase();
  const photoName = file.name || 'foto';
  const extension = photoName.split('.').pop()?.toLowerCase();
  const isPhoto = type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extension || '');
  if (!isPhoto) throw new Error(`${photoName}: selecione uma imagem.`);
  if (SUPPORTED.has(type) && file.size <= KEEP_AS_IS_BYTES) return file;

  const image = await decodePhoto(file);
  try {
    const width = image.width;
    const height = image.height;
    if (!width || !height) throw new Error('A imagem está vazia.');
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a foto neste celular.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob = await jpegBlob(canvas, 0.8);
    for (const quality of [0.7, 0.6, 0.5]) {
      if (blob.size <= TARGET_BYTES) break;
      blob = await jpegBlob(canvas, quality);
    }
    if (SUPPORTED.has(type) && blob.size >= file.size) return file;
    if (blob.size > MAX_BYTES) throw new Error('A foto ainda está muito grande. Escolha uma imagem menor.');
    return new File([blob], photoName.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified });
  } finally {
    if ('close' in image) image.close();
  }
}
