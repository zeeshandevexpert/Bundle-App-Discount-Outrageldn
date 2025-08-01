import { z } from "zod";

export const BundleSchema = z.object({
  bundleName: z.string().min(1, "Bundle name is required").max(100, "Bundle name must be less than 100 characters"),
  displayText: z.string().min(1, "Display text is required").max(100, "Display text must be less than 100 characters"),
  offer: z.string().regex(/^\d+(\.\d+)?$/, "Offer must be a valid number").transform(val => parseFloat(val)),
  showComparisonPrice: z.enum(["true", "false"]).transform(val => val === "true"),
  directToCheckout: z.enum(["true", "false"]).transform(val => val === "true"),
  bundleImage: z.string().optional(), // Add bundle image field
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
  ),
});

export type BundleFormData = z.infer<typeof BundleSchema>;

export type ValidationErrors = {
  [key in keyof z.infer<typeof BundleSchema>]?: string;
} & {
  assignedProducts?: string; // Add assignedProducts field for validation
  message?: string; // Add general message field
};

export function validateBundleForm(formData: FormData): {
  data?: BundleFormData;
  errors?: ValidationErrors;
} {
  const rawData = {
    bundleName: formData.get("bundleName"),
    displayText: formData.get("displayText"),
    offer: formData.get("offer"),
    showComparisonPrice: formData.get("showComparisonPrice") || "false",
    directToCheckout: formData.get("directToCheckout") || "false",
    bundleImage: formData.get("bundleImage") || "", // Add bundle image
    selectedProducts: formData.get("selectedProducts"),
    assignedProducts: formData.get("assignedProducts"),

  };

  try {
    const validatedData = BundleSchema.parse(rawData);
    return { data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationErrors = {};
      error.errors.forEach((err) => {
        const path = err.path[0] as keyof ValidationErrors;
        errors[path] = err.message;
      });
      return { errors };
    }
    return { errors: { bundleName: "An unknown error occurred" } };
  }
}