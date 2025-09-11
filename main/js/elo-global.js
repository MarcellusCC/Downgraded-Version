/* /js/elo-global.js
   One ELO source of truth + header renderer across all pages.
   Usage:
     <script src="js/elo-global.js"></script>
     <script>
       document.addEventListener('DOMContentLoaded', () => Elo.initHeader());
       // When ELO changes:
       // Elo.add(+25); Elo.add(-15); Elo.set(1875);
     </script>
*/
(() => {
  'use strict';

  if (window.Elo) return; // prevent double-load

  // ---- Ranks (mirrors my-profile.html) ----
  const ELO_RANKS = {
    beginner:     { min:   0, max: 1399, name: 'Beginner',     class: 'rank-beginner',  simple: 'beginner' },
    intermediate: { min: 1400, max: 1799, name: 'Intermediate', class: 'rank-intermediate', simple: 'intermediate' },
    advanced:     { min: 1800, max: 2199, name: 'Advanced',     class: 'rank-advanced', simple: 'advanced' },
    expert:       { min: 2200, max: 2599, name: 'Expert',       class: 'rank-expert',   simple: 'expert' },
    master:       { min: 2600, max: 2999, name: 'Master',       class: 'rank-master',   simple: 'master' },
    grandmaster:  { min: 3000, max: 9999, name: 'Grandmaster',  class: 'rank-grandmaster', simple: 'grandmaster' }
  };

  // ---------- storage helpers ----------
  const readUser = () => {
    try { return JSON.parse(localStorage.getItem('loggedInUser') || 'null'); }
    catch { return null; }
  };

  const writeUser = (user) => {
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    // Notify this tab
    window.dispatchEvent(new CustomEvent('eloUpdated', { detail: { newElo: user.elo } }));
  };

  // ---------- rank / progress ----------
  const getRank = (elo) => {
    for (const r of Object.values(ELO_RANKS)) {
      if (elo >= r.min && elo <= r.max) return r;
    }
    return ELO_RANKS.beginner;
  };

  const getProgressPct = (elo, rank) => {
    const span = rank.max - rank.min;
    return Math.min(100, Math.max(0, ((elo - rank.min) / span) * 100));
  };

  // ---------- header renderers (supports both profile-style and legacy index-style) ----------
  function renderHeaderElo(elo) {
    const rank = getRank(elo);
    const pct  = getProgressPct(elo, rank);

    // Profile-style IDs (preferred)
    const rankIcon      = document.getElementById('eloRankIcon');
    const rankText      = document.getElementById('eloRankText');
    const progressFill  = document.getElementById('eloProgressFill');
    const currentRating = document.getElementById('eloCurrentRating');

    if (rankIcon || rankText || progressFill || currentRating) {
      if (rankIcon)      rankIcon.className     = `elo-rank-icon ${rank.class}`;
      if (rankText)      rankText.textContent   = rank.name;
      if (progressFill) {
        progressFill.className = `elo-progress-fill ${rank.class}`;
        progressFill.style.width = `${pct}%`;
      }
      if (currentRating) currentRating.textContent = `${elo} ELO`;
    }

    // Legacy/simple header (index variant): rankBadge/progressFill/eloNumber OR class-based fallbacks
    const altBadge = document.getElementById('rankBadge') || document.querySelector('.rank-badge');
    const altFill  = document.getElementById('progressFill') || document.querySelector('.progress-fill');
    const altNum   = document.getElementById('eloNumber') || document.querySelector('.elo-number');

    if (altBadge || altFill || altNum) {
      if (altBadge) {
        // strip previous simple classes
        altBadge.classList.remove('beginner','intermediate','advanced','expert','master','grandmaster');
        altBadge.classList.add(rank.simple);
      }
      if (altFill) {
        altFill.style.width = `${pct}%`;
        altFill.classList.remove('beginner','intermediate','advanced','expert','master','grandmaster');
        altFill.classList.add(rank.simple);
      }
      if (altNum) altNum.textContent = `${elo}`;
    }
  }

  function updateHeaderFromStorage() {
    const u = readUser();
    const elo = (u && typeof u.elo === 'number') ? u.elo : 1200;
    renderHeaderElo(elo);
  }

  // ---------- public API ----------
  window.Elo = {
    initHeader() {
      updateHeaderFromStorage();

      // Same-tab custom event (profile already dispatches this) + cross-tab "storage" sync
      window.addEventListener('eloUpdated', (e) => {
        if (e && e.detail && typeof e.detail.newElo === 'number') {
          renderHeaderElo(e.detail.newElo);
        }
      });

      window.addEventListener('storage', (e) => {
        if (e.key === 'loggedInUser') updateHeaderFromStorage();
      });
    },

    get() {
      const u = readUser();
      return (u && typeof u.elo === 'number') ? u.elo : 1200;
    },

    set(newElo) {
      const u = readUser();
      if (!u) return;
      u.elo = Math.max(0, Number(newElo) || 0);
      writeUser(u);
    },

    add(delta) {
      const u = readUser();
      if (!u) return;
      const base = (typeof u.elo === 'number') ? u.elo : 1200;
      u.elo = Math.max(0, base + (Number(delta) || 0));
      writeUser(u);
    }
  };
})();
