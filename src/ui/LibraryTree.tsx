import React, {memo} from 'react';
import {Box, Text} from 'ink';
import type {VisibleLibraryNode} from '../library/types.js';
import {theme} from '../theme/catppuccin.js';

type Props = {
  items: VisibleLibraryNode[];
  selectedIndex: number;
  expandedIds: Set<string>;
  scrollOffset: number;
  viewportHeight: number;
  playingTrackPath?: string;
};

function iconFor(item: VisibleLibraryNode, expandedIds: Set<string>, isPlaying: boolean): string {
  if (item.node.type === 'track') {
    return isPlaying ? '▶' : '♪';
  }

  return expandedIds.has(item.node.id) ? '▾' : '▸';
}

function LibraryTreeComponent({items, selectedIndex, expandedIds, scrollOffset, viewportHeight, playingTrackPath}: Props) {
  if (items.length === 0) {
    return <Text color={theme.muted}>No MP3/WAV files found.</Text>;
  }

  const visibleItems = items.slice(scrollOffset, scrollOffset + viewportHeight);

  return (
    <Box flexDirection="column" height={viewportHeight} overflow="hidden">
      {visibleItems.map((item, index) => {
        const absoluteIndex = scrollOffset + index;
        const selected = absoluteIndex === selectedIndex;
        const isPlaying = item.node.type === 'track' && item.node.path === playingTrackPath;
        const color = selected
          ? theme.accent
          : isPlaying
            ? theme.green
            : item.node.type === 'track'
              ? theme.text
              : theme.blue;

        return (
          <Text key={item.node.id} color={color} inverse={selected} bold={isPlaying} wrap="truncate-end">
            {'  '.repeat(item.depth)}{iconFor(item, expandedIds, isPlaying)} {item.node.name}
          </Text>
        );
      })}

      {visibleItems.length < viewportHeight && Array.from({length: viewportHeight - visibleItems.length}, (_, index) => (
        <Text key={`empty-${index}`}> </Text>
      ))}
    </Box>
  );
}

export const LibraryTree = memo(LibraryTreeComponent);
