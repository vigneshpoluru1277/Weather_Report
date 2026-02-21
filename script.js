const el = id => document.getElementById(id);

const searchForm = el("searchForm");
const cityInput = el("cityInput");
const loading = el("loading");
const error = el("error");
const card = el("card");
const forecastEl = el("forecast");

const locationBtn = el("locationBtn");
const unitBtn = el("unitBtn");
const themeBtn = el("themeBtn");

let unit = "metric";
let theme = localStorage.getItem("theme") || "dark";

applyTheme(theme);

// Theme Toggle
themeBtn.onclick = () => {
  theme = theme === "dark" ? "light" : "dark";
  applyTheme(theme);
};

// Unit Toggle
unitBtn.onclick = () => {
  unit = unit === "metric" ? "imperial" : "metric";
  unitBtn.textContent = unit === "metric" ? "°C" : "°F";
  const last = localStorage.getItem("lastCity");
  if (last) fetchWeather(last);
};

// Location Button
locationBtn.onclick = () => {
  navigator.geolocation.getCurrentPosition(pos => {
    fetchByCoords(pos.coords.latitude, pos.coords.longitude);
  });
};

// Search Submit
searchForm.onsubmit = e => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  fetchWeather(city);
};

function applyTheme(t){
  document.body.classList.toggle("light", t==="light");
  themeBtn.textContent = t==="light"?"☀️":"🌙";
  localStorage.setItem("theme",t);
}

function showLoading(state){
  loading.classList.toggle("hidden",!state);
}

async function fetchWeather(city){
  try{
    showLoading(true);
    card.classList.add("hidden");
    error.classList.add("hidden");

    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    );

    const geoData = await geo.json();

    if(!geoData.results) throw new Error("City not found");

    const g = geoData.results[0];

    await fetchByCoords(g.latitude,g.longitude,g.name,g.country);

    localStorage.setItem("lastCity",city);

  }catch(err){
    error.textContent = err.message;
    error.classList.remove("hidden");
  }finally{
    showLoading(false);
  }
}

async function fetchByCoords(lat,lon,name="",country=""){
  try{

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`;

    const res = await fetch(url);
    const data = await res.json();

    const cur = data.current;
    const daily = data.daily;

    if(!cur) throw new Error("Weather data not available");

    const temp = unit==="metric"?cur.temperature_2m:(cur.temperature_2m*9/5+32);
    const feels = unit==="metric"?cur.apparent_temperature:(cur.apparent_temperature*9/5+32);
    const wind = unit==="metric"?cur.wind_speed_10m:(cur.wind_speed_10m*2.23694);

    el("place").textContent = `${name} ${country}`;
    el("time").textContent = new Date(cur.time).toLocaleString();
    el("temp").textContent = `${Math.round(temp)}°`;
    el("desc").textContent = "Live Weather";
    el("feels").textContent = `${Math.round(feels)}°`;
    el("humidity").textContent = `${cur.relative_humidity_2m}%`;
    el("wind").textContent = `${wind.toFixed(1)} ${unit==="metric"?"m/s":"mph"}`;
    el("sunrise").textContent = new Date(daily.sunrise[0]).toLocaleTimeString();
    el("sunset").textContent = new Date(daily.sunset[0]).toLocaleTimeString();

    renderForecast(daily);

    card.classList.remove("hidden");

  }catch(err){
    error.textContent = "Failed to fetch weather.";
    error.classList.remove("hidden");
  }
}

function renderForecast(daily){
  forecastEl.innerHTML="";
  daily.time.slice(0,5).forEach((day,i)=>{
    const div=document.createElement("div");
    div.className="day";
    div.innerHTML=`
      <div>${new Date(day).toLocaleDateString("en-US",{weekday:"short"})}</div>
      <div>🌡</div>
      <div>${Math.round(daily.temperature_2m_max[i])}°</div>
    `;
    forecastEl.appendChild(div);
  });
}