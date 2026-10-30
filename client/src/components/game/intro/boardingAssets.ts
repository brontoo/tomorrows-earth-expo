import { CABIN_IMAGE, journeyScenes } from '../train/journeyScenes';

/** Canonical user-supplied artwork; retain its original filename. */
export const boardingArtwork = {
  filename: 'Gemini_Generated_Image_43lqmg43lqmg43lq.jpg.jpg',
  src: '/train/Gemini_Generated_Image_43lqmg43lqmg43lq.jpg.jpg',
  width: 2752, height: 1536,
  doorway: { x: 0.695, y: 0.57 },
} as const;
const decoded = new Map<string, Promise<HTMLImageElement>>();
export function preloadImage(src: string): Promise<HTMLImageElement> {
  const existing = decoded.get(src); if (existing) return existing;
  const task = (async () => {
    const image = new Image(); image.decoding = 'async'; image.src = src;
    try { await image.decode(); return image; }
    catch (error) { decoded.delete(src); throw error; }
  })();
  decoded.set(src, task); return task;
}
export function preloadBoardingAssets() {
  return Promise.all([boardingArtwork.src, CABIN_IMAGE, '/train/window-mask.png', '/train/cabin-mask.png',
    ...journeyScenes.slice(0, 2).map(scene => scene.image)].map(preloadImage));
}
