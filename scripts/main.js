/*
  Declaration of global variables
*/

//Product info variables
let productName;
let productPrice;
let productImage;

//Timeout IDs
let shakeTimeout;
let toastTimeout;
let warningTimeout;

//Number of archive entries currently listed
let archiveShown = 0;

/*
  Global variable constants
*/

//The day HVADPRISEN? was launched. Used to find game number each day
const gameStartDate = new Date("10/22/2026");
const gameNumber = getGameNumber();

//Game being played: today's, or a past one picked from the archive (?spil=N)
const playedGameNumber = getPlayedGameNumber();
const isArchiveGame = playedGameNumber !== gameNumber;

//Archive entries listed per "Vis flere" click
const archivePageSize = 30;

//Link included when sharing results
const gameUrl = window.location.origin + window.location.pathname;

//Game data from games.json, loaded once and reused by the archive
let gamesData;
//"no-cache" checks for a newer file on every load, so product edits show up right away
const gamesPromise = fetch("./games.json", { cache: "no-cache" })
  .then((response) => response.json())
  .then((json) => (gamesData = json));

//Elements with event listeners to play the game
const input = document.getElementById("guess-input");
const buttonInput = document.getElementById("guess-button");

const infoButton = document.getElementById("info-button");
infoButton.addEventListener("click", switchState);

const statButton = document.getElementById("stat-button");
statButton.addEventListener("click", switchState);

const archiveButton = document.getElementById("archive-button");
archiveButton.addEventListener("click", switchState);

document
  .getElementById("archive-more")
  .addEventListener("click", renderArchiveEntries);

//User stats object
const userStats = JSON.parse(localStorage.getItem("stats")) || {
  numGames: 0,
  numWins: 0,
  winsInNum: [0, 0, 0, 0, 0, 0],
  currentStreak: 0,
  maxStreak: 0,
};

//Daily game state, used for streaks and stats
const dailyState = JSON.parse(localStorage.getItem("state")) || {
  gameNumber: -1,
  guesses: [],
  hasWon: false,
};

//Results of every game played, keyed by game number
const results = JSON.parse(localStorage.getItem("results")) || {};

//Keep the last daily game in the archive results if it was played before results existed
if (dailyState.gameNumber > 0 && !results[dailyState.gameNumber]) {
  results[dailyState.gameNumber] = {
    guesses: dailyState.guesses,
    hasWon: dailyState.hasWon,
  };
}

//State of the game being played. Archive games never touch the daily state
const gameState = isArchiveGame
  ? {
      gameNumber: playedGameNumber,
      guesses: results[playedGameNumber]?.guesses || [],
      hasWon: results[playedGameNumber]?.hasWon || false,
    }
  : dailyState;

/*
  Starts playing the game. Called at beginning of execution
*/

playGame();

function playGame() {
  fetchGameData(playedGameNumber);
}

/*
  Acquiring Game Data
*/

//Fetches the chosen game's data from the json and starts game
function fetchGameData(gameNumber) {
  gamesPromise.then(() => {
    const game = getGame(gameNumber);

    productName = game.name;
    //Prices are stored like "24.95 kr."
    productPrice = parseFloat(game.price);
    productImage = game.image;

    initializeGame();
  });
}

//Cycle through the product list so a short list never runs out
function getGame(gameNumber) {
  const gameCount = Object.keys(gamesData).length;
  return gamesData[`game-${((gameNumber - 1) % gameCount) + 1}`];
}

//Saves the current game's result, plus the daily state when playing today's game
function saveGameState() {
  results[gameState.gameNumber] = {
    guesses: gameState.guesses,
    hasWon: gameState.hasWon,
  };
  localStorage.setItem("results", JSON.stringify(results));

  if (!isArchiveGame) {
    localStorage.setItem("state", JSON.stringify(gameState));
  }
}

/*
  Used to initialize the game board using the current game state
*/

