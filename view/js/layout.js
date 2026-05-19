// layout.js — shared sidebar/nav logic + dark mode for all app pages

// ─── Dark Mode ────────────────────────────────────────────────────────────────
const DARK_KEY = "filemoon_dark";

const applyTheme = (dark) => {
  document.documentElement.classList.toggle("dark", dark);
  const icon = document.getElementById("darkToggleIcon");
  if (icon) icon.className = dark ? "ri-sun-line text-lg" : "ri-moon-line text-lg";
};

const toggleDark = () => {
  const isDark = !document.documentElement.classList.contains("dark");
  localStorage.setItem(DARK_KEY, isDark);
  applyTheme(isDark);
};

// Apply saved preference immediately (before paint) to avoid flash
applyTheme(localStorage.getItem(DARK_KEY) === "true");

// ─── Sidebar (mobile-aware) ───────────────────────────────────────────────────
const isMobile = () => window.innerWidth < 768;

const toggleSidebar = () => {
  const sidebar = document.getElementById("sidebar");
  const navbar  = document.getElementById("navbar");
  const overlay = document.getElementById("sidebar-overlay");

  if (isMobile()) {
    // On mobile: slide in/out, show overlay
    const isOpen = sidebar.style.transform === "translateX(0px)";
    sidebar.style.transform = isOpen ? "translateX(-100%)" : "translateX(0px)";
    if (overlay) overlay.style.display = isOpen ? "none" : "block";
  } else {
    // On desktop: shrink sidebar and shift content
    const isOpen = sidebar.style.width !== "0px";
    sidebar.style.width    = isOpen ? "0px"   : "250px";
    navbar.style.marginLeft = isOpen ? "0px"  : "250px";
  }
};

const closeSidebar = () => {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  sidebar.style.transform = "translateX(-100%)";
  if (overlay) overlay.style.display = "none";
};

// Collapse sidebar correctly when window resizes between mobile/desktop
window.addEventListener("resize", () => {
  const sidebar = document.getElementById("sidebar");
  const navbar  = document.getElementById("navbar");
  const overlay = document.getElementById("sidebar-overlay");
  if (isMobile()) {
    sidebar.style.width     = "250px";   // reset width so transform works
    sidebar.style.transform = "translateX(-100%)";
    navbar.style.marginLeft = "0px";
    if (overlay) overlay.style.display = "none";
  } else {
    sidebar.style.transform = "translateX(0px)";
    sidebar.style.width     = "250px";
    navbar.style.marginLeft = "250px";
    if (overlay) overlay.style.display = "none";
  }
});

// ─── Nav active highlight ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".nav-link");

  links.forEach((link) => {
    const href = link.getAttribute("href").replace("./", "");
    if (window.location.pathname === href || window.location.href.includes(href)) {
      setActive(link);
    }
    link.addEventListener("click", function () { setActive(this); });
  });

  function setActive(activeLink) {
    links.forEach((link) => {
      link.style.backgroundColor = "";
      link.style.color = "";
    });
    activeLink.style.backgroundColor = "rgba(124, 58, 237, 0.2)";
    activeLink.style.color = "#a78bfa";
  }

  // Set initial sidebar state based on screen size
  const sidebar = document.getElementById("sidebar");
  const navbar  = document.getElementById("navbar");
  if (sidebar && navbar) {
    if (isMobile()) {
      sidebar.style.width     = "250px";
      sidebar.style.transform = "translateX(-100%)";
      navbar.style.marginLeft = "0px";
    } else {
      sidebar.style.width     = "250px";
      sidebar.style.transform = "translateX(0px)";
      navbar.style.marginLeft = "250px";
    }
  }
});