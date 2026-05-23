import path from 'node:path';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Box, Text, useApp, useInput, useStdout} from 'ink';
import {scanLibrary} from './library/scanLibrary.js';
import type {LibraryNode, VisibleLibraryNode} from './library/types.js';
import {PlayerController} from './player/PlayerController.js';
import type {NowPlayingTrack, PlaybackSnapshot} from './player/types.js';
import {LibraryTree} from './ui/LibraryTree.js';
import {NowPlaying} from './ui/NowPlaying.js';
import {theme} from './theme/catppuccin.js';
import {extractWaveform} from './waveform/extractWaveform.js';
import type {WaveformExtraction, WaveformState} from './waveform/types.js';

const defaultLibraryRootInput = process.argv[2] ?? '~/Music/Crate';
const defaultLibraryRoot = expandHomePath(defaultLibraryRootInput);
const reservedLayoutRows = 14;
const minimumTreeRows = 4;

function expandHomePath(inputPath: string): string {
  if (inputPath === '~') {
    return process.env.HOME ?? inputPath;
  }

  if (inputPath.startsWith('~/')) {
    return path.join(process.env.HOME ?? '~', inputPath.slice(2));
  }

  return inputPath;
}

function flattenVisibleTree(root: LibraryNode | undefined, expandedIds: Set<string>): VisibleLibraryNode[] {
  if (!root) {
    return [];
  }

  const visible: VisibleLibraryNode[] = [];

  function visit(node: LibraryNode, depth: number) {
    visible.push({node, depth});

    if (node.type === 'folder' && expandedIds.has(node.id)) {
      for (const child of node.children ?? []) {
        visit(child, depth + 1);
      }
    }
  }

  visit(root, 0);
  return visible;
}

function findParentIndex(items: VisibleLibraryNode[], selectedIndex: number): number | undefined {
  const selectedItem = items[selectedIndex];
  if (!selectedItem || selectedItem.depth === 0) {
    return undefined;
  }

  for (let index = selectedIndex - 1; index >= 0; index -= 1) {
    if (items[index]?.depth === selectedItem.depth - 1) {
      return index;
    }
  }

  return undefined;
}

function deriveTrackMetadata(node: LibraryNode): NowPlayingTrack {
  const relativePath = path.relative(defaultLibraryRoot, node.path);
  const parts = relativePath.split(path.sep);
  const title = path.basename(node.name, path.extname(node.name));

  return {
    path: node.path,
    title,
    artist: parts[0],
    album: parts.length > 2 ? parts[1] : undefined,
  };
}

