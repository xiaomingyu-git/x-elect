<template>
  <main class="page">
    <header class="header">
      <div>
        <p class="eyebrow">Server Flow</p>
        <h1 class="title">服务器登录</h1>
        <p class="subtitle">先选择服务器地址，再完成账号登录。</p>
      </div>
      <button class="button ghost" type="button" @click="toggleTheme">
        Theme: {{ themeLabel }}
      </button>
    </header>

    <section class="card">
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
        <form class="form" @submit.prevent="handleAddAndContinue">
          <label class="field">
            <span class="label">服务器地址</span>
            <div class="input-row">
              <Popover v-model:open="showSaved">
                <PopoverTrigger as-child>
                  <input
                    v-model.trim="addressInput"
                    class="input"
                    type="text"
                    placeholder="https://example.com"
                    autocomplete="url"
                    required
                    @focus="showSaved = true"
                    @click="showSaved = true"
                  />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  :side-offset="6"
                  class="min-w-[260px] w-[380px] max-w-[calc(100vw-48px)] p-0"
                >
                  <Command>
                    <CommandInput placeholder="搜索已保存地址..." />
                    <CommandList>
                      <CommandEmpty>暂无保存地址</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          v-for="(item, index) in addresses"
                          :key="`${item}-${index}`"
                          :value="item"
                          @select="(ev) => selectSaved(ev.detail.value)"
                        >
                          <div class="flex w-full items-center gap-2">
                            <span class="flex-1 truncate">{{ item }}</span>
                            <CheckIcon
                              class="h-4 w-4 text-primary"
                              :class="addressInput === item ? 'opacity-100' : 'opacity-0'"
                            />
                            <button
                              class="text-destructive hover:opacity-80"
                              type="button"
                              @click.stop="handleRemoveValue(item)"
                            >
                              删除
                            </button>
                          </div>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <button class="button primary" type="submit" :disabled="!canSubmit">
                {{ submitLabel }}
              </button>
            </div>
            <span class="hint">示例：https://yj3dev-admin.asiic.cn/</span>
          </label>
        </form>

        <div class="saved-row">
          <span class="saved-count">已保存 {{ addresses.length }} 条</span>
        </div>

        <div class="log" v-if="addressStatus">
          <span class="log-label">操作日志</span>
          <p class="status">{{ addressStatus }}</p>
        </div>
      </div>

      <div v-else class="step-panel">
        <form class="form" novalidate @submit.prevent="handleLogin">
          <div class="field">
            <span class="label">服务器地址</span>
            <div class="readonly-field">{{ form.url || '未选择服务器地址' }}</div>
          </div>

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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const LOGIN_PUBLIC_KEY =
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCq/tBY/aMASbuVcWmnoBvDUoc2p9tST5vDREeh2sSBydul79UZjxwSldSXyG36ICbmULMqN3Q1gC13ax95QR3DUEGepFJRlfmoxQlwccLOgypmP7HvnoWeTAW/swYWB2aofdve/Ni8bKaD6hyLjg6OOuP06MG76J7644HrbomjBwIDAQAB';
const encryptor = new JSEncrypt();
encryptor.setPublicKey(LOGIN_PUBLIC_KEY);

const step = ref(1);
const theme = ref('light');
const addressStatus = ref('');
const loginStatus = ref('');
const addressInput = ref('');
const addresses = ref([]);
const showSaved = ref(false);

const form = ref({
  url: '',
  username: '',
  password: '',
  verifyCode: '',
  uuid: ''
});
const captchaSrc = ref('');
const captchaStatus = ref('');
let lastCaptchaObjectUrl = '';
let saveTimer;
let captchaTimer;

const themeLabel = computed(() => (theme.value === 'light' ? 'Light' : 'Dark'));
const canSubmit = computed(() => {
  const value = addressInput.value.trim();
  return Boolean(value);
});
const submitLabel = computed(() => {
  const value = addressInput.value.trim();
  if (value && addresses.value.includes(value)) return '下一步';
  return '添加并下一步';
});

const applyTheme = () => {
  document.documentElement.classList.toggle('dark', theme.value === 'dark');
};

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  applyTheme();
};

const normalizeList = (list) =>
  (Array.isArray(list) ? list : [])
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

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

const handleAddAndContinue = async () => {
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
    addressStatus.value = '已添加，进入下一步。';
  } else {
    addressStatus.value = '校验通过，进入下一步。';
  }

  await setActiveAddress(value);
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
  showSaved.value = false;
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

const scheduleSave = () => {
  if (!window.api?.storeSet) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    window.api.storeSet('loginForm', {
      username: form.value.username,
      password: form.value.password
    });
  }, 300);
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
  () => [form.value.username, form.value.password],
  () => {
    scheduleSave();
  }
);

watch(
  () => step.value,
  (nextStep) => {
    if (nextStep === 2 && form.value.url) {
      scheduleCaptcha();
    }
  }
);

onMounted(() => {
  applyTheme();
  if (!window.api?.storeGet) {
    form.value.url = 'https://yj3dev-admin.asiic.cn/';
    return;
  }

  Promise.all([
    window.api.storeGet('serverAddresses'),
    window.api.storeGet('activeServerAddress'),
    window.api.storeGet('loginForm')
  ])
    .then(([savedAddresses, active, savedLogin]) => {
      addresses.value = normalizeList(savedAddresses);
      const activeValue = typeof active === 'string' ? active.trim() : '';
      if (savedLogin && typeof savedLogin === 'object') {
        form.value.username = savedLogin.username || savedLogin.account || '';
        form.value.password = savedLogin.password || '';
      }
      if (activeValue) {
        form.value.url = activeValue;
        addressInput.value = activeValue;
      }
      if (!form.value.url) {
        form.value.url = 'https://yj3dev-admin.asiic.cn/';
      }
    })
    .catch((error) => {
      console.error('[store] load failed', error);
      addressStatus.value = '读取本地数据失败。';
    });
});

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer);
  if (captchaTimer) clearTimeout(captchaTimer);
});
</script>
