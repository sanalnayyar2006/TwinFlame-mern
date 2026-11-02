import { MongoMemoryServer } from 'mongodb-memory-server'
import type { TestProject } from 'vitest/node'

// One throwaway mongod for the whole run; each test file uses its own database on it.
// Locally, MONGOMS_SYSTEM_BINARY=$(which mongod) skips the one-time binary download.
let mongo: MongoMemoryServer

export async function setup(project: TestProject) {
  mongo = await MongoMemoryServer.create()
  project.provide('mongoUri', mongo.getUri())
}

export async function teardown() {
  await mongo?.stop()
}

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string
  }
}
