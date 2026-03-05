<script setup>
import { PopoverTrigger } from 'radix-vue';
</script>

<template>
  <PopoverTrigger v-bind="$attrs">
    <slot />
  </PopoverTrigger>
</template>
