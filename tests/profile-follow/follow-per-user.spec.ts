// spec: Profile follow
// seed: tests/seed.spec.ts

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const PASSWORD = 'Password123'; // API.md: at least 8 characters

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

type TestUser = { username: string; email: string; token: string };

// Users made by the current test. test.afterEach cleans up their follows, even when a check fails.
let createdUsers: TestUser[] = [];

// API.md: POST /api/users -> 201 User, with a token.
async function signUp(request: APIRequestContext, prefix: string): Promise<TestUser> {
  const username = uniqueName(prefix);
  const email = `${username}@example.com`;
  const response = await request.post('/api/users', {
    data: { user: { username, email, password: PASSWORD } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  const user = { username, email, token: json.user.token as string };
  createdUsers.push(user);
  return user;
}

// Cleanup: each test user stops following practice-author.
// API.md has no request to delete a user, so the users themselves stay.
test.afterEach(async ({ request }) => {
  const users = createdUsers;
  createdUsers = [];
  for (const user of users) {
    // API.md: DELETE /api/profiles/:username/follow -> 200 Profile.
    const response = await request.delete('/api/profiles/practice-author/follow', {
      headers: { Authorization: `Token ${user.token}` },
    });
    expect.soft(response.status()).toBe(200);
  }
});

async function signIn(page: Page, user: TestUser) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Signed in: the Settings link appears in the main navigation.
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
}

async function signOut(page: Page) {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Or click here to logout.' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
}

test.describe('Profile follow', () => {
  test('Follow state belongs to the signed-in user', async ({ page, request }) => {
    const reader = await signUp(request, 'qa-reader');
    const editor = await signUp(request, 'qa-editor');

    const followButton = page.getByRole('button', { name: 'Follow practice-author', exact: true });
    const unfollowButton = page.getByRole('button', { name: 'Unfollow practice-author', exact: true });

    // 1. Sign in as the reader, open /profile/practice-author, make sure the button is "Unfollow practice-author"
    await signIn(page, reader);
    await page.goto('/profile/practice-author');
    await expect(followButton.or(unfollowButton)).toBeVisible();
    if (await followButton.isVisible()) {
      await followButton.click();
    }
    await expect(unfollowButton).toBeVisible();
    await expect(followButton).toHaveCount(0);

    // 2. Sign out, sign in as the editor, open /profile/practice-author. Note which button shows.
    await signOut(page);
    await signIn(page, editor);
    await page.goto('/profile/practice-author');
    // The reader's follow must not leak to the editor
    await expect(followButton).toBeVisible();
    await expect(unfollowButton).toHaveCount(0);

    // 3. As the editor, click "Follow practice-author", then reload.
    await followButton.click();
    await expect(unfollowButton).toBeVisible();
    await expect(followButton).toHaveCount(0);
    await page.reload();
    await expect(unfollowButton).toBeVisible();
    await expect(followButton).toHaveCount(0);

    // 4. Sign out, sign in again as the reader, open /profile/practice-author.
    await signOut(page);
    await signIn(page, reader);
    await page.goto('/profile/practice-author');
    await expect(unfollowButton).toBeVisible();
    await expect(followButton).toHaveCount(0);

    // 5. Clean up: unfollow as the reader and the editor, then open an unknown profile.
    await unfollowButton.click();
    await expect(followButton).toBeVisible();
    await expect(unfollowButton).toHaveCount(0);

    await signOut(page);
    await signIn(page, editor);
    await page.goto('/profile/practice-author');
    await unfollowButton.click();
    await expect(followButton).toBeVisible();
    await expect(unfollowButton).toHaveCount(0);

    await page.goto('/profile/no-such-user-xyz');
    await expect(page.getByText('profile not found')).toBeVisible();
    await expect(page.getByRole('button', { name: /^(Follow|Unfollow) / })).toHaveCount(0);
  });
});
