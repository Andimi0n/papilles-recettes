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

// =========================================================================
// DICTIONNAIRES PAR RAYON
// =========================================================================

// Phrases composées prioritaires (ex: "pomme de terre", "huile d'olive", "lait de coco")
// Sont testées en premier par inclusion directe pour éviter les faux-positifs
const COMPOUND_PHRASES: { phrase: string; aisle: ShoppingAisle }[] = [
  // Surgelés
  { phrase: 'bac de glace', aisle: 'Surgelés' },
  { phrase: 'batonnet glace', aisle: 'Surgelés' },
  { phrase: 'poelee surgelee', aisle: 'Surgelés' },
  { phrase: 'legumes surgeles', aisle: 'Surgelés' },

  // Boissons
  { phrase: 'vin blanc', aisle: 'Boissons' },
  { phrase: 'vin rouge', aisle: 'Boissons' },
  { phrase: 'vin rose', aisle: 'Boissons' },
  { phrase: 'eau gazeuse', aisle: 'Boissons' },
  { phrase: 'eau minerale', aisle: 'Boissons' },
  { phrase: 'eau plate', aisle: 'Boissons' },
  { phrase: 'the vert', aisle: 'Boissons' },
  { phrase: 'the noir', aisle: 'Boissons' },
  { phrase: 'the glace', aisle: 'Boissons' },
  { phrase: 'cafe en grain', aisle: 'Boissons' },
  { phrase: 'cafe moulu', aisle: 'Boissons' },
  { phrase: 'jus de pomme', aisle: 'Boissons' },
  { phrase: 'jus d orange', aisle: 'Boissons' },
  { phrase: 'jus de raisin', aisle: 'Boissons' },
  { phrase: 'jus de fruits', aisle: 'Boissons' },
  { phrase: 'biere sans alcool', aisle: 'Boissons' },

  // Boucherie / Poissonnerie
  { phrase: 'blanc de poulet', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'blancs de poulet', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'filet de poulet', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'filets de poulet', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'cuisse de poulet', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'cuisses de poulet', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'aile de poulet', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'viande hachee', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'steak hache', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'steaks haches', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'chair a saucisse', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'filet mignon', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'cote de porc', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'cote de boeuf', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'fruits de mer', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'saint jacques', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'pave de saumon', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'paves de saumon', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'saumon fume', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'truite fumee', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'jambon blanc', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'jambon cuit', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'jambon cru', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'jambon de parme', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'jambon serrano', aisle: 'Boucherie & Poissonnerie' },
  { phrase: 'viande des grisons', aisle: 'Boucherie & Poissonnerie' },

  // Produits Frais & Crèmerie
  { phrase: 'creme fraiche', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'creme liquide', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'creme fleurette', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'creme epaisse', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'creme entiere', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'fromage blanc', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'fromage frais', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'fromage rape', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'beurre doux', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'beurre sale', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'beurre demi sel', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'lait entier', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'lait demi ecreme', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'lait d amande', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'lait d avoine', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'lait de soja', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'petit suisse', aisle: 'Produits Frais & Crèmerie' },
  { phrase: 'buche de chevre', aisle: 'Produits Frais & Crèmerie' },

  // Boulangerie & Pâtisserie
  { phrase: 'pain de mie', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'pain complet', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'pain burger', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'pain a burger', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'pate feuilletee', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'pate brisee', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'pate sablee', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'pate a pizza', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'levure de boulanger', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'levure boulangere', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'pain au chocolat', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'feuilles de brick', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'feuille de brick', aisle: 'Boulangerie & Pâtisserie' },
  { phrase: 'pate filo', aisle: 'Boulangerie & Pâtisserie' },

  // Fruits & Légumes
  { phrase: 'pomme de terre', aisle: 'Fruits & Légumes' },
  { phrase: 'pommes de terre', aisle: 'Fruits & Légumes' },
  { phrase: 'patate douce', aisle: 'Fruits & Légumes' },
  { phrase: 'patates douces', aisle: 'Fruits & Légumes' },
  { phrase: 'haricot vert', aisle: 'Fruits & Légumes' },
  { phrase: 'haricots verts', aisle: 'Fruits & Légumes' },
  { phrase: 'chou fleur', aisle: 'Fruits & Légumes' },
  { phrase: 'chou rouge', aisle: 'Fruits & Légumes' },
  { phrase: 'chou vert', aisle: 'Fruits & Légumes' },
  { phrase: 'chou blanc', aisle: 'Fruits & Légumes' },
  { phrase: 'choux de bruxelles', aisle: 'Fruits & Légumes' },
  { phrase: 'salade verte', aisle: 'Fruits & Légumes' },
  { phrase: 'jeunes pousses', aisle: 'Fruits & Légumes' },
  { phrase: 'fruit de la passion', aisle: 'Fruits & Légumes' },
  { phrase: 'tomate cerise', aisle: 'Fruits & Légumes' },
  { phrase: 'tomates cerises', aisle: 'Fruits & Légumes' },
  { phrase: 'gousse d ail', aisle: 'Fruits & Légumes' },
  { phrase: 'gousses d ail', aisle: 'Fruits & Légumes' },
  { phrase: 'citron vert', aisle: 'Fruits & Légumes' },
  { phrase: 'herbes fraiches', aisle: 'Fruits & Légumes' },

  // Épicerie & Condiments
  { phrase: 'huile d olive', aisle: 'Épicerie & Condiments' },
  { phrase: 'huile de tournesol', aisle: 'Épicerie & Condiments' },
  { phrase: 'huile de colza', aisle: 'Épicerie & Condiments' },
  { phrase: 'huile de sesame', aisle: 'Épicerie & Condiments' },
  { phrase: 'vinaigre balsamique', aisle: 'Épicerie & Condiments' },
  { phrase: 'vinaigre de cidre', aisle: 'Épicerie & Condiments' },
  { phrase: 'vinaigre de vin', aisle: 'Épicerie & Condiments' },
  { phrase: 'vinaigre blanc', aisle: 'Épicerie & Condiments' },
  { phrase: 'sauce soja', aisle: 'Épicerie & Condiments' },
  { phrase: 'sauce tomate', aisle: 'Épicerie & Condiments' },
  { phrase: 'coulis de tomate', aisle: 'Épicerie & Condiments' },
  { phrase: 'concentre de tomate', aisle: 'Épicerie & Condiments' },
  { phrase: 'pulpe de tomate', aisle: 'Épicerie & Condiments' },
  { phrase: 'tomates pelees', aisle: 'Épicerie & Condiments' },
  { phrase: 'tomate pelee', aisle: 'Épicerie & Condiments' },
  { phrase: 'lait de coco', aisle: 'Épicerie & Condiments' },
  { phrase: 'creme de coco', aisle: 'Épicerie & Condiments' },
  { phrase: 'sirop d erable', aisle: 'Épicerie & Condiments' },
  { phrase: 'sirop d agave', aisle: 'Épicerie & Condiments' },
  { phrase: 'sucre vanille', aisle: 'Épicerie & Condiments' },
  { phrase: 'sucre glace', aisle: 'Épicerie & Condiments' },
  { phrase: 'sucre roux', aisle: 'Épicerie & Condiments' },
  { phrase: 'sucre de canne', aisle: 'Épicerie & Condiments' },
  { phrase: 'levure chimique', aisle: 'Épicerie & Condiments' },
  { phrase: 'bicarbonate de soude', aisle: 'Épicerie & Condiments' },
  { phrase: 'extrait de vanille', aisle: 'Épicerie & Condiments' },
  { phrase: 'gousse de vanille', aisle: 'Épicerie & Condiments' },
  { phrase: 'poudre d amande', aisle: 'Épicerie & Condiments' },
  { phrase: 'poudre de noisette', aisle: 'Épicerie & Condiments' },
  { phrase: 'noix de coco rapee', aisle: 'Épicerie & Condiments' },
  { phrase: 'flocons d avoine', aisle: 'Épicerie & Condiments' },
  { phrase: 'haricots rouges', aisle: 'Épicerie & Condiments' },
  { phrase: 'haricots blancs', aisle: 'Épicerie & Condiments' },
  { phrase: 'pois chiches', aisle: 'Épicerie & Condiments' },
  { phrase: 'pois chiche', aisle: 'Épicerie & Condiments' },
  { phrase: 'pois casses', aisle: 'Épicerie & Condiments' },
  { phrase: 'pate a tartiner', aisle: 'Épicerie & Condiments' },
  { phrase: 'chocolat noir', aisle: 'Épicerie & Condiments' },
  { phrase: 'chocolat au lait', aisle: 'Épicerie & Condiments' },
  { phrase: 'chocolat blanc', aisle: 'Épicerie & Condiments' },
  { phrase: 'chocolat en poudre', aisle: 'Épicerie & Condiments' },
  { phrase: 'cube de bouillon', aisle: 'Épicerie & Condiments' },
  { phrase: 'bouillon de volaille', aisle: 'Épicerie & Condiments' },
  { phrase: 'bouillon de boeuf', aisle: 'Épicerie & Condiments' },
  { phrase: 'bouillon de legumes', aisle: 'Épicerie & Condiments' },
  { phrase: 'thon au naturel', aisle: 'Épicerie & Condiments' },
  { phrase: 'thon en boite', aisle: 'Épicerie & Condiments' },
  { phrase: 'sardines a l huile', aisle: 'Épicerie & Condiments' },
  { phrase: 'herbes de provence', aisle: 'Épicerie & Condiments' },
  { phrase: 'sel fin', aisle: 'Épicerie & Condiments' },
  { phrase: 'gros sel', aisle: 'Épicerie & Condiments' },
  { phrase: 'fleur de sel', aisle: 'Épicerie & Condiments' },
  { phrase: 'poivre noir', aisle: 'Épicerie & Condiments' },
  { phrase: 'poivre blanc', aisle: 'Épicerie & Condiments' },
  { phrase: 'poivre moulu', aisle: 'Épicerie & Condiments' },
];

