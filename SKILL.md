#Skill Name: Web-Dev-Precision-Execution
Description: A high-fidelity web development workflow focused on logical integrity, comprehensive error handling, and strict naming consistency to ensure production-grade code.

1. Execution Workflow (Step-by-Step)
Step 1: Contextual Analysis & Variable Audit
Action: Before writing any code, list all variables, functions, and components to be used or created.

Rule: Cross-reference proposed names with the existing codebase to prevent naming collisions (e.g., distinguish between userId, customer_id, and uId).

Checklist: * [ ] Does the naming follow the project's specific convention?

[ ] Are there any conflicting names in the current scope?

Step 2: Logic Flow & Error Handling Strategy
Action: Identify all potential failure points (API failures, null/undefined data, edge cases).

Rule: Every data processing or API call block must be wrapped in try-catch blocks or validation guards.

Checklist: * [ ] Is there a specific error message for the user?

[ ] Is there a proper log for the developer?

Step 3: Incremental Implementation
Action: Implement code in small, modular chunks. Avoid writing overly long functions.

Rule: After each small module, re-verify the original requirements to ensure no sub-steps were skipped.

Checklist: * [ ] Is there any "hard-coded" data that should be in .env or config files?

[ ] Are all requirements from the prompt addressed?

Step 4: Quality Assurance & Refinement
Action: Review the code for side effects on existing features and perform "Clean Code" optimization.

Rule: Remove all console.log statements, unused variables, and apply consistent formatting (Linting).

Checklist: * [ ] Is the code readable?

[ ] Do comments explain the "Why" behind complex logic?

Step 5: Documentation & Testing Guide
Action: Provide a summary of changes and a step-by-step manual test plan.

Checklist: * [ ] Are the expected outcomes clearly defined for the user to verify?

2. Strict Technical Standards
Null/Undefined Safety: Always use Optional Chaining (?.) or provide default values when accessing object properties.

Naming Conventions:

Components: PascalCase

Functions/Variables: camelCase

Constants/Env: UPPER_SNAKE_CASE

Data Integrity: All inputs from users or third-party APIs must be validated before processing.

3. Communication & Decision Points
Risk Blocker: IF a requested change is likely to break core system logic, THEN stop and warn the user before proceeding.

Naming Conflict: IF the user's requested variable names conflict with the existing architecture, THEN propose a standardized alternative and wait for approval.

Ambiguity: IF a requirement is vague, THEN list the assumptions made and ask for clarification.