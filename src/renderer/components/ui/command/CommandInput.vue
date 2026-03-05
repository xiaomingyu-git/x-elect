<script setup>
import { computed, inject } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps({
  class: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  }
});

const ctx = inject('commandContext', null);

const model = computed({
  get: () => ctx?.query.value ?? '',
  set: (value) => {
    if (ctx) ctx.query.value = value;
  }
});
</script>

<template>
  <div class="flex items-center border-b px-3">
    <input
      v-model="model"
      :placeholder="placeholder"
      :class="cn(
        'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        props.class
      )"
    />
  </div>
</template>
