(ns docgen.typescript
  (:require [docgen.ast :as ast]
            [clojure.string :as str]))

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

(defn render-type-args [type-args]
  (if (seq type-args)
    (str "<" (all->ts (interpose ", " type-args)) ">")
    ""))

(defn render-params [params]
  (str "(" (all->ts (interpose ", " params)) ")"))

(extend-type ast/ParameterizedType
  Object
  (toString [{:keys [base-type params]}]
    (str base-type (render-type-args params))))

(extend-type ast/UnionType
  Object
  (toString [{:keys [types]}]
    (str "(" (all->ts (interpose " | " types)) ")")))

(extend-type ast/ArrayType
  Object
  (toString [{:keys [base-type]}]
    (str (->typescript base-type) "[]")))

(extend-type ast/FunctionType
  Object
  (toString [{:keys [params return-type]}]
    (str (render-params params) " => " (->typescript return-type))))

(extend-type ast/Parameter
  Object
  (toString [{:keys [name type]}]
    (str (if (= (first name) "&")
           (str "..." (.slice name 1))
           name)
         ": " (->typescript type))))

(defn space [n]
  (reduce str (take (* n 2) (repeat " "))))

(extend-type ast/FunctionSignature
  Object
  (toString [{:keys [type-args params return-type]}]
    (str (render-type-args type-args)
         (render-params params) ": "
         (->typescript return-type) ";")))

(defn fn-or-method->ts [name prefix signatures depth]
  (reduce str
          (interpose "\n"
                     (map #(str (space depth) prefix name %)
                          signatures))))

(extend-type ast/Function
  TypeScripty
  (->typescript [{:keys [name signatures]} depth]
    (fn-or-method->ts name "function " signatures depth)))

(extend-type ast/Method
  TypeScripty
  (->typescript [{:keys [name signatures]} depth]
    (fn-or-method->ts name "" signatures depth)))

(extend-type ast/Constructor
  TypeScripty
  (->typescript [this depth]
    (str (space depth)
         "constructor "
         (render-params (:params this))";")))

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

(defn render-class-or-interface
  [type {:keys [name type-args members extends]} depth]
  (str (space depth)
       "export " type " "
       name
       (render-type-args type-args)
       (if (seq extends)
         (str " extends " (all->ts (interpose ", " extends)))
         "")
       " "
       (render-members members depth)))

(extend-type ast/Interface
  TypeScripty
  (->typescript [this depth]
    (render-class-or-interface "interface" this depth)))

(extend-type ast/Class
  TypeScripty
  (->typescript [this depth]
    (render-class-or-interface "class" this depth)))
