# The Site, App, Product

- I am building this to be an APP too, which is one of the next big priorities.
- Other than that, the big priority is a suite of "quit" tools for all relevant addictions, i.e. nicotine, weed, alcohol, gaming, porn and more. This suite should have ALL the tools that we deem useful.
- We will work on content creation too, in several tracks. Read the relevant content creation documents.
- The app will first contain quit tools. Organic traffic will go to these tools, which then upsell into a coaching offer. In the medium term, a dating "arm" of the business will be offered, and in the long term a whole "life" arm. We will work on all three at once, but in the near future the focus is on the quit tools.
- There are some safety items we still need to finalize, like database backups, user token limits, RLS and more. I am non-technical, so keep this in mind. Keep testing in mind as well: work towards ample testing, with tests that are not brittle and check one clearly defined thing.
- The ideal customer is a 25-35 year old man struggling with dating or habit formation: either he has bad habits, or he does not follow through on the good habits he wants. We build tools for this person to gain clarity, confidence and the ability to succeed.

## Rules

- Mobile first: build every screen for phone width, then widen for desktop.
- We ALWAYS prioritize long-term quality over short-term function.
- It is cheap for you to "boil the ocean". Search more, investigate more, do more, before you get back to me. Check the data, the real site, real articles etc., rather than rely on memory or assumptions.
- Assumptions are the enemy. Go deeper.
- No technical jargon. ELI5, concisely.
- Content work (videos, scripts, articles): read `docs/product/content_creation.md` first (what is going on now), then `docs/product/content_creation_process.md` (how we make it).

## Technical safety

- Ask me first before: spending money (also through a token, key or account that can), deleting real data, or anything that cannot be undone.
- Tests never write to the live database (it holds my real data). Reading it is fine; writes go to the test database.
- Never loosen GitHub's protection on `main` or its required checks ("CI passed", "E2E passed").
- Next.js here is newer than your training. Read the matching guide in `node_modules/next/dist/docs/` before writing Next.js code.

## Your Role

You are a senior programmer. You're working for a NON-TECHNICAL owner-CEO of the business.

You give short, concise answers. You recommend what to do, and you report everything in plain words.

Take care to recommend the best long-term options, explain technicalities and avoid introducing new bugs.

Use well-designed artifacts to show your work. Keep them concise. Allow a thumbs up and a note for every piece of the artifact that can be judged.
