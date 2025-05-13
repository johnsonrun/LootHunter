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

  // 最近擊敗的怪物稀有度
  const lastDefeatedMonsterRarity = ref<MonsterRarity>('common')

  // 破綻機制相關狀態
  const isWeaknessActive = ref(false)
  const weaknessKeys = ref<string[]>([]) // 隨機生成的三個按鍵
  const weaknessTimer = ref(5)
  const weaknessTimerInterval = ref<number | null>(null)
  const keySequence = ref<string[]>([]) // 監聽最近按下的三個按鍵

  // 計算當前怪物血量百分比
  const hpPercentage = computed(() => {
    if (!currentMonster.value) return 0
    return Math.floor((currentMonster.value.currentHp / currentMonster.value.maxHp) * 100)
  })

  // 檢查是否觸發破綻
  function checkWeakness() {
    if (!currentMonster.value || isWeaknessActive.value) return

    const percentage = hpPercentage.value
    // 檢查是否在 95%, 90%, ..., 10% 的位置（移除 5%）
    if (percentage % 5 === 0 && percentage > 5 && percentage < 100) {
      // 20% 機率觸發破綻
      if (Math.random() < 0.2) {
        triggerWeakness()
      }
    }
  }

  // 觸發破綻事件
  function triggerWeakness() {
    if (!currentMonster.value) return

    // 先清除舊的計時器
    if (weaknessTimerInterval.value) {
      clearInterval(weaknessTimerInterval.value)
      weaknessTimerInterval.value = null
    }

    // 使用 generateRandomKeys 生成隨機按鍵
    weaknessKeys.value = generateRandomKeys()

    // 啟動破綻狀態
    isWeaknessActive.value = true
    weaknessTimer.value = 5 // 5 秒倒計時

    // 清空之前的按鍵序列，確保從破綻事件開始後才收集新的按鍵
    keySequence.value = []

    // 啟動倒計時
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
    // 清空所有狀態
    isWeaknessActive.value = false
    weaknessKeys.value = [] // 清空隨機生成的按鍵序列
    keySequence.value = [] // 清空按鍵監聽序列
    weaknessTimer.value = 5 // 重置計時器

    // 清除計時器
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
      keySequence.value = [] // 清空按鍵序列
      return
    }

    // 將 'KeyX' 格式轉換為單個字母
    const inputKey = key.replace('Key', '').toLowerCase()
    console.warn('----------------------------------------')
    console.warn('按下按鍵:', inputKey)
    console.warn('當前破綻狀態:', {
      是否啟動: isWeaknessActive.value,
      目標按鍵序列: [...weaknessKeys.value],
      當前按鍵序列: [...keySequence.value],
      計時器: weaknessTimer.value,
    })

    // 直接操作陣列，保持最新的三個按鍵
    if (keySequence.value.length >= 3) {
      keySequence.value.shift() // 移除第一個元素
    }
    keySequence.value.push(inputKey) // 添加新按鍵

    console.warn('按鍵序列更新:')
    console.warn('- 更新後序列:', [...keySequence.value])
    console.warn('----------------------------------------')

    // 只有當收集到三個按鍵時才進行比對
    if (keySequence.value.length === 3) {
      // 檢查按鍵順序是否完全匹配
      const isMatch = keySequence.value.every((key: string, index: number) => key === weaknessKeys.value[index])
      console.warn('按鍵比對結果:')
      console.warn('- 實際按下的按鍵:', [...keySequence.value])
      console.warn('- 目標按鍵序列:', [...weaknessKeys.value])
      console.warn('- 是否匹配:', isMatch)
      console.warn('----------------------------------------')

      if (isMatch) {
        console.warn('成功完成按鍵序列！觸發會心一擊！')
        // 造成 5% 總生命的傷害
        const damage = Math.floor(currentMonster.value.maxHp * 0.05)
        console.warn('造成傷害:', damage, '當前血量:', currentMonster.value.currentHp)
        currentMonster.value.currentHp = Math.max(0, currentMonster.value.currentHp - damage)

        // 如果血量歸零，觸發怪物死亡
        if (currentMonster.value.currentHp === 0) {
          const defeatedRarity = currentMonster.value.rarity
          lastDefeatedMonsterRarity.value = defeatedRarity
          currentMonster.value = null
          showTreasure.value = true
          // 清空破綻狀態
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

    // 檢查是否觸發破綻
    checkWeakness()

    // 檢查怪物是否已死亡
    if (currentMonster.value.currentHp === 0) {
      const defeatedRarity = currentMonster.value.rarity
      lastDefeatedMonsterRarity.value = defeatedRarity
      currentMonster.value = null
      showTreasure.value = true
      // 清空破綻狀態
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
      // 如果已存在，增加數量
      existingItem.quantity += 1
      console.warn('增加物品數量:', type, '當前數量:', existingItem.quantity)
    } else {
      // 如果不存在，創建新物品
      const newItem = {
        id: `${type}-${Date.now()}`,
        type,
        name: itemNames[type],
        quantity: 1,
      }
      inventory.value.push(newItem)
      console.warn('新增物品:', newItem)
    }

    // 輸出當前物品欄狀態
    console.warn('當前物品欄:', inventory.value)
  }

  // 隨機生成怪物
  function generateMonster() {
    console.warn('Generating new monster...')
    // 重置寶箱狀態
    showTreasure.value = false

    // 隨機抽選稀有度
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

    console.warn('New monster generated:', currentMonster.value)
  }

  // 開啟寶箱，獲得物品
  async function openTreasure() {
    if (!showTreasure.value) {
      console.warn('寶箱未顯示，無法開啟')
      return
    }
    console.warn('Opening treasure...')
    console.warn('lastDefeatedMonsterRarity 初始值:', lastDefeatedMonsterRarity.value)

    // 檢查 lastDefeatedMonsterRarity 的狀態
    if (typeof lastDefeatedMonsterRarity.value === 'undefined') {
      console.error('lastDefeatedMonsterRarity 未定義')
      return
    }

    // 使用最近擊敗的怪物稀有度
    const rarity = lastDefeatedMonsterRarity.value
    console.warn('成功獲取 rarity:', rarity)

    if (!rarity) {
      console.error('rarity 為空值')
      return
    }

    let itemType: ItemType
    console.warn('準備決定物品類型，當前 rarity:', rarity)

    // 根據怪物稀有度決定掉落物品
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

    // 添加物品到物品欄
    addItemToInventory(itemType)

    // 清除寶箱狀態
    showTreasure.value = false

    // 生成新怪物
    await new Promise(resolve => setTimeout(resolve, 100))
    generateMonster()
  }

  return {
    currentMonster,
    showTreasure,
    inventory,
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
