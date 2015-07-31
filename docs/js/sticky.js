(function () {
  "use strict";

  var maxHeadHeight = 150;
  var minHeadHeight = 40;
  var maxHeadPadding = 40;
  var minHeadPadding = 5;

  // assumes offset parent is at top for the sake of simplicity
  function Sticky(head, title, toc, page) {
    var inFixedMode = false;
    page.style.top = maxHeadHeight + "px";
    toc.style.top = maxHeadHeight + "px";

    function check () {
      var scroll = window.scrollY;
      var headHeight = Math.max(minHeadHeight, maxHeadHeight - scroll);

      if (headHeight === minHeadHeight) {
        if (!inFixedMode) {
          head.style.height = minHeadHeight + "px";
          head.style.padding = minHeadPadding + "px 0px";
          title.style.fontSize = (minHeadHeight - (minHeadPadding * 2)) * 0.7;
          toc.className = "fixed";
          toc.style.top = minHeadHeight + "px";
          inFixedMode = true;
        }
      } else {
        if (inFixedMode) {
          toc.className = "";
          toc.style.top = maxHeadHeight + "px";
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
  }

  window.addEventListener("load", function () {
    var $ = function (id) { return document.getElementById(id); };
    Sticky($("head"), $("title"), $("toc"), $("page"));
  });
})();
