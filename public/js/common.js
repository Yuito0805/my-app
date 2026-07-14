(() => {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navMenu = document.querySelector("[data-nav-menu]");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  document.querySelectorAll("[data-toast]").forEach((toast) => {
    const closeButton = toast.querySelector("[data-toast-close]");
    const dismiss = () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-8px)";
      setTimeout(() => toast.remove(), 180);
    };
    closeButton?.addEventListener("click", dismiss);
    setTimeout(dismiss, 5200);
  });

  const modalBackdrop = document.querySelector("[data-confirm-modal]");
  const modalTitle = modalBackdrop?.querySelector("[data-modal-title]");
  const modalMessage = modalBackdrop?.querySelector("[data-modal-message]");
  const modalConfirm = modalBackdrop?.querySelector("[data-modal-confirm]");
  const modalCancel = modalBackdrop?.querySelector("[data-modal-cancel]");
  let pendingForm = null;

  const closeModal = () => {
    modalBackdrop?.classList.remove("open");
    document.body.style.overflow = "";
    pendingForm = null;
  };

  document.querySelectorAll("form[data-confirm]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      if (!modalBackdrop || form.dataset.confirmed === "true") return;
      event.preventDefault();
      pendingForm = form;
      if (modalTitle) modalTitle.textContent = form.dataset.confirmTitle || "この操作を実行しますか？";
      if (modalMessage) modalMessage.textContent = form.dataset.confirmMessage || "実行後は元に戻せない場合があります。";
      if (modalConfirm) {
        modalConfirm.textContent = form.dataset.confirmLabel || "実行する";
        modalConfirm.className = form.dataset.confirmVariant === "danger" ? "danger" : form.dataset.confirmVariant === "success" ? "success" : "primary";
      }
      modalBackdrop.classList.add("open");
      document.body.style.overflow = "hidden";
      modalConfirm?.focus();
    });
  });

  modalConfirm?.addEventListener("click", () => {
    if (!pendingForm) return;
    const form = pendingForm;
    form.dataset.confirmed = "true";
    closeModal();
    HTMLFormElement.prototype.submit.call(form);
  });
  modalCancel?.addEventListener("click", closeModal);
  modalBackdrop?.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalBackdrop?.classList.contains("open")) closeModal();
  });

  const tabButtons = [...document.querySelectorAll("[data-tab-target]")];
  const tabPanels = [...document.querySelectorAll("[data-tab-panel]")];

  const activateTab = (target) => {
    tabButtons.forEach((button) => {
      const active = button.dataset.tabTarget === target;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    tabPanels.forEach((panel) => {
      const active = panel.dataset.tabPanel === target;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  };

  if (tabButtons.length > 0) {
    const queryTab = new URLSearchParams(location.search).get("tab");
    const initial = queryTab || location.hash.replace("#", "") || tabButtons[0].dataset.tabTarget;
    const validInitial = tabButtons.some((button) => button.dataset.tabTarget === initial)
      ? initial
      : tabButtons[0].dataset.tabTarget;
    activateTab(validInitial);

    tabButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        const target = button.dataset.tabTarget;
        activateTab(target);
        const url = new URL(location.href);
        url.searchParams.set("tab", target);
        url.hash = "";
        history.replaceState(null, "", url);
      });
      button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % tabButtons.length;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabButtons.length - 1;
        tabButtons[nextIndex].focus();
        tabButtons[nextIndex].click();
      });
    });
  }

  const chatMessages = document.querySelector("[data-chat-messages]");
  if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
})();

(() => {
  const searchForm = document.querySelector("[data-search-form]");
  if (searchForm) {
    searchForm.addEventListener("submit", () => {
      searchForm.classList.add("is-submitting");
      const button = searchForm.querySelector(".search-button");
      if (button) {
        button.disabled = true;
        button.textContent = "検索中…";
      }
    });
  }

  document.querySelectorAll(".favorite-form").forEach((form) => {
    form.addEventListener("submit", () => {
      form.querySelector(".favorite-button")?.classList.add("is-pulsing");
    });
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    });
  }
})();
