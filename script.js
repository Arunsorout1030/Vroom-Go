const WHATSAPP_NUMBER = "919992040175";

const CALLMEBOT_APIKEY = "";

const CARS = [
  { id: 1, name: "Mahindra Thar",     type: "SUV",         seats: 4, gear: "Manual",    fuel: "Diesel", price: 3500, image: "images/thar.jpg",
    features: ["4x4 drive", "AC", "Touchscreen", "Bluetooth", "Power steering", "Off-road ready"] },
  { id: 2, name: "Scorpio S11",       type: "SUV",         seats: 7, gear: "Manual",    fuel: "Diesel", price: 3200, image: "images/scorpio-s11.jpg",
    features: ["7 seats", "AC", "Music system", "Bluetooth", "Power steering", "Large boot space"] },
  { id: 3, name: "Scorpio N",         type: "SUV",         seats: 7, gear: "Automatic", fuel: "Diesel", price: 4200, image: "images/scorpio-n.jpg",
    features: ["Sunroof", "Touchscreen", "Rear AC vents", "Airbags", "ABS", "Cruise control"] },
  { id: 4, name: "Maruti Brezza",     type: "Compact SUV", seats: 5, gear: "Manual",    fuel: "Petrol", price: 2400, image: "images/brezza.jpg",
    features: ["AC", "Touchscreen", "Bluetooth", "Airbags", "ABS", "Good mileage"] },
  { id: 5, name: "Maruti Swift",      type: "Hatchback",   seats: 5, gear: "Manual",    fuel: "Petrol", price: 1500, image: "images/swift.jpg",
    features: ["AC", "Touchscreen", "Bluetooth", "Power windows", "Airbags", "Good mileage"] }
];

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const rupees = (n) => "₹" + n.toLocaleString("en-IN");
const carSvg = (label) => `<svg viewBox="0 0 240 90" role="img" aria-label="${label} (photo coming soon)"><path d="M18 62 L30 40 Q36 30 52 30 L96 30 Q112 12 140 12 Q168 12 184 30 L206 36 Q222 40 222 56 L222 66 L18 66Z" fill="#C9D0D9"/><circle cx="62" cy="68" r="14" fill="#10151C"/><circle cx="178" cy="68" r="14" fill="#10151C"/><circle cx="62" cy="68" r="6" fill="#E9ECF0"/><circle cx="178" cy="68" r="6" fill="#E9ECF0"/></svg>`;

function isoToday() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}
function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function daysBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Math.round(ms / 86400000) + 1; // pick-up and return day both count
}
function showToast(text) {
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

const grid = $("fleetGrid");
const filters = $("filters");
const types = ["All", ...new Set(CARS.map((c) => c.type))];
let activeType = "All";

function renderFilters() {
  filters.innerHTML = "";
  types.forEach((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = t;
    b.setAttribute("aria-pressed", String(t === activeType));
    b.addEventListener("click", () => { activeType = t; renderFilters(); renderFleet(); });
    filters.appendChild(b);
  });
}

function renderFleet() {
  const list = activeType === "All" ? CARS : CARS.filter((c) => c.type === activeType);
  grid.innerHTML = list.map((c) => `
    <article class="card">
      <div class="card-img"><img src="${c.image}" alt="${c.name}" loading="lazy" data-name="${c.name}"></div>
      <div class="card-body">
        <div class="type">${c.type}</div>
        <h3>${c.name}</h3>
        <div class="specs">${c.seats} seats · ${c.gear} · ${c.fuel}</div>
        <ul class="tags">${c.features.map((f) => `<li>${f}</li>`).join("")}</ul>
        <div class="card-foot">
          <div class="price"><b>${rupees(c.price)}</b> / day</div>
          <button type="button" class="btn-outline" data-id="${c.id}">Book this car</button>
        </div>
      </div>
    </article>`).join("");

  const exts = ["jpg", "jpeg", "png", "webp"];
  grid.querySelectorAll(".card-img img").forEach((img) => {
    let tried = 0;
    img.addEventListener("error", () => {
      const base = img.getAttribute("src").replace(/\.[a-z]+$/i, "");
      if (tried < exts.length) {
        const next = `${base}.${exts[tried++]}`;
        if (next !== img.getAttribute("src")) { img.src = next; return; }
        if (tried < exts.length) { img.src = `${base}.${exts[tried++]}`; return; }
      }
      const box = img.parentElement;
      box.classList.add("no-photo");
      box.innerHTML = carSvg(img.dataset.name);
    });
  });
}

grid.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  carSelect.value = btn.dataset.id;
  updateSummary();
  $("book").scrollIntoView({ behavior: "smooth" });
  $("name").focus({ preventScroll: true });
});

