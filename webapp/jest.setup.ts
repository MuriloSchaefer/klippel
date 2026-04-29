if (typeof (globalThis as any).fetch !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const undici = require('undici');
  (globalThis as any).fetch = undici.fetch;
  (globalThis as any).Headers = undici.Headers;
  (globalThis as any).Request = undici.Request;
  (globalThis as any).Response = undici.Response;
}
