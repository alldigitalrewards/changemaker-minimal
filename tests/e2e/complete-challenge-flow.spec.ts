import { test, expect } from '@playwright/test';

test.describe('Complete Challenge Flow', () => {
  test('admin creates challenge, participants submit activities, admin approves submissions', async ({ page }) => {
    // Admin Sign In
    await page.goto('/');
    await page.getByRole('navigation').getByRole('link', { name: 'Sign In' }).click();
    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill('krobinson@alldigitalrewards.com');
    await page.getByRole('textbox', { name: 'Email' }).press('Tab');
    await page.getByRole('textbox', { name: 'Password' }).fill('Changemaker2025!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Navigate to Dashboard and Challenges
    await page.getByRole('link', { name: 'Go to Dashboard' }).getByRole('button').click();
    await page.getByRole('link', { name: 'Challenges', exact: true }).click();
    
    // Create Challenge
    await page.getByRole('button', { name: 'Create Challenge' }).click();
    await page.getByRole('textbox', { name: 'Challenge Title *' }).click();
    await page.getByRole('textbox', { name: 'Challenge Title *' }).fill('Insert test CHallenge Title Here');
    await page.getByRole('textbox', { name: 'Challenge Description *' }).click();
    await page.getByRole('textbox', { name: 'Challenge Description *' }).fill('Insert Test Description Here');
    await page.getByRole('textbox', { name: 'Start Date *' }).fill('2025-09-10');
    await page.getByRole('textbox', { name: 'End Date *' }).fill('2025-10-01');
    
    // Add Reviewers
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'john.doe@alldigitalrewards.' }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'sarah.jones@alldigitalrewards' }).click();
    
    // Add Enrolled Participants
    await page.getByRole('tab', { name: 'Enrolled (0)' }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'lisa.taylor@alldigitalrewards' }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'mike.chen@alldigitalrewards.' }).click();
    
    // Create Challenge
    await page.getByRole('button', { name: 'Create Challenge' }).click();
    
    // Add Activity to Challenge
    await page.getByRole('tab', { name: 'Activities' }).click();
    await page.getByRole('button', { name: 'Assign Your First Activity' }).click();
    await page.getByText('TestText10 ptsTEst').nth(1).click();
    await page.locator('div').filter({ hasText: /^Select Activity TemplateTestFile10 ptstTestText10 ptsTEstCancelAssign Activity$/ }).locator('button').nth(1).click();
    await page.locator('#required').nth(1).click();
    await page.getByText('Assign Activity', { exact: true }).nth(2).click();
    
    // Admin Sign Out
    await page.getByRole('button', { name: 'K krobinson krobinson@' }).click();
    await page.getByRole('button', { name: 'Sign Out' }).click();
    
    // Participant 1 (Mike Chen) Sign In and Submit Activity
    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill('mike.chen@alldigitalrewards.com');
    await page.getByRole('textbox', { name: 'Email' }).press('Tab');
    await page.getByRole('textbox', { name: 'Password' }).fill('Changemaker2025!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Navigate to Challenge and Submit Activity
    await page.getByRole('link', { name: 'Go to Dashboard' }).getByRole('button').click();
    await page.locator('div:nth-child(7) > .p-4 > .flex.items-start > .flex-1 > .inline-flex.items-center.text-sm').click();
    await page.getByRole('tab', { name: 'Activities' }).click();
    await page.getByRole('button', { name: 'Submit Activity' }).click();
    await page.getByRole('textbox', { name: 'Enter your submission content' }).click();
    await page.getByRole('textbox', { name: 'Enter your submission content' }).fill('Insert test submission here');
    await page.getByRole('button', { name: 'Submit Activity' }).click();
    
    // View Submissions
    await page.getByRole('button', { name: 'View Submissions (1)' }).click();
    
    // Mike Sign Out
    await page.getByRole('button', { name: 'M mike.chen mike.chen@' }).click();
    await page.getByRole('button', { name: 'Sign Out' }).click();
    
    // Participant 2 (Lisa Taylor) Sign In and Submit Activity
    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill('lisa.taylor@alldigitalrewards.com');
    await page.getByRole('textbox', { name: 'Email' }).press('Tab');
    await page.getByRole('textbox', { name: 'Password' }).fill('Changemaker2025!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Navigate to Challenge
    await page.getByRole('link', { name: 'Go to Dashboard' }).getByRole('button').click();
    await page.locator('div:nth-child(6) > .p-4 > .flex.items-start > .flex-1 > .inline-flex.items-center.text-sm').click();
    await page.getByRole('button', { name: 'Check Progress' }).click();
    
    // Submit Activity
    await page.getByRole('tab', { name: 'Activities' }).click();
    await page.getByRole('button', { name: 'Submit Activity' }).click();
    await page.getByRole('textbox', { name: 'Enter your submission content' }).click();
    await page.getByRole('textbox', { name: 'Enter your submission content' }).fill('I have submitted my activity');
    await page.getByRole('button', { name: 'Submit Activity' }).click();
    
    // Lisa Sign Out
    await page.getByRole('button', { name: 'L lisa.taylor lisa.taylor@' }).click();
    await page.getByRole('button', { name: 'Sign Out' }).click();
    
    // Admin Sign Back In to Review Submissions
    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill('krobinson@alldigitalrewards.com');
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('Changemaker2025!');
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Navigate to Challenge Submissions
    await page.getByRole('link', { name: 'Go to Dashboard' }).getByRole('button').click();
    await page.getByRole('link', { name: 'Challenges', exact: true }).click();
    await page.getByText('Insert test CHallenge Title HereInsert Test Description Here4').click();
    await page.getByRole('tab', { name: 'Submissions' }).click();
    
    // Approve Lisa's Submission
    await page.getByRole('button', { name: 'Approve' }).first().click();
    await page.getByRole('textbox', { name: 'Add any feedback or comments' }).click();
    await page.getByRole('textbox', { name: 'Add any feedback or comments' }).fill('Good Job Lisa!');
    await page.getByRole('button', { name: 'Approve & Award Points' }).click();
    
    // Approve Mike's Submission
    await page.getByRole('button', { name: 'Approve' }).click();
    await page.getByRole('textbox', { name: 'Add any feedback or comments' }).click();
    await page.getByRole('textbox', { name: 'Add any feedback or comments' }).fill('Good job Mike!');
    await page.getByRole('button', { name: 'Approve & Award Points' }).click();
    
    // Admin Sign Out
    await page.getByRole('button', { name: 'K krobinson krobinson@' }).click();
    await page.getByRole('button', { name: 'Sign Out' }).click();
    
    // Participant Verification - Mike Checks Activities
    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill('mike.chen@alldigitalrewards.com');
    await page.getByRole('textbox', { name: 'Email' }).press('Tab');
    await page.getByRole('textbox', { name: 'Password' }).fill('Changemaker2025!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Check My Activities and Points
    await page.getByRole('link', { name: 'Go to Dashboard' }).getByRole('button').click();
    await page.getByRole('link', { name: 'My Activities' }).click();
    await page.getByText('points earned!').click();
    await page.getByText('Good job Mike!').click();
    await page.getByRole('tab', { name: 'Approved' }).click();
    
    // Check Leaderboard
    await page.getByRole('link', { name: 'Leaderboard' }).click();
    await page.getByText('lisa.taylor').first().click();
    await page.getByText('10pts').first().click();
    await page.getByText('mike.chenYou').first().click();
    await page.getByText('10pts').nth(1).click();
    
    // Verify test completion
    await expect(page.getByText('10pts')).toBeVisible();
  });
});