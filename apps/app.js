// Shared helpers for ScienceTube apps: match the site's colour theme and
// give each app its own small slice of localStorage.
(function () {
  try {
    const t = JSON.parse(localStorage.getItem("nebula.theme") || '"nebula"');
    if (t && t !== "nebula") document.documentElement.dataset.theme = t;
  } catch (e) {}
  window.AppStore = function (ns) {
    const k = (key) => "sciencetube.app." + ns + "." + key;
    return {
      get(key, d) { try { const v = localStorage.getItem(k(key)); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
      set(key, v) { try { localStorage.setItem(k(key), JSON.stringify(v)); } catch (e) {} },
    };
  };
  window.escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
})();
