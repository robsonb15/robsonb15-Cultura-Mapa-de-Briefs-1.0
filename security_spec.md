# Security Specification for Cultural Map of Breves

## Data Invariants
1. A user can only manage their own profile.
2. A cultural agent must have a valid owner ID matching the creator's UID.
3. Only the owner of an agent can edit its details.
4. Timestamps must be server-generated.

## The "Dirty Dozen" Payloads (Deny Test Cases)

1. **Identity Spoofing (Agents):** Creating an agent with an `ownerId` that doesn't match the authenticated user.
2. **Identity Spoofing (Profiles):** Creating or updating a user profile with a UID that doesn't match the authenticated user's `request.auth.uid`.
3. **Privilege Escalation:** Attempting to update a restricted admin field (though not explicitly used yet, good to prevent).
4. **Foreign Update:** User A attempting to update an agent owned by User B.
5. **Orphaned Writes:** Creating an agent without a required `type` or `name`.
6. **Value Poisoning:** Injecting an extremely long string (e.g., 1MB) into the `name` or `description` fields.
7. **Type Poisoning:** Sending a list for `birthDate` instead of a string.
8. **State Shortcutting:** Manually setting `createdAt` to a past date instead of `serverTimestamp()`.
9. **Shadow Field Injection:** Adding a `isVerified: true` field to an agent that isn't in the schema.
10. **Terminal State Break:** (N/A for now but would be like editing a deleted flag).
11. **Path variable mismatch:** Attempting to write to `/users/user-1` while authenticated as `user-2`.
12. **Unauthenticated Write:** Attempting to create an agent without being signed in.

## Test Runner (firestore.rules.test.ts)
(To be implemented if testing tool is available, otherwise handled via logic analysis).
