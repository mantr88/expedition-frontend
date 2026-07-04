<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="workspace">
    <aside class="sidebar">
      <p>Канали (найближчим часом)</p>
      <button type="button" @click="handleLogout">Вийти ({{ authStore.user?.name }})</button>
    </aside>
    <main class="channel-area">
      <p>Оберіть канал</p>
    </main>
  </div>
</template>

<style scoped>
.workspace {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

.sidebar {
  border-right: 1px solid #ddd;
  padding: 1rem;
}

.channel-area {
  padding: 1rem;
}
</style>
