import deepmerge from 'deepmerge'
import { toRaw } from 'vue'

export type MergeOptionType = 'replaceArrays' | 'concatArrays'

export function deepToRaw(value: any): any {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const raw = toRaw(value);
  // NOTE(ram): Preserve special object types that localForage can serialize.
  if (raw instanceof Date || raw instanceof Blob || raw instanceof ArrayBuffer) {
    return raw;
  }
  if (Array.isArray(raw)) {
    return raw.map(deepToRaw);
  }
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, deepToRaw(v)]));
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
  // @ts-ignore
  return deepmerge(into, deepToRaw(from), options[mergeOption])
}
