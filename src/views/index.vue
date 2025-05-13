<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

import { useMonsterStore } from '@/stores/monster'

const monsterStore = useMonsterStore()

// 監聽按鍵事件
function handleKeyPress(event: KeyboardEvent) {
  if (monsterStore.showTreasure) {
    monsterStore.openTreasure()
    return
  }

  if (!monsterStore.currentMonster) {
    monsterStore.generateMonster()
    return
  }

  monsterStore.decreaseMonsterHp()
  monsterStore.handleKeyPress(event.code)
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<template>
  <div class="mx-auto p-4 container">
    <div class="mb-8 text-center">
      <h1 class="mb-4 text-3xl text-white font-bold">
        Loot Hunter
      </h1>
    </div>

    <div
      v-if="monsterStore.currentMonster"
      class="mb-8"
    >
      <!-- 怪物名稱 -->
      <div class="mb-4 text-center text-2xl text-white font-bold">
        {{ monsterStore.currentMonster.rarity }}
      </div>

      <!-- 怪物血量條 -->
      <div class="mb-4">
        <div class="relative h-8 w-full overflow-hidden rounded-lg bg-gray-800">
          <div
            class="h-full bg-red-600 transition-all duration-300"
            :style="{ width: `${monsterStore.hpPercentage}%` }"
          />
          <div class="absolute inset-0 flex items-center justify-center text-white">
            {{ monsterStore.currentMonster?.currentHp }} / {{ monsterStore.currentMonster?.maxHp }}
          </div>
        </div>
      </div>

      <!-- 怪物圖片 -->
      <div class="mb-8 flex justify-center">
        <img
          :alt="monsterStore.currentMonster.rarity"
          class="h-64 w-64 object-contain"
          :src="monsterStore.currentMonster.image"
        >
      </div>

      <!-- 破綻提示 -->
      <div
        v-if="monsterStore.isWeaknessActive"
        class="mb-4 text-center text-white"
      >
        <div class="text-xl font-bold">
          發現破綻! {{ monsterStore.weaknessTimer }} 秒內發動會心一擊
        </div>
        <div class="mt-2 text-lg">
          輸入: {{ monsterStore.weaknessKeys.join(' > ') }}
        </div>
      </div>

      <!-- 按鍵提示 -->
      <div class="mb-4 text-center text-white">
        <div class="text-lg">
          按下任意按鍵攻擊怪物
        </div>
      </div>
    </div>

    <!-- 寶箱 -->
    <div
      v-if="monsterStore.showTreasure"
      class="mb-8"
    >
      <div class="text-center">
        <img
          alt="寶箱"
          class="mx-auto mb-4 h-32 w-32"
          src="/treasure.png"
        >
        <div class="text-2xl text-yellow-400 font-bold">
          獲得寶物！
        </div>
      </div>
    </div>

    <!-- 開始按鈕 -->
    <div
      v-if="!monsterStore.currentMonster && !monsterStore.showTreasure"
      class="text-center"
    >
      <button
        class="rounded-lg bg-blue-500 px-6 py-3 text-xl text-white font-bold hover:bg-blue-600"
        @click="monsterStore.generateMonster"
      >
        開始狩獵
      </button>
    </div>
  </div>
</template>
