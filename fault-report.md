# My practice fault report (week 4, project P4)

App: Conduit practice app on my laptop · Practice faults: `P4/faults/practice.json` (F1 to F6) · Date: 22 Nov 2026
**How to read it:** a "detect" fault is **caught** when at least one test that passed with no fault fails with it, and **missed** when every test still passes. A "robust" fault (the app is only slower) should **stay green**; if tests fail, it **went red**.

## 1. My guess this morning
- **The developer asked:** "Your suite is green. How many real problems would it catch?"
- **My answer:** I would guess the suite catches some real problems, but passing tests doesn't tell us how many. We can find out by deliberately introducing bugs into the app and checking how many our tests detect.

## 2. Before: my suite against the practice faults
- **Command:** `node materials/faults-run.mjs` (TESTS terminal, in `P4`, with no app running)
- **My test files:** api.spec.ts, contract.spec.ts, e2e.spec.ts, example.spec.ts, profile-follow/follow-per-user.spec.ts, profile-follow/follow-unfollow.spec.ts, seed.spec.ts
- **No fault:** 19 passed, 0 failed
- **F1:** caught (7 tests failed)
- **F2:** caught (5 tests failed)
- **F3:** caught (5 tests failed)
- **F4:** caught (1 test failed)
- **F5:** stayed green
- **F6:** caught (1 test failed)

## 3. The weak spot I chose, and why
F4 is one weakness. Only one test catches the empty comments list, so we should add stronger checks to catch this problem in more than one place.

## 4. How I made the suite stronger
- **My request for Claude** (the New tests line of `P4/prompts/stronger.md`): Add two API tests for comments: one should verify that a signed-in user can post a comment and the comment is saved with the correct text. The second should verify that a rejected comment is not saved and does not appear when we GET the comments.
- **New or changed test file:** `tests/comments-api.spec.ts` (new, 2 API tests)
- **Found on the way:** the empty-body comment test failed with no fault (Expected 422, Received 201). `API.md` says the body is required, so I decided the app is wrong. The test is kept and marked with `test.fail()` and a note.

## 5. After: the run again
- **Command:** `node materials/faults-run.mjs F4 F6`
- **No fault:** 21 passed, 0 failed
- **The fault I chose:** F4: caught (2 tests failed). F6: caught (2 tests failed).

## 6. What changed
Our suite passed all 21 tests, but that doesn't mean it catches every problem.
We tested it by introducing faults, and it caught more problems after adding two comment tests.
F4 and F6 are now caught by two tests each, so our coverage is stronger.
