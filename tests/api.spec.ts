import { test, expect, APIRequestContext } from '@playwright/test';

// Shared values and steps, kept in one place.
// Every test makes its own user and its own article, so no test depends on another.

const PASSWORD = 'Password123'; // API.md: at least 8 characters

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// API.md: POST /api/users -> 201 User, with a token.
async function signUp(request: APIRequestContext) {
  const username = uniqueName('qa-user');
  const response = await request.post('/api/users', {
    data: { user: { username, email: `${username}@example.com`, password: PASSWORD } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, token: json.user.token as string };
}

function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

function newArticle() {
  return {
    title: uniqueName('QA Test article'),
    description: 'A short description',
    body: 'The full text of the article.',
    tagList: ['testing', 'api'],
  };
}

// API.md: POST /api/articles -> 201 Article.
async function createArticle(request: APIRequestContext, token: string, article = newArticle()) {
  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: { article },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { slug: json.article.slug as string, sent: article };
}

// ---------- Positive tests ----------

test('creating an article returns 201 and the article with the values sent', async ({ request }) => {
  const user = await signUp(request);
  const article = newArticle();

  const response = await request.post('/api/articles', {
    headers: auth(user.token),
    data: { article },
  });

  expect(response.status()).toBe(201);
  const json = await response.json();
  expect(json.article.title).toBe(article.title);
  expect(json.article.description).toBe(article.description);
  expect(json.article.body).toBe(article.body);
  expect(json.article.tagList).toEqual(['testing', 'api']); // this app: tags keep the order sent
  expect(json.article.favorited).toBe(false);
  expect(json.article.favoritesCount).toBe(0);
  expect(json.article.author.username).toBe(user.username);
  expect(typeof json.article.slug).toBe('string');
  expect(json.article.slug.length).toBeGreaterThan(0);
  expect(new Date(json.article.createdAt).toISOString()).toBe(json.article.createdAt); // ISO 8601
});

test('reading an article by slug returns 200 and the same values that were saved', async ({ request }) => {
  const user = await signUp(request);
  const { slug, sent } = await createArticle(request, user.token);

  const response = await request.get(`/api/articles/${slug}`);

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article.slug).toBe(slug);
  expect(json.article.title).toBe(sent.title);
  expect(json.article.description).toBe(sent.description);
  expect(json.article.body).toBe(sent.body);
  expect(json.article.tagList).toEqual(sent.tagList);
  expect(json.article.author.username).toBe(user.username);
});

test('updating only the body changes the body and keeps the other fields', async ({ request }) => {
  // he app removes the tags when only the body is updated.
  test.fail();
  const user = await signUp(request);
  const { slug, sent } = await createArticle(request, user.token);
  const newBody = 'The changed text of the article.';

  const response = await request.put(`/api/articles/${slug}`, {
    headers: auth(user.token),
    data: { article: { body: newBody } },
  });

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.article.body).toBe(newBody);
  expect(json.article.title).toBe(sent.title);
  expect(json.article.description).toBe(sent.description);
  expect(json.article.tagList).toEqual(sent.tagList);
  expect(json.article.slug).toBe(slug); // title did not change, so the slug stays

  // The change is really saved: read it back.
  const readBack = await request.get(`/api/articles/${slug}`);
  expect(readBack.status()).toBe(200);
  expect((await readBack.json()).article.body).toBe(newBody);
});

test('deleting an article returns 204 with no body, and then the article is gone', async ({ request }) => {
  const user = await signUp(request);
  const { slug } = await createArticle(request, user.token);

  const response = await request.delete(`/api/articles/${slug}`, { headers: auth(user.token) });

  expect(response.status()).toBe(204);
  expect(await response.text()).toBe('');

  const readBack = await request.get(`/api/articles/${slug}`);
  expect(readBack.status()).toBe(404);
  expect(await readBack.json()).toEqual({ errors: { article: ['not found'] } });
});

// ---------- Negative tests ----------

test('creating an article without a token returns 401 "token is missing" and saves nothing', async ({ request }) => {
  const article = newArticle();

  const response = await request.post('/api/articles', { data: { article } });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });

  // Nothing was saved under this unique title.
  const list = await request.get('/api/articles');
  const titles = (await list.json()).articles.map((a: { title: string }) => a.title);
  expect(titles).not.toContain(article.title);
});

test('creating an article without a title returns 422 "title can\'t be blank"', async ({ request }) => {
  const user = await signUp(request);
  const { title, ...withoutTitle } = newArticle();

  const response = await request.post('/api/articles', {
    headers: auth(user.token),
    data: { article: withoutTitle },
  });

  expect(response.status()).toBe(422);
  expect(await response.json()).toEqual({ errors: { title: ["can't be blank"] } });
});

test("updating someone else's article returns 403 and the article does not change", async ({ request }) => {
  const author = await signUp(request);
  const otherUser = await signUp(request);
  const { slug, sent } = await createArticle(request, author.token);

  const response = await request.put(`/api/articles/${slug}`, {
    headers: auth(otherUser.token),
    data: { article: { body: 'Changed by someone else' } },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

  const readBack = await request.get(`/api/articles/${slug}`);
  expect((await readBack.json()).article.body).toBe(sent.body);
});

test('deleting an article that does not exist returns 404 "article not found"', async ({ request }) => {
  const user = await signUp(request);

  const response = await request.delete(`/api/articles/${uniqueName('no-such-article')}`, {
    headers: auth(user.token),
  });

  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ errors: { article: ['not found'] } });
});
