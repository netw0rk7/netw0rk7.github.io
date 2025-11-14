import { defineConfig } from 'astro/config'
import icon from "astro-icon";

export default defineConfig({
  site: 'https://netw0rk7.github.io',
  integrations: [
    tailwind({
      nesting: true,
    }),
    swup({
      theme: false,
      animationClass: "transition-swup-",
      containers: ["main", "#toc"],
      smoothScrolling: true,
      cache: true,
      preload: true,
      accessibility: true,
      updateHead: true,
      updateBodyClass: false,
      globalInstance: true,
    }),

    // 👇 เพิ่ม block นี้เข้าไป
    icon({
      include: {
        "fa6-brands": ["*"],
        "fa6-regular": ["*"],
        "fa6-solid": ["*"],
      },
    }),

    svelte(),
    sitemap(),
    // ถ้ามี astro-expressive-code หรือ plugin อื่นให้ปล่อยไว้เหมือนเดิม
    // expressiveCode({...}),
  ],
})
