// spec: user request (Profile follow)
// seed: tests/seed.spec.ts
import { test, expect, APIRequestContext } from '@playwright/test';

const PASSWORD = 'Password123'; // API.md: at least 8 characters

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// Users made by the current test. test.afterEach cleans up their follows, even when a check fails.
let createdUsers: { username: string; email: string; token: string }[] = [];

// API.md: POST /api/users -> 201 User, with a token.
async function signUp(request: APIRequestContext) {
  const username = uniqueName('qa-reader');
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

// Cleanup: the test user stops following practice-author.
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

test.describe('Profile follow', () => {
  test('Follow and unfollow practice-author keeps state after reload', async ({ page, request }) => {
    const user = await signUp(request);

    // exact: true is needed because "Follow practice-author" is a substring of "Unfollow practice-author"
    const followButton = page.getByRole('button', { name: 'Follow practice-author', exact: true });
    const unfollowButton = page.getByRole('button', { name: 'Unfollow practice-author', exact: true });

    // 1. Sign in at /login with the new user, then open /profile/practice-author
    await page.goto('/login');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('link', { name: user.username })).toBeVisible();

    await page.goto('/profile/practice-author');
    await expect(page.getByRole('heading', { name: 'practice-author', level: 1 })).toBeVisible();
    await expect(page.getByText('I write about testing and quality.')).toBeVisible();
    await expect(followButton.or(unfollowButton)).toHaveCount(1);
    await expect(followButton.or(unfollowButton)).toBeVisible();

    // 2. If the button is "Unfollow practice-author", click it first so the start state is "Follow"
    if (await unfollowButton.isVisible()) {
      await unfollowButton.click();
    }
    await expect(followButton).toBeVisible();
    await expect(unfollowButton).toHaveCount(0);

    // 3. Click the button "Follow practice-author"
    await followButton.click();
    await expect(unfollowButton).toBeVisible();
    await expect(followButton).toHaveCount(0);

    // 4. Reload the page
    await page.reload();
    await expect(page.getByRole('heading', { name: 'practice-author', level: 1 })).toBeVisible();
    await expect(unfollowButton).toBeVisible();
    await expect(followButton).toHaveCount(0);

    // 5. Click "Unfollow practice-author", then reload the page
    await unfollowButton.click();
    await expect(followButton).toBeVisible();
    await expect(unfollowButton).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'practice-author', level: 1 })).toBeVisible();
    await expect(followButton).toBeVisible();
    await expect(unfollowButton).toHaveCount(0);
  });
});
