import { test, expect } from '@playwright/test';
import { loginWithCredentials, ADMIN_EMAIL, DEFAULT_PASSWORD } from '../support/auth';
import { prisma } from '../../../lib/prisma';

test.describe('Email Change Flow - End to End', () => {
  const NEW_EMAIL = `newemail_${Date.now()}@alldigitalrewards.com`;
  let originalEmail: string;

  test.beforeEach(async ({ page }) => {
    originalEmail = ADMIN_EMAIL;
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD);
  });

  test.afterEach(async () => {
    // Reset email if changed
    const user = await prisma.user.findUnique({ where: { email: originalEmail } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: originalEmail,
          emailChangePending: null
        }
      });
    }

    // Clean up new email user if created
    const newUser = await prisma.user.findUnique({ where: { email: NEW_EMAIL } });
    if (newUser && newUser.email !== originalEmail) {
      await prisma.user.delete({ where: { id: newUser.id } });
    }
  });

  test('Complete email change workflow - happy path', async ({ page }) => {
    // 1. Navigate to account settings
    await page.goto('/account');
    await expect(page.locator('h1')).toContainText('Account Settings');

    // 2. Find and click email change section
    const emailSection = page.locator('[data-testid="email-section"], section:has-text("Email")').first();
    await expect(emailSection).toBeVisible();

    // 3. Click "Change Email" button
    const changeEmailButton = page.locator('button:has-text("Change Email")').first();
    await changeEmailButton.click();

    // 4. Enter new email in modal/form
    await page.fill('input[name="newEmail"], input[placeholder*="new email"]', NEW_EMAIL);

    // 5. Submit change request
    const submitButton = page.locator('button[type="submit"]:has-text("Send"), button:has-text("Request Change")').first();
    await submitButton.click();

    // 6. Verify confirmation message
    await expect(page.locator('text=/verification email sent/i, text=/check your email/i').first()).toBeVisible({ timeout: 10000 });

    // 7. Get token from database (simulating email click)
    const user = await prisma.user.findUnique({
      where: { email: originalEmail },
      select: { emailChangePending: true }
    });

    expect(user?.emailChangePending).toBeTruthy();
    const pendingData = user?.emailChangePending as any;
    const token = pendingData.token;
    expect(token).toBeTruthy();

    // 8. Navigate to confirmation URL (simulate clicking email link)
    await page.goto(`/account/email/confirm?token=${token}`);

    // 9. Verify email was updated
    await expect(page.locator('text=/email.*updated/i, text=/success/i').first()).toBeVisible({ timeout: 10000 });

    // 10. Verify in database
    const updatedUser = await prisma.user.findUnique({
      where: { email: NEW_EMAIL }
    });

    expect(updatedUser).toBeTruthy();
    expect(updatedUser?.emailChangePending).toBeNull();

    // 11. Verify can login with new email
    await page.goto('/auth/logout');
    await page.waitForURL('/auth/login');

    await loginWithCredentials(page, NEW_EMAIL, DEFAULT_PASSWORD);
    await expect(page).toHaveURL('/workspaces');
  });

  test('Email change - cancel flow', async ({ page }) => {
    // 1. Navigate to account settings
    await page.goto('/account');

    // 2. Start email change
    const changeEmailButton = page.locator('button:has-text("Change Email")').first();
    await changeEmailButton.click();

    await page.fill('input[name="newEmail"], input[placeholder*="new email"]', NEW_EMAIL);

    const submitButton = page.locator('button[type="submit"]:has-text("Send"), button:has-text("Request Change")').first();
    await submitButton.click();

    // 3. Wait for confirmation
    await expect(page.locator('text=/verification email sent/i').first()).toBeVisible({ timeout: 10000 });

    // 4. Verify pending change in database
    const userBefore = await prisma.user.findUnique({
      where: { email: originalEmail },
      select: { emailChangePending: true }
    });
    expect(userBefore?.emailChangePending).toBeTruthy();

    // 5. Click cancel button
    const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Cancel Change")').first();

    // If cancel button exists on page, click it
    if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelButton.click();
      await expect(page.locator('text=/cancelled/i').first()).toBeVisible({ timeout: 5000 });
    } else {
      // Otherwise, call API directly
      await page.request.post('/api/account/email/cancel');
    }

    // 6. Verify pending change was cleared
    const userAfter = await prisma.user.findUnique({
      where: { email: originalEmail },
      select: { emailChangePending: true }
    });
    expect(userAfter?.emailChangePending).toBeNull();

    // 7. Verify original email still works
    await page.goto('/auth/logout');
    await loginWithCredentials(page, originalEmail, DEFAULT_PASSWORD);
    await expect(page).toHaveURL('/workspaces');
  });

  test('Email change - expired token handling', async ({ page }) => {
    // 1. Create expired token manually
    const user = await prisma.user.findUnique({ where: { email: originalEmail } });

    const expiredToken = `expired-token-${Date.now()}`;
    await prisma.user.update({
      where: { id: user!.id },
      data: {
        emailChangePending: {
          newEmail: NEW_EMAIL,
          token: expiredToken,
          expiresAt: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
        }
      }
    });

    // 2. Try to confirm with expired token
    await page.goto(`/account/email/confirm?token=${expiredToken}`);

    // 3. Verify error message
    await expect(page.locator('text=/expired/i, text=/invalid/i').first()).toBeVisible({ timeout: 10000 });

    // 4. Verify email was NOT changed
    const unchangedUser = await prisma.user.findUnique({
      where: { email: originalEmail }
    });
    expect(unchangedUser).toBeTruthy();

    const newEmailUser = await prisma.user.findUnique({
      where: { email: NEW_EMAIL }
    });
    expect(newEmailUser).toBeNull();
  });

  test('Email change - invalid token handling', async ({ page }) => {
    // Navigate with invalid token
    await page.goto('/account/email/confirm?token=invalid-token-xyz');

    // Verify error message
    await expect(page.locator('text=/invalid/i, text=/not found/i').first()).toBeVisible({ timeout: 10000 });

    // Verify email unchanged
    const user = await prisma.user.findUnique({
      where: { email: originalEmail }
    });
    expect(user).toBeTruthy();
  });

  test('Email change - duplicate email prevention', async ({ page }) => {
    // Create another user with target email
    const existingUser = await prisma.user.create({
      data: {
        email: NEW_EMAIL,
        role: 'PARTICIPANT',
        workspaceId: (await prisma.workspace.findFirst())?.id
      }
    });

    // Try to change to that email
    await page.goto('/account');

    const changeEmailButton = page.locator('button:has-text("Change Email")').first();
    await changeEmailButton.click();

    await page.fill('input[name="newEmail"], input[placeholder*="new email"]', NEW_EMAIL);

    const submitButton = page.locator('button[type="submit"]:has-text("Send"), button:has-text("Request Change")').first();
    await submitButton.click();

    // Verify error message
    await expect(page.locator('text=/already.*use/i, text=/exists/i').first()).toBeVisible({ timeout: 10000 });

    // Cleanup
    await prisma.user.delete({ where: { id: existingUser.id } });
  });

  test('Email change - UI shows pending state', async ({ page }) => {
    // Start email change
    await page.goto('/account');

    const changeEmailButton = page.locator('button:has-text("Change Email")').first();
    await changeEmailButton.click();

    await page.fill('input[name="newEmail"], input[placeholder*="new email"]', NEW_EMAIL);

    const submitButton = page.locator('button[type="submit"]:has-text("Send"), button:has-text("Request Change")').first();
    await submitButton.click();

    // Verify pending state shows on page
    await expect(page.locator('text=/pending/i, [data-testid="email-pending"]').first()).toBeVisible({ timeout: 10000 });

    // Verify new email is displayed in pending state
    await expect(page.locator(`text=${NEW_EMAIL}`)).toBeVisible();

    // Cleanup
    const user = await prisma.user.findUnique({ where: { email: originalEmail } });
    await prisma.user.update({
      where: { id: user!.id },
      data: { emailChangePending: null }
    });
  });
});
