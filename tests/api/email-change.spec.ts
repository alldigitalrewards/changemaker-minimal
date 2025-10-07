import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, DEFAULT_PASSWORD } from '../e2e/support/auth';
import { prisma } from '../../lib/prisma';

// Run tests serially to avoid race conditions with shared user state
test.describe.configure({ mode: 'serial' });

test.describe('Email Change API', () => {
  const WORKSPACE_SLUG = 'alldigitalrewards';
  const NEW_EMAIL = 'newemail@alldigitalrewards.com';

  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);
  });

  test.afterEach(async () => {
    // Clean up: Reset email if changed during test
    const user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: ADMIN_EMAIL,
          emailChangePending: null
        }
      });
    }

    // Clean up: Remove test email if created
    const testUser = await prisma.user.findUnique({ where: { email: NEW_EMAIL } });
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });

  test('POST /api/account/email/start-change - valid email change request', async ({ page }) => {
    const response = await page.request.post('/api/account/email/start-change', {
      headers: { 'Content-Type': 'application/json' },
      data: { newEmail: NEW_EMAIL }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toContain('verification email sent');

    // Verify token was stored in database
    const user = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { emailChangePending: true }
    });

    expect(user?.emailChangePending).toBeTruthy();
    const pendingData = user?.emailChangePending as any;
    expect(pendingData.newEmail).toBe(NEW_EMAIL);
    expect(pendingData.token).toBeTruthy();
    expect(pendingData.expiresAt).toBeTruthy();
  });

  test('POST /api/account/email/start-change - duplicate email validation', async ({ page }) => {
    // Try to change to an existing user's email
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { not: ADMIN_EMAIL }
      }
    });

    if (!existingUser) {
      test.skip('No other user found to test duplicate email');
      return;
    }

    const response = await page.request.post('/api/account/email/start-change', {
      headers: { 'Content-Type': 'application/json' },
      data: { newEmail: existingUser.email }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already in use');
  });

  test('POST /api/account/email/start-change - invalid email format', async ({ page }) => {
    const response = await page.request.post('/api/account/email/start-change', {
      headers: { 'Content-Type': 'application/json' },
      data: { newEmail: 'invalid-email' }
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/account/email/confirm - valid token confirmation', async ({ page }) => {
    // First, start an email change
    await page.request.post('/api/account/email/start-change', {
      headers: { 'Content-Type': 'application/json' },
      data: { newEmail: NEW_EMAIL }
    });

    // Get the token from database
    const user = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { emailChangePending: true }
    });
    const pendingData = user?.emailChangePending as any;
    const token = pendingData.token;

    // Confirm email change with valid token
    const response = await page.request.post('/api/account/email/confirm', {
      headers: { 'Content-Type': 'application/json' },
      data: { token }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toContain('successfully updated');

    // Verify email was changed in database
    const updatedUser = await prisma.user.findUnique({
      where: { email: NEW_EMAIL }
    });
    expect(updatedUser).toBeTruthy();
    expect(updatedUser?.emailChangePending).toBeNull();
  });

  test('POST /api/account/email/confirm - expired token handling', async ({ page }) => {
    // Create expired token manually
    const user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

    if (!user) {
      test.skip('User not found');
      return;
    }

    const expiredToken = 'expired-token-12345';
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailChangePending: {
          newEmail: NEW_EMAIL,
          token: expiredToken,
          expiresAt: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
        }
      }
    });

    const response = await page.request.post('/api/account/email/confirm', {
      headers: { 'Content-Type': 'application/json' },
      data: { token: expiredToken }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('expired');
  });

  test('POST /api/account/email/confirm - invalid token handling', async ({ page }) => {
    const response = await page.request.post('/api/account/email/confirm', {
      headers: { 'Content-Type': 'application/json' },
      data: { token: 'invalid-token-xyz' }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid');
  });

  test('POST /api/account/email/confirm - email uniqueness check', async ({ page }) => {
    // Start email change
    await page.request.post('/api/account/email/start-change', {
      headers: { 'Content-Type': 'application/json' },
      data: { newEmail: NEW_EMAIL }
    });

    // Get token
    const user = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { emailChangePending: true }
    });
    const pendingData = user?.emailChangePending as any;
    const token = pendingData.token;

    // Create another user with the target email
    await prisma.user.create({
      data: {
        email: NEW_EMAIL,
        role: 'PARTICIPANT',
        workspaceId: (await prisma.workspace.findFirst())?.id
      }
    });

    // Try to confirm - should fail due to duplicate
    const response = await page.request.post('/api/account/email/confirm', {
      headers: { 'Content-Type': 'application/json' },
      data: { token }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already in use');
  });

  test('POST /api/account/email/cancel - cancel pending change', async ({ page }) => {
    // Start email change
    await page.request.post('/api/account/email/start-change', {
      headers: { 'Content-Type': 'application/json' },
      data: { newEmail: NEW_EMAIL }
    });

    // Verify pending change exists
    const userBefore = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { emailChangePending: true }
    });
    expect(userBefore?.emailChangePending).toBeTruthy();

    // Cancel the change
    const response = await page.request.post('/api/account/email/cancel', {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toContain('cancelled');

    // Verify emailChangePending is cleared
    const userAfter = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { emailChangePending: true }
    });
    expect(userAfter?.emailChangePending).toBeNull();
  });

  test('POST /api/account/email/cancel - no pending change', async ({ page }) => {
    // Ensure no pending change
    const user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailChangePending: null }
      });
    }

    const response = await page.request.post('/api/account/email/cancel', {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('No pending');
  });
});
