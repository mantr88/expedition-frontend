import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationsStore = defineStore('notifications', () => {
  const permission = ref<NotificationPermission>('default')

  function init() {
    if ('Notification' in window) {
      permission.value = Notification.permission
    }
  }

  async function requestPermission() {
    if (!('Notification' in window)) return false
    
    if (permission.value === 'default') {
      const result = await Notification.requestPermission()
      permission.value = result
    }
    
    return permission.value === 'granted'
  }

  function showNotification(title: string, options?: NotificationOptions) {
    if (permission.value === 'granted' && 'Notification' in window) {
      // Show notification only if page is not visible, or forced
      if (document.hidden) {
        new Notification(title, options)
      }
    }
  }

  return {
    permission,
    init,
    requestPermission,
    showNotification
  }
})
