(ns docgen.core
  (:require [cljs.reader :refer [read-string]]
            [cljs.pprint :refer [pprint]]
            [docgen.ast :as ast]
            [docgen.docs :refer [generate-module-docs]]
            [docgen.typescript :refer [->typescript]]))

(enable-console-print!)

(js/require "source-map-support/register")

(def fs (js/require "fs"))
(defn slurp [f]
  (.toString (.readFileSync fs f)))
(defn spit [f s]
  (.writeFileSync fs f s))

(defn make-d-ts [in-file module]
  (str
   "/**
 * This TypeScript file was generated from " in-file ".
 * Please change that file and re-run `grunt docs` to modify this file.
 */
"
   (->typescript module)
   "\n\n"
   "export = derivable"
   "\n"))



(defn -main [in-file out-ts-file out-html-file]
  (let [module (->> in-file
                 slurp
                 read-string
                 ast/parse-module)]
    (spit out-html-file (generate-module-docs module))
    (spit out-ts-file (make-d-ts in-file module))))


(set! *main-cli-fn* -main)
