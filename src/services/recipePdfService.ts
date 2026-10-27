import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Recipe } from '../types/recipe';
import { scaleQuantity, formatDuration } from '../utils/helpers';
import { formatQuantityWithUnit } from '../constants/units';
import { RecipeShareService } from './recipeShareService';

export interface RecipePrintOptions {
  servings?: number;
  includePhoto?: boolean;
  includeQrCode?: boolean;
  includeNotesLines?: boolean;
}

/**
 * Sécurise les chaînes de texte pour injection dans le HTML.
 */
function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Prépare l'URL d'image pour l'impression HTML (conversion en base64 pour les fichiers locaux).
 */
async function resolveImageForHtml(imageUrl: string | undefined): Promise<string | null> {
  if (!imageUrl || !imageUrl.trim()) return null;
  const trimmed = imageUrl.trim();

  // Si c'est déjà un data URI ou une URL web sécurisée
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Si c'est un fichier local (ex: file://...), convertir en base64 via expo-image-manipulator
  try {
    const result = await manipulateAsync(
      trimmed,
      [{ resize: { width: 800 } }],
      { compress: 0.75, format: SaveFormat.JPEG, base64: true }
    );
    if (result.base64) {
      return `data:image/jpeg;base64,${result.base64}`;
    }
    return result.uri;
  } catch (e) {
    console.warn('[RecipePdfService] Impossible de convertir l\'image locale en base64:', e);
    return trimmed;
  }
}

