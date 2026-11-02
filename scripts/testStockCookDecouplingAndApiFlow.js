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

const modalPath = path.join(__dirname, '../src/components/StockCookModal.tsx');
const content = fs.readFileSync(modalPath, 'utf8');

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

// 3. Passerelle anti-doublon cliquable
assert.ok(
  content.includes('doableFilterInfoBoxClickable'),
  'Le bandeau anti-doublon doit proposer un style cliquable'
);
assert.ok(
  content.includes('onApplyDoableFilter(true)'),
  'Cliquer sur le bandeau anti-doublon doit déclencher onApplyDoableFilter(true)'
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

console.log('✅ Découplage du carnet validé.');
console.log('✅ Passerelle interactive anti-doublon validée.');
console.log('✅ Issue rapide Clé API Google AI Studio validée.');
console.log('🎉 Tous les tests de découplage et flux Clé API ont réussi !');
