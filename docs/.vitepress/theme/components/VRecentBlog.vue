<script setup lang="ts">
import { data, type Post } from '../utils/blog.data'

const recentBlogs = [] as Post[]
let cnt = 0
const allYears = Object.keys(data).reverse()
for (const year of allYears) {
  for (const post of data[year]!) {
    if (cnt++ < 5) {
      recentBlogs.push(post)
    }
  }
}

const allTags = {} as Record<string, Post[]>
for (const key in data) {
  if (!data[key]) {
    continue
  }
  for(const post of data[key]!) {
    post.tags.forEach(t => {
      allTags[t] ??= []
      allTags[t]!.push(post)
    })
  }
}

</script>

<template>
  <div>
    <ul>
      <li v-for="post of recentBlogs" :key="post.url">
        <article>
          <a style="margin-right: 4px;" :href="post.url" class="border-none">
            {{ post.date }}&nbsp;&nbsp;

            {{ post.title }}
          </a>
          
          <a class="blog-tag" style="border-bottom: none;" v-for="tag in post.tags" :key="tag" :href="`/blog?tag=${encodeURIComponent(tag)}`">{{ tag }}</a>
        </article>
      </li>
      <li><a href="/blog">View all {{ cnt }} blogs</a></li>
    </ul>
  </div>
  <h2>All Tags 🍁 </h2>
  <div style="display: flex;justify-content: left;flex-wrap: wrap;">
    <a class="blog-tag" v-for="_, tag in allTags" :key="tag" :href="`/blog?tag=${encodeURIComponent(tag)}`">{{ tag }}</a>
  </div>

</template>
