# Lessons Learned

## Workflow
- `.env` files are blocked by permission settings — tell user to create them manually instead of retrying
- Commits: short single-line message, no Co-Authored-By tag

## Frontend / CSS
- Custom CSS classes (`.text-paper`) do NOT work with Tailwind variant prefixes (`dark:text-paper`). Colors must be registered in `tailwind.config.js` for `dark:`, `hover:`, opacity modifiers (`/60`) etc. to generate correct CSS
- When dark mode text is invisible, check if the color is in tailwind config, not just in a raw CSS class
- **CRITICAL**: The app at localhost:9000 serves from `client/dist/` (Express static files). Source file changes require `pnpm build` in `frontend/client/` to take effect! Always rebuild after making changes before asking user to verify
- Prefer `text-foreground` and `text-muted-foreground` (CSS variable-based) over custom `text-obsidian dark:text-paper` pairs — they work in both themes automatically
