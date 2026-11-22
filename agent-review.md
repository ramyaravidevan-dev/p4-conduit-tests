# Tests from Playwright's agents, and my review (week 4, project P4)

App: Conduit practice app on my laptop · Date: 22 Nov 2026

## 1. How I set up the agents
- **Command:** `npx playwright init-agents --loop=claude` (TESTS terminal, in `P4`)
- **What it made:** 3 agents in `P4/.claude/agents/` (playwright-test-planner, playwright-test-generator, playwright-test-healer), `P4/.mcp.json`, `specs/README.md` and `tests/seed.spec.ts`
- **Browser hidden:** `"--headless"` added to `P4/.mcp.json`: yes
- **Where I started Claude for the agents:** in `P4`, because Claude finds the agents and their browser only there

## 2. What I asked the agents
- **Area:** the profile page and following an author
- **My prompt** (`P4/prompts/agents.md`):
  > Task: First use the playwright-test-planner agent to plan tests for the profile page and following an author. Save the plan as specs/profile-follow.md. Then use the playwright-test-generator agent to write one test for each scenario in the plan, in the folder tests/profile-follow/.
  > Material: Start on the page /profile/practice-author. For steps that need a signed-in user, use a practice user from README.md.
  > Rules: Plan at most 2 short scenarios, with at most 5 steps each. Do not change any other test file. Do not run the test suite. Check that each test verifies the actual expected result using a clear assertion, not just that the page or a success message is visible.
- **The plan the planner saved:** `specs/profile-follow.md` (2 scenarios: "Follow and unfollow practice-author keeps state after reload" and "Follow state belongs to the signed-in user")
- **The test files the generator wrote:** `tests/profile-follow/follow-unfollow.spec.ts`, `tests/profile-follow/follow-per-user.spec.ts`
- `tests/seed.spec.ts` is the agents' start file. It checks nothing about the app, so it is not reviewed here.

## 3. My review of every generated test
- **The teammate's question:** "The agents' test passed in their browser. So we can keep it in our suite as it is, right?" (about "Follow and unfollow practice-author keeps state after reload")
- **My answer:** No. The test passed, but it changes the starting state by unfollowing the author if already followed. The test changes the `practice-reader` account. Other tests also use this shared practice account, so changing its follow status can affect their results.
- "Follow and unfollow practice-author keeps state after reload" · **changed**, because the test is useful, but it uses the shared `practice-reader` account. It should create its own user through the API so it doesn't affect other tests.
- "Follow state belongs to the signed-in user" · **changed**, because the test checks useful behaviour, but it uses shared `practice-reader` and `practice-editor` accounts. It should create its own users through the API to avoid affecting other tests.

## 4. What I asked Claude to change, and the result
- **My change** (the Changes line of `P4/prompts/stronger.md`): In `tests/profile-follow/follow-unfollow.spec.ts`: it should create its own user through the API. In `tests/profile-follow/follow-per-user.spec.ts`: it should create its own users through the API. Claude changed both tests to sign up new users through the API, with an `afterEach` clean-up.
- **Result:** No fault: 21 passed, 0 failed (second fault run)
