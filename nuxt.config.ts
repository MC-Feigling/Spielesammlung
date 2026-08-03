import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  components: [
    { path: '~/components', pathPrefix: false },
    { path: '~/features', pathPrefix: false, extensions: ['vue'] },
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      holdUntilCrawlEnd: true,
    },
  },
})