export const CLOUD_CONFIG = Object.freeze({
  enabled: true,
  url: 'https://qrdccunogxnygpyaokoz.supabase.co',
  publishableKey: 'sb_publishable_QWabAar2Wervc77VNRIiSw_8oaW5ZQ0',
  stateTable: 'mfp_state',
  profileTable: 'mfp_profiles',
  entitlementTable: 'mfp_entitlements',
  photoBucket: 'mfp-progress-photos',
  schemaVersion: 410,
  appVersion: '4.0.2 Cloud Photos'
});

export function cloudRedirectUrl() {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  if (!url.pathname.endsWith('/')) url.pathname = url.pathname.replace(/[^/]*$/, '');
  return url.href;
}
