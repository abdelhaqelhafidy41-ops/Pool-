/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Extracts the real avatar photos (Emely and Mike) and gold pot graphic directly
 * from the reference image (/assets/aistudio/unnamed_d050ff17.webp)
 * with robust SVG/Canvas fallbacks.
 */

let cachedEmelyAvatar: string | null = null;
let cachedMikeAvatar: string | null = null;
let cachedPotCoins: string | null = null;

export function loadReferenceSprites(onReady: () => void) {
  if (cachedEmelyAvatar && cachedMikeAvatar) {
    onReady();
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = '/assets/aistudio/unnamed_d050ff17.webp';

  img.onload = () => {
    try {
      const naturalW = img.naturalWidth || 421;
      const naturalH = img.naturalHeight || 296;
      const scaleX = naturalW / 421;
      const scaleY = naturalH / 296;

      // 1. Crop Emely's photo
      const emelyCanvas = document.createElement('canvas');
      emelyCanvas.width = 80;
      emelyCanvas.height = 80;
      const eCtx = emelyCanvas.getContext('2d');
      if (eCtx) {
        // Source coords in 421x296: x ~ 150, y ~ 11, w ~ 32, h ~ 32
        const sx = 149 * scaleX;
        const sy = 9 * scaleY;
        const sw = 34 * scaleX;
        const sh = 34 * scaleY;
        eCtx.drawImage(img, sx, sy, sw, sh, 0, 0, 80, 80);
        cachedEmelyAvatar = emelyCanvas.toDataURL('image/png');
      }

      // 2. Crop Mike's photo
      const mikeCanvas = document.createElement('canvas');
      mikeCanvas.width = 80;
      mikeCanvas.height = 80;
      const mCtx = mikeCanvas.getContext('2d');
      if (mCtx) {
        // Source coords in 421x296: x ~ 238, y ~ 11, w ~ 32, h ~ 32
        const sx = 238 * scaleX;
        const sy = 9 * scaleY;
        const sw = 34 * scaleX;
        const sh = 34 * scaleY;
        mCtx.drawImage(img, sx, sy, sw, sh, 0, 0, 80, 80);
        cachedMikeAvatar = mikeCanvas.toDataURL('image/png');
      }

      // 3. Crop Gold Coins Pot (chips only, without the 200 label underneath to avoid double digits)
      const potCanvas = document.createElement('canvas');
      potCanvas.width = 80;
      potCanvas.height = 48;
      const pCtx = potCanvas.getContext('2d');
      if (pCtx) {
        const sx = 192 * scaleX;
        const sy = 7 * scaleY;
        const sw = 37 * scaleX;
        const sh = 17 * scaleY;
        pCtx.drawImage(img, sx, sy, sw, sh, 0, 0, 80, 48);
        cachedPotCoins = potCanvas.toDataURL('image/png');
      }

      onReady();
    } catch {
      onReady();
    }
  };

  img.onerror = () => {
    onReady();
  };
}

export function getEmelyAvatar(): string | null {
  return cachedEmelyAvatar;
}

export function getMikeAvatar(): string | null {
  return cachedMikeAvatar;
}

export function getPotCoins(): string | null {
  return cachedPotCoins;
}

export function getAvatarImage(seed?: string): string | null {
  if (!seed || seed === 'player1' || seed === 'emely' || seed === 'avatar_emely') {
    return cachedEmelyAvatar;
  }
  if (seed === 'mike' || seed === 'ai_bot' || seed === 'avatar_mike' || seed === 'player2') {
    return cachedMikeAvatar;
  }
  if (seed.startsWith('data:') || seed.startsWith('http') || seed.startsWith('/')) {
    return seed;
  }
  return null;
}
