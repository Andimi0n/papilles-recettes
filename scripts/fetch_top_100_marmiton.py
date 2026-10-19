#!/usr/bin/env python3
import urllib.request
import re
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
}

UNITS = [
    'cuillères à soupe', 'cuillère à soupe', 'c. à soupe', 'c à soupe', 'c.a.s', 'cas',
    'cuillères à café', 'cuillère à café', 'c. à café', 'c à café', 'c.a.c', 'cac',
    'kg', 'g', 'grammes', 'gramme', 'l', 'litres', 'litre', 'cl', 'ml', 'dl',
    'pincées', 'pincée', 'brins', 'brin', 'gousses', 'gousse', 'boîtes', 'boîte',
    'sachets', 'sachet', 'tranches', 'tranche', 'pots', 'pot', 'verres', 'verre',
    'feuilles', 'feuille', 'morceaux', 'morceau', 'bottes', 'botte', 'paquets', 'paquet',
    'plaques', 'plaque', 'boules', 'boule', 'pavés', 'pavé', 'filets', 'filet'
]
UNIT_PATTERN = '|'.join(sorted(UNITS, key=len, reverse=True))

def parse_iso_duration(d):
    if not d:
        return 0
    m_h = re.search(r'(\d+)H', d)
    m_m = re.search(r'(\d+)M', d)
    hours = int(m_h.group(1)) if m_h else 0
    minutes = int(m_m.group(1)) if m_m else 0
    return hours * 60 + minutes

def parse_servings(y):
    if not y:
        return 4
    m = re.search(r'(\d+)', str(y))
    return int(m.group(1)) if m else 4

def normalize_category(cat_str):
    if not cat_str:
        return 'Plat'
    c = cat_str.lower()
    if any(k in c for k in ['dessert', 'gâteau', 'gateau', 'tarte sucrée', 'biscuit', 'crêpe', 'crepe', 'mousse', 'flan', 'confiserie', 'brioche', 'pâtisserie', 'chocolat']):
        return 'Dessert'
    if any(k in c for k in ['entrée', 'entree', 'salade', 'soupe', 'velouté', 'potage', 'quiche', 'tourte', 'tarte salée']):
        return 'Entrée'
    if any(k in c for k in ['apéritif', 'aperitif', 'amuse-bouche', 'tapas', 'cocktail dînatoire']):
        return 'Apéritif'
    if any(k in c for k in ['boisson', 'cocktail', 'smoothie', 'jus']):
        return 'Boisson'
    if any(k in c for k in ['petit-déjeuner', 'petit dejeuner', 'brunch']):
        return 'Petit-déjeuner'
    return 'Plat'

def parse_ingredient(s):
    s = s.strip()
    qty = ''
    unit = ''
    name = s

    # Regex pour capturer la quantité au début (ex: 200, 1/2, 2.5, 2-3)
    m_qty = re.match(r'^([\d]+(?:[.,/][\d]+)?(?:\s*-\s*[\d]+)?)\s*(.*)$', s)
    if m_qty:
        qty = m_qty.group(1).strip()
        rest = m_qty.group(2).strip()

        # Chercher une unité
        m_unit = re.match(rf'^({UNIT_PATTERN})\b\s*(?:d\'|de\s+|du\s+|des\s+)?(.*)$', rest, re.IGNORECASE)
        if m_unit:
            raw_unit = m_unit.group(1).lower().strip()
            if raw_unit in ['cuillères à soupe', 'cuillère à soupe', 'c. à soupe', 'c à soupe', 'c.a.s', 'cas']:
                unit = 'c. à soupe'
            elif raw_unit in ['cuillères à café', 'cuillère à café', 'c. à café', 'c à café', 'c.a.c', 'cac']:
                unit = 'c. à café'
            elif raw_unit in ['grammes', 'gramme']:
                unit = 'g'
            elif raw_unit in ['litres', 'litre']:
                unit = 'l'
            elif raw_unit in ['pincées', 'pincée']:
                unit = 'pincée'
            elif raw_unit in ['gousses', 'gousse']:
                unit = 'gousses'
            elif raw_unit in ['sachets', 'sachet']:
                unit = 'sachet'
            else:
                unit = raw_unit
            name = m_unit.group(2).strip()
        else:
            m_prep = re.match(r'^(?:d\'|de\s+|du\s+|des\s+)(.*)$', rest, re.IGNORECASE)
            if m_prep:
                name = m_prep.group(1).strip()
            else:
                name = rest

    name = re.sub(r'^(?:d\'|de\s+|du\s+|des\s+)', '', name, flags=re.IGNORECASE).strip()
    # Nettoyage ponctuation résiduelle
    name = name.rstrip('.,;:')
    if name:
        name = name[0].upper() + name[1:]
    return {'quantity': qty, 'unit': unit, 'name': name}

def clean_title(title):
    t = title
    t = re.sub(r'\s*:\s*la meilleure recette.*', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*-\s*Marmiton.*', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*:\s*recette.*', '', t, flags=re.IGNORECASE)
    t = t.replace('&amp;', '&').replace('&#039;', "'").strip()
    if t:
        t = t[0].upper() + t[1:]
    return t

