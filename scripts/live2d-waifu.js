/* scripts/live2d-waifu.js */
hexo.extend.injector.register("head_end", () => {
    return `
  <link rel="stylesheet" href="https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.0/dist/waifu.css">
  `;
  });
  
  hexo.extend.injector.register("body_end", () => {
    return `
  <script src="https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.0/dist/live2d.min.js"></script>
  <script src="https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.0/dist/waifu-tips.js"></script>
  <script>
  (function () {
    var MODEL_CDN = "https://fastly.jsdelivr.net/gh/fghrsh/live2d_api/";
  
    function cleanupOld() {
      var old = document.getElementById("waifu");
      if (old && old.parentNode) old.parentNode.removeChild(old);
    }
  
    function boot() {
      if (typeof window.initWidget !== "function") return;
  
      cleanupOld();
  
      window.initWidget({
        waifuPath: "https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.0/dist/waifu-tips.json",
        cdnPath: MODEL_CDN,
  
        // 关键：启用拖拽
        drag: true,
  
        modelId: 0,
        logLevel: "warn"
      });
    }
  
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  
    // ShokaX 常见 PJAX：切页后再初始化一次，避免切页消失/失效
    document.addEventListener("pjax:complete", boot);
    document.addEventListener("pjax:success", boot);
  })();
  </script>
  `;
  });
  