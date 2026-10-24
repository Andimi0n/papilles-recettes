const vocabList = [];
for (let i = 0; i < 1000; i++) {
  vocabList.push({ id: `id_${i}`, defaultAisle: `aisle_${i}` });
}

const parsedFridge = [];
for (let i = 0; i < 10000; i++) {
  parsedFridge.push({ canonicalId: `id_${Math.floor(Math.random() * 1000)}` });
}

console.time('find');
for (const item of parsedFridge) {
  const canonDef = vocabList.find(v => v.id === item.canonicalId);
}
console.timeEnd('find');

console.time('map');
const vocabMap = new Map(vocabList.map(v => [v.id, v]));
for (const item of parsedFridge) {
  const canonDef = vocabMap.get(item.canonicalId);
}
console.timeEnd('map');
