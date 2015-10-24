(function () {
  "use strict";

  var maxHeadHeight = 200;
  var minHeadHeight = 45;
  var maxHeadPadding = 40;
  var minHeadPadding = 5;

  // assumes offset parent is at top for the sake of simplicity
  function Sticky(head, title, toc, page, gradientBit) {
    page.style.paddingTop = maxHeadHeight;
    head.style.height = maxHeadHeight + "px";
    var padding = minHeadPadding + ((maxHeadPadding - minHeadPadding) * ((maxHeadHeight - minHeadHeight) / (maxHeadHeight - minHeadHeight)));
    head.style.padding = padding + "px 0px";
    title.style.fontSize = (maxHeadHeight - (padding * 2)) * 0.7;
    var pageScroll = Derivable.atom(window.scrollY);
    var tocScroll = Derivable.atom(toc.scrollTop);

    window.addEventListener('scroll', function () { pageScroll.set(window.scrollY); });
    toc.addEventListener('scroll', function () { tocScroll.set(this.scrollTop); });

    var headHeight = pageScroll.derive(function (scroll) {
      return Math.max(maxHeadHeight - scroll, minHeadHeight);
    });

    headHeight.react(function (headHeight) {
      spacer.style.height = headHeight + "px";
      gradientBit.style.marginTop = headHeight + "px";

      var scale = headHeight / maxHeadHeight;
      head.style.transform = "scale("+scale+","+scale+")";
    });

    var gradientOpacity = tocScroll.derive(function (scroll) {
      return Math.min(scroll / 20, 1);
    });

    gradientOpacity.react(function (opacity) {
      gradientBit.style.opacity = opacity;
    });
  }

  window.addEventListener("load", function () {
    var $ = function (id) { return document.getElementById(id); };
    Sticky($("head"), $("title"), $("toc"), $("page"), $("gradient-bit"), $("spacer"));
  });
})();
