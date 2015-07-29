(ns docgen.html
  "NIH gone wild. Hiccup reimplmented for some reason."
  (:require [goog.string :as gstring]))

(defn space [n]
  (reduce str (take (* 2 n) (repeat " "))))
; :tag-name(#id)?(.class-name)*
(def tag-re #"^:([\w\-]+)?(#([\w\-]+))?((\.[\w\-]+)*)$")

(defn parse-tag [tag]
  (let [[_ name _ id classes _ :as stuff] (.match tag tag-re)]
    (when stuff
      (let [name  (if name name "span")
            props (if id {:id id} {})
            props (if (not-empty classes)
                    (assoc props :class (-> classes
                                          (.slice 1)
                                          (.split ".")
                                          (.join " ")))
                    props)]
        [name props]))))

(defn process-tag [tag]
  (or (parse-tag (str tag))
      (throw (js/Error. (str "can't parse tag: " tag)))))

(def void-tags
  #{"area" "base" "br" "col" "command" "embed" "hr" "img" "input" "keygen" "link"
    "meta" "param" "source" "track" "wbr"})

(defprotocol IRender
  (render [this]))

(extend-type js/Object
  IRender
  (render [this] (gstring/htmlEscape (str this))))

(deftype RawHTMLString [string]
  IRender
  (render [_] string))

(defn raw [html-string]
  (RawHTMLString. html-string))

(defn prop-string [props]
  (reduce-kv (fn [acc key val]
               (str acc (name key) "=" (gstring/quote val)))
             " "
             props))

(defn render-element [tag props children]
  (let [props (if (empty? props) "" (prop-string props))
        open-tag (str "<" tag props)]
    (str open-tag
         (if (void-tags tag)
           "/>"
           (str ">"
                (reduce str (map render (filter identity children)))
                "</" tag ">")))))

(extend-type string
  IRender
  (render [this]
    (gstring/htmlEscape this)))

(extend-type cljs.core/PersistentVector
  IRender
  (render [[tag & [inline-props & more :as things]]]
    (let [[tag tag-props] (process-tag tag)
          props (if (map? inline-props)
                  (merge inline-props tag-props)
                  tag-props)
          children (if (map? inline-props) more things)]
      (render-element tag props children))))

(defn render-seq [s]
  (reduce str (map render s)))

(extend-type cljs.core/List
  IRender
  (render [x] (render-seq x)))

(extend-type cljs.core/LazySeq
  IRender
  (render [x] (render-seq x)))

(extend-type cljs.core/EmptyList
  IRender
  (render [x] (render-seq x)))

(extend-type nil
  IRender
  (render [_] ""))
