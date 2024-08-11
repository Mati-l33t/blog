<script setup lang="ts">
import { Icon } from '@iconify/vue'

// prettier-ignore
const items = [
  { title: 'GitHub', link: 'https://github.com/code2life', icon: 'tabler:brand-github' },
  { title: 'Linkedin', link: 'https://www.linkedin.com/in/joey-yang-023448244/', icon: 'tabler:brand-linkedin' },
  { title: 'Mail', link: 'mailto:code2life@ustc.edu', icon: 'tabler:mail' },
  { title: 'RSS Feed', link: '/feed.xml', icon: 'tabler:rss' }
]

const generateCopyright = () => {
  const startYear = 2023
  const currentYear = new Date().getFullYear()
  if (currentYear === startYear) {
    return `Copyright © ${startYear}`
  }

  return `Copyright © ${startYear}-${currentYear}`
}
</script>

<template>
  <footer class="z-[--vp-z-index-footer] border-t border-[--vp-c-gutter] px-6 py-8">
    <div class="max-[--vp-layout-max-width] mx-auto text-center">
      <div class="mb-3 flex items-center justify-center gap-4">
        <a
          v-for="item of items"
          :key="item.link"
          :href="item.link"
          :title="item.title"
          target="_blank"
          class="transition duration-300 hover:text-[--vp-c-brand-1]"
        >
          <span class="sr-only">{{ item.title }}</span>
          <Icon :icon="item.icon" width="1.25em" height="1.25em" aria-hidden="true" />
        </a>
      </div>
      <p class="text-sm/6 font-medium text-[--vp-c-text-2]">
        <a
          class="text-[--vp-c-brand-1] transition duration-300 hover:text-[--vp-c-brand-2]"
          href="https://github.com/code2life/joey-blog-site/blob/main/LICENSE-POST"
          target="_blank"
          >CC BY 4.0</a
        >
        |
        <a
          class="text-[--vp-c-brand-1] transition duration-300 hover:text-[--vp-c-brand-2]"
          href="https://github.com/code2life/joey-blog-site/blob/main/LICENSE-CODE"
          target="_blank"
          >MIT License</a
        >
        <span class="block sm:inline">
          <span class="hidden sm:inline"> | </span>
          {{ generateCopyright() }}
          <a
            class="italic text-[--vp-c-brand-1] transition duration-300 hover:text-[--vp-c-brand-2]"
            href="mailto:code2life@ustc.edu"
            target="_blank"
            >Code2Life</a>
        </span>
        &nbsp;&nbsp;
        <a href="https://beian.miit.gov.cn" target="_blank">网站备案编号：皖ICP备18004921号</a>
      </p>
    </div>
  </footer>
</template>
