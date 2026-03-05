<template>
  <main class="page">
    <header class="header">
      <div>
        <p class="eyebrow">Secure Access</p>
        <h1 class="title">账号登录</h1>
        <p class="subtitle">请选择服务器地址并填写账号信息完成登录。</p>
      </div>
      <button class="button ghost" type="button" @click="toggleTheme">
        Theme: {{ themeLabel }}
      </button>
    </header>

    <section class="login-card">
      <form class="form" novalidate @submit.prevent="handleLogin">
        <label class="field">
          <span class="label">服务器地址</span>
          <input
            v-model.trim="form.url"
            class="input"
            type="url"
            placeholder="https://yj3dev-admin.asiic.cn/"
            autocomplete="url"
            required
          />
          <span class="hint">示例：https://yj3dev-admin.asiic.cn/</span>
        </label>

        <label class="field">
          <span class="label">账号</span>
          <input
            v-model.trim="form.username"
            class="input"
            type="text"
            placeholder="请输入账号"
            autocomplete="username"
            required
          />
        </label>

        <label class="field">
          <span class="label">密码</span>
          <input
            v-model="form.password"
            class="input"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
            required
          />
        </label>

        <label class="field">
          <span class="label">验证码</span>
          <div class="captcha-row">
            <input
              v-model.trim="form.verifyCode"
              class="input"
              type="text"
              placeholder="请输入验证码"
              autocomplete="one-time-code"
              required
            />
            <button class="button secondary" type="button" @click="refreshCaptcha">
              刷新验证码
            </button>
          </div>
          <div class="captcha-box">
            <img
              v-if="captchaSrc"
              class="captcha-image"
              :src="captchaSrc"
              alt="验证码"
              @click="refreshCaptcha"
            />
            <div v-else class="captcha-placeholder">
              {{ captchaStatus || '加载验证码中...' }}
            </div>
          </div>
        </label>

        <div class="actions">
          <button class="button primary" type="button" @click="handleLogin">登录</button>
          <p class="status" v-if="status">{{ status }}</p>
        </div>
      </form>
    </section>
  </main>
</template>

<script setup>
import JSEncrypt from 'jsencrypt';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const LOGIN_PUBLIC_KEY =
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCq/tBY/aMASbuVcWmnoBvDUoc2p9tST5vDREeh2sSBydul79UZjxwSldSXyG36ICbmULMqN3Q1gC13ax95QR3DUEGepFJRlfmoxQlwccLOgypmP7HvnoWeTAW/swYWB2aofdve/Ni8bKaD6hyLjg6OOuP06MG76J7644HrbomjBwIDAQAB';
const encryptor = new JSEncrypt();
encryptor.setPublicKey(LOGIN_PUBLIC_KEY);
const LOGIN_STORE_KEY = 'loginFormByDomain';
const LEGACY_LOGIN_KEY = 'loginForm';

const status = ref('');
const theme = ref('light');
const form = ref({
  url: '',
  username: '',
  password: '',
  verifyCode: '',
  uuid: ''
});
const captchaSrc = ref('');
const captchaStatus = ref('');
const loginByDomain = ref({});
const lastLoginOrigin = ref('');
let lastCaptchaObjectUrl = '';

const themeLabel = computed(() => (theme.value === 'light' ? 'Light' : 'Dark'));

const applyTheme = () => {
  document.documentElement.classList.toggle('dark', theme.value === 'dark');
};

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  applyTheme();
};

const setCaptchaImage = (src) => {
  if (lastCaptchaObjectUrl) {
    URL.revokeObjectURL(lastCaptchaObjectUrl);
    lastCaptchaObjectUrl = '';
  }
  captchaSrc.value = src;
};

