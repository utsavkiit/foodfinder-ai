// Generic search types
export interface SearchQuery {
  query: string;
  location?: string;
  filters?: SearchFilters;
  pagination?: PaginationOptions;
}

export interface SearchFilters {
  [key: string]: string | number | boolean | string[];
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  maxResults?: number;
}

export interface SearchResponse<T> {
  data: T[];
  totalResults: number;
  pageInfo: PageInfo;
  searchMetadata: SearchMetadata;
}

export interface PageInfo {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SearchMetadata {
  query: string;
  searchTime: number; // in milliseconds
  source: string;
  timestamp: Date;
}

// Google Custom Search types
export interface GoogleSearchQuery extends SearchQuery {
  cseId: string;
  apiKey: string;
  safeSearch?: 'off' | 'medium' | 'high';
  searchType?: 'image' | 'video' | 'news';
}

export interface GoogleSearchResult {
  kind: string;
  title: string;
  htmlTitle: string;
  link: string;
  displayLink: string;
  snippet: string;
  htmlSnippet: string;
  cacheId?: string;
  formattedUrl: string;
  htmlFormattedUrl: string;
  pagemap?: {
    [key: string]: any[];
  };
}

export interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
  searchInformation: {
    searchTime: number;
    formattedSearchTime: string;
    totalResults: string;
    formattedTotalResults: string;
  };
  queries: {
    request: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
      inputEncoding: string;
      outputEncoding: string;
      safe: string;
      cx: string;
    }>;
  };
}

// Yelp Fusion API types
export interface YelpSearchQuery {
  apiKey: string;
  query?: string;
  term?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  categories?: string[];
  price?: string;
  openNow?: boolean;
  sortBy?: 'best_match' | 'rating' | 'review_count' | 'distance';
  maxResults?: number;
}

export interface YelpBusiness {
  id: string;
  alias: string;
  name: string;
  image_url: string;
  is_closed: boolean;
  url: string;
  review_count: number;
  categories: Array<{
    alias: string;
    title: string;
  }>;
  rating: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  transactions: string[];
  price: string;
  location: {
    address1: string;
    address2?: string;
    address3?: string;
    city: string;
    zip_code: string;
    country: string;
    state: string;
    display_address: string[];
  };
  phone: string;
  display_phone: string;
  distance: number;
}

export interface YelpSearchResponse {
  businesses: YelpBusiness[];
  total: number;
  region: {
    center: {
      latitude: number;
      longitude: number;
    };
  };
}
