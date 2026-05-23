import type {LibraryNode} from './types.js';

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export function sortLibraryNodes(nodes: LibraryNode[]): LibraryNode[] {
  return [...nodes]
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }

      return collator.compare(a.name, b.name);
    })
    .map(node => ({
      ...node,
      children: node.children ? sortLibraryNodes(node.children) : undefined,
    }));
}
