// The store will hold all information needed globally
let store = {
  track_id: undefined,
  track_name: undefined,
  player_id: undefined,
  player_name: undefined,
  race_id: undefined,
};

// We need our javascript to wait until the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  onPageLoad();
  setupClickHandlers();
});

async function onPageLoad() {
  console.log("Getting form info for dropdowns!");
  try {
    getTracks().then((tracks) => {
      const html = renderTrackCards(tracks);
      renderAt("#tracks", html);
    });

    getRacers().then((racers) => {
      const html = renderRacerCars(racers);
      renderAt("#racers", html);
    });
  } catch (error) {
    console.log("Problem getting tracks and racers: ", error.message);
    console.error(error);
  }
}

function setupClickHandlers() {
  document.addEventListener(
    "click",
    function (event) {
      const { target } = event;

      // Race track form field
      if (target.matches(".card.track")) {
        handleSelectTrack(target);
        store.track_id = target.id;
        store.track_name = target.innerHTML;
      }

      // Racer form field
      if (target.matches(".card.racer")) {
        handleSelectRacer(target);
        store.player_id = target.id;
        store.player_name = target.innerHTML;
      }

      // Submit create race form
      if (target.matches("#submit-create-race")) {
        event.preventDefault();

        // start race
        handleCreateRace();
      }

      // Handle acceleration click
      if (target.matches("#gas-peddle")) {
        handleAccelerate();
      }

      console.log("Store updated :: ", store);
    },
    false
  );
}

async function delay(ms) {
  try {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  } catch (error) {
    console.log("an error shouldn't be possible here");
    console.log(error);
  }
}

// This async function controls the flow of the race, add the logic and error handling
async function handleCreateRace() {
  console.log("in create race");

  // render starting UI
  renderAt("#race", renderRaceStartView(store.track_name));

  let [player_id, track_id] = [store.player_id, store.track_id];

  const race = await createRace(player_id, track_id);

  console.log("RACE: ", race);
  store.race_id = race.ID;

  await runCountdown();

  await startRace(store.race_id);

  await runRace(store.race_id);
}

async function runRace(raceID) {
  try {
    return await new Promise((resolve) => {
      let raceInterval = setInterval(async () => {
        const results = await getRace(raceID);
        console.log(`Results: ${results.status}`)
        const status = results.status;

        if (status === "in-progress") {
          renderAt("#leaderBoard", raceProgress(results.positions));
        } else if (status === "finished") {
          clearInterval(raceInterval); // To stop the interval from repeating
          renderAt("#race", resultsView(results.positions)); // To render the results view
          resolve(results); // Resolve the promise
        }
      }, 500);
    });
  } catch (err) {
    return console.error(`Error while running race: ${err}`);
  }
}

async function runCountdown() {
  try {
    // Wait for the DOM to load
    await delay(1000);
    let timer = 3;

    return new Promise((resolve) => {
      const countdownInterval = setInterval(() => {
        document.getElementById("big-numbers").innerHTML = --timer;
        if (timer <= 0) {
          clearInterval(countdownInterval);
          resolve();
        }
      }, 1000);
    });
  } catch (err) {
    console.log(`Error while running countdown: ${err}`);
  }
}

function handleSelectRacer(target) {
  console.log("selected a racer", target.id);

  // remove class selected from all racer options
  const selected = document.querySelector("#racers .selected");
  if (selected) {
    selected.classList.remove("selected");
  }

  // add class selected to current target
  target.classList.add("selected");
}

function handleSelectTrack(target) {
  console.log("selected track", target.id);

  // remove class selected from all track options
  const selected = document.querySelector("#tracks .selected");
  if (selected) {
    selected.classList.remove("selected");
  }

  // add class selected to current target
  target.classList.add("selected");
}

function handleAccelerate() {
  console.log("Accelerate button clicked");
  accelerate(store.race_id);
}

// HTML views

