<script setup>
import { computed, inject } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps({
  class: {
    type: String,
    default: ''
  }
});

const ctx = inject('commandContext', null);

const isEmpty = computed(() => {
  return (ctx?.visibleCount.value ?? 0) === 0;
});
</script>

<template>
  <div v-if="isEmpty" :class="cn('py-6 text-center text-sm text-muted-foreground', props.class)">
    <slot />
  </div>
</template>
