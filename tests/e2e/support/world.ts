import { setWorldConstructor } from '@cucumber/cucumber';
import { chromium, Browser, BrowserContext, Page, expect } from '@playwright/test';

export class CustomWorld {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  baseURL: string;
  lastWorkspaceSlug?: string;
  lastSubmissionId?: string;

  constructor() {
    this.baseURL = process.env.BASE_URL || 'http://localhost:3000';
  }
}

setWorldConstructor(CustomWorld);


