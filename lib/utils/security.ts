/**
 * SECURITY UTILITIES
 * ===================
 *
 * HTML sanitization and input validation for preventing XSS attacks.
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * Converts: < > & " ' into their HTML entity equivalents
 *
 * @param text Potentially unsafe user input
 * @returns HTML-safe escaped string
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char)
}

/**
 * Sanitize a full name by escaping HTML and trimming whitespace
 * @param firstName User's first name
 * @param lastName User's last name
 * @returns Escaped full name or empty string
 */
export function sanitizeFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  const first = escapeHtml(firstName)
  const last = escapeHtml(lastName)
  return `${first} ${last}`.trim()
}

/**
 * Sanitize display name by escaping HTML
 * @param displayName User's display name
 * @returns Escaped display name or empty string
 */
export function sanitizeDisplayName(
  displayName: string | null | undefined
): string {
  return escapeHtml(displayName)
}
