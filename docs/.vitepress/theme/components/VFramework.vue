<script setup lang="ts">
import { Icon } from '@iconify/vue'

const props = defineProps<{
  techStacks: string[]
}>()

const itemsMap = {
  "figma": { title: 'Figma', link: 'https://figma.com', icon: 'ph:figma-logo' },
  "vue": { title: 'Vue', link: 'https://vuejs.org', icon: 'simple-icons:vuedotjs' },
  "react": { title: 'React', link: 'https://react.dev', icon: 'simple-icons:react' },

  "typescript": { title: 'TypeScript', link: 'https://www.typescriptlang.org', icon: 'simple-icons:typescript' },
  "golang": { title: 'Golang', link: 'https://go.dev', icon: 'skill-icons:golang' },
  "java": { title: 'Java', link: 'https://www.java.com/en/', icon: 'ri:java-line' },
  "kubernetes": { title: 'Kubernetes', link: 'https://kubernetes.io', icon: 'devicon-plain:kubernetes' },

  "node.js": { title: 'Node.js', link: 'https://nodejs.org/', icon: 'ri:nodejs-line' },
  "rx.js": { title: 'Rx.js', link: 'https://rxjs.dev/', icon: 'devicon-plain:rxjs' },
  "rust": { title: "Rust", link: "https://www.rust-lang.org/", icon: "logos:rust"},
  "cpp": { title: "Rust", link: "https://isocpp.org/", icon: "skill-icons:cpp"}
} as Record<string, { title: string, link: string, icon: string }>
</script>

<template>
  <div class="flex flex-wrap items-center self-end mb-1 gap-2">
    <a
      v-for="item of props.techStacks"
      :key="itemsMap[item]?.link!"
      :href="itemsMap[item]?.link!"
      :title="itemsMap[item]?.title!"
      target="_blank"
      class="border-none"
    >
      <Icon
        :icon="itemsMap[item]?.icon!"
        :width="itemsMap[item]?.title === 'Golang' ? '1.3em' : '1.3em'"
        :height="itemsMap[item]?.title === 'Golang' ? '1.3em' : '1.3em'"
        aria-hidden="true"
      />
      <span class="sr-only">{{ itemsMap[item]?.title }}</span>
    </a>
  </div>
</template>
