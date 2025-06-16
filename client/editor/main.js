/**
 * @file Editor Vue 3 application entry point  
 * @description Bootstrap editor app with Pinia store and PixiJS integration
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import EditorApp from './EditorApp.vue'
import '../styles/main.css'
import './styles/editor.css'

// Create Vue app
const app = createApp(EditorApp)

// Create and use Pinia store
const pinia = createPinia()
app.use(pinia)

// Mount editor app
app.mount('#editor-app')