const el = (id) => document.getElementById(id);

const searchForm = el("searchForm");
const cityInput = el("cityInput");

const loadingEl = el("loading");
const errorEl = el("error");
const cardEl = el("card");

const placeEl = el("place");
const timeEl = el("time");
const iconEl = el("icon");
const tempEl = el("temp");
const descEl = el("desc");

const feelsEl = el("feels");
const humidityEl = el("humidity");
const windEl = el("wind");
const conditionEl = el("condition");

const unitBtn = el("unitBtn");
const themeBtn = el("themeBtn");

let unit = "metric"; // metric | imperial
let theme = localStorage.getItem("theme") || "dark";

applyTheme(theme);

unitBtn.addEventListener("click", () => {
  unit = unit === "metric" ? "imperial" : "metric";
  unitBtn.textContent = unit === "metric" ? "°C" : "°F";

  // If already showing data, re-fetch last searched place
  const last = localStorage.getItem("lastCity");
  if (last) fetchWeatherByCity(last);
});

themeBtn.addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  applyTheme(theme);
});

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return showError("Please enter a city name.");
  fetchWeatherByCity(city);
});

function applyTheme(t) {
  document.body.classList.toggle("light", t === "light");
  themeBtn.textContent = t === "light" ? "☀️" : "🌙";
  localStorage.setItem("theme", t);
}

function setLoading(isLoading) {
  loadingEl.classList.toggle("hidden", !isLoading);
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
  cardEl.classList.add("hidden");
}

function clearError() {
  errorEl.classList.add("hidden");
  errorEl.textContent = "";
}

function showCard() {
  cardEl.classList.remove("hidden");
}

function toF(c) {
  return (c * 9) / 5 + 32;
}
function msToMph(ms) {
  return ms * 2.2369362920544;
}

function weatherCodeToInfo(code) {
  // Open-Meteo WMO weather interpretation codes
  // https://open-meteo.com/en/docs
  const map = [
    { codes: [0], icon: "☀️", text: "Clear sky" },
    { codes: [1], icon: "🌤️", text: "Mainly clear" },
    { codes: [2], icon: "⛅", text: "Partly cloudy" },
    { codes: [3], icon: "☁️", text: "Overcast" },
    { codes: [45, 48], icon: "🌫️", text: "Fog" },
    { codes: [51, 53, 55], icon: "🌦️", text: "Drizzle" },
    { codes: [56, 57], icon: "🌧️", text: "Freezing drizzle" },
    { codes: [61, 63, 65], icon: "🌧️", text: "Rain" },
    { codes: [66, 67], icon: "🌧️", text: "Freezing rain" },
    { codes: [71, 73, 75], icon: "🌨️", text: "Snow" },
    { codes: [77], icon: "❄️", text: "Snow grains" },
    { codes: [80, 81, 82], icon: "🌧️", text: "Rain showers" },
    { codes: [85, 86], icon: "🌨️", text: "Snow showers" },
    { codes: [95], icon: "⛈️", text: "Thunderstorm" },
    { codes: [96, 99], icon: "⛈️", text: "Thunderstorm with hail" },
  ];

  for (const item of map) {
    if (item.codes.includes(code)) return item;
  }
  return { icon: "⛅", text: "Weather" };
}

async function fetchWeatherByCity(city) {
  clearError();
  setLoading(true);
  cardEl.classList.add("hidden");

  try {
    // 1) Geocoding: city -> lat/lon
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1&language=en&format=json`;

    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) throw new Error("Geocoding failed.");
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error("City not found. Try a different spelling.");
    }

    const g = geoData.results[0];
    const name = g.name;
    const region = g.admin1 ? `, ${g.admin1}` : "";
    const country = g.country ? `, ${g.country}` : "";

    // 2) Weather: current weather + humidity, feels-like
    const currentParams =
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m";
    const timezone = "auto";
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current=${currentParams}&timezone=${timezone}`;

    const wRes = await fetch(weatherUrl);
    if (!wRes.ok) throw new Error("Weather fetch failed.");
    const wData = await wRes.json();

    const cur = wData.current;
    if (!cur) throw new Error("No current weather data available.");

    // Units conversion if needed
    const tempC = cur.temperature_2m;
    const feelsC = cur.apparent_temperature;
    const windMs = cur.wind_speed_10m;
    const humidity = cur.relative_humidity_2m;
    const code = cur.weather_code;

    const tempOut = unit === "metric" ? tempC : toF(tempC);
    const feelsOut = unit === "metric" ? feelsC : toF(feelsC);
    const windOut =
      unit === "metric" ? windMs : msToMph(windMs);

    const tempUnit = unit === "metric" ? "°C" : "°F";
    const windUnit = unit === "metric" ? "m/s" : "mph";

    const info = weatherCodeToInfo(code);

    // Render
    placeEl.textContent = `${name}${region}${country}`;
    timeEl.textContent = `Local time: ${cur.time.replace("T", " ")}`;
    iconEl.textContent = info.icon;

    tempEl.textContent = `${Math.round(tempOut)}${tempUnit}`;
    descEl.textContent = info.text;

    feelsEl.textContent = `${Math.round(feelsOut)}${tempUnit}`;
    humidityEl.textContent = `${Math.round(humidity)}%`;
    windEl.textContent = `${Math.round(windOut * 10) / 10} ${windUnit}`;
    conditionEl.textContent = info.text;

    showCard();
    localStorage.setItem("lastCity", city);
  } catch (err) {
    showError(err?.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
}

// Optional: load last searched city
const last = localStorage.getItem("lastCity");
if (last) {
  cityInput.value = last;
  fetchWeatherByCity(last);
}
