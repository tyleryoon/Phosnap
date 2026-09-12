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

const HOOKS = /^use[A-Z]/;

let total = 0;
let parseFails = 0;
let dupes = 0;
let hookOrder = 0;

for (const f of files) {
  const rel = f.replace(root, 'src');
  const code = readFileSync(f, 'utf8');

  // 파싱 실패를 삼키지 않는다.
  //
  // 예전에는 catch { continue } 였다. 문법 오류가 있는 파일은 조용히
  // 건너뛰고 "미정의 참조 0건" 이 나왔다. 검사기가 통과했다고 해서
  // 안전한 게 아니었다 — 빌드는 그 파일에서 깨진다.
  let ast;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });
  } catch (e) {
    parseFails++;
    console.log(`✗ ${rel}  파싱 실패 — ${e.message.split('\n')[0]}`);
    continue;
  }

  // 최상위 중복 선언.
  //
  // `export const x = ...` 가 한 파일에 두 번 있으면 ES 모듈에서는
  // SyntaxError 다. 그런데 babel 파서는 이걸 통과시키고, 스코프 분석은
  // "정의됨" 으로 보기 때문에 위의 미정의 검사에 걸리지 않는다.
  // 실제로 supabase.js 의 getPendingRoleRequests 중복이 이렇게 새어
  // Vercel 빌드를 깨뜨렸다.
  const seen = new Map();
  for (const node of ast.program.body) {
    const d = node.type === 'ExportNamedDeclaration' ? node.declaration : node;
    if (!d) continue;
    const names = [];
    if (d.type === 'VariableDeclaration') {
      for (const v of d.declarations) if (v.id.type === 'Identifier') names.push(v.id.name);
    } else if ((d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') && d.id) {
      names.push(d.id.name);
    }
    for (const n of names) {
      if (seen.has(n)) {
        dupes++;
        console.log(`✗ ${rel}:${d.loc.start.line}  '${n}' 중복 선언 (먼저 ${seen.get(n)}행)`);
      } else {
        seen.set(n, d.loc.start.line);
      }
    }
  }

  // 조건부 훅 — early return 뒤에 오는 useXxx().
  //
  // React 는 훅을 호출 **순서**로 식별한다. 컴포넌트 본문 최상위에
  // `if (loading) return <Spinner/>` 가 있고 그 아래에 훅이 있으면,
  // 로딩이 끝나는 순간 훅 개수가 달라져 렌더가 통째로 죽는다.
  //   Rendered more hooks than during the previous render.
  //
  // 화면에는 "문제가 발생했습니다" 만 뜬다. 원인을 알려주지 않는다.
  // 실제로 Booking.jsx 에서 이걸로 예약 화면 전체가 죽었다.
  traverse(ast, {
    Function(path) {
      const body = path.node.body;
      if (!body || body.type !== 'BlockStatement') return;

      // 컴포넌트/훅처럼 생긴 것만 본다 (대문자 시작 또는 useXxx).
      const name =
        path.node.id?.name ||
        (path.parent.type === 'VariableDeclarator' && path.parent.id.type === 'Identifier'
          ? path.parent.id.name : null);
      if (!name || !(/^[A-Z]/.test(name) || HOOKS.test(name))) return;

      let returnedAt = null;
      for (const st of body.body) {
        if (st.type === 'ReturnStatement' || st.type === 'IfStatement') {
          // if 안에 return 이 있으면 그 지점부터 '조건부' 구간이다.
          const hasReturn =
            st.type === 'ReturnStatement' ||
            JSON.stringify(st.consequent || {}).includes('"ReturnStatement"');
          if (hasReturn && returnedAt === null) returnedAt = st.loc.start.line;
          continue;
        }
        if (returnedAt === null) continue;

        // 이 지점 이후의 훅 호출을 찾는다.
        const src = code.slice(st.start, st.end);
        const m = src.match(/\b(use[A-Z]\w*)\s*\(/);
        if (m) {
          hookOrder++;
          console.log(
            `✗ ${rel}:${st.loc.start.line}  '${m[1]}()' 가 early return(${returnedAt}행) 뒤에 있음 — 조건부 훅`,
          );
          break;   // 함수당 한 번만 알린다
        }
      }
    },

    ReferencedIdentifier(path) {
      const n = path.node.name;
      if (GLOBALS.has(n)) return;
      if (path.scope.hasBinding(n, true)) return;
      total++;
      console.log(`✗ ${f.replace(root,'src')}:${path.node.loc.start.line}  '${n}' 정의되지 않음`);
    }
  });
}
const bad = total + parseFails + dupes + hookOrder;
console.log(`\n미정의 참조 ${total}건 · 파싱 실패 ${parseFails}건 · 중복 선언 ${dupes}건 · 조건부 훅 ${hookOrder}건`);
if (bad > 0) process.exitCode = 1;
