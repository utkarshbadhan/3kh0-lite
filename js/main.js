// Shared by every page, including each game page: applies the tab disguise
// (custom title and icon) chosen in Tools. No ads, no analytics.
(function () {
  try {
    const title = localStorage.getItem("title");
    const icon = localStorage.getItem("icon");
    if (title) document.title = title;
    if (icon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = icon;
    }
  } catch (e) {}
})();
