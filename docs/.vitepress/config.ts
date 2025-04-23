import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'
import { renderSandbox } from 'vitepress-plugin-sandpack'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import container from 'markdown-it-container'
import { feed } from './theme/utils/feed-rss'

export default defineConfig({
  lang: 'en-US',
  title: 'Proxmox-Scripts',
  description: 'Scripts for Simplifying your HomeLab.',
  lastUpdated: false,
  cleanUrls: true,
  appearance: 'force-dark',
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
    hostname: 'https://proxmox-scripts.com',
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
    ['meta', { name: 'color-scheme', content: 'light dark' }],
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
    logo: '/logo.gif',
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
      { text: 'Scripts', link: '/blog', activeMatch: '/blog/?' },
    ],
    socialLinks: [
      {
        icon: {
          svg: `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="32" height="32" viewBox="0 0 24 24">
                  <title>Github</title>
                  <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2c2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2a4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6c-.6.6-.6 1.2-.5 2V21"/>
                </svg>`,
        },
        link: 'https://github.com/Mati-l33t',
        ariaLabel: 'GitHub',
      },     
      {
        icon: {
          svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m3 7l9 6l9-6"/></g></svg>`,
        },
        link: 'mailto:info@proxmox-scripts.com',
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
