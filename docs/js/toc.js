(function () {
  "use strict";

  // assumes offset parent is at top for the sake of simplicity
  function Toc(rawAnchors) {
    var tocElem = document.getElementById("toc");
    var header = document.getElementsByClassName("header")[0];
    var anchors = [];
    var lis = {};

    var clicked = false;
    function yesClicked () {
      clicked = this;
      check();
      clicked = true;
    }

    for (var i = 0; i < rawAnchors.length; i++) {
      var a = rawAnchors[i];
      var toc_a = tocElem.querySelectorAll("a[href='#"+a.id+"']")[0];

      if (toc_a) {
        anchors.push(a);
        toc_a.addEventListener("click", yesClicked);
        lis[a.id] = toc_a.parentNode;
      }
    }

    var lastAnchorIdx = 0;

    function check(force) {
      console.log("jimmy", clicked);
      if (clicked && clicked !== true) {
        lis[anchors[lastAnchorIdx].id].className = "";
        clicked.parentNode.className = "active";
        var x = document.getElementById(clicked.href.split("#").pop());
        lastAnchorIdx = anchors.indexOf(x);
        clicked = false;
        return;
      } else if (clicked === true){
        clicked = false;
        return;
      }
      var i = lastAnchorIdx;
      var current = anchors[i];

      if (current.offsetTop <= window.scrollY - header.offsetHeight + 20) {
        // go forward
        do {
          i++;
        } while (i < anchors.length && anchors[i].offsetTop <= window.scrollY - header.offsetHeight + 20);
        i--;
      } else {
        // go backward
        do {
          i--
        } while (i > 0 && anchors[i].offsetTop >= window.scrollY - header.offsetHeight +20 );

        if (i < 0) {
          i = 0;
        }
      }

      if (!(force === true) && i === lastAnchorIdx) return;

      var lastId = anchors[lastAnchorIdx].id;
      var nextId = anchors[i].id;
      var nextLi = lis[nextId];

      lis[lastId].className = "";
      nextLi.className = "active";

      if (nextLi.offsetTop < tocElem.scrollTop) {
        tocElem.scrollTop = nextLi.offsetTop;
      } else if (nextLi.offsetTop > tocElem.offsetHeight + tocElem.scrollTop - nextLi.offsetHeight) {
        tocElem.scrollTop += (nextLi.offsetTop - (tocElem.offsetHeight + tocElem.scrollTop - nextLi.offsetHeight))
      }


      lastAnchorIdx = i;
    }

    check(true);

    window.addEventListener("scroll", check);
  }

  window.addEventListener("load", function () {
    Toc(document.querySelectorAll("a[id]"));
  });
})();
