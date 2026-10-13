/**
 * Compresses an image file in the browser so it is small enough to sync.
 * Never hangs: every step has a timeout and errors are rejected cleanly.
 */
export async function compressImageFile(
  file: File,
  maxSize = 512,
  maxBytes = 200_000,
  timeoutMs = 20000
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('NOT_IMAGE');
  const work = (async () => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(r.error || new Error('READ_FAILED'));
      r.onabort = () => reject(new Error('READ_ABORTED'));
      r.readAsDataURL(file);
    });
    if (file.type === 'image/svg+xml' && dataUrl.length <= maxBytes) return dataUrl;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('DECODE_FAILED'));
      i.src = dataUrl;
    });
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl.length <= maxBytes ? dataUrl : Promise.reject(new Error('CANVAS_FAILED'));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // PNG keeps transparency for logos; fall back to WebP/JPEG if too big.
    let out = canvas.toDataURL('image/png');
    for (let q = 0.9; out.length > maxBytes && q >= 0.4; q -= 0.15) {
      out = canvas.toDataURL('image/webp', q);
      if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', q);
    }
    if (out.length > maxBytes) throw new Error('TOO_LARGE');
    return out;
  })();
  return new Promise<string>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    work.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}
