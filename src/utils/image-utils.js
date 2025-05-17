// Utilities for universal image handling and validation
import sharp from 'sharp';
import fetch from 'node-fetch';

export async function detectImageDimensionsFromBuffer(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return { width: metadata.width, height: metadata.height };
  } catch {
    return { width: 0, height: 0 };
  }
}

export async function detectImageDimensionsFromUrl(url) {
  // Fallback: download minimal bytes and check dimensions
  const response = await fetch(url);
  const buffer = await response.buffer();
  return detectImageDimensionsFromBuffer(buffer);
}

export function validateImageMeetsCriteria({ width, height }, criteria) {
  if ((criteria.minWidth && width < criteria.minWidth) || (criteria.minHeight && height < criteria.minHeight)) {
    return false;
  }
  return true;
}
