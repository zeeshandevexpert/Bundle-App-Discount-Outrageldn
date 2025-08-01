import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useActionData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  TextField,
  ChoiceList,
  Button,
  Box,
  Checkbox,
  Thumbnail,
  Tag,
  InlineGrid,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useCallback, useEffect, useState } from "react";
import {
  validateBundleForm,
  type ValidationErrors,
} from "app/validators/bundleForm";
import type { SelectedProduct, ShopifyProduct } from "app/@types/bundle";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  // Debug: Log the formData to see what's being received
  console.log("Form data received:", {
    bundleImage: formData.get("bundleImage"),
    bundleName: formData.get("bundleName"),
    displayText: formData.get("displayText"),
  });

  const validation = validateBundleForm(formData);

  if (validation.errors) {
    return json({
      success: false,
      errors: validation.errors,
    });
  }

  const {
    bundleName,
    displayText,
    showComparisonPrice,
    directToCheckout,
    bundleImage,
    selectedProducts,
  } = validation.data!;

  console.log("Validated data:", { bundleName, displayText, bundleImage });

  // Get assignedProducts from formData
  const assignedProductsRaw = formData.get("assignedProducts");
  const assignedProducts = assignedProductsRaw ? JSON.parse(assignedProductsRaw as string) : [];
  const parsedProducts = JSON.parse(selectedProducts);

  const metafields = [];

  // Only update metafields for the assigned products
  for (const productId of assignedProducts) {
    // Get the existing metafield value for this product
    const response = await admin.graphql(
      `
      query GET_PRODUCT_BUNDLES($id: ID!) {
        product(id: $id) {
          bundledComponentData: metafield(
            namespace: "$app:bundles"
            key: "function-configuration"
          ) {
            type
            jsonValue
          }
        }
      }
      `,
      {
        variables: {
          id: productId,
        },
      },
    );
    const { data } = await response.json();
    const bundles = data.product.bundledComponentData?.jsonValue?.bundles || [];

    // Add assignedProducts to the bundle object
    const metafield = {
      bundles: [
        ...bundles,
        {
          name: bundleName,
          displayText,
          bundleImage, // Add bundle image to the metafield
          selectedProducts: parsedProducts,
          assignedProducts,
          showComparisonPrice,
          directToCheckout,
        },
      ],
    };

    console.log("Saving metafield with bundleImage:", bundleImage);

    metafields.push({
      ownerId: productId,
      namespace: "$app:bundles",
      key: "function-configuration",
      value: JSON.stringify(metafield),
      type: "json",
    });
  }

  const response = await admin.graphql(
    `
    mutation updateMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors {
          message
          code
        }
      }
    }`,
    {
      variables: {
        metafields: metafields,
      },
    },
  );
  const { data } = await response.json();

  if (data.metafieldsSet.userErrors.length > 0) {
    return json({
      success: false,
      errors: { message: data.metafieldsSet.userErrors[0].message },
    });
  }

  return json({ success: true });
};

