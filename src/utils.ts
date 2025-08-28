import deepmerge from 'deepmerge'
import { toRaw } from 'vue'

export type MergeOptionType = 'replaceArrays' | 'concatArrays'

function deepToRaw(value: any[]): any[] {
  if (Array.isArray(value)) {
    return toRaw(value).map(deepToRaw);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, value]) => ([key, deepToRaw(value)])))
  }
  return value;
}

const options: {[k in MergeOptionType]: deepmerge.Options} = {
  replaceArrays: {
    arrayMerge: (destinationArray, sourceArray, options) => deepToRaw(sourceArray)
  },
  concatArrays: {
    arrayMerge: (target, source, options) => target.concat(...source)
  }
}

const defaultMergeOptions: deepmerge.Options = {
  // replacing arrays
  
}

export function merge<I, F>(into: Partial<I>, from: Partial<F>, mergeOption: MergeOptionType): I & F & {} {
  return deepmerge(into, deepToRaw(from), options[mergeOption])
}
