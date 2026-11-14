import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const js=fs.readFileSync(new URL('../src/showcase.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/showcase.css',import.meta.url),'utf8');
test('showcase is original dependency-free rendering without camera access',()=>{assert.doesNotMatch(js,/getUserMedia|fetch\(|https:\/\//);for(const scene of ['architecture','object','venue'])assert.match(js,new RegExp('function '+scene+'\\('));});
test('showcase supports automatic loops and lifecycle',()=>{for(const marker of ['prefers-reduced-motion','IntersectionObserver','visibilitychange','cancelAnimationFrame','motion=true'])assert.ok(js.includes(marker));});
test('showcase supports translation, touch and keyboard-native depth controls',()=>{assert.match(js,/attributeFilter:\['lang'\]/);assert.match(js,/type="range"/);assert.match(js,/aria-pressed/);assert.match(js,/es:\{/);assert.match(css,/touch-action:pan-y/);assert.match(css,/@media\(max-width:700px\)/);});
