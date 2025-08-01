import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Thumbnail,
  Button,
  Banner,
  Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const allBundles: any[] = [];
  let hasNextPage = true;
  let endCursor: string | null = null;

  while (hasNextPage) {
    const response = await admin.graphql(
      `
      query getProductsWithBundles($after: String) {
        products(first: 50, after: $after) {
          edges {
            node {
              id
              title
              images(first: 1) {
                edges {
                  node {
                    originalSrc
                    altText
                  }
                }
              }
              metafield(namespace: "$app:bundles", key: "function-configuration") {
                id
                value
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `,
      { variables: { after: endCursor } }
    );

    const jsonData = await response.json();
    const edges = jsonData.data.products.edges;

    for (const { node, cursor } of edges) {
      const image = node.images.edges[0]?.node;
      const metafieldValue = node.metafield?.value;

      if (metafieldValue) {
        try {
          const parsed = JSON.parse(metafieldValue);
          if (parsed?.bundles?.length) {
            parsed.bundles.forEach((bundle: any, bundleIdx: number) => {
              allBundles.push({
                productId: node.id,
                productTitle: node.title,
                image: image?.originalSrc,
                metafieldId: node.metafield.id,
                bundleIndex: bundleIdx,
                ...bundle,
              });
            });
          }
        } catch (err) {
          console.error("Failed to parse metafield:", err);
        }
      }

      endCursor = cursor;
    }

    hasNextPage = jsonData.data.products.pageInfo.hasNextPage;
  }

  return json({ bundles: allBundles });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  // Deleting a bundle
  if (formData.get("_action") === "delete") {
    const productId = formData.get("productId") as string;
    const bundleIndex = parseInt(formData.get("bundleIndex") as string, 10);

    // Get existing metafield for the product
    const productResp = await admin.graphql(
      `
      query GET_PRODUCT_BUNDLES($id: ID!) {
        product(id: $id) {
          id
          metafield(namespace: "$app:bundles", key: "function-configuration") {
            id
            value
          }
        }
      }
      `,
      { variables: { id: productId } }
    );
    const { data } = await productResp.json();
    const metafield = data.product.metafield;
    if (!metafield || !metafield.value) {
      return json({ success: false, message: "Metafield not found." });
    }

    let bundles = [];
    try {
      const parsed = JSON.parse(metafield.value);
      bundles = parsed.bundles || [];
    } catch (e) {
      return json({ success: false, message: "Failed to parse metafield value." });
    }

    // Remove the bundle at the specified index
    bundles.splice(bundleIndex, 1);

    // Update or clear the metafield
    let metafields = [];
    if (bundles.length === 0) {
  // Set to empty bundles array, not null
  metafields.push({
    ownerId: productId,
    namespace: "$app:bundles",
    key: "function-configuration",
    value: JSON.stringify({ bundles: [] }),
    type: "json",
  });
} else {
  metafields.push({
    ownerId: productId,
    namespace: "$app:bundles",
    key: "function-configuration",
    value: JSON.stringify({ bundles }),
    type: "json",
  });
}

    const updateResp = await admin.graphql(
      `
      mutation updateMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors {
            message
            code
          }
        }
      }
      `,
      {
        variables: {
          metafields,
        },
      }
    );
    const updateData = await updateResp.json();

    if (updateData.data.metafieldsSet.userErrors.length > 0) {
      return json({
        success: false,
        message: updateData.data.metafieldsSet.userErrors[0].message,
      });
    }

    return redirect("/app/bundles/list"); // Refresh the page
  }

  // default
  return json({ success: false });
};

export default function BundlesPage() {
  const { bundles } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = (productId: string, bundleIndex: number) => {
    if (
      window.confirm(
        "Are you sure you want to delete this bundle? This action cannot be undone."
      )
    ) {
      const formData = new FormData();
      formData.set("_action", "delete");
      formData.set("productId", productId);
      formData.set("bundleIndex", bundleIndex.toString());
      submit(formData, { method: "post" });
    }
  };

  return (
    <Page title="All Bundles">
      <TitleBar title="Bundles" />
      <Layout>
        {deleteError && (
          <Layout.Section>
            <Banner tone="critical">
              <p>{deleteError}</p>
            </Banner>
          </Layout.Section>
        )}
        {bundles.length === 0 ? (
          <BlockStack>
            <Text variant="bodyLg">No bundles found.</Text>
          </BlockStack>
        ) : (
          bundles.map((bundle, index) => (
            <Layout.Section key={index}>
              <Card>
                <BlockStack gap="200">
                  <InlineStack gap="300" blockAlign="center">
                    {/* Show bundle image if available, otherwise show product image */}
                    <Thumbnail 
                      source={bundle.bundleImage || bundle.image || ''} 
                      alt={bundle.bundleImage ? 'Bundle image' : 'Product image'} 
                      size="large" 
                    />
                    <BlockStack>
                      <Text variant="headingMd" as="h3">{bundle.name}</Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        Product: {bundle.productTitle}
                      </Text>
                      <Text variant="bodySm" as="p">Display Text: {bundle.displayText}</Text>
                      {bundle.bundleImage && (
                        <Text variant="bodySm" as="p" tone="success">
                          ✓ Custom bundle image set
                        </Text>
                      )}
                      <Text variant="bodySm" as="p">
                        Direct to Checkout: {bundle.directToCheckout ? "Yes" : "No"}
                      </Text>
                      <Text variant="bodySm" as="p">
                        Show Comparison Price: {bundle.showComparisonPrice ? "Yes" : "No"}
                      </Text>
                      <Text variant="bodySm" as="p">
                        Products: {bundle.selectedProducts?.length || 0}
                      </Text>
                      {bundle.assignedProducts && (
                        <Text variant="bodySm" as="p">
                          Assigned Products: {bundle.assignedProducts.length}
                        </Text>
                      )}
                    </BlockStack>
                    <Box>
                      <Button
                        variant="secondary"
                        tone="critical"
                        disabled={navigation.state === "submitting"}
                        loading={navigation.state === "submitting"}
                        onClick={() => handleDelete(bundle.productId, bundle.bundleIndex)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          ))
        )}
      </Layout>
    </Page>
  );
}