export const RecipePdfService = {
  /**
   * Génère le code HTML complet formaté pour impression A4 portrait.
   */
  async generateRecipeHtml(recipe: Recipe, options: RecipePrintOptions = {}): Promise<string> {
    const targetServings = options.servings && options.servings > 0
      ? options.servings
      : (recipe.servings || 4);

    const baseServings = recipe.servings || 4;
    const includePhoto = options.includePhoto !== false;
    const includeQrCode = options.includeQrCode !== false;
    const includeNotesLines = options.includeNotesLines !== false;

    // Résolution photo
    let resolvedImageSrc: string | null = null;
    if (includePhoto && recipe.imageUrl) {
      resolvedImageSrc = await resolveImageForHtml(recipe.imageUrl);
    }

    // Résolution QR code
    let qrCodeBmp: string | null = null;
    if (includeQrCode) {
      qrCodeBmp = RecipeShareService.generateRecipeQrCodeBmp(recipe);
    }

    // Calculs temps
    const prepMinutes = recipe.prepTimeMinutes || 0;
    const cookMinutes = recipe.cookTimeMinutes || 0;
    const totalMinutes = prepMinutes + cookMinutes;

    // Ingrédients avec quantités mises à l'échelle
    const ingredientsHtml = (recipe.ingredients || []).map((ing) => {
      const scaled = scaleQuantity(ing.quantity, baseServings, targetServings);
      const qtyUnit = formatQuantityWithUnit(scaled, ing.unit);

      let tagLabel = '';
      if (ing.isPantryStaple) {
        tagLabel = '<span class="tag-badge">placard</span>';
      } else if (ing.isOptional) {
        tagLabel = '<span class="tag-badge">facultatif</span>';
      }

      return `
        <div class="ingredient-row">
          <div class="checkbox-bullet"></div>
          <div class="ingredient-text">
            ${qtyUnit ? `<strong class="ingredient-qty">${escapeHtml(qtyUnit)}</strong> ` : ''}
            <span>${escapeHtml(ing.name)}</span>
            ${tagLabel}
          </div>
        </div>
      `;
    }).join('');

    // Étapes ordonnées
    const stepsHtml = (recipe.steps || []).map((step, idx) => {
      const stepNumber = typeof step.order === 'number' ? step.order : idx + 1;
      return `
        <div class="step-item">
          <div class="step-number">${stepNumber}</div>
          <div class="step-instruction">${escapeHtml(step.instruction)}</div>
        </div>
      `;
    }).join('');

    // Tags
    const tagsHtml = (recipe.tags && recipe.tags.length > 0)
      ? recipe.tags.map((t) => `<span class="meta-tag">#${escapeHtml(t)}</span>`).join(' ')
      : '';

    // Date du jour pour le footer
    const todayStr = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(recipe.title)} — Fiche Recette Papilles</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1F2937;
      background: #FFFFFF;
      font-size: 12.5px;
      line-height: 1.45;
    }

    /* En-tête */
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #1B3D2C;
      padding-bottom: 5px;
      margin-bottom: 12px;
    }
    .brand {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #1B3D2C;
      text-transform: uppercase;
    }
    .brand-sub {
      font-size: 10px;
      font-weight: 500;
      color: #64748B;
      margin-left: 6px;
    }
    .category-badge {
      font-size: 10px;
      font-weight: 700;
      color: #FFFFFF;
      background: #1B3D2C;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Layout héro avec photo */
    .hero-layout {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      align-items: flex-start;
    }
    .hero-content {
      flex: 1;
    }
    .recipe-title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 24px;
      font-weight: 700;
      color: #1B3D2C;
      margin-bottom: 4px;
      line-height: 1.2;
    }
    .recipe-desc {
      font-size: 12px;
      font-style: italic;
      color: #4B5563;
      margin-bottom: 8px;
      line-height: 1.35;
    }

    /* Grille de métadonnées */
    .meta-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 12px;
      background: #F8FAF7;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 7px 10px;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
    }
    .meta-label {
      color: #64748B;
    }
    .meta-val {
      font-weight: 700;
      color: #1E293B;
    }
    .meta-tag {
      font-size: 10.5px;
      color: #2D6A4F;
      font-weight: 600;
      background: #E8F5E9;
      padding: 1px 6px;
      border-radius: 4px;
      margin-right: 3px;
    }

    /* Photo */
    .hero-photo-wrap {
      width: 155px;
      height: 115px;
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #CBD5E1;
      background: #F1F5F9;
    }
    .hero-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Titres de section */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1.5px solid #1B3D2C;
      padding-bottom: 3px;
      margin: 12px 0 8px 0;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #1B3D2C;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .section-sub {
      font-size: 11px;
      font-weight: 500;
      color: #64748B;
    }

    /* Ingrédients sur 2 colonnes */
    .ingredients-columns {
      column-count: 2;
      column-gap: 20px;
      margin-bottom: 8px;
    }
    .ingredient-row {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 3px 0;
      border-bottom: 1px dotted #E2E8F0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .checkbox-bullet {
      width: 10px;
      height: 10px;
      border: 1.2px solid #94A3B8;
      border-radius: 2px;
      flex-shrink: 0;
      margin-top: 3px;
      background: #FFFFFF;
    }
    .ingredient-text {
      font-size: 11.5px;
      color: #1E293B;
      flex: 1;
      line-height: 1.3;
    }
    .ingredient-qty {
      font-weight: 700;
      color: #1B3D2C;
    }
    .tag-badge {
      display: inline-block;
      font-size: 8.5px;
      font-weight: 600;
      padding: 1px 4px;
      border-radius: 3px;
      background: #F1F5F9;
      color: #64748B;
      margin-left: 3px;
      vertical-align: middle;
    }

    /* Étapes de préparation */
    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      margin-bottom: 10px;
    }
    .step-item {
      display: flex;
      gap: 9px;
      align-items: flex-start;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .step-number {
      width: 19px;
      height: 19px;
      border-radius: 50%;
      background: #1B3D2C;
      color: #FFFFFF;
      font-size: 10.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-instruction {
      flex: 1;
      font-size: 12px;
      line-height: 1.45;
      color: #1E293B;
    }

    /* Encadré Notes & Astuces */
    .notes-card {
      background: #FDFBF7;
      border: 1px solid #EFE4D6;
      border-left: 4px solid #C86D51;
      border-radius: 6px;
      padding: 8px 12px;
      margin: 10px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .notes-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #C86D51;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .notes-text {
      font-size: 11.5px;
      color: #334155;
      line-height: 1.4;
    }
    .handwritten-lines {
      margin-top: 6px;
    }
    .handwritten-line {
      border-bottom: 1px dashed #CBD5E1;
      height: 18px;
    }

    /* Pied de page & QR Code */
    .footer-wrap {
      border-top: 1px solid #E2E8F0;
      padding-top: 7px;
      margin-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #64748B;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .footer-brand {
      font-weight: 700;
      color: #1B3D2C;
    }
    .footer-qr-group {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .footer-qr-img {
      width: 44px;
      height: 44px;
      display: block;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      background: #FFFFFF;
    }
    .footer-qr-caption {
      font-size: 8.5px;
      color: #64748B;
      max-width: 140px;
      line-height: 1.25;
    }
  </style>
</head>
<body>

  <!-- Top bar -->
  <div class="header-top">
    <div>
      <span class="brand">Papilles</span>
      <span class="brand-sub">• Carnet de Recettes Familial</span>
    </div>
    <div>
      <span class="category-badge">${escapeHtml(recipe.category)}</span>
      ${recipe.isVegetarian ? '<span class="category-badge" style="background:#2D6A4F;margin-left:4px;">🌱 Végétarien</span>' : ''}
    </div>
  </div>

  <!-- Hero Header avec photo éventuelle -->
  <div class="hero-layout">
    <div class="hero-content">
      <h1 class="recipe-title">${escapeHtml(recipe.title)}</h1>
      ${recipe.description ? `<p class="recipe-desc">${escapeHtml(recipe.description)}</p>` : ''}

      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">👥 Convives :</span>
          <span class="meta-val">${targetServings} pers.</span>
        </div>
        ${prepMinutes > 0 ? `
        <div class="meta-item">
          <span class="meta-label">⏱️ Préparation :</span>
          <span class="meta-val">${formatDuration(prepMinutes)}</span>
        </div>` : ''}
        ${cookMinutes > 0 ? `
        <div class="meta-item">
          <span class="meta-label">🔥 Cuisson :</span>
          <span class="meta-val">${formatDuration(cookMinutes)}</span>
        </div>` : ''}
        ${totalMinutes > 0 ? `
        <div class="meta-item">
          <span class="meta-label">⏳ Total :</span>
          <span class="meta-val">${formatDuration(totalMinutes)}</span>
        </div>` : ''}
        <div class="meta-item">
          <span class="meta-label">🎯 Difficulté :</span>
          <span class="meta-val">${escapeHtml(recipe.difficulty)}</span>
        </div>
        ${recipe.rating > 0 ? `
        <div class="meta-item">
          <span class="meta-label">⭐ Note :</span>
          <span class="meta-val">${recipe.rating.toFixed(1)} / 5</span>
        </div>` : ''}
      </div>

      ${tagsHtml ? `<div style="margin-top:6px;">${tagsHtml}</div>` : ''}
    </div>

    ${resolvedImageSrc ? `
    <div class="hero-photo-wrap">
      <img src="${resolvedImageSrc}" alt="${escapeHtml(recipe.title)}" class="hero-photo" />
    </div>` : ''}
  </div>

  <!-- Ingrédients sur 2 colonnes -->
  <div class="section-header">
    <h2 class="section-title">Ingrédients</h2>
    <span class="section-sub">Pour ${targetServings} convive${targetServings > 1 ? 's' : ''} (${(recipe.ingredients || []).length} ingrédient${(recipe.ingredients || []).length > 1 ? 's' : ''})</span>
  </div>
  <div class="ingredients-columns">
    ${ingredientsHtml}
  </div>

  <!-- Préparation pas à pas -->
  <div class="section-header">
    <h2 class="section-title">Préparation</h2>
    <span class="section-sub">${(recipe.steps || []).length} étape${(recipe.steps || []).length > 1 ? 's' : ''}</span>
  </div>
  <div class="steps-list">
    ${stepsHtml}
  </div>

  <!-- Notes du chef & Notes personnelles -->
  ${(recipe.userNote || includeNotesLines) ? `
  <div class="notes-card">
    ${recipe.userNote ? `
      <div class="notes-title">
        <span>💡 Astuce du chef & notes personnelles :</span>
      </div>
      <div class="notes-text">${escapeHtml(recipe.userNote)}</div>
    ` : ''}
    ${includeNotesLines ? `
      <div class="notes-title" style="margin-top:${recipe.userNote ? '8px' : '0'};">
        <span>📝 Notes & variantes familiales :</span>
      </div>
      <div class="handwritten-lines">
        <div class="handwritten-line"></div>
        <div class="handwritten-line"></div>
      </div>
    ` : ''}
  </div>` : ''}

  <!-- Footer avec QR code optionnel -->
  <div class="footer-wrap">
    <div>
      <span class="footer-brand">Papilles</span> — Carnet de cuisine 100 % hors-ligne • Fait maison avec amour<br />
      Fiche imprimée le ${todayStr}
    </div>
    ${qrCodeBmp ? `
    <div class="footer-qr-group">
      <img src="${qrCodeBmp}" alt="QR Code Recette Papilles" class="footer-qr-img" />
      <div class="footer-qr-caption">
        Scannez avec <strong>Papilles</strong> pour importer cette recette sur votre téléphone
      </div>
    </div>` : ''}
  </div>

</body>
</html>`;
  },

  /**
   * Ouvre la modale d'impression native du système (AirPrint / Spooler Android).
   */
  async printRecipe(recipe: Recipe, options: RecipePrintOptions = {}): Promise<void> {
    const html = await this.generateRecipeHtml(recipe, options);
    await Print.printAsync({ html });
  },

  /**
   * Génère un fichier PDF local et ouvre la feuille de partage native du système.
   */
  async exportPdf(recipe: Recipe, options: RecipePrintOptions = {}): Promise<string> {
    const html = await this.generateRecipeHtml(recipe, options);
    const { uri } = await Print.printToFileAsync({ html });

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Fiche recette - ${recipe.title}`,
        UTI: 'com.adobe.pdf',
      });
    }

    return uri;
  },
};
