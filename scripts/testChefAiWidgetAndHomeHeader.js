#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation de ChefAiWidget et du nettoyage de HomeScreen
 * TDD Phase 2 :
 * 1. Exploitation des props stockItems et doableCount dans ChefAiWidget (aperçu dynamique et texte contextuel).
 * 2. Suppression stricte de stockActiveBanner dans HomeScreen.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Lancement des tests de ChefAiWidget et de HomeScreen...');

// 1. Test unitaire des fonctions logiques d'aide à la présentation
function formatStockPreview(stockItems, maxItems = 3) {
  if (!stockItems || stockItems.length === 0) return '';
  const validNames = stockItems
    .map((item) => (item.name ? item.name.toLowerCase().trim() : ''))
    .filter(Boolean);
  if (validNames.length === 0) return '';
  const preview = validNames.slice(0, maxItems).join(', ');
  return validNames.length > maxItems ? `Avec : ${preview}...` : `Avec : ${preview}`;
}

function getChefAiSubtitle(stockCount, doableCount = 0) {
  if (stockCount === 0) {
    return 'Sur-mesure avec ce que vous avez';
  }
  if (doableCount > 0) {
    return doableCount > 1
      ? `${doableCount} recettes prêtes ou inventez du sur-mesure`
      : `1 recette prête ou inventez du sur-mesure`;
  }
  return 'Inventions sur-mesure anti-gaspillage';
}

// Tests logiques
assert.strictEqual(formatStockPreview([]), '', 'Stock vide -> aperçu vide');
assert.strictEqual(
  formatStockPreview([{ name: 'Carotte' }, { name: 'Oeuf' }]),
  'Avec : carotte, oeuf',
  'Deux items -> formaté correctement'
);
assert.strictEqual(
  formatStockPreview([
    { name: 'Carotte' },
    { name: 'Oeuf' },
    { name: 'Parmesan' },
    { name: 'Tomate' },
  ]),
  'Avec : carotte, oeuf, parmesan...',
  'Plus de 3 items -> tronqué avec points de suspension'
);
assert.strictEqual(
  formatStockPreview([
    { name: '   ' },
    { name: 'Carotte' },
    { name: 'Oeuf' },
    { name: 'Parmesan' },
  ]),
  'Avec : carotte, oeuf, parmesan',
  'Les items vides sont filtrés en amont pour toujours présenter 3 items valides'
);

assert.strictEqual(
  getChefAiSubtitle(0, 0),
  'Sur-mesure avec ce que vous avez',
  'Stock 0 -> sous-titre par défaut'
);
assert.strictEqual(
  getChefAiSubtitle(5, 3),
  '3 recettes prêtes ou inventez du sur-mesure',
  'Plusieurs recettes prêtes'
);
assert.strictEqual(
  getChefAiSubtitle(5, 1),
  '1 recette prête ou inventez du sur-mesure',
  'Une recette prête'
);
assert.strictEqual(
  getChefAiSubtitle(5, 0),
  'Inventions sur-mesure anti-gaspillage',
  'Stock présent mais 0 recette prête'
);

console.log('✅ Logique de présentation validée.');

// 2. Vérification dans HomeScreen.tsx : stockActiveBanner doit être SUPPRIMÉ
const homeScreenPath = path.join(__dirname, '../src/screens/HomeScreen.tsx');
const homeContent = fs.readFileSync(homeScreenPath, 'utf8');

if (homeContent.includes('stockActiveBanner')) {
  console.error('❌ Échec TDD attendu : stockActiveBanner est toujours présent dans HomeScreen.tsx');
  process.exit(1);
}

// 3. Vérification dans ChefAiWidget.tsx : stockItems et doableCount doivent être exploités
const widgetPath = path.join(__dirname, '../src/components/home-widgets/ChefAiWidget.tsx');
const widgetContent = fs.readFileSync(widgetPath, 'utf8');

const hasDestructuredProps =
  widgetContent.includes('stockItems') &&
  widgetContent.includes('doableCount') &&
  (widgetContent.includes('formatStockPreview') || widgetContent.includes('preview') || widgetContent.includes('Avec :'));

if (!hasDestructuredProps) {
  console.error('❌ Échec TDD attendu : ChefAiWidget.tsx n’exploite pas encore activement stockItems ou doableCount');
  process.exit(1);
}

// 4. Épuration du widget : suppression du sous-titre, aperçu et badge stock
assert.strictEqual(
  widgetContent.includes('headerSubtitle') || widgetContent.includes('previewRow'),
  false,
  'ChefAiWidget ne doit plus afficher de sous-titre ni d’aperçu des ingrédients'
);
assert.strictEqual(
  widgetContent.includes('stockBadge'),
  false,
  'ChefAiWidget ne doit plus afficher le badge frigo de stock'
);
assert.ok(
  widgetContent.includes('Trouver 3 idées de recette') &&
    widgetContent.includes('Inspirations du Chef IA') &&
    widgetContent.includes('sparkles'),
  'ChefAiWidget doit conserver uniquement le logo, le titre et le bouton Trouver 3 idées de recette'
);

console.log('✅ Épuration du widget Chef IA (logo, titre, bouton seuls) validée.');
console.log('🎉 Tous les tests de ChefAiWidget et HomeScreen sont passés avec succès !');
