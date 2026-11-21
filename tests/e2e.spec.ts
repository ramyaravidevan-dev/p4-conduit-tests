import { test, expect, APIRequestContext, Page } from '@playwright/test';

// End-to-end tests: the API sets up the user, the page does the journey, the API checks the result.
// Shared values and steps, kept in one place. Every test makes its own user and its own data.

const PASSWORD = 'Password123'; // API.md: at least 8 characters

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

// Users made by the current test. test.afterEach cleans up their data, even when a check fails.
let createdUsers: { username: string; token: string }[] = [];

// API.md: POST /api/users -> 201 User, with a token.
async function signUp(request: APIRequestContext) {
  const username = uniqueName('qa-user');
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${username}@example.com`, password: PASSWORD } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  const user = { username, token: json.user.token as string };
  createdUsers.push(user);
  return user;
}

// Cleanup: delete every article each test user wrote.
// It finds the articles by author, so it also works when the test failed before it read the slug.
// API.md has no request to delete a user, so the users themselves stay.
test.afterEach(async ({ request }) => {
  const users = createdUsers;
  createdUsers = [];
  for (const user of users) {
    // API.md: GET /api/articles?author=<username> -> 200 Multiple articles.
    const list = await request.get(`/api/articles?author=${encodeURIComponent(user.username)}&limit=100`);
    expect.soft(list.status()).toBe(200);
    if (!list.ok()) continue;
    const json = await list.json();
    for (const article of json.articles) {
      // API.md: DELETE /api/articles/:slug -> 204, author only. Its comments go with it.
      const response = await request.delete(`/api/articles/${encodeURIComponent(article.slug)}`, {
        headers: auth(user.token),
      });
      expect.soft(response.status()).toBe(204);
    }
  }
});

// The page keeps the sign-in token in localStorage, key jwtToken.
// Put it there before any page script runs, so the page opens signed in.
async function giveTokenToPage(page: Page, token: string) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('jwtToken', t);
  }, token);
}

// API.md: POST /api/articles -> 201 Article.
async function createArticle(request: APIRequestContext, token: string) {
  const article = {
    title: uniqueName('QA Test article'),
    description: 'A short description',
    body: 'The full text of the article.',
    tagList: ['testing'],
  };
  const response = await request.post('/api/articles', { headers: auth(token), data: { article } });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { slug: json.article.slug as string, title: article.title };
}

test('a signed-in user publishes a new article in the editor, and the API has it saved', async ({ page, request }) => {
  const user = await signUp(request);
  await giveTokenToPage(page, user.token);
  const title = uniqueName('QA Test e2e article');
  const description = 'An article made in the editor';
  const body = 'This text was written in the editor by an end-to-end test.';

  // The journey in the page.
  await page.goto('/editor');
  await expect(page.getByRole('heading', { level: 1, name: 'New Article' })).toBeVisible();
  await expect(page.getByRole('link', { name: user.username })).toBeVisible(); // signed in as the new user
  await page.getByLabel('Title').fill(title);
  await page.getByLabel("What's this article about?").fill(description);
  await page.getByLabel('Write your article').fill(body);
  await page.getByLabel('Tags').fill('testing');
  await page.getByRole('button', { name: 'Publish Article' }).click();

  // The page opens the new article.
  await expect(page).toHaveURL(/\/article\/[^/]+$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await expect(page.getByText(body)).toBeVisible();
  const slug = decodeURIComponent(new URL(page.url()).pathname.split('/').pop() as string);

  // The API check: the article is really saved, with the right title and body.
  const readBack = await request.get(`/api/articles/${encodeURIComponent(slug)}`);
  expect(readBack.status()).toBe(200);
  const json = await readBack.json();
  expect(json.article.title).toBe(title);
  expect(json.article.body).toBe(body);
  expect(json.article.description).toBe(description);
  expect(json.article.author.username).toBe(user.username);
});

test('a signed-in user posts a comment on an article, and the API has it saved', async ({ page, request }) => {
  const user = await signUp(request);
  const { slug, title } = await createArticle(request, user.token);
  await giveTokenToPage(page, user.token);
  const commentText = uniqueName('QA Test comment from the page');

  // The journey in the page.
  await page.goto(`/article/${encodeURIComponent(slug)}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await page.getByLabel('Write a comment').fill(commentText);
  await page.getByRole('button', { name: 'Post Comment' }).click();

  // The page shows the new comment.
  await expect(page.getByText(commentText, { exact: true })).toBeVisible();

  // The API check: the comment is really saved, with the right text.
  const readBack = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
  expect(readBack.status()).toBe(200);
  const json = await readBack.json();
  expect(json.comments).toHaveLength(1); // a new article, so this is its only comment
  expect(json.comments[0].body).toBe(commentText);
  expect(json.comments[0].author.username).toBe(user.username);
});