// Mots-clés unitaires précis (match par token entier pour éliminer les faux-positifs)
const SURGELES_WORDS = new Set([
  'surgele', 'surgeles', 'glace', 'glaces', 'sorbet', 'sorbets', 'esquimau', 'cornet',
]);

const BOISSONS_WORDS = new Set([
  'biere', 'bieres', 'cidre', 'cidres', 'champagne', 'rhum', 'vodka', 'whisky', 'gin',
  'tequila', 'cognac', 'liqueur', 'soda', 'colas', 'coca', 'limonade', 'sirop', 'sirops',
  'grenadine', 'perrier', 'kombucha', 'smoothie', 'aperol', 'campari', 'porto', 'martini',
  'prosecco', 'cremant', 'tonic', 'schweppes',
]);

const BOUCHERIE_WORDS = new Set([
  'poulet', 'poulets', 'boeuf', 'porc', 'veau', 'dinde', 'canard', 'agneau', 'mouton',
  'steak', 'steaks', 'viande', 'viandes', 'saucisse', 'saucisses', 'merguez', 'chipolata',
  'chipolatas', 'lardon', 'lardons', 'bacon', 'jambon', 'jambons', 'pancetta', 'chorizo',
  'magret', 'magrets', 'roti', 'rotis', 'escalope', 'escalopes', 'bavette', 'entrecote',
  'paleron', 'bourguignon', 'carpaccio', 'tartare', 'boudin', 'andouillette', 'rillettes',
  'terrine', 'foie gras', 'volaille', 'volailles', 'saumon', 'thon', 'cabillaud', 'colin',
  'morue', 'poisson', 'poissons', 'crevette', 'crevettes', 'gambas', 'moule', 'moules',
  'anchois', 'sardine', 'sardines', 'truite', 'dorade', 'daurade', 'bar', 'sole', 'calmar',
  'calmars', 'seiche', 'poulpe', 'crabe', 'homard', 'langouste', 'langoustine', 'merlu',
  'haddock', 'hareng', 'maquereau', 'rouget', 'espadon', 'surimi',
]);

