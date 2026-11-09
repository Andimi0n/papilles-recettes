#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation de ChefAiWidget et du nettoyage de HomeScreen
 * Vérifie :
 * 1. Épuration de ChefAiWidget.tsx : sous-titre fixe, plus de props stock/doable ni de fonctions d'aperçu de stock.
 * 2. Suppression stricte de stockActiveBanner et non-envoi de stockCount/stockItems/doableCount à ChefAiWidget dans HomeScreen.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Lancement des tests de ChefAiWidget et de HomeScreen...');

// 1. Vérification dans HomeScreen.tsx : stockActiveBanner doit être SUPPRIMÉ
const homeScreenPath = path.join(__dirname, '../src/screens/HomeScreen.tsx');
const homeContent = fs.readFileSync(homeScreenPath, 'utf8');

if (homeContent.includes('stockActiveBanner')) {
  console.error('❌ Échec attendu : stockActiveBanner est toujours présent dans HomeScreen.tsx');
  process.exit(1);
}

// Vérification que HomeScreen ne passe plus stockCount, stockItems ni doableCount à ChefAiWidget
assert.strictEqual(
  homeContent.includes('stockCount={stockItems.length}'),
  false,
  'HomeScreen ne doit plus passer stockCount à ChefAiWidget'
);
assert.strictEqual(
  homeContent.includes('stockItems={stockItems}') && homeContent.includes('<ChefAiWidget\n          stockItems='),
  false,
  'HomeScreen ne doit plus passer stockItems à ChefAiWidget'
);

// Vérification du masquage de ChefAiWidget lors de recherche ou filtres actifs
assert.ok(
  homeContent.includes('shouldHideChefAiWidget') &&
    homeContent.includes('isSearching || activeAdvancedFiltersCount > 0 || onlyDoableWithStock || onlyVegetarian') &&
    homeContent.includes('!shouldHideChefAiWidget && (\n          <ChefAiWidget'),
  'ChefAiWidget doit être masqué dès qu’une recherche, un filtre avancé ou un filtre rapide est actif'
);

// Vérification de la prise en compte des tags dans le bandeau des filtres actifs
assert.ok(
  homeContent.includes('selectedTags.length > 0') &&
    homeContent.includes('advancedFiltersActiveBanner'),
  'Le bandeau advancedFiltersActiveBanner doit s’ouvrir avec selectedTags'
);

// Vérification du format épuré des tags (nom sans préfixe "Tags (au choix) : ")
assert.strictEqual(
  homeContent.includes("tagMatchMode === 'all' ? 'Tags (tous) : ' : 'Tags (au choix) : '"),
  false,
  'Le bandeau ne doit plus afficher le préfixe Tags (au choix) : mais juste le nom du tag'
);

// 2. Vérification dans ChefAiWidget.tsx : plus de fonctions obsolètes ni de props stock/doable
const widgetPath = path.join(__dirname, '../src/components/home-widgets/ChefAiWidget.tsx');
const widgetContent = fs.readFileSync(widgetPath, 'utf8');

assert.strictEqual(
  widgetContent.includes('formatStockPreview'),
  false,
  'formatStockPreview doit être supprimé de ChefAiWidget.tsx'
);
assert.strictEqual(
  widgetContent.includes('getChefAiSubtitle'),
  false,
  'getChefAiSubtitle doit être supprimé de ChefAiWidget.tsx'
);
assert.strictEqual(
  widgetContent.includes('stockCount') || widgetContent.includes('stockItems') || widgetContent.includes('doableCount'),
  false,
  'ChefAiWidget ne doit plus recevoir stockCount, stockItems ni doableCount'
);

// 3. Épuration du widget : titre, sous-titre fixe et bouton d’action
assert.ok(
  widgetContent.includes('Inspirations du Chef IA') &&
    widgetContent.includes('Des idées de recettes sur-mesure à partir de vos ingrédients') &&
    widgetContent.includes('Trouver 3 idées de recette') &&
    widgetContent.includes('sparkles'),
  'ChefAiWidget doit conserver uniquement le logo, le titre, le sous-titre fixe et le bouton d’action'
);

console.log('✅ Épuration du widget Chef IA et HomeScreen validée.');
console.log('🎉 Tous les tests de ChefAiWidget et HomeScreen sont passés avec succès !');
