// Servicio de imágenes: compresión en el cliente
// ES2024, sin dependencias externas

const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => resolve(e.target.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => {
  canvas.toBlob((blob) => resolve(blob), type, quality);
});

export async function compressImage(
  file,
  {
    maxBytes = 5 * 1024 * 1024, // 5MB
    maxWidth = 1600,
    maxHeight = 1600,
    outputType = 'image/jpeg', // usar 'image/webp' si quieres transparencia
    initialQuality = 0.8,
    minQuality = 0.5,
    step = 0.1,
  } = {}
) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('El archivo no es una imagen');
  }

  const originalDataUrl = await readFileAsDataURL(file);
  const img = await loadImage(originalDataUrl);

  const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  let quality = initialQuality;
  let blob = await canvasToBlob(canvas, outputType, quality);
  while (blob && blob.size > maxBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - step);
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  const base64 = canvas.toDataURL(outputType, quality);
  const ext = outputType === 'image/jpeg' ? '.jpg' : outputType === 'image/webp' ? '.webp' : '.png';
  const name = file.name.replace(/\.[^.]+$/, ext);
  const compressedFile = new File([blob], name, { type: outputType });

  return { file: compressedFile, base64, name: compressedFile.name, size: compressedFile.size };
}