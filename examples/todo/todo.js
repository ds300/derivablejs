import _, {atom, derive} from 'havelock'
import imut, {fromJS} from 'immutable'
import { dmap, cursor } from './batteries'
import React from 'react'

/*** Describe Global App State + Business Logic ***/
const todos = atom(imut.List());
const showing = atom("all");

function newTodo (todos, description) {
  if (description.trim().length === 0) {
    return todos;
  } else {
    return todos.push(fromJS({ description, complete: false, editing: false }));
  }
}

function clearCompleted (todos) {
  return todos.filter(t => t.complete);
}

function toggleComplete (todos, idx) {
  return todos.updateIn([idx, 'complete'], x => !x);
}

// function deleteTodo (todos, idx) {
//   return todos.delete(idx);
// }

function deleteTodo (todos, todo, idx) {
  console.log(idx);
  return todos.filter(t => t !== todo);
}

function editTodo (todos, idx, newDescription) {
  if (newDescription.trim().length === 0) {
    return deleteTodo(todos, idx);
  } else {
    return todos.setIn([idx, 'description'], newDescription);
  }
}

function markAll (todos, complete) {
  return todos.map(t => t.put('complete', complete));
}

/*** Derived data for rendering stuffs ***/

const size = todos.derive(ts => ts.size);

const numRemaining = todos.derive(ts => ts.filter(t => !t.complete).size);

const allComplete = size.and(numRemaining.not());



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


for (let i = 0 ; i < 1000; i++) {
  todos.swap(newTodo, `thing ${i}`);
}



function renderTodo(todo, idx) {
  return (<p key={todo.get('description')}>{todo.get('description')} : {todo.get('complete')} : <a href="" onClick={ (ev) => { todos.swap(deleteTodo, todo, idx); ev.preventDefault(); } }>x</a></p>);
}

function handleKeyPress (ev) {
  if (ev.which === 13) {
    todos.swap(newTodo, ev.target.value);
  }
}

// const appRender = dmap(renderTodo, todos).derive(ps => {
//   return (<div class="buns">
//             <input type="text" onKeyPress={handleKeyPress} placeholder="what should i do?" />
//             { ps.toArray() }
//           </div>);
// });

const appRender = todos.derive(todos => {
  return (<div class="buns">
            <input type="text" onKeyPress={handleKeyPress} placeholder="what should i do?" />
            { todos.map(renderTodo).toArray() }
          </div>);
});

const elem = <Derivable render={appRender} />

React.render(elem, document.getElementById("main"));

// /*** Now for the view ***/
//
// function renderTodo (todo, idx) {
//
//   return derive(() =>
//       (<li class={className.get()}>
//          <div class="view">
//           <input class="toggle" type="checkbox" checked={complete}
//                  onclick={() => todos.swap(toggleComplete, idx)}>
//           <label ondblclick={() => editingIdx.set(idx)}>{description}</label>
//           <button class="destroy" onclick={() => todos.swap(deleteTodo, idx)}></button>
//         </div>
//         <input class="edit" value="blah"
//                onblur={function () { todos.swap(editTodo, idx, this.value); }}>
//       </li>));
// }
//
// function renderApp () {
//   let items = size.derive(n => {
//     let items = [];
//     for (let i=0; i<n; i++) {
//       items.push(<Derivable render={renderTodo(todos.lens(cursor(i)))} />);
//     }
//     return items;
//   });
//   let render = derive(() => (
//     <section class="todoapp">
//       <header class="header">
//         <h1>todos</h1>
//         <input class="new-todo" placeholder="What needs to be done?" autofocus>
//       </header>
//       <section class="main">
//         <input class="toggle-all" type="checkbox">
//         <label for="toggle-all">Mark all as complete</label>
//         <ul class="todo-list">
//           { items }
//         </ul>
//       </section>
//       <footer class="footer">
//         <span class="todo-count"><strong>0</strong> item left</span>
//         <ul class="filters">
//           <li>
//             <a class="selected" href="#/">All</a>
//           </li>
//           <li>
//             <a href="#/active">Active</a>
//           </li>
//           <li>
//             <a href="#/completed">Completed</a>
//           </li>
//         </ul>
//         <button class="clear-completed">Clear completed</button>
//       </footer>
//     </section>
//   ));
//
//   return <Derivable render={render} />
// }
