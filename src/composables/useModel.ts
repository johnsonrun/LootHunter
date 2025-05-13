import { computed, watch } from 'vue'

import live2d from '../utils/live2d'
// import { getCursorMonitor } from '../utils/monitor'

import { useTauriListen } from './useTauriListen'

import { LISTEN_KEY } from '@/constants'
import { useCatStore } from '@/stores/cat'
import { useModelStore } from '@/stores/model'
import { getImageSize } from '@/utils/dom'

export function useModel() {
  const catStore = useCatStore()
  const modelStore = useModelStore()

  // 監聽模式變化並重新載入模型
  watch(() => catStore.mode, async (newMode) => {
    console.warn('模式變更，重新載入模型:', newMode)
    await handleLoad()
  }, { immediate: true })

  const backgroundImagePath = computed(() => {
    return `/images/backgrounds/${catStore.mode}.png`
  })

  useTauriListen<number>(LISTEN_KEY.PLAY_EXPRESSION, ({ payload }) => {
    live2d.playExpressions(payload)
  })

  async function handleLoad() {
    try {
      console.warn('開始載入 Live2D 模型...')
      const data = await live2d.load(`/models/${catStore.mode}/cat.model3.json`)
      console.warn('Live2D 模型載入完成')

      await handleResize()
      Object.assign(modelStore, data)
    } catch (error) {
      console.error('載入 Live2D 模型時發生錯誤:', error)
    }
  }

  function handleDestroy() {
    console.warn('銷毀 Live2D 模型')
    live2d.destroy()
  }

  async function handleResize() {
    if (!live2d.model) {
      console.warn('Live2D 模型不存在，無法調整大小')
      return
    }

    try {
      const { innerWidth } = window
      const { width } = await getImageSize(backgroundImagePath.value)
      live2d.model.scale.set(innerWidth / width)
      console.warn('Live2D 模型大小調整完成')
    } catch (error) {
      console.error('調整 Live2D 模型大小時發生錯誤:', error)
    }
  }

  function handleKeyDown(value: string[]) {
    try {
      if (!live2d.model?.internalModel?.coreModel) {
        console.warn('Live2D 模型未正確初始化，嘗試重新載入...')
        handleLoad()
        return
      }

      const hasArrowKey = value.some(key => key.endsWith('Arrow'))
      const hasNonArrowKey = value.some(key => !key.endsWith('Arrow'))

      live2d.setParameterValue('CatParamRightHandDown', hasArrowKey)
      live2d.setParameterValue('CatParamLeftHandDown', hasNonArrowKey)
    } catch (error) {
      console.error('處理按鍵時發生錯誤:', error)
    }
  }

  /* async function handleMouseMove() {
    if (catStore.mode !== 'standard' || !live2d.model) return

    const monitor = await getCursorMonitor()

    if (!monitor) return

    const { size, cursorX, cursorY } = monitor
    const { width, height } = size

    const xRatio = cursorX / width
    const yRatio = cursorY / height

    const x = (xRatio * 60) - 30
    const y = (yRatio * 60) - 30

    live2d.setParameterValue('ParamMouseX', -x)
    live2d.setParameterValue('ParamMouseY', -y)
    live2d.setParameterValue('ParamAngleX', x)
    live2d.setParameterValue('ParamAngleY', -y)
  }
    */

  function handleMouseDown(_value: string[]) {
    // 待補 點滑鼠扣怪物血
  }

  return {
    backgroundImagePath,
    handleLoad,
    handleDestroy,
    handleResize,
    handleKeyDown,
    // handleMouseMove,
    handleMouseDown,
  }
}
