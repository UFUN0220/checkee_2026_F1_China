import { createRequire, registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const userlandPunycodeUrl = pathToFileURL(require.resolve('punycode/punycode.js')).href

let hasRegisteredPunycodeRedirect = false
let rehypeCitationPromise: Promise<unknown> | undefined

function registerUserlandPunycodeRedirect() {
  if (hasRegisteredPunycodeRedirect) return

  registerHooks({
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
