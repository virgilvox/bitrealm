/**
 * @file Worlds Pinia store
 * @description Manage worlds data and API interactions
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * @typedef {Object} World
 * @property {string} id - World unique identifier
 * @property {string} name - World name
 * @property {string} description - World description
 * @property {string} slug - URL-friendly world identifier
 * @property {string} author - World creator name
 * @property {string|null} thumbnail - World thumbnail URL
 * @property {number} playCount - Number of plays
 * @property {string[]} tags - World tags
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

export const useWorldsStore = defineStore('worlds', () => {
  // State
  const worlds = ref(/** @type {World[]} */ ([]))
  const loading = ref(false)
  const error = ref(/** @type {string|null} */ (null))
  const currentPage = ref(1)
  const hasMore = ref(true)

  /**
   * Fetch featured worlds from API
   * @returns {Promise<void>}
   */
  async function fetchFeaturedWorlds() {
    try {
      loading.value = true
      error.value = null
      
      const response = await fetch('/api/featured')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Combine trending and newest for featured display
      const featuredWorlds = [
        ...(data.trending || []),
        ...(data.newest || [])
      ]
      
      // Remove duplicates by id
      const uniqueWorlds = featuredWorlds.filter((world, index, self) => 
        index === self.findIndex(w => w.id === world.id)
      )
      
      worlds.value = uniqueWorlds.slice(0, 12) // Limit to 12 for featured
      
    } catch (err) {
      console.error('Error fetching featured worlds:', err)
      error.value = err.message
      // Set fallback data for development
      worlds.value = generateMockWorlds()
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch more worlds for pagination
   * @returns {Promise<void>}
   */
  async function fetchMoreWorlds() {
    if (!hasMore.value) return

    try {
      const nextPage = currentPage.value + 1
      const response = await fetch(`/api/worlds?page=${nextPage}&limit=12`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.worlds && data.worlds.length > 0) {
        worlds.value.push(...data.worlds)
        currentPage.value = nextPage
        hasMore.value = data.pagination.page < data.pagination.totalPages
      } else {
        hasMore.value = false
      }
      
    } catch (err) {
      console.error('Error fetching more worlds:', err)
      error.value = err.message
    }
  }

  /**
   * Search worlds
   * @param {string} searchTerm - Search query
   * @param {string[]} tags - Filter tags
   * @returns {Promise<void>}
   */
  async function searchWorlds(searchTerm = '', tags = []) {
    try {
      loading.value = true
      error.value = null
      
      const params = new URLSearchParams({
        search: searchTerm,
        tags: tags.join(','),
        page: '1',
        limit: '20'
      })
      
      const response = await fetch(`/api/worlds?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      worlds.value = data.worlds || []
      currentPage.value = 1
      hasMore.value = data.pagination.page < data.pagination.totalPages
      
    } catch (err) {
      console.error('Error searching worlds:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Get world by slug
   * @param {string} slug - World slug
   * @returns {Promise<World|null>}
   */
  async function getWorldBySlug(slug) {
    try {
      const response = await fetch(`/api/worlds/${slug}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (err) {
      console.error('Error fetching world:', err)
      return null
    }
  }

  /**
   * Generate mock worlds for development/fallback
   * @returns {World[]}
   */
  function generateMockWorlds() {
    return [
      {
        id: 'demo-1',
        name: 'Pixel Adventure',
        description: 'A classic 2D adventure world with quests and NPCs',
        slug: 'pixel-adventure',
        author: 'Demo Creator',
        thumbnail: null,
        playCount: 142,
        tags: ['adventure', 'rpg'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'demo-2', 
        name: 'Dungeon Explorer',
        description: 'Explore dangerous dungeons and collect treasure',
        slug: 'dungeon-explorer',
        author: 'Demo Creator',
        thumbnail: null,
        playCount: 89,
        tags: ['dungeon', 'exploration'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'demo-3',
        name: 'Village Life',
        description: 'Peaceful village simulation with crafting',
        slug: 'village-life',
        author: 'Demo Creator',
        thumbnail: null,
        playCount: 203,
        tags: ['simulation', 'peaceful'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }

  /**
   * Reset store state
   */
  function reset() {
    worlds.value = []
    loading.value = false
    error.value = null
    currentPage.value = 1
    hasMore.value = true
  }

  return {
    // State
    worlds,
    loading,
    error,
    currentPage,
    hasMore,
    
    // Actions
    fetchFeaturedWorlds,
    fetchMoreWorlds,
    searchWorlds,
    getWorldBySlug,
    reset
  }
})