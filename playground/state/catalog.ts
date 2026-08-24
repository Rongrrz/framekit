import { fk } from 'framekit';

import type { CategoryId } from '../data/categories';

export const selectedCategory = fk.state.observable<CategoryId>('featured');
