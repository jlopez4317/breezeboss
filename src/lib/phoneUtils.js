// Format phone number to (XXX) XXX-XXXX format
export function formatPhoneNumber(value) {
  // Strip all non-numeric characters
  const cleaned = String(value).replace(/\D/g, '');
  
  // Limit to 10 digits
  const truncated = cleaned.slice(0, 10);
  
  // Format as (XXX) XXX-XXXX
  if (truncated.length === 0) return '';
  if (truncated.length <= 3) return `(${truncated}`;
  if (truncated.length <= 6) return `(${truncated.slice(0, 3)}) ${truncated.slice(3)}`;
  return `(${truncated.slice(0, 3)}) ${truncated.slice(3, 6)}-${truncated.slice(6)}`;
}

// Extract only digits from formatted phone number
export function getPhoneDigits(value) {
  return String(value).replace(/\D/g, '').slice(0, 10);
}