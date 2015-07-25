(ns docgen.markdown
  (:require [markdown.core :refer [md->html]]
            [clojure.string :refer [split-lines join replace]]))

(defn space [n]
  (reduce str (take (* 2 (inc n)) (repeat " "))))

(defn trim-leading [lead s]
  (let [idx (.indexOf s lead)]
    (if (>= idx 0)
      (.slice s (.-length lead))
      s)))

(defn trim-indent [doc depth]
  (let [trim  (partial trim-leading (space depth))]
    (->> doc
      split-lines
      (map trim)
      (join "\n"))))

(defn code-link-transformer [resolver text state]
  [ (if (:code state)
      text
      (replace text
               #"\{\{\w+\}\}"
               #(let [name (subs % 1 (dec (count %)))
                      [link className] (resolver name)]
                  (if link
                    (str "<a class=\"" className "\" href=\"" link "\">"name"</a>"))))
                    text)
    state ])

(defn compile-doc [doc depth resolver]
  (md->html (trim-indent doc depth) :custom-transformers
                                    [(partial code-link-transformer resolver)]))
