(ns docgen.docs
  (:require [docgen.names :refer [resolve make-namespace]]
            [docgen.html :as html]
            [docgen.ast :as ast]
            [cljs.pprint :refer [pprint]]
            [clojure.string :as str :refer [join]]
            [docgen.markdown :as md]))

(def ^:dynamic *namespace* nil)

(defprotocol IDoc
  (gen [this path]))

(defprotocol IToc
  (toc [this path]))

(defprotocol ILink
  (link [this path]))

(defn icon [nm]
  [:i {:class (str "fa fa-" (name nm))}])

(defn path-href
  ([path]
    (str "#" (join "-" path)))
  ([path name] (path-href (conj (vec path) name))))

(defn do-resolve [namespace path [name & others]]
  (if-let [named (resolve namespace path name)]
    (cons named
          (when (seq others)
            (do-resolve (:namespace named) (:path named) others)))
    (throw (js/Error. (str "Can't resolve name: " name)))))

(defn code-link [path name]
  [:code
    (interpose [:.punct "::"]
      (for [{:keys [element path]} (do-resolve *namespace*
                                               path
                                               (str/split name "::"))]
        (link element (pop path))))])

(defn render-code-link [path name]
  (html/render (code-link path name)))

(defn compile-md [doc path]
  (html/raw (md/compile-doc doc
                            (dec (count path))
                            (partial render-code-link path))))

(defn anchor [path name]
  (let [id (join "-" (conj path name))]
    [:a.anchor {:id id :href (str "#" id)} (icon :anchor)]))

(defmulti render-doc :modifier)

(extend-type ast/Doc
  IDoc
  (gen [this path]
    (render-doc this path)))

(defmethod render-doc :markdown [{s :value} path]
  (when (not-empty s)
    [:div.docs (compile-md s path)]))

(defmethod render-doc :see-also [{things :value} path]
  [:div.see-also
    [:p [:.label "See also: "]
        (interpose ", "
                   (map (comp (partial code-link path) str)
                        things))]])

(defmethod render-doc :note [{s :value} path]
  (when (not-empty s)
    [:div.note (compile-md s path)]))

