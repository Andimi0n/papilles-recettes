/**
 * Utilitaire de virtualisation haute performance pour SectionList React Native.
 * Calcule avec exactitude le mapping flatIndex -> { length, offset, index }
 * pour éliminer les mesures asynchrones Yoga lors des scrolls rapides.
 *
 * Architecture interne SectionList :
 * Pour chaque section s :
 *   - Slot 0 : Header de section (hauteur = getSectionHeaderHeight)
 *   - Slots 1..N : Items de la section (hauteur = getItemHeight)
 *   - Slot N+1 : Footer de section (hauteur = getSectionFooterHeight)
 */

export interface SectionListLayoutOptions<ItemT> {
  getItemHeight: (rowData: ItemT, sectionIndex: number, rowIndex: number) => number;
  getSectionHeaderHeight?: (sectionIndex: number) => number;
  getSectionFooterHeight?: (sectionIndex: number) => number;
  listHeaderHeight?: number | (() => number);
}

export function createSectionListGetItemLayout<ItemT>(
  options: SectionListLayoutOptions<ItemT>
) {
  const {
    getItemHeight,
    getSectionHeaderHeight = () => 0,
    getSectionFooterHeight = () => 0,
    listHeaderHeight = 0,
  } = options;

  return (
    data: { data: readonly ItemT[] }[] | null,
    index: number
  ): { length: number; offset: number; index: number } => {
    let offset = typeof listHeaderHeight === 'function' ? listHeaderHeight() : listHeaderHeight;
    let currentIndex = 0;

    if (!data) {
      return { length: 0, offset: 0, index };
    }

    for (let sIdx = 0; sIdx < data.length; sIdx++) {
      const section = data[sIdx];
      const headerHeight = getSectionHeaderHeight(sIdx);

      // 1. Header de section
      if (currentIndex === index) {
        return { length: headerHeight, offset, index };
      }
      offset += headerHeight;
      currentIndex++;

      // 2. Éléments de la section
      const rowCount = section.data ? section.data.length : 0;
      for (let rIdx = 0; rIdx < rowCount; rIdx++) {
        const rowHeight = getItemHeight(section.data[rIdx], sIdx, rIdx);
        if (currentIndex === index) {
          return { length: rowHeight, offset, index };
        }
        offset += rowHeight;
        currentIndex++;
      }

      // 3. Footer de section (slot virtuel SectionList)
      const footerHeight = getSectionFooterHeight(sIdx);
      if (currentIndex === index) {
        return { length: footerHeight, offset, index };
      }
      offset += footerHeight;
      currentIndex++;
    }

    return { length: 0, offset, index };
  };
}
