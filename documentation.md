# Cache Memory Mapping Analyzer — Code Documentation

## Project Overview

This is a web-based educational simulator for cache memory mapping techniques used in Computer Organization and Architecture (COA). It allows students to configure cache parameters, run simulations, and compare the performance of three mapping techniques: Direct Mapping, Fully Associative Mapping, and Set Associative Mapping.

The project is split across 7 files:

| File | Role |
|---|---|
| `index.html` | Input/configuration page |
| `simulation.html` | Step-by-step simulation page |
| `stats.html` | Performance statistics and comparison page |
| `cache-engine.js` | Core simulation logic shared across all pages |
| `script.js` | Input validation and navigation logic for index.html |
| `simulation.js` | Step-by-step rendering logic for simulation.html |
| `stats.js` | Statistics rendering and chart logic for stats.html |

Data flows between pages using `sessionStorage` — the config object is saved on the input page and read by the simulation and stats pages.

---

## User Inputs — What They Mean and Why They Matter

### 1. Mapping Technique (dropdown)

**Options:** Compare All / Direct Mapping / Fully Associative / Set Associative

**Idea:** This selects which cache mapping algorithm to simulate. Each technique has a different strategy for deciding where a memory block gets placed in the cache.

- **Direct Mapping** — each block has exactly one fixed cache line it can go into. Simple and fast, but can cause conflicts.
- **Fully Associative** — a block can go into any cache line. Most flexible, but hardware cost is high.
- **Set Associative** — a middle ground. Cache is divided into sets; a block maps to a specific set but can go into any line within that set.
- **Compare All** — runs all three techniques on the same input and shows a side-by-side comparison.

---

### 2. Cache Size (blocks)

**Input type:** Positive integer (default: 4)

**Idea:** This defines how many blocks the cache can hold at one time. A larger cache means more data can be stored, reducing misses. A smaller cache fills up faster and causes more evictions.

**Example:** Cache Size = 4 means the cache holds 4 memory blocks simultaneously.

**Used in:**
- Direct Mapping: determines the number of cache lines → `index = block % cacheSize`
- Fully Associative: maximum number of blocks before eviction starts
- Set Associative: total capacity divided across sets → `ways = cacheSize / numSets`

---

### 3. Block Size (bytes)

**Input type:** Positive integer (default: 1)

**Idea:** Defines how many bytes make up one cache block. When a memory address is accessed, it gets converted to a block number first:

```
block number = floor(address / blockSize)
```

A block size of 1 means each address is its own block. A block size of 4 means addresses 0–3 all belong to block 0, addresses 4–7 belong to block 1, and so on. This models spatial locality — loading one address brings nearby addresses into cache too.

**Example:** Block Size = 4, address = 9 → block = floor(9/4) = 2

---

### 4. Number of Sets (Set Associative only)

**Input type:** Positive integer, must be ≤ Cache Size (default: 2)

**Idea:** Only relevant for Set Associative mapping. Divides the cache into N sets. Each set holds `cacheSize / numSets` lines (called "ways").

The set a block maps to is determined by:
```
set index = block number % numSets
```

**Example:** Cache Size = 4, Sets = 2 → 2 sets, each with 2 ways.
- Block 0 → Set 0, Block 1 → Set 1, Block 2 → Set 0, Block 3 → Set 1

More sets = more like Direct Mapping. Fewer sets = more like Fully Associative.

---

### 5. Hit Time (cycles)

**Input type:** Positive integer (default: 1)

**Idea:** The number of CPU clock cycles needed to retrieve data when it is found in the cache (a cache hit). This is always a small number because cache is fast memory located close to the CPU.

Typical real-world values: 1–4 cycles for L1 cache.

**Used in AMAT formula:**
```
AMAT = Hit Time + (Miss Rate × Miss Penalty)
```

---

### 6. Miss Penalty (cycles)

**Input type:** Positive integer (default: 10)

**Idea:** The additional cycles added when data is NOT in the cache (a cache miss) and must be fetched from main memory. Main memory is much slower than cache, so this value is significantly larger than Hit Time.

