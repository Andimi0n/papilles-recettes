import { Recipe, Ingredient } from '../types/recipe';
import { DayOfWeek, MealTime, PlannerMode } from '../types/planner';

/**
 * Nettoie une chaîne de caractères (minuscule, sans accents, sans espaces superflus)
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes normalisées.
 * Optimisé en mémoire O(min(M, N)).
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  if (a.length > b.length) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const aLen = a.length;
  const bLen = b.length;
  let prevRow = new Array(aLen + 1);
  let currRow = new Array(aLen + 1);

  for (let i = 0; i <= aLen; i++) {
    prevRow[i] = i;
  }

  for (let j = 1; j <= bLen; j++) {
    currRow[0] = j;
    const bChar = b[j - 1];

    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === bChar ? 0 : 1;
      currRow[i] = Math.min(
        currRow[i - 1] + 1,      // insertion
        prevRow[i] + 1,          // suppression
        prevRow[i - 1] + cost    // substitution
      );
    }

    for (let i = 0; i <= aLen; i++) {
      prevRow[i] = currRow[i];
    }
  }

  return prevRow[aLen];
}

/**
 * Normalisation avancée pour la recherche :
 * - Minuscules, sans accents
 * - Stemming simple pour le français (pluriels en -s, -x, etc.)
 */
export function stemWord(word: string): string {
  const clean = normalizeString(word);
  if (clean.length <= 3) return clean;

  // Pluriels irréguliers courants
  if (clean === 'oeufs') return 'oeuf';
  if (clean === 'yeux') return 'oeil';
  if (clean === 'ails') return 'ail';

  // Pluriel en -x (gateaux -> gateau, choux -> chou, morceaux -> morceau)
  if (clean.endsWith('x') && clean.length > 4) {
    return clean.slice(0, -1);
  }

  // Pluriel en -s (tomates -> tomate, carottes -> carotte, lardons -> lardon)
  if (clean.endsWith('s') && clean.length > 3) {
    return clean.slice(0, -1);
  }

  return clean;
}

/**
 * Formate une durée en minutes en texte lisible (ex: "25 min" ou "1h15")
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} h`;
  return `${hours}h${remainingMinutes < 10 ? '0' : ''}${remainingMinutes}`;
}

/**
 * Retourne une appréciation textuelle selon la note sur 5
 */
export function getRatingLabel(rating: number): string {
  if (rating >= 4.8) return 'Exceptionnel !';
  if (rating >= 4.2) return 'Excellent';
  if (rating >= 3.5) return 'Très bon';
  if (rating >= 2.5) return 'Bon';
  if (rating >= 1.5) return 'Moyen';
  if (rating > 0) return 'À perfectionner';
  return 'Non noté';
}

/**
 * Extrait la liste unique et ordonnée de tous les noms d'ingrédients présents dans les recettes
 */
