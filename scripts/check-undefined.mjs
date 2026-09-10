import { parse } from '../node_modules/@babel/parser/lib/index.js';
import _traverse from '../node_modules/@babel/traverse/lib/index.js';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
const traverse = _traverse.default || _traverse;
const root = new URL('../src', import.meta.url).pathname;
const files = [];
(function w(d){for(const f of readdirSync(d)){const p=join(d,f);
  statSync(p).isDirectory()?w(p):/\.(js|jsx)$/.test(f)&&files.push(p);}})(root);

const GLOBALS = new Set(['window','document','console','navigator','localStorage','sessionStorage',
'fetch','setTimeout','clearTimeout','setInterval','clearInterval','Promise','JSON','Math','Date','Object',
'Array','String','Number','Boolean','Error','Map','Set','RegExp','Intl','URL','URLSearchParams','Blob',
'File','FileReader','FormData','Image','alert','confirm','prompt','caches','crypto','performance','location',
'history','requestAnimationFrame','cancelAnimationFrame','structuredClone','AbortController','TextEncoder',
'TextDecoder','Infinity','NaN','undefined','globalThis','process','atob','btoa','encodeURIComponent',
'decodeURIComponent','parseInt','parseFloat','isNaN','isFinite','Symbol','WeakMap','WeakSet','Proxy',
'Reflect','BigInt','queueMicrotask','MutationObserver','IntersectionObserver','ResizeObserver','Event',
'CustomEvent','HTMLElement','Node','DOMParser','XMLHttpRequest','WebSocket','Worker','matchMedia',
'getComputedStyle','scrollTo','open','close','print','React','arguments','OffscreenCanvas','ImageData','Path2D','SVGElement','Notification','Audio','MediaRecorder','indexedDB','screen','frames','self','top','parent']);

let total = 0;
for (const f of files) {
  const code = readFileSync(f,'utf8');
  let ast; try { ast = parse(code,{sourceType:'module',plugins:['jsx']}); } catch { continue; }
  traverse(ast, {
    ReferencedIdentifier(path) {
      const n = path.node.name;
      if (GLOBALS.has(n)) return;
      if (path.scope.hasBinding(n, true)) return;
      total++;
      console.log(`✗ ${f.replace(root,'src')}:${path.node.loc.start.line}  '${n}' 정의되지 않음`);
    }
  });
}
console.log(`\n미정의 참조 ${total}건`);
