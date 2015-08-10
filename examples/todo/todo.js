import _, {atom, derivation, transact} from 'havelock'
import imut, {fromJS} from 'immutable'
import React from 'react'

// Plese be advised that by writing this I am not endorsing the usage of
// Havelock with React in this manner. It works fine if you don't need access to
// the actual DOM nodes, but solving that problem seems like a topic for another
// time. For now, view this as a taster of what applications woven through
// Havelock might look like.


/*** Global App State ***/
const nextId = atom(0); // uids for the list items to make react happy
function getNextId () {
  return _.swap(nextId, x => x+1);
}

const todos = atom(fromJS([]));
const hash = atom(window.location.hash);
const newTodoName = atom("");

window.addEventListener('hashchange', () => {
  hash.set(window.location.hash);
});

{
  let existingTodos;
  if ((existingTodos = localStorage['todos'])) {
    todos.set(fromJS(JSON.parse(existingTodos))
                .map(x => x.set('id', getNextId()))
                .toList());
  }
}

todos.react(todos => {
  localStorage['todos'] = JSON.stringify(todos.toJS());
});

/*** Business Logic ***/
function newTodo (todos, description) {
  if (description.trim().length === 0) {
    return todos;
  } else {
    return todos.push(fromJS({
      description,
      id: getNextId(),
      complete: false,
      editing: false
    }));
  }
}

function clearCompleted (todos) {
  return todos.filter(t => t.complete).toList();
}

function toggleComplete (todos, idx) {
  return todos.updateIn([idx, 'complete'], x => !x);
}

function deleteTodo (todos, idx) {
  return todos.delete(idx);
}

function editingTodo (todos, idx, editing) {
  return todos.setIn([idx, 'editing'], editing);
}

function editTodo (todos, idx, newDescription) {
  if (newDescription.trim().length === 0) {
    return deleteTodo(todos, idx);
  } else {
    return todos.setIn([idx, 'description'], newDescription);
  }
}

function markAll (todos, complete) {
  return todos.map(t => t.set('complete', complete)).toList();
}


/*** Derived Data ***/

const numTodos = todos.derive(ts => ts.size);

const numRemaining = todos.derive(ts => ts.filter(t => !t.get("complete")).size);

const allComplete = numTodos.and(numRemaining.not());
const allIncomplete = numTodos.is(numRemaining);

const showing = hash.switch(
  "#/active", "active",
  "#/completed", "completed",
  "all"
);


/*** VIEW ***/

// helpers
function onEnter (fn) {
  return ev => {
    if (ev.which === 13) {
      fn(ev);
    }
  }
}

function toggleAll (ev) {
  todos.swap(markAll, !allComplete.get());
}

function hideWhen(condition, displayType="block") {
  return {display: condition ? "none" : displayType};
}


// render todo list item
function renderTodo({id, description, complete, editing}, idx) {
  const _showing = showing.get(),
        hide = (_showing === "active" && complete) || (_showing === "completed" && !complete);

  const handleNameChange = ev => {
    transact(() => {
      todos.swap(editTodo, idx, ev.target.value);
      todos.swap(editingTodo, idx, false);
    });
  };

  return (
    <li key={id} className={(editing ? "editing" : "") + (complete ? " completed" : "")} style={hideWhen(hide)}>
      <div className="view">
        <input className="toggle" type="checkbox" checked={complete} onChange={ () => todos.swap(toggleComplete, idx) } />
        <label onDoubleClick={ () => todos.swap(editingTodo, idx, true) }>{description}</label>
        <button className="destroy" onClick={ ev => todos.swap(deleteTodo, idx) }></button>
      </div>
      <input className="edit"
             defaultValue={description}
             onBlur={handleNameChange}
             onKeyPress={onEnter(ev => ev.target.blur())}
             onFocus={ev => ev.target.select()}/>
    </li>
  );
}

// list itself as derivable
const todosRender = derivation(() => {
  const allDone = allComplete.get();
  return (
    <section className="main" style={hideWhen(numTodos.get() === 0)}>
      <input className="toggle-all"
             type="checkbox"
             checked={allDone}
             onChange={ () => todos.swap(markAll, !allDone) } />
      <label htmlFor="toggle-all">Mark all as {allDone ? 'in' : ''}complete</label>
      <ul className="todo-list">
        { todos.get().map(x => x.toJS()).map(renderTodo).toArray() }
      </ul>
    </section>
  )
});

// footer as derivable
const footerRender = derivation(() => {
  const select = name => showing.get() === name ? 'selected' : ""
  return (
    <footer className="footer">
      <span className="todo-count"><strong>{numRemaining.get()}</strong> items left</span>
      <ul className="filters">
        <li>
          <a className={select('all')}  href="#/">All</a>
        </li>
        <li>
          <a className={select('active')} href="#/active">Active</a>
        </li>
        <li>
          <a className={select('completed')} href="#/completed">Completed</a>
        </li>
      </ul>
      <button className="clear-completed"
              style={hideWhen(allIncomplete.get())}
              onClick={() => todos.swap(clearCompleted)}>Clear completed</button>
    </footer>
  )
});

const pageRender = derivation(() => {
  return (
    <section className="todoapp">
      <header className="header">
        <h1>todos</h1>
        <input className="new-todo"
               placeholder="What needs to be done?"
               value={newTodoName.get()}
               onChange={ e => newTodoName.set(e.target.value) }
               onKeyPress={onEnter(() => {
                 transact(() => {
                   todos.swap(newTodo, newTodoName.get());
                   newTodoName.set("");
                 });
               })}
               autofocus />
      </header>
      {todosRender.get()}
      {footerRender.get()}
    </section>
)});

/*** Barebones React Component for Rendering Derivables ***/

const Derivable = React.createClass({
  getInitialState () {
    return {
      vdom: this.props.render.get(),
      reaction: this.props.render.reaction(vdom => {
        this.setState({vdom});
      })
    };
  },
  componentWillMount () {
    this.state.reaction.start();
  },
  componentWillUnmount () {
    this.state.reaction.stop();
  },
  render () {
    return this.state.vdom;
  }
});

React.render(<Derivable render={pageRender} />, document.getElementById("main"));
