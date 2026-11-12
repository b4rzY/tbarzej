import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync('src/lensing.js','utf8');
test('optical lens displaces source pixels rather than duplicating content',()=>{assert.match(code,/feDisplacementMap in="SourceGraphic"/);assert.match(code,/xChannelSelector="R" yChannelSelector="G"/);assert.doesNotMatch(code,/cloneNode|getUserMedia|fetch\(/);assert.match(code,/in="SourceGraphic" in2="field" operator="out"/);});
test('lens retains passive touch, keyboard escape and motion preference handling',()=>{assert.match(code,/pointermove',update,\{passive:true\}/);assert.match(code,/pointerType!=='mouse'/);assert.match(code,/e.key==='Tab'\|\|e.key==='Escape'/);assert.match(code,/pointercancel/);assert.match(code,/filter.remove\(\)/);});
test('built HTML includes local lens and concept study assets',()=>{const html=readFileSync('src/index.html','utf8');for(const asset of ['lensing.js','showcase.js','showcase.css'])assert.ok(html.includes(asset));assert.match(html,/data-motion-showcase/);});

test('mobile uses one bounded optical surface and passive touch continuation',()=>{assert.match(code,/slice\(0,touch\?1:3\)/);assert.match(code,/touch\?180000:500000/);assert.match(code,/time-lastTouchFrame<40/);assert.match(code,/touchmove',followTouch,\{passive:true\}/);assert.doesNotMatch(code,/gravity-horizon/);});
