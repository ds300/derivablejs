(function () {
  "use strict";

  var maxHeadHeight = 150;
  var minHeadHeight = 40;
  var maxHeadPadding = 40;
  var minHeadPadding = 5;

  // assumes offset parent is at top for the sake of simplicity
  function Sticky(head, title, toc, page, gradientBit) {
    var inFixedMode = false;
    page.style.top = maxHeadHeight + "px";
    toc.style.paddingTop = maxHeadHeight + "px";
    gradientBit.style.marginTop = maxHeadHeight + "px";
    gradientBit.style.opacity = "0";

    function check () {
      var scroll = window.scrollY;
      var headHeight = Math.max(minHeadHeight, maxHeadHeight - scroll);

      if (headHeight === minHeadHeight) {
        if (!inFixedMode) {
          head.style.height = minHeadHeight + "px";
          head.style.padding = minHeadPadding + "px 0px";
          title.style.fontSize = (minHeadHeight - (minHeadPadding * 2)) * 0.7;
          toc.style.paddingTop = minHeadHeight + "px";
          gradientBit.style.marginTop = minHeadHeight + "px";
          inFixedMode = true;
        }
      } else {
        toc.style.paddingTop = headHeight + "px";
        gradientBit.style.marginTop = headHeight + "px";
        if (inFixedMode) {
          inFixedMode = false;
        }

        head.style.height = headHeight + "px";
        var padding = minHeadPadding + ((maxHeadPadding - minHeadPadding) * ((headHeight - minHeadHeight) / (maxHeadHeight - minHeadHeight)));
        head.style.padding = padding + "px 0px";
        title.style.fontSize = (headHeight - (padding * 2)) * 0.7;
      }
    }
    check();
    window.addEventListener("scroll", check);
    toc.addEventListener("scroll", function () {
      // 10px grace
      var opacity = Math.min(Math.max(this.scrollTop / 10, 0), 1);
      gradientBit.style.opacity = "" + opacity;
    });
  }

  window.addEventListener("load", function () {
    var $ = function (id) { return document.getElementById(id); };
    Sticky($("head"), $("title"), $("toc"), $("page"), $("gradient-bit"));
  });
})();
