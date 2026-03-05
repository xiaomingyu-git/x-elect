<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  class: {
    type: String,
    default: ''
  }
});
</script>

<template>
  <div :class="cn('max-h-60 overflow-y-auto overflow-x-hidden', props.class)">
    <slot />
  </div>
</template>
