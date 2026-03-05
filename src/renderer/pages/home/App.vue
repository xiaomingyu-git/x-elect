<template>
  <main class="page">
    <section class="card">
      <h2 class="card-title">羽嘉低代码生成</h2>
      <div class="stepper">
        <div class="step" :class="{ active: step === 1, done: step > 1 }">
          <span class="step-index">1</span>
          <div>
            <p class="step-title">服务器地址</p>
            <p class="step-desc">添加或选择服务器地址</p>
          </div>
        </div>
        <div class="step-line"></div>
        <div class="step" :class="{ active: step === 2, done: step > 2 }">
          <span class="step-index">2</span>
          <div>
            <p class="step-title">账号登录</p>
            <p class="step-desc">输入账号、密码与验证码</p>
          </div>
        </div>
      </div>

      <div v-if="step === 1" class="step-panel">
        <form class="profile-form" @submit.prevent="handleAddOnly">
          <Tabs v-model="addressMode" class="profile-card">
            <TabsList class="profile-tabs" aria-label="服务器地址">
              <TabsTrigger class="profile-tab" value="select">选择域名</TabsTrigger>
              <TabsTrigger class="profile-tab" value="new">新增域名</TabsTrigger>
            </TabsList>

            <TabsContent value="select" class="profile-body">
              <div class="profile-row profile-full">
                <span class="profile-label">选择域名</span>
                <div class="profile-control">
                  <Table v-if="addresses.length">
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>服务器域名</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow
                        v-for="(item, index) in addresses"
                        :key="`${item}-${index}`"
                        :data-state="addressInput === item ? 'selected' : undefined"
                      >
                        <TableCell>{{ index + 1 }}</TableCell>
                        <TableCell>
                          <span class="flex items-center gap-2">
                            {{ item }}
                            <CheckIcon
                              class="h-4 w-4 text-primary"
                              :class="addressInput === item ? 'opacity-100' : 'opacity-0'"
                            />
                          </span>
                        </TableCell>
                        <TableCell>
                          <div class="action-group">
                            <button
                              class="button ghost small"
                              type="button"
                              @click="selectSaved(item)"
                            >
                              选择
                            </button>
                            <button
                              class="button danger small"
                              type="button"
                              @click="handleRemoveValue(item)"
                            >
                              删除
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <div v-else class="empty">暂无保存域名资料</div>
                  <span class="hint">已保存 {{ addresses.length }} 条地址资料</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="new" class="profile-body">
              <div class="profile-row">
                <span class="profile-label">服务器域名</span>
                <div class="profile-control">
                  <input
                    v-model.trim="addressInput"
                    class="input"
                    type="text"
                    placeholder="https://example.com"
                    autocomplete="url"
                    required
                  />
                  <span class="hint">示例：https://yj3dev-admin.asiic.cn/</span>
                </div>
              </div>

              <div class="profile-row profile-actions">
                <span class="profile-label"></span>
                <div class="profile-control action-group">
                  <button class="button primary" type="submit" :disabled="!canSubmit">
                    新增
                  </button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </form>

        <div class="log" v-if="addressStatus">
          <span class="log-label">操作日志</span>
          <p class="status">{{ addressStatus }}</p>
        </div>
      </div>

      <div v-else class="step-panel">
        <form class="form" novalidate @submit.prevent="handleLogin">
          <p class="server-hint">
            服务器地址：{{ form.url || '未选择服务器地址' }}
          </p>

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
            <div class="action-row">
              <button class="button secondary" type="button" @click="step = 1">上一步</button>
              <button class="button primary" type="submit">登录</button>
            </div>
            <p class="status" v-if="loginStatus">{{ loginStatus }}</p>
          </div>
        </form>
      </div>
    </section>
  </main>
</template>

<script setup>
import JSEncrypt from 'jsencrypt';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { CheckIcon } from 'lucide-vue-next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

const LOGIN_PUBLIC_KEY =
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCq/tBY/aMASbuVcWmnoBvDUoc2p9tST5vDREeh2sSBydul79UZjxwSldSXyG36ICbmULMqN3Q1gC13ax95QR3DUEGepFJRlfmoxQlwccLOgypmP7HvnoWeTAW/swYWB2aofdve/Ni8bKaD6hyLjg6OOuP06MG76J7644HrbomjBwIDAQAB';
const encryptor = new JSEncrypt();
encryptor.setPublicKey(LOGIN_PUBLIC_KEY);
const LOGIN_STORE_KEY = 'loginFormByDomain';
const LEGACY_LOGIN_KEY = 'loginForm';

