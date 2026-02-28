import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let apiBaseUrl = '';
let authToken = '';
const storeState = {
  loaded: false,
  data: {},
  path: ''
};

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'pwd',
  'verifyCode',
  'captcha',
  'captchaId',
  'token',
  'accessToken',
  'authorization'
]);

const redactValue = (value) => {
  if (typeof value !== 'string') return '***';
  if (value.length <= 4) return '***';
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

const redactPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) {
    return payload.map((item) => redactPayload(item));
  }
  const next = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.has(key)) {
      next[key] = redactValue(value);
    } else if (value && typeof value === 'object') {
      next[key] = redactPayload(value);
    } else {
      next[key] = value;
    }
  }
  return next;
};

const extractCaptchaUuid = (headers) => {
  if (!headers || typeof headers !== 'object') return '';
  const directKeys = [
    'x-captcha-uuid',
    'x-captcha-id',
    'captcha-uuid',
    'captcha-id',
    'captcha_uuid',
    'captchaid',
    'uuid'
  ];
  for (const key of directKeys) {
    const value = headers[key];
    if (typeof value === 'string' && value) return value;
  }

  const cookieValue = headers['set-cookie'];
  if (typeof cookieValue === 'string' && cookieValue) {
    const match = cookieValue.match(/(?:^|[;,])\s*(captcha_uuid|captchaId|uuid)=([^;,\s]+)/i);
    if (match && match[2]) return match[2];
  }
  return '';
};

const splitSetCookieHeader = (headerValue) => {
  if (!headerValue || typeof headerValue !== 'string') return [];
  if (!headerValue.includes(',')) return [headerValue];
  const parts = [];
  let start = 0;
  let inExpires = false;
  for (let i = 0; i < headerValue.length; i += 1) {
    const slice = headerValue.slice(i, i + 8).toLowerCase();
    if (slice === 'expires=') {
      inExpires = true;
    } else if (inExpires && headerValue[i] === ';') {
      inExpires = false;
    } else if (!inExpires && headerValue[i] === ',') {
      const part = headerValue.slice(start, i).trim();
      if (part) parts.push(part);
      start = i + 1;
    }
  }
  const tail = headerValue.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
};

const toSameSite = (value) => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'lax') return 'lax';
  if (normalized === 'strict') return 'strict';
  if (normalized === 'none') return 'no_restriction';
  return undefined;
};

const buildCookieDetails = (cookieString, requestUrl) => {
  if (!cookieString || typeof cookieString !== 'string') return null;
  const segments = cookieString.split(';').map((part) => part.trim()).filter(Boolean);
  if (segments.length === 0) return null;
  const [nameValue, ...attrs] = segments;
  const separatorIndex = nameValue.indexOf('=');
  if (separatorIndex <= 0) return null;
  const name = nameValue.slice(0, separatorIndex);
  const value = nameValue.slice(separatorIndex + 1);
  const details = {
    url: requestUrl,
    name,
    value
  };

  for (const attr of attrs) {
    const [rawKey, ...rest] = attr.split('=');
    const key = rawKey.trim().toLowerCase();
    const attrValue = rest.join('=').trim();
    if (key === 'path' && attrValue) details.path = attrValue;
    else if (key === 'domain' && attrValue) details.domain = attrValue.toLowerCase();
    else if (key === 'expires' && attrValue) {
      const timestamp = Date.parse(attrValue);
      if (!Number.isNaN(timestamp)) {
        details.expirationDate = Math.floor(timestamp / 1000);
      }
    } else if (key === 'max-age' && attrValue) {
      const maxAge = Number.parseInt(attrValue, 10);
      if (!Number.isNaN(maxAge)) {
        details.expirationDate = Math.floor(Date.now() / 1000) + maxAge;
      }
    } else if (key === 'secure') details.secure = true;
    else if (key === 'httponly') details.httpOnly = true;
    else if (key === 'samesite') {
      const sameSite = toSameSite(attrValue);
      if (sameSite) details.sameSite = sameSite;
    }
  }

  try {
    const requestOrigin = new URL(requestUrl);
    const cookieUrl = new URL(requestOrigin.toString());
    if (details.domain) {
      cookieUrl.hostname = details.domain.replace(/^\./, '');
    }
    if (details.path) {
      cookieUrl.pathname = details.path;
    }
    details.url = cookieUrl.toString();
  } catch {
    return details;
  }

  return details;
};

const writeResponseCookiesToSession = async (response, requestUrl) => {
  if (!response?.headers) return;
  let setCookieHeaders = [];
  if (typeof response.headers.getSetCookie === 'function') {
    setCookieHeaders = response.headers.getSetCookie();
  } else {
    const fallback = response.headers.get('set-cookie');
    if (fallback) setCookieHeaders = splitSetCookieHeader(fallback);
  }
  if (!Array.isArray(setCookieHeaders) || setCookieHeaders.length === 0) return;

  const cookieStrings = setCookieHeaders.flatMap((value) =>
    splitSetCookieHeader(value)
  );

  await Promise.all(
    cookieStrings.map(async (cookieString) => {
      const details = buildCookieDetails(cookieString, requestUrl);
      if (!details) return;
      try {
        await session.defaultSession.cookies.set(details);
      } catch (error) {
        console.warn('[api] set cookie failed', details?.name || '', error);
      }
    })
  );
};

