<?php

namespace App\DataFixtures;

use App\Entity\Ingredient;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Persistence\ObjectManager;

class IngredientsFixture extends Fixture implements FixtureGroupInterface
{
    /**
     * Données structurées par catégorie pour faciliter la maintenance.
     * Format : ['label' => string, 'unit' => string|null]
     * 
     * ⚠️  "unit" représente l'unité PAR DÉFAUT de l'ingrédient.
     *     Elle peut toujours être surchargée dans RecipeIngredient.amount.
     *     null = ingrédient qui se compte en unités sans mesure standard
     *     (ex: une "gousse" d'ail).
     */
    private const INGREDIENTS = [

        // ── Légumes ───────────────────────────────────────────────────────────
        ['label' => 'Ail',               'unit' => null],
        ['label' => 'Aubergine',         'unit' => null],
        ['label' => 'Avocat',            'unit' => null],
        ['label' => 'Betterave',         'unit' => 'g'],
        ['label' => 'Brocoli',           'unit' => 'g'],
        ['label' => 'Carotte',           'unit' => 'g'],
        ['label' => 'Céleri',            'unit' => 'g'],
        ['label' => 'Champignons de Paris', 'unit' => 'g'],
        ['label' => 'Champignons shiitake', 'unit' => 'g'],
        ['label' => 'Chou blanc',        'unit' => 'g'],
        ['label' => 'Chou-fleur',        'unit' => 'g'],
        ['label' => 'Chou rouge',        'unit' => 'g'],
        ['label' => 'Choux de Bruxelles','unit' => 'g'],
        ['label' => 'Concombre',         'unit' => null],
        ['label' => 'Courgette',         'unit' => null],
        ['label' => 'Échalote',          'unit' => null],
        ['label' => 'Endive',            'unit' => null],
        ['label' => 'Épinards',          'unit' => 'g'],
        ['label' => 'Fenouil',           'unit' => null],
        ['label' => 'Haricots verts',    'unit' => 'g'],
        ['label' => 'Maïs',              'unit' => 'g'],
        ['label' => 'Navet',             'unit' => 'g'],
        ['label' => 'Oignon jaune',      'unit' => null],
        ['label' => 'Oignon rouge',      'unit' => null],
        ['label' => 'Patate douce',      'unit' => 'g'],
        ['label' => 'Petits pois',       'unit' => 'g'],
        ['label' => 'Poireau',           'unit' => null],
        ['label' => 'Pois chiches',      'unit' => 'g'],
        ['label' => 'Poivron jaune',     'unit' => null],
        ['label' => 'Poivron rouge',     'unit' => null],
        ['label' => 'Poivron vert',      'unit' => null],
        ['label' => 'Pomme de terre',    'unit' => 'g'],
        ['label' => 'Radis',             'unit' => null],
        ['label' => 'Salade romaine',    'unit' => 'g'],
        ['label' => 'Tomate',            'unit' => null],
        ['label' => 'Tomates cerises',   'unit' => 'g'],
        ['label' => 'Tomates pelées (conserve)', 'unit' => 'g'],

        // ── Fruits ────────────────────────────────────────────────────────────
        ['label' => 'Ananas',            'unit' => 'g'],
        ['label' => 'Banane',            'unit' => null],
        ['label' => 'Citron jaune',      'unit' => null],
        ['label' => 'Citron vert',       'unit' => null],
        ['label' => 'Clémentine',        'unit' => null],
        ['label' => 'Fraises',           'unit' => 'g'],
        ['label' => 'Framboises',        'unit' => 'g'],
        ['label' => 'Grenade',           'unit' => null],
        ['label' => 'Kiwi',              'unit' => null],
        ['label' => 'Mangue',            'unit' => null],
        ['label' => 'Melon',             'unit' => 'g'],
        ['label' => 'Myrtilles',         'unit' => 'g'],
        ['label' => 'Orange',            'unit' => null],
        ['label' => 'Pastèque',          'unit' => 'g'],
        ['label' => 'Pêche',             'unit' => null],
        ['label' => 'Poire',             'unit' => null],
        ['label' => 'Pomme',             'unit' => null],
        ['label' => 'Raisins noirs',     'unit' => 'g'],
        ['label' => 'Raisins verts',     'unit' => 'g'],

        // ── Viandes & poissons ────────────────────────────────────────────────
        ['label' => 'Bœuf haché',        'unit' => 'g'],
        ['label' => 'Blanc de poulet',   'unit' => 'g'],
        ['label' => 'Chorizo',           'unit' => 'g'],
        ['label' => 'Côte de porc',      'unit' => 'g'],
        ['label' => 'Cuisse de poulet',  'unit' => 'g'],
        ['label' => 'Escalope de dinde', 'unit' => 'g'],
        ['label' => 'Filet de bœuf',     'unit' => 'g'],
        ['label' => 'Filet de cabillaud','unit' => 'g'],
        ['label' => 'Lardons',           'unit' => 'g'],
        ['label' => 'Merguez',           'unit' => null],
        ['label' => 'Pavé de saumon',    'unit' => 'g'],
        ['label' => 'Poitrine de porc',  'unit' => 'g'],
        ['label' => 'Thon en conserve',  'unit' => 'g'],
        ['label' => 'Crevettes',         'unit' => 'g'],
        ['label' => 'Moules',            'unit' => 'g'],
        ['label' => 'Anchois',           'unit' => 'g'],

        // ── Produits laitiers & œufs ──────────────────────────────────────────
        ['label' => 'Beurre',            'unit' => 'g'],
        ['label' => 'Crème entière',     'unit' => 'ml'],
        ['label' => 'Crème fraîche',     'unit' => 'g'],
        ['label' => 'Emmental râpé',     'unit' => 'g'],
        ['label' => 'Fromage de chèvre', 'unit' => 'g'],
        ['label' => 'Gruyère râpé',      'unit' => 'g'],
        ['label' => 'Lait entier',       'unit' => 'ml'],
        ['label' => 'Lait végétal (avoine)', 'unit' => 'ml'],
        ['label' => 'Mascarpone',        'unit' => 'g'],
        ['label' => 'Mozzarella',        'unit' => 'g'],
        ['label' => 'Œufs',              'unit' => null],
        ['label' => 'Parmesan',          'unit' => 'g'],
        ['label' => 'Ricotta',           'unit' => 'g'],
        ['label' => 'Yaourt nature',     'unit' => 'g'],

        // ── Féculents & céréales ──────────────────────────────────────────────
        ['label' => 'Farine T45',        'unit' => 'g'],
        ['label' => 'Farine T65',        'unit' => 'g'],
        ['label' => 'Farine de seigle',  'unit' => 'g'],
        ['label' => 'Farine de riz',     'unit' => 'g'],
        ['label' => 'Flocons d\'avoine', 'unit' => 'g'],
        ['label' => 'Lentilles corail',  'unit' => 'g'],
        ['label' => 'Lentilles vertes',  'unit' => 'g'],
        ['label' => 'Maïzena',           'unit' => 'g'],
        ['label' => 'Nouilles ramen',    'unit' => 'g'],
        ['label' => 'Pâtes (penne)',     'unit' => 'g'],
        ['label' => 'Pâtes (spaghetti)','unit' => 'g'],
        ['label' => 'Quinoa',            'unit' => 'g'],
        ['label' => 'Riz basmati',       'unit' => 'g'],
        ['label' => 'Riz rond',          'unit' => 'g'],
        ['label' => 'Semoule',           'unit' => 'g'],

        // ── Herbes aromatiques ────────────────────────────────────────────────
        ['label' => 'Basilic frais',     'unit' => 'g'],
        ['label' => 'Ciboulette',        'unit' => 'g'],
        ['label' => 'Coriandre fraîche', 'unit' => 'g'],
        ['label' => 'Estragon',          'unit' => 'g'],
        ['label' => 'Menthe fraîche',    'unit' => 'g'],
        ['label' => 'Persil plat',       'unit' => 'g'],
        ['label' => 'Romarin',           'unit' => 'g'],
        ['label' => 'Sauge',             'unit' => 'g'],
        ['label' => 'Thym',              'unit' => 'g'],

        // ── Épices & condiments ───────────────────────────────────────────────
        ['label' => 'Cannelle',          'unit' => 'g'],
        ['label' => 'Cardamome',         'unit' => 'g'],
        ['label' => 'Cumin',             'unit' => 'g'],
        ['label' => 'Curcuma',           'unit' => 'g'],
        ['label' => 'Curry',             'unit' => 'g'],
        ['label' => 'Garam masala',      'unit' => 'g'],
        ['label' => 'Gingembre frais',   'unit' => 'g'],
        ['label' => 'Gingembre en poudre','unit' => 'g'],
        ['label' => 'Noix de muscade',   'unit' => 'g'],
        ['label' => 'Paprika doux',      'unit' => 'g'],
        ['label' => 'Paprika fumé',      'unit' => 'g'],
        ['label' => 'Piment d\'Espelette','unit' => 'g'],
        ['label' => 'Poivre noir',       'unit' => 'g'],
        ['label' => 'Sel fin',           'unit' => 'g'],
        ['label' => 'Vanille (gousse)',  'unit' => null],
        ['label' => 'Vanille (extrait)', 'unit' => 'ml'],
        ['label' => 'Safran',            'unit' => 'g'],
        ['label' => 'Clous de girofle', 'unit' => 'g'],

        // ── Sauces & liquides salés ───────────────────────────────────────────
        ['label' => 'Bouillon de poulet','unit' => 'ml'],
        ['label' => 'Bouillon de légumes','unit' => 'ml'],
        ['label' => 'Bouillon de bœuf', 'unit' => 'ml'],
        ['label' => 'Concentré de tomate','unit' => 'g'],
        ['label' => 'Huile d\'olive',   'unit' => 'ml'],
        ['label' => 'Huile de sésame',  'unit' => 'ml'],
        ['label' => 'Huile de tournesol','unit' => 'ml'],
        ['label' => 'Mirin',            'unit' => 'ml'],
        ['label' => 'Miso blanc',       'unit' => 'g'],
        ['label' => 'Moutarde de Dijon','unit' => 'g'],
        ['label' => 'Sauce soja',       'unit' => 'ml'],
        ['label' => 'Sauce Worcestershire','unit' => 'ml'],
        ['label' => 'Tabasco',          'unit' => 'ml'],
        ['label' => 'Vinaigre balsamique','unit' => 'ml'],
        ['label' => 'Vinaigre de cidre','unit' => 'ml'],
        ['label' => 'Vinaigre de riz',  'unit' => 'ml'],
        ['label' => 'Vinaigre de vin blanc','unit' => 'ml'],

        // ── Sucres & agents levants ───────────────────────────────────────────
        ['label' => 'Bicarbonate de soude','unit' => 'g'],
        ['label' => 'Cassonade',        'unit' => 'g'],
        ['label' => 'Levure chimique',  'unit' => 'g'],
        ['label' => 'Levure de boulanger','unit' => 'g'],
        ['label' => 'Miel',             'unit' => 'g'],
        ['label' => 'Sirop d\'agave',   'unit' => 'ml'],
        ['label' => 'Sirop d\'érable',  'unit' => 'ml'],
        ['label' => 'Sucre blanc',      'unit' => 'g'],
        ['label' => 'Sucre glace',      'unit' => 'g'],
        ['label' => 'Sucre roux',       'unit' => 'g'],
        ['label' => 'Sucre vanillé',    'unit' => 'g'],

        // ── Chocolat, fruits secs & divers ────────────────────────────────────
        ['label' => 'Amandes effilées', 'unit' => 'g'],
        ['label' => 'Amandes en poudre','unit' => 'g'],
        ['label' => 'Cacahuètes',       'unit' => 'g'],
        ['label' => 'Cacao en poudre',  'unit' => 'g'],
        ['label' => 'Chocolat au lait', 'unit' => 'g'],
        ['label' => 'Chocolat blanc',   'unit' => 'g'],
        ['label' => 'Chocolat noir (70%)','unit' => 'g'],
        ['label' => 'Noix',             'unit' => 'g'],
        ['label' => 'Noix de cajou',    'unit' => 'g'],
        ['label' => 'Noix de coco râpée','unit' => 'g'],
        ['label' => 'Noisettes',        'unit' => 'g'],
        ['label' => 'Pignons de pin',   'unit' => 'g'],
        ['label' => 'Pistaches',        'unit' => 'g'],
        ['label' => 'Raisins secs',     'unit' => 'g'],
        ['label' => 'Sésame blanc',     'unit' => 'g'],
        ['label' => 'Sésame noir',      'unit' => 'g'],
        ['label' => 'Tahini (purée de sésame)','unit' => 'g'],

        // ── Conserves & bocaux ────────────────────────────────────────────────
        ['label' => 'Câpres',           'unit' => 'g'],
        ['label' => 'Cornichons',       'unit' => 'g'],
        ['label' => 'Haricots blancs (conserve)','unit' => 'g'],
        ['label' => 'Lait de coco',     'unit' => 'ml'],
        ['label' => 'Crème de coco',    'unit' => 'ml'],
        ['label' => 'Olives noires',    'unit' => 'g'],
        ['label' => 'Olives vertes',    'unit' => 'g'],

        // ── Gélifiant & épaississants ─────────────────────────────────────────
        ['label' => 'Gélatine (feuilles)','unit' => 'g'],
        ['label' => 'Agar-agar',        'unit' => 'g'],
        ['label' => 'Arrow-root',       'unit' => 'g'],

        // ── Boissons & mixologie ──────────────────────────────────────────────
        ['label' => 'Eau gazeuse',      'unit' => 'ml'],
        ['label' => 'Eau de coco',      'unit' => 'ml'],
        ['label' => 'Jus d\'orange frais','unit' => 'ml'],
        ['label' => 'Jus de citron frais','unit' => 'ml'],
        ['label' => 'Jus de citron vert frais','unit' => 'ml'],
        ['label' => 'Jus de cranberry', 'unit' => 'ml'],
        ['label' => 'Jus de grenade',   'unit' => 'ml'],
        ['label' => 'Jus de mangue',    'unit' => 'ml'],
        ['label' => 'Jus de pamplemousse','unit' => 'ml'],
        ['label' => 'Jus d\'ananas',    'unit' => 'ml'],
        ['label' => 'Sirop de hibiscus','unit' => 'ml'],
        ['label' => 'Sirop de violette','unit' => 'ml'],
        ['label' => 'Sirop de rose',    'unit' => 'ml'],
        ['label' => 'Sirop de grenadine','unit' => 'ml'],
        ['label' => 'Sirop de framboise','unit' => 'ml'],
        ['label' => 'Sirop de mangue',  'unit' => 'ml'],
        ['label' => 'Sirop de passion', 'unit' => 'ml'],
        ['label' => 'Sirop de gingembre','unit' => 'ml'],
        ['label' => 'Sirop de lavande', 'unit' => 'ml'],
        ['label' => 'Sirop de citron',  'unit' => 'ml'],
        ['label' => 'Sirop de canne',   'unit' => 'ml'],
        ['label' => 'Sirop d\'orgeat',  'unit' => 'ml'],
        ['label' => 'Sirop de concombre','unit' => 'ml'],
        ['label' => 'Eau de fleur d\'oranger','unit' => 'ml'],
        ['label' => 'Eau de rose',      'unit' => 'ml'],
        ['label' => 'Thé vert infusé',  'unit' => 'ml'],
        ['label' => 'Thé noir infusé',  'unit' => 'ml'],
        ['label' => 'Thé hibiscus infusé','unit' => 'ml'],
        ['label' => 'Kombucha nature',  'unit' => 'ml'],
        ['label' => 'Lait de coco (boisson)','unit' => 'ml'],
        ['label' => 'Lait d\'amande',   'unit' => 'ml'],
        ['label' => 'Soda au gingembre (ginger beer)','unit' => 'ml'],
        ['label' => 'Tonic water',      'unit' => 'ml'],
        ['label' => 'Soda citron (limonade)','unit' => 'ml'],
        ['label' => 'Cola',             'unit' => 'ml'],
        ['label' => 'Soda framboise',   'unit' => 'ml'],
        ['label' => 'Bitter (Angostura sans alcool)','unit' => 'ml'],
        ['label' => 'Vinaigre de cidre (shrub)','unit' => 'ml'],
    ];

    public function load(ObjectManager $manager): void
    {
        foreach (self::INGREDIENTS as $index => $data) {
            $ingredient = new Ingredient();
            $ingredient->setLabel($data['label']);

            // unit est nullable dans l'entité, donc on teste avant de setter
            if ($data['unit'] !== null) {
                $ingredient->setUnit($data['unit']);
            }

            $manager->persist($ingredient);

            /**
             * addReference() permet à d'autres fixtures de récupérer
             * cet ingrédient par une clé nommée, sans requête BDD.
             * 
             * Ex dans RecipeFixture :
             *   $ail = $this->getReference('ingredient_ail', Ingredient::class);
             */
            $this->addReference('ingredient_' . $index, $ingredient);

            // flush() par batch de 50 pour éviter de saturer la mémoire
            if ($index % 50 === 0) {
                $manager->flush();
            }
        }

        $manager->flush();
    }

    public static function getGroups(): array
    {
        return ['ingredients'];
    }
}