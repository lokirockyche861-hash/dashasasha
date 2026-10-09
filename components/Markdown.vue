<template>
  <div class="markdown-content" v-html="renderedMarkdown"></div>
</template>

<script>
import MarkdownIt from 'markdown-it'

export default {
  name: 'Markdown',
  props: {
    node: {
      type: Object,
      required: true
    }
  },
  computed: {
    renderedMarkdown() {
      if (!this.node.content) return '';
      
      const md = new MarkdownIt({
        html: true, // Разрешить HTML-теги
        linkify: true, // Автоматически преобразовывать URL в ссылки
        breaks: true, // Преобразовывать переносы строк в <br>
        typographer: true, // Улучшенная типографика
      });
      
      // Добавляем поддержку чекбоксов для списков задач
      md.renderer.rules.checkbox = (tokens, idx) => {
        const token = tokens[idx];
        const checked = token.attrs && token.attrs.some(attr => attr[0] === 'checked');
        return `<input type="checkbox" ${checked ? 'checked' : ''} disabled>`;
      };
      
      return md.render(this.node.content);
    }
  }
}
</script>

<style scoped>
.markdown-content {
  margin: 1em 0;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 1.5em 0 0.5em 0;
  font-weight: bold;
}

.markdown-content :deep(h1) { font-size: 2em; }
.markdown-content :deep(h2) { font-size: 1.5em; }
.markdown-content :deep(h3) { font-size: 1.25em; }
.markdown-content :deep(h4) { font-size: 1.1em; }
.markdown-content :deep(h5) { font-size: 1em; }
.markdown-content :deep(h6) { font-size: 0.9em; color: #666; }

.markdown-content :deep(strong) {
  font-weight: bold;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 1em;
  margin-left: 0;
  color: #666;
  font-style: italic;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 1em 0;
  padding-left: 2em;
}

.markdown-content :deep(li) {
  margin: 0.5em 0;
}

.markdown-content :deep(code) {
  font-family: 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background-color: #f5f5f5;
  padding: 1em;
  overflow: auto;
  border-radius: 5px;
  margin: 1em 0;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-content :deep(a) {
  color: #0066cc;
  text-decoration: underline;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 2px solid #ddd;
  margin: 2em 0;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: #f5f5f5;
  font-weight: bold;
}

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 1em 0;
}

.markdown-content :deep(input[type="checkbox"]) {
  margin-right: 0.5em;
}
</style>