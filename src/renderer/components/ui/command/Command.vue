<script setup>
import { computed, provide, reactive, ref } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps({
  class: {
    type: String,
    default: ''
  }
});

const query = ref('');
const items = reactive(new Map());

const setItemVisibility = (id, visible) => {
  items.set(id, visible);
};

const removeItem = (id) => {
  items.delete(id);
};

const visibleCount = computed(() => {
  let count = 0;
  for (const visible of items.values()) {
    if (visible) count += 1;
  }
  return count;
});

provide('commandContext', {
  query,
  setItemVisibility,
  removeItem,
  visibleCount
});
</script>

<template>
  <div
    :class="cn('flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground', props.class)"
    v-bind="$attrs"
  >
    <slot />
  </div>
</template>