// ---------- Form ----------
const form = $("bookingForm");
const carSelect = $("car");
const pickup = $("pickup");
const dropoff = $("dropoff");

carSelect.innerHTML = `<option value="">Select car</option>` +
  CARS.map((c) => `<option value="${c.id}">${c.name} (${rupees(c.price)}/day)</option>`).join("");

pickup.min = dropoff.min = isoToday();
pickup.addEventListener("change", () => {
  dropoff.min = pickup.value || isoToday();
  if (dropoff.value && dropoff.value < pickup.value) dropoff.value = pickup.value;
  updateSummary();
});
[dropoff, carSelect].forEach((el) => el.addEventListener("change", updateSummary));

$("phone").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, ""); });

function getEstimate() {
  const car = CARS.find((c) => c.id === Number(carSelect.value));
  if (!car || !pickup.value || !dropoff.value || dropoff.value < pickup.value) return null;
  const days = daysBetween(pickup.value, dropoff.value);
  return { car, days, total: days * car.price };
}

function updateSummary() {
  const est = getEstimate();
  $("summary").innerHTML = est
    ? `<strong>${est.car.name}</strong> for ${est.days} day${est.days > 1 ? "s" : ""}: estimated total <strong>${rupees(est.total)}</strong>`
    : "Choose a car and dates to see your estimated total.";
}

function setError(field, message) {
  $("err-" + field).textContent = message;
  $(field).closest(".field").classList.toggle("invalid", Boolean(message));
}

function validate() {
  let ok = true;
  const name = $("name").value.trim();
  const phone = $("phone").value.trim();

  const checks = {
    name: name.length < 2 ? "Enter your name." : "",
    phone: !/^[6-9]\d{9}$/.test(phone) ? "Enter a valid 10-digit mobile number." : "",
    city: !$("city").value ? "Select Palwal or Hodal." : "",
    car: !carSelect.value ? "Select a car." : "",
    pickup: !pickup.value ? "Select a pick-up date." : pickup.value < isoToday() ? "Pick-up date cannot be in the past." : "",
    dropoff: !dropoff.value ? "Select a return date." : dropoff.value < pickup.value ? "Return date must be on or after pick-up." : ""
  };
  Object.entries(checks).forEach(([field, msg]) => { setError(field, msg); if (msg) ok = false; });
  return ok;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validate()) {
    const firstBad = form.querySelector(".invalid input, .invalid select");
    if (firstBad) firstBad.focus();
    return;
  }
  const est = getEstimate();
  const notes = $("notes").value.trim();

  const message = [
    "*New car booking – VroomGo*",
    "",
    `Name: ${$("name").value.trim()}`,
    `Mobile: ${$("phone").value.trim()}`,
    `Pick-up location: ${$("city").value}`,
    `Car: ${est.car.name} (${est.car.type})`,
    `Driving option: ${$("mode").value}`,
    `Pick-up date: ${formatDate(pickup.value)}`,
    `Return date: ${formatDate(dropoff.value)}`,
    `Days: ${est.days}`,
    `Estimated total: ${rupees(est.total)}`,
    notes ? `Notes: ${notes}` : null
  ].filter((line) => line !== null).join("\n");

  sendBooking(message);
});

async function sendBooking(message) {
  const chatUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  const button = form.querySelector('button[type="submit"]');

  if (!CALLMEBOT_APIKEY) {
    const win = window.open(chatUrl, "_blank", "noopener");
    if (!win) window.location.href = chatUrl;
    showToast("Opening WhatsApp. Press send to confirm your booking request.");
    return;
  }

  button.disabled = true;
  button.textContent = "Sending...";
  try {
    const api = `https://api.callmebot.com/whatsapp.php?phone=%2B${WHATSAPP_NUMBER}` +
                `&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(CALLMEBOT_APIKEY)}`;
    
    await fetch(api, { mode: "no-cors" });
    showToast("Booking sent. We will contact you on your mobile number shortly.");
    form.reset();
    updateSummary();
  } catch (err) {
    
    showToast("Could not send automatically. Opening WhatsApp instead.");
    window.open(chatUrl, "_blank", "noopener");
  } finally {
    button.disabled = false;
    button.textContent = "Send booking on WhatsApp";
  }
}

const direct = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi VroomGo, I want to rent a car.")}`;
$("waDirect").href = direct;
$("waLink").href = direct;
$("year").textContent = new Date().getFullYear();

const menuBtn = $("menuBtn");
const menu = $("menu");
menuBtn.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
});
menu.addEventListener("click", (e) => {
  if (e.target.tagName === "A") { menu.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
});

renderFilters();
renderFleet();
updateSummary();
