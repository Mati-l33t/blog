<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { data, type Post } from '../utils/blog.data'
import { useRouter } from "vitepress"

const router = useRouter()
const tagFilter = new URL(window.location.href).searchParams.get("tag")
const groupedPosts = {} as Record<string, Post[]>
for(const year in data) {
  const filtered = data[year]?.filter(p => !tagFilter || p.tags.includes(tagFilter))
  if (filtered && filtered.length > 0) {
    groupedPosts[year] = filtered
  }
}
const allYears = Object.keys(groupedPosts).reverse()

const formatDate = (raw: string): string => {
  const date = new Date(raw)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
  })
}

function filterTag(tag?: string) {
  if (!tag) {
    router.go(`/blog`)  
  } else {
    router.go(`/blog?tag=${encodeURIComponent(tag)}`)
  }
  setTimeout(() => {
    location.reload()
  }, 20)
  
}

</script>

<template>
  <div>
    <section>
      <h1 class="flex items-center gap-2">
        Proxmox VE Scripts
        <Icon class="inline text-[--vp-c-brand-1]" aria-hidden="true" icon="tabler:activity" />
      </h1>
      <p>Scripts for Simplifying your HomeLab.</p>
    </section>
    <div v-if="tagFilter" class="mt-8">
      <span style="font-weight: 500;">Filtered by Tag:</span> <a class="blog-tag" id="clean-filter" @click="filterTag()">{{ tagFilter }}</a>
    </div>
    
    <template v-for="year in allYears" :key="year">
      <h2>{{ year }}</h2>
      <ul>
        <li v-for="post of groupedPosts[year]" :key="post.url">
          <article>
          <a style="margin-right: 4px;" :href="post.url" class="border-none">
            {{ formatDate(post.date) }}&nbsp;&nbsp;

            {{ post.title }}
          </a>
          
          <a class="blog-tag" style="border-bottom: none;" v-for="tag in post.tags" :key="tag" @click="filterTag(tag)">{{ tag }}</a>
        </article>
        </li>
      </ul>
    </template>
  </div>
</template>

<style lang="css">
#clean-filter:hover::after {
  content: " click to clear filter";
  color: brown;
}
</style>