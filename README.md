# ratom.js
Reactive values for Derived Data All The Way Down (DDATWD). A reimagining of [Reagent's](http://github.com/reagent-project/reagent) `atom` + `reaction` for everyone to enjoy.

### Rationale

Monolithic MV[whatever] frameworks tend to encourage one to keep application state tightly coupled to the V[whatever] bits of one's framework in disparate little mutable chunks (think `$scope`s in angular and so on), while keeping the M safe and secure behind some method-heavy API wall. This is fine if your app is relatively small and simple. Actually it's often wonderful.

Some apps, alas, are big and complex. One might find oneself coming to the conclusion that orchestrating state consistency across dozens of mutable interdependent components in the face of asynchronous everything and the inevitable ad-hoc cross-cutting concerns which don't jibe with the rigid authoritarian architectures you once imagined to be boundlessly flexible is extremely extremely extremely difficult. Difficult. Lemon difficult.

The solution to this problem seems to be something involving 'unidirectional data flow', as popularized by Facebook's [Flux](https://facebook.github.io/flux/) architecture.

However, the most direct source of inspiration for this library is actually [re-frame](https://github.com/day8/re-frame). Specifically re-frame's README which is, in part, a remarkable and compelling discourse on the particular brand of Flux-ishness ratom.js aims to serve. So **go read the re-frame README**. For reals. Do it.

But because you're a busy person and I'm all about brevity, here's the tl;dr:

> Keeping disparate pieces of local mutable state in check is hard. Keeping one piece of global immutable state in check is a matter of course. Let's do the latter.

### Reimagining

ratom.js actually extends Reagents model one step, providing `Atom`s, `Derivation`s, and `Reaction`s.

Hello world

`Atom`s are the roots of a DDATWDDAG (Derived Data All The Way Down Directed Acyclic Graph... I'm pretty sure it'll catch on). They are supposed to hold immutable or effectively immutable data. `Derivation`s are the inner nodes which represent pure transformations of the atomic roots. `Reaction`s are side-effecting computations associated with a single `Derivation` or `Atom`. When an atom is changed, the DDATWDDAG is traversed and reactions are notified. The `Reaction`s then traverse the graph backwards, evaluating only those nodes which it is utterly necessary to evaluate in order to decide whether the `Reaction` must be re-run in response to changed input.

### Picture

Without `Reaction`s, the DDATWDDAG is a simple lifeless description of data. This design lets us do some pretty nuts stuff like implement true boolean logic in terms of `Derivation`s.

### Reactive?

Yup. If you've used 'observable' values in libraries like [mercury](https://github.com/Raynos/mercury) or [knockout](http://knockoutjs.com), it looks a bit like that at first glance.

```javascript
import {atom} from 'ratom'

const name = atom("Steve");

name.react(nm => console.log(`Hello ${nm}!`));

// $> Hello Steve!

name.set("Julian");

// $> Hello Julian!
```

But this is only scratching the surface. What lies beneath is, I believe, far more powerful.

###

Forget about observing and reacting to changing data for a minute. That *is* what this library does, but the good stuff -- the stuff nobody else does -- is going to require a little background.


### Rationale

Let's talk about how we structure application state.

 However,


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
