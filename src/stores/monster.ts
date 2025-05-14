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

  // 儲存最新加入的物品
  const lastAddedItem = ref<Item | null>(null)

  // 最近擊敗的怪物稀有度
  const lastDefeatedMonsterRarity = ref<MonsterRarity>('common')

  // 破綻機制相關狀態
  const isWeaknessActive = ref(false)
  const weaknessKeys = ref<string[]>([])
  const weaknessTimer = ref(5)
  const weaknessTimerInterval = ref<number | null>(null)
  const keySequence = ref<string[]>([])

  // 計算當前怪物血量百分比
  const hpPercentage = computed(() => {
    if (!currentMonster.value) return 0
    return Math.floor((currentMonster.value.currentHp / currentMonster.value.maxHp) * 100)
  })

  // 檢查是否觸發破綻
  function checkWeakness() {
    if (!currentMonster.value || isWeaknessActive.value) return

    const percentage = hpPercentage.value
    if (percentage % 5 === 0 && percentage > 5 && percentage < 100) {
      if (Math.random() < 0.2) {
        triggerWeakness()
      }
    }
  }

  // 觸發破綻事件
  function triggerWeakness() {
    if (!currentMonster.value) return

    if (weaknessTimerInterval.value) {
      clearInterval(weaknessTimerInterval.value)
      weaknessTimerInterval.value = null
    }

    weaknessKeys.value = generateRandomKeys()
    isWeaknessActive.value = true
    weaknessTimer.value = 5
    keySequence.value = []

    weaknessTimerInterval.value = window.setInterval(() => {
      if (weaknessTimer.value > 0) {
        weaknessTimer.value--
      } else {
        if (weaknessTimerInterval.value) {
          clearInterval(weaknessTimerInterval.value)
          weaknessTimerInterval.value = null
        }
        clearWeakness()
      }
    }, 1000)
  }

  // 清除破綻狀態
  function clearWeakness() {
    console.warn('清除破綻狀態')
    isWeaknessActive.value = false
    weaknessKeys.value = []
    keySequence.value = []
    weaknessTimer.value = 5

    if (weaknessTimerInterval.value) {
      clearInterval(weaknessTimerInterval.value)
      weaknessTimerInterval.value = null
    }

    console.warn('破綻狀態已清除:', {
      是否啟動: isWeaknessActive.value,
      目標按鍵序列: [...weaknessKeys.value],
      當前按鍵序列: [...keySequence.value],
      計時器: weaknessTimer.value,
    })
  }

  // 生成隨機按鍵
  function generateRandomKeys(): string[] {
    const keys = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l']
    const result: string[] = []
    const availableKeys = [...keys]

    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * availableKeys.length)
      result.push(availableKeys[randomIndex])
      availableKeys.splice(randomIndex, 1)
    }

    console.warn('生成的按鍵序列:', result)
    return result
  }

  // 處理按鍵輸入
  function handleKeyPress(key: string) {
    if (!isWeaknessActive.value || !currentMonster.value) {
      console.warn('破綻事件未啟動或怪物不存在，忽略按鍵輸入')
      keySequence.value = []
      return
    }

    const inputKey = key.replace('Key', '').toLowerCase()
    console.warn('----------------------------------------')
    console.warn('按下按鍵:', inputKey)
    console.warn('當前破綻狀態:', {
      是否啟動: isWeaknessActive.value,
      目標按鍵序列: [...weaknessKeys.value],
      當前按鍵序列: [...keySequence.value],
      計時器: weaknessTimer.value,
    })

    if (keySequence.value.length >= 3) {
      keySequence.value.shift()
    }
    keySequence.value.push(inputKey)

    console.warn('按鍵序列更新:', [...keySequence.value])
    console.warn('----------------------------------------')

    if (keySequence.value.length === 3) {
      const isMatch = keySequence.value.every((key: string, index: number) => key === weaknessKeys.value[index])
      console.warn('按鍵比對結果:', {
        實際按鍵: [...keySequence.value],
        目標按鍵: [...weaknessKeys.value],
        是否匹配: isMatch,
      })

      if (isMatch) {
        console.warn('成功完成按鍵序列！觸發會心一擊！')
        const damage = Math.floor(currentMonster.value.maxHp * 0.05)
        currentMonster.value.currentHp = Math.max(0, currentMonster.value.currentHp - damage)

        if (currentMonster.value.currentHp === 0) {
          lastDefeatedMonsterRarity.value = currentMonster.value.rarity
          currentMonster.value = null
          showTreasure.value = true
          clearWeakness()
        }
        clearWeakness()
      }
    }
  }

  // 減少怪物血量
  function decreaseMonsterHp() {
    if (!currentMonster.value || showTreasure.value) return

    currentMonster.value.currentHp = Math.max(0, currentMonster.value.currentHp - 1)
    checkWeakness()

    if (currentMonster.value.currentHp === 0) {
      lastDefeatedMonsterRarity.value = currentMonster.value.rarity
      currentMonster.value = null
      showTreasure.value = true
      clearWeakness()
    }
  }

  // 添加物品到物品欄
  function addItemToInventory(type: ItemType) {
    const itemNames = {
      common: '普通材料',
      magic: '魔法材料',
      rare: '稀有材料',
      exalted: '崇高材料',
    }

    // 檢查是否已存在相同類型的物品
    const existingItem = inventory.value.find(item => item.type === type)

    if (existingItem) {
      // 增加數量並更新 lastAddedItem
      existingItem.quantity += 1
      lastAddedItem.value = { ...existingItem } // 複製以避免直接修改
      console.warn('增加物品數量:', type, '當前數量:', existingItem.quantity, 'lastAddedItem:', lastAddedItem.value)
    } else {
      // 創建新物品
      const newItem = {
        id: `${type}-${Date.now()}`,
        type,
        name: itemNames[type],
        quantity: 1,
      }
      inventory.value.push(newItem)
      lastAddedItem.value = newItem
      console.warn('新增物品:', newItem, 'lastAddedItem:', lastAddedItem.value)
    }

    console.warn('當前物品欄:', inventory.value)
  }

  // 隨機生成怪物
  function generateMonster() {
    console.warn('Generating new monster...')
    showTreasure.value = false

    const rarityRoll = Math.random() * 100
    let rarity: MonsterRarity
    let hpRange: [number, number]

    if (rarityRoll < 60) {
      rarity = 'common'
      hpRange = [30, 100]
    } else if (rarityRoll < 90) {
      rarity = 'magic'
      hpRange = [150, 300]
    } else if (rarityRoll < 99) {
      rarity = 'rare'
      hpRange = [350, 700]
    } else {
      rarity = 'exalted'
      hpRange = [1000, 1500]
    }

    const hp = Math.floor(Math.random() * (hpRange[1] - hpRange[0] + 1)) + hpRange[0]
    const image = `/images/monsters/${rarity}.png`

    currentMonster.value = {
      rarity,
      maxHp: hp,
      currentHp: hp,
      image,
    }

    console.warn('New monster generated:', currentMonster.value)
  }

  // 開啟寶箱，獲得物品
  async function openTreasure() {
    if (!showTreasure.value) {
      console.warn('寶箱未顯示，無法開啟')
      return
    }
    console.warn('Opening treasure...')
    console.warn('lastDefeatedMonsterRarity:', lastDefeatedMonsterRarity.value)

    if (typeof lastDefeatedMonsterRarity.value === 'undefined') {
      console.error('lastDefeatedMonsterRarity 未定義')
      return
    }

    const rarity = lastDefeatedMonsterRarity.value
    console.warn('成功獲取 rarity:', rarity)

    if (!rarity) {
      console.error('rarity 為空值')
      return
    }

    let itemType: ItemType
    console.warn('準備決定物品類型，當前 rarity:', rarity)

    switch (rarity) {
      case 'common':
        itemType = 'common'
        break
      case 'magic':
        itemType = 'magic'
        break
      case 'rare':
        itemType = 'rare'
        break
      case 'exalted':
        itemType = 'exalted'
        break
      default:
        console.error('未知的怪物稀有度:', rarity)
        return
    }

    console.warn('掉落物品類型:', itemType)
    addItemToInventory(itemType)
    showTreasure.value = false

    await new Promise(resolve => setTimeout(resolve, 100))
    generateMonster()
  }

  return {
    currentMonster,
    showTreasure,
    inventory,
    lastAddedItem, // 暴露 lastAddedItem
    hpPercentage,
    lastDefeatedMonsterRarity,
    isWeaknessActive,
    weaknessKeys,
    weaknessTimer,
    generateMonster,
    decreaseMonsterHp,
    openTreasure,
    handleKeyPress,
  }
})
