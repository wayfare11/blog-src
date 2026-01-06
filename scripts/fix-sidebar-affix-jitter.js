/* global hexo */
hexo.extend.filter.register('theme_inject', function (injects) {
  injects.bodyEnd.raw('fix-sidebar-affix-jitter', `
<script>
(() => {
  // 只打一次补丁，避免 pjax / 重载重复覆盖
  if (window.__shokaxAffixJitterFixed) return;
  window.__shokaxAffixJitterFixed = true;

  let targetCL = null;      // 当前 #sidebar 的 classList 引用
  let lastApplied = null;   // 我们最终允许的 affix 状态
  let pending = null;       // 等待确认的新状态
  let count = 0;

  const REQUIRED = 3;       // 连续 3 次一致才切换（你也可以改成 4/5 更稳）
  const TOKEN = 'affix';

  function refreshTarget() {
    const sidebar = document.getElementById('sidebar');
    targetCL = sidebar ? sidebar.classList : null;
    lastApplied = sidebar ? sidebar.classList.contains(TOKEN) : null;
    pending = null;
    count = 0;
  }

  // 初次定位
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshTarget, { once: true });
  } else {
    refreshTarget();
  }

  // pjax 情况：页面切换后 sidebar 可能被重建
  document.addEventListener('pjax:complete', refreshTarget);
  document.addEventListener('pjax:success', refreshTarget);

  const origToggle = DOMTokenList.prototype.toggle;

  DOMTokenList.prototype.toggle = function(token, force) {
    // 只拦截：#sidebar 的 affix toggle(force)
    if (targetCL && this === targetCL && token === TOKEN && typeof force === 'boolean') {
      if (lastApplied === null) lastApplied = this.contains(TOKEN);

      // force 和当前一致：直接保持
      if (force === lastApplied) {
        pending = null; count = 0;
        return origToggle.call(this, token, lastApplied);
      }

      // force 和当前不一致：要求连续稳定 N 次才切
      if (pending === force) count++;
      else { pending = force; count = 1; }

      if (count < REQUIRED) {
        // 还没稳定，继续维持旧状态
        return origToggle.call(this, token, lastApplied);
      }

      // 稳定了，允许切换
      lastApplied = force;
      pending = null; count = 0;
      return origToggle.call(this, token, lastApplied);
    }

    // 其他元素正常走原逻辑
    return origToggle.apply(this, arguments);
  };
})();
</script>
  `);
});
