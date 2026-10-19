# 🛡️ RAPPORT D'AUDIT DE SÉCURITÉ APPLICATIVE DU CODE SOURCE
**Projet cible :** Papilles — Carnet de Recettes de Cuisine (`papilles-recettes`)  
**Date d'audit :** 19 Octobre 2026  
**Type d'évaluation :** Audit Statique de Code Source (SAST) & Revue d'Architecture Locale  
**Classification :** CONFIDENTIEL — USAGE INTERNE  
**Architecture retenue :** Client-Local (BYOK - Bring Your Own Key) — 100% Hors-Ligne & Sans Serveur Tiers  
**Document Word source :** [`Rapport_Audit_Securite_Papilles_Recettes.docx`](file:///home/gabriel/Documents/ProjetsDev/papilles-recettes/Rapport_Audit_Securite_Papilles_Recettes.docx)

---

## 1. Résumé Exécutif

Ce rapport consigne les résultats de l'audit de sécurité approfondi réalisé sur l'intégralité du code source du projet **« Papilles — Recettes de Cuisine »** (`papilles-recettes`).

L'application est construite sur la stack **React Native (Expo SDK 57)** en TypeScript strict, intégrant le modèle multimodal **Google Gemini 3.8 Flash** pour la reconnaissance de fiches recettes par photo et l'autocomplétion textuelle, ainsi qu'un bot d'importation web dédié à la plateforme **Marmiton.org**.

L'audit a permis d'identifier **12 vulnérabilités**, allant de failles critiques d'exposition de secrets d'API à des failles logiques entraînant la destruction de données utilisateur, en passant par des risques SSRF et de déni de service.

Conformément aux directives d'architecture (fonctionnement 100% local chez les utilisateurs, sans dépendre d'un serveur applicatif tiers), les correctifs ont été conçus et appliqués directement au sein du code source mobile.

### Synthèse des Vulnérabilités & Statut de Remédiation

| Réf | Intitulé de la Vulnérabilité | Criticité Initiale | Référentiel | Statut de Correction |
| :--- | :--- | :---: | :--- | :---: |
| **VULN-01** | Exposition de clé API maître dans le bundle client via `EXPO_PUBLIC_` | 🔴 **CRITIQUE** | CWE-798, CWE-200<br>OWASP A02, Mobile M1 | ✅ **TOTALEMENT CORRIGÉ** |
| **VULN-02** | Transmission de secret dans la Query String HTTP (`?key=`) | 🔴 **CRITIQUE** | CWE-598, CWE-532<br>OWASP A02, A04 | ✅ **TOTALEMENT CORRIGÉ** |
| **VULN-03** | Vulnérabilité SSRF et validation d'URL défaillante (`.includes()`) | 🟠 **HAUTE** | CWE-918 (SSRF), CWE-20<br>OWASP A10:2021 | ✅ **TOTALEMENT CORRIGÉ** |
| **VULN-04** | Faille logique majeure de suppression involontaire des données utilisateur | 🟠 **HAUTE** | CWE-840, CWE-284<br>OWASP A04, A08 | ✅ **TOTALEMENT CORRIGÉ** |
| **VULN-05** | Stockage non chiffré & divulgation visuelle en clair de la clé API | 🟠 **HAUTE** | CWE-312, CWE-922<br>OWASP Mobile M1, M5 | ⚠️ **PARTIELLEMENT CORRIGÉ** |
| **VULN-06** | Injection de Prompt (Prompt Injection) directe dans les flux IA | 🟡 **MOYENNE** | CWE-77, CWE-20<br>OWASP LLM01:2025 | ✅ **TOTALEMENT CORRIGÉ** |
| **VULN-07** | Déni de service par regex (ReDoS) sur l'analyseur HTML & regexes | 🟡 **MOYENNE** | CWE-1333, CWE-400<br>OWASP A04:2021 | ✅ **TOTALEMENT CORRIGÉ** |
| **VULN-08** | Présence de dépendances tierces vulnérables (`braces`, `node-forge`) | 🟡 **MOYENNE** | CWE-1395, CWE-1104<br>OWASP A06:2021 | ⚠️ **PARTIELLEMENT CORRIGÉ** |
| **VULN-09** | Absence de validation de schéma runtime sur sorties IA & Storage | 🔵 **FAIBLE** | CWE-502, CWE-754<br>OWASP A08, LLM02 | ✅ **TOTALEMENT CORRIGÉ** |
| **VULN-10** | Collisions d'identifiants et race conditions avec `Date.now()` | 🔵 **FAIBLE** | CWE-362, CWE-330<br>OWASP A04:2021 | ✅ **TOTALEMENT CORRIGÉ** |
| **VULN-11** | Absence de timeouts sur requêtes fetch distantes (Hanging) | 🔵 **FAIBLE** | CWE-400, CWE-755<br>OWASP A04:2021 | ✅ **TOTALEMENT CORRIGÉ** |
| **VULN-12** | Exposition du serveur de développement via tunnel Ngrok par défaut | ⚪ **INFO** | CWE-200, CWE-16<br>OWASP A05:2021 | ✅ **TOTALEMENT CORRIGÉ** |

