import { json, type LoaderFunctionArgs } from "@remix-run/node";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("Storefront bundles loader called");
  try {
    const referer = request.headers.get("referer");
    console.log("Referer:", referer);
    
    if (!referer) {
      console.log("No referer found");
      return json({ bundles: [], error: "No referer found" });
    }

    const productHandle = referer
      ?.split("/")
      [referer.split("/").length - 1].split("?")[0];
    
    console.log("Product handle:", productHandle);
    
    if (!productHandle) {
      console.log("No product handle found");
      return json({ bundles: [], error: "No product handle found" });
    }

    const { admin } = await authenticate.public.appProxy(request);

    if (!admin) {
      console.log("Authentication failed");
      return json({ bundles: [], error: "Authentication failed" });
    }

    console.log("Querying for product with handle:", productHandle);
    const response = await admin.graphql(
      `
        query GET_PRODUCT_BUNDLES($query: String!) {
          products(query: $query, first: 1) {
            edges {
              node {
                id
                title
                metafield(
                  namespace: "$app:bundles"
                  key: "function-configuration"
                ) {
                  type
                  jsonValue
                }
              }
            }
          }
        }
      `,
      {
        variables: {
          query: `handle:${productHandle}`,
        },
      },
    );

    const { data } = await response.json();
    console.log("GraphQL response:", JSON.stringify(data, null, 2));
    
    if (!data?.products?.edges?.length) {
      console.log("Product not found");
      return json({ bundles: [], error: "Product not found" });
    }

    const product = data.products.edges[0].node;
    const metafield = product.metafield;
    
    console.log("Product:", product.title, "Metafield:", metafield);
    
    if (!metafield?.jsonValue?.bundles) {
      console.log("No bundles found for this product");
      return json({ bundles: [] });
    }

    console.log("Found bundles:", metafield.jsonValue.bundles.length);
    return json({
      bundles: metafield.jsonValue.bundles,
    });
  } catch (error) {
    console.error("Error in storefront.bundles loader:", error);
    return json({ bundles: [], error: "Failed to load bundles" });
  }
};
