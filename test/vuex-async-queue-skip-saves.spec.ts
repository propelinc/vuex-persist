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
  },
  skipIntermediateSaves: true
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

describe('Storage: Custom/Async; Test: skipIntermediateSaves', () => {
  beforeEach(() => {
    store.state.dog.barks = 0
    store.state.cat.mews = 0
    saveWaiters = [new SaveWaiter(), new SaveWaiter()]
    saveCount = 0
  })

  it('should only run one save if a batch are queued up', async () => {
      store.commit('dogBark')
      store.commit('dogBark')
      store.commit('dogBark')
      store.commit('catMew')

      saveWaiters[0].resolveReady()
      await vuexPersist.flushWriteQueue()
      expect(saveCount).to.equal(1)
      expect(storage[KEY]).to.deep.equal({ dog: { barks: 3 }, cat: { mews: 1 }})
  })

  it('should skip intermediate saves if multiple are queued up', async () => {
      store.commit('dogBark')
      await settled()

      store.commit('dogBark')
      store.commit('dogBark')
      store.commit('catMew')

      saveWaiters[0].resolveReady()
      await saveWaiters[0].done
      expect(storage[KEY]).to.deep.equal({ dog: { barks: 1 }, cat: { mews: 0 }})

      saveWaiters[1].resolveReady()
      await vuexPersist.flushWriteQueue()
      expect(saveCount).to.equal(2)
      expect(storage[KEY]).to.deep.equal({ dog: { barks: 3 }, cat: { mews: 1 }})
  })
})
