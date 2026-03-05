<script setup>
import { computed, inject, onBeforeUnmount, watchEffect } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps({
  value: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  class: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['select']);
const ctx = inject('commandContext', null);
const id = Symbol('command-item');

const matches = computed(() => {
  const query = ctx?.query.value?.toLowerCase() || '';
  if (!query) return true;
  return (props.value || '').toLowerCase().includes(query);
});

watchEffect(() => {
  if (ctx) ctx.setItemVisibility(id, matches.value);
});

onBeforeUnmount(() => {
  if (ctx) ctx.removeItem(id);
});

const handleSelect = () => {
  if (props.disabled) return;
  emit('select', { detail: { value: props.value } });
};
</script>

<template>
  <div
    v-show="matches"
    role="option"
    :aria-disabled="disabled || undefined"
    :class="cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition hover:bg-accent hover:text-accent-foreground',
      disabled ? 'pointer-events-none opacity-50' : '',
      props.class
    )"
    @click="handleSelect"
  >
    <slot />
  </div>
</template>
