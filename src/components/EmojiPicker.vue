<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits<{
  (e: 'select', emoji: string): void
  (e: 'close'): void
}>()

interface EmojiCategory {
  id: string
  name: string
  icon: string
  emojis: string[]
}

const CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Смайли та люди',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘',
      '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🫡', '🤐',
      '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄',
      '😬', '🤥', '🫠', '😌', '😔', '😪', '🤤', '😴',
      '😷', '🤒', '🤕', '🤢', '🤮', '🥴', '😵', '🤯',
      '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟',
      '🙁', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦',
      '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
      '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡',
      '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡',
      '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸',
      '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈',
      '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗',
      '💓', '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡',
      '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯',
      '💢', '💥', '💫', '💦', '💨', '🕳️', '💤', '👋',
      '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴',
      '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘',
      '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵',
      '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌',
      '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳',
      '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃',
    ],
  },
  {
    id: 'animals',
    name: 'Тварини та природа',
    icon: '🐾',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
      '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
      '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤',
      '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
      '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞',
      '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🦂',
      '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐',
      '🦞', '🦀', '🪼', '🐡', '🐠', '🐟', '🐬', '🐳',
      '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🫏', '🦍',
      '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒',
      '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏',
      '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈',
      '🌵', '🎄', '🌲', '🌳', '🌴', '🪵', '🌱', '🌿',
      '☘️', '🍀', '🎍', '🪴', '🎋', '🍃', '🍂', '🍁',
      '🪺', '🪹', '🍄', '🌾', '💐', '🌷', '🌹', '🥀',
      '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜',
    ],
  },
  {
    id: 'food',
    name: 'Їжа та напої',
    icon: '🍕',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇',
      '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥',
      '🥝', '🍅', '🍆', '🥑', '🥦', '🫑', '🥬', '🥒',
      '🌶️', '🫚', '🧄', '🧅', '🥔', '🍠', '🫘', '🥐',
      '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞',
      '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟',
      '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔',
      '🥗', '🥘', '🫕', '🍝', '🍜', '🍲', '🍛', '🍣',
      '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥',
      '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧',
      '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿',
      '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '🫖',
      '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻',
      '🥂', '🍷', '🫗', '🥃', '🍸', '🍹', '🧉', '🍾',
    ],
  },
  {
    id: 'activities',
    name: 'Активності',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
      '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
      '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿',
      '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌',
      '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤸', '🤺', '⛹️',
      '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣',
      '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅',
      '🎖️', '🏵️', '🎗️', '🎪', '🤹', '🎭', '🩰', '🎨',
      '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷',
      '🎺', '🪗', '🎸', '🎻', '🪕', '🎲', '♟️', '🎯',
      '🎳', '🎮', '🎰', '🧩',
    ],
  },
  {
    id: 'travel',
    name: 'Подорожі та місця',
    icon: '✈️',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
      '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️',
      '🛺', '🚲', '🛴', '🚏', '🛣️', '🛤️', '⛽', '🛞',
      '🚨', '🚥', '🚦', '🛑', '🚧', '⚓', '🛟', '⛵',
      '🛶', '🚤', '🛳️', '⛴️', '🛥️', '🚢', '✈️', '🛩️',
      '🛫', '🛬', '🪂', '💺', '🚁', '🚟', '🚠', '🚡',
      '🛰️', '🚀', '🛸', '🏠', '🏡', '🏗️', '🏭', '🏢',
      '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫',
      '🏩', '💒', '🏛️', '⛪', '🕌', '🛕', '🕍', '⛩️',
      '🕋', '⛲', '⛺', '🌁', '🌃', '🏙️', '🌄', '🌅',
      '🌆', '🌇', '🌉', '♨️', '🎠', '🛝', '🎡', '🎢',
      '💈', '🎪', '🗼', '🗽', '🗻', '🌋', '🏔️', '⛰️',
    ],
  },
  {
    id: 'objects',
    name: "Об'єкти",
    icon: '💡',
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️',
      '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼',
      '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️',
      '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭',
      '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋',
      '🪫', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️',
      '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳',
      '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️',
      '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧲', '🔫',
      '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬',
      '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '🪬',
      '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '🩻',
      '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️',
    ],
  },
  {
    id: 'symbols',
    name: 'Символи',
    icon: '💟',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓',
      '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️',
      '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
      '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎',
      '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑',
      '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺',
      '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴',
      '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️',
      '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯',
      '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵',
      '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅',
      '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️',
      '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠',
      'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗',
      '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺',
    ],
  },
  {
    id: 'flags',
    name: 'Прапори',
    icon: '🏁',
    emojis: [
      '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️',
      '🇺🇦', '🇺🇸', '🇬🇧', '🇩🇪', '🇫🇷', '🇪🇸', '🇮🇹', '🇵🇱',
      '🇨🇦', '🇦🇺', '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳', '🇧🇷', '🇲🇽',
      '🇹🇷', '🇳🇱', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇨🇭', '🇦🇹',
      '🇧🇪', '🇵🇹', '🇬🇷', '🇨🇿', '🇷🇴', '🇭🇺', '🇮🇪', '🇮🇸',
    ],
  },
]

