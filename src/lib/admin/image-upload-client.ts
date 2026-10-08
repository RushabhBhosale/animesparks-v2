export interface UploadedAdminImage {
  key: string;
  publicUrl: string;
  size: number;
  type: string;
}

export async function uploadAdminImage(file: File): Promise<UploadedAdminImage> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Images must be 10 MB or smaller.');

  const form = new FormData();
  form.append('file', file, file.name || `pasted-image.${file.type.split('/')[1] || 'png'}`);
  const response = await fetch('/api/admin/media/upload', {
    method: 'POST',
    body: form,
    credentials: 'same-origin',
  });
  const result = await response.json() as Partial<UploadedAdminImage> & { error?: string };
  if (!response.ok || !result.key || !result.publicUrl) {
    throw new Error(result.error || 'Image upload failed. Please try again.');
  }
  return result as UploadedAdminImage;
}

export async function importAdminImageUrl(url: string): Promise<UploadedAdminImage> {
  const response = await fetch('/api/admin/media/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ url }),
  });
  const result = await response.json() as Partial<UploadedAdminImage> & { error?: string };
  if (!response.ok || !result.key || !result.publicUrl) {
    throw new Error(result.error || 'Image import failed. Please try again.');
  }
  return result as UploadedAdminImage;
}

export async function uploadClipboardImage(clipboard: DataTransfer | null): Promise<UploadedAdminImage | null> {
  const image = await imageFromClipboard(clipboard);
  if (!image) return null;
  return typeof image === 'string' ? importAdminImageUrl(image) : uploadAdminImage(image);
}

export function clipboardHasImage(clipboard: DataTransfer | null): boolean {
  if (!clipboard) return false;
  return Array.from(clipboard.files).some(file => file.type.startsWith('image/')) ||
    Array.from(clipboard.items).some(item => item.type.startsWith('image/')) ||
    /<img[^>]+src=["'][^"']+["']/i.test(clipboard.getData('text/html'));
}

export async function imageFromClipboard(clipboard: DataTransfer | null): Promise<File | string | null> {
  if (!clipboard) return null;

  const file = Array.from(clipboard.files).find(item => item.type.startsWith('image/'));
  if (file) return file;

  for (const item of Array.from(clipboard.items)) {
    if (item.type.startsWith('image/')) {
      const imageFile = item.getAsFile();
      if (imageFile) return imageFile;
    }
  }

  const html = clipboard.getData('text/html');
  const imageSrc = new DOMParser().parseFromString(html, 'text/html').querySelector('img')?.getAttribute('src');
  if (!imageSrc) return null;
  if (/^https?:\/\//i.test(imageSrc) || imageSrc.startsWith('/')) return new URL(imageSrc, window.location.href).href;
  if (!/^data:image\/(?:png|jpeg|webp|gif|avif);base64,/i.test(imageSrc)) return null;

  const response = await fetch(imageSrc);
  const blob = await response.blob();
  const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  return new File([blob], `pasted-image.${extension}`, { type: blob.type });
}
