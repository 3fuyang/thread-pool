import { availableParallelism } from 'node:os'
import { Worker } from 'node:worker_threads'

interface WorkerMeta {
  worker: Worker
  available: boolean
}

interface WorkerResWrapper<T> {
  workerId: number
  data: T
}

export class ThreadPool<P = any, R = unknown> {
  private static cpus = availableParallelism()
  private workers: WorkerMeta[] = []
  private taskQueue: Array<{
    handle: (value: WorkerResWrapper<R> | PromiseLike<WorkerResWrapper<R>>) => void
    taskData: P
  }> = []

  constructor(filename: string | URL, poolSize = ThreadPool.cpus) {
    if (poolSize > ThreadPool.cpus) {
      throw new Error('Pool size is greater than available CPUs')
    }
    for (const _i of Array.from({ length: poolSize })) {
      const optionalWorker = this.offloadToWorker(filename)

      if (optionalWorker) {
        this.workers.push({
          worker: optionalWorker,
          available: true,
        })
      }
    }
    console.log(`Created ${this.workers.length} worker threads\n`)
  }

  private offloadToWorker(filename: string | URL) {
    const worker = new Worker(filename)

    worker.on('message', async (val) => {
      const workerUnit = this.workers.find(({ worker: existedWorker }) => existedWorker === worker)
      if (!workerUnit) {
        throw new Error('Worker not found')
      }
      workerUnit.available = true
      const nextTask = this.taskQueue.shift()
      if (nextTask) {
        const { handle, taskData } = nextTask
        const resWrapper = await this.runTask(taskData)
        handle(resWrapper)
      }
    })

    return worker
  }

  public async runTask(task: P) {
    if (!this.workers.length) {
      throw new Error('No workers available')
    }
    const workerUnit = this.workers.find((worker) => worker.available)
    if (!workerUnit) {
      return new Promise<WorkerResWrapper<R>>((resolve) => {
        this.taskQueue.push({
          handle: resolve,
          taskData: task,
        })
      })
    }
    workerUnit.available = false
    workerUnit.worker.postMessage(task)
    return new Promise<WorkerResWrapper<R>>((resolve) => {
      const listener = (val: R) => {
        workerUnit.worker.off('message', listener)
        resolve({
          workerId: workerUnit.worker.threadId,
          data: val,
        })
      }
      workerUnit.worker.on('message', listener)
    })
  }

  public terminate() {
    for (const { worker } of this.workers) {
      worker.terminate()
    }
  }
}