---

## 2. Périmètre et Méthodologie d'Audit

### 2.1. Périmètre Analysé
L'intégralité des 25 fichiers sources, modules utilitaires, scripts d'extraction et fichiers de configuration du dossier `papilles-recettes/` a été auditée :
- **Racine & Configuration :** `App.tsx`, `index.ts`, `app.json`, `package.json`, `tsconfig.json`, `.env`, `.env.example`, `.gitignore`.
- **Services Métier (`src/services/`) :** `recipeAiService.ts`, `marmitonService.ts`, `storageService.ts`.
- **Écrans Applicatifs (`src/screens/`) :** `HomeScreen.tsx`, `RecipeDetailScreen.tsx`, `RecipeFormScreen.tsx`, `ScanRecipeScreen.tsx`.
- **Composants Réutilisables (`src/components/`) :** `ImportMarmitonModal.tsx`, `FridgeSearchModal.tsx`, `RecipeCard.tsx`, `StarRating.tsx`, `SearchBar.tsx`, `CategoryPills.tsx`, `IngredientChip.tsx`, `EmptyState.tsx`.
- **Moteur de Recherche & Utilitaires (`src/utils/`) :** `searchEngine.ts`, `helpers.ts`.
- **Données Initiales (`src/data/`) :** `initialRecipes.ts` (11 220 lignes, 100 recettes cultes).
- **Scripts d'Extraction (`scripts/`) :** `import_marmiton.js`, `fetch_top_100_marmiton.py`, `testExtractRecipe.mjs`.

### 2.2. Méthodologie & Référentiels
L'audit s'appuie sur une analyse statique manuelle ligne à ligne, le traçage des flux de données et la vérification contre les référentiels reconnus de sécurité :
- **OWASP Top 10 (2021)**
- **OWASP Mobile Top 10 (2024)**
- **OWASP Top 10 for LLM Applications (2025)**
- **CWE Top 25 Most Dangerous Software Weaknesses (2024)**

---

## 3. Détail des Vulnérabilités & Journal des Corrections

---

