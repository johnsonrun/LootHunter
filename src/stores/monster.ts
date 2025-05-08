import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// 怪物稀有度類型
export type MonsterRarity = 'common' | 'magic' | 'rare' | 'exalted'

// 物品類型
export type ItemType = 'common' | 'magic' | 'rare' | 'exalted'

// 物品介面
export interface Item {
  id: string
  type: ItemType
  name: string
  quantity: number
}

// 怪物介面
export interface Monster {
  rarity: MonsterRarity
  maxHp: number
  currentHp: number
  image: string
}

export const useMonsterStore = defineStore('monster', () => {
  // 當前怪物
  const currentMonster = ref<Monster | null>(null)

  // 是否顯示寶箱
  const showTreasure = ref(false)

  // 物品欄
  const inventory = ref<Item[]>([])

  // 計算當前怪物血量百分比
  const hpPercentage = computed(() => {
    if (!currentMonster.value) return 0
    return (currentMonster.value.currentHp / currentMonster.value.maxHp) * 100
  })

  // 隨機生成怪物
  function generateMonster() {
    // 隨機抽選稀有度
    const rarityRoll = Math.random() * 100
    let rarity: MonsterRarity
    let hpRange: [number, number]

    if (rarityRoll < 60) {
      rarity = 'common'
      hpRange = [3000, 10000]
    } else if (rarityRoll < 90) {
      rarity = 'magic'
      hpRange = [15000, 30000]
    } else if (rarityRoll < 99) {
      rarity = 'rare'
      hpRange = [35000, 70000]
    } else {
      rarity = 'exalted'
      hpRange = [100000, 150000]
    }

    // 在範圍內隨機生成血量
    const hp = Math.floor(Math.random() * (hpRange[1] - hpRange[0] + 1)) + hpRange[0]

    // 設置怪物圖片
    const image = `/images/monsters/${rarity}.png`

    // 更新當前怪物
    currentMonster.value = {
      rarity,
      maxHp: hp,
      currentHp: hp,
      image,
    }

    // 重置寶箱狀態
    showTreasure.value = false
  }

  // 減少怪物血量
  function decreaseMonsterHp() {
    if (!currentMonster.value || showTreasure.value) return

    currentMonster.value.currentHp = Math.max(0, currentMonster.value.currentHp - 1)

    // 檢查怪物是否已死亡
    if (currentMonster.value.currentHp === 0) {
      showTreasure.value = true
    }
  }

  // 開啟寶箱，獲得物品
  function openTreasure() {
    if (!showTreasure.value || !currentMonster.value) return

    const rarity = currentMonster.value.rarity
    const roll = Math.random() * 100
    let itemType: ItemType

    // 根據怪物稀有度決定掉落物品
    switch (rarity) {
      case 'common':
        itemType = 'common'
        break
      case 'magic':
        itemType = roll < 80 ? 'common' : 'magic'
        break
      case 'rare':
        if (roll < 60) itemType = 'common'
        else if (roll < 90) itemType = 'magic'
        else itemType = 'rare'
        break
      case 'exalted':
        if (roll < 40) itemType = 'common'
        else if (roll < 80) itemType = 'magic'
        else if (roll < 95) itemType = 'rare'
        else itemType = 'exalted'
        break
    }

    // 添加物品到物品欄
    addItemToInventory(itemType)

    // 生成新怪物
    generateMonster()
  }

  // 添加物品到物品欄
  function addItemToInventory(type: ItemType) {
    const itemNames = {
      common: '普通材料',
      magic: '魔法材料',
      rare: '稀有材料',
      exalted: '崇高材料',
    }

    const existingItem = inventory.value.find(item => item.type === type)

    if (existingItem) {
      existingItem.quantity += 1
    } else {
      inventory.value.push({
        id: `${type}-${Date.now()}`,
        type,
        name: itemNames[type],
        quantity: 1,
      })
    }
  }

  return {
    currentMonster,
    showTreasure,
    inventory,
    hpPercentage,
    generateMonster,
    decreaseMonsterHp,
    openTreasure,
  }
})
