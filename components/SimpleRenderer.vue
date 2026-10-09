<template>
  <div>
    <div v-for="(node, index) in content" :key="index">
      <component 
        :is="getComponent(node)" 
        :node="node" 
        :lessonId="lessonId"
        :topicId="topicId"
        :lessonVersion="lessonVersion"
        :savedState="progress[node.id] || null"
      />
    </div>
  </div>
</template>

<script>
import Markdown from './Markdown.vue'
import QuizSelect from './QuizSelect.vue'
import QuizCheckbox from './QuizCheckbox.vue'
import Table from './Table.vue'
import QuizSet from './QuizSet.vue'
import FillInTheBlank from './FillInTheBlank.vue'
import FillTable from './FillTable.vue'
import SelectList from './SelectList.vue'
import FillText from './FillText.vue'
import SelectText from './SelectText.vue'
import ClickWord from './ClickWord.vue'
import DragAndDrop from './DragAndDrop.vue'
import DragTable from './DragTable.vue'

export default {
  name: 'SimpleRenderer',
  props: {
    content: {
      type: Array,
      required: true
    },
    lessonId: {
      type: String,
      default: ''
    },
    topicId: {
      type: String,
      default: ''
    },
    lessonVersion: {
      type: String,
      default: null
    },
    progress: {
      type: Object,
      default: () => ({})
    }
  },
  components: {
    Markdown,
    QuizSelect,
    QuizCheckbox,
    Table,
    QuizSet,
    FillInTheBlank,
    FillTable,
    SelectList,
    FillText,
    SelectText,
    ClickWord,
    DragAndDrop,
    DragTable
  },
  methods: {
    getComponent(node) {
      switch (node.type) {
        case 'markdown': return 'Markdown'
        case 'QuizSelect': return 'QuizSelect'
        case 'QuizCheckbox': return 'QuizCheckbox'
        case 'Table': return 'Table'
        case 'QuizSet': return 'QuizSet'
        case 'FillInTheBlank': return 'FillInTheBlank'
        case 'FillTable': return 'FillTable'
        case 'SelectList': return 'SelectList'
        case 'FillText': return 'FillText'
        case 'SelectText': return 'SelectText'
        case 'ClickWord': return 'ClickWord'
        case 'DragAndDrop': return 'DragAndDrop'
        case 'DragTable': return 'DragTable'
        default: 
          console.warn('Unknown node type:', node.type)
          return 'div'
      }
    }
  }
}
</script>