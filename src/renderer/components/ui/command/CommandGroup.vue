<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  heading: {
    type: String,
    default: ''
  },
  class: {
    type: String,
    default: ''
  }
});
</script>

<template>
  <div :class="cn('overflow-hidden p-1 text-foreground', props.class)">
    <div v-if="heading" class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
      {{ heading }}
    </div>
    <div class="grid gap-1">
      <slot />
    </div>
  </div>
</template>