// Simple keyword map for emoji search
const EMOJI_KEYWORDS: Record<string, string[]> = {
  '😀': ['smile', 'happy', 'grin', 'усмішка'],
  '😂': ['laugh', 'cry', 'tears', 'joy', 'сміх'],
  '❤️': ['heart', 'love', 'red', 'серце', 'кохання'],
  '👍': ['thumbs', 'up', 'yes', 'good', 'like', 'так', 'добре'],
  '👎': ['thumbs', 'down', 'no', 'bad', 'dislike', 'ні', 'погано'],
  '🔥': ['fire', 'hot', 'flame', 'вогонь'],
  '🎉': ['party', 'celebrate', 'tada', 'вечірка'],
  '🚀': ['rocket', 'launch', 'fast', 'ракета'],
  '💯': ['hundred', '100', 'perfect', 'ідеально'],
  '🤔': ['thinking', 'think', 'hmm', 'думаю'],
  '😍': ['love', 'hearts', 'eyes', 'кохання'],
  '😎': ['cool', 'sunglasses', 'круто'],
  '🥳': ['party', 'celebrate', 'birthday', 'вечірка'],
  '😢': ['cry', 'sad', 'tear', 'сумно'],
  '😡': ['angry', 'mad', 'злий'],
  '🤣': ['rofl', 'laugh', 'funny', 'смішно'],
  '💪': ['strong', 'muscle', 'arm', 'сила'],
  '👀': ['eyes', 'look', 'see', 'очі'],
  '🙏': ['pray', 'please', 'thanks', 'дякую'],
  '✅': ['check', 'done', 'yes', 'готово'],
  '❌': ['cross', 'no', 'wrong', 'ні'],
  '⚽': ['soccer', 'football', 'ball', 'футбол'],
  '🏀': ['basketball', 'ball', 'баскетбол'],
  '🍕': ['pizza', 'food', 'піца'],
  '🍺': ['beer', 'drink', 'пиво'],
  '☕': ['coffee', 'drink', 'hot', 'кава'],
  '🐶': ['dog', 'puppy', 'собака'],
  '🐱': ['cat', 'kitten', 'кіт'],
  '🇺🇦': ['ukraine', 'flag', 'україна', 'прапор'],
}

const searchQuery = ref('')
const activeCategoryId = ref(CATEGORIES[0].id)
const scrollContainerRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const categoryRefs = ref<Record<string, HTMLElement | null>>({})

const filteredCategories = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return CATEGORIES

  return CATEGORIES.map((cat) => ({
    ...cat,
    emojis: cat.emojis.filter((emoji) => {
      // Check if emoji itself contains the query
      if (emoji.includes(q)) return true
      // Check keywords
      const keywords = EMOJI_KEYWORDS[emoji]
      if (keywords) {
        return keywords.some((kw) => kw.includes(q))
      }
      // Check category name
      return cat.name.toLowerCase().includes(q)
    }),
  })).filter((cat) => cat.emojis.length > 0)
})

function selectCategory(categoryId: string) {
  activeCategoryId.value = categoryId
  searchQuery.value = ''

  nextTick(() => {
    const el = categoryRefs.value[categoryId]
    if (el && scrollContainerRef.value) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

function onEmojiClick(emoji: string) {
  emit('select', emoji)
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

function setCategoryRef(id: string, el: Element | ComponentPublicInstance | null) {
  categoryRefs.value[id] = el as HTMLElement | null
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  nextTick(() => {
    searchInputRef.value?.focus()
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="emoji-picker-panel" @click.stop>
    <!-- Category Tabs -->
    <div class="emoji-tabs">
      <button
        v-for="cat in CATEGORIES"
        :key="cat.id"
        :class="['emoji-tab', { active: activeCategoryId === cat.id && !searchQuery }]"
        :title="cat.name"
        @click="selectCategory(cat.id)"
      >
        {{ cat.icon }}
      </button>
    </div>

    <!-- Search -->
    <div class="emoji-search-wrapper">
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        class="emoji-search-input"
        placeholder="Пошук emoji..."
      />
    </div>

    <!-- Emoji Grid -->
    <div ref="scrollContainerRef" class="emoji-scroll-area">
      <div v-if="filteredCategories.length === 0" class="emoji-no-results">
        Нічого не знайдено
      </div>

      <div v-for="cat in filteredCategories" :key="cat.id" class="emoji-category-section">
        <div :ref="(el) => setCategoryRef(cat.id, el)" class="emoji-category-label">
          {{ cat.name }}
        </div>
        <div class="emoji-grid">
          <button
            v-for="emoji in cat.emojis"
            :key="emoji"
            class="emoji-btn"
            :title="emoji"
            @click="onEmojiClick(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.emoji-picker-panel {
  width: 100%;
  max-width: 352px;
  height: 380px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-popover);
  overflow: hidden;
}

.emoji-tabs {
  min-height: 50px;
  display: flex;
  gap: 2px;
  padding: var(--space-2) var(--space-2) 0 var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
  overflow-x: auto;
  flex-shrink: 0;
}

.emoji-tab {
  background: none;
  border: none;
  font-size: 18px;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color var(--dur-fast) var(--ease);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.emoji-tab:hover {
  background-color: var(--bg-hover);
}

.emoji-tab.active {
  border-bottom-color: var(--indigo-600);
  background-color: var(--bg-hover);
}

.emoji-search-wrapper {
  padding: var(--space-2);
  flex-shrink: 0;
}

.emoji-search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background-color: var(--bg-app);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color var(--dur-fast) var(--ease);
}

.emoji-search-input::placeholder {
  color: var(--text-muted);
}

.emoji-search-input:focus {
  border-color: var(--indigo-600);
}

.emoji-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--space-2) var(--space-2) var(--space-2);
}

.emoji-category-section {
  margin-bottom: var(--space-2);
}

.emoji-category-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: var(--space-2) var(--space-1);
  position: sticky;
  top: 0;
  background-color: var(--bg-elevated);
  z-index: 1;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  gap: 2px;
}

.emoji-btn {
  background: none;
  border: none;
  font-size: 22px;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--dur-fast) var(--ease);
}

.emoji-btn:hover {
  background-color: var(--bg-hover);
  transform: scale(1.15);
}

.emoji-no-results {
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
