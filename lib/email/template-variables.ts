/**
 * Centralized Template Variables Configuration
 *
 * Defines all available variables that can be used in email templates.
 * This ensures consistency between:
 * - AI generation prompts
 * - Template validation
 * - Test email sample data
 * - UI variable hints
 */

export interface TemplateVariable {
  /** Variable name as used in templates (without braces) */
  name: string
  /** Human-readable description for AI and users */
  description: string
  /** Template types where this variable is commonly used */
  templateTypes?: string[]
  /** Sample value for testing */
  sampleValue: string
}

/**
 * Complete list of all available template variables
 */
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Recipient information
  {
    name: 'recipientName',
    description: 'Name of the email recipient',
    sampleValue: 'John Smith',
  },

  // Workspace information
  {
    name: 'workspaceName',
    description: 'Name of the workspace',
    sampleValue: 'AllDigitalRewards Team',
  },
  {
    name: 'workspaceUrl',
    description: 'URL to the workspace homepage',
    sampleValue: 'http://localhost:3000/w/alldigitalrewards',
  },

  // Action URLs
  {
    name: 'actionUrl',
    description: 'Primary call-to-action URL',
    sampleValue: 'http://localhost:3000/w/alldigitalrewards',
  },
  {
    name: 'inviteUrl',
    description: 'Invitation acceptance URL',
    templateTypes: ['INVITE'],
    sampleValue: 'http://localhost:3000/w/alldigitalrewards/invites/test',
  },
  {
    name: 'challengeUrl',
    description: 'URL to a specific challenge',
    templateTypes: ['ENROLLMENT_UPDATE', 'REMINDER'],
    sampleValue: 'http://localhost:3000/w/alldigitalrewards/challenges/sample-challenge',
  },

  // User/sender information
  {
    name: 'inviterName',
    description: 'Name of the person sending the invitation',
    templateTypes: ['INVITE'],
    sampleValue: 'Admin User',
  },
  {
    name: 'senderName',
    description: 'Name of the email sender',
    sampleValue: 'Changemaker Team',
  },

  // Challenge information
  {
    name: 'challenge.title',
    description: 'Title of the challenge',
    templateTypes: ['ENROLLMENT_UPDATE', 'REMINDER'],
    sampleValue: 'Sample Challenge',
  },
  {
    name: 'challenge.description',
    description: 'Description of the challenge',
    templateTypes: ['ENROLLMENT_UPDATE', 'REMINDER'],
    sampleValue: 'Complete this challenge to earn rewards and recognition!',
  },

  // Time-related
  {
    name: 'expirationDays',
    description: 'Number of days until expiration',
    templateTypes: ['INVITE'],
    sampleValue: '7',
  },
  {
    name: 'expirationDate',
    description: 'Expiration date (formatted)',
    templateTypes: ['INVITE', 'REMINDER'],
    sampleValue: 'December 31, 2025',
  },
  {
    name: 'currentYear',
    description: 'Current year (for copyright notices)',
    sampleValue: new Date().getFullYear().toString(),
  },
  {
    name: 'year',
    description: 'Alias for currentYear',
    sampleValue: new Date().getFullYear().toString(),
  },

  // Contact information
  {
    name: 'supportEmail',
    description: 'Support/reply-to email address',
    sampleValue: 'team@changemaker.im',
  },
  {
    name: 'replyToEmail',
    description: 'Reply-to email address',
    sampleValue: 'team@changemaker.im',
  },
]

/**
 * Get all variable names formatted for template usage (with double braces)
 */
export function getVariableNames(): string[] {
  return TEMPLATE_VARIABLES.map(v => `{{${v.name}}}`)
}

/**
 * Get variables filtered by template type
 */
export function getVariablesForTemplate(templateType: string): TemplateVariable[] {
  return TEMPLATE_VARIABLES.filter(
    v => !v.templateTypes || v.templateTypes.includes(templateType)
  )
}

/**
 * Generate sample data object for template testing
 */
export function getSampleData(overrides?: Record<string, string>): Record<string, string> {
  const data: Record<string, string> = {}

  TEMPLATE_VARIABLES.forEach(v => {
    data[v.name] = v.sampleValue
  })

  // Apply any overrides
  if (overrides) {
    Object.assign(data, overrides)
  }

  return data
}

/**
 * Extract all variable names from an HTML template
 */
export function extractVariablesFromTemplate(html: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const matches = html.matchAll(regex)
  const variables = new Set<string>()

  for (const match of matches) {
    variables.add(match[1])
  }

  return Array.from(variables)
}

/**
 * Validate that a template only uses defined variables
 */
export function validateTemplate(html: string): {
  valid: boolean
  undefinedVariables: string[]
  warnings: string[]
} {
  const usedVariables = extractVariablesFromTemplate(html)
  const definedVariables = TEMPLATE_VARIABLES.map(v => v.name)

  const undefinedVariables = usedVariables.filter(
    v => !definedVariables.includes(v)
  )

  const warnings: string[] = []
  if (undefinedVariables.length > 0) {
    warnings.push(
      `Template uses undefined variables: ${undefinedVariables.map(v => `{{${v}}}`).join(', ')}`
    )
  }

  return {
    valid: undefinedVariables.length === 0,
    undefinedVariables,
    warnings,
  }
}

/**
 * Replace template variables with sample data
 */
export function replaceVariables(
  template: string,
  data?: Record<string, string>
): string {
  const sampleData = getSampleData(data)
  let result = template

  Object.entries(sampleData).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value)
  })

  return result
}
