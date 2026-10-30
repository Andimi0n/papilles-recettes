import { CanonicalIngredient, AllergenFamily } from '../types/vocabulary';
import { ShoppingAisle } from '../types/shopping';

interface SeedIngredientDef {
  name: string;
  aisle: ShoppingAisle;
  aliases: string[];
  isPantryStaple?: boolean;
  allergen?: AllergenFamily;
  secondaryAllergens?: AllergenFamily[];
  density?: number; // Densité en g/ml (ex: 1.0 pour eau/lait, 0.57 pour farine, 0.85 pour sucre, 0.92 pour huile...)
}

const RAW_SEED_INGREDIENTS: SeedIngredientDef[] = [
  // =========================================================================
  // 1. FRUITS & LÉGUMES
  // =========================================================================
  {
    name: 'Petits pois',
    aisle: 'Fruits & Légumes',
    aliases: ['petit pois', 'pois', 'petits pois frais'],
  },
  {
    name: 'Gingembre',
    aisle: 'Fruits & Légumes',
    aliases: ['gingembre frais', 'racine de gingembre', 'gingembre rape'],
  },
  {
    name: 'Carotte',
    aisle: 'Fruits & Légumes',
    aliases: ['carottes', 'carotte epluchee', 'carottes epluchees', 'carotte rapee', 'carottes rapees', 'carottes en des', 'carotte des sables'],
  },
  {
    name: 'Tomate',
    aisle: 'Fruits & Légumes',
    aliases: ['tomates', 'tomate grappe', 'tomate fraiche', 'tomates fraiches'],
  },
  {
    name: 'Tomates cerises',
    aisle: 'Fruits & Légumes',
    aliases: ['tomate cerise', 'tomates cerise', 'barquette de tomates cerises'],
  },
  {
    name: 'Oignon',
    aisle: 'Fruits & Légumes',
    aliases: ['oignons', 'oignon jaune', 'oignon rouge', 'oignon blanc', 'oignons jaunes', 'oignons rouges', 'oignons blancs', 'oignon emince', 'oignon epluche'],
  },
  {
    name: 'Ail',
    aisle: 'Fruits & Légumes',
    aliases: ['gousse d ail', 'gousses d ail', 'tete d ail', 'ail epluche', 'ail hache', 'gousses ail', 'gousse ail'],
  },
  {
    name: 'Échalote',
    aisle: 'Fruits & Légumes',
    aliases: ['echalotes', 'echalote', 'echalote epluchee', 'echalote hachee'],
  },
  {
    name: 'Pomme de terre',
    aisle: 'Fruits & Légumes',
    aliases: ['pommes de terre', 'patate', 'patates', 'pdt', 'grenaille', 'grenailles', 'pomme de terre epluchee', 'pommes de terre epluchees'],
  },
  {
    name: 'Patate douce',
    aisle: 'Fruits & Légumes',
    aliases: ['patates douces'],
  },
  {
    name: 'Courgette',
    aisle: 'Fruits & Légumes',
    aliases: ['courgettes', 'courgette epluchee', 'courgettes en des', 'courgette coupee'],
  },
  {
    name: 'Aubergine',
    aisle: 'Fruits & Légumes',
    aliases: ['aubergines', 'aubergine coupee', 'aubergines grillees'],
  },
  {
    name: 'Poivron',
    aisle: 'Fruits & Légumes',
    aliases: ['poivrons', 'poivron rouge', 'poivron vert', 'poivron jaune', 'poivrons rouges', 'poivron emince'],
  },
  {
    name: 'Poireau',
    aisle: 'Fruits & Légumes',
    aliases: ['poireaux', 'blanc de poireau', 'blancs de poireaux', 'poireau emince'],
  },
  {
    name: 'Champignon de Paris',
    aisle: 'Fruits & Légumes',
    aliases: ['champignon', 'champignons', 'champignons de paris', 'champignon de paris frais', 'champignons eminces', 'champignons frais', 'champignon blanc', 'champignons blancs'],
  },
  {
    name: 'Cèpe',
    aisle: 'Fruits & Légumes',
    aliases: ['cepes', 'bolet', 'bolets', 'cepe frais', 'cepes frais'],
  },
  {
    name: 'Girolle',
    aisle: 'Fruits & Légumes',
    aliases: ['girolles', 'chanterelle', 'chanterelles'],
  },
  {
    name: 'Salade',
    aisle: 'Fruits & Légumes',
    aliases: ['salades', 'laitue', 'batavia', 'mesclun', 'feuilles de salade', 'jeunes pousses', 'salade verte'],
  },
  {
    name: 'Roquette',
    aisle: 'Fruits & Légumes',
    aliases: ['pousses de roquette', 'feuilles de roquette', 'jeunes pousses de roquette'],
  },
  {
    name: 'Concombre',
    aisle: 'Fruits & Légumes',
    aliases: ['concombres', 'concombre epluche', 'tranches de concombre'],
  },
  {
    name: 'Brocoli',
    aisle: 'Fruits & Légumes',
    aliases: ['brocolis', 'fleurettes de brocoli', 'fleurette de brocoli'],
  },
  {
    name: 'Chou-fleur',
    aisle: 'Fruits & Légumes',
    aliases: ['chou fleur', 'choux fleur', 'fleurettes de chou fleur'],
  },
  {
    name: 'Épinard',
    aisle: 'Fruits & Légumes',
    aliases: ['epinards', 'epinards frais', 'pousses d epinard', 'jeunes pousses epinard', 'feuilles d epinards'],
  },
  {
    name: 'Avocat',
    aisle: 'Fruits & Légumes',
    aliases: ['avocats', 'chair d avocat', 'avocat mur'],
  },
  {
    name: 'Céleri',
    aisle: 'Fruits & Légumes',
    aliases: ['branche de celeri', 'branches de celeri', 'celeri branche'],
    allergen: 'celeri',
  },
  {
    name: 'Céleri-rave',
    aisle: 'Fruits & Légumes',
    aliases: ['celeri rave', 'boule de celeri rave'],
    allergen: 'celeri',
  },
  {
    name: 'Haricot vert',
    aisle: 'Fruits & Légumes',
    aliases: ['haricots verts', 'haricots verts frais', 'haricots plats'],
  },
  {
    name: 'Radis',
    aisle: 'Fruits & Légumes',
    aliases: ['radis rose', 'radis noir', 'botte de radis'],
  },
  {
    name: 'Navet',
    aisle: 'Fruits & Légumes',
    aliases: ['navets', 'navet epluche'],
  },
  {
    name: 'Potimarron',
    aisle: 'Fruits & Légumes',
    aliases: ['potimarrons', 'potiron', 'potirons'],
  },
  {
    name: 'Courge butternut',
    aisle: 'Fruits & Légumes',
    aliases: ['butternut', 'courges butternut', 'doubeurre'],
  },
  {
    name: 'Citron',
    aisle: 'Fruits & Légumes',
    aliases: ['citrons', 'jus de citron', 'zeste de citron', 'citron jaune', 'citrons jaunes'],
  },
  {
    name: 'Citron vert',
    aisle: 'Fruits & Légumes',
    aliases: ['citrons verts', 'lime', 'limes', 'jus de citron vert', 'zeste de citron vert'],
  },
  {
    name: 'Pomme',
    aisle: 'Fruits & Légumes',
    aliases: ['pommes', 'pomme golden', 'pomme granny', 'pomme epluchee', 'quartiers de pomme'],
  },
  {
    name: 'Banane',
    aisle: 'Fruits & Légumes',
    aliases: ['bananes', 'banane mure', 'bananes epluchees'],
  },
  {
    name: 'Orange',
    aisle: 'Fruits & Légumes',
    aliases: ['oranges', 'jus d orange', 'zeste d orange'],
  },
  {
    name: 'Fraise',
    aisle: 'Fruits & Légumes',
    aliases: ['fraises', 'fraises fraiches', 'barquette de fraises'],
  },
  {
    name: 'Framboise',
    aisle: 'Fruits & Légumes',
    aliases: ['framboises', 'framboises fraiches', 'barquette de framboises'],
  },
  {
    name: 'Poire',
    aisle: 'Fruits & Légumes',
    aliases: ['poires', 'poire epluchee'],
  },
  {
    name: 'Betterave',
    aisle: 'Fruits & Légumes',
    aliases: ['betteraves', 'betterave rouge', 'betteraves rouges', 'betterave cuite', 'betteraves cuites'],
  },
  {
    name: 'Fenouil',
    aisle: 'Fruits & Légumes',
    aliases: ['fenouils', 'bulbe de fenouil', 'bulbes de fenouil'],
  },
  {
    name: 'Asperge',
    aisle: 'Fruits & Légumes',
    aliases: ['asperges', 'asperges vertes', 'asperge verte', 'asperges blanches', 'asperge blanche', 'pointes d asperges', 'botte d asperges'],
  },
  {
    name: 'Artichaut',
    aisle: 'Fruits & Légumes',
    aliases: ['artichauts', 'fond d artichaut', 'fonds d artichauts', 'coeurs d artichaut', 'coeur d artichaut'],
  },
  {
    name: 'Chou vert',
    aisle: 'Fruits & Légumes',
    aliases: ['chou', 'choux', 'chou frise'],
  },
  {
    name: 'Choux de Bruxelles',
    aisle: 'Fruits & Légumes',
    aliases: ['chou de bruxelles'],
  },
  {
    name: 'Endive',
    aisle: 'Fruits & Légumes',
    aliases: ['endives', 'chicon', 'chicons'],
  },
  {
    name: 'Mâche',
    aisle: 'Fruits & Légumes',
    aliases: ['mache', 'salade de mache', 'feuilles de mache'],
  },
  {
    name: 'Pêche',
    aisle: 'Fruits & Légumes',
    aliases: ['peche', 'peches', 'peche jaune', 'peches jaunes', 'peche blanche', 'nectarine', 'nectarines'],
  },
  {
    name: 'Abricot',
    aisle: 'Fruits & Légumes',
    aliases: ['abricots', 'abricot frais', 'abricots frais', 'oreillons d abricots'],
  },
  {
    name: 'Cerise',
    aisle: 'Fruits & Légumes',
    aliases: ['cerises', 'cerises fraiches'],
  },
  {
    name: 'Kiwi',
    aisle: 'Fruits & Légumes',
    aliases: ['kiwis', 'kiwi vert'],
  },
  {
    name: 'Mangue',
    aisle: 'Fruits & Légumes',
    aliases: ['mangues', 'mangue fraiche'],
  },
  {
    name: 'Ananas',
    aisle: 'Fruits & Légumes',
    aliases: ['ananas frais', 'tranches d ananas'],
  },
  {
    name: 'Raisin',
    aisle: 'Fruits & Légumes',
    aliases: ['raisins', 'grappe de raisin', 'raisin blanc', 'raisin noir'],
  },
  {
    name: 'Melon',
    aisle: 'Fruits & Légumes',
    aliases: ['melons', 'melon charentais', 'demi melon'],
  },
  {
    name: 'Pastèque',
    aisle: 'Fruits & Légumes',
    aliases: ['pasteque', 'pasteques', 'tranche de pasteque'],
  },
  {
    name: 'Figue',
    aisle: 'Fruits & Légumes',
    aliases: ['figues', 'figue fraiche', 'figues fraiches'],
  },
  {
    name: 'Prune',
    aisle: 'Fruits & Légumes',
    aliases: ['prunes', 'quetsche', 'quetsches', 'mirabelle', 'mirabelles', 'reine claude'],
  },
  {
    name: 'Clémentine',
    aisle: 'Fruits & Légumes',
    aliases: ['clementine', 'clementines', 'mandarine', 'mandarines'],
  },
  {
    name: 'Pamplemousse',
    aisle: 'Fruits & Légumes',
    aliases: ['pamplemousses', 'pomelo', 'pomelos', 'jus de pamplemousse'],
  },
  {
    name: 'Basilic',
    aisle: 'Fruits & Légumes',
    aliases: ['feuilles de basilic', 'feuille de basilic', 'basilic frais', 'basilic cisele'],
  },
  {
    name: 'Persil',
    aisle: 'Fruits & Légumes',
    aliases: ['persil plat', 'persil frise', 'persil frais', 'persil hache', 'brins de persil'],
  },
  {
    name: 'Coriandre',
    aisle: 'Fruits & Légumes',
    aliases: ['coriandre fraiche', 'feuilles de coriandre'],
  },
  {
    name: 'Ciboulette',
    aisle: 'Fruits & Légumes',
    aliases: ['brins de ciboulette', 'ciboulette fraiche', 'ciboulette ciselee'],
  },
  {
    name: 'Menthe',
    aisle: 'Fruits & Légumes',
    aliases: ['feuilles de menthe', 'menthe fraiche', 'brins de menthe'],
  },
  {
    name: 'Aneth',
    aisle: 'Fruits & Légumes',
    aliases: ['aneth frais', 'brins d aneth'],
  },
  {
    name: 'Estragon',
    aisle: 'Fruits & Légumes',
    aliases: ['estragon frais', 'feuilles d estragon'],
  },

  // --- ALLIACÉS & RACINES ---
  {
    name: 'Oignon nouveau',
    aisle: 'Fruits & Légumes',
    aliases: ['oignons nouveaux', 'cebette', 'cebettes', 'ciboule', 'oignon vert', 'oignons verts', 'oignon tige', 'botte d oignons nouveaux'],
  },
  {
    name: 'Panais',
    aisle: 'Fruits & Légumes',
    aliases: ['panais epluche', 'panais en des'],
  },
  {
    name: 'Topinambour',
    aisle: 'Fruits & Légumes',
    aliases: ['topinambours', 'artichaut de jerusalem'],
  },
  {
    name: 'Rutabaga',
    aisle: 'Fruits & Légumes',
    aliases: ['rutabagas', 'chou navet'],
  },
  {
    name: 'Salsifis',
    aisle: 'Fruits & Légumes',
    aliases: ['scorsonere', 'scorsoneres'],
  },
  {
    name: 'Crosne',
    aisle: 'Fruits & Légumes',
    aliases: ['crosnes'],
  },

  // --- CHOUX & FEUILLES ---
  {
    name: 'Chou rouge',
    aisle: 'Fruits & Légumes',
    aliases: ['choux rouges', 'chou rouge emince', 'chou rouge rape'],
  },
  {
    name: 'Chou blanc',
    aisle: 'Fruits & Légumes',
    aliases: ['choux blancs', 'chou blanc emince'],
  },
  {
    name: 'Chou kale',
    aisle: 'Fruits & Légumes',
    aliases: ['kale', 'feuilles de kale', 'chou frise kale'],
  },
  {
    name: 'Chou chinois',
    aisle: 'Fruits & Légumes',
    aliases: ['pak choi', 'bok choy', 'pe tsai', 'chou pak choi'],
  },
  {
    name: 'Chou romanesco',
    aisle: 'Fruits & Légumes',
    aliases: ['romanesco', 'fleurettes de romanesco'],
  },
  {
    name: 'Blette',
    aisle: 'Fruits & Légumes',
    aliases: ['blettes', 'bette', 'bettes', 'carde', 'cardes', 'cote de blette', 'cotes de blettes', 'feuilles de blette'],
  },
  {
    name: 'Cresson',
    aisle: 'Fruits & Légumes',
    aliases: ['botte de cresson', 'cresson alénois', 'cresson de fontaine'],
  },
  {
    name: 'Oseille',
    aisle: 'Fruits & Légumes',
    aliases: ['feuilles d oseille', 'oseille fraiche'],
  },
  {
    name: 'Sucrine',
    aisle: 'Fruits & Légumes',
    aliases: ['sucrines', 'coeur de sucrine', 'salade romaine', 'romaine'],
  },
  {
    name: 'Frisée',
    aisle: 'Fruits & Légumes',
    aliases: ['salade frisee', 'scarole'],
  },

  // --- LÉGUMES DU SOLEIL, COURGES & GOUSSES ---
  {
    name: 'Courge spaghetti',
    aisle: 'Fruits & Légumes',
    aliases: ['courges spaghetti'],
  },
  {
    name: 'Piment frais',
    aisle: 'Fruits & Légumes',
    aliases: ['piment', 'piments', 'piment rouge', 'piment vert', 'piment oiseau', 'piment jalapeno', 'piment habanero'],
  },
  {
    name: 'Fève',
    aisle: 'Fruits & Légumes',
    aliases: ['feves', 'feves fraiches', 'feves ecossées'],
  },
  {
    name: 'Pois gourmand',
    aisle: 'Fruits & Légumes',
    aliases: ['pois gourmands', 'mange tout', 'pois mange tout'],
  },
  {
    name: 'Haricot blanc frais',
    aisle: 'Fruits & Légumes',
    aliases: ['coco de paimpol', 'haricots coco', 'mogette fraiche'],
  },
  {
    name: 'Maïs frais',
    aisle: 'Fruits & Légumes',
    aliases: ['epi de mais', 'epis de mais'],
  },
  {
    name: 'Pousses de bambou',
    aisle: 'Fruits & Légumes',
    aliases: ['pousse de bambou'],
  },
  {
    name: 'Germes de soja',
    aisle: 'Fruits & Légumes',
    aliases: ['pousses de soja', 'haricot mungo germe', 'pousses de haricot mungo'],
  },

  // --- CHAMPIGNONS ---
  {
    name: 'Shiitaké',
    aisle: 'Fruits & Légumes',
    aliases: ['shiitake', 'shiitakes', 'champignon shiitake', 'lentins du chene'],
  },
  {
    name: 'Pleurote',
    aisle: 'Fruits & Légumes',
    aliases: ['pleurotes'],
  },
  {
    name: 'Morille',
    aisle: 'Fruits & Légumes',
    aliases: ['morilles', 'morilles fraiches', 'morilles sechees'],
  },

  // --- HERBES AROMATIQUES FRAÎCHES ---
  {
    name: 'Sauge',
    aisle: 'Fruits & Légumes',
    aliases: ['feuilles de sauge', 'sauge fraiche'],
  },
  {
    name: 'Cerfeuil',
    aisle: 'Fruits & Légumes',
    aliases: ['cerfeuil frais', 'brins de cerfeuil', 'pluches de cerfeuil'],
  },
  {
    name: 'Citronnelle',
    aisle: 'Fruits & Légumes',
    aliases: ['tige de citronnelle', 'tiges de citronnelle', 'baton de citronnelle'],
  },
  {
    name: 'Verveine',
    aisle: 'Fruits & Légumes',
    aliases: ['feuilles de verveine', 'verveine fraiche'],
  },

  // --- FRUITS & FRUITS ROUGES ---
  {
    name: 'Myrtille',
    aisle: 'Fruits & Légumes',
    aliases: ['myrtilles', 'barquette de myrtilles', 'bleuet', 'bleuets'],
  },
  {
    name: 'Mûre',
    aisle: 'Fruits & Légumes',
    aliases: ['mure', 'mures', 'mures sauvages'],
  },
  {
    name: 'Groseille',
    aisle: 'Fruits & Légumes',
    aliases: ['groseilles', 'grappes de groseilles'],
  },
  {
    name: 'Cassis',
    aisle: 'Fruits & Légumes',
    aliases: ['baies de cassis'],
  },
  {
    name: 'Rhubarbe',
    aisle: 'Fruits & Légumes',
    aliases: ['tiges de rhubarbe', 'rhubarbe coupee'],
  },
  {
    name: 'Grenade',
    aisle: 'Fruits & Légumes',
    aliases: ['grenades', 'grains de grenade', 'graines de grenade'],
  },
  {
    name: 'Fruit de la passion',
    aisle: 'Fruits & Légumes',
    aliases: ['fruits de la passion', 'maracuja', 'pulpe de fruit de la passion'],
  },
  {
    name: 'Noix de coco',
    aisle: 'Fruits & Légumes',
    aliases: ['noix de coco fraiche', 'chair de noix de coco'],
  },
  {
    name: 'Litchi',
    aisle: 'Fruits & Légumes',
    aliases: ['litchis', 'lychee'],
  },
  {
    name: 'Kaki',
    aisle: 'Fruits & Légumes',
    aliases: ['kakis', 'kaki persimon'],
  },
  {
    name: 'Coing',
    aisle: 'Fruits & Légumes',
    aliases: ['coings'],
  },
  {
    name: 'Châtaigne',
    aisle: 'Fruits & Légumes',
    aliases: ['chataignes', 'marron', 'marrons', 'marrons cuits', 'bocal de marrons'],
  },

  // =========================================================================
  // 2. PRODUITS FRAIS & CRÈMERIE
  // =========================================================================
  {
    name: 'Œufs',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['oeuf', 'oeufs', 'oeufs frais', 'oeufs entiers', 'oeuf entier', 'blanc d oeuf', 'blancs d oeufs', 'jaune d oeuf', 'jaunes d oeufs'],
    allergen: 'oeufs',
  },
  {
    name: 'Beurre',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['beurres', 'beurre doux', 'beurre demi sel', 'beurre fondu', 'beurre tendre', 'noix de beurre'],
    allergen: 'lait',
    density: 0.95,
  },
  {
    name: 'Margarine',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['margarines', 'margarine vegetale', 'beurre vegetal'],
    density: 0.95,
  },
  {
    name: 'Crème fraîche',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['creme fraiche', 'cremes fraiches', 'creme liquide', 'creme epaisse', 'creme fleurette', 'creme entiere', 'brique de creme'],
    allergen: 'lait',
    density: 1.0,
  },
  {
    name: 'Lait',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['laits', 'lait demi ecreme', 'lait entier', 'lait ecreme', 'bouteille de lait'],
    allergen: 'lait',
    density: 1.03,
  },
  {
    name: 'Fromage râpé',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage rape', 'sachet de fromage rape'],
    allergen: 'lait',
  },
  {
    name: 'Parmesan',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['parmesan rape', 'parmigiano', 'parmigiano reggiano', 'grana padano', 'copeaux de parmesan'],
    allergen: 'lait',
  },
  {
    name: 'Mozzarella',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['mozza', 'boule de mozzarella', 'mozzarella di bufala'],
    allergen: 'lait',
  },
  {
    name: 'Burrata',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['burrata di bufala', 'boule de burrata'],
    allergen: 'lait',
  },
  {
    name: 'Emmental',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['emmental francais', 'emmental rape', 'fromage a pate dure'],
    allergen: 'lait',
  },
  {
    name: 'Comté',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['comte', 'comte jeune', 'comte affine'],
    allergen: 'lait',
  },
  {
    name: 'Chèvre',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage de chevre', 'buche de chevre', 'crottin de chavignol'],
    allergen: 'lait',
  },
  {
    name: 'Feta',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage feta', 'feta grecque', 'bloc de feta'],
    allergen: 'lait',
  },
  {
    name: 'Cheddar',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage cheddar', 'cheddar rape', 'tranches de cheddar'],
    allergen: 'lait',
  },
  {
    name: 'Mascarpone',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['pot de mascarpone'],
    allergen: 'lait',
  },
  {
    name: 'Ricotta',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['pot de ricotta'],
    allergen: 'lait',
  },
  {
    name: 'Yaourt',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['yaourts', 'yogourt', 'yaourt nature', 'yaourt grec', 'pot de yaourt'],
    allergen: 'lait',
    density: 1.05,
  },
  {
    name: 'Fromage frais',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['saint moret', 'philadelphia', 'fromage a tartiner'],
    allergen: 'lait',
  },
  {
    name: 'Reblochon',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage reblochon', 'demi reblochon'],
    allergen: 'lait',
  },
  {
    name: 'Fromage à raclette',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['raclette', 'tranches de raclette', 'fromage raclette'],
    allergen: 'lait',
  },
  {
    name: 'Tofu',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['tofu soyeux', 'tofu ferme', 'tofu fume', 'tofu nature', 'bloc de tofu'],
    allergen: 'soja',
  },
  {
    name: 'Fromage blanc',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage blanc battu', 'pot de fromage blanc', 'faisselle'],
    allergen: 'lait',
  },
  {
    name: 'Camembert',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['boite de camembert', 'camembert au lait cru', 'portion de camembert'],
    allergen: 'lait',
  },
  {
    name: 'Brie',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['brie de meaux', 'pointe de brie'],
    allergen: 'lait',
  },
  {
    name: 'Roquefort',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['bleu d auvergne', 'fourme d ambert', 'gorgonzola', 'fromage bleu'],
    allergen: 'lait',
  },
  {
    name: 'Gruyère',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['gruyere suisse', 'gruyere francais', 'gruyere rape'],
    allergen: 'lait',
  },
  {
    name: 'Gnocchis',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['gnocchi', 'gnocchis a poeler'],
    allergen: 'gluten',
    secondaryAllergens: ['oeufs', 'lait']
  },
  // --- CRÈMERIE & SUBSTITUTS ---
  {
    name: 'Lait ribot',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['babeurre', 'lait fermente', 'buttermilk'],
    allergen: 'lait',
    density: 1.03,
  },
  {
    name: 'Lait concentré sucré',
    aisle: 'Épicerie & Condiments',
    aliases: ['lait concentre', 'boite de lait concentre sucre'],
    allergen: 'lait',
    density: 1.30,
  },
  {
    name: 'Lait concentré non sucré',
    aisle: 'Épicerie & Condiments',
    aliases: ['lait concentre non sucre', 'Gloria'],
    allergen: 'lait',
    density: 1.07,
  },
  {
    name: 'Crème végétale',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['creme de soja', 'creme d avoine', 'creme de riz'],
    allergen: 'soja',
    density: 1.0,
  },
  {
    name: 'Graisse de canard',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['graisse d oie', 'pot de graisse de canard'],
    density: 0.92,
  },
  {
    name: 'Saindoux',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['graisse de porc'],
    density: 0.92,
  },

  // --- FROMAGES ITALIENS, GRECS & DU MONDE ---
  {
    name: 'Pecorino',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['pecorino romano', 'pecorino rape', 'fromage pecorino'],
    allergen: 'lait',
  },
  {
    name: 'Gorgonzola',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage gorgonzola', 'gorgonzola piccante', 'gorgonzola dolce'],
    allergen: 'lait',
  },
  {
    name: 'Halloumi',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage halloumi', 'halloumi a griller'],
    allergen: 'lait',
  },
  {
    name: 'Scamorza',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['scamorza fumee', 'provolone'],
    allergen: 'lait',
  },
  {
    name: 'Cottage cheese',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage cottage', 'brousse', 'brocciu'],
    allergen: 'lait',
  },

  // --- FROMAGES FRANÇAIS & DE TERROIR ---
  {
    name: 'Cantal',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['cantal entre deux', 'cantal jeune', 'salers', 'laguiole'],
    allergen: 'lait',
  },
  {
    name: 'Morbier',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage morbier', 'tranches de morbier'],
    allergen: 'lait',
  },
  {
    name: 'Saint-Nectaire',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['saint nectaire', 'st nectaire'],
    allergen: 'lait',
  },
  {
    name: 'Munster',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage munster', 'maroilles', 'epoisses'],
    allergen: 'lait',
  },
  {
    name: 'Tomme',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['tomme de savoie', 'tomme de brebis', 'ossau iraty', 'tome fraiche'],
    allergen: 'lait',
  },
  {
    name: 'Beaufort',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage beaufort', 'abondance'],
    allergen: 'lait',
  },
  {
    name: 'Boursin',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['fromage ail et fines herbes', 'tartare', 'madame loik'],
    allergen: 'lait',
  },
  {
    name: 'Vache qui rit',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['portions de vache qui rit', 'kiri'],
    allergen: 'lait',
  },

  // --- TRAITEUR FRAIS ---
  {
    name: 'Ravioles',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['ravioles du dauphine', 'ravioles du royans', 'plaques de ravioles', 'raviolis frais'],
    allergen: 'gluten',
    secondaryAllergens: ['oeufs', 'lait'],
  },
  {
    name: 'Quenelle',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['quenelles', 'quenelles de brochet', 'quenelles de volaille', 'quenelles nature'],
    allergen: 'gluten',
    secondaryAllergens: ['oeufs', 'lait', 'poissons'],
  },
  {
    name: 'Seitan',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['bloc de seitan', 'eminces de seitan'],
    allergen: 'gluten',
  },
  {
    name: 'Tempeh',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['bloc de tempeh'],
    allergen: 'soja',
  },

  // =========================================================================
  // 3. BOUCHERIE & POISSONNERIE
  // =========================================================================
  {
    name: 'Poulet',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['blanc de poulet', 'blancs de poulet', 'filet de poulet', 'filets de poulet', 'cuisse de poulet', 'cuisses de poulet', 'escalope de poulet', 'escalopes de poulet', 'morceaux de poulet', 'aiguillettes de poulet', 'poulet emince'],
  },
  {
    name: 'Bœuf',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['viande bovine', 'bavette', 'entrecote', 'rumsteck', 'paleron', 'bourguignon', 'morceaux de boeuf'],
  },
  {
    name: 'Steak haché',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['steaks haches', 'steak', 'steaks', 'viande hachee', 'viande de boeuf hachee'],
  },
  {
    name: 'Lardon',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['lardons', 'lardons fumes', 'lardons nature', 'barquette de lardons', 'poitrine fumee', 'pancetta'],
  },
  {
    name: 'Jambon',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['jambons', 'jambon blanc', 'jambon de paris', 'tranches de jambon', 'tranche de jambon', 'des de jambon'],
  },
  {
    name: 'Jambon cru',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['jambon de parme', 'jambon serrano', 'prosciutto', 'chiffonnade de jambon cru'],
  },
  {
    name: 'Porc',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['cote de porc', 'cotes de porc', 'filet mignon', 'filet mignon de porc', 'mignon de porc', 'mignons de porc', 'echine de porc', 'roti de porc'],
  },
  {
    name: 'Saucisse',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['saucisses', 'chipolata', 'chipolatas', 'saucisse de toulouse', 'saucisse de morteau', 'saucisse de montbeliard'],
  },
  {
    name: 'Chair à saucisse',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['chair a saucisses', 'chair a farce'],
  },
  {
    name: 'Merguez',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['merguez de boeuf', 'merguez d agneau'],
  },
  {
    name: 'Chorizo',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['chorizo doux', 'chorizo fort', 'tranches de chorizo', 'des de chorizo'],
  },
  {
    name: 'Veau',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['escalope de veau', 'escalopes de veau', 'roti de veau', 'morceaux de veau', 'blanquette de veau', 'saute de veau'],
  },
  {
    name: 'Saumon',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['pave de saumon', 'paves de saumon', 'filet de saumon', 'filets de saumon', 'saumon frais', 'darne de saumon'],
    allergen: 'poissons',
  },
  {
    name: 'Saumon fumé',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['tranches de saumon fume', 'chutes de saumon fume'],
    allergen: 'poissons',
  },
  {
    name: 'Thon',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['pave de thon', 'paves de thon', 'filet de thon', 'thon frais', 'darne de thon'],
    allergen: 'poissons',
  },
  {
    name: 'Cabillaud',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['dos de cabillaud', 'filet de cabillaud', 'filets de cabillaud', 'colin', 'merlu'],
    allergen: 'poissons',
  },
  {
    name: 'Crevette',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['crevettes', 'crevettes roses', 'crevettes decortiquees', 'gambas', 'scampis'],
    allergen: 'crustaces',
  },
  {
    name: 'Crabe',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['chair de crabe', 'miettes de crabe', 'tourteau', 'araignee de mer'],
    allergen: 'crustaces',
  },
  {
    name: 'Moule',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['moules', 'moules fraiches', 'moules de bouchot', 'moules cuites'],
    allergen: 'mollusques',
  },
  {
    name: 'Huître',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['huitres', 'huitres fraiches'],
    allergen: 'mollusques',
  },
  {
    name: 'Dinde',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['escalope de dinde', 'escalopes de dinde', 'filet de dinde', 'filets de dinde', 'cuisse de dinde', 'roti de dinde'],
  },
  {
    name: 'Canard',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['magret de canard', 'magrets de canard', 'cuisse de canard', 'cuisses de canard', 'cuisses de canard confites', 'cuisse de canard confite', 'aiguillettes de canard', 'confit de canard'],
  },
  {
    name: 'Agneau',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['gigot d agneau', 'cotelette d agneau', 'cotelettes d agneau', 'epaule d agneau', 'souris d agneau', 'morceaux d agneau'],
  },
  {
    name: 'Lapin',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['cuisse de lapin', 'cuisses de lapin', 'rable de lapin', 'morceaux de lapin'],
  },
  {
    name: 'Saucisson',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['saucissons', 'saucisson sec', 'tranches de saucisson'],
  },
  {
    name: 'Bacon',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['tranches de bacon', 'bacon fume', 'bacons'],
  },
  {
    name: 'Truite',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['truite fumee', 'filet de truite', 'filets de truite', 'truite fraiche'],
    allergen: 'poissons',
  },
  {
    name: 'Dorade',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['dorades', 'daurade', 'filet de dorade', 'filet de daurade', 'dorade royale'],
    allergen: 'poissons',
  },
  {
    name: 'Bar',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['loup de mer', 'filet de bar', 'filets de bar', 'bar frais'],
    allergen: 'poissons',
  },
  {
    name: 'Sardine',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['sardines', 'sardines fraiches'],
    allergen: 'poissons',
  },
  {
    name: 'Maquereau',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['maquereaux', 'filets de maquereau', 'filet de maquereau'],
    allergen: 'poissons',
  },
  {
    name: 'Anchois',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['filets d anchois', 'anchois a l huile', 'anchois sales'],
    allergen: 'poissons',
  },
  {
    name: 'Coquille Saint-Jacques',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['saint jacques', 'noix de saint jacques', 'coquilles saint jacques', 'noix de saint jacques fraiches'],
    allergen: 'mollusques',
  },
  {
    name: 'Calmar',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['calmars', 'encornet', 'encornets', 'seiche', 'anneaux d encornets'],
    allergen: 'mollusques',
  },
  // --- CHARCUTERIE & BOUCHERIE ---
  {
    name: 'Guanciale',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['joue de porc', 'lard italien'],
  },
  {
    name: 'Pancetta',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['tranches de pancetta', 'pancetta fumee', 'poitrine roulade'],
  },
  {
    name: 'Viande des Grisons',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['tranches de viande des grisons', 'boeuf seche', 'bresaola'],
  },
  {
    name: 'Saucisse de Francfort',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['knacki', 'saucisses de strasbourg', 'saucisse viennoise', 'saucisses hot dog'],
  },
  {
    name: 'Boudin noir',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['boudins noirs', 'boudin aux pommes'],
  },
  {
    name: 'Boudin blanc',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['boudins blancs'],
    allergen: 'lait',
    secondaryAllergens: ['oeufs'],
  },
  {
    name: 'Andouillette',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['andouillettes', 'andouille', 'andouille de guemene', 'andouille de vire'],
  },
  {
    name: 'Mortadelle',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['tranches de mortadelle', 'salami', 'pepperoni', 'coppa'],
  },
  {
    name: 'Foie gras',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['foie gras de canard', 'foie gras mi cuit', 'foie gras cru', 'tranches de foie gras'],
  },
  {
    name: 'Abats',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['foie de veau', 'foies de volaille', 'rognons', 'ris de veau', 'gesiers', 'gesiers de canard confits', 'tripes'],
  },
  {
    name: 'Caille',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['cailles', 'filets de caille', 'pintade', 'cuisses de pintade', 'chapo', 'coquelet'],
  },

  // --- POISSONNERIE & MER ---
  {
    name: 'Lieu noir',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['filet de lieu noir', 'lieu jaune', 'filet de lieu', 'dos de lieu', 'julienne', 'églefin', 'haddock'],
    allergen: 'poissons',
  },
  {
    name: 'Sole',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['filets de sole', 'limande', 'filet de limande', 'turbot', ' carrelet'],
    allergen: 'poissons',
  },
  {
    name: 'Lotte',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['queue de lotte', 'baudroie', 'joues de lotte', 'medaillons de lotte'],
    allergen: 'poissons',
  },
  {
    name: 'Rouget',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['filets de rouget', 'rouget barbet'],
    allergen: 'poissons',
  },
  {
    name: 'Espadon',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['darne d espadon', 'steak d espadon'],
    allergen: 'poissons',
  },
  {
    name: 'Hareng',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['filets de hareng', 'hareng fume', 'harengs doux'],
    allergen: 'poissons',
  },
  {
    name: 'Poulpe',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['tentacules de poulpe', 'pieuvre', 'poulpe cuit'],
    allergen: 'mollusques',
  },
  {
    name: 'Palourde',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['palourdes', 'coques', 'praires', 'bulots', 'bigorneaux'],
    allergen: 'mollusques',
  },
  {
    name: 'Langoustine',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['langoustines', 'queues de langoustines', 'homard', 'langouste', 'ecrevisse'],
    allergen: 'crustaces',
  },
  {
    name: 'Surimi',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['batonnets de surimi', 'miettes de surimi'],
    allergen: 'poissons',
    secondaryAllergens: ['crustaces', 'oeufs', 'gluten'],
  },
  {
    name: 'Œufs de poisson',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['oeufs de saumon', 'oeufs de truite', 'oeufs de lompe', 'tarama'],
    allergen: 'poissons',
  },

  // =========================================================================
  // 4. ÉPICERIE & CONDIMENTS
  // =========================================================================
  {
    name: 'Farine',
    aisle: 'Épicerie & Condiments',
    aliases: ['farines', 'farine de ble', 'farine t55', 'farine t45', 'farine fluide', 'farine tamisee'],
    allergen: 'gluten',
    density: 0.57,
  },
  {
    name: 'Fécule de maïs',
    aisle: 'Épicerie & Condiments',
    aliases: ['fecule de mais', 'maizena', 'fecule'],
    density: 0.55,
  },
  {
    name: 'Sucre',
    aisle: 'Épicerie & Condiments',
    aliases: ['sucres', 'sucre en poudre', 'sucre semoule', 'sucre blanc'],
    density: 0.85,
  },
  {
    name: 'Sucre glace',
    aisle: 'Épicerie & Condiments',
    aliases: ['sucres glaces', 'sucre impalpable'],
    density: 0.60,
  },
  {
    name: 'Sel',
    aisle: 'Épicerie & Condiments',
    aliases: ['sels', 'sel fin', 'gros sel', 'fleur de sel', 'pincee de sel'],
    isPantryStaple: true,
    density: 1.20,
  },
  {
    name: 'Poivre',
    aisle: 'Épicerie & Condiments',
    aliases: ['poivres', 'poivre moulu', 'poivre du moulin', 'poivre noir', 'tours de moulin a poivre'],
    isPantryStaple: true,
    density: 0.55,
  },
  {
    name: 'Huile d\'olive',
    aisle: 'Épicerie & Condiments',
    aliases: ['huile d olive', 'huile olive', 'huile d olive vierge', 'filet d huile d olive'],
    isPantryStaple: true,
    density: 0.92,
  },
  {
    name: 'Huile de tournesol',
    aisle: 'Épicerie & Condiments',
    aliases: ['huile neutre', 'huile vegetale', 'huile de colza', 'huile de friture', 'huile de cuisson'],
    isPantryStaple: true,
    density: 0.92,
  },
  {
    name: 'Pâtes',
    aisle: 'Épicerie & Condiments',
    aliases: ['pates', 'spaghetti', 'spaghettis', 'penne', 'pennes', 'coquillette', 'coquillettes', 'tagliatelle', 'tagliatelles', 'fusilli', 'fusillis', 'macaroni', 'macaronis', 'linguine', 'linguines', 'farfalle'],
    allergen: 'gluten',
    density: 0.65,
  },
  {
    name: 'Riz',
    aisle: 'Épicerie & Condiments',
    aliases: ['riz basmati', 'riz thai', 'riz rond', 'riz arborio', 'riz long', 'riz blanc'],
    density: 0.85,
  },
  {
    name: 'Muscade',
    aisle: 'Épicerie & Condiments',
    aliases: ['noix de muscade', 'muscade en poudre', 'muscade rapee', 'pincee de muscade', 'noix muscade'],
    isPantryStaple: true,
  },
  {
    name: 'Moutarde',
    aisle: 'Épicerie & Condiments',
    aliases: ['moutarde de dijon', 'moutarde a l ancienne', 'cuillere de moutarde'],
    allergen: 'moutarde',
    density: 1.15,
  },
  {
    name: 'Mayonnaise',
    aisle: 'Épicerie & Condiments',
    aliases: ['mayo', 'sauce mayonnaise', 'pot de mayonnaise'],
    allergen: 'oeufs',
    secondaryAllergens: ['moutarde'],
  },
  {
    name: 'Pesto',
    aisle: 'Épicerie & Condiments',
    aliases: ['pesto alla genovese', 'sauce pesto', 'pesto vert'],
    allergen: 'lait',
    secondaryAllergens: ['fruits_a_coque'],
  },
  {
    name: 'Pesto rosso',
    aisle: 'Épicerie & Condiments',
    aliases: ['pesto rouge']
  },
  {
    name: 'Harissa',
    aisle: 'Épicerie & Condiments',
    aliases: ['tube d harissa', 'pate d harissa'],
  },
  {
    name: 'Vinaigre',
    aisle: 'Épicerie & Condiments',
    aliases: ['vinaigre de vin', 'vinaigre rouge'],
    isPantryStaple: true,
    density: 1.0,
  },
  {
    name: 'Vinaigre balsamique',
    aisle: 'Épicerie & Condiments',
    aliases: ['vinaigre balsamique de modene', 'creme de balsamique'],
    isPantryStaple: true,
    allergen: 'sulfites',
    density: 1.05,
  },
  {
    name: 'Vinaigre de cidre',
    aisle: 'Épicerie & Condiments',
    aliases: ['vinaigre de pomme'],
    isPantryStaple: true,
    density: 1.0,
  },
  {
    name: 'Vinaigre blanc',
    aisle: 'Épicerie & Condiments',
    aliases: ['vinaigre d alcool', 'vinaigre cristal'],
    isPantryStaple: true,
    density: 1.0,
  },
  {
    name: 'Coulis de tomate',
    aisle: 'Épicerie & Condiments',
    aliases: ['sauce tomate', 'puree de tomate', 'pulpe de tomate', 'passata'],
    density: 1.05,
  },
  {
    name: 'Concentré de tomate',
    aisle: 'Épicerie & Condiments',
    aliases: ['concentre de tomates', 'tube de concentre de tomate', 'petite boite de concentre'],
    density: 1.15,
  },
  {
    name: 'Tomates pelées',
    aisle: 'Épicerie & Condiments',
    aliases: ['tomates pelees', 'tomate pelee', 'boite de tomates pelees', 'tomates concassees', 'tomates en des'],
  },
  {
    name: 'Bouquet garni',
    aisle: 'Épicerie & Condiments',
    aliases: ['bouquets garnis'],
    isPantryStaple: true,
  },
  {
    name: 'Ketchup',
    aisle: 'Épicerie & Condiments',
    aliases: ['sauce ketchup'],
  },
  {
    name: 'Levure chimique',
    aisle: 'Épicerie & Condiments',
    aliases: ['sachet de levure chimique', 'poudre a lever', 'levure alsacienne'],
  },
  {
    name: 'Chocolat noir',
    aisle: 'Épicerie & Condiments',
    aliases: ['chocolat', 'chocolat patissier', 'tablette de chocolat noir', 'chocolat dessert', 'chocolat noir patissier'],
    allergen: 'lait',
    secondaryAllergens: ['soja']
  },
  {
    name: 'Chocolat au lait',
    aisle: 'Épicerie & Condiments',
    aliases: ['tablette de chocolat au lait', 'chocolat au lait patissier'],
    allergen: 'lait',
  },
  {
    name: 'Chocolat blanc',
    aisle: 'Épicerie & Condiments',
    aliases: ['tablette de chocolat blanc', 'chocolat blanc patissier'],
    allergen: 'lait',
  },
  {
    name: 'Vanille',
    aisle: 'Épicerie & Condiments',
    aliases: ['gousse de vanille', 'extrait de vanille', 'arome vanille'],
  },
  {
    name: 'Miel',
    aisle: 'Épicerie & Condiments',
    aliases: ['pot de miel', 'miel de fleurs', 'miel d acacia'],
    density: 1.42,
  },
  {
    name: 'Thym',
    aisle: 'Épicerie & Condiments',
    aliases: ['brin de thym', 'brins de thym', 'thym frais', 'thym seche'],
    isPantryStaple: true,
  },
  {
    name: 'Laurier',
    aisle: 'Épicerie & Condiments',
    aliases: ['feuille de laurier', 'feuilles de laurier', 'laurier sauce'],
    isPantryStaple: true,
  },
  {
    name: 'Herbes de Provence',
    aisle: 'Épicerie & Condiments',
    aliases: ['herbe de provence', 'melange d herbes de provence'],
    isPantryStaple: true,
  },
  {
    name: 'Curry',
    aisle: 'Épicerie & Condiments',
    aliases: ['curry en poudre', 'poudre de curry', 'pate de curry'],
    isPantryStaple: true,
  },
  {
    name: 'Cumin',
    aisle: 'Épicerie & Condiments',
    aliases: ['cumin moulu', 'graines de cumin'],
    isPantryStaple: true,
  },
  {
    name: 'Paprika',
    aisle: 'Épicerie & Condiments',
    aliases: ['paprika doux', 'paprika fume'],
    isPantryStaple: true,
  },
  {
    name: 'Cannelle',
    aisle: 'Épicerie & Condiments',
    aliases: ['cannelle en poudre', 'baton de cannelle', 'batons de cannelle'],
    isPantryStaple: true,
  },
  {
    name: 'Curcuma',
    aisle: 'Épicerie & Condiments',
    aliases: ['curcuma en poudre'],
    isPantryStaple: true,
  },
  {
    name: 'Bouillon de volaille',
    aisle: 'Épicerie & Condiments',
    aliases: ['cube de bouillon de volaille', 'bouillon de poule', 'cube de volaille', 'fond de volaille'],
  },
  {
    name: 'Bouillon de légumes',
    aisle: 'Épicerie & Condiments',
    aliases: ['cube de bouillon de legumes', 'bouillon cube', 'cube de bouillon'],
  },
  {
    name: 'Sauce soja',
    aisle: 'Épicerie & Condiments',
    aliases: ['sauce soja salee', 'tamari'],
    allergen: 'soja',
    secondaryAllergens: ['gluten'],
    density: 1.15,
  },
  {
    name: 'Sauce soja sucrée',
    aisle: 'Épicerie & Condiments',
    aliases: ['sauce soja sucree', 'sauce teriyaki'],
    allergen: 'soja',
    secondaryAllergens: ['gluten'],
    density: 1.20,
  },
  {
    name: 'Cacahuète',
    aisle: 'Épicerie & Condiments',
    aliases: ['cacahuetes', 'arachide', 'arachides'],
    allergen: 'arachides',
  },
  {
    name: 'Beurre de cacahuète',
    aisle: 'Épicerie & Condiments',
    aliases: ['beurre de cacahuete', 'beurre de cacahuetes', 'beurre d arachide', 'peanut butter'],
    allergen: 'arachides',
  },
  {
    name: 'Huile d\'arachide',
    aisle: 'Épicerie & Condiments',
    aliases: ['huile d arachide', 'huile arachide'],
    allergen: 'arachides',
    isPantryStaple: true,
    density: 0.92,
  },
  {
    name: 'Sésame',
    aisle: 'Épicerie & Condiments',
    aliases: ['graines de sesame', 'graine de sesame'],
    allergen: 'sesame',
  },
  {
    name: 'Tahin',
    aisle: 'Épicerie & Condiments',
    aliases: ['tahini', 'tahina', 'puree de sesame', 'creme de sesame'],
    allergen: 'sesame',
  },
  {
    name: 'Huile de sésame',
    aisle: 'Épicerie & Condiments',
    aliases: ['huile de sesame', 'huile sesame'],
    allergen: 'sesame',
    isPantryStaple: true,
    density: 0.92,
  },
  {
    name: 'Noix',
    aisle: 'Épicerie & Condiments',
    aliases: ['cerneaux de noix'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Huile de noix',
    aisle: 'Épicerie & Condiments',
    aliases: ['huile de noix'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Noisette',
    aisle: 'Épicerie & Condiments',
    aliases: ['noisettes', 'noisettes entieres'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Amande',
    aisle: 'Épicerie & Condiments',
    aliases: ['amandes', 'amandes effilees', 'amandes entieres'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Purée d\'amande',
    aisle: 'Épicerie & Condiments',
    aliases: ['puree d amande', 'puree d amandes', 'beurre d amande'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Noix de cajou',
    aisle: 'Épicerie & Condiments',
    aliases: ['cajou', 'anacarde'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Pistache',
    aisle: 'Épicerie & Condiments',
    aliases: ['pistaches', 'pistaches emondees'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Pignons de pin',
    aisle: 'Épicerie & Condiments',
    aliases: ['pignon de pin', 'pignons'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Farine de lupin',
    aisle: 'Épicerie & Condiments',
    aliases: ['lupin', 'graines de lupin'],
    allergen: 'lupin',
  },
  {
    name: 'Pois chiche',
    aisle: 'Épicerie & Condiments',
    aliases: ['pois chiches', 'boite de pois chiches', 'bocal de pois chiches'],
  },
  {
    name: 'Haricot rouge',
    aisle: 'Épicerie & Condiments',
    aliases: ['haricots rouges', 'boite de haricots rouges'],
  },
  {
    name: 'Lentille',
    aisle: 'Épicerie & Condiments',
    aliases: ['lentilles', 'lentilles vertes', 'boite de lentilles'],
  },
  {
    name: 'Lentilles corail',
    aisle: 'Épicerie & Condiments',
    aliases: ['lentille corail'],
  },
  {
    name: 'Romarin',
    aisle: 'Épicerie & Condiments',
    aliases: ['brin de romarin', 'brins de romarin', 'romarin frais', 'romarin seche'],
    isPantryStaple: true,
  },
  {
    name: 'Origan',
    aisle: 'Épicerie & Condiments',
    aliases: ['origan seche', 'origan en poudre'],
    isPantryStaple: true,
  },
  {
    name: 'Coriandre moulue',
    aisle: 'Épicerie & Condiments',
    aliases: ['coriandre en poudre', 'graines de coriandre'],
    isPantryStaple: true,
  },
  {
    name: 'Gingembre en poudre',
    aisle: 'Épicerie & Condiments',
    aliases: ['gingembre moulu', 'gingembre seche'],
    isPantryStaple: true,
  },
  {
    name: 'Clou de girofle',
    aisle: 'Épicerie & Condiments',
    aliases: ['clous de girofle', 'girofle'],
    isPantryStaple: true,
  },
  {
    name: 'Piment d\'Espelette',
    aisle: 'Épicerie & Condiments',
    aliases: ['piment d espelette', 'piment espelette', 'poudre de piment d espelette'],
    isPantryStaple: true,
  },
  {
    name: 'Quinoa',
    aisle: 'Épicerie & Condiments',
    aliases: ['quinoa blanc', 'quinoa rouge'],
  },
  {
    name: 'Semoule',
    aisle: 'Épicerie & Condiments',
    aliases: ['couscous', 'graine de couscous', 'semoule de ble', 'semoule moyenne', 'semoule fine'],
    allergen: 'gluten',
    density: 0.80,
  },
  {
    name: 'Boulgour',
    aisle: 'Épicerie & Condiments',
    aliases: ['boulghour', 'bulgur'],
    allergen: 'gluten',
  },
  {
    name: 'Flocons d\'avoine',
    aisle: 'Épicerie & Condiments',
    aliases: ['flocons d avoine', 'avoine', 'porridge'],
    allergen: 'gluten',
    density: 0.40,
  },
  {
    name: 'Chapelure',
    aisle: 'Épicerie & Condiments',
    aliases: ['chapelure doree', 'chapelure fine'],
    allergen: 'gluten',
  },
  {
    name: 'Bouillon de bœuf',
    aisle: 'Épicerie & Condiments',
    aliases: ['bouillon de boeuf', 'cube de bouillon de boeuf', 'fond de boeuf'],
  },
  {
    name: 'Cornichon',
    aisle: 'Épicerie & Condiments',
    aliases: ['cornichons', 'bocal de cornichons'],
  },
  {
    name: 'Câpre',
    aisle: 'Épicerie & Condiments',
    aliases: ['capres'],
  },
  {
    name: 'Olive',
    aisle: 'Épicerie & Condiments',
    aliases: ['olives', 'olives noires', 'olives vertes', 'olives denoyautees'],
  },
  {
    name: 'Thon en boîte',
    aisle: 'Épicerie & Condiments',
    aliases: ['thon en boite', 'boite de thon', 'thon naturel', 'thon au naturel', 'miettes de thon'],
    allergen: 'poissons',
  },
  {
    name: 'Sardines en boîte',
    aisle: 'Épicerie & Condiments',
    aliases: ['boite de sardines', 'sardines a l huile', 'sardines en boite', 'sardines en conserve'],
    allergen: 'poissons',
  },
  {
    name: 'Maquereau en boîte',
    aisle: 'Épicerie & Condiments',
    aliases: ['boite de maquereaux', 'maquereaux en boite', 'maquereau en boite', 'filets de maquereaux en boite', 'maquereaux en conserve'],
    allergen: 'poissons',
  },
  {
    name: 'Petits pois en conserve',
    aisle: 'Épicerie & Condiments',
    aliases: ['boite de petits pois', 'boite de petit pois', 'petits pois en boite'],
  },
  {
    name: 'Haricots verts en conserve',
    aisle: 'Épicerie & Condiments',
    aliases: ['boite de haricots verts', 'haricots verts en boite', 'haricot vert en boite'],
  },
  {
    name: 'Maïs',
    aisle: 'Épicerie & Condiments',
    aliases: ['mais', 'boite de mais', 'grains de mais', 'mais doux'],
  },
  {
    name: 'Lait de coco',
    aisle: 'Épicerie & Condiments',
    aliases: ['creme de coco', 'brique de lait de coco', 'boite de lait de coco'],
    density: 0.97,
  },
  {
    name: 'Cacao en poudre',
    aisle: 'Épicerie & Condiments',
    aliases: ['cacao', 'cacao non sucre', 'cacao amer', 'poudre de cacao'],
    density: 0.50,
  },
  {
    name: 'Cassonade',
    aisle: 'Épicerie & Condiments',
    aliases: ['sucre roux', 'vergeoise', 'sucre de canne'],
    density: 0.85,
  },
  {
    name: 'Sucre vanillé',
    aisle: 'Épicerie & Condiments',
    aliases: ['sucre vanille', 'sachet de sucre vanille', 'sachets de sucre vanille'],
  },
  {
    name: 'Sirop d\'érable',
    aisle: 'Épicerie & Condiments',
    aliases: ['sirop d erable', 'sirop erable'],
    density: 1.33,
  },
  {
    name: 'Confiture',
    aisle: 'Épicerie & Condiments',
    aliases: ['confitures', 'pot de confiture', 'marmelade'],
  },
  {
    name: 'Pâte à tartiner',
    aisle: 'Épicerie & Condiments',
    aliases: ['pate a tartiner', 'nutella'],
    allergen: 'fruits_a_coque',
    secondaryAllergens: ['lait', 'soja'],
  },
  {
    name: 'Compote de pomme',
    aisle: 'Épicerie & Condiments',
    aliases: ['compote de pommes', 'compote', 'pot de compote'],
  },
  {
    name: 'Noix de coco râpée',
    aisle: 'Épicerie & Condiments',
    aliases: ['noix de coco rapee', 'coco rapee', 'noix de coco en poudre'],
  },
  // --- CÉRÉALES, LÉGUMINEUSES & FARINES SPÉCIALES ---
  {
    name: 'Polenta',
    aisle: 'Épicerie & Condiments',
    aliases: ['semoule de mais', 'polenta pre-cuite', 'polenta instantanee'],
    density: 0.75,
  },
  {
    name: 'Farine de sarrasin',
    aisle: 'Épicerie & Condiments',
    aliases: ['farine de ble noir', 'sarrasin', 'kasha'],
    density: 0.55,
  },
  {
    name: 'Farine complète',
    aisle: 'Épicerie & Condiments',
    aliases: ['farine de ble complet', 'farine t110', 'farine t150', 'farine semi complete', 'farine t80', 'farine de seigle', 'farine d epeautre'],
    allergen: 'gluten',
    density: 0.60,
  },
  {
    name: 'Farine de pois chiche',
    aisle: 'Épicerie & Condiments',
    aliases: ['farine de pois chiches', 'besan', 'farine de besan'],
    density: 0.55,
  },
  {
    name: 'Fécule de pomme de terre',
    aisle: 'Épicerie & Condiments',
    aliases: ['fecule de pdt', 'amidon de pomme de terre', 'tapioca', 'perles du japon'],
    density: 0.65,
  },
  {
    name: 'Haricot blanc',
    aisle: 'Épicerie & Condiments',
    aliases: ['haricots blancs', 'boite de haricots blancs', 'haricots tarbais', 'mogettes', 'lingots blancs', 'flageolets', 'boite de flageolets'],
  },
  {
    name: 'Haricot noir',
    aisle: 'Épicerie & Condiments',
    aliases: ['haricots noirs', 'boite de haricots noirs', 'haricots azuki'],
  },
  {
    name: 'Pois cassés',
    aisle: 'Épicerie & Condiments',
    aliases: ['pois casse', 'feves seches'],
  },
  {
    name: 'Blé précuit',
    aisle: 'Épicerie & Condiments',
    aliases: ['ebly', 'ble dur precuit', 'orge perle', 'petit epeautre', 'freekeh'],
    allergen: 'gluten',
  },
  {
    name: 'Lasagnes',
    aisle: 'Épicerie & Condiments',
    aliases: ['feuilles de lasagne', 'plaques de lasagnes', 'pates a lasagne'],
    allergen: 'gluten',
    secondaryAllergens: ['oeufs'],
  },
  {
    name: 'Crozet',
    aisle: 'Épicerie & Condiments',
    aliases: ['crozets', 'crozets au sarrasin', 'crozets nature'],
    allergen: 'gluten',
    secondaryAllergens: ['oeufs'],
  },

  // --- AIDES À LA PÂTISSERIE & SUCRANTS ---
  {
    name: 'Bicarbonate de soude',
    aisle: 'Épicerie & Condiments',
    aliases: ['bicarbonate alimentaire', 'bicarbonate de sodium', 'bicarbonate'],
    isPantryStaple: true,
  },
  {
    name: 'Gélatine',
    aisle: 'Épicerie & Condiments',
    aliases: ['feuille de gelatine', 'feuilles de gelatine', 'gelatine en poudre'],
  },
  {
    name: 'Agar-agar',
    aisle: 'Épicerie & Condiments',
    aliases: ['agar agar', 'sachet d agar agar'],
  },
  {
    name: 'Pépites de chocolat',
    aisle: 'Épicerie & Condiments',
    aliases: ['pepites de chocolat noir', 'pepites de chocolat au lait', 'pralin', 'chocolat praline', 'praline rose'],
    allergen: 'lait',
    secondaryAllergens: ['soja', 'fruits_a_coque'],
  },
  {
    name: 'Crème de marrons',
    aisle: 'Épicerie & Condiments',
    aliases: ['creme de marron', 'puree de marrons'],
  },
  {
    name: 'Sirop d\'agave',
    aisle: 'Épicerie & Condiments',
    aliases: ['sirop d agave', 'sirop de glucose', 'sirop de sucre de canne', 'melasse'],
    density: 1.35,
  },
  {
    name: 'Eau de fleur d\'oranger',
    aisle: 'Épicerie & Condiments',
    aliases: ['fleur d oranger', 'arome fleur d oranger', 'eau de rose'],
  },
  {
    name: 'Colorant alimentaire',
    aisle: 'Épicerie & Condiments',
    aliases: ['colorant rouge', 'colorant vert', 'colorant jaune'],
  },

  // --- FRUITS SECS & GRAINES ---
  {
    name: 'Raisins secs',
    aisle: 'Épicerie & Condiments',
    aliases: ['raisin sec', 'raisins de corinthe', 'raisins blonds'],
    allergen: 'sulfites',
  },
  {
    name: 'Abricots secs',
    aisle: 'Épicerie & Condiments',
    aliases: ['abricot sec'],
    allergen: 'sulfites',
  },
  {
    name: 'Pruneau',
    aisle: 'Épicerie & Condiments',
    aliases: ['pruneaux', 'pruneaux d agen', 'pruneaux denoyautes'],
  },
  {
    name: 'Datte',
    aisle: 'Épicerie & Condiments',
    aliases: ['dattes', 'dattes medjool', 'dattes denoyautees'],
  },
  {
    name: 'Noix de pécan',
    aisle: 'Épicerie & Condiments',
    aliases: ['pecan', 'cerneaux de noix de pecan', 'noix de macadamia', 'noix du bresil'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Graines de courge',
    aisle: 'Épicerie & Condiments',
    aliases: ['graine de courge'],
  },
  {
    name: 'Graines de tournesol',
    aisle: 'Épicerie & Condiments',
    aliases: ['graine de tournesol'],
  },
  {
    name: 'Graines de chia',
    aisle: 'Épicerie & Condiments',
    aliases: ['chia', 'graines de lin', 'graines de pavot', 'pavot'],
  },

  // --- CONDIMENTS, CONSERVES & ÉPICES ---
  {
    name: 'Tomates séchées',
    aisle: 'Épicerie & Condiments',
    aliases: ['tomate sechee', 'tomates confites', 'bocal de tomates sechees', 'poivrons grilles en bocal'],
  },
  {
    name: 'Sauce Worcestershire',
    aisle: 'Épicerie & Condiments',
    aliases: ['worcestershire sauce', 'sauce anglaise'],
    allergen: 'poissons',
    secondaryAllergens: ['gluten'],
  },
  {
    name: 'Tabasco',
    aisle: 'Épicerie & Condiments',
    aliases: ['sauce piquante', 'sriracha', 'sauce sriracha', 'piment de cayenne', 'piment en poudre', 'flocons de piment'],
    isPantryStaple: true,
  },
  {
    name: 'Sauce barbecue',
    aisle: 'Épicerie & Condiments',
    aliases: ['sauce bbq', 'sauce burger'],
  },
  {
    name: 'Sauce d\'huître',
    aisle: 'Épicerie & Condiments',
    aliases: ['sauce huitre', 'oyster sauce', 'sauce hoisin'],
    allergen: 'mollusques',
    secondaryAllergens: ['soja', 'gluten'],
  },
  {
    name: 'Garam masala',
    aisle: 'Épicerie & Condiments',
    aliases: ['epices tandoori', 'epices colombo', 'vadouvan', ' Massala'],
    isPantryStaple: true,
  },
  {
    name: 'Ras el-hanout',
    aisle: 'Épicerie & Condiments',
    aliases: ['ras el hanout', 'raz el hanout', 'quatre epices', '4 epices', 'melange 4 epices', 'zaatar', 'sumac'],
    isPantryStaple: true,
  },
  {
    name: 'Cardamome',
    aisle: 'Épicerie & Condiments',
    aliases: ['gousses de cardamome', 'cardamome en poudre', 'graines de cardamome'],
    isPantryStaple: true,
  },
  {
    name: 'Badiane',
    aisle: 'Épicerie & Condiments',
    aliases: ['anis etoile', 'etoile de badiane', 'graines de fenouil', 'graines d anis', 'carvi'],
    isPantryStaple: true,
  },
  {
    name: 'Safran',
    aisle: 'Épicerie & Condiments',
    aliases: ['pistils de safran', 'dose de safran', 'filaments de safran'],
  },
  {
    name: 'Poivre en grains',
    aisle: 'Épicerie & Condiments',
    aliases: ['poivre rose', 'baies de genievre', 'poivre de sichuan', 'poivre blanc'],
    isPantryStaple: true,
  },
  {
    name: 'Ail en poudre',
    aisle: 'Épicerie & Condiments',
    aliases: ['ail semoule', 'ail deshydrate'],
    isPantryStaple: true,
  },
  {
    name: 'Oignon frit',
    aisle: 'Épicerie & Condiments',
    aliases: [],
    isPantryStaple: true,
  },

  // =========================================================================
  // 5. BOULANGERIE & PÂTISSERIE
  // =========================================================================
  {
    name: 'Pain',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['baguette', 'pain de campagne', 'pain frais', 'tranches de pain', 'tartines de pain', 'croutons'],
    allergen: 'gluten',
  },
  {
    name: 'Pain de mie',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['tranches de pain de mie', 'pain burger', 'pains burger', 'pain toast', 'pain pour hamburger', 'pains pour hamburger'],
    allergen: 'gluten',
  },
  {
    name: 'Biscuit à la cuillère',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['biscuits a la cuillere', 'biscuit a la cuillere', 'boudoir', 'boudoirs'],
    allergen: 'gluten',
    secondaryAllergens: ['oeufs', 'lait'],
  },
  {
    name: 'Pâte feuilletée',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['rouleau de pate feuilletee', 'pate feuilletee pur beurre'],
    allergen: 'gluten',
    secondaryAllergens: ['lait']
  },
  {
    name: 'Pâte brisée',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['rouleau de pate brisee'],
    allergen: 'gluten',
    secondaryAllergens: ['lait']
  },
  {
    name: 'Pâte sablée',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['rouleau de pate sablee'],
    allergen: 'gluten',
    secondaryAllergens: ['lait', 'oeufs']
  },
  {
    name: 'Pâte à pizza',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['pate a pizza', 'rouleau de pate a pizza', 'pate a pizza ronde'],
    allergen: 'gluten',
  },
  {
    name: 'Levure boulangère',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['levure de boulanger', 'cube de levure fraiche', 'levure seche'],
  },
  {
    name: 'Poudre d\'amande',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['poudre d amande', 'amandes en poudre', 'amande en poudre', 'farine d amande'],
    allergen: 'fruits_a_coque',
    density: 0.50,
  },
  {
    name: 'Poudre de noisette',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['poudre de noisettes', 'noisettes en poudre', 'noisette en poudre'],
    allergen: 'fruits_a_coque',
    density: 0.50,
  },
  {
    name: 'Tortilla',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['tortillas', 'wrap', 'wraps', 'galette de ble'],
    allergen: 'gluten',
  },
  {
    name: 'Feuille de brick',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['feuilles de brick', 'feuille de bricks', 'feuilles de bricks', 'feuille de brik'],
    allergen: 'gluten',
  },
  {
    name: 'Brioche',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['brioches', 'tranches de brioche', 'brioche tranchee'],
    allergen: 'gluten',
    secondaryAllergens: ['oeufs', 'lait'],
  },
  {
    name: 'Pain pita',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['pita', 'pains pita', 'pain libanais', 'naan', 'pain bagnat', 'pain ciabatta', 'focaccia', 'english muffin'],
    allergen: 'gluten',
  },
  {
    name: 'Galette de sarrasin',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['galettes de ble noir', 'galettes de sarrasin', 'crepes de sarrasin'],
  },
  {
    name: 'Pâte filo',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['pate phyllo', 'feuilles de filo', 'feuilles de pate filo', 'cheveux d ange', 'kadaif'],
    allergen: 'gluten',
  },
  {
    name: 'Spéculoos',
    aisle: 'Épicerie & Condiments',
    aliases: ['speculoos', 'biscuits speculoos', 'miettes de speculoos', 'petit beurre', 'petits beurres', 'biscuits petits lu', 'palets bretons', 'biscuits roses de reims', 'amaretti', 'biscuits digestives'],
    allergen: 'gluten',
    secondaryAllergens: ['lait', 'oeufs', 'soja'],
  },

  // =========================================================================
  // 6. BOISSONS
  // =========================================================================
  {
    name: 'Vin blanc',
    aisle: 'Boissons',
    aliases: ['vin blanc sec', 'verre de vin blanc', 'bouteille de vin blanc'],
    allergen: 'sulfites',
    density: 1.0,
  },
  {
    name: 'Vin rouge',
    aisle: 'Boissons',
    aliases: ['vin rouge sec', 'verre de vin rouge'],
    allergen: 'sulfites',
    density: 1.0,
  },
  {
    name: 'Bière',
    aisle: 'Boissons',
    aliases: ['bieres', 'biere blonde', 'canette de biere'],
    allergen: 'gluten',
  },
  {
    name: 'Lait d\'amande',
    aisle: 'Boissons',
    aliases: ['lait d amande', 'boisson a l amande'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Lait de soja',
    aisle: 'Boissons',
    aliases: ['lait de soja', 'boisson au soja'],
    allergen: 'soja',
  },
  {
    name: 'Eau',
    aisle: 'Boissons',
    aliases: ['eau tiede', 'eau chaude', 'eau froide', 'eau gazeuse', 'verre d eau'],
    isPantryStaple: true,
    density: 1.0,
  },
  {
    name: 'Café',
    aisle: 'Boissons',
    aliases: ['tasse de cafe', 'cafe expresso', 'cafe moulu', 'cafe soluble'],
  },
  {
    name: 'Cidre',
    aisle: 'Boissons',
    aliases: ['cidre brut', 'cidre doux', 'verre de cidre'],
    allergen: 'sulfites',
  },
  {
    name: 'Rhum',
    aisle: 'Boissons',
    aliases: ['rhum ambre', 'rhum blanc', 'cuillere de rhum'],
  },
  {
    name: 'Cognac',
    aisle: 'Boissons',
    aliases: ['armagnac', 'calvados', 'grand marnier', 'cointreau', 'kirsch', 'amaretto', 'marsala', 'porto', 'madere', 'noilly prat', 'vermouth'],
  },
  {
    name: 'Pastis',
    aisle: 'Boissons',
    aliases: [],
  },

  {
    name: 'Lait d\'avoine',
    aisle: 'Boissons',
    aliases: ['boisson a l avoine', 'lait de riz', 'lait de noisette', 'lait de coco boisson'],
    allergen: 'gluten',
  },
  {
    name: 'Thé',
    aisle: 'Boissons',
    aliases: ['the vert', 'the noir', 'the matcha', 'infusion', 'camomille', 'hibiscus'],
  },
  {
    name: 'Eau gazeuse',
    aisle: 'Boissons',
    aliases: ['eau petillante', 'perrier', 'badoit', 'san pellegrino', 'tonic'],
  },

  // =========================================================================
  // 7. SURGELÉS
  // =========================================================================
  {
    name: 'Glace vanille',
    aisle: 'Surgelés',
    aliases: ['boules de glace', 'bac de glace', 'creme glacee'],
    allergen: 'lait',
  },
  {
    name: 'Légumes surgelés',
    aisle: 'Surgelés',
    aliases: ['poelee de legumes', 'poelee surgelee', 'legumes woks'],
  },
  {
    name: 'Petits pois surgelés',
    aisle: 'Surgelés',
    aliases: ['petits pois surgeles', 'petit pois surgele'],
  },

  // =========================================================================
  // 8. AUTRES CUISINES DU MONDE (JAPON, MEXIQUE, ETC.)
  // =========================================================================
  {
    name: 'Riz à sushi',
    aisle: 'Épicerie & Condiments',
    aliases: ['riz rond japonais', 'riz a sushi'],
  },
  {
    name: 'Algues Nori',
    aisle: 'Épicerie & Condiments',
    aliases: ['feuille de nori', 'algues nori', 'nori'],
  },
  {
    name: 'Vinaigre de riz',
    aisle: 'Épicerie & Condiments',
    aliases: ['vinaigre de riz'],
    isPantryStaple: true,
  },
  {
    name: 'Pâte miso',
    aisle: 'Épicerie & Condiments',
    aliases: ['miso', 'pate miso', 'miso blanc', 'miso rouge'],
    allergen: 'soja',
  },
  {
    name: 'Wasabi',
    aisle: 'Épicerie & Condiments',
    aliases: ['wasabi', 'pate de wasabi'],
    allergen: 'moutarde',
  },
  {
    name: 'Mirin',
    aisle: 'Épicerie & Condiments',
    aliases: ['mirin', 'sake doux'],
  },
  {
    name: 'Saké de cuisine',
    aisle: 'Épicerie & Condiments',
    aliases: ['sake', 'sake de cuisine'],
  },
  {
    name: 'Nouilles Soba',
    aisle: 'Épicerie & Condiments',
    aliases: ['soba', 'nouilles de sarrasin'],
    allergen: 'gluten',
  },
  {
    name: 'Nouilles Udon',
    aisle: 'Épicerie & Condiments',
    aliases: ['udon', 'nouilles japonaises'],
    allergen: 'gluten',
  },
  {
    name: 'Panko',
    aisle: 'Épicerie & Condiments',
    aliases: ['panko', 'chapelure japonaise'],
    allergen: 'gluten',
  },
  {
    name: 'Huile de sésame grillé',
    aisle: 'Épicerie & Condiments',
    aliases: ['huile de sesame grille'],
    allergen: 'sesame',
    isPantryStaple: true,
  },
  {
    name: 'Gingembre mariné',
    aisle: 'Épicerie & Condiments',
    aliases: ['gari', 'gingembre a sushi', 'gingembre marine'],
  },
  {
    name: 'Tortillas de maïs',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['tortillas de mais', 'tacos'],
  },
  {
    name: 'Pâte de curry vert',
    aisle: 'Épicerie & Condiments',
    aliases: ['curry vert', 'pate de curry vert'],
  },
  {
    name: 'Pâte de curry rouge',
    aisle: 'Épicerie & Condiments',
    aliases: ['curry rouge', 'pate de curry rouge'],
  },
  {
    name: 'Nuoc-mâm',
    aisle: 'Épicerie & Condiments',
    aliases: ['nuoc mam', 'sauce poisson', 'fish sauce'],
    allergen: 'poissons',
  },
  {
    name: 'Galette de riz',
    aisle: 'Épicerie & Condiments',
    aliases: ['galettes de riz', 'feuille de riz', 'feuilles de riz'],
  },
  {
    name: 'Vermicelles de riz',
    aisle: 'Épicerie & Condiments',
    aliases: ['vermicelle de riz', 'nouilles de riz'],
  },
];

/**
 * Nettoie une chaîne pour indexation rapide (minuscules, sans accents)
 */
function normalizeForVocabIndex(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remplace les apostrophes (droites ou typographiques) et tirets par des espaces
    .replace(/['’\-]/g, ' ')
    // Nettoie les espaces multiples
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Génère un identifiant canonique stable et unique basé sur le nom de l'ingrédient
 */
export function generateCanonicalSlugId(name: string): string {
  const clean = normalizeForVocabIndex(name)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `ing_canon_${clean}`;
}

/**
 * Crée le jeu de données initialisé canonique complet
 */
export function getInitialCanonicalVocabulary(): CanonicalIngredient[] {
  const now = '2026-01-01T00:00:00.000Z';
  return RAW_SEED_INGREDIENTS.map((item) => {
    const normalizedName = normalizeForVocabIndex(item.name);
    const id = generateCanonicalSlugId(item.name);
    // Inclut le pluriel automatique comme alias de base si absent
    const aliasSet = new Set<string>();
    item.aliases.forEach((a) => aliasSet.add(normalizeForVocabIndex(a)));
    aliasSet.add(normalizedName);
    if (!/[sxz]$/.test(normalizedName) && !normalizedName.includes(' ')) {
      aliasSet.add(`${normalizedName}s`);
    }

    return {
      id,
      canonicalName: item.name,
      normalizedName,
      aliases: Array.from(aliasSet),
      defaultAisle: item.aisle,
      isCustom: false,
      isPantryStaple: Boolean(item.isPantryStaple),
      allergen: item.allergen,
      secondaryAllergens: item.secondaryAllergens,
      density: item.density,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * Nettoie une chaîne en retirant les mots de découpe, de préparation ou de contenant
 * (ex: boite de, barquette de, pot de, sachet de, tranches de, filet de, pincee de, epluche, emince, rape, hache, coupe, en des, frais, fraiche, mure)
 * lorsqu'ils accompagnent un nom d'ingrédient.
 */
export function stripCulinaryStopWords(input: string): string {
  if (!input || !input.trim()) return '';

  let s = normalizeForVocabIndex(input);

  // Préfixes numériques ou fractions en tête
  s = s.replace(/^(?:[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s+/, '');

  // Préfixes de contenants et portions (avec de ou d)
  const prefixPatterns = [
    /^(?:boite|boites|barquette|barquettes|pot|pots|sachet|sachets|bocal|bocaux|brique|briques|conserve|conserves|tube|tubes|bouteille|bouteilles|paquet|paquets|rouleau|rouleaux|tablette|tablettes|bloc|blocs|plaquette|plaquettes)\s+(?:de|d)\s+/i,
    /^(?:tranche|tranches|filet|filets|pincee|pincees|poignee|poignees|gousse|gousses|branche|branches|feuille|feuilles|brin|brins|morceau|morceaux|zeste|zestes|jus|quartier|quartiers|rondelle|rondelles|lamelle|lamelles|cube|cubes|de|des|botte|bottes|bouquet|bouquets|tete|tetes|pied|pieds|pave|paves|darne|darnes| escalope|escalopes)\s+(?:de|d)\s+/i,
    /^(?:cuillere|cuilleres|cuillere a cafe|cuillere a soupe|c a cafe|c a soupe|cac|cas|verre|verres|tasse|tasses|bol|bols|trait|traits|goutte|gouttes|copeau|copeaux)\s+(?:de|d)\s+/i,
  ];

  for (const pat of prefixPatterns) {
    const stripped = s.replace(pat, '').trim();
    if (stripped.length > 0) {
      s = stripped;
    }
  }

  // Locutions de découpe composées
  s = s.replace(/\s+en\s+(?:des|morceaux|rondelles|lamelles|julienne|batonnets)(?=\s|$)/gi, ' ');
  s = s.replace(/^(?:en\s+(?:des|morceaux|rondelles|lamelles|julienne|batonnets)\s+de\s+)/gi, '');

  // Mots de découpe, préparation, cuisson et état
  // Note : préserve frais/fraiche s'ils font partie de "creme fraiche" ou "fromage frais"
  // Mots de découpe, préparation, cuisson, température et état
  const stopWordsRegex = /\b(?:epluche|epluchee|epluches|epluchees|emince|epluche|emincee|eminces|emincees|rape|rapee|rapes|rapees|hache|hachee|haches|hachees|coupe|coupee|coupes|coupees|cisele|ciselee|ciseles|ciselees|concasse|concassee|concasses|concassees|moulu|moulue|moulus|moulues|ecrase|ecrasee|ecrases|ecrasees|pele|pelee|peles|pelees|epepine|epepinee|epepines|epepinees|denoyaute|denoyautee|denoyautes|denoyautees|decortique|decortiquee|decortiques|decortiquees|effile|effilee|effiles|effilees|emonde|emondee|emondes|emondees|torrefie|torrefiee|torrefies|torrefiees|grille|grillee|grilles|grillees|roti|rotie|rotis|roties|fondu|fondue|fondus|fondues|ramolli|ramollie|ramollis|ramollies|battu|battue|battus|battues|tamise|tamisee|tamises|tamisees|egoutte|egouttee|egouttes|egouttees|rince|rincee|rinces|rincees|lave|lavee|laves|lavees|(?<!\b(?:creme|fromage)\s+)(?:frais|fraiche|fraiches)|mur|mure|murs|mures|sec|seche|secs|seches|cuit|cuite|cuits|cuites|cru|crue|crus|crues|froid|froide|froids|froides|chaud|chaude|chauds|chaudes|tiede|tiedes|ambiant|ambiante|finement|grossierement|bien|tres|environ|facultatif|optionnel|bio|biologique|biologiques)\b/gi;

  const candidate = s.replace(stopWordsRegex, ' ').replace(/\s+/g, ' ').trim();
  if (candidate.length > 0) {
    s = candidate;
  }

  return s;
}

/**
 * Index Map O(1) pré-compilé reliant chaque nom normalisé ou alias à son CanonicalIngredient
 */
export const CANONICAL_VOCAB_INDEX = new Map<string, CanonicalIngredient>();

const initialVocab = getInitialCanonicalVocabulary();
initialVocab.forEach((item) => {
  CANONICAL_VOCAB_INDEX.set(item.normalizedName, item);
  (item.aliases || []).forEach((alias) => {
    const normAlias = normalizeForVocabIndex(alias);
    if (normAlias) {
      CANONICAL_VOCAB_INDEX.set(normAlias, item);
    }
  });
});

/**
 * Recherche un ingrédient canonique dans l'index en O(1) avec repli sur le stripping des stop-words culinaires.
 */
export function findCanonicalIngredient(rawName: string): CanonicalIngredient | undefined {
  if (!rawName || !rawName.trim()) return undefined;

  const norm = normalizeForVocabIndex(rawName);
  if (!norm) return undefined;

  // 1. Cherche la chaîne normalisée directement dans CANONICAL_VOCAB_INDEX
  const directMatch = CANONICAL_VOCAB_INDEX.get(norm);
  if (directMatch) return directMatch;

  // 2. Si non trouvée, applique stripCulinaryStopWords() et cherche à nouveau dans CANONICAL_VOCAB_INDEX
  const stripped = stripCulinaryStopWords(norm);
  if (stripped && stripped !== norm) {
    const strippedMatch = CANONICAL_VOCAB_INDEX.get(stripped);
    if (strippedMatch) return strippedMatch;
  }

  return undefined;
}

// Map pré-compilée des allergènes par défaut indexée par nom normalisé
const DEFAULT_ALLERGENS_MAP = new Map<string, AllergenFamily>();
RAW_SEED_INGREDIENTS.forEach((item) => {
  if (item.allergen) {
    const norm = normalizeForVocabIndex(item.name);
    DEFAULT_ALLERGENS_MAP.set(norm, item.allergen);
    if (!/[sxz]$/.test(norm) && !norm.includes(' ')) {
      DEFAULT_ALLERGENS_MAP.set(`${norm}s`, item.allergen);
    }
    item.aliases.forEach((a) => {
      DEFAULT_ALLERGENS_MAP.set(normalizeForVocabIndex(a), item.allergen!);
    });
  }
});

/**
 * Retourne la famille d'allergène majeure par défaut d'un ingrédient connu (le cas échéant)
 */
export function getDefaultAllergen(name: string): AllergenFamily | undefined {
  if (!name) return undefined;
  const clean = normalizeForVocabIndex(name);
  return DEFAULT_ALLERGENS_MAP.get(clean);
}

/**
 * Retourne la liste complète des familles d'allergènes (majeure + secondaires) d'un ingrédient
 */
export function getDefaultAllergens(name: string): AllergenFamily[] {
  if (!name) return [];
  const ing = findCanonicalIngredient(name);
  if (!ing) return [];
  const list: AllergenFamily[] = [];
  if (ing.allergen) list.push(ing.allergen);
  if (ing.secondaryAllergens) {
    for (const fam of ing.secondaryAllergens) {
      if (!list.includes(fam)) list.push(fam);
    }
  }
  return list;
}

// Termes génériques ou qualificatifs isolés formellement interdits comme alias uniques
export const FORBIDDEN_ISOLATED_ALIASES = new Set<string>([
  'blanc', 'blanche', 'rouge', 'jaune', 'vert', 'verte', 'noir', 'noire',
  'emince', 'epluche', 'hache', 'rape', 'concasse', 'frais', 'fraiche',
  'sec', 'seche', 'cuit', 'cuite', 'cru', 'crue', 'moulu', 'surgele', 'surgelee',
  'sauce', 'huile', 'vinaigre', 'farine', 'sucre', 'fromage', 'viande', 'poisson',
  'poudre', 'puree', 'creme', 'pate', 'petit', 'petite', 'gros', 'grosse', 'grand', 'grande',
  'morceau', 'tranche', 'filet', 'boite', 'sachet', 'pot', 'bocal', 'barquette',
  'feuille', 'branche', 'gousse', 'brin', 'jus', 'zeste', 'bouillon', 'fond',
  'doux', 'douce', 'fort', 'forte', 'piquant', 'fume', 'fumee', 'nature', 'entier', 'entiere',
]);

// Ensemble pré-compilé des termes normalisés considérés par défaut comme fonds de placard
const DEFAULT_PANTRY_STAPLES_SET = new Set<string>();

RAW_SEED_INGREDIENTS.forEach((item) => {
  if (item.isPantryStaple) {
    const norm = normalizeForVocabIndex(item.name);
    DEFAULT_PANTRY_STAPLES_SET.add(norm);
    item.aliases.forEach((a) => DEFAULT_PANTRY_STAPLES_SET.add(normalizeForVocabIndex(a)));
  }
});

/**
 * Détermine si un nom d'ingrédient correspond à un fond de placard usuel par défaut
 */
export function isKnownDefaultPantryStaple(name: string): boolean {
  if (!name) return false;
  const clean = normalizeForVocabIndex(name);
  if (DEFAULT_PANTRY_STAPLES_SET.has(clean)) return true;
  for (const staple of DEFAULT_PANTRY_STAPLES_SET) {
    if (clean === staple || clean.startsWith(`${staple} `)) {
      return true;
    }
  }
  return false;
}
