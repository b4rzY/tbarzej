import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
const html=await readFile('src/index.html','utf8');
const js=await readFile('src/app.js','utf8');
const css=await readFile('src/styles.css','utf8');
test('all local resources exist',async()=>{for(const m of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)){if(m[1].startsWith('data:'))continue;if(['mailto:tbarzelattoj@gmail.com','https://github.com/b4rzY/tbarzej/blob/main/src/city.js','https://github.com/b4rzY/tbarzej/blob/main/tests/city.test.mjs','https://github.com/b4rzY/tbarzej','https://cl.linkedin.com/in/tomas-barzelatto-19a070b6','https://barzelatto.dev/','https://namiapp.hyp.app/'].includes(m[1]))continue;assert.ok(!/^https?:/.test(m[1]),'unexpected remote resource');await access('src/'+m[1].split('?')[0]);}});
test('section links have targets',()=>{const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));for(const m of html.matchAll(/href="#([^\"]+)"/g))assert.ok(ids.has(m[1]),'missing '+m[1]);});
test('unique IDs',()=>{const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);});
test('every translation key has Spanish copy',()=>{for(const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g))assert.ok(js.includes(m[1]+':'),m[1]);});
test('public draft contains no excluded research or private details',()=>{for(const phrase of ['anti-cheat','game research','hacks','cheats','/workspace/','@gmail.com']){assert.ok(!(html+js).toLowerCase().replaceAll('tbarzelattoj@gmail.com','').includes(phrase),phrase);}});
test('no network APIs, analytics, accounts or persistence',()=>{assert.doesNotMatch(js,/\b(fetch|WebSocket|XMLHttpRequest|localStorage|sessionStorage|indexedDB|getUserMedia)\s*[.(]/);assert.doesNotMatch(html,/<form\b/);});
test('truthful prototype boundaries and AI contribution are visible',()=>{for(const phrase of ['AI-assisted','scripted','no live AirTag','not a tracker','AI-assisted engineering'])assert.ok(html.toLowerCase().includes(phrase.toLowerCase()),phrase);});
test('reduced motion and keyboard tabs supported',()=>{assert.ok(css.includes('prefers-reduced-motion:reduce'));assert.ok(js.includes("event.key==='ArrowRight'"));assert.ok(js.includes("event.key==='Home'"));assert.ok(html.includes('role="tabpanel"'));});
test('generated artifact is self-contained',async()=>{const bundle=await readFile('Tomas-Portfolio-Review.html','utf8');assert.doesNotMatch(bundle,/(?:src|href)="(?:styles\.css|app\.js|city\.js|assets\/)/);assert.ok(bundle.includes('data:image/png;base64,'));assert.ok(bundle.includes('data:font/ttf;base64,'));});
test('distribution contains no removed private-labeled screenshot',async()=>{const assets=await readdir('dist/assets');assert.ok(!assets.includes('workspace-prototype.png'));});

test('social preview has one coherent set of metadata and public absolute URLs',async()=>{
  const meta=(key)=>{const tags=[...html.matchAll(/<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"\s*\/?>(?:\s*)/g)].filter(m=>m[1]===key);assert.equal(tags.length,1,key);return tags[0][2];};
  assert.equal(meta('og:title'),'Tomas Barzelatto | Software and Web Developer');
  assert.equal(meta('twitter:title'),meta('og:title'));
  assert.equal(meta('description'),meta('og:description'));
  assert.equal(meta('twitter:description'),meta('og:description'));
  assert.ok(meta('og:description').includes('Tomas Barzelatto'));
  assert.ok(!meta('og:description').toLowerCase().includes('interactive controls'));
  assert.equal(meta('og:url'),'https://barzelatto.dev/');
  assert.equal(meta('og:type'),'website');
  assert.equal(meta('twitter:card'),'summary_large_image');
  assert.equal(meta('og:image'),'https://barzelatto.dev/assets/share-card-galaxy-layers-v3.jpg');
  assert.equal(meta('twitter:image'),meta('og:image'));
  assert.equal(meta('og:image:secure_url'),meta('og:image'));
  assert.ok(meta('og:image:alt').includes('Live WebGL · Interactive study'));
  assert.ok(meta('og:image:alt').includes('Systems · Interfaces · Products'));
  const image=await readFile('src/assets/share-card-galaxy-layers-v3.jpg');
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
  assert.ok(html.includes('https://namiapp.hyp.app/'));
  assert.ok(html.includes('native iPhone app is marked coming soon'));
});


test('contact is a direct email route to only the authorized recipient',()=>{
  const addresses=[...(html+js).matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)].map(match=>match[0]);
  assert.ok(addresses.length>=2);
  assert.ok(addresses.every(address=>address==='tbarzelattoj@gmail.com'));
  const mailto=[...html.matchAll(/href="(mailto:[^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(mailto,['mailto:tbarzelattoj@gmail.com','mailto:tbarzelattoj@gmail.com']);
  assert.match(html,/data-i18n="emailMe">Email me/);
  assert.match(js,/emailMe:'Escríbeme'/);
  assert.match(html,/Opens your email app/);
  assert.match(js,/Abre tu app de correo/);
  assert.match(html,/<section id="contact"/);
  assert.ok([...html.matchAll(/href="#contact"/g)].length>=3);
  assert.doesNotMatch(html,/<form\b|message sent|guaranteed delivery/i);
});
test('public evidence leads before workflow and private prototypes',async()=>{
  const at=id=>html.indexOf('id="'+id+'"');
  assert.ok(at('work')<at('nami'));
  assert.ok(at('nami')<at('city-project'));
  assert.ok(at('city-project')<at('spatial-workspace'));
  assert.ok(at('nami')<at('focus'));
  assert.ok(at('city-project')<at('workflow-city'));
  assert.ok(at('approach')<at('workflow-city'));
  assert.ok(html.indexOf('at GOZO AI')<at('core-stage'));
  for(const path of ['src/city.js','tests/city.test.mjs']){
    await access(path);
    assert.ok(html.includes('https://github.com/b4rzY/tbarzej/blob/main/'+path));
  }
  assert.match(html,/Implementation and test preparation are AI-assisted/);
});

test('search metadata and structured person identity are crawlable without JavaScript',async()=>{assert.match(html,/<title>Tomas Barzelatto \| Software and Web Developer<\/title>/);assert.match(html,/name="robots" content="index,follow,max-image-preview:large"/);assert.match(html,/itemtype="https:\/\/schema.org\/ProfilePage"/);assert.match(html,/itemprop="mainEntity" itemscope itemtype="https:\/\/schema.org\/Person"/);assert.match(html,/itemprop="name" content="Tomas Barzelatto"/);assert.match(html,/itemprop="sameAs"/);const robots=await readFile('dist/robots.txt','utf8'),sitemap=await readFile('dist/sitemap.xml','utf8');assert.match(robots,/User-agent: \*/);assert.match(robots,/Sitemap: https:\/\/barzelatto.dev\/sitemap.xml/);assert.match(sitemap,/<loc>https:\/\/barzelatto.dev\/<\/loc>/);assert.equal([...sitemap.matchAll(/<loc>/g)].length,1);});
