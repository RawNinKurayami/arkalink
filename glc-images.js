/* Shared image import. Keeps aspect ratio and alpha; never silently lowers
   resolution to fit storage. Existing data URLs and save keys are unchanged. */
(function (root) {
  'use strict';
  const MAX_EDGE = 3840, MAX_INPUT = 30 * 1024 * 1024, MAX_PIXELS = 48e6;
  const MAX_OUTPUT = 2.5 * 1024 * 1024;
  async function prepare(file) {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      throw Error('Scegli un’immagine JPG, PNG o WebP.');
    if (file.size > MAX_INPUT) throw Error('Il file supera 30 MB. Esporta una versione JPG, PNG o WebP più leggera.');
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(Error('Non riesco a leggere questa immagine. Il file precedente è rimasto invariato.'));
        i.src = url;
      });
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h || w * h > MAX_PIXELS) throw Error('Usa un’immagine fino a 48 megapixel.');
      const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw Error('Il browser non riesce a elaborare questa immagine.');
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let blob;
      // WebP retains transparency. Unsupported browsers return PNG.
      for (const quality of [.94, .90, .86]) {
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
        if (blob && blob.size <= MAX_OUTPUT) break;
      }
      if (!blob) throw Error('Impossibile elaborare l’immagine.');
      if (blob.size > MAX_OUTPUT) throw Error('L’immagine resta troppo pesante per il salvataggio. Esportala in WebP più leggero e riprova: la risoluzione non è stata ridotta ulteriormente.');
      return blob;
    } finally { URL.revokeObjectURL(url); }
  }
  async function read(file) {
    const blob = await prepare(file);
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(Error('Lettura dell’immagine non riuscita.'));
      r.readAsDataURL(blob);
    });
  }
  root.GLCImages = { prepare, read, maxEdge: MAX_EDGE };
})(window);
