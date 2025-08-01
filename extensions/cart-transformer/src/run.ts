import type { RunInput, FunctionRunResult } from "../generated/api";

interface BundleVariant {
  id: string;
  quantity: number;
  originalPrice: number; // Original product price (e.g., 105)
  discountedPrice?: number; // Discounted price (e.g., 94.50)
}

interface BundleProduct {
  variants: BundleVariant[];
  title: string;
  featuredImage: string;
  offer: number;
  quantity: number;
  id: string; // Add product ID to help with matching
}

interface Bundle {
  displayText: string;
  offer: number;
  selectedProducts: BundleProduct[];
}

interface BundledComponentData {
  jsonValue: {
    bundles: Bundle[];
  };
}

interface ExpandedCartItem {
  merchandiseId: string;
  quantity: number;
  attributes?: Array<{
    key: string;
    value: string;
  }>;
  price: {
    adjustment: {
      fixedPricePerUnit: {
        amount: string;
      };
    };
  };
}

interface ExpandOperation {
  cartLineId: string;
  expandedCartItems: ExpandedCartItem[];
  title: string;
}

interface Operation {
  expand: ExpandOperation;
}

const NO_CHANGES: FunctionRunResult = {
  operations: [],
};

export function run(input: RunInput): FunctionRunResult {
  const operations: Operation[] = input.cart.lines.reduce(
    (acc: Operation[], cartLine) => {
      // Check for bundle expansion first
      const expandOperation = optionallyBuildExpandOperation(cartLine, input.presentmentCurrencyRate);
      if (expandOperation) {
        return [...acc, { expand: expandOperation }];
      }

      // Check for Build a Box discount
      const buildBoxOperation = optionallyBuildBuildBoxOperation(cartLine, input.cart.lines, input.presentmentCurrencyRate);
      if (buildBoxOperation) {
        return [...acc, { expand: buildBoxOperation }];
      }

      return acc;
    },
    []
  );

  return operations.length > 0 ? { operations } : NO_CHANGES;
}

function optionallyBuildExpandOperation(
  cartLine: RunInput['cart']['lines'][0],
  presentmentCurrencyRate: number
): ExpandOperation | undefined {
  const { id: cartLineId, merchandise, bundleIndex, cost } = cartLine;
  
  if (
    merchandise.__typename === "ProductVariant" &&
    merchandise.product.bundledComponentData &&
    bundleIndex
  ) {
    const bundleData: Bundle[] =
      merchandise.product.bundledComponentData.jsonValue.bundles;

    if (!bundleData || bundleData.length === 0) {
      return undefined;
    }

    const selectedBundleIndex = bundleIndex?.value ? parseInt(bundleIndex?.value) : 0
    const selectedBundle = bundleData[selectedBundleIndex];

    if (!selectedBundle) {
      return undefined;
    }

    const variants: BundleVariant[] = [];
    

    for (const product of selectedBundle.selectedProducts) {
      // Process only the FIRST variant from each product (the selected/default one)
      const firstVariant = product.variants[0];
      if (firstVariant) {
        variants.push({
          id: firstVariant.id,
          quantity: firstVariant.quantity,
          originalPrice: (firstVariant as any).originalPrice || (firstVariant as any).amount, // Support both field names
          discountedPrice: (firstVariant as any).discountedPrice, // Add discounted price support
        });
      }
    }


    const expandedCartItems: ExpandedCartItem[] = variants.map((variant) => {
      // Find the product that contains this variant to get its individual offer
      const productWithVariant = selectedBundle.selectedProducts.find(product => 
        product.variants.some(v => v.id === variant.id)
      );
      
      // Use the individual product's offer, or fall back to bundle offer
      const productOffer = productWithVariant?.offer || selectedBundle.offer || 10;
      
      // Support both test data format (amount) and real data format (originalPrice)
      const originalPrice = variant.originalPrice;
      
      // For backwards compatibility with existing test data
      if (!originalPrice && (variant as any).amount) {
        console.warn('Using legacy amount field, consider updating to originalPrice');
        return {
          merchandiseId: variant.id,
          quantity: variant.quantity || 1,
          attributes: [
            {
              key: "Original Price",
              value: "Legacy data format"
            },
            {
              key: "Bundle Discount",
              value: `${selectedBundle.offer || 10}%`
            }
          ],
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: (((selectedBundle.offer || 10) / 100) * cost.amountPerQuantity.amount * presentmentCurrencyRate).toFixed(2),
              },
            },
          },
        };
      }
      
      // Use pre-calculated discounted price if available, otherwise calculate it
      let finalDiscountedPrice;
      if (variant.discountedPrice && variant.discountedPrice > 0) {
        finalDiscountedPrice = variant.discountedPrice;
      } else {
        // Fallback: Calculate discounted price using offer percentage
        finalDiscountedPrice = originalPrice - (originalPrice * (productOffer / 100));
      }
      
      return {
        merchandiseId: variant.id,
        quantity: variant.quantity || 1,
        attributes: [
          {
            key: "Original Price",
            value: originalPrice.toFixed(2)
          },
          {
            key: "Bundle Discount",
            value: `${productOffer}%`
          }
        ],
        price: {
          adjustment: {
            fixedPricePerUnit: {
              amount: (finalDiscountedPrice * presentmentCurrencyRate).toFixed(2),
            },
          },
        },
      };
    });

    if (expandedCartItems.length > 0) {
      return {
        cartLineId,
        expandedCartItems,
        title: `${selectedBundle.displayText}`,
        
      };
    }
  }
  
  return undefined;
}

