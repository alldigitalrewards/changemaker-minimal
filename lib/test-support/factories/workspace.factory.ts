/**
 * Workspace Factory
 *
 * Creates workspaces with consistent, deterministic data
 * Used across seed scripts and test fixtures
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

export interface WorkspaceData {
  id?: string;
  slug: string;
  name: string;
  tenantId?: string;
}

export interface WorkspaceFactoryOptions {
  prisma?: PrismaClient;
}

/**
 * Default workspace configurations
 * These match production and staging environments
 */
export const DEFAULT_WORKSPACES: WorkspaceData[] = [
  {
    slug: "acme",
    name: "ACME Corporation",
  },
  {
    slug: "alldigitalrewards",
    name: "AllDigitalRewards",
  },
  {
    slug: "sharecare",
    name: "Sharecare",
  },
];

/**
 * Create a single workspace
 *
 * @param data - Workspace data
 * @param options - Factory options
 * @returns Created workspace
 */
export async function createWorkspace(
  data: WorkspaceData,
  options: WorkspaceFactoryOptions = {},
) {
  const prisma = options.prisma || (await import("../../prisma")).prisma;

  const workspaceData = {
    id: data.id || randomUUID(),
    slug: data.slug,
    name: data.name,
    tenantId: data.tenantId || data.slug, // Default: slug as tenantId
  };

  return await prisma.workspace.create({
    data: workspaceData,
  });
}

/**
 * Create multiple workspaces
 * More efficient than calling createWorkspace multiple times
 *
 * @param workspaces - Array of workspace data
 * @param options - Factory options
 * @returns Array of created workspaces
 */
export async function createWorkspaces(
  workspaces: WorkspaceData[],
  options: WorkspaceFactoryOptions = {},
) {
  const prisma = options.prisma || (await import("../../prisma")).prisma;

  const results = [];
  for (const workspace of workspaces) {
    const created = await createWorkspace(workspace, { prisma });
    results.push(created);
  }

  return results;
}

/**
 * Upsert a workspace (create or update)
 * Useful for idempotent seeds
 *
 * @param data - Workspace data
 * @param options - Factory options
 * @returns Upserted workspace
 */
export async function upsertWorkspace(
  data: WorkspaceData,
  options: WorkspaceFactoryOptions = {},
) {
  const prisma = options.prisma || (await import("../../prisma")).prisma;

  return await prisma.workspace.upsert({
    where: { slug: data.slug },
    update: {
      name: data.name,
      tenantId: data.tenantId || data.slug,
    },
    create: {
      id: data.id || randomUUID(),
      slug: data.slug,
      name: data.name,
      tenantId: data.tenantId || data.slug,
    },
  });
}

/**
 * Upsert multiple workspaces
 *
 * @param workspaces - Array of workspace data
 * @param options - Factory options
 * @returns Array of upserted workspaces
 */
export async function upsertWorkspaces(
  workspaces: WorkspaceData[],
  options: WorkspaceFactoryOptions = {},
) {
  const prisma = options.prisma || (await import("../../prisma")).prisma;

  const results = [];
  for (const workspace of workspaces) {
    const upserted = await upsertWorkspace(workspace, { prisma });
    results.push(upserted);
  }

  return results;
}
