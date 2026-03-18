---
name: implement-feature-or-fix-bug
description: Process for implementing a feature or fixing a bug in the codebase.
---

# Implementing a Feature or Fixing a Bug

When implementing a feature or fixing a bug in the codebase, follow these exact steps in order. This process ensures that your changes are well-documented and can be tested by the team. The documentation also serves as a reference for future contributors. Complete all steps without stopping until every step has been fulfilled.

Steps:

- Review the codebase to get a good idea of how the existing code works and where your changes will fit in. Continue reviewing until you have a clear understanding of the relevant parts of the codebase. You should review related features or areas of the codebase that may be affected by your changes to ensure that you have a comprehensive understanding of the context in which your changes will be made.
- Within the `docs/tasks` directory, create a new markdown file following the naming convention `TASK-<short-description>.md`. For example, if you are implementing updates to the user authentication system, you might name your file `TASK-update-user-authentication.md`.
- Within the markdown file doc, create a detailed document for the code changes and steps you will be taking. This document should include:
  - A clear description of the feature you are implementing or the bug you are fixing.
  - The motivation and the ask provided by the user.
  - Any critical decisions you or the user have made.
  - A step-by-step outline of the implementation process, including high-level pseudocode versions of the code changes we will be making.
  - Any potential edge cases or considerations that should be taken into account during implementation.
  - A phased approach. For example, if you are implementing a new feature, you might break it down into smaller tasks such as "Design the user interface," "Implement the backend logic," and "Write tests for the new feature." If you are fixing a bug, you might break it down into tasks such as "Identify the root cause of the bug," "Implement the fix," and "Test the fix to ensure it resolves the issue."
  - A test steps area with easy-to-understand test steps that a user could follow to ensure that the feature or bug fix was implemented correctly.
- Once the documentation is complete, step through the documentation and fully implement everything that was documented. If you need to deviate from the plan due to unexpected challenges or new insights, update the documentation accordingly to reflect the changes made during implementation. This ensures that the documentation remains accurate and useful for future reference.
- After you've completed the task, add the following front matter to the markdown.

```markdown
---
name: <task-name>
description: <a brief description of the task>
status: completed
---
```

Then, make sure to update the copilot-instructions.md file to account for any changes that need to be added so that future LLMs have the context. Not every little detail needs to be included in this copilot instruction, but major changes that every LLM session should know need to be added here. Additionally, if there are any code changes that require updates to the readme.md, those should also be made.