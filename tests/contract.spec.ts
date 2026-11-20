import { test, expect, APIRequestContext } from '@playwright/test';

// Contract tests, written from P4/API.md only.
// Shared values and steps are kept in one place, at the top of this file.
// Every test makes its own user and its own article, so no test depends on another.

const PASSWORD = 'Password123'; // API.md: at least 8 characters

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// API.md: POST /api/users -> 201 User, with a token.
async function signUp(request: APIRequestContext) {
  const username = uniqueName('qa-user');
  const email = `${username}@example.com`;
  const response = await request.post('/api/users', {
    data: { user: { username, email, password: PASSWORD } },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username, email, token: json.user.token as string };
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
async function createArticle(request: APIRequestContext, token: string) {
  const article = newArticle();
  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: { article },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { slug: json.article.slug as string, sent: article };
}

// ---------- Schema checks ----------

test('GET /api/articles/:slug returns 200 and an Article with every field and type from API.md', async ({ request }) => {
  const user = await signUp(request);
  const { slug, sent } = await createArticle(request, user.token);

  const response = await request.get(`/api/articles/${slug}`);

  expect(response.status()).toBe(200);
  const json = await response.json();

  // API.md: Article = {"article":{"slug","title","description","body","tagList",
  //   "createdAt","updatedAt","favorited","favoritesCount","author"}}
  // author is a Profile without the wrapper: {"username","bio","image","following"}.
  // A new user has bio and image set to null.
  expect(json).toMatchObject({
    article: {
      slug: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
      body: expect.any(String),
      tagList: expect.any(Array),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      favorited: expect.any(Boolean),
      favoritesCount: expect.any(Number),
      author: {
        username: expect.any(String),
        bio: null,
        image: null,
        following: expect.any(Boolean),
      },
    },
  });

  // The article has exactly the fields in API.md: no field missing, no extra field.
  expect(Object.keys(json.article).sort()).toEqual(
    [
      'slug',
      'title',
      'description',
      'body',
      'tagList',
      'createdAt',
      'updatedAt',
      'favorited',
      'favoritesCount',
      'author',
    ].sort(),
  );

  // tagList is a list of text values.
  for (const tag of json.article.tagList) {
    expect(tag).toEqual(expect.any(String));
  }
  // Dates are ISO 8601 text.
  expect(new Date(json.article.createdAt).toISOString()).toBe(json.article.createdAt);
  expect(new Date(json.article.updatedAt).toISOString()).toBe(json.article.updatedAt);

  // The values are the ones that were saved.
  expect(json.article.slug).toBe(slug);
  expect(json.article.title).toBe(sent.title);
  expect(json.article.body).toBe(sent.body);
  expect(json.article.tagList).toEqual(sent.tagList);
  expect(json.article.author.username).toBe(user.username);
});

test('GET /api/user returns 200 and a User with every field and type from API.md', async ({ request }) => {
  const user = await signUp(request);

  const response = await request.get('/api/user', { headers: auth(user.token) });

  expect(response.status()).toBe(200);
  const json = await response.json();

  // API.md: User = {"user":{"email","token","username","bio","image"}}.
  // A new user has bio and image set to null.
  expect(json).toMatchObject({
    user: {
      email: expect.any(String),
      token: expect.any(String),
      username: expect.any(String),
      bio: null,
      image: null,
    },
  });

  // The values belong to the signed-in user.
  expect(json.user.username).toBe(user.username);
  expect(json.user.email).toBe(user.email);
  expect(json.user.token.length).toBeGreaterThan(0);
});

// ---------- Auth checks ----------

test('GET /api/user with no token returns 401 "token is missing"', async ({ request }) => {
  const response = await request.get('/api/user');

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });
});

test('GET /api/user with a wrong token returns 401 "token is invalid"', async ({ request }) => {
  const user = await signUp(request);
  const wrongToken = `${user.token}wrong`;

  const response = await request.get('/api/user', { headers: auth(wrongToken) });

  expect(response.status()).toBe(401);
  // API.md: this app says "is invalid" for a wrong token.
  expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });
});

test("PUT on someone else's article returns 403 \"article forbidden\" and the article does not change", async ({ request }) => {
  const author = await signUp(request);
  const otherUser = await signUp(request);
  const { slug, sent } = await createArticle(request, author.token);

  const response = await request.put(`/api/articles/${slug}`, {
    headers: auth(otherUser.token),
    data: { article: { title: 'Changed by someone else', body: 'Changed by someone else' } },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

  // The article is really unchanged: read it back by the same slug.
  const readBack = await request.get(`/api/articles/${slug}`);
  expect(readBack.status()).toBe(200);
  const json = await readBack.json();
  expect(json.article.title).toBe(sent.title);
  expect(json.article.body).toBe(sent.body);
  expect(json.article.author.username).toBe(author.username);
});
