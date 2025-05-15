import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// 怪物稀有度類型
export type MonsterRarity = 'common' | 'magic' | 'rare' | 'exalted'

// 物品稀有度類型
export type ItemRarity = 'common' | 'magic' | 'rare' | 'exalted'

// 物品介面
export interface Item {
  id: string
  itemRarity: ItemRarity
  name: string
  quantity: number
}

// 技能介面
export interface Skill {
  name: string
  level: number
  exp: number
}

// 怪物介面
export interface Monster {
  rarity: MonsterRarity
  maxHp: number
  currentHp: number
  image: string
}

// 技能配置介面
interface SkillConfig {
  name: string
  command: string[] | null
  effect: (monster: Monster) => void
  image: string
  interval?: number // 用於被動技能的觸發間隔（秒）
}

export const useMonsterStore = defineStore('monster', () => {
  // 當前怪物
  const currentMonster = ref<Monster | null>(null)

  // 是否顯示寶箱
  const showTreasure = ref(false)

  // 物品欄
  const inventory = ref<Item[]>([])

  // 技能欄
  const skills = ref<Skill[]>([])

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

  // 技能相關狀態
  const skillKeySequences = ref<{ [key: string]: string[] }>({})
  const activeSkillImage = ref<{ name: string, image: string } | null>(null)
  const passiveSkillIntervals = ref<{ [key: string]: number }>({})
  const skillSequenceTimeouts = ref<{ [key: string]: number }>({}) // 新增：追蹤技能序列超時

  // 用於生成唯一 ID 的計數器
  let itemIdCounter = 0

  // 技能配置
  const skillConfigs: SkillConfig[] = [
    {
      name: '刺拳',
      command: ['h', 'j', 'k', 'l'],
      effect: (monster: Monster) => {
        monster.currentHp = Math.max(0, monster.currentHp - 1)
      },
      image: '/images/skills/刺拳.png',
    },
    {
      name: '電球',
      command: ['a', 'w', 'd', 'r'],
      effect: (monster: Monster) => {
        monster.currentHp = Math.max(0, monster.currentHp - 1)
      },
      image: '/images/skills/電球.png',
    },
    {
      name: '冰刺',
      command: ['z', 's', 'e', 'f', 'v'],
      effect: (monster: Monster) => {
        monster.currentHp = Math.max(0, monster.currentHp - 1)
      },
      image: '/images/skills/冰刺.png',
    },
    {
      name: '後旋踢',
      command: ['d', 's', 'a'],
      effect: (monster: Monster) => {
        monster.currentHp = Math.max(0, monster.currentHp - 1)
      },
      image: '/images/skills/後旋踢.png',
    },
    {
      name: '岩彈',
      command: ['h', 'u', 'k'],
      effect: (monster: Monster) => {
        monster.currentHp = Math.max(0, monster.currentHp - 1)
      },
      image: '/images/skills/岩彈.png',
    },
    {
      name: '火雨',
      command: ['z', 'w', 'c', 'e', 't', 'h', 'm', 'u', 'p', '9'],
      effect: (monster: Monster) => {
        monster.currentHp = Math.max(0, monster.currentHp - 4)
      },
      image: '/images/skills/火雨.png',
    },
    {
      name: '風刃',
      command: ['s', 'r', 'h', 'i'],
      effect: (monster: Monster) => {
        monster.currentHp = Math.max(0, monster.currentHp - 2)
      },
      image: '/images/skills/風刃.png',
    },
    {
      name: '毒沼',
      command: null,
      effect: (monster: Monster) => {
        monster.currentHp = Math.max(0, monster.currentHp - 1)
      },
      image: '/images/skills/毒沼.png',
      interval: 10,
    },
    {
      name: '三叉戟之舞',
      command: ['a'],
      effect: (monster: Monster) => {
        monster.currentHp = Math.max(0, monster.currentHp - 2)
      },
      image: '/images/skills/三叉戟之舞.png',
    },
    {
      name: '雷爆',
      command: ['q', '4', 'y', '3', '9', 'c'],
      effect: (monster: Monster) => {
        monster.currentHp = Math.max(0, monster.currentHp - 4)
      },
      image: '/images/skills/雷爆.png',
    },
    {
      name: '神火',
      command: null,
      effect: (monster: Monster) => {
        monster.currentHp = Math.max(0, monster.currentHp - 1)
      },
      image: '/images/skills/神火.png',
      interval: 7,
    },
  ]

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

  // 初始化被動技能
  function initializePassiveSkills() {
    Object.keys(passiveSkillIntervals.value).forEach((key) => {
      clearInterval(passiveSkillIntervals.value[key])
    })
    passiveSkillIntervals.value = {}
    skills.value.forEach((skill) => {
      const config = skillConfigs.find(sc => sc.name === skill.name)
      if (config && config.interval) {
        passiveSkillIntervals.value[skill.name] = window.setInterval(() => {
          if (currentMonster.value && !showTreasure.value) {
            console.warn(`被動技能 ${skill.name} 觸發`)
            config.effect(currentMonster.value as Monster)
            activeSkillImage.value = { name: skill.name, image: config.image }
            setTimeout(() => {
              if (activeSkillImage.value?.name === skill.name) {
                activeSkillImage.value = null
              }
            }, 200)
            checkMonsterDeath()
          }
        }, config.interval * 1000)
      }
    })
  }

  // 檢查怪物死亡
  function checkMonsterDeath() {
    if (currentMonster.value && currentMonster.value.currentHp <= 0) {
      lastDefeatedMonsterRarity.value = currentMonster.value.rarity
      currentMonster.value = null
      showTreasure.value = true
      clearWeakness()
      Object.keys(passiveSkillIntervals.value).forEach((key) => {
        clearInterval(passiveSkillIntervals.value[key])
      })
      passiveSkillIntervals.value = {}
      Object.keys(skillSequenceTimeouts.value).forEach((key) => {
        clearTimeout(skillSequenceTimeouts.value[key])
      })
      skillSequenceTimeouts.value = {}
    }
  }

  // 處理按鍵輸入
  function handleKeyPress(key: string) {
    if (!currentMonster.value || showTreasure.value) {
      console.warn('無怪物或顯示寶箱，忽略按鍵輸入')
      keySequence.value = []
      return
    }
    // 標準化按鍵輸入
    let inputKey = key.toLowerCase()
    if (inputKey.startsWith('key')) {
      inputKey = inputKey.replace('key', '')
    }
    console.warn('----------------------------------------')
    console.warn('按下按鍵:', inputKey, '原始按鍵:', key)

    // 處理破綻按鍵
    if (isWeaknessActive.value) {
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
          checkMonsterDeath()
          clearWeakness()
        }
      }
    }

    // 處理技能按鍵
    skills.value.forEach((skill) => {
      const config = skillConfigs.find(sc => sc.name === skill.name && sc.command)
      if (config && config.command) {
        if (!skillKeySequences.value[skill.name]) {
          skillKeySequences.value[skill.name] = []
        }
        const sequence = skillKeySequences.value[skill.name]
        if (sequence.length >= config.command.length) {
          sequence.shift()
        }
        sequence.push(inputKey)
        console.warn(`技能 ${skill.name} 按鍵序列更新:`, [...sequence], '目標序列:', config.command)

        // 清除現有超時
        if (skillSequenceTimeouts.value[skill.name]) {
          clearTimeout(skillSequenceTimeouts.value[skill.name])
        }

        // 檢查序列是否匹配
        if (sequence.length === config.command.length && sequence.every((k, i) => k === config.command![i])) {
          console.warn(`技能 ${skill.name} 觸發！`)
          config.effect(currentMonster.value as Monster)
          activeSkillImage.value = { name: skill.name, image: config.image }
          setTimeout(() => {
            if (activeSkillImage.value?.name === skill.name) {
              activeSkillImage.value = null
            }
          }, 200)
          skillKeySequences.value[skill.name] = []
          checkMonsterDeath()
        } else {
          // 設置超時以重置不正確序列
          skillSequenceTimeouts.value[skill.name] = window.setTimeout(() => {
            console.warn(`技能 ${skill.name} 序列超時，重置`)
            skillKeySequences.value[skill.name] = []
          }, 2000)
        }
      }
    })

    console.warn('----------------------------------------')
  }

  // 減少怪物血量
  function decreaseMonsterHp() {
    if (!currentMonster.value || showTreasure.value) return
    currentMonster.value.currentHp = Math.max(0, currentMonster.value.currentHp - 1)
    checkWeakness()
    checkMonsterDeath()
  }

  // 生成五位數字 ID
  function generateItemId(): string {
    itemIdCounter = (itemIdCounter + 1) % 100000
    return itemIdCounter.toString().padStart(5, '0')
  }

  // 添加物品到物品欄
  function addItemToInventory(item: { name: string, itemRarity: ItemRarity }) {
    console.warn('addItemToInventory 開始，item:', item)
    const existingItem = inventory.value.find(i => i.name === item.name)
    if (existingItem) {
      existingItem.quantity += 1
      lastAddedItem.value = { ...existingItem }
      console.warn('增加物品數量:', {
        name: item.name,
        quantity: existingItem.quantity,
        lastAddedItem: lastAddedItem.value,
      })
    } else {
      const newItem = {
        id: generateItemId(),
        itemRarity: item.itemRarity,
        name: item.name,
        quantity: 1,
      }
      inventory.value.push(newItem)
      lastAddedItem.value = newItem
      console.warn('新增物品:', {
        newItem,
        lastAddedItem: lastAddedItem.value,
      })
    }
    console.warn('當前物品欄:', inventory.value)
  }

  // 從物品欄移除物品
  function removeItemFromInventory(itemId: string) {
    const item = inventory.value.find(i => i.id === itemId)
    if (item) {
      if (item.quantity > 1) {
        item.quantity -= 1
      } else {
        inventory.value = inventory.value.filter(i => i.id !== itemId)
      }
      console.warn('移除物品後的物品欄:', inventory.value)
    }
  }

  // 技能升級經驗表
  const expToLevelUp = [
    { level: 1, exp: 5 },
    { level: 2, exp: 10 },
    { level: 3, exp: 20 },
    { level: 4, exp: 50 },
    { level: 5, exp: 100 },
    { level: 6, exp: 200 },
    { level: 7, exp: 500 },
    { level: 8, exp: 1000 },
  ]

  // 使用技能書
  function useSkillBook(itemId: string) {
    const item = inventory.value.find(i => i.id === itemId)
    if (!item || !item.name.includes('技能書')) return false

    const skillName = item.name.replace('技能書: ', '').trim()
    let skill = skills.value.find(s => s.name === skillName)

    // 檢查技能是否已達最大等級
    if (skill && skill.level >= 9) {
      console.warn(`技能 ${skillName} 已達最大等級 Lv.9, Exp: Max`)
      return false
    }

    // 移除使用的技能書
    removeItemFromInventory(itemId)

    if (!skill) {
      // 新增技能
      skill = { name: skillName, level: 1, exp: 0 }
      skills.value.push(skill)
      initializePassiveSkills() // 初始化被動技能
    }

    // 增加經驗值
    skill.exp += 1
    console.warn(`技能 ${skillName} 經驗增加: Lv.${skill.level}, Exp: ${skill.exp}`)

    // 檢查是否升級
    const nextLevel = expToLevelUp.find(l => l.level === skill.level)
    if (nextLevel && skill.exp >= nextLevel.exp) {
      skill.level += 1
      skill.exp = 0
      console.warn(`技能 ${skillName} 升級至 Lv.${skill.level}`)
      initializePassiveSkills() // 重新初始化被動技能
    }

    return true
  }

  // 隨機選擇物品（基於機率）
  function rollItem(monsterRarity: MonsterRarity): { name: string, itemRarity: ItemRarity } {
    const roll = Math.random() * 100
    let cumulative = 0

    const dropTables: Record<MonsterRarity, Array<{ chance: number, type: string, rarity: ItemRarity }>> = {
      common: [
        { chance: 1, type: 'material', rarity: 'common' },
        { chance: 1, type: 'equipment', rarity: 'common' },
        { chance: 98, type: 'skillBook', rarity: 'rare' },
      ],
      magic: [
        { chance: 73, type: 'material', rarity: 'magic' },
        { chance: 15, type: 'equipment', rarity: 'common' },
        { chance: 10, type: 'equipment', rarity: 'magic' },
        { chance: 2, type: 'skillBook', rarity: 'rare' },
      ],
      rare: [
        { chance: 60, type: 'material', rarity: 'rare' },
        { chance: 10, type: 'equipment', rarity: 'common' },
        { chance: 15, type: 'equipment', rarity: 'magic' },
        { chance: 10, type: 'equipment', rarity: 'rare' },
        { chance: 3, type: 'skillBook', rarity: 'rare' },
        { chance: 1, type: 'ultimateBook', rarity: 'exalted' },
        { chance: 1, type: 'mysteriousCollectible', rarity: 'rare' },
      ],
      exalted: [
        { chance: 53, type: 'material', rarity: 'exalted' },
        { chance: 10, type: 'equipment', rarity: 'magic' },
        { chance: 15, type: 'equipment', rarity: 'rare' },
        { chance: 10, type: 'equipment', rarity: 'exalted' },
        { chance: 5, type: 'skillBook', rarity: 'rare' },
        { chance: 2, type: 'ultimateBook', rarity: 'exalted' },
        { chance: 4, type: 'mysteriousCollectible', rarity: 'rare' },
        { chance: 1, type: 'secretCollectible', rarity: 'exalted' },
      ],
    }

    const drops = dropTables[monsterRarity]
    let selectedType: string | null = null
    let selectedRarity: ItemRarity = 'common'

    for (const drop of drops) {
      cumulative += drop.chance
      if (roll <= cumulative) {
        selectedType = drop.type
        selectedRarity = drop.rarity
        break
      }
    }

    if (!selectedType) {
      console.warn('未選擇物品類型，使用預設普通材料')
      return { name: '普通材料', itemRarity: 'common' }
    }

    if (selectedType === 'material') {
      const materialNames: Record<ItemRarity, string> = {
        common: '普通材料',
        magic: '魔法材料',
        rare: '稀有材料',
        exalted: '崇高材料',
      }
      return { name: materialNames[selectedRarity], itemRarity: selectedRarity }
    } else if (selectedType === 'equipment') {
      const equipmentRoll = Math.random() * 100
      const equipmentTypes = [
        { chance: 10, name: '頭盔' },
        { chance: 5, name: '項鍊' },
        { chance: 10, name: '胸甲' },
        { chance: 1, name: '披風' },
        { chance: 10, name: '手套' },
        { chance: 7, name: '戒指' },
        { chance: 7, name: '腰帶' },
        { chance: 10, name: '褲子' },
        { chance: 10, name: '靴子' },
        { chance: 30, name: '武器' },
      ]
      let equipmentCumulative = 0
      for (const equip of equipmentTypes) {
        equipmentCumulative += equip.chance
        if (equipmentRoll <= equipmentCumulative) {
          return { name: equip.name, itemRarity: selectedRarity }
        }
      }
      return { name: '武器', itemRarity: selectedRarity }
    } else if (selectedType === 'skillBook') {
      const skillRoll = Math.random() * 100
      const skillBooks = [
        { chance: 20, name: '技能書: 刺拳' },
        { chance: 20, name: '技能書: 電球' },
        { chance: 20, name: '技能書: 冰刺' },
        { chance: 10, name: '技能書: 後旋踢' },
        { chance: 10, name: '技能書: 岩彈' },
        { chance: 10, name: '技能書: 火雨' },
        { chance: 5, name: '技能書: 風刃' },
        { chance: 2, name: '技能書: 毒沼' },
        { chance: 1, name: '技能書: 雷爆' },
        { chance: 1, name: '技能書: 三叉戟之舞' },
        { chance: 1, name: '技能書: 神火' },
      ]
      let skillCumulative = 0
      for (const skill of skillBooks) {
        skillCumulative += skill.chance
        if (skillRoll <= skillCumulative) {
          return { name: skill.name, itemRarity: 'rare' }
        }
      }
      return { name: '技能書: 刺拳', itemRarity: 'rare' }
    } else if (selectedType === 'ultimateBook') {
      const ultimateRoll = Math.random() * 100
      const ultimateBooks = [
        { chance: 30, name: '絕招秘笈: 竭力一擊' },
        { chance: 20, name: '絕招秘笈: 烈焰爆' },
        { chance: 20, name: '絕招秘笈: 重力壓制' },
        { chance: 10, name: '絕招秘笈: 幻影連擊' },
        { chance: 20, name: '絕招秘笈: 割喉' },
      ]
      let ultimateCumulative = 0
      for (const book of ultimateBooks) {
        ultimateCumulative += book.chance
        if (ultimateRoll <= ultimateCumulative) {
          return { name: book.name, itemRarity: 'exalted' }
        }
      }
      return { name: '絕招秘笈: 竭力一擊', itemRarity: 'exalted' }
    } else if (selectedType === 'mysteriousCollectible') {
      return { name: '神秘收藏品', itemRarity: 'rare' }
    } else if (selectedType === 'secretCollectible') {
      return { name: '絕密收藏品', itemRarity: 'exalted' }
    }

    console.warn('未匹配任何物品，使用預設普通材料')
    return { name: '普通材料', itemRarity: 'common' }
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
    const rarityImageCounts = {
      common: 5,
      magic: 4,
      rare: 5,
      exalted: 5,
    }
    const maxIndex = rarityImageCounts[rarity]
    const randomIndex = Math.floor(Math.random() * maxIndex) + 1
    const image = `/images/monsters/${rarity}${randomIndex}.png`
    currentMonster.value = {
      rarity,
      maxHp: hp,
      currentHp: hp,
      image,
    }
    console.warn('New monster generated:', currentMonster.value)
    initializePassiveSkills()
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

    const item = rollItem(rarity)
    console.warn('掉落物品:', item)
    addItemToInventory(item)
    showTreasure.value = false
    await new Promise(resolve => setTimeout(resolve, 100))
    generateMonster()
  }

  return {
    currentMonster,
    showTreasure,
    inventory,
    skills,
    lastAddedItem,
    hpPercentage,
    lastDefeatedMonsterRarity,
    isWeaknessActive,
    weaknessKeys,
    weaknessTimer,
    activeSkillImage,
    skillConfigs,
    generateMonster,
    decreaseMonsterHp,
    openTreasure,
    handleKeyPress,
    useSkillBook,
  }
})