(defn gen-docs [docs path]
  (map #(gen % path) docs))

(defn gen-members [members path name]
  (let [path (conj path name)]
    (for [member members]
      (gen member path))))

(defn gen-type-args [type-args path]
  (when (not-empty type-args)
    [:span [:.punct "<"]
           (interpose [:.punct ", "] (map #(gen % path) type-args))
           [:.punct ">"]]))

(defn gen-params [params path]
  [:.params
    [:.punct "("]
    (interpose [:.punct ", "] (map #(gen % path) params))
    [:.punct ")"]])

(def type-subheadings [ [ast/Module     "Modules"   ]
                        [ast/Function   "Functions" ]
                        [ast/Class      "Classes"   ]
                        [ast/Interface  "Interfaces"]
                        [ast/Property   "Properties"] ])

(defn toc-grouped [members path]
  (let [groups (group-by type members)]
    (for [[type subheading] type-subheadings]
      (when-let [group (groups type)]
        (list
          [:li.subheading subheading]
          (map #(toc % path) group))))))

(defn doc-grouped [members path name]
  (let [groups (group-by type members)]
    (for [[type _] type-subheadings]
      (when-let [group (groups type)]
        (gen-members group path name)))))

(extend-type ast/Module
  IDoc
  (gen [{:keys [name docs members]} path]
    [:div.module
      (anchor path name)
      [:h2.code [:.punct "module "] [:.module name]]
      (gen-docs docs (conj path name))
      (doc-grouped members path name)])

  IToc
  (toc [{:keys [members name]} path]
    (let [things (group-by type members)]
      [:ul (toc-grouped members (conj path name))]))

  ILink
  (link [{:keys [name]} path]
    [:a.interface {:href (path-href path name)} name]))

(extend-type ast/Interface
  IDoc
  (gen [{:keys [name type-args docs members extends]} path]
    [:div.interface
      (anchor path name)
      [:h3.code
        [:.punct "interface "]
        [:.interface
          name
          (gen-type-args type-args (conj path name))]]
      (when (seq extends)
        [:h4.code [:.punct "extends "] (interpose [:.punct ", "] (map #(gen % (conj path name)) extends))])
      (gen-docs docs (conj path name))
      (gen-members members path name)])

  IToc
  (toc [{:keys [name members] :as this} path]
    [:li.interface (link this path)
      (when (seq members)
        [:ul (map #(toc % (conj path name)) members)])])

  ILink
  (link [{:keys [name]} path]
    [:a.interface {:href (path-href path name)} name]))

(extend-type ast/Class
  IDoc
  (gen [{:keys [name type-args docs members extends]} path]
    [:div.class
      (anchor path name)
      [:h3.code
        [:.punct "class "]
        [:.class
          name
          (gen-type-args type-args (conj path name))]]
      (when (seq extends)
        [:h4.code [:.punct "extends "] (interpose [:.punct ", "] (map #(gen % (conj path name)) extends))])
      (gen-docs docs (conj path name))
      (gen-members members path name)])

  IToc
  (toc [{:keys [name members] :as this} path]
    [:li.interface (link this path)
      (when (seq members)
        [:ul (map #(toc % (conj path name)) members)])])

  ILink
  (link [{:keys [name]} path]
    [:a.class {:href (path-href path name)} name]))

(extend-type ast/Function
  IDoc
  (gen [{:keys [name signatures docs]} path]
    (let [do-individual-type-args (not (or (= 1 (count signatures))
                                           (apply = (map :type-args signatures))))]
       [:div.function
         (anchor path name)
         [:h3.code
           [:.punct "function "]
           [:.function name (when-not do-individual-type-args
                          (gen-type-args (:type-args (first signatures)) (conj path name)))]]
         (gen-docs docs (conj path name))
         (for [{:keys [type-args params return-type docs]} signatures]
           [:div.function-signature
             [:h4.code
               (when do-individual-type-args
                 (gen-type-args type-args (conj path name)))
               [:.params (gen-params params (conj path name))]
               [:.punct " => "]
               (gen return-type (conj path name))]
             (gen-docs docs (conj path name))])]))

  IToc
  (toc [this path]
    [:li.function (link this path)])

  ILink
  (link [{:keys [name]} path]
    [:a.function {:href (path-href path name)} name]))

(extend-type ast/Method
  IDoc
  (gen [{:keys [name signatures]} path]
    (for [{:keys [type-args params return-type docs]} signatures]
      [:div.method
        (anchor path name)
        [:h4.code [:.method "." name (gen-type-args type-args (conj path name))]
                  [:.params (gen-params params (conj path name))]
                  [:.punct " => "]
                  (gen return-type (conj path name))]
        (gen-docs docs (conj path name))]))

  IToc
  (toc [this path]
    [:li.method (link this path)])

  ILink
  (link [{:keys [name]} path]
    [:a.method {:href (path-href path name)} name]))

(extend-type ast/Constructor
  IDoc
  (gen [{:keys [params docs]} path]
    [:div.method
      (anchor path "constructor")
      [:h4.code [:.method "constructor"]
                [:.params (gen-params params (conj path "constructor"))]]
      (gen-docs docs (conj path "constructor"))])

  IToc
  (toc [_ path]
    [:li.method (link _ path)])

  ILink
  (link [_ path]
    [:a.method {:href (path-href path "constructor")} "constructor"]))

(extend-type ast/Property
  IDoc
  (gen [{:keys [name docs type]} path]
    [:div.property
      [:h4.code [:.property name]
                [:.punct ": "]
                (gen type path)]
      (gen-docs docs (conj path name))])

  IToc
  (toc [this path]
    [:li.property (link this path)])

  ILink
  (link [{:keys [name]} path]
    [:a.property {:href (path-href path name)} name]))

(defn replace-splat [name]
  (if (zero? (.indexOf name "&"))
    (str "…" (.slice name 1))
    name))

(extend-type ast/Parameter
  IDoc
  (gen [{:keys [name type]} path]
    [:.param
      [:.param (replace-splat (str name))]
      [:.punct ": "]
      (gen type path)])

  ILink
  (link [{:keys [name]} path]
    [:.param (replace-splat name)]))

(extend-type cljs.core/Symbol
  IDoc
  (gen [this path]
    (if-let [{:keys [element path]} (resolve *namespace* path (str this))]
        (link element (pop path))
        [:.builtin-type (str this)]))

  ILink
  (link [this path]
    [:.type-arg (name this)]))

(extend-type ast/ParameterizedType
  IDoc
  (gen [{:keys [base-type params]} path]
    (conj (gen base-type path) (gen-type-args params path))))

(extend-type ast/ArrayType
  IDoc
  (gen [this path]
    (conj (gen (:base-type this) path) [:.punct "[]"])))

(extend-type ast/FunctionType
  IDoc
  (gen [{:keys [params return-type]} path]
    [:.type
      (gen-params params path)
      [:.punct " => "]
      (gen return-type path)]))

(defn stylesheet [href]
  [:link { :rel  "stylesheet"
           :type "text/css"
           :href href        }])

(defn generate-module-docs [module]
  (binding [*namespace* (make-namespace module)]
    (html/render
      [:html
        [:head [:title "Havelock API Documentation"]
               [:meta {:charset "utf-8"}]
               [:meta {:name "viewport" :content "width=device-width, initial-scale=1"}]
               [:script {:src "http://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.6/highlight.min.js"}]
               [:script (html/raw "hljs.initHighlightingOnLoad();")]
               [:script {:src "dist/havelock.min.js"}]
               [:script {:src "resources/js/sticky.js"}]
               (stylesheet "http://fonts.googleapis.com/css?family=Source+Code+Pro:400,700")
               (stylesheet "http://fonts.googleapis.com/css?family=Lora:400,700,400italic,700italic")
               (stylesheet "http://fonts.googleapis.com/css?family=Questrial")
               (stylesheet "resources/css/font-awesome.min.css")
               (stylesheet "resources/css/normalize.css")
               (stylesheet "resources/css/github.css")
               (stylesheet "resources/css/custom.css")]
        [:body
          [:div.container
            [:div#toc-flex
              [:div#spacer]
              [:div#toc (toc module [])]]
            [:div#head
              [:h1#title
                [:a.github {:href "https://github.com/ds300/havelock"
                            :title "See me in the Githubs"}
                    (icon :github)]
                "Havelock API"]]
            [:div#gradient-bit]
            [:div#page (gen module [])
             [:p.footer [:em "This documentation was generated from the file "] [:code "havelock.api.edn"] "."]]]]])))
