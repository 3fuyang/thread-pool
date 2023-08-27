import { availableParallelism } from 'node:os'

import { ThreadPool } from './index.js'

const pool = new ThreadPool<number, number>(new URL('./worker.ts', import.meta.url))

const tasks = Array.from({ length: 1e3 }).map((_, i) => 
  pool.runTask(i)
)

for await (const res of tasks) {
  console.log(`Worker ${res.workerId} Result: ${res.data}`)
}

pool.terminate()
