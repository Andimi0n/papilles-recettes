# Spécification Technique : Entonnoir d'Ingrédients à 3 Niveaux pour l'Import de Recettes

## 1. Contexte & Problématique

L'importation de collections volumineuses de recettes externes (ex: 562 fiches recettes scannées Quitoque issues de PhotoRecette) expose le moteur de normalisation culinaire de Papilles à une terminologie riche et variée.
Sur un échantillon de 562 recettes représentant 5 149 occurrences d'ingrédients et 800 termes distincts :
- 89% des occurrences d'ingrédients (4 608) sont déjà correctement résolues vers le lexique canonique.
- 11% des occurrences (339 termes distincts) restent sans identifiant canonique (`canonicalId: undefined`).
- Ces termes non résolus se décomposent en :
  1. Mentions de labels d'origine ou d'affinage superflus (ex: `feta AOP`, `crottin de chèvre au lait cru`).
  2. Alternatives culinaires rédigées avec "ou" / "/" (ex: `crème fraîche ou yaourt`, `vinaigre de votre choix`).
  3. Ingrédients génériques manquants au référentiel initial (ex: `spätzle`, `chou-rave`, `falafel`, `tortillas`, `chapelure panko`, `baies roses`).
  4. Préparations spécifiques ou kits d'épices propres à l'éditeur (ex: `mélange d'épices butter chicken`).

### Objectif
Mettre en place un « entonnoir culinaire à 3 niveaux » qui :
1. Maximise la résolution automatique des ingrédients sans dégrader les libellés originaux.
2. Enrichit le lexique canonique avec les aliments génériques réels et leurs métadonnées (rayons, allergènes INCO, densités).
3. Conserve les mélanges très spécifiques hors lexique tout en fluidifiant l'import (0 popup bloquante) et en fournissant un rapport post-import clair avec qualification différée.

---

## 2. Architecture de l'Entonnoir en 3 Niveaux

```
+-----------------------------------------------------------------------------------+
|               Recette Importée (ex: JSON brut, Marmiton, ou Pack ZIP)             |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| NIVEAU 1 : Moteur de Normalisation Amélioré (ingredientNormalizer.ts)            |
| 1. Élagage des labels de qualité (AOP, AOC, IGP, bio, fermier, au lait cru...)   |
| 2. Résolution des alternatives ("ou", "/") : test du 1er segment valide          |
| 3. Préservation stricte : le 'name' affiché reste fidèle ("crème fraîche ou...") |
| 4. Garde-fous anti-faux-amis (rejet des faux stems : pulpe != poulpe)            |
+-----------------------------------------------------------------------------------+
                                         |
                       [ Si non matché au Niveau 1 ]
                                         v
+-----------------------------------------------------------------------------------+
| NIVEAU 2 : Référentiel Canonique Élargi (canonicalVocabulary.ts)                  |
| 1. Ajout de ~35 aliments génériques manquants (Spätzle, Falafel, Tortilla...)    |
| 2. Configuration native du rayon (ShoppingAisle) et allergènes majeurs INCO       |
| 3. Enrichissement des alias fréquents sur les ingrédients canoniques existants    |
+-----------------------------------------------------------------------------------+
                                         |
                       [ Si toujours non matché ]
                                         v
+-----------------------------------------------------------------------------------+
| NIVEAU 3 : Gestion Hors-Lexique & Qualification Différée (Non bloquante)          |
| 1. Préservation de l'ingrédient en texte brut avec canonicalId: undefined         |
| 2. Classification heuristique de rayon automatique (aisleClassifier.ts)           |
| 3. Rapport d'import détaillé (nombre d'ingrédients reconnus vs à qualifier)      |
| 4. Accès direct depuis Paramètres vers QualifyIngredientModal (file d'attente)    |
+-----------------------------------------------------------------------------------+
```

---

## 3. Exigences Fonctionnelles Détaillées

