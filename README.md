# ratom.js
Reactive values for Derived Data All The Way Down (DDATWD). A reimagining of [Reagent's](http://github.com/reagent-project/reagent) `atom` + `reaction` for everyone to enjoy.

### Reactive?

Indeed. If you've used 'observable' values in libraries like [mercury](https://github.com/Raynos/mercury) or [knockout](http://knockoutjs.com) think of it as a generalization of that with super powers.

This kind of thing might look familiar:

```javascript
import {atom} from 'ratom'

const name = atom("Steve");

name.react(nm => console.log(`Hello ${nm}!`));

// $> Hello Steve!

name.set("Julian");

// $> Hello Julian!
```

##### Great, so you've changed `.observe(callback)` to `.react(callback)`, what's new? Where are the superpowers? What the heck is DDATWD?

Forget about observing and reacting to changing data for a minute. That *is* what this library does, but the good stuff -- the stuff nobody else does -- is going to require a little background.


### Rationale

Let's talk about how we structure application state.

In modern MV* frameworks like Angular and Ember your app state is dotted all over the place, often tightly coupled to the views and business logic that render and manipulate it. This seems like a great idea until your components need to talk to each other and agree on things. If you've never worked on a project like this, just trust me: orchestrating state consistency across mutable interdependent components in the face of asynchronous everything and the inevitable ad-hoc cross-cutting concerns which don't make sense for the rigid authoritarian architectures you once imagined to be boundlessly flexible... Not fun stuff. Not fun stuff at all.

The solution to this problem seems to be something involving unidirectional data flow, as popularized by Facebook's [Flux](https://facebook.github.io/flux/) architecture. However, the most direct source of inspiration for this library is [re-frame](https://github.com/day8/re-frame). Specifically re-frame's README, which is, in part, a remarkable and compelling discourse on their particular brand of Flux-ishness and its rationale, to which this library is a response. So **go read that**.

TL;DR:

> Keeping disparate pieces of local mutable state consistent is hard. Keeping one piece of global immutable state consistent is a matter of course.

So if ratom.js has an elevator pitch it might be that it helps JS developers to keep app state neatly bundled in one place, while allowing them the easily create derivations of that state which are kept up-to-date lazily and automatically.

### Derived Data All The Way Down

So we have global immutable state: the One True Data Source. What then? We derive!

```javascript
import {atom, derive} from 'ratom'

const app = atom({})
```

### Ideas

add lifecycle stuff as derivation pattern?

```javascript
function dvClass (map) {
  const derivation = derive(() => {
    let classes = [];
    for (let prop of Object.keys(map)) {
      if (map[prop].get()) {
        classes.push(prop);
      }
    }
    return classes.join(" ");
  });

  let reaction;

  return comp(
    willMount(node => {
      reaction = derivation.react(klass => node.className = klass);
    }),
    willUnmount(() => reaction.stop())
  );
}

function dvShow (flag) {
  let reaction;
  let display;
  return comp(
    willMount(node => {
      display = node.style.display;
      reaction = flag.react(show => {
        node.style.display = show ? display : "none";
      });
    }),
    stopping(reaction)
  )
}

function dvHide (flag) {
  return dvShow(flag.not());
}



let friends = atom(imut.fromJS([
  {name: "blah", tel: "012"}
  , {name: "bitches", tel: "012903"}
  , {name: "banana", tel: "012342"}
]));

function setEditingFriend (friends, idx, val) {
  return friends.updateIn([idx, editing], val);
}

function EditFriendButton (idx) {
  return <button onClick={() => {
    friends.swap(setEditingFriend, idx, true);
  }}></button>
}

function Friend (friend, i) {
  let button = friend.deriveJS({editing} => !editing).then(
    EditFriendButton(idx)
  );
  return friend.deriveJS({name, tel} =>
    <div>
      <h4>{name}</h4> {EditFriendButton(i)}
      <strong>Telephone number:</strong> {tel}
    </div>
  );
}



render () {
  let appState = atom("");
  let dirty = appState.derive(name => name.trim().match(/\w+/));
  let klass = dvClass({dirty})
  let change = function () {
    state.set(this.value.trim());
  };
  return derive(() =>
          (<div>
             <input placeholder="name" class={klass.get()} value={state.get()} onChange={change}>
             <p>state.get()</p>
           </div>))
         .derive(lifecycle(behaviour));
}
return derive(() => {
});
```
