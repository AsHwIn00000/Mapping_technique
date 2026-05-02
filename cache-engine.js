/**
 * cache-engine.js
 * Shared simulation logic — loaded by all pages.
 */

// ─── Core Dispatcher ──────────────────────────────────────────────────────────
function simulate(technique, cfg) {
  const { cacheSize, numSets, hitTime, missPenalty, sequence, blockSize } = cfg;
  const blocks = sequence.map(addr => Math.floor(addr / blockSize));

  let steps = [];
  if (technique === 'direct') {
    steps = simulateDirect(blocks, cacheSize, hitTime, missPenalty);
  } else if (technique === 'fully') {
    steps = simulateFully(blocks, cacheSize, hitTime, missPenalty);
  } else if (technique === 'set') {
    steps = simulateSet(blocks, cacheSize, numSets, hitTime, missPenalty);
  }

  let hits = 0, misses = 0;
  steps.forEach(s => { if (s.hit) hits++; else misses++; });

  const total = hits + misses;
  const hitRatio = total ? hits / total : 0;
  const missRate = total ? misses / total : 0;
  const amat = hitTime + missRate * missPenalty;

  return { steps, hits, misses, hitRatio, missRate, amat };
}

// ─── Direct Mapping ───────────────────────────────────────────────────────────
// index = block % numCacheLines
function simulateDirect(blocks, cacheSize, hitTime, missPenalty) {
  const cache = new Array(cacheSize).fill(null);
  return blocks.map((block, i) => {
    const index = block % cacheSize;
    const hit = cache[index] === block;
    if (!hit) cache[index] = block;
    return { step: i + 1, address: block, index, hit, cacheSnapshot: [...cache],
             accessTime: hit ? hitTime : hitTime + missPenalty };
  });
}

// ─── Fully Associative Mapping ────────────────────────────────────────────────
// Any block → any line, LRU replacement
function simulateFully(blocks, cacheSize, hitTime, missPenalty) {
  let cache = [];
  return blocks.map((block, i) => {
    const idx = cache.indexOf(block);
    const hit = idx !== -1;
    if (hit) {
      cache.splice(idx, 1);
      cache.push(block); // LRU: move to most-recent end
    } else {
      if (cache.length >= cacheSize) cache.shift(); // evict LRU
      cache.push(block);
    }
    return { step: i + 1, address: block, index: null, hit, cacheSnapshot: [...cache],
             accessTime: hit ? hitTime : hitTime + missPenalty };
  });
}

// ─── Set Associative Mapping ──────────────────────────────────────────────────
// set_index = block % numSets, LRU within each set
function simulateSet(blocks, cacheSize, numSets, hitTime, missPenalty) {
  const ways = Math.floor(cacheSize / numSets);
  const sets = Array.from({ length: numSets }, () => []);
  return blocks.map((block, i) => {
    const setIdx = block % numSets;
    const set = sets[setIdx];
    const pos = set.indexOf(block);
    const hit = pos !== -1;
    if (hit) {
      set.splice(pos, 1);
      set.push(block); // LRU reorder
    } else {
      if (set.length >= ways) set.shift();
      set.push(block);
    }
    return { step: i + 1, address: block, index: setIdx, hit,
             cacheSnapshot: sets.map(s => [...s]),
             isSetAssoc: true, numSets, ways,
             accessTime: hit ? hitTime : hitTime + missPenalty };
  });
}
