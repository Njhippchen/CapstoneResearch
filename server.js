import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 3000);
const publicDirectory = join(process.cwd(), "public");

// SPORTS-DATA API KEY PLACEHOLDER
// This milestone demo uses hard-coded players so it runs without an API key.
// When the team connects to a real provider, place SPORTS_DATA_API_KEY in a
// local .env file and read it with process.env. Never commit a real key.
// See .env.example for the template.
const sportsDataApiKey = process.env.SPORTS_DATA_API_KEY || "";
void sportsDataApiKey;

const managers = ["You", "Bot Blitz", "Bot Red Zone", "Bot Huddle", "Bot Sunday"];
const fixedSlots = ["QB", "RB", "WR", "TE"];

const playerPool = [
  ["p01", "Josh Allen", "QB", "BUF", 1], ["p02", "Lamar Jackson", "QB", "BAL", 2],
  ["p03", "Jalen Hurts", "QB", "PHI", 3], ["p04", "Joe Burrow", "QB", "CIN", 4],
  ["p05", "Patrick Mahomes", "QB", "KC", 5], ["p06", "Jahmyr Gibbs", "RB", "DET", 6],
  ["p07", "Saquon Barkley", "RB", "PHI", 7], ["p08", "Bijan Robinson", "RB", "ATL", 8],
  ["p09", "Christian McCaffrey", "RB", "SF", 9], ["p10", "Derrick Henry", "RB", "BAL", 10],
  ["p11", "Ja'Marr Chase", "WR", "CIN", 11], ["p12", "Justin Jefferson", "WR", "MIN", 12],
  ["p13", "CeeDee Lamb", "WR", "DAL", 13], ["p14", "Amon-Ra St. Brown", "WR", "DET", 14],
  ["p15", "Puka Nacua", "WR", "LAR", 15], ["p16", "Malik Nabers", "WR", "NYG", 16],
  ["p17", "Sam LaPorta", "TE", "DET", 17], ["p18", "Brock Bowers", "TE", "LV", 18],
  ["p19", "Trey McBride", "TE", "ARI", 19], ["p20", "George Kittle", "TE", "SF", 20],
  ["p21", "Breece Hall", "RB", "NYJ", 21], ["p22", "De'Von Achane", "RB", "MIA", 22],
  ["p23", "Nico Collins", "WR", "HOU", 23], ["p24", "A.J. Brown", "WR", "PHI", 24],
  ["p25", "Josh Jacobs", "RB", "GB", 25], ["p26", "Drake London", "WR", "ATL", 26],
  ["p27", "Jonathan Taylor", "RB", "IND", 27], ["p28", "Garrett Wilson", "WR", "NYJ", 28],
  ["p29", "Mark Andrews", "TE", "BAL", 29], ["p30", "Kyren Williams", "RB", "LAR", 30]
].map(([id, name, position, team, rank]) => ({
  id, name, position, team, rank,
  projected: Number((27 - rank * 0.55).toFixed(1)),
  price: Math.round(55 + (27 - rank * 0.55) * 6.5)
}));

function createDraft() {
  return {
    picks: [],
    rosters: Object.fromEntries(managers.map((manager) => [manager, []])),
    budgets: Object.fromEntries(managers.map((manager) => [manager, 1000])),
    status: "active"
  };
}

let account = { coins: 0, bonusCollected: false, entered: false };
let draft = null;

function currentManager() {
  if (!draft || draft.status !== "active") return null;
  const roundIndex = Math.floor(draft.picks.length / managers.length);
  const pickInRound = draft.picks.length % managers.length;
  const order = roundIndex % 2 === 0 ? managers : [...managers].reverse();
  return order[pickInRound];
}

function makePick(manager, playerId) {
  if (draft.status !== "active") return { error: "The draft is already complete." };
  if (currentManager() !== manager) return { error: `It is ${currentManager()}'s turn.` };
  const player = playerPool.find((item) => item.id === playerId);
  if (!player) return { error: "Player was not found." };
  if (draft.picks.some((pick) => pick.player.id === playerId)) return { error: "That player was already drafted." };
  if (draft.budgets[manager] < player.price) return { error: `${manager} does not have enough budget for ${player.name}.` };
  const slot = nextSlot(draft.rosters[manager], player);
  if (!slot) return { error: "That player does not fit an open roster slot." };

  const draftedPlayer = { ...player, slot };
  draft.picks.push({ number: draft.picks.length + 1, round: Math.floor((draft.picks.length) / managers.length) + 1, manager, player: draftedPlayer });
  draft.rosters[manager].push(draftedPlayer);
  draft.budgets[manager] -= player.price;
  if (draft.picks.length === managers.length * 5) draft.status = "complete";
  return { success: true };
}

