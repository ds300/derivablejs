(function () {
  "use strict";

  // assumes offset parent is at top for the sake of simplicity
  function Sticky(elem) {
    var naturalTop = elem.offsetTop;
    // also assumes other things won't add new classes. Again, simplicity.
    var savedClasses = elem.className;
    var currentlySticky = false;

    function check () {
      if (!currentlySticky && naturalTop < window.scrollY) {
        currentlySticky = true;
        elem.className = savedClasses + " fixed";
      } else  if (currentlySticky && naturalTop >= window.scrollY) {
        currentlySticky = false;
        elem.className = savedClasses;
      }
    }

    check();

    window.addEventListener("scroll", check);
  }

  window.addEventListener("load", function () {
    Sticky(document.getElementById("toc"));
  });
})();
