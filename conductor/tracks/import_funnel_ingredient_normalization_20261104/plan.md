# Plan d'Implémentation : Entonnoir d'Ingrédients à 3 Niveaux pour l'Import de Recettes

## Phase 1 : Élagage des Qualificatifs de Label & Gestion des Alternatives Culinaires (TDD)

- [x] Task 1.1 : Rédiger les tests unitaires pour l'élagage des labels de qualité et anti-faux-amis (Red Phase) [119af08]
    - [x] Créer le fichier de test unitaire pour les cas `feta AOP`, `biologique`, `au lait cru`, `non salées`
    - [x] Définir les assertions bloquantes sur les faux amis (`pulpe de tomate != poulpe`, `pâte de curry != pâtes`)
    - [x] Vérifier que les tests échouent conformément à la phase Red de TDD
- [x] Task 1.2 : Implémenter le filtrage des labels et qualificatifs de qualité dans `ingredientNormalizer.ts` (Green Phase) [e8ac64d]
    - [x] Ajouter la regex d'élagage des labels de qualité (`AOP`, `IGP`, `AOC`, `bio`, `au lait cru`, `fermier`, `non salé...`)
    - [x] Mettre à jour l'étape 3 du pipeline de normalisation pour préserver le nom d'affichage tout en résolvant le canonique
    - [x] Exécuter la suite de tests et vérifier le passage au vert
- [x] Task 1.3 : Rédiger les tests unitaires pour la résolution des alternatives culinaires (Red Phase) [4ff8e64]
    - [x] Définir les cas de test avec "ou" et "/" (ex: `crème fraîche ou yaourt`, `vinaigre de votre choix`, `mesclun ou jeunes pousses`)
    - [x] Vérifier que le libellé complet est préservé dans `name` et que le premier choix valide fournit `canonicalId`
    - [x] Vérifier que les tests échouent conformément à la phase Red
- [x] Task 1.4 : Implémenter la détection et résolution des alternatives dans `ingredientNormalizer.ts` (Green Phase) [44a3140]
    - [x] Implémenter la décomposition des alternatives en amont de la résolution canonique
    - [x] Relier le premier canonicalId valide sans altérer le `name` original
    - [x] Exécuter les tests unitaires et valider le passage au vert
- [x] Task 1.5 : Phase Verification & Checkpoint (Refer to workflow.md) [44a3140]
    - [x] Vérifier la couverture de code (>80%) sur les modifications de `ingredientNormalizer.ts`
    - [x] Valider l'absence de régression sur `scripts/testIngredientNormalizer.js`

## Phase 2 : Enrichissement du Lexique Canonique & Alias Fréquents (TDD)

- [x] Task 2.1 : Rédiger les tests unitaires de validation du lexique pour les nouveaux aliments et alias (Red Phase) [651640a]
    - [x] Définir les assertions vérifiant la présence, les rayons et les allergènes des ~35 aliments génériques
    - [x] Définir les assertions sur la résolution des alias fréquents (`jeunes pousses d'épinard`, `crottin de chèvre`, `pommes de terre grenailles`...)
    - [x] Vérifier l'échec attendu des tests (Red)
- [ ] Task 2.2 : Ajouter les ~35 aliments génériques manquants dans `canonicalVocabulary.ts` (Green Phase)
    - [ ] Ajouter les entrées pour Spätzle, Tortilla, Polenta, Nouilles ramen, Nouilles de riz
    - [ ] Ajouter les entrées pour Chou-rave, Jeunes pousses, Mesclun, Pousses d'épinard, Betterave jaune, Radis red meat, Baies roses
    - [ ] Ajouter les entrées pour Falafel, Paupiette, Crépinette, Chair à saucisse, Panko, Pâte de curry
    - [ ] Configurer les rayons par défaut, densités et familles d'allergènes INCO pour chaque nouvel ingrédient
- [ ] Task 2.3 : Enrichir les alias sur les ingrédients canoniques existants dans `canonicalVocabulary.ts` (Green Phase)
    - [ ] Compléter les alias pour Épinard, Pomme de terre, Feta, Yaourt, Fromage de chèvre, Cacahuète
    - [ ] Exécuter la suite de validation du vocabulaire et confirmer le passage au vert
- [ ] Task 2.4 : Phase Verification & Checkpoint (Refer to workflow.md)
    - [ ] Lancer `npm run validate:lexicon` et vérifier l'unicité stricte des identifiants et alias
    - [ ] Vérifier qu'aucun alias interdit isolé n'est introduit

## Phase 3 : Intégration du Reporting d'Import & Fluidité UX (TDD)

- [ ] Task 3.1 : Rédiger les tests unitaires pour les statistiques d'import dans `storageService.ts` (Red Phase)
    - [ ] Tester que `mergeRecipePack` calcule et retourne `totalIngredients`, `canonicalIngredientsCount` et `unmatchedIngredientsCount`
    - [ ] Vérifier l'échec initial du test (Red)
- [ ] Task 3.2 : Intégrer le calcul des statistiques de couverture dans `StorageService.mergeRecipePack` (Green Phase)
    - [ ] Collecter les métriques de normalisation lors du parcours des ingrédients dans `mergeRecipePack`
    - [ ] Exposer les compteurs dans le résultat retourné par le service
    - [ ] Valider le passage au vert des tests
- [ ] Task 3.3 : Mettre à jour l'UI d'import dans `SettingsScreen.tsx` (Green Phase)
    - [ ] Enrichir le message de succès d'importation avec le pourcentage de reconnaissance canonique
    - [ ] Proposer une redirection conviviale vers le gestionnaire de vocabulaire si des ingrédients hors-lexique sont détectés
- [ ] Task 3.4 : Phase Verification & Checkpoint (Refer to workflow.md)
    - [ ] Vérifier le comportement en cas d'erreur de parsing ou d'archive corrompue
    - [ ] Valider l'intégrité de l'expérience utilisateur mobile (pas de blocage ni gel d'écran)

## Phase 4 : Validation Globale sur le Pack Réel PhotoRecette (562 Recettes)

- [ ] Task 4.1 : Exécuter le banc d'analyse sur l'ensemble du corpus PhotoRecette
    - [ ] Lancer le script de vérification sur les 562 fichiers de recettes
    - [ ] Valider que le taux de couverture global dépasse 95% des occurrences
    - [ ] Contrôler manuellement un échantillon de 50 résolutions pour s'assurer de l'absence totale de faux amis
- [ ] Task 4.2 : Phase Verification & Checkpoint (Refer to workflow.md)
    - [ ] Exécuter la totalité des tests de non-régression du projet (`testStockMatcher.js`, `testShoppingAggregator.js`, `testAllergenMatcher.js`)
    - [ ] Valider la conformité finale du projet