def collect_100_links():
    links = []
    print("🔍 Récupération des 100 meilleures recettes Marmiton...")
    for page in range(1, 9):
        url = f'https://www.marmiton.org/recettes/recherche.aspx?sort=popularite_desc&page={page}'
        req = urllib.request.Request(url, headers=HEADERS)
        try:
            html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8')
            found = re.findall(r'/recettes/recette_[a-zA-Z0-9\-_]+_\d+\.aspx', html)
            for f in found:
                full_url = f'https://www.marmiton.org{f}'
                if full_url not in links:
                    links.append(full_url)
            print(f"  Page {page} analysée, {len(links)} recettes uniques trouvées.")
            if len(links) >= 100:
                break
        except Exception as e:
            print(f"  Erreur page {page}:", e)
        time.sleep(0.5)

    return links[:100]

def fetch_single_recipe(url, index):
    req = urllib.request.Request(url, headers=HEADERS)
    html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8')

    scripts = re.findall(r'<script[^>]*type=[\"\']application/ld\+json[\"\'][^>]*>(.*?)</script>', html, re.DOTALL)
    recipe_item = None
    for s in scripts:
        try:
            d = json.loads(s)
            graph = d.get('@graph', [d]) if isinstance(d, dict) else d
            for it in graph:
                if isinstance(it, dict) and (it.get('@type') == 'Recipe' or 'Recipe' in str(it.get('@type', ''))):
                    recipe_item = it
                    break
        except Exception:
            pass
        if recipe_item:
            break

    if not recipe_item:
        raise ValueError(f"Pas de LD+JSON Recipe sur {url}")

    raw_title = recipe_item.get('name', 'Recette Marmiton')
    title = clean_title(raw_title)

    desc = recipe_item.get('description', '')
    desc = re.sub(r'<[^>]+>', '', desc).replace('&amp;', '&').replace('&#039;', "'").strip()

    category = normalize_category(recipe_item.get('recipeCategory', 'Plat'))

    prep_time = parse_iso_duration(recipe_item.get('prepTime', ''))
    if prep_time <= 0:
        prep_time = 15
    cook_time = parse_iso_duration(recipe_item.get('cookTime', ''))
    servings = parse_servings(recipe_item.get('recipeYield', '4'))

    total_time = prep_time + cook_time
    if total_time <= 30:
        difficulty = 'Facile'
    elif total_time <= 75:
        difficulty = 'Moyen'
    else:
        difficulty = 'Difficile'

    recipe_id = f'rec_top100_{index:03d}'
    now = '2026-03-01T12:00:00.000Z'

    raw_ingredients = recipe_item.get('recipeIngredient', [])
    ingredients = []
    for idx, ing_str in enumerate(raw_ingredients):
        parsed = parse_ingredient(ing_str)
        ingredients.append({
            'id': f'ing_{recipe_id}_{idx + 1}',
            'name': parsed['name'],
            'quantity': parsed['quantity'],
            'unit': parsed['unit']
        })

    raw_steps = recipe_item.get('recipeInstructions', [])
    steps = []
    step_order = 1
    for item in raw_steps:
        text = ''
        if isinstance(item, dict):
            text = item.get('text', '')
        elif isinstance(item, str):
            text = item
        clean_text = text.replace('\r\n', ' ').replace('\n', ' ').strip()
        if clean_text:
            steps.append({
                'id': f'stp_{recipe_id}_{step_order}',
                'order': step_order,
                'instruction': clean_text
            })
            step_order += 1

    return {
        'id': recipe_id,
        'title': title,
        'description': desc,
        'category': category,
        'difficulty': difficulty,
        'prepTimeMinutes': prep_time,
        'cookTimeMinutes': cook_time,
        'servings': servings,
        'rating': 0,        # 0 étoile par défaut
        'imageUrl': '',     # pas besoin de photo
        'isFavorite': False,
        'userNote': f"Recette culte issue du Top Marmiton ({url})",
        'createdAt': now,
        'updatedAt': now,
        'ingredients': ingredients,
        'steps': steps
    }

def main():
    links = collect_100_links()
    print(f"\n🚀 Téléchargement et structuration des {len(links)} recettes...")

    recipes = []
    success_count = 0

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(fetch_single_recipe, url, i + 1): (i + 1, url) for i, url in enumerate(links)}
        for future in as_completed(futures):
            idx, url = futures[future]
            try:
                rec = future.result()
                recipes.append(rec)
                success_count += 1
                if success_count % 10 == 0 or success_count == len(links):
                    print(f"  ✅ {success_count}/{len(links)} recettes traitées...")
            except Exception as e:
                print(f"  ⚠️ Erreur sur {url}: {e}")

    # Tri par ID pour avoir un ordre cohérent 001 à 100
    recipes.sort(key=lambda r: r['id'])
    print(f"\n✨ {len(recipes)} recettes extraites avec succès avec 0 étoile et sans photo !")

    # Génération du fichier initialRecipes.ts
    ts_content = f"""import {{ Recipe }} from '../types/recipe';

/**
 * Les 100 meilleures recettes cultes de Marmiton,
 * pré-chargées par défaut dans Papilles avec 0 étoile et sans photos.
 */
export const INITIAL_RECIPES: Recipe[] = {json.dumps(recipes, ensure_ascii=False, indent=2)};
"""

    output_path = 'src/data/initialRecipes.ts'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)

    print(f"💾 Fichier écrit avec succès dans {output_path} ({len(recipes)} recettes) !")

if __name__ == '__main__':
    main()
