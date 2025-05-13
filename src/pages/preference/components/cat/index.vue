<script setup lang="ts">
import type { SelectProps } from 'ant-design-vue'

import { Select, Slider, Switch } from 'ant-design-vue'

import ProList from '@/components/pro-list/index.vue'
import ProListItem from '@/components/pro-list-item/index.vue'
import { useCatStore } from '@/stores/cat'

const catStore = useCatStore()

const modeList: SelectProps['options'] = [
  {
    label: '標準模式',
    value: 'standard',
  },
  {
    label: '鍵盤模式',
    value: 'keyboard',
  },
]
</script>

<template>
  <ProList title="模式設定">
    <ProListItem title="選擇模式">
      <Select
        v-model:value="catStore.mode"
        :options="modeList"
        title="選擇模式"
      />
    </ProListItem>
  </ProList>

  <ProList title="視窗設定">
    <ProListItem
      description="啟用後，視窗不影響對其他應用程式的操作"
      title="視窗穿透"
    >
      <Switch v-model:checked="catStore.penetrable" />
    </ProListItem>

    <ProListItem
      title="不透明度"
      vertical
    >
      <Slider
        v-model:value="catStore.opacity"
        class="m-0!"
      />
    </ProListItem>

    <ProListItem title="鏡像模式">
      <Switch v-model:checked="catStore.mirrorMode" />
    </ProListItem>
  </ProList>
</template>