function initializeGame() {
  //Reset game state and track new game if user last played on a previous day
  if (!isArchiveGame && gameState.gameNumber !== gameNumber) {
    if (gameState.hasWon === false) {
      userStats.currentStreak = 0;
    }
    gameState.gameNumber = gameNumber;
    gameState.guesses = [];
    gameState.hasWon = false;
    userStats.numGames++;

    localStorage.setItem("stats", JSON.stringify(userStats));
    localStorage.setItem("state", JSON.stringify(gameState));
  }

  if (isArchiveGame) {
    displayArchiveBanner();
  }

  displayProductCard();

  updateGameBoard();

  if (gameState.guesses.length < 6 && !gameState.hasWon) {
    addEventListeners();
  } else {
    convertToShareButton();
  }
}

function convertToShareButton() {
  const containerElem = document.getElementById("input-container");
  const shareButtonElem = document.createElement("button");
  shareButtonElem.setAttribute("id", "share-button");
  containerElem.innerHTML = "";
  shareButtonElem.innerHTML = `Del
  <img src="./assets/share-icon.svg" class="share-icon" />`;
  shareButtonElem.addEventListener("click", copyStats);
  containerElem.appendChild(shareButtonElem);
}

function displayProductCard() {
  //First, update the image container with the new product image
  const imageContainer = document.getElementById("image-container");

  //Create a new image element to dynamically store game image
  const productImageElement = document.createElement("img");
  productImageElement.src = productImage;
  productImageElement.setAttribute("id", "product-image");

  //Add created image to the image container
  imageContainer.appendChild(productImageElement);

  //Select product info element and update the html to display product name
  const productInfo = document.getElementById("product-info");
  productInfo.innerHTML = `<center>${productName}</center>`;
}

function updateGameBoard() {
  updateGuessStat();

  gameState.guesses.forEach((guess, index) => displayGuess(guess, index + 1));
}

function updateGuessStat() {
  const guessStats = document.getElementById("game-stats");
  if (gameState.hasWon) {
    guessStats.innerHTML = `<center>Du vandt! Tillykke! 🎉</center>`;
    guessStats.innerHTML += `<center>Prisen var ${productPrice.toFixed(2)} kr.</center>`;
    return;
  }

  if (gameState.guesses.length === 6) {
    guessStats.innerHTML = `<center>Bedre held næste gang!</center>`;
    guessStats.innerHTML += `<center>Prisen var ${productPrice.toFixed(2)} kr.</center>`;
  } else {
    guessStats.innerHTML = `Gæt: ${gameState.guesses.length + 1}/6`;
  }
}

/*
  Event Listeners
*/

//Text input event listener to submit guess when user presses "Enter"
function inputEventListener(event) {
  if (event.key === "Enter") {
    handleInput();
  }
}

//Button event listener to submit guess when user presses guess button
function buttonEventListener() {
  handleInput();
}

function handleInput() {
  const strippedString = input.value.replaceAll(",", "");
  const guess = Number(strippedString).toFixed(2);

  if (isNaN(guess) || !strippedString) {
    displayWarning();
    return;
  }

  checkGuess(guess);

  input.value = "";

  function displayWarning() {
    clearTimeout(warningTimeout);

    const warningElem = document.getElementById("warning-toast");
    warningElem.classList.remove("hide");
    warningElem.classList.add("animate__flipInX");

    warningTimeout = setTimeout(() => {
      warningElem.classList.remove("animate__flipInX");
      warningElem.classList.add("animate__flipOutX");
      setTimeout(() => {
        warningElem.classList.remove("animate__flipOutX");
        warningElem.classList.add("hide");
      }, 1000);
    }, 2000);
  }
}

