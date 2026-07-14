(() => {
  const input = document.querySelector("[data-search-suggestions]");
  const list = document.querySelector("[data-suggestion-list]");
  if (!input || !list) return;

  let controller = null;
  let timer = null;

  const hide = () => {
    list.hidden = true;
    list.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
  };

  const render = (suggestions) => {
    list.innerHTML = "";
    if (!suggestions.length) return hide();

    suggestions.forEach((suggestion) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-suggestion-item";
      button.setAttribute("role", "option");

      const type = document.createElement("span");
      type.className = "suggestion-type";
      type.textContent = suggestion.type === "course" ? "教科" : "教科書";

      const content = document.createElement("span");
      content.className = "suggestion-content";
      const label = document.createElement("strong");
      label.textContent = suggestion.label;
      const meta = document.createElement("small");
      meta.textContent = suggestion.meta;
      content.append(label, meta);

      button.append(type, content);
      button.addEventListener("click", () => {
        input.value = suggestion.value;
        const targetSelect = input.form?.querySelector('select[name="target"]');
        if (targetSelect && suggestion.type === "course") targetSelect.value = "course";
        if (targetSelect && suggestion.type === "title") targetSelect.value = "title";
        hide();
        input.focus();
      });
      list.append(button);
    });

    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");

  input.addEventListener("input", () => {
    clearTimeout(timer);
    controller?.abort();
    const q = input.value.trim();
    if (!q) return hide();

    timer = setTimeout(async () => {
      controller = new AbortController();
      try {
        const response = await fetch(`/api/search-suggestions?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!response.ok) return hide();
        render(await response.json());
      } catch (error) {
        if (error.name !== "AbortError") hide();
      }
    }, 180);
  });

  document.addEventListener("click", (event) => {
    if (event.target !== input && !list.contains(event.target)) hide();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });
})();
