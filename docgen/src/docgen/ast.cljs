(ns docgen.ast
  (:require [docgen.markdown :refer [trim-indent space]]))

; *****************************
; *** Data type definitions ***
; *****************************

(defrecord UnionType [types])
; e.g. Blah | string | any

(defrecord ParameterizedType [base-type params])
; e.g. Blah<K, V>

(defrecord ArrayType [base-type])
; e.g. String[]

(defrecord FunctionType [params return-type])
; e.g. (param1: SomeType, param2: Blah<K, V>, ...more: String[]) => Blah<X,Y>

(defrecord Parameter [name type])
; e.g. param1: SomeType

(defrecord FunctionSignature [type-args params return-type])

(defrecord Function [name signatures])
(defrecord Method [name signatures])
(defrecord Constructor [params])

; e.g. myFunc<TypeArg>(...params: any[]): ReturnType;

(defrecord Property [name type])
; e.g. myProperty: int;

(defrecord Module [name members])
; e.g. declare module mymodule { stuff }

(defrecord Interface [name type-args extends members])
; e.g. export interface MyInterface { stuff }

(defrecord Class [name type-args extends members])
; e.g. export class MyClass { stuff }

(defrecord Doc [modifier value])
; modifier being e.g. :note or :see-also

(defn add-doc [thing doc]
  (update-in thing [:docs] (fnil conj []) doc))

; *********************
; *** Parsing logic ***
; *********************

; first, to make parsing much simpler, we transform the input, replacing known
; shorthand with full longhand.

; so, e.g.

;  (:module blah
;    (my-func [] void)
;    (:interface (Junk A B)
;      (do-junk [a A] B
;        "blah"
;        (:see-also my-func))))

; becomes

; (:module blah
;   (:function my-func [] void)
;   (:interface (Junk A B)
;     (:function do-junk [a A] B
;       (:doc :markdown "blah")
;       (:doc :see-also [my-func]))))

(defn transform-strings
  "trims indentation from strings, assuming two spaces per level"
  [depth form]
  (if (string? form)
    (trim-indent form (dec depth))
    (if (list? form)
      (map (partial transform-strings (inc depth))
           form)
      form)))

(defn transform-functions+properties
  "replaces shorthand function definitions with longhand"
  [[nm args & more :as form]]
  (cond
    (symbol? nm)
    (if (vector? args)
      (cons :function form)
      (cons :property form))
    (seq? nm)
    (cons :function form)
    (#{:interface :module :class} nm)
    (concat [nm args]
            (map transform-functions+properties more))
    :else form))

(defn transform-docs
  "replaces shorthand doc stuff with longhand.

  e.g. \"blah\" -> (:doc :markdown \"blah\")
       (:see-also Thing1 Thing2) -> (:doc :see-also [Thing1 Thing2])
       (:node \"md\") -> (:doc :note \"md\")"
  [form]
  (cond
    (string? form) (list :doc :markdown form)
    (seq? form)    (let [type (first form)]
                     (case type
                       :see-also (list :doc :see-also (vec (rest form)))
                       :note     (list :doc :note (second form))
                       (doall (map transform-docs form))))
    :else          form))

(def transform (comp transform-docs
                     transform-functions+properties
                     (partial transform-strings 0)))

; now we declare parsing logic for the leaves. i.e. names, types, params

(declare parse-params)
(declare parse-type)

(defn parse-function-type [[params return-type]]
  (FunctionType. (parse-params params) (parse-type return-type)))

(defn parse-union-type [types]
  (UnionType. (mapv parse-type types)))

(defn parse-type [type]
  (cond
    (symbol? type) type
    (vector? type) (ArrayType. (parse-type (type 0)))
    (seq? type)    (let [[hd & tl] type]
                     (cond
                       (= hd '=>) (parse-function-type tl)
                       (= hd 'or)  (parse-union-type tl)
                       :else (ParameterizedType. hd (mapv parse-type tl))))))

(defn parse-name [nm]
  (if (seq? nm)
    [(str (first nm)) (mapv parse-type (rest nm))]
    [(str nm) []]))

(defn parse-params [[nm type & more]]
  (when nm
    (cons (Parameter. (name nm) (parse-type type))
          (parse-params more))))

; now we simply create a multimethod reducer dispatching on the keyword at the
; start of declarations

(defmulti include (fn [_ [key & __]] key))

(defmethod include :doc [acc [_ modifier value]]
  (update-in acc [:docs] (fnil conj []) (Doc. modifier value)))

(defn add-member [acc member things]
  (update-in acc [:members] (fnil conj []) (reduce include member things)))

(defmethod include :module [acc [_ name & things]]
  (add-member acc (Module. (str name) []) things))

(defmethod include :interface [acc [_ name & things]]
  (let [[name type-args] (parse-name name)]
    (add-member acc (Interface. name type-args [] []) things)))

(defmethod include :class [acc [_ name & things]]
  (let [[name type-args] (parse-name name)]
    (add-member acc (Class. name type-args [] []) things)))

(defmethod include :extends [acc [_ & interfaces]]
  (update-in acc [:extends] (fnil into []) (map parse-type interfaces)))

(defmethod include :constructor [acc [_ params & things]]
  (add-member acc (Constructor. (mapv parse-type params)) things))

(def function-constructors { Module #(Function. %1 %2)
                             Interface #(Method. %1 %2)
                             Class #(Method. %1 %2)})

(defmethod include :function [acc [_ name params return-type & things]]
  (let [[name type-args] (parse-name name)
        signature (reduce include
                          (FunctionSignature. type-args
                                              (parse-params params)
                                              (parse-type return-type))
                          things)
        ; might already be a function with this name, so update that maybe
        existing-idx (first (keep-indexed (fn [i member]
                                            (when (= name (:name member))
                                              i))
                                          (:members acc)))]
    (if existing-idx
      (update-in acc [:members existing-idx :signatures] conj signature)
      (update-in acc
                 [:members]
                 conj
                 ((function-constructors (type acc)) name [signature])))))

(defmethod include :property [acc [_ name type & things]]
  (add-member acc (Property. name (parse-type type)) things))

(defn parse-module [stuff]
  (->> stuff
    transform
    (include {})
    :members
    first))