function copyStats() {
  let output = `HVADPRISEN? #${playedGameNumber}`;
  if (!gameState.hasWon) {
    output += ` X/6\n`;
  } else {
    output += ` ${gameState.guesses.length}/6\n`;
  }

  gameState.guesses.forEach((guess) => {
    switch (guess.direction) {
      case "&uarr;":
        output += `⬆️`;
        break;
      case "&darr;":
        output += `⬇️`;
        break;
      case "&check;":
        output += `✅`;
        break;
    }

    switch (guess.closeness) {
      case "guess-far":
        output += `🟥`;
        break;
      case "guess-near":
        output += `🟨`;
        break;
    }
    output += `\n`;
  });

  const isMobile =
    navigator.userAgent.match(/Android/i) ||
    navigator.userAgent.match(/webOS/i) ||
    navigator.userAgent.match(/iPhone/i) ||
    navigator.userAgent.match(/iPad/i) ||
    navigator.userAgent.match(/iPod/i) ||
    navigator.userAgent.match(/BlackBerry/i) ||
    navigator.userAgent.match(/Windows Phone/i) ||
    navigator.userAgent.match(/IEMobile/i) ||
    navigator.userAgent.match(/Opera Mini/i);

  if (isMobile) {
    if (navigator.canShare) {
      navigator
        .share({
          title: "HVADPRISEN?",
          text: output,
          url: getGameLink(playedGameNumber),
        })
        .catch((error) => console.error("Share failed:", error));
    }
  } else {
    output += getGameLink(playedGameNumber);
    navigator.clipboard.writeText(output);
    displayToast();
  }

  function displayToast() {
    clearTimeout(toastTimeout);

    const toastElem = document.getElementById("share-toast");
    toastElem.classList.remove("hide");
    toastElem.classList.add("animate__flipInX");

    toastTimeout = setTimeout(() => {
      toastElem.classList.remove("animate__flipInX");
      toastElem.classList.add("animate__flipOutX");
      setTimeout(() => {
        toastElem.classList.remove("animate__flipOutX");
        toastElem.classList.add("hide");
      }, 1000);
    }, 3000);
  }
}

function addEventListeners() {
  input.addEventListener("keydown", inputEventListener);
  buttonInput.addEventListener("click", buttonEventListener);

  input.addEventListener("focus", () => {
    input.setAttribute("placeholder", "0.00");
  });
  input.addEventListener("blur", () => {
    input.setAttribute("placeholder", "Indtast et gæt...");
  });
}

function removeEventListeners() {
  buttonInput.setAttribute("disabled", "");
  buttonInput.classList.remove("active");
  input.setAttribute("disabled", "");
  input.setAttribute("placeholder", "Spillet er slut!");
  input.removeEventListener("keydown", inputEventListener);
  buttonInput.removeEventListener("click", buttonEventListener);
}

/*
  Handles the logic of HVADPRISEN?
  Creates a guess object based on user guess and checks win condition
*/

function checkGuess(guess) {
  const guessObj = { guess, closeness: "", direction: "" };

  const percentAway = calculatePercent(guess);

  //A guess wins within 50 øre of the price. Compared in øre to avoid rounding errors
  const oreAway = Math.round(guess * 100) - Math.round(productPrice * 100);

  if (Math.abs(oreAway) <= 50) {
    guessObj.closeness = "guess-win";
    gameState.hasWon = true;
  } else {
    shakeBox();
    if (Math.abs(percentAway) <= 25) {
      guessObj.closeness = "guess-near";
    } else {
      guessObj.closeness = "guess-far";
    }
  }

  if (gameState.hasWon) {
    guessObj.direction = "&check;";
  } else if (percentAway < 0) {
    guessObj.direction = "&uarr;";
  } else {
    guessObj.direction = "&darr;";
  }

  gameState.guesses.push(guessObj);
  saveGameState();

  displayGuess(guessObj);

  if (gameState.hasWon) {
    gameWon();
  } else if (gameState.guesses.length === 6) {
    gameLost();
  }
}

/*
  Displays guess object from either game state or a new guess
*/

