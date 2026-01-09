/**
 * ISBN validation and utility functions
 */

/**
 * Remove hyphens and spaces from ISBN
 */
export function normalizeISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, '');
}

/**
 * Validate ISBN-13 format (EAN-13 barcode)
 * ISBN-13 starts with 978 or 979
 */
export function isValidISBN13(isbn: string): boolean {
  const cleaned = normalizeISBN(isbn);
  return /^(978|979)\d{10}$/.test(cleaned);
}

/**
 * Validate ISBN-10 format
 */
export function isValidISBN10(isbn: string): boolean {
  const cleaned = normalizeISBN(isbn);
  return /^\d{9}[\dXx]$/.test(cleaned);
}

/**
 * Check if barcode is a valid ISBN (either ISBN-10 or ISBN-13)
 */
export function isValidISBN(isbn: string): boolean {
  return isValidISBN13(isbn) || isValidISBN10(isbn);
}

/**
 * Check if barcode type is an ISBN barcode type
 * EAN-13 (type 32 in expo-camera) is used for ISBN-13
 */
export function isISBNBarcodeType(type: string): boolean {
  // expo-camera barcode types for ISBN
  // 'ean13' or 'org.gs1.EAN-13' for EAN-13 barcodes
  const isbnTypes = ['ean13', 'ean-13', 'org.gs1.ean-13', 'org.gs1.EAN-13'];
  return isbnTypes.some(t => type.toLowerCase().includes(t.toLowerCase()));
}
