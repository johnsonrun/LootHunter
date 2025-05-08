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
const { handleLoad, handleDestroy, handleResize, handleMouseDown, handleKeyDown } = useModel() // 移除了 handleMouseMove
const catStore = useCatStore()
const monsterStore = useMonsterStore()

const resizing = ref(false)
const showInventory = ref(false)
const showDefaultKeyImage = ref(false)

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

// 監聽滑鼠點擊，減少怪物血量
watch(pressedMouses, (newValue, oldValue) => {
  if (newValue.length > oldValue.length) {
    monsterStore.decreaseMonsterHp()
  }
  handleMouseDown(newValue)
})

// watch(mousePosition, handleMouseMove)

// 監聽鍵盤輸入，減少怪物血量
watch(pressedKeys, (newValue, oldValue) => {
  if (newValue.length > oldValue.length) {
    monsterStore.decreaseMonsterHp()

    showDefaultKeyImage.value = true
    setTimeout(() => {
      showDefaultKeyImage.value = false
    }, 200)
  }
  handleKeyDown(newValue)
})

watch(() => catStore.penetrable, (value) => {
  appWindow.setIgnoreCursorEvents(value)
}, { immediate: true })

function handleWindowDrag() {
  appWindow.startDragging()
}

/*
function resolveImageURL(key: string) {
  return new URL(`../../assets/images/keys/${key}.png`, import.meta.url).href
}
*/

function handleTreasureClick() {
  if (monsterStore.showTreasure) {
    monsterStore.openTreasure()
  }
}

function toggleInventory() {
  showInventory.value = !showInventory.value
}

/*
原本在下方 template 中有這段，用來顯示按下的鍵盤圖片，目前先移除，
之後再考慮用來決定 不同技能 顯示不同的圖片:
跟下面的 Function連動: resolveImageURL

<img
v-for="key in pressedKeys"
      :key="key"
      :src="resolveImageURL(key)"
    >
    */

// template 砍掉live2D了   <canvas id="live2dCanvas" />
</script>

<template>
  <div
    class="relative children:(absolute h-screen w-screen)"
    :class="[catStore.mirrorMode ? '-scale-x-100' : 'scale-x-100']"
    :style="{ opacity: catStore.opacity / 100 }"
    @mousedown="handleWindowDrag"
  >
    <img :src="`/images/backgrounds/${catStore.mode}.png`">

    <!-- 怪物或寶箱顯示 -->
    <div
      v-if="monsterStore.currentMonster || monsterStore.showTreasure"
      class="absolute min-h-screen flex flex-col items-center justify-center overflow-visible"
    >
      <!-- Default key image -->
      <img
        v-if="showDefaultKeyImage"
        alt="Default Key"
        class="absolute z-10 h-16 w-16 object-contain"
        src="/images/default-key.png"
      >

      <!-- 怪物或寶箱圖片 -->
      <img
        v-if="monsterStore.showTreasure"
        alt="寶箱"
        class="mb-4 h-auto max-h-[80vh] max-w-[80vw] w-auto object-contain"
        src="/images/treasure.png"
        @click="handleTreasureClick"
      >
      <img
        v-else-if="monsterStore.currentMonster"
        alt="怪物"
        class="mb-4 h-auto max-h-[80vh] max-w-[80vw] w-auto object-contain"
        :src="monsterStore.currentMonster.image"
      >

      <!-- 血量條 -->
      <div class="mt-2 h-2.5 max-w-md w-full rounded-full bg-gray-200">
        <div
          class="h-2.5 rounded-full"
          :class="{
            'bg-green-500': monsterStore.hpPercentage > 50,
            'bg-yellow-500': monsterStore.hpPercentage <= 50 && monsterStore.hpPercentage > 20,
            'bg-red-500': monsterStore.hpPercentage <= 20,
          }"
          :style="{ width: `${monsterStore.hpPercentage}%` }"
        />
      </div>

      <!-- 血量數值 -->
      <div class="mt-1 text-sm text-white">
        {{ monsterStore.currentMonster?.currentHp }} / {{ monsterStore.currentMonster?.maxHp }}
      </div>

      <!-- 怪物稀有度 -->
      <div
        v-if="monsterStore.currentMonster"
        class="mb-2 text-sm text-white"
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
    </div>

    <!-- 物品欄按鈕 -->
    <button
      class="absolute bottom-4 right-4 rounded-md bg-gray-800 px-3 py-1 text-white"
      @click.stop="toggleInventory"
    >
      物品欄
    </button>

    <!-- 物品欄介面 -->
    <div
      v-if="showInventory"
      class="absolute left-1/2 top-1/2 max-h-96 w-80 transform overflow-y-auto rounded-md bg-gray-800 bg-opacity-90 p-4 -translate-x-1/2 -translate-y-1/2"
      @mousedown.stop
    >
      <h3 class="mb-2 text-lg text-white">
        物品欄
      </h3>
      <div
        v-if="monsterStore.inventory.length === 0"
        class="text-gray-400"
      >
        尚無物品
      </div>
      <div
        v-for="item in monsterStore.inventory"
        :key="item.id"
        class="mb-1 flex items-center justify-between rounded-md p-2"
        :class="{
          'bg-gray-700': item.type === 'common',
          'bg-blue-900': item.type === 'magic',
          'bg-purple-900': item.type === 'rare',
          'bg-yellow-900': item.type === 'exalted',
        }"
      >
        <span class="text-white">{{ item.name }}</span>
        <span class="text-white">x{{ item.quantity }}</span>
      </div>
      <button
        class="mt-2 w-full rounded-md bg-gray-700 py-1 text-white"
        @click="showInventory = false"
      >
        關閉
      </button>
    </div>
  </div>
</template>
