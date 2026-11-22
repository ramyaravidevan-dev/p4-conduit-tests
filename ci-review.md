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
