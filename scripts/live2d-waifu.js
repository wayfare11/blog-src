/* scripts/live2d-waifu.js */

const WIDGET_BASE = "https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/";
const MODEL_CDN = "https://cdn.jsdelivr.net/gh/fghrsh/live2d_api/";

hexo.extend.injector.register("head_end", () => {
  return `
<link rel="stylesheet" href="${WIDGET_BASE}waifu.css">
<style>
  /* 置顶，避免被主题遮住 */
  #waifu { z-index: 999999 !important; }
  /* 有些版本默认移动端隐藏，这里强制显示 */
  @media (max-width: 768px) { #waifu { display: block !important; } }

  /* 小面板 */
  #l2d-mini {
    position: fixed; right: 12px; bottom: 12px;
    z-index: 1000000;
    background: rgba(0,0,0,.55);
    color: #fff;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.4;
    backdrop-filter: blur(6px);
    max-width: 360px;
  }
  #l2d-mini button {
    cursor: pointer; border: 0; border-radius: 6px;
    padding: 4px 8px;
  }
  #l2d-mini .row { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
  #l2d-mini .title { display:flex; justify-content:space-between; align-items:center; gap:8px; }
  #l2d-mini .hint { margin-top:8px; opacity:.8; }
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

  // 你已验证：总共 7 组，其中第 4 组有 2 个，第 5 组有 20 个
  var GROUP_COUNTS = [1, 1, 1, 1, 2, 20, 1];

  var KEY = "live2d_pick_simple_v1";

  function loadPick() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { modelId: 0, texId: 0 };
      var obj = JSON.parse(raw);
      return {
        modelId: Number.isFinite(obj.modelId) ? obj.modelId : 0,
        texId: Number.isFinite(obj.texId) ? obj.texId : 0
      };
    } catch (e) {
      return { modelId: 0, texId: 0 };
    }
  }

  function savePick(modelId, texId) {
    localStorage.setItem(KEY, JSON.stringify({ modelId: modelId, texId: texId }));
  }

  function clampPick(modelId, texId) {
    modelId = ((modelId % 7) + 7) % 7;
    var maxTex = GROUP_COUNTS[modelId] || 1;
    texId = ((texId % maxTex) + maxTex) % maxTex;
    return { modelId: modelId, texId: texId };
  }

  function ensureMiniPanel() {
    var p = document.getElementById("l2d-mini");
    if (p) return p;

    p = document.createElement("div");
    p.id = "l2d-mini";
    p.innerHTML = \`
      <div class="title">
        <b>Live2D 预览</b>
        <button id="l2d-close">×</button>
      </div>
      <div id="l2d-info" style="margin-top:6px;word-break:break-all;"></div>
      <div class="row">
        <button id="l2d-prev">上一个</button>
        <button id="l2d-next">下一个</button>
        <button id="l2d-tex">换子模型</button>
        <button id="l2d-rand">随机</button>
      </div>
      <div class="hint">快捷键：Ctrl+J 换组，Ctrl+K 换子模型</div>
    \`;
    document.body.appendChild(p);

    p.querySelector("#l2d-close").onclick = function () { p.remove(); };
    return p;
  }

  function apply(modelId, texId) {
    var pick = clampPick(modelId, texId);
    cleanupOld();

    window.initWidget({
      waifuPath: "${WIDGET_BASE}waifu-tips.json",
      cdnPath: "${MODEL_CDN}",
      drag: true,
      modelId: pick.modelId,
      modelTexturesId: pick.texId,
      logLevel: "warn"
    });

    savePick(pick.modelId, pick.texId);

    var info = document.getElementById("l2d-info");
    if (info) {
      var total = GROUP_COUNTS.reduce(function (s, n) { return s + n; }, 0);
      info.textContent =
        "当前：modelId=" + pick.modelId +
        "，modelTexturesId=" + pick.texId +
        "（本组共 " + GROUP_COUNTS[pick.modelId] + " 个；总计 " + total + " 个）";
    }
  }

  function boot() {
    console.log("[Live2D] boot fired. initWidget =", typeof window.initWidget);

    if (typeof window.initWidget !== "function") {
      console.warn("[Live2D] initWidget missing. waifu-tips.js may not be executed.");
      return;
    }

    // 防止 PJAX 多次绑定事件
    if (!window.__l2dPickerBound) {
      window.__l2dPickerBound = true;

      document.addEventListener("keydown", function (e) {
        if (!e.ctrlKey) return;
        var pick = loadPick();
        if (e.key === "j" || e.key === "J") {
          pick.modelId += 1;
          pick.texId = 0;
          pick = clampPick(pick.modelId, pick.texId);
          apply(pick.modelId, pick.texId);
        }
        if (e.key === "k" || e.key === "K") {
          pick.texId += 1;
          pick = clampPick(pick.modelId, pick.texId);
          apply(pick.modelId, pick.texId);
        }
      });
    }

    var panel = ensureMiniPanel();
    var pick = clampPick(loadPick().modelId, loadPick().texId);

    // 按钮事件（只绑定一次）
    if (!panel.__bound) {
      panel.__bound = true;

      panel.querySelector("#l2d-prev").onclick = function () {
        var p = loadPick();
        apply(p.modelId - 1, 0);
      };
      panel.querySelector("#l2d-next").onclick = function () {
        var p = loadPick();
        apply(p.modelId + 1, 0);
      };
      panel.querySelector("#l2d-tex").onclick = function () {
        var p = loadPick();
        apply(p.modelId, p.texId + 1);
      };
      panel.querySelector("#l2d-rand").onclick = function () {
        var gid = Math.floor(Math.random() * 7);
        var tid = Math.floor(Math.random() * (GROUP_COUNTS[gid] || 1));
        apply(gid, tid);
      };
    }

    // 初次显示（或 PJAX 后恢复）
    apply(pick.modelId, pick.texId);
  }

  // 首次加载：先确保 live2d.min.js、waifu-tips.js 真正执行完，再 init
  Promise.resolve()
    .then(function () { return loadScript("${WIDGET_BASE}live2d.min.js"); })
    .then(function () { return loadScript("${WIDGET_BASE}waifu-tips.js"); })
    .then(function () { boot(); })
    .catch(function (e) { console.error("[Live2D] load error:", e); });

  // ShokaX PJAX：切页后重挂
  document.addEventListener("pjax:complete", boot);
  document.addEventListener("pjax:success", boot);
})();
</script>
`;
});
