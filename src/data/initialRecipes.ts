import { Recipe } from '../types/recipe';

/**
 * Les 100 meilleures recettes cultes de Marmiton,
 * pré-chargées par défaut dans Papilles avec photos haute résolution et catégorisation végétarienne.
 * Ingrédients strictement normalisés selon le lexique canonique Papilles.
 */
export const INITIAL_RECIPES: Recipe[] = [
  {
    "id": "rec_top100_001",
    "title": "Blanquette de veau",
    "description": "Recette Blanquette de veau : recette traditionnelle : la meilleure recette rapide et facile : 4 personnes, 135 min de préparation. Notée 4.9/5 par 2776 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 120,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20190529/93191_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_blanquette-de-veau-facile_19219.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_001_1",
        "name": "Veau",
        "canonicalId": "ing_canon_veau",
        "quantity": "1",
        "unit": "kg",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_001_2",
        "name": "Bouillon de volaille",
        "canonicalId": "ing_canon_bouillon_de_volaille",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_001_3",
        "name": "Carotte",
        "canonicalId": "ing_canon_carotte",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_001_4",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_001_5",
        "name": "Champignon de Paris",
        "canonicalId": "ing_canon_champignon_de_paris",
        "quantity": "1",
        "unit": "boîte",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_001_6",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "1",
        "unit": "pot",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_001_7",
        "name": "Citron",
        "canonicalId": "ing_canon_citron",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_001_8",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_001_9",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_001_10",
        "name": "Vin blanc",
        "canonicalId": "ing_canon_vin_blanc",
        "quantity": "25",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_001_11",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_001_12",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_001_13",
        "name": "Bouillon de légumes",
        "canonicalId": "ing_canon_bouillon_de_legumes",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_001_1",
        "order": 1,
        "instruction": "Faire revenir la viande dans un peu de beurre doux jusqu'à ce que les morceaux soient un peu dorés."
      },
      {
        "id": "stp_rec_top100_001_2",
        "order": 2,
        "instruction": "Saupoudrer de 2 cuillères de farine. Bien remuer."
      },
      {
        "id": "stp_rec_top100_001_3",
        "order": 3,
        "instruction": "Ajouter 2 ou 3 verres d'eau, les cubes de bouillon, le vin et remuer. Ajouter de l'eau si nécessaire pour couvrir."
      },
      {
        "id": "stp_rec_top100_001_4",
        "order": 4,
        "instruction": "Couper les carottes en rondelles et émincer les oignons puis les incorporer à la viande, ainsi que les champignons."
      },
      {
        "id": "stp_rec_top100_001_5",
        "order": 5,
        "instruction": "Laisser mijoter à feu très doux environ 1h30 à 2h00 en remuant."
      },
      {
        "id": "stp_rec_top100_001_6",
        "order": 6,
        "instruction": "Si nécessaire, ajouter de l'eau de temps en temps."
      },
      {
        "id": "stp_rec_top100_001_7",
        "order": 7,
        "instruction": "Dans un bol, bien mélanger la crème fraîche, le jaune d’oeuf et le jus de citron. Ajouter ce mélange au dernier moment, bien remuer et servir tout de suite."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20190529/93191_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20230619/143548_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20131223/2265_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_002",
    "title": "La Vraie Moussaka Grecque",
    "description": "La moussaka est un plat complet d’origine grecque, à base d’aubergines, de viande hachée et de béchamel. Un peu long à préparer, mais tellement savoureux une fois gratiné !",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 155,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20220623/133014_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_la-vraie-moussaka-grecque_72593.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_002_1",
        "name": "Aubergine",
        "canonicalId": "ing_canon_aubergine",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_2",
        "name": "Pomme de terre",
        "canonicalId": "ing_canon_pomme_de_terre",
        "quantity": "6",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_3",
        "name": "Bœuf",
        "canonicalId": "ing_canon_b_uf",
        "quantity": "500",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_4",
        "name": "Tomate",
        "canonicalId": "ing_canon_tomate",
        "quantity": "5",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_5",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_6",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_7",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "30",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_8",
        "name": "Petite cuillere de cannelle",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_9",
        "name": "Miel",
        "canonicalId": "ing_canon_miel",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_10",
        "name": "Muscade",
        "canonicalId": "ing_canon_muscade",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_11",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_12",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_13",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "20",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_14",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "3",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_002_15",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "35",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_002_1",
        "order": 1,
        "instruction": "Préparation de la sauce tomate. Emincer les oignons et les faire blondir dans une petite casserole."
      },
      {
        "id": "stp_rec_top100_002_2",
        "order": 2,
        "instruction": "Ajouter les tomates coupées en gros dés et 2 bonnes cuillères à soupe d'huile d'olive, la cannelle, le miel, saler et poivrer. Laisser réduire le tout 25 minutes (ou plus, jusqu'à arriver à la préparation de la viande) à feu moyen.  On doit obtenir une sauce, que l'on peut homogénéiser avec du coulis de tomate tout prêt."
      },
      {
        "id": "stp_rec_top100_002_3",
        "order": 3,
        "instruction": "Préparation des aubergines.  Découper les aubergines en rondelles (sans les peler), saler généreusement, et les laisser dégorger le temps de l'étape suivante.  Conseil pour faire dégorger les aubergines : dans un plat, alterner une couche de tranches d'aubergine salées et une couche de papier absorbant ou les laisser dans une passoire."
      },
      {
        "id": "stp_rec_top100_002_4",
        "order": 4,
        "instruction": "Préparation des pommes de terre.  Eplucher et découper les pommes de terres en fines rondelles."
      },
      {
        "id": "stp_rec_top100_002_5",
        "order": 5,
        "instruction": "Disposer les rondelles de pommes de terre au fond d'un plat à gratin assez haut, huilé. Arroser les pommes de terres d'un peu (3 cuillères à soupe) du jus rendu par les tomates qui mijotent."
      },
      {
        "id": "stp_rec_top100_002_6",
        "order": 6,
        "instruction": "Passer le plat de pommes de terre sous le grill 5 à 15 min selon votre four, pour qu'elles dorent."
      },
      {
        "id": "stp_rec_top100_002_7",
        "order": 7,
        "instruction": "Maintenant qu'elles ont dégorgé, passer les rondelles d'aubergine à la poêle à feu fort pour les faire griller un peu de chaque côté, réserver."
      },
      {
        "id": "stp_rec_top100_002_8",
        "order": 8,
        "instruction": "Préparation de la viande.  Dans un faitout, faire revenir la viande hachée au beurre à feu assez fort, saler, poivrer et retirer l'eau rendue par la viande."
      },
      {
        "id": "stp_rec_top100_002_9",
        "order": 9,
        "instruction": "Ajouter la sauce tomate-oignons et baisser le feu (très doux)."
      },
      {
        "id": "stp_rec_top100_002_10",
        "order": 10,
        "instruction": "Sortir le plat de pommes de terres du four et le préchauffer le four à 200°C (thermostat 6-7)."
      },
      {
        "id": "stp_rec_top100_002_11",
        "order": 11,
        "instruction": "Préparation de la béchamel.  Dans une petite casserole sur feu doux, faire blondir les 20 g de beurre, ajouter la farine et mélanger pour obtenir un appareil homogène."
      },
      {
        "id": "stp_rec_top100_002_12",
        "order": 12,
        "instruction": "Incorporer petit à petit le lait en n'arrêtant jamais de remuer, ça peut prendre 10 bonnes minutes, on doit obtenir une sauce assez épaisse."
      },
      {
        "id": "stp_rec_top100_002_13",
        "order": 13,
        "instruction": "Saler, poivrer et râper un peu de noix de muscade (c'est fort, il faut en mettre peu)."
      },
      {
        "id": "stp_rec_top100_002_14",
        "order": 14,
        "instruction": "Montage de la moussaka. Par dessus la couche de pommes de terre, étaler la moitié de la viande hachée avec la tomate, puis la moitié des aubergines, puis l'autre moitié de viande, puis l'autre moitié des aubergines, un filet d'huile d'olive et terminer par la béchamel."
      },
      {
        "id": "stp_rec_top100_002_15",
        "order": 15,
        "instruction": "Enfourner le tout dans le four à 200°C (thermostat 6-7) et laisser cuire 1h (la béchamel doit croustiller et être dorée)."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20220623/133014_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20221013/136125_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180503/79002_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_003",
    "title": "Génoise ultra-rapide et pourtant si aérienne...",
    "description": "Recette Génoise ultra-rapide et pourtant si aérienne... : la meilleure recette rapide et facile : 6 personnes, 30 min de préparation. Notée 4.9/5 par 788 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 20,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20180726/81587_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_genoise-ultra-rapide-et-pourtant-si-aerienne_49844.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_003_1",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_003_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_003_3",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_003_4",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "0.5",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_003_1",
        "order": 1,
        "instruction": "Pour réaliser cette recette, il vous faut un robot qui permette d'ajouter des ingrédients au fur et mesure sans devoir tout arrêter et ouvrir un couvercle à chaque fois..."
      },
      {
        "id": "stp_rec_top100_003_2",
        "order": 2,
        "instruction": "Mais c'est la recette idéale pour tous ceux qui sont fâchés avec les interminables montages au bain-marie !"
      },
      {
        "id": "stp_rec_top100_003_3",
        "order": 3,
        "instruction": "Le secret de la réussite de cette génoise, c'est la rapidité d'exécution. Préparez donc tout ce dont vous aurez besoin avant de vous lancez, beurrez le moule si vous n'avez pas encore opté pour le silicone, pesez les ingrédients... et préchauffez le four à 180°C (th 6)."
      },
      {
        "id": "stp_rec_top100_003_4",
        "order": 4,
        "instruction": "Mélangez la levure à la farine."
      },
      {
        "id": "stp_rec_top100_003_5",
        "order": 5,
        "instruction": "Séparez les blancs des jaunes d'oeufs, et montez les blancs en neige avec une pincée de sel."
      },
      {
        "id": "stp_rec_top100_003_6",
        "order": 6,
        "instruction": "Quand ils sont très fermes, ajoutez le sucre et battez encore."
      },
      {
        "id": "stp_rec_top100_003_7",
        "order": 7,
        "instruction": "Baissez la vitesse du robot et ajoutez d'un coup les 4 jaunes, puis tout de suite la farine et la levure en pluie."
      },
      {
        "id": "stp_rec_top100_003_8",
        "order": 8,
        "instruction": "Arrêtez très rapidement le robot pour que la préparation n'ait pas le temps de retomber, versez dans le moule, lissez la surface et enfournez immédiatement pour 20 min."
      },
      {
        "id": "stp_rec_top100_003_9",
        "order": 9,
        "instruction": "Démoulez tiède et attendez que le gâteau soit refroidi pour le trancher dans l'épaisseur et le garnir."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20180726/81587_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160401/48369_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160830/48145_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_004",
    "title": "Gratin dauphinois, recette originale et peu chère",
    "description": "Recette Gratin dauphinois, recette originale et peu chère : la meilleure recette rapide et facile : 5 personnes, 90 min de préparation. Notée 4.9/5 par 757 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 30,
    "cookTimeMinutes": 60,
    "servings": 5,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20201217/116564_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_gratin-dauphinois-recette-originale_22307.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_004_1",
        "name": "Pomme de terre belle de fontenay",
        "quantity": "1",
        "unit": "kg",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_004_2",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "1",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_004_3",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "2",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_004_4",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_004_5",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_004_1",
        "order": 1,
        "instruction": "Préchauffer le four à 150°C (thermostat 5)."
      },
      {
        "id": "stp_rec_top100_004_2",
        "order": 2,
        "instruction": "Eplucher et couper les pommes de terres en rondelles.   Presser l'ail."
      },
      {
        "id": "stp_rec_top100_004_3",
        "order": 3,
        "instruction": "Napper le fond d'un plat à gratin de crème."
      },
      {
        "id": "stp_rec_top100_004_4",
        "order": 4,
        "instruction": "Alterner une couche de pommes de terres, crème, ail, sel, poivre,"
      },
      {
        "id": "stp_rec_top100_004_5",
        "order": 5,
        "instruction": "jusqu'à épuisement des ingrédients."
      },
      {
        "id": "stp_rec_top100_004_6",
        "order": 6,
        "instruction": "Terminer en nappant de crème, sel, poivre."
      },
      {
        "id": "stp_rec_top100_004_7",
        "order": 7,
        "instruction": "Mettre au four pendant au moins une heure.  Plus la température est basse et le temps de cuisson long, plus les pommes seront fondantes..."
      },
      {
        "id": "stp_rec_top100_004_8",
        "order": 8,
        "instruction": "Déguster"
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20201217/116564_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20170201/63483_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160401/63482_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_005",
    "title": "Ramequins fondants au chocolat",
    "description": "Recette Ramequins fondants au chocolat : la meilleure recette rapide et facile : 4 personnes, 22 min de préparation. Notée 4.8/5 par 3177 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 12,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160610/21702_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_ramequins-fondants-au-chocolat_15816.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_005_1",
        "name": "Chocolat noir + 8 carres",
        "quantity": "120",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_005_2",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_005_3",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "80",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_005_4",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "35",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_005_5",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_005_1",
        "order": 1,
        "instruction": "Faites fondre dans une casserole le chocolat et le beurre, en remuant régulièrement pour former une pâte homogène et onctueuse."
      },
      {
        "id": "stp_rec_top100_005_2",
        "order": 2,
        "instruction": "Préchauffez le four à 210°C (thermostat 7). Dans un saladier, mélangez les oeufs, le sucre et la farine."
      },
      {
        "id": "stp_rec_top100_005_3",
        "order": 3,
        "instruction": "Incorporez la préparation chocolatée et mélangez."
      },
      {
        "id": "stp_rec_top100_005_4",
        "order": 4,
        "instruction": "Versez 1/3 de la préparation dans des ramequins individuels."
      },
      {
        "id": "stp_rec_top100_005_5",
        "order": 5,
        "instruction": "Déposez deux carrés de chocolat dans chacun des 4 ramequins,"
      },
      {
        "id": "stp_rec_top100_005_6",
        "order": 6,
        "instruction": "puis recouvrez-les avec le reste de la préparation chocolatée."
      },
      {
        "id": "stp_rec_top100_005_7",
        "order": 7,
        "instruction": "Placez les ramequins au four pendant environ 12 minutes, pas plus!"
      },
      {
        "id": "stp_rec_top100_005_8",
        "order": 8,
        "instruction": "Dégustez de préférence chauds ou tièdes."
      },
      {
        "id": "stp_rec_top100_005_9",
        "order": 9,
        "instruction": "Miam !"
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160610/21702_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160610/21700_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130627/21701_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_006",
    "title": "Gratin de courgettes rapide",
    "description": "Recette Gratin de courgettes rapide : la meilleure recette rapide et facile : 4 personnes, 30 min de préparation. Notée 4.9/5 par 652 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Facile",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 15,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20190529/93185_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_gratin-de-courgettes-rapide_17071.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_006_1",
        "name": "Courgette",
        "canonicalId": "ing_canon_courgette",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_006_2",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_006_3",
        "name": "Fromage râpé",
        "canonicalId": "ing_canon_fromage_rape",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_006_4",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_006_5",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_006_6",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_006_7",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_006_8",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_006_1",
        "order": 1,
        "instruction": "Emincer les oignons."
      },
      {
        "id": "stp_rec_top100_006_2",
        "order": 2,
        "instruction": "Les faire fondre dans le beurre."
      },
      {
        "id": "stp_rec_top100_006_3",
        "order": 3,
        "instruction": "Râper 4 courgettes avec leur peau."
      },
      {
        "id": "stp_rec_top100_006_4",
        "order": 4,
        "instruction": "Les ajouter aux oignons."
      },
      {
        "id": "stp_rec_top100_006_5",
        "order": 5,
        "instruction": "Préchauffer le four à 200°C (thermostat 6-7)."
      },
      {
        "id": "stp_rec_top100_006_6",
        "order": 6,
        "instruction": "Mélanger le gruyère râpé, les oeufs, la crème fraîche, puis saler et poivrer."
      },
      {
        "id": "stp_rec_top100_006_7",
        "order": 7,
        "instruction": "Mettre les courgettes dans un plat et verser par dessus la sauce et faire à four chaud pendant 15 min."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20190529/93185_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20190529/93181_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20190529/93184_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_007",
    "title": "Tiramisu (recette originale)",
    "description": "Recette Tiramisu (recette originale) : la meilleure recette rapide et facile : 4 personnes, 15 min de préparation. Notée 4.8/5 par 2813 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 0,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20190529/93097_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_tiramisu-recette-originale_12023.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_007_1",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_007_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_007_3",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_007_4",
        "name": "Mascarpone",
        "canonicalId": "ing_canon_mascarpone",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_007_5",
        "name": "Biscuit à la cuillère",
        "canonicalId": "ing_canon_biscuit_a_la_cuillere",
        "quantity": "24",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_007_6",
        "name": "Cafe noir non sucre",
        "quantity": "50",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_007_7",
        "name": "Cacao en poudre",
        "canonicalId": "ing_canon_cacao_en_poudre",
        "quantity": "30",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_007_1",
        "order": 1,
        "instruction": "Séparer les blancs des jaunes d'oeufs."
      },
      {
        "id": "stp_rec_top100_007_2",
        "order": 2,
        "instruction": "Mélanger les jaunes avec le sucre roux et le sucre vanillé."
      },
      {
        "id": "stp_rec_top100_007_3",
        "order": 3,
        "instruction": "Ajouter le mascarpone au fouet."
      },
      {
        "id": "stp_rec_top100_007_4",
        "order": 4,
        "instruction": "Monter les blancs en neige et les incorporer délicatement à la spatule au mélange précédent. Réserver."
      },
      {
        "id": "stp_rec_top100_007_5",
        "order": 5,
        "instruction": "Mouiller les biscuits dans le café rapidement avant d'en tapisser le fond du plat."
      },
      {
        "id": "stp_rec_top100_007_6",
        "order": 6,
        "instruction": "Recouvrir d'une couche de crème au mascarpone puis répéter l'opération en alternant couche de biscuits et couche de crème en terminant par cette dernière."
      },
      {
        "id": "stp_rec_top100_007_7",
        "order": 7,
        "instruction": "Saupoudrer de cacao."
      },
      {
        "id": "stp_rec_top100_007_8",
        "order": 8,
        "instruction": "Mettre au réfrigérateur 4 heures minimum puis déguster frais."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20190529/93097_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20221013/136181_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20170614/69362_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_008",
    "title": "Le crumble aux pommes du Chat qui Tousse",
    "description": "Recette Le crumble aux pommes du Chat qui Tousse : la meilleure recette rapide et facile : 6 personnes, 55 min de préparation. Notée 4.8/5 par 2276 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 25,
    "cookTimeMinutes": 30,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20171020/73718_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_le-crumble-aux-pommes-du-chat-qui-tousse_10534.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_008_1",
        "name": "Pomme",
        "canonicalId": "ing_canon_pomme",
        "quantity": "6",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_008_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_008_3",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_008_4",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_008_5",
        "name": "Petite cuillere de cannelle",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_008_6",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_008_7",
        "name": "Citron",
        "canonicalId": "ing_canon_citron",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_008_1",
        "order": 1,
        "instruction": "Préchauffer le four à 210°C (thermostat 7)."
      },
      {
        "id": "stp_rec_top100_008_2",
        "order": 2,
        "instruction": "Peler, évider et découper les pommes en cubes grossiers, les répartir dans un plat allant au four."
      },
      {
        "id": "stp_rec_top100_008_3",
        "order": 3,
        "instruction": "Les arroser de jus du citron et les saupoudrer de cannelle et de sucre vanillé."
      },
      {
        "id": "stp_rec_top100_008_4",
        "order": 4,
        "instruction": "Dans un saladier, mélanger la farine et la cassonade. Puis ajouter le beurre en petits cubes et mélanger à la main de façon à former une pâte grumeleuse."
      },
      {
        "id": "stp_rec_top100_008_5",
        "order": 5,
        "instruction": "Émietter cette pâte au dessus des pommes de façon à les recouvrir."
      },
      {
        "id": "stp_rec_top100_008_6",
        "order": 6,
        "instruction": "Enfourner pour 30 minutes de cuisson."
      },
      {
        "id": "stp_rec_top100_008_7",
        "order": 7,
        "instruction": "Servir tiède avec de la crème fouettée ou de la glace à la vanille."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20171020/73718_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130123/50045_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20121214/50042_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_009",
    "title": "Quiche sans pâte",
    "description": "Recette Quiche sans pâte : la meilleure recette rapide et facile : 4 personnes, 40 min de préparation. Notée 4.9/5 par 610 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 30,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20221010/135902_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_quiche-sans-pate_12744.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_009_1",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_009_2",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "0.25",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_009_3",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "10",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_009_4",
        "name": "Grosses cuilleres a soupe de farine",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_009_5",
        "name": "Fromage râpé",
        "canonicalId": "ing_canon_fromage_rape",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_009_6",
        "name": "Des de jambon ou 4 tranches de jambon ou lardons",
        "quantity": "150",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_009_7",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_009_8",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_009_1",
        "order": 1,
        "instruction": "Mixez tous les ingrédients sauf le jambon, le découper en morceaux et mélanger ensuite avec le reste."
      },
      {
        "id": "stp_rec_top100_009_2",
        "order": 2,
        "instruction": "Placez dans un plat a tarte beurré et faites cuire une dmi-heure à 200°C."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20221010/135902_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180612/79546_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180612/79545_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_010",
    "title": "Parmentier de confit de canard",
    "description": "Recette Parmentier de confit de canard : la meilleure recette rapide et facile : 4 personnes, 45 min de préparation. Notée 5/5 par 329 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 25,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20221004/135706_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_parmentier-de-confit-de-canard_17048.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_010_1",
        "name": "Canard",
        "canonicalId": "ing_canon_canard",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_010_2",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_010_3",
        "name": "Échalote",
        "canonicalId": "ing_canon_echalote",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_010_4",
        "name": "Pomme de terre",
        "canonicalId": "ing_canon_pomme_de_terre",
        "quantity": "10",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_010_5",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_010_6",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_010_7",
        "name": "Veau",
        "canonicalId": "ing_canon_veau",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_010_8",
        "name": "Muscade",
        "canonicalId": "ing_canon_muscade",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_010_9",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_010_10",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_010_1",
        "order": 1,
        "instruction": "Lavez et épluchez les pommes de terre, et mettez-les à cuire dans un grand volume d'eau salée."
      },
      {
        "id": "stp_rec_top100_010_2",
        "order": 2,
        "instruction": "Réchauffez les cuisses de canard au bain-marie pour les extraire de leur graisse."
      },
      {
        "id": "stp_rec_top100_010_3",
        "order": 3,
        "instruction": "Conservez une cuillère à soupe de graisse de canard."
      },
      {
        "id": "stp_rec_top100_010_4",
        "order": 4,
        "instruction": "Découpez et hachez grossièrement les cuisses confites (surtout pas de mixer !)."
      },
      {
        "id": "stp_rec_top100_010_5",
        "order": 5,
        "instruction": "Emincer les échalotes et les oignons."
      },
      {
        "id": "stp_rec_top100_010_6",
        "order": 6,
        "instruction": "Dans une large poêle ou une sauteuse, faites blondir les oignons et les échalotes hachés dans la cuillère à soupe de graisse de canard, à feu très doux."
      },
      {
        "id": "stp_rec_top100_010_7",
        "order": 7,
        "instruction": "Lorsque ce mélange oignons + échalotes est bien blond, ajoutez le hachis de canard et mettez à feu vif, en mélangeant vivement, pendant 5 minutes. Le hachis de canard doit être finement grillé en surface, mais rester moelleux. Réservez hors du feu."
      },
      {
        "id": "stp_rec_top100_010_8",
        "order": 8,
        "instruction": "Ecrasez vos pommes de terre à la fourchette (pitié, pas de presse-purée !) et faites une purée moelleuse en ajoutant 50 % d'eau et 50 % de lait."
      },
      {
        "id": "stp_rec_top100_010_9",
        "order": 9,
        "instruction": "Salez, poivrez, ajoutez une pincée de muscade et la crème fraîche."
      },
      {
        "id": "stp_rec_top100_010_10",
        "order": 10,
        "instruction": "Préchauffez le four à 200°C (thermostat 6-7)."
      },
      {
        "id": "stp_rec_top100_010_11",
        "order": 11,
        "instruction": "Dans un plat suffisamment haut, étalez la moitié de votre hachis de canard."
      },
      {
        "id": "stp_rec_top100_010_12",
        "order": 12,
        "instruction": "Mélangez la moitié qui reste avec le même volume de purée, et étalez cette deuxième couche sur la première. Finissez par une troisième couche de purée."
      },
      {
        "id": "stp_rec_top100_010_13",
        "order": 13,
        "instruction": "Striez le sommet de votre purée avec le dos d'une fourchette."
      },
      {
        "id": "stp_rec_top100_010_14",
        "order": 14,
        "instruction": "Laissez cuire à four chaud (200°C) pendant 25 min. Vous pouvez également finir la cuisson 3 minutes sous le gril pour obtenir un joli gratiné."
      },
      {
        "id": "stp_rec_top100_010_15",
        "order": 15,
        "instruction": "Servez avec une salade (mâche, par exemple) et un Cahors léger: ce plat ne paye pas de mine, mais vos convives seront très agréablement surpris !"
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20221004/135706_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20141009/1649_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20141009/1648_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_011",
    "title": "Crème pâtissière",
    "description": "Incontournable de la pâtisserie, la crème pâtissière est la base de nombreuses gourmandises : éclairs, mille-feuilles, choux ou tartes aux fruits. Avec sa texture onctueuse et son goût vanillé irrésistible, elle sublime tous les desserts maison. Suivez cette recette simple pour réussir une crème pâtissière parfaite à chaque fois !",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 15,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20221007/135812_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_creme-patissiere_35195.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_011_1",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "1",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_011_2",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_011_3",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_011_4",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_011_5",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_011_1",
        "order": 1,
        "instruction": "Mélanger les jaunes d'oeuf avec le sucre. Battre au fouet jusqu'à que le mélange blanchisse."
      },
      {
        "id": "stp_rec_top100_011_2",
        "order": 2,
        "instruction": "Ajouter la farine et bien mélanger avec le mélange sucre/oeufs. Ajouter 1/2 verre de lait pour que le mélange soit plus liquide."
      },
      {
        "id": "stp_rec_top100_011_3",
        "order": 3,
        "instruction": "Mettre à chauffer le lait. Lorsque le lait est tiède (au bout de 3-4 min) ajouter le mélange oeufs/farine/sucre/lait et la gousse de vanille fendue et grattée avec ses graines."
      },
      {
        "id": "stp_rec_top100_011_4",
        "order": 4,
        "instruction": "Mélanger au fouet jusqu'à ébullition."
      },
      {
        "id": "stp_rec_top100_011_5",
        "order": 5,
        "instruction": "A ce moment là, votre crème sera déjà bien épaisse et vous pouvez arrêter la cuisson."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20221007/135812_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20220930/135568_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180713/80960_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_012",
    "title": "Meringue",
    "description": "Recette Meringue : recette facile : la meilleure recette rapide et facile : 20 pièces, 5 min de préparation. Notée 4.8/5 par 1776 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 0,
    "servings": 20,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160331/26445_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_meringue-pour-les-nuls_36610.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_012_1",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_012_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_012_1",
        "order": 1,
        "instruction": "Quelques trucs pour bien réussir ces meringues : sortir les oeufs du réfrigérateur un quart d'heure avant de les utiliser."
      },
      {
        "id": "stp_rec_top100_012_2",
        "order": 2,
        "instruction": "Ne surtout pas mélanger de jaunes aux blancs d'oeuf."
      },
      {
        "id": "stp_rec_top100_012_3",
        "order": 3,
        "instruction": "Ajouter une pincée de sel avant de battre les blancs en neige."
      },
      {
        "id": "stp_rec_top100_012_4",
        "order": 4,
        "instruction": "Utiliser un récipient plus haut que large et utiliser un batteur électrique (bien plus rapide et moins fatiguant)! On peut commencer :"
      },
      {
        "id": "stp_rec_top100_012_5",
        "order": 5,
        "instruction": "Battre les blancs d'oeuf en neige ferme."
      },
      {
        "id": "stp_rec_top100_012_6",
        "order": 6,
        "instruction": "Ajouter le sucre par petites quantités tout en continuant de battre."
      },
      {
        "id": "stp_rec_top100_012_7",
        "order": 7,
        "instruction": "Préchauffer le four à 120°C (thermostat 4)."
      },
      {
        "id": "stp_rec_top100_012_8",
        "order": 8,
        "instruction": "Déposer immédiatement de petits tas de meringue sur une plaque de four préalablement recouverte de papier sulfurisé."
      },
      {
        "id": "stp_rec_top100_012_9",
        "order": 9,
        "instruction": "Cuire entre 30 minutes et 1 heure à 120°C."
      },
      {
        "id": "stp_rec_top100_012_10",
        "order": 10,
        "instruction": "Au bout de 30 minutes, on obtient des meringues blanches et moelleuses."
      },
      {
        "id": "stp_rec_top100_012_11",
        "order": 11,
        "instruction": "Au bout d'1 heure, on obtient des meringues rosées, craquantes et fondantes avec un coeur moelleux."
      },
      {
        "id": "stp_rec_top100_012_12",
        "order": 12,
        "instruction": "Une fois cuites, décoller les meringues délicatement dès la sortie du four et laisser refroidir sur une grille."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160331/26445_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20170623/69370_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/25181_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_013",
    "title": "Les Timbales de Jeanne (saumon à la mousse de courgettes au micro-ondes)",
    "description": "Recette Les Timbales de Jeanne (saumon à la mousse de courgettes au micro-ondes) : la meilleure recette rapide et facile : 4 personnes, 18 min de préparation. Notée 4.8/5 par 1683 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Facile",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 3,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20140921/15292_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_les-timbales-de-jeanne-saumon-a-la-mousse-de-courgettes-au-micro-ondes_21864.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_013_1",
        "name": "Saumon fumé",
        "canonicalId": "ing_canon_saumon_fume",
        "quantity": "4",
        "unit": "tranches",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_013_2",
        "name": "Courgette",
        "canonicalId": "ing_canon_courgette",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_013_3",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_013_4",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "10",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_013_5",
        "name": "Petite gousse d ail",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_013_6",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_013_7",
        "name": "Aneth",
        "canonicalId": "ing_canon_aneth",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_013_8",
        "name": "Menthe",
        "canonicalId": "ing_canon_menthe",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_013_9",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_013_10",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_013_1",
        "order": 1,
        "instruction": "Rincer, essorer et ciseler l'aneth et la menthe. Peler et émincer la gousse d'ail."
      },
      {
        "id": "stp_rec_top100_013_2",
        "order": 2,
        "instruction": "Râper les courgettes."
      },
      {
        "id": "stp_rec_top100_013_3",
        "order": 3,
        "instruction": "Les faire revenir dans 1 cuillère à soupe d'huile d'olive avec l'ail émincé et les herbes ciselées."
      },
      {
        "id": "stp_rec_top100_013_4",
        "order": 4,
        "instruction": "Assaisonner (mais pas trop, attention au saumon fumé). Réserver et laisser un peu refroidir."
      },
      {
        "id": "stp_rec_top100_013_5",
        "order": 5,
        "instruction": "Battre les oeufs et la crème en omelette."
      },
      {
        "id": "stp_rec_top100_013_6",
        "order": 6,
        "instruction": "Mélanger cette préparation avec les courgettes râpées et éventuellement, donner un petit coup de mixeur pour obtenir l'aspect \"mousse\"."
      },
      {
        "id": "stp_rec_top100_013_7",
        "order": 7,
        "instruction": "Tapisser 4 ramequins avec les tranches de saumon fumé."
      },
      {
        "id": "stp_rec_top100_013_8",
        "order": 8,
        "instruction": "Verser le mélange omelette-courgettes dans les ramequins tapissés de saumon."
      },
      {
        "id": "stp_rec_top100_013_9",
        "order": 9,
        "instruction": "Faire cuire au micro-ondes pendant 2 à 3 minutes, selon la puissance (vérifier la cuisson vous-même, il n'y a que ça de vrai !)."
      },
      {
        "id": "stp_rec_top100_013_10",
        "order": 10,
        "instruction": "Déguster !"
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20140921/15292_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/6321_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130501/5135_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_014",
    "title": "Pancake Moelleux",
    "description": "Recette Pancake Moelleux : recette facile : la meilleure recette rapide et facile : 4 personnes, 14 min de préparation. Notée 4.8/5 par 1673 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 4,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20221027/136756_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_pancakes_15299.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_014_1",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_014_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "30",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_014_3",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_014_4",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_014_5",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "65",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_014_6",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_014_7",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "30",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_014_1",
        "order": 1,
        "instruction": "Faire fondre le beurre, dans une casserole à feu doux ou dans un bol au micro-ondes."
      },
      {
        "id": "stp_rec_top100_014_2",
        "order": 2,
        "instruction": "Mettre la farine, la levure et le sucre dans un saladier. Mélanger et creuser un puits."
      },
      {
        "id": "stp_rec_top100_014_3",
        "order": 3,
        "instruction": "Ajouter ensuite les oeufs entiers et fouetter l'ensemble."
      },
      {
        "id": "stp_rec_top100_014_4",
        "order": 4,
        "instruction": "Incorporer le beurre fondu, fouetter puis délayer progressivement le mélange avec le lait afin d'éviter les grumeaux."
      },
      {
        "id": "stp_rec_top100_014_5",
        "order": 5,
        "instruction": "Laisser reposer la pâte au minimum 1 heure au réfrigérateur."
      },
      {
        "id": "stp_rec_top100_014_6",
        "order": 6,
        "instruction": "Dans une poêle chaude et légèrement huilée, faire cuire comme des crêpes, mais en les faisant plus petites. Réserver au chaud et déguster."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20221027/136756_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180413/78569_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20221013/136166_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_015",
    "title": "Filet mignon en croûte",
    "description": "Recette Filet mignon en croûte : la meilleure recette rapide et facile : 6 personnes, 60 min de préparation. Notée 4.8/5 par 1510 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 45,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20201001/114522_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_filet-mignon-en-croute_14407.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_015_1",
        "name": "Porc",
        "canonicalId": "ing_canon_porc",
        "quantity": "2",
        "unit": "filets",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_015_2",
        "name": "Pâte feuilletée",
        "canonicalId": "ing_canon_pate_feuilletee",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_015_3",
        "name": "Jambon",
        "canonicalId": "ing_canon_jambon",
        "quantity": "4",
        "unit": "tranches",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_015_4",
        "name": "Fromage râpé",
        "canonicalId": "ing_canon_fromage_rape",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_015_5",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_015_6",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_015_1",
        "order": 1,
        "instruction": "Peler et émincer les oignons."
      },
      {
        "id": "stp_rec_top100_015_2",
        "order": 2,
        "instruction": "Les faire revenir dans une sauteuse avec 20 g de beurre pendant 3 minutes environ. Les retirer de la sauteuse et les réserver."
      },
      {
        "id": "stp_rec_top100_015_3",
        "order": 3,
        "instruction": "Dans la même sauteuse, faire revenir les filets mignons de chaque côté."
      },
      {
        "id": "stp_rec_top100_015_4",
        "order": 4,
        "instruction": "Laisser cuire 10 minutes à feu doux."
      },
      {
        "id": "stp_rec_top100_015_5",
        "order": 5,
        "instruction": "Réincorporer les oignons. Poursuivre la cuisson pendant 5 minutes. Saler, poivrer. Réserver."
      },
      {
        "id": "stp_rec_top100_015_6",
        "order": 6,
        "instruction": "Dérouler les pâtes feuilletées."
      },
      {
        "id": "stp_rec_top100_015_7",
        "order": 7,
        "instruction": "Déposer sur chaque pâte deux tranches de jambon et 100 g de gruyère. Saler et poivrer."
      },
      {
        "id": "stp_rec_top100_015_8",
        "order": 8,
        "instruction": "Y déposer un filet sur chaque pâte garnie et napper de sauce aux oignons."
      },
      {
        "id": "stp_rec_top100_015_9",
        "order": 9,
        "instruction": "Replier la pâte autour de la viande et souder les bords à l'aide du jaune d'oeuf préalablement battu et d'un pinceau alimentaire."
      },
      {
        "id": "stp_rec_top100_015_10",
        "order": 10,
        "instruction": "Enfourner pour 45 minutes de cuisson à 200°C (thermostat 6-7)."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20201001/114522_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20170615/69644_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20131108/55853_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_016",
    "title": "Boeuf bourguignon : la vraie recette",
    "description": "Recette Boeuf bourguignon : la vraie recette : la meilleure recette rapide et facile : 4 personnes, 300 min de préparation. Notée 4.7/5 par 335 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 60,
    "cookTimeMinutes": 240,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20220707/133382_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_boeuf-bourguignon_18889.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_016_1",
        "name": "Bœuf",
        "canonicalId": "ing_canon_b_uf",
        "quantity": "600",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_016_2",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_016_3",
        "name": "Carotte",
        "canonicalId": "ing_canon_carotte",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_016_4",
        "name": "Bouquet garni",
        "canonicalId": "ing_canon_bouquet_garni",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_016_5",
        "name": "Vin rouge assez bon",
        "quantity": "1",
        "unit": "bouteille",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_016_6",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_016_7",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_016_8",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_016_1",
        "order": 1,
        "instruction": "Détailler la viande en cubes de 3 cm de côté, enlever les gros morceaux de gras."
      },
      {
        "id": "stp_rec_top100_016_2",
        "order": 2,
        "instruction": "Couper l'oignon en morceaux. Le faire revenir dans une poêle au beurre. Une fois transparent, le verser dans une cocotte en fonte de préférence."
      },
      {
        "id": "stp_rec_top100_016_3",
        "order": 3,
        "instruction": "Procéder de même avec la viande mais en plusieurs fois, jusqu'à ce que tous les morceaux soient cuits. Les ajouter au fur et à mesure dans la cocotte. Ne pas avoir peur d'ajouter du beurre entre chaque fournée."
      },
      {
        "id": "stp_rec_top100_016_4",
        "order": 4,
        "instruction": "Quand toute la viande est dans la cocotte, déglacer la poêle avec de l'eau ou du vin et faire bouillir en raclant pour récupérer le suc. Saler, poivrer, ajouter au reste."
      },
      {
        "id": "stp_rec_top100_016_5",
        "order": 5,
        "instruction": "Recouvrir le tout avec une partie du vin et faire mijoter quelques heures avec le bouquet garni et les carottes en rondelles."
      },
      {
        "id": "stp_rec_top100_016_6",
        "order": 6,
        "instruction": "Le lendemain, faire mijoter au moins 2 heures en plusieurs fois, ajouter du vin ou de l'eau si nécessaire."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20220707/133382_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130123/38929_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/33175_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_017",
    "title": "Hamburger maison",
    "description": "Recette hamburger maison : la meilleure recette rapide et facile : 4 personnes, 10 min de préparation. Notée 4.6/5 par 184 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Facile",
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 5,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20130627/42230_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_hamburger-maison_32672.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_017_1",
        "name": "Pain de mie",
        "canonicalId": "ing_canon_pain_de_mie",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_017_2",
        "name": "Viande",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_017_3",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_017_4",
        "name": "Cheddar",
        "canonicalId": "ing_canon_cheddar",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_017_5",
        "name": "Tomate",
        "canonicalId": "ing_canon_tomate",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_017_6",
        "name": "Salade",
        "canonicalId": "ing_canon_salade",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_017_7",
        "name": "Moutarde",
        "canonicalId": "ing_canon_moutarde",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_017_8",
        "name": "Ketchup",
        "canonicalId": "ing_canon_ketchup",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_017_1",
        "order": 1,
        "instruction": "Faites revenir les oignons à feux doux."
      },
      {
        "id": "stp_rec_top100_017_2",
        "order": 2,
        "instruction": "Ajouter les steaks."
      },
      {
        "id": "stp_rec_top100_017_3",
        "order": 3,
        "instruction": "Une fois saisi, poser une tranche de cheddar sur le steak et laisser fondre."
      },
      {
        "id": "stp_rec_top100_017_4",
        "order": 4,
        "instruction": "Une fois cuit, déposer le steak et le fromage sur une des tranches du pain que vous aurez auparavant tartinée d'un mélange de ketchup et de moutarde."
      },
      {
        "id": "stp_rec_top100_017_5",
        "order": 5,
        "instruction": "Ajouter la salade et de petites rondelles de tomates."
      },
      {
        "id": "stp_rec_top100_017_6",
        "order": 6,
        "instruction": "Vous pouvez maintenant recouvrir la préparation de l'autre tranche (avec ketchup et moutarde)"
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20130627/42230_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180712/80895_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20131222/43879_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_018",
    "title": "Oeufs mollets de ma grand-mère",
    "description": "Recette Oeufs mollets de ma grand-mère : la meilleure recette rapide et facile : 1 personne, 8 min de préparation. Notée 4.8/5 par 6 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Facile",
    "prepTimeMinutes": 2,
    "cookTimeMinutes": 6,
    "servings": 1,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20190219/88020_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_oeufs-mollet-de-ma-grand-mere-facile_197487.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_018_1",
        "name": "Oeuf par personne",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_018_2",
        "name": "Oeuf gros calibre et bio",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_018_3",
        "name": "Sel ou quelques gouttes de jus de citron",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_018_4",
        "name": "Pain de campagne pour realiser des mouillettes",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_018_5",
        "name": "Beurre demi-sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_018_1",
        "order": 1,
        "instruction": "Faire bouillir dans une casserole de l'eau salée ou citronnée."
      },
      {
        "id": "stp_rec_top100_018_2",
        "order": 2,
        "instruction": "Laisser les œufs à température ambiante 1/2 h avant afin d’éviter la fêlure de la coquille avec l'eau chaude."
      },
      {
        "id": "stp_rec_top100_018_3",
        "order": 3,
        "instruction": "Déposer délicatement l’œuf dans l'eau frémissante et laisser 5 à 6 min."
      },
      {
        "id": "stp_rec_top100_018_4",
        "order": 4,
        "instruction": "Le retourner une ou deux fois de façon à avoir une cuisson homogène."
      },
      {
        "id": "stp_rec_top100_018_5",
        "order": 5,
        "instruction": "Retirer l’œuf de l'eau, le casser dans une assiette et apprécier avec une pointe de sel et quelques mouillettes de pain de campagne avec du beurre demi-sel."
      },
      {
        "id": "stp_rec_top100_018_6",
        "order": 6,
        "instruction": "Vous pouvez le servir en plat avec une bonne salade verte, des lardons et quelques tomates cerises."
      },
      {
        "id": "stp_rec_top100_018_7",
        "order": 7,
        "instruction": "Bon appétit."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20190219/88020_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_019",
    "title": "Muffins tout chocolat",
    "description": "Moelleux, fondants et riches en cacao, les muffins au chocolat sont des petites douceurs parfaites pour le goûter ou le petit-déjeuner. Cette recette de muffins au chocolat maison est rapide à réaliser et plaira aux enfants comme aux adultes. À déguster nature ou avec des pépites pour encore plus de gourmandise.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 25,
    "cookTimeMinutes": 10,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20130909/1163_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_muffins-tout-chocolat_56020.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_019_1",
        "name": "Farine avec levure incorporee",
        "quantity": "120",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_019_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "60",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_019_3",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "4",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_019_4",
        "name": "Oeuf entier + un blanc d oeuf",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_019_5",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_019_6",
        "name": "Chocolat pour la pate",
        "quantity": "60",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_019_7",
        "name": "Pepites de chocolat",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_019_1",
        "order": 1,
        "instruction": "Préchauffez le four à 200°C (thermostat 6-7)."
      },
      {
        "id": "stp_rec_top100_019_2",
        "order": 2,
        "instruction": "Faites fondre le beurre avec les 60 g de chocolat pour la pâte, ajoutez-y le lait puis le jaune d'oeuf et mélangez bien."
      },
      {
        "id": "stp_rec_top100_019_3",
        "order": 3,
        "instruction": "Dans un saladier, mélangez la farine, le sucre et la levure puis incorporez la préparation au chocolat."
      },
      {
        "id": "stp_rec_top100_019_4",
        "order": 4,
        "instruction": "Mélangez bien."
      },
      {
        "id": "stp_rec_top100_019_5",
        "order": 5,
        "instruction": "Vous obtiendrez une pâte assez solide."
      },
      {
        "id": "stp_rec_top100_019_6",
        "order": 6,
        "instruction": "Battez les blancs en neige avec une pincée de sel et incorporez-les délicatement à la pâte."
      },
      {
        "id": "stp_rec_top100_019_7",
        "order": 7,
        "instruction": "Coupez les 100 g de chocolat en petits morceaux et mélangez-les à la pâte."
      },
      {
        "id": "stp_rec_top100_019_8",
        "order": 8,
        "instruction": "Beurrez les moules et remplissez-les de pâte à la moitié."
      },
      {
        "id": "stp_rec_top100_019_9",
        "order": 9,
        "instruction": "Faites cuire 10 à 15 min à 200°C."
      },
      {
        "id": "stp_rec_top100_019_10",
        "order": 10,
        "instruction": "Laissez refroidir et démoulez."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20130909/1163_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140711/26488_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140928/26490_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_020",
    "title": "Forêt Noire",
    "description": "Recette Forêt Noire : la meilleure recette rapide et facile : 8 personnes, 75 min de préparation. Notée 4/5 par 11 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 45,
    "cookTimeMinutes": 30,
    "servings": 8,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20230620/143594_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_foret-noire_11529.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_020_1",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_020_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "180",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_020_3",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "120",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_020_4",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_020_5",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "160",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_020_6",
        "name": "Chocolat noir",
        "canonicalId": "ing_canon_chocolat_noir",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_020_7",
        "name": "Copeaux de chocolat",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_020_8",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "40",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_020_9",
        "name": "Cerises confites maisons ou cerises a l eau de vie",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_020_1",
        "order": 1,
        "instruction": "Mélanger oeufs, sucre au fouet sur un bain-marie (pas trop chaud)."
      },
      {
        "id": "stp_rec_top100_020_2",
        "order": 2,
        "instruction": "Ajouter farine tamisée, levure et le beurre"
      },
      {
        "id": "stp_rec_top100_020_3",
        "order": 3,
        "instruction": "Ajouter le chocolat fondu (sur un bain-marie à 30, 35°C)."
      },
      {
        "id": "stp_rec_top100_020_4",
        "order": 4,
        "instruction": "Faire cuire dans deux moules (diamètre 20 ou 24) à 175°C pendant 30 minutes (chaleur conventionnelle)."
      },
      {
        "id": "stp_rec_top100_020_5",
        "order": 5,
        "instruction": "Les copeaux sont réalisés par étalement en fine couche du chocolat fondu sur une plaque de marbre. Choisir le moment, ni trop froid, ni trop chaud pour les former."
      },
      {
        "id": "stp_rec_top100_020_6",
        "order": 6,
        "instruction": "Les gâteaux refroidis, les couper en deux, les imbiber du jus de cerise additionné de kirsch"
      },
      {
        "id": "stp_rec_top100_020_7",
        "order": 7,
        "instruction": "Monter la crème en chantilly avec 100g de sucre glace."
      },
      {
        "id": "stp_rec_top100_020_8",
        "order": 8,
        "instruction": "Former le gâteau première couche chantilly avec des morceaux de cerises deuxième couche une réduction du jus de cerise avec un apport de sucre pour faire un caramel pas trop dur et dernière couche de chantilly avec des morceaux de cerises."
      },
      {
        "id": "stp_rec_top100_020_9",
        "order": 9,
        "instruction": "Enduire le gâteau de chantilly et disposer les copeaux de chocolat."
      },
      {
        "id": "stp_rec_top100_020_10",
        "order": 10,
        "instruction": "Pour un gâteau de 28 cm de diamètre multiplier les proportions par 1,5."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20230620/143594_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20210511/120269_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20141023/27286_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_021",
    "title": "Ceviche (Mexique)",
    "description": "Recette Ceviche (Mexique) : la meilleure recette rapide et facile : 4 personnes, 20 min de préparation. Notée 4.5/5 par 45 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Facile",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 0,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20140814/32191_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_ceviche-mexique_13102.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_021_1",
        "name": "Poissons",
        "quantity": "500",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_021_2",
        "name": "Tomate",
        "canonicalId": "ing_canon_tomate",
        "quantity": "5",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_021_3",
        "name": "Citrons jaunes ou 8 verts",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_021_4",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "0.5",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_021_5",
        "name": "Coriandre",
        "canonicalId": "ing_canon_coriandre",
        "quantity": "0.25",
        "unit": "verre",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_021_6",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "3",
        "unit": "c. à soupe",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_021_7",
        "name": "Olives en petits morceaux",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_021_8",
        "name": "Avocat",
        "canonicalId": "ing_canon_avocat",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_021_9",
        "name": "Origan",
        "canonicalId": "ing_canon_origan",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_021_10",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_021_1",
        "order": 1,
        "instruction": "Couper en carrés le poisson"
      },
      {
        "id": "stp_rec_top100_021_2",
        "order": 2,
        "instruction": "ajouter le jus des 4 citrons"
      },
      {
        "id": "stp_rec_top100_021_3",
        "order": 3,
        "instruction": "et les laisser mariner dans un récipient couvert, au frigo, pendant au moins 6 h (c'est comme ça que le poisson \"cuit\"). Une fois ce délai passé, égoutter le poisson."
      },
      {
        "id": "stp_rec_top100_021_4",
        "order": 4,
        "instruction": "Hachez l'oignon"
      },
      {
        "id": "stp_rec_top100_021_5",
        "order": 5,
        "instruction": "Couper les tomates en deux, les épépiner et les découper en petits carrés."
      },
      {
        "id": "stp_rec_top100_021_6",
        "order": 6,
        "instruction": "Ajouter au poisson 2 citrons, l'huile d'olive, les olives découpées, l'origan et le sel."
      },
      {
        "id": "stp_rec_top100_021_7",
        "order": 7,
        "instruction": "Mélanger tous les ingrédients et ajouter la coriandre (ou servir les tomates sur le poisson)."
      },
      {
        "id": "stp_rec_top100_021_8",
        "order": 8,
        "instruction": "Servir dans des coupes, en ajoutant l'avocat."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20140814/32191_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130712/32192_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130721/60583_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_022",
    "title": "Lasagnes à la bolognaise",
    "description": "Recette Lasagnes à la bolognaise : la meilleure recette rapide et facile : 8 personnes, 125 min de préparation. Notée 4.8/5 par 1429 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 30,
    "cookTimeMinutes": 95,
    "servings": 8,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20200408/109520_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_lasagnes-a-la-bolognaise_18215.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_022_1",
        "name": "Lasagnes",
        "quantity": "1",
        "unit": "paquet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_2",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_3",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "2",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_4",
        "name": "Céleri",
        "canonicalId": "ing_canon_celeri",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_5",
        "name": "Carotte",
        "canonicalId": "ing_canon_carotte",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_6",
        "name": "Bœuf",
        "canonicalId": "ing_canon_b_uf",
        "quantity": "600",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_7",
        "name": "Coulis de tomate",
        "canonicalId": "ing_canon_coulis_de_tomate",
        "quantity": "800",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_8",
        "name": "Veau",
        "canonicalId": "ing_canon_veau",
        "quantity": "15",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_9",
        "name": "Vin rouge",
        "canonicalId": "ing_canon_vin_rouge",
        "quantity": "20",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_10",
        "name": "Laurier",
        "canonicalId": "ing_canon_laurier",
        "quantity": "2",
        "unit": "feuilles",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_11",
        "name": "Thym",
        "canonicalId": "ing_canon_thym",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_12",
        "name": "Basilic",
        "canonicalId": "ing_canon_basilic",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_13",
        "name": "Muscade",
        "canonicalId": "ing_canon_muscade",
        "quantity": "3",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_14",
        "name": "Fromage râpé",
        "canonicalId": "ing_canon_fromage_rape",
        "quantity": "70",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_15",
        "name": "Parmesan",
        "canonicalId": "ing_canon_parmesan",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_16",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_17",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_18",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_19",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_022_20",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "1",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_022_1",
        "order": 1,
        "instruction": "Faire revenir gousses hachées d'ail et les oignons émincés dans un peu d'huile d'olive."
      },
      {
        "id": "stp_rec_top100_022_2",
        "order": 2,
        "instruction": "Ajouter la carotte et la branche de céleri hachée puis la viande et faire revenir le tout."
      },
      {
        "id": "stp_rec_top100_022_3",
        "order": 3,
        "instruction": "Au bout de quelques minutes, ajouter le vin rouge. Laisser cuire jusqu'à évaporation."
      },
      {
        "id": "stp_rec_top100_022_4",
        "order": 4,
        "instruction": "Ajouter la purée de tomates, l'eau et les herbes. Saler, poivrer, puis laisser mijoter à feu doux 45 minutes."
      },
      {
        "id": "stp_rec_top100_022_5",
        "order": 5,
        "instruction": "Préparer la béchamel : faire fondre 100 g de beurre."
      },
      {
        "id": "stp_rec_top100_022_6",
        "order": 6,
        "instruction": "Hors du feu, ajouter la farine d'un coup."
      },
      {
        "id": "stp_rec_top100_022_7",
        "order": 7,
        "instruction": "Remettre sur le feu et remuer avec un fouet jusqu'à l'obtention d'un mélange bien lisse."
      },
      {
        "id": "stp_rec_top100_022_8",
        "order": 8,
        "instruction": "Ajouter le lait peu à peu."
      },
      {
        "id": "stp_rec_top100_022_9",
        "order": 9,
        "instruction": "Remuer sans cesse, jusqu'à ce que le mélange s'épaississe."
      },
      {
        "id": "stp_rec_top100_022_10",
        "order": 10,
        "instruction": "Ensuite, parfumer avec la muscade, saler, poivrer. Laisser cuire environ 5 minutes, à feu très doux, en remuant. Réserver."
      },
      {
        "id": "stp_rec_top100_022_11",
        "order": 11,
        "instruction": "Préchauffer le four à 200°C (thermostat 6-7). Huiler le plat à lasagnes. Poser une fine couche de béchamel puis des feuilles de lasagnes, de la bolognaise, de la béchamel et du parmesan. Répéter l'opération 3 fois de suite."
      },
      {
        "id": "stp_rec_top100_022_12",
        "order": 12,
        "instruction": "Sur la dernière couche de lasagnes, ne mettre que de la béchamel et recouvrir de fromage râpé. Parsemer quelques noisettes de beurre."
      },
      {
        "id": "stp_rec_top100_022_13",
        "order": 13,
        "instruction": "Enfourner pour environ 25 minutes de cuisson."
      },
      {
        "id": "stp_rec_top100_022_14",
        "order": 14,
        "instruction": "Déguster"
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20200408/109520_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20221013/136146_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160630/63224_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_023",
    "title": "Béchamel rapide et facile",
    "description": "Recette Béchamel rapide et facile : la meilleure recette rapide et facile : 4 personnes, 7 min de préparation. Notée 4.8/5 par 1392 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Facile",
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 2,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20221013/136174_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_bechamel-rapide-et-facile_14764.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_023_1",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "25",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_023_2",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "20",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_023_3",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_023_4",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_023_5",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_023_1",
        "order": 1,
        "instruction": "Dans un grand récipient, faire fondre le beurre 1 minute au micro-ondes. Le sortir et ajouter la farine en remuant bien."
      },
      {
        "id": "stp_rec_top100_023_2",
        "order": 2,
        "instruction": "Porter le lait à ébullition, le laisser bouillir quelques instants."
      },
      {
        "id": "stp_rec_top100_023_3",
        "order": 3,
        "instruction": "Verser le lait sur le mélange farine/beurre en fouettant. Assaisonner."
      },
      {
        "id": "stp_rec_top100_023_4",
        "order": 4,
        "instruction": "Remettre le tout au micro-ondes pendant 1 minute."
      },
      {
        "id": "stp_rec_top100_023_5",
        "order": 5,
        "instruction": "Bien fouetter, c'est prêt !"
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20221013/136174_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180628/80001_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20150909/46783_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_024",
    "title": "Crumble simple",
    "description": "Recette Crumble simple : la meilleure recette rapide et facile : 6 personnes, 35 min de préparation. Notée 4.9/5 par 509 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 25,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160404/56530_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_crumble-simple_12173.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_024_1",
        "name": "Pomme",
        "canonicalId": "ing_canon_pomme",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_024_2",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_024_3",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "75",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_024_4",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "120",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_024_1",
        "order": 1,
        "instruction": "Préchauffer le four à 180°C (thermostat 6). Peler les pommes."
      },
      {
        "id": "stp_rec_top100_024_2",
        "order": 2,
        "instruction": "Couper les pommes en dés."
      },
      {
        "id": "stp_rec_top100_024_3",
        "order": 3,
        "instruction": "Dans un saladier, mélanger la farine au sucre,"
      },
      {
        "id": "stp_rec_top100_024_4",
        "order": 4,
        "instruction": "puis au beurre"
      },
      {
        "id": "stp_rec_top100_024_5",
        "order": 5,
        "instruction": "Malaxer le tout avec les doigts pour obtenir une pâte sableuse."
      },
      {
        "id": "stp_rec_top100_024_6",
        "order": 6,
        "instruction": "Beurrer le moule, y disposer les pommes tranchées (ou les poires) et placer la pâte par dessus."
      },
      {
        "id": "stp_rec_top100_024_7",
        "order": 7,
        "instruction": "Laisser cuire 25 min. Servir avec une crème anglaise."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160404/56530_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180713/81159_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/49296_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_025",
    "title": "Pancakes faciles et rapides",
    "description": "Recette Pancakes faciles et rapides : la meilleure recette rapide et facile : 2 personnes, 15 min de préparation. Notée 4.8/5 par 1247 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 10,
    "servings": 2,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20211222/126211_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_pancakes-faciles-et-rapides_81518.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_025_1",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_025_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_025_3",
        "name": "Huile ou de beurre",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_025_4",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_025_5",
        "name": "Bonne cuillere a cafe de levure",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_025_6",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "200",
        "unit": "ml",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_025_1",
        "order": 1,
        "instruction": "Battre grossièrement l'oeuf et le sucre dans un saladier."
      },
      {
        "id": "stp_rec_top100_025_2",
        "order": 2,
        "instruction": "Y rajouter le beurre fondu ou l'huile."
      },
      {
        "id": "stp_rec_top100_025_3",
        "order": 3,
        "instruction": "Mélanger à part la farine et la levure, puis en mélanger la moitié avec la préparation."
      },
      {
        "id": "stp_rec_top100_025_4",
        "order": 4,
        "instruction": "Délayer progressivement avec le lait tout en rajoutant l'autre moitié de farine petit à petit (cela évitera de créer des grumeaux)."
      },
      {
        "id": "stp_rec_top100_025_5",
        "order": 5,
        "instruction": "Aucun temps de repos n'est nécessaire, si ce n'est juste le temps de faire chauffer votre poêle à feu moyen. Huilez ou beurrez la poêle à l'aide de papier essuie-tout."
      },
      {
        "id": "stp_rec_top100_025_6",
        "order": 6,
        "instruction": "A l'aide d'une petite louche ou d'une grosse cuillère à sauce, déposer des \"ronds\" dans la poêle."
      },
      {
        "id": "stp_rec_top100_025_7",
        "order": 7,
        "instruction": "Lorsque les bulles apparaissent et éclatent, retourner les pancakes et ne pas les laisser plus d'une min sur l'autre face."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20211222/126211_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20221013/136180_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180716/81396_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_026",
    "title": "Pain d'épices",
    "description": "Le pain d'épices, avec ses notes de miel et d'épices, est parfait pour accompagner vos pauses gourmandes d’hiver. Moelleux et réconfortant, il évoque les souvenirs de Noël et se marie à merveille avec une tasse de thé ou une compote de fruits.",
    "category": "Dessert",
    "difficulty": "Difficile",
    "prepTimeMinutes": 30,
    "cookTimeMinutes": 60,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20221011/135945_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_pain-d-epices_11087.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_026_1",
        "name": "Miel",
        "canonicalId": "ing_canon_miel",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_026_2",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_026_3",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_026_4",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_026_5",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_026_6",
        "name": "Anis vert",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_026_7",
        "name": "Muscade",
        "canonicalId": "ing_canon_muscade",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_026_8",
        "name": "Cannelle",
        "canonicalId": "ing_canon_cannelle",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_026_9",
        "name": "Gingembre",
        "canonicalId": "ing_canon_gingembre",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_026_10",
        "name": "Quatre-epices",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_026_11",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_026_12",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "10",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_026_1",
        "order": 1,
        "instruction": "Faites chauffer 250 g de miel à la casserole ou au micro-ondes."
      },
      {
        "id": "stp_rec_top100_026_2",
        "order": 2,
        "instruction": "Mélangez la farine avec la levure chimique, les deux sucres et les épices."
      },
      {
        "id": "stp_rec_top100_026_3",
        "order": 3,
        "instruction": "Ajoutez le miel chaud (en remuant idéalement avec une cuillère en bois)."
      },
      {
        "id": "stp_rec_top100_026_4",
        "order": 4,
        "instruction": "Incorporez petit à petit 2 oeufs, puis un peu de lait juste tiède pour amalgamer le tout."
      },
      {
        "id": "stp_rec_top100_026_5",
        "order": 5,
        "instruction": "Préchauffez le four à 160°C (thermostat 5-6)."
      },
      {
        "id": "stp_rec_top100_026_6",
        "order": 6,
        "instruction": "Versez la préparation dans un moule à cake bien beurré (utilisez une feuille de papier essuie-tout) et fariné."
      },
      {
        "id": "stp_rec_top100_026_7",
        "order": 7,
        "instruction": "Enfournez et laissez cuire pendant 1h à 1h15."
      },
      {
        "id": "stp_rec_top100_026_8",
        "order": 8,
        "instruction": "Démoulez le pain d'épices lorsqu'il a totalement refroidi. Attendez 24 heures au minimum avant de le déguster."
      },
      {
        "id": "stp_rec_top100_026_9",
        "order": 9,
        "instruction": "Il se garde une semaine, enveloppé dans du papier d'aluminium."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20221011/135945_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20220929/135546_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20181219/84929_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_027",
    "title": "Tarte aux pommes à l'Alsacienne",
    "description": "Recette Tarte aux pommes à l'Alsacienne : la meilleure recette rapide et facile : 6 personnes, 55 min de préparation. Notée 4.8/5 par 1107 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 25,
    "cookTimeMinutes": 30,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20230127/139908_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_tarte-aux-pommes-a-l-alsacienne_11457.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_027_1",
        "name": "Pomme",
        "canonicalId": "ing_canon_pomme",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_027_2",
        "name": "Pâte brisée",
        "canonicalId": "ing_canon_pate_brisee",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_027_3",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_027_4",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "25",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_027_5",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_027_6",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_027_1",
        "order": 1,
        "instruction": "Pelez et coupez les pommes en fines tranches"
      },
      {
        "id": "stp_rec_top100_027_2",
        "order": 2,
        "instruction": "Dans un saladier, mélangez le sucre, les oeufs, le sucre vanillé"
      },
      {
        "id": "stp_rec_top100_027_3",
        "order": 3,
        "instruction": "la crème fraîche"
      },
      {
        "id": "stp_rec_top100_027_4",
        "order": 4,
        "instruction": "Etalez la pâte dans un moule à tarte et piquez le fond à l'aide d'une fourchette. Disposez les pommes sur la pâte et versez le tout sur les pommes (ou versez uniquement la crème)"
      },
      {
        "id": "stp_rec_top100_027_5",
        "order": 5,
        "instruction": "Puis disposer les lamelles de pommes roulées sur elles-même en roses."
      },
      {
        "id": "stp_rec_top100_027_6",
        "order": 6,
        "instruction": "Enfournez environ 30 minutes, jusqu'à ce que la tarte prenne une belle couleur dorée."
      },
      {
        "id": "stp_rec_top100_027_7",
        "order": 7,
        "instruction": "Déguster"
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20230127/139908_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20191119/102677_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160922/65402_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_028",
    "title": "Sauté de veau au chorizo",
    "description": "Recette Sauté de veau au chorizo : la meilleure recette rapide et facile : 6 personnes, 80 min de préparation. Notée 4.8/5 par 1005 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 60,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20130627/35195_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_saute-de-veau-au-chorizo_17027.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_028_1",
        "name": "Veau",
        "canonicalId": "ing_canon_veau",
        "quantity": "1",
        "unit": "kg",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_028_2",
        "name": "Coulis de tomate",
        "canonicalId": "ing_canon_coulis_de_tomate",
        "quantity": "2",
        "unit": "boîtes",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_028_3",
        "name": "Saucisse",
        "canonicalId": "ing_canon_saucisse",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_028_4",
        "name": "Olive",
        "canonicalId": "ing_canon_olive",
        "quantity": "1",
        "unit": "pot",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_028_5",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_028_6",
        "name": "Bouquet de basilic",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_028_7",
        "name": "Bouquet garni",
        "canonicalId": "ing_canon_bouquet_garni",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_028_8",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "1",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_028_9",
        "name": "Huile",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_028_1",
        "order": 1,
        "instruction": "Emincer l'oignon et détailler le chorizo pelé en rondelles."
      },
      {
        "id": "stp_rec_top100_028_2",
        "order": 2,
        "instruction": "Découper le veau en morceaux."
      },
      {
        "id": "stp_rec_top100_028_3",
        "order": 3,
        "instruction": "Faire revenir veau et oignons émincés jusqu'à coloration dans l'huile."
      },
      {
        "id": "stp_rec_top100_028_4",
        "order": 4,
        "instruction": "Ajouter le chorizo puis la pulpe de tomate, le basilic haché et enfin les olives."
      },
      {
        "id": "stp_rec_top100_028_5",
        "order": 5,
        "instruction": "Couvrir et faire mijoter à feu doux 1 heure minimum."
      },
      {
        "id": "stp_rec_top100_028_6",
        "order": 6,
        "instruction": "Ce plat est encore meilleur préparé la veille et réchauffé le jour même."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20130627/35195_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130122/35196_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140225/31460_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_029",
    "title": "Cake salé au jambon et aux olives",
    "description": "Recette Cake salé au jambon et aux olives : la meilleure recette rapide et facile : 6 personnes, 65 min de préparation. Notée 4.8/5 par 996 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Moyen",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 45,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20130206/48875_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_cake-sale-au-jambon-et-aux-olives_18876.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_029_1",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_029_2",
        "name": "Jambon",
        "canonicalId": "ing_canon_jambon",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_029_3",
        "name": "Olive",
        "canonicalId": "ing_canon_olive",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_029_4",
        "name": "Fromage râpé",
        "canonicalId": "ing_canon_fromage_rape",
        "quantity": "75",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_029_5",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_029_6",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "10",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_029_7",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_029_8",
        "name": "Huile",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_029_1",
        "order": 1,
        "instruction": "Préchauffer le four à 180°C (thermostat 6)."
      },
      {
        "id": "stp_rec_top100_029_2",
        "order": 2,
        "instruction": "Couper les olives en rondelles."
      },
      {
        "id": "stp_rec_top100_029_3",
        "order": 3,
        "instruction": "Verser les oeufs dans la farine et mélanger."
      },
      {
        "id": "stp_rec_top100_029_4",
        "order": 4,
        "instruction": "Ajouter le lait et l'huile puis mélanger."
      },
      {
        "id": "stp_rec_top100_029_5",
        "order": 5,
        "instruction": "Ajouter le jambon, les olives et le gruyère puis mélanger."
      },
      {
        "id": "stp_rec_top100_029_6",
        "order": 6,
        "instruction": "Ajouter la levure et, pour ne pas changer, mélanger."
      },
      {
        "id": "stp_rec_top100_029_7",
        "order": 7,
        "instruction": "Mettre le tout dans un plat à cake au préalable beurré et placer au four 45 min."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20130206/48875_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/42671_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140126/45227_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_030",
    "title": "Boeuf Bourguignon rapide",
    "description": "Recette Boeuf Bourguignon rapide : la meilleure recette rapide et facile : 6 personnes, 70 min de préparation. Notée 4.8/5 par 917 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 60,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20131009/56293_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_boeuf-bourguignon-rapide_19218.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_030_1",
        "name": "Boeuf pour bourguignon",
        "quantity": "800",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_030_2",
        "name": "Lardon",
        "canonicalId": "ing_canon_lardon",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_030_3",
        "name": "Beurre ou 3 cuilleres a soupe d huile",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_030_4",
        "name": "Vin rouge",
        "canonicalId": "ing_canon_vin_rouge",
        "quantity": "0.6666667",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_030_5",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_030_6",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "1",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_030_7",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_030_8",
        "name": "Bouquet garni",
        "canonicalId": "ing_canon_bouquet_garni",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_030_9",
        "name": "Champignon de Paris",
        "canonicalId": "ing_canon_champignon_de_paris",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_030_10",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_030_11",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_030_1",
        "order": 1,
        "instruction": "Hacher les oignons. Peler l'ail."
      },
      {
        "id": "stp_rec_top100_030_2",
        "order": 2,
        "instruction": "Dans une cocotte minute, faire roussir la viande et les lardons dans l’huile ou le beurre."
      },
      {
        "id": "stp_rec_top100_030_3",
        "order": 3,
        "instruction": "Ajouter les oignons, les champignons égouttés et saupoudrer de fariner. Mélanger et laisser dorer un instant."
      },
      {
        "id": "stp_rec_top100_030_4",
        "order": 4,
        "instruction": "Mouiller avec le vin rouge qui doit recouvrir la viande."
      },
      {
        "id": "stp_rec_top100_030_5",
        "order": 5,
        "instruction": "Saler et poivrer."
      },
      {
        "id": "stp_rec_top100_030_6",
        "order": 6,
        "instruction": "Ajouter l’ail et le bouquet garni."
      },
      {
        "id": "stp_rec_top100_030_7",
        "order": 7,
        "instruction": "Fermer la cocotte minute."
      },
      {
        "id": "stp_rec_top100_030_8",
        "order": 8,
        "instruction": "Laisser cuire doucement 60 min à partir de la mise en rotation de la soupape."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20131009/56293_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20230619/143545_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/50011_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_031",
    "title": "Petits croissants au saumon fumé (toast apéritif)",
    "description": "Dorés, fondants et parfumés, les petits croissants au saumon fumé sont les rois de l’apéritif gourmand. Faciles et rapides à préparer, ils associent la douceur du saumon à la légèreté de la pâte feuilletée. Parfaits pour les fêtes, les brunchs ou un apéro improvisé, ces bouchées croustillantes feront craquer tous vos invités dès la première bouchée !",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 25,
    "servings": 16,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20230630/143922_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_petits-croissants-au-saumon-fume-toast-aperitif_20483.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_031_1",
        "name": "Pâte feuilletée",
        "canonicalId": "ing_canon_pate_feuilletee",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_031_2",
        "name": "Saumon fumé",
        "canonicalId": "ing_canon_saumon_fume",
        "quantity": "4",
        "unit": "tranches",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_031_3",
        "name": "Cuilleres de lait",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_031_1",
        "order": 1,
        "instruction": "Préchauffer le four à 200°C (thermostat 6-7). Couper votre rond de pâte en 4, puis chaque quart en 4; ce qui fait 16 parts."
      },
      {
        "id": "stp_rec_top100_031_2",
        "order": 2,
        "instruction": "Disposer dessus des petits morceaux de saumon fumé."
      },
      {
        "id": "stp_rec_top100_031_3",
        "order": 3,
        "instruction": "Rouler chaque petite part en forme de petit croissant."
      },
      {
        "id": "stp_rec_top100_031_4",
        "order": 4,
        "instruction": "Passer un petit peu de lait dessus, et mettre à four 25 min."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20230630/143922_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20170623/69321_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130122/5806_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_032",
    "title": "Cake au chocolat et amandes en poudre",
    "description": "Recette Cake au chocolat et amandes en poudre : la meilleure recette rapide et facile : 6 personnes, 45 min de préparation. Notée 4.8/5 par 880 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 30,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160404/27170_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_cake-au-chocolat_17391.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_032_1",
        "name": "Chocolat noir",
        "canonicalId": "ing_canon_chocolat_noir",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_032_2",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_032_3",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_032_4",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "60",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_032_5",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_032_6",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "80",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_032_7",
        "name": "Amande",
        "canonicalId": "ing_canon_amande",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_032_1",
        "order": 1,
        "instruction": "Faire fondre le chocolat (en morceaux) au bain-marie avec 5 cuillères à soupe d’eau (ou le faire au micro-ondes)."
      },
      {
        "id": "stp_rec_top100_032_2",
        "order": 2,
        "instruction": "Dans un saladier, battre les oeufs avec le sucre, jusqu’à ce que le mélange blanchisse. Ajouter la farine, la levure, le beurre fondu, la poudre d’amandes, et le chocolat. Mélanger."
      },
      {
        "id": "stp_rec_top100_032_3",
        "order": 3,
        "instruction": "Verser la préparation jusqu’à mi–hauteur d’un moule à cake beurré."
      },
      {
        "id": "stp_rec_top100_032_4",
        "order": 4,
        "instruction": "Mettre à cuire dans un four préchauffé à 180°C (thermostat 6 ) pendant 30 à 35 min."
      },
      {
        "id": "stp_rec_top100_032_5",
        "order": 5,
        "instruction": "Attendre 5 min avant de démouler. Laisser refroidir."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160404/27170_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20190907/97941_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20190527/93035_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_033",
    "title": "Blinis faciles maison",
    "description": "Recette Blinis faciles maison : la meilleure recette rapide et facile : 4 personnes, 25 min de préparation. Notée 4.8/5 par 775 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Facile",
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 20,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160527/26170_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_blinis-faciles-maison_22261.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_033_1",
        "name": "Yaourt bulgare",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_033_2",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_033_3",
        "name": "Yaourt de farine",
        "quantity": "1",
        "unit": "pot",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_033_4",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "0.5",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_033_5",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_033_1",
        "order": 1,
        "instruction": "Mélanger tous les ingrédients ensemble"
      },
      {
        "id": "stp_rec_top100_033_2",
        "order": 2,
        "instruction": "puis laisser reposer la pâte pendant 1 heure au réfrigérateur."
      },
      {
        "id": "stp_rec_top100_033_3",
        "order": 3,
        "instruction": "Cuire dans un poêle à blinis ou sur une poêle antiadhésive."
      },
      {
        "id": "stp_rec_top100_033_4",
        "order": 4,
        "instruction": "Lorsqu'ils font des trous, les retourner."
      },
      {
        "id": "stp_rec_top100_033_5",
        "order": 5,
        "instruction": "Servir de suite ou réchauffer avant de passer à table."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160527/26170_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160527/26169_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160401/26167_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_034",
    "title": "Panna cotta",
    "description": "Recette Panna cotta : la meilleure recette rapide et facile : 6 personnes, 20 min de préparation. Notée 4.8/5 par 756 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 10,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20221026/136708_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_panna-cotta_17991.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_034_1",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "50",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_034_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_034_3",
        "name": "Gelatine",
        "quantity": "2",
        "unit": "feuilles",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_034_4",
        "name": "Vanille ou extrait de vanille",
        "quantity": "1",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_034_1",
        "order": 1,
        "instruction": "Faire ramollir les feuilles de gélatine dans de l'eau froide. Mettre la crème, le sucre et la vanille dans une casserole et faire frémir."
      },
      {
        "id": "stp_rec_top100_034_2",
        "order": 2,
        "instruction": "Dès le début de l'ébullition, retirer la casserole du feu et ajouter la gélatine égouttée."
      },
      {
        "id": "stp_rec_top100_034_3",
        "order": 3,
        "instruction": "Bien remuer et verser dans des coupelles. Laisser refroidir puis placer quelques heures au réfrigérateur pour faire prendre."
      },
      {
        "id": "stp_rec_top100_034_4",
        "order": 4,
        "instruction": "Ajouter du coulis de fraise, framboise ou autre fruit juste avant de servir."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20221026/136708_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20120831/37557_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20150512/42334_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_035",
    "title": "Filet mignon de porc au Maroilles",
    "description": "Recette Filet mignon de porc au Maroilles : la meilleure recette rapide et facile : 6 personnes, 60 min de préparation. Notée 4.8/5 par 706 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 30,
    "cookTimeMinutes": 30,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20130304/1669_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_filet-mignon-de-porc-au-maroilles_12734.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_035_1",
        "name": "Porc",
        "canonicalId": "ing_canon_porc",
        "quantity": "2",
        "unit": "filets",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_035_2",
        "name": "Vin blanc",
        "canonicalId": "ing_canon_vin_blanc",
        "quantity": "10",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_035_3",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_035_4",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "50",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_035_5",
        "name": "Maroilles",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_035_6",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_035_7",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_035_1",
        "order": 1,
        "instruction": "Hacher l'oignon."
      },
      {
        "id": "stp_rec_top100_035_2",
        "order": 2,
        "instruction": "Le faire blondir l'oignon dans une cocotte ou une sauteuse avec couvercle."
      },
      {
        "id": "stp_rec_top100_035_3",
        "order": 3,
        "instruction": "Ajouter les filets mignons et les faire dorer sur tous les côtés."
      },
      {
        "id": "stp_rec_top100_035_4",
        "order": 4,
        "instruction": "Verser le vin blanc. Couvrir et laisser cuire 20 minutes."
      },
      {
        "id": "stp_rec_top100_035_5",
        "order": 5,
        "instruction": "Dans un bol, couper le Maroilles en petits morceaux. Ajouter la crème et mélanger."
      },
      {
        "id": "stp_rec_top100_035_6",
        "order": 6,
        "instruction": "Vérifier la cuisson. Une fois les filets cuits, ajouter la crème et le Maroilles. Le Maroilles va fondre progressivement."
      },
      {
        "id": "stp_rec_top100_035_7",
        "order": 7,
        "instruction": "Le plat est prêt une fois que la sauce est bien onctueuse."
      },
      {
        "id": "stp_rec_top100_035_8",
        "order": 8,
        "instruction": "Ce plat est très bon accompagné de tagliatelles fraîches."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20130304/1669_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140212/5240_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140814/1670_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_036",
    "title": "Riz au lait de ma maman",
    "description": "Recette Riz au lait de ma maman : la meilleure recette rapide et facile : 4 personnes, 70 min de préparation. Notée 4.8/5 par 671 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 60,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20221007/135811_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_riz-au-lait-de-ma-maman_20380.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_036_1",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "1",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_036_2",
        "name": "Riz blanc rond",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_036_3",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "5",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_036_4",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_036_5",
        "name": "Citron",
        "canonicalId": "ing_canon_citron",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_036_6",
        "name": "Orange ou de clementine",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_036_1",
        "order": 1,
        "instruction": "Faire bouillir le lait avec le sucre, le sucre vanillé et le zeste de votre choix (attention faire un ruban assez long pour le retirer facilement en fin de cuisson)."
      },
      {
        "id": "stp_rec_top100_036_2",
        "order": 2,
        "instruction": "Lorsque le lait bout, jeter le riz en pluie et baisser le feu pour que l'ébullition soit très lente, le riz doit cuire très lentement."
      },
      {
        "id": "stp_rec_top100_036_3",
        "order": 3,
        "instruction": "Lorsque le riz affleure le lait, couper le feu et laisser refroidir ; le riz va finir de s'imbiber de lait en refroidissant."
      },
      {
        "id": "stp_rec_top100_036_4",
        "order": 4,
        "instruction": "On peut servir ce dessert tiède ou froid dans des ramequins avec un zeste de citron vert pour décorer le dessus."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20221007/135811_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160520/34572_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160520/34570_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_037",
    "title": "Pommes de terres sautées",
    "description": "Recette Pommes de terres sautées : la meilleure recette rapide et facile : 4 personnes, 20 min de préparation. Notée 4.9/5 par 358 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Facile",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 10,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20221007/135810_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_pommes-de-terres-sautees_36392.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_037_1",
        "name": "Pommes de terre a chair ferme",
        "quantity": "6",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_037_2",
        "name": "Huile",
        "quantity": "3",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_037_3",
        "name": "Tour de moulin de poivre",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_037_4",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "2",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_037_5",
        "name": "Curry",
        "canonicalId": "ing_canon_curry",
        "quantity": "3",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_037_1",
        "order": 1,
        "instruction": "Eplucher et laver les pommes de terre, puis les couper en tranches de 1,5 cm d'épaisseur, puis en cubes. Ne plus les laver."
      },
      {
        "id": "stp_rec_top100_037_2",
        "order": 2,
        "instruction": "Dans une sauteuse, faire chauffer 3 cuillères à soupe d'huile. Lorsque l'huile est chaude, y mettre les pommes de terre d'un coup, puis les enrober d'huile dans tous les sens avec une cuillère en bois."
      },
      {
        "id": "stp_rec_top100_037_3",
        "order": 3,
        "instruction": "Ajouter sel et poivre (et éventuellement curry), puis re-mélanger."
      },
      {
        "id": "stp_rec_top100_037_4",
        "order": 4,
        "instruction": "Porter à feu maximal et faire cuire avec le couvercle jusqu'à ce qu'une bonne odeur de pommes de terre grillées s'échappe... Ne pas les découvrir avant! Cela prend entre 3 et 5 minutes."
      },
      {
        "id": "stp_rec_top100_037_5",
        "order": 5,
        "instruction": "A ce moment là seulement, retourner les pommes de terre. Baisser la température de 2 graduations (pour mettre à feu moyen)."
      },
      {
        "id": "stp_rec_top100_037_6",
        "order": 6,
        "instruction": "Remettre le couvercle, puis retourner les pommes de terre toutes les 3 min pendant 10 min."
      },
      {
        "id": "stp_rec_top100_037_7",
        "order": 7,
        "instruction": "Maintenant, elles sont cuites. Vérifier tout de même avec la pointe d'un couteau."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20221007/135810_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180621/79737_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20110517/44536_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_038",
    "title": "Le trianon ou royal de Nadine",
    "description": "Recette Le trianon ou royal de Nadine : la meilleure recette rapide et facile : 8 personnes, 135 min de préparation. Notée 4.9/5 par 348 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Difficile",
    "prepTimeMinutes": 120,
    "cookTimeMinutes": 15,
    "servings": 8,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20170623/69271_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_le-trianon-ou-royal-de-nadine_63868.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_038_1",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_038_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "60",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_038_3",
        "name": "Noisette",
        "canonicalId": "ing_canon_noisette",
        "quantity": "40",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_038_4",
        "name": "Farine rases",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_038_5",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "30",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_038_6",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "0.5",
        "unit": "c. à café",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_038_7",
        "name": "Pralinoise",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_038_8",
        "name": "Crepe dentelle soit 9 petits papiers",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_038_9",
        "name": "Pain",
        "canonicalId": "ing_canon_pain",
        "quantity": "40",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_038_10",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "500",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_038_11",
        "name": "Chocolat noir",
        "canonicalId": "ing_canon_chocolat_noir",
        "quantity": "300",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_038_12",
        "name": "Liqueur de menthe",
        "quantity": "3",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_038_1",
        "order": 1,
        "instruction": "Je vous suggère de bien lire la recette et les commentaires en bas de page avant de vous lancer, la réalisation n'en sera que plus facile."
      },
      {
        "id": "stp_rec_top100_038_2",
        "order": 2,
        "instruction": "Résumé de la recette:"
      },
      {
        "id": "stp_rec_top100_038_3",
        "order": 3,
        "instruction": "Première étape, préparer le biscuit :"
      },
      {
        "id": "stp_rec_top100_038_4",
        "order": 4,
        "instruction": "Imaginez que c'est un biscuit à rouler, c'est le même principe."
      },
      {
        "id": "stp_rec_top100_038_5",
        "order": 5,
        "instruction": "Pour cela, on casse les œufs et on les bat longtemps avec le sucre, le mélange doit franchement blanchir. On ajoute la farine, la levure, la poudre de noisette et le beurre fondu, et on mélange bien."
      },
      {
        "id": "stp_rec_top100_038_6",
        "order": 6,
        "instruction": "On pose le moule sur une plaque couverte de papier sulfurisé graissé, on verse la pâte dedans sur une épaisseur de ½ cm pas plus et on fait cuire 10 à 15 minutes à 180°C."
      },
      {
        "id": "stp_rec_top100_038_7",
        "order": 7,
        "instruction": "Une fois cuit (au toucher il doit être à peine cuit, et peu coloré), poser le fond de biscuit avec le papier sulfurisé sur un torchon humide pour arriver à décoller le papier."
      },
      {
        "id": "stp_rec_top100_038_8",
        "order": 8,
        "instruction": "Placer le cercle sur le plat de présentation. Reposer le biscuit dedans (avant qu'il ne refroidisse trop, il devient cassant)."
      },
      {
        "id": "stp_rec_top100_038_9",
        "order": 9,
        "instruction": "Là on laisse refroidir 10 minutes, le temps pour nous de préparer la suite."
      },
      {
        "id": "stp_rec_top100_038_10",
        "order": 10,
        "instruction": "Seconde étape, le praliné feuilleté :"
      },
      {
        "id": "stp_rec_top100_038_11",
        "order": 11,
        "instruction": "Faire fondre la pralinoise au bain-marie, laisser tiédir, écraser les crêpes en grosses paillettes avec un rouleau à pâtisserie, ajouter le pralin et les gavottes à la pralinoise fondue."
      },
      {
        "id": "stp_rec_top100_038_12",
        "order": 12,
        "instruction": "Étaler sur le fond de biscuit en couche fine, tasser éventuellement avec les mains mouillées d'eau froide. Réfrigérer 30 minutes, ça doit durcir."
      },
      {
        "id": "stp_rec_top100_038_13",
        "order": 13,
        "instruction": "Troisième couche : la chantilly au chocolat."
      },
      {
        "id": "stp_rec_top100_038_14",
        "order": 14,
        "instruction": "On attaque cette étape quand le praliné est dur."
      },
      {
        "id": "stp_rec_top100_038_15",
        "order": 15,
        "instruction": "Faire fondre le chocolat avec un peu de crème (jusqu'à 1/5ème). Monter la crème restante en chantilly : la crème à 30% de matières grasses, hyper froide, le bol passé 30 min au congélateur, et c'est parti !"
      },
      {
        "id": "stp_rec_top100_038_16",
        "order": 16,
        "instruction": "Incorporer une cuillère de chantilly au chocolat fondu pour le détendre, ajouter l'alcool. Mélanger la chantilly et le chocolat délicatement. Verser dans le cercle par-dessus le reste sur environ 2 cm d'épaisseur (il reste souvent un bol en trop)."
      },
      {
        "id": "stp_rec_top100_038_17",
        "order": 17,
        "instruction": "On lisse le dessus de la crème à la spatule, puis on fait des stries avec une fourchette."
      },
      {
        "id": "stp_rec_top100_038_18",
        "order": 18,
        "instruction": "On enroule bien le tout dans du film étirable et c'est parti pour au moins 4 heures de réfrigérateur."
      },
      {
        "id": "stp_rec_top100_038_19",
        "order": 19,
        "instruction": "On pense à faire sa vaisselle (oh là là !!!)."
      },
      {
        "id": "stp_rec_top100_038_20",
        "order": 20,
        "instruction": "Plusieurs heures plus tard… la crème a durci, le gâteau est prêt à être démoulé."
      },
      {
        "id": "stp_rec_top100_038_21",
        "order": 21,
        "instruction": "On saupoudre de cacao à l'aide d'une passoire."
      },
      {
        "id": "stp_rec_top100_038_22",
        "order": 22,
        "instruction": "Enfin, on peut décorer avec de la pâte d'amandes, des copeaux de chocolat noir et blanc, des pistaches, des crêpes dentelles… bref ce qu'on veut."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20170623/69271_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20170315/2466_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20170623/69287_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_039",
    "title": "Rôti de porc de Dijon",
    "description": "Recette Rôti de porc de Dijon : la meilleure recette rapide et facile : 6 personnes, 90 min de préparation. Notée 4.9/5 par 347 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 30,
    "cookTimeMinutes": 60,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20210203/117771_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_roti-de-porc-de-dijon_12145.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_039_1",
        "name": "Roti de porc de 600 grammes environ",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_039_2",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "0.75",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_039_3",
        "name": "Moutarde",
        "canonicalId": "ing_canon_moutarde",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_039_4",
        "name": "Échalote",
        "canonicalId": "ing_canon_echalote",
        "quantity": "10",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_039_5",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_039_6",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_039_7",
        "name": "Creme allegee",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_039_1",
        "order": 1,
        "instruction": "Piquer le rôti de petites gousses d'ail coupées en deux ou trois, suivant grosseur."
      },
      {
        "id": "stp_rec_top100_039_2",
        "order": 2,
        "instruction": "Dans une cocotte, le faire dorer quelques minute dans du beurre sur toute les faces. Saler et poivrer."
      },
      {
        "id": "stp_rec_top100_039_3",
        "order": 3,
        "instruction": "Quand il est bien coloré, le retirer de la cocotte et le badigeonner avec la moutarde forte, remettre ensuite à cuire avec les échalotes, couvrir et laisser mijoter à feu doux pendant +/- 1h30, en retournant de temps en temps."
      },
      {
        "id": "stp_rec_top100_039_4",
        "order": 4,
        "instruction": "Rajouter de l'eau régulièrement, dès lors que tout le liquide est évaporé."
      },
      {
        "id": "stp_rec_top100_039_5",
        "order": 5,
        "instruction": "Après ce temps, retirer le rôti et les échalotes, puis rectifier la sauce si nécessaire (avec sel et poivre), puis ajouter la crème fraîche selon votre goût."
      },
      {
        "id": "stp_rec_top100_039_6",
        "order": 6,
        "instruction": "Couper le rôti en tranches, puis le servir nappé de sauce et accompagné des petites échalotes entières."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20210203/117771_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20190320/89694_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20110530/43300_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140701/41795_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_040",
    "title": "Filet mignon de porc à la moutarde",
    "description": "Recette Filet mignon de porc à la moutarde : la meilleure recette rapide et facile : 4 personnes, 65 min de préparation. Notée 4.9/5 par 361 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 18,
    "cookTimeMinutes": 47,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20171004/72705_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_filet-mignon-de-porc-a-la-moutarde_36310.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_040_1",
        "name": "Mignon de porc de 600 a 700 g environ",
        "quantity": "1",
        "unit": "filet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_040_2",
        "name": "Vin blanc",
        "canonicalId": "ing_canon_vin_blanc",
        "quantity": "25",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_040_3",
        "name": "Bouillon de légumes",
        "canonicalId": "ing_canon_bouillon_de_legumes",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_040_4",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "40",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_040_5",
        "name": "Champignon de Paris",
        "canonicalId": "ing_canon_champignon_de_paris",
        "quantity": "500",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_040_6",
        "name": "Moutarde",
        "canonicalId": "ing_canon_moutarde",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_040_7",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_040_8",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_040_1",
        "order": 1,
        "instruction": "Couper la viande en morceaux et mettre le mélange huile + beurre à chauffer."
      },
      {
        "id": "stp_rec_top100_040_2",
        "order": 2,
        "instruction": "La faire dorer dans un mélange huile + beurre dans une cocotte."
      },
      {
        "id": "stp_rec_top100_040_3",
        "order": 3,
        "instruction": "Retirer les morceaux de la cocotte et jeter le surplus de gras."
      },
      {
        "id": "stp_rec_top100_040_4",
        "order": 4,
        "instruction": "Déglacer la cocotte avec le vin blanc, le bouillon cube, le jus des champignons et la crème (2/3 du pot)."
      },
      {
        "id": "stp_rec_top100_040_5",
        "order": 5,
        "instruction": "Tartiner le filet mignon de moutarde à l'ancienne et le remettre dans la cocotte avec les champignons."
      },
      {
        "id": "stp_rec_top100_040_6",
        "order": 6,
        "instruction": "Cuire environ 30 min, à feu très doux."
      },
      {
        "id": "stp_rec_top100_040_7",
        "order": 7,
        "instruction": "En fin de cuisson, ajouter le reste de crème, saler et poivrer."
      },
      {
        "id": "stp_rec_top100_040_8",
        "order": 8,
        "instruction": "Bon appétit."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20171004/72705_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160405/8964_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20111204/10840_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_041",
    "title": "Tiramisu aux speculoos",
    "description": "Recette Tiramisu aux speculoos : la meilleure recette rapide et facile : 6 personnes, 25 min de préparation. Notée 4.8/5 par 653 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 25,
    "cookTimeMinutes": 0,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20191128/103126_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_tiramisu-aux-speculoos_36386.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_041_1",
        "name": "Mascarpone",
        "canonicalId": "ing_canon_mascarpone",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_041_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "80",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_041_3",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_041_4",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_041_5",
        "name": "Speculoos",
        "quantity": "300",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_041_6",
        "name": "Cafe noir assez fort",
        "quantity": "2",
        "unit": "verre",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_041_7",
        "name": "Amaretto",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_041_8",
        "name": "Cacao en poudre",
        "canonicalId": "ing_canon_cacao_en_poudre",
        "quantity": "30",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_041_1",
        "order": 1,
        "instruction": "Faire un ruban avec les jaunes d'oeufs, le sucre et le sucre vanillé."
      },
      {
        "id": "stp_rec_top100_041_2",
        "order": 2,
        "instruction": "Y ajouter le mascarpone."
      },
      {
        "id": "stp_rec_top100_041_3",
        "order": 3,
        "instruction": "Battre les blancs en neige, les incorporer délicatement au mélange."
      },
      {
        "id": "stp_rec_top100_041_4",
        "order": 4,
        "instruction": "Ajouter l'amaretto au café noir."
      },
      {
        "id": "stp_rec_top100_041_5",
        "order": 5,
        "instruction": "Monter le gâteau: tremper, au fur et à mesure, les speculoos dans le café (attention à ne pas les \"détremper\")."
      },
      {
        "id": "stp_rec_top100_041_6",
        "order": 6,
        "instruction": "Dans un plat, mettre une couche de biscuits, ensuite une couche de crème au mascarpone. Ensuite une autre couche de biscuits, et terminer par une couche de crème."
      },
      {
        "id": "stp_rec_top100_041_7",
        "order": 7,
        "instruction": "Saupoudrer de cacao, couvrir d'un film plastique et mettre au réfrigérateur quelques heures."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20191128/103126_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160616/27628_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160616/23601_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_042",
    "title": "Chili con carne facile",
    "description": "Recette Chili con carne facile : la meilleure recette rapide et facile : 4 personnes, 35 min de préparation. Notée 4.8/5 par 650 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 25,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20211222/126214_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_chili-con-carne-facile_15415.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_042_1",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_042_2",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_042_3",
        "name": "Ail ecrasees",
        "quantity": "2",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_042_4",
        "name": "Bœuf",
        "canonicalId": "ing_canon_b_uf",
        "quantity": "500",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_042_5",
        "name": "Chili",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_042_6",
        "name": "Cumin",
        "canonicalId": "ing_canon_cumin",
        "quantity": "2",
        "unit": "c. à café",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_042_7",
        "name": "Concentré de tomate",
        "canonicalId": "ing_canon_concentre_de_tomate",
        "quantity": "65",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_042_8",
        "name": "Haricot rouge",
        "canonicalId": "ing_canon_haricot_rouge",
        "quantity": "1",
        "unit": "boîte",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_042_9",
        "name": "Bouillon de bœuf",
        "canonicalId": "ing_canon_bouillon_de_b_uf",
        "quantity": "30",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_042_10",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_042_11",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_042_12",
        "name": "Persil",
        "canonicalId": "ing_canon_persil",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": true
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_042_1",
        "order": 1,
        "instruction": "Préchauffer le four à 180°C (thermostat 6)."
      },
      {
        "id": "stp_rec_top100_042_2",
        "order": 2,
        "instruction": "Hacher l'oignon et l'ail."
      },
      {
        "id": "stp_rec_top100_042_3",
        "order": 3,
        "instruction": "Dans une cocotte en fonte, faire fondre le beurre, et ensuite dorer doucement l'oignon et l’ail."
      },
      {
        "id": "stp_rec_top100_042_4",
        "order": 4,
        "instruction": "Incorporer le boeuf haché et laisser cuire doucement 10 min."
      },
      {
        "id": "stp_rec_top100_042_5",
        "order": 5,
        "instruction": "Mélanger le chili, le cumin, le concentré de tomates, et incorporer le tout au boeuf. Ajouter les haricots, le bouillon, du sel et du poivre."
      },
      {
        "id": "stp_rec_top100_042_6",
        "order": 6,
        "instruction": "Couvrir et cuire 25 min au four."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20211222/126214_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20221019/136415_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20161116/23198_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_043",
    "title": "Tarte thon, tomate et moutarde",
    "description": "Recette Tarte thon, tomate et moutarde : la meilleure recette rapide et facile : 4 personnes, 55 min de préparation. Notée 4.8/5 par 624 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 40,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20180503/79010_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_tarte-thon-tomate-et-moutarde_17226.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_043_1",
        "name": "Pâte feuilletée",
        "canonicalId": "ing_canon_pate_feuilletee",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_043_2",
        "name": "Thon",
        "canonicalId": "ing_canon_thon",
        "quantity": "2",
        "unit": "boîtes",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_043_3",
        "name": "Tomates rondes",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_043_4",
        "name": "Moutarde",
        "canonicalId": "ing_canon_moutarde",
        "quantity": "3",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_043_5",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_043_6",
        "name": "Creme semi-liquide ou epaisse",
        "quantity": "20",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_043_7",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "3",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_043_8",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_043_9",
        "name": "Poivre + 5 baies",
        "quantity": "2",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_043_1",
        "order": 1,
        "instruction": "Etaler la pâte feuilletée sur un moule à quiche, piquer le fond de la pâte, puis recouvrir le fond avec la moutarde."
      },
      {
        "id": "stp_rec_top100_043_2",
        "order": 2,
        "instruction": "Emietter le thon et le répartir sur le fond de la pâte."
      },
      {
        "id": "stp_rec_top100_043_3",
        "order": 3,
        "instruction": "Laver les tomates et les essuyer, puis les couper en rondelles moyennes, et les disposer sur le thon."
      },
      {
        "id": "stp_rec_top100_043_4",
        "order": 4,
        "instruction": "Battre les oeufs en omelette, ajouter la crème fraîche plus le lait."
      },
      {
        "id": "stp_rec_top100_043_5",
        "order": 5,
        "instruction": "Saler et poivrer."
      },
      {
        "id": "stp_rec_top100_043_6",
        "order": 6,
        "instruction": "Ajouter ce mélange sur la pâte, thon, tomate."
      },
      {
        "id": "stp_rec_top100_043_7",
        "order": 7,
        "instruction": "Mettre au four (pré-chauffé à 200°C/th 6-7), et cuire environ 40 min (jusqu'à ce que la tarte soit dorée sans être trop brunie!)."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20180503/79010_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180628/80053_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20221013/136157_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_044",
    "title": "Couscous poulet et merguez facile",
    "description": "Recette Couscous poulet et merguez facile : la meilleure recette rapide et facile : 6 personnes, 65 min de préparation. Notée 4.8/5 par 618 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 30,
    "cookTimeMinutes": 35,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20250304/158700_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_couscous-poulet-et-merguez-facile_17751.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_044_1",
        "name": "Pilons de poulet",
        "quantity": "8",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_044_2",
        "name": "Saucisse",
        "canonicalId": "ing_canon_saucisse",
        "quantity": "12",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_044_3",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_044_4",
        "name": "Concentré de tomate",
        "canonicalId": "ing_canon_concentre_de_tomate",
        "quantity": "2",
        "unit": "boîtes",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_044_5",
        "name": "Epices a couscous",
        "quantity": "3",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_044_6",
        "name": "Harissa",
        "canonicalId": "ing_canon_harissa",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_044_7",
        "name": "Bouillon de bœuf",
        "canonicalId": "ing_canon_bouillon_de_b_uf",
        "quantity": "2",
        "unit": "cube",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_044_8",
        "name": "Tomate",
        "canonicalId": "ing_canon_tomate",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_044_9",
        "name": "Navet",
        "canonicalId": "ing_canon_navet",
        "quantity": "10",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_044_10",
        "name": "Carotte",
        "canonicalId": "ing_canon_carotte",
        "quantity": "5",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_044_11",
        "name": "Courgette",
        "canonicalId": "ing_canon_courgette",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_044_12",
        "name": "Pois chiche",
        "canonicalId": "ing_canon_pois_chiche",
        "quantity": "400",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_044_1",
        "order": 1,
        "instruction": "Lavez et épluchez les carottes, les navets et les tomates et les couper en cubes."
      },
      {
        "id": "stp_rec_top100_044_2",
        "order": 2,
        "instruction": "Dans un autocuiseur, versez 3 cuillères à soupe d'huile d'olive. Mettez à chauffer et faites-y dorer les pilons de poulet. Quand ils sont dorés, versez l'équivalent d'1 litre d'eau et ajouter les cubes de bouillon de boeuf, le concentré de tomate, les carottes, navets et tomates, les épices à couscous et l'harissa."
      },
      {
        "id": "stp_rec_top100_044_3",
        "order": 3,
        "instruction": "Fermez votre autocuiseur et compter 25 mn de cuisson une fois que celui-ci est monté en pression."
      },
      {
        "id": "stp_rec_top100_044_4",
        "order": 4,
        "instruction": "En attendant, lavez et coupez les courgettes en cubes et égouttez les pois chiches."
      },
      {
        "id": "stp_rec_top100_044_5",
        "order": 5,
        "instruction": "Une fois les 25 mn écoulées, évacuez la vapeur de votre autocuiseur, ouvrez et rajouter les courgettes et les pois chiches."
      },
      {
        "id": "stp_rec_top100_044_6",
        "order": 6,
        "instruction": "Remettez au feu : comptez 10 mn de cuisson une fois votre autocuiseur sous pression."
      },
      {
        "id": "stp_rec_top100_044_7",
        "order": 7,
        "instruction": "Faites cuire vos merguez sur un grill ou à la poêle, mais pas avec les légumes."
      },
      {
        "id": "stp_rec_top100_044_8",
        "order": 8,
        "instruction": "Servez accompagné d'une semoule fine."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20250304/158700_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180621/79724_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20221013/136129_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_045",
    "title": "Cannelés (7ème rencontre Marmiton)",
    "description": "Recette Cannelés (7ème rencontre Marmiton) : la meilleure recette rapide et facile : 16 cannelés, 70 min de préparation. Notée 4.9/5 par 322 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 60,
    "servings": 16,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20220426/131518_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_canneles-7eme-rencontre-marmiton_29816.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_045_1",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "50",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_045_2",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_045_3",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_045_4",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "0.5",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_045_5",
        "name": "Rhum",
        "canonicalId": "ing_canon_rhum",
        "quantity": "3",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_045_6",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_045_7",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_045_8",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "25",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_045_1",
        "order": 1,
        "instruction": "La veille : faire bouillir le lait avec la vanille et le beurre."
      },
      {
        "id": "stp_rec_top100_045_2",
        "order": 2,
        "instruction": "Pendant ce temps, mélanger la farine, le sucre puis incorporer les oeufs d'un seul coup, verser ensuite le lait bouillant."
      },
      {
        "id": "stp_rec_top100_045_3",
        "order": 3,
        "instruction": "Mélanger doucement afin d'obtenir une pâte fluide comme une pâte à crêpes, laisser refroidir, puis ajouter le rhum."
      },
      {
        "id": "stp_rec_top100_045_4",
        "order": 4,
        "instruction": "Placer au réfrigérateur 24 heures au minimum, 48 heures au maximum."
      },
      {
        "id": "stp_rec_top100_045_5",
        "order": 5,
        "instruction": "Le jour J : sortir la pâte du frigo au moins une heure avant la cuisson."
      },
      {
        "id": "stp_rec_top100_045_6",
        "order": 6,
        "instruction": "Préchauffer le four à thermostat 9 (270°C)."
      },
      {
        "id": "stp_rec_top100_045_7",
        "order": 7,
        "instruction": "Verser la pâte dans les moules, en ne les remplissant qu'aux 3/4: poser les moules sur une tôle, et cuire à th. 9 pendant 5 minutes, puis baisser le thermostat à 6 (180°C) et continuer la cuisson pendant 1 heure (au moins, cela dépend de votre four, chez moi ça prend 1h20!): le cannelé doit avoir une croûte brune et un intérieur bien moelleux."
      },
      {
        "id": "stp_rec_top100_045_8",
        "order": 8,
        "instruction": "Démouler encore chaud."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20220426/131518_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160405/63560_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/60485_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_046",
    "title": "Velouté de champignons",
    "description": "Recette Velouté de champignons : la meilleure recette rapide et facile : 3 personnes, 50 min de préparation. Notée 4.8/5 par 649 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 40,
    "servings": 3,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160404/2282_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_veloute-de-champignons_26749.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_046_1",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "3",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_046_2",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_046_3",
        "name": "Champignon de Paris",
        "canonicalId": "ing_canon_champignon_de_paris",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_046_4",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_046_5",
        "name": "Bouillon",
        "quantity": "0.25",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_046_6",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "0.5",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_046_7",
        "name": "Citron",
        "canonicalId": "ing_canon_citron",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_046_8",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_046_9",
        "name": "Persil",
        "canonicalId": "ing_canon_persil",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_046_10",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_046_11",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_046_1",
        "order": 1,
        "instruction": "Faire fondre dans une casserole 3 cuillères à soupe de beurre."
      },
      {
        "id": "stp_rec_top100_046_2",
        "order": 2,
        "instruction": "Ajouter un petit oignon haché et les champignons de Paris coupés en tout petits morceaux."
      },
      {
        "id": "stp_rec_top100_046_3",
        "order": 3,
        "instruction": "Saler, poivrer, saupoudrer d’une cuillère à soupe de persil haché."
      },
      {
        "id": "stp_rec_top100_046_4",
        "order": 4,
        "instruction": "Remuer bien les champignons dans le beurre chaud. Couvrir et laisser cuire à feu doux 1/4 heure."
      },
      {
        "id": "stp_rec_top100_046_5",
        "order": 5,
        "instruction": "Ajouter alors 2 cuillères à soupe de farine en remuant sans cesse. Ajouter 1/4 litre de bouillon (ou d’eau) et 1/2 litre de lait."
      },
      {
        "id": "stp_rec_top100_046_6",
        "order": 6,
        "instruction": "Faire cuire à feu doux en remuant de temps en temps."
      },
      {
        "id": "stp_rec_top100_046_7",
        "order": 7,
        "instruction": "Lorsque le potage commence à bouillir, baisser le feu et laisser cuire à découvert encore 1/4 d’heure."
      },
      {
        "id": "stp_rec_top100_046_8",
        "order": 8,
        "instruction": "Quelques minutes avant de servir ajouter le jus d’un citron puis 2 cuillères à soupe de crème fraîche."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160404/2282_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130123/2284_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20101121/8151_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_047",
    "title": "Original American Cookies de Mike",
    "description": "Recette Original American Cookies de Mike : la meilleure recette rapide et facile : 15 Pièces, 15 min de préparation. Notée 4.7/5 par 2809 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 10,
    "servings": 15,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160513/21955_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_original-american-cookies-de-mike_39907.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_047_1",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_047_2",
        "name": "Cassonade",
        "canonicalId": "ing_canon_cassonade",
        "quantity": "90",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_047_3",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_047_4",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_047_5",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "0.5",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_047_6",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_047_7",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_047_8",
        "name": "Miel",
        "canonicalId": "ing_canon_miel",
        "quantity": "2",
        "unit": "c. à café",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_047_9",
        "name": "Chocolat noir",
        "canonicalId": "ing_canon_chocolat_noir",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_047_1",
        "order": 1,
        "instruction": "Mélangez la farine, les sucres, le sel et la levure dans un grand saladier."
      },
      {
        "id": "stp_rec_top100_047_2",
        "order": 2,
        "instruction": "Faites fondre le beurre."
      },
      {
        "id": "stp_rec_top100_047_3",
        "order": 3,
        "instruction": "Ajoutez-y l'oeuf battu et les 2 cuillères à café de miel"
      },
      {
        "id": "stp_rec_top100_047_4",
        "order": 4,
        "instruction": "incorporez le tout à la préparation."
      },
      {
        "id": "stp_rec_top100_047_5",
        "order": 5,
        "instruction": "Ajouter les pépites de chocolat (de préférence au lait, mais j'ai déjà goûté des cookies aux 3 chocolats et c'est exquis), et mélangez."
      },
      {
        "id": "stp_rec_top100_047_6",
        "order": 6,
        "instruction": "Préchauffez votre four à 220°C (thermostat 7-8), avec la grille au plus bas. Façonnez des cookies d’environ 10 cm de diamètre (avec une cuillère à glace c'est facile)."
      },
      {
        "id": "stp_rec_top100_047_7",
        "order": 7,
        "instruction": "Disposez-les sur une plaque. Ils doivent être assez espacés."
      },
      {
        "id": "stp_rec_top100_047_8",
        "order": 8,
        "instruction": "Enfournez-les 9 à 11 minutes, selon que vous les souhaitiez respectivement « extra-moelleux, moelleux ou crousti-moelleux »..."
      },
      {
        "id": "stp_rec_top100_047_9",
        "order": 9,
        "instruction": "Vous m’en direz des nouvelles !"
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160513/21955_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20200916/114198_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160513/21947_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_048",
    "title": "Paupiettes de veau",
    "description": "Recette Paupiettes de veau  : la meilleure recette rapide et facile : 2 personnes, 45 min de préparation. Notée 4.9/5 par 306 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 30,
    "servings": 2,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20221007/135809_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_paupiettes-de-veau_82641.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_048_1",
        "name": "Paupiettes de veau",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_048_2",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "1",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_048_3",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_048_4",
        "name": "Fond de veau",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_048_5",
        "name": "Vin blanc",
        "canonicalId": "ing_canon_vin_blanc",
        "quantity": "12.5",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_048_6",
        "name": "Veau",
        "canonicalId": "ing_canon_veau",
        "quantity": "12.5",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_048_7",
        "name": "Moutarde",
        "canonicalId": "ing_canon_moutarde",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_048_8",
        "name": "Vinaigre",
        "canonicalId": "ing_canon_vinaigre",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_048_1",
        "order": 1,
        "instruction": "Dans une sauteuse, faire chauffer l'huile d'olive avec la gousse d'ail finement coupée, à feu moyen."
      },
      {
        "id": "stp_rec_top100_048_2",
        "order": 2,
        "instruction": "Lorsque c'est bien chaud, mettre les paupiettes à dorer quelques minutes de chaque côté."
      },
      {
        "id": "stp_rec_top100_048_3",
        "order": 3,
        "instruction": "Quand toutes les faces sont légèrement colorées, ajouter le fond de veau et mouiller avec le vin blanc et l'eau."
      },
      {
        "id": "stp_rec_top100_048_4",
        "order": 4,
        "instruction": "Ensuite mettre la moutarde, le vinaigre balsamique et bien mélanger en retournant les paupiettes pour qu'elles s'imbibent bien de la sauce."
      },
      {
        "id": "stp_rec_top100_048_5",
        "order": 5,
        "instruction": "Laisser cuire 5 minutes à feu moyen, pour que l'alcool du vin blanc s'évapore, puis mettre à feu doux et couvrir. Laisser mijoter 20 minutes environ, en retournant les paupiettes de temps en temps."
      },
      {
        "id": "stp_rec_top100_048_6",
        "order": 6,
        "instruction": "S'accommode avec toutes sortes de légumes ainsi que des féculents."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20221007/135809_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20131001/22169_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180716/81382_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_049",
    "title": "Galette des rois facile",
    "description": "Recette Galette des rois facile : la meilleure recette rapide et facile : 6 personnes, 45 min de préparation. Notée 4.9/5 par 305 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 35,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20171019/73549_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_galette-des-rois-facile_19012.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_049_1",
        "name": "Ronds de pates feuilletees",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_049_2",
        "name": "Amande",
        "canonicalId": "ing_canon_amande",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_049_3",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_049_4",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_049_5",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_049_6",
        "name": "Jaune d oeuf pour dorer",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_049_7",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_049_8",
        "name": "Liqueur d amande",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_049_9",
        "name": "Fécule de maïs",
        "canonicalId": "ing_canon_fecule_de_mais",
        "quantity": "10",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_049_10",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "10",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_049_11",
        "name": "Rhum",
        "canonicalId": "ing_canon_rhum",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_049_1",
        "order": 1,
        "instruction": "Battre les 2 oeufs avec le sucre. Ajouter la Maïzena délayée dans le lait froid."
      },
      {
        "id": "stp_rec_top100_049_2",
        "order": 2,
        "instruction": "Cuire à feu doux jusqu’à ébullition en remuant. Laisser épaissir et retirer du feu."
      },
      {
        "id": "stp_rec_top100_049_3",
        "order": 3,
        "instruction": "Ajouter la poudre d’amandes, la vanille, les liqueurs et le beurre coupé en morceaux."
      },
      {
        "id": "stp_rec_top100_049_4",
        "order": 4,
        "instruction": "Garnir un fond de pâte. Recouvrir avec l’autre rond, souder les bords. Dorer avec le jaune d’oeuf."
      },
      {
        "id": "stp_rec_top100_049_5",
        "order": 5,
        "instruction": "Faire cuire en bas du four 30/35 mn (Th 6-7 )."
      },
      {
        "id": "stp_rec_top100_049_6",
        "order": 6,
        "instruction": "La galette est cuite quand on peut la soulever sans qu’elle ne plie."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20171019/73549_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/19476_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130111/18675_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130506/27449_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_050",
    "title": "Tarte au citron meringuée",
    "description": "Recette Tarte au citron meringuée : la meilleure recette rapide et facile : 6 personnes, 55 min de préparation. Notée 4.7/5 par 2932 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 30,
    "cookTimeMinutes": 25,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20140121/63377_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_the-tarte-au-citron-meringuee_22082.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_050_1",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_050_2",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_050_3",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "70",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_050_4",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_050_5",
        "name": "Veau",
        "canonicalId": "ing_canon_veau",
        "quantity": "5",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_050_6",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_050_7",
        "name": "Citrons de taille moyenne",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_050_8",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_050_9",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_050_10",
        "name": "Fécule de maïs",
        "canonicalId": "ing_canon_fecule_de_mais",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_050_11",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_050_12",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_050_13",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "0.5",
        "unit": "c. à café",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_050_1",
        "order": 1,
        "instruction": "On commence par la pâte sablée : mettre le four à préchauffer à 180°C (thermostat 6).  On sépare les blancs des jaunes d'oeufs."
      },
      {
        "id": "stp_rec_top100_050_2",
        "order": 2,
        "instruction": "Fouetter les jaunes d'oeuf avec le sucre et 2 cuillères d'eau pour faire mousser."
      },
      {
        "id": "stp_rec_top100_050_3",
        "order": 3,
        "instruction": "Mélanger au doigt la farine et le beurre coupé en petits cubes"
      },
      {
        "id": "stp_rec_top100_050_4",
        "order": 4,
        "instruction": "pour obtenir une consistance sableuse et afin que tout le beurre soit absorbé (il faut faire vite pour que le mélange ne ramollisse pas trop)."
      },
      {
        "id": "stp_rec_top100_050_5",
        "order": 5,
        "instruction": "Verser au milieu de ce \"sable\" le mélange liquide."
      },
      {
        "id": "stp_rec_top100_050_6",
        "order": 6,
        "instruction": "Incorporer rapidement au couteau les éléments sans leur donner de corps."
      },
      {
        "id": "stp_rec_top100_050_7",
        "order": 7,
        "instruction": "Former une boule avec les paumes"
      },
      {
        "id": "stp_rec_top100_050_8",
        "order": 8,
        "instruction": "et l'écraser 1 ou 2 fois pour rendre la boule plus homogène."
      },
      {
        "id": "stp_rec_top100_050_9",
        "order": 9,
        "instruction": "Foncer un moule de 25 cm de diamètre avec la pâte sablée"
      },
      {
        "id": "stp_rec_top100_050_10",
        "order": 10,
        "instruction": "puis la recouvrir de papier sulfurisé et de haricots secs."
      },
      {
        "id": "stp_rec_top100_050_11",
        "order": 11,
        "instruction": "Cuire à blanc 20 à 25 minutes (NB après baisser le four à 120°C/150°C environ pour la meringue)."
      },
      {
        "id": "stp_rec_top100_050_12",
        "order": 12,
        "instruction": "On poursuit avec la crème au citron : laver les citrons et en râper deux afin de récupérer le zeste."
      },
      {
        "id": "stp_rec_top100_050_13",
        "order": 13,
        "instruction": "Mettre les zestes très fins dans une casserole avec le jus des citrons, le sucre et la Maïzena."
      },
      {
        "id": "stp_rec_top100_050_14",
        "order": 14,
        "instruction": "Remuer et commencer à faire chauffer à feux doux."
      },
      {
        "id": "stp_rec_top100_050_15",
        "order": 15,
        "instruction": "Battre les oeufs dans un récipient séparé.  Une fois les oeufs battus, incorporer tout en remuant le jus de citron, le sucre, la Maïzena et les zestes."
      },
      {
        "id": "stp_rec_top100_050_16",
        "order": 16,
        "instruction": "Mettre à feu vif et continuer à remuer à l'aide d'un fouet.  Le mélange va commencer à s'épaissir.  Veiller à toujours remuer lorsque les oeufs sont ajoutés car la crème de citron pourrait brûler."
      },
      {
        "id": "stp_rec_top100_050_17",
        "order": 17,
        "instruction": "Ôter du feu et verser l'appareil sur le fond de tarte cuit."
      },
      {
        "id": "stp_rec_top100_050_18",
        "order": 18,
        "instruction": "Laisser refroidir."
      },
      {
        "id": "stp_rec_top100_050_19",
        "order": 19,
        "instruction": "Terminons par la meringue : monter les blancs en neige avec une pincée de sel."
      },
      {
        "id": "stp_rec_top100_050_20",
        "order": 20,
        "instruction": "Quand ils commencent à être fermes, ajouter le sucre puis la levure.  Fouetter jusqu'à ce que la neige soit ferme."
      },
      {
        "id": "stp_rec_top100_050_21",
        "order": 21,
        "instruction": "Recouvrir la crème au citron de meringue"
      },
      {
        "id": "stp_rec_top100_050_22",
        "order": 22,
        "instruction": "puis enfourner la tarte à 120°C/150°C jusqu’à ce que la meringue dore (environ 10 minutes)."
      },
      {
        "id": "stp_rec_top100_050_23",
        "order": 23,
        "instruction": "Déguster"
      },
      {
        "id": "stp_rec_top100_050_24",
        "order": 24,
        "instruction": "Une part ?"
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20140121/63377_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20170213/63342_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20170213/63346_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_051",
    "title": "Gâteau au chocolat fondant rapide",
    "description": "Recette Gâteau au chocolat fondant rapide : la meilleure recette rapide et facile : 6 personnes, 40 min de préparation. Notée 4.7/5 par 1912 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 30,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20230620/143582_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_gateau-au-chocolat-fondant-rapide_166352.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_051_1",
        "name": "Chocolat noir",
        "canonicalId": "ing_canon_chocolat_noir",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_051_2",
        "name": "Beurre + une noix pour le moule",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_051_3",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_051_4",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_051_5",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_051_1",
        "order": 1,
        "instruction": "Préchauffez votre four à 180°C (thermostat 6). Dans une casserole, faites fondre le chocolat et le beurre coupé en morceaux à feu très doux."
      },
      {
        "id": "stp_rec_top100_051_2",
        "order": 2,
        "instruction": "Dans un saladier, ajoutez le sucre, les oeufs, la farine. Mélangez."
      },
      {
        "id": "stp_rec_top100_051_3",
        "order": 3,
        "instruction": "Ajoutez le mélange chocolat/beurre. Mélangez bien."
      },
      {
        "id": "stp_rec_top100_051_4",
        "order": 4,
        "instruction": "Beurrez à l'aide d'une feuille de papier essuie-tout et farinez votre moule puis y versez la pâte à gâteau."
      },
      {
        "id": "stp_rec_top100_051_5",
        "order": 5,
        "instruction": "Faites cuire au four environ 20 minutes."
      },
      {
        "id": "stp_rec_top100_051_6",
        "order": 6,
        "instruction": "A la sortie du four le gâteau ne paraît pas assez cuit. C'est normal, laissez-le refroidir puis démoulez- le."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20230620/143582_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20190529/93106_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20190529/93102_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_052",
    "title": "Gâteau aux pommes facile",
    "description": "Ce gâteau aux pommes fondant et délicatement parfumé est parfait pour un dessert ou un goûter maison. Avec sa texture moelleuse et ses morceaux de pommes, il plaira aux amateurs de pâtisseries simples et authentiques. Idéal avec un thé !",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 40,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20170529/37207_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_gateau-aux-pommes-facile_13493.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_052_1",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "120",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_052_2",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "paquet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_052_3",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_052_4",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "0.5",
        "unit": "paquet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_052_5",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_052_6",
        "name": "Huile de tournesol",
        "canonicalId": "ing_canon_huile_de_tournesol",
        "quantity": "0.5",
        "unit": "verre",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_052_7",
        "name": "Pomme",
        "canonicalId": "ing_canon_pomme",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_052_1",
        "order": 1,
        "instruction": "Préchauffer le four à 160°C (thermostat 5-6). Mélanger tous les ingrédients de la pâte."
      },
      {
        "id": "stp_rec_top100_052_2",
        "order": 2,
        "instruction": "Ajouter les pommes préalablement coupées en cube."
      },
      {
        "id": "stp_rec_top100_052_3",
        "order": 3,
        "instruction": "Mélanger à nouveau à la spatule."
      },
      {
        "id": "stp_rec_top100_052_4",
        "order": 4,
        "instruction": "Verser la pâte à gâteau dans un moule beurré et cuire pendant 40 à 50 minutes."
      },
      {
        "id": "stp_rec_top100_052_5",
        "order": 5,
        "instruction": "Déguster !"
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20170529/37207_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20170529/37211_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20170529/37209_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_053",
    "title": "Tarte frangipane aux poires et au chocolat",
    "description": "Recette Tarte frangipane aux poires et au chocolat : la meilleure recette rapide et facile : 6 personnes, 40 min de préparation. Notée 4.8/5 par 516 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 30,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20171220/76170_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_tarte-frangipane-aux-poires-et-au-chocolat_15765.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_053_1",
        "name": "Poires conferences bien mures",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_053_2",
        "name": "Chocolat special dessert",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_053_3",
        "name": "Pâte feuilletée",
        "canonicalId": "ing_canon_pate_feuilletee",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_053_4",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_053_5",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_053_6",
        "name": "Amande",
        "canonicalId": "ing_canon_amande",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_053_7",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_053_1",
        "order": 1,
        "instruction": "Préchauffer votre four à thermostat 7 (220°C)."
      },
      {
        "id": "stp_rec_top100_053_2",
        "order": 2,
        "instruction": "Dans un saladier, mélanger le beurre mou, la poudre d'amandes et le sucre jusqu'à obtention d'un mélange lisse. Ajouter les 2 œufs préalablement battus et bien mélanger."
      },
      {
        "id": "stp_rec_top100_053_3",
        "order": 3,
        "instruction": "Dérouler la pâte en conservant la feuille de cuisson et piquer le fond. Éplucher, épépiner et couper les poires en 2 ou 4."
      },
      {
        "id": "stp_rec_top100_053_4",
        "order": 4,
        "instruction": "Faire fondre le chocolat au bain marie ou micro-ondes puis napper le fond de tarte. Verser dessus la préparation à base d'amandes et y disposer les poires."
      },
      {
        "id": "stp_rec_top100_053_5",
        "order": 5,
        "instruction": "Faire cuire votre tarte dans la partie basse du four environ 30 min (surveiller la cuisson pour ne pas que le fond de tarte brûle)."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20171220/76170_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20171220/76169_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20141105/46014_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_054",
    "title": "Pain d'épices aux fruits secs facile",
    "description": "Recette Pain d'épices aux fruits secs facile : la meilleure recette rapide et facile : 8 personnes, 50 min de préparation. Notée 4.8/5 par 498 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 35,
    "servings": 8,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20201201/116004_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_pain-d-epices-facile_15915.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_054_1",
        "name": "Miel",
        "canonicalId": "ing_canon_miel",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_2",
        "name": "Lait chaud",
        "quantity": "10",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_3",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_4",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_5",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "0.5",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_6",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_7",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_8",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_9",
        "name": "Cannelle",
        "canonicalId": "ing_canon_cannelle",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_10",
        "name": "Gingembre",
        "canonicalId": "ing_canon_gingembre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_11",
        "name": "Clou de girofle",
        "canonicalId": "ing_canon_clou_de_girofle",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_12",
        "name": "Muscade",
        "canonicalId": "ing_canon_muscade",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_13",
        "name": "Noix",
        "canonicalId": "ing_canon_noix",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_14",
        "name": "Noisette",
        "canonicalId": "ing_canon_noisette",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_15",
        "name": "Amande",
        "canonicalId": "ing_canon_amande",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_16",
        "name": "Noix de coco",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_054_17",
        "name": "Ecorce d orange",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_054_1",
        "order": 1,
        "instruction": "Délayer le miel dans le lait chaud."
      },
      {
        "id": "stp_rec_top100_054_2",
        "order": 2,
        "instruction": "Ajouter le beurre fondu,"
      },
      {
        "id": "stp_rec_top100_054_3",
        "order": 3,
        "instruction": "puis la farine en mélangeant énergiquement en cas de grumeaux."
      },
      {
        "id": "stp_rec_top100_054_4",
        "order": 4,
        "instruction": "Incorporer alors la levure, la cassonade, l'oeuf et le sel."
      },
      {
        "id": "stp_rec_top100_054_5",
        "order": 5,
        "instruction": "Ajouter les épices"
      },
      {
        "id": "stp_rec_top100_054_6",
        "order": 6,
        "instruction": "et les noix, selon les goûts."
      },
      {
        "id": "stp_rec_top100_054_7",
        "order": 7,
        "instruction": "Verser dans un moule à cake"
      },
      {
        "id": "stp_rec_top100_054_8",
        "order": 8,
        "instruction": "Cuire 30 à 35 minutes."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20201201/116004_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160527/2316_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20131018/2313_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_055",
    "title": "Tarte tatin aux endives et chavignol",
    "description": "Recette Tarte tatin aux endives et chavignol : la meilleure recette rapide et facile : 4 personnes, 65 min de préparation. Notée 4.8/5 par 494 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Moyen",
    "prepTimeMinutes": 25,
    "cookTimeMinutes": 40,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20180219/77624_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_tarte-tatin-aux-endives-et-chavignol_23918.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_055_1",
        "name": "Pâte feuilletée",
        "canonicalId": "ing_canon_pate_feuilletee",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_055_2",
        "name": "Endive",
        "canonicalId": "ing_canon_endive",
        "quantity": "5",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_055_3",
        "name": "Chèvre",
        "canonicalId": "ing_canon_chevre",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_055_4",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_055_5",
        "name": "Herbes de Provence",
        "canonicalId": "ing_canon_herbes_de_provence",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_055_6",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_055_7",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_055_8",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_055_1",
        "order": 1,
        "instruction": "Coupez en quatre les endives, dans le sens de la longueur."
      },
      {
        "id": "stp_rec_top100_055_2",
        "order": 2,
        "instruction": "Les disposer dans une sauteuse et les faire revenir dans la moitié du beurre, à feu doux durant 25 min; elles doivent prendre une belle coloration blonde."
      },
      {
        "id": "stp_rec_top100_055_3",
        "order": 3,
        "instruction": "Dans un moule à manqué, versez l'autre moitié du beurre fondu et saupoudrez de la cuillère à soupe de sucre."
      },
      {
        "id": "stp_rec_top100_055_4",
        "order": 4,
        "instruction": "Préchauffez le four à 200°C (thermostat 6-7)."
      },
      {
        "id": "stp_rec_top100_055_5",
        "order": 5,
        "instruction": "Disposez les quartiers d'endives en rosace, au fond du moule (le coeur au centre)."
      },
      {
        "id": "stp_rec_top100_055_6",
        "order": 6,
        "instruction": "Coupez les crottins de chèvre en tranches fines et disposez-les sur les endives, puis saupoudrez de la moitié de la cuillère d'herbes de provence; salez et poivrez."
      },
      {
        "id": "stp_rec_top100_055_7",
        "order": 7,
        "instruction": "Recouvrez avec la pâte feuilletée, le bord de la pâte doit glisser entre le moule et les endives."
      },
      {
        "id": "stp_rec_top100_055_8",
        "order": 8,
        "instruction": "Enfournez 20 min, la pâte doit se soulever et prendre une belle couleur blonde."
      },
      {
        "id": "stp_rec_top100_055_9",
        "order": 9,
        "instruction": "Prenez une assiette légèrement plus grande que le diamètre du moule, puis posez-la dessus, et d'un geste retournez l'ensemble."
      },
      {
        "id": "stp_rec_top100_055_10",
        "order": 10,
        "instruction": "Attendez 5 ou 6 secondes, et soulevez délicatement le moule."
      },
      {
        "id": "stp_rec_top100_055_11",
        "order": 11,
        "instruction": "Pour finir, saupoudrez avec la moitié des herbes de Provence restantes."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20180219/77624_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130628/38356_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20120828/44255_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140319/49188_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_056",
    "title": "Gougères au fromage",
    "description": "Recette Gougères au fromage : la meilleure recette rapide et facile : 6 personnes, 45 min de préparation. Notée 4.8/5 par 494 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 25,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160513/2643_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_gougeres-au-fromage_20095.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_056_1",
        "name": "Oeufs + 1 jaune",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_056_2",
        "name": "Fromage râpé",
        "canonicalId": "ing_canon_fromage_rape",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_056_3",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_056_4",
        "name": "Beurre + 15 g pour la plaque",
        "quantity": "80",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_056_5",
        "name": "Muscade",
        "canonicalId": "ing_canon_muscade",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_056_6",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_056_7",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_056_1",
        "order": 1,
        "instruction": "Préchauffez le four à 200°C (th 6-7)."
      },
      {
        "id": "stp_rec_top100_056_2",
        "order": 2,
        "instruction": "Dans une casserole, portez 25 cl d'eau à ébullition, avec le beurre coupé en morceaux + 1 cuillère à café de sel."
      },
      {
        "id": "stp_rec_top100_056_3",
        "order": 3,
        "instruction": "Hors du feu, ajoutez la farine d'un coup."
      },
      {
        "id": "stp_rec_top100_056_4",
        "order": 4,
        "instruction": "Mélangez vivement, et faites dessécher pendant 1 min sur feu doux."
      },
      {
        "id": "stp_rec_top100_056_5",
        "order": 5,
        "instruction": "Laissez tiédir quelques instants, et incorporez les oeufs un par un en mélangeant bien."
      },
      {
        "id": "stp_rec_top100_056_6",
        "order": 6,
        "instruction": "Ajoutez le gruyère râpé, la muscade, le sel et le poivre."
      },
      {
        "id": "stp_rec_top100_056_7",
        "order": 7,
        "instruction": "Déposez cette pâte à l'aide de 2 cuillères à café, en petits tas séparés, sur une plaque beurrée."
      },
      {
        "id": "stp_rec_top100_056_8",
        "order": 8,
        "instruction": "Vous pouvez dorer les petites gougères avec un jaune d'oeuf, à l'aide d'un pinceau."
      },
      {
        "id": "stp_rec_top100_056_9",
        "order": 9,
        "instruction": "Enfournez 25 min en surveillant."
      },
      {
        "id": "stp_rec_top100_056_10",
        "order": 10,
        "instruction": "C'est prêt"
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160513/2643_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160513/2644_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/1528_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_057",
    "title": "Soupe veloutée de potimarron et pommes de terre",
    "description": "Recette Soupe veloutée de potimarron et pommes de terre : la meilleure recette rapide et facile : 4 personnes, 45 min de préparation. Notée 4.9/5 par 298 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 30,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20220930/135573_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_soupe-veloutee-de-potimarron-et-pommes-de-terre_41161.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_057_1",
        "name": "Potimarron",
        "canonicalId": "ing_canon_potimarron",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_057_2",
        "name": "Pomme de terre",
        "canonicalId": "ing_canon_pomme_de_terre",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_057_3",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_057_4",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "3",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_057_5",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "10",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_057_6",
        "name": "Curry",
        "canonicalId": "ing_canon_curry",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_057_7",
        "name": "Muscade",
        "canonicalId": "ing_canon_muscade",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_057_8",
        "name": "Bouillon de volaille",
        "canonicalId": "ing_canon_bouillon_de_volaille",
        "quantity": "1",
        "unit": "cube",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_057_9",
        "name": "Laurier",
        "canonicalId": "ing_canon_laurier",
        "quantity": "1",
        "unit": "feuille",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_057_10",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_057_11",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_057_1",
        "order": 1,
        "instruction": "Enlever l'écorce et les pépins du potimarron (il n'est pas obligatoire de le peler, mais dans ce cas, le choisir bio et bien le laver) puis couper la chair en gros morceaux."
      },
      {
        "id": "stp_rec_top100_057_2",
        "order": 2,
        "instruction": "Eplucher les pommes de terre puis les couper en gros morceaux."
      },
      {
        "id": "stp_rec_top100_057_3",
        "order": 3,
        "instruction": "Faire revenir les oignons et l'ail hachés dans un peu de beurre à feu doux."
      },
      {
        "id": "stp_rec_top100_057_4",
        "order": 4,
        "instruction": "Ajouter les pommes de terre et le potimarron, faire revenir 5 min."
      },
      {
        "id": "stp_rec_top100_057_5",
        "order": 5,
        "instruction": "Couvrir le tout d'eau, ajouter le bouillon de poule (émietté), le curry, la muscade, la feuille de laurier et laisser mijoter environ 30 min à feu doux."
      },
      {
        "id": "stp_rec_top100_057_6",
        "order": 6,
        "instruction": "Lorsque les légumes sont cuits (vérifier à l'aide d'un couteau), mixer votre préparation."
      },
      {
        "id": "stp_rec_top100_057_7",
        "order": 7,
        "instruction": "Vérifier l'assaisonnement, saler, poivrer selon votre goût puis ajouter la crème fraîche et laisser mijoter encore 2 ou 3 min. Bon appétit !"
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20220930/135573_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20201217/116545_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180713/81050_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_058",
    "title": "Financier minute (pour utiliser des blancs d'oeuf)",
    "description": "Recette Financier minute (pour utiliser des blancs d'oeuf) : la meilleure recette rapide et facile : 4 personnes, 30 min de préparation. Notée 4.8/5 par 528 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 20,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20200430/110248_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_financier-minute-pour-utiliser-des-blancs-d-oeuf_17526.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_058_1",
        "name": "Amande",
        "canonicalId": "ing_canon_amande",
        "quantity": "80",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_058_2",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "60",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_058_3",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_058_4",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_058_5",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_058_1",
        "order": 1,
        "instruction": "Mélanger les blancs d'oeufs, la farine, le sucre et les amandes en fouettant énergiquement."
      },
      {
        "id": "stp_rec_top100_058_2",
        "order": 2,
        "instruction": "Ajouter le beurre fondu. Verser dans un moule beurré."
      },
      {
        "id": "stp_rec_top100_058_3",
        "order": 3,
        "instruction": "Cuire 20 minutes à 200°C (thermostat 6/7)."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20200430/110248_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20200430/110249_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20131201/10643_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_059",
    "title": "Tarte aux poireaux et aux lardons",
    "description": "Recette Tarte aux poireaux et aux lardons : la meilleure recette rapide et facile : 6 personnes, 50 min de préparation. Notée 4.8/5 par 507 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Moyen",
    "prepTimeMinutes": 25,
    "cookTimeMinutes": 25,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160325/58176_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_tarte-aux-poireaux-et-aux-lardons_12850.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_059_1",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_059_2",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "140",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_059_3",
        "name": "Veau",
        "canonicalId": "ing_canon_veau",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_059_4",
        "name": "Poireau",
        "canonicalId": "ing_canon_poireau",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_059_5",
        "name": "Lardon",
        "canonicalId": "ing_canon_lardon",
        "quantity": "400",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_059_6",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_059_7",
        "name": "Fromage râpé",
        "canonicalId": "ing_canon_fromage_rape",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_059_8",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "25",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_059_9",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_059_10",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_059_1",
        "order": 1,
        "instruction": "Préchauffer le four à 210°C (thermostat 7)."
      },
      {
        "id": "stp_rec_top100_059_2",
        "order": 2,
        "instruction": "Faire la pâte à tarte : malaxer le beurre et la farine, l'eau, étaler puis mettre dans le plat."
      },
      {
        "id": "stp_rec_top100_059_3",
        "order": 3,
        "instruction": "Émincer les poireaux. Les faire dorer dans un peu de beurre."
      },
      {
        "id": "stp_rec_top100_059_4",
        "order": 4,
        "instruction": "Faire dorer les lardons à part."
      },
      {
        "id": "stp_rec_top100_059_5",
        "order": 5,
        "instruction": "Les égoutter soigneusement avant de les ajouter aux poireaux."
      },
      {
        "id": "stp_rec_top100_059_6",
        "order": 6,
        "instruction": "Faire l'appareil : mêler les oeufs, la crème, le sel et le poivre."
      },
      {
        "id": "stp_rec_top100_059_7",
        "order": 7,
        "instruction": "Étaler les poireaux et les lardons sur la pâte."
      },
      {
        "id": "stp_rec_top100_059_8",
        "order": 8,
        "instruction": "Parsemer de gruyère râpé, couvrir avec l'appareil."
      },
      {
        "id": "stp_rec_top100_059_9",
        "order": 9,
        "instruction": "Mettre au four 25 min."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160325/58176_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180713/81163_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20131019/65092_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_060",
    "title": "Tarte tatin de légumes",
    "description": "Recette Tarte tatin de légumes : la meilleure recette rapide et facile : 6 personnes, 60 min de préparation. Notée 4.8/5 par 504 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 30,
    "cookTimeMinutes": 30,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160404/63886_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_tarte-tatin-de-legumes_24112.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_060_1",
        "name": "Courgette",
        "canonicalId": "ing_canon_courgette",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_060_2",
        "name": "Poivrons de couleurs differentes",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_060_3",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_060_4",
        "name": "Tomate",
        "canonicalId": "ing_canon_tomate",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_060_5",
        "name": "Aubergine",
        "canonicalId": "ing_canon_aubergine",
        "quantity": "0.5",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_060_6",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_060_7",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_060_8",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_060_9",
        "name": "Herbes de Provence",
        "canonicalId": "ing_canon_herbes_de_provence",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_060_10",
        "name": "Parmesan environ",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_060_11",
        "name": "Pâte brisée",
        "canonicalId": "ing_canon_pate_brisee",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_060_1",
        "order": 1,
        "instruction": "Laver tous les légumes, puis les émincer."
      },
      {
        "id": "stp_rec_top100_060_2",
        "order": 2,
        "instruction": "Les faire revenir dans de l'huile d'olive à feu moyen, pendant environ 20 min. Au 3/4 de la cuisson, assaisonner et ajouter les herbes."
      },
      {
        "id": "stp_rec_top100_060_3",
        "order": 3,
        "instruction": "Préchauffer le four à 210°C. Garnir le fond d'un moule à tarte de papier sulfurisé, puis étaler les légumes par-dessus et tasser à l'aide d'une cuillère ou autre,de façon à ce que le dessus soit à peu près plat."
      },
      {
        "id": "stp_rec_top100_060_4",
        "order": 4,
        "instruction": "Saupoudrer un peu partout de parmesan et mettre la pâte brisée par-dessus. Rentrer les bords à l'intérieur du plat. Piquer et enfourner pour environ 30 mn, jusqu'à ce que la pâte soit cuite."
      },
      {
        "id": "stp_rec_top100_060_5",
        "order": 5,
        "instruction": "A la sortie du four, retourner la tarte sur un plat et servir chaud."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160404/63886_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140407/62534_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/62054_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_061",
    "title": "Sauté de veau de Lisbonne",
    "description": "Recette Sauté de veau de Lisbonne : la meilleure recette rapide et facile : 3 personnes, 75 min de préparation. Notée 4.9/5 par 284 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 60,
    "servings": 3,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160405/8490_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_saute-de-veau-de-lisbonne_28556.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_061_1",
        "name": "Veau",
        "canonicalId": "ing_canon_veau",
        "quantity": "400",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_061_2",
        "name": "Chorizo en fines rondelles",
        "quantity": "1",
        "unit": "morceau",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_061_3",
        "name": "Pommes de terre en gros morceaux",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_061_4",
        "name": "Olive",
        "canonicalId": "ing_canon_olive",
        "quantity": "1",
        "unit": "poignée",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_061_5",
        "name": "Concentré de tomate",
        "canonicalId": "ing_canon_concentre_de_tomate",
        "quantity": "1",
        "unit": "boîte",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_061_6",
        "name": "Porto + 1 verre d eau",
        "quantity": "1",
        "unit": "verre",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_061_7",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_061_8",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "1",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_061_9",
        "name": "Thym",
        "canonicalId": "ing_canon_thym",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_061_10",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_061_11",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_061_1",
        "order": 1,
        "instruction": "Couper la viande en gros carrés. La faire revenir dans une cocotte avec un peu d'huile d'olive quelques minutes."
      },
      {
        "id": "stp_rec_top100_061_2",
        "order": 2,
        "instruction": "Ajouter l'oignon et le faire roussir."
      },
      {
        "id": "stp_rec_top100_061_3",
        "order": 3,
        "instruction": "Ajouter l'eau, le Porto, et délayer le concentré de tomates."
      },
      {
        "id": "stp_rec_top100_061_4",
        "order": 4,
        "instruction": "Ajouter les autres ingrédients, saler (très modérément) et poivrer."
      },
      {
        "id": "stp_rec_top100_061_5",
        "order": 5,
        "instruction": "Laisser mijoter pendant 1 heure en rajoutant un peu d'eau si la sauce vous paraît trop courte."
      },
      {
        "id": "stp_rec_top100_061_6",
        "order": 6,
        "instruction": "Nota : vous pouvez faire ce plat la veille car réchauffé, il est encore meilleur."
      },
      {
        "id": "stp_rec_top100_061_7",
        "order": 7,
        "instruction": "Nota 2 : ne supprimez pas le chorizo ni le Porto, car ça donne beaucoup de caractère à ce plat."
      },
      {
        "id": "stp_rec_top100_061_8",
        "order": 8,
        "instruction": "Nota 3 : vous pouvez également le faire avec du filet mignon de porc et de la soubressade."
      },
      {
        "id": "stp_rec_top100_061_9",
        "order": 9,
        "instruction": "Nota 4 : on peut remplacer le Porto rouge par du blanc."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160405/8490_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/3171_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20150224/30601_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20150120/4880_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_062",
    "title": "Carbonades flamandes traditionnelles",
    "description": "La carbonade au pain d’épice est un plat robuste et chaleureux, idéal pour les repas d’automne ou d’hiver. La viande se marie parfaitement avec la douceur du pain d’épice, offrant une expérience gustative unique. Une recette parfaite pour régaler vos invités !",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 30,
    "cookTimeMinutes": 190,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20130201/9458_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_carbonades-flamandes-traditionnelles_29711.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_062_1",
        "name": "Boeuf maigre a braiser",
        "quantity": "1",
        "unit": "kg",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_062_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_062_3",
        "name": "Bouquet garni",
        "canonicalId": "ing_canon_bouquet_garni",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_062_4",
        "name": "Biere brune",
        "quantity": "1",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_062_5",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "400",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_062_6",
        "name": "Lard fume entier",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_062_7",
        "name": "Pains d epices",
        "quantity": "5",
        "unit": "tranches",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_062_8",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "30",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_062_9",
        "name": "Sel de guerande",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_062_10",
        "name": "Moutarde",
        "canonicalId": "ing_canon_moutarde",
        "quantity": "3",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_062_1",
        "order": 1,
        "instruction": "Couper la viande en cubes de 2 à 3 centimètres de côté.  Découper grossièrement les oignons et couper le lard en gros lardons."
      },
      {
        "id": "stp_rec_top100_062_2",
        "order": 2,
        "instruction": "Faire fondre le beurre et faire suer les oignons dedans 10 minutes pour les ramollir (feu au mini à couvert)."
      },
      {
        "id": "stp_rec_top100_062_3",
        "order": 3,
        "instruction": "Ajouter le lard en augmentant légèrement le feu, remuer régulièrement en essayant de garder couvert le plus possible."
      },
      {
        "id": "stp_rec_top100_062_4",
        "order": 4,
        "instruction": "Une fois le lard bien rose, retirer le tout (sauf le jus) et le réserver dans un plat."
      },
      {
        "id": "stp_rec_top100_062_5",
        "order": 5,
        "instruction": "Mettre le feu au maxi et mettre la viande dans la cocotte. Remuer régulièrement (ne pas couvrir), la viande doit se colorer de tous les côtés, elle va finir par rendre pas mal de jus. Retirer la cocotte du feu, mettre la viande dans un plat en conservant le jus dans la cocotte."
      },
      {
        "id": "stp_rec_top100_062_6",
        "order": 6,
        "instruction": "Diluer la cassonade dans le jus de viande et mettre sur le feu à fond pour le réduire de moitié."
      },
      {
        "id": "stp_rec_top100_062_7",
        "order": 7,
        "instruction": "Une fois réduit, mettre le feu au mini et remettre le mélange lard-oignons en le mêlant au 'sirop', ajouter la viande et re-mélanger, ajouter le bouquet garni et recouvrir de bière entre (80 cl et 1 litre), saler très légèrement."
      },
      {
        "id": "stp_rec_top100_062_8",
        "order": 8,
        "instruction": "Recouvrir délicatement toute la surface avec le pain d'épices 'moutardé'.  Laisser mijoter à couvert 3 heures sans remuer, tant que le pain d'épices n'est pas fondu (retirer le bouquet après 1 heure ou 2 maxi)."
      },
      {
        "id": "stp_rec_top100_062_9",
        "order": 9,
        "instruction": "En cours de 'mijotage', rectifier l'assaisonnement si besoin."
      },
      {
        "id": "stp_rec_top100_062_10",
        "order": 10,
        "instruction": "Si après trois heures, le jus est encore trop liquide, laisser encore mijoter en laissant le couvercle en partie ouvert, la sauce doit être légèrement collante en surface mais bien liquide en dessous et ne doit surtout pas brûler au fond."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20130201/9458_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180712/80825_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20111026/27987_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_063",
    "title": "Tarte aux pommes",
    "description": "Recette Tarte aux pommes : la meilleure recette rapide et facile : 6 personnes, 55 min de préparation. Notée 4.8/5 par 487 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 25,
    "cookTimeMinutes": 30,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20220128/128250_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_tarte-aux-pommes_18588.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_063_1",
        "name": "Pâte brisée",
        "canonicalId": "ing_canon_pate_brisee",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_063_2",
        "name": "Pomme",
        "canonicalId": "ing_canon_pomme",
        "quantity": "6",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_063_3",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_063_4",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "30",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_063_1",
        "order": 1,
        "instruction": "Éplucher et découper en morceaux 4 Golden."
      },
      {
        "id": "stp_rec_top100_063_2",
        "order": 2,
        "instruction": "Faire une compote : les mettre dans une casserole avec un peu d'eau (1 verre ou 2). Bien remuer. Quand les pommes commencent à ramollir, ajouter un sachet ou un sachet et demi de sucre vanillé. Ajouter un peu d'eau si nécessaire."
      },
      {
        "id": "stp_rec_top100_063_3",
        "order": 3,
        "instruction": "Vous saurez si la compote est prête une fois que les pommes ne seront plus dures du tout. Ce n'est pas grave s'il reste quelques morceaux."
      },
      {
        "id": "stp_rec_top100_063_4",
        "order": 4,
        "instruction": "Pendant que la compote cuit, éplucher et couper en quatre les deux dernières pommes, puis, couper les quartiers en fines lamelles (elles serviront à être posées sur la compote)."
      },
      {
        "id": "stp_rec_top100_063_5",
        "order": 5,
        "instruction": "Préchauffer le four à 210°C (thermostat 7)."
      },
      {
        "id": "stp_rec_top100_063_6",
        "order": 6,
        "instruction": "Laisser un peu refroidir la compote et étaler la pâte brisée dans un moule et la piquer avec une fourchette."
      },
      {
        "id": "stp_rec_top100_063_7",
        "order": 7,
        "instruction": "Verser la compote sur la pâte et placer les lamelles de pommes en formant une spirale ou plusieurs cercles, au choix ! Disposer des lamelles de beurre dessus."
      },
      {
        "id": "stp_rec_top100_063_8",
        "order": 8,
        "instruction": "Mettre au four et laisser cuire pendant 30 min max. Surveiller la cuisson. Vous pouvez ajouter un peu de sucre vanillé sur la tarte pendant que çà cuit pour caraméliser un peu."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20220128/128250_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20120905/13569_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20221019/136424_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_064",
    "title": "Lapin à la moutarde maison",
    "description": "Recette Lapin à la moutarde maison : la meilleure recette rapide et facile : 1 lapin, 60 min de préparation. Notée 4.8/5 par 478 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 60,
    "servings": 1,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20250408/159503_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_lapin-a-la-moutarde-maison_15983.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_064_1",
        "name": "Lapin",
        "canonicalId": "ing_canon_lapin",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_2",
        "name": "Vin blanc",
        "canonicalId": "ing_canon_vin_blanc",
        "quantity": "1",
        "unit": "bouteille",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_3",
        "name": "Moutarde",
        "canonicalId": "ing_canon_moutarde",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_4",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "1",
        "unit": "pot",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_5",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_6",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "2",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_7",
        "name": "Échalote",
        "canonicalId": "ing_canon_echalote",
        "quantity": "5",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_8",
        "name": "Laurier",
        "canonicalId": "ing_canon_laurier",
        "quantity": "3",
        "unit": "feuilles",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_9",
        "name": "Thym",
        "canonicalId": "ing_canon_thym",
        "quantity": "1",
        "unit": "branche",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_10",
        "name": "Persil",
        "canonicalId": "ing_canon_persil",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_11",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_12",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_13",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "1",
        "unit": "morceau",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_064_14",
        "name": "Carotte",
        "canonicalId": "ing_canon_carotte",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_064_1",
        "order": 1,
        "instruction": "Coupez le lapin en morceaux et badigeonnez légèrement de moutarde. Faire revenir les morceaux sans faire brûler dans un peu d'huile."
      },
      {
        "id": "stp_rec_top100_064_2",
        "order": 2,
        "instruction": "Pendant ce temps, portez à ébullition les 3/4 de la bouteille de vin blanc avec l'ail coupé en petits morceaux, le laurier, le thym, la carotte coupée en rondelles et le morceau de sucre."
      },
      {
        "id": "stp_rec_top100_064_3",
        "order": 3,
        "instruction": "Retirez les morceaux de lapin et gardez au chaud (le chaud lapin est toujours apprécié). Ajoutez un peu d'huile et faites dorer les échalotes coupées en rondelles. Ajoutez le lapin et versez dessus le vin blanc chaud. Salez, poivrez et laissez cuire à feu doux pendant 1 heure."
      },
      {
        "id": "stp_rec_top100_064_4",
        "order": 4,
        "instruction": "Dans un bol, mélangez la crème, du persil haché et une cuillère à soupe de moutarde. Profitez du temps restant pour vous préparer un kir avec le reste du vin blanc."
      },
      {
        "id": "stp_rec_top100_064_5",
        "order": 5,
        "instruction": "En fin de cuisson, placez les morceaux de lapin sur un plat de service et saupoudrez de persil."
      },
      {
        "id": "stp_rec_top100_064_6",
        "order": 6,
        "instruction": "Filtrez le jus de cuisson (facultatif) et incorporez la crème à la moutarde. Faites cuire 1 minutes sans faire bouillir et nappez les morceaux de lapin avec cette préparation."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20250408/159503_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180628/80080_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160404/4197_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_065",
    "title": "Gâteau d'anniversaire",
    "description": "Recette Gâteau d'anniversaire : la meilleure recette rapide et facile : 10 personnes, 80 min de préparation. Notée 4.8/5 par 474 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Difficile",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 60,
    "servings": 10,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20190529/93143_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_gateau-d-anniversaire_16870.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_065_1",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "300",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_065_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "300",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_065_3",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_065_4",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "paquet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_065_5",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "1",
        "unit": "paquet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_065_6",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "1",
        "unit": "verre",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_065_7",
        "name": "Huile",
        "quantity": "1",
        "unit": "verre",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_065_1",
        "order": 1,
        "instruction": "Mélanger les jaunes d'oeuf et le sucre"
      },
      {
        "id": "stp_rec_top100_065_2",
        "order": 2,
        "instruction": "pour obtenir un mélange blanc."
      },
      {
        "id": "stp_rec_top100_065_3",
        "order": 3,
        "instruction": "Ajouter peu à peu le verre de lait, le verre d'huile, la levure, puis la farine."
      },
      {
        "id": "stp_rec_top100_065_4",
        "order": 4,
        "instruction": "Monter les blancs en neige très ferme, puis les incorporer délicatement."
      },
      {
        "id": "stp_rec_top100_065_5",
        "order": 5,
        "instruction": "Beurrer et fariner légèrement un grand moule"
      },
      {
        "id": "stp_rec_top100_065_6",
        "order": 6,
        "instruction": "manqué, puis cuire 60 min à thermostat 3 ou 4 (120°C), en enfournant à four froid."
      },
      {
        "id": "stp_rec_top100_065_7",
        "order": 7,
        "instruction": "Décorer selon vos désirs : par exemple une crème au chocolat blanc en mélangeant du chocolat blanc à du fromage frais puis décorer avec des décors en sucre ou des paillettes colorées."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20190529/93143_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20181017/82777_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20190529/93141_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_066",
    "title": "Crevettes au curry express",
    "description": "Recette Crevettes au curry express : la meilleure recette rapide et facile : 2 personnes, 15 min de préparation. Notée 4.8/5 par 468 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Facile",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 5,
    "servings": 2,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20150225/32437_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_crevettes-au-curry-express_12645.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_066_1",
        "name": "Crevette",
        "canonicalId": "ing_canon_crevette",
        "quantity": "300",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_066_2",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_066_3",
        "name": "Curry",
        "canonicalId": "ing_canon_curry",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_066_4",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "2",
        "unit": "c. à café",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_066_1",
        "order": 1,
        "instruction": "Décortiquer les crevettes. Les faire revenir très rapidement dans l'huile d'olive en les saupoudrant de curry."
      },
      {
        "id": "stp_rec_top100_066_2",
        "order": 2,
        "instruction": "Ajouter la crème et mélanger le tout."
      },
      {
        "id": "stp_rec_top100_066_3",
        "order": 3,
        "instruction": "Servir immédiatement avec du riz thaï."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20150225/32437_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/27272_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140313/26828_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_067",
    "title": "Gâteau Banane de Stéph",
    "description": "Recette Gâteau Banane de Stéph : la meilleure recette rapide et facile : 6 personnes, 45 min de préparation. Notée 4.8/5 par 467 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 30,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20180827/81950_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_gateau-banane-de-steph_31190.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_067_1",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_067_2",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_067_3",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_067_4",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "0.5",
        "unit": "paquet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_067_5",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_067_6",
        "name": "Bananes ou 2 grandes",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_067_7",
        "name": "Rhum",
        "canonicalId": "ing_canon_rhum",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_067_8",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_067_1",
        "order": 1,
        "instruction": "Mélanger les oeufs et le sucre."
      },
      {
        "id": "stp_rec_top100_067_2",
        "order": 2,
        "instruction": "Ajouter le beurre fondu, puis la farine et la levure."
      },
      {
        "id": "stp_rec_top100_067_3",
        "order": 3,
        "instruction": "Couper les bananes en tous petits morceaux (ou les écraser au choix), et les ajouter au mélange."
      },
      {
        "id": "stp_rec_top100_067_4",
        "order": 4,
        "instruction": "Aromatiser avec le rhum et la vanille selon les goûts...."
      },
      {
        "id": "stp_rec_top100_067_5",
        "order": 5,
        "instruction": "Verser le tout dans un moule à cake beurré et fariné."
      },
      {
        "id": "stp_rec_top100_067_6",
        "order": 6,
        "instruction": "Laisser cuire environ 30 mn à four thermostat 6."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20180827/81950_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20181017/82863_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20131223/39598_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_068",
    "title": "Crème de citron (Lemon curd)",
    "description": "Recette Crème de citron (Lemon curd) : la meilleure recette rapide et facile : 4 personnes, 30 min de préparation. Notée 4.8/5 par 461 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 10,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160405/21836_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_creme-de-citron-lemon-curd_11210.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_068_1",
        "name": "Citrons de taille moyenne",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_068_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_068_3",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_068_4",
        "name": "Fécule de maïs",
        "canonicalId": "ing_canon_fecule_de_mais",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_068_1",
        "order": 1,
        "instruction": "Laver les citrons et en 'zester' 2, mettre les zestes très fins dans une casserole."
      },
      {
        "id": "stp_rec_top100_068_2",
        "order": 2,
        "instruction": "Presser les citrons et mettre le jus avec les zestes dans la casserole."
      },
      {
        "id": "stp_rec_top100_068_3",
        "order": 3,
        "instruction": "Verser le sucre et la Maïzena"
      },
      {
        "id": "stp_rec_top100_068_4",
        "order": 4,
        "instruction": "Remuer, et chauffer à feu doux"
      },
      {
        "id": "stp_rec_top100_068_5",
        "order": 5,
        "instruction": "Battre les oeufs dans un récipient séparé."
      },
      {
        "id": "stp_rec_top100_068_6",
        "order": 6,
        "instruction": "Une fois les oeufs battus, incorporer tout en remuant le jus de citron, le sucre, la maïzena et les zestes."
      },
      {
        "id": "stp_rec_top100_068_7",
        "order": 7,
        "instruction": "Mettre à feu fort et continuer à remuer à l'aide d'un fouet. Le mélange va commencer à s'épaissir.  Attention : toujours remuer lorsque les oeufs sont ajoutés, car sinon la crème de citron pourrait brûler !"
      },
      {
        "id": "stp_rec_top100_068_8",
        "order": 8,
        "instruction": "Oter du feu et mettre en pots (pots à confiture). Laisser refroidir, et conserver au réfrigérateur."
      },
      {
        "id": "stp_rec_top100_068_9",
        "order": 9,
        "instruction": "Voici 3 idées de recettes minute pour utiliser votre lemon curd."
      },
      {
        "id": "stp_rec_top100_068_10",
        "order": 10,
        "instruction": "1- verrines minute : biscuit émiétté, lemon curd, meringue émiettée"
      },
      {
        "id": "stp_rec_top100_068_11",
        "order": 11,
        "instruction": "2- tartelettes minute : palet breton, lemon curd, chantilly"
      },
      {
        "id": "stp_rec_top100_068_12",
        "order": 12,
        "instruction": "3- mousse minute : émulsionner le lemon curd avec de la chantilly"
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160405/21836_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160405/21835_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160405/21829_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_069",
    "title": "Endive jambon",
    "description": "Recette Endive jambon : la meilleure recette rapide et facile : 4 personnes, 45 min de préparation. Notée 4.8/5 par 459 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 30,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20161006/1269_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_endive-jambon_19848.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_069_1",
        "name": "Endive",
        "canonicalId": "ing_canon_endive",
        "quantity": "1",
        "unit": "kg",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_069_2",
        "name": "Jambon",
        "canonicalId": "ing_canon_jambon",
        "quantity": "4",
        "unit": "tranches",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_069_3",
        "name": "Creme liquide epaisse",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_069_4",
        "name": "Ail 2 a 3 gousses",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_069_5",
        "name": "Fromage râpé",
        "canonicalId": "ing_canon_fromage_rape",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_069_6",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "1",
        "unit": "noisette",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_069_1",
        "order": 1,
        "instruction": "Effeuiller les endives pour les faire cuire dans le l'eau bouillante.  Quand elles sont cuites les laisser égoutter."
      },
      {
        "id": "stp_rec_top100_069_2",
        "order": 2,
        "instruction": "Faire fondre dans une casserole, une noisette de beurre, y ajouter l'ail écrasé, puis ensuite, y verser la crème fraîche, saler poivrer, et y mettre le gruyère râpé en en conservant une partie pour le gratiné."
      },
      {
        "id": "stp_rec_top100_069_3",
        "order": 3,
        "instruction": "Disposer dans un plat allant au four, une couche d'endive, une couche de jambon, et une couche de la préparation à la crème, renouveller cette opération et terminer en mettant le reste du gruyère râpé sur le dessus."
      },
      {
        "id": "stp_rec_top100_069_4",
        "order": 4,
        "instruction": "Faire gratiner pendant à peu près 30 mn à four chaud et régalez vous."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20161006/1269_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140218/6227_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/277_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_070",
    "title": "Filet de poulet au curry",
    "description": "Recette Filet de poulet au curry : la meilleure recette rapide et facile : 4 personnes, 25 min de préparation. Notée 4.9/5 par 277 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Facile",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 15,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20200907/114028_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_filet-de-poulet-au-curry_80990.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_070_1",
        "name": "Poulet",
        "canonicalId": "ing_canon_poulet",
        "quantity": "4",
        "unit": "filets",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_070_2",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_070_3",
        "name": "Ail au poudre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_070_4",
        "name": "Sauce soja",
        "canonicalId": "ing_canon_sauce_soja",
        "quantity": "4",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_070_5",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "4",
        "unit": "brins",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_070_6",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_070_7",
        "name": "Curry",
        "canonicalId": "ing_canon_curry",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_070_8",
        "name": "Creme epaisse ou liquide",
        "quantity": "10",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_070_9",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_070_10",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_070_1",
        "order": 1,
        "instruction": "Couper les filets de poulet en petits morceaux, les mettre dans un saladier avec la sauce soja, l'ail, l'huile d'olive, la ciboulette et le curry. Laissez reposer une heure."
      },
      {
        "id": "stp_rec_top100_070_2",
        "order": 2,
        "instruction": "Après, faire revenir l'oignon avec un peu d'huile d'olive, une fois légèrement caramélisé, mettre la viande."
      },
      {
        "id": "stp_rec_top100_070_3",
        "order": 3,
        "instruction": "Quand la viande commence à cuire, mettre petit à petit la crème fraîche (épaisse ou liquide), ajouter du curry selon vos goûts sur la viande."
      },
      {
        "id": "stp_rec_top100_070_4",
        "order": 4,
        "instruction": "Mélanger bien le tout, saler et poivrer."
      },
      {
        "id": "stp_rec_top100_070_5",
        "order": 5,
        "instruction": "Bon appétit à vous."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20200907/114028_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20200907/114027_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180827/81937_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_071",
    "title": "Galette des rois",
    "description": "Recette Galette des rois : la meilleure recette rapide et facile : 6 personnes, 55 min de préparation. Notée 4.7/5 par 1433 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 40,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20161206/9654_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_galette-des-rois_10832.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_071_1",
        "name": "Pâte feuilletée",
        "canonicalId": "ing_canon_pate_feuilletee",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_071_2",
        "name": "Amande",
        "canonicalId": "ing_canon_amande",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_071_3",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "75",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_071_4",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_071_5",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_071_6",
        "name": "Extrait d amande amere",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_071_7",
        "name": "Jaune d oeuf pour dorer",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_071_1",
        "order": 1,
        "instruction": "Préchauffer le four à 210°C (thermostat 7)."
      },
      {
        "id": "stp_rec_top100_071_2",
        "order": 2,
        "instruction": "Disposer une pâte sur une plaque à four, la piquer avec 1 fourchette."
      },
      {
        "id": "stp_rec_top100_071_3",
        "order": 3,
        "instruction": "Mélanger dans un saladier tous les ingrédients (poudre d'amandes, sucre, oeuf, beurre mou et extrait d'amande amère)."
      },
      {
        "id": "stp_rec_top100_071_4",
        "order": 4,
        "instruction": "Etaler la préparation sur la pâte, y mettre la fève (sur un bord, pour minimiser les chances de tomber dessus en coupant la galette!)."
      },
      {
        "id": "stp_rec_top100_071_5",
        "order": 5,
        "instruction": "Refermer la galette avec la seconde pâte et bien souder les bords."
      },
      {
        "id": "stp_rec_top100_071_6",
        "order": 6,
        "instruction": "A l'aide d'un couteau, décorer la pâte en y traçant des dessins et dorer au jaune d'oeuf (dilué dans un peu d'eau)."
      },
      {
        "id": "stp_rec_top100_071_7",
        "order": 7,
        "instruction": "Percer le dessus de petits trous pour laisser l'air s'échapper, sinon elle risque de gonfler et de se dessécher."
      },
      {
        "id": "stp_rec_top100_071_8",
        "order": 8,
        "instruction": "Enfourner pendant 30 minutes environ (surveiller la cuisson dès 25 minutes, mais ne pas hésiter à laisser jusqu'à 40 minutes si nécessaire)."
      },
      {
        "id": "stp_rec_top100_071_9",
        "order": 9,
        "instruction": "Déguster."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20161206/9654_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20161206/9656_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20150104/25512_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_072",
    "title": "Pâte à crêpes (des plus raffinées)",
    "description": "Recette Pâte à crêpes (des plus raffinées) : la meilleure recette rapide et facile : 6 personnes gourmandes, 17 min de préparation. Notée 4.7/5 par 1270 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 2,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20260126/165572_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_pate-a-crepes-des-plus-raffinees_49665.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_072_1",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "375",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_072_2",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "3",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_072_3",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "75",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_072_4",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "6",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_072_5",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "90",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_072_6",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "1",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_072_7",
        "name": "Grand-marnier ou de rhum",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_072_1",
        "order": 1,
        "instruction": "Dans un saladier, mélanger la farine, le sel et le sucre."
      },
      {
        "id": "stp_rec_top100_072_2",
        "order": 2,
        "instruction": "Faire une fontaine."
      },
      {
        "id": "stp_rec_top100_072_3",
        "order": 3,
        "instruction": "Ajouter les oeufs et commencer à les incorporer à la farine avec une cuillère en bois, ajouter le beure fondu (tiédi) peu à peu et bien malaxer."
      },
      {
        "id": "stp_rec_top100_072_4",
        "order": 4,
        "instruction": "Incorporer le lait (par petites quantités au début pour éviter les grumeaux), ajouter le parfum."
      },
      {
        "id": "stp_rec_top100_072_5",
        "order": 5,
        "instruction": "Faire cuire les crêpes dans une poêle chaude huilée."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20260126/165572_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20250131/157849_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20171020/73720_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_073",
    "title": "Gâteau au chocolat des écoliers",
    "description": "Recette Gâteau au chocolat des écoliers  : la meilleure recette rapide et facile : 8 enfants, 35 min de préparation. Notée 4.7/5 par 1257 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 25,
    "servings": 8,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20171220/76165_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_gateau-au-chocolat-des-ecoliers_20654.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_073_1",
        "name": "Chocolat noir",
        "canonicalId": "ing_canon_chocolat_noir",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_073_2",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_073_3",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_073_4",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_073_5",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_073_6",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_073_1",
        "order": 1,
        "instruction": "Préchauffez le four à 180°C (thermostat 6)."
      },
      {
        "id": "stp_rec_top100_073_2",
        "order": 2,
        "instruction": "Faites fondre le chocolat au bain-marie ou au micro-ondes. Si vous le faites fondre au micro-ondes, ajoutez 3 cuillères à soupe d'eau pour 200 g de chocolat."
      },
      {
        "id": "stp_rec_top100_073_3",
        "order": 3,
        "instruction": "Ajoutez le beurre au chocolat fondu et fouetter énergiquement jusqu'à ce que le mélange soit lisse et bien fondu."
      },
      {
        "id": "stp_rec_top100_073_4",
        "order": 4,
        "instruction": "Dans un saladier, fouettez les oeufs et le sucre jusqu'à ce que le mélange blanchisse et incorporez la levure puis la farine."
      },
      {
        "id": "stp_rec_top100_073_5",
        "order": 5,
        "instruction": "Versez le chocolat et le beurre fondus dans la préparation puis mélangez jusqu'à l'obtention d'une pâte homogène."
      },
      {
        "id": "stp_rec_top100_073_6",
        "order": 6,
        "instruction": "Versez la préparation dans un moule à manqué beurré et fariné."
      },
      {
        "id": "stp_rec_top100_073_7",
        "order": 7,
        "instruction": "Faites cuire environ 25 minutes (adaptez le temps de cuisson pour obtenir un cœur plus ou moins fondant)."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20171220/76165_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20171220/76164_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160331/36957_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_074",
    "title": "Quiche lorraine maison",
    "description": "Recette Quiche lorraine maison : la meilleure recette rapide et facile : 4 personnes, 55 min de préparation. Notée 4.7/5 par 1228 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 45,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20161128/28118_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_quiche-lorraine_30283.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_074_1",
        "name": "Pâte brisée",
        "canonicalId": "ing_canon_pate_brisee",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_074_2",
        "name": "Lardon",
        "canonicalId": "ing_canon_lardon",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_074_3",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "30",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_074_4",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_074_5",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "20",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_074_6",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "20",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_074_7",
        "name": "Muscade",
        "canonicalId": "ing_canon_muscade",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_074_8",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_074_9",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_074_1",
        "order": 1,
        "instruction": "Préchauffer le four à 180°C (thermostat 6).  Etaler la pâte dans un moule,"
      },
      {
        "id": "stp_rec_top100_074_2",
        "order": 2,
        "instruction": "la piquer à la fourchette. Parsemer de copeaux de beurre."
      },
      {
        "id": "stp_rec_top100_074_3",
        "order": 3,
        "instruction": "Faire rissoler les lardons à la poêle puis les éponger avec une feuille d'essuie-tout."
      },
      {
        "id": "stp_rec_top100_074_4",
        "order": 4,
        "instruction": "Battre les oeufs, la crème fraîche et le lait."
      },
      {
        "id": "stp_rec_top100_074_5",
        "order": 5,
        "instruction": "Ajouter les lardons."
      },
      {
        "id": "stp_rec_top100_074_6",
        "order": 6,
        "instruction": "Assaisonner de sel, de poivre et de muscade."
      },
      {
        "id": "stp_rec_top100_074_7",
        "order": 7,
        "instruction": "Verser sur la pâte."
      },
      {
        "id": "stp_rec_top100_074_8",
        "order": 8,
        "instruction": "Cuire 45 à 50 min."
      },
      {
        "id": "stp_rec_top100_074_9",
        "order": 9,
        "instruction": "C'est prêt"
      },
      {
        "id": "stp_rec_top100_074_10",
        "order": 10,
        "instruction": "Déguster"
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20161128/28118_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20221013/136150_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130204/31291_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_075",
    "title": "Pancakes : la vraie recette",
    "description": "Recette Pancakes : la vraie recette : la meilleure recette rapide et facile : 18 crêpes, 41 min de préparation. Notée 4.8/5 par 449 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 36,
    "servings": 18,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20221013/136076_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_pancakes-la-vraie-recette_69412.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_075_1",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_075_2",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_075_3",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_075_4",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_075_5",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "0.5",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_075_6",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_075_7",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "37.5",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_075_8",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_075_1",
        "order": 1,
        "instruction": "Dans un saladier, mélanger farine + sucre + sucre vanillé + levure + sel."
      },
      {
        "id": "stp_rec_top100_075_2",
        "order": 2,
        "instruction": "Dans un autre récipient, mélanger jaunes d'œufs + lait."
      },
      {
        "id": "stp_rec_top100_075_3",
        "order": 3,
        "instruction": "Verser ce mélange dans le premier saladier petit à petit afin d’éviter les grumeaux."
      },
      {
        "id": "stp_rec_top100_075_4",
        "order": 4,
        "instruction": "Ajouter le beurre fondu et bien mélanger."
      },
      {
        "id": "stp_rec_top100_075_5",
        "order": 5,
        "instruction": "Battre les blancs en neige ferme avec 1 pincée de sel."
      },
      {
        "id": "stp_rec_top100_075_6",
        "order": 6,
        "instruction": "Les incorporer à la préparation délicatement afin de ne pas les casser."
      },
      {
        "id": "stp_rec_top100_075_7",
        "order": 7,
        "instruction": "Pour la cuisson, à feu très doux : huiler une petite poêle, mettre 1 louche de préparation puis attendre que toute la surface soit couverte de trous et qu’elle paraisse « sèche » et la retourner pour qu’elle cuise de l’autre côté environ 1 minute."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20221013/136076_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140330/19158_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/10363_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_076",
    "title": "Pâte à pizza fine",
    "description": "Recette Pâte à pizza fine  : la meilleure recette rapide et facile : 3 pâtes fines, 70 min de préparation. Notée 4.8/5 par 440 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 60,
    "cookTimeMinutes": 10,
    "servings": 3,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20171206/75873_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_pate-a-pizza-fine_29544.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_076_1",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "500",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_076_2",
        "name": "Levure de boulangerie express",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_076_3",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_076_4",
        "name": "Eau",
        "canonicalId": "ing_canon_eau",
        "quantity": "0.25",
        "unit": "l",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_076_5",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_076_1",
        "order": 1,
        "instruction": "Verser la farine dans un grand saladier et y faire un puits."
      },
      {
        "id": "stp_rec_top100_076_2",
        "order": 2,
        "instruction": "Verser la levure, le sel et le sucre dans un verre doseur. Ajouter 1/4 de litre d'eau tiède, bien mélanger. Couvrir d'un film plastique et laisser reposer environ 10 minutes (jusqu'à l'apparition d'une mousse brune bien épaisse en surface)."
      },
      {
        "id": "stp_rec_top100_076_3",
        "order": 3,
        "instruction": "Verser le mélange du verre doseur dans le saladier, mélanger à la main. Puis quand la pâte n'est plus collante pétrir environ 5 minutes à la main sur une surface farinée. Arroser d'un peu d'huile d'olive, puis pétrir à nouveau environ 5 minutes."
      },
      {
        "id": "stp_rec_top100_076_4",
        "order": 4,
        "instruction": "Laisser reposer au moins 1 h sous un linge humide dans un endroit tiède (à côté d'un radiateur, d'une cheminée ou d'un poêle en hiver)."
      },
      {
        "id": "stp_rec_top100_076_5",
        "order": 5,
        "instruction": "Après repos, pétrir quelques instants puis diviser la pâte en trois boules égales (on peut en congeler). Etaler la pâte sur une surface farinée. Badigeonner la plaque d'un peu d'huile d'olive avant d'y appliquer la pâte. Cuisson 10 minutes à 220°C (thermostat 7-8)."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20171206/75873_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180712/80809_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130823/42626_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_077",
    "title": "Baba au rhum express",
    "description": "Recette Baba au rhum express : la meilleure recette rapide et facile : 1 gâteau, 45 min de préparation. Notée 4.8/5 par 434 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 25,
    "servings": 1,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160527/53994_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_baba-au-rhum-express_13608.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_077_1",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "120",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_077_2",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_077_3",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_077_4",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_077_5",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "3",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_077_6",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_077_7",
        "name": "Veau",
        "canonicalId": "ing_canon_veau",
        "quantity": "0.25",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_077_8",
        "name": "Sirop de sucre de canne",
        "quantity": "0.25",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_077_9",
        "name": "Rhum",
        "canonicalId": "ing_canon_rhum",
        "quantity": "10",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_077_1",
        "order": 1,
        "instruction": "Faire préchauffer le four thermostat 6 (180°C). Travailler au fouet les jaunes d'oeufs avec le sucre jusqu'à ce que le mélange blanchisse."
      },
      {
        "id": "stp_rec_top100_077_2",
        "order": 2,
        "instruction": "Ajouter le lait chaud,"
      },
      {
        "id": "stp_rec_top100_077_3",
        "order": 3,
        "instruction": "le beurre fondu,"
      },
      {
        "id": "stp_rec_top100_077_4",
        "order": 4,
        "instruction": "la farine et la levure."
      },
      {
        "id": "stp_rec_top100_077_5",
        "order": 5,
        "instruction": "Battre les blancs en neige ferme."
      },
      {
        "id": "stp_rec_top100_077_6",
        "order": 6,
        "instruction": "Mélanger les délicatement à la pâte."
      },
      {
        "id": "stp_rec_top100_077_7",
        "order": 7,
        "instruction": "Verser la pâte dans un moule en couronne préalablement beurré ou dans des moules individuels. Enfourner et laisser cuire 25 min puis démouler aussitôt."
      },
      {
        "id": "stp_rec_top100_077_8",
        "order": 8,
        "instruction": "Faire le sirop chaud avec l'eau, le sirop de sucre de canne et le rhum"
      },
      {
        "id": "stp_rec_top100_077_9",
        "order": 9,
        "instruction": "et en arroser le baba jusqu'à complète absorbtion."
      },
      {
        "id": "stp_rec_top100_077_10",
        "order": 10,
        "instruction": "Server frais avec une salade de fruits ou/et de la chantilly."
      },
      {
        "id": "stp_rec_top100_077_11",
        "order": 11,
        "instruction": "Et déguster"
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160527/53994_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160527/53991_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160527/53996_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_078",
    "title": "Tatin de magret de canard au foie gras",
    "description": "Recette Tatin de magret de canard au foie gras : la meilleure recette rapide et facile : 1 personne, 25 min de préparation. Notée 4.8/5 par 432 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Facile",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 10,
    "servings": 1,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20130122/64052_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_tatin-de-magret-de-canard-au-foie-gras_17047.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_078_1",
        "name": "Pomme reinette du vigan ou pomme verte",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_078_2",
        "name": "Canard",
        "canonicalId": "ing_canon_canard",
        "quantity": "4",
        "unit": "tranches",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_078_3",
        "name": "Rondelle de pain de mie",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_078_4",
        "name": "Foie gras",
        "quantity": "1",
        "unit": "tranche",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_078_5",
        "name": "Calvados ou alcool de pomme",
        "quantity": "1",
        "unit": "c. à café",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_078_6",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_078_1",
        "order": 1,
        "instruction": "Eplucher la pomme, la couper en tranches 'demi-lune', les faire revenir avec le beurre 5 mn."
      },
      {
        "id": "stp_rec_top100_078_2",
        "order": 2,
        "instruction": "Prendre une  petite timbale, mettre une couche de pommes, 2 tranches de magret, des pommes, les 2 morceaux de magret et finir par les pommes. Ajouter la cuillère de calvados."
      },
      {
        "id": "stp_rec_top100_078_3",
        "order": 3,
        "instruction": "Passer à four chaud 5 mn."
      },
      {
        "id": "stp_rec_top100_078_4",
        "order": 4,
        "instruction": "Démouler sur le pain de mie grillé, puis recouvrir de la tranche de foie gras. Servir chaud."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20130122/64052_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140127/66304_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140127/62815_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_079",
    "title": "Béchamel",
    "description": "Recette Béchamel : la meilleure recette rapide et facile : 6 personnes, 15 min de préparation. Notée 4.8/5 par 424 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Facile",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 15,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20130823/62932_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_bechamel_23880.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_079_1",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_079_2",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_079_3",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "60",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_079_4",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_079_5",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_079_6",
        "name": "Muscade",
        "canonicalId": "ing_canon_muscade",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_079_1",
        "order": 1,
        "instruction": "Faites fondre le beurre dans une casserole à fond épais."
      },
      {
        "id": "stp_rec_top100_079_2",
        "order": 2,
        "instruction": "Ajoutez la farine et remuez avec une cuillère de bois sans laisser colorer. La farine doit juste épaissir."
      },
      {
        "id": "stp_rec_top100_079_3",
        "order": 3,
        "instruction": "Versez le lait progressivement, sans cesser de remuer, jusqu'à ce que la sauce épaississe."
      },
      {
        "id": "stp_rec_top100_079_4",
        "order": 4,
        "instruction": "Assaisonnez de sel, poivre et muscade râpée."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20130823/62932_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180710/80586_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140409/65469_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_080",
    "title": "Ratatouille",
    "description": "Recette Ratatouille : la meilleure recette rapide et facile : 4 personnes, 80 min de préparation. Notée 4.8/5 par 419 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 25,
    "cookTimeMinutes": 55,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20160624/36724_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_ratatouille_23223.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_080_1",
        "name": "Aubergine",
        "canonicalId": "ing_canon_aubergine",
        "quantity": "350",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_080_2",
        "name": "Courgette",
        "canonicalId": "ing_canon_courgette",
        "quantity": "350",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_080_3",
        "name": "Poivrons de couleur rouge et vert",
        "quantity": "350",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_080_4",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "350",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_080_5",
        "name": "Tomates bien mures",
        "quantity": "500",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_080_6",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "3",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_080_7",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "6",
        "unit": "c. à soupe",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_080_8",
        "name": "Thym",
        "canonicalId": "ing_canon_thym",
        "quantity": "1",
        "unit": "brin",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_080_9",
        "name": "Laurier",
        "canonicalId": "ing_canon_laurier",
        "quantity": "1",
        "unit": "feuille",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_080_10",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_080_11",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_080_1",
        "order": 1,
        "instruction": "Coupez les tomates pelées en quartiers,"
      },
      {
        "id": "stp_rec_top100_080_2",
        "order": 2,
        "instruction": "les aubergines et les courgettes en rondelles."
      },
      {
        "id": "stp_rec_top100_080_3",
        "order": 3,
        "instruction": "Emincez les poivrons en lamelles"
      },
      {
        "id": "stp_rec_top100_080_4",
        "order": 4,
        "instruction": "et l'oignon en rouelles."
      },
      {
        "id": "stp_rec_top100_080_5",
        "order": 5,
        "instruction": "Chauffez 2 cuillères à soupe d'huile dans une poêle"
      },
      {
        "id": "stp_rec_top100_080_6",
        "order": 6,
        "instruction": "et faites-y fondre les oignons et les poivrons."
      },
      {
        "id": "stp_rec_top100_080_7",
        "order": 7,
        "instruction": "Lorsqu'ils sont tendres, ajoutez les tomates, l'ail haché, le thym et le laurier."
      },
      {
        "id": "stp_rec_top100_080_8",
        "order": 8,
        "instruction": "Salez, poivrez et laissez mijoter doucement à couvert durant 45 minutes."
      },
      {
        "id": "stp_rec_top100_080_9",
        "order": 9,
        "instruction": "Pendant ce temps, préparez les aubergines et les courgettes. Faites les cuire séparemment ou non dans l'huile d'olive pendant 15 minutes."
      },
      {
        "id": "stp_rec_top100_080_10",
        "order": 10,
        "instruction": "Vérifiez la cuisson des légumes pour qu'ils ne soient plus fermes. Ajoutez les alors au mélange de tomates et prolongez la cuisson sur tout petit feu pendant 10 min."
      },
      {
        "id": "stp_rec_top100_080_11",
        "order": 11,
        "instruction": "Salez et poivrez si besoin."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20160624/36724_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160624/36725_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160404/36723_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_081",
    "title": "Pâte à pizza pour MAP (machine à pain)",
    "description": "Recette Pâte à pizza pour MAP (machine à pain) : la meilleure recette rapide et facile : 2 pizzas, 5 min de préparation. Notée 4.9/5 par 266 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Facile",
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 0,
    "servings": 2,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20230620/143619_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_pate-a-pizza-pour-map-machine-a-pain_50364.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_081_1",
        "name": "Eau",
        "canonicalId": "ing_canon_eau",
        "quantity": "25",
        "unit": "cl",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_081_2",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "5",
        "unit": "cl",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_081_3",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "0.5",
        "unit": "c. à café",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_081_4",
        "name": "Farine blanche",
        "quantity": "440",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_081_5",
        "name": "Levure boulangere speciale pain",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_081_6",
        "name": "Herbes de Provence",
        "canonicalId": "ing_canon_herbes_de_provence",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_081_7",
        "name": "Fromage râpé",
        "canonicalId": "ing_canon_fromage_rape",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_081_1",
        "order": 1,
        "instruction": "Mettre tous les ingrédients dans la cuve de la machine à pain dans l'ordre donné ci-dessus."
      },
      {
        "id": "stp_rec_top100_081_2",
        "order": 2,
        "instruction": "Choisissez le programme \"pâte\"."
      },
      {
        "id": "stp_rec_top100_081_3",
        "order": 3,
        "instruction": "Selon les modèles, la pâte à tarte sera prête en 1h30 ou 1h50."
      },
      {
        "id": "stp_rec_top100_081_4",
        "order": 4,
        "instruction": "Travailler légèremement la pâte, laisser gonfler environ 20 mminutes au chaud avant d'étaler et de garnir."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20230620/143619_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20120312/42969_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20131122/47028_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_082",
    "title": "Osso bucco de veau",
    "description": "Recette Osso bucco de veau : la meilleure recette rapide et facile : 4 personnes, 65 min de préparation. Notée 4.9/5 par 253 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 45,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20130205/63559_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_osso-bucco-de-veau_16090.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_082_1",
        "name": "Jarrets de veau d environ 200 g chacune",
        "quantity": "4",
        "unit": "tranches",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_082_2",
        "name": "Huile",
        "quantity": "10",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_082_3",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "3",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_082_4",
        "name": "G de tomates",
        "quantity": "1",
        "unit": "boîte",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_082_5",
        "name": "Carotte",
        "canonicalId": "ing_canon_carotte",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_082_6",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_082_7",
        "name": "Vin blanc",
        "canonicalId": "ing_canon_vin_blanc",
        "quantity": "20",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_082_8",
        "name": "Bouquet garni",
        "canonicalId": "ing_canon_bouquet_garni",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_082_9",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_082_10",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_082_11",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_082_1",
        "order": 1,
        "instruction": "Fariner la viande, tapoter pour retirer l'excédent. Les faire dorer sur toutes les faces dans une cocotte-minute avec un fond d'huile."
      },
      {
        "id": "stp_rec_top100_082_2",
        "order": 2,
        "instruction": "Peler et couper les carottes en rondelles épaisses, émincer les oignons, hacher l'ail. Les ajouter dans la cocotte, ainsi que les tomates et le vin blanc. Saler, poivrer, ajouter le bouquet garni et fermer la cocotte."
      },
      {
        "id": "stp_rec_top100_082_3",
        "order": 3,
        "instruction": "Laisser cuire 45 min à partir de la mise en rotation de la soupape, à feu doux."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20130205/63559_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20110511/67202_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160124/61014_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_083",
    "title": "Mousse au citron et au Mascarpone (très facile)",
    "description": "Recette Mousse au citron et au Mascarpone (très facile) : la meilleure recette rapide et facile : 6 personnes, 5 min de préparation. Notée 4.8/5 par 447 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 0,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20201203/116055_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_mousse-au-citron-et-au-mascarpone-tres-facile_23974.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_083_1",
        "name": "Mascarpone",
        "canonicalId": "ing_canon_mascarpone",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_083_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_083_3",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "2",
        "unit": "dl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_083_4",
        "name": "Citron",
        "canonicalId": "ing_canon_citron",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_083_1",
        "order": 1,
        "instruction": "Mélanger le mascarpone avec le sucre, le jus et le zeste du citron."
      },
      {
        "id": "stp_rec_top100_083_2",
        "order": 2,
        "instruction": "Incorporer la crème fouettée, et placer au freezer pendant 2 h."
      },
      {
        "id": "stp_rec_top100_083_3",
        "order": 3,
        "instruction": "Dresser dans des petits pots."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20201203/116055_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20150814/17425_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130303/19572_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_084",
    "title": "Ramequins au chocolat aux coeurs fondants",
    "description": "Recette Ramequins au chocolat aux coeurs fondants : la meilleure recette rapide et facile : 4 personnes, 30 min de préparation. Notée 4.8/5 par 438 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 15,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20130319/29847_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_ramequins-au-chocolat-aux-coeurs-fondants_14734.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_084_1",
        "name": "Chocolat noir",
        "canonicalId": "ing_canon_chocolat_noir",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_084_2",
        "name": "Carres de chocolat",
        "quantity": "8",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_084_3",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_084_4",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "60",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_084_5",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "20",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_084_6",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "80",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_084_1",
        "order": 1,
        "instruction": "Préchauffez le four à thermostat 8 (250°C)."
      },
      {
        "id": "stp_rec_top100_084_2",
        "order": 2,
        "instruction": "Faites fondre les 100 g de chocolat. Ajoutez le beurre."
      },
      {
        "id": "stp_rec_top100_084_3",
        "order": 3,
        "instruction": "Dans un saladier, mélangez les oeufs, le sucre et la farine. Incorporez-y le chocolat et mélangez."
      },
      {
        "id": "stp_rec_top100_084_4",
        "order": 4,
        "instruction": "Beurrez et farinez les ramequins. Versez-y le tiers de la préparation, puis déposez 2 carrés de chocolat dans chaque ramequin. Recouvrez du reste de la préparation."
      },
      {
        "id": "stp_rec_top100_084_5",
        "order": 5,
        "instruction": "Placez les ramequins au four 10 mn à 15 mn."
      },
      {
        "id": "stp_rec_top100_084_6",
        "order": 6,
        "instruction": "Dégustez les ramequins tièdes, démoulés ou non."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20130319/29847_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140821/10412_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/271_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130308/6844_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_085",
    "title": "Boeuf braisé aux carottes",
    "description": "Recette Boeuf braisé aux carottes : la meilleure recette rapide et facile : 6 personnes, 80 min de préparation. Notée 4.8/5 par 435 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 60,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20180622/79920_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_boeuf-braise-aux-carottes_13296.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_085_1",
        "name": "Paleron ou de bourguignon lkg",
        "quantity": "1",
        "unit": "morceau",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_085_2",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_085_3",
        "name": "Lard",
        "quantity": "1",
        "unit": "tranche",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_085_4",
        "name": "Matiere grasse",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_085_5",
        "name": "Concentré de tomate",
        "canonicalId": "ing_canon_concentre_de_tomate",
        "quantity": "1",
        "unit": "boîte",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_085_6",
        "name": "Laurier",
        "canonicalId": "ing_canon_laurier",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_085_7",
        "name": "Thym",
        "canonicalId": "ing_canon_thym",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_085_8",
        "name": "Sauge",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_085_9",
        "name": "Bouillon de bœuf",
        "canonicalId": "ing_canon_bouillon_de_b_uf",
        "quantity": "1",
        "unit": "tablette",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_085_10",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_085_11",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_085_12",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "2",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_085_13",
        "name": "Carotte",
        "canonicalId": "ing_canon_carotte",
        "quantity": "6",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_085_1",
        "order": 1,
        "instruction": "Couper la viande en morceaux égaux. La faire revenir dans une cocotte en fonte, dans laquelle vous avez fait chauffer la matière grasse."
      },
      {
        "id": "stp_rec_top100_085_2",
        "order": 2,
        "instruction": "Une fois les morceaux revenus de tous les côtés, les retirer et faire revenir les oignons émincés et les lardons."
      },
      {
        "id": "stp_rec_top100_085_3",
        "order": 3,
        "instruction": "Préparer le bouillon de boeuf avec 1/2 litre d'eau."
      },
      {
        "id": "stp_rec_top100_085_4",
        "order": 4,
        "instruction": "Ajouter la viande dans la cocotte, y verser le bouillon, le concentré de tomates, les carottes épluchées et coupées en tronçons, l'ail et les herbes."
      },
      {
        "id": "stp_rec_top100_085_5",
        "order": 5,
        "instruction": "Assaisonner avec le sel etle poivre, mélanger et laisser mijoter 1h30 à feu doux."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20180622/79920_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/27254_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130828/30912_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_086",
    "title": "Canelés bordelais",
    "description": "Les cannelés salés sont une délicieuse surprise à proposer à l'apéritif ou en entrée. Avec leur texture croustillante à l'extérieur et moelleuse à l'intérieur, ces petits bouchées s'adaptent à toutes vos envies. Nature, garnis de fromage ou de légumes, ils séduiront les papilles de vos invités à coup sûr.",
    "category": "Dessert",
    "difficulty": "Difficile",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 75,
    "servings": 16,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20230621/143653_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_canneles-bordelais_11439.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_086_1",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "50",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_086_2",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_086_3",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_086_4",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "0.5",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_086_5",
        "name": "Rhum",
        "canonicalId": "ing_canon_rhum",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_086_6",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_086_7",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_086_8",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_086_9",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_086_1",
        "order": 1,
        "instruction": "Faire bouillir le lait avec la gousse de vanille préalablement fendue et égrainée et le beurre."
      },
      {
        "id": "stp_rec_top100_086_2",
        "order": 2,
        "instruction": "Pendant ce temps, mélanger la farine et le sucre dans un saladier"
      },
      {
        "id": "stp_rec_top100_086_3",
        "order": 3,
        "instruction": "puis incorporer les oeufs d'un seul coup"
      },
      {
        "id": "stp_rec_top100_086_4",
        "order": 4,
        "instruction": "et verser ensuite le lait bouillant."
      },
      {
        "id": "stp_rec_top100_086_5",
        "order": 5,
        "instruction": "Mélanger doucement afin d'obtenir une pâte fluide comme une pâte à crêpes. Laisser refroidir."
      },
      {
        "id": "stp_rec_top100_086_6",
        "order": 6,
        "instruction": "Puis ajouter le rhum"
      },
      {
        "id": "stp_rec_top100_086_7",
        "order": 7,
        "instruction": "Avant de placer au réfrigérateur et de laisser reposer une heure."
      },
      {
        "id": "stp_rec_top100_086_8",
        "order": 8,
        "instruction": "Préchauffer le four à 240°C (thermostat 8) avec la tôle sur laquelle cuiront les canelés [si vous utilisez un moule en silicone, mettez le four à maximum 220°C (thermostat 6-7)].  Verser la pâte bien refroidie dans les moules bien beurrés, en ne les remplissant qu'à moitié."
      },
      {
        "id": "stp_rec_top100_086_9",
        "order": 9,
        "instruction": "rapidement, disposer les canelés sur la tôle du four préchauffé, à 240°C, pendant 12 minutes (20 minutes à 220°C avec un moule en silicone), puis baisser la température à 180°C (thermostat 6) et continuer la cuisson pendant 1 heure : le cannelé doit avoir une croûte brune et un intérieur bien moelleux."
      },
      {
        "id": "stp_rec_top100_086_10",
        "order": 10,
        "instruction": "Démouler encore chaud."
      },
      {
        "id": "stp_rec_top100_086_11",
        "order": 11,
        "instruction": "Déguster !"
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20230621/143653_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160713/54684_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160713/56301_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_087",
    "title": "Galette des rois à la frangipane",
    "description": "Recette Galette des rois à la frangipane : la meilleure recette rapide et facile : 6 personnes, 30 min de préparation. Notée 4.7/5 par 1106 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 20,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20230620/143627_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_galette-des-rois-a-la-frangipane_20147.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_087_1",
        "name": "Pâte feuilletée",
        "canonicalId": "ing_canon_pate_feuilletee",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_087_2",
        "name": "Amande",
        "canonicalId": "ing_canon_amande",
        "quantity": "140",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_087_3",
        "name": "Sucre fin",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_087_4",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_087_5",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "75",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_087_6",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_087_1",
        "order": 1,
        "instruction": "Placer une pâte feuilletée dans un moule à tarte, piquer la pâte avec une fourchette."
      },
      {
        "id": "stp_rec_top100_087_2",
        "order": 2,
        "instruction": "Dans un saladier, mélanger la poudre d'amandes, le sucre, les 2 oeufs et le beurre mou."
      },
      {
        "id": "stp_rec_top100_087_3",
        "order": 3,
        "instruction": "Placer la pâte obtenue dans le moule à tarte et y cacher la fève."
      },
      {
        "id": "stp_rec_top100_087_4",
        "order": 4,
        "instruction": "Recouvrir avec la 2ème pâte feuilletée, en collant bien les bords."
      },
      {
        "id": "stp_rec_top100_087_5",
        "order": 5,
        "instruction": "Faire des dessins sur le couvercle et badigeonner avec le jaune d'oeuf."
      },
      {
        "id": "stp_rec_top100_087_6",
        "order": 6,
        "instruction": "Enfourner pendant 20 à 30 min à 200°C (thermostat 6-7); vérifier régulièrement la cuisson !"
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20230620/143627_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20141217/841_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180706/80415_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_088",
    "title": "Tarte chocolat - poires facile",
    "description": "Recette Tarte chocolat - poires facile : la meilleure recette rapide et facile : 6 personnes, 45 min de préparation. Notée 4.7/5 par 1094 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 30,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20171024/73829_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_tarte-chocolat-poires-facile_14023.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_088_1",
        "name": "Pâte sablée",
        "canonicalId": "ing_canon_pate_sablee",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_088_2",
        "name": "Chocolat noir",
        "canonicalId": "ing_canon_chocolat_noir",
        "quantity": "80",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_088_3",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_088_4",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_088_5",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "6",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_088_6",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "70",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_088_7",
        "name": "Poire",
        "canonicalId": "ing_canon_poire",
        "quantity": "1",
        "unit": "boîte",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_088_1",
        "order": 1,
        "instruction": "Préchauffer le four à 180°C (thermostat 6)."
      },
      {
        "id": "stp_rec_top100_088_2",
        "order": 2,
        "instruction": "Faire fondre le chocolat avec le lait, dans une casserole (ou au micro-ondes)."
      },
      {
        "id": "stp_rec_top100_088_3",
        "order": 3,
        "instruction": "Ajouter 3 bonnes cuillères de crème fraîche, mélanger, et verser sur la pâte."
      },
      {
        "id": "stp_rec_top100_088_4",
        "order": 4,
        "instruction": "Déposer ensuite les demi-poires sur le nappage."
      },
      {
        "id": "stp_rec_top100_088_5",
        "order": 5,
        "instruction": "Mélanger les oeufs, le sucre et les 3 cuillères à soupe de crème fraîche restantes, puis le déposer sur le tout."
      },
      {
        "id": "stp_rec_top100_088_6",
        "order": 6,
        "instruction": "Mettre au four pendant 30 min."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20171024/73829_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130304/26366_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130524/38638_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_089",
    "title": "Pâte brisée vite faite",
    "description": "Recette Pâte brisée vite faite : la meilleure recette rapide et facile : 1 pâte, 45 min de préparation. Notée 4.7/5 par 983 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 30,
    "servings": 1,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20210630/121024_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_pate-brisee-vite-faite_31639.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_089_1",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "300",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_089_2",
        "name": "Beurre et en pommade",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_089_3",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "0.5",
        "unit": "c. à café",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_089_4",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "3",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_089_5",
        "name": "Eau ou de lait",
        "quantity": "8",
        "unit": "cl",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_089_1",
        "order": 1,
        "instruction": "Mélanger la farine et le sel dans un plat (et le sucre si sucre il y a)."
      },
      {
        "id": "stp_rec_top100_089_2",
        "order": 2,
        "instruction": "Ajouter le beurre puis l'incorporer à la farine en pétrissant rapidement et légèrement du bout des doigts. On doit obtenir une sorte de semoule grossière en 2 ou 3 min."
      },
      {
        "id": "stp_rec_top100_089_3",
        "order": 3,
        "instruction": "Incorporer rapidement le lait ou l'eau. Il en faut très peu pour permettre à la pâte de se lier et de faire boule. Le lait ou l'eau ? C'est selon les goûts."
      },
      {
        "id": "stp_rec_top100_089_4",
        "order": 4,
        "instruction": "Pour étaler sans problème, étaler la pâte sur du papier cuisson et cuire tel quel dans la platine."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20210630/121024_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20221019/136418_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160331/12788_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_090",
    "title": "Hachis Parmentier",
    "description": "Recette Hachis Parmentier : la meilleure recette rapide et facile : 4 personnes, 45 min de préparation. Notée 4.7/5 par 977 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 25,
    "cookTimeMinutes": 20,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20221012/136013_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_hachis-parmentier_17639.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_090_1",
        "name": "Viande",
        "quantity": "400",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_090_2",
        "name": "Puree",
        "quantity": "300",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_090_3",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_090_4",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "2",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_090_5",
        "name": "Tomate",
        "canonicalId": "ing_canon_tomate",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_090_6",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_090_7",
        "name": "Herbes de Provence",
        "canonicalId": "ing_canon_herbes_de_provence",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_090_8",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_090_9",
        "name": "Parmesan",
        "canonicalId": "ing_canon_parmesan",
        "quantity": "30",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_090_10",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "30",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_090_11",
        "name": "Fromage râpé",
        "canonicalId": "ing_canon_fromage_rape",
        "quantity": "50",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_090_12",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_090_13",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_090_1",
        "order": 1,
        "instruction": "Hacher l'oignon et l'ail. Les faire revenir dans le beurre jusqu'à ce qu'ils soient tendres."
      },
      {
        "id": "stp_rec_top100_090_2",
        "order": 2,
        "instruction": "Ajouter les tomates coupées en dés, la viande hachée, la farine, du sel, du poivre et les herbes de Provence."
      },
      {
        "id": "stp_rec_top100_090_3",
        "order": 3,
        "instruction": "Quand tout est cuit, couper le feu et ajouter le jaune d'oeuf et un peu de parmesan. Bien mélanger."
      },
      {
        "id": "stp_rec_top100_090_4",
        "order": 4,
        "instruction": "Préchauffer le four à 200°C (thermostat 6-7).  Etaler au fond du plat à gratin. Préparer la purée. L'étaler au dessus de la viande. Saupoudrer de fromage râpé et faire gratiner."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20221012/136013_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20201228/116812_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20170614/69758_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_091",
    "title": "Tiramisu aux framboises : la recette inratable",
    "description": "Recette Tiramisu aux framboises : la recette inratable : la meilleure recette rapide et facile : 6 personnes, 25 min de préparation. Notée 4.8/5 par 395 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 25,
    "cookTimeMinutes": 0,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20190704/94699_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_tiramisu-aux-framboises_28919.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_091_1",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_091_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_091_3",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "1",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_091_4",
        "name": "Mascarpone",
        "canonicalId": "ing_canon_mascarpone",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_091_5",
        "name": "Biscuit à la cuillère",
        "canonicalId": "ing_canon_biscuit_a_la_cuillere",
        "quantity": "24",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_091_6",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_091_7",
        "name": "Framboise",
        "canonicalId": "ing_canon_framboise",
        "quantity": "500",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_091_1",
        "order": 1,
        "instruction": "Dans le fond d'un plat, disposer des biscuits cuillère trempés dans du lait (cette étape n'est pas obligatoire car ils absorberont le jus des framboises)."
      },
      {
        "id": "stp_rec_top100_091_2",
        "order": 2,
        "instruction": "Dans un saladier, écraser les framboises avec 30 g de sucre avec une fourchette ou presse-purée. Les répartir sur le fond de biscuits et mettre au réfrigérateur. En garder quelques-unes entières pour la décoration."
      },
      {
        "id": "stp_rec_top100_091_3",
        "order": 3,
        "instruction": "Pendant ce temps, séparer les blancs des jaunes d'oeufs."
      },
      {
        "id": "stp_rec_top100_091_4",
        "order": 4,
        "instruction": "Battre les jaunes avec le sucre et le sucre vanillé jusqu'à blanchiment du mélange. Rajouter le mascarpone au fouet."
      },
      {
        "id": "stp_rec_top100_091_5",
        "order": 5,
        "instruction": "Monter les blancs en neige bien fermes et les incorporer délicatement au mélange précédent avec une cuillère en bois."
      },
      {
        "id": "stp_rec_top100_091_6",
        "order": 6,
        "instruction": "Verser la préparation sur les framboises."
      },
      {
        "id": "stp_rec_top100_091_7",
        "order": 7,
        "instruction": "Mettre au réfrigérateur 24 heures avant de servir, voire 48h."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20190704/94699_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20190704/94696_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20190704/94695_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_092",
    "title": "Cuisse de canard à l'orientale",
    "description": "Recette Cuisse de canard à l'orientale : la meilleure recette rapide et facile : 4 personnes, 80 min de préparation. Notée 4.9/5 par 252 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 60,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20200828/113366_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_cuisse-de-canard-a-l-orientale_61466.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_092_1",
        "name": "Canard",
        "canonicalId": "ing_canon_canard",
        "quantity": "4",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_2",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_3",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "2",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_4",
        "name": "Cumin",
        "canonicalId": "ing_canon_cumin",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_5",
        "name": "Gingembre",
        "canonicalId": "ing_canon_gingembre",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_6",
        "name": "Coriandre",
        "canonicalId": "ing_canon_coriandre",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_7",
        "name": "Raisins secs blonds",
        "quantity": "60",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_8",
        "name": "Miel",
        "canonicalId": "ing_canon_miel",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_9",
        "name": "Vinaigre",
        "canonicalId": "ing_canon_vinaigre",
        "quantity": "2",
        "unit": "c. à soupe",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_10",
        "name": "Bouillon de volaille",
        "canonicalId": "ing_canon_bouillon_de_volaille",
        "quantity": "1",
        "unit": "cube",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_11",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "15",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_12",
        "name": "Veau",
        "canonicalId": "ing_canon_veau",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_13",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_092_14",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_092_1",
        "order": 1,
        "instruction": "Couper les oignons en fines tranches et l'ail en petits morceaux."
      },
      {
        "id": "stp_rec_top100_092_2",
        "order": 2,
        "instruction": "Faire fondre le bouillon de volaille dans 50 cl d'eau bouillante."
      },
      {
        "id": "stp_rec_top100_092_3",
        "order": 3,
        "instruction": "Saler et poivrer les cuisses de canard des deux côtés. Dans une sauteuse, faire colorer les cuisses de canard dans leur graisse en commençant par le côté peau. Réserver."
      },
      {
        "id": "stp_rec_top100_092_4",
        "order": 4,
        "instruction": "Jeter éventuellement un peu de graisse rendue par les cuisses (selon le goût)."
      },
      {
        "id": "stp_rec_top100_092_5",
        "order": 5,
        "instruction": "Dans la sauteuse, mettre les oignons, le miel et le vinaigre et les faire blondir (à peine)."
      },
      {
        "id": "stp_rec_top100_092_6",
        "order": 6,
        "instruction": "Ajouter le bouillon, l'ail, les raisins et les épices. Bien mélanger."
      },
      {
        "id": "stp_rec_top100_092_7",
        "order": 7,
        "instruction": "Ajouter les cuisses et laisser cuire à feu doux sous un couvercle pendant 1 heure."
      },
      {
        "id": "stp_rec_top100_092_8",
        "order": 8,
        "instruction": "Découvrir la sauteuse et, à feu moyen à fort, laisser réduire le jus pendant 15 minutes. Réserver les cuisses de canard de côté puis ajouter la crème fraîche dans le fond de sauce. Porter à ébullition."
      },
      {
        "id": "stp_rec_top100_092_9",
        "order": 9,
        "instruction": "Rectifier l'assaisonnement si nécessaire  puis servir les cuisses de canard nappées de sauce."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20200828/113366_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180827/81936_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/3354_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_093",
    "title": "Velouté de butternut à la cannelle",
    "description": "Recette Velouté de butternut à la cannelle : la meilleure recette rapide et facile : 4 personnes, 35 min de préparation. Notée 4.9/5 par 250 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Moyen",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 15,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20131121/56974_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_veloute-de-butternut-a-la-canelle_220583.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_093_1",
        "name": "Potimarron",
        "canonicalId": "ing_canon_potimarron",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_093_2",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_093_3",
        "name": "Bouillon",
        "quantity": "1",
        "unit": "cube",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_093_4",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_093_5",
        "name": "Cannelle",
        "canonicalId": "ing_canon_cannelle",
        "quantity": "1",
        "unit": "pincée",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_093_1",
        "order": 1,
        "instruction": "Couper le butternut en gros cubes."
      },
      {
        "id": "stp_rec_top100_093_2",
        "order": 2,
        "instruction": "Couper grossièrement l'oignon."
      },
      {
        "id": "stp_rec_top100_093_3",
        "order": 3,
        "instruction": "Faire revenir l'oignon et le butternut dans un fond de beurre. Remuer régulièrement (il ne faut pas que l'oignon roussisse). Une fois que les légumes sont bien revenus, émietter un cube de bouillon au-dessus."
      },
      {
        "id": "stp_rec_top100_093_4",
        "order": 4,
        "instruction": "Bien remuer pour laisser les légumes s'imprégner du bouillon. Recouvrir d'eau bouillante, juste au-dessus des légumes. Laisser cuire jusque que le butternut soit cuit (planter un couteau pour vérifier la cuisson)."
      },
      {
        "id": "stp_rec_top100_093_5",
        "order": 5,
        "instruction": "Mixer. Ajouter une ou deux cuillères de crème fraiche. Saler et poivrer."
      },
      {
        "id": "stp_rec_top100_093_6",
        "order": 6,
        "instruction": "Ajouter un soupçon de cannelle."
      },
      {
        "id": "stp_rec_top100_093_7",
        "order": 7,
        "instruction": "C'est prêt et c'est délicieux !"
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20131121/56974_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180711/80722_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20131027/53876_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_094",
    "title": "Muffins de Sandrine",
    "description": "Recette Muffins de Sandrine : la meilleure recette rapide et facile : 15 muffins, 40 min de préparation. Notée 4.9/5 par 245 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Moyen",
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 20,
    "servings": 15,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20140608/61945_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_muffins-de-sandrine_57367.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_094_1",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "180",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_094_2",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "180",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_094_3",
        "name": "Vanille",
        "canonicalId": "ing_canon_vanille",
        "quantity": "3",
        "unit": "sachet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_094_4",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "3",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_094_5",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "360",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_094_6",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "240",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_094_7",
        "name": "Miel liquide",
        "quantity": "3",
        "unit": "c. à café",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_094_8",
        "name": "Levure chimique",
        "canonicalId": "ing_canon_levure_chimique",
        "quantity": "1",
        "unit": "paquet",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_094_9",
        "name": "Chocolat noir",
        "canonicalId": "ing_canon_chocolat_noir",
        "quantity": "",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_094_10",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_094_1",
        "order": 1,
        "instruction": "Préchauffer le four à 175°C (thermostat 5-6)."
      },
      {
        "id": "stp_rec_top100_094_2",
        "order": 2,
        "instruction": "Faire fondre le beurre, puis le battre avec le sucre jusqu'à ce que le mélange blanchisse puis mettre le sucre vanillé et le sel."
      },
      {
        "id": "stp_rec_top100_094_3",
        "order": 3,
        "instruction": "Mélanger bien."
      },
      {
        "id": "stp_rec_top100_094_4",
        "order": 4,
        "instruction": "Ajouter les oeufs et le miel, melanger et ajoutez le lait."
      },
      {
        "id": "stp_rec_top100_094_5",
        "order": 5,
        "instruction": "Mélanger bien le tout."
      },
      {
        "id": "stp_rec_top100_094_6",
        "order": 6,
        "instruction": "Ajouter la farine, la levure et les pépites de chocolat."
      },
      {
        "id": "stp_rec_top100_094_7",
        "order": 7,
        "instruction": "Enfourner pour 20 à 25 minutes de cuisson."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20140608/61945_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/61328_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20120826/61218_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130502/62150_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_095",
    "title": "Gratin Dauphinois",
    "description": "Recette Gratin Dauphinois : la meilleure recette rapide et facile : 6 personnes, 85 min de préparation. Notée 4.7/5 par 938 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 25,
    "cookTimeMinutes": 60,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20201217/116563_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_gratin-dauphinois_13809.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_095_1",
        "name": "Pomme de terre",
        "canonicalId": "ing_canon_pomme_de_terre",
        "quantity": "1.5",
        "unit": "kg",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_095_2",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "2",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_095_3",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "30",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_095_4",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_095_5",
        "name": "Lait",
        "canonicalId": "ing_canon_lait",
        "quantity": "1",
        "unit": "l",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_095_6",
        "name": "Muscade",
        "canonicalId": "ing_canon_muscade",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_095_7",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_095_8",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_095_1",
        "order": 1,
        "instruction": "Eplucher, laver et couper les pommes de terre en rondelles fines (NB : ne pas les laver APRES les avoir coupées, car l'amidon est nécessaire à une consistance correcte)."
      },
      {
        "id": "stp_rec_top100_095_2",
        "order": 2,
        "instruction": "Hacher l'ail très finement."
      },
      {
        "id": "stp_rec_top100_095_3",
        "order": 3,
        "instruction": "Porter à ébullition dans une casserole le lait, l'ail, le sel, le poivre et la muscade puis y plonger les pommes de terre et laisser cuire 10 à 15 min, selon leur fermeté."
      },
      {
        "id": "stp_rec_top100_095_4",
        "order": 4,
        "instruction": "Préchauffer le four à 180°C (thermostat 6) et beurrer un plat à gratin à l'aide d'une feuille de papier essuie-tout."
      },
      {
        "id": "stp_rec_top100_095_5",
        "order": 5,
        "instruction": "Placer les pommes de terre égouttées dans le plat. Les recouvrir de crème, puis disposer des petites noix de beurre sur le dessus."
      },
      {
        "id": "stp_rec_top100_095_6",
        "order": 6,
        "instruction": "Enfourner pour 50 min à 1 heure de cuisson.  Utiliser le lait restant de la cuisson des pommes de terre pour faire une soupe ou une purée dans la foulée."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20201217/116563_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20160401/5313_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180622/79932_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_096",
    "title": "Moelleux au chocolat",
    "description": "Recette Moelleux au chocolat : la meilleure recette rapide et facile : 6 personnes, 25 min de préparation. Notée 4.8/5 par 382 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 10,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20171019/73301_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_moelleux-au-chocolat_17982.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_096_1",
        "name": "Chocolat noir",
        "canonicalId": "ing_canon_chocolat_noir",
        "quantity": "250",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_096_2",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "175",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_096_3",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "125",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_096_4",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "75",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_096_5",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "5",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_096_1",
        "order": 1,
        "instruction": "faire fondre le chocolat."
      },
      {
        "id": "stp_rec_top100_096_2",
        "order": 2,
        "instruction": "Ajouter le beurre en morceaux peu à peu et l'incorporer pour obtenir un crème bien lisse."
      },
      {
        "id": "stp_rec_top100_096_3",
        "order": 3,
        "instruction": "Mettre la farine et le sucre glace dans un saladier. Ajouter les oeufs entiers et mélanger jusqu'à obtention d'une émulsion homogène."
      },
      {
        "id": "stp_rec_top100_096_4",
        "order": 4,
        "instruction": "Verser le mélange chocolat-beurre sur cette préparation. Mélanger."
      },
      {
        "id": "stp_rec_top100_096_5",
        "order": 5,
        "instruction": "Beurrer et fariner 6 moules individuels ou un grand moule."
      },
      {
        "id": "stp_rec_top100_096_6",
        "order": 6,
        "instruction": "Verser la préparation et mettre à four chaud (200°C) - 10 min pour les petits gâteaux, 15 pour le grand."
      },
      {
        "id": "stp_rec_top100_096_7",
        "order": 7,
        "instruction": "Servir tiède avec une crème anglaise (le centre doit être coulant) ou servir froid nappé de ganache au chocolat."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20171019/73301_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20180705/80267_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20131018/57637_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_097",
    "title": "Flan de courgettes",
    "description": "Recette Flan de courgettes : la meilleure recette rapide et facile : 6 personnes, 50 min de préparation. Notée 4.8/5 par 370 membres Marmiton.",
    "category": "Entrée",
    "difficulty": "Moyen",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 35,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20190529/93196_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_flan-de-courgettes_23249.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_097_1",
        "name": "Courgette",
        "canonicalId": "ing_canon_courgette",
        "quantity": "1",
        "unit": "kg",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_097_2",
        "name": "Fromage râpé",
        "canonicalId": "ing_canon_fromage_rape",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_097_3",
        "name": "Cuilleres de lait",
        "quantity": "8",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_097_4",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "6",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_097_5",
        "name": "Basilic",
        "canonicalId": "ing_canon_basilic",
        "quantity": "20",
        "unit": "feuilles",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_097_1",
        "order": 1,
        "instruction": "Couper les courgettes en très fines rondelles. Les faire revenir dans de l'huile d'olive. Saler, poivrer, cuire environ 10 mm à petit feu."
      },
      {
        "id": "stp_rec_top100_097_2",
        "order": 2,
        "instruction": "Battre les oeufs et ajouter le fromage + sel + poivre + basilic + lait."
      },
      {
        "id": "stp_rec_top100_097_3",
        "order": 3,
        "instruction": "Jeter la préparation sur les courgettes. Remuer. NE PAS FAIRE PRENDRE \"L'OMELETTE\"."
      },
      {
        "id": "stp_rec_top100_097_4",
        "order": 4,
        "instruction": "Mettre au four 180°C pendant 35 mn."
      },
      {
        "id": "stp_rec_top100_097_5",
        "order": 5,
        "instruction": "SERVIR FROID OU CHAUD avec une sauce mayonnaise + ketchup hot."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20190529/93196_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20190529/93195_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20190529/93194_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_098",
    "title": "Blanquette de veau maison",
    "description": "Recette Blanquette de veau maison : la meilleure recette rapide et facile : 6 personnes, 105 min de préparation. Notée 4.8/5 par 362 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Difficile",
    "prepTimeMinutes": 45,
    "cookTimeMinutes": 60,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20230623/143801_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_blanquette-de-veau-maison_16224.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_098_1",
        "name": "Epaule de veau ou de tendron de veau",
        "quantity": "1.2",
        "unit": "kg",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_2",
        "name": "Carotte",
        "canonicalId": "ing_canon_carotte",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_3",
        "name": "Poireau",
        "canonicalId": "ing_canon_poireau",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_4",
        "name": "Oignon",
        "canonicalId": "ing_canon_oignon",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_5",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "1",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_6",
        "name": "Échalote",
        "canonicalId": "ing_canon_echalote",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_7",
        "name": "Céleri",
        "canonicalId": "ing_canon_celeri",
        "quantity": "1",
        "unit": "brin",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_8",
        "name": "Bouquet garni",
        "canonicalId": "ing_canon_bouquet_garni",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_9",
        "name": "Bouquet de persil",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_10",
        "name": "Citron",
        "canonicalId": "ing_canon_citron",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_11",
        "name": "Champignon de Paris",
        "canonicalId": "ing_canon_champignon_de_paris",
        "quantity": "300",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_12",
        "name": "Vin blanc",
        "canonicalId": "ing_canon_vin_blanc",
        "quantity": "3",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_13",
        "name": "Œufs",
        "canonicalId": "ing_canon_ufs",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_14",
        "name": "Crème fraîche",
        "canonicalId": "ing_canon_creme_fraiche",
        "quantity": "1",
        "unit": "dl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_15",
        "name": "Farine",
        "canonicalId": "ing_canon_farine",
        "quantity": "1",
        "unit": "c. à soupe",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_098_16",
        "name": "Beurre",
        "canonicalId": "ing_canon_beurre",
        "quantity": "70",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_098_1",
        "order": 1,
        "instruction": "Pelez carotte, ail, échalotes et oignon. Hachez ce dernier ainsi que les blancs de poireaux. Coupez les échalotes et la carotte en deux."
      },
      {
        "id": "stp_rec_top100_098_2",
        "order": 2,
        "instruction": "Portez à ébullition 2 litres d'eau dans un grand faitout, plongez-y les morceaux de viande pendant environ une minute pour les blanchir (blanchir la viande permet d'éliminer les éventuelles impuretés tout en la rendant plus ferme). Egouttez la viande, rincez-la sous l'eau froide et jetez l'eau de cuisson."
      },
      {
        "id": "stp_rec_top100_098_3",
        "order": 3,
        "instruction": "Replacez la viande dans le faitout rincé. Ajoutez oignon et poireaux hachés, carottes, échalotes, ail, céleri et bouquet garni. Salez, poivrez et mouillez avec le vin. Ajoutez de l'eau pour que la viande et les légumes soient immergés."
      },
      {
        "id": "stp_rec_top100_098_4",
        "order": 4,
        "instruction": "Couvrez. Portez à ébullition et laissez cuire 1 h 30. Faites cuire dans une poêle, avec 30 g de beurre, les champignons coupés et citronnés 10 min."
      },
      {
        "id": "stp_rec_top100_098_5",
        "order": 5,
        "instruction": "Préparez un roux blond : faites fondre le reste de beurre dans une casserole, saupoudrez-le avec la farine, mélangez vivement au fouet, puis laissez refroidir. Quand la viande est cuite, mettez-la dans une passoire avec les légumes et récupérez le bouillon de cuisson. Délayez le roux avec ce bouillon et amenez à ébullition en fouettant."
      },
      {
        "id": "stp_rec_top100_098_6",
        "order": 6,
        "instruction": "Remettez la viande et tous les légumes dans le faitout après avoir retiré bouquet garni, ail, céleri et carotte. Ajoutez les champignons, versez la sauce et réchauffez le tout 10 à 15 mn."
      },
      {
        "id": "stp_rec_top100_098_7",
        "order": 7,
        "instruction": "Juste avant de servir mélangez la crème et les jaunes d'oeufs, incorporez-les à la sauce en tournant sans laisser bouillir. Ajoutez quelques gouttes de jus de citron. Servez dans un plat creux avec du persil."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20230623/143801_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20120502/6429_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140913/6431_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_099",
    "title": "Charlotte aux fruits d'été",
    "description": "Recette Charlotte aux fruits d'été : la meilleure recette rapide et facile : 6 personnes, 15 min de préparation. Notée 4.9/5 par 238 membres Marmiton.",
    "category": "Dessert",
    "difficulty": "Facile",
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 0,
    "servings": 6,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20171019/73623_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_charlotte-aux-fruits-d-ete_20546.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_099_1",
        "name": "Biscuit à la cuillère",
        "canonicalId": "ing_canon_biscuit_a_la_cuillere",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_099_2",
        "name": "Orange",
        "canonicalId": "ing_canon_orange",
        "quantity": "30",
        "unit": "cl",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_099_3",
        "name": "Mascarpone",
        "canonicalId": "ing_canon_mascarpone",
        "quantity": "200",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_099_4",
        "name": "Fromage blanc",
        "canonicalId": "ing_canon_fromage_blanc",
        "quantity": "400",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_099_5",
        "name": "Sucre",
        "canonicalId": "ing_canon_sucre",
        "quantity": "100",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_099_6",
        "name": "Framboise",
        "canonicalId": "ing_canon_framboise",
        "quantity": "150",
        "unit": "g",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_099_7",
        "name": "Pêche",
        "canonicalId": "ing_canon_peche",
        "quantity": "2",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_099_1",
        "order": 1,
        "instruction": "Mélanger le fromage blanc, le sucre et le Mascarpone."
      },
      {
        "id": "stp_rec_top100_099_2",
        "order": 2,
        "instruction": "Rincer les framboises, puis éplucher et couper les pêches."
      },
      {
        "id": "stp_rec_top100_099_3",
        "order": 3,
        "instruction": "Tremper rapidement les biscuits dans le jus d'orange et poser les contre le bord du moule, côté sucré vers l'extérieur."
      },
      {
        "id": "stp_rec_top100_099_4",
        "order": 4,
        "instruction": "Alterner une couche de préparation au fromage, une couche de fruits et une couche de biscuit tremper dans le jus."
      },
      {
        "id": "stp_rec_top100_099_5",
        "order": 5,
        "instruction": "Terminer par les biscuits."
      },
      {
        "id": "stp_rec_top100_099_6",
        "order": 6,
        "instruction": "Couvrir avec une assiette et mettre un poids dessus, puis garder au moins 3 heures au frais."
      },
      {
        "id": "stp_rec_top100_099_7",
        "order": 7,
        "instruction": "Démouler la charlotte et décorer de framboises."
      }
    ],
    "isVegetarian": true,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20171019/73623_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20130625/52352_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20100120/40730_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140328/52559_w1024h768c1.jpg"
    ]
  },
  {
    "id": "rec_top100_100",
    "title": "Amour de saumon en papillote",
    "description": "Recette Amour de saumon en papillote : la meilleure recette rapide et facile : 4 personnes, 50 min de préparation. Notée 4.7/5 par 973 membres Marmiton.",
    "category": "Plat",
    "difficulty": "Moyen",
    "prepTimeMinutes": 25,
    "cookTimeMinutes": 25,
    "servings": 4,
    "rating": 0,
    "imageUrl": "https://assets.afcdn.com/recipe/20150922/57763_w1024h768c1.jpg",
    "isFavorite": false,
    "userNote": "Recette culte issue du Top Marmiton (https://www.marmiton.org/recettes/recette_amour-de-saumon-en-papillote_21494.aspx)",
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "ingredients": [
      {
        "id": "ing_rec_top100_100_1",
        "name": "Saumon",
        "canonicalId": "ing_canon_saumon",
        "quantity": "4",
        "unit": "pavés",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_100_2",
        "name": "Tomate",
        "canonicalId": "ing_canon_tomate",
        "quantity": "20",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_100_3",
        "name": "Champignon de Paris",
        "canonicalId": "ing_canon_champignon_de_paris",
        "quantity": "20",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_100_4",
        "name": "Ail",
        "canonicalId": "ing_canon_ail",
        "quantity": "1",
        "unit": "gousses",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_100_5",
        "name": "Aneth",
        "canonicalId": "ing_canon_aneth",
        "quantity": "4",
        "unit": "brins",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_100_6",
        "name": "Huile d'olive",
        "canonicalId": "ing_canon_huile_d_olive",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_100_7",
        "name": "Citron",
        "canonicalId": "ing_canon_citron",
        "quantity": "1",
        "unit": "",
        "isPantryStaple": false,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_100_8",
        "name": "Sel",
        "canonicalId": "ing_canon_sel",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      },
      {
        "id": "ing_rec_top100_100_9",
        "name": "Poivre",
        "canonicalId": "ing_canon_poivre",
        "quantity": "",
        "unit": "",
        "isPantryStaple": true,
        "isOptional": false
      }
    ],
    "steps": [
      {
        "id": "stp_rec_top100_100_1",
        "order": 1,
        "instruction": "Préchauffer le four à 180°C (thermostat 6). Laver, essorer et ciseler l'aneth. Peler et émincer la gousse d'ail finement. Réserver."
      },
      {
        "id": "stp_rec_top100_100_2",
        "order": 2,
        "instruction": "Emincer les champignons après les avoir nettoyés."
      },
      {
        "id": "stp_rec_top100_100_3",
        "order": 3,
        "instruction": "Couper les tomates cerise en deux."
      },
      {
        "id": "stp_rec_top100_100_4",
        "order": 4,
        "instruction": "Déposer au centre de chaque feuille de papier cuisson un pavé de saumon,"
      },
      {
        "id": "stp_rec_top100_100_5",
        "order": 5,
        "instruction": "ajouter les tomates"
      },
      {
        "id": "stp_rec_top100_100_6",
        "order": 6,
        "instruction": "et les champignons tout autour."
      },
      {
        "id": "stp_rec_top100_100_7",
        "order": 7,
        "instruction": "Parsemer les pavés de saumon d'aneth et d'ail"
      },
      {
        "id": "stp_rec_top100_100_8",
        "order": 8,
        "instruction": "et les arroser d'un filet de jus de citron."
      },
      {
        "id": "stp_rec_top100_100_9",
        "order": 9,
        "instruction": "Poivrer, saler et terminer par un filet d'huile d'olive."
      },
      {
        "id": "stp_rec_top100_100_10",
        "order": 10,
        "instruction": "Fermer les papillotes"
      },
      {
        "id": "stp_rec_top100_100_11",
        "order": 11,
        "instruction": "et les mettre au four pendant 25 à 30 minutes."
      },
      {
        "id": "stp_rec_top100_100_12",
        "order": 12,
        "instruction": "Déguster."
      }
    ],
    "isVegetarian": false,
    "availableImages": [
      "https://assets.afcdn.com/recipe/20150922/57763_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20140531/58826_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20131020/58583_w1024h768c1.jpg"
    ]
  }
];
