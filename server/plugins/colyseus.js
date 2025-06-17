import { monitor } from '@colyseus/monitor'
import { playground } from '@colyseus/playground'
import fp from 'fastify-plugin'

async function colyseusPlugin(fastify, options) {
  const { gameServer } = options

  if (!gameServer) {
    throw new Error('gameServer instance is required for colyseus-plugin')
  }

  // Register monitor
  fastify.register(monitor, { server: gameServer })

  // Register playground
  fastify.register(playground)
}

export default fp(colyseusPlugin) 