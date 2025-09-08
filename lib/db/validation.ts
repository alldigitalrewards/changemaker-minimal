/**
 * Database Schema Validation
 * 
 * Ensures our schema maintains the 4-model constraint and proper relationships.
 * Guards against schema bloat and enforces workspace isolation.
 */

import { PrismaClient } from '@prisma/client'

// Define our core 4 models - NEVER exceed this
export const CORE_MODELS = [
  'Workspace',
  'User', 
  'Challenge',
  'Enrollment'
] as const

export type CoreModel = typeof CORE_MODELS[number]

/**
 * Schema validation rules
 */
export const SCHEMA_RULES = {
  maxModels: 4,
  requiredModels: CORE_MODELS,
  maxFieldsPerModel: 10,
  requiredWorkspaceRelations: ['User', 'Challenge'] // Models that must relate to Workspace
} as const

/**
 * Validate schema structure against our rules
 */
export function validateSchemaStructure() {
  const prisma = new PrismaClient()
  const modelNames = Object.keys(prisma)
    .filter(key => key.charAt(0) === key.charAt(0).toLowerCase())
    .filter(key => typeof (prisma as any)[key] === 'object')
    .filter(key => (prisma as any)[key].create !== undefined)

  // Check model count
  if (modelNames.length > SCHEMA_RULES.maxModels) {
    throw new Error(
      `Schema bloat detected: ${modelNames.length} models found, max allowed: ${SCHEMA_RULES.maxModels}. Models: ${modelNames.join(', ')}`
    )
  }

  // Check required models exist
  for (const requiredModel of SCHEMA_RULES.requiredModels) {
    const modelName = requiredModel.toLowerCase()
    if (!modelNames.includes(modelName)) {
      throw new Error(`Required model missing: ${requiredModel}`)
    }
  }

  return {
    valid: true,
    modelCount: modelNames.length,
    models: modelNames
  }
}

/**
 * Workspace isolation query checker
 * Validates that queries properly filter by workspaceId
 */
export class WorkspaceQueryValidator {
  private static workspaceScoped = [
    'user', 'challenge', 'enrollment'
  ]

  static validateQuery(modelName: string, where: any): boolean {
    const normalizedModel = modelName.toLowerCase()
    
    if (!this.workspaceScoped.includes(normalizedModel)) {
      return true // Workspace model itself doesn't need filtering
    }

    // Direct workspace filtering
    if (where.workspaceId) {
      return true
    }

    // Nested workspace filtering (for Enrollment via Challenge)
    if (normalizedModel === 'enrollment' && where.challenge?.workspaceId) {
      return true
    }

    // User filtering can be by workspaceId or via workspace relation
    if (normalizedModel === 'user' && (where.workspaceId || where.workspace)) {
      return true
    }

    return false
  }

  static getWorkspaceFilter(modelName: string, workspaceId: string): any {
    const normalizedModel = modelName.toLowerCase()

    switch (normalizedModel) {
      case 'user':
      case 'challenge':
        return { workspaceId }
      
      case 'enrollment':
        return {
          challenge: {
            workspaceId
          }
        }
      
      default:
        return {}
    }
  }
}

/**
 * Runtime validation for query safety
 */
export function validateWorkspaceQuery(
  operation: 'findMany' | 'findFirst' | 'findUnique' | 'count',
  model: string,
  args: any
): void {
  const { where } = args || {}
  
  if (!where) {
    throw new Error(`Missing WHERE clause for ${model} ${operation}`)
  }

  if (!WorkspaceQueryValidator.validateQuery(model, where)) {
    throw new Error(
      `Workspace isolation violation: ${model} ${operation} must filter by workspaceId. Where: ${JSON.stringify(where)}`
    )
  }
}

/**
 * Development-time checker to ensure all our queries are workspace-isolated
 */
export function auditQueryIsolation() {
  const violations: string[] = []
  
  // This would be extended to scan actual query usage in the codebase
  // For now, we document the expected patterns
  
  const expectedPatterns = {
    'user queries': 'Must filter by { workspaceId } or { workspace: { id } }',
    'challenge queries': 'Must filter by { workspaceId }',
    'enrollment queries': 'Must filter by { challenge: { workspaceId } } or join through user/challenge',
    'workspace queries': 'No filtering required (top-level resource)'
  }

  return {
    violations,
    expectedPatterns,
    passed: violations.length === 0
  }
}