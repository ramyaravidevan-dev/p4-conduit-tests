# My schema, auth and contract checks (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-20

## 1. My first look
How I would check that an article answer has the right shape: Check we are getting correct answer as before

## 2. Practice: the key list check
File: `P4/materials/contract-example.spec.ts` (the sign-up answer).
Three changes: `bio` is missing · a new field `password` is added · `token` becomes a number.
- **The toMatchObject check (worked example):** missing: passes · new field: passes · number: fails
- **The key list check (my answer):** missing: fails, new field: fails, number: passes.

## 3. My prompt for Claude
```text
Task: Write Playwright API tests in P4/tests/contract.spec.ts. Schema checks: the answers of GET /api/articles/:slug and GET /api/user have the shape that API.md gives, checked with toMatchObject and expect.any. Auth tests: no token, a wrong token, and changing someone else's article. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. Check that all required fields are present and have the correct type, not just that the API returns a successful status.
```

## 4. Claude's tests and my run
- **Run:** `npx playwright test tests/contract.spec.ts` · **Result:** 5 passed, 0 failed
- **A red test, and who was wrong:** No test failed.

## 5. The teammate's question
- **Claude's test:** "GET /api/articles/:slug returns 200 and an Article with every field and type from API.md"
- **Claude said:** the test title promises "every field and type from API.md"; at the end of its answer: "`toMatchObject` only checks the fields you list, so these tests will not fail if the API adds an extra field."
- **My answer:** No, because `toMatchObject` checks only the fields listed in the test. It will not fail if an extra field like password is added.

## 6. My change
- **What I asked Claude:** "In @P4/tests/contract.spec.ts, the article shape test allows extra fields. Add a check that the article has exactly the fields listed in API.md. Do not run the tests."
- **The run after it:** 5 passed, 0 failed

## 7. Proof: the contract test fails when the answer changes
- **My prediction before the run:** Test 1 will fail because F2 removes one field from the article response, and the exact shape check will detect the missing field.
- **Run with the practice fault F2 on:** `$env:CONDUIT_FAULT = "F2"`, then `npx playwright test tests/contract.spec.ts` · **Result:** 3 passed, 2 failed (the article shape test, and "PUT on someone else's article returns 403 "article forbidden" and the article does not change")
- **What Playwright showed:** `-     "body": Any<String>,` (the article answer had no `body`); the PUT test: Expected "The full text of the article.", Received undefined
- **My answer about a red test:** Test 5 failed because F2 removed the body field from the article response, so the test received `undefined` instead of the expected article body.
- **Run with the fault off again:** `$env:CONDUIT_FAULT = ""`, then the same run · **Result:** 5 passed, 0 failed
