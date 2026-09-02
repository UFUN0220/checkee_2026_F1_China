import type { Parent } from 'unist'
import type { VFile } from 'vfile'
import type { YAML } from 'mdast'
import { visit } from 'unist-util-visit'
import * as yaml from 'js-yaml'

/**
 * Extracts frontmatter from markdown file and adds it to the file's data object.
 *
 */
export function remarkExtractFrontmatter() {
  return (tree: Parent, file: VFile) => {
    visit(tree, 'yaml', (node: YAML) => {
      file.data.frontmatter = yaml.load(String(node.value))
    })
  }
}
