# API review: Claude's first API tests (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you decided and what you saw.

- **App:** Conduit, the practice app on your own laptop (`http://127.0.0.1:3000`)
- **API description:** `P4/API.md`
- **Test file:** `P4/tests/api.spec.ts`, written by Claude
- **Prompt file:** `P4/prompts/api.md`

## 1. My first look, by hand
The request my comment sent in the app, and the status that came back.
- IT USED POST METHOD · 201

## 2. My predictions and the real answers
One line per request: what I predicted, and what the app really answered.
- **A** (a comment, with the token): I predicted yes since we have token we willl see 20 (201). The app answered 201, with the comment "Clear and useful." by practice-reader.
- **B** (the same comment, with no token): I predicted 201. The app answered 401, `{"errors":{"token":["is missing"]}}`. Why: beacuse thre was no authentication token
- **C** (a comment on an article that does not exist): I predicted 404 - not fiund. The app answered 404, `{"errors":{"article":["not found"]}}`.

## 3. My prompt to Claude
```text
Task: Write at least 6 Playwright API tests for articles in the Conduit API: create, read, change and delete an article. At least 3 positive and at least 3 negative tests. Save them in P4/tests/api.spec.ts. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. Make sure the API gives the correct information, not just a successful status.
```

## 4. The run
- **Result:** `npx playwright test tests/api.spec.ts`: 7 passed, 1 failed.
- **A red test, and who is wrong:** "updating only the body changes the body and keeps the other fields". Line 103 (the tags): Expected `["testing", "api"]`, Received `[]`. API.md says: "Updating: every field is optional. A field you do not send stays as it was." My answer: The app is wrong because API.md says that any field we don't send during an update should stay as it was, so the tags should not disappear.
- **My note** (kept with `test.fail()`): he app removes the tags when only the body is updated.

## 5. The developer's question
The test I looked at, and my answer to: "So the app saved nothing, right?"
- **Test:** "creating an article without a title returns 422 "title can't be blank"" (lines 144–155)
- **My answer:** no it dosnot prove

## 6. Tests I reviewed with the API checklist
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.

### "creating an article returns 201 and the article with the values sent" (lines 49–70)
- **My decision:** Keep. It checks the status, the article details and response values, and it creates its own user and article.

## 7. My API rules
The rules I added to my `playwright-quality` skill, under `## API rules`:
1. Check the correct status code and make sure the response has the expected values.
2. After adding, updating or deleting data, use GET to check whether the changes really happened.
3. Each test should use its own user and unique test data.
