<script setup>
import { PopoverRoot } from 'radix-vue';
</script>

<template>
  <PopoverRoot v-bind="$attrs">
    <slot />
  </PopoverRoot>
</template>
