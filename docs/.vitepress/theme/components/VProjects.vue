<script setup lang="ts">
import { Icon } from '@iconify/vue'

import Framework from './VFramework.vue';

const items = [
  {
    tag: 'Open Source',
    list: [
      {
        title: "Tensor Fusion",
        date: "2024-present",
        highlights: "Under construction. The AI infra powered by AI",
        description: "Made the lightweight dynamic config solution for Spring Boot apps. Supported all Spring Boot versions above 2.x. Can be used along with Kubernetes ConfigMap or standalone way",
        github: 'https://github.com/NexusGPU',
        techStacks: ["rust", "cpp", "kubernetes", "golang", "typescript"],
        details: [],
        source: {
          url: "https://github.com/NexusGPU",
          text: "Github - Tensor Fusion"
        },
      },
      {
        title: "Spring Boot Dynamic Config",
        date: "2021",
        highlights: "200+ stars, running in production stably for years",
        description: "Made the lightweight dynamic config solution for Spring Boot apps. Supported all Spring Boot versions above 2.x. Can be used along with Kubernetes ConfigMap or standalone way",
        github: 'https://github.com/code2life/spring-boot-dynamic-config',
        techStacks: ["java", "kubernetes"],
        details: [],
        source: {
          url: "https://github.com/code2life/spring-boot-dynamic-config",
          text: "Github - code2life/spring-boot-dynamic-config"
        },
      },
    ],
  },
  {
    tag: 'Work at Zoom',
    list: [
    {
        title: 'CD & Internal Developer Platform',
        date: "2022-2024",
        highlights: "Founder, leader, PM, architect. Significantly increased DevEX and operation efficiency throughout the organization.",
        description: 'Built the Continuous Deployment and Internal Developer Platform at Zoom. Adopted by more than 90% of services, played the major role in platform engineering and containerization.',
        techStacks: ["typescript", "golang", "rust", "react", "java"],
        details: [
          "As team leader & PM & UX designer, drove the overall PaaS development lifecycle, coordinated cross-functional teams from 6 timezones, wrote PRD and UX prototypes",
          "Designed and implemented the core GitOps CD engine, used by 500+ applications and components",
          "Designed and implemented the core workflow engine based on temporal.io, supported 7k+ DevOps workflow executions weekly",
          "Hosted a dozen of English/Chinese knowledge sharing sessions, facilitated the DevOps pattern shift throughout the organization"
        ]
      },
      {
        title: 'Microservice Framework',
        date: "2019-2021",
        highlights: "Co-founder, architect. The framework has been adopted by 90+ new services.",
        description: 'Built micro-service development framework based on Spring Boot, Spring Cloud and existing internal SDKs and middlewares, split the monolithic to resolve development efficiency problems.',
        details: [
          "Extracted and refactored the calendar integration service from the monolithic service, which is a critical service serving 2000+ requests per second",
          "Created a heterogeneous data comparing and reconciling tool to resolve data inconsistency issues during micro-service migration",
          "Made a boilerplate generator and doc site for the new framework, spread the framework to 90+ new services",
          "Built end-to-end microservice monitor and operation solution with Kubernetes, Prometheus, Helm etc.",
        ],
        techStacks: ["java", "golang", "kubernetes"],
      },
      {
        title: 'Cloud Room Connector',
        date: "2018-2019",
        highlights: "MVP winner, firefighter, SRE. Resolved a dozen of stability problems.",
        description: 'The device provisioning and interoperability module of Zoom Room Connector product. It manages Cisco/Poly and other vendors\' devices, connect them with Zoom meetings',
        details: [
        "Fixed 13+ stability problems and high-concurrency bottlenecks to support rapidly business growth",
        "Maintained and expanded to over 6 types of device interoperability by diving into low-level device firmware, node.js/C++/lua codes, SIP and Websocket protocols"
        ],
        techStacks: ["node.js", "rx.js", "vue", "typescript"],
        source: {
          url: 'https://www.zoom.com/en/products/meeting-rooms/features/room-connector/',
          text: 'ZOOM Room Connector'
        },
      },
    ],
  },
]
</script>

<template>
  <div>
    <h1 class="flex items-center gap-2">
      Projects
      <Icon class="inline text-[--vp-c-brand-1]" aria-hidden="true" icon="tabler:target-arrow" />
    </h1>
    <template v-for="item of items" :key="item.tag">
      <h2 class="">{{ item.tag }}</h2>
      <template v-for="project of item.list" :key="project.title">
        <div class="flex gap-4">
          <h3 class="flex gap-2 mt-3">
          {{ project.title }}
          </h3>
          <Framework :tech-stacks="project.techStacks"></Framework>
          <span class="text-sm self-end mb-1">[{{ project.date }}]</span>
        </div>
        
        <p :class="project.source ? 'mb-2' : 'mb-10'">
          <b>{{ project.highlights }}</b>
          <br />
          {{ project.description }}
          <ul>
            <li v-for="(detail, index) of project.details" :key="index">
              {{ detail }}
            </li>
          </ul>
        </p>
        <a v-if="project.source" :href="project.source.url" class="mt-1 mb-10 flex items-center gap-2 border-none">
          <Icon aria-hidden="true" icon="tabler:link" />
          {{ project.source.text }}
        </a>
      </template>
    </template>
  </div>
</template>
