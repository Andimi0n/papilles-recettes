#!/usr/bin/env node

/**
 * Papilles - Test de validation unitaire de helpers.ts
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_helpers');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/helpers.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const { normalizeString } = require(path.join(tmpDir, 'utils/helpers.js'));

  console.log('🧪 Lancement des tests de helpers...');

  // =========================================================================
  // TESTS POUR normalizeString
  // =========================================================================
  console.log('\n--- Test : normalizeString ---');

  // 1. Happy path: chaîne standard
  assert.strictEqual(normalizeString('Pomme'), 'pomme', 'Doit convertir en minuscules');

  // 2. Suppression des accents
  assert.strictEqual(normalizeString('Éèêëàâäîïôöùûüç'), 'eeeeaaaiioouuuc', 'Doit supprimer tous les accents courants');
  assert.strictEqual(normalizeString('Crème fraîche'), 'creme fraiche', 'Doit gérer les accents dans les mots');

  // 3. Trim (espaces au début et à la fin)
  assert.strictEqual(normalizeString('  carotte  '), 'carotte', 'Doit supprimer les espaces superflus');

  // 4. Combinaison minuscules, accents, espaces
  assert.strictEqual(normalizeString('  Pâte Brisée  '), 'pate brisee', 'Doit gérer minuscules, accents et espaces ensemble');

  // 5. Edge cases: null, undefined, empty string
  // Bien que le type soit string dans TypeScript, le runtime JS peut envoyer du null/undefined.
  // Notre implémentation if (!str) return ''; gère cela.
  assert.strictEqual(normalizeString(''), '', 'Chaîne vide doit renvoyer une chaîne vide');
  assert.strictEqual(normalizeString(null), '', 'null doit renvoyer une chaîne vide');
  assert.strictEqual(normalizeString(undefined), '', 'undefined doit renvoyer une chaîne vide');

  console.log('✓ Tous les tests de normalizeString ont réussi');

  console.log('\n🎉 TOUS LES TESTS DE HELPERS ONT RÉUSSI (0 ERREUR) !');

  // Nettoyage
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  console.error('\n❌ ERREUR CRITIQUE DANS LES TESTS HELPERS :', err);
  process.exit(1);
});