const step = ref(1);
const addressStatus = ref('');
const loginStatus = ref('');
const addressInput = ref('');
const addresses = ref([]);
const addressMode = ref('select');

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
let captchaTimer;
const canSubmit = computed(() => Boolean(addressInput.value.trim()));

const normalizeList = (list) =>
  (Array.isArray(list) ? list : [])
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

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
  const nextMap = { ...loginByDomain.value, [normalized]: payload };
  loginByDomain.value = nextMap;
  try {
    await window.api.storeSet(LOGIN_STORE_KEY, nextMap);
  } catch (error) {
    console.error('[store] save login failed', error);
  }
};

const parseServerAddress = (value) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return { ok: false, message: '请输入服务器地址。' };
  try {
    const url = new URL(raw);
    const hasExtraPath = url.pathname && url.pathname !== '/';
    const hasExtra = hasExtraPath || url.search || url.hash;
    if (hasExtra) {
      return { ok: false, message: '服务器地址不能包含路径或参数。' };
    }
    return { ok: true, normalized: `${url.origin}/` };
  } catch {
    return { ok: false, message: '服务器地址格式错误。' };
  }
};

const persistAddresses = async () => {
  if (!window.api?.storeSet) {
    addressStatus.value = '本地存储未就绪，无法保存。';
    return false;
  }
  try {
    const payload = normalizeList(addresses.value);
    await window.api.storeSet('serverAddresses', payload);
    return true;
  } catch (error) {
    console.error('[store] save failed', error);
    addressStatus.value = '保存失败，请稍后重试。';
    return false;
  }
};

