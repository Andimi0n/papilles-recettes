/**
 * Tests unitaires pour createSectionListGetItemLayout (P2.1)
 */

const { createSectionListGetItemLayout } = require('../src/utils/sectionListLayoutHelper.ts');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

console.log('🧪 Démarrage des tests unitaires SectionList Layout Helper...\n');

// Cas 1 : Données nulles ou vides
{
  const getItemLayout = createSectionListGetItemLayout({
    getItemHeight: () => 50,
    getSectionHeaderHeight: () => 30,
  });

  const layout = getItemLayout(null, 0);
  assert(layout.length === 0 && layout.offset === 0, 'Données nulles renvoient longueur 0 et offset 0');
}

// Cas 2 : Une section avec 2 items
{
  const sections = [
    {
      title: 'Légumes',
      data: [{ id: '1', name: 'Carottes' }, { id: '2', name: 'Poireaux' }],
    },
  ];

  const getItemLayout = createSectionListGetItemLayout({
    getItemHeight: () => 48,
    getSectionHeaderHeight: () => 36,
    getSectionFooterHeight: () => 0,
  });

  // Slot 0: Section Header (longueur 36, offset 0)
  const headerLayout = getItemLayout(sections, 0);
  assert(headerLayout.length === 36 && headerLayout.offset === 0, 'Slot 0 (Section 0 Header) : length 36, offset 0');

  // Slot 1: Item 0 (longueur 48, offset 36)
  const item0Layout = getItemLayout(sections, 1);
  assert(item0Layout.length === 48 && item0Layout.offset === 36, 'Slot 1 (Section 0 Item 0) : length 48, offset 36');

  // Slot 2: Item 1 (longueur 48, offset 36 + 48 = 84)
  const item1Layout = getItemLayout(sections, 2);
  assert(item1Layout.length === 48 && item1Layout.offset === 84, 'Slot 2 (Section 0 Item 1) : length 48, offset 84');

  // Slot 3: Section Footer (longueur 0, offset 84 + 48 = 132)
  const footerLayout = getItemLayout(sections, 3);
  assert(footerLayout.length === 0 && footerLayout.offset === 132, 'Slot 3 (Section 0 Footer) : length 0, offset 132');
}

// Cas 3 : Deux sections avec hauteurs dynamiques
{
  const sections = [
    {
      title: 'Section A',
      data: [{ id: '1', hasMeta: true }],
    },
    {
      title: 'Section B',
      data: [{ id: '2', hasMeta: false }, { id: '3', hasMeta: true }],
    },
  ];

  const getItemLayout = createSectionListGetItemLayout({
    getItemHeight: (item) => (item.hasMeta ? 58 : 44),
    getSectionHeaderHeight: (sIdx) => (sIdx === 0 ? 40 : 50),
    getSectionFooterHeight: () => 0,
  });

  // Section 0 Header: length 40, offset 0
  assert(getItemLayout(sections, 0).offset === 0 && getItemLayout(sections, 0).length === 40, 'Sec 0 Header : length 40, offset 0');
  // Section 0 Item 0 (hasMeta: true -> 58): length 58, offset 40
  assert(getItemLayout(sections, 1).offset === 40 && getItemLayout(sections, 1).length === 58, 'Sec 0 Item 0 : length 58, offset 40');
  // Section 0 Footer: length 0, offset 40 + 58 = 98
  assert(getItemLayout(sections, 2).offset === 98 && getItemLayout(sections, 2).length === 0, 'Sec 0 Footer : length 0, offset 98');

  // Section 1 Header: length 50, offset 98
  assert(getItemLayout(sections, 3).offset === 98 && getItemLayout(sections, 3).length === 50, 'Sec 1 Header : length 50, offset 98');
  // Section 1 Item 0 (hasMeta: false -> 44): length 44, offset 98 + 50 = 148
  assert(getItemLayout(sections, 4).offset === 148 && getItemLayout(sections, 4).length === 44, 'Sec 1 Item 0 : length 44, offset 148');
  // Section 1 Item 1 (hasMeta: true -> 58): length 58, offset 148 + 44 = 192
  assert(getItemLayout(sections, 5).offset === 192 && getItemLayout(sections, 5).length === 58, 'Sec 1 Item 1 : length 58, offset 192');
  // Section 1 Footer: length 0, offset 192 + 58 = 250
  assert(getItemLayout(sections, 6).offset === 250 && getItemLayout(sections, 6).length === 0, 'Sec 1 Footer : length 0, offset 250');
}

console.log(`\nRésultats : ${passedTests} passés, ${failedTests} échoués.\n`);
if (failedTests > 0) process.exit(1);