const CREMERIE_WORDS = new Set([
  'oeuf', 'oeufs', 'lait', 'creme', 'cremes', 'beurre', 'fromage', 'fromages', 'parmesan',
  'mozzarella', 'gruyere', 'emmental', 'comte', 'chevre', 'feta', 'ricotta', 'mascarpone',
  'yaourt', 'yaourts', 'yogourt', 'cheddar', 'gouda', 'brie', 'camembert', 'reblochon',
  'raclette', 'faisselle', 'gorgonzola', 'roquefort', 'pecorino', 'burrata', 'cantal',
  'beaufort', 'maroilles', 'munster', 'morbier', 'chaource', 'tofu', 'seitan', 'tempeh',
  'kiri', 'babybel', 'philadelphia',
]);

const BOULANGERIE_WORDS = new Set([
  'pain', 'pains', 'baguette', 'baguettes', 'brioche', 'brioches', 'toast', 'toasts',
  'croissant', 'croissants', 'tortilla', 'tortillas', 'wrap', 'wraps', 'chapelure',
  'blinis', 'biscotte', 'biscottes', 'bagel', 'bagels', 'naan', 'naans', 'pita',
  'focaccia', 'ciabatta', 'muffin', 'muffins', 'pancake', 'pancakes', 'gaufre', 'gaufres',
  'crepe', 'crepes',
]);