function renderRacerCars(racers) {
  if (!racers.length) {
    return `
			<h4>Loading Racers...</4>
		`;
  }

  const results = racers.map(renderRacerCard).join("");

  return `
		<ul id="racers">
			${results}
		</ul>
	`;
}

function renderRacerCard(racer) {
  const { id, driver_name, top_speed, acceleration, handling } = racer;
  return `<h4 class="card racer" id="${id}">${driver_name}</h3>`;
}

function renderTrackCards(tracks) {
  if (!tracks.length) {
    return `
			<h4>Loading Tracks...</4>
		`;
  }

  const results = tracks.map(renderTrackCard).join("");

  return `
		<ul id="tracks">
			${results}
		</ul>
	`;
}

function renderTrackCard(track) {
  const { id, name } = track;

  return `<h4 id="${id}" class="card track">${name}</h4>`;
}

function renderCountdown(count) {
  return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`;
}

function renderRaceStartView(track_name) {
  return `
		<header>
			<h1>Race: ${track_name}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>

			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`;
}

function resultsView(positions) {
  let userPlayer = positions.find((e) => e.id === parseInt(store.player_id));
  userPlayer.driver_name += " (you)";
  let count = 1;

  const results = positions.map((p) => {
    return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`;
  });

  return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			<h3>Race Results</h3>
			<p>The race is done! Here are the final results:</p>
			${results.join("")}
			<a href="/race">Start a new race</a>
		</main>
	`;
}

function raceProgress(positions) {
  let userPlayer = positions.find((e) => e.id === parseInt(store.player_id));
  userPlayer.driver_name += " (you)";

  positions = positions.sort((a, b) => (a.segment > b.segment ? -1 : 1));
  let count = 1;

  const results = positions.map((p) => {
    return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`;
  });

  return `
		<table>
			${results.join("")}
		</table>
	`;
}

function renderAt(element, html) {
  const node = document.querySelector(element);

  node.innerHTML = html;
}

// API calls

const SERVER = "http://localhost:3001";

function defaultFetchOpts() {
  return {
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": SERVER,
    },
  };
}

async function getTracks() {
  console.log(`Calling server: ${SERVER}/api/tracks`);

  // GET request to `${SERVER}/api/tracks`

  const res = await fetch(`${SERVER}/api/tracks`, {
    ...defaultFetchOpts(),
  }).catch((err) => console.error(`Error while getting tracks: ${err}`));

  return await res.json();
}

async function getRacers() {
  // GET request to `${SERVER}/api/cars`

  const res = await fetch(`${SERVER}/api/cars`, {
    method: "GET",
  }).catch((err) => console.error(`Error while getting racers: ${err}`));

  return await res.json();
}

async function createRace(player_id, track_id) {
  player_id = parseInt(player_id);
  track_id = parseInt(track_id);
  const body = { player_id, track_id };

  const res = await fetch(`${SERVER}/api/races`, {
    method: "POST",
    ...defaultFetchOpts(),
    dataType: "jsonp",
    body: JSON.stringify(body),
  }).catch((err) => console.log("Error while creating race: ", err));

  return res.json();
}

async function getRace(id) {
  // GET request to `${SERVER}/api/races/${id}`

  const res = await fetch(`${SERVER}/api/races/${id}`, {
    ...defaultFetchOpts(),
  }).catch((err) => console.error(`Error while getting race: ${err}`));

  return await res.json();
}

function startRace(id) {
  // POST request to `${SERVER}/api/races/${id}/start`

  fetch(`${SERVER}/api/races/${id}/start`, {
    method: "POST",
    ...defaultFetchOpts(),
  }).catch((err) => console.error(`Error while starting race: ${err}`));
}

function accelerate(id) {
  // POST request to `${SERVER}/api/races/${id}/accelerate`

  fetch(`${SERVER}/api/races/${id}/accelerate`, {
    method: "POST",
    ...defaultFetchOpts(),
  }).catch((err) => console.error(`Error while accelerating: ${err}`));
}
