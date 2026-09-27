// Organization logo validation and storage service (infrastructure layer).

import { AppError } from "@/shared/error/app-error";
import {
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_SIZE_BYTES,
} from "../../domain/constants/organization-constants";

export interface LogoStorageService {
  processAndStoreLogo(dataUrl: string): Promise<string>;
}

/**
 * Validates base64 data URL header and payload size.
 * Rejects SVGs, executables, and payloads exceeding MAX_LOGO_SIZE_BYTES.
 */
export const defaultLogoStorageService: LogoStorageService = {
  processAndStoreLogo: async (dataUrl: string): Promise<string> => {
    if (!dataUrl || typeof dataUrl !== "string") {
      throw new AppError("VALIDATION_ERROR", { message: "Invalid image data." });
    }

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new AppError("VALIDATION_ERROR", {
        message: "Image must be a valid base64 data URL.",
      });
    }

    const [, mimeType, base64Data] = match;

    if (!ALLOWED_LOGO_MIME_TYPES.includes(mimeType as (typeof ALLOWED_LOGO_MIME_TYPES)[number])) {
      throw new AppError("VALIDATION_ERROR", {
        message: "Only PNG, JPEG, and WebP images are permitted for organization logos.",
      });
    }

    // Estimate decoded buffer size: (base64.length * 3) / 4
    const approximateSize = (base64Data.length * 3) / 4;
    if (approximateSize > MAX_LOGO_SIZE_BYTES) {
      throw new AppError("VALIDATION_ERROR", {
        message: "Logo file size cannot exceed 2 MB.",
      });
    }

    // Return the validated data URL
    return dataUrl;
  },
};
