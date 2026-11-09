#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation de l'intégration Chef IA dans le menu d'ajout et de HomeScreen
 * Vérifie :
 * 1. Suppression complète de la grande carte ChefAiWidget du flux HomeScreen.
 * 2. Intégration de l'option "Chef IA" (sparkles, "3 idées de recettes") dans le menu d'ajout (+).
 * 3. Suppression stricte de stockActiveBanner.
 * 4. Gestion correcte des tags dans le bandeau de filtres actifs.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Lancement des tests de l’intégration Chef IA et de HomeScreen...');

const homeScreenPath = path.join(__dirname, '../src/screens/HomeScreen.tsx');
const homeContent = fs.readFileSync(homeScreenPath, 'utf8');

// 1. Suppression stricte de stockActiveBanner
if (homeContent.includes('stockActiveBanner')) {
  console.error('❌ Échec attendu : stockActiveBanner est toujours présent dans HomeScreen.tsx');
  process.exit(1);
}

// 2. Vérification que la grande carte ChefAiWidget est complètement retirée du flux
assert.strictEqual(
  homeContent.includes('<ChefAiWidget'),
  false,
  'HomeScreen ne doit plus afficher la grande carte ChefAiWidget'
);
assert.strictEqual(
  homeContent.includes('import { ChefAiWidget }'),
  false,
  'HomeScreen ne doit plus importer ChefAiWidget'
);

// 3. Vérification de l’intégration du Chef IA dans le menu d’ajout (+)
assert.ok(
  homeContent.includes('sparkles') &&
    homeContent.includes('Chef IA') &&
    homeContent.includes('3 idées de recettes') &&
    homeContent.includes('openFreshStockModal'),
  'Le menu d’ajout (+) doit proposer l’option Chef IA avec l’icône sparkles et la description 3 idées de recettes'
);

// 4. Vérification de la prise en compte des tags dans le bandeau des filtres actifs
assert.ok(
  homeContent.includes('selectedTags.length > 0') &&
    homeContent.includes('advancedFiltersActiveBanner'),
  'Le bandeau advancedFiltersActiveBanner doit s’ouvrir avec selectedTags'
);

// 5. Vérification du format épuré des tags (nom sans préfixe "Tags (au choix) : ")
assert.strictEqual(
  homeContent.includes("tagMatchMode === 'all' ? 'Tags (tous) : ' : 'Tags (au choix) : '"),
  false,
  'Le bandeau ne doit plus afficher le préfixe Tags (au choix) : mais juste le nom du tag'
);

// 6. Vérification que le composant carte orphelin n'existe plus
const widgetPath = path.join(__dirname, '../src/components/home-widgets/ChefAiWidget.tsx');
assert.strictEqual(
  fs.existsSync(widgetPath),
  false,
  'Le fichier ChefAiWidget.tsx doit être supprimé car remplacé par l’option du menu d’ajout'
);

console.log('✅ Intégration Chef IA dans le menu d’ajout (+) et nettoyage HomeScreen validés.');
console.log('🎉 Tous les tests sont passés avec succès !');
