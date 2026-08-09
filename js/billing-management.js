'use strict';

import { cloudInvokeUserFunction } from './cloud.js?v=47';

let cachedSummary = null;
let summaryPromise = null;

export function clearBillingManagementCache() {
  cachedSummary = null;
  summaryPromise = null;
}

export function billingManagementCachedSummary() {
  return cachedSummary;
}

export async function fetchBillingSummary({ force = false } = {}) {
  if (cachedSummary && !force) return cachedSummary;
  if (summaryPromise && !force) return summaryPromise;

  summaryPromise = cloudInvokeUserFunction('billing-portal', { action: 'summary' })
    .then((result) => {
      cachedSummary = result?.billing || null;
      return cachedSummary;
    })
    .finally(() => {
      summaryPromise = null;
    });

  return summaryPromise;
}

export async function openBillingPortal(target = 'overview') {
  const result = await cloudInvokeUserFunction('billing-portal', {
    action: 'portal',
    target
  });

  const url = String(result?.url || '');
  if (!/^https:\/\/.+/i.test(url)) {
    throw new Error('Paddle no devolvió un enlace seguro para gestionar la suscripción.');
  }

  window.location.assign(url);
  return { status: 'opened', target };
}
