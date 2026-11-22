Changes: In @P4/tests/profile-follow/follow-unfollow.spec.ts: The test is useful, but it uses the shared `practice-reader` account. It should create its own user through the API so it doesn't affect other tests.
In @P4/tests/profile-follow/follow-per-user.spec.ts: The test checks useful behaviour, but it uses shared `practice-reader` and `practice-editor` accounts. It should create its own users through the API to avoid affecting other tests.
New tests: Add two API tests for comments: one should verify that a signed-in user can post a comment and the comment is saved with the correct text. The second should verify that a rejected comment is not saved and does not appear when we GET the comments.
Material: @P4/API.md @P4/tests/e2e.spec.ts Make users and data by API, and clean up, like these tests.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Change nothing else. Do not run the tests.