Typical real-world values: 50–200 cycles for DRAM access.

**Effect:** A high miss penalty makes cache misses very expensive. This is why reducing the miss rate (by choosing a better mapping technique) directly improves performance.

**Used in AMAT formula:**
```
AMAT = Hit Time + (Miss Rate × Miss Penalty)
```

**Example:** Hit Time = 1, Miss Penalty = 10, Miss Rate = 50%
→ AMAT = 1 + (0.5 × 10) = 6 cycles

---

### 7. Memory Access Sequence (comma-separated)

**Input type:** Comma-separated integers (default: `4,7,6,1,7,6,1,2,7,2,3`)

**Idea:** This is the list of memory addresses the CPU requests, in order. The simulator processes each address one by one, checks whether it's in the cache, and records a hit or miss.

Each address is first converted to a block number using the block size. The simulation then applies the selected mapping technique to determine which cache line the block goes into.

**Example:** Sequence = `4,7,6,1` with Block Size = 1
- Access 4 → block 4 → check cache → MISS (cache empty) → load block 4
- Access 7 → block 7 → check cache → MISS → load block 7
- Access 6 → block 6 → check cache → MISS → load block 6
- Access 1 → block 1 → check cache → MISS → load block 1

If 7 appears again later and is still in cache → HIT.

---

## Function Reference

### cache-engine.js

#### `simulate(technique, cfg)`

**Purpose:** Central dispatcher. Takes a technique name and config object, runs the appropriate simulation, and returns a complete result object.

**Parameters:**
- `technique` — `'direct'`, `'fully'`, or `'set'`
- `cfg` — object containing `{ cacheSize, blockSize, numSets, hitTime, missPenalty, sequence }`

**What it does:**
1. Converts raw addresses to block numbers: `block = floor(address / blockSize)`
2. Calls the appropriate simulation function
3. Counts hits and misses from the returned steps
4. Calculates hit ratio, miss rate, and AMAT
5. Returns `{ steps, hits, misses, hitRatio, missRate, amat }`

---

#### `simulateDirect(blocks, cacheSize, hitTime, missPenalty)`

**Purpose:** Simulates Direct Mapping.

**Core idea:** Every block has exactly one cache line it can occupy, determined by:
```
index = block % cacheSize
```

**Logic per access:**
- Calculate the cache line index
- If `cache[index] === block` → HIT (block already there)
- If not → MISS, overwrite `cache[index]` with the new block

**Returns:** Array of step objects, each containing the step number, block address, cache line index, hit/miss result, a snapshot of the full cache state, and access time.

---

#### `simulateFully(blocks, cacheSize, hitTime, missPenalty)`

**Purpose:** Simulates Fully Associative Mapping with LRU replacement.

**Core idea:** Any block can go into any cache line. The cache is treated as an ordered list where the front is the Least Recently Used (LRU) item.

**Logic per access:**
- Search the entire cache for the block
- If found → HIT. Move it to the end of the list (mark as most recently used)
- If not found → MISS. If cache is full, evict the front item (LRU). Add new block to the end.

**Returns:** Same step object structure as Direct Mapping, but `index` is `null` (no fixed line).

---

#### `simulateSet(blocks, cacheSize, numSets, hitTime, missPenalty)`

**Purpose:** Simulates Set Associative Mapping with LRU replacement within each set.

**Core idea:** Cache is divided into `numSets` sets. Each set holds `cacheSize / numSets` ways. A block maps to a specific set, but can occupy any way within that set.

```
set index = block % numSets
ways = cacheSize / numSets
```

**Logic per access:**
- Determine which set the block belongs to
- Search only that set for the block
- If found → HIT. Apply LRU reorder within the set.
- If not found → MISS. If the set is full, evict the LRU item from that set. Add new block.

**Returns:** Step objects with `isSetAssoc: true`, `index` = set index, and `cacheSnapshot` as a 2D array (array of sets, each containing their blocks).

---

### script.js

#### `toggleTheme()`

**Purpose:** Switches the UI between dark and light mode. Saves the preference to `sessionStorage` so it persists across all pages.

