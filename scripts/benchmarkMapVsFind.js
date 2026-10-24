const { performance } = require('perf_hooks');

const VOCAB_SIZE = 1000;
const LIST_SIZE = 5000;

// Create dummy vocab list
const vocabList = Array.from({ length: VOCAB_SIZE }, (_, i) => ({
  id: `id_${i}`,
  defaultAisle: 'produits_frais'
}));

// Create dummy parsed list
const parsedShopping = Array.from({ length: LIST_SIZE }, (_, i) => ({
  name: `item_${i}`,
  canonicalId: `id_${i % VOCAB_SIZE}`,
  aisle: null
}));

function baseline() {
  const start = performance.now();
  const updatedShopping = parsedShopping.map((item) => {
    const res = { canonicalId: item.canonicalId }; // mock normalize
    const canonDef = res.canonicalId ? vocabList.find((v) => v.id === res.canonicalId) : undefined;
    return canonDef?.defaultAisle;
  });
  const end = performance.now();
  return end - start;
}

function optimized() {
  const start = performance.now();
  const vocabMap = new Map(vocabList.map(v => [v.id, v]));
  const updatedShopping = parsedShopping.map((item) => {
    const res = { canonicalId: item.canonicalId }; // mock normalize
    const canonDef = res.canonicalId ? vocabMap.get(res.canonicalId) : undefined;
    return canonDef?.defaultAisle;
  });
  const end = performance.now();
  return end - start;
}

// Warm up
baseline();
optimized();

let baseTime = 0;
let optTime = 0;
const iterations = 100;
for (let i = 0; i < iterations; i++) {
  baseTime += baseline();
  optTime += optimized();
}

console.log(`Baseline (O(N) find): ${(baseTime / iterations).toFixed(2)}ms`);
console.log(`Optimized (O(1) map): ${(optTime / iterations).toFixed(2)}ms`);
console.log(`Improvement: ${((baseTime - optTime) / baseTime * 100).toFixed(2)}% faster`);
