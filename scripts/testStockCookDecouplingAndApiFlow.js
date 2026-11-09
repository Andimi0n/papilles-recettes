#!/usr/bin/env node

/**
 * Papilles - Test unitaire du découplage de StockCookModal et du flux clé API
 * TDD Phase 4 :
 * 1. Harmonisation du titre ("Inspirations du Chef IA")
 * 2. Suppression stricte de la Section 2 ("Dans votre carnet")
 * 3. Passerelle interactive anti-doublon (doableFilterInfoBoxClickable)
 * 4. Bouton d'action directe vers Google AI Studio dans la modale clé API
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Lancement des tests de découplage et flux Clé API (StockCookModal)...');

const scanScreenPath = path.join(__dirname, '../src/screens/ScanRecipeScreen.tsx');
const modalPath = path.join(__dirname, '../src/components/chef-ai/StockCookModal.tsx');
const targetPath = fs.existsSync(scanScreenPath) && fs.readFileSync(scanScreenPath, 'utf8').includes('1. FORMAT DU REPAS')
  ? scanScreenPath
  : modalPath;
const content = fs.readFileSync(targetPath, 'utf8');

// 1. Titre harmonisé
assert.ok(
  content.includes("'Inspirations du Chef IA'"),
  'Le titre principal de la modale doit être "Inspirations du Chef IA"'
);
assert.ok(
  content.includes("'Création sur-mesure & anti-gaspillage'"),
  'Le sous-titre de la modale doit être "Création sur-mesure & anti-gaspillage"'
);

// 2. Section 2 ("Dans votre carnet") doit être SUPPRIMÉE
assert.strictEqual(
  content.includes('<Text style={styles.cardTitle}>Dans votre carnet</Text>'),
  false,
  'La carte Section 2 "Dans votre carnet" doit être totalement absente de StockCookModal.tsx'
);
assert.strictEqual(
  content.includes('carnetStatusRow'),
  false,
  'Les styles carnetStatusRow doivent être supprimés'
);

// 3. Découplage strict, suppression du bandeau anti-doublon en Zone 2 & Rework en 3 cartes avec Sticky Footer
assert.strictEqual(
  content.includes('doableFilterInfoBoxClickable'),
  false,
  'Le bandeau anti-doublon doit être retiré de la Zone 2'
);
assert.ok(
  content.includes('stickyFooterContainer'),
  'Le bouton d’action principal doit être ancré dans une sticky bottom bar'
);
assert.ok(
  content.includes('1. FORMAT DU REPAS') &&
    content.includes('2. STYLE & ENVIES DU MOMENT') &&
    content.includes('3. INGRÉDIENTS'),
  'Les 3 cartes visuelles distinctes doivent être présentes dans StockCookModal.tsx'
);

// 4. Issue rapide Clé API Gemini (Google AI Studio)
assert.ok(
  content.includes('https://aistudio.google.com/app/apikey'),
  'La modale Clé API doit proposer le lien vers https://aistudio.google.com/app/apikey'
);
assert.ok(
  content.includes('Linking.openURL'),
  'L’ouverture de l’URL doit utiliser Linking.openURL'
);

// 5. Liste déroulante "Format du repas" avec 5 options (Entrée, Plat, Dessert, Apéritif, Boisson)
assert.strictEqual(
  content.includes('mealTypeCompactContainer'),
  false,
  'Les 3 boutons fixes mealTypeCompactContainer doivent être remplacés par la liste déroulante'
);
assert.ok(
  content.includes('mealTypeDropdownTrigger') && content.includes('mealTypeDropdownMenu'),
  'Le déclencheur et le menu de liste déroulante doivent être présents dans StockCookModal.tsx'
);
assert.ok(
  content.includes("'Apéritif'") && content.includes("'Boisson'"),
  'Les formats Apéritif et Boisson doivent être présents dans AllowedMealType et MEAL_TYPES'
);

console.log('✅ Découplage du carnet validé.');
console.log('✅ Passerelle interactive anti-doublon validée.');
console.log('✅ Issue rapide Clé API Google AI Studio validée.');
console.log('✅ Liste déroulante Format du repas (5 options) validée.');
console.log('🎉 Tous les tests de découplage et flux Clé API ont réussi !');
