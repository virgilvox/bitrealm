<template>
  <header class="header">
    <div class="container">
      <div class="header-content">
        <div class="logo">
          <h1><span class="bit">bit</span><span class="realm">realm</span></h1>
          <p class="tagline">Browser-native MMORPG builder</p>
        </div>
        <nav class="nav">
          <a href="#worlds" class="nav-link">Browse Worlds</a>
          <a href="./editor/" class="nav-link">Create</a>
          <a href="#docs" class="nav-link">Docs</a>
          <a href="https://github.com/bitrealm/bitrealm" class="nav-link" target="_blank">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </nav>
      </div>
    </div>
  </header>
</template>

<script>
/**
 * @file AppHeader component
 * @description Main navigation header for bitrealm application
 */

export default {
  name: 'AppHeader'
}
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: bold;
}

.bit {
  color: #61dafb;
}

.realm {
  color: #ffd700;
}

.tagline {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.8;
}

.nav {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-link {
  color: white;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.2s;
}

.nav-link:hover {
  opacity: 0.8;
}
</style>