const refreshCaptcha = async () => {
  captchaStatus.value = '正在加载验证码...';
  try {
    if (!window.api?.setBaseUrl || !window.api?.request) {
      throw new Error('api bridge not available');
    }

    await window.api.setBaseUrl(form.value.url);
    const random = Math.random().toString(36).slice(2);
    const baseUrl = (() => {
      try {
        return new URL(form.value.url).origin;
      } catch {
        return 'https://yj3dev-admin.asiic.cn';
      }
    })();
    const result = await window.api.request({
      path: `${baseUrl}/api/iam/captcha?${random}`,
      method: 'GET',
      responseType: 'auto'
    });

    if (!result?.ok) {
      throw new Error(`captcha request failed: ${result?.status || 'unknown'}`);
    }

    const headerUuid =
      result?.captchaUuid ||
      result?.headers?.['x-captcha-uuid'] ||
      result?.headers?.['x-captcha-id'] ||
      result?.headers?.['captcha-id'] ||
      result?.headers?.['captcha-uuid'] ||
      result?.headers?.['captcha_uuid'] ||
      result?.headers?.uuid ||
      '';

    const extractCaptcha = (source) => {
      if (!source || typeof source !== 'object') return { image: '', uuid: '' };
      const image =
        (typeof source.image === 'string' && source.image) ||
        (typeof source.img === 'string' && source.img) ||
        (typeof source.base64 === 'string' && source.base64) ||
        (typeof source.captcha === 'string' && source.captcha) ||
        (typeof source.captchaImage === 'string' && source.captchaImage) ||
        (typeof source.data === 'string' && source.data) ||
        '';
      const uuid =
        (typeof source.uuid === 'string' && source.uuid) ||
        (typeof source.captchaId === 'string' && source.captchaId) ||
        (typeof source.id === 'string' && source.id) ||
        (typeof source.captchaUuid === 'string' && source.captchaUuid) ||
        '';
      return { image, uuid };
    };

    if (result?.isBase64 && result?.data) {
      if (result.contentType && !result.contentType.startsWith('image/')) {
        throw new Error('captcha response not image');
      }
      const src = `data:${result.contentType || 'image/png'};base64,${result.data}`;
      setCaptchaImage(src);
      captchaStatus.value = '';
      form.value.verifyCode = '';
      form.value.uuid = headerUuid || form.value.uuid;
      return;
    }

    const payload = result?.data;
    const candidates = [payload, payload?.data, payload?.result, payload?.payload];
    let imageValue = '';
    let uuidValue = headerUuid || '';
    for (const candidate of candidates) {
      const { image, uuid } = extractCaptcha(candidate);
      if (!imageValue && image) imageValue = image;
      if (!uuidValue && uuid) uuidValue = uuid;
    }
    if (imageValue) {
      const src = imageValue.startsWith('data:image')
        ? imageValue
        : `data:image/png;base64,${imageValue}`;
      setCaptchaImage(src);
      captchaStatus.value = '';
      form.value.verifyCode = '';
      form.value.uuid = uuidValue;
      if (!form.value.uuid) {
        console.warn('[captcha] uuid missing in response');
      }
      return;
    }

    throw new Error('captcha response format not recognized');
  } catch (error) {
    captchaSrc.value = '';
    captchaStatus.value = '验证码加载失败，点击重试。';
  }
};

const extractToken = (data) => {
  if (!data || typeof data !== 'object') return '';
  return (
    data.token ||
    data.accessToken ||
    data.jwt ||
    data.data?.token ||
    data.data?.accessToken ||
    data.data?.jwt ||
    ''
  );
};

const extractTargetUrl = (data) => {
  if (!data || typeof data !== 'object') return '';
  return (
    data.targetUrl ||
    data.redirectUrl ||
    data.url ||
    data.data?.targetUrl ||
    data.data?.redirectUrl ||
    data.data?.url ||
    ''
  );
};

const resolveTargetUrl = (targetUrl, baseUrl) => {
  if (!targetUrl || typeof targetUrl !== 'string') return '';
  try {
    const resolved = new URL(targetUrl, baseUrl);
    if (resolved.protocol !== 'https:') {
      resolved.protocol = 'https:';
    }
    return resolved.toString();
  } catch {
    return '';
  }
};

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
};

const applySavedLogin = (origin, fallback) => {
  if (!origin) return false;
  const saved = loginByDomain.value[origin];
  if (saved && typeof saved === 'object') {
    form.value.username = saved.username || saved.account || '';
    form.value.password = saved.password || '';
    return true;
  }
  if (fallback && typeof fallback === 'object') {
    const nextUsername = fallback.username || fallback.account || '';
    const nextPassword = fallback.password || '';
    if (nextUsername || nextPassword) {
      form.value.username = nextUsername;
      form.value.password = nextPassword;
      return true;
    }
  }
  return false;
};

const saveLoginForOrigin = async (origin) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized || !window.api?.storeSet) return;
  const payload = {
    username: form.value.username,
    password: form.value.password
  };
  loginByDomain.value = { ...loginByDomain.value, [normalized]: payload };
  try {
    await window.api.storeSet(LOGIN_STORE_KEY, loginByDomain.value);
  } catch (error) {
    console.error('[store] save login failed', error);
  }
};

