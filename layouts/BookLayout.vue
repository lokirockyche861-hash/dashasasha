<template>
  <div class="book-layout">
    <div class="book-container">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.book-layout {
  width: 100%;
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  justify-content: center;
}

.book-container {
  width: 100%;
  max-width: 800px;
  padding: 2rem;
  background: #ffffff;
}
</style>
