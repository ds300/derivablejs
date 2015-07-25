(ns docgen.docs
  (:require [docgen.names :refer [resolve make-namespace]]
            [docgen.html :as html]
            [docgen.ast :as ast]
            [cljs.pprint :refer [pprint]]
            [clojure.string :refer [join]]
            [docgen.markdown :as md]))

(def ^:dynamic *namespace* nil)

(defn make-href [elem]
  (str "#" (join "-" (:path elem))))

(defn make-link-resolver [path]
  (fn [name]
    (when-let [elem (resolve *namespace* path name)]
      [(make-href elem) "code-link"])))

(defn compile-md [doc path]
  (html/raw (md/compile-doc doc (count path) (make-link-resolver path))))

(defprotocol IDoc
  (gen [this path]))

(defn anchor [path name]
  [:a {:id (join "-" (conj path name))}])

(defn docs [doc path]
  (when (not-empty doc)
     [:div.docs (compile-md doc path)]))

(defn gen-members [members path name]
  (let [path (conj path name)]
    (for [member members]
      (gen member path))))

(defn gen-type-args [type-args path]
  (when (not-empty type-args)
    [:.type-args "<" (interpose ", " (map str type-args)) ">"]))

(defn gen-params [params path]
  [:.params
    "("
    (interpose ", " (map #(gen % path) params))
    ")"])

(extend-type ast/Module
  IDoc
  (gen [{:keys [name doc members]} path]
    [:div.module
      (anchor path name)
      [:h2 "module " [:.name name]]
      (docs doc path)
      (gen-members members path name)]))

(extend-type ast/Interface
  IDoc
  (gen [{:keys [name type-args doc members]} path]
    [:div.interface
      (anchor path name)
      [:h3 "interface "
        [:.name
          name
          (gen-type-args type-args path)]]
      (docs doc path)
      (gen-members members path name)]))

(extend-type ast/Function
  IDoc
  (gen [{:keys [name type-args params return-type doc]} path]
    [:div.function
      (anchor path name)
      [:h4 [:.name name (gen-type-args type-args path)]
           [:.params (gen-params params path)]
           " => "
           (gen return-type path)]
      (docs doc path)]))

(extend-type ast/Property
  IDoc
  (gen [{:keys [name doc type]} path]
    [:div.property
      [:h4 [:.name name]
           [:.colon ": "]
           (gen type path)]
      (docs doc path)]))

(extend-type ast/Parameter
  IDoc
  (gen [{:keys [name type]} path]
    [:.param
      [:.name name]
      [:.colon ": "]
      (gen type path)]))

(extend-type cljs.core/Symbol
  IDoc
  (gen [this path]
    [:.type
      (if-let [elem (resolve *namespace* path (str this))]
        [:a {:href (make-href elem)} (str this)]
        (str this))]))

(extend-type ast/ParameterizedType
  IDoc
  (gen [{:keys [base-type params]} path]
    (conj (gen base-type path) (gen-type-args params path))))

(extend-type ast/ArrayType
  IDoc
  (gen [this path]
    (conj (gen (:base-type this)) "[]")))

(extend-type ast/FunctionType
  IDoc
  (gen [{:keys [params return-type]} path]
    [:.type
      (gen-params params path)
      " => "
      (gen return-type path)]))

(defn generate-module-docs [module]
  (binding [*namespace* (make-namespace module)]
    (html/render
      [:html
        [:head [:title "Havelock API Documentation"]]
        [:body (gen module [])]])))
