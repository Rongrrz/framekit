# Using FrameKit with an agent

Read [the using-framekit skill](skills/using-framekit/SKILL.md) when building or changing an
application with FrameKit. It explains persistent object identity, lifecycle ownership,
state updates, native interaction, collections, and development tools.

`SKILLS.md` is this project's entry point. The reusable skill folder uses the standard singular
`SKILL.md` filename and includes its own instructions. Both are included in the package archive.
The skill is for application authors; repository implementation conventions live in `.agents/skills`.

For a complete application example and detailed contracts, see the
[application guide](docs/APPLICATION_GUIDE.md). In a repository checkout, run `npm run dev` and
open `/` or `/collections.html`. Use the shared Debug launcher or `/fkdebug` for runtime inspection.