export function extractUniqueIngredientNames(recipes: Recipe[]): string[] {
  const map = new Map<string, string>();
  
  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ing) => {
      const clean = ing.name.trim();
      const norm = normalizeString(clean);
      if (clean && !map.has(norm)) {
        map.set(norm, clean);
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

export interface IngredientMatchResult {
  recipe: Recipe;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchCount: number;
  totalIngredients: number;
  matchRatio: number; // 0 to 1
}

/**
 * Calcule la correspondance d'une recette par rapport à un ensemble d'ingrédients choisis
 */
export function matchRecipeWithIngredients(
  recipe: Recipe,
  selectedIngredients: string[]
): IngredientMatchResult {
  if (selectedIngredients.length === 0) {
    return {
      recipe,
      matchedIngredients: [],
      missingIngredients: recipe.ingredients.map((i) => i.name),
      matchCount: 0,
      totalIngredients: recipe.ingredients.length,
      matchRatio: 0,
    };
  }

  const normalizedSelected = selectedIngredients.map(normalizeString);
  const matched: string[] = [];
  const missing: string[] = [];

  recipe.ingredients.forEach((ing) => {
    const normIng = normalizeString(ing.name);
    // Vérifie si un des ingrédients sélectionnés correspond (inclus ou mot-clé)
    const hasMatch = normalizedSelected.some((sel) => normIng.includes(sel) || sel.includes(normIng));
    if (hasMatch) {
      matched.push(ing.name);
    } else {
      missing.push(ing.name);
    }
  });

  const total = recipe.ingredients.length;
  const matchRatio = total > 0 ? matched.length / total : 0;

  return {
    recipe,
    matchedIngredients: matched,
    missingIngredients: missing,
    matchCount: matched.length,
    totalIngredients: total,
    matchRatio,
  };
}

/**
 * Calcule et formate la quantité d'un ingrédient en fonction du ratio de portions
 */
export function scaleQuantity(
  rawQty: string | undefined,
  baseServings: number,
  targetServings: number
): string {
  if (!rawQty || !rawQty.trim() || baseServings <= 0 || targetServings <= 0) {
    return rawQty || '';
  }

  const ratio = targetServings / baseServings;
  if (ratio === 1) return rawQty;

  const trimmed = rawQty.trim().replace(',', '.');

  // Fractions simples ex: "1/2", "3/4"
  const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const den = parseFloat(fractionMatch[2]);
    if (den !== 0) {
      const scaled = (num / den) * ratio;
      return formatScaledNumber(scaled);
    }
  }

  // Nombre composé avec fraction ex: "1 1/2"
  const mixedFractionMatch = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedFractionMatch) {
    const whole = parseFloat(mixedFractionMatch[1]);
    const num = parseFloat(mixedFractionMatch[2]);
    const den = parseFloat(mixedFractionMatch[3]);
    if (den !== 0) {
      const scaled = (whole + num / den) * ratio;
      return formatScaledNumber(scaled);
    }
  }

  // Nombre pur (entier ou décimal)
  const numericVal = parseFloat(trimmed);
  if (!isNaN(numericVal) && trimmed === numericVal.toString()) {
    const scaled = numericVal * ratio;
    return formatScaledNumber(scaled);
  }

  // Chiffre suivi d'un texte (ex: "2 à 3", "1 verre")
  const leadingNumberMatch = trimmed.match(/^([\d.]+)\s*(.*)$/);
  if (leadingNumberMatch) {
    const num = parseFloat(leadingNumberMatch[1]);
    const rest = leadingNumberMatch[2];
    if (!isNaN(num)) {
      const scaled = num * ratio;
      return `${formatScaledNumber(scaled)} ${rest}`.trim();
    }
  }

  // Texte qualitatif ("au goût", "un filet"), on conserve
  return rawQty;
}

function formatScaledNumber(num: number): string {
  if (num <= 0) return '0';
  if (Number.isInteger(num)) return num.toString();

  // Pour les poids/volumes >= 15 (ex: grammes, ml), arrondir à l'entier
  if (num >= 15) {
    return Math.round(num).toString();
  }

  // Fractions usuelles
  const rounded = Math.round(num * 100) / 100;
  if (Math.abs(rounded - 0.5) < 0.05) return '1/2';
  if (Math.abs(rounded - 0.25) < 0.05) return '1/4';
  if (Math.abs(rounded - 0.75) < 0.05) return '3/4';
  if (Math.abs(rounded - 0.33) < 0.05) return '1/3';
  if (Math.abs(rounded - 0.67) < 0.05) return '2/3';

  // Décimal lisible
  const withOneDecimal = Math.round(num * 10) / 10;
  return withOneDecimal.toString().replace('.', ',');
}

let idCounter = 0;

/**
 * Génère un identifiant unique robuste combinant préfixe, timestamp, compteur et aléatoire
 * pour éliminer tout risque de collision (race condition) sur des créations rapides.
 */
