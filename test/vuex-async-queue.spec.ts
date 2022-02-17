import { expect } from 'chai'
import Vue from 'vue'
import { Store } from 'vuex'
import Vuex from 'vuex'
import VuexPersistence from '..'

Vue.use(Vuex)

class SaveWaiter {
  ready: Promise<void>
  done: Promise<void>
  resolveReady!: () => void
  resolveDone!: () => void

  constructor() {
    this.ready = new Promise((resolve) => { this.resolveReady = resolve })
    this.done = new Promise((resolve) => { this.resolveDone = resolve })
  }
}

const KEY = 'key'
const storage: Record<string, any> = {}
let saveWaiters: Array<SaveWaiter> = []
let saveCount = 0
const vuexPersist = new VuexPersistence({
  key: KEY,
  asyncStorage: true,
  restoreState: async (key) => storage[key],
  saveState: async (key, state) => {
    const saveWaiter = saveWaiters[saveCount]
    saveCount++

    await saveWaiter.ready
    storage[key] = state
    saveWaiter.resolveDone()
  }
})

const store = new Store<any>({
  state: {
    dog: {
      barks: 0
    },
    cat: {
      mews: 0
    }
  },
  mutations: {
    dogBark(state) {
      state.dog.barks++
    },
    catMew(state) {
      state.cat.mews++
    }
  },
  plugins: [vuexPersist.plugin]
})

// Wait for other promises to settle
async function settled() {
  return new Promise((resolve) => { setTimeout(resolve) })
}

describe('Storage: Custom/Async; Test: queue order', () => {
  beforeEach(() => {
    saveWaiters = [new SaveWaiter(), new SaveWaiter()]
    saveCount = 0
  })

  it('should wait for the previous save to finish before saving', async () => {
    store.commit('dogBark')
    store.commit('catMew')

    saveWaiters[1].resolveReady()
    await settled()
    expect(storage[KEY]).not.to.exist

    saveWaiters[0].resolveReady()
    await saveWaiters[0].done
    expect(storage[KEY]).to.deep.equal({ dog: { barks: 1 }, cat: { mews: 0 }})

    await saveWaiters[1].done
    expect(storage[KEY]).to.deep.equal({ dog: { barks: 1 }, cat: { mews: 1 }})
  })

  it('should let us join to wait for all saves to finish', async () => {
    store.commit('dogBark')
    store.commit('catMew')

    let done = false
    vuexPersist.flushWriteQueue().then(() => { done = true })

    saveWaiters[0].resolveReady()
    await saveWaiters[0].done
    await settled()

    expect(done).to.be.false

    saveWaiters[1].resolveReady()
    await saveWaiters[1].done
    await settled()

    expect(done).to.be.true
  })
})
