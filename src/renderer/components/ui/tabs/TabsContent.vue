<script setup>
import { TabsContent } from 'radix-vue';
</script>

<template>
  <TabsContent v-bind="$attrs">
    <slot />
  </TabsContent>
</template>
