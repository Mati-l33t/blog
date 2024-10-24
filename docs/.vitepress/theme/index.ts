import Layout from "./Layout.vue";

import "./custom.css";

import { Theme, useRoute } from "vitepress";
import imageViewer from "vitepress-plugin-image-viewer";
import vImageViewer from "vitepress-plugin-image-viewer/lib/vImageViewer.vue";
import { Sandbox } from "vitepress-plugin-sandpack";
import DefaultTheme from "vitepress/theme-without-fonts";

export default {
  ...DefaultTheme,
  Layout,
  enhanceApp({ app, router, siteData }) {
    DefaultTheme.enhanceApp({ app, router, siteData });
    // eslint-disable-next-line vue/multi-word-component-names
    app.component("Sandbox", Sandbox);
    app.component("VImageViewer", vImageViewer);
  },
  setup() {
    const route = useRoute();
    imageViewer(route);
  },
} satisfies Theme;
