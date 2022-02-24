// tslint:disable: variable-name
export default class SimplePromiseQueue {
  private readonly _queue: Array<() => Promise<void>> = []
  private _runner: Promise<void> | null = null

  public enqueue(task: () => Promise<void>) {
    this._queue.push(task)
    this.flushQueue()
  }

  public async flushQueue(): Promise<void> {
    const runner = async () => {
      while (this._queue.length) {
        const nextTask = this._queue.shift()!
        await nextTask()
      }
      this._runner = null
    }

    if (this._runner) {
      return await this._runner
    }
    this._runner = runner()
    await this._runner
  }
}
