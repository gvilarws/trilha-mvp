var STORAGE_KEY = "trilha.reviews.v1";
var VOTES_KEY = "trilha.votes.v1";

// ---------- reviews locais ----------

function readLocalReviews() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function writeLocalReviews(reviews) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

function addLocalReview(input) {
  var review = {
    id: "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    teacherSlug: input.teacherSlug,
    authorName: input.authorName,
    overall: input.overall,
    clarity: input.clarity,
    questionsSpace: input.questionsSpace,
    pace: input.pace,
    context: input.context,
    createdAt: new Date().toISOString(),
    helpfulBase: 0,
  };
  var all = readLocalReviews();
  all.push(review);
  writeLocalReviews(all);
  return review;
}

function updateLocalReview(id, updates) {
  var all = readLocalReviews();
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === id) {
      all[i].authorName = updates.authorName;
      all[i].overall = updates.overall;
      all[i].clarity = updates.clarity;
      all[i].questionsSpace = updates.questionsSpace;
      all[i].pace = updates.pace;
      all[i].context = updates.context;
      break;
    }
  }
  writeLocalReviews(all);
}

function deleteLocalReview(id) {
  writeLocalReviews(readLocalReviews().filter(function (r) { return r.id !== id; }));
  var votes = readVotes();
  delete votes[id];
  writeVotes(votes);
}

function clearLocalReviews() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(VOTES_KEY);
}

function isLocalReview(id) {
  var all = readLocalReviews();
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return true;
  return false;
}

function findReviewById(id) {
  var all = getAllReviews();
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
}

function getAllReviews() {
  return MOCK_REVIEWS.concat(readLocalReviews());
}

function getReviewsFor(slug) {
  return getAllReviews()
    .filter(function (r) { return r.teacherSlug === slug; })
    .sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
}

// ---------- votos úteis ----------

