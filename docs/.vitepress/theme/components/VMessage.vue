<script setup lang="ts">

import { data as groupedPosts } from '../utils/blog.data'

const allTags = {} as Record<string, number>
for (const key in groupedPosts) {
  if (!groupedPosts[key]) {
    continue
  }
  for(const post of groupedPosts[key]) {
    post.tags.forEach(t => {
      allTags[t] ??= 0
      allTags[t]++
    })
  }
}

function filterTag(tag: string) {
  if(location.href.startsWith('/blog')) {
    setTimeout(() => {
      location.reload()
    }, 20)
  } 
  location.href = `/blog?tag=${encodeURIComponent(tag)}`
}

</script>

<template>
  <section class="mt-3 pl-4 text-[14px]/7">
    <div class="font-bold" role="heading" aria-level="2">All Tags</div>
    <address class="flex flex-col text-[--vp-c-text-2]">
      <a
        v-for="(item, val) in allTags"
        :key="item"
        class="flex items-center gap-1.5 hover:text-[--vp-c-text-1] cursor-pointer"
        @click="filterTag(val)"
      >
        {{ val }} ({{ item }})
      </a>
    </address>
  </section>
</template>
