<script setup>
import { TabsTrigger } from 'radix-vue';
</script>

<template>
  <TabsTrigger v-bind="$attrs">
    <slot />
  </TabsTrigger>
</template>
