import { parentPort } from 'node:worker_threads'

async function incrementWithDelay(val: number, delay = 500) {
  await sleep(delay)
  return val + 1
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

parentPort?.on('message', async (val) => {
  const res = await incrementWithDelay(val)
  parentPort?.postMessage(res)
})
