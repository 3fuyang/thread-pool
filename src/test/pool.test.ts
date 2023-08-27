import { describe, expect, test } from 'vitest'

import { ThreadPool } from '../index.js'

describe('Thread pool', () => {
  test('basic', async () => {
    const pool = new ThreadPool<number, number>(new URL('../worker.mjs', import.meta.url))

    const tasks = Array
      .from(
        { length: 10 },
        (_, index) => pool
          .runTask(index)
          .then(({ data }) => ({
            index,
            data,
          }))
      )
    
    for await (const { data, index } of tasks) {
      expect(data).toBe(index + 1)
    }

    pool.terminate()
  }, 15000)
})
