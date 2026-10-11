# Gridiron Pulse — Weekly Snake Draft

This is a small full-stack sample for the individual assignment. It demonstrates one part of the final app: a user drafting a weekly fantasy football team against four bots in a snake draft.

## What it does

- Uses five total managers: **You** and four bots.
- Starts at a home page where the user collects 100 starter coins and spends 50 coins to enter the weekly draft.
- Shows the contest payout schedule: 1st gets 200 coins, 2nd gets 100 coins, and 3rd gets 50 coins.
- Uses five rounds, so each team drafts one QB, RB, WR, TE, and FLEX player.
- Gives every manager a $1,000 player budget; players with higher projections cost more.
- Creates a snake draft order: You → Bot Blitz → Bot Red Zone → Bot Huddle → Bot Sunday in round one, then reverses in round two.
- Lets the user select a player only when it is their turn.
- Lets the backend choose a valid QB, RB, WR, TE, and RB/WR/TE FLEX player for each bot.
- Prevents duplicate picks and invalid turns on the backend.
- Shows position-filtered players, projected weekly points, slot-based rosters, and a draft board.

## Run it

You need Node.js 20 or newer. This project uses the Express web framework, so install its npm dependencies once before starting the app.

```bash
npm install
npm start
```

Open http://localhost:3000 in a browser.

The player data is currently hard-coded. When the team chooses a sports-data provider, copy `.env.example` to `.env` and put the provider key there. Do not commit `.env` to GitHub.

For automatic restart while developing:

```bash
npm run dev
```

## Front end and back end

- `public/` is the front end: HTML, CSS, and browser JavaScript.
- `server.js` is the Express back end: it owns the player pool, draft order, bot picks, validation, static files, and JSON API routes.
- Draft data is stored in memory, so restarting the server resets the draft. This is intentional for the basic assignment version.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/app` | Returns the account, coin balance, and draft state. |
| POST | `/api/coins/collect` | Collects the 100 starter coins once. |
| POST | `/api/draft/enter` | Deducts the 50-coin entry fee and begins the draft. |
| POST | `/api/draft/pick` | Saves the user’s player pick. |
| POST | `/api/draft/auto-pick` | Lets the current bot make a validated pick. |
| POST | `/api/draft/reset` | Starts a new weekly draft. |

## Good demo script

1. Start the server and collect the 100 starter coins on the home page.
2. Spend 50 coins to enter the weekly draft and point out the payout schedule.
3. Explain that you are drafting against four bots in a five-round snake draft with a $1,000 player budget.
4. Draft a player when the screen says you are on the clock, and point out its price and the remaining budget.
5. Show the four bots automatically draft in order and that round two reverses direction.
6. Finish the draft to show each completed team and the payout reminder.

## Next steps after the individual assignment

- Save users, players, and draft results to a database.
- Add sign-in and private friend drafts.
- Import current NFL player data through a server-side sports-data API.
- Add the six-player fantasy lineup, scoring, and matchup features.
