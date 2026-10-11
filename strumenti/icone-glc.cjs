/* Export the supplied Jolly Roger into the browser/PWA icon canvases.
 * Artwork stays unchanged; contain sizing and a black canvas prevent cropping. */
const fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.GLC_CHROME||undefined});
 try{
  const page=await browser.newPage();
  const src='data:image/png;base64,'+(await fs.readFile(path.join(root,'img/brand/glc-jolly-roger.png'))).toString('base64');
  for(const [name,size,padding] of [['favicon-32.png',32,.03],['apple-touch-icon-180.png',180,.08],['icon-192.png',192,.08],['icon-512.png',512,.08],['icon-512-maskable.png',512,.22]]){
   const png=await page.evaluate(async({src,size,padding})=>{
    const image=new Image();image.src=src;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,size,size);
    const limit=size*(1-2*padding),scale=limit/Math.max(image.naturalWidth,image.naturalHeight);
    const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    ctx.drawImage(image,(size-w)/2,(size-h)/2,w,h);
    return canvas.toDataURL('image/png').split(',')[1];
   },{src,size,padding});
   await fs.writeFile(path.join(root,'icons',name),Buffer.from(png,'base64'));
  }
  console.log('5 icone GLC esportate; proporzioni originali, fondo nero e area sicura per miniature.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
