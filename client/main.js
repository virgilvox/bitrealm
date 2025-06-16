/**
 * @file Main Vue 3 application entry point
 * @description Bootstrap Vue app with Pinia store for bitrealm
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'

// Create Vue app
const app = createApp(App)

// Create and use Pinia store
const pinia = createPinia()
app.use(pinia)

// Mount app
app.mount('#app')