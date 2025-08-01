var _a;
import { jsx, jsxs } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useActionData, Form, Link, useRouteError, useSubmit, useNavigation, json as json$1 } from "@remix-run/react";
import { createReadableStreamFromReadable, json, redirect } from "@remix-run/node";
import { isbot } from "isbot";
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, AppDistribution, ApiVersion, LoginErrorType, boundary } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import { useState, useEffect, useCallback } from "react";
import { AppProvider, Page, Card, FormLayout, Text, TextField, Button, Layout, Banner, BlockStack, InlineStack, Thumbnail, Box, ChoiceList, InlineGrid, Tag, Checkbox, EmptyState } from "@shopify/polaris";
import { AppProvider as AppProvider$1 } from "@shopify/shopify-app-remix/react";
import { NavMenu, TitleBar } from "@shopify/app-bridge-react";
import { z } from "zod";
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}
const prisma = global.prismaGlobal ?? new PrismaClient();
const shopify$1 = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
ApiVersion.January25;
const addDocumentResponseHeaders = shopify$1.addDocumentResponseHeaders;
const authenticate = shopify$1.authenticate;
shopify$1.unauthenticated;
const login = shopify$1.login;
shopify$1.registerWebhooks;
shopify$1.sessionStorage;
const streamTimeout = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url
        }
      ),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
