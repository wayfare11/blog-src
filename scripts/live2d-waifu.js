/* scripts/live2d-waifu.js */

const WIDGET_BASE = "https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/";
// 模型仓库（项目本体不带模型，需要 cdnPath）:contentReference[oaicite:1]{index=1}
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

        // 关键：可拖拽
        drag: true,

        modelId: 1,
        logLevel: "warn"
      });

      // 给你一个确认点：1 秒后看看 DOM 里是否出现 #waifu
      setTimeout(function () {
        console.log("[Live2D] waifu node =", document.getElementById("waifu"));
      }, 1000);

    } catch (e) {
      console.error("[Live2D] initWidget threw:", e);
    }
  }

  // 首次加载：先确保 live2d.min.js、waifu-tips.js 真正执行完，再 init
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
