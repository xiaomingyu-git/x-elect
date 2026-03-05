<script setup>
import { TabsList } from 'radix-vue';
</script>

<template>
  <TabsList v-bind="$attrs">
    <slot />
  </TabsList>
</template>
