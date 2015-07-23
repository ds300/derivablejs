(ns docgen.core
  (:require [cljs.reader :refer [read-string]]
            [cljs.pprint :refer [pprint]]))

(def fs (js/require "fs"))

(enable-console-print!)

(defprotocol TypeScripty
  (to-typescript [this]))

(defrecord ParametereizedType [base-type params]
  TypeScripty
  (to-typescript [_]
    (str (to-typescript base-type)
         "<" (apply str (map to-typescript params)) ">")))

(extend-type js/Object
  TypeScripty
  (to-typescript [x] (str x)))

(defrecord FunctionType [params return-type]
  TypeScripty
  (to-typescript [_]
    (str "(" (apply str (map to-typescript params)) ") => " (to-typescript return-type))))


(defrecord Parameter [name type]
  TypeScripty
  (to-typescript [_]
    (str name ": " (to-typescript type))))

(defrecord Function [name doc type-args params return-type]
  TypeScripty
  (to-typescript [_]
    (str name
         (if (seq type-args)
           (str "<" (apply str (map to-typescript type-args)) ">")
           "")
         "(" (apply str (map to-typescript params)) "): " (to-typescript return-type) ";")))

(defrecord Property [name doc type]
  TypeScripty
  (to-typescript [_]
    (str name ": " (to-typescript type) ";")))

(declare parse-params)
(declare parse-type)
(declare parse-function-type)
(declare parse-function)

(defn parse-function-type [[params return-type]]
  (FunctionType. (parse-params params) (parse-type return-type)))

(defn parse-type [type]
  (if (symbol? type)
    type
    (let [[hd & tl] type]
      (if (= hd '=>)
        (parse-function-type tl)
        (ParametereizedType. hd (mapv parse-type tl))))))

(defn parse-params [[nm type & more]]
  (when nm
    (cons (Parameter. (name nm) (parse-type type))
          (parse-params more))))

(defn parse-function [[nm params return-type & [doc]]]
  (let [[nm & type-args] (if (list? nm) nm [nm])]
    (Function. (name nm)
               doc
               (mapv parse-type type-args)
               (parse-params params)
               (parse-type return-type))))

(defn parse-property [[nm type & [doc]]]
  (Property. (name nm) doc (parse-type type)))

(defn decl-type [[k args & more]]
  (cond
    (keyword? k)   k
    (vector? args) :function
    :else          :property))

(defrecord Module [name doc interfaces functions modules properties]
  TypeScripty
  (to-typescript [_]
    (str "declare module " name " {\n"
       (apply str (interpose "\n" (concat (map to-typescript (concat interfaces functions modules properties)))))
       "\n}\n")))

(defrecord Interface [name type-args doc functions properties]
  TypeScripty
  (to-typescript [_]
    (str "export interface "
         name
         (if (seq type-args)
           (str "<" (apply str (map to-typescript type-args)) ">")
           "")
         " {\n"
         (apply str (interpose "\n" (concat (map to-typescript (concat functions properties)))))
         "\n}\n")))

(defn parse-interface [[_ nm doc & things]]
  (let [things (group-by decl-type things)
        [nm & type-args] (if (list? nm) nm [nm])]
    (Interface. (name nm)
                (mapv parse-type type-args)
                doc
                (mapv parse-function (:function things []))
                (mapv parse-property (:property things [])))))

(defn parse-module [[_ nm doc & things]]
  (let [things (group-by decl-type things)]
    (Module. (name nm)
             doc
             (mapv parse-interface (:interface things []))
             (mapv parse-function (:function things []))
             (mapv parse-module (:module things []))
             (mapv parse-property (:property things [])))))


(defn -main [in-file out-file]
  (.writeFileSync fs out-file (to-typescript (parse-module (read-string (.toString (.readFileSync fs in-file)))))))

(set! *main-cli-fn* -main)
