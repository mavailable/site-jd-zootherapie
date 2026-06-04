// optimizeImage — optimisation cote navigateur AVANT envoi a /api/cms/upload.
//
// Objectif : un JPG iPhone ~4 Mo (souvent mal oriente via EXIF) devient une image
// ~150-300 Ko bien orientee, sans dependance npm (canvas natif uniquement).
//
// Regles :
//  - Auto-orientation EXIF via createImageBitmap(file, { imageOrientation: 'from-image' }).
//  - Resize : cote le plus long max 1600px (jamais d'agrandissement).
//  - Re-encodage WebP qualite 0.82 SI le navigateur sait ENCODER en WebP.
//  - SVG et GIF passent tels quels (le canvas casserait le vectoriel / l'animation).
//  - Robuste : sur tout echec (decode, toBlob null, navigateur sans support),
//    on renvoie le fichier original — l'upload ne doit jamais etre bloque.
//
// /!\ PIEGE WebKit/Safari iOS (corrige ici) : canvas.toBlob('image/webp') n'est PAS
//     fiable en ENCODAGE sur WebKit/Safari iOS. Au lieu d'echouer, il retombe
//     SILENCIEUSEMENT sur un PNG lossless pleine resolution (2.6-5 Mo) tout en
//     ignorant le mime demande. Si on nomme alors le blob ".webp" sans verifier
//     blob.type, on stocke un PNG geant deguise en WebP -> upload rejete par la
//     garde de taille serveur -> image jamais commitee -> 404 cote client.
//     Parade : (1) pre-detecter le support d'encodage WebP une seule fois,
//     (2) cibler JPEG si WebP non encodable, (3) re-encoder en JPEG si toBlob a
//     quand meme rendu autre chose que le type demande, (4) nommer le fichier
//     selon le type REELLEMENT obtenu, (5) ne jamais garder un blob plus lourd
//     que l'original.

const MAX_EDGE = 1600;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.82;

// Types raster qu'on re-encode. Tout le reste (svg, gif) passe tel quel.
const RASTER_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function isRaster(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (RASTER_TYPES.includes(type)) return true;
  // Fallback sur l'extension si le mime est absent (certains navigateurs/HEIC mal typés).
  const name = file.name.toLowerCase();
  return /\.(jpe?g|png|webp)$/.test(name);
}

function extForType(type: string): string {
  if (type === 'image/webp') return 'webp';
  if (type === 'image/png') return 'png';
  return 'jpg'; // image/jpeg et tout fallback raisonnable
}

function replaceExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^./\\]+$/, '');
  return `${base}.${ext}`;
}

// Detection du support d'ENCODAGE WebP, memoisee (un seul probe par session).
// canvas.toBlob('image/webp') peut retourner un blob d'un autre type (PNG) sur
// les navigateurs qui savent decoder mais pas encoder le WebP (WebKit/iOS).
// On encode donc un canvas 1x1 et on lit le type REEL du blob produit.
let _webpEncodeSupport: boolean | null = null;

async function canEncodeWebp(): Promise<boolean> {
  if (_webpEncodeSupport !== null) return _webpEncodeSupport;
  try {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const blob: Blob | null = await new Promise((resolve) =>
      probe.toBlob(resolve, 'image/webp', WEBP_QUALITY)
    );
    _webpEncodeSupport = !!blob && blob.type === 'image/webp';
  } catch {
    _webpEncodeSupport = false;
  }
  return _webpEncodeSupport;
}

function encodeCanvas(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Optimise un fichier image cote navigateur. Renvoie un nouveau File (WebP ou JPEG
 * selon le support d'encodage du navigateur) ou le File original si l'optimisation
 * n'est pas applicable / echoue / serait contre-productive.
 */
export async function optimizeImage(file: File): Promise<File> {
  // SVG / GIF / type non raster : on ne touche pas.
  if (!isRaster(file)) return file;

  // Pas de canvas / createImageBitmap dispo (vieux navigateur) : on n'optimise pas.
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    return file;
  }

  try {
    // Decode + auto-orientation EXIF native.
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Certains navigateurs ne supportent pas l'option imageOrientation : decode brut.
      bitmap = await createImageBitmap(file);
    }

    const { width, height } = bitmap;
    if (!width || !height) {
      bitmap.close?.();
      return file;
    }

    // Resize : cote le plus long borne a MAX_EDGE, sans agrandir.
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    // Choix du format cible : WebP seulement si le navigateur sait l'ENCODER,
    // sinon JPEG (universellement supporte, notamment WebKit/Safari iOS).
    const webpOk = await canEncodeWebp();
    let targetType = webpOk ? 'image/webp' : 'image/jpeg';
    let targetQuality = webpOk ? WEBP_QUALITY : JPEG_QUALITY;

    let blob: Blob | null = await encodeCanvas(canvas, targetType, targetQuality);

    // Garde-fou ultime : si on a demande WebP mais obtenu autre chose (le probe
    // peut mentir sur certaines versions / images), on RE-ENCODE en JPEG plutot
    // que de stocker un PNG geant deguise en WebP.
    if (blob && blob.type !== targetType) {
      targetType = 'image/jpeg';
      targetQuality = JPEG_QUALITY;
      const reEncoded = await encodeCanvas(canvas, targetType, targetQuality);
      // Si le re-encodage JPEG echoue aussi, on garde ce que toBlob a rendu
      // mais on nommera le fichier selon son type REEL (cf. plus bas).
      if (reEncoded) blob = reEncoded;
    }

    // toBlob a totalement echoue : on garde l'original.
    if (!blob || blob.size === 0) return file;

    // Garde de taille DURE : si le blob re-encode est >= l'original, garder
    // l'original (y compris quand il y a eu un resize — un PNG/WebP source deja
    // tres compresse peut grossir au re-encodage).
    if (blob.size >= file.size) return file;

    // Nommer le fichier selon le type REELLEMENT obtenu (jamais .webp pour un PNG).
    const realType = blob.type || targetType;
    const ext = extForType(realType);

    return new File([blob], replaceExtension(file.name, ext), {
      type: realType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
