# Profile page and follow author

## Application Overview

Two short scenarios for /profile/practice-author in the Conduit practice app. Labels seen on the page: heading "practice-author", bio "I write about testing and quality.", tabs "My Articles" and "Favorited Articles", buttons "Follow practice-author" and "Unfollow practice-author" (signed in). Signed out there is no follow button. Rules come from README.md and API.md (Profiles: POST/DELETE /api/profiles/:username/follow, "following" true when the signed-in user follows). NOT IN THE MATERIAL: the exact signed-out behaviour of the follow button, and which users follow whom at start (practice-reader showed "Unfollow practice-author" on first open, so the start state must be checked in step 2).

## Test Scenarios

### 1. Profile follow

**Seed:** `tests/seed.spec.ts`

#### 1.1. Follow and unfollow practice-author keeps state after reload

**File:** `tests/profile-follow/follow-unfollow.spec.ts`

**Steps:**
  1. Sign in at /login with email practice-reader@example.com and the practice password from README.md (fields "Email" and "Password", button "Sign in"), then open /profile/practice-author.
    - expect: Heading "practice-author" and the text "I write about testing and quality." are visible.
    - expect: Exactly one of the buttons "Follow practice-author" or "Unfollow practice-author" is visible.
  2. If the button is "Unfollow practice-author", click it first so the start state is "Follow practice-author".
    - expect: Button "Follow practice-author" is visible and "Unfollow practice-author" is not.
  3. Click the button "Follow practice-author".
    - expect: The button text changes to "Unfollow practice-author" and "Follow practice-author" is no longer present.
  4. Reload the page.
    - expect: Button "Unfollow practice-author" is still visible (follow state is saved), and "Follow practice-author" is not present.
  5. Click "Unfollow practice-author", then reload the page.
    - expect: After the click and after the reload the button is "Follow practice-author" and "Unfollow practice-author" is not present.

#### 1.2. Follow state belongs to the signed-in user

**File:** `tests/profile-follow/follow-per-user.spec.ts`

**Steps:**
  1. Sign in as practice-reader (practice password from README.md), open /profile/practice-author, and make sure the button is "Unfollow practice-author" (click "Follow practice-author" if needed).
    - expect: Button "Unfollow practice-author" is visible.
  2. Sign out, then sign in as practice-editor (practice password from README.md) and open /profile/practice-author. Note which button shows.
    - expect: The button reflects practice-editor's own state, not practice-reader's. If it shows "Follow practice-author", practice-reader's follow did not leak to practice-editor.
  3. As practice-editor, click "Follow practice-author" (if shown), then reload.
    - expect: Button "Unfollow practice-author" is visible after the click and after the reload.
  4. Sign out, sign in again as practice-reader, open /profile/practice-author.
    - expect: Button is still "Unfollow practice-author" (practice-editor's action did not change practice-reader's follow).
  5. Clean up: as practice-reader click "Unfollow practice-author" if you want the default state back, and unfollow as practice-editor. Open /profile/no-such-user-xyz as a last check.
    - expect: Unfollow buttons change to "Follow practice-author" for each user. The unknown profile does not show a follow button for a real author (exact page text NOT IN THE MATERIAL; API.md says GET /api/profiles/:username gives 404 {"errors":{"profile":["not found"]}}).
