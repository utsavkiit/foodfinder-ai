// Restaurant information types
export interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  website?: string;
  cuisine: string[];
  priceRange: PriceRange;
  rating: number;
  reviewCount: number;
  coordinates?: Coordinates;
  hours?: BusinessHours;
  features?: RestaurantFeature[];
  images?: string[];
  source: DataSource;
  lastUpdated: Date;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BusinessHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open: string; // Format: "HH:MM"
  close: string; // Format: "HH:MM"
  isClosed: boolean;
}

export interface RestaurantFeature {
  name: string;
  value: string | boolean;
  category: FeatureCategory;
}

export enum FeatureCategory {
  DINING = 'dining',
  ACCESSIBILITY = 'accessibility',
  PAYMENT = 'payment',
  SPECIAL = 'special',
  OTHER = 'other'
}

export enum PriceRange {
  BUDGET = '$',
  MODERATE = '$$',
  EXPENSIVE = '$$$',
  VERY_EXPENSIVE = '$$$$'
}

export enum DataSource {
  GOOGLE = 'google',
  YELP = 'yelp',
  COMBINED = 'combined'
}

// Restaurant search and filter types
export interface RestaurantSearchParams {
  query: string;
  location: string;
  radius?: number; // in miles
  cuisine?: string[];
  priceRange?: PriceRange[];
  rating?: number;
  openNow?: boolean;
  maxResults?: number;
}

export interface RestaurantSearchResult {
  restaurants: Restaurant[];
  totalResults: number;
  searchParams: RestaurantSearchParams;
  searchTime: number; // in milliseconds
}

// Restaurant comparison and ranking types
export interface RestaurantRanking {
  restaurant: Restaurant;
  score: number;
  factors: RankingFactor[];
}

export interface RankingFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}
