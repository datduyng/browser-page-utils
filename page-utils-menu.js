// Page Utility Menu — v5 with Screenshot & Screen Record
// ----------------------------------------------------
// • Center‑right dropdown button (▼/▲)
// • Toasts above the button
// • Utilities:
//     – Copy Article Text
//     – Take Screenshot (downloads PNG)
//     – Start / Stop Screen Recording (downloads WEBM)
// ----------------------------------------------------
(function PageUtilMenu(global) {
  "use strict";

  // ---------------------------------------------------------------------------
  // Registry + helpers
  // ---------------------------------------------------------------------------
  const utilities = new Map();

  function register(id, label, fn) {
    if (utilities.has(id))
      throw new Error(`Utility with id "${id}" already exists.`);
    utilities.set(id, {
      label,
      handler: fn
    });
    if (ui.built) ui.addItem(id, label);
  }

  function unregister(id) {
    utilities.delete(id);
    ui.removeItem(id);
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
    _idToLi: new Map(),

    build() {
      if (this.built) return;

      const style = document.createElement("style");
      style.textContent = `
        [data-pum-root]{position:fixed;top:50%;right:0;transform:translateY(-50%);font-family:system-ui,sans-serif;z-index:2147483647;pointer-events:none}
        .pum-btn{all:unset;pointer-events:auto;cursor:pointer;font-size:1.35rem;background:#fff;border:1px solid #ccc;border-radius:50%;width:2.5rem;height:2.5rem;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.15)}
        .pum-list{pointer-events:auto;position:absolute;right:0;top:calc(100% + 8px);list-style:none;margin:0;padding:.4rem 0;background:#fff;border:1px solid #ccc;border-radius:6px;box-shadow:0 4px 10px rgba(0,0,0,.15);opacity:0;transform:scaleY(.95);transform-origin:top right;transition:opacity .25s,transform .25s}
        [data-pum-root].open .pum-list{opacity:1;transform:scaleY(1)}
        .pum-list li{padding:.5rem 1rem;white-space:nowrap;cursor:pointer}
        .pum-list li:hover{background:#f3f4f6}
        .pum-toast{position:absolute;right:0;bottom:calc(100% + 8px);background:#323232;color:#fff;padding:.5rem .75rem;border-radius:4px;font-size:.875rem;box-shadow:0 2px 6px rgba(0,0,0,.2);max-width:14rem;opacity:0;transform:translateY(-10px);transition:opacity .25s,transform .25s;pointer-events:none}
        .pum-toast.show{opacity:1;transform:translateY(0)}
      `;
      (document.head || document.documentElement).appendChild(style);

      this.root = document.createElement("div");
      this.root.dataset.pumRoot = "";

      this.button = document.createElement("button");
      this.button.className = "pum-btn";
      this.button.textContent = "▼";

      this.list = document.createElement("ul");
      this.list.className = "pum-list";

      this.toast = document.createElement("div");
      this.toast.className = "pum-toast";

      this.root.append(this.button, this.list, this.toast);
      (document.body ?? document.documentElement).appendChild(this.root);

      this.button.addEventListener("click", () => {
        const open = this.root.classList.toggle("open");
        this.button.textContent = open ? "▲" : "▼";
      });

      for (const [id, {
        label
      }] of utilities) this.addItem(id, label);
      this.built = true;
    },

    addItem(id, label) {
      const li = document.createElement("li");
      li.textContent = label;
      li.addEventListener("click", async () => {
        // close menu
        this.root.classList.remove("open");
        this.button.textContent = "▼";
        try {
          await utilities.get(id).handler();
        } catch (e) {
          console.error(e);
          this.showToast(`Failed: ${label}`);
        }
      });
      this.list.appendChild(li);
      this._idToLi.set(id, li);
    },

    removeItem(id) {
      const li = this._idToLi.get(id);
      if (li) {
        li.remove();
        this._idToLi.delete(id);
      }
    },

    showToast(msg, dur = 2000) {
      this.toast.textContent = msg;
      this.toast.classList.add("show");
      clearTimeout(this.toast._timer);
      this.toast._timer = setTimeout(() => this.toast.classList.remove("show"), dur);
    }
  };

  // ---------------------------------------------------------------------------
  // Utility: Copy Page Text
  // ---------------------------------------------------------------------------
  register("copy-text", "Copy Article Text", async () => {
    const sel = ["article", "main", "body"];
    let t = "";
    for (const s of sel) {
      const n = document.querySelector(s);
      if (n) {
        t = n.innerText.trim();
        break;
      }
    }
    if (!t) return ui.showToast("Nothing to copy 🤷‍♂️");
    try {
      await navigator.clipboard.writeText(t);
      ui.showToast("Copied ✅");
    } catch {
      ui.showToast("Clipboard error ❌");
    }
  });

  // ---------------------------------------------------------------------------
  // Utility: Screenshot (downloads PNG of viewport via captureStream)
  // ---------------------------------------------------------------------------
  register("screenshot", "Take Screenshot", async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop();
      // draw to canvas
      const cvs = document.createElement("canvas");
      cvs.width = bitmap.width;
      cvs.height = bitmap.height;
      cvs.getContext("2d").drawImage(bitmap, 0, 0);
      cvs.toBlob(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "screenshot.png";
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
      ui.showToast("Screenshot saved 📸");
    } catch (err) {
      console.error(err);
      ui.showToast("Screenshot cancelled");
    }
  });

  // ---------------------------------------------------------------------------
  // Utility: Screen Recording (Start / Stop toggle)
  // ---------------------------------------------------------------------------
  let recorder = null,
    chunks = [];
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      recorder = new MediaRecorder(stream);
      chunks = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: "video/webm"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "recording.webm";
        a.click();
        URL.revokeObjectURL(url);
        ui.showToast("Recording saved 🎞️");
        // cleanup tracks
        stream.getTracks().forEach(t => t.stop());
        toggleRecordMenu(false);
      };
      recorder.start();
      ui.showToast("Recording started ⏺️");
      toggleRecordMenu(true);
    } catch (err) {
      console.error(err);
      ui.showToast("Recording cancelled");
    }
  }

  function stopRecording() {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function toggleRecordMenu(isRecording) {
    if (isRecording) {
      unregister("start-record");
      register("stop-record", "Stop Recording", stopRecording);
    } else {
      unregister("stop-record");
      register("start-record", "Start Recording", startRecording);
    }
  }
  // initial registration
  register("start-record", "Start Recording", startRecording);

  // ---------------------------------------------------------------------------
  // Init on DOM ready
  // ---------------------------------------------------------------------------
  const init = () => ui.build();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {
    once: true
  });
  else init();

  global.PageUtilMenu = {
    register,
    toast: (m, d) => ui.showToast(m, d)
  };
})(window);

/* -----------------------------------------------------------------------------
🔧 Example Extension
// PageUtilMenu.register("hello","Say Hello",()=>PageUtilMenu.toast("Hello!"));
 ----------------------------------------------------------------------------- */