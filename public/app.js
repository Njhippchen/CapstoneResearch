const playersElement = document.querySelector("#players");
const boardElement = document.querySelector("#draft-board");
const liveRostersElement = document.querySelector("#live-rosters");
const turnElement = document.querySelector("#turn-card");
const messageElement = document.querySelector("#message");
const availableCountElement = document.querySelector("#available-count");
const budgetDisplay = document.querySelector("#budget-display");
const budgetNote = document.querySelector("#budget-note");
const coinDisplay = document.querySelector("#coin-display");
const homeScreen = document.querySelector("#home-screen");
const draftScreen = document.querySelector("#draft-screen");
const completeScreen = document.querySelector("#complete-screen");
const finalRostersElement = document.querySelector("#final-rosters");
const collectButton = document.querySelector("#collect-button");
const enterButton = document.querySelector("#enter-button");
const homeButton = document.querySelector("#home-button");
const draftPanels = document.querySelectorAll(".draft-panel");
const draftTabs = document.querySelectorAll(".draft-tab");

let app;
let botTimer;
let activeFilter = "ALL";
let activeDraftTab = "pick";
const slots = ["QB", "RB", "WR", "TE", "FLEX"];

async function request(path, options = {}) {
  const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function positionClass(position) { return `position ${position.toLowerCase()}`; }
function money(amount) { return `$${amount.toLocaleString()}`; }
function showMessage(message, isError = false) { messageElement.textContent = message; messageElement.className = isError ? "message error" : "message"; }

function rosterRows(roster) {
  return slots.map((slot) => {
    const player = roster.find((item) => item.slot === slot);
    return `<div class="slot-row"><b>${slot}:</b><span>${player ? `${player.name} <small>${money(player.price)} · ${player.projected} proj. pts</small>` : "—"}</span></div>`;
  }).join("");
}

function renderHome() {
  const { account } = app;
  coinDisplay.textContent = `◉ ${account.coins} coins`;
  collectButton.disabled = account.bonusCollected;
  collectButton.textContent = account.bonusCollected ? "Starter Coins Collected" : "Collect 100 Coins";
  enterButton.disabled = account.coins < 50 || account.entered;
  enterButton.textContent = account.entered ? "Weekly Draft Entered" : "Enter Weekly Draft · 50 Coins";
}

function renderBoard(state) {
  boardElement.innerHTML = Array.from({ length: 5 }, (_, roundIndex) => {
    const isReverse = roundIndex % 2 === 1;
    const roundPicks = state.picks.filter((pick) => pick.round === roundIndex + 1);
    const cards = Array.from({ length: 5 }, (_, pickIndex) => {
      const pick = roundPicks[pickIndex];
      return pick ? `<div class="board-pick"><span>${pick.number}. ${pick.manager}</span><b>${pick.player.name}</b><small>${pick.player.slot} · ${money(pick.player.price)} · ${pick.player.projected} proj. pts</small></div>` : `<div class="board-pick pending">Pick pending</div>`;
    }).join("");
    return `<article class="snake-round ${isReverse ? "reverse" : ""}"><h3>Round ${roundIndex + 1}<small>${isReverse ? "right → left" : "left → right"}</small></h3><div class="snake-row">${cards}</div></article>`;
  }).join("");
}

function renderLiveRosters(state) {
  liveRostersElement.innerHTML = state.managers.map((manager) => `<article class="roster ${manager === "You" ? "your-roster" : ""}"><strong>${manager}</strong><span>${state.rosters[manager].length}/5 · ${money(state.budgets[manager])} left</span><div class="slot-list">${rosterRows(state.rosters[manager])}</div></article>`).join("");
}

function setDraftTab(tab) {
  activeDraftTab = tab;
  draftPanels.forEach((panel) => { panel.hidden = panel.id !== `${tab}-panel`; });
  draftTabs.forEach((button) => button.classList.toggle("active", button.dataset.draftTab === tab));
}

function renderDraft() {
  const state = app.draft;
  const isYourTurn = state.current?.manager === "You";
  const complete = state.status === "complete";
  homeScreen.hidden = true;
  draftScreen.hidden = complete;
  completeScreen.hidden = !complete;
  if (complete) {
    finalRostersElement.innerHTML = state.managers.map((manager) => `<article class="roster ${manager === "You" ? "your-roster" : ""}"><strong>${manager}</strong><span>${money(state.budgets[manager])} left</span><div class="slot-list">${rosterRows(state.rosters[manager])}</div></article>`).join("");
    return;
  }

  turnElement.innerHTML = `<p class="eyebrow">PICK ${state.current.number} · ROUND ${state.current.round}</p><h2>${isYourTurn ? "You are on the clock" : `${state.current.manager} is picking`}</h2><p>${isYourTurn ? "Choose a player who fits your remaining budget." : "The bot will choose automatically."}</p>`;
  budgetDisplay.textContent = money(state.budgets.You);
  budgetNote.textContent = `${state.rosters.You.length}/5 players selected`;
  availableCountElement.textContent = `${state.availablePlayers.length} available`;
  const shownPlayers = state.availablePlayers.filter((player) => activeFilter === "ALL" || player.position === activeFilter || (activeFilter === "FLEX" && player.position !== "QB"));
  playersElement.innerHTML = shownPlayers.map((player) => {
    const cannotAfford = player.price > state.budgets.You;
    return `<article class="player-card"><div class="player-main"><span class="${positionClass(player.position)}">${player.position}</span><div><strong>${player.name}</strong><small>${player.team} · ${player.projected} projected pts · <b>${money(player.price)}</b></small></div></div><button class="pick-button" data-player-id="${player.id}" ${isYourTurn && !cannotAfford ? "" : "disabled"}>${money(player.price)}</button></article>`;
  }).join("");
  renderBoard(state);
  renderLiveRosters(state);
  setDraftTab(activeDraftTab);
  document.querySelectorAll(".pick-button").forEach((button) => button.addEventListener("click", () => pickPlayer(button.dataset.playerId)));
  if (!isYourTurn) botTimer = setTimeout(autoPick, 850);
}

function render() {
  clearTimeout(botTimer);
  coinDisplay.textContent = `◉ ${app.account.coins} coins`;
  if (!app.account.entered || !app.draft) {
    homeScreen.hidden = false;
    draftScreen.hidden = true;
    completeScreen.hidden = true;
    renderHome();
    return;
  }
  renderDraft();
}

async function loadApp() { try { app = await request("/api/app"); render(); } catch (error) { console.error(error); } }
async function collectCoins() { try { app = await request("/api/coins/collect", { method: "POST" }); render(); } catch (error) { alert(error.message); } }
async function enterDraft() { try { app = await request("/api/draft/enter", { method: "POST" }); render(); } catch (error) { alert(error.message); } }
async function pickPlayer(playerId) { try { showMessage("Saving your pick…"); app = await request("/api/draft/pick", { method: "POST", body: JSON.stringify({ playerId }) }); showMessage("Pick saved. Bots are drafting next."); render(); } catch (error) { showMessage(error.message, true); } }
async function autoPick() { try { app = await request("/api/draft/auto-pick", { method: "POST" }); render(); } catch (error) { showMessage(error.message, true); } }

collectButton.addEventListener("click", collectCoins);
enterButton.addEventListener("click", enterDraft);
homeButton.addEventListener("click", async () => { try { app = await request("/api/draft/reset", { method: "POST" }); render(); } catch (error) { alert(error.message); } });
document.querySelectorAll(".filter-tab").forEach((button) => button.addEventListener("click", () => { activeFilter = button.dataset.filter; document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab === button)); renderDraft(); }));
draftTabs.forEach((button) => button.addEventListener("click", () => setDraftTab(button.dataset.draftTab)));
loadApp();
