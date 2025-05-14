<script setup lang="ts">
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { useDevice } from '@/composables/useDevice'
import { useModel } from '@/composables/useModel'
import { useCatStore } from '@/stores/cat'
import { useMonsterStore } from '@/stores/monster'

const appWindow = getCurrentWebviewWindow()
const { pressedMouses, pressedKeys } = useDevice()
const { handleLoad, handleDestroy, handleResize, handleMouseDown, handleKeyDown } = useModel()
const catStore = useCatStore()
const monsterStore = useMonsterStore()

const resizing = ref(false)
const showInventory = ref(false)
const showEquipment = ref(false)
const showSkills = ref(false)
const showMenu = ref(false)
const showDefaultAttackImage = ref(false)
const isProcessing = ref(false)
const showTreasurePrompt = ref(false)
const selectedItemId = ref<string | null>(null)

onMounted(() => {
  console.warn('Generated monster image:', monsterStore.currentMonster?.image)
  handleLoad()
  monsterStore.generateMonster()
})

onUnmounted(handleDestroy)

const handleDebounceResize = useDebounceFn(async () => {
  await handleResize()
  resizing.value = false
}, 100)

useEventListener('resize', () => {
  resizing.value = true
  handleDebounceResize()
})

watch(pressedMouses, (newValue) => {
  if (newValue.length > 0 && !monsterStore.showTreasure && !isProcessing.value) {
    monsterStore.decreaseMonsterHp()
    showDefaultAttackImage.value = true
    setTimeout(() => {
      showDefaultAttackImage.value = false
    }, 200)
  }
  handleMouseDown(newValue)
})

const handleDebounceWeaknessKey = useDebounceFn((key: string) => {
  if (monsterStore.isWeaknessActive && monsterStore.weaknessTimer > 0) {
    console.warn('處理破綻按鍵:', key)
    monsterStore.handleKeyPress(key)
  }
}, 50)

watch(pressedKeys, (newValue) => {
  try {
    if (newValue.length > 0 && !monsterStore.showTreasure && !isProcessing.value) {
      if (monsterStore.isWeaknessActive && monsterStore.weaknessTimer > 0) {
        const lastKey = newValue[newValue.length - 1]
        handleDebounceWeaknessKey(lastKey)
      }
      monsterStore.decreaseMonsterHp()
      showDefaultAttackImage.value = true
      setTimeout(() => {
        showDefaultAttackImage.value = false
      }, 200)
    }
  } catch (error) {
    console.error('按鍵處理錯誤:', error)
    showDefaultAttackImage.value = false
  }
  handleKeyDown(newValue)
}, { deep: false })

watch(isProcessing, (newValue) => {
  if (newValue) {
    showTreasurePrompt.value = true
    setTimeout(() => {
      showTreasurePrompt.value = false
    }, 3000)
  }
})

watch(() => catStore.penetrable, (value) => {
  if (!monsterStore.showTreasure) {
    appWindow.setIgnoreCursorEvents(value)
  }
}, { immediate: true })

function handleWindowDrag(event: MouseEvent) {
  if (monsterStore.showTreasure) {
    event.preventDefault()
    return
  }
  appWindow.startDragging()
}

async function handleTreasureClick(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()

  if (isProcessing.value || !monsterStore.showTreasure) {
    console.warn('無法開啟寶箱:', { isProcessing: isProcessing.value, showTreasure: monsterStore.showTreasure })
    return
  }

  try {
    isProcessing.value = true
    console.warn('開始開啟寶箱...')
    await appWindow.setIgnoreCursorEvents(false)
    await appWindow.emit('treasure-click')
    console.warn('準備調用 openTreasure...')
    await monsterStore.openTreasure()
    console.warn('openTreasure 調用完成')
    console.warn('物品欄狀態:', JSON.stringify(monsterStore.inventory, null, 2))
  } catch (error) {
    console.error('開啟寶箱時發生錯誤:', error)
  } finally {
    isProcessing.value = false
    appWindow.setIgnoreCursorEvents(catStore.penetrable)
  }
}

function toggleMenu() {
  showMenu.value = !showMenu.value
  if (!showMenu.value) {
    showInventory.value = false
    showEquipment.value = false
    showSkills.value = false
    selectedItemId.value = null
  }
}

function openInventory() {
  showInventory.value = true
  showEquipment.value = false
  showSkills.value = false
}

function openEquipment() {
  showEquipment.value = true
  showInventory.value = false
  showSkills.value = false
}

