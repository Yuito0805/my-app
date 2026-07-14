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
    });
    tabPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.tabPanel === target));
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

(() => {
  const tabList = document.querySelector('[role="tablist"]');
  if (!tabList) return;
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];
  tabList.addEventListener("keydown", (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0
      : event.key === "End" ? tabs.length - 1
      : event.key === "ArrowRight" ? (index + 1) % tabs.length
      : (index - 1 + tabs.length) % tabs.length;
    tabs[nextIndex]?.focus();
    tabs[nextIndex]?.click();
  });
})();
