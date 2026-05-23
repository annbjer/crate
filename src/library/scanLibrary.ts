import {readdir, realpath} from 'node:fs/promises';
import path from 'node:path';
import type {LibraryNode} from './types.js';
import {sortLibraryNodes} from './sort.js';

const supportedAudioExtensions = new Set(['.mp3', '.wav']);
const ignoredNames = new Set([
  '.DS_Store',
  '.git',
  'node_modules',
  'Thumbs.db',
  'desktop.ini',
]);

function isHiddenOrIgnored(name: string): boolean {
  return name.startsWith('.') || ignoredNames.has(name);
}

function isSupportedAudioFile(name: string): boolean {
  return supportedAudioExtensions.has(path.extname(name).toLowerCase());
}

async function scanDirectory(directoryPath: string, rootRealPath: string): Promise<LibraryNode[]> {
  const entries = await readdir(directoryPath, {withFileTypes: true});
  const nodes: LibraryNode[] = [];

  for (const entry of entries) {
    if (isHiddenOrIgnored(entry.name)) {
      continue;
    }

    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      const children = await scanDirectory(entryPath, rootRealPath);
      if (children.length > 0) {
        nodes.push({
          id: entryPath,
          name: entry.name,
          path: entryPath,
          type: 'folder',
          children,
        });
      }
      continue;
    }

    if (entry.isFile() && isSupportedAudioFile(entry.name)) {
      nodes.push({
        id: entryPath,
        name: entry.name,
        path: entryPath,
        type: 'track',
      });
    }
  }

  return sortLibraryNodes(nodes);
}

export async function scanLibrary(libraryRoot: string): Promise<LibraryNode> {
  const rootRealPath = await realpath(libraryRoot);
  const children = await scanDirectory(rootRealPath, rootRealPath);

  return {
    id: rootRealPath,
    name: path.basename(rootRealPath),
    path: rootRealPath,
    type: 'folder',
    children,
  };
}
