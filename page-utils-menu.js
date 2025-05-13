// Page Utility Menu — Vertical Dropdown v4
// ----------------------------------------------------
// • Button anchored at center‑right edge of the screen.
// • Utilities dropdown appears *below* the button.
// • Toast appears *above* the button.
// • Menu auto‑closes when a utility is clicked.
// • Still extensible via PageUtilMenu.register(id, label, handler).
// ----------------------------------------------------
(function PageUtilMenu(global) {
  "use strict";

  // ---------------------------------------------------------------------------
  // Registry
  // ---------------------------------------------------------------------------
  const utilities = new Map();
  function register(id, label, fn) {
    if (utilities.has(id)) throw new Error(`Utility with id "${id}" already exists.`);
    utilities.set(id, { label, handler: fn });
    if (ui.built) ui.addItem(id, label);
  }

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------
  const ui = {
    built: false,
    root: null,
    button: null,
    list: null,
    toast: null,

    build() {
      if (this.built) return;

      // ========== Styles ==========
      const style = document.createElement("style");
      style.textContent = `
        /* ===== ROOT ===== */
        [data-pum-root] {
          position: fixed;
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          font-family: system-ui, sans-serif;
          z-index: 2147483647;
          pointer-events: none;
        }

        /* ===== BUTTON ===== */
        .pum-btn {
          all: unset;
          pointer-events: auto;
          cursor: pointer;
          font-size: 1.35rem;
          background: #fff;
          border: 1px solid #ccc;
          border-radius: 50%;
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,.15);
        }

        /* ===== LIST / DROPDOWN ===== */
        .pum-list {
          pointer-events: auto;
          position: absolute;
          right: 0;
          top: calc(100% + 8px); /* below button */
          list-style: none;
          margin: 0;
          padding: .4rem 0;
          background: #fff;
          border: 1px solid #ccc;
          border-radius: 6px;
          box-shadow: 0 4px 10px rgba(0,0,0,.15);
          opacity: 0;
          transform: scaleY(0.95);
          transform-origin: top right;
          transition: opacity .25s, transform .25s;
        }
        [data-pum-root].open .pum-list {
          opacity: 1;
          transform: scaleY(1);
        }
        .pum-list li {
          padding: .5rem 1rem;
          white-space: nowrap;
          cursor: pointer;
        }
        .pum-list li:hover {background:#f3f4f6;}

        /* ===== TOAST ===== */
        .pum-toast {
          position: absolute;
          right: 0;
          bottom: calc(100% + 8px); /* above button */
          background: #323232;
          color: #fff;
          padding: .5rem .75rem;
          border-radius: 4px;
          font-size: .875rem;
          box-shadow: 0 2px 6px rgba(0,0,0,.2);
          max-width: 14rem;
          opacity: 0;
          transform: translateY(-10px);
          transition: opacity .25s, transform .25s;
          pointer-events: none;
        }
        .pum-toast.show {
          opacity: 1;
          transform: translateY(0);
        }
      `;
      (document.head || document.documentElement).appendChild(style);

      // ========== DOM ==========
      this.root = document.createElement("div");
      this.root.dataset.pumRoot = "";

      this.button = document.createElement("button");
      this.button.className = "pum-btn";
      this.button.textContent = "▼"; // down arrow indicates dropdown closed

      this.list = document.createElement("ul");
      this.list.className = "pum-list";

      this.toast = document.createElement("div");
      this.toast.className = "pum-toast";

      this.root.append(this.button, this.list, this.toast);
      (document.body ?? document.documentElement).appendChild(this.root);

      // Toggle dropdown
      this.button.addEventListener("click", () => {
        const open = this.root.classList.toggle("open");
        this.button.textContent = open ? "▲" : "▼";
        if (!open) this.list.blur?.();
      });

      // Load existing utilities
      for (const [id, { label }] of utilities) this.addItem(id, label);

      this.built = true;
    },

    addItem(id, label) {
      const li = document.createElement("li");
      li.textContent = label;
      li.addEventListener("click", async () => {
        // Close menu immediately
        this.root.classList.remove("open");
        this.button.textContent = "▼";
        try {
          await utilities.get(id).handler();
        } catch (err) {
          console.error(`Utility \"${id}\" failed`, err);
          this.showToast(`Failed: ${label}`);
        }
      });
      this.list.appendChild(li);
    },

    showToast(msg, dur = 2000) {
      this.toast.textContent = msg;
      this.toast.classList.add("show");
      clearTimeout(this.toast._timer);
      this.toast._timer = setTimeout(() => this.toast.classList.remove("show"), dur);
    }
  };

  // ---------------------------------------------------------------------------
  // Built‑in utility: Copy Page Text (same logic)
  // ---------------------------------------------------------------------------
  register("copy-article-text", "Copy Article Text", async () => {
    const selectorOrder = ["article", "main", "body"];
    let text = "";
    for (const sel of selectorOrder) {
      const node = document.querySelector(sel);
      if (node) { text = node.innerText.trim(); break; }
    }
    if (!text) return ui.showToast("Nothing to copy 🤷‍♂️");
    try {
      await navigator.clipboard.writeText(text);
      ui.showToast("Copied ✅");
    } catch {
      ui.showToast("Clipboard error ❌");
    }
  });

  // ---------------------------------------------------------------------------
  // Init on DOM ready
  // ---------------------------------------------------------------------------
  const init = () => ui.build();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  // Public API
  global.PageUtilMenu = { register, toast: (m, d) => ui.showToast(m, d) };
})(window);

/* -----------------------------------------------------------------------------
🔧 Extending the Menu
PageUtilMenu.register("take-screenshot", "Take Screenshot", () => {...});
----------------------------------------------------------------------------- */
