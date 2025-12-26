// Turkish Lira formatting utilities

/**
 * Format a number as Turkish Lira currency
 * @param {number} amount - The amount to format
 * @param {boolean} showSymbol - Whether to show the ₺ symbol
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, showSymbol = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? "₺0,00" : "0,00";
  }

  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return showSymbol ? `₺${formatted}` : formatted;
};

/**
 * Parse a formatted currency string back to number
 * @param {string} value - The formatted currency string
 * @returns {number} The numeric value
 */
export const parseCurrency = (value) => {
  if (!value) return 0;
  
  // Remove currency symbol and spaces
  let cleaned = value.replace(/[₺\s]/g, "");
  
  // Replace Turkish decimal separator
  cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format number while typing (for input fields)
 * @param {string} value - The input value
 * @returns {string} Formatted value for display
 */
export const formatCurrencyInput = (value) => {
  if (!value) return "";
  
  // Remove non-numeric characters except comma
  let cleaned = value.replace(/[^\d,]/g, "");
  
  // Ensure only one comma
  const parts = cleaned.split(",");
  if (parts.length > 2) {
    cleaned = parts[0] + "," + parts.slice(1).join("");
  }
  
  // Limit decimal places to 2
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + "," + parts[1].slice(0, 2);
  }
  
  // Format the integer part with thousand separators
  if (parts[0].length > 0) {
    const intPart = parts[0].replace(/\./g, "");
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    cleaned = parts.length === 2 ? formatted + "," + parts[1] : formatted;
  }
  
  return cleaned;
};

/**
 * Format phone number as 0 (xxx) xxx xx xx
 * @param {string} value - The phone number input
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (value) => {
  if (!value) return "";
  
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");
  
  // Limit to 11 digits
  const limited = digits.slice(0, 11);
  
  // Format as 0 (xxx) xxx xx xx
  let formatted = "";
  
  if (limited.length > 0) {
    formatted = limited[0];
  }
  if (limited.length > 1) {
    formatted += " (" + limited.slice(1, 4);
  }
  if (limited.length > 4) {
    formatted += ") " + limited.slice(4, 7);
  }
  if (limited.length > 7) {
    formatted += " " + limited.slice(7, 9);
  }
  if (limited.length > 9) {
    formatted += " " + limited.slice(9, 11);
  }
  
  return formatted;
};

/**
 * Parse formatted phone number to digits only
 * @param {string} value - The formatted phone number
 * @returns {string} Digits only
 */
export const parsePhoneNumber = (value) => {
  if (!value) return "";
  return value.replace(/\D/g, "");
};

/**
 * Validate Turkish phone number
 * @param {string} value - The phone number (formatted or not)
 * @returns {boolean} Is valid
 */
export const isValidPhoneNumber = (value) => {
  const digits = parsePhoneNumber(value);
  return digits.length === 11 && digits.startsWith("0");
};

/**
 * Format tax number (Vergi Numarası)
 * @param {string} value - The tax number input
 * @returns {string} Formatted tax number
 */
export const formatTaxNumber = (value) => {
  if (!value) return "";
  
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");
  
  // Limit to 10 or 11 digits (VKN: 10, TCKN: 11)
  return digits.slice(0, 11);
};

/**
 * Validate Turkish Tax Number (VKN - 10 digits) or TC Identity (11 digits)
 * @param {string} value - The tax/identity number
 * @returns {boolean} Is valid
 */
export const isValidTaxNumber = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
};
