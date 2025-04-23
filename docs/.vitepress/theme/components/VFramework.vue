<script setup lang="ts">
import { Icon } from '@iconify/vue'

const items = [
  { title: 'Proxmox VE', link: 'https://www.proxmox.com', icon: 'simple-icons:proxmox' },
  { title: 'Vitepress', link: 'https://vitepress.dev', icon: 'simple-icons:vitepress' },
  { title: 'pfSense®', link: 'https://www.pfsense.org/', icon: 'simple-icons:pfsense' },
  { title: 'Openmediavault', link: 'https://www.openmediavault.org', icon: 'simple-icons:openmediavault' },
  { title: 'Truenas', link: 'https://www.truenas.com/', icon: 'simple-icons:truenas' },
]
</script>

<template>
  <div class="flex flex-wrap items-center justify-center gap-4">
    <a
      v-for="item of items"
      :key="item.link"
      :href="item.link"
      :title="item.title"
      target="_blank"
      class="border-none"
    >
      <Icon
        :icon="item.icon"
        :width="item.title === 'Golang' ? '3.5em' : '2em'"
        :height="item.title === 'Golang' ? '3.5em' : '2em'"
        aria-hidden="true"
      />
      <span class="sr-only">{{ item.title }}</span>
    </a>
  </div>
</template>
