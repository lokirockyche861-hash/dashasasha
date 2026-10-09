<template>
  <div class="table-container">
    <table 
      class="custom-table" 
      :class="{ 
        'with-borders': node.content.borders !== false,
        'striped': node.content.striped !== false,
        'has-headers': hasHeaders
      }"
      :style="tableStyles"
    >
      <!-- Заголовки таблицы (если есть) -->
      <thead v-if="hasHeaders">
        <tr>
          <th 
            v-for="(header, index) in node.content.headers" 
            :key="index"
            :colspan="getColspan(header)"
            :rowspan="getRowspan(header)"
            :style="getHeaderStyle(header, index)"
          >
            <div v-html="renderContent(header)" class="cell-content"></div>
          </th>
        </tr>
      </thead>
      
      <!-- Тело таблицы -->
      <tbody>
        <tr 
          v-for="(row, rowIndex) in node.content.rows" 
          :key="rowIndex"
          :class="{ 'header-row': !hasHeaders && rowIndex === 0 }"
        >
          <td 
            v-for="(cell, cellIndex) in row" 
            :key="cellIndex"
            :colspan="getColspan(cell)"
            :rowspan="getRowspan(cell)"
            :style="getCellStyle(cell, cellIndex)"
          >
            <div v-html="renderContent(cell)" class="cell-content"></div>
          </td>
        </tr>
      </tbody>
    </table>
    
    <!-- Описание под таблицей -->
    <div v-if="node.content.caption" class="table-caption">
      {{ node.content.caption }}
    </div>
  </div>
</template>

<script>
import MarkdownIt from 'markdown-it'

export default {
  name: 'Table',
  props: {
    node: {
      type: Object,
      required: true
    }
  },
  computed: {
    hasHeaders() {
      return this.node.content.headers && 
             this.node.content.headers.some(header => {
               const content = typeof header === 'string' ? header : header?.content
               return content && content.trim() !== ''
             })
    },
    tableStyles() {
      const styles = {}
      
      if (this.node.content.width) {
        styles.width = typeof this.node.content.width === 'number' 
          ? `${this.node.content.width}px` 
          : this.node.content.width
      }
      
      return styles
    }
  },
  methods: {
    renderContent(content) {
      if (typeof content === 'string') {
        return content
      }
      
      if (content?.content) {
        if (content.markdown) {
          const md = new MarkdownIt({
            html: true,
            linkify: true,
            breaks: true,
          })
          return md.render(content.content)
        }
        return content.content
      }
      
      return ''
    },
    
    getColspan(item) {
      if (typeof item === 'object' && item.colspan) {
        return item.colspan
      }
      return 1
    },
    
    getRowspan(item) {
      if (typeof item === 'object' && item.rowspan) {
        return item.rowspan
      }
      return 1
    },
    
    getHeaderStyle(header, index) {
      const style = {}
      const config = typeof header === 'object' ? header : { content: header }
      
      // Выравнивание
      style.textAlign = config.align || 'center'
      
      // Отступы
      style.padding = config.padding || this.node.content.cellPadding || '12px 16px'
      
      // Ширина столбца
      if (this.node.content.columnWidths && this.node.content.columnWidths[index]) {
        const width = this.node.content.columnWidths[index]
        style.width = typeof width === 'number' ? `${width}px` : width
      }
      
      // Стиль шрифта
      if (config.fontWeight) style.fontWeight = config.fontWeight
      if (config.fontSize) style.fontSize = typeof config.fontSize === 'number' 
        ? `${config.fontSize}px` 
        : config.fontSize
      
      return style
    },
    
    getCellStyle(cell, index) {
      const style = {}
      const config = typeof cell === 'object' ? cell : { content: cell }
      
      // Выравнивание
      style.textAlign = config.align || 'left'
      
      // Отступы
      style.padding = config.padding || this.node.content.cellPadding || '10px 14px'
      
      // Ширина столбца
      if (this.node.content.columnWidths && this.node.content.columnWidths[index]) {
        const width = this.node.content.columnWidths[index]
        style.width = typeof width === 'number' ? `${width}px` : width
      }
      
      return style
    }
  }
}
</script>

<style scoped>
.table-container {
  width: 100%;
  overflow-x: auto;
  margin: 24px 0;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.4;
}

/* Таблица с границами */
.custom-table.with-borders {
  border: 1px solid #dee2e6;
}

.custom-table.with-borders th,
.custom-table.with-borders td {
  border: 1px solid #dee2e6;
}

/* Стили для заголовков */
.custom-table.has-headers th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #495057;
}

/* Чередование цветов строк */
.custom-table.striped tbody tr:nth-child(even) {
  background-color: #f8f9fa;
}

.custom-table.striped tbody tr:nth-child(odd) {
  background-color: #ffffff;
}

/* Стиль для первой строки, если заголовков нет */
.custom-table tbody tr.header-row {
  background-color: #f8f9fa;
  font-weight: bold;
}

/* Стили для ячеек */
.cell-content {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .table-container {
    font-size: 12px;
  }
  
  .custom-table {
    font-size: 12px;
  }
}

/* Стили для Markdown контента */
.table-container :deep(strong) {
  font-weight: bold;
}

.table-container :deep(em) {
  font-style: italic;
}

.table-container :deep(code) {
  font-family: 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}

.table-container :deep(a) {
  color: #007bff;
  text-decoration: underline;
}

/* Подпись таблицы */
.table-caption {
  margin-top: 8px;
  font-size: 0.9em;
  color: #6c757d;
  text-align: center;
  font-style: italic;
}
</style>