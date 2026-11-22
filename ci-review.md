# My CI workflow and review (week 4, project P4)

Repository: the P4 folder · Workflow: `.github/workflows/playwright.yml` · Date: 22 Nov 2026

## 1. What my project needs
- **Node.js on my laptop (`node -v`):** v24.22.1
- **My whole suite on my laptop:** `npx playwright test` → 21 passed, 0 failed
- **What the GitHub computer needs (my words):**
  - Node.js `v24.22.1`, because it meets the project's requirement of `>=22.13` and matches the version on your laptop.
  - `npm ci`, so it installs the exact versions from `package-lock.json`.
  - Chromium only (from the example)

## 2. My prompt to Claude
```text
Task: Write a GitHub Actions workflow that runs this Playwright suite on every push and keeps the HTML report. My GitHub repository is the P4 folder, so save it as P4/.github/workflows/playwright.yml. After the file, write one line for each step: what it does.
Material: @P4/package.json @P4/playwright.config.ts @P4/README.md
Rules: Use actions/checkout@v6, actions/setup-node@v6 and actions/upload-artifact@v6. Do not run anything. Do not commit or push. Install only Chromium, the browser my config uses.
```

## 3. What Claude's workflow got wrong for my project
- **Claude's workflow:** lines 14–18, `actions/setup-node@v6` with `node-version: 22` and `cache: npm`
- **Claude said:** "Installs Node 22, which `package.json` asks for (`"node": ">=22.13"`)."
- **My project needs:** Node.js 24 (my laptop: v24.22.1)
- **My answer to the developer:** No, not yet. Claude set `node-version: 22` based on `package.json`, which only states the minimum supported version (`>=22.13`), whereas our tests were actually verified on Node.js 24 (`v24.22.1`). We should change line 17 to `24` so CI matches the exact environment that ran our suite green.
- **My line to Claude:** In @P4/.github/workflows/playwright.yml, line 17 sets node-version to 22. My laptop ran and proved the suite on Node.js 24 (v24.22.1). Change node-version to 24. Change nothing else. Do not run anything.

## 4. My reading of the workflow
- **When, where, the code and Node.js (lines 3–18):** Basically it says whenever you push code, spin up a fresh Linux machine on GitHub with a 20-minute time limit, grab the repo code, and set up Node 24 with npm caching so later runs are quicker.
- **Packages, browser, tests and the report (lines 20–35):** First, it runs `npm ci` to install the exact packages from the lockfile, then downloads just the Chromium browser with its Linux dependencies. After that, it runs the Playwright tests, and finally, as long as the run wasn't cancelled, it saves the HTML report folder for 30 days—even if some tests fail.

## 5. The first run on GitHub
- **Run:** Add the CI workflow · **Result:** green tick, Success (36s) · **Tests:** 21 passed (5.7s); the 2 tests marked with `test.fail()` show ✘ and count as passed
- **The report (artifact):** Yes, **playwright-report** is right there under **Artifacts**.

## 6. A red run on purpose
- **The change:** `tests/example.spec.ts` line 6, `toBe(200)` → `toBe(201)`
- **My prediction:** The "Run the tests" step will turn red because `tests/example.spec.ts` checks `GET /api/tags` and expects status `201`, whereas the endpoint actually returns `200` (Expected: 201, Received: 200).
- **What GitHub showed:** red cross, Failure. Step "Run the tests": 1 failed, "the API lists the popular tags", Expected: 201, Received: 200; 20 passed. The run kept its **playwright-report** artifact.

## 7. Fixed, and green again
- **The fix:** line 6 back to `toBe(200)` · **Run:** Fix the expected status · **Result:** passed with green tick, 21 passed

## 8. Review notes for my other AI-written tests (written while CI ran)
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.
Monday's and Tuesday's tests that I did not review in depth on those days. Each one: kept, changed or removed, and why.

### Monday: `tests/api.spec.ts`
- "reading an article by slug returns 200 and the same values that were saved": **kept**, because it checks 200, the full response fields, and uses its own test data.
- "deleting an article returns 204 with no body, and then the article is gone": **kept**, because it checks 204 and empty body, then confirms deletion with a 404.
- "creating an article without a token returns 401 "token is missing" and saves nothing": **kept**, because it is a solid negative test checking 401, the error message, and that nothing got saved.
- "updating someone else's article returns 403 and the article does not change": **kept**, because it checks 403 and verifies the article stayed untouched afterward.
- "deleting an article that does not exist returns 404 "article not found"": **kept**, because it is a clean 404 check with error message, and nothing left behind to verify.

### Tuesday: `tests/contract.spec.ts`
- "GET /api/user returns 200 and a User with every field and type from API.md": **changed**, because it checks 200, field types, and own user data, but uses toMatchObject without checking the exact key list so extra fields could slip through.
- "GET /api/user with no token returns 401 "token is missing"": **kept**, because it checks 401 and the exact error body when no token is sent.
- "GET /api/user with a wrong token returns 401 "token is invalid"": **kept**, because it creates its own user, alters the token, and checks 401 with the exact error body.
- "PUT on someone else's article returns 403 "article forbidden" and the article does not change": **kept**, because it uses its own two users, checks 403 and the error body, and verifies via GET that nothing changed.
