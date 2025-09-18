<script setup lang="ts">
import { computed } from 'vue'
import { store, switchToThread } from '../store'
import type { ChatThread } from '../types'

const threads = computed(() => store.threads)
const activeThreadId = computed(() => store.activeThreadId)

function selectThread(thread: ChatThread) {
  switchToThread(thread.id)
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return ''
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return new Date(timestamp).toLocaleDateString()
}
</script>

  <template>
    <div class="h-full bg-zinc-50 border-r border-zinc-200 flex flex-col dark:bg-zinc-800 dark:border-zinc-700">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-zinc-200 bg-white dark:bg-zinc-800 dark:border-zinc-700">
        <h2 class="font-semibold text-zinc-900 dark:text-zinc-100" style="font-family: 'Cera Pro', sans-serif">Services</h2>
        <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1" style="font-family: 'Cera Pro', sans-serif">Chat with Gullie about specific topics</p>
      </div>

    <!-- Thread List -->
    <div class="flex-1 overflow-y-auto">
        <div v-for="thread in threads" :key="thread.id"
             class="flex items-center p-3 hover:bg-zinc-100 cursor-pointer border-b border-zinc-100 transition-colors dark:hover:bg-zinc-700 dark:border-zinc-700"
             :class="{ 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700': thread.id === activeThreadId }"
             @click="selectThread(thread)">
        
        <!-- Avatar -->
        <div class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg mr-3"
             :style="{ backgroundColor: thread.color + '20', color: thread.color }">
          {{ thread.avatar }}
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h3 class="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate"
                  style="font-family: 'Cera Pro', sans-serif"
                  :class="{ 'text-orange-700 dark:text-orange-300': thread.id === activeThreadId }">
                {{ thread.title }}
              </h3>
              <div class="flex items-center gap-1">
                <span v-if="thread.lastMessageTime"
                      class="text-xs text-zinc-500 dark:text-zinc-400"
                      style="font-family: 'Cera Pro', sans-serif">
                  {{ formatTime(thread.lastMessageTime) }}
                </span>
                <div v-if="thread.unreadCount > 0"
                     class="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-1"
                   style="font-family: 'Cera Pro', sans-serif">
                {{ thread.unreadCount > 9 ? '9+' : thread.unreadCount }}
              </div>
            </div>
          </div>
            <p v-if="thread.lastMessage"
               class="text-xs text-zinc-600 dark:text-zinc-300 truncate mt-1"
               style="font-family: 'Cera Pro', sans-serif"
               :class="{ 'text-orange-600 dark:text-orange-300': thread.id === activeThreadId }">
              {{ thread.lastMessage }}
            </p>
            <p v-else
               class="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-1"
               style="font-family: 'Cera Pro', sans-serif">
              Start a conversation...
            </p>
        </div>
      </div>
    </div>

    <!-- Footer with new thread button -->
      <div class="border-t border-zinc-200 p-3 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <button class="w-full text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-medium py-2"
                style="font-family: 'Cera Pro', sans-serif"
                @click="$emit('create-thread')">
          + Start New Service Chat
        </button>
      </div>
    </div>
  </template>

