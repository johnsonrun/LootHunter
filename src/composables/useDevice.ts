import type { Ref } from 'vue'

import { useDebounceFn } from '@vueuse/core'
import { ref } from 'vue' // original: import { reactive, ref } from 'vue'

import { LISTEN_KEY } from '../constants'

import { useTauriListen } from './useTauriListen'

import { useCatStore } from '@/stores/cat'

type MouseButtonValue = 'Left' | 'Right' | 'Middle'

interface MouseButtonEvent {
  kind: 'MousePress'
  value: MouseButtonValue
}

/*
interface MouseMoveValue {
  x: number
  y: number
}

interface MouseMoveEvent {
  kind: 'MouseMove'
  value: MouseMoveValue
}
*/

interface KeyboardEvent {
  kind: 'KeyboardPress'
  value: string
}

type DeviceEvent = MouseButtonEvent | KeyboardEvent

function getSupportKeys() {
  const files = import.meta.glob('../assets/images/keys/*.png', { eager: true })

  return Object.keys(files).map((path) => {
    return path.split('/').pop()?.replace('.png', '')
  })
}

const supportKeys = getSupportKeys()

export function useDevice() {
  const pressedMouses = ref<MouseButtonValue[]>([])
  // 取消滑鼠位置監聽功能 const mousePosition = reactive<MouseMoveValue>({ x: 0, y: 0 })
  const pressedKeys = ref<string[]>([])
  const catStore = useCatStore()

  const debounceCapsLockRelease = useDebounceFn(() => { // 讓CapsLock的釋放延遲100ms 避免誤觸
    handleRelease(pressedKeys, 'CapsLock')
  }, 100)

  const KEY_PRESS_INTERVAL = 50 // 按鍵觸發的最小間隔（毫秒）

  const handlePress = <T>(array: Ref<T[]>, value?: T) => {
    if (!value) return
    // 直接添加按鍵，不使用 Set 去重
    array.value = [...array.value, value]
  }

  const handleRelease = <T>(array: Ref<T[]>, value?: T) => {
    if (!value) return
    array.value = array.value.filter(item => item !== value)
  }

  const normalizeKeyValue = (key: string) => {
    key = key.replace(/^(Meta).*/, '$1').replace(/F(\d+)/, 'Fn')

    const isInvalidArrowKey = key.endsWith('Arrow') && catStore.mode !== 'keyboard'
    const isUnsupportedKey = !supportKeys.includes(key)

    if (isInvalidArrowKey || isUnsupportedKey) return

    return key
  }

  // 添加防抖的按鍵處理函數
  const debouncedKeyPress = useDebounceFn((value: string) => {
    const normalizedKey = normalizeKeyValue(value)
    if (normalizedKey) {
      handlePress(pressedKeys, normalizedKey)
    }
  }, KEY_PRESS_INTERVAL)

  useTauriListen<DeviceEvent>(LISTEN_KEY.DEVICE_CHANGED, ({ payload }) => {
    const { kind, value } = payload

    if (value === 'CapsLock') {
      handlePress(pressedKeys, 'CapsLock')
      return debounceCapsLockRelease()
    }

    switch (kind) {
      case 'MousePress':
        return handlePress(pressedMouses, value)

      case 'KeyboardPress':
        return debouncedKeyPress(value)
    }
  })

  return {
    pressedMouses,
    // mousePosition,
    pressedKeys,
  }
}
