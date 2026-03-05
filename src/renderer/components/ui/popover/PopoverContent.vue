<script setup>
import { PopoverContent, PopoverPortal } from 'radix-vue';
import { cn } from '@/lib/utils';

const props = defineProps({
  class: {
    type: String,
    default: ''
  },
  align: {
    type: String,
    default: 'center'
  },
  sideOffset: {
    type: Number,
    default: 4
  }
});
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      :align="align"
      :side-offset="sideOffset"
      :class="cn(
        'z-50 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none',
        props.class
      )"
      v-bind="$attrs"
    >
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>
