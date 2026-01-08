/* scripts/live2d-waifu.js */

const WIDGET_BASE = "https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/";
const MODEL_CDN = "https://cdn.jsdelivr.net/gh/fghrsh/live2d_api/";

hexo.extend.injector.register("head_end", () => {
  return `
<link rel="stylesheet" href="${WIDGET_BASE}waifu.css">
<style>
  #waifu { z-index: 999999 !important; }
  @media (max-width: 768px) { #waifu { display: block !important; } }

  #live2d-picker-panel button{
    cursor:pointer;border:0;border-radius:6px;padding:4px 8px;
  }
</style>
`;
});

hexo.extend.injector.register("body_end", () => {
  return `
<script>
(function () {
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Failed to load: " + src)); };
      document.body.appendChild(s);
    });
  }

  function cleanupOld() {
    var old = document.getElementById("waifu");
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  function ensurePanel() {
    var id = "live2d-picker-panel";
    var p = document.getElementById(id);
    if (p) return p;

    p = document.createElement("div");
    p.id = id;
    p.style.cssText =
      "position:fixed;right:12px;bottom:12px;z-index:1000000;" +
      "background:rgba(0,0,0,.55);color:#fff;padding:10px 12px;" +
      "border-radius:10px;font-size:12px;line-height:1.4;" +
      "backdrop-filter: blur(6px); max-width: 360px;";

    p.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
        <b>Live2D 预览</b>
        <button id="l2d-close">×</button>
      </div>
      <div id="l2d-info" style="margin:6px 0 8px 0;word-break:break-all;opacity:.95;"></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button id="l2d-prev">上一个</button>
        <button id="l2d-next">下一个</button>
        <button id="l2d-rand">随机</button>
        <button id="l2d-auto">自动轮播</button>
        <button id="l2d-stop" style="display:none;">停止</button>
      </div>
      <div style="margin-top:8px;opacity:.8;">
        看中某个就记下 modelId / modelTexturesId。
      </div>
    `;
    document.body.appendChild(p);
    p.querySelector("#l2d-close").onclick = function () { p.remove(); };
    return p;
  }

  // 拉模型列表并展开为 flat list（27 个）
  function fetchModelFlatList() {
    return fetch("${MODEL_CDN}model_list.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var groups = (data && data.models) ? data.models : [];
        var messages = (data && data.messages) ? data.messages : [];
        var flat = [];

        for (var gid = 0; gid < groups.length; gid++) {
          var entry = groups[gid];
          var msg = messages[gid] ? (" | " + messages[gid]) : "";

          if (Array.isArray(entry)) {
            for (var tid = 0; tid < entry.length; tid++) {
              flat.push({ groupId: gid, texId: tid, label: String(entry[tid]) + msg });
            }
          } else {
            flat.push({ groupId: gid, texId: 0, label: String(entry) + msg });
          }
        }

        return flat;
      });
  }

  // 兜底：即使模型列表挂了，也至少显示一只
  function initDefaultModel() {
    console.warn("[Live2D] fallback to default model (modelId=0).");
    cleanupOld();
    window.initWidget({
      waifuPath: "${WIDGET_BASE}waifu-tips.json",
      cdnPath: "${MODEL_CDN}",
      drag: true,
      modelId: 0,
      modelTexturesId: 0,
      logLevel: "warn"
    });
  }

  var KEY = "live2d_picker_idx_v2";
  function loadPick() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return 0;
      var obj = JSON.parse(raw);
      return typeof obj.idx === "number" ? obj.idx : 0;
    } catch (e) { return 0; }
  }
  function savePick(idx) {
    localStorage.setItem(KEY, JSON.stringify({ idx: idx }));
  }

  function initByFlat(flat, idx) {
    idx = (idx + flat.length) % flat.length;
    var item = flat[idx];

    cleanupOld();

    window.initWidget({
      waifuPath: "${WIDGET_BASE}waifu-tips.json",
      cdnPath: "${MODEL_CDN}",
      drag: true,
      modelId: item.groupId,
      modelTexturesId: item.texId,
      logLevel: "warn"
    });

    var info = document.getElementById("l2d-info");
    if (info) {
      info.textContent =
        "[" + (idx + 1) + "/" + flat.length + "] " +
        "modelId=" + item.groupId + ", modelTexturesId=" + item.texId +
        " | " + item.label;
    }

    savePick(idx);

    setTimeout(function () {
      console.log("[Live2D] waifu node =", document.getElementById("waifu"));
    }, 800);
  }

  function boot() {
    console.log("[Live2D] boot fired. initWidget =", typeof window.initWidget);

    if (typeof window.initWidget !== "function") {
      console.warn("[Live2D] initWidget missing. waifu-tips.js may not be executed.");
      return;
    }

    fetchModelFlatList()
      .then(function (flat) {
        console.log("[Live2D] flat models =", flat.length);
        if (!flat.length) {
          initDefaultModel();
          return;
        }

        var panel = ensurePanel();
        var idx = loadPick();
        if (idx < 0 || idx >= flat.length) idx = 0;

        var autoTimer = null;

        function show(i) {
          idx = (i + flat.length) % flat.length;
          initByFlat(flat, idx);
        }

        show(idx);

        panel.querySelector("#l2d-prev").onclick = function () { show(idx - 1); };
        panel.querySelector("#l2d-next").onclick = function () { show(idx + 1); };
        panel.querySelector("#l2d-rand").onclick = function () { show(Math.floor(Math.random() * flat.length)); };

        panel.querySelector("#l2d-auto").onclick = function () {
          if (autoTimer) return;
          panel.querySelector("#l2d-auto").style.display = "none";
          panel.querySelector("#l2d-stop").style.display = "inline-block";
          autoTimer = setInterval(function () { show(idx + 1); }, 5000);
        };

        panel.querySelector("#l2d-stop").onclick = function () {
          if (autoTimer) clearInterval(autoTimer);
          autoTimer = null;
          panel.querySelector("#l2d-auto").style.display = "inline-block";
          panel.querySelector("#l2d-stop").style.display = "none";
        };
      })
      .catch(function (e) {
        console.error("[Live2D] fetch model_list failed:", e);
        // 关键：失败也要显示默认模型，避免“空白”
        initDefaultModel();
      });
  }

  // 先加载脚本，再 boot
  Promise.resolve()
    .then(function () { return loadScript("${WIDGET_BASE}live2d.min.js"); })
    .then(function () { return loadScript("${WIDGET_BASE}waifu-tips.js"); })
    .then(function () { boot(); })
    .catch(function (e) { console.error("[Live2D] load error:", e); });

  document.addEventListener("pjax:complete", boot);
  document.addEventListener("pjax:success", boot);
})();
</script>
`;
});
