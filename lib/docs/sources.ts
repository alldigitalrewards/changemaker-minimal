import path from 'path';
import { type Role } from '@prisma/client';
import {
  loadMDXFiles,
  getDocBySlug,
  buildNavigationTree,
  type DocMetadata,
  type NavItem,
} from './loader';

// Content directory paths
const CONTENT_DIR = path.join(process.cwd(), 'content');
const PUBLIC_DOCS_DIR = path.join(CONTENT_DIR, 'docs');
const WORKSPACE_DOCS_DIR = path.join(CONTENT_DIR, 'workspace-docs');

/**
 * Public documentation source
 */
export class PublicDocsSource {
  private docs: DocMetadata[] | null = null;

  async getDocs(): Promise<DocMetadata[]> {
    if (!this.docs) {
      this.docs = await loadMDXFiles(PUBLIC_DOCS_DIR, '/docs');
    }
    return this.docs;
  }

  async getDoc(slug: string[]): Promise<DocMetadata | null> {
    return getDocBySlug(PUBLIC_DOCS_DIR, slug);
  }

  async getNavigation(): Promise<NavItem[]> {
    const docs = await this.getDocs();
    return buildNavigationTree(docs);
  }

  /**
   * Get all unique tags from docs
   */
  async getTags(): Promise<string[]> {
    const docs = await this.getDocs();
    const tagsSet = new Set<string>();

    docs.forEach((doc) => {
      doc.frontmatter.tags?.forEach((tag) => tagsSet.add(tag));
    });

    return Array.from(tagsSet).sort();
  }

  /**
   * Search docs by query
   */
  async search(query: string): Promise<DocMetadata[]> {
    const docs = await this.getDocs();
    const lowerQuery = query.toLowerCase();

    return docs.filter((doc) => {
      const titleMatch = doc.frontmatter.title
        .toLowerCase()
        .includes(lowerQuery);
      const descMatch = doc.frontmatter.description
        ?.toLowerCase()
        .includes(lowerQuery);
      const contentMatch = doc.content.toLowerCase().includes(lowerQuery);

      return titleMatch || descMatch || contentMatch;
    });
  }
}

/**
 * Workspace documentation source with role filtering
 */
export class WorkspaceDocsSource {
  private docs: DocMetadata[] | null = null;

  async getDocs(userRole?: Role): Promise<DocMetadata[]> {
    if (!this.docs) {
      this.docs = await loadMDXFiles(WORKSPACE_DOCS_DIR, '/w/[slug]/docs');
    }

    // Filter by role if provided
    if (userRole) {
      return this.docs.filter((doc) => {
        const allowedRoles = doc.frontmatter.roles;
        // If no roles specified, allow all
        if (!allowedRoles || allowedRoles.length === 0) return true;
        // Check if user role is in allowed roles
        return allowedRoles.includes(userRole);
      });
    }

    return this.docs;
  }

  async getDoc(
    slug: string[],
    userRole?: Role
  ): Promise<DocMetadata | null> {
    const doc = await getDocBySlug(WORKSPACE_DOCS_DIR, slug);

    if (!doc) return null;

    // Check role access if role provided
    if (userRole) {
      const allowedRoles = doc.frontmatter.roles;
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(userRole)) {
          return null; // Not authorized
        }
      }
    }

    return doc;
  }

  async getNavigation(userRole?: Role): Promise<NavItem[]> {
    const docs = await this.getDocs(userRole);
    return buildNavigationTree(docs);
  }

  /**
   * Get docs by role
   */
  async getAdminDocs(): Promise<DocMetadata[]> {
    return this.getDocs('ADMIN');
  }

  async getParticipantDocs(): Promise<DocMetadata[]> {
    return this.getDocs('PARTICIPANT');
  }

  /**
   * Search workspace docs with role filtering
   */
  async search(query: string, userRole?: Role): Promise<DocMetadata[]> {
    const docs = await this.getDocs(userRole);
    const lowerQuery = query.toLowerCase();

    return docs.filter((doc) => {
      const titleMatch = doc.frontmatter.title
        .toLowerCase()
        .includes(lowerQuery);
      const descMatch = doc.frontmatter.description
        ?.toLowerCase()
        .includes(lowerQuery);
      const contentMatch = doc.content.toLowerCase().includes(lowerQuery);

      return titleMatch || descMatch || contentMatch;
    });
  }
}

// Singleton instances
export const publicDocs = new PublicDocsSource();
export const workspaceDocs = new WorkspaceDocsSource();
