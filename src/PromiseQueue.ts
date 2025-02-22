type Task = () => Promise<void>

export interface PromiseQueue {
  enqueue(task: Task): void
  flushQueue(): Promise<void>
}

export class SimplePromiseQueue implements PromiseQueue {
  private readonly _queue: Task[] = []
  private _flusher: Promise<void> | null = null

  public enqueue(task: Task) {
    this._queue.push(task)
    this.flushQueue()
  }

  public async flushQueue(): Promise<void> {
    if (!this._flusher) {
      this._flusher = this._startQueueFlush()
    }
    await this._flusher
  }

  private async _startQueueFlush(): Promise<void> {
    while (this._queue.length) {
      const nextTask = this._queue.shift()!
      await nextTask()
    }
    this._flusher = null
  }
}

/**
 * A "queue" that only executes the current task and the most recently
 * enqueued task. If a new task arrives while there is a task queued up,
 * the new task replaces the previous task.
 */
export class SingleTaskPromiseQueue {
  private _task: Task | null = null
  private _flusher: Promise<void> | null = null

  public enqueue(task: Task) {
    this._task = task
    this.flushQueue()
  }

  public async flushQueue(): Promise<void> {
    if (!this._flusher) {
      this._flusher = this._startQueueFlush()
    }
    await this._flusher
  }

  private async _startQueueFlush(): Promise<void> {
    // Defer execution to the end of the JS microtask queue. This way if we
    // receive a bunch of Tasks, execution will not start until the last
    // Task is received. This means that the Task is never executed
    // immediately after enqueue is called.
    //
    // Specifically, this optimizes the case where a bunch of mutations are
    // made to the store. In this case the plugin is triggered for each
    // mutation, but only one saveState call is executed after all the
    // mutations are received.
    //
    // https://stackoverflow.com/questions/25915634/difference-between-microtask-and-macrotask-within-an-event-loop-context/25933985#25933985
    await Promise.resolve()

    while (this._task) {
      const task = this._task
      this._task = null
      await task()
    }
    this._flusher = null
  }
}