const handleLogin = async () => {
  if (
    !form.value.url ||
    !form.value.username ||
    !form.value.password ||
    !form.value.verifyCode
  ) {
    status.value = '请填写完整信息。';
    return;
  }
  if (!form.value.uuid) {
    status.value = '验证码 uuid 未获取，请刷新验证码。';
    return;
  }
  if (!window.api?.setBaseUrl || !window.api?.request) {
    status.value = 'API bridge 未就绪，请重启应用。';
    return;
  }

  const encryptedPassword = encryptor.encrypt(form.value.password);
  if (!encryptedPassword) {
    status.value = '密码加密失败，请重试。';
    return;
  }

  status.value = '正在登录...';
  try {
    await window.api.setBaseUrl(form.value.url);
    const baseUrl = (() => {
      try {
        return new URL(form.value.url).origin;
      } catch {
        return 'https://yj3dev-admin.asiic.cn';
      }
    })();
    const result = await window.api.request({
      path: `${baseUrl}/api/iam/app/login`,
      method: 'POST',
      body: {
        uuid: form.value.uuid || undefined,
        verifyCode: form.value.verifyCode,
        username: form.value.username,
        password: encryptedPassword
      },
      responseType: 'json'
    });

    if (!result?.ok) {
      status.value = `登录失败（${result?.status || 'unknown'}）。`;
      return;
    }

    const token = extractToken(result.data);
    if (token && window.api?.setAuthToken) {
      await window.api.setAuthToken(token);
    }
    await saveLoginForOrigin(baseUrl);
    const targetUrl = resolveTargetUrl(
      extractTargetUrl(result.data),
      baseUrl
    );
    if (targetUrl) {
      status.value = '登录成功，正在跳转...';
      window.location.href = targetUrl;
      return;
    }
    status.value = '登录成功。';
  } catch (error) {
    status.value = '登录失败，请检查网络或接口。';
  }
};

onMounted(() => {
  applyTheme();
  if (!window.api?.storeGet) {
    form.value.url = 'https://yj3dev-admin.asiic.cn/';
    refreshCaptcha();
    return;
  }

  Promise.all([
    window.api.storeGet('activeServerAddress'),
    window.api.storeGet(LOGIN_STORE_KEY),
    window.api.storeGet(LEGACY_LOGIN_KEY)
  ])
    .then(([active, savedMap, legacy]) => {
      const activeValue = typeof active === 'string' ? active.trim() : '';
      const mapValue = savedMap && typeof savedMap === 'object' ? savedMap : {};
      loginByDomain.value = mapValue;
      const legacyValue = legacy && typeof legacy === 'object' ? legacy : null;
      const legacyUrl = legacyValue?.url || '';
      const legacyOrigin = legacyUrl ? normalizeOrigin(legacyUrl) : '';
      if (activeValue) {
        form.value.url = activeValue;
      } else if (legacyValue?.url) {
        form.value.url = legacyValue.url;
      }
      if (!form.value.url) {
        form.value.url = 'https://yj3dev-admin.asiic.cn/';
      }
      const origin = normalizeOrigin(form.value.url);
      if (origin) {
        lastLoginOrigin.value = origin;
        const legacyPayload =
          legacyValue && (!legacyOrigin || legacyOrigin === origin)
            ? {
                username: legacyValue.username || legacyValue.account || '',
                password: legacyValue.password || ''
              }
            : null;
        const applied = applySavedLogin(origin, legacyPayload);
        if (
          legacyPayload &&
          !loginByDomain.value[origin] &&
          (legacyPayload.username || legacyPayload.password) &&
          window.api?.storeSet
        ) {
          loginByDomain.value = { ...loginByDomain.value, [origin]: legacyPayload };
          window.api.storeSet(LOGIN_STORE_KEY, loginByDomain.value).catch((error) => {
            console.error('[store] migrate login failed', error);
          });
        }
        if (!applied && !legacyPayload) {
          form.value.username = '';
          form.value.password = '';
        }
      }
    })
    .finally(() => {
      refreshCaptcha();
    });
});

onBeforeUnmount(() => {
  lastLoginOrigin.value = '';
});

watch(
  () => form.value.url,
  (nextUrl) => {
    const origin = normalizeOrigin(nextUrl);
    if (!origin || origin === lastLoginOrigin.value) return;
    lastLoginOrigin.value = origin;
    const saved = loginByDomain.value[origin];
    if (saved && typeof saved === 'object') {
      form.value.username = saved.username || saved.account || '';
      form.value.password = saved.password || '';
    } else {
      form.value.username = '';
      form.value.password = '';
    }
  }
);
</script>