export function generateUniqueId(prefix: string): string {
  idCounter = (idCounter + 1) % 10000;
  const rand = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${Date.now()}_${idCounter}_${rand}`;
}

export interface DetectedTimer {
  id: string;
  label: string;
  totalSeconds: number;
}

/**
 * Détecte intelligemment les durées culinaires dans une étape de recette (ex: "15 min", "1 h 30", "45 secondes")
 */
export function extractTimersFromText(text: string): DetectedTimer[] {
  if (!text) return [];
  const timers: DetectedTimer[] = [];
  const seenSeconds = new Set<number>();
  let remainingText = text;

  // 1. Heures + Minutes (ex: "1h30", "1 heure 15 minutes", "2 h 05")
  const hourMinRegex = /\b(\d+)\s*(?:h|heures?)\s*(?:et\s*)?(\d+)\s*(?:min|minutes?|mn)?\b/gi;
  let match: RegExpExecArray | null;
  while ((match = hourMinRegex.exec(text)) !== null) {
    const hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const totalSec = (hours * 60 + mins) * 60;
    if (totalSec > 0 && !seenSeconds.has(totalSec)) {
      seenSeconds.add(totalSec);
      timers.push({
        id: `timer_${totalSec}`,
        label: `${hours}h${mins < 10 ? '0' : ''}${mins}`,
        totalSeconds: totalSec,
      });
    }
  }
  remainingText = remainingText.replace(hourMinRegex, ' ');

  // 2. Heure et demie (ex: "1 heure et demie")
  const hourHalfRegex = /\b(\d+)\s*(?:h|heures?)\s*et\s*demi[e]?\b/gi;
  while ((match = hourHalfRegex.exec(remainingText)) !== null) {
    const hours = parseInt(match[1], 10);
    const totalSec = Math.round((hours + 0.5) * 3600);
    if (!seenSeconds.has(totalSec)) {
      seenSeconds.add(totalSec);
      timers.push({
        id: `timer_${totalSec}`,
        label: `${hours}h30`,
        totalSeconds: totalSec,
      });
    }
  }
  remainingText = remainingText.replace(hourHalfRegex, ' ');

  // 3. Heures seules (ex: "1 heure", "2 h", "3 heures")
  const hourRegex = /\b(\d+)\s*(?:h|heures?)\b/gi;
  while ((match = hourRegex.exec(remainingText)) !== null) {
    const hours = parseInt(match[1], 10);
    const totalSec = hours * 3600;
    if (totalSec > 0 && !seenSeconds.has(totalSec)) {
      seenSeconds.add(totalSec);
      timers.push({
        id: `timer_${totalSec}`,
        label: `${hours} h`,
        totalSeconds: totalSec,
      });
    }
  }
  remainingText = remainingText.replace(hourRegex, ' ');

  // 4. Fourchettes de minutes (ex: "15 à 20 min", "10-15 minutes")
  const rangeMinRegex = /\b(\d+)\s*(?:à|-)\s*(\d+)\s*(?:min|minutes?|mn)\b/gi;
  while ((match = rangeMinRegex.exec(remainingText)) !== null) {
    const min1 = parseInt(match[1], 10);
    const min2 = parseInt(match[2], 10);
    const totalSec = min1 * 60;
    if (totalSec > 0 && !seenSeconds.has(totalSec)) {
      seenSeconds.add(totalSec);
      timers.push({
        id: `timer_${totalSec}`,
        label: `${min1} à ${min2} min`,
        totalSeconds: totalSec,
      });
    }
  }
  remainingText = remainingText.replace(rangeMinRegex, ' ');

  // 5. Minutes simples (ex: "15 min", "20 minutes", "5 mn")
  const minRegex = /\b(\d+)\s*(?:min|minutes?|mn)\b/gi;
  while ((match = minRegex.exec(remainingText)) !== null) {
    const mins = parseInt(match[1], 10);
    const totalSec = mins * 60;
    if (totalSec > 0 && !seenSeconds.has(totalSec)) {
      seenSeconds.add(totalSec);
      timers.push({
        id: `timer_${totalSec}`,
        label: `${mins} min`,
        totalSeconds: totalSec,
      });
    }
  }
  remainingText = remainingText.replace(minRegex, ' ');

  // 6. Secondes (ex: "30 secondes", "45 sec")
  const secRegex = /\b(\d+)\s*(?:secondes?|sec)\b/gi;
  while ((match = secRegex.exec(remainingText)) !== null) {
    const secs = parseInt(match[1], 10);
    if (secs > 0 && !seenSeconds.has(secs)) {
      seenSeconds.add(secs);
      timers.push({
        id: `timer_${secs}`,
        label: `${secs} sec`,
        totalSeconds: secs,
      });
    }
  }

  return timers;
}

/**
 * Formate un nombre de secondes en texte mm:ss ou hh:mm:ss
 */
export function formatTimerSeconds(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSecs = seconds % 60;

  const mm = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const ss = remainingSecs < 10 ? `0${remainingSecs}` : `${remainingSecs}`;

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Retourne la date locale au format ISO "YYYY-MM-DD"
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Décale une date "YYYY-MM-DD" d'un nombre de jours (+1 ou -1)
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

/**
 * Retourne le jour de la semaine ('Lundi' ... 'Dimanche') correspondant à une date
 */
export function getDayOfWeekFromDateString(dateStr: string): DayOfWeek {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const mapping: DayOfWeek[] = [
    'Dimanche',
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
  ];
  return mapping[date.getDay()];
}

/**
 * Formate une date "YYYY-MM-DD" pour un affichage convivial en français
 */
export function formatMealLogDateFrench(dateStr: string): string {
  const todayStr = getLocalDateString(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  if (dateStr === todayStr) {
    return "Aujourd'hui";
  }
  if (dateStr === yesterdayStr) {
    return 'Hier';
  }
  if (dateStr === tomorrowStr) {
    return 'Demain';
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  return `${days[dateObj.getDay()]} ${d} ${months[m - 1]}`;
}

export interface PlannerDaySlot {
  key: string;
  dayName: DayOfWeek;
  dateStr?: string;
  mainLabel: string;
  dateLabel?: string;
  tabPillLabel: string;
  isToday: boolean;
  isTomorrow: boolean;
  lunchKey: string;
  dinnerKey: string;
  isLunchPassed: boolean;
  isDinnerPassed: boolean;
}

export const ORDERED_DAYS_OF_WEEK: DayOfWeek[] = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

/**
 * Retourne les 7 jours de la semaine réordonnés en commençant par startDay
 */
export function getOrderedDaysOfWeek(startDay: DayOfWeek = 'Lundi'): DayOfWeek[] {
  const startIndex = ORDERED_DAYS_OF_WEEK.indexOf(startDay);
  if (startIndex <= 0) return [...ORDERED_DAYS_OF_WEEK];
  return [
    ...ORDERED_DAYS_OF_WEEK.slice(startIndex),
    ...ORDERED_DAYS_OF_WEEK.slice(0, startIndex),
  ];
}

/**
 * Formate une date courte en français (ex: "22 oct.", "3 nov.")
 */
export function formatShortDateFrench(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
  ];
  return `${d} ${months[m - 1]}`;
}

/**
 * Indique si un créneau de repas (midi ou soir) est déjà passé par rapport à l'heure courante
 */
export function isMealPassed(
  dateStr: string,
  mealTime: MealTime,
  now: Date = new Date()
): boolean {
  const todayStr = getLocalDateString(now);
  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;

  // C'est aujourd'hui : comparaison de l'heure courante
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const totalMinutes = currentHour * 60 + currentMinutes;

  if (mealTime === 'lunch') {
    // Déjeuner passé à partir de 14h00
    return totalMinutes >= 14 * 60;
  }

  if (mealTime === 'dinner') {
    // Dîner passé à partir de 21h30
    return totalMinutes >= 21 * 60 + 30;
  }

  return false;
}

/**
 * Génère les 7 créneaux journaliers selon le mode de planification (fixe ou dynamique)
 */
export function getPlannerDaySlots(
  mode: PlannerMode,
  startDay: DayOfWeek = 'Lundi',
  now: Date = new Date()
): PlannerDaySlot[] {
  const todayStr = getLocalDateString(now);
  const todayDayOfWeek = getDayOfWeekFromDateString(todayStr);

  if (mode === 'fixed') {
    const orderedDays = getOrderedDaysOfWeek(startDay);
    return orderedDays.map((day) => {
      return {
        key: day,
        dayName: day,
        mainLabel: day,
        tabPillLabel: day.slice(0, 3),
        isToday: false,
        isTomorrow: false,
        lunchKey: `${day}_lunch`,
        dinnerKey: `${day}_dinner`,
        isLunchPassed: false,
        isDinnerPassed: false,
      };
    });
  }

  // Mode dynamique : 7 jours glissants à partir d'aujourd'hui
  const slots: PlannerDaySlot[] = [];
  for (let i = 0; i < 7; i++) {
    const dateStr = addDaysToDateString(todayStr, i);
    const dayName = getDayOfWeekFromDateString(dateStr);
    const dateLabel = formatShortDateFrench(dateStr);

    let mainLabel: string;
    let tabPillLabel: string;

    if (i === 0) {
      mainLabel = "Aujourd'hui";
      tabPillLabel = 'Auj.';
    } else if (i === 1) {
      mainLabel = 'Demain';
      tabPillLabel = 'Dem.';
    } else if (i === 2) {
      // Le jour qu'il sera après-demain
      mainLabel = dayName;
      tabPillLabel = dayName.slice(0, 3);
    } else {
      mainLabel = dayName;
      tabPillLabel = dayName.slice(0, 3);
    }

    slots.push({
      key: dateStr,
      dayName,
      dateStr,
      mainLabel,
      dateLabel,
      tabPillLabel,
      isToday: i === 0,
      isTomorrow: i === 1,
      lunchKey: `${dateStr}_lunch`,
      dinnerKey: `${dateStr}_dinner`,
      isLunchPassed: isMealPassed(dateStr, 'lunch', now),
      isDinnerPassed: isMealPassed(dateStr, 'dinner', now),
    });
  }

  return slots;
}


