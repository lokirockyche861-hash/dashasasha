<template>
  <div class="active-tree">
    <!-- Dynamic Layout Renderer -->
    <component
      :is="layoutComponent"
      :rule="rule"
      :currentNodeId="currentNodeId"
      :history="history"
      :successOptionId="successOptionId"
      :errorOptionId="errorOptionId"
      @node-click="handleNodeClick"
      @option-click="handleOptionClick"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, defineAsyncComponent } from 'vue'


// Layouts
const SpineTreeLayout = defineAsyncComponent(() => import('./layouts/SpineTreeLayout.vue'))

const props = defineProps({
  rule: {
    type: Object,
    required: true
  },
  task: {
    type: Object,
    required: true
  },
  taskId: {
    type: String,
    required: true
  },
  lessonId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['completed'])

// State
const currentNodeId = ref(props.rule.start_node)
const history = ref([]) // Array of { node, option }
const errorOptionId = ref(null)
const successOptionId = ref(null)
const isProcessing = ref(false)

// Computed
const nodesMap = computed(() => {
  return new Map(props.rule.nodes.map(n => [n.id, n]))
})

const currentNode = computed(() => {
  return nodesMap.value.get(currentNodeId.value)
})

const layoutComponent = computed(() => {
  return SpineTreeLayout
})

// Methods
const handleOptionClick = (option) => {
  if (isProcessing.value) return
  
  // Strict check: option must belong to current node
  const node = currentNode.value
  if (!node) return

  // Verify option exists in current node
  const originalOption = node.options?.find(o => o.id === option.id)
  if (!originalOption) {
    console.warn(`Option ${option.id} not found in node ${node.id}`)
    return
  }
  
  console.log('[ActiveTree] Selected option:', option.id, 'Next:', option.next)

  isProcessing.value = true
  errorOptionId.value = null

  // Validate against correct path from task
  const currentStepIndex = history.value.length
  const expectedStep = props.task.content.correct_path[currentStepIndex]
  
  // Logic: Correct if expectedStep exists, and id matches, and option_id matches
  const isCorrect = expectedStep && 
                    expectedStep.id === currentNodeId.value && 
                    expectedStep.option_id === option.id

  // Log event with full payload via new AnalyticsService
  AnalyticsService.logAttempt({
    // Context
    lessonId: props.lessonId,
    taskId: props.taskId, // This is the task identifier (graph session or specific task)
    
    ruleId: props.rule.ruleId,
    graphId: props.rule.graphId,
    topicId: props.rule.topicId,
    
    // Node Context
    subTaskId: currentNodeId.value, // formerly nodeId
    skillId: node.skill_id || null,
    
    // Task Type Info
    taskType: 'DecisionTree',
    answerType: 'select', // formerly tree-step
    taskVersion: props.task.taskVersion || null,
    
    // Answer
    selectedOptionId: option.id,
    userAnswerIsCorrect: !!isCorrect,
    
    // Counters
    correctOptions: 1, // Logic depends on if multiple correct options exist
    incorrectOptions: node.options.length - 1, // rough estimate
    selectedCorrectOptions: isCorrect ? 1 : 0,
    selectedIncorrectOptions: isCorrect ? 0 : 1
  })

  // Log specifically for API/DB (can be duplicated or unified, sticking to Service for now)
  // The Service now handles the detailed payload.

  if (isCorrect) {
    successOptionId.value = option.id
    setTimeout(() => {
      // Add to history
      history.value.push({
        node: currentNode.value,
        option: option
      })
      
      // Move to next node using strict logic: option.next
      const nextId = option.next
      
      if (!nextId) {
          console.error("No next node defined for option", option.id)
          return
      }

      currentNodeId.value = nextId
      successOptionId.value = null
      isProcessing.value = false

      // Check if new node is a result
      const nextNode = nodesMap.value.get(nextId)
      if (nextNode && nextNode.type === 'result') {
        emit('completed', nextNode.id)
      }
    }, 600)
  } else {
    errorOptionId.value = option.id
    setTimeout(() => {
      errorOptionId.value = null
      isProcessing.value = false
    }, 1000)
  }
}

const handleNodeClick = (nodeId) => {
  // console.log('Node clicked:', nodeId)
}

// Watch for task change to reset
watch(() => props.taskId, () => {
  currentNodeId.value = props.rule.start_node
  history.value = []
  errorOptionId.value = null
  successOptionId.value = null
  isProcessing.value = false
})

</script>

<style scoped>
.active-tree {
  width: 100%;
  height: 100%;
}
</style>
