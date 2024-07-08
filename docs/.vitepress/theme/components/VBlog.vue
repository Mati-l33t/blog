<script setup lang="ts">
import { Icon } from '@iconify/vue'

import { data as groupedPosts, type Post } from '../utils/blog.data'

const allTags = {} as Record<string, Post[]>
for (const key in groupedPosts) {
  if (!groupedPosts[key]) {
    continue
  }
  for(const post of groupedPosts[key]) {
    post.tags.forEach(t => {
      allTags[t] ??= []
      allTags[t].push(post)
    })
  }
}

const formatDate = (raw: string): string => {
  const date = new Date(raw)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div>
    <section>
      <h1 class="flex items-center gap-2">
        Joey Yang's blogs
        <Icon class="inline text-[--vp-c-brand-1]" aria-hidden="true" icon="tabler:book-2" />
      </h1>
    </section>
    <template v-for="year in Object.keys(groupedPosts).reverse()" :key="year">
      <h2>{{ year }}</h2>
      <ul>
        <li v-for="post of groupedPosts[year]" :key="post.url">
          <article>
            <a :href="post.url" class="border-none">{{ post.title }}</a> -
            <dl class="m-0 inline">
              <dt class="sr-only">Published on</dt>
              <dd class="m-0 inline">
                <time :datetime="post.date">{{ formatDate(post.date) }}</time>
              </dd>
            </dl>
          </article>
        </li>
      </ul>
    </template>
  </div>
</template>