function displayGuess(guess, index = gameState.guesses.length) {
  const guessContainer = document.getElementById(index);
  const guessValueContainer = document.createElement("div");
  const infoContainer = document.createElement("div");

  guessValueContainer.classList.add(
    "guess-value-container",
    "animate__flipInX"
  );

  infoContainer.classList.add("guess-direction-container", "animate__flipInX");

  guessValueContainer.innerHTML = `${guess.guess} kr.`;

  infoContainer.classList.add(guess.closeness);
  infoContainer.innerHTML = guess.direction;

  guessContainer.classList.add("animate__flipOutX");

  setTimeout(() => {
    guessContainer.classList.add("transparent-background");
    guessContainer.appendChild(guessValueContainer);
    guessContainer.appendChild(infoContainer);
  }, 500);

  updateGuessStat();
}

/*
  Helper function to compute guess accuracy
*/

function calculatePercent(guess) {
  return ((guess * 100) / (productPrice * 100)) * 100 - 100;
}

/* 
  End state function to handle win/loss conditions
*/

function gameWon() {
  gameState.hasWon = true;
  saveGameState();

  //Archive games don't count toward streaks or stats
  if (!isArchiveGame) {
    userStats.numWins++;
    userStats.currentStreak++;
    userStats.winsInNum[gameState.guesses.length - 1]++;
    if (userStats.currentStreak > userStats.maxStreak) {
      userStats.maxStreak = userStats.currentStreak;
    }
    localStorage.setItem("stats", JSON.stringify(userStats));
  }

  removeEventListeners();
  convertToShareButton();
}

function gameLost() {
  if (!isArchiveGame) {
    userStats.currentStreak = 0;
    localStorage.setItem("stats", JSON.stringify(userStats));
  }

  removeEventListeners();
  convertToShareButton();
}

/*
  DOM manipulation functions for overlays and animations
*/

function switchState(event) {
  const overlayBtnClicked = event.currentTarget.dataset.overlay;
  const overlayElem = document.getElementById(overlayBtnClicked);
  const title = document.getElementById("title");

  if (title.classList.contains("info-title")) {
    title.classList.remove("info-title");
  }

  if (overlayElem.style.display === "flex") {
    title.innerHTML = `<center>HVAD<span class="brand-red">PRISEN?</span></center>`;
    overlayElem.style.display = "none";
    return;
  }

  document
    .querySelectorAll(".overlay")
    .forEach((overlay) => (overlay.style.display = "none"));

  if (overlayBtnClicked === "info-overlay") {
    renderInfo();
  } else if (overlayBtnClicked === "archive-overlay") {
    renderArchive();
  } else {
    renderStats();
  }

  function renderArchive() {
    title.innerHTML = `SPIL<span class="brand-red">ARKIV</span>`;
    overlayElem.style.display = "flex";

    //Rebuild the list each time so results from this session are current
    document.getElementById("archive-list").innerHTML = "";
    archiveShown = 0;
    gamesPromise.then(renderArchiveEntries);
  }

  function renderInfo() {
    title.innerHTML = `SÅDAN <span class="brand-red">SPILLES</span>`;
    if (!title.classList.contains("info-title")) {
      title.classList.add("info-title");
    }
    overlayElem.style.display = "flex";
  }

  function renderStats() {
    title.innerHTML = `DIN <span class="brand-red">STATISTIK</span>`;

    renderStatistics();
    graphDistribution();

    overlayElem.style.display = "flex";

    function renderStatistics() {
      const numWinsElem = document.getElementById("number-wins");
      numWinsElem.innerHTML = `${userStats.numGames}`;

      const winPercentElem = document.getElementById("win-percent");
      if (userStats.numGames === 0) {
        winPercentElem.innerHTML = `0`;
      } else {
        winPercentElem.innerHTML = `${Math.round(
          (userStats.numWins / userStats.numGames) * 100
        )}`;
      }

      const currentStreakElem = document.getElementById("current-streak");
      currentStreakElem.innerHTML = `${userStats.currentStreak}`;

      const maxStreakElem = document.getElementById("max-streak");
      maxStreakElem.innerHTML = `${userStats.maxStreak}`;
    }

    function graphDistribution() {
      userStats.winsInNum.forEach((value, index) => {
        const graphElem = document.getElementById(`graph-${index + 1}`);
        if (userStats.numWins === 0) {
          graphElem.style = `width: 5%`;
        } else {
          graphElem.style = `width: ${
            Math.floor((value / userStats.numWins) * 0.95 * 100) + 5
          }%`;
        }
        graphElem.innerHTML = `${value}`;
      });
    }
  }
}

