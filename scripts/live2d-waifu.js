/* scripts/live2d-waifu.js */

const WIDGET_BASE = "https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/";
// 模型仓库（项目本体不带模型，需要 cdnPath）
const MODEL_CDN = "https://cdn.jsdelivr.net/gh/fghrsh/live2d_api/";

hexo.extend.injector.register("head_end", () => {
  return `
<link rel="stylesheet" href="${WIDGET_BASE}waifu.css">
<style>
  /* 置顶，避免被主题遮住 */
  #waifu { z-index: 999999 !important; }
  /* 有些版本默认移动端隐藏，这里强制显示 */
  @media (max-width: 768px) {
    #waifu { display: block !important; }
  }

  /* 预览面板样式 */
  #live2d-picker-panel button {
    cursor: pointer;
    border: 0;
    border-radius: 6px;
    padding: 4px 8px;
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
      s.async = false; // 保证顺序
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Failed to load: " + src)); };
      document.body.appendChild(s);
    });
  }

  function cleanupOld() {
    var old = document.getElementById("waifu");
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  // 把 {models:[...], messages:[...]} 展开成 27 个可选项
  function fetchModelFlatList() {
    return fetch("${MODEL_CDN}model_list.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var groups = data && data.models ? data.models : [];
        var messages = data && data.messages ? data.messages : [];
        var flat = [];

        for (var gid = 0; gid < groups.length; gid++) {
          var entry = groups[gid];
          var msg = messages[gid] ? (" | " + messages[gid]) : "";

          if (Array.isArray(entry)) {
            for (var tid = 0; tid < entry.length; tid++) {
              flat.push({
                groupId: gid,
                texId: tid,
                label: String(entry[tid]) + msg
              });
            }
          } else {
            flat.push({
              groupId: gid,
              texId: 0,
              label: String(entry) + msg
            });
          }
        }
        return flat;
      });
  }

  // 预览面板
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
        提示：看中某个后，记下上面的 modelId / modelTexturesId。
      </div>
    `;

    document.body.appendChild(p);

    p.querySelector("#l2d-close").onclick = function () {
      p.remove();
    };

    return p;
  }

  var KEY = "live2d_picker_idx_v1";

  function loadPick() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return 0;
      var obj = JSON.parse(raw);
      return typeof obj.idx === "number" ? obj.idx : 0;
    } catch (e) {
      return 0;
    }
  }

  function savePick(idx) {
    localStorage.setItem(KEY, JSON.stringify({ idx: idx }));
  }

  function initByFlat(flat, idx) {
    if (!flat || !flat.length) return;

    idx = (idx + flat.length) % flat.length;
    var item = flat[idx];

    cleanupOld();

    window.initWidget({
      waifuPath: "${WIDGET_BASE}waifu-tips.json",
      cdnPath: "${MODEL_CDN}",

      // 可拖拽
      drag: true,

      // 关键：组 + 子模型
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

    // 每次 boot 都用同一个面板与同一份 flat 列表（避免重复 fetch）
    if (boot.__running) return;
    boot.__running = true;

    fetchModelFlatList()
      .then(function (flat) {
        console.log("[Live2D] total models:", flat.length);

        var panel = ensurePanel();
        var idx = loadPick();
        if (idx < 0) idx = 0;
        if (idx >= flat.length) idx = 0;

        var autoTimer = null;

        function show(i) {
          idx = (i + flat.length) % flat.length;
          initByFlat(flat, idx);
        }

        // 初次显示
        show(idx);

        panel.querySelector("#l2d-prev").onclick = function () { show(idx - 1); };
        panel.querySelector("#l2d-next").onclick = function () { show(idx + 1); };
        panel.querySelector("#l2d-rand").onclick = function () { show(Math.floor(Math.random() * flat.length)); };

        panel.querySelector("#l2d-auto").onclick = function () {
          if (autoTimer) return;
          panel.querySelector("#l2d-auto").style.display = "none";
          panel.querySelector("#l2d-stop").style.display = "inline-block";
          autoTimer = setInterval(function () { show(idx + 1); }, 5000); // 5 秒换一个
        };

        panel.querySelector("#l2d-stop").onclick = function () {
          if (autoTimer) clearInterval(autoTimer);
          autoTimer = null;
          panel.querySelector("#l2d-auto").style.display = "inline-block";
          panel.querySelector("#l2d-stop").style.display = "none";
        };
      })
      .catch(function (e) {
        console.error("[Live2D] failed to build model list:", e);
      })
      .finally(function () {
        boot.__running = false;
      });
  }

  // 首次加载：确保 live2d.min.js、waifu-tips.js 加载后再 boot
  Promise.resolve()
    .then(function () { return loadScript("${WIDGET_BASE}live2d.min.js"); })
    .then(function () { return loadScript("${WIDGET_BASE}waifu-tips.js"); })
    .then(function () { boot(); })
    .catch(function (e) { console.error("[Live2D] load error:", e); });

  // ShokaX PJAX：切页后重挂（脚本不会重复加载，只重 init）
  document.addEventListener("pjax:complete", boot);
  document.addEventListener("pjax:success", boot);
})();
</script>
`;
});
