<template>
  <section class="cta">
    <div class="container">
      <div class="cta-content">
        <h2>Ready to build your world?</h2>
        <p>Join thousands of creators building the next generation of MMORPGs.</p>
        <div class="cta-actions">
          <a href="./editor/" class="btn btn-primary btn-large">Start Creating</a>
          <a href="#docs" class="btn btn-outline btn-large">View Documentation</a>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'CTASection'
}
</script>

<style scoped>
.cta {
  padding: 4rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.cta-content {
  text-align: center;
}

.cta-content h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.cta-content p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 1rem 2rem;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-outline {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.btn:hover {
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .cta-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>