function nextSlot(roster, player) {
  if (!roster.some((drafted) => drafted.slot === player.position)) return player.position;
  if (player.position !== "QB" && !roster.some((drafted) => drafted.slot === "FLEX")) return "FLEX";
  return null;
}

function chooseBotPlayer(manager) {
  const roster = draft.rosters[manager];
  const missingFixedSlot = fixedSlots.find((slot) => !roster.some((player) => player.slot === slot));
  return playerPool
    .filter((player) => !draft.picks.some((pick) => pick.player.id === player.id))
    .filter((player) => player.price <= draft.budgets[manager])
    .filter((player) => missingFixedSlot ? player.position === missingFixedSlot : player.position !== "QB")
    .filter((player) => nextSlot(roster, player))
    .sort((a, b) => a.rank - b.rank)[0];
}

function draftState() {
  const manager = currentManager();
  return {
    managers,
    picks: draft.picks,
    rosters: draft.rosters,
    budgets: draft.budgets,
    availablePlayers: playerPool.filter((player) => !draft.picks.some((pick) => pick.player.id === player.id)),
    status: draft.status,
    current: manager ? { manager, number: draft.picks.length + 1, round: Math.floor(draft.picks.length / managers.length) + 1 } : null
  };
}

function appState() {
  return { account, draft: draft ? draftState() : null };
}

async function parseBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const contentTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

async function serveStatic(response, urlPath) {
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = normalize(join(publicDirectory, requested));
  if (!filePath.startsWith(publicDirectory)) return sendJson(response, 403, { error: "Forbidden" });
  try {
    const data = await readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream" });
    response.end(data);
  } catch {
    sendJson(response, 404, { error: "Not found" });
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === "GET" && url.pathname === "/api/app") return sendJson(response, 200, appState());
    if (request.method === "POST" && url.pathname === "/api/coins/collect") {
      if (!account.bonusCollected) {
        account.coins += 100;
        account.bonusCollected = true;
      }
      return sendJson(response, 200, appState());
    }
    if (request.method === "POST" && url.pathname === "/api/draft/enter") {
      if (account.entered) return sendJson(response, 400, { error: "You have already entered this weekly draft." });
      if (account.coins < 50) return sendJson(response, 400, { error: "Collect your 100 starter coins before entering." });
      account.coins -= 50;
      account.entered = true;
      draft = createDraft();
      return sendJson(response, 200, appState());
    }
    if (request.method === "POST" && url.pathname === "/api/draft/pick") {
      if (!draft) return sendJson(response, 400, { error: "Enter the weekly draft first." });
      const body = await parseBody(request);
      const result = makePick("You", body.playerId);
      return sendJson(response, result.error ? 400 : 200, result.error ? result : appState());
    }
    if (request.method === "POST" && url.pathname === "/api/draft/auto-pick") {
      if (!draft) return sendJson(response, 400, { error: "Enter the weekly draft first." });
      const manager = currentManager();
      if (!manager || manager === "You") return sendJson(response, 400, { error: "It is not a bot turn." });
      const player = chooseBotPlayer(manager);
      if (!player) return sendJson(response, 400, { error: `${manager} cannot afford an available player.` });
      const result = makePick(manager, player.id);
      return sendJson(response, result.error ? 400 : 200, result.error ? result : appState());
    }
    if (request.method === "POST" && url.pathname === "/api/draft/reset") {
      account = { coins: 0, bonusCollected: false, entered: false };
      draft = null;
      return sendJson(response, 200, appState());
    }
    if (request.method === "GET") return serveStatic(response, url.pathname);
    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Server error" });
  }
}).listen(port, () => console.log(`Gridiron Pulse draft running at http://localhost:${port}`));