function optionallyBuildBuildBoxOperation(
  cartLine: RunInput['cart']['lines'][0],
  allCartLines: RunInput['cart']['lines'],
  presentmentCurrencyRate: number
): ExpandOperation | undefined {
  const { id: cartLineId, merchandise, cost } = cartLine;
  
  if (merchandise.__typename !== "ProductVariant") {
    return undefined;
  }

  // Method 1: Check if this item has the Build a Box identifier property
  const hasBuildABoxProperty = (cartLine as any).buildABox?.value === 'true';
  
  // Method 2: Check if product title contains "Build a Box" indicators
  const productTitle = (merchandise.product as any).title || '';
  const hasBuildABoxInTitle = productTitle.toLowerCase().includes('build a box') || 
                             productTitle.toLowerCase().includes('buildabox');
  
  // Method 3: Check if this is a Build a Box item by checking if it's NOT a bundle item
  // and there are Build a Box items in the cart (items without bundle properties)
  const isNotBundleItem = !cartLine.bundleIndex?.value;
  
  // Count non-bundle items (these would be Build a Box items)
  const nonBundleItems = allCartLines.filter(line => !line.bundleIndex?.value);
  const isBuildABoxByContext = isNotBundleItem && nonBundleItems.length === 2;
  
  // Apply Build a Box discount if any of the methods indicate this is a Build a Box item
  if (!hasBuildABoxProperty && !hasBuildABoxInTitle && !isBuildABoxByContext) {
    return undefined;
  }

  // Get Build a Box discount percentage from cart line properties or use default
  const buildABoxDiscountAttr = (cartLine as any).buildABoxDiscount?.value;
  const buildBoxDiscount = buildABoxDiscountAttr ? parseInt(buildABoxDiscountAttr) : 21; // Default to 21% if not specified
  const originalPrice = cost.amountPerQuantity.amount;
  const discountedPrice = originalPrice * (1 - buildBoxDiscount / 100);

  // For Build a Box items, we want to apply discount but keep them as single line items
  // We replace the item with itself but with discounted price and no detailed breakdown
  const expandedCartItems: ExpandedCartItem[] = [{
    merchandiseId: merchandise.id,
    quantity: 1, // cartLine.quantity when types are fixed
    attributes: [], // No attributes to keep it simple
    price: {
      adjustment: {
        fixedPricePerUnit: {
          amount: (discountedPrice * presentmentCurrencyRate).toFixed(2),
        },
      },
    },
  }];

  return {
    cartLineId,
    expandedCartItems,
    title: `${(merchandise.product as any).title || 'Item'}`, // Keep original title, no prefix
  };
}