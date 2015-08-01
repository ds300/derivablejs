(function () {
  "use strict";

  var maxHeadHeight = 200;
  var minHeadHeight = 40;
  var maxHeadPadding = 40;
  var minHeadPadding = 5;

  // assumes offset parent is at top for the sake of simplicity
  function Sticky(head, title, toc, page, gradientBit) {
    page.style.paddingTop = maxHeadHeight;
    var pageScroll = Havelock.atom(window.scrollY);
    var tocScroll = Havelock.atom(toc.scrollTop);

    window.addEventListener('scroll', function () { pageScroll.set(window.scrollY); });
    toc.addEventListener('scroll', function () { tocScroll.set(this.scrollTop); });

    var headHeight = pageScroll.derive(function (scroll) {
      return Math.max(maxHeadHeight - scroll, minHeadHeight);
    });

    headHeight.react(function (headHeight) {
      spacer.style.height = headHeight + "px";
      gradientBit.style.marginTop = headHeight + "px";
      head.style.height = headHeight + "px";
      var padding = minHeadPadding + ((maxHeadPadding - minHeadPadding) * ((headHeight - minHeadHeight) / (maxHeadHeight - minHeadHeight)));
      head.style.padding = padding + "px 0px";
      title.style.fontSize = (headHeight - (padding * 2)) * 0.7;
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
