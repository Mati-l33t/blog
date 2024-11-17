---
layout: doc
title: Home
aside: false
outline: false
comments: false
progress: false
---

<script setup lang="ts">
import Framework from '.vitepress/theme/components/VFramework.vue';
import LandingPageBlog from '.vitepress/theme/components/VLandingPageBlog.vue'
</script>

<h2 style="padding-top: 0px;margin: 0px 0 16px;border-top: none;">About Me 👨‍💻</h2>

Hey there, I'm Joey Yang, a full-stack engineer, lifelong learner, NJU & USTC graduate, currently working at ZOOM as a manager & architect & product engineer.

My career goal is to build awesome SaaS products that can help people in scalable way.

In the real world, I'm living in China, plan to be a global citizen. In my leisure time, I enjoy reading all kinds of books, playing badminton and table tennis.

<h2>Recent Posts 📙</h2>
<LandingPageBlog sort="recent" />

<h2>Hot Posts 🔥</h2>
<LandingPageBlog sort="hot" appendTag="true" />
