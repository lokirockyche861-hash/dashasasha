<template>
  <div class="reference-tree">
    <div class="tree-controls">
      <button @click="expandAll" class="control-btn">Развернуть всё</button>
      <button @click="collapseAll" class="control-btn">Свернуть всё</button>
    </div>
    <div class="tree-wrapper">
      <div v-if="treeData" class="tree-placeholder">
        [Tree Visualization Disabled]
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  rule: {
    type: Object,
    required: true
  }
})

const md = new MarkdownIt({ html: true, linkify: true, breaks: true })

const treeProps = {
  label: 'label',
  children: 'children',
  expand: 'expand',
  key: 'id'
}

// Transform flat nodes list into hierarchical structure for vue3-blocks-tree
const treeData = computed(() => {
  if (!props.rule || !props.rule.start_node) return null
  
  const nodesMap = new Map(props.rule.nodes.map(n => [n.id, n]))
  
  const buildNode = (nodeId) => {
    const node = nodesMap.get(nodeId)
    if (!node) return null

    const result = {
      id: node.id,
      label: node.label || node.text, // Fallback for label
      text: node.type === 'result' ? node.text : (node.type === 'question' ? node.text : ''),
      type: node.type,
      expand: true,
      children: []
    }

    if (node.type === 'question' && node.options) {
      node.options.forEach(opt => {
        const childNode = buildNode(opt.next)
        // We create an intermediate "option" node to represent the edge label (Yes/No)
        const optionNode = {
          id: `${node.id}-${opt.id}`,
          label: opt.label,
          type: 'option',
          expand: true,
          children: childNode ? [childNode] : []
        }
        result.children.push(optionNode)
      })
    }

    return result
  }

  return buildNode(props.rule.start_node)
})

const renderMarkdown = (text) => {
  if (!text) return ''
  return md.render(text)
}

const getNodeClass = (data) => {
  return {
    'is-question': data.type === 'question',
    'is-result': data.type === 'result',
    'is-option': data.type === 'option'
  }
}

const nodeClassName = (data) => {
  return '' // We handle styling inside the slot
}

const expandAll = () => {
}

const collapseAll = () => {
}

</script>


<style scoped>
.reference-tree {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 1rem;
  overflow: hidden;
}

.tree-controls {
  margin-bottom: 1rem;
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
}

.tree-wrapper {
  overflow-x: auto;
  padding-bottom: 1rem;
}

.tree-node {
  position: relative;
  padding: 0.5rem;
  text-align: center;
}

.node-content {
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.5rem;
  min-width: 120px;
  max-width: 200px;
  font-size: 0.9rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.node-content.is-question {
  border-left: 4px solid #3b82f6;
}

.node-content.is-result {
  border-left: 4px solid #22c55e;
  background: #f0fdf4;
}

.node-content.is-option {
  border: 1px dashed #94a3b8;
  background: transparent;
  box-shadow: none;
  min-width: auto;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  font-weight: bold;
  color: #475569;
}

.node-label :deep(p) {
  margin: 0;
}

.node-text {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #64748b;
  text-align: left;
}

.node-text :deep(p) {
  margin: 0;
}

.expand-handle {
  margin-top: 0.25rem;
}

.expand-btn {
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  line-height: 18px;
  text-align: center;
  cursor: pointer;
  font-size: 12px;
  color: #64748b;
}
</style>
