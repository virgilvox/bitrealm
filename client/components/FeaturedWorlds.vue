<template>
  <section id="featured-worlds" class="featured-worlds">
    <div class="container">
      <h2 class="section-title">Featured Worlds</h2>
      <div class="worlds-grid">
        <div v-if="loading" class="world-card loading" v-for="n in 6" :key="n">
          <div class="world-thumbnail skeleton"></div>
          <div class="world-info">
            <div class="world-title skeleton"></div>
            <div class="world-description skeleton"></div>
            <div class="world-meta skeleton"></div>
          </div>
        </div>
        
        <div v-else-if="worlds.length" class="world-card" v-for="world in worlds" :key="world.id">
          <div class="world-thumbnail">
            <img v-if="world.thumbnail" :src="world.thumbnail" :alt="world.name" />
            <div v-else class="placeholder-thumbnail">🎮</div>
          </div>
          <div class="world-info">
            <h3 class="world-title">{{ world.name }}</h3>
            <p class="world-description">{{ world.description }}</p>
            <div class="world-meta">
              <span class="author">by {{ world.author }}</span>
              <span class="players">{{ world.playCount }} plays</span>
            </div>
            <button @click="playWorld(world)" class="play-btn">Play Now</button>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>No worlds available yet. Be the first to create one!</p>
          <a href="./editor/" class="btn btn-primary">Create World</a>
        </div>
      </div>
      
      <div v-if="!loading && worlds.length" class="load-more">
        <button @click="loadMore" class="btn btn-secondary" :disabled="loadingMore">
          {{ loadingMore ? 'Loading...' : 'Load More Worlds' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script>
/**
 * @file FeaturedWorlds component
 * @description Display and manage featured public worlds
 */

import { ref, onMounted } from 'vue'
import { useWorldsStore } from '../stores/worlds'

export default {
  name: 'FeaturedWorlds',
  setup() {
    const worldsStore = useWorldsStore()
    const loading = ref(true)
    const loadingMore = ref(false)

    /**
     * Load initial worlds on component mount
     */
    onMounted(async () => {
      try {
        await worldsStore.fetchFeaturedWorlds()
      } catch (error) {
        console.error('Error loading featured worlds:', error)
      } finally {
        loading.value = false
      }
    })

    /**
     * Load more worlds
     */
    const loadMore = async () => {
      if (loadingMore.value) return
      
      loadingMore.value = true
      try {
        await worldsStore.fetchMoreWorlds()
      } catch (error) {
        console.error('Error loading more worlds:', error)
      } finally {
        loadingMore.value = false
      }
    }

    /**
     * Navigate to play a world
     * @param {Object} world - World object
     */
    const playWorld = (world) => {
      window.open(`/play/${world.slug}`, '_blank')
    }

    return {
      worlds: worldsStore.worlds,
      loading,
      loadingMore,
      loadMore,
      playWorld
    }
  }
}
</script>

<style scoped>
.featured-worlds {
  padding: 4rem 0;
  background: white;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
  color: #2d3748;
}

.worlds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.world-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.world-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.world-thumbnail {
  height: 200px;
  background: #f7fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.world-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-thumbnail {
  font-size: 3rem;
  color: #a0aec0;
}

.world-info {
  padding: 1.5rem;
}

.world-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #2d3748;
}

.world-description {
  color: #4a5568;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.world-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #718096;
}

.play-btn {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.play-btn:hover {
  opacity: 0.9;
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.skeleton.world-title {
  height: 1.5rem;
  margin-bottom: 0.5rem;
}

.skeleton.world-description {
  height: 1rem;
  margin-bottom: 1rem;
}

.skeleton.world-meta {
  height: 1rem;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: #718096;
}

.load-more {
  text-align: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s;
  display: inline-block;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>