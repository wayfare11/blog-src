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
  @media (max-width: 768px) {
    #waifu { display: block !important; }
  }

  /* ====== 关键修复：tips 层不要拦截鼠标/触摸事件，否则点不到 canvas 就无法触发拖拽 ====== */
  #waifu-tips, .waifu-tips-active { pointer-events: none !important; }

  /* 工具栏依然需要可点击 */
  #waifu-tool { pointer-events: auto !important; }

  /* 保险：canvas 必须能接收事件 */
  #live2d { pointer-events: auto !important; }
</style>
`;
});

hexo.extend.injector.register("body_end", () => {
  return `
<script>
(function () {
  // true：使用我们自己的 Pointer 拖拽（鼠标/触摸都能拖，最稳）
  // false：使用库自带拖拽（drag: true），但容易被 tips/遮罩层影响
  var USE_POINTER_DRAG = true;

  function loadScriptOnce(src, id) {
    // 已经有同 src / id 的 script 就不重复加载
    if (id && document.getElementById(id)) return Promise.resolve();
    var exists = Array.prototype.slice.call(document.scripts).some(function (s) { return s.src === src; });
    if (exists) return Promise.resolve();

    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      if (id) s.id = id;
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

  function applyEventFix() {
    var tips = document.getElementById("waifu-tips");
    if (tips) tips.style.pointerEvents = "none";
    var tool = document.getElementById("waifu-tool");
    if (tool) tool.style.pointerEvents = "auto";
    var canvas = document.getElementById("live2d");
    if (canvas) canvas.style.pointerEvents = "auto";
  }

  function enablePointerDrag() {
    var waifu = document.getElementById("waifu");
    var canvas = document.getElementById("live2d") || (waifu ? waifu.querySelector("canvas") : null);
    if (!waifu || !canvas) return;

    // 避免重复绑定（如果某些主题没有真正销毁节点）
    if (canvas.dataset && canvas.dataset.pointerDragBound === "1") return;
    if (canvas.dataset) canvas.dataset.pointerDragBound = "1";

    // 允许触摸拖拽（阻止浏览器默认手势/滚动抢事件）
    canvas.style.touchAction = "none";

    var dragging = false;
    var offsetX = 0, offsetY = 0;

    function start(e) {
      // 右键不处理
      if (typeof e.button === "number" && e.button === 2) return;

      dragging = true;

      // 一旦开始拖，改用 top/left 定位更稳定
      waifu.style.bottom = "auto";
      waifu.style.right = "auto";

      var rect = waifu.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    }

    function move(e) {
      if (!dragging) return;

      var maxLeft = window.innerWidth - waifu.offsetWidth;
      var maxTop  = window.innerHeight - waifu.offsetHeight;

      var left = e.clientX - offsetX;
      var top  = e.clientY - offsetY;

      // 限制在视口内
      left = Math.max(0, Math.min(maxLeft, left));
      top  = Math.max(0, Math.min(maxTop, top));

      waifu.style.left = left + "px";
      waifu.style.top  = top + "px";

      e.preventDefault();
    }

    function end() {
      dragging = false;
    }

    canvas.addEventListener("pointerdown", start);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  function boot() {
    console.log("[Live2D] boot fired. initWidget =", typeof window.initWidget);

    if (typeof window.initWidget !== "function") {
      console.warn("[Live2D] initWidget missing. waifu-tips.js may not be executed.");
      return;
    }

    try {
      cleanupOld();

      window.initWidget({
        waifuPath: "${WIDGET_BASE}waifu-tips.json",
        cdnPath: "${MODEL_CDN}",

        // 如果用 Pointer 拖拽兜底，这里建议关掉原生拖拽避免双监听冲突
        drag: USE_POINTER_DRAG ? false : true,

        modelId: 0,
        logLevel: "warn"
      });

      // DOM 出来后再做事件修复 & 拖拽绑定
      setTimeout(function () {
        console.log("[Live2D] waifu node =", document.getElementById("waifu"));
        applyEventFix();
        if (USE_POINTER_DRAG) enablePointerDrag();
      }, 0);

    } catch (e) {
      console.error("[Live2D] initWidget threw:", e);
    }
  }

  // 确保核心脚本加载后再 init（只加载一次）
  window.__LIVE2D_WIDGET_LOAD__ = window.__LIVE2D_WIDGET_LOAD__ || Promise.resolve()
    .then(function () { return loadScriptOnce("${WIDGET_BASE}live2d.min.js", "__live2d_core__"); })
    .then(function () { return loadScriptOnce("${WIDGET_BASE}waifu-tips.js", "__live2d_widget__"); });

  window.__LIVE2D_WIDGET_LOAD__
    .then(function () { boot(); })
    .catch(function (e) { console.error("[Live2D] load error:", e); });

  // ShokaX PJAX：切页后重挂（脚本不重复加载，只重 init）
  document.addEventListener("pjax:complete", boot);
  document.addEventListener("pjax:success", boot);
})();
</script>
`;
});
