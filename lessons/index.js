// простой манифест; можно расширять
export const lessons = [
  {
    id: 'lesson1',
    title: 'Урок 1. Лексическое и грамматическое значение слов.',
    // ленивый импорт JSON (Vite это умеет)
    loader: () => import('./lesson1.json')
  },
  {
    id: 'lesson2', title: 'Урок 2. Окончание.',
    loader: () => import('./lesson2.json')
  },
  {
    id: 'lesson3', title: 'Урок 3. Формообразующие суффиксы и постфиксы.',
    loader: () => import('./lesson3.json')
  },
  {
    id: 'lesson4', title: 'Урок 4. Корень. Однокоренные слова.',
    loader: () => import('./lesson4.json')
  },
  {
    id: 'lesson5', title: 'Урок 5. Словообразовательные приставки и суффиксы. Как их найти и выделить?',
    loader: () => import('./lesson5.json')
  },
  {
    id: 'lesson6', title: 'Урок 6. Основообразующие суффиксы.',
    loader: () => import('./lesson6.json')
  },
  {
    id: 'lesson7', title: 'Урок 7. Способы словообразования. Аффиксальные. Слияние. Аббревиация. Семантика',
    loader: () => import('./lesson7.json')
  },
  {
    id: 'lesson8', title: 'Урок 8',
    loader: () => import('./lesson8.json')
  },
  {
    id: 'lesson9', title: 'Урок 9.',
    loader: () => import('./lesson9.json')
  },
  {
    id: 'lesson10', title: 'Урок 10.',
    loader: () => import('./lesson10.json')
  },
  {
    id: 'lesson11', title: 'Урок 11.',
    loader: () => import('./lesson11.json')
  },
  {
    id: 'lesson12', title: 'Урок 12.',
    loader: () => import('./lesson12.json')
  },
  {
    id: 'lesson13', title: 'Урок 13.',
    loader: () => import('./lesson13.json')
  },
  {
    id: 'lesson14', title: 'Урок 14.',
    loader: () => import('./lesson14.json')
  },
  {
    id: 'lesson15', title: 'Урок 15. Тест DragAndDrop',
    loader: () => import('./lesson15.json')
  },
  {
    id: 'lesson-pol',
    title: 'Урок 8. Правописание пол- и полу- (Новая механика)',
    isDecisionTree: true,
    ruleLoader: async () => {
      const data = await import('./graph.json')
      return (data.default || data).find(g => g.graphId === 'graph_pol_v1')
    },
    tasksLoader: async () => {
      const data = await import('./graph-task.json')
      return (data.default || data).filter(t => t.graphId === 'graph_pol_v1')
    }
  }
];
