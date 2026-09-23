import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { normalizeCart } from '../lib/cart';

/**
 * 담은 것(장바구니)을 화면 밖에서 들고 있는다.
 *
 * 왜 전역인가
 *   예전에는 BookCompose 안의 useState 였다. 그래서 /book 을 벗어나면
 *   담은 게 사라졌고, 헤메·의상·장소를 각자 탭에서 고르다 담을 방법이
 *   아예 없었다. 고객은 한 화면 안에서만 구성을 마쳐야 했다.
 *
 * 앵커(anchor)가 먼저다
 *   가능 여부는 '언제 몇 시간' 이 정해져야 판정할 수 있다. 헤메 시술이
 *   되는지 알려면 촬영이 언제 시작해 언제 끝나는지 알아야 한다.
 *   그래서 처음 담을 때 그 조건을 앵커로 굳히고, 이후 다른 탭도
 *   같은 앵커로 거른다. 서로 시간이 안 맞는 조합은 애초에 안 보인다.
 *
 * 지난 날짜는 버린다
 *   localStorage 에 남은 장바구니를 그대로 살리면, 며칠 뒤 돌아온
 *   고객에게 이미 지나간 날짜의 구성이 멀쩡한 얼굴로 떠 있게 된다.
 *   읽을 때 촬영일이 오늘보다 이르면 통째로 버린다.
 */

const KEY = 'phosnap_cart';

const EMPTY_ITEMS = { photographer: null, stylist: null, dress: null, venue: null };

const CartContext = createContext(null);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** 저장된 장바구니 읽기. 못 읽거나 날짜가 지났으면 빈 값을 준다. */
const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { anchor: null, items: EMPTY_ITEMS };
    const saved = JSON.parse(raw);
    if (saved?.anchor?.date && saved.anchor.date < todayStr()) {
      // 지난 촬영일 — 조용히 버린다
      localStorage.removeItem(KEY);
      return { anchor: null, items: EMPTY_ITEMS };
    }
    return {
      anchor: saved?.anchor || null,
      items: { ...EMPTY_ITEMS, ...(saved?.items || {}) },
    };
  } catch {
    // 사생활 모드 등으로 접근 자체가 막힐 수 있다. 빈 장바구니로 시작한다.
    return { anchor: null, items: EMPTY_ITEMS };
  }
};

export const CartProvider = ({ children }) => {
  // 앵커와 담은 것을 **한 상태**로 든다.
  //
  // 따로 두면 '앵커가 바뀌면 담은 걸 비운다' 를 setAnchor 의 updater 안에서
  // 다른 setState 로 처리하게 된다. updater 는 순수해야 하고 React 는 그걸
  // 두 번 부를 수 있어서(StrictMode), 방금 담은 게 지워지는 일이 실제로 났다.
  // 하나로 묶으면 그 판단이 updater 안에서 값만으로 끝난다.
  const [state, setState] = useState(load);
  const { anchor, items } = state;

  // 바뀔 때마다 저장. 실패해도 화면은 그대로 돌아가야 한다.
  useEffect(() => {
    try {
      const empty = !anchor && !Object.values(items).some(Boolean);
      if (empty) localStorage.removeItem(KEY);
      else
        localStorage.setItem(
          KEY,
          JSON.stringify({ anchor, items, savedAt: new Date().toISOString() })
        );
    } catch {
      /* 저장 못 해도 이번 세션은 정상 동작한다 */
    }
  }, [anchor, items]);

  /**
   * 담는다.
   *
   * 자체 의상은 주인(작가·헤메)이 빠지면 같이 빠져야 한다. 그 판정은
   * normalizeCart 가 하고 있으므로 여기서도 그대로 통과시킨다.
   */
  const setItems = useCallback((next) => {
    setState((cur) => {
      const wanted = typeof next === 'function' ? next(cur.items) : next;
      return { ...cur, items: normalizeCart(wanted) };
    });
  }, []);

  const put = useCallback((key, value) => setItems((c) => ({ ...c, [key]: value })), [setItems]);
  const drop = useCallback((key) => setItems((c) => ({ ...c, [key]: null })), [setItems]);

  /**
   * 앵커를 바꾼다.
   *
   * 조건이 달라지면 담아둔 건 '그 시간에 가능한 것' 이 아니게 된다.
   * 남겨두면 결제 직전에야 안 되는 걸 알게 되므로 여기서 비운다.
   * 같은 조건이면 그대로 둔다 — 탭만 옮겨도 장바구니가 비면 곤란하다.
   */
  const setAnchor = useCallback((next) => {
    setState((cur) => {
      const a = cur.anchor;
      const same =
        a &&
        next &&
        a.locationId === next.locationId &&
        a.date === next.date &&
        a.time === next.time &&
        Number(a.hours) === Number(next.hours);
      return { anchor: next, items: same ? cur.items : EMPTY_ITEMS };
    });
  }, []);

  const clear = useCallback(() => {
    setState({ anchor: null, items: EMPTY_ITEMS });
  }, []);

  const count = useMemo(() => Object.values(items).filter(Boolean).length, [items]);
  const total = useMemo(
    () =>
      (items.photographer?.price || 0) +
      (items.stylist?.price || 0) +
      (items.dress?.price || 0) +
      (items.venue?.price || 0),
    [items]
  );

  const value = useMemo(
    () => ({
      anchor,
      setAnchor,
      items,
      setItems,
      put,
      drop,
      clear,
      count,
      total,
    }),
    [anchor, setAnchor, items, setItems, put, drop, clear, count, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