function openSkills() {
  showSkills.value = true
  showInventory.value = false
  showEquipment.value = false
}

function closePanel() {
  showInventory.value = false
  showEquipment.value = false
  showSkills.value = false
  selectedItemId.value = null
}

function handleItemClick(itemId: string) {
  const item = monsterStore.inventory.find(i => i.id === itemId)
  if (item && item.name.includes('技能書')) {
    selectedItemId.value = selectedItemId.value === itemId ? null : itemId
  }
}

function handleUseSkillBook(itemId: string) {
  const success = monsterStore.useSkillBook(itemId)
  if (success) {
    selectedItemId.value = null
  }
}

function handleClickOutside() {
  selectedItemId.value = null
}
</script>

<template>
  <div
    class="relative children:(absolute h-screen w-screen)"
    :class="[catStore.mirrorMode ? '-scale-x-100' : 'scale-x-100']"
    :style="{ opacity: catStore.opacity / 100 }"
    @click="handleClickOutside"
    @mousedown="handleWindowDrag"
  >
    <img :src="`/images/backgrounds/${catStore.mode}.png`">

    <div
      v-if="monsterStore.currentMonster || monsterStore.showTreasure"
      class="absolute min-h-screen flex flex-col items-center justify-center overflow-visible"
    >
      <div class="flex flex-col items-center">
        <div class="relative">
          <img
            v-if="monsterStore.showTreasure"
            alt="寶箱"
            class="h-auto max-h-[80vh] max-w-[80vw] w-auto cursor-pointer object-contain"
            src="/images/treasure.png"
            :style="{ pointerEvents: 'auto' }"
            @mousedown.stop.prevent="handleTreasureClick"
          >
          <img
            v-else-if="monsterStore.currentMonster"
            alt="怪物"
            class="h-auto max-h-[80vh] max-w-[80vw] w-auto object-contain"
            :src="monsterStore.currentMonster.image"
          >
          <img
            v-if="showDefaultAttackImage"
            alt="Default Attack"
            class="absolute z-10 h-16 w-16 object-contain"
            src="/images/defaultAttack.png"
            :style="{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }"
          >
        </div>

        <div class="relative mt-2 w-[400px]">
          <div
            v-if="monsterStore.currentMonster"
            class="absolute left-0 top--6 text-sm"
            :class="{
              'text-gray-200': monsterStore.currentMonster.rarity === 'common',
              'text-blue-400': monsterStore.currentMonster.rarity === 'magic',
              'text-purple-400': monsterStore.currentMonster.rarity === 'rare',
              'text-yellow-400': monsterStore.currentMonster.rarity === 'exalted',
            }"
          >
            {{ {
              common: '普通',
              magic: '魔法',
              rare: '稀有',
              exalted: '崇高',
            }[monsterStore.currentMonster.rarity] }}
          </div>

          <div class="absolute right-0 top--8">
            <button
              class="rounded-md bg-gray-800 px-1 py-1 text-white shadow-lg hover:bg-gray-700"
              @mousedown.stop.prevent="toggleMenu"
            >
              選單
            </button>

            <div
              v-if="showMenu"
              class="absolute bottom-full right-0 mt-2 w-17 rounded-md bg-gray-800 bg-opacity-90 p-1 shadow-lg"
              @mousedown.stop.prevent
            >
              <button
                class="mb-1 w-full rounded-md bg-gray-700 px-1 py-1 text-left text-white hover:bg-gray-600"
                @mousedown.stop.prevent="openInventory"
              >
                物品欄
              </button>
              <button
                class="mb-1 w-full rounded-md bg-gray-700 px-1 py-1 text-left text-white hover:bg-gray-600"
                @mousedown.stop.prevent="openEquipment"
              >
                裝備欄
              </button>
              <button
                class="w-full rounded-md bg-gray-700 px-1 py-1 text-left text-white hover:bg-gray-600"
                @mousedown.stop.prevent="openSkills"
              >
                技能欄
              </button>
            </div>
          </div>

          <div class="h-4 w-full rounded-full bg-gray-200">
            <div
              class="h-4 rounded-full"
              :class="{
                'bg-green-500': monsterStore.hpPercentage > 50,
                'bg-yellow-500': monsterStore.hpPercentage <= 50 && monsterStore.hpPercentage > 20,
                'bg-red-500': monsterStore.hpPercentage <= 20,
              }"
              :style="{ width: `${monsterStore.hpPercentage}%` }"
            />
          </div>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-sm text-black font-medium">
              {{ monsterStore.currentMonster?.currentHp }} / {{ monsterStore.currentMonster?.maxHp }}
            </span>
          </div>

          <div
            v-if="monsterStore.isWeaknessActive"
            class="absolute top-full mt-2 w-full text-sm text-white"
          >
            發現破綻! <span class="text-red-400 font-bold">{{ monsterStore.weaknessTimer }}</span> 秒內發動會心一擊
            輸入: <span class="text-yellow-400 font-bold">{{ monsterStore.weaknessKeys.join(' > ') }}</span>
          </div>

          <div
            v-if="monsterStore.showTreasure"
            class="absolute top-full mt-2 w-full text-sm text-white"
          >
            發現寶箱! <span class="text-yellow-400 font-bold">點擊寶箱</span> 即可開啟
          </div>

          <div
            v-if="showTreasurePrompt"
            class="absolute top-full mt-2 w-full text-sm text-white"
          >
            獲得了: <span class="text-white font-bold">{{ monsterStore.lastAddedItem?.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showInventory"
      class="fixed left-1/2 top-4 z-[9999] max-h-[calc(100vh-8rem)] overflow-y-auto rounded-md bg-gray-800 bg-opacity-90 p-4 shadow-lg !w-64 -translate-x-1/2"
      @mousedown.stop.prevent
    >
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg text-white font-bold">
          物品欄
        </h3>
        <button
          class="rounded-full bg-gray-700 p-1 text-white hover:bg-gray-600"
          @click.stop="closePanel"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M6 18L18 6M6 6l12 12"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        </button>
      </div>
      <div
        v-if="monsterStore.inventory.length === 0"
        class="text-gray-400"
      >
        尚無物品
      </div>
      <div
        v-for="item in monsterStore.inventory"
        :key="item.id"
        class="relative mb-1 w-full flex items-center justify-between rounded-md p-2"
        :class="{
          'bg-gray-700': item.itemRarity === 'common',
          'bg-blue-900': item.itemRarity === 'magic',
          'bg-purple-900': item.itemRarity === 'rare',
          'bg-yellow-900': item.itemRarity === 'exalted',
        }"
        @click.stop="handleItemClick(item.id)"
      >
        <span class="text-white">{{ item.name }}</span>
        <span class="text-white">x{{ item.quantity }}</span>
        <div
          v-if="selectedItemId === item.id && item.name.includes('技能書')"
          class="absolute right-0 top-full mt-1 rounded-md bg-gray-700 p-1 shadow-lg"
          @click.stop
        >
          <button
            class="rounded-md bg-gray-600 px-2 py-1 text-white hover:bg-gray-500"
            @click.stop="handleUseSkillBook(item.id)"
          >
            使用
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showEquipment"
      class="fixed left-1/2 top-4 z-[9999] max-h-[calc(100vh-8rem)] max-w-md overflow-y-auto rounded-md bg-gray-800 bg-opacity-90 p-4 shadow-lg !w-64 -translate-x-1/2"
      @mousedown.stop.prevent
    >
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg text-white font-bold">
          裝備欄
        </h3>
        <button
          class="rounded-full bg-gray-700 p-1 text-white hover:bg-gray-600"
          @click.stop="closePanel"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M6 18L18 6M6 6l12 12"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        </button>
      </div>
      <div class="text-gray-400">
        尚未實裝
      </div>
    </div>

    <div
      v-if="showSkills"
      class="fixed left-1/2 top-4 z-[9999] max-h-[calc(100vh-8rem)] overflow-y-auto rounded-md bg-gray-800 bg-opacity-90 p-4 shadow-lg !w-64 -translate-x-1/2"
      @mousedown.stop.prevent
    >
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg text-white font-bold">
          技能欄
        </h3>
        <button
          class="rounded-full bg-gray-700 p-1 text-white hover:bg-gray-600"
          @click.stop="closePanel"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M6 18L18 6M6 6l12 12"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        </button>
      </div>
      <div
        v-if="monsterStore.skills.length === 0"
        class="text-gray-400"
      >
        尚無技能
      </div>
      <div
        v-for="skill in monsterStore.skills"
        :key="skill.name"
        class="mb-1 w-full rounded-md bg-gray-700 p-2 text-white"
      >
        {{ skill.name }} Lv.{{ skill.level }}, Exp: {{ skill.level >= 9 ? 'Max' : skill.exp }}
      </div>
    </div>
  </div>
</template>
