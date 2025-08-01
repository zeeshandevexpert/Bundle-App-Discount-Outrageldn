export interface ShopifyVariant {
    id: string;
    title: string;
    price: string;
  }
  
  export interface ShopifyProduct {
    id: string;
    title: string;
    variants: ShopifyVariant[];
    images: { originalSrc: string }[];
  }
  
  export interface ProductVariant {
    id: string;
    title: string;
    quantity: number;
    price: number; // Current/working price
    originalPrice: number; // Original product price (e.g., 105)
    discountedPrice?: number; // Calculated discounted price (e.g., 94.50)
  }
  
  export interface SelectedProduct {
    title: string;
    id: string;
    variants: ProductVariant[];
    quantity: number;
    featuredImage: string;
    offer: number;
  }
  