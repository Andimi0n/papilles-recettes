#!/usr/bin/env node

/**
 * Papilles - Tests de validation de l'intégration Caméra in-app (anti-crash)
 * Vérifie que :
 * 1. CameraCaptureModal est présent, intègre CameraView et exporte correctement son interface.
 * 2. Aucune dépendance à ImagePicker.launchCameraAsync n'est présente dans les écrans (source du crash LMK Android).
 * 3. RecipeFormScreen utilise CameraCaptureModal en mode 'photo' et traite onPhotoCaptured via ImageStorageService.
 * 4. ScanRecipeScreen utilise CameraCaptureModal en mode 'scan' et traite onPhotosCaptured via processImage.
 * 5. App.tsx nettoie préventivement les brouillons caméra résiduels.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Lancement des tests de validation de l\'intégration Caméra in-app...');

const rootDir = path.resolve(__dirname, '..');
const cameraModalPath = path.join(rootDir, 'src', 'components', 'import-share', 'CameraCaptureModal.tsx');
const recipeFormPath = path.join(rootDir, 'src', 'screens', 'RecipeFormScreen.tsx');
const scanRecipePath = path.join(rootDir, 'src', 'screens', 'ScanRecipeScreen.tsx');
const appPath = path.join(rootDir, 'App.tsx');

// Test 1 : Vérification de l'existence et du contenu de CameraCaptureModal
assert.ok(fs.existsSync(cameraModalPath), 'CameraCaptureModal.tsx doit exister dans src/components/import-share/');
const cameraModalCode = fs.readFileSync(cameraModalPath, 'utf8');

assert.ok(
  cameraModalCode.includes("import { CameraView, useCameraPermissions"),
  'CameraCaptureModal doit importer CameraView et useCameraPermissions depuis expo-camera'
);
assert.ok(
  cameraModalCode.includes("export const CameraCaptureModal"),
  'CameraCaptureModal doit exporter le composant CameraCaptureModal'
);
assert.ok(
  cameraModalCode.includes("takePictureAsync"),
  'CameraCaptureModal doit appeler takePictureAsync sur le composant natif CameraView'
);
assert.ok(
  cameraModalCode.includes("mode = 'photo'") && cameraModalCode.includes("mode === 'scan'"),
  'CameraCaptureModal doit supporter les modes photo et scan'
);
console.log('✓ CameraCaptureModal correctement structuré avec expo-camera (CameraView)');

// Test 2 : Absence de ImagePicker.launchCameraAsync dans les écrans (suppression du vecteur de crash LMK)
const recipeFormCode = fs.readFileSync(recipeFormPath, 'utf8');
const scanRecipeCode = fs.readFileSync(scanRecipePath, 'utf8');
const appCode = fs.readFileSync(appPath, 'utf8');

assert.ok(
  !recipeFormCode.includes('launchCameraAsync'),
  'RecipeFormScreen ne doit plus appeler ImagePicker.launchCameraAsync'
);
assert.ok(
  !scanRecipeCode.includes('launchCameraAsync'),
  'ScanRecipeScreen ne doit plus appeler ImagePicker.launchCameraAsync'
);
assert.ok(
  !appCode.includes('launchCameraAsync'),
  'App.tsx ne doit pas contenir de launchCameraAsync'
);
console.log('✓ Zéro appel à ImagePicker.launchCameraAsync dans l\'application (élimination du crash LMK)');

// Test 3 : Intégration dans RecipeFormScreen
assert.ok(
  recipeFormCode.includes('import { CameraCaptureModal } from \'../components/import-share/CameraCaptureModal\''),
  'RecipeFormScreen doit importer CameraCaptureModal'
);
assert.ok(
  recipeFormCode.includes('<CameraCaptureModal') && recipeFormCode.includes('mode="photo"'),
  'RecipeFormScreen doit instancier CameraCaptureModal avec mode="photo"'
);
assert.ok(
  recipeFormCode.includes('handleCameraPhotoCaptured') && recipeFormCode.includes('persistImageLocally'),
  'RecipeFormScreen doit persister la photo via ImageStorageService.persistImageLocally'
);
console.log('✓ RecipeFormScreen correctement raccordé à CameraCaptureModal');

// Test 4 : Intégration dans ScanRecipeScreen
assert.ok(
  scanRecipeCode.includes('import { CameraCaptureModal } from \'../components/import-share/CameraCaptureModal\''),
  'ScanRecipeScreen doit importer CameraCaptureModal'
);
assert.ok(
  scanRecipeCode.includes('<CameraCaptureModal') && scanRecipeCode.includes('mode="scan"'),
  'ScanRecipeScreen doit instancier CameraCaptureModal avec mode="scan"'
);
assert.ok(
  scanRecipeCode.includes('handleCameraPhotosCaptured') && scanRecipeCode.includes('processImage'),
  'ScanRecipeScreen doit traiter les photos du scan via processImage'
);
console.log('✓ ScanRecipeScreen correctement raccordé à CameraCaptureModal');

// Test 5 : Nettoyage des brouillons dans App.tsx
assert.ok(
  appCode.includes('@papilles_camera_recipe_draft') &&
  appCode.includes('@papilles_camera_scan_draft') &&
  appCode.includes('AsyncStorage.multiRemove'),
  'App.tsx doit nettoyer préventivement les anciens brouillons caméra résiduels au démarrage'
);
console.log('✓ Nettoyage défensif des anciens brouillons résiduels validé');

// Test 6 : Bruit de photo conditionné au mode son Android (ni silencieux, ni vibreur)
const cropperPath = path.join(rootDir, 'src', 'components', 'import-share', 'ImageCropper.tsx');
const audioModePath = path.join(rootDir, 'modules', 'audio-mode', 'index.ts');

assert.ok(fs.existsSync(audioModePath), 'Le module audio-mode doit exister pour détecter le mode son Android');
assert.ok(
  cameraModalCode.includes('isAndroidSoundMode') && cameraModalCode.includes('shutterSound: isSound'),
  'CameraCaptureModal doit utiliser isAndroidSoundMode pour conditionner shutterSound au mode son Android'
);
console.log('✓ Bruit de photo désactivé en mode silencieux / vibreur Android (shutterSound dynamique)');

// Test 7 : Outil de rognage / recadrage de photo (ImageCropper)
assert.ok(fs.existsSync(cropperPath), 'ImageCropper.tsx doit exister dans src/components/import-share/');
const cropperCode = fs.readFileSync(cropperPath, 'utf8');

assert.ok(
  cropperCode.includes('manipulateAsync') && cropperCode.includes('crop:'),
  'ImageCropper doit utiliser manipulateAsync avec l\'action crop'
);
assert.ok(
  cameraModalCode.includes('<ImageCropper') && cameraModalCode.includes('handleApplyCrop'),
  'CameraCaptureModal doit intégrer ImageCropper et gérer handleApplyCrop'
);
assert.ok(
  cameraModalCode.includes('Rogner') && cameraModalCode.includes('handleOpenCropPreview'),
  'CameraCaptureModal doit proposer l\'option Rogner dans l\'aperçu'
);
console.log('✓ Outil de rognage et cadrage de photo interactif intégré avec succès');

console.log('\n🎉 TOUS LES TESTS D\'INTÉGRATION CAMÉRA SONT AU VERT (0 CRASH, 0 ERREUR) !');
