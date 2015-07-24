(ns docgen.names
  (:require [docgen.ast :as ast]))

(defrecord Named [element namespace uid])

(def uid (atom 0))

(defn make-named [element namespace]
  (Named. element namespace (swap! uid inc)))

(defrecord Namespace [])

(defprotocol IsNamed
  (declare-name [this namespace]))

(extend-type js/Object
  IsNamed
  (declare-name [_ namespace]
    namespace))

(extend-type ast/Property
  IsNamed
  (declare-name [this namespace]
    (assoc namespace (:name this) (make-named this nil))))

(extend-type Symbol
  IsNamed
  (declare-name [this namespace]
    (assoc namespace (str this) (make-named this nil))))

(extend-type ast/Function
  IsNamed
  (declare-name [{:keys [name type-args] :as this} namespace]
    (assoc namespace
           name
           (make-named this
                   (reduce #(declare-name %2 %1)
                           (Namespace.)
                           type-args)))))

(extend-type ast/Interface
  IsNamed
  (declare-name [{:keys [name type-args members] :as this} namespace]
    (assoc namespace
           name
           (make-named this
                   (reduce #(declare-name %2 %1)
                           (Namespace.)
                           (concat type-args members))))))

(extend-type ast/Module
  IsNamed
  (declare-name [{:keys [name members] :as this} namespace]
    (assoc namespace
           name
           (make-named this
                   (reduce #(declare-name %2 %1)
                           (Namespace.)
                           members)))))

(defn get-namespace [module]
  (declare-name module (Namespace.)))

(defn resolve [namespace [nm & more] name]
  (or (and nm
           (when-let [kid (get namespace nm)]
             (resolve (:namespace kid) more name)))
      (get namespace name)))
