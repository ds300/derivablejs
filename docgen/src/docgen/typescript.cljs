(ns docgen.typescript
  (:require [docgen.ast :as ast]))

(defprotocol TypeScripty
  (->typescript [this] [this depth]))

(extend-type js/Object
  TypeScripty
  (->typescript ([this] (->typescript this 0))
                ([this depth] (str this))))

(defn all->ts
  ([coll]
    (reduce str (map ->typescript coll)))

  ([coll depth]
    (reduce str (map #(->typescript % depth) coll))))

(extend-type ast/ParameterizedType
  Object
  (toString [{:keys [base-type params]}]
    (str base-type "<" (all->ts (interpose ", " params)) ">")))

(extend-type ast/ArrayType
  Object
  (toString [{:keys [base-type]}]
    (str (->typescript base-type) "[]")))

(extend-type ast/FunctionType
  Object
  (toString [{:keys [params return-type]}]
    (str "(" (all->ts (interpose ", " params)) ") => " (->typescript return-type))))

(extend-type ast/Parameter
  Object
  (toString [{:keys [name type]}]
    (str (if (= (first name) "&")
           (str "..." (.slice name 1))
           name)
         ": " (->typescript type))))

(defn space [n]
  (reduce str (take (* n 2) (repeat " "))))

(extend-type ast/Function
  Object
  (toString [{:keys [name type-args params return-type]}]
    (str name
         (if (seq type-args)
           (str "<" (all->ts (interpose ", " type-args)) ">")
           "")
         "(" (all->ts (interpose ", " params)) "): " (->typescript return-type) ";"))

  TypeScripty
  (->typescript [this depth]
    (str (space depth) this)))

(extend-type ast/Property
  Object
  (toString [{:keys [name type]}]
    (str name ": " (->typescript type) ";"))

  TypeScripty
  (->typescript [this depth]
    (str (space depth) (str this))))

(defn render-members [members depth]
  (if (seq members)
    (str "{\n\n"
         (all->ts (interpose "\n\n" members) (inc depth))
         "\n" (space depth) "}")
    "{}"))

(extend-type ast/Module
  TypeScripty
  (->typescript [{:keys [name members]} depth]
    (str (space depth)
         "declare module " name " " (render-members members depth))))

(extend-type ast/Interface
  TypeScripty
  (->typescript [{:keys [name type-args members extends]} depth]
    (str (space depth)
         "export interface "
         name
         (if (seq type-args)
           (str "<" (all->ts (interpose ", " type-args)) ">")
           "")
         (if (seq extends)
           (str " extends " (all->ts (interpose ", " extends)))
           "")
         " "
         (render-members members depth))))
