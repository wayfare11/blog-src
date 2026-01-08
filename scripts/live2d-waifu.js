/* scripts/live2d-waifu.js */

const WIDGET_BASE =
  "https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/";
const MODEL_CDN =
  "https://cdn.jsdelivr.net/gh/fghrsh/live2d_api/";

hexo.extend.injector.register("head_end", () => {
  return `
<link rel="stylesheet" href="${WIDGET_BASE}waifu.css">
<style>
  #waifu {
    z-index: 999999 !important;
  }
  @media (max-width: 768px) {
    #waifu {
      display: block !important;
    }
  }
</style>
`;
});

hexo.extend.injector.register("body_end", () => {
  return `
<script>
(function () {
  /* ---------------- 工具函数 ---------------- */

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error("Failed to load: " + src));
      };
      document.body.appendChild(s);
    });
  }

  function cleanupOld() {
    var old = document.getElementById("waifu");
    if (old && old.parentNode) {
      old.parentNode.removeChild(old);
    }
  }

  /* ---------------- 模型列表 ---------------- */

  var MODEL_LIST = [];
  var MODEL_INDEX = 0;
  var MODEL_READY = false;

  function buildModelList() {
    return fetch("${WIDGET_BASE}waifu-tips.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (cfg) {
        var list = [];
        cfg.models.forEach(function (m, modelId) {
          if (typeof m === "string") {
            list.push({ modelId: modelId });
          } else if (Array.isArray(m)) {
            m.forEach(function (_, modelIndex) {
              list.push({
                modelId: modelId,
                modelIndex: modelIndex
              });
            });
          }
        });
        return list;
      });
  }

  /* ---------------- 初始化模型 ---------------- */

  function mountModel(entry) {
    if (typeof window.initWidget !== "function") {
      console.warn("[Live2D] initWidget missing");
      return;
    }

    cleanupOld();

    console.log("[Live2D] mount", entry);

    window.initWidget({
      waifuPath: "${WIDGET_BASE}waifu-tips.json",
      cdnPath: "${MODEL_CDN}",
      drag: true,
      logLevel: "warn",
      modelId: entry.modelId,
      modelIndex: entry.modelIndex
    });
  }

  /* ---------------- 切换模型 ---------------- */

  window.nextLive2D = function () {
    if (!MODEL_READY) return;
    MODEL_INDEX = (MODEL_INDEX + 1) % MODEL_LIST.length;
    mountModel(MODEL_LIST[MODEL_INDEX]);
  };

  /* ---------------- 启动逻辑 ---------------- */

  function boot() {
    if (MODEL_READY) {
      mountModel(MODEL_LIST[MODEL_INDEX]);
      return;
    }

    buildModelList().then(function (list) {
      MODEL_LIST = list;
      MODEL_READY = true;
      MODEL_INDEX = 0;
      mountModel(MODEL_LIST[0]);
    });
  }

  /* ---------------- 脚本加载 ---------------- */

  Promise.resolve()
    .then(function () {
      return loadScript("${WIDGET_BASE}live2d.min.js");
    })
    .then(function () {
      return loadScript("${WIDGET_BASE}waifu-tips.js");
    })
    .then(function () {
      boot();
    })
    .catch(function (e) {
      console.error("[Live2D] load error:", e);
    });

  /* ---------------- PJAX 兼容 ---------------- */

  document.addEventListener("pjax:complete", boot);
  document.addEventListener("pjax:success", boot);

  /* ---------------- 点击切换 ---------------- */

  document.addEventListener("click", function (e) {
    var waifu = e.target.closest("#waifu");
    if (waifu) {
      window.nextLive2D();
    }
  });
})();
</script>
`;
});