### 3.1 Niveau 1 : Normalisation & Nettoyage Culinaire (`ingredientNormalizer.ts`)
- **Élagage des mentions de label et d'affinage :**
  - Supprimer de la chaîne de recherche (sans modifier le nom d'affichage final) : `aop`, `a.o.p.`, `igp`, `i.g.p.`, `aoc`, `a.o.c.`, `bio`, `biologique`, `au lait cru`, `fermier`, `fermiere`, `non sale`, `non salee`, `non sales`, `non salees`, `de votre choix`.
- **Résolution des alternatives culinaires ("ou", "/") :**
  - Si la chaîne contient `" ou "` ou `" / "`, extraire les segments candidats.
  - Tester successivement le premier segment puis le second contre le lexique canonique.
  - Dès qu'un segment valide est trouvé :
    - Conserver le texte d'origine complet pour le champ `name` de la recette (ex: `"crème fraîche ou yaourt"`).
    - Assigner le `canonicalId` résolu du segment trouvé (ex: `ing_canon_creme_fraiche`).
- **Garde-fous anti-faux-amis :**
  - Interdire les correspondances trompeuses issues de stems tronqués :
    - `pulpe` ne doit pas matcher `Poulpe` (`ing_canon_poulpe`).
    - `pâte de curry` / `poudre de curry` ne doit pas matcher `Pâtes` (`ing_canon_pates`).
    - `pain ciabatta` ne doit pas matcher `Pain pita`.

### 3.2 Niveau 2 : Enrichissement du Lexique Canonique (`canonicalVocabulary.ts`)
- **Aliments génériques à créer (~35 entrées) :**
  - Féculents / Céréales : `Spätzle` (Épicerie & Condiments, allergène gluten), `Tortilla` (Épicerie & Condiments, gluten), `Polenta` (Épicerie & Condiments), `Nouilles ramen` (Épicerie & Condiments, gluten), `Nouilles de riz` (Épicerie & Condiments).
  - Légumes / Végétaux : `Chou-rave` (Fruits & Légumes), `Jeunes pousses` (Fruits & Légumes), `Mesclun` (Fruits & Légumes), `Pousses d'épinard` (Fruits & Légumes), `Betterave jaune` (Fruits & Légumes), `Radis red meat` (Fruits & Légumes), `Baies roses` (Épicerie & Condiments).
  - Traiteur / Plats préparés : `Falafel` (Produits Frais & Crèmerie), `Paupiette` (Boucherie & Poissonnerie), `Crépinette` (Boucherie & Poissonnerie), `Chair à saucisse` (Boucherie & Poissonnerie).
  - Épicerie & Condiments : `Chapelure panko` (Épicerie & Condiments, gluten), `Pâte de curry` (Épicerie & Condiments), `Moutarde à l'ancienne` (Épicerie & Condiments, moutarde).
  - Produits laitiers / Fromages : `Crottin de chèvre` (Produits Frais & Crèmerie, lait), `Morbier` (Produits Frais & Crèmerie, lait), `Tomme` (Produits Frais & Crèmerie, lait).
- **Enrichissement des alias sur ingrédients existants :**
  - `Épinard` (`ing_canon_epinard`) : ajouter `jeunes pousses d'epinard`, `jeunes pousses d'epinards`, `pousses d'epinard`.
  - `Pomme de terre` (`ing_canon_pomme_de_terre`) : ajouter `pommes de terre grenailles`, `pomme de terre grenaille`, `grenailles`, `grenaille`.
  - `Feta` (`ing_canon_feta`) : ajouter `feta aop`, `feta grecque`.
  - `Yaourt` (`ing_canon_yaourt`) : ajouter `yaourt a la grecque`, `yaourt grec`.
  - `Fromage de chèvre` (`ing_canon_chevre`) : ajouter `fromage de chevre frais`, `crottin de chevre`.
  - `Cacahuète` (`ing_canon_cacahuete`) : ajouter `cacahuetes grillees`, `cacahuetes grillees non salees`.

### 3.3 Niveau 3 : Expérience Utilisateur & Import Silencieux (`storageService.ts`, `SettingsScreen.tsx`)
- **Reporting d'import enrichi :**
  - Lors de l'import d'un pack ZIP ou JSON (`StorageService.mergeRecipePack`), comptabiliser :
    - Nombre de recettes ajoutées / mises à jour.
    - Nombre total d'ingrédients traités.
    - Nombre d'ingrédients canonisés avec succès.
    - Nombre d'ingrédients restant hors lexique.
- **Retour visuel non bloquant :**
  - L'alerte de fin d'import affiche un récapitulatif convivial :
    *Exemple : "🎉 562 recettes importées\n📦 96% des ingrédients reconnus automatiquement\nℹ️ 42 ingrédients spécifiques (kits d'épices...) importés sans équivalent canonique."*
  - Si des ingrédients hors lexique sont présents, un bouton *"Voir les ingrédients à qualifier"* ouvre directement la gestion du lexique.

---

## 4. Exigences Non-Fonctionnelles & Performance

- **Latence d'import :** Traitement en O(1) par ingrédient, temps d'analyse de 500 recettes < 300 ms sur Hermes.
- **Intégrité des données :** Préservation intégrale des étapes, temps, portions et titres des recettes.
- **Absence de régression :** Les suites de tests existantes (`testIngredientNormalizer.js`, `testStockMatcher.js`, `testShoppingAggregator.js`, `testAllergenMatcher.js`) doivent passer à 100%.

---

## 5. Critères d'Acceptation

1. Le taux de couverture canonique sur le corpus de test `PhotoRecette/.cache/recipes/*.json` dépasse **95%** des occurrences d'ingrédients.
2. Les ingrédients contenant des mentions de labels (ex: `feta AOP`) sont résolus vers leur parent canonique sans altérer le libellé d'affichage.
3. Les ingrédients avec alternatives culinaires (ex: `crème fraîche ou yaourt`) conservent leur nom complet et sont reliés au premier canonicalId résolu.
4. Aucun faux ami culinaire identifié (`pulpe` -> poulpe, `pâte de curry` -> pâtes) n'est généré.
5. Tous les tests automatisés du projet s'exécutent avec 0 erreur.