export function App() {
  const {exit} = useApp();
  const {stdout} = useStdout();
  const terminalRows = stdout.rows ?? 24;
  const viewportHeight = Math.max(minimumTreeRows, terminalRows - reservedLayoutRows);

  const [library, setLibrary] = useState<LibraryNode>();
  const [error, setError] = useState<string>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [player] = useState(() => new PlayerController());
  const [playback, setPlayback] = useState<PlaybackSnapshot>({state: 'idle'});
  const [waveform, setWaveform] = useState<WaveformState>({status: 'idle'});
  const visibleItemsRef = useRef<VisibleLibraryNode[]>([]);

  useEffect(() => player.subscribe(setPlayback), [player]);

  useEffect(() => {
    if (playback.state !== 'playing' || !playback.track) {
      setWaveform({status: 'idle'});
      return;
    }

    const trackPath = playback.track.path;
    const extraction: WaveformExtraction = extractWaveform(trackPath);
    let stale = false;

    setWaveform({status: 'loading', trackPath});

    extraction.promise
      .then(buckets => {
        if (!stale) {
          setWaveform({status: 'ready', trackPath, buckets});
        }
      })
      .catch(error => {
        if (!stale) {
          const errorWithCode = error as NodeJS.ErrnoException;
          const message = errorWithCode.code === 'ENOENT'
            ? 'ffmpeg not found'
            : error instanceof Error
              ? error.message
              : String(error);
          setWaveform({status: 'error', trackPath, message});
        }
      });

    return () => {
      stale = true;
      extraction.cancel();
    };
  }, [playback.state, playback.track?.path]);

  useEffect(() => {
    return () => {
      player.dispose();
    };
  }, [player]);

  useEffect(() => player.onNaturalEnd(endedTrack => {
    const items = visibleItemsRef.current;
    const endedIndex = items.findIndex(item => item.node.path === endedTrack.path);
    if (endedIndex === -1) {
      return;
    }

    const nextIndex = items.findIndex((item, index) => index > endedIndex && item.node.type === 'track');

    if (nextIndex === -1) {
      return;
    }

    const nextTrack = items[nextIndex]?.node;
    if (!nextTrack || nextTrack.type !== 'track') {
      return;
    }

    setSelectedIndex(nextIndex);
    player.play(deriveTrackMetadata(nextTrack));
  }), [player]);

  useEffect(() => {
    let cancelled = false;

    async function loadLibrary() {
      try {
        const scannedLibrary = await scanLibrary(defaultLibraryRoot);
        if (cancelled) {
          return;
        }

        setLibrary(scannedLibrary);
        setExpandedIds(new Set([scannedLibrary.id]));
        setSelectedIndex(0);
        setScrollOffset(0);
        setError(undefined);
      } catch (scanError) {
        if (!cancelled) {
          setError(scanError instanceof Error ? scanError.message : String(scanError));
        }
      }
    }

    void loadLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleItems = useMemo(
    () => flattenVisibleTree(library, expandedIds),
    [library, expandedIds],
  );

  useEffect(() => {
    visibleItemsRef.current = visibleItems;
  }, [visibleItems]);

  useEffect(() => {
    setSelectedIndex(index => Math.min(index, Math.max(visibleItems.length - 1, 0)));
  }, [visibleItems.length]);

  useEffect(() => {
    setScrollOffset(offset => {
      const maxOffset = Math.max(visibleItems.length - viewportHeight, 0);
      let nextOffset = Math.min(offset, maxOffset);

      if (selectedIndex < nextOffset) {
        nextOffset = selectedIndex;
      } else if (selectedIndex >= nextOffset + viewportHeight) {
        nextOffset = selectedIndex - viewportHeight + 1;
      }

      return Math.max(0, Math.min(nextOffset, maxOffset));
    });
  }, [selectedIndex, viewportHeight, visibleItems.length]);

  function playTrackAt(index: number): void {
    const track = visibleItems[index]?.node;
    if (!track || track.type !== 'track') {
      return;
    }

    setSelectedIndex(index);
    player.play(deriveTrackMetadata(track));
  }

  function findPlaybackBaseIndex(): number {
    if (playback.state === 'playing' && playback.track) {
      const playingIndex = visibleItems.findIndex(item => item.node.path === playback.track?.path);
      if (playingIndex !== -1) {
        return playingIndex;
      }
    }

    return selectedIndex;
  }

  function playAdjacentTrack(direction: 'previous' | 'next'): void {
    const baseIndex = findPlaybackBaseIndex();
    const step = direction === 'next' ? 1 : -1;

    for (let index = baseIndex + step; index >= 0 && index < visibleItems.length; index += step) {
      if (visibleItems[index]?.node.type === 'track') {
        playTrackAt(index);
        return;
      }
    }
  }

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      player.dispose();
      exit();
      return;
    }

    if (input === 's') {
      player.stop();
      return;
    }

    if (input === 'a') {
      playAdjacentTrack('previous');
      return;
    }

    if (input === 'd') {
      playAdjacentTrack('next');
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(index => Math.max(index - 1, 0));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex(index => Math.min(index + 1, Math.max(visibleItems.length - 1, 0)));
      return;
    }

    const selectedNode = visibleItems[selectedIndex]?.node;
    if (!selectedNode) {
      return;
    }

    if (key.return && selectedNode.type === 'track') {
      player.play(deriveTrackMetadata(selectedNode));
      return;
    }

    if (key.rightArrow && selectedNode.type === 'folder') {
      setExpandedIds(ids => new Set(ids).add(selectedNode.id));
      return;
    }

    if (key.leftArrow) {
      if (selectedNode.type === 'folder' && expandedIds.has(selectedNode.id)) {
        setExpandedIds(ids => {
          const next = new Set(ids);
          next.delete(selectedNode.id);
          return next;
        });
        return;
      }

      const parentIndex = findParentIndex(visibleItems, selectedIndex);
      if (parentIndex !== undefined) {
        setSelectedIndex(parentIndex);
      }
    }
  });

  const hasItemsAbove = scrollOffset > 0;
  const hasItemsBelow = scrollOffset + viewportHeight < visibleItems.length;
  const playingTrackPath = playback.state === 'playing' ? playback.track?.path : undefined;

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} height={terminalRows}>
      <Box marginBottom={1}>
        <Text color={theme.accent} bold>Crate</Text>
        <Text color={theme.muted}> — local terminal music player</Text>
      </Box>

      <Box borderStyle="round" borderColor={theme.muted} paddingX={1} paddingY={1} flexDirection="column">
        <Text color={theme.text}>Library root</Text>
        <Text color={theme.blue} wrap="truncate-end">{defaultLibraryRoot}</Text>
        <Box marginTop={1} flexDirection="row" height={viewportHeight}>
          <Box flexDirection="column" width="60%" height={viewportHeight}>
            {error ? (
              <Text color={theme.red}>Scanner error: {error}</Text>
            ) : library ? (
              <LibraryTree
                items={visibleItems}
                selectedIndex={selectedIndex}
                expandedIds={expandedIds}
                scrollOffset={scrollOffset}
                viewportHeight={viewportHeight}
                playingTrackPath={playingTrackPath}
              />
            ) : (
              <Text color={theme.muted}>Scanning library…</Text>
            )}
          </Box>
          <Box borderStyle="single" borderColor={theme.muted} width="40%" height={viewportHeight}>
            <NowPlaying playback={playback} waveform={waveform} />
          </Box>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.muted} wrap="truncate-end">
          ↑/↓ move · ←/→ collapse/parent · a prev · d next · enter play · s stop · q quit · {selectedIndex + 1}/{visibleItems.length || 1}
          {hasItemsAbove ? ' · ↑ more' : ''}{hasItemsBelow ? ' · ↓ more' : ''}
        </Text>
      </Box>
    </Box>
  );
}
