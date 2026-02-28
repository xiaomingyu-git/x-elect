<template>
  <main class="page">
    <header class="header">
      <div>
        <p class="eyebrow">Server Registry</p>
        <h1 class="title">服务器地址管理</h1>
        <p class="subtitle">输入服务器地址并添加到本地列表中。</p>
      </div>
      <button class="button ghost" type="button" @click="toggleTheme">
        Theme: {{ themeLabel }}
      </button>
    </header>

    <section class="card">
      <form class="form" @submit.prevent="handleAdd">
        <label class="field">
          <span class="label">服务器地址</span>
          <div class="input-row">
            <input
              v-model.trim="addressInput"
              class="input"
              type="text"
              placeholder="https://example.com"
              autocomplete="url"
              required
            />
            <button class="button primary" type="submit">添加</button>
          </div>
          <span class="hint">示例：https://yj3dev-admin.asiic.cn/</span>
        </label>
      </form>

      <div class="card-divider"></div>

      <div class="table-head">
        <div>
          <h2 class="table-title">已保存的服务器地址</h2>
          <p class="table-subtitle">本地持久化保存，重启后仍可使用。</p>
        </div>
        <span class="table-count">{{ addresses.length }} 条</span>
      </div>

      <div v-if="addresses.length" class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th class="col-index">序号</th>
              <th>服务器地址</th>
              <th class="col-action">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in addresses" :key="`${item}-${index}`">
              <td class="col-index">{{ index + 1 }}</td>
              <td class="col-value">{{ item }}</td>
              <td class="col-action">
                <div class="action-group">
                  <button class="button secondary small" type="button" @click="handleSelect(item)">
                    进入
                  </button>
                  <button class="button danger small" type="button" @click="handleRemove(index)">
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty">暂无数据，请先添加一个服务器地址。</div>

      <div class="log" v-if="status">
        <span class="log-label">操作日志</span>
        <p class="status">{{ status }}</p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

const theme = ref('light');
const status = ref('');
const addressInput = ref('');
const addresses = ref([]);

const themeLabel = computed(() => (theme.value === 'light' ? 'Light' : 'Dark'));

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

const persistAddresses = async () => {
  if (!window.api?.storeSet) {
    status.value = '本地存储未就绪，无法保存。';
    return false;
  }
  try {
    const payload = normalizeList(addresses.value);
    await window.api.storeSet('serverAddresses', payload);
    return true;
  } catch (error) {
    console.error('[store] save failed', error);
    status.value = '保存失败，请稍后重试。';
    return false;
  }
};

const handleAdd = async () => {
  const value = addressInput.value.trim();
  status.value = '';
  if (!value) {
    status.value = '请输入服务器地址。';
    return;
  }

  if (addresses.value.includes(value)) {
    status.value = '该服务器地址已存在。';
    return;
  }

  addresses.value = [value, ...addresses.value];
  const saved = await persistAddresses();
  if (saved) {
    status.value = '已添加。';
    addressInput.value = '';
  }
};

const handleRemove = async (index) => {
  if (index < 0 || index >= addresses.value.length) return;
  const next = addresses.value.slice();
  next.splice(index, 1);
  addresses.value = next;
  const saved = await persistAddresses();
  if (saved) {
    status.value = '已删除。';
  }
};

const handleSelect = async (value) => {
  const nextValue = typeof value === 'string' ? value.trim() : '';
  if (!nextValue) return;
  status.value = '正在进入登录页...';
  if (window.api?.storeSet) {
    try {
      await window.api.storeSet('activeServerAddress', nextValue);
    } catch (error) {
      console.error('[store] save active address failed', error);
      status.value = '保存选择失败，请稍后重试。';
      return;
    }
  }
  const loginUrl = new URL('../login/index.html', window.location.href).toString();
  window.location.href = loginUrl;
};

onMounted(() => {
  applyTheme();
  if (!window.api?.storeGet) return;
  window.api
    .storeGet('serverAddresses')
    .then((saved) => {
      addresses.value = normalizeList(saved);
    })
    .catch((error) => {
      console.error('[store] load failed', error);
      status.value = '读取本地数据失败。';
    });
});
</script>
