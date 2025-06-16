<template>
  <section class="features">
    <div class="container">
      <h2 class="section-title">Everything you need to build MMORPGs</h2>
      <div class="features-grid">
        <div class="feature-card" v-for="feature in features" :key="feature.title">
          <div class="feature-icon">{{ feature.icon }}</div>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
/**
 * @file FeaturesSection component
 * @description Display key features of bitrealm
 */

export default {
  name: 'FeaturesSection',
  setup() {
    const features = [
      {
        icon: '🎨',
        title: 'Visual Map Editor',
        description: 'Multi-layer PixiJS painter with tiles, objects, and collision detection. Real-time collaborative editing.'
      },
      {
        icon: '⚡',
        title: 'Live Scripting',
        description: 'Custom DSL with JavaScript blocks. Hot-reload changes instantly without kicking players.'
      },
      {
        icon: '👥',
        title: 'Multiplayer Ready',
        description: 'Built on Colyseus. Auto-scaling rooms, presence system, and real-time synchronization.'
      },
      {
        icon: '🎭',
        title: 'Rich NPCs & Quests',
        description: 'Dialogue trees, quest system, and AI behaviors. Create engaging storylines and characters.'
      },
      {
        icon: '🔧',
        title: 'Plugin System',
        description: 'Extensible architecture with hot-loadable plugins. Marketplace for community extensions.'
      },
      {
        icon: '📱',
        title: 'Publish Anywhere',
        description: 'Export to web, desktop, or mobile. Self-hosting with Docker. Custom domains supported.'
      }
    ]

    return { features }
  }
}
</script>

<style scoped>
.features {
  padding: 4rem 0;
  background: #f7fafc;
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

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #2d3748;
}

.feature-card p {
  color: #4a5568;
  line-height: 1.6;
}
</style>