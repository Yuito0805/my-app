(() => {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navMenu = document.querySelector("[data-nav-menu]");

  const closeNavigation = () => {
    navMenu?.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
  };

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    navMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNavigation));
  }

  document.querySelectorAll("[data-toast]").forEach((toast) => {
    const closeButton = toast.querySelector("[data-toast-close]");
    const dismiss = () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-8px)";
      window.setTimeout(() => toast.remove(), 180);
    };
    closeButton?.addEventListener("click", dismiss);
    window.setTimeout(dismiss, 5200);
  });

  const modalBackdrop = document.querySelector("[data-confirm-modal]");
  const modalTitle = modalBackdrop?.querySelector("[data-modal-title]");
  const modalMessage = modalBackdrop?.querySelector("[data-modal-message]");
  const modalConfirm = modalBackdrop?.querySelector("[data-modal-confirm]");
  const modalCancel = modalBackdrop?.querySelector("[data-modal-cancel]");
  let pendingForm = null;
  let modalTrigger = null;

  const focusableSelector = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

  const closeModal = () => {
    modalBackdrop?.classList.remove("open");
    document.body.style.overflow = "";
    pendingForm = null;
    if (modalTrigger instanceof HTMLElement) modalTrigger.focus();
    modalTrigger = null;
  };

  document.querySelectorAll("form[data-confirm]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      if (!modalBackdrop || form.dataset.confirmed === "true") return;
      event.preventDefault();
      pendingForm = form;
      modalTrigger = event.submitter instanceof HTMLElement ? event.submitter : document.activeElement;
      if (modalTitle) modalTitle.textContent = form.dataset.confirmTitle || "この操作を実行しますか？";
      if (modalMessage) modalMessage.textContent = form.dataset.confirmMessage || "実行後は元に戻せない場合があります。";
      if (modalConfirm) {
        modalConfirm.textContent = form.dataset.confirmLabel || "実行する";
        modalConfirm.className = form.dataset.confirmVariant === "danger"
          ? "danger"
          : form.dataset.confirmVariant === "success" ? "success" : "primary";
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
    if (event.key === "Escape") {
      if (modalBackdrop?.classList.contains("open")) closeModal();
      closeNavigation();
    }

    if (event.key === "Tab" && modalBackdrop?.classList.contains("open")) {
      const focusable = [...modalBackdrop.querySelectorAll(focusableSelector)].filter((element) => element instanceof HTMLElement);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  const tabButtons = [...document.querySelectorAll("[data-tab-target]")];
  const tabPanels = [...document.querySelectorAll("[data-tab-panel]")];

  const activateTab = (target, focus = false) => {
    tabButtons.forEach((button) => {
      const active = button.dataset.tabTarget === target;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.setAttribute("tabindex", active ? "0" : "-1");
      if (active && focus) button.focus();
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

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.tabTarget;
        activateTab(target);
        const url = new URL(location.href);
        url.searchParams.set("tab", target);
        url.hash = "";
        history.replaceState(null, "", url);
      });
    });

    const tabList = document.querySelector('[role="tablist"]');
    tabList?.addEventListener("keydown", (event) => {
      const index = tabButtons.indexOf(document.activeElement);
      if (index < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0
        : event.key === "End" ? tabButtons.length - 1
        : event.key === "ArrowRight" ? (index + 1) % tabButtons.length
        : (index - 1 + tabButtons.length) % tabButtons.length;
      activateTab(tabButtons[nextIndex].dataset.tabTarget, true);
    });
  }

  document.querySelectorAll("[data-demo-login]").forEach((button) => {
    button.addEventListener("click", () => {
      const nameInput = document.querySelector("#login-name");
      const emailInput = document.querySelector("#login-email");
      if (!(nameInput instanceof HTMLInputElement) || !(emailInput instanceof HTMLInputElement)) return;
      nameInput.value = button.dataset.demoName || "";
      emailInput.value = button.dataset.demoEmail || "";
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      emailInput.focus();
    });
  });

  const chatMessages = document.querySelector("[data-chat-messages]");
  if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
})();
