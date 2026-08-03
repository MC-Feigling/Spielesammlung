<script setup lang="ts">
const settings = useSettingsStore()
const profiles = useProfilesStore()

onMounted(() => {
  settings.hydrate()
  profiles.hydrate()
})

useHead({
  title: 'Spielesammlung',
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap',
    },
  ],
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
