'use strict';

import { BILLING_CONFIG, billingConfigured } from './billing-config.js?v=44';

const PADDLE_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js';

let loadingPromise = null;
let initialized = false;
let eventHandler = null;
let cachedPreview = null;

function asErrorMessage(error) {
  return error?.message || error?.error?.detail || error?.error || 'No se pudo conectar con Paddle.';
}

function loadPaddleScript() {
  if (window.Paddle) return Promise.resolve(window.Paddle);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PADDLE_SRC}"]`);
    if (existing) {
      if (window.Paddle) return resolve(window.Paddle);
      existing.addEventListener('load', () => resolve(window.Paddle), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Paddle Checkout.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = PADDLE_SRC;
    script.async = true;
    script.dataset.mfpBilling = 'paddle';
    script.onload = () => resolve(window.Paddle);
    script.onerror = () => reject(new Error('No se pudo cargar Paddle Checkout.'));
    document.head.appendChild(script);
  });

  return loadingPromise;
}

export function setBillingEventHandler(handler) {
  eventHandler = typeof handler === 'function' ? handler : null;
}

export function billingSummary() {
  return {
    provider: BILLING_CONFIG.provider,
    environment: BILLING_CONFIG.environment,
    configured: billingConfigured(),
    productId: BILLING_CONFIG.productId || '',
    monthlyPriceId: BILLING_CONFIG.prices.monthly || '',
    annualPriceId: BILLING_CONFIG.prices.annual || '',
    initialized
  };
}

export async function initBilling() {
  if (!BILLING_CONFIG.enabled) return { status: 'disabled' };
  if (!navigator.onLine) return { status: 'offline' };
  if (!billingConfigured()) return { status: 'not-configured' };
  if (initialized && window.Paddle) return { status: 'ready' };

  const Paddle = await loadPaddleScript();
  if (!Paddle) throw new Error('Paddle Checkout no está disponible.');

  if (BILLING_CONFIG.environment === 'sandbox') {
    Paddle.Environment.set('sandbox');
  }

  Paddle.Initialize({
    token: BILLING_CONFIG.clientToken,
    eventCallback(data) {
      try { eventHandler?.(data); } catch {}
    }
  });

  initialized = true;
  return { status: 'ready' };
}

function normalizePreview(result) {
  const lines = result?.data?.details?.lineItems
    || result?.data?.details?.line_items
    || result?.details?.lineItems
    || result?.details?.line_items
    || [];

  const byPrice = {};
  for (const line of lines) {
    const price = line?.price || {};
    const id = String(price?.id || line?.priceId || line?.price_id || '');
    if (!id) continue;

    const interval = String(
      price?.billingCycle?.interval
      || price?.billing_cycle?.interval
      || ''
    ).toLowerCase();

    byPrice[id] = {
      priceId: id,
      productId: String(price?.productId || price?.product_id || ''),
      interval,
      frequency: Number(
        price?.billingCycle?.frequency
        || price?.billing_cycle?.frequency
        || 0
      ),
      formattedSubtotal:
        line?.formattedTotals?.subtotal
        || line?.formatted_totals?.subtotal
        || line?.formattedUnitTotals?.subtotal
        || line?.formatted_unit_totals?.subtotal
        || '',
      formattedTotal:
        line?.formattedTotals?.total
        || line?.formatted_totals?.total
        || '',
      currencyCode:
        price?.unitPrice?.currencyCode
        || price?.unit_price?.currency_code
        || ''
    };
  }

  const monthly = byPrice[BILLING_CONFIG.prices.monthly] || null;
  const annual = byPrice[BILLING_CONFIG.prices.annual] || null;

  const monthlyValid = !monthly || !monthly.interval || monthly.interval === 'month';
  const annualValid = !annual || !annual.interval || annual.interval === 'year';

  return {
    monthly,
    annual,
    valid: Boolean(monthly && annual && monthlyValid && annualValid),
    mismatch: {
      monthly: monthly && monthly.interval && monthly.interval !== 'month' ? monthly.interval : '',
      annual: annual && annual.interval && annual.interval !== 'year' ? annual.interval : ''
    }
  };
}

export async function previewPremiumPrices({ force = false } = {}) {
  if (cachedPreview && !force) return cachedPreview;
  if (!navigator.onLine) return { status: 'offline', monthly: null, annual: null, valid: false };

  await initBilling();

  try {
    const result = await window.Paddle.PricePreview({
      items: [
        { priceId: BILLING_CONFIG.prices.monthly, quantity: 1 },
        { priceId: BILLING_CONFIG.prices.annual, quantity: 1 }
      ]
    });
    const normalized = normalizePreview(result);
    cachedPreview = { status: normalized.valid ? 'ready' : 'invalid-prices', ...normalized };
    return cachedPreview;
  } catch (error) {
    return {
      status: 'error',
      error: asErrorMessage(error),
      monthly: null,
      annual: null,
      valid: false
    };
  }
}

export async function openPremiumCheckout({
  cadence = 'monthly',
  userId,
  email
} = {}) {
  if (!userId) throw new Error('Necesitas iniciar sesión antes de contratar Premium.');
  if (!navigator.onLine) throw new Error('Necesitas conexión a internet para abrir el checkout.');

  const priceId = BILLING_CONFIG.prices[cadence];
  if (!priceId) throw new Error('El precio de Paddle todavía no está configurado.');

  const preview = await previewPremiumPrices();
  if (preview.status === 'invalid-prices') {
    throw new Error('Los precios mensual/anual de Paddle no coinciden con su periodicidad esperada.');
  }

  await initBilling();

  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: email ? { email } : undefined,
    customData: {
      mfp_user_id: userId,
      mfp_plan: 'premium',
      mfp_cadence: cadence,
      mfp_environment: BILLING_CONFIG.environment,
      mfp_app_version: BILLING_CONFIG.appVersion
    },
    settings: {
      displayMode: 'overlay',
      variant: 'one-page',
      theme: 'dark',
      locale: 'es',
      allowLogout: false
    }
  });

  return { status: 'opened', cadence, priceId };
}