const FRUITS_LEGUMES_WORDS = new Set([
  'ail', 'oignon', 'oignons', 'echalote', 'echalotes', 'carotte', 'carottes', 'courgette',
  'courgettes', 'poivron', 'poivrons', 'tomate', 'tomates', 'concombre', 'concombres',
  'aubergine', 'aubergines', 'salade', 'salades', 'laitue', 'mache', 'roquette', 'epinard',
  'epinards', 'champignon', 'champignons', 'brocoli', 'brocolis', 'chou', 'choux', 'poireau',
  'poireaux', 'avocat', 'avocats', 'citron', 'citrons', 'orange', 'oranges', 'pamplemousse',
  'pomme', 'pommes', 'poire', 'poires', 'banane', 'bananes', 'fraise', 'fraises', 'framboise',
  'framboises', 'myrtille', 'myrtilles', 'mangue', 'mangues', 'ananas', 'peche', 'peches',
  'abricot', 'abricots', 'cerise', 'cerises', 'raisin', 'raisins', 'melon', 'melons',
  'pasteque', 'pasteques', 'kiwi', 'kiwis', 'basilic', 'persil', 'coriandre', 'ciboulette',
  'menthe', 'romarin', 'thym', 'estragon', 'aneth', 'gingembre', 'celeri', 'radis', 'navet',
  'navets', 'betterave', 'betteraves', 'courge', 'courges', 'butternut', 'potimarron', 'potiron',
  'fenouil', 'artichaut', 'artichauts', 'asperge', 'asperges', 'cresson', 'mure', 'mures',
  'figue', 'figues', 'prune', 'prunes', 'citrouille', 'panais', 'gousse', 'gousses', 'blette',
  'edamame', 'cepe', 'cepes', 'girolle', 'girolles', 'morille', 'morilles', 'shiitake',
  'truffe', 'truffes', 'groseille', 'groseilles', 'cassis', 'grenade', 'litchi', 'papaye',
  'kaki', 'clementine', 'clementines', 'mandarine', 'mandarines', 'combava', 'citronnelle',
  'laurier', 'sauge',
]);

const EPICERIE_WORDS = new Set([
  'pate', 'pates', 'spaghetti', 'spaghettis', 'penne', 'pennes', 'tagliatelle', 'tagliatelles',
  'coquillette', 'coquillettes', 'macaroni', 'macaronis', 'lasagne', 'lasagnes', 'nouille',
  'nouilles', 'riz', 'basmati', 'farine', 'farines', 'fecule', 'maizena', 'semoule', 'quinoa',
  'lentille', 'lentilles', 'huile', 'huiles', 'vinaigre', 'vinaigres', 'moutarde', 'moutardes',
  'mayonnaise', 'ketchup', 'pesto', 'sauce', 'sauces', 'bouillon', 'bouillons', 'epice', 'epices',
  'curry', 'cumin', 'paprika', 'curcuma', 'piment', 'piments', 'sel', 'poivre', 'poivres',
  'cannelle', 'muscade', 'origan', 'sucre', 'sucres', 'cassonade', 'miel', 'confiture', 'confitures',
  'chocolat', 'chocolats', 'cacao', 'amande', 'amandes', 'noix', 'noisette', 'noisettes',
  'pignon', 'pignons', 'sesame', 'olive', 'olives', 'capre', 'capres', 'cornichon', 'cornichons',
  'conserve', 'conserves', 'bocal', 'bocaux', 'harissa', 'tabasco', 'sriracha', 'wasabi',
  'bicarbonate', 'gelatine', 'agar', 'amidon', 'avoine', 'muesli', 'granola', 'cereale',
  'cereales', 'couscous', 'boulgour', 'polenta', 'ble', 'chia', 'lin', 'cacahuete', 'cacahuetes',
  'pistache', 'pistaches', 'dattes', 'pruneaux', 'raisins secs', 'compote', 'compotes',
  'biscuit', 'biscuits', 'cookie', 'cookies', 'gateau', 'gateaux', 'madeleine', 'madeleines',
  'speculoos', 'chips', 'kinder', 'nutella', 'bonbon', 'bonbons', 'barre', 'barres', 'confiserie',
]);