function App$2() {
  return /* @__PURE__ */ jsxs("html", { children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
      /* @__PURE__ */ jsx("link", { rel: "preconnect", href: "https://cdn.shopify.com/" }),
      /* @__PURE__ */ jsx(
        "link",
        {
          rel: "stylesheet",
          href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        }
      ),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$2
}, Symbol.toStringTag, { value: "Module" }));
const action$5 = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;
  if (session) {
    await prisma.session.update({
      where: {
        id: session.id
      },
      data: {
        scope: current.toString()
      }
    });
  }
  return new Response();
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5
}, Symbol.toStringTag, { value: "Module" }));
const action$4 = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  if (session) {
    await prisma.session.deleteMany({ where: { shop } });
  }
  return new Response();
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4
}, Symbol.toStringTag, { value: "Module" }));
const loader$7 = async ({ request }) => {
  var _a2, _b, _c;
  console.log("Storefront bundles loader called");
  try {
    const referer = request.headers.get("referer");
    console.log("Referer:", referer);
    if (!referer) {
      console.log("No referer found");
      return json({ bundles: [], error: "No referer found" });
    }
    const productHandle = referer == null ? void 0 : referer.split("/")[referer.split("/").length - 1].split("?")[0];
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
          query: `handle:${productHandle}`
        }
      }
    );
    const { data } = await response.json();
    console.log("GraphQL response:", JSON.stringify(data, null, 2));
    if (!((_b = (_a2 = data == null ? void 0 : data.products) == null ? void 0 : _a2.edges) == null ? void 0 : _b.length)) {
      console.log("Product not found");
      return json({ bundles: [], error: "Product not found" });
    }
    const product = data.products.edges[0].node;
    const metafield = product.metafield;
    console.log("Product:", product.title, "Metafield:", metafield);
    if (!((_c = metafield == null ? void 0 : metafield.jsonValue) == null ? void 0 : _c.bundles)) {
      console.log("No bundles found for this product");
      return json({ bundles: [] });
    }
    console.log("Found bundles:", metafield.jsonValue.bundles.length);
    return json({
      bundles: metafield.jsonValue.bundles
    });
  } catch (error) {
    console.error("Error in storefront.bundles loader:", error);
    return json({ bundles: [], error: "Failed to load bundles" });
  }
};
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
const Polaris = /* @__PURE__ */ JSON.parse('{"ActionMenu":{"Actions":{"moreActions":"More actions"},"RollupActions":{"rollupButton":"View actions"}},"ActionList":{"SearchField":{"clearButtonLabel":"Clear","search":"Search","placeholder":"Search actions"}},"Avatar":{"label":"Avatar","labelWithInitials":"Avatar with initials {initials}"},"Autocomplete":{"spinnerAccessibilityLabel":"Loading","ellipsis":"{content}…"},"Badge":{"PROGRESS_LABELS":{"incomplete":"Incomplete","partiallyComplete":"Partially complete","complete":"Complete"},"TONE_LABELS":{"info":"Info","success":"Success","warning":"Warning","critical":"Critical","attention":"Attention","new":"New","readOnly":"Read-only","enabled":"Enabled"},"progressAndTone":"{toneLabel} {progressLabel}"},"Banner":{"dismissButton":"Dismiss notification"},"Button":{"spinnerAccessibilityLabel":"Loading"},"Common":{"checkbox":"checkbox","undo":"Undo","cancel":"Cancel","clear":"Clear","close":"Close","submit":"Submit","more":"More"},"ContextualSaveBar":{"save":"Save","discard":"Discard"},"DataTable":{"sortAccessibilityLabel":"sort {direction} by","navAccessibilityLabel":"Scroll table {direction} one column","totalsRowHeading":"Totals","totalRowHeading":"Total"},"DatePicker":{"previousMonth":"Show previous month, {previousMonthName} {showPreviousYear}","nextMonth":"Show next month, {nextMonth} {nextYear}","today":"Today ","start":"Start of range","end":"End of range","months":{"january":"January","february":"February","march":"March","april":"April","may":"May","june":"June","july":"July","august":"August","september":"September","october":"October","november":"November","december":"December"},"days":{"monday":"Monday","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday"},"daysAbbreviated":{"monday":"Mo","tuesday":"Tu","wednesday":"We","thursday":"Th","friday":"Fr","saturday":"Sa","sunday":"Su"}},"DiscardConfirmationModal":{"title":"Discard all unsaved changes","message":"If you discard changes, you’ll delete any edits you made since you last saved.","primaryAction":"Discard changes","secondaryAction":"Continue editing"},"DropZone":{"single":{"overlayTextFile":"Drop file to upload","overlayTextImage":"Drop image to upload","overlayTextVideo":"Drop video to upload","actionTitleFile":"Add file","actionTitleImage":"Add image","actionTitleVideo":"Add video","actionHintFile":"or drop file to upload","actionHintImage":"or drop image to upload","actionHintVideo":"or drop video to upload","labelFile":"Upload file","labelImage":"Upload image","labelVideo":"Upload video"},"allowMultiple":{"overlayTextFile":"Drop files to upload","overlayTextImage":"Drop images to upload","overlayTextVideo":"Drop videos to upload","actionTitleFile":"Add files","actionTitleImage":"Add images","actionTitleVideo":"Add videos","actionHintFile":"or drop files to upload","actionHintImage":"or drop images to upload","actionHintVideo":"or drop videos to upload","labelFile":"Upload files","labelImage":"Upload images","labelVideo":"Upload videos"},"errorOverlayTextFile":"File type is not valid","errorOverlayTextImage":"Image type is not valid","errorOverlayTextVideo":"Video type is not valid"},"EmptySearchResult":{"altText":"Empty search results"},"Frame":{"skipToContent":"Skip to content","navigationLabel":"Navigation","Navigation":{"closeMobileNavigationLabel":"Close navigation"}},"FullscreenBar":{"back":"Back","accessibilityLabel":"Exit fullscreen mode"},"Filters":{"moreFilters":"More filters","moreFiltersWithCount":"More filters ({count})","filter":"Filter {resourceName}","noFiltersApplied":"No filters applied","cancel":"Cancel","done":"Done","clearAllFilters":"Clear all filters","clear":"Clear","clearLabel":"Clear {filterName}","addFilter":"Add filter","clearFilters":"Clear all","searchInView":"in:{viewName}"},"FilterPill":{"clear":"Clear","unsavedChanges":"Unsaved changes - {label}"},"IndexFilters":{"searchFilterTooltip":"Search and filter","searchFilterTooltipWithShortcut":"Search and filter (F)","searchFilterAccessibilityLabel":"Search and filter results","sort":"Sort your results","addView":"Add a new view","newView":"Custom search","SortButton":{"ariaLabel":"Sort the results","tooltip":"Sort","title":"Sort by","sorting":{"asc":"Ascending","desc":"Descending","az":"A-Z","za":"Z-A"}},"EditColumnsButton":{"tooltip":"Edit columns","accessibilityLabel":"Customize table column order and visibility"},"UpdateButtons":{"cancel":"Cancel","update":"Update","save":"Save","saveAs":"Save as","modal":{"title":"Save view as","label":"Name","sameName":"A view with this name already exists. Please choose a different name.","save":"Save","cancel":"Cancel"}}},"IndexProvider":{"defaultItemSingular":"Item","defaultItemPlural":"Items","allItemsSelected":"All {itemsLength}+ {resourceNamePlural} are selected","selected":"{selectedItemsCount} selected","a11yCheckboxDeselectAllSingle":"Deselect {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Select {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deselect all {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Select all {itemsLength} {resourceNamePlural}"},"IndexTable":{"emptySearchTitle":"No {resourceNamePlural} found","emptySearchDescription":"Try changing the filters or search term","onboardingBadgeText":"New","resourceLoadingAccessibilityLabel":"Loading {resourceNamePlural}…","selectAllLabel":"Select all {resourceNamePlural}","selected":"{selectedItemsCount} selected","undo":"Undo","selectAllItems":"Select all {itemsLength}+ {resourceNamePlural}","selectItem":"Select {resourceName}","selectButtonText":"Select","sortAccessibilityLabel":"sort {direction} by"},"Loading":{"label":"Page loading bar"},"Modal":{"iFrameTitle":"body markup","modalWarning":"These required properties are missing from Modal: {missingProps}"},"Page":{"Header":{"rollupActionsLabel":"View actions for {title}","pageReadyAccessibilityLabel":"{title}. This page is ready"}},"Pagination":{"previous":"Previous","next":"Next","pagination":"Pagination"},"ProgressBar":{"negativeWarningMessage":"Values passed to the progress prop shouldn’t be negative. Resetting {progress} to 0.","exceedWarningMessage":"Values passed to the progress prop shouldn’t exceed 100. Setting {progress} to 100."},"ResourceList":{"sortingLabel":"Sort by","defaultItemSingular":"item","defaultItemPlural":"items","showing":"Showing {itemsCount} {resource}","showingTotalCount":"Showing {itemsCount} of {totalItemsCount} {resource}","loading":"Loading {resource}","selected":"{selectedItemsCount} selected","allItemsSelected":"All {itemsLength}+ {resourceNamePlural} in your store are selected","allFilteredItemsSelected":"All {itemsLength}+ {resourceNamePlural} in this filter are selected","selectAllItems":"Select all {itemsLength}+ {resourceNamePlural} in your store","selectAllFilteredItems":"Select all {itemsLength}+ {resourceNamePlural} in this filter","emptySearchResultTitle":"No {resourceNamePlural} found","emptySearchResultDescription":"Try changing the filters or search term","selectButtonText":"Select","a11yCheckboxDeselectAllSingle":"Deselect {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Select {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deselect all {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Select all {itemsLength} {resourceNamePlural}","Item":{"actionsDropdownLabel":"Actions for {accessibilityLabel}","actionsDropdown":"Actions dropdown","viewItem":"View details for {itemName}"},"BulkActions":{"actionsActivatorLabel":"Actions","moreActionsActivatorLabel":"More actions"}},"SkeletonPage":{"loadingLabel":"Page loading"},"Tabs":{"newViewAccessibilityLabel":"Create new view","newViewTooltip":"Create view","toggleTabsLabel":"More views","Tab":{"rename":"Rename view","duplicate":"Duplicate view","edit":"Edit view","editColumns":"Edit columns","delete":"Delete view","copy":"Copy of {name}","deleteModal":{"title":"Delete view?","description":"This can’t be undone. {viewName} view will no longer be available in your admin.","cancel":"Cancel","delete":"Delete view"}},"RenameModal":{"title":"Rename view","label":"Name","cancel":"Cancel","create":"Save","errors":{"sameName":"A view with this name already exists. Please choose a different name."}},"DuplicateModal":{"title":"Duplicate view","label":"Name","cancel":"Cancel","create":"Create view","errors":{"sameName":"A view with this name already exists. Please choose a different name."}},"CreateViewModal":{"title":"Create new view","label":"Name","cancel":"Cancel","create":"Create view","errors":{"sameName":"A view with this name already exists. Please choose a different name."}}},"Tag":{"ariaLabel":"Remove {children}"},"TextField":{"characterCount":"{count} characters","characterCountWithMaxLength":"{count} of {limit} characters used"},"TooltipOverlay":{"accessibilityLabel":"Tooltip: {label}"},"TopBar":{"toggleMenuLabel":"Toggle menu","SearchField":{"clearButtonLabel":"Clear","search":"Search"}},"MediaCard":{"dismissButton":"Dismiss","popoverButton":"Actions"},"VideoThumbnail":{"playButtonA11yLabel":{"default":"Play video","defaultWithDuration":"Play video of length {duration}","duration":{"hours":{"other":{"only":"{hourCount} hours","andMinutes":"{hourCount} hours and {minuteCount} minutes","andMinute":"{hourCount} hours and {minuteCount} minute","minutesAndSeconds":"{hourCount} hours, {minuteCount} minutes, and {secondCount} seconds","minutesAndSecond":"{hourCount} hours, {minuteCount} minutes, and {secondCount} second","minuteAndSeconds":"{hourCount} hours, {minuteCount} minute, and {secondCount} seconds","minuteAndSecond":"{hourCount} hours, {minuteCount} minute, and {secondCount} second","andSeconds":"{hourCount} hours and {secondCount} seconds","andSecond":"{hourCount} hours and {secondCount} second"},"one":{"only":"{hourCount} hour","andMinutes":"{hourCount} hour and {minuteCount} minutes","andMinute":"{hourCount} hour and {minuteCount} minute","minutesAndSeconds":"{hourCount} hour, {minuteCount} minutes, and {secondCount} seconds","minutesAndSecond":"{hourCount} hour, {minuteCount} minutes, and {secondCount} second","minuteAndSeconds":"{hourCount} hour, {minuteCount} minute, and {secondCount} seconds","minuteAndSecond":"{hourCount} hour, {minuteCount} minute, and {secondCount} second","andSeconds":"{hourCount} hour and {secondCount} seconds","andSecond":"{hourCount} hour and {secondCount} second"}},"minutes":{"other":{"only":"{minuteCount} minutes","andSeconds":"{minuteCount} minutes and {secondCount} seconds","andSecond":"{minuteCount} minutes and {secondCount} second"},"one":{"only":"{minuteCount} minute","andSeconds":"{minuteCount} minute and {secondCount} seconds","andSecond":"{minuteCount} minute and {secondCount} second"}},"seconds":{"other":"{secondCount} seconds","one":"{secondCount} second"}}}}}');
const polarisTranslations = {
  Polaris
};
const polarisStyles = "/assets/styles-BeiPL2RV.css";
function loginErrorMessage(loginErrors) {
  if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}
