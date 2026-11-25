'use client';

/**
 * @file src/lib/router.jsx
 * @description react-router-dom compatible API implemented on top of the Next.js App Router.
 *
 * The app was written against react-router-dom (useNavigate, Link, useLocation, Navigate,
 * useParams, Outlet, useSearchParams). This module exposes the same API surface so every
 * view keeps its exact behaviour while routing is handled by Next.js:
 *  - navigation `state` (navigate(path, { state })) is preserved via an in-memory store
 *  - relative targets ("?tab=x", "edit", "../x") resolve like react-router
 *  - navigate(-1) / navigate(n) walk the browser history
 *  - no automatic scroll-to-top (react-router's BrowserRouter never scrolled either)
 *  - <Outlet /> renders the nested Next.js layout `children` provided via <OutletProvider>
 */

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore
} from 'react';
import NextLink from 'next/link';
import {
  useRouter,
  usePathname,
  useParams as useNextParams,
  useSearchParams as useNextSearchParams
} from 'next/navigation';

// ─── Navigation state store (replacement for history.state used by react-router) ───────
const navStateStore = new Map();
const navStateListeners = new Set();

const stripHash = (href) => {
  const i = href.indexOf('#');
  return i === -1 ? href : href.slice(0, i);
};

const setNavState = (href, state) => {
  navStateStore.set(stripHash(href), state === undefined ? null : state);
  navStateListeners.forEach((listener) => listener());
};

const subscribeNavState = (listener) => {
  navStateListeners.add(listener);
  return () => navStateListeners.delete(listener);
};

// ─── Path resolution (mirrors react-router's resolution for the cases used in the app) ──
const currentPath = () => (typeof window !== 'undefined' ? window.location.pathname : '/');
const currentSearch = () => (typeof window !== 'undefined' ? window.location.search : '');

const toHref = (to) => {
  if (to && typeof to === 'object') {
    const { pathname = currentPath(), search = '', hash = '' } = to;
    const s = search && !search.startsWith('?') ? `?${search}` : search;
    const h = hash && !hash.startsWith('#') ? `#${hash}` : hash;
    return `${pathname}${s}${h}`;
  }
  return String(to ?? '');
};

export const resolveTo = (to) => {
  const href = toHref(to);
  if (href === '') return currentPath() + currentSearch();
  if (href.startsWith('/')) return href;
  if (href.startsWith('?')) return currentPath() + href;
  if (href.startsWith('#')) return currentPath() + currentSearch() + href;
  // Relative segment path ("edit", "./edit", "../list")
  const base = currentPath().replace(/\/+$/, '');
  const segments = base.split('/').filter(Boolean);
  const [pathPart, rest = ''] = href.split(/(?=[?#])/);
  for (const seg of pathPart.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') segments.pop();
    else segments.push(seg);
  }
  return `/${segments.join('/')}${rest}`;
};

// ─── Hooks ───────────────────────────────────────────────────────────────────────────────
export function useNavigate() {
  const router = useRouter();
  return useCallback((to, options = {}) => {
    if (typeof to === 'number') {
      window.history.go(to);
      return;
    }
    const href = resolveTo(to);
    setNavState(href, options.state);
    if (options.replace) {
      router.replace(href, { scroll: false });
    } else {
      router.push(href, { scroll: false });
    }
  }, [router]);
}

export function useLocation() {
  const pathname = usePathname() || '/';
  const nextSearchParams = useNextSearchParams();
  const query = nextSearchParams ? nextSearchParams.toString() : '';
  const search = query ? `?${query}` : '';
  const key = pathname + search;

  const state = useSyncExternalStore(
    subscribeNavState,
    () => (navStateStore.has(key) ? navStateStore.get(key) : null),
    () => null
  );

  return useMemo(() => ({
    pathname,
    search,
    hash: typeof window !== 'undefined' ? window.location.hash : '',
    state,
    key
  }), [pathname, search, state, key]);
}

export function useParams() {
  const params = useNextParams() || {};
  return useMemo(() => {
    const out = {};
    for (const [k, v] of Object.entries(params)) {
      const value = Array.isArray(v) ? v.join('/') : v;
      try {
        out[k] = decodeURIComponent(value);
      } catch {
        out[k] = value;
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);
}

export function useSearchParams() {
  const nextSearchParams = useNextSearchParams();
  const navigate = useNavigate();
  const query = nextSearchParams ? nextSearchParams.toString() : '';

  const searchParams = useMemo(() => new URLSearchParams(query), [query]);

  const setSearchParams = useCallback((nextInit, options = {}) => {
    const resolved = typeof nextInit === 'function'
      ? nextInit(new URLSearchParams(currentSearch()))
      : nextInit;
    const qs = new URLSearchParams(resolved ?? '').toString();
    navigate(`${currentPath()}${qs ? `?${qs}` : ''}`, options);
  }, [navigate]);

  return [searchParams, setSearchParams];
}

// ─── Components ──────────────────────────────────────────────────────────────────────────
export const Link = forwardRef(function Link(
  { to, replace = false, state, onClick, children, ...rest },
  ref
) {
  const href = resolveTo(to);
  const handleClick = (event) => {
    if (onClick) onClick(event);
    if (!event.defaultPrevented) setNavState(href, state);
  };
  return (
    <NextLink ref={ref} href={href} replace={replace} scroll={false} onClick={handleClick} {...rest}>
      {children}
    </NextLink>
  );
});

export const NavLink = Link;

export function Navigate({ to, replace = false, state }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace, state });
    // Navigate only once on mount, like react-router's <Navigate />
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ─── Outlet (nested layout children) ─────────────────────────────────────────────────────
const OutletContext = createContext(null);

export function OutletProvider({ outlet, children }) {
  return <OutletContext.Provider value={outlet}>{children}</OutletContext.Provider>;
}

export function Outlet() {
  return useContext(OutletContext);
}
