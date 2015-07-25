(set-env! :source-paths #{"src"})

(set-env! :dependencies '[[adzerk/boot-cljs "0.0-3308-0" :scope "test"]
                          [org.clojure/clojure "1.7.0" :scope "test"]
                          [org.clojure/clojurescript "0.0-3308"]
                          [markdown-clj "0.9.67"]
                          ])

(require '[adzerk.boot-cljs :refer [cljs]])

(task-options! cljs { :target :nodejs
                      :main "docgen.core"
                      :output-to "docgen.js"
                      :optimizations :simple
                      :source-map true})