const links$1 = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$6 = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors, polarisTranslations };
};
const action$3 = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return {
    errors
  };
};
function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;
  return /* @__PURE__ */ jsx(AppProvider, { i18n: loaderData.polarisTranslations, children: /* @__PURE__ */ jsx(Page, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Form, { method: "post", children: /* @__PURE__ */ jsxs(FormLayout, { children: [
    /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Log in" }),
    /* @__PURE__ */ jsx(
      TextField,
      {
        type: "text",
        name: "shop",
        label: "Shop domain",
        helpText: "example.myshopify.com",
        value: shop,
        onChange: setShop,
        autoComplete: "on",
        error: errors.shop
      }
    ),
    /* @__PURE__ */ jsx(Button, { submit: true, children: "Log in" })
  ] }) }) }) }) });
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: Auth,
  links: links$1,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
const loader$5 = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
const index = "_index_12o3y_1";
const heading = "_heading_12o3y_11";
const text = "_text_12o3y_12";
const content = "_content_12o3y_22";
const form = "_form_12o3y_27";
const label = "_label_12o3y_35";
const input = "_input_12o3y_43";
const button = "_button_12o3y_47";
const list = "_list_12o3y_51";
const styles = {
  index,
  heading,
  text,
  content,
  form,
  label,
  input,
  button,
  list
};
const loader$4 = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return { showForm: Boolean(login) };
};
function App$1() {
  const { showForm } = useLoaderData();
  return /* @__PURE__ */ jsx("div", { className: styles.index, children: /* @__PURE__ */ jsxs("div", { className: styles.content, children: [
    /* @__PURE__ */ jsx("h1", { className: styles.heading, children: "A short heading about [your app]" }),
    /* @__PURE__ */ jsx("p", { className: styles.text, children: "A tagline about [your app] that describes your value proposition." }),
    showForm && /* @__PURE__ */ jsxs(Form, { className: styles.form, method: "post", action: "/auth/login", children: [
      /* @__PURE__ */ jsxs("label", { className: styles.label, children: [
        /* @__PURE__ */ jsx("span", { children: "Shop domain" }),
        /* @__PURE__ */ jsx("input", { className: styles.input, type: "text", name: "shop" }),
        /* @__PURE__ */ jsx("span", { children: "e.g: my-shop-domain.myshopify.com" })
      ] }),
      /* @__PURE__ */ jsx("button", { className: styles.button, type: "submit", children: "Log in" })
    ] }),
    /* @__PURE__ */ jsxs("ul", { className: styles.list, children: [
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] }),
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] }),
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] })
    ] })
  ] }) });
}
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$1,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
const links = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$3 = async ({ request }) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};
function App() {
  const { apiKey } = useLoaderData();
  return /* @__PURE__ */ jsxs(AppProvider$1, { isEmbeddedApp: true, apiKey, children: [
    /* @__PURE__ */ jsxs(NavMenu, { children: [
      /* @__PURE__ */ jsx(Link, { to: "/app", rel: "home", children: "Home" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/bundles/list", children: "Bundles" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/additional", children: "Additional page" })
    ] }),
    /* @__PURE__ */ jsx(Outlet, {})
  ] });
}
function ErrorBoundary() {
  return boundary.error(useRouteError());
}
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: App,
  headers,
  links,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const loader$2 = async ({ request }) => {
  var _a2, _b, _c;
  const { admin } = await authenticate.admin(request);
  const allBundles = [];
  let hasNextPage = true;
  let endCursor = null;
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
      const image = (_a2 = node.images.edges[0]) == null ? void 0 : _a2.node;
      const metafieldValue = (_b = node.metafield) == null ? void 0 : _b.value;
      if (metafieldValue) {
        try {
          const parsed = JSON.parse(metafieldValue);
          if ((_c = parsed == null ? void 0 : parsed.bundles) == null ? void 0 : _c.length) {
            parsed.bundles.forEach((bundle, bundleIdx) => {
              allBundles.push({
                productId: node.id,
                productTitle: node.title,
                image: image == null ? void 0 : image.originalSrc,
                metafieldId: node.metafield.id,
                bundleIndex: bundleIdx,
                ...bundle
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
const action$2 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  if (formData.get("_action") === "delete") {
    const productId = formData.get("productId");
    const bundleIndex = parseInt(formData.get("bundleIndex"), 10);
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
    bundles.splice(bundleIndex, 1);
    let metafields = [];
    if (bundles.length === 0) {
      metafields.push({
        ownerId: productId,
        namespace: "$app:bundles",
        key: "function-configuration",
        value: JSON.stringify({ bundles: [] }),
        type: "json"
      });
    } else {
      metafields.push({
        ownerId: productId,
        namespace: "$app:bundles",
        key: "function-configuration",
        value: JSON.stringify({ bundles }),
        type: "json"
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
          metafields
        }
      }
    );
    const updateData = await updateResp.json();
    if (updateData.data.metafieldsSet.userErrors.length > 0) {
      return json({
        success: false,
        message: updateData.data.metafieldsSet.userErrors[0].message
      });
    }
    return redirect("/app/bundles/list");
  }
  return json({ success: false });
};
function BundlesPage() {
  const { bundles } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [deleteError, setDeleteError] = useState(null);
  const handleDelete = (productId, bundleIndex) => {
    if (window.confirm(
      "Are you sure you want to delete this bundle? This action cannot be undone."
    )) {
      const formData = new FormData();
      formData.set("_action", "delete");
      formData.set("productId", productId);
      formData.set("bundleIndex", bundleIndex.toString());
      submit(formData, { method: "post" });
    }
  };
  return /* @__PURE__ */ jsxs(Page, { title: "All Bundles", children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Bundles" }),
    /* @__PURE__ */ jsxs(Layout, { children: [
      deleteError && /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Banner, { tone: "critical", children: /* @__PURE__ */ jsx("p", { children: deleteError }) }) }),
      bundles.length === 0 ? /* @__PURE__ */ jsx(BlockStack, { children: /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: "No bundles found." }) }) : bundles.map((bundle, index2) => {
        var _a2;
        return /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "300", blockAlign: "center", children: [
          /* @__PURE__ */ jsx(
            Thumbnail,
            {
              source: bundle.bundleImage || bundle.image || "",
              alt: bundle.bundleImage ? "Bundle image" : "Product image",
              size: "large"
            }
          ),
          /* @__PURE__ */ jsxs(BlockStack, { children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: bundle.name }),
            /* @__PURE__ */ jsxs(Text, { variant: "bodySm", as: "p", tone: "subdued", children: [
              "Product: ",
              bundle.productTitle
            ] }),
            /* @__PURE__ */ jsxs(Text, { variant: "bodySm", as: "p", children: [
              "Display Text: ",
              bundle.displayText
            ] }),
            bundle.bundleImage && /* @__PURE__ */ jsx(Text, { variant: "bodySm", as: "p", tone: "success", children: "✓ Custom bundle image set" }),
            /* @__PURE__ */ jsxs(Text, { variant: "bodySm", as: "p", children: [
              "Direct to Checkout: ",
              bundle.directToCheckout ? "Yes" : "No"
            ] }),
            /* @__PURE__ */ jsxs(Text, { variant: "bodySm", as: "p", children: [
              "Show Comparison Price: ",
              bundle.showComparisonPrice ? "Yes" : "No"
            ] }),
            /* @__PURE__ */ jsxs(Text, { variant: "bodySm", as: "p", children: [
              "Products: ",
              ((_a2 = bundle.selectedProducts) == null ? void 0 : _a2.length) || 0
            ] }),
            bundle.assignedProducts && /* @__PURE__ */ jsxs(Text, { variant: "bodySm", as: "p", children: [
              "Assigned Products: ",
              bundle.assignedProducts.length
            ] })
          ] }),
          /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              tone: "critical",
              disabled: navigation.state === "submitting",
              loading: navigation.state === "submitting",
              onClick: () => handleDelete(bundle.productId, bundle.bundleIndex),
              children: "Delete"
            }
          ) })
        ] }) }) }) }, index2);
      })
    ] })
  ] });
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: BundlesPage,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const BundleSchema = z.object({
  bundleName: z.string().min(1, "Bundle name is required").max(100, "Bundle name must be less than 100 characters"),
  displayText: z.string().min(1, "Display text is required").max(100, "Display text must be less than 100 characters"),
  offer: z.string().regex(/^\d+(\.\d+)?$/, "Offer must be a valid number").transform((val) => parseFloat(val)),
  showComparisonPrice: z.enum(["true", "false"]).transform((val) => val === "true"),
  directToCheckout: z.enum(["true", "false"]).transform((val) => val === "true"),
  bundleImage: z.string().optional(),
  // Add bundle image field
  selectedProducts: z.string().refine(
    (val) => {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    },
    { message: "At least one product must be selected" }
  )
});
function validateBundleForm(formData) {
  const rawData = {
    bundleName: formData.get("bundleName"),
    displayText: formData.get("displayText"),
    offer: formData.get("offer"),
    showComparisonPrice: formData.get("showComparisonPrice") || "false",
    directToCheckout: formData.get("directToCheckout") || "false",
    bundleImage: formData.get("bundleImage") || "",
    // Add bundle image
    selectedProducts: formData.get("selectedProducts"),
    assignedProducts: formData.get("assignedProducts")
  };
  try {
    const validatedData = BundleSchema.parse(rawData);
    return { data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const path = err.path[0];
        errors[path] = err.message;
      });
      return { errors };
    }
    return { errors: { bundleName: "An unknown error occurred" } };
  }
}
const loader$1 = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};
const action$1 = async ({ request }) => {
  var _a2, _b;
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  console.log("Form data received:", {
    bundleImage: formData.get("bundleImage"),
    bundleName: formData.get("bundleName"),
    displayText: formData.get("displayText")
  });
  const validation = validateBundleForm(formData);
  if (validation.errors) {
    return json({
      success: false,
      errors: validation.errors
    });
  }
  const {
    bundleName,
    displayText,
    showComparisonPrice,
    directToCheckout,
    bundleImage,
    selectedProducts
  } = validation.data;
  console.log("Validated data:", { bundleName, displayText, bundleImage });
  const assignedProductsRaw = formData.get("assignedProducts");
  const assignedProducts = assignedProductsRaw ? JSON.parse(assignedProductsRaw) : [];
  const parsedProducts = JSON.parse(selectedProducts);
  const metafields = [];
  for (const productId of assignedProducts) {
    const response2 = await admin.graphql(
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
          id: productId
        }
      }
    );
    const { data: data2 } = await response2.json();
    const bundles = ((_b = (_a2 = data2.product.bundledComponentData) == null ? void 0 : _a2.jsonValue) == null ? void 0 : _b.bundles) || [];
    const metafield = {
      bundles: [
        ...bundles,
        {
          name: bundleName,
          displayText,
          bundleImage,
          // Add bundle image to the metafield
          selectedProducts: parsedProducts,
          assignedProducts,
          showComparisonPrice,
          directToCheckout
        }
      ]
    };
    console.log("Saving metafield with bundleImage:", bundleImage);
    metafields.push({
      ownerId: productId,
      namespace: "$app:bundles",
      key: "function-configuration",
      value: JSON.stringify(metafield),
      type: "json"
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
        metafields
      }
    }
  );
  const { data } = await response.json();
  if (data.metafieldsSet.userErrors.length > 0) {
    return json({
      success: false,
      errors: { message: data.metafieldsSet.userErrors[0].message }
    });
  }
  return json({ success: true });
};
function Index$1() {
  var _a2;
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  const actionData = useActionData();
  const [bundleName, setBundleName] = useState("");
  const [productSelection, setProductSelection] = useState("specificProducts");
  const [displayText, setDisplayText] = useState("Limited Offer");
  const [bundleImage, setBundleImage] = useState("");
  const [showComparisonPrice, setShowComparisonPrice] = useState(true);
  const [directToCheckout, setDirectToCheckout] = useState(false);
  const [offer, setOffer] = useState("10");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [assignedProducts, setAssignedProducts] = useState([]);
  const handleAssignProduct = async () => {
    const selections = await shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true
    });
    if (selections) {
      const assigned = selections.map((product) => {
        var _a3;
        return {
          title: product.title,
          id: product.id,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            title: variant.title,
            quantity: 1,
            price: parseFloat(variant.price),
            originalPrice: parseFloat(variant.price)
          })),
          quantity: 1,
          featuredImage: ((_a3 = product.images[0]) == null ? void 0 : _a3.originalSrc) || "",
          offer: 0
        };
      });
      setAssignedProducts(assigned);
    }
  };
  useEffect(() => {
    if (actionData == null ? void 0 : actionData.success) {
      shopify.toast.show("Yay!, Product Bundle Saved");
      setBundleName("");
      setDisplayText("Limited Offer");
      setBundleImage("");
      setOffer("10");
      setSelectedProducts([]);
      setAssignedProducts([]);
      setFormErrors({});
    } else if (actionData == null ? void 0 : actionData.errors) {
      setFormErrors(actionData.errors);
    }
  }, [actionData]);
  const handleBundleNameChange = useCallback(
    (newValue) => {
      setBundleName(newValue);
      if (formErrors.bundleName) {
        setFormErrors({ ...formErrors, bundleName: void 0 });
      }
    },
    [formErrors]
  );
  const handleProductSelectionChange = useCallback(
    (value) => setProductSelection(value),
    []
  );
  const handleBlockTextChange = useCallback(
    (newValue) => {
      setDisplayText(newValue);
      if (formErrors.displayText) {
        setFormErrors({ ...formErrors, displayText: void 0 });
      }
    },
    [formErrors]
  );
  const handleComparisonPriceChange = useCallback(
    (newChecked) => setShowComparisonPrice(newChecked),
    []
  );
  const handleDirectToCheckoutChange = useCallback(
    (newChecked) => setDirectToCheckout(newChecked),
    []
  );
  const validateClient = () => {
    const clientErrors = {};
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
      assignedProducts: JSON.stringify(assignedProducts.map((p) => p.id)),
      bundleImage
      // Add bundleImage to the form submission
    };
    submit(formData, { method: "post" });
  }, [
    bundleName,
    displayText,
    offer,
    showComparisonPrice,
    directToCheckout,
    bundleImage,
    // Add bundleImage to dependencies
    submit,
    selectedProducts,
    assignedProducts
  ]);
  const handleSelectBundleImage = async () => {
    try {
      const selections = await shopify.resourcePicker({
        type: "product",
        action: "select",
        multiple: false
      });
      if (selections && selections.length > 0) {
        const product = selections[0];
        if (product.images && product.images.length > 0) {
          if (product.images.length === 1) {
            setBundleImage(product.images[0].originalSrc);
          } else {
            setBundleImage(product.images[0].originalSrc);
          }
          if (formErrors.bundleImage) {
            setFormErrors({ ...formErrors, bundleImage: void 0 });
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
      multiple: true
    });
    console.log(selections);
  };
  const handleSelectProduct = async () => {
    const selections = await shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
      filter: {
        query: "(gift_card:false) AND (inventory_total:>1)",
        variants: true
      }
    });
    if (selections) {
      const selectedProducts2 = selections.map((product) => ({
        title: product.title,
        id: product.id,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          title: variant.title,
          quantity: 1,
          price: parseFloat(variant.price),
          originalPrice: parseFloat(variant.price)
        })),
        quantity: 1,
        featuredImage: product.images[0].originalSrc,
        offer: parseFloat(offer)
      }));
      setSelectedProducts(selectedProducts2);
      if (formErrors.selectedProducts) {
        setFormErrors({ ...formErrors, selectedProducts: void 0 });
      }
    } else {
      setSelectedProducts([]);
    }
  };
  return /* @__PURE__ */ jsxs(
    Page,
    {
      title: "New Bundle",
      primaryAction: {
        content: "Create bundle",
        onAction: handleFormSubmit,
        disabled: isLoading,
        loading: isLoading
      },
      children: [
        /* @__PURE__ */ jsx(TitleBar, { title: "Bundler App" }),
        /* @__PURE__ */ jsx(BlockStack, { gap: "500", children: /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsxs(Layout.Section, { children: [
          ((_a2 = actionData == null ? void 0 : actionData.errors) == null ? void 0 : _a2.message) && /* @__PURE__ */ jsx(Banner, { tone: "critical", children: /* @__PURE__ */ jsx("p", { children: actionData.errors.message }) }),
          /* @__PURE__ */ jsx(Form, { method: "post", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Bundle Name (Internal)",
                value: bundleName,
                onChange: handleBundleNameChange,
                autoComplete: "off",
                placeholder: "Bundle Name",
                name: "bundleName",
                error: formErrors.bundleName
              }
            ) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Display Text",
                value: displayText,
                onChange: handleBlockTextChange,
                autoComplete: "off",
                name: "displayText",
                error: formErrors.displayText
              }
            ) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: "Bundle Image" }),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Image URL",
                  value: bundleImage,
                  onChange: (value) => {
                    setBundleImage(value);
                    if (formErrors.bundleImage) {
                      setFormErrors({ ...formErrors, bundleImage: void 0 });
                    }
                  },
                  autoComplete: "off",
                  name: "bundleImage",
                  placeholder: "Enter image URL or select from products below",
                  error: formErrors.bundleImage
                }
              ),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "space-between", children: [
                /* @__PURE__ */ jsx(Button, { onClick: handleSelectBundleImage, variant: "secondary", children: "Pick Image from Products" }),
                bundleImage && /* @__PURE__ */ jsx(
                  Button,
                  {
                    onClick: () => setBundleImage(""),
                    variant: "tertiary",
                    tone: "critical",
                    children: "Remove Image"
                  }
                )
              ] }),
              bundleImage && /* @__PURE__ */ jsx(Box, { paddingBlockStart: "200", children: /* @__PURE__ */ jsx(
                Thumbnail,
                {
                  source: bundleImage,
                  alt: "Bundle preview",
                  size: "large"
                }
              ) })
            ] }) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Bundle Offer",
                type: "number",
                prefix: "%",
                autoComplete: "off",
                value: offer,
                name: "offer",
                onChange: (value) => {
                  setOffer(value);
                  if (formErrors.offer) {
                    setFormErrors({ ...formErrors, offer: void 0 });
                  }
                },
                error: formErrors.offer
              }
            ) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", children: "Product or Collection Selection:" }),
              /* @__PURE__ */ jsx(
                ChoiceList,
                {
                  title: "",
                  titleHidden: true,
                  name: "productSelection",
                  choices: [
                    {
                      label: "Specific Products",
                      value: "specificProducts"
                    },
                    {
                      label: "Specific Collections",
                      value: "specificCollections"
                    }
                  ],
                  selected: [productSelection],
                  onChange: (values) => handleProductSelectionChange(values[0])
                }
              ),
              /* @__PURE__ */ jsxs(InlineStack, { children: [
                productSelection === "specificProducts" && /* @__PURE__ */ jsx(Button, { onClick: handleSelectProduct, variant: "primary", children: "Select A Product" }),
                productSelection === "specificCollections" && /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "primary",
                    disabled: true,
                    onClick: handleSelectCollection,
                    children: "Select A Collection"
                  }
                )
              ] }),
              formErrors.selectedProducts && /* @__PURE__ */ jsx(Text, { as: "h3", tone: "critical", children: formErrors.selectedProducts })
            ] }) }),
            selectedProducts.length > 0 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "600", children: [
              /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingMd", children: "Selected Products" }),
              selectedProducts.map((product, productIndex) => /* @__PURE__ */ jsx(
                Box,
                {
                  borderColor: "border-brand",
                  borderWidth: "025",
                  padding: "300",
                  borderRadius: "050",
                  children: /* @__PURE__ */ jsxs(InlineGrid, { columns: 2, gap: "600", children: [
                    /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
                      /* @__PURE__ */ jsxs(InlineStack, { gap: "600", blockAlign: "center", children: [
                        /* @__PURE__ */ jsx(
                          Thumbnail,
                          {
                            source: product.featuredImage,
                            alt: product.title,
                            size: "small"
                          }
                        ),
                        /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: /* @__PURE__ */ jsx(Text, { as: "h3", variant: "headingMd", children: product.title }) })
                      ] }),
                      /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                        /* @__PURE__ */ jsx(Text, { as: "p", variant: "bodyMd", alignment: "start", children: "Variants:" }),
                        /* @__PURE__ */ jsx(InlineStack, { gap: "200", children: product.variants.map((variant) => /* @__PURE__ */ jsx(
                          Tag,
                          {
                            onRemove: () => {
                              let newProducts = [...selectedProducts];
                              newProducts[productIndex].variants = newProducts[productIndex].variants.filter(
                                (item) => item.id !== variant.id
                              );
                              if (newProducts[productIndex].variants.length === 0) {
                                newProducts = newProducts.filter(
                                  (item) => item.id !== product.id
                                );
                              }
                              setSelectedProducts(newProducts);
                            },
                            children: variant.title
                          },
                          variant.id
                        )) })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs(
                      InlineStack,
                      {
                        gap: "200",
                        blockAlign: "center",
                        align: "end",
                        children: [
                          /* @__PURE__ */ jsx("div", { style: { width: "80px" }, children: /* @__PURE__ */ jsx(
                            TextField,
                            {
                              type: "number",
                              value: product.quantity.toString(),
                              autoComplete: "off",
                              labelHidden: true,
                              label: "Quantity",
                              onChange: (value) => {
                                let newProducts = [...selectedProducts];
                                newProducts[productIndex].quantity = parseInt(value);
                                newProducts[productIndex].variants = newProducts[productIndex].variants.map(
                                  (variant) => ({
                                    ...variant,
                                    quantity: parseInt(value)
                                  })
                                );
                                setSelectedProducts(newProducts);
                              }
                            }
                          ) }),
                          /* @__PURE__ */ jsx(Box, { width: "max-content", children: /* @__PURE__ */ jsx(
                            Button,
                            {
                              variant: "secondary",
                              tone: "critical",
                              onClick: () => {
                                let newProducts = [...selectedProducts];
                                newProducts = newProducts.filter(
                                  (item) => item.id !== product.id
                                );
                                setSelectedProducts(newProducts);
                              },
                              children: "Remove"
                            }
                          ) })
                        ]
                      }
                    )
                  ] })
                },
                product.id
              ))
            ] }) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Button, { onClick: handleAssignProduct, variant: "primary", children: "Assign Bundle To Product(s)" }),
              formErrors.assignedProducts && /* @__PURE__ */ jsx(Text, { as: "h3", tone: "critical", children: formErrors.assignedProducts }),
              /* @__PURE__ */ jsx(InlineStack, { gap: "200", children: assignedProducts.map((product) => /* @__PURE__ */ jsx(Tag, { children: product.title }, product.id)) })
            ] }) }),
            /* @__PURE__ */ jsxs(Card, { children: [
              /* @__PURE__ */ jsx(BlockStack, { gap: "200" }),
              /* @__PURE__ */ jsx(
                Checkbox,
                {
                  label: "Show Comparison Prices",
                  checked: showComparisonPrice,
                  onChange: handleComparisonPriceChange,
                  name: "showComparisonPrice",
                  helpText: "Show comparison price in the product page"
                }
              ),
              /* @__PURE__ */ jsx(
                Checkbox,
                {
                  label: "Direct to Checkout",
                  checked: directToCheckout,
                  onChange: handleDirectToCheckoutChange,
                  name: "directToCheckout",
                  helpText: "Customer will be redirected directly to checkout"
                }
              )
            ] }),
            /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(InlineStack, { gap: "300", align: "end", children: /* @__PURE__ */ jsx(
              Button,
              {
                variant: "primary",
                onClick: handleFormSubmit,
                disabled: isLoading,
                loading: isLoading,
                children: "Publish"
              }
            ) }) }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "hidden",
                name: "selectedProducts",
                value: JSON.stringify(selectedProducts)
              }
            ),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "hidden",
                name: "assignedProducts",
                value: JSON.stringify(assignedProducts.map((p) => p.id))
              }
            ),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "hidden",
                name: "bundleImage",
                value: bundleImage
              }
            )
          ] }) })
        ] }) }) })
      ]
    }
  );
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: Index$1,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  try {
    const response = await admin.graphql(`
      query cartTransforms {
  cartTransforms(first: 1) {
    edges {
      node {
        id
        functionId
        metafields(first:1) {
          edges {
            node {
              namespace
              key
              value
              jsonValue
            }
          }
        }
      }
    }
  }
}`);
    const { data } = await response.json();
    return json$1({
      cartTransformId: data.cartTransforms.edges[0].node.id
    });
  } catch (error) {
    console.error(error);
    return json$1({ cartTransformId: null });
  }
};
const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  try {
    const res = await admin.graphql(
      `
      mutation CartTransformCreate($functionId: String!, $blockOnFailure: Boolean!) {
  cartTransformCreate(functionId: $functionId, blockOnFailure: $blockOnFailure) {
    userErrors {
      field
      message
    }
    cartTransform {
      id
    }
  }
}
 `,
      {
        variables: {
          functionId: process.env.SHOPIFY_CART_TRANSFORMER_ID,
          blockOnFailure: true
        }
      }
    );
    const { data } = await res.json();
    if (data.cartTransformCreate.userErrors.length > 0) {
      console.log(data.cartTransformCreate.userErrors);
      return json$1({
        success: false
      });
    }
    console.log(data.cartTransformCreate);
    return json$1({
      success: true
    });
  } catch (error) {
    console.log(error);
  }
  return null;
};
function Index() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  const handleActivation = () => {
    submit({}, { method: "POST" });
  };
  const { cartTransformId } = useLoaderData();
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Bundle App" }),
    /* @__PURE__ */ jsxs(Card, { children: [
      !cartTransformId && /* @__PURE__ */ jsx(
        EmptyState,
        {
          heading: "Create product bundle",
          action: {
            content: "Active Cart Transform API",
            onAction: handleActivation,
            disabled: isLoading,
            loading: isLoading
          },
          image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
          children: /* @__PURE__ */ jsx("p", { children: "Manage and create product bundled." })
        }
      ),
      cartTransformId && /* @__PURE__ */ jsx(
        EmptyState,
        {
          heading: "Create product bundle",
          action: {
            content: "Create your bundle",
            url: "/app/bundles/new"
          },
          secondaryAction: {
            content: "View existing bundles",
            url: "/app/bundles/list"
          },
          image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
          children: /* @__PURE__ */ jsx("p", { children: "Manage and create product bundled." })
        }
      )
    ] })
  ] });
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: Index,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-BcDTvr6O.js", "imports": ["/assets/components-Dy2V4Mi5.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-Dg0FNWeg.js", "imports": ["/assets/components-Dy2V4Mi5.js"], "css": [] }, "routes/webhooks.app.scopes_update": { "id": "routes/webhooks.app.scopes_update", "parentId": "root", "path": "webhooks/app/scopes_update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.scopes_update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.app.uninstalled": { "id": "routes/webhooks.app.uninstalled", "parentId": "root", "path": "webhooks/app/uninstalled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.uninstalled-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/storefront.bundles": { "id": "routes/storefront.bundles", "parentId": "root", "path": "storefront/bundles", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/storefront.bundles-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-Cs1todke.js", "imports": ["/assets/components-Dy2V4Mi5.js", "/assets/styles-DyoLs1W3.js", "/assets/Page-BlUVaYsq.js", "/assets/context-Bogj3_SU.js"], "css": [] }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-BeXiVg0B.js", "imports": ["/assets/components-Dy2V4Mi5.js"], "css": ["/assets/route-TqOIn4DE.css"] }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/app-Wv6vZJnV.js", "imports": ["/assets/components-Dy2V4Mi5.js", "/assets/styles-DyoLs1W3.js", "/assets/context-Bogj3_SU.js"], "css": [] }, "routes/app.bundles.list": { "id": "routes/app.bundles.list", "parentId": "routes/app", "path": "bundles/list", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.bundles.list-CfNZZbGb.js", "imports": ["/assets/components-Dy2V4Mi5.js", "/assets/Page-BlUVaYsq.js", "/assets/TitleBar-CXzCZ9ZD.js", "/assets/Thumbnail-ZPSd0K-a.js", "/assets/context-Bogj3_SU.js"], "css": [] }, "routes/app.bundles.new": { "id": "routes/app.bundles.new", "parentId": "routes/app", "path": "bundles/new", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.bundles.new-DdwudMf9.js", "imports": ["/assets/components-Dy2V4Mi5.js", "/assets/Page-BlUVaYsq.js", "/assets/TitleBar-CXzCZ9ZD.js", "/assets/Thumbnail-ZPSd0K-a.js", "/assets/context-Bogj3_SU.js"], "css": [] }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app._index-C0rddJLr.js", "imports": ["/assets/components-Dy2V4Mi5.js", "/assets/Page-BlUVaYsq.js", "/assets/TitleBar-CXzCZ9ZD.js", "/assets/context-Bogj3_SU.js"], "css": [] } }, "url": "/assets/manifest-1ff1410d.js", "version": "1ff1410d" };
const mode = "production";
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": true, "v3_singleFetch": false, "v3_lazyRouteDiscovery": true, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/webhooks.app.scopes_update": {
    id: "routes/webhooks.app.scopes_update",
    parentId: "root",
    path: "webhooks/app/scopes_update",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/webhooks.app.uninstalled": {
    id: "routes/webhooks.app.uninstalled",
    parentId: "root",
    path: "webhooks/app/uninstalled",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/storefront.bundles": {
    id: "routes/storefront.bundles",
    parentId: "root",
    path: "storefront/bundles",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route6
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/app.bundles.list": {
    id: "routes/app.bundles.list",
    parentId: "routes/app",
    path: "bundles/list",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/app.bundles.new": {
    id: "routes/app.bundles.new",
    parentId: "routes/app",
    path: "bundles/new",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route10
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