function shakeBox() {
  clearTimeout(shakeTimeout);
  const infoCard = document.getElementById("info-card");
  if (infoCard.classList.contains("animate__headShake")) {
    infoCard.classList.remove("animate__headShake");
  }
  shakeTimeout = setTimeout(
    () => infoCard.classList.add("animate__headShake"),
    100
  );
}

/*
  Archive: lists past games newest first, archivePageSize at a time
*/

function renderArchiveEntries() {
  const listElem = document.getElementById("archive-list");
  const moreButton = document.getElementById("archive-more");
  const last = Math.max(gameNumber - archiveShown - archivePageSize, 0);

  for (let number = gameNumber - archiveShown; number > last; number--) {
    listElem.appendChild(createArchiveEntry(number));
  }
  archiveShown = gameNumber - last;

  moreButton.classList.toggle("hide", last === 0);
}

function createArchiveEntry(number) {
  const game = getGame(number);
  const result = results[number];

  const entryElem = document.createElement("a");
  entryElem.classList.add("archive-entry");
  if (number === playedGameNumber) {
    entryElem.classList.add("archive-current");
  }
  entryElem.href = getGameLink(number);

  let status = `<span class="archive-status">Ikke spillet</span>`;
  if (result?.hasWon) {
    status = `<span class="archive-status status-won">Vundet ${result.guesses.length}/6</span>`;
  } else if (result?.guesses.length === 6) {
    status = `<span class="archive-status status-lost">Tabt</span>`;
  } else if (result?.guesses.length > 0) {
    status = `<span class="archive-status">I gang ${result.guesses.length}/6</span>`;
  }

  const dateLabel =
    number === gameNumber ? "I dag" : formatGameDate(getGameDate(number));

  entryElem.innerHTML = `
    <img src="${game.image}" class="archive-image" loading="lazy" alt="" />
    <div class="archive-details">
      <div class="archive-title">#${number} · ${dateLabel}</div>
      <div class="archive-name">${game.name}</div>
    </div>
    ${status}`;

  return entryElem;
}

function displayArchiveBanner() {
  const bannerElem = document.getElementById("archive-banner");
  bannerElem.innerHTML = `Arkivspil #${playedGameNumber} · ${formatGameDate(
    getGameDate(playedGameNumber)
  )} · <a href="${getGameLink(gameNumber)}">Til dagens spil</a>`;
  bannerElem.title = "Arkivspil tæller ikke med i din statistik";
  bannerElem.classList.remove("hide");
}

//Link to a game: today's game is the plain page, past games use ?spil=N
function getGameLink(number) {
  return number === gameNumber ? gameUrl : `${gameUrl}?spil=${number}`;
}

function getGameDate(number) {
  const date = new Date(gameStartDate);
  date.setDate(date.getDate() + number - 1);
  return date;
}

function formatGameDate(date) {
  return date.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

//Reads ?spil=N from the URL. Anything other than a past game number means today's game
function getPlayedGameNumber() {
  const requested = Number(new URLSearchParams(location.search).get("spil"));

  if (Number.isInteger(requested) && requested >= 1 && requested < gameNumber) {
    return requested;
  }
  return gameNumber;
}

/*
  Finds current game number based off of the game start date
*/

function getGameNumber() {
  const currDate = new Date();
  let timeDifference = currDate.getTime() - gameStartDate.getTime();
  let dayDifference = timeDifference / (1000 * 3600 * 24);

  return Math.floor(dayDifference) + 1;
}

