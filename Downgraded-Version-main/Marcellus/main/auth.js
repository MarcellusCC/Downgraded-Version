/* ===========================
   auth.js — shared header state
   =========================== */

/** ----- Storage helpers ----- **/
function getLoggedInUser() {
  try { return JSON.parse(localStorage.getItem('loggedInUser') || 'null'); }
  catch { return null; }
}
function setLoggedInUser(user) {
  try { localStorage.setItem('loggedInUser', JSON.stringify(user)); }
  catch {}
}

/** ----- Header avatar renderer (emoji or <img>) ----- **/
function updateHeaderAvatarFromUser(user) {
  // Prefer explicit #userAvatar; fall back to .user-avatar (used on several pages)
  const el = document.getElementById('userAvatar') || document.querySelector('.user-avatar');
  if (!el) return;

  // Clear prior content
  el.innerHTML = '';
  el.textContent = '';

  if (user?.avatarImage) {
    const img = document.createElement('img');
    img.src = user.avatarImage;           // base64 or URL
    img.alt = 'Profile Avatar';
    img.loading = 'lazy';
    el.appendChild(img);
  } else if (user?.avatar && user.avatar !== 'default') {
    // Emoji avatar
    el.textContent = user.avatar;
  } else if (user?.name) {
    // Fallback: first initial
    el.textContent = user.name.charAt(0).toUpperCase();
  } else {
    el.textContent = 'U';
  }
}

/** ----- Show/hide login vs user menu, then paint avatar ----- **/
function syncHeaderState() {
  const user = getLoggedInUser();

  // Possible containers across pages
  const loginLink  = document.getElementById('loginLink');
  const registerLink = document.getElementById('registerLink');
  const authLinks1 = document.getElementById('authLinks');     // some pages use this
  const authLinks2 = document.querySelector('.auth-links');     // some pages use this

  const userMenuA = document.getElementById('userMenu');
  const userMenuB = document.getElementById('userProfile');
  const userMenuC = document.querySelector('.user-menu');
  const userMenuD = document.querySelector('.user-profile');

  const userMenu = userMenuA || userMenuB || userMenuC || userMenuD;

  if (user) {
    // Hide login/register if present
    if (loginLink)    loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';
    if (authLinks1)   authLinks1.style.display = 'none';
    if (authLinks2)   authLinks2.style.display = 'none';

    // Show user menu
    if (userMenu?.classList) userMenu.classList.add('show');
  } else {
    if (loginLink)    loginLink.style.display = '';
    if (registerLink) registerLink.style.display = '';
    if (authLinks1)   authLinks1.style.display = '';
    if (authLinks2)   authLinks2.style.display = '';

    if (userMenu?.classList) userMenu.classList.remove('show');
  }

  updateHeaderAvatarFromUser(user);
  updateHeaderEloFromUser(user);
}
const AUTH_ELO_RANKS = {
  beginner:     { min: 0,    max: 1399, name: 'Beginner',    class: 'rank-beginner' },
  intermediate: { min: 1400, max: 1799, name: 'Intermediate',class: 'rank-intermediate' },
  advanced:     { min: 1800, max: 2199, name: 'Advanced',    class: 'rank-advanced' },
  expert:       { min: 2200, max: 2599, name: 'Expert',      class: 'rank-expert' },
  master:       { min: 2600, max: 2999, name: 'Master',      class: 'rank-master' },
  grandmaster:  { min: 3000, max: 9999, name: 'Grandmaster', class: 'rank-grandmaster' }
};

function _authGetCurrentRank(elo) {
  for (const r of Object.values(AUTH_ELO_RANKS)) {
    if (elo >= r.min && elo <= r.max) return r;
  }
  return AUTH_ELO_RANKS.beginner;
}
function _authRankProgress(elo, rank) {
  const span = rank.max - rank.min;
  const done = Math.max(0, Math.min(span, elo - rank.min));
  return Math.round((done / span) * 100);
}

function updateHeaderEloFromUser(user) {
  const rating = (user && typeof user.elo === 'number') ? user.elo : 1250;

  const rank = _authGetCurrentRank(rating);
  const rankIcon    = document.getElementById('eloRankIcon');
  const rankText    = document.getElementById('eloRankText');
  const progressEl  = document.getElementById('eloProgressFill');
  const ratingLabel = document.getElementById('eloCurrentRating');

  if (rankIcon)   rankIcon.className   = `elo-rank-icon ${rank.class}`;
  if (rankText)   rankText.textContent = rank.name;
  if (progressEl) {
    progressEl.className = `elo-progress-fill ${rank.class}`;
    progressEl.style.width = `${_authRankProgress(rating, rank)}%`;
  }
  if (ratingLabel) ratingLabel.textContent = `${rating} ELO`;
}

/** ----- Optional: gate pages that require auth ----- **/
function requireAuth(redirectTo = 'login.html') {
  if (!getLoggedInUser()) window.location.replace(redirectTo);
}

/** ----- Live sync hooks ----- **/
// Initial sync on page load
window.addEventListener('DOMContentLoaded', syncHeaderState);
window.addEventListener('load', syncHeaderState);

// Intra-tab updates (when profile page finishes saving)
window.addEventListener('avatarUpdated',  syncHeaderState);
window.addEventListener('userUpdated',    syncHeaderState);

// Cross-tab updates (if the user changes data in another tab)
window.addEventListener('storage', (e) => {
  if (e.key === 'loggedInUser') syncHeaderState();
});

/** ----- (Optional) make helpers available globally ----- **/
window.Auth = { getLoggedInUser, setLoggedInUser, syncHeaderState, requireAuth };
