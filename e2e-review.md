# My end-to-end tests and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you found and decided.

App: Conduit practice app · Test file: `P4/tests/e2e.spec.ts` · Date: 2026-11-21

## 1. My first look
- **After I published an article by hand, I would check:** I would check that the article is published successfully and appears in the Global Feed with the correct title and description.
- **Where the page keeps my sign-in:** jwtToken

## 2. Practice
- **Worked example (the like test):** it signs in through the form as a practice user, so other tests can change its data.
- **Does its check at the end prove the journey?** No. The heading is already visible before clicking Favorite Article. It only proves that the article page opened, not that the like worked. We should check that the button changes to "Unfavorite Article" or that the like count increases.

## 3. My prompt
```text
Task: Write 2 end-to-end tests in P4/tests/e2e.spec.ts. Test 1: a signed-in user publishes a new article in the editor. Test 2: a signed-in user posts a comment on an article. Make a new user with the API, give the page its token, do the journey in the page, and check the result with the API at the end. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/app/public/app.js app.js is the page's code: take the labels and button names from it. The page keeps the sign-in token in localStorage, key jwtToken.
Rules: Use app.js only for the labels and button names. Do not change the app. Do not run the tests. At the end, use the API to verify that the new article is saved with the correct title and body, and that the posted comment is saved with the correct text.
```

## 4. The run
- **Claude's 2 tests:** `npx playwright test tests/e2e.spec.ts` → 2 passed, 0 failed.

## 5. The teammate's question
- **Claude said:** "Every test makes its own user and its own data." (e2e.spec.ts, line 4)
- **My answer:** No. Each test creates its own user and data, but it doesn't delete them afterwards, so they are still left in the app after the tests run.

## 6. What I saw on the home page
- At the top of the Global Feed: "QA Test article-…" and "QA Test e2e article-…", made by qa-user-… users (my screenshot).

## 7. My change
- **My line to Claude:** "In @P4/tests/e2e.spec.ts, both tests leave behind the users and articles they create. Add cleanup in test.afterEach to delete the test data, so cleanup runs even if a check fails. Do not run the tests."
- **The clean-up Claude added:** test.afterEach finds the articles each test user wrote and deletes them (their comments go with them). The users stay: API.md has no request to delete a user.

## 8. Proof
- **Each test twice, on an app that keeps its data:** `npx playwright test tests/e2e.spec.ts --repeat-each=2` → 4 passed, 0 failed
- **The newest article on the home page after the run:** yes title gone, your first end to end test
