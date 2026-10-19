import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Category } from '../types/recipe';
import { Colors } from '../theme/colors';

interface CategoryPillsProps {
  categories: Category[];
  selectedCategory: Category;
  onSelectCategory: (cat: Category) => void;
  recipeCountByCategory?: Record<string, number>;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  recipeCountByCategory,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const count = recipeCountByCategory ? recipeCountByCategory[cat] : undefined;

          return (
            <TouchableOpacity
              key={cat}
              activeOpacity={0.7}
              onPress={() => onSelectCategory(cat)}
              style={[styles.pill, isSelected && styles.pillSelected]}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                {cat}
              </Text>
              {count !== undefined && count > 0 && (
                <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                  <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: Colors.cardBackground,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
  },
  badgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  badgeTextSelected: {
    color: '#FFFFFF',
  },
});
