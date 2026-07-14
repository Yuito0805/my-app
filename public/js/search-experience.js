(() => {
  const form = document.querySelector("[data-search-form]");
  const input = document.querySelector("[data-search-input]");
  const targetSelect = document.querySelector("[data-search-target]");
  const suggestionBox = document.querySelector("[data-search-suggestions]");
  const loading = document.querySelector("[data-page-loading]");
  let requestId = 0;
  let debounceTimer = null;

  const closeSuggestions = () => {
    if (!suggestionBox) return;
    suggestionBox.innerHTML = "";
    suggestionBox.classList.remove("open");
  };

  const showSuggestions = (suggestions) => {
    if (!suggestionBox) return;
    suggestionBox.innerHTML = "";
    suggestions.forEach((suggestion) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-suggestion-item";
      button.setAttribute("role", "option");
      const typeLabel = document.createElement("span");
      typeLabel.className = "suggestion-type";
      typeLabel.textContent = suggestion.type;
      const valueLabel = document.createElement("span");
      valueLabel.textContent = suggestion.label;
      button.append(typeLabel, valueLabel);
      button.addEventListener("click", () => {
        if (input) input.value = suggestion.value;
        if (targetSelect) targetSelect.value = suggestion.target;
        closeSuggestions();
        input?.focus();
      });
      suggestionBox.appendChild(button);
    });
    suggestionBox.classList.toggle("open", suggestions.length > 0);
  };

  input?.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (!query) {
      closeSuggestions();
      return;
    }
    debounceTimer = setTimeout(async () => {
      const id = ++requestId;
      try {
        const response = await fetch(`/api/search-suggestions?q=${encodeURIComponent(query)}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const suggestions = await response.json();
        if (id === requestId) showSuggestions(suggestions);
      } catch {
        closeSuggestions();
      }
    }, 180);
  });

  input?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSuggestions();
    if (event.key === "ArrowDown") {
      const first = suggestionBox?.querySelector("button");
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  suggestionBox?.addEventListener("keydown", (event) => {
    const buttons = [...suggestionBox.querySelectorAll("button")];
    const current = buttons.indexOf(document.activeElement);
    if (event.key === "ArrowDown" && current >= 0) {
      event.preventDefault();
      buttons[(current + 1) % buttons.length]?.focus();
    }
    if (event.key === "ArrowUp" && current >= 0) {
      event.preventDefault();
      if (current === 0) input?.focus();
      else buttons[current - 1]?.focus();
    }
    if (event.key === "Escape") {
      closeSuggestions();
      input?.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!suggestionBox?.contains(event.target) && event.target !== input) closeSuggestions();
  });

  form?.addEventListener("submit", () => {
    closeSuggestions();
    loading?.classList.add("open");
    loading?.setAttribute("aria-hidden", "false");
  });

  const filterToggle = document.querySelector("[data-filter-toggle]");
  const filterPanel = document.querySelector("[data-filter-panel]");
  filterToggle?.addEventListener("click", () => {
    const open = filterPanel?.classList.toggle("open") || false;
    filterToggle.setAttribute("aria-expanded", String(open));
  });

  const courseForm = document.querySelector("[data-course-form]");
  if (courseForm) {
    const checkboxes = [...courseForm.querySelectorAll('input[type="checkbox"][name="courseIds"]')];
    const count = courseForm.querySelector("[data-course-count]");
    const filter = courseForm.querySelector("[data-course-filter]");
    const choices = [...courseForm.querySelectorAll("[data-course-choice]")];
    const clear = courseForm.querySelector("[data-course-clear]");

    const updateCount = () => {
      const checked = checkboxes.filter((checkbox) => checkbox.checked);
      if (count) count.textContent = String(checked.length);
      checkboxes.forEach((checkbox) => {
        checkbox.disabled = !checkbox.checked && checked.length >= 12;
      });
    };

    checkboxes.forEach((checkbox) => checkbox.addEventListener("change", updateCount));
    updateCount();

    filter?.addEventListener("input", () => {
      const keyword = filter.value.trim().toLocaleLowerCase("ja");
      choices.forEach((choice) => {
        const visible = !keyword || choice.dataset.searchText.includes(keyword);
        choice.hidden = !visible;
      });
    });

    clear?.addEventListener("click", () => {
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
        checkbox.disabled = false;
      });
      updateCount();
    });
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(() => {}));
  }
})();
