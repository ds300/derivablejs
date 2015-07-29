(ns docgen.docs
  (:require [docgen.names :refer [resolve make-namespace]]
            [docgen.html :as html]
            [docgen.ast :as ast]
            [cljs.pprint :refer [pprint]]
            [clojure.string :refer [join]]
            [docgen.markdown :as md]))

(def ^:dynamic *namespace* nil)

(defn icon [nm]
  [:i {:class (str "fa fa-" (name nm))}])

(defn link [href & stuff]
  (into [:a {:href href}] stuff))

(defn make-href [path]
  (str "#" (join "-" path)))

(defn make-link-resolver [path]
  (fn [name]
    (when-let [elem (resolve *namespace* path name)]
      [(make-href (:path elem)) "code"])))

(defn compile-md [doc path]
  (html/raw (md/compile-doc doc (dec (count path)) (make-link-resolver path))))

(defprotocol IDoc
  (gen [this path]))

(defprotocol IToc
  (toc [this path]))

(defn anchor [path name]
  (let [id (join "-" (conj path name))]
    [:a {:id id}]))

(defmulti render-doc :modifier)

(extend-type ast/Doc
  IDoc
  (gen [this path]
    (render-doc this path)))

(defmethod render-doc :markdown [{s :value} path]
  (when (not-empty s)
    [:div.docs (compile-md s path)]))

(defmethod render-doc :see-also [{things :value} path]
  [:div.see-also [:p [:.label "See also: "] (interpose ", " (map #(do [:.code (gen % path)]) things))]])

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

(extend-type ast/Module
  IDoc
  (gen [{:keys [name docs members]} path]
    [:div.module
      (anchor path name)
      [:h2.code "module " [:.name name]]
      (gen-docs docs (conj path name))
      (gen-members members path name)])

  IToc
  (toc [{:keys [members name]} path]
    (let [things (group-by type members)]
      [:ul (toc-grouped members (conj path name))])))

(extend-type ast/Interface
  IDoc
  (gen [{:keys [name type-args docs members extends]} path]
    [:div.interface
      (anchor path name)
      [:h3.code "interface "
        [:.name
          name
          (gen-type-args type-args (conj path name))]]
      (when (seq extends)
        [:h4.code [:.punct "extends "] (interpose [:.punct ", "] (map #(gen % (conj path name)) extends))])
      (gen-docs docs (conj path name))
      (gen-members members path name)])

  IToc
  (toc [{:keys [name members]} path]
    [:li.interface (link (make-href (conj path name)) (str name))
      (when (seq members)
        [:ul (map #(toc % (conj path name)) members)])]))

(extend-type ast/Class
  IDoc
  (gen [{:keys [name type-args docs members extends]} path]
    [:div.class
      (anchor path name)
      [:h3.code "class "
        [:.name
          name
          (gen-type-args type-args (conj path name))]]
      (when (seq extends)
        [:h4.code [:.punct "extends "] (interpose [:.punct ", "] (map #(gen % (conj path name)) extends))])
      (gen-docs docs (conj path name))
      (gen-members members path name)])

  IToc
  (toc [{:keys [name members]} path]
    [:li.interface (link (make-href (conj path name)) (str name))
      (when (seq members)
        [:ul (map #(toc % (conj path name)) members)])]))

(extend-type ast/Function
  IDoc
  (gen [{:keys [name signatures docs]} path]
    (let [do-individual-type-args (not (or (= 1 (count signatures))
                                           (apply = (map :type-args signatures))))]
       [:div.function
         (anchor path name)
         [:h3.code
           "function "
           [:.name name (when-not do-individual-type-args
                          (gen-type-args (:type-args (first signatures)) (conj path name)))]]
         (gen-docs docs (conj path name))
         (for [{:keys [type-args params return-type docs]} signatures]
           [:div.function-signature
             [:h4.code
               (when do-individual-type-args
                 [:.name (gen-type-args type-args (conj path name))])
               [:.params (gen-params params (conj path name))]
               [:.punct " => "]
               (gen return-type (conj path name))]
             (gen-docs docs (conj path name))])]))

  IToc
  (toc [{:keys [name]} path]
    [:li.function (link (make-href (conj path name)) (str name))]))

(extend-type ast/Method
  IDoc
  (gen [{:keys [name signatures]} path]
    (for [{:keys [type-args params return-type docs]} signatures]
      [:div.method
        (anchor path name)
        [:h4.code [:.name "." name (gen-type-args type-args (conj path name))]
                  [:.params (gen-params params (conj path name))]
                  [:.punct " => "]
                  (gen return-type (conj path name))]
        (gen-docs docs (conj path name))]))

  IToc
  (toc [{:keys [name]} path]
    [:li.method (link (make-href (conj path name)) (str "." name))]))

(extend-type ast/Constructor
  IDoc
  (gen [{:keys [params docs]} path]
    [:div.method
      (anchor path "constructor")
      [:h4.code [:.name "constructor"]
                [:.params (gen-params params (conj path "constructor"))]]
      (gen-docs docs (conj path "constructor"))])

  IToc
  (toc [_ path]
    [:li.method (link (make-href (conj path "constructor")) "constructor")]))

(extend-type ast/Property
  IDoc
  (gen [{:keys [name docs type]} path]
    [:div.property
      [:h4.code [:.name name]
                [:.punct ": "]
                (gen type path)]
      (gen-docs docs (conj path name))])

  IToc
  (toc [{:keys [name]} path]
    [:li.property (link (make-href (conj path name)) (str name))]))

(extend-type ast/Parameter
  IDoc
  (gen [{:keys [name type]} path]
    [:.param
      [:.name (if (zero? (.indexOf name "&"))
                (str "..." (.slice name 1))
                name)]
      [:.punct ": "]
      (gen type path)]))

(extend-type cljs.core/Symbol
  IDoc
  (gen [this path]
    [:.type
      (if-let [elem (resolve *namespace* path (str this))]
        (if (= elem :type-arg)
          [:.type-args (str this)]
          [:a {:href (make-href (:path elem))} (str this)])
        [:.builtin-type (str this)])]))

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
               [:meta {:name "viewport" :content "width=device-width, initial-scale=1"}]
               (stylesheet "http://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.6/styles/default.min.css")
               [:script {:src "http://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.6/highlight.min.js"}]
               [:script (html/raw "hljs.initHighlightingOnLoad();")]
               [:script {:src "js/sticky.js"}]
               (stylesheet "http://fonts.googleapis.com/css?family=Source+Code+Pro:400,700")
               (stylesheet "http://fonts.googleapis.com/css?family=Lora:400,700,400italic,700italic")
               (stylesheet "http://fonts.googleapis.com/css?family=Questrial")
               (stylesheet "css/font-awesome.min.css")
               (stylesheet "css/normalize.css")
               (stylesheet "css/custom.css")]
        [:body
          [:div.container
            [:div.header [:h1.title "Havelock API"]
                         [:h1.github.pull-right
                           [:a {:href "https://github.com/ds300/havelock"}
                               (icon :github)]]]

            [:div#toc
              (toc module [])]

            [:div.page (gen module [])]

            ]]])))
