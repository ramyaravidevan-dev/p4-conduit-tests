import { test, expect, APIRequestContext } from '@playwright/test';

// API tests for comments, written from API.md only.
// Every test makes its own user and its own article, and cleans up after itself.

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
  return json.article.slug as string;
}

// Cleanup: delete every article each test user wrote. Its comments go with it.
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
      // API.md: DELETE /api/articles/:slug -> 204, author only.
      const response = await request.delete(`/api/articles/${encodeURIComponent(article.slug)}`, {
        headers: auth(user.token),
      });
      expect.soft(response.status()).toBe(204);
    }
  }
});

test.describe('Comments API', () => {
  test('a signed-in user posts a comment, and it is saved with the right text', async ({ request }) => {
    const user = await signUp(request);
    const slug = await createArticle(request, user.token);
    const commentText = uniqueName('QA Test comment from the API');

    // API.md: POST /api/articles/:slug/comments -> 201 {"comment":{...}}.
    const created = await request.post(`/api/articles/${encodeURIComponent(slug)}/comments`, {
      headers: auth(user.token),
      data: { comment: { body: commentText } },
    });
    expect(created.status()).toBe(201);
    const createdJson = await created.json();
    expect(createdJson.comment.body).toBe(commentText);
    expect(createdJson.comment.author.username).toBe(user.username);
    expect(createdJson.comment.id).toBeDefined();

    // API.md: GET /api/articles/:slug/comments -> 200 {"comments":[...]}.
    const readBack = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
    expect(readBack.status()).toBe(200);
    const json = await readBack.json();
    expect(json.comments).toHaveLength(1); // a new article, so this is its only comment
    expect(json.comments[0].id).toBe(createdJson.comment.id);
    expect(json.comments[0].body).toBe(commentText);
    expect(json.comments[0].author.username).toBe(user.username);
  });

  test('a comment with an empty body is rejected, and it is not saved', async ({ request }) => {
    // Known app bug: the app saves an empty comment (201), but API.md says body is required (422).
    test.fail(true, 'App saves an empty comment: got 201, API.md expects 422');
    const user = await signUp(request);
    const slug = await createArticle(request, user.token);

    // API.md: body is required. Missing or not valid -> 422 {"errors":{"body":["can't be blank"]}}.
    const rejected = await request.post(`/api/articles/${encodeURIComponent(slug)}/comments`, {
      headers: auth(user.token),
      data: { comment: { body: '' } },
    });
    expect(rejected.status()).toBe(422);
    const rejectedJson = await rejected.json();
    expect(rejectedJson).toEqual({ errors: { body: ["can't be blank"] } });

    // The GET shows no comment: nothing was saved.
    const readBack = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
    expect(readBack.status()).toBe(200);
    const json = await readBack.json();
    expect(json.comments).toHaveLength(0);
  });
});
