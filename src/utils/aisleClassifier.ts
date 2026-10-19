import { ShoppingAisle, AisleConfig } from '../types/shopping';
import { normalizeString } from './helpers';

/**
 * Configuration visuelle des rayons de supermarché (icônes Ionicons et palettes)
 */
export const AISLE_CONFIGS: Record<ShoppingAisle, AisleConfig> = {
  'Fruits & Légumes': {
    aisle: 'Fruits & Légumes',
    iconName: 'nutrition-outline',
    color: '#16A34A', // Vert frais
    bgColor: '#DCFCE7',
  },
  'Boucherie & Poissonnerie': {
    aisle: 'Boucherie & Poissonnerie',
    iconName: 'restaurant-outline',
    color: '#DC2626', // Rouge vif
    bgColor: '#FEE2E2',
  },
  'Produits Frais & Crèmerie': {
    aisle: 'Produits Frais & Crèmerie',
    iconName: 'water-outline',
    color: '#0284C7', // Bleu ciel frais
    bgColor: '#E0F2FE',
  },
  'Épicerie & Condiments': {
    aisle: 'Épicerie & Condiments',
    iconName: 'basket-outline',
    color: '#D97706', // Ambre / Épicé
    bgColor: '#FEF3C7',
  },
  'Boulangerie & Pâtisserie': {
    aisle: 'Boulangerie & Pâtisserie',
    iconName: 'cafe-outline',
    color: '#B45309', // Caramel / Pain chaud
    bgColor: '#FFEDD5',
  },
  'Surgelés': {
    aisle: 'Surgelés',
    iconName: 'snow-outline',
    color: '#0891B2', // Cyan givré
    bgColor: '#CFFAFE',
  },
  'Boissons': {
    aisle: 'Boissons',
    iconName: 'wine-outline',
    color: '#7C3AED', // Violet raisin
    bgColor: '#EDE9FE',
  },
  'Autre': {
    aisle: 'Autre',
    iconName: 'cube-outline',
    color: '#4B5563', // Gris neutre
    bgColor: '#F3F4F6',
  },
};

export const ALL_AISLES: ShoppingAisle[] = [
  'Fruits & Légumes',
  'Boucherie & Poissonnerie',
  'Produits Frais & Crèmerie',
  'Boulangerie & Pâtisserie',
  'Épicerie & Condiments',
  'Surgelés',
  'Boissons',
  'Autre',
];

// Mots-clés discriminants normalisés (sans accents, minuscules)
const SURGELES_KEYWORDS = [
  'surgele',
  'glace',
  'sorbet',
  'cornet',
  'bac de glace',
];

const BOISSONS_KEYWORDS = [
  'vin blanc',
  'vin rouge',
  'vin rose',
  'biere',
  'cidre',
  'champagne',
  'jus d',
  'jus de',
  'soda',
  'eau gazeuse',
  'eau minerale',
  'sirop de',
  'the vert',
  'cafe en grain',
  'cafe moulu',
  'rhum',
  'vodka',
  'whisky',
  'cognac',
  'liqueur',
];

const CREMERIE_KEYWORDS = [
  'oeuf',
  'lait',
  'creme',
  'beurre',
  'fromage',
  'parmesan',
  'mozzarella',
  'gruyere',
  'emmental',
  'comte',
  'chevre',
  'feta',
  'ricotta',
  'mascarpone',
  'yaourt',
  'yogourt',
  'creme fraiche',
  'creme liquide',
  'creme fleurette',
  'cheddar',
  'gouda',
  'brie',
  'camembert',
  'reblochon',
  'raclette',
  'faisselle',
  'petit suisse',
  'gorgonzola',
  'roquefort',
  'pecorino',
  'burrata',
];

const BOUCHERIE_KEYWORDS = [
  'poulet',
  'boeuf',
  'porc',
  'veau',
  'dinde',
  'canard',
  'agneau',
  'steak',
  'viande',
  'saucisse',
  'merguez',
  'chipolata',
  'lardon',
  'bacon',
  'jambon',
  'pancetta',
  'chorizo',
  'filet mignon',
  'cuisse de',
  'magret',
  'roti',
  'escalope',
  'saumon',
  'thon',
  'cabillaud',
  'colin',
  'morue',
  'poisson',
  'crevette',
  'gambas',
  'moule',
  'saint jacques',
  'coquille',
  'fruits de mer',
  'anchois',
  'sardine',
  'truite',
  'dorade',
  'bar',
  'sole',
  'calmar',
  'seiche',
  'poulpe',
  'crabe',
  'hache',
  'chair a saucisse',
];

