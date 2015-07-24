(ns docgen.ast)

; *****************************
; *** Data type definitions ***
; *****************************

(defrecord ParametereizedType
  "e.g. Blah<K, V>"
  [base-type params])

(defrecord ArrayType
  "e.g. String[]"
  [base-type])

(defrecord FunctionType
  "e.g. (param1: SomeType, param2: Blah<K, V>, ...more: String[]) => Blah<X,Y>"
  [params return-type])

(defrecord Parameter
  "e.g. param1: SomeType"
  [name type])

(defrecord Function
  "e.g. myFunc<TypeArg>(...params: any[]): ReturnType;"
  [name doc type-args params return-type])

(defrecord Property
  "e.g. myProperty: int;"
  [name doc type])

(defrecord Module
  "e.g. declare module mymodule { stuff }"
  [name doc members])

(defrecord Interface
  "e.g. export interface MyInterface { stuff }"
  [name type-args doc extends members])

; *********************
; *** Parsing logic ***
; *********************

(declare parse-params)
(declare parse-type)
(declare parse-function-type)
(declare parse-function)
(declare parse-interface)
(declare parse-module)

(defn parse-function-type [[params return-type]]
  (FunctionType. (parse-params params) (parse-type return-type)))

(defn parse-type [type]
  (cond
    (symbol? type) type
    (vector? type) (ArrayType. (parse-type (type 0)))
    (list? type)   (let [[hd & tl] type]
                     (if (= hd '=>)
                       (parse-function-type tl)
                       (ParametereizedType. hd (mapv parse-type tl))))))

(defn parse-name [nm]
  (if (list? nm)
    [(str (first nm)) (mapv parse-type (rest nm))]
    [(str nm) []]))

(defn parse-params [[nm type & more]]
  (when nm
    (cons (Parameter. (name nm) (parse-type type))
          (parse-params more))))

(defn parse-function [[name params return-type & [doc]]]
  (let [[name type-args] (parse-name name)]
    (Function. name
               doc
               type-args
               (parse-params params)
               (parse-type return-type))))

(defn parse-property [[name type & [doc]]]
  (Property. (str name) doc (parse-type type)))

(defn parse-extends [[_ & types]]
  (mapv parse-type types))

(defn include-extends [interface decl]
  (update-in interface [:extends] into (parse-extends decl)))

(defn member-includer [decl-parser]
  (fn [acc decl]
    (update-in acc [:members] conj (decl-parser decl))))

(defn include-doc [{doc :doc :as acc} more-doc]
  (assoc acc :doc (if (not-empty doc)
                    (str doc "\n\n" more-doc)
                    more-doc)))

(defn decl-type [[k args & more :as decl]]
  (cond
    (string? decl) :doc
    (keyword? k)   k
    (vector? args) :function
    :else          :property))

(declare includers)

(defn include-member [thing member]
  (let [include (includers (decl-type member))]
    (include thing member)))

(defn parse-interface [[_ name & members]]
  (let [[name type-args] (parse-name name)
        interface (Interface. name type-args "" [] [])]
    (reduce include-member interface members)))

(defn parse-module [[_ name & members]]
  (let [module (Module. (str name) "" [])]
    (reduce include-member module members)))

(def includers { :extends   include-extends
                 :doc       include-doc
                 :interface (member-includer parse-interface)
                 :module    (member-includer parse-module)
                 :function  (member-includer parse-function)
                 :property  (member-includer parse-property) })