/**
 * Détermine le rayon de supermarché pour un nom d'ingrédient donné.
 * Algorithme hiérarchique en 3 passes :
 * 1. Phrases composées ciblées (évite les collisions de sous-mots)
 * 2. Découpage en tokens avec correspondance exacte
 * 3. Préfixes lexicaux pour variantes plurielles ou dérivées
 */
export function classifyIngredientAisle(ingredientName: string): ShoppingAisle {
  if (!ingredientName || !ingredientName.trim()) {
    return 'Autre';
  }

  const norm = normalizeString(ingredientName);

  // ---------------------------------------------------------
  // PASSE 1 : Correspondance sur les phrases composées
  // ---------------------------------------------------------
  for (const { phrase, aisle } of COMPOUND_PHRASES) {
    if (norm.includes(phrase)) {
      return aisle;
    }
  }

  // ---------------------------------------------------------
  // PASSE 2 : Découpage en tokens & match unitaire exact
  // ---------------------------------------------------------
  const tokens = norm
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);

  // Priorité Surgelés
  for (const token of tokens) {
    if (SURGELES_WORDS.has(token)) return 'Surgelés';
  }

  // Priorité Boissons
  for (const token of tokens) {
    if (BOISSONS_WORDS.has(token)) return 'Boissons';
  }

  // Priorité Boucherie & Poissonnerie
  for (const token of tokens) {
    if (BOUCHERIE_WORDS.has(token)) return 'Boucherie & Poissonnerie';
  }

  // Priorité Produits Frais & Crèmerie
  for (const token of tokens) {
    if (CREMERIE_WORDS.has(token)) return 'Produits Frais & Crèmerie';
  }

  // Priorité Boulangerie & Pâtisserie
  for (const token of tokens) {
    if (BOULANGERIE_WORDS.has(token)) return 'Boulangerie & Pâtisserie';
  }

  // Priorité Fruits & Légumes
  for (const token of tokens) {
    if (FRUITS_LEGUMES_WORDS.has(token)) return 'Fruits & Légumes';
  }

  // Priorité Épicerie & Condiments
  for (const token of tokens) {
    if (EPICERIE_WORDS.has(token)) return 'Épicerie & Condiments';
  }

  // ---------------------------------------------------------
  // PASSE 3 : Préfixes et correspondances partielles sécurisées
  // ---------------------------------------------------------
  for (const token of tokens) {
    if (token.length >= 4) {
      if (token.startsWith('choc') || token.startsWith('epice') || token.startsWith('farine') || token.startsWith('sucre')) {
        return 'Épicerie & Condiments';
      }
      if (token.startsWith('fromag') || token.startsWith('yaourt') || token.startsWith('creme')) {
        return 'Produits Frais & Crèmerie';
      }
      if (token.startsWith('poulet') || token.startsWith('saumon') || token.startsWith('viand') || token.startsWith('saucis')) {
        return 'Boucherie & Poissonnerie';
      }
      if (token.startsWith('tomate') || token.startsWith('oignon') || token.startsWith('carot') || token.startsWith('courget') || token.startsWith('pomme')) {
        return 'Fruits & Légumes';
      }
    }
  }

  return 'Autre';
}