export default function Index() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  const actionData = useActionData<{
    success: boolean;
    errors?: ValidationErrors & { message: string };
  }>();

  const [bundleName, setBundleName] = useState("");
  const [productSelection, setProductSelection] = useState("specificProducts");
  const [displayText, setDisplayText] = useState("Limited Offer");
  const [bundleImage, setBundleImage] = useState(""); // Add bundle image state
  const [showComparisonPrice, setShowComparisonPrice] = useState(true);
  const [directToCheckout, setDirectToCheckout] = useState(false);
  const [offer, setOffer] = useState("10");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  // Add state for assigned products (where bundle will appear)
  const [assignedProducts, setAssignedProducts] = useState<SelectedProduct[]>([]);

  // Handler for picking products to assign bundle to
  const handleAssignProduct = async () => {
    const selections = await shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
    });
    if (selections) {
      const assigned: SelectedProduct[] = (selections as ShopifyProduct[]).map((product) => ({
        title: product.title,
        id: product.id,
        variants: product.variants.map((variant) => {
          const originalPrice = parseFloat(variant.price);
          return {
            id: variant.id,
            title: variant.title,
            quantity: 1,
            price: originalPrice, // Keep original price as the working price
            originalPrice: originalPrice, // Store original price unchanged
            discountedPrice: originalPrice, // No discount for assigned products
          };
        }),
        quantity: 1,
        featuredImage: product.images[0]?.originalSrc || "",
        offer: 0,
      }));
      setAssignedProducts(assigned);
    }
  };

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show("Yay!, Product Bundle Saved");
      setBundleName("");
      setDisplayText("Limited Offer");
      setBundleImage(""); // Reset bundle image
      setOffer("10");
      setSelectedProducts([]);
      setAssignedProducts([]);
      setFormErrors({});
    } else if (actionData?.errors) {
      setFormErrors(actionData.errors);
    }
    // eslint-disable-next-line
  }, [actionData]);

  const handleBundleNameChange = useCallback(
    (newValue: string) => {
      setBundleName(newValue);
      if (formErrors.bundleName) {
        setFormErrors({ ...formErrors, bundleName: undefined });
      }
    },
    [formErrors],
  );

  const handleProductSelectionChange = useCallback(
    (value: string) => setProductSelection(value),
    [],
  );

  const handleBlockTextChange = useCallback(
    (newValue: string) => {
      setDisplayText(newValue);
      if (formErrors.displayText) {
        setFormErrors({ ...formErrors, displayText: undefined });
      }
    },
    [formErrors],
  );

  const handleOfferChange = useCallback(
    (newOffer: string) => {
      setOffer(newOffer);
      
      // Recalculate discounted prices for all selected products
      if (selectedProducts.length > 0) {
        const updatedProducts = selectedProducts.map(product => ({
          ...product,
          offer: parseFloat(newOffer),
          variants: product.variants.map(variant => {
            const discountedPrice = variant.originalPrice - (variant.originalPrice * (parseFloat(newOffer) / 100));
            return {
              ...variant,
              discountedPrice: discountedPrice,
            };
          }),
        }));
        setSelectedProducts(updatedProducts);
      }
      
      if (formErrors.offer) {
        setFormErrors({ ...formErrors, offer: undefined });
      }
    },
    [formErrors, selectedProducts],
  );

  const handleComparisonPriceChange = useCallback(
    (newChecked: boolean) => setShowComparisonPrice(newChecked),
    [],
  );

  const handleDirectToCheckoutChange = useCallback(
    (newChecked: boolean) => setDirectToCheckout(newChecked),
    [],
  );

  const validateClient = () => {
    const clientErrors: ValidationErrors = {};

    if (!bundleName.trim()) {
      clientErrors.bundleName = "Bundle name is required";
    }

    if (!displayText.trim()) {
      clientErrors.displayText = "Display text is required";
    }

    if (!/^\d+(\.\d+)?$/.test(offer)) {
      clientErrors.offer = "Offer must be a valid number";
    }

    if (selectedProducts.length === 0) {
      clientErrors.selectedProducts = "At least one product must be selected";
    }

    if (assignedProducts.length === 0) {
      clientErrors.assignedProducts = "Assign at least one product to show the bundle.";
    }

    // Bundle image is now optional - no validation needed

    return Object.keys(clientErrors).length > 0 ? clientErrors : null;
  };

  const handleFormSubmit = useCallback(() => {
    const errors = validateClient();
    if (errors) {
      setFormErrors(errors);
      return;
    }

    const formData = {
      bundleName,
      displayText,
      offer,
      showComparisonPrice: showComparisonPrice.toString(),
      directToCheckout: directToCheckout.toString(),
      selectedProducts: JSON.stringify(selectedProducts),
      assignedProducts: JSON.stringify(assignedProducts.map(p => p.id)),
      bundleImage, // Add bundleImage to the form submission
    };

    submit(formData, { method: "post" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bundleName,
    displayText,
    offer,
    showComparisonPrice,
    directToCheckout,
    bundleImage, // Add bundleImage to dependencies
    submit,
    selectedProducts,
    assignedProducts,
  ]);

  // Handler for picking bundle image from media library
  const handleSelectBundleImage = async () => {
    try {
      // Use the standard Shopify resource picker but look for products with images
      // This is the most reliable way to get images in Shopify
      const selections = await shopify.resourcePicker({
        type: "product",
        action: "select",
        multiple: false,
      });
      
      if (selections && selections.length > 0) {
        const product = selections[0] as ShopifyProduct;
        if (product.images && product.images.length > 0) {
          // Let user choose from available images if multiple
          if (product.images.length === 1) {
            setBundleImage(product.images[0].originalSrc);
          } else {
            // For now, just use the first image, but we could add image selection UI later
            setBundleImage(product.images[0].originalSrc);
          }
          
          if (formErrors.bundleImage) {
            setFormErrors({ ...formErrors, bundleImage: undefined });
          }
        } else {
          shopify.toast.show("Selected product has no images. Please choose a different product.", { isError: true });
        }
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      shopify.toast.show("Unable to open image picker. Please enter image URL manually.", { isError: true });
    }
  };

  const handleSelectCollection = async () => {
    const selections = await shopify.resourcePicker({
      type: "collection",
      action: "select",
      multiple: true,
    });
    console.log(selections);
  };

  const handleSelectProduct = async () => {
    const selections = (await shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
      filter: {
        query: "(gift_card:false) AND (inventory_total:>1)",
        variants: true,
      },
    })) as ShopifyProduct[];

    if (selections) {
      const selectedProducts: SelectedProduct[] = selections.map((product) => ({
        title: product.title,
        id: product.id,
        variants: product.variants.map((variant) => {
          const originalPrice = parseFloat(variant.price);
          const discountedPrice = originalPrice - (originalPrice * (parseFloat(offer) / 100));
          return {
            id: variant.id,
            title: variant.title,
            quantity: 1,
            price: originalPrice, // Keep original price as the working price
            originalPrice: originalPrice, // Store original price (e.g., 105)
            discountedPrice: discountedPrice, // Store calculated discounted price (e.g., 94.50)
          };
        }),
        quantity: 1,
        featuredImage: product.images[0].originalSrc,
        offer: parseFloat(offer),
      }));
      setSelectedProducts(selectedProducts);

      if (formErrors.selectedProducts) {
        setFormErrors({ ...formErrors, selectedProducts: undefined });
      }
    } else {
      setSelectedProducts([]);
    }
  };

  return (
    <Page
      title="New Bundle"
      primaryAction={{
        content: "Create bundle",
        onAction: handleFormSubmit,
        disabled: isLoading,
        loading: isLoading,
      }}
    >
      <TitleBar title="Bundler App" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            {actionData?.errors?.message && (
              <Banner tone="critical">
                <p>{actionData.errors.message}</p>
              </Banner>
            )}
            <Form method="post">
              <BlockStack gap="400">
                <Card>
                  <TextField
                    label="Bundle Name (Internal)"
                    value={bundleName}
                    onChange={handleBundleNameChange}
                    autoComplete="off"
                    placeholder="Bundle Name"
                    name="bundleName"
                    error={formErrors.bundleName}
                  />
                </Card>
                <Card>
                  <TextField
                    label="Display Text"
                    value={displayText}
                    onChange={handleBlockTextChange}
                    autoComplete="off"
                    name="displayText"
                    error={formErrors.displayText}
                  />
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h3">
                      Bundle Image (Optional)
                    </Text>
                    <TextField
                      label="Image URL (Optional)"
                      value={bundleImage}
                      onChange={(value) => {
                        setBundleImage(value);
                        if (formErrors.bundleImage) {
                          setFormErrors({ ...formErrors, bundleImage: undefined });
                        }
                      }}
                      autoComplete="off"
                      name="bundleImage"
                      placeholder="Enter image URL or select from products below (optional)"
                      error={formErrors.bundleImage}
                    />
                    <InlineStack gap="200" align="space-between">
                      <Button onClick={handleSelectBundleImage} variant="secondary">
                        Pick Image from Products
                      </Button>
                      {bundleImage && (
                        <Button 
                          onClick={() => setBundleImage("")} 
                          variant="tertiary" 
                          tone="critical"
                        >
                          Remove Image
                        </Button>
                      )}
                    </InlineStack>
                    {bundleImage && (
                      <Box paddingBlockStart="200">
                        <Thumbnail
                          source={bundleImage}
                          alt="Bundle preview"
                          size="large"
                        />
                      </Box>
                    )}
                  </BlockStack>
                </Card>

                <Card>
                  <TextField
                    label="Bundle Offer"
                    type="number"
                    prefix="%"
                    autoComplete="off"
                    value={offer}
                    name="offer"
                    onChange={handleOfferChange}
                    error={formErrors.offer}
                  />
                </Card>

                <Card>
                  <BlockStack gap="200">
                    <Text variant="bodyMd" as="p">
                      Product or Collection Selection:
                    </Text>
                    <ChoiceList
                      title=""
                      titleHidden
                      name="productSelection"
                      choices={[
                        {
                          label: "Specific Products",
                          value: "specificProducts",
                        },
                        {
                          label: "Specific Collections",
                          value: "specificCollections",
                        },
                      ]}
                      selected={[productSelection]}
                      onChange={(values) =>
                        handleProductSelectionChange(values[0])
                      }
                    />
                    <InlineStack>
                      {productSelection === "specificProducts" && (
                        <Button onClick={handleSelectProduct} variant="primary">
                          Select A Product
                        </Button>
                      )}
                      {productSelection === "specificCollections" && (
                        <Button
                          variant="primary"
                          disabled
                          onClick={handleSelectCollection}
                        >
                          Select A Collection
                        </Button>
                      )}
                    </InlineStack>
                    {formErrors.selectedProducts && (
                      <Text as="h3" tone="critical">
                        {formErrors.selectedProducts}
                      </Text>
                    )}
                  </BlockStack>
                </Card>
                {selectedProducts.length > 0 && (
                  <Card>
                    <BlockStack gap={"600"}>
                      <Text as="h3" variant="headingMd">
                        Selected Products
                      </Text>
                      {selectedProducts.map((product, productIndex) => (
                        <Box
                          key={product.id}
                          borderColor="border-brand"
                          borderWidth="025"
                          padding={"300"}
                          borderRadius="050"
                        >
                          <InlineGrid columns={2} gap={"600"}>
                            <BlockStack gap={"500"}>
                              <InlineStack gap={"600"} blockAlign="center">
                                <Thumbnail
                                  source={product.featuredImage}
                                  alt={product.title}
                                  size="small"
                                />
                                <BlockStack gap={"200"}>
                                  <Text as="h3" variant="headingMd">
                                    {product.title}
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                              <BlockStack gap={"200"}>
                                <Text as="p" variant="bodyMd" alignment="start">
                                  Variants:
                                </Text>
                                <InlineStack gap={"200"}>
                                  {product.variants.map((variant) => (
                                    <Tag
                                      onRemove={() => {
                                        let newProducts = [...selectedProducts];
                                        newProducts[productIndex].variants =
                                          newProducts[
                                            productIndex
                                          ].variants.filter(
                                            (item) => item.id !== variant.id,
                                          );
                                        if (
                                          newProducts[productIndex].variants
                                            .length === 0
                                        ) {
                                          newProducts = newProducts.filter(
                                            (item) => item.id !== product.id,
                                          );
                                        }
                                        setSelectedProducts(newProducts);
                                      }}
                                      key={variant.id}
                                    >
                                      {variant.title}
                                    </Tag>
                                  ))}
                                </InlineStack>
                              </BlockStack>
                            </BlockStack>
                            <InlineStack
                              gap={"200"}
                              blockAlign="center"
                              align="end"
                            >
                              <div style={{ width: "80px" }}>
                                <TextField
                                  type="number"
                                  value={product.quantity.toString()}
                                  autoComplete="off"
                                  labelHidden
                                  label="Quantity"
                                  onChange={(value) => {
                                    let newProducts = [...selectedProducts];
                                    newProducts[productIndex].quantity =
                                      parseInt(value);
                                    newProducts[productIndex].variants =
                                      newProducts[productIndex].variants.map(
                                        (variant) => ({
                                          ...variant,
                                          quantity: parseInt(value),
                                        }),
                                      );

                                    setSelectedProducts(newProducts);
                                  }}
                                ></TextField>
                              </div>
                              <Box width="max-content">
                                <Button
                                  variant="secondary"
                                  tone="critical"
                                  onClick={() => {
                                    let newProducts = [...selectedProducts];
                                    newProducts = newProducts.filter(
                                      (item) => item.id !== product.id,
                                    );
                                    setSelectedProducts(newProducts);
                                  }}
                                >
                                  Remove
                                </Button>
                              </Box>
                            </InlineStack>
                          </InlineGrid>
                        </Box>
                      ))}
                    </BlockStack>
                  </Card>
                )}
                <Card>
                  <BlockStack gap="200">
                    <Button onClick={handleAssignProduct} variant="primary">
                      Assign Bundle To Product(s)
                    </Button>
                    {formErrors.assignedProducts && (
                      <Text as="h3" tone="critical">
                        {formErrors.assignedProducts}
                      </Text>
                    )}
                    <InlineStack gap="200">
                      {assignedProducts.map(product => (
                        <Tag key={product.id}>{product.title}</Tag>
                      ))}
                    </InlineStack>
                  </BlockStack>
                </Card>
                <Card>
                  <BlockStack gap="200"></BlockStack>
                  <Checkbox
                    label="Show Comparison Prices"
                    checked={showComparisonPrice}
                    onChange={handleComparisonPriceChange}
                    name="showComparisonPrice"
                    helpText="Show comparison price in the product page"
                  />

                  <Checkbox
                    label="Direct to Checkout"
                    checked={directToCheckout}
                    onChange={handleDirectToCheckoutChange}
                    name="directToCheckout"
                    helpText="Customer will be redirected directly to checkout"
                  />
                </Card>
                <Box>
                  <InlineStack gap="300" align="end">
                    <Button
                      variant="primary"
                      onClick={handleFormSubmit}
                      disabled={isLoading}
                      loading={isLoading}
                    >
                      Publish
                    </Button>
                  </InlineStack>
                </Box>
                <input
                  type="hidden"
                  name="selectedProducts"
                  value={JSON.stringify(selectedProducts)}
                />
                <input
                  type="hidden"
                  name="assignedProducts"
                  value={JSON.stringify(assignedProducts.map(p => p.id))}
                />
                <input
                  type="hidden"
                  name="bundleImage"
                  value={bundleImage}
                />
              </BlockStack>
            </Form>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}