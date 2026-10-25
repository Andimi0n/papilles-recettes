import { CanonicalIngredient, AllergenFamily } from '../types/vocabulary';
import { ShoppingAisle } from '../types/shopping';

interface SeedIngredientDef {
  name: string;
  aisle: ShoppingAisle;
  aliases: string[];
  isPantryStaple?: boolean;
  allergen?: AllergenFamily;
}

const RAW_SEED_INGREDIENTS: SeedIngredientDef[] = [
  // =========================================================================
  // 1. FRUITS & LÉGUMES
  // =========================================================================
  {
    name: 'Petits pois',
    aisle: 'Fruits & Légumes',
    aliases: ['petit pois', 'pois', 'boite de petits pois', 'boite de petit pois', 'petits pois surgeles', 'petits pois frais'],
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
    aliases: ['oignons', 'oignon jaune', 'oignon rouge', 'oignon blanc', 'oignons jaunes', 'oignons rouges', 'oignons blancs', 'oignon emince', 'oignon epluche', 'cebette', 'ciboule'],
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
    aliases: ['haricots verts', 'haricots verts frais', 'boite de haricots verts', 'haricots plats'],
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
    aliases: ['chou', 'choux', 'chou blanc', 'chou rouge', 'chou frise'],
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
    aliases: ['feuilles de basilic', 'feuille de basilic', 'basilic frais', 'basilic ciselet'],
  },
  {
    name: 'Persil',
    aisle: 'Fruits & Légumes',
    aliases: ['persil plat', 'persil frise', 'persil frais', 'persil hache', 'brins de persil'],
  },
  {
    name: 'Coriandre',
    aisle: 'Fruits & Légumes',
    aliases: ['coriandre fraiche', 'feuilles de coriandre', 'coriandre moulue'],
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
  },
  {
    name: 'Margarine',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['margarines', 'margarine vegetale', 'beurre vegetal'],
  },
  {
    name: 'Crème fraîche',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['creme fraiche', 'cremes fraiches', 'creme liquide', 'creme epaisse', 'creme fleurette', 'creme entiere', 'brique de creme'],
    allergen: 'lait',
  },
  {
    name: 'Lait',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['laits', 'lait demi ecreme', 'lait entier', 'lait ecreme', 'bouteille de lait'],
    allergen: 'lait',
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
    aliases: ['sardines', 'sardines fraiches', 'boite de sardines', 'sardines a l huile'],
    allergen: 'poissons',
  },
  {
    name: 'Maquereau',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['maquereaux', 'filets de maquereau', 'filet de maquereau', 'boite de maquereaux'],
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

  // =========================================================================
  // 4. ÉPICERIE & CONDIMENTS
  // =========================================================================
  {
    name: 'Farine',
    aisle: 'Épicerie & Condiments',
    aliases: ['farines', 'farine de ble', 'farine t55', 'farine t45', 'farine fluide', 'farine tamisee'],
    allergen: 'gluten',
  },
  {
    name: 'Fécule de maïs',
    aisle: 'Épicerie & Condiments',
    aliases: ['fecule de mais', 'maizena', 'fecule'],
  },
  {
    name: 'Sucre',
    aisle: 'Épicerie & Condiments',
    aliases: ['sucres', 'sucre en poudre', 'sucre semoule', 'sucre blanc'],
  },
  {
    name: 'Sucre glace',
    aisle: 'Épicerie & Condiments',
    aliases: ['sucres glaces', 'sucre impalpable'],
  },
  {
    name: 'Sel',
    aisle: 'Épicerie & Condiments',
    aliases: ['sels', 'sel fin', 'gros sel', 'fleur de sel', 'pincee de sel'],
    isPantryStaple: true,
  },
  {
    name: 'Poivre',
    aisle: 'Épicerie & Condiments',
    aliases: ['poivres', 'poivre moulu', 'poivre du moulin', 'poivre noir', 'tours de moulin a poivre'],
    isPantryStaple: true,
  },
  {
    name: 'Huile d\'olive',
    aisle: 'Épicerie & Condiments',
    aliases: ['huile d olive', 'huile olive', 'huile d\'olive vierge', 'filet d huile d olive'],
    isPantryStaple: true,
  },
  {
    name: 'Huile de tournesol',
    aisle: 'Épicerie & Condiments',
    aliases: ['huile neutre', 'huile vegetale', 'huile de colza', 'huile de friture', 'huile de cuisson'],
    isPantryStaple: true,
  },
  {
    name: 'Pâtes',
    aisle: 'Épicerie & Condiments',
    aliases: ['pates', 'spaghetti', 'spaghettis', 'penne', 'pennes', 'coquillette', 'coquillettes', 'tagliatelle', 'tagliatelles', 'fusilli', 'fusillis', 'macaroni', 'macaronis', 'linguine', 'linguines', 'farfalle'],
    allergen: 'gluten',
  },
  {
    name: 'Riz',
    aisle: 'Épicerie & Condiments',
    aliases: ['riz basmati', 'riz thai', 'riz rond', 'riz arborio', 'riz long', 'riz blanc'],
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
  },
  {
    name: 'Mayonnaise',
    aisle: 'Épicerie & Condiments',
    aliases: ['mayo', 'sauce mayonnaise', 'pot de mayonnaise'],
    allergen: 'oeufs',
  },
  {
    name: 'Pesto',
    aisle: 'Épicerie & Condiments',
    aliases: ['pesto alla genovese', 'sauce pesto', 'pesto vert'],
    allergen: 'lait',
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
  },
  {
    name: 'Vinaigre balsamique',
    aisle: 'Épicerie & Condiments',
    aliases: ['vinaigre balsamique de modene', 'creme de balsamique'],
    isPantryStaple: true,
    allergen: 'sulfites',
  },
  {
    name: 'Vinaigre de cidre',
    aisle: 'Épicerie & Condiments',
    aliases: ['vinaigre de pomme'],
    isPantryStaple: true,
  },
  {
    name: 'Vinaigre blanc',
    aisle: 'Épicerie & Condiments',
    aliases: ['vinaigre d alcool', 'vinaigre cristal'],
    isPantryStaple: true,
  },
  {
    name: 'Coulis de tomate',
    aisle: 'Épicerie & Condiments',
    aliases: ['sauce tomate', 'puree de tomate', 'pulpe de tomate', 'passata'],
  },
  {
    name: 'Concentré de tomate',
    aisle: 'Épicerie & Condiments',
    aliases: ['concentre de tomates', 'tube de concentre de tomate', 'petite boite de concentre'],
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
  },
  {
    name: 'Sauce soja sucrée',
    aisle: 'Épicerie & Condiments',
    aliases: ['sauce soja sucree', 'sauce teriyaki'],
    allergen: 'soja',
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
    name: 'Gingembre',
    aisle: 'Épicerie & Condiments',
    aliases: ['gingembre frais', 'gingembre rape', 'gingembre moulu', 'racine de gingembre'],
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
    name: 'Maïs',
    aisle: 'Épicerie & Condiments',
    aliases: ['mais', 'boite de mais', 'grains de mais', 'mais doux'],
  },
  {
    name: 'Lait de coco',
    aisle: 'Épicerie & Condiments',
    aliases: ['creme de coco', 'brique de lait de coco', 'boite de lait de coco'],
  },
  {
    name: 'Cacao en poudre',
    aisle: 'Épicerie & Condiments',
    aliases: ['cacao', 'cacao non sucre', 'cacao amer', 'poudre de cacao'],
  },
  {
    name: 'Cassonade',
    aisle: 'Épicerie & Condiments',
    aliases: ['sucre roux', 'vergeoise', 'sucre de canne'],
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
  },
  {
    name: 'Pâte feuilletée',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['rouleau de pate feuilletee', 'pate feuilletee pur beurre'],
    allergen: 'gluten',
  },
  {
    name: 'Pâte brisée',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['rouleau de pate brisee'],
    allergen: 'gluten',
  },
  {
    name: 'Pâte sablée',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['rouleau de pate sablee'],
    allergen: 'gluten',
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
  },
  {
    name: 'Poudre de noisette',
    aisle: 'Boulangerie & Pâtisserie',
    aliases: ['poudre de noisettes', 'noisettes en poudre', 'noisette en poudre'],
    allergen: 'fruits_a_coque',
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
  },

  // =========================================================================
  // 6. BOISSONS
  // =========================================================================
  {
    name: 'Vin blanc',
    aisle: 'Boissons',
    aliases: ['vin blanc sec', 'verre de vin blanc', 'bouteille de vin blanc'],
    allergen: 'sulfites',
  },
  {
    name: 'Vin rouge',
    aisle: 'Boissons',
    aliases: ['vin rouge sec', 'verre de vin rouge'],
    allergen: 'sulfites',
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
    aliases: ['mirin', 'saké doux'],
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
    if (!normalizedName.endsWith('s')) {
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
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  });
}

// Map pré-compilée des allergènes par défaut indexée par nom normalisé
const DEFAULT_ALLERGENS_MAP = new Map<string, AllergenFamily>();
RAW_SEED_INGREDIENTS.forEach((item) => {
  if (item.allergen) {
    const norm = normalizeForVocabIndex(item.name);
    DEFAULT_ALLERGENS_MAP.set(norm, item.allergen);
    if (!norm.endsWith('s')) {
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

// Termes génériques ou qualificatifs isolés formellement interdits comme alias uniques
export const FORBIDDEN_ISOLATED_ALIASES = new Set<string>([
  'blanc', 'blanche', 'rouge', 'jaune', 'vert', 'verte', 'noir', 'noire',
  'emince', 'epluche', 'hache', 'rape', 'concasse', 'frais', 'fraiche',
  'sec', 'seche', 'cuit', 'cuite', 'moulu', 'surgele', 'sauce', 'huile',
  'poudre', 'puree', 'creme', 'pate', 'petit', 'gros', 'grand', 'morceau',
]);

// Ensemble pré-compilé des termes normalisés considérés par défaut comme fonds de placard
const DEFAULT_PANTRY_STAPLES_SET = new Set<string>([
  'sel',
  'sels',
  'sel fin',
  'gros sel',
  'fleur de sel',
  'poivre',
  'poivres',
  'poivre noir',
  'poivre blanc',
  'poivre moulu',
  'huile d olive',
  'huile dolive',
  'huile de tournesol',
  'huile neutre',
  'huile de colza',
  'huile de friture',
  'huile vegetale',
  'huile d arachide',
  'huile de sesame',
  'vinaigre',
  'vinaigre de vin',
  'vinaigre blanc',
  'vinaigre de cidre',
  'vinaigre balsamique',
  'muscade',
  'noix de muscade',
  'curry',
  'cumin',
  'paprika',
  'cannelle',
  'curcuma',
  'thym',
  'laurier',
  'herbes de provence',
  'origan',
  'romarin',
  'gingembre',
  'clou de girofle',
  'piment',
  'piment d espelette',
  'piment doux',
  'eau',
]);

/**
 * Détermine si un nom d'ingrédient correspond à un fond de placard usuel par défaut
 */
export function isKnownDefaultPantryStaple(name: string): boolean {
  if (!name) return false;
  const clean = normalizeForVocabIndex(name);
  if (DEFAULT_PANTRY_STAPLES_SET.has(clean)) return true;
  for (const staple of DEFAULT_PANTRY_STAPLES_SET) {
    if (clean === staple || clean.startsWith(`${staple} `) || clean.endsWith(` ${staple}`)) {
      return true;
    }
  }
  return false;
}
