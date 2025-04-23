<script setup lang="ts">
import { Icon } from '@iconify/vue'

// prettier-ignore
const items = [
  { name: 'github',message: 'Mati-l33t', link: 'https://github.com/Mati-l33t', icon: 'tabler:brand-github' },
  { name: 'email',message: 'info@proxmox-scripts.com', link: 'mailto:info@proxmox-scripts.com', icon: 'tabler:mail' },
]
</script>

<template>
  <div class="flex flex-wrap items-center justify-center gap-4">
    <a
      v-for="item of items"
      :key="item.link"
      :href="item.link"
      target="_blank"
      class="flex items-center gap-1 italic"
    >
      <Icon aria-hidden="true" :icon="item.icon" />
      <span class="sr-only">{{ item.name }}</span>
      {{ item.message }}
    </a>
  </div>
</template>