const checkCaptchaForAddress = async (value) => {
  const urlValue = typeof value === 'string' ? value.trim() : '';
  if (!urlValue) return false;
  if (!window.api?.setBaseUrl || !window.api?.request) {
    addressStatus.value = 'API bridge 未就绪，无法校验验证码。';
    return false;
  }
  try {
    await window.api.setBaseUrl(urlValue);
    const random = Math.random().toString(36).slice(2);
    const baseUrl = (() => {
      try {
        return new URL(urlValue).origin;
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
      addressStatus.value = `验证码调用失败（${result?.status || 'unknown'}）。`;
      return false;
    }
    return true;
  } catch (error) {
    addressStatus.value = '验证码调用失败，请检查地址或网络。';
    return false;
  }
};

const setActiveAddress = async (value) => {
  const nextValue = typeof value === 'string' ? value.trim() : '';
  if (!nextValue) return false;
  form.value.url = nextValue;
  addressInput.value = nextValue;
  if (window.api?.storeSet) {
    try {
      await window.api.storeSet('activeServerAddress', nextValue);
    } catch (error) {
      console.error('[store] save active address failed', error);
      addressStatus.value = '保存选择失败，请稍后重试。';
      return false;
    }
  }
  step.value = 2;
  loginStatus.value = '';
  return true;
};

const syncLoginByUrl = (value) => {
  const origin = normalizeOrigin(value);
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
};

const handleAddOnly = async () => {
  addressStatus.value = '';
  const parsed = parseServerAddress(addressInput.value);
  if (!parsed.ok) {
    addressStatus.value = parsed.message;
    return;
  }
  const value = parsed.normalized;
  addressInput.value = value;

  const captchaOk = await checkCaptchaForAddress(value);
  if (!captchaOk) {
    return;
  }

  const existed = addresses.value.includes(value);
  if (!existed) {
    addresses.value = [value, ...addresses.value];
    const saved = await persistAddresses();
    if (!saved) {
      return;
    }
    addressStatus.value = '已新增。';
    addressInput.value = '';
    addressMode.value = 'select';
  } else {
    addressStatus.value = '该域名已存在。';
  }
};

const handleRemove = async (index) => {
  if (index < 0 || index >= addresses.value.length) return;
  const next = addresses.value.slice();
  next.splice(index, 1);
  addresses.value = next;
  const saved = await persistAddresses();
  if (saved) {
    addressStatus.value = '已删除。';
  }
};

const selectSaved = (value) => {
  const nextValue = typeof value === 'string' ? value.trim() : '';
  if (!nextValue) return;
  addressInput.value = nextValue;
  setActiveAddress(nextValue).then((ok) => {
    if (ok) {
      syncLoginByUrl(nextValue);
    }
  });
};

const handleRemoveValue = async (value) => {
  const nextValue = typeof value === 'string' ? value.trim() : '';
  if (!nextValue) return;
  const index = addresses.value.indexOf(nextValue);
  if (index === -1) {
    addressStatus.value = '该地址未在列表中。';
    return;
  }
  await handleRemove(index);
  if (addressInput.value.trim() === nextValue) {
    addressInput.value = '';
  }
  if (!addresses.value.length) {
    showSaved.value = false;
  }
};

const setCaptchaImage = (src) => {
  if (lastCaptchaObjectUrl) {
    URL.revokeObjectURL(lastCaptchaObjectUrl);
    lastCaptchaObjectUrl = '';
  }
  captchaSrc.value = src;
};

const refreshCaptcha = async () => {
  if (!form.value.url) {
    captchaStatus.value = '请先填写服务器地址。';
    return;
  }
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

const handleLogin = async () => {
  if (!form.value.url || !form.value.username || !form.value.password || !form.value.verifyCode) {
    loginStatus.value = '请填写完整信息。';
    return;
  }
  if (!form.value.uuid) {
    loginStatus.value = '验证码 uuid 未获取，请刷新验证码。';
    return;
  }
  if (!window.api?.setBaseUrl || !window.api?.request) {
    loginStatus.value = 'API bridge 未就绪，请重启应用。';
    return;
  }

  const encryptedPassword = encryptor.encrypt(form.value.password);
  if (!encryptedPassword) {
    loginStatus.value = '密码加密失败，请重试。';
    return;
  }

  loginStatus.value = '正在登录...';
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
      loginStatus.value = `登录失败（${result?.status || 'unknown'}）。`;
      return;
    }

    const token = extractToken(result.data);
    if (token && window.api?.setAuthToken) {
      await window.api.setAuthToken(token);
    }
    await saveLoginForOrigin(baseUrl);
    const targetUrl = resolveTargetUrl(extractTargetUrl(result.data), baseUrl);
    if (targetUrl) {
      loginStatus.value = '登录成功，正在跳转...';
      window.location.href = targetUrl;
      return;
    }
    loginStatus.value = '登录成功。';
  } catch (error) {
    loginStatus.value = '登录失败，请检查网络或接口。';
  }
};

const scheduleCaptcha = () => {
  if (captchaTimer) clearTimeout(captchaTimer);
  captchaTimer = setTimeout(() => {
    if (step.value === 2 && form.value.url) {
      refreshCaptcha();
    }
  }, 400);
};

watch(
  () => step.value,
  (nextStep) => {
    if (nextStep === 2 && form.value.url) {
      scheduleCaptcha();
    }
  }
);

onMounted(() => {
  if (!window.api?.storeGet) {
    form.value.url = 'https://yj3dev-admin.asiic.cn/';
    return;
  }

  Promise.all([
    window.api.storeGet('serverAddresses'),
    window.api.storeGet('activeServerAddress'),
    window.api.storeGet(LOGIN_STORE_KEY),
    window.api.storeGet(LEGACY_LOGIN_KEY)
  ])
    .then(([savedAddresses, active, savedMap, legacy]) => {
      addresses.value = normalizeList(savedAddresses);
      addressMode.value = addresses.value.length ? 'select' : 'new';
      const activeValue = typeof active === 'string' ? active.trim() : '';
      const mapValue = savedMap && typeof savedMap === 'object' ? savedMap : {};
      loginByDomain.value = mapValue;
      const legacyValue = legacy && typeof legacy === 'object' ? legacy : null;
      if (activeValue) {
        form.value.url = activeValue;
        addressInput.value = activeValue;
      }
      if (!form.value.url) {
        form.value.url = 'https://yj3dev-admin.asiic.cn/';
      }
      const origin = normalizeOrigin(form.value.url);
      if (origin) {
        lastLoginOrigin.value = origin;
        const legacyPayload = legacyValue
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
          const nextMap = { ...loginByDomain.value, [origin]: legacyPayload };
          loginByDomain.value = nextMap;
          window.api.storeSet(LOGIN_STORE_KEY, nextMap).catch((error) => {
            console.error('[store] migrate login failed', error);
          });
        }
        if (!applied && !legacyPayload) {
          form.value.username = '';
          form.value.password = '';
        }
      }
    })
    .catch((error) => {
      console.error('[store] load failed', error);
      addressStatus.value = '读取本地数据失败。';
    });
});

onBeforeUnmount(() => {
  if (captchaTimer) clearTimeout(captchaTimer);
  lastLoginOrigin.value = '';
});
</script>