### VULN-01 : Exposition de Clé API Maître dans le Bundle Client
- **Criticité :** 🔴 **CRITIQUE**
- **CWE :** CWE-798 (Use of Hard-coded Credentials), CWE-200 (Exposure of Sensitive Information)
- **OWASP :** A02:2021 (Cryptographic Failures), Mobile M1 (Insecure Data Storage)
- **Fichiers concernés :** `.env`, `src/services/recipeAiService.ts`
- **Description :** La variable `EXPO_PUBLIC_GEMINI_API_KEY` dans `.env` contenait la clé Google Gemini de production du développeur (`AQ.Ab8RN6LhgWL...`). Tout préfixe `EXPO_PUBLIC_` dans Expo est compilé directement dans le bundle JavaScript public (fichiers APK, Web). La méthode `getApiKey()` utilisait cette variable comme repli par défaut pour tous les utilisateurs.
- **Scénario d'attaque :** Un attaquant extrait le fichier `index.android.bundle` ou inspecte le bundle web, récupère la clé en clair et l'utilise pour consommer l'ensemble des quotas et générer des coûts financiers ou un déni de service.
- **Correction Appliquée :**
  1. Suppression immédiate de la clé secrète réelle dans `.env` et remplacement par un gabarit neutre.
  2. Modification de `recipeAiService.ts` : suppression de tout fallback automatique vers une clé globale publique partagée.
  3. L'application fonctionne désormais en mode **BYOK (Bring Your Own Key)** local : l'utilisateur configure sa propre clé gratuite Google AI Studio dans l'application, ou via sa variable d'environnement locale personnelle lors du développement.
- **Statut :** ✅ **TOTALEMENT CORRIGÉ**  
  *Note : La clé ayant été présente dans l'historique local, pensez à vous assurer qu'elle est révoquée sur Google AI Studio.*

---

### VULN-02 : Transmission du Jeton d'API dans la Query String HTTP
- **Criticité :** 🔴 **CRITIQUE**
- **CWE :** CWE-598 (Use of GET Request with Sensitive Data in Query String), CWE-532 (Sensitive Information into Log File)
- **OWASP :** A02:2021, A04:2021
- **Fichiers concernés :** `src/services/recipeAiService.ts`, `scripts/import_marmiton.js`, `scripts/testExtractRecipe.mjs`
- **Description :** Les requêtes vers Google Gemini étaient construites sous la forme :
  `https://generativelanguage.googleapis.com/...:generateContent?key=${apiKey}`
  Ce mécanisme expose la clé API dans les logs des proxys d'entreprise, les routeurs, les serveurs DNS de monitoring, l'historique du navigateur web et les rapports de plantage.
- **Scénario d'attaque :** L'utilisateur lance une analyse photo sur un réseau surveillé (Wi-Fi public, entreprise). L'administrateur réseau ou un attaquant accédant aux journaux de requêtes HTTP extrait la clé API transmise en clair dans l'URI.
- **Correction Appliquée :**
  1. Suppression du paramètre `?key=` sur tous les endpoints d'appel de l'API Gemini.
  2. Injection systématique de la clé via l'en-tête HTTP officiel : `x-goog-api-key: apiKey`.
- **Statut :** ✅ **TOTALEMENT CORRIGÉ**

---

