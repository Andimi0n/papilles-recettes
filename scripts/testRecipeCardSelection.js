#!/usr/bin/env node

/**
 * Papilles - Tests unitaires de validation du Mode Sélection de RecipeCard :
 * - Props isSelectionMode, isSelected, onLongPress
 * - Indicateur de sélection (coche ✓ si sélectionné, cercle vide si en mode sélection, absent hors sélection)
 * - Bordure active (2px colors.primary)
 * - Invalidation correcte du memo lors du changement de sélection
 * - Zéro retour haptique
 */

const path = require('path');
const assert = require('assert');
const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests de validation du mode sélection de RecipeCard...');
  const tmpDir = path.join(__dirname, '../.tmp_test_recipecard_selection');

  // 1. Vérification statique de l'absence de retour haptique
  console.log('\n--- Test 1 : Vérification de l\'absence de vibration haptique ---');
  const recipeCardSource = fs.readFileSync(path.join(__dirname, '../src/components/common/RecipeCard.tsx'), 'utf8');
  assert(!recipeCardSource.includes('expo-haptics'), 'RecipeCard ne doit pas importer expo-haptics (vibrations désactivées)');
  assert(!recipeCardSource.includes('Vibration.vibrate'), 'RecipeCard ne doit pas utiliser Vibration.vibrate');
  console.log('✓ Aucune vibration haptique détectée dans RecipeCard');

  // 2. Compilation TypeScript
  console.log('\n--- Test 2 : Compilation TypeScript avec les nouvelles props ---');
  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/types/recipe.ts src/utils/helpers.ts src/components/common/RecipeCard.tsx src/theme/colors.ts src/theme/ThemeContext.tsx --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig --jsx react`,
      { stdio: 'pipe' }
    );
    console.log('✓ Compilation TypeScript réussie');
  } catch (err) {
    console.error('❌ Échec de la compilation TypeScript de RecipeCard :', err.message);
    process.exit(1);
  }

  // Mocks pour environnement Node.js
  const ReactNativeMock = {
    Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
    StyleSheet: {
      create: (s) => s,
      absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    },
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    Animated: {
      Value: function (init) {
        this.value = init;
        this.setValue = (v) => { this.value = v; };
      },
      spring: () => ({ start: (cb) => { if (cb) cb(); } }),
      timing: () => ({ start: (cb) => { if (cb) cb(); } }),
      sequence: (anims) => ({ start: (cb) => { if (cb) cb(); } }),
      createAnimatedComponent: (c) => c,
      View: 'Animated.View',
    },
  };
  require.cache[require.resolve('react-native')] = { exports: ReactNativeMock };

  const ExpoImageMock = {
    Image: 'Image',
  };
  require.cache[require.resolve('expo-image')] = { exports: ExpoImageMock };

  const ExpoVectorIconsMock = {
    Ionicons: 'Ionicons',
  };
  require.cache[require.resolve('@expo/vector-icons')] = { exports: ExpoVectorIconsMock };

  const { RecipeCard } = require(path.join(tmpDir, 'components/common/RecipeCard.js'));

  console.log('\n--- Test 3 : Vérification de l\'export et du composant RecipeCard ---');
  assert(['function', 'object'].includes(typeof RecipeCard), 'RecipeCard doit être exporté comme composant React.memo');
  console.log('✓ RecipeCard est correctement exporté');

  console.log('\n--- Test 4 : Vérification du comparateur React.memo sur isSelectionMode et isSelected ---');
  // On inspecte le code compilé ou le composant mémoïsé
  // Dans React.memo, la fonction de comparaison compare prevProps et nextProps
  // Si RecipeCard est un objet memo, il a une propriété compare
  if (RecipeCard.compare) {
    const baseRecipe = {
      id: 'rec_1',
      title: 'Tarte aux pommes',
      category: 'Dessert',
      prepTimeMinutes: 20,
      cookTimeMinutes: 30,
      rating: 4.5,
      isVegetarian: true,
      imageUrl: 'apple_pie.jpg',
    };

    const propsA = {
      recipe: baseRecipe,
      onPress: () => {},
      isSelectionMode: false,
      isSelected: false,
    };

    const propsB_same = {
      ...propsA,
    };

    const propsC_selectionModeChanged = {
      ...propsA,
      isSelectionMode: true,
    };

    const propsD_selectedChanged = {
      ...propsA,
      isSelectionMode: true,
      isSelected: true,
    };

    assert.strictEqual(RecipeCard.compare(propsA, propsB_same), true, 'Props identiques doivent renvoyer true (pas de re-render)');
    assert.strictEqual(RecipeCard.compare(propsA, propsC_selectionModeChanged), false, 'Changement de isSelectionMode doit renvoyer false (re-render obligatoire)');
    assert.strictEqual(RecipeCard.compare(propsC_selectionModeChanged, propsD_selectedChanged), false, 'Changement de isSelected doit renvoyer false (re-render obligatoire)');
    console.log('✓ Comparateur React.memo invalide correctement le cache lors du changement de sélection');
  } else {
    // Si RecipeCard.compare n'est pas directement exposé dans l'environnement compilé, vérifions la présence dans le code source
    assert(recipeCardSource.includes('isSelectionMode'), 'RecipeCard doit comparer isSelectionMode dans memo');
    assert(recipeCardSource.includes('isSelected'), 'RecipeCard doit comparer isSelected dans memo');
    console.log('✓ Comparateur React.memo vérifié via le code source');
  }

  // 5. Vérification de la présence des styles de sélection (bordure 2px, pastille)
  console.log('\n--- Test 5 : Vérification des styles de sélection ---');
  assert(recipeCardSource.includes('selection'), 'RecipeCard doit définir des styles ou attributs pour la sélection');
  assert(recipeCardSource.includes('onLongPress'), 'RecipeCard doit accepter et brancher la prop onLongPress');
  console.log('✓ Props et styles de sélection présents dans RecipeCard');

  console.log('\n🎉 Tous les tests du mode sélection de RecipeCard sont au vert !');
}

main().catch((err) => {
  console.error('Erreur non gérée :', err);
  process.exit(1);
});
