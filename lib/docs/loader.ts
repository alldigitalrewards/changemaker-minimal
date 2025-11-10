import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { compile } from '@mdx-js/mdx';
import readingTime from 'reading-time';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import type { Role } from '@prisma/client';

export interface DocFrontmatter {
  title: string;
  description?: string;
  roles?: Role[];
  tags?: string[];
  author?: string;
  date?: string;
  order?: number;
  [key: string]: any;
}

export interface DocMetadata {
  slug: string;
  slugs: string[];
  frontmatter: DocFrontmatter;
  readingTime: string;
  wordCount: number;
  content: string;
  compiledSource: string;
}

export interface TableOfContentsItem {
  title: string;
  slug: string;
  level: number;
}

/**
 * Load and parse a single MDX file
 */
export async function loadMDXFile(
  filePath: string,
  contentDir: string,
  baseUrl: string = ''
): Promise<DocMetadata> {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content } = matter(fileContent);

  // Calculate reading time
  const stats = readingTime(content);

  // Generate slug from file path relative to content directory
  const relativePath = path.relative(contentDir, filePath);
  let slug = relativePath
    .replace(/\.mdx?$/, '')
    .replace(/\/index$/, '')
    .replace(/\\/g, '/');

  // If the slug is just "index", treat it as root (empty string)
  if (slug === 'index') {
    slug = '';
  }

  const slugs = slug.split('/').filter(Boolean);

  // Compile MDX
  const compiled = await compile(content, {
    outputFormat: 'function-body',
    development: process.env.NODE_ENV === 'development',
    rehypePlugins: [rehypeHighlight, rehypeSlug],
    remarkPlugins: [remarkGfm],
  });

  return {
    slug,
    slugs,
    frontmatter: frontmatter as DocFrontmatter,
    readingTime: stats.text,
    wordCount: stats.words,
    content,
    compiledSource: String(compiled),
  };
}

/**
 * Load all MDX files from a directory
 */
export async function loadMDXFiles(
  contentDir: string,
  baseUrl: string = ''
): Promise<DocMetadata[]> {
  const files = getAllMDXFiles(contentDir);
  const docs = await Promise.all(
    files.map((file) => loadMDXFile(file, contentDir, baseUrl))
  );

  return docs.sort((a, b) => {
    // Sort by frontmatter order if available, otherwise alphabetically
    const orderA = a.frontmatter.order ?? 999;
    const orderB = b.frontmatter.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.slug.localeCompare(b.slug);
  });
}

/**
 * Get all MDX files recursively from a directory
 */
function getAllMDXFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      getAllMDXFiles(fullPath, files);
    } else if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Get a specific doc by slug
 */
export async function getDocBySlug(
  contentDir: string,
  slug: string[]
): Promise<DocMetadata | null> {
  const docs = await loadMDXFiles(contentDir);
  const slugPath = slug.join('/');

  return (
    docs.find((doc) => doc.slug === slugPath) ||
    docs.find((doc) => doc.slug === `${slugPath}/index`) ||
    null
  );
}

/**
 * Generate table of contents from markdown headings
 */
export function generateTableOfContents(content: string): TableOfContentsItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const toc: TableOfContentsItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const title = match[2].trim();
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    toc.push({ title, slug, level });
  }

  return toc;
}

/**
 * Build navigation tree from docs
 */
export interface NavItem {
  title: string;
  slug: string;
  children?: NavItem[];
}

export function buildNavigationTree(docs: DocMetadata[]): NavItem[] {
  const tree: NavItem[] = [];
  const map = new Map<string, NavItem>();

  // Create nav items
  for (const doc of docs) {
    const item: NavItem = {
      title: doc.frontmatter.title,
      slug: doc.slug,
    };
    map.set(doc.slug, item);
  }

  // Build tree structure
  for (const doc of docs) {
    const item = map.get(doc.slug)!;
    const parentSlug = doc.slugs.slice(0, -1).join('/');

    if (parentSlug && map.has(parentSlug)) {
      const parent = map.get(parentSlug)!;
      if (!parent.children) parent.children = [];
      parent.children.push(item);
    } else {
      tree.push(item);
    }
  }

  return tree;
}
