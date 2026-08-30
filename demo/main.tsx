import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { BodyCatalog } from './components/BodyCatalog';
import { CompanyShowcase } from './components/CompanyShowcase';
import { BRAND_BY_KEY } from './brands';
import './tailwind.css';

/**
 * Path routing without a router.
 *
 * There are three kinds of page and no navigation between them, so a
 * routing library would be a dependency bought to read one string. The base
 * is stripped first because the site is served from a project path, not a
 * domain root.
 */
function route() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const key = location.pathname.replace(base, '').replace(/^\/|\/$/g, '').toLowerCase();
  if (key === 'bodies') return <BodyCatalog />;
  const brand = key ? BRAND_BY_KEY[key] : undefined;
  return brand ? <CompanyShowcase brand={brand} /> : <App />;
}

// The company pages are made to be filmed, so they open dark regardless of
// the visitor's system setting — a capture is not a preference.
if (location.pathname.replace(/\/$/, '') !== import.meta.env.BASE_URL.replace(/\/$/, '')) {
  document.documentElement.classList.add('dark');
  document.documentElement.dataset.theme = 'dark';
}

createRoot(document.getElementById('root')!).render(route());
