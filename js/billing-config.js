export const BILLING_CONFIG = Object.freeze({
  enabled: true,
  environment: 'sandbox',
  provider: 'paddle',
  clientToken: 'test_314d34ddd4656a8ec5e9b094f98',
  prices: Object.freeze({
    monthly: 'pri_01kzgz5v4f27r5pvhyvc5b1y59',
    annual: 'pri_01kzgz6wr16d5bg6zz2ndc3txz'
  }),
  productId: 'pro_01kzgz375ynjkcf33d50v5xe2r',
  appVersion: '4.4 Beta Ready Sandbox'
});

export function billingConfigured() {
  return Boolean(
    BILLING_CONFIG.enabled &&
    BILLING_CONFIG.clientToken &&
    BILLING_CONFIG.productId &&
    BILLING_CONFIG.prices.monthly &&
    BILLING_CONFIG.prices.annual
  );
}
