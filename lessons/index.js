// простой манифест; можно расширять
export const lessons = [
  {
    id: 'lesson1',
    title: 'Урок 1. Лексическое и грамматическое значение слов.',
    topicId: 'morphemics',
    // ленивый импорт JSON (Vite это умеет)
    loader: () => import('./lesson1.json')
  },
  {
    id: 'lesson2',
    title: 'Урок 2. Окончание',
    topicId: 'morphemics',
    loader: () => import('./lesson2.json')
  },
  {
    id: 'lesson3',
    title: 'Урок 3. Формообразующие суффиксы и постфиксы',
    topicId: 'morphemics',
    loader: () => import('./lesson3.json')
  },
  {
    id: 'lesson4',
    title: 'Урок 4. Корень. Однокоренные слова.',
    topicId: 'morphemics',
    loader: () => import('./lesson4.json')
  },
  {
    id: 'lesson5',
    title: 'Урок 5. Словообразовательные приставки и суффиксы. Как их найти и выделить?',
    topicId: 'morphemics',
    loader: () => import('./lesson5.json')
  },
  {
    id: 'lesson6',
    title: 'Урок 6. Основообразующие суффиксы.',
    topicId: 'morphemics',
    loader: () => import('./lesson6.json')
  },
  {
    id: 'lesson7',
    title: 'Урок 7. Способы словообразования',
    topicId: 'morphemics',
    loader: () => import('./lesson7.json')
  },
  {
    id: 'lesson8',
    title: 'Урок 1. Русский алфавит',
    topicId: 'phonetics',
    loader: () => import('./lesson8.json')
  },
  {
    id: 'lesson9',
    title: 'Урок 2. Звуки речи. Гласные и согласные звуки и буквы',
    topicId: 'phonetics',
    loader: () => import('./lesson9.json')
  },
  {
    id: 'lesson10',
    title: 'Урок 3. Согласные звуки. Глухие и звонкие',
    topicId: 'phonetics',
    loader: () => import('./lesson10.json')
  },
  {
    id: 'lesson11',
    title: 'Урок 4. Согласные звуки. Мягкие и твёрдые согласные звуки',
    topicId: 'phonetics',
    loader: () => import('./lesson11.json')
  },
  {
    id: 'lesson12',
    title: 'Урок 5. Сильная и слабая позиция согласных',
    topicId: 'phonetics',
    loader: () => import('./lesson12.json')
  },
  {
    id: 'lesson13',
    title: 'Урок 6. Ударные и безударные гласные звуки. Сильная и слабая позиции гласных',
    topicId: 'phonetics',
    loader: () => import('./lesson13.json')
  },
  {
    id: 'lesson14',
    title: 'Урок 7. Транскрипция',
    topicId: 'phonetics',
    loader: () => import('./lesson14.json')
  },
  {
    id: 'lesson-sh-ts-mid',
    title: 'Урок 1. Ь после шипящих и Ц в середине слова',
    topicId: 'phonetics',
    isDecisionTree: true,
    loader: () => import('./practice/lesson-sh-ts-mid.json'),
    ruleLoader: async () => {
      const data = await import('./practice/lesson-sh-ts-mid.json')
      return data.default?.rule || data.rule
    },
    tasksLoader: async () => {
      const data = await import('./practice/lesson-sh-ts-mid.json')
      return data.default?.tasks || data.tasks
    },
    theoryLoader: async () => {
      const data = await import('./practice/lesson-sh-ts-mid.json')
      return data.default?.theory || data.theory
    }
  },
  {
    id: 'lesson-soft-hard',
    title: 'Урок 2. Разделительные Ъ и Ь',
    topicId: 'phonetics',
    isDecisionTree: true,
    loader: () => import('./practice/lesson-soft-hard.json'),
    ruleLoader: async () => {
      const data = await import('./practice/lesson-soft-hard.json')
      return data.default?.rule || data.rule
    },
    tasksLoader: async () => {
      const data = await import('./practice/lesson-soft-hard.json')
      return data.default?.tasks || data.tasks
    },
    theoryLoader: async () => {
      const data = await import('./practice/lesson-soft-hard.json')
      return data.default?.theory || data.theory
    }
  },
  {
    id: 'lesson-pol',
    title: 'Урок 14. Правописание пол- и полу-',
    topicId: 'morphemics',
    isDecisionTree: true,
    loader: () => import('./practice/lesson-pol.json'),
    ruleLoader: async () => {
      const data = await import('./practice/lesson-pol.json')
      return data.default?.rule || data.rule
    },
    tasksLoader: async () => {
      const data = await import('./practice/lesson-pol.json')
      return data.default?.tasks || data.tasks
    },
    theoryLoader: async () => {
      const data = await import('./practice/lesson-pol.json')
      return data.default?.theory || data.theory
    }
  }
];