function readVotes() {
  try {
    var raw = localStorage.getItem(VOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

function writeVotes(v) { localStorage.setItem(VOTES_KEY, JSON.stringify(v)); }

function hasVotedHelpful(id) { return readVotes()[id] === true; }

function toggleHelpful(id) {
  var votes = readVotes();
  if (votes[id]) delete votes[id];
  else votes[id] = true;
  writeVotes(votes);
}

function getHelpfulCount(review) {
  var base = review.helpfulBase || 0;
  return base + (hasVotedHelpful(review.id) ? 1 : 0);
}

// ---------- cálculos ----------

function computeStats(reviews) {
  var n = reviews.length;
  if (n === 0) {
    return { count: 0, overall: null, clarity: null, questionsSpace: null, pace: null };
  }
  function avg(pick) {
    var sum = 0;
    for (var i = 0; i < reviews.length; i++) sum += pick(reviews[i]);
    return Math.round((sum / n) * 10) / 10;
  }
  return {
    count: n,
    overall: avg(function (r) { return r.overall; }),
    clarity: avg(function (r) { return r.clarity; }),
    questionsSpace: avg(function (r) { return r.questionsSpace; }),
    pace: avg(function (r) { return r.pace; }),
  };
}

function computeDistribution(reviews) {
  var dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(function (r) {
    var n = Math.round(r.overall);
    if (dist[n] != null) dist[n]++;
  });
  return dist;
}

function fmtAvg(v) { return v.toFixed(1).replace(".", ","); }

function formatRelativeDate(iso) {
  var diff = Date.now() - new Date(iso).getTime();
  var m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return "há " + m + " min";
  var h = Math.floor(m / 60);
  if (h < 24) return "há " + h + "h";
  var d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return "há " + d + " dias";
  var w = Math.floor(d / 7);
  if (w < 4) return "há " + w + (w === 1 ? " semana" : " semanas");
  var mo = Math.floor(d / 30);
  if (mo < 12) return "há " + mo + (mo === 1 ? " mês" : " meses");
  var y = Math.floor(d / 365);
  return "há " + y + (y === 1 ? " ano" : " anos");
}

function findTeacherBySlug(slug) {
  for (var i = 0; i < TEACHERS.length; i++) if (TEACHERS[i].slug === slug) return TEACHERS[i];
  return null;
}

function escapeHTML(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getDisciplines() {
  var set = {};
  TEACHERS.forEach(function (t) { set[t.discipline] = true; });
  return Object.keys(set).sort();
}

function getEducationLevels() {
  var set = {};
  TEACHERS.forEach(function (t) { set[t.educationLevel] = true; });
  return Object.keys(set).sort();
}

function sortReviews(reviews, mode) {
  var copy = reviews.slice();
  if (mode === "nota-alta") copy.sort(function (a, b) { return b.overall - a.overall; });
  else if (mode === "nota-baixa") copy.sort(function (a, b) { return a.overall - b.overall; });
  else copy.sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
  return copy;
}

// ---------- export / import ----------

function exportReviewsJSON() {
  var payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    reviews: readLocalReviews(),
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "trilha-avaliacoes-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importReviewsJSON(file, callback) {
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var data = JSON.parse(e.target.result);
      var incoming = (data && data.reviews) || [];
      if (!Array.isArray(incoming)) throw new Error("Formato inválido");
      var current = readLocalReviews();
      var existing = {};
      current.forEach(function (r) { existing[r.id] = true; });
      var added = 0;
      incoming.forEach(function (r) {
        if (
          r && typeof r.id === "string" &&
          typeof r.teacherSlug === "string" &&
          typeof r.context === "string" &&
          typeof r.overall === "number" &&
          !existing[r.id]
        ) {
          current.push(r);
          existing[r.id] = true;
          added++;
        }
      });
      writeLocalReviews(current);
      callback(null, added);
    } catch (err) {
      callback(err);
    }
  };
  reader.readAsText(file);
}

// ---------- footer limpar ----------

function injectClearButton() {
  var footer = document.querySelector(".site-footer__inner");
  if (!footer || document.getElementById("btn-limpar")) return;
  var btn = document.createElement("button");
  btn.id = "btn-limpar";
  btn.type = "button";
  btn.textContent = "Limpar minhas avaliações";
  btn.style.cssText =
    "background: transparent; color: inherit; opacity: 0.6; font-size: 0.75rem; padding: 0.25rem 0.5rem; border: 1px solid currentColor; border-radius: 0.25rem; cursor: pointer;";
  btn.addEventListener("click", function () {
    if (confirm("Isso vai apagar todas as avaliações que você criou neste navegador. Continuar?")) {
      clearLocalReviews();
      window.location.reload();
    }
  });
  footer.appendChild(btn);
}

// ---------- tema ----------

function applyStoredTheme() {
  var t = localStorage.getItem("trilha.theme") || "light";
  if (t === "dark") document.documentElement.classList.add("dark");
}
applyStoredTheme();

function getTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function setTheme(t) {
  if (t === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
  localStorage.setItem("trilha.theme", t);
  updateToggleIcon();
}

function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

var ICON_MOON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />' +
  "</svg>";

var ICON_SUN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="12" cy="12" r="5" />' +
  '<line x1="12" y1="1" x2="12" y2="3" />' +
  '<line x1="12" y1="21" x2="12" y2="23" />' +
  '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />' +
  '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />' +
  '<line x1="1" y1="12" x2="3" y2="12" />' +
  '<line x1="21" y1="12" x2="23" y2="12" />' +
  '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />' +
  '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />' +
  "</svg>";

function updateToggleIcon() {
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;
  var isDark = getTheme() === "dark";
  btn.innerHTML = isDark ? ICON_SUN : ICON_MOON;
  btn.setAttribute("aria-label", isDark ? "Ativar modo claro" : "Ativar modo escuro");
  btn.setAttribute("title", isDark ? "Modo claro" : "Modo escuro");
}

function injectThemeToggle() {
  var header = document.querySelector(".site-header__inner");
  if (!header || document.getElementById("theme-toggle")) return;

  var btn = document.createElement("button");
  btn.id = "theme-toggle";
  btn.type = "button";
  btn.className = "theme-toggle";

  var last = header.lastElementChild;
  if (last) header.insertBefore(btn, last);
  else header.appendChild(btn);

  btn.addEventListener("click", toggleTheme);
  updateToggleIcon();
}

function injectCompareLink() {
  var nav = document.querySelector(".site-nav");
  if (!nav || nav.querySelector('a[href="comparar.html"]')) return;
  var a = document.createElement("a");
  a.href = "comparar.html";
  a.textContent = "Comparar";
  var last = nav.lastElementChild;
  if (last) nav.insertBefore(a, last);
  else nav.appendChild(a);
}

// ---------- avatares ----------

function avatarUrl(slug) {
  return (
    "https://api.dicebear.com/7.x/notionists-neutral/svg?seed=" +
    encodeURIComponent(slug) +
    "&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf"
  );
}

function avatarHTML(teacher, large) {
  var cls = "avatar" + (large ? " avatar--lg" : "");
  return (
    '<span class="' + cls + '" aria-hidden="true">' +
      '<span class="avatar__initials">' + escapeHTML(teacher.initials) + "</span>" +
      '<img class="avatar__img" src="' + avatarUrl(teacher.slug) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';" />' +
    "</span>"
  );
}

// ---------- inicialização ----------

document.addEventListener("DOMContentLoaded", function () {
  injectClearButton();
  injectThemeToggle();
  injectCompareLink();
  updateToggleIcon();
});