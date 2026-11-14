import {cp, mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('src','dist',{recursive:true});
let html=(await readFile('src/index.html','utf8')).replaceAll('?v=20261112-fast2','');let css=await readFile('src/styles.css','utf8')+'\n'+await readFile('src/showcase.css','utf8');css+='\n'+await readFile('src/art-gallery.css','utf8');let js=await readFile('src/ascii-art.js','utf8')+';\n'+await readFile('src/art-gallery.js','utf8')+';\n'+await readFile('src/cosmos.js','utf8')+';\n'+await readFile('src/soundtrack.js','utf8')+';\n'+await readFile('src/engine.js','utf8')+';\n'+await readFile('src/city.js','utf8')+';\n'+await readFile('src/app.js','utf8')+';\n'+await readFile('src/lensing.js','utf8')+';\n'+await readFile('src/showcase.js','utf8');
const assetNames=['SpaceGrotesk.ttf','NotoSans-Regular.ttf','NotoSans-Bold.ttf','NotoSerif-Regular.ttf','workspace-study.svg','location-prototype.png','hero-render.png','nami-preview.jpg','interstellar-theme.mp3'];
for(const name of assetNames){const bytes=await readFile('src/assets/'+name);const mime=name.endsWith('.mp3')?'audio/mpeg':name.endsWith('.jpg')?'image/jpeg':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'font/ttf';const data='data:'+mime+';base64,'+bytes.toString('base64');css=css.replaceAll('assets/'+name,data);html=html.replaceAll('assets/'+name,data);js=js.replaceAll('assets/'+name,data);}
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>'+css+'</style>').replace('<script src="engine.js" defer></script>','').replace('<script src="city.js" defer></script>','').replace('<script src="app.js" defer></script>','');
html=html.replace('<script src="cosmos.js" defer></script>','').replace('<script src="soundtrack.js" defer></script>','');
html=html.replace('<link rel="stylesheet" href="showcase.css">','').replace('<script src="lensing.js" defer></script>','').replace('<script src="showcase.js" defer></script>','');
html=html.replace('<link rel="stylesheet" href="art-gallery.css">','').replace('<script src="ascii-art.js" defer></script>','').replace('<script src="art-gallery.js" defer></script>','');
html=html.replace('</body>','<script>'+js.replaceAll('</script','<\\/script')+'</script></body>');
await writeFile('Tomas-Portfolio-Review.html',html);
console.log('Built static dist/ and self-contained Tomas-Portfolio-Review.html. No publication.');
