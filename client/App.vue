<template>
  <div id="app">
    <!-- Header -->
    <AppHeader />

    <!-- Main Content -->
    <main>
      <!-- Hero Section -->
      <HeroSection />

      <!-- Featured Worlds -->
      <FeaturedWorlds />

      <!-- Features -->
      <FeaturesSection />

      <!-- CTA -->
      <CTASection />
    </main>

    <!-- Footer -->
    <AppFooter />
  </div>
</template>

<script>
/**
 * @file Main App component for bitrealm
 * @description Root Vue component containing the landing page layout
 */

import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import HeroSection from './components/HeroSection.vue'
import FeaturedWorlds from './components/FeaturedWorlds.vue'
import FeaturesSection from './components/FeaturesSection.vue'
import CTASection from './components/CTASection.vue'

export default {
  name: 'App',
  components: {
    AppHeader,
    AppFooter,
    HeroSection,
    FeaturedWorlds,
    FeaturesSection,
    CTASection
  }
}
</script>

<style>
/* Global app styles */
</style>