const BOULANGERIE_KEYWORDS = [
  'pain',
  'baguette',
  'pain de mie',
  'brioche',
  'toast',
  'pate feuilletee',
  'pate brisee',
  'pate sablee',
  'pate a pizza',
  'levure de boulanger',
  'levure boulangere',
  'croissant',
  'pain au chocolat',
  'tortilla',
  'wrap',
  'chapelure',
  'blinis',
  'biscotte',
];

const FRUITS_LEGUMES_KEYWORDS = [
  'ail',
  'oignon',
  'echalote',
  'pomme de terre',
  'patate',
  'carotte',
  'courgette',
  'poivron',
  'tomate',
  'concombre',
  'aubergine',
  'salade',
  'laitue',
  'mache',
  'roquette',
  'epinard',
  'champignon',
  'haricot vert',
  'brocoli',
  'chou',
  'poireau',
  'avocat',
  'citron',
  'orange',
  'pamplemousse',
  'pomme',
  'poire',
  'banane',
  'fraise',
  'framboise',
  'myrtille',
  'mangue',
  'ananas',
  'peche',
  'abricot',
  'cerise',
  'raisin',
  'melon',
  'pasteque',
  'kiwi',
  'basilic',
  'persil',
  'coriandre',
  'ciboulette',
  'menthe',
  'romarin',
  'thym',
  'estragon',
  'aneth',
  'gingembre',
  'celeri',
  'radis',
  'navet',
  'betterave',
  'courge',
  'butternut',
  'potimarron',
  'fenouil',
  'artichaut',
  'asperge',
  'cresson',
  'mure',
  'figue',
  'prune',
  'citrouille',
  'panais',
  'patate douce',
];

const EPICERIE_KEYWORDS = [
  'pate',
  'spaghetti',
  'penne',
  'tagliatelle',
  'coquillette',
  'macaroni',
  'lasagne',
  'nouille',
  'riz',
  'basmati',
  'farine',
  'fecule',
  'maizena',
  'semoule',
  'quinoa',
  'lentille',
  'pois chiche',
  'haricot rouge',
  'haricot blanc',
  'huile',
  'vinaigre',
  'moutarde',
  'mayonnaise',
  'ketchup',
  'sauce soja',
  'concentre de tomate',
  'coulis de tomate',
  'pulpe de tomate',
  'tomate pelee',
  'tomates pelees',
  'bouillon',
  'cube',
  'epice',
  'curry',
  'cumin',
  'paprika',
  'curcuma',
  'piment',
  'sel',
  'poivre',
  'cannelle',
  'muscade',
  'origan',
  'sucre',
  'cassonade',
  'miel',
  'confiture',
  'sirop d erable',
  'chocolat',
  'cacao',
  'amande',
  'noix',
  'noisette',
  'pignon',
  'sesame',
  'olive',
  'capre',
  'conserve',
  'sauce tomate',
  'levure chimique',
  'sucre vanille',
  'arome vanille',
  'extrait de vanille',
  'lait de coco',
  'creme de coco',
];

/**
 * Détermine le rayon de supermarché pour un nom d'ingrédient donné
 */
export function classifyIngredientAisle(ingredientName: string): ShoppingAisle {
  if (!ingredientName || !ingredientName.trim()) {
    return 'Autre';
  }

  const norm = normalizeString(ingredientName);

  // 1. Surgelés en priorité si explicite
  if (SURGELES_KEYWORDS.some((kw) => norm.includes(kw))) {
    return 'Surgelés';
  }

  // 2. Boissons (vins de cuisine, bière, jus)
  if (BOISSONS_KEYWORDS.some((kw) => norm.includes(kw))) {
    return 'Boissons';
  }

  // 3. Boucherie / Poissonnerie
  if (BOUCHERIE_KEYWORDS.some((kw) => norm.includes(kw))) {
    return 'Boucherie & Poissonnerie';
  }

  // 4. Produits Frais / Crèmerie
  if (CREMERIE_KEYWORDS.some((kw) => norm.includes(kw))) {
    return 'Produits Frais & Crèmerie';
  }

  // 5. Boulangerie / Pâtes fraîches à tarte
  if (BOULANGERIE_KEYWORDS.some((kw) => norm.includes(kw))) {
    return 'Boulangerie & Pâtisserie';
  }

  // 6. Fruits & Légumes
  if (FRUITS_LEGUMES_KEYWORDS.some((kw) => norm.includes(kw))) {
    return 'Fruits & Légumes';
  }

  // 7. Épicerie & Condiments
  if (EPICERIE_KEYWORDS.some((kw) => norm.includes(kw))) {
    return 'Épicerie & Condiments';
  }

  return 'Autre';
}
