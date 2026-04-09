export type ResizedImage = {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load image.'));
    image.src = dataUrl;
  });
}

export async function resizeImageToDataUrl(
  file: File,
  maxDimension = 512
): Promise<ResizedImage> {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to process image.');
  }

  context.drawImage(image, 0, 0, width, height);

  const requestedType = file.type === 'image/png' ? 'image/png' : 'image/webp';
  let dataUrl = canvas.toDataURL(requestedType, 0.88);
  let mimeType = requestedType;

  if (dataUrl === 'data:,') {
    dataUrl = canvas.toDataURL('image/png');
    mimeType = 'image/png';
  }

  return { dataUrl, mimeType, width, height };
}
