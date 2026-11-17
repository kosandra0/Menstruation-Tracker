/** Background image storage: a single Blob in IndexedDB. Images never leave the device. */

const DB = "mt-media";
const STORE = "kv";
const KEY = "background";
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_SIDE = 2560;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/avif"];

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB unavailable"));
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result);
      t.onerror = () => reject(t.error ?? new Error("IndexedDB error"));
      t.onabort = () => reject(t.error ?? new Error("IndexedDB aborted"));
    });
  } finally {
    db.close();
  }
}

export const loadBackground = async (): Promise<Blob | null> => (await tx<Blob | undefined>("readonly", (s) => s.get(KEY))) ?? null;
export const saveBackground = async (blob: Blob): Promise<void> => void (await tx("readwrite", (s) => s.put(blob, KEY)));
export const clearBackground = async (): Promise<void> => void (await tx("readwrite", (s) => s.delete(KEY)));

export class ImageImportError extends Error {}

/**
 * Validates and (if huge) downscales an imported image. Decoding happens in createImageBitmap, which is
 * asynchronous and off the main thread, so a large wallpaper never freezes the UI.
 */
export async function prepareImage(file: File): Promise<Blob> {
  if (!ACCEPTED.includes(file.type)) throw new ImageImportError("Please choose a PNG, JPEG, WebP, GIF, BMP or AVIF image.");
  if (file.size > MAX_IMAGE_BYTES) throw new ImageImportError("That image is larger than 20 MB. Please choose a smaller one.");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new ImageImportError("That file could not be read as an image.");
  }
  try {
    const longest = Math.max(bmp.width, bmp.height);
    if (longest <= MAX_IMAGE_SIDE) return file;
    const k = MAX_IMAGE_SIDE / longest;
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    return await canvas.convertToBlob({ type: "image/webp", quality: 0.9 });
  } finally {
    bmp.close();
  }
}
