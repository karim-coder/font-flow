// Debounce function to limit how often a function runs
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Fallback for clipboard copying
async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    // Use the Clipboard API when available
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("Clipboard API failed, falling back to execCommand", err);
    }
  }

  // Fallback for older browsers or non-secure contexts
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy method failed", err);
    document.body.removeChild(textArea);
    return false;
  }
}

// Global variables
let fonts = [];
let currentFilter = "all";
let favorites = new Set();

// Load favorites from localStorage
function loadFavorites() {
  const stored = localStorage.getItem("fontFavorites");
  if (stored) {
    favorites = new Set(JSON.parse(stored));
  }
}

// Save favorites to localStorage
function saveFavorites() {
  localStorage.setItem("fontFavorites", JSON.stringify([...favorites]));
}

// Toggle favorite status
function toggleFavorite(fontName) {
  if (favorites.has(fontName)) {
    favorites.delete(fontName);
  } else {
    favorites.add(fontName);
  }
  saveFavorites();
  // Re-render if currently showing favorites
  if (currentFilter === "favorites") {
    renderFonts(currentFilter);
  }
}

const input = document.getElementById("logoText");
const clearBtn = document.getElementById("clearBtn");
const grid = document.getElementById("grid");
const toast = document.getElementById("toast");
const filterBtns = document.querySelectorAll(".filter-btn");
const statsCount = document.getElementById("count");

// Load fonts from JSON
async function loadFonts() {
  try {
    const response = await fetch("fonts.json");
    fonts = await response.json();
    renderFonts();
  } catch (error) {
    console.error("Failed to load fonts:", error);
    // Fallback to empty array or show error
  }
}

// Render fonts based on filter
function renderFonts(filter = "all") {
  grid.innerHTML = "";
  let filteredFonts;
  if (filter === "favorites") {
    filteredFonts = fonts.filter((f) => favorites.has(f.name));
  } else {
    filteredFonts =
      filter === "all" ? fonts : fonts.filter((f) => f.category === filter);
  }

  statsCount.textContent = filteredFonts.length;

  const currentText = input.value.trim() || "ABC";

  filteredFonts.forEach((font) => {
    const card = document.createElement("div");
    card.className = "logo-card";

    const logoDiv = document.createElement("div");
    logoDiv.className = `logo ${font.class}`;
    logoDiv.textContent = currentText;

    const fontInfo = document.createElement("div");
    fontInfo.className = "font-info";
    fontInfo.innerHTML = `
      <div class="font-name">${font.name}</div>
      <div class="category">${font.category}</div>
    `;

    const favoriteBtn = document.createElement("button");
    favoriteBtn.className = `favorite-btn ${
      favorites.has(font.name) ? "favorited" : ""
    }`;
    favoriteBtn.innerHTML = favorites.has(font.name) ? "★" : "☆";
    favoriteBtn.title = favorites.has(font.name)
      ? "Remove from favorites"
      : "Add to favorites";
    favoriteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card click
      toggleFavorite(font.name);
      favoriteBtn.classList.toggle("favorited");
      favoriteBtn.innerHTML = favorites.has(font.name) ? "★" : "☆";
      favoriteBtn.title = favorites.has(font.name)
        ? "Remove from favorites"
        : "Add to favorites";
    });

    const copyIndicator = document.createElement("div");
    copyIndicator.className = "copy-indicator";
    copyIndicator.textContent = "Copied!";

    card.appendChild(logoDiv);
    card.appendChild(fontInfo);
    card.appendChild(favoriteBtn);
    card.appendChild(copyIndicator);

    card.addEventListener("click", async () => {
      const success = await copyToClipboard(font.name);
      if (success) {
        card.classList.add("copied");
        showToast();
        setTimeout(() => {
          card.classList.remove("copied");
        }, 600);
      }
    });

    grid.appendChild(card);
  });
}

// Show toast notification
function showToast() {
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Debounced input handler
const debouncedUpdateLogos = debounce(function () {
  renderFonts(currentFilter);
}, 300);

// Event listeners
input.addEventListener("input", debouncedUpdateLogos);

clearBtn.addEventListener("click", () => {
  input.value = "";
  input.focus();
  renderFonts(currentFilter);
});

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderFonts(currentFilter);
  });
});

// Initialize
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    loadFavorites();
    loadFonts();
  });
} else {
  // Fallback for browsers that don't support Font Loading API
  setTimeout(() => {
    loadFavorites();
    loadFonts();
  }, 100);
}
