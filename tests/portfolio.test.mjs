import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
const html=await readFile('src/index.html','utf8');
const js=await readFile('src/app.js','utf8');
const css=await readFile('src/styles.css','utf8');
test('all local resources exist',async()=>{for(const m of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)){if(m[1].startsWith('data:'))continue;if(['https://github.com/b4rzY/tbarzej','https://cl.linkedin.com/in/tomas-barzelatto-19a070b6','https://barzelatto.dev/','https://mealprep-xi-six.vercel.app/'].includes(m[1]))continue;assert.ok(!/^https?:/.test(m[1]),'unexpected remote resource');await access('src/'+m[1]);}});
test('section links have targets',()=>{const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));for(const m of html.matchAll(/href="#([^\"]+)"/g))assert.ok(ids.has(m[1]),'missing '+m[1]);});
test('unique IDs',()=>{const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);});
test('every translation key has Spanish copy',()=>{for(const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g))assert.ok(js.includes(m[1]+':'),m[1]);});
test('public draft contains no excluded research or private details',()=>{for(const phrase of ['anti-cheat','game research','hacks','cheats','/workspace/','@gmail.com']){assert.ok(!(html+js).toLowerCase().includes(phrase),phrase);}});
test('no network APIs, analytics, accounts or persistence',()=>{assert.doesNotMatch(js,/\b(fetch|WebSocket|XMLHttpRequest|localStorage|sessionStorage|indexedDB|getUserMedia)\s*[.(]/);assert.doesNotMatch(html,/<form\b/);});
test('truthful prototype boundaries and AI contribution are visible',()=>{for(const phrase of ['AI-assisted','scripted','no live AirTag','not a tracker','AI-assisted engineering'])assert.ok(html.toLowerCase().includes(phrase.toLowerCase()),phrase);});
test('reduced motion and keyboard tabs supported',()=>{assert.ok(css.includes('prefers-reduced-motion:reduce'));assert.ok(js.includes("event.key==='ArrowRight'"));assert.ok(js.includes("event.key==='Home'"));assert.ok(html.includes('role="tabpanel"'));});
test('generated artifact is self-contained',async()=>{const bundle=await readFile('Tomas-Portfolio-Review.html','utf8');assert.doesNotMatch(bundle,/(?:src|href)="(?:styles\.css|app\.js|city\.js|assets\/)/);assert.ok(bundle.includes('data:image/png;base64,'));assert.ok(bundle.includes('data:font/ttf;base64,'));});
test('distribution contains no removed private-labeled screenshot',async()=>{const assets=await readdir('dist/assets');assert.ok(!assets.includes('workspace-prototype.png'));});

test('social preview has one coherent set of metadata and public absolute URLs',async()=>{
  const meta=(key)=>{const tags=[...html.matchAll(/<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"\s*\/?>(?:\s*)/g)].filter(m=>m[1]===key);assert.equal(tags.length,1,key);return tags[0][2];};
  assert.equal(meta('og:title'),'Tomas Barzelatto | Developer');
  assert.equal(meta('twitter:title'),meta('og:title'));
  assert.equal(meta('description'),meta('og:description'));
  assert.equal(meta('twitter:description'),meta('og:description'));
  assert.ok(!meta('og:description').includes('Tomas Barzelatto'));
  assert.ok(!meta('og:description').toLowerCase().includes('interactive controls'));
  assert.equal(meta('og:url'),'https://barzelatto.dev/');
  assert.equal(meta('og:type'),'website');
  assert.equal(meta('twitter:card'),'summary_large_image');
  assert.equal(meta('og:image'),'https://barzelatto.dev/assets/share-card-v1.jpg');
  assert.equal(meta('twitter:image'),meta('og:image'));
  assert.equal(meta('og:image:secure_url'),meta('og:image'));
  assert.ok(meta('og:image:alt').length>20);
  const image=await readFile('src/assets/share-card-v1.jpg');
  assert.equal(image.readUInt16BE(0),0xffd8,'JPEG signature');
  let offset=2,size;
  while(offset<image.length){
    assert.equal(image[offset],0xff,'JPEG marker');
    const marker=image[offset+1];offset+=2;
    if(marker===0xd9||marker===0xda)break;
    const length=image.readUInt16BE(offset);
    if([0xc0,0xc1,0xc2].includes(marker)){size={height:image.readUInt16BE(offset+3),width:image.readUInt16BE(offset+5)};break;}
    offset+=length;
  }
  assert.ok(size,'JPEG dimensions');
  assert.equal(Number(meta('og:image:width')),size.width);
  assert.equal(Number(meta('og:image:height')),size.height);
  assert.ok(size.width>=1200 && Math.abs(size.width/size.height-1.91)<.02);
  assert.ok(image.length<300000,'share image should be crawler-friendly');
});

test('new portfolio entries retain requested scope and public boundaries',()=>{
  assert.ok(html.includes('Software Developer &amp; Web Developer'));
  assert.ok(html.includes('GOZO AI'));
  assert.ok(html.includes('Jul 2026 – Present'));
  assert.ok(html.includes('id="workflow-city"'));
  assert.ok(html.includes('Simulated activity'));
  assert.ok(html.includes('not live agent telemetry'));
  assert.ok(html.includes('id="nami"'));
  assert.ok(html.includes('https://mealprep-xi-six.vercel.app/'));
  assert.ok(html.includes('native iPhone app is marked coming soon'));
});
