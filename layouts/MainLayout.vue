<template>
  <div class="main-layout">
    <header class="main-header">
      <h1>Тренажёр Даши и Саши</h1>
    </header>
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.main-layout {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-header {
  background: #f8fafc;
  padding: 1rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: center;
}

.main-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #0f172a;
}

.main-content {
  flex: 1;
  width: 100%;
}
</style>
