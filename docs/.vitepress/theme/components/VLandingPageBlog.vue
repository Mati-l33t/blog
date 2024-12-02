<script setup lang="ts">
import { data, type Post } from '../utils/blog.data'

const props = defineProps<{
  sort: 'recent' | 'hot',
  appendTag?: boolean
}>()

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

const hotBlogs = [{
  title: 'Why Tensor Fusion is the Game Changer in GPU Virtualization? ',
  url: '/blog/0084-why-tensor-fusion-en',
}, {
  title: "树莓派可以用来干什么?",
  url: '/2020/01/06/0047-raspberrypi/',
}, {
  title: '30分钟入门Kubernetes',
  url: '/blog/0072-k8s-in-30-min',
}, {
  title: '工作流引擎Temporal学习笔记 | 使用教程',
  url: '/blog/0070-temporal-notes',
}, {
  title: '软件设计杂谈——云原生12要素',
  url: '/blog/0058-12-factor',
}, {
  title: '软件项目怎么做好技术方案选型?',
  url: '/blog/0073-4-types-of-r-n-d',
}] as Omit<Post, 'date' | 'tags'>[]

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
    <ul v-if="props.sort === 'recent'">
      <li v-for="post of recentBlogs" :key="post.url">
        <article>
          <a style="margin-right: 4px;" :href="post.url" class="border-none">
            {{ post.date }}&nbsp;&nbsp;

            {{ post.title }}
          </a>
          
          <a v-for="tag in post.tags" :key="tag" :href="`/blog?tag=${encodeURIComponent(tag)}`" class="blog-tag" style="border-bottom: none;">{{ tag }}</a>
        </article>
      </li>
      <li><a href="/blog">View all {{ cnt }} blogs</a></li>
    </ul>
    <ul v-if="props.sort === 'hot'">
      <li v-for="post of hotBlogs" :key="post.url">
        <article>
          <a style="margin-right: 4px;" :href="post.url" class="border-none">
            {{ post.title }}
          </a>
        </article>
      </li>
    </ul>
  </div>
  <h2 v-if="props.appendTag">All Tags 🍁 </h2>
  <div v-if="props.appendTag" style="display: flex;justify-content: left;flex-wrap: wrap;" >
    <a v-for="_, tag in allTags" :key="tag" :href="`/blog?tag=${encodeURIComponent(tag)}`" class="blog-tag" >{{ tag }}</a>
  </div>

</template>