const ensureStoreLoaded = async () => {
  if (storeState.loaded) return;
  if (!storeState.path) {
    storeState.path = path.join(app.getPath('userData'), 'store.json');
  }
  try {
    const raw = await readFile(storeState.path, 'utf8');
    storeState.data = JSON.parse(raw);
  } catch {
    storeState.data = {};
  }
  storeState.loaded = true;
};

const writeStore = async () => {
  if (!storeState.path) {
    storeState.path = path.join(app.getPath('userData'), 'store.json');
  }
  try {
    await mkdir(path.dirname(storeState.path), { recursive: true });
    await writeFile(storeState.path, JSON.stringify(storeState.data, null, 2), 'utf8');
  } catch (error) {
    console.error('[store] write failed', storeState.path, error);
    throw error;
  }
};

const normalizeBaseUrl = (url) => {
  const parsed = new URL(url);
  return parsed.origin;
};

const ensureHttpUrl = (url) => {
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('unsupported url protocol');
  }
};

const resolveRequestUrl = (pathOrUrl) => {
  let targetUrl;
  if (typeof pathOrUrl !== 'string') {
    throw new Error('request path must be a string');
  }

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    targetUrl = new URL(pathOrUrl);
    ensureHttpUrl(targetUrl);
    if (!apiBaseUrl) {
      throw new Error('base url not set');
    }
    if (targetUrl.origin !== apiBaseUrl) {
      throw new Error('request origin not allowed');
    }
    return targetUrl.toString();
  }

  if (!apiBaseUrl) {
    throw new Error('base url not set');
  }

  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  targetUrl = new URL(normalizedPath, apiBaseUrl);
  ensureHttpUrl(targetUrl);
  return targetUrl.toString();
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    const pageUrl = new URL('pages/home/', devServerUrl).toString();
    mainWindow.loadURL(pageUrl);
  } else {
    const fileUrl = pathToFileURL(
      path.join(__dirname, '../renderer/pages/home/index.html')
    ).toString();
    mainWindow.loadURL(fileUrl);
  }
};

app.whenReady().then(() => {
  ipcMain.handle('ping', () => 'pong');
  ipcMain.handle('store:get', async (_event, key) => {
    await ensureStoreLoaded();
    if (!key) return storeState.data;
    return storeState.data[key];
  });

  ipcMain.handle('store:set', async (_event, key, value) => {
    if (typeof key !== 'string' || !key) {
      throw new Error('store key must be a non-empty string');
    }
    await ensureStoreLoaded();
    storeState.data[key] = value;
    await writeStore();
    return true;
  });

  ipcMain.handle('store:merge', async (_event, key, value) => {
    if (typeof key !== 'string' || !key) {
      throw new Error('store key must be a non-empty string');
    }
    await ensureStoreLoaded();
    const current = storeState.data[key];
    if (current && typeof current === 'object' && value && typeof value === 'object') {
      storeState.data[key] = { ...current, ...value };
    } else {
      storeState.data[key] = value;
    }
    await writeStore();
    return true;
  });
  ipcMain.handle('api:set-base-url', (_event, url) => {
    if (typeof url !== 'string') {
      throw new Error('base url must be a string');
    }
    apiBaseUrl = normalizeBaseUrl(url);
    return apiBaseUrl;
  });

  ipcMain.handle('api:get-base-url', () => apiBaseUrl);

  ipcMain.handle('api:set-auth-token', (_event, token) => {
    authToken = typeof token === 'string' ? token : '';
    return Boolean(authToken);
  });

  ipcMain.handle('api:request', async (_event, options) => {
    const {
      path: pathOrUrl,
      method = 'GET',
      headers = {},
      body,
      responseType = 'auto'
    } = options || {};

    const url = resolveRequestUrl(pathOrUrl);
    console.log('[api] request', method, url);
    if (body !== undefined) {
      const safeBody =
        body && typeof body === 'object' && !(body instanceof ArrayBuffer)
          ? redactPayload(body)
          : body;
      console.log('[api] request body', safeBody);
    }
    const requestHeaders = new Headers(headers);

    if (authToken && !requestHeaders.has('authorization')) {
      requestHeaders.set('authorization', `Bearer ${authToken}`);
    }

    let requestBody = body;
    if (body && typeof body === 'object' && !(body instanceof ArrayBuffer)) {
      if (!requestHeaders.has('content-type')) {
        requestHeaders.set('content-type', 'application/json');
      }
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
      cache: 'no-store'
    });
    console.log('[api] response', response.status, response.statusText, url);
    await writeResponseCookiesToSession(response, url);

    const contentType = response.headers.get('content-type') || '';
    const result = {
      ok: response.ok,
      status: response.status,
      contentType,
      headers: Object.fromEntries(response.headers.entries()),
      data: null,
      isBase64: false
    };
    result.captchaUuid = extractCaptchaUuid(result.headers);

    if (responseType === 'json' || (responseType === 'auto' && contentType.includes('application/json'))) {
      result.data = await response.json();
      console.log('[api] response data', redactPayload(result.data));
      return result;
    }

    if (responseType === 'text') {
      result.data = await response.text();
      const preview =
        typeof result.data === 'string' && result.data.length > 500
          ? `${result.data.slice(0, 500)}...`
          : result.data;
      console.log('[api] response text', preview);
      return result;
    }

    const arrayBuffer = await response.arrayBuffer();
    result.data = Buffer.from(arrayBuffer).toString('base64');
    result.isBase64 = true;
    console.log('[api] response base64', `length=${result.data.length}`);
    return result;
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
