#!/usr/bin/env node

/**
 * Papilles - Test de validation unitaire du Système Unifié d'Entrée d'Ingrédients
 * (Section 8 du Lexique Canonique : résolution, suggestions de synonymes, Passeport Ingrédient, rétroactivité)
 */

const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour le test du système unifié...');
  const tmpDir = path.join(__dirname, '../.tmp_test_unified_input');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/unifiedIngredientService.ts src/services/vocabularyService.ts src/services/storageService.ts src/utils/ingredientNormalizer.ts src/utils/allergenMatcher.ts src/utils/shoppingAggregator.ts src/utils/stockMatcher.ts src/data/canonicalVocabulary.ts src/data/initialRecipes.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Mock pour react-native dans l'environnement de test Node.js pur
  const ReactNativeMock = {
    Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
  };
  require.cache[require.resolve('react-native')] = {
    exports: ReactNativeMock,
  };

  // Configuration du mock AsyncStorage en mémoire
  const memoryStore = new Map();
  const AsyncStorageMock = {
    getItem: async (key) => memoryStore.get(key) || null,
    setItem: async (key, val) => {
      memoryStore.set(key, val);
      return null;
    },
    removeItem: async (key) => {
      memoryStore.delete(key);
      return null;
    },
    clear: async () => {
      memoryStore.clear();
      return null;
    },
  };

  require.cache[require.resolve('@react-native-async-storage/async-storage')] = {
    exports: { default: AsyncStorageMock, ...AsyncStorageMock },
  };

  const { VocabularyService } = require(path.join(tmpDir, 'services/vocabularyService.js'));
  const { StorageService } = require(path.join(tmpDir, 'services/storageService.js'));
  const { UnifiedIngredientService, frenchPhonetic } = require(path.join(tmpDir, 'services/unifiedIngredientService.js'));
  const { detectProbableAllergenFamily } = require(path.join(tmpDir, 'utils/allergenMatcher.js'));

  console.log('🧪 Lancement des tests stricts du Système Unifié d\'Entrée d\'Ingrédients (Section 8)...\n');

  // Initialisation du vocabulaire canonique
  await VocabularyService.getAll();

  // =========================================================================
  // TEST 1 : Résolution directe d'ingrédients reconnus (O(1)) et extraction
  // =========================================================================
  console.log('--- Test 1 : Résolution directe et extraction fluide ---');

  // Ingrédient canonique exact
  const res1 = UnifiedIngredientService.resolveRecognizedIngredient('Carotte');
  assert.strictEqual(res1.isRecognized, true, 'Carotte doit être reconnue');
  assert.strictEqual(res1.canonical.canonicalName, 'Carotte');
  assert.strictEqual(res1.canonical.id, 'ing_canon_carotte');
  console.log('✓ "Carotte" résolu directement vers ing_canon_carotte');

  // Synonyme répertorié
  const res2 = UnifiedIngredientService.resolveRecognizedIngredient('patates');
  assert.strictEqual(res2.isRecognized, true, 'patates doit être reconnu via les alias de Pomme de terre');
  assert.strictEqual(res2.canonical.canonicalName, 'Pomme de terre');
  console.log('✓ "patates" résolu vers Pomme de terre via ses alias');

  // Extraction quantité et unité incorporées
  const res3 = UnifiedIngredientService.resolveRecognizedIngredient('2 oignons blancs émincés');
  assert.strictEqual(res3.isRecognized, true);
  assert.strictEqual(res3.canonical.canonicalName, 'Oignon');
  assert.strictEqual(res3.extractedQuantity, '2');
  console.log('✓ "2 oignons blancs émincés" résolu vers Oignon avec quantité 2 extraite');

  // Ingrédient non répertorié
  const res4 = UnifiedIngredientService.resolveRecognizedIngredient('topinambour');
  assert.strictEqual(res4.isRecognized, false, 'topinambour ne doit pas être reconnu dans le seed');
  console.log('✓ "topinambour" correctement identifié comme non répertorié');

  // =========================================================================
  // TEST 2 : Suggestions de synonymes proches (Levenshtein, pluriels, racines)
  // =========================================================================
  console.log('\n--- Test 2 : Suggestions intelligentes de synonymes proches ---');

  // Faute de frappe légère (Levenshtein 1)
  const matchesTypo = UnifiedIngredientService.findClosestCanonicalMatches('tomattes', 3);
  assert.ok(matchesTypo.length > 0, 'tomattes doit suggérer Tomate');
  assert.strictEqual(matchesTypo[0].item.canonicalName, 'Tomate');
  console.log(`✓ "tomattes" suggère en premier "${matchesTypo[0].item.canonicalName}" (${matchesTypo[0].label})`);

  // Variante orthographique
  const matchesEchalote = UnifiedIngredientService.findClosestCanonicalMatches('echalotte', 3);
  assert.ok(matchesEchalote.length > 0);
  assert.strictEqual(matchesEchalote[0].item.canonicalName, 'Échalote');
  console.log(`✓ "echalotte" suggère en premier "${matchesEchalote[0].item.canonicalName}" (${matchesEchalote[0].label})`);

  // Déclinaison sémantique / famille
  const matchesFarine = UnifiedIngredientService.findClosestCanonicalMatches('farine de chataigne', 3);
  assert.ok(matchesFarine.length > 0);
  assert.strictEqual(matchesFarine[0].item.canonicalName, 'Farine');
  console.log(`✓ "farine de chataigne" suggère en premier "${matchesFarine[0].item.canonicalName}" (${matchesFarine[0].label})`);

  // Rapprochement phonétique ("voeu" -> "Veau")
  assert.strictEqual(frenchPhonetic('voeu'), frenchPhonetic('veau'), 'frenchPhonetic("voeu") doit égaler frenchPhonetic("veau")');
  const matchesVoeu = UnifiedIngredientService.findClosestCanonicalMatches('voeu', 3);
  assert.ok(matchesVoeu.length > 0, '"voeu" doit trouver une correspondance phonétique');
  assert.strictEqual(matchesVoeu[0].item.canonicalName, 'Veau');
  console.log(`✓ "voeu" suggère en premier "${matchesVoeu[0].item.canonicalName}" (${matchesVoeu[0].label})`);

  // Suggestions qualitatives pour le menu déroulant ("voeu" -> "Veau")
  const dropSuggestionsVoeu = UnifiedIngredientService.getQualitativeDropdownSuggestions('voeu', 5);
  const foundVeau = dropSuggestionsVoeu.find((s) => s.item.canonicalName === 'Veau');
  assert.ok(foundVeau, 'Le menu déroulant qualitatif doit inclure Veau pour "voeu"');
  assert.strictEqual(foundVeau.isFuzzySuggestion, true);
  console.log('✓ Le menu déroulant qualitatif propose "Veau" dès la saisie de "voeu"');

  // Terme sans rapport (sumac) -> aucun faux positif
  const matchesSumac = UnifiedIngredientService.findClosestCanonicalMatches('sumac', 3);
  assert.strictEqual(matchesSumac.length, 0, 'sumac ne doit pas avoir de faux rapprochement forcé');
  console.log('✓ "sumac" n\'impose aucun faux rapprochement avec un aliment existant');

  // =========================================================================
  // TEST 3 : Association d'un nouveau synonyme & Garde-fous (Section 8.3)
  // =========================================================================
  console.log('\n--- Test 3 : Association de synonyme et garde-fous stricts ---');

  // Association valide
  const addAliasRes = await UnifiedIngredientService.addAliasToCanonical(
    'ing_canon_pomme_de_terre',
    'bintje speciale'
  );
  assert.strictEqual(addAliasRes.success, true);
  assert.ok(addAliasRes.updated.aliases.includes('bintje speciale'));
  assert.ok(addAliasRes.updated.aliases.includes('bintje speciales')); // Pluriel généré
  console.log('✓ "bintje speciale" associé avec succès comme synonyme de Pomme de terre');

  // Vérification de résolution immédiate
  const resolveAlias = UnifiedIngredientService.resolveRecognizedIngredient('bintje speciale');
  assert.strictEqual(resolveAlias.isRecognized, true);
  assert.strictEqual(resolveAlias.canonical.id, 'ing_canon_pomme_de_terre');
  console.log('✓ "bintje speciale" résout désormais immédiatement vers Pomme de terre');

  // Rejet de terme générique interdit (FORBIDDEN_ISOLATED_ALIASES)
  const genericRes = await UnifiedIngredientService.addAliasToCanonical('ing_canon_pomme_de_terre', 'blanc');
  assert.strictEqual(genericRes.success, false);
  assert.ok(genericRes.error.includes('générique'));
  console.log('✓ Rejet strict d\'un terme générique isolé ("blanc") comme synonyme');

  // Rejet du vol de nom canonique d'un autre ingrédient
  const stealCanonRes = await UnifiedIngredientService.addAliasToCanonical('ing_canon_pomme_de_terre', 'Carotte');
  assert.strictEqual(stealCanonRes.success, false);
  assert.ok(stealCanonRes.error.includes('nom canonique officiel'));
  console.log('✓ Rejet strict du vol de nom canonique d\'un autre ingrédient ("Carotte")');

  // =========================================================================
  // TEST 4 : Validation stricte du Passeport Ingrédient (Section 8.3 & 8.4)
  // =========================================================================
  console.log('\n--- Test 4 : Validations bloquantes du Passeport Ingrédient ---');

  // Rejet nom vide ou trop court
  const valShort = UnifiedIngredientService.validateNewIngredient({
    canonicalName: 'a',
    defaultAisle: 'Épicerie & Condiments',
    isPantryStaple: false,
  });
  assert.strictEqual(valShort.valid, false);
  console.log('✓ Rejet d\'un nom trop court (< 3 caractères)');

  // Rejet nom avec quantités chiffrées
  const valNum = UnifiedIngredientService.validateNewIngredient({
    canonicalName: '200g de sumac',
    defaultAisle: 'Épicerie & Condiments',
    isPantryStaple: false,
  });
  assert.strictEqual(valNum.valid, false);
  assert.ok(valNum.error.includes('quantités'));
  console.log('✓ Rejet d\'un nom contenant des quantités chiffrées ("200g de sumac")');

  // Rejet doublon exact
  const valDup = UnifiedIngredientService.validateNewIngredient({
    canonicalName: 'Carotte',
    defaultAisle: 'Fruits & Légumes',
    isPantryStaple: false,
  });
  assert.strictEqual(valDup.valid, false);
  assert.ok(valDup.error.includes('existe déjà'));
  console.log('✓ Rejet d\'un doublon exact ("Carotte")');

  // Rejet conflit singulier/pluriel
  const valPlural = UnifiedIngredientService.validateNewIngredient({
    canonicalName: 'Carottes',
    defaultAisle: 'Fruits & Légumes',
    isPantryStaple: false,
  });
  assert.strictEqual(valPlural.valid, false);
  assert.ok(valPlural.error.includes('singulier / pluriel'));
  console.log('✓ Rejet d\'un conflit singulier/pluriel ("Carottes" vs "Carotte")');

  // =========================================================================
  // TEST 5 : Création qualifiée & Rétroactivité (Section 8.5)
  // =========================================================================
  console.log('\n--- Test 5 : Création d\'ingrédient & Synchronisation rétroactive ---');

  // Préparation de données non résolues dans AsyncStorage avant la création
  const existingRecipe = {
    id: 'rec_test_topinambour',
    title: 'Velouté d\'hiver',
    description: 'Une soupe réconfortante',
    category: 'plats',
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    difficulty: 'facile',
    ingredients: [
      { id: 'ing_topi_1', name: 'Topinambour', quantity: '500', unit: 'g' }, // canonicalId undefined !
    ],
    steps: ['Éplucher', 'Cuire'],
  };
  await StorageService.saveAllRecipes([existingRecipe]);

  const existingFridge = [
    { id: 'fridge_topi_1', name: 'Topinambour', aisle: 'Autre', createdAt: new Date().toISOString() }, // canonicalId undefined !
  ];
  await StorageService.saveFridgeItems(existingFridge);

  // Création officielle de "Topinambour"
  const createRes = await UnifiedIngredientService.registerNewCanonicalIngredient({
    canonicalName: 'Topinambour',
    defaultAisle: 'Fruits & Légumes',
    allergen: null, // aucun allergène
    isPantryStaple: false,
    aliases: ['topinambours'],
  });

  assert.strictEqual(createRes.success, true);
  assert.ok(createRes.ingredient.id.startsWith('ing_custom_topinambour'));
  assert.strictEqual(createRes.ingredient.isCustom, true);
  console.log(`✓ Nouvel ingrédient créé : "${createRes.ingredient.canonicalName}" (${createRes.ingredient.id})`);

  // Vérification de la rétroactivité immédiate (Section 8.5)
  const reloadedRecipes = await StorageService.getRecipes();
  const reloadedIng = reloadedRecipes[0].ingredients[0];
  assert.strictEqual(reloadedIng.canonicalId, createRes.ingredient.id, 'La recette doit être rétroactivement liée !');
  console.log('✓ Recette existante rétroactivement liée au nouvel identifiant canonique');

  const reloadedFridge = await StorageService.getFridgeItems();
  assert.strictEqual(reloadedFridge[0].canonicalId, createRes.ingredient.id, 'Le stock doit être rétroactivement lié !');
  assert.strictEqual(reloadedFridge[0].aisle, 'Fruits & Légumes', 'Le rayon du stock doit adopter le rayon canonique');
  console.log('✓ Stock existant rétroactivement lié et rayon mis à jour');

  // =========================================================================
  // TEST 6 : Détection des racines d'allergènes pour le pré-remplissage du Passeport
  // =========================================================================
  console.log('\n--- Test 6 : Détection des racines d\'allergènes pour le Passeport ---');

  const allLait = detectProbableAllergenFamily('sauce béchamel maison');
  assert.strictEqual(allLait, 'lait');
  console.log('✓ "sauce béchamel maison" -> détection automatique de l\'allergène lait');

  const allNoisette = detectProbableAllergenFamily('coulis de noisettes torréfiées');
  assert.strictEqual(allNoisette, 'fruits_a_coque');
  console.log('✓ "coulis de noisettes" -> détection automatique de l\'allergène fruits_a_coque');

  const fauxAmi = detectProbableAllergenFamily('lait de coco');
  assert.strictEqual(fauxAmi, null, 'Le lait de coco ne doit pas activer l\'allergène laitier');
  console.log('✓ Faux ami "lait de coco" -> aucun allergène laitier erroné');

  // =========================================================================
  // TEST 7 : Blocage strict des ingrédients non qualifiés en recette (Section 8)
  // =========================================================================
  console.log('\n--- Test 7 : Blocage strict des ingrédients non qualifiés en recette ---');

  // Simulation d'une saisie brute non cataloguée ("fenouil sauvage") sans sélection dans la liste
  const rawInput = 'fenouil sauvage';
  const resolutionBefore = UnifiedIngredientService.resolveRecognizedIngredient(rawInput);
  assert.strictEqual(resolutionBefore.isRecognized, false, 'Un terme brut inconnu ne doit pas être reconnu');

  // Une recette contenant ce terme brut sans canonicalId est interceptée
  const testRecipeIngredients = [
    { id: 'ing_1', name: 'Carotte', canonicalId: 'ing_canon_carotte' },
    { id: 'ing_2', name: rawInput, canonicalId: undefined },
  ];

  const uncatalogued = testRecipeIngredients.find(
    (i) => !i.canonicalId || !UnifiedIngredientService.resolveRecognizedIngredient(i.name).isRecognized
  );
  assert.ok(uncatalogued, 'L\'ingrédient non catalogué doit être intercepté avant sauvegarde');
  assert.strictEqual(uncatalogued.name, rawInput);
  console.log(`✓ Saisie brute "${rawInput}" correctement interceptée : sauvegarde bloquée tant qu'elle n'est pas qualifiée`);

  // Qualification du terme comme synonyme d'un ingrédient existant (ou création)
  const fenouilCanon =
    VocabularyService.getSyncList().find((c) => c.canonicalName === 'Fenouil') ||
    (await UnifiedIngredientService.registerNewCanonicalIngredient({
      canonicalName: 'Fenouil',
      defaultAisle: 'Fruits & Légumes',
      allergen: null,
      isPantryStaple: false,
    })).ingredient;

  await UnifiedIngredientService.addAliasToCanonical(fenouilCanon.id, rawInput);
  const resolutionAfter = UnifiedIngredientService.resolveRecognizedIngredient(rawInput);
  assert.strictEqual(resolutionAfter.isRecognized, true, 'Après qualification, le terme doit être reconnu');
  assert.strictEqual(resolutionAfter.canonical.id, fenouilCanon.id);
  console.log(`✓ Après qualification de "${rawInput}", la recette peut être enregistrée avec son canonicalId officiel`);

  // =========================================================================
  // TEST 8 : Fusion de lexique et déduplication automatique du stock (Scénario utilisateur Tomate / Tomato)
  // =========================================================================
  console.log('\n--- Test 8 : Fusion de lexique et déduplication automatique du stock ---');

  // 1. Trouver "Tomate" canonique
  const tomateCanon = VocabularyService.getSyncList().find((c) => c.normalizedName === 'tomate');
  assert.ok(tomateCanon, 'Tomate canonique doit exister');

  // 2. Créer un nouvel ingrédient "Tomato"
  const createdTomato = await UnifiedIngredientService.registerNewCanonicalIngredient({
    canonicalName: 'Tomato',
    defaultAisle: 'Fruits & Légumes',
    allergen: null,
    isPantryStaple: false,
  });
  const tomatoCanon = createdTomato.ingredient;
  assert.ok(tomatoCanon, 'Tomato canonique créé avec succès');

  // 3. Ajouter "Tomate" et "Tomato" au stock
  await StorageService.saveFridgeItems([
    {
      id: 'stock_tomate_1',
      name: 'Tomate',
      canonicalId: tomateCanon.id,
      aisle: 'fruits_legumes',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'stock_tomato_2',
      name: 'Tomato',
      canonicalId: tomatoCanon.id,
      aisle: 'fruits_legumes',
      createdAt: new Date().toISOString(),
    },
  ]);

  const initialStock = await StorageService.getFridgeItems();
  assert.strictEqual(initialStock.length, 2, 'Les 2 aliments distincts doivent être initialement en stock');
  console.log('✓ Stock initial : "Tomate" et "Tomato" présents en 2 entrées distinctes');

  // 4. Fusionner "Tomato" dans "Tomate"
  await VocabularyService.merge(tomatoCanon.id, tomateCanon.id);

  // 5. Vérifier le stock après fusion
  const stockAfterMerge = await StorageService.getFridgeItems();
  assert.strictEqual(stockAfterMerge.length, 1, 'Après fusion dans le lexique, le stock doit être dédupliqué à 1 seule entrée');
  assert.strictEqual(stockAfterMerge[0].canonicalId, tomateCanon.id);
  assert.strictEqual(stockAfterMerge[0].name, 'Tomate', 'L\'aliment restant doit avoir le nom canonique officiel "Tomate"');
  console.log('✓ Stock après fusion : Déduplication stricte réussie (1 seule entrée "Tomate" rattachée à Tomate)');

  console.log('\n🎉 TOUS LES TESTS DU SYSTÈME UNIFIÉ D\'ENTRÉE D\'INGRÉDIENTS ONT RÉUSSI (0 ERREUR) !');

  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  const tmpDir = path.join(__dirname, '../.tmp_test_unified_input');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  console.error('\n❌ Échec du test :', err);
  process.exit(1);
});
