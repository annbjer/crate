export type LibraryNodeType = 'folder' | 'track';

export type LibraryNode = {
  id: string;
  name: string;
  path: string;
  type: LibraryNodeType;
  children?: LibraryNode[];
};

export type VisibleLibraryNode = {
  node: LibraryNode;
  depth: number;
};
