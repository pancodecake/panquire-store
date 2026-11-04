# Panquire Store — Codex Instructions

## 1. Mandatory GitHub Workflow for the Shopify Live Theme

These rules apply whenever a task involves modifying, updating, publishing, or reverting the Panquire Shopify **live theme**.

**GitHub repository:** https://github.com/pancodecake/panquire-store

### Making changes

- **Do not upload, deploy, push, or edit code directly in the Shopify live theme.** This includes the Shopify admin code editor, Shopify CLI `theme push`, Shopify theme APIs, and other direct-to-Shopify deployment methods.
- Instead, make the requested changes in the local working copy of the GitHub repository above.
- Review and, where feasible, test the changes. Commit them with a descriptive commit message and push the commit to the appropriate branch in this repository.
- Before pushing changes intended for the live theme, confirm which GitHub branch, if any, is linked to the Shopify live theme. Do not assume that `main` is linked or that a GitHub push automatically publishes to Shopify.
- Use the existing GitHub-to-Shopify integration for live-theme synchronization if it is configured. If it is not configured or cannot be verified, explain the limitation; **do not use direct Shopify upload as a fallback**.

### Reverting or rolling back changes

- When the user asks to revert, undo, or roll back live-theme changes, **perform the rollback through GitHub, not directly in Shopify**.
- Identify the relevant commit(s) and prefer a non-destructive `git revert` (or an equivalent new commit that reverses the changes). Commit and push the reversal to the appropriate GitHub branch.
- Do not overwrite Shopify theme files, upload an earlier theme version directly, force-push, or rewrite shared Git history as a shortcut.
- Verify whether the GitHub-to-Shopify integration applied the rollback; if verification is unavailable, say so.

### Reporting

After completing a live-theme change or rollback, report:
- What changed and which files were affected.
- The GitHub branch and commit SHA or URL.
- What checks were completed.
- Whether synchronization with the Shopify live theme was verified or remains unconfirmed.

**Priority:** This GitHub-first workflow is mandatory for all live-theme code changes and reversals unless the user explicitly instructs otherwise.
