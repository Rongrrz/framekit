export type CategoryId = 'featured' | 'electronics' | 'home' | 'fitness' | 'travel';
export type ProductCategory = Exclude<CategoryId, 'featured'>;

export type Category = Readonly<{
  id: CategoryId;
  label: string;
}>;

export const categories: readonly Category[] = [
  { id: 'featured', label: '✦  ALL PRODUCTS' },
  { id: 'electronics', label: '◉  ELECTRONICS' },
  { id: 'home', label: '⌂  HOME' },
  { id: 'fitness', label: '◇  FITNESS' },
  { id: 'travel', label: '▱  TRAVEL' },
] as const;

export function findCategory(id: CategoryId): Category {
  const category = categories.find((item) => item.id === id);
  if (!category) throw new Error(`Unknown category "${id}".`);
  return category;
}
