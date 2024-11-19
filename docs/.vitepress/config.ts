import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'
import { renderSandbox } from 'vitepress-plugin-sandpack'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import container from 'markdown-it-container'
import { feed } from './theme/utils/feed-rss'

export default defineConfig({
  lang: 'en-US',
  title: 'Code2Life - 全栈开发|云原生|软件设计|管理思考',
  description: 'Joey Yang (Code2Life)\'s blog site',
  lastUpdated: false,
  cleanUrls: true,
  appearance: false,
  markdown: {
    lineNumbers: true,
    config(md) {
      md.use(container, 'sandbox', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render(tokens: any, idx: any) {
          return renderSandbox(tokens, idx, 'sandbox')
        }
      })
    }
  },
  buildEnd: feed,
  sitemap: {
    hostname: 'https://code2life.top',
  },
  rewrites: {
    "blog/0047-raspberrypi.md": "2020/01/06/0047-raspberrypi/index.md",
    ':blog/:num.:title.md': ':blog/:title.md',
  },
  vite: {
    
    optimizeDeps: {
      include: ["@videojs-player/vue"],
    },
    
    resolve: {
      alias: [
        {
          find: /^.*\/VPFooter\.vue$/,
          replacement: fileURLToPath(new URL('./theme/components/VFooter.vue', import.meta.url)),
        },
      ],
    },
  },
  head: [
    // https://html.spec.whatwg.org/multipage/semantics.html#meta-theme-color
    ['meta', { name: 'theme-color', content: '#13212e' }],
    // https://html.spec.whatwg.org/multipage/semantics.html#meta-color-scheme
    ['meta', { name: 'color-scheme', content: 'light' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    [
      "script",
      { async: "true", src: "https://www.googletagmanager.com/gtag/js?id=G-EJM3ZBHLCH" },
    ],
    [
      "script",
      {},
      `window.dataLayer = window.dataLayer || [];
       function gtag(){dataLayer.push(arguments);}
       gtag('js', new Date());
       gtag('config', 'G-EJM3ZBHLCH');`
    ]
  ],
  themeConfig: {
    logo: '/logo.png',
    siteTitle: false,
    outline: {
      level: [2, 3],
      label: 'Table of Contents',
    },
    search: {
      provider: 'local',
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Blogs', link: '/blog', activeMatch: '/blog/?' },
      { text: 'Projects', link: '/projects' }
    ],
    socialLinks: [
      {
        icon: {
          svg: `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="32" height="32" viewBox="0 0 24 24">
                  <title>Github</title>
                  <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2c2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2a4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6c-.6.6-.6 1.2-.5 2V21"/>
                </svg>`,
        },
        link: 'https://github.com/code2life',
        ariaLabel: 'GitHub',
      },
      {
        icon: {
          svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path fill="currentColor" d="M216 24H40a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V40a16 16 0 0 0-16-16m0 192H40V40h176zM96 112v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m88 28v36a8 8 0 0 1-16 0v-36a20 20 0 0 0-40 0v36a8 8 0 0 1-16 0v-64a8 8 0 0 1 15.79-1.78A36 36 0 0 1 184 140m-84-56a12 12 0 1 1-12-12a12 12 0 0 1 12 12"/></svg>`,
        },
        link: 'https://www.linkedin.com/in/joey-yang-023448244/',
        ariaLabel: 'Linkedin',
      },
      {
        icon: {
          svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m3 7l9 6l9-6"/></g></svg>`,
        },
        link: 'mailto:code2life@ustc.edu',
        ariaLabel: 'Mail',
      },
      {
        icon: {
          svg: `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="32" height="32" viewBox="0 0 24 24">
                  <title>RSS Feed</title>
                  <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 19a1 1 0 1 0 2 0a1 1 0 1 0-2 0M4 4a16 16 0 0 1 16 16M4 11a9 9 0 0 1 9 9"/>
                </svg>`,
        },
        link: '/feed.xml',
        ariaLabel: 'RSS Feed',
      }
    ],
  },
})
