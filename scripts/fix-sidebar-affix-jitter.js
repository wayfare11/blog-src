/* global hexo */
hexo.extend.filter.register('theme_inject', function (injects) {
  injects.bodyEnd.raw('fix-sidebar-affix-jitter', `
script.
  (() => {
    if (window.__shokaxAffixJitterFixed) return;
    window.__shokaxAffixJitterFixed = true;

    let targetCL = null;
    let lastApplied = null;
    let pending = null;
    let count = 0;

    const REQUIRED = 5;  // 建议 5，更稳
    const TOKEN = 'affix';

    function refreshTarget() {
      const sidebar = document.getElementById('sidebar');
      targetCL = sidebar ? sidebar.classList : null;
      lastApplied = sidebar ? sidebar.classList.contains(TOKEN) : null;
      pending = null;
      count = 0;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', refreshTarget, { once: true });
    } else {
      refreshTarget();
    }

    document.addEventListener('pjax:complete', refreshTarget);
    document.addEventListener('pjax:success', refreshTarget);

    const origToggle = DOMTokenList.prototype.toggle;

    DOMTokenList.prototype.toggle = function(token, force) {
      if (targetCL && this === targetCL && token === TOKEN && typeof force === 'boolean') {
        if (lastApplied === null) lastApplied = this.contains(TOKEN);

        if (force === lastApplied) {
          pending = null; count = 0;
          return origToggle.call(this, token, lastApplied);
        }

        if (pending === force) count++;
        else { pending = force; count = 1; }

        if (count < REQUIRED) {
          return origToggle.call(this, token, lastApplied);
        }

        lastApplied = force;
        pending = null; count = 0;
        return origToggle.call(this, token, lastApplied);
      }

      return origToggle.apply(this, arguments);
    };
  })();
`);
});
