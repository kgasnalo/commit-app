export type Currency = 'JPY' | 'USD' | 'EUR' | 'GBP' | 'KRW';

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    pageCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

export interface ManualBook {
  title: string;
  author: string;
  totalPages: number;
  coverUrl: string | null;
}
