#!/usr/bin/env node

/**
 * Papilles - Script de normalisation des recettes initiales par défaut
 * Normalise tous les noms d'ingrédients de INITIAL_RECIPES selon le vocabulaire canonique,
 * tout en laissant les étapes ('steps') 100% intactes et fidèles.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript...');
  const tmpDir = path.join(__dirname, '../.tmp_norm_build');
  
  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/data/initialRecipes.ts src/utils/ingredientNormalizer.ts src/services/vocabularyService.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/types/recipe.ts src/utils/helpers.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Charger les modules compilés
  const { INITIAL_RECIPES } = require(path.join(tmpDir, 'data/initialRecipes.js'));
  const { normalizeIngredient } = require(path.join(tmpDir, 'utils/ingredientNormalizer.js'));

  console.log(`📋 Traitement de ${INITIAL_RECIPES.length} recettes...`);

  let totalIngredients = 0;
  let normalizedCount = 0;

  const normalizedRecipes = INITIAL_RECIPES.map((recipe) => {
    const updatedIngredients = recipe.ingredients.map((ing) => {
      totalIngredients++;
      const res = normalizeIngredient(ing);
      if (res.name !== ing.name || res.unit !== ing.unit || res.quantity !== ing.quantity || res.canonicalId !== ing.canonicalId) {
        normalizedCount++;
      }
      return {
        id: ing.id,
        name: res.name || ing.name,
        canonicalId: res.canonicalId || ing.canonicalId,
        quantity: res.quantity !== undefined ? res.quantity : ing.quantity || '',
        unit: res.unit !== undefined ? res.unit : ing.unit || '',
        isPantryStaple: res.isPantryStaple,
        isOptional: res.isOptional,
      };
    });

    return {
      ...recipe,
      ingredients: updatedIngredients,
      // steps restent 100% intacts !
    };
  });

  console.log(`✨ Ingrédients analysés : ${totalIngredients}`);
  console.log(`🎯 Ingrédients normalisés : ${normalizedCount} (${Math.round((normalizedCount / totalIngredients) * 100)}%)`);

  // Réécriture de src/data/initialRecipes.ts
  const targetFile = path.join(__dirname, '../src/data/initialRecipes.ts');
  const fileContent = `import { Recipe } from '../types/recipe';

/**
 * Les 100 meilleures recettes cultes de Marmiton,
 * pré-chargées par défaut dans Papilles avec photos haute résolution et catégorisation végétarienne.
 * Ingrédients strictement normalisés selon le lexique canonique Papilles.
 */
export const INITIAL_RECIPES: Recipe[] = ${JSON.stringify(normalizedRecipes, null, 2)};
`;

  fs.writeFileSync(targetFile, fileContent, 'utf-8');
  console.log(`💾 Fichier mis à jour avec succès : ${targetFile}`);

  // Nettoyage du dossier temporaire
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('🧹 Nettoyage terminé.');
}

main().catch(console.error);
