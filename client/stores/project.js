import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProjectStore = defineStore('project', () => {
  const currentProject = ref(null)

  function setProject(project) {
    currentProject.value = project
  }

  return { currentProject, setProject }
}) 