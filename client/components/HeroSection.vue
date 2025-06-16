<template>
  <section class="hero">
    <div class="container">
      <div class="hero-content">
        <h1 class="hero-title">Create multiplayer worlds in your browser</h1>
        <p class="hero-subtitle">
          Build, script, and publish MMORPGs with no downloads required. 
          Collaborative editing, visual scripting, and instant multiplayer testing.
        </p>
        <div class="hero-actions">
          <a href="./editor/" class="btn btn-primary btn-large">Start Building</a>
          <a href="#featured-worlds" class="btn btn-secondary btn-large">Play Worlds</a>
        </div>
      </div>
      <div class="hero-preview">
        <div class="preview-window">
          <div class="preview-header">
            <div class="preview-controls">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
            </div>
            <span class="preview-title">bitrealm Editor</span>
          </div>
          <div class="preview-content">
            <div class="demo-placeholder">
              <div class="grid-pattern"></div>
              <div class="demo-character"></div>
              <div class="demo-npc"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
/**
 * @file HeroSection component
 * @description Main hero section with CTA and preview
 */

export default {
  name: 'HeroSection'
}
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 4rem 0;
  min-height: 70vh;
  display: flex;
  align-items: center;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.hero-title {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #2d3748;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: #4a5568;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s;
  display: inline-block;
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

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.preview-window {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.preview-header {
  background: #f7fafc;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.preview-controls {
  display: flex;
  gap: 0.5rem;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.red { background: #ff5f56; }
.dot.yellow { background: #ffbd2e; }
.dot.green { background: #27ca3f; }

.preview-title {
  font-weight: 600;
  color: #4a5568;
}

.preview-content {
  height: 300px;
  background: #f7fafc;
  position: relative;
  overflow: hidden;
}

.demo-placeholder {
  width: 100%;
  height: 100%;
  position: relative;
}

.grid-pattern {
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(79, 172, 254, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79, 172, 254, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
}

.demo-character {
  position: absolute;
  top: 50%;
  left: 30%;
  width: 16px;
  height: 16px;
  background: #4299e1;
  border-radius: 2px;
  animation: bounce 2s infinite;
}

.demo-npc {
  position: absolute;
  top: 30%;
  right: 30%;
  width: 16px;
  height: 16px;
  background: #ed8936;
  border-radius: 2px;
}

@keyframes bounce {
  0%, 100% { transform: translate(-50%, -50%); }
  50% { transform: translate(-50%, -60%); }
}

@media (max-width: 768px) {
  .container {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-actions {
    flex-direction: column;
  }
}
</style>