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
    aliases: ['tomates', 'tomate cerise', 'tomates cerises', 'tomate grappe', 'tomates pelees', 'tomates en des', 'tomate fraiche'],
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
    aliases: ['salades', 'laitue', 'batavia', 'mache', 'mesclun', 'feuilles de salade', 'jeunes pousses', 'salade verte'],
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
    name: 'Épinards',
    aisle: 'Fruits & Légumes',
    aliases: ['epinard', 'epinards frais', 'pousses d epinard', 'jeunes pousses epinard', 'feuilles d epinards'],
  },
  {
    name: 'Avocat',
    aisle: 'Fruits & Légumes',
    aliases: ['avocats', 'chair d avocat', 'avocat mur'],
  },
  {
    name: 'Céleri',
    aisle: 'Fruits & Légumes',
    aliases: ['celeri', 'branche de celeri', 'branches de celeri', 'celeri branche', 'celeri rave'],
    allergen: 'celeri',
  },
  {
    name: 'Haricots verts',
    aisle: 'Fruits & Légumes',
    aliases: ['haricot vert', 'haricots verts frais', 'boite de haricots verts', 'haricots plats'],
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
    aliases: ['butternut', 'courges butternut', 'courge', 'doubeurre'],
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

  // =========================================================================
  // 2. PRODUITS FRAIS & CRÈMERIE
  // =========================================================================
  {
    name: 'Œufs',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['oeuf', 'oeufs', 'oeufs frais', 'blanc d oeuf', 'blancs d oeufs', 'jaune d oeuf', 'jaunes d oeufs'],
    allergen: 'oeufs',
  },
  {
    name: 'Beurre',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['beurres', 'beurre doux', 'beurre demi sel', 'beurre fondu', 'noix de beurre', 'margarine'],
    allergen: 'lait',
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
    aliases: ['fromage rape', 'emmental rape', 'gruyere rape', 'sachet de fromage rape'],
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
    aliases: ['gruyere', 'emmental francais', 'fromage a pate dure'],
    allergen: 'lait',
  },
  {
    name: 'Comté',
    aisle: 'Produits Frais & Crèmerie',
    aliases: ['comte', 'beaufort', 'comte jeune', 'comte affine'],
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
    aliases: ['tofu soyeux', 'tofu ferme', 'tofu fume', 'soja'],
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
    aliases: ['boeuf', 'viande bovine', 'bavette', 'entrecote', 'rumsteck', 'paleron', 'bourguignon', 'morceaux de boeuf'],
  },
  {
    name: 'Steak haché',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['steaks haches', 'steak', 'steaks', 'viande hachee', 'viande de boeuf hachee'],
  },
  {
    name: 'Lardons',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['lardon', 'lardons fumes', 'lardons nature', 'barquette de lardons', 'poitrine fumee', 'bacon', 'pancetta'],
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
    aliases: ['cote de porc', 'cotes de porc', 'filet mignon', 'filet mignon de porc', 'echine de porc', 'roti de porc'],
  },
  {
    name: 'Saucisse',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['saucisses', 'chipolata', 'chipolatas', 'saucisse de toulouse', 'saucisse de morteau', 'saucisse de montbeliard', 'chair a saucisse'],
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
    aliases: ['escalope de veau', 'escalopes de veau', 'roti de veau', 'morceaux de veau'],
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
    aliases: ['saumon fume', 'tranches de saumon fume', 'chutes de saumon fume'],
    allergen: 'poissons',
  },
  {
    name: 'Thon',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['thon en boite', 'boite de thon', 'thon naturel', 'thon au naturel', 'pave de thon'],
    allergen: 'poissons',
  },
  {
    name: 'Cabillaud',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['dos de cabillaud', 'filet de cabillaud', 'filets de cabillaud', 'colin', 'merlu'],
    allergen: 'poissons',
  },
  {
    name: 'Crevettes',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['crevette', 'crevettes roses', 'crevettes decortiquees', 'gambas', 'scampis'],
    allergen: 'crustaces',
  },
  {
    name: 'Crabe',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['chair de crabe', 'miettes de crabe', 'tourteau', 'araignee de mer'],
    allergen: 'crustaces',
  },
  {
    name: 'Moules',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['moule', 'moules fraiches', 'moules de bouchot', 'moules cuites'],
    allergen: 'mollusques',
  },
  {
    name: 'Huîtres',
    aisle: 'Boucherie & Poissonnerie',
    aliases: ['huitre', 'huitres', 'huitres fraiches'],
    allergen: 'mollusques',
  },

  // =========================================================================
  // 4. ÉPICERIE & CONDIMENTS
  // =========================================================================
  {
    name: 'Farine',
    aisle: 'Épicerie & Condiments',
    aliases: ['farines', 'farine de ble', 'farine t55', 'farine t45', 'farine fluide'],
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
    aliases: ['sucres', 'sucre en poudre', 'sucre semoule', 'sucre blanc', 'sucre roux', 'cassonade'],
  },
  {
    name: 'Sucre glace',
    aisle: 'Épicerie & Condiments',
    aliases: ['sucre glace', 'sucres glaces', 'sucre impalpable'],
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
    aliases: ['huile neutre', 'huile vegetale', 'huile de colza', 'huile de friture'],
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
    name: 'Vinaigre',
    aisle: 'Épicerie & Condiments',
    aliases: ['vinaigre de vin', 'vinaigre blanc', 'vinaigre de cidre', 'vinaigre balsamique'],
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
    aliases: ['gousse de vanille', 'extrait de vanille', 'arome vanille', 'sucre vanille', 'sachet de sucre vanille'],
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
    name: 'Basilic',
    aisle: 'Épicerie & Condiments',
    aliases: ['feuilles de basilic', 'feuille de basilic', 'basilic frais', 'basilic ciselet'],
  },
  {
    name: 'Persil',
    aisle: 'Épicerie & Condiments',
    aliases: ['persil plat', 'persil frise', 'persil frais', 'persil hache', 'brins de persil'],
  },
  {
    name: 'Coriandre',
    aisle: 'Épicerie & Condiments',
    aliases: ['coriandre fraiche', 'feuilles de coriandre', 'coriandre moulue'],
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
    aliases: ['sauce soja salee', 'sauce soja sucree', 'tamari'],
    allergen: 'soja',
  },
  {
    name: 'Cacahuètes',
    aisle: 'Épicerie & Condiments',
    aliases: ['cacahuete', 'cacahuetes', 'arachide', 'arachides', 'beurre de cacahuete', 'beurre de cacahuetes'],
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
    aliases: ['sesame', 'graines de sesame', 'graine de sesame', 'tahini', 'tahin'],
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
    aliases: ['noix', 'cerneaux de noix'],
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
    aliases: ['noisettes', 'poudre de noisette', 'noisettes entieres'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Amande',
    aisle: 'Épicerie & Condiments',
    aliases: ['amandes', 'amandes effilees', 'amandes entieres'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Noix de cajou',
    aisle: 'Épicerie & Condiments',
    aliases: ['noix de cajou', 'cajou', 'anacarde'],
    allergen: 'fruits_a_coque',
  },
  {
    name: 'Farine de lupin',
    aisle: 'Épicerie & Condiments',
    aliases: ['lupin', 'graines de lupin'],
    allergen: 'lupin',
  },
  {
    name: 'Pois chiches',
    aisle: 'Épicerie & Condiments',
    aliases: ['pois chiche', 'boite de pois chiches', 'bocal de pois chiches'],
  },
  {
    name: 'Haricots rouges',
    aisle: 'Épicerie & Condiments',
    aliases: ['haricot rouge', 'boite de haricots rouges'],
  },
  {
    name: 'Lentilles',
    aisle: 'Épicerie & Condiments',
    aliases: ['lentilles vertes', 'lentilles corail', 'lentille', 'boite de lentilles'],
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
    aliases: ['tranches de pain de mie', 'pain burger', 'pain toast'],
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
    name: 'Lait de coco',
    aisle: 'Boissons',
    aliases: ['creme de coco', 'brique de lait de coco', 'boite de lait de coco'],
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

  // =========================================================================
  // 7. SURGELÉS
  // =========================================================================
  {
    name: 'Glace vanille',
    aisle: 'Surgelés',
    aliases: ['boules de glace', 'bac de glace', 'creme glacee'],
  },
  {
    name: 'Légumes surgelés',
    aisle: 'Surgelés',
    aliases: ['poelee de legumes', 'poelee surgelee', 'legumes woks'],
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
