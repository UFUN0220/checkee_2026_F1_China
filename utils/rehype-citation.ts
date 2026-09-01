import * as nodeModule from 'node:module'
import { pathToFileURL } from 'node:url'

const require = nodeModule.createRequire(import.meta.url)
const userlandPunycodeUrl = pathToFileURL(require.resolve('punycode/punycode.js')).href

let hasRegisteredPunycodeRedirect = false
let rehypeCitationPromise: Promise<unknown> | undefined

function registerUserlandPunycodeRedirect() {
  if (hasRegisteredPunycodeRedirect) return

  // `registerHooks` was added after Node 20. Rehype Citation can use Node's
  // built-in punycode implementation on older runtimes, so the redirect is
  // optional rather than a module-load requirement.
  if (typeof nodeModule.registerHooks !== 'function') {
    hasRegisteredPunycodeRedirect = true
    return
  }

  nodeModule.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === 'punycode') {
        return {
          shortCircuit: true,
          url: userlandPunycodeUrl,
        }
      }

      return nextResolve(specifier, context)
    },
  })

  hasRegisteredPunycodeRedirect = true
}

async function loadRehypeCitation() {
  registerUserlandPunycodeRedirect()
  rehypeCitationPromise ??= import('rehype-citation').then((mod) => mod.default)
  return rehypeCitationPromise
}

export default function rehypeCitation(options: Record<string, unknown> = {}) {
  return async function transform(tree: unknown, file: unknown) {
    const plugin = (await loadRehypeCitation()) as (options: Record<string, unknown>) => unknown
    const transformer = plugin(options) as ((tree: unknown, file: unknown) => unknown) | undefined

    return transformer?.(tree, file)
  }
}