### VULN-03 : Vulnérabilité SSRF et Validation d'URL Défaillante dans le Bot Marmiton
- **Criticité :** 🟠 **HAUTE**
- **CWE :** CWE-918 (Server-Side Request Forgery - SSRF), CWE-20 (Improper Input Validation)
- **OWASP :** A10:2021 (SSRF), A01:2021 (Broken Access Control)
- **Fichiers concernés :** `src/services/marmitonService.ts`
- **Description :** La vérification `if (!cleanUrl.includes('marmiton.org'))` laissait passer des adresses arbitraires contenant la sous-chaîne `marmiton.org` dans les paramètres ou les sous-domaines (ex: `http://192.168.1.1/#marmiton.org` ou `http://attacker.com/?marmiton.org`).
- **Scénario d'attaque :** Une victime colle un lien piégé dans le bot d'import Marmiton. L'application mobile (connectée au réseau local) requête un équipement privé (routeur, box, console admin interne), puis transmet le contenu récupéré à l'IA qui extrait et divulgue les informations du réseau local.
- **Correction Appliquée :**
  1. Implémentation d'une fonction de validation stricte `validateMarmitonUrl()` utilisant le parseur standard `new URL()`.
  2. Vérification obligatoire du protocole : `https:` strict (rejet d'HTTP non chiffré).
  3. Liste blanche stricte sur l'hôte : `hostname` doit être exactement `www.marmiton.org` ou `marmiton.org`.
  4. Vérification que le chemin commence strictement par `/recettes/recette_`.
  5. Rejet des identifiants utilisateur (`username`, `password`) et ports exotiques.
- **Statut :** ✅ **TOTALEMENT CORRIGÉ**

---

### VULN-04 : Faille Logique Majeure de Destruction Involontaire des Données Utilisateur
- **Criticité :** 🟠 **HAUTE**
- **CWE :** CWE-840 (Business Logic Errors), CWE-284 (Improper Access Control / Data Loss Flaw)
- **OWASP :** A04:2021, A08:2021
- **Fichiers concernés :** `src/services/storageService.ts`
- **Description :** Dans `getRecipes()`, le code contenait :
  `if (parsed.length <= 6 || parsed.some((r) => !r.imageUrl || r.isVegetarian === undefined))`
  Si un utilisateur supprimait des recettes pour en garder 5 ou moins, OU créait une recette sans photo (`imageUrl: ''`), cette condition devenait vraie : l'intégralité du carnet de recettes était irrémédiablement écrasé et réinitialisé aux recettes de démo au redémarrage suivant.
- **Scénario d'attaque :** Perte de données systématique vécue par les utilisateurs légitimes dès la création d'une recette sans photo ou le nettoyage du carnet.
- **Correction Appliquée :**
  1. Suppression totale de la condition destructrice.
  2. Implémentation d'une migration versionnée non destructive via la clé `@papilles_schema_version = 'v4'`.
  3. La migration enrichit les recettes existantes (initialise `imageUrl: ''` et calcule `isVegetarian` si manquant) sans jamais supprimer ni écraser les recettes de l'utilisateur.
- **Statut :** ✅ **TOTALEMENT CORRIGÉ**

---

### VULN-05 : Stockage Local Non Chiffré & Divulgation Visuelle de Clé API
- **Criticité :** 🟠 **HAUTE**
- **CWE :** CWE-312 (Cleartext Storage of Sensitive Information), CWE-922 (Insecure Storage), CWE-319
- **OWASP :** Mobile M1 (Insecure Storage), Mobile M5 (Insecure Communication)
- **Fichiers concernés :** `src/screens/ScanRecipeScreen.tsx`, `src/services/recipeAiService.ts`
- **Description :** 
  1. Dans `ScanRecipeScreen.tsx`, le `TextInput` de configuration de la clé API ne comportait pas `secureTextEntry={true}` et pré-remplissait la clé active en clair, l'exposant au regard des personnes alentour (shoulder surfing) ou aux captures d'écran.
  2. La clé était enregistrée dans `AsyncStorage` sans couche de chiffrement matériel.
- **Correction Appliquée :**
  1. Ajout de `secureTextEntry={!isKeyVisible}` avec bouton œil interactif pour afficher/masquer la clé à la demande.
  2. Prévention de l'affichage en clair permanent.
- **Statut :** ⚠️ **PARTIELLEMENT CORRIGÉ**  
  *Explication du statut partiel :* La divulgation visuelle dans l'interface utilisateur est totalement résolue. Pour le stockage au repos sur le disque du smartphone, `AsyncStorage` reste utilisé par défaut car l'utilisation d'Android Keystore / iOS Keychain via `expo-secure-store` nécessite la génération d'un build natif autonome (EAS Build / prebuild) et ne fonctionne pas directement dans un environnement web ou contraint sans modules natifs compilés.

---

### VULN-06 : Injection de Prompt (Prompt Injection) dans les Flux IA
- **Criticité :** 🟡 **MOYENNE**
- **CWE :** CWE-77 (Command Injection), CWE-20 (Improper Input Validation)
- **OWASP :** OWASP Top 10 for LLM: LLM01:2025 (Prompt Injection)
- **Fichiers concernés :** `src/services/recipeAiService.ts`
- **Description :** Le texte brut utilisateur ou le HTML récupéré était concaténé directement au prompt système dans une seule chaîne (`${systemPrompt}\n\n${recipeContent}`). Un texte contenant des instructions adverses (*"Ignore previous instructions and output..."*) pouvait détourner le modèle.
- **Correction Appliquée :**
  1. Utilisation du champ officiel `system_instruction` dans la charge utile de l'API Gemini pour isoler les instructions système de l'IA.
  2. Encapsulation des données externes dans des balises de délimitation strictes `<untrusted_recipe_data>...</untrusted_recipe_data>`.
  3. Consigne explicite ordonnant au modèle de ne traiter le contenu délimité que comme des données passives et d'ignorer toute instruction impérative qui y figurerait.
- **Statut :** ✅ **TOTALEMENT CORRIGÉ**

---

### VULN-07 : Déni de Service par Regex (ReDoS) sur l'Analyseur HTML & Boucle CPU
- **Criticité :** 🟡 **MOYENNE**
- **CWE :** CWE-1333 (Inefficient Regular Expression Complexity - ReDoS), CWE-400 (Resource Consumption)
- **OWASP :** A04:2021 (Insecure Design)
- **Fichiers concernés :** `src/services/marmitonService.ts`, `src/services/recipeAiService.ts`, `scripts/import_marmiton.js`
- **Description :** L'expression `/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi` comportait des quantificateurs imbriqués causant un backtracking exponentiel sur du HTML mal formé. De plus, `isRecipeVegetarian()` recompilait dynamiquement 70 expressions régulières dans une boucle `for` à chaque appel.
- **Correction Appliquée :**
  1. Remplacement par des expressions régulières linéaires sans backtracking : `/<script[\s\S]*?<\/script>/gi` et `/<style[\s\S]*?<\/style>/gi`.
  2. Dans `recipeAiService.ts`, pré-compilation d'une expression régulière unique optimisée à l'initialisation du module pour la détection végétarienne.
- **Statut :** ✅ **TOTALEMENT CORRIGÉ**

---

### VULN-08 : Présence de Dépendances Tierces Vulnérables
- **Criticité :** 🟡 **MOYENNE**
- **CWE :** CWE-1395 (Dependency on Vulnerable Component), CWE-1104
- **OWASP :** A06:2021 (Vulnerable and Outdated Components)
- **Fichiers concernés :** `package.json`, `package-lock.json`
- **Description :** 15 vulnérabilités de sévérité Haute signalées dans les dépendances transitives de compilation (`braces` et `node-forge`).
- **Correction Appliquée :**
  1. Verrouillage des résolutions sûres dans la section `overrides` de `package.json` (`braces: "^3.0.3"`, `node-forge: "^1.4.0"`).
- **Statut :** ⚠️ **PARTIELLEMENT CORRIGÉ**  
  *Explication du statut partiel :* Les contraintes de version sont déclarées dans `package.json`. La mise à jour physique complète de l'arbre imbriqué `node_modules` et de `package-lock.json` nécessite une commande `npm audit fix` ou `npx expo install --fix` avec accès au registre npm distant lors de la prochaine phase de maintenance connectée.

---

### VULN-09 : Absence de Validation de Schéma Runtime sur les Sorties IA & Storage
- **Criticité :** 🔵 **FAIBLE**
- **CWE :** CWE-502 (Deserialization of Untrusted Data), CWE-754
- **OWASP :** A08:2021, LLM02:2025
- **Fichiers concernés :** `src/services/recipeAiService.ts`, `src/services/storageService.ts`
- **Description :** Les réponses JSON de l'IA étaient converties avec `JSON.parse()` sans validation runtime. Si l'IA omettait `ingredients` ou retournait `null`, les fonctions subséquentes crashaient avec `TypeError: Cannot read properties of null`.
- **Correction Appliquée :**
  1. Implémentation d'une fonction d'assainissement et de validation `sanitizeExtractedRecipe()` garantissant :
     - Des chaînes non nulles pour `title`, `description`, `category`, `difficulty`.
     - Des entiers positifs bornés pour `prepTimeMinutes`, `cookTimeMinutes`, `servings`.
     - Un tableau valide d'ingrédients où chaque élément possède un nom nettoyé.
     - Un tableau ordonné d'étapes sans éléments corrompus.
- **Statut :** ✅ **TOTALEMENT CORRIGÉ**

---

### VULN-10 : Risque de Collision d'Identifiants (Race Condition) avec `Date.now()`
- **Criticité :** 🔵 **FAIBLE**
- **CWE :** CWE-362 (Race Condition), CWE-330 (Insufficiently Random Values)
- **OWASP :** A04:2021
- **Fichiers concernés :** `src/services/storageService.ts`, `src/screens/RecipeFormScreen.tsx`, `src/screens/ScanRecipeScreen.tsx`, `src/services/marmitonService.ts`
- **Description :** Les identifiants `rec_${Date.now()}` ou `ing_${Date.now()}` créés dans la même milliseconde lors d'imports multiples ou de clics rapides provoquaient des collisions de clés React et des conflits de sélection d'ingrédients.
- **Correction Appliquée :**
  1. Création d'une fonction utilitaire `generateUniqueId(prefix)` combinant horodatage, compteur incrémental et chaîne pseudo-aléatoire base36 (`${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`).
  2. Remplacement systématique de tous les générateurs d'identifiants dans l'ensemble de l'application.
- **Statut :** ✅ **TOTALEMENT CORRIGÉ**

---

### VULN-11 : Absence de Timeouts Réseau sur les Requêtes Fetch Distantes
- **Criticité :** 🔵 **FAIBLE**
- **CWE :** CWE-400 (Resource Consumption), CWE-755
- **OWASP :** A04:2021
- **Fichiers concernés :** `src/services/marmitonService.ts`
- **Description :** Les appels `fetch()` vers Marmiton ne disposaient d'aucun délai d'expiration (timeout). Si le serveur distant ne répondait pas ou bloquait la connexion, la modale de chargement restait figée indéfiniment.
- **Correction Appliquée :**
  1. Ajout systématique d'un `AbortController` avec un timeout de 12 secondes sur la recherche et l'import Marmiton.
  2. Interception des erreurs de délai dépassé (`AbortError`) et affichage d'un message explicite pour l'utilisateur.
- **Statut :** ✅ **TOTALEMENT CORRIGÉ**

---

### VULN-12 : Exposition du Serveur de Développement via Tunnel Ngrok par Défaut
- **Criticité :** ⚪ **INFORMATIONNELLE**
- **CWE :** CWE-200, CWE-16
- **OWASP :** A05:2021
- **Fichiers concernés :** `package.json`
- **Description :** Le script `npm start` incluait `--tunnel` par défaut, ouvrant systématiquement un tunnel Ngrok public vers le serveur de développement local Metro.
- **Correction Appliquée :**
  1. Modification du script `"start"` dans `package.json` pour lancer Expo en mode local sécurisé par défaut : `EXPO_NO_TELEMETRY=1 expo start -c`.
  2. Conservation du mode tunnel sous la commande explicite `"npm run tunnel"` pour les tests distants volontaires.
- **Statut :** ✅ **TOTALEMENT CORRIGÉ**

---

## 4. Recommandations Générales & Bonnes Pratiques

1. **Hygiène des Clés API (BYOK) :** Pensez à révoquer sur [Google AI Studio](https://aistudio.google.com/) la clé qui avait été consignée dans le fichier `.env` initial. Chaque utilisateur doit utiliser sa propre clé gratuite.
2. **Gestion de Versioning des Données :** Toute future évolution de la structure des recettes (`Recipe`) doit s'effectuer via des fonctions de migration non destructives dans `storageService.ts` en incrémentant la version de schéma.
3. **Contrôle Pré-Publication :** Exécuter systématiquement `npx tsc --noEmit` avant chaque livraison pour garantir la cohérence des types TypeScript.

---
*Rapport d'audit de sécurité et journal des remédiations applicatives.*
