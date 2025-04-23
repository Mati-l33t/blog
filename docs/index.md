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
import Contact  from '.vitepress/theme/components/VContact.vue';
</script>

<h1 align="center">Proxmox VE Scripts</h1>
<h6 align="center">Streamlining your HomeLab</h6>

These scripts empower users to create a Linux container or virtual machine interactively, providing choices for both simple and advanced configurations. The basic setup adheres to default settings, while the advanced setup gives users the ability to customize these defaults.


Options are displayed to users in a dialog box format. Once the user makes their selections, the script collects and validates their input to generate the final configuration for the container or virtual machine.


<h6 align="center">Currently, I'm particularly interested in the following</h6>

<Framework />

<Contact />

<h2>Recent Posts 📙</h2>
<LandingPageBlog sort="recent" />

<h2>Hot Posts 🔥</h2>
<LandingPageBlog sort="hot" appendTag="true" />