---

#### `toggleSetInput()`

**Purpose:** Shows or hides the "Number of Sets" input field based on the selected mapping technique. It only makes sense to show this field when "Set Associative" or "Compare All" is selected.

---

#### `goSimulation()`

**Purpose:** Validates all user inputs, packages them into a config object, saves it to `sessionStorage`, and navigates to `simulation.html`.

**Validation rules:**
- Cache size must be ≥ 1
- Block size must be ≥ 1
- Access sequence must contain at least one valid integer
- Number of sets must be ≥ 1 and ≤ cache size (when applicable)

If any validation fails, an error message is shown inline and navigation is blocked.

---

#### `resetForm()`

**Purpose:** Resets all input fields back to their default demo values and clears any error messages.

---

### simulation.js

#### `init()` (IIFE)

**Purpose:** Runs automatically when the page loads. Reads the config from `sessionStorage`, runs the simulation for the selected technique (defaults to Direct Mapping for "Compare All"), and sets up the initial empty cache grid.

---

#### `nextStep()` / `prevStep()`

**Purpose:** Advance or go back one step in the simulation. Each call increments or decrements `currentStep` and re-renders the table and cache grid up to that point.

---

#### `runAllSteps()`

**Purpose:** Jumps directly to the final step, showing the complete simulation table and the final cache state in one go.

---

#### `render()`

**Purpose:** Core rendering function. Rebuilds the step table from scratch up to `currentStep`, updates the cache grid visualization, and scrolls the latest row into view.

---

#### `appendRow(step, isLatest)`

**Purpose:** Creates and appends a single table row for a simulation step. The latest row gets a subtle green or red background highlight depending on hit/miss. Displays block address, cache line/set info, full cache state string, and a colored HIT/MISS badge.

---

#### `renderEmptyGrid()`

**Purpose:** Renders the initial cache grid with all lines showing "—" (empty). Called on page load before any steps are processed.

---

#### `renderGridFromStep(step)`

**Purpose:** Renders the cache grid reflecting the state after a specific step. The active block's cell is highlighted green (hit) or red (miss). For Set Associative, renders one sub-grid per set with way labels.

---

### stats.js

#### `init()` (IIFE)

**Purpose:** Runs on page load. Reads config from `sessionStorage`. If mapping is "Compare All", runs all three simulations and renders both the stats cards and the comparison table with chart. Otherwise runs only the selected technique.

---

#### `renderStats(result, label)`

**Purpose:** Renders the summary stat cards showing: Technique name, Total Accesses, Hits, Misses, Hit Ratio, Miss Rate, and AMAT.

---

#### `renderComparison(results)`

**Purpose:** Builds the side-by-side comparison table for all three techniques and calls `renderChart()` with the data.

---

#### `renderChart(rows)`

**Purpose:** Renders a grouped bar chart using Chart.js comparing Hit Ratio (%) and AMAT across all three techniques. Destroys any existing chart instance before creating a new one. Adapts colors to the current dark/light theme.

---

## Output Metrics Explained

| Metric | Formula | Meaning |
|---|---|---|
| Hits | counted per step | Number of accesses where block was already in cache |
| Misses | counted per step | Number of accesses where block had to be loaded |
| Hit Ratio | hits / total | Fraction of accesses that were hits (higher = better) |
| Miss Rate | misses / total | Fraction of accesses that were misses (lower = better) |
| AMAT | Hit Time + Miss Rate × Miss Penalty | Average cycles per memory access (lower = better) |

---

## Data Flow Summary

```
index.html
  └── User fills inputs
  └── goSimulation() validates and saves to sessionStorage
        └── { cacheSize, blockSize, numSets, hitTime, missPenalty, mapping, sequence }

simulation.html
  └── Reads sessionStorage → runs simulate() from cache-engine.js
  └── Displays step-by-step table + cache grid visualization
  └── "View Stats" button → navigates to stats.html

stats.html
  └── Reads sessionStorage → runs simulate() for 1 or all 3 techniques
  └── Renders stat cards + comparison table + Chart.js bar graph
```
