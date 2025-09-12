
// /js/elo-global.js
(() => {
  'use strict';
  if (window.Elo) return; // prevent double-load

  // ---- Ranks (3-tier spec) ----
  const ELO_RANKS = {
    beginner:     { min:   0, max: 1200, name: 'Beginner',     class: 'rank-beginner',     simple: 'beginner' },
    intermediate: { min:1201, max: 2000, name: 'Intermediate', class: 'rank-intermediate', simple: 'intermediate' },
    advanced:     { min:2001, max: 9999, name: 'Advanced',     class: 'rank-advanced',     simple: 'advanced' },
  };

  // ---------- storage helpers ----------
  const readUser = () => {
    try { return JSON.parse(localStorage.getItem('loggedInUser') || 'null'); }
    catch { return null; }
  };
  const writeUser = (user) => {
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    // notify same tab
    window.dispatchEvent(new CustomEvent('eloUpdated', { detail: { newElo: user.elo } }));
  };

  // ---------- page ELO (page var > storage > default) ----------
  const getEffectiveElo = () => {
    if (typeof window !== 'undefined' && typeof window.currentELO === 'number') {
      return window.currentELO;
    }
    const u = readUser();
    return (u && typeof u.elo === 'number') ? u.elo : 1200;
  };

  // ---------- rank / progress ----------
  const getRank = (elo) => {
    for (const r of Object.values(ELO_RANKS)) {
      if (elo >= r.min && elo <= r.max) return r;
    }
    return ELO_RANKS.beginner;
  };
  const getProgressPct = (elo, rank) => {
    const span = Math.max(1, rank.max - rank.min);
    return Math.min(100, Math.max(0, ((elo - rank.min) / span) * 100));
  };

  // ---------- header renderer ----------
  function renderHeaderElo(elo) {
    const rank = getRank(elo);
    const pct  = getProgressPct(elo, rank);

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

    // Fallbacks for older headers
    const altBadge = document.getElementById('rankBadge') || document.querySelector('.rank-badge');
    const altFill  = document.getElementById('progressFill') || document.querySelector('.progress-fill');
    const altNum   = document.getElementById('eloNumber') || document.querySelector('.elo-number');
    if (altBadge || altFill || altNum) {
      if (altBadge) {
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

    // Ensure avatar goes to profile if it's not already an <a>
    const avatar = document.getElementById('userAvatar');
    if (avatar && avatar.tagName !== 'A') {
      avatar.onclick = () => { window.location.href = 'my-profile.html'; };
      if (!avatar.title) avatar.title = 'My Profile';
    }
  }

  const updateHeader = () => renderHeaderElo(getEffectiveElo());

  // ---------- public API ----------
  window.Elo = {
    initHeader() {
      updateHeader();

      // Same-tab updates
      window.addEventListener('eloUpdated', (e) => {
        if (e && e.detail && typeof e.detail.newElo === 'number') {
          renderHeaderElo(e.detail.newElo);
        } else {
          updateHeader();
        }
      });

      // Cross-tab storage sync
      window.addEventListener('storage', (e) => {
        if (e.key === 'loggedInUser') updateHeader();
      });

      // Manual force refresh hook
      window.addEventListener('eloForceRefresh', updateHeader);
    },

    get() { return getEffectiveElo(); },

    set(newElo) {
      const u = readUser();
      if (u) {
        u.elo = Math.max(0, Number(newElo) || 0);
        writeUser(u);
      } else {
        window.currentELO = Math.max(0, Number(newElo) || 0);
        updateHeader();
      }
    },

    add(delta) {
      const u = readUser();
      if (u) {
        const base = (typeof u.elo === 'number') ? u.elo : 1200;
        u.elo = Math.max(0, base + (Number(delta) || 0));
        writeUser(u);
      } else {
        const base = (typeof window.currentELO === 'number') ? window.currentELO : 1200;
        window.currentELO = Math.max(0, base + (Number(delta) || 0));
        updateHeader();
      }
    }
  };
})();