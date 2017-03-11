/* global confirm, alert */
var yo = require('yo-yo')
var csjs = require('csjs-inject')
var Treeview = require('ethereum-remix').ui.TreeView

var css = csjs`
  .treeview {
    display: block;
    margin-top: 7px;
    width: 20%;
    overflow-x: scroll;
    min-width: 150px;
  }
  .folder,
  .file {
    font-size: 14px;
  }
  .hasFocus {
    background-color: #F4F6FF;
  }
  .rename {
    background-color: white;
  }
  .remove,
  .save {
    align-self: center;
    margin-right: 3%;
  }
  .activeMode {
    display: flex;
    justify-content: space-between;
  }
  ul {
    padding: 0;
  }
`
module.exports = fileExplorer

function fileExplorer (selector, appAPI, fileEvents) {
  var container = document.querySelector(selector)
  if (!container) throw new Error('could not find dom node for: ' + selector)
  container.className = css.treeview

  var tv = new Treeview({
    extractData: function (value, tree, key) {
      return {
        path: (tree || {}).path ? tree.path + '/' + key : key,
        children: value instanceof Array ? value.map((item, index) => ({
          key: index, value: item
        })) : value instanceof Object ? Object.keys(value).map(subkey => ({
          key: subkey, value: value[subkey]
        })) : undefined
      }
    },
    formatSelf: function (key, data) {
      return yo`<label class=${data.children ? css.folder : css.file}
        data-path="${data.path}"
        onload=${function (el) { adaptEnvironment(el, focus, hover) }}
        onunload=${function (el) { unadaptEnvironment(el, focus, hover) }}
        onclick=${editModeOn}
        onkeydown=${editModeOff}
        onblur=${editModeOff}
      >${key}</label>`
    }
  })

  var deleteButton = yo`
    <span class=${css.remove} onclick=${deletePath}>
      <i class="fa fa-trash" aria-hidden="true"></i>
    </span>
  `

  fileEvents.register('fileFocus', function (path) {
    if (filepath === path) return
    filepath = path
    var el = getElement(filepath)
    expandPathTo(el)
    setTimeout(function focusNode () { el.click() }, 0)
  })

  fileEvents.register('fileRemoved', function (filepath) {
    var li = getElement(filepath)
    if (li) li.parentElement.removeChild(li)
  })

  fileEvents.register('fileRenamed', function (oldName, newName) {
    var li = getElement(oldName)
    if (li) {
      oldName = oldName.split('/')
      newName = newName.split('/')
      var index = oldName.reduce(function (idx, key, i) {
        return oldName[i] !== newName[i] ? i : idx
      }, undefined)
      var newKey = newName[index]
      var oldPath = oldName.slice(0, index + 1).join('/')
      li = getElement(oldPath)
      var label = getLabelFrom(li)
      label.innerText = newKey
      renameSubtree(label, true)
    }
  })

  fileEvents.register('fileAdded', function (filepath) {
    console.log('@TODO: fileAdded', filepath)
  })

  var filenames = appAPI.filesList()
  var data = { }
  var hooks = { }
  filenames.forEach(file => setval(data, file, true))
  var filepath = null
  var focusElement = null
  var textUnderEdit = null

  container.appendChild(tv.render(data))

  var api = {
    on: function on (name, cb) {
      if (!hooks[name]) hooks[name] = []
      hooks[name].push(cb)
    },
    off: function off (name, cb) {
      var pos = (hooks[name] || []).indexOf(cb)
      if (~pos) hooks[name].splice(pos, 1)
    }
  }

  function emit (name, data) {
    if (hooks[name]) hooks[name].forEach(function (cb) { cb(data) })
  }

  function focus (event) {
    event.cancelBubble = true
    var li = this
    if (focusElement === li) return
    if (focusElement) focusElement.classList.toggle(css.hasFocus)
    focusElement = li
    focusElement.classList.toggle(css.hasFocus)
    var label = getLabelFrom(li)
    var filepath = label.dataset.path
    var isFile = label.className.indexOf('file') === 0
    if (isFile) emit('focus', filepath)
  }

  function hover (event) {
    if (event.type === 'mouseout') {
      var exitedTo = event.toElement || event.relatedTarget
      if (this.contains(exitedTo)) return
      return this.removeChild(deleteButton)
    }
    this.appendChild(deleteButton)
  }

  function getElement (path) {
    var label = container.querySelector(`label[data-path="${path}"]`)
    if (label) return getLiFrom(label)
  }

  function deletePath (event) {
    event.cancelBubble = true
    var span = this
    var li = span.parentElement.parentElement
    var label = getLabelFrom(li)
    var path = label.dataset.path
    var isFolder = !!~label.className.indexOf('folder')
    if (confirm(`
      Do you really want to delete "${path}" ?
      ${isFolder ? '(and all contained files and folders)' : ''}
    `)) {
      li.parentElement.removeChild(li)
      removeSubtree(appAPI, path)
    }
  }

  function editModeOn (event) {
    var label = this
    var li = getLiFrom(label)
    var classes = li.className
    if (~classes.indexOf('hasFocus') && !label.getAttribute('contenteditable')) {
      textUnderEdit = label.innerText
      label.setAttribute('contenteditable', true)
      label.classList.add(css.rename)
      label.focus()
    }
  }

  function editModeOff (event) {
    var label = this
    if (event.type === 'blur' || event.which === 27 || event.which === 13) {
      var save = textUnderEdit !== label.innerText
      if (event.which === 13) event.preventDefault()
      if (save && event.which !== 13) save = confirm('Do you want to rename?')
      if (save) renameSubtree(label)
      else label.innerText = textUnderEdit
      label.removeAttribute('contenteditable')
      label.classList.remove(css.rename)
    }
  }

  function renameSubtree (label, dontcheck) {
    var oldPath = label.dataset.path
    var newPath = oldPath
    newPath = newPath.split('/')
    newPath[newPath.length - 1] = label.innerText
    newPath = newPath.join('/')
    if (!dontcheck) {
      var allPaths = appAPI.filesList()
      for (var i = 0, len = allPaths.length, path, err; i < len; i++) {
        path = allPaths[i]
        if (appAPI.filesIsReadOnly(path)) {
          err = 'path contains readonly elements'
          break
        } else if (path.indexOf(newPath) === 0) {
          err = 'new path is conflicting with another existing path'
          break
        }
      }
    }
    if (err) {
      alert(`couldn't rename - ${err}`)
      label.innerText = textUnderEdit
    } else {
      textUnderEdit = label.innerText
      updateAllLabels([getElement(oldPath)], oldPath, newPath)
    }
  }

  function updateAllLabels (lis, oldPath, newPath) {
    lis.forEach(function (li) {
      var label = getLabelFrom(li)
      var path = label.dataset.path
      var newName = path.replace(oldPath, newPath)
      label.dataset.path = newName
      var isFile = label.className.indexOf('file') === 0
      if (isFile) appAPI.filesRename(path, newName)
      var ul = li.lastChild
      if (ul.tagName === 'UL') {
        updateAllLabels([...ul.children], oldPath, newPath)
      }
    })
  }

  return api
}
/******************************************************************************
  HELPER FUNCTIONS
******************************************************************************/
function adaptEnvironment (label, focus, hover) {
  var li = getLiFrom(label)
  li.style.position = 'relative'
  var span = li.firstChild
  // add focus
  li.addEventListener('click', focus)
  // add hover
  span.classList.add(css.activeMode)
  span.addEventListener('mouseover', hover)
  span.addEventListener('mouseout', hover)
}

function unadaptEnvironment (label, focus, hover) {
  var li = getLiFrom(label)
  var span = li.firstChild
  li.style.position = undefined
  // remove focus
  li.removeEventListener('click', focus)
  // remove hover
  span.classList.remove(css.activeMode)
  span.removeEventListener('mouseover', hover)
  span.removeEventListener('mouseout', hover)
}

function getLiFrom (label) {
  return label.parentElement.parentElement.parentElement
}

function getLabelFrom (li) {
  return li.children[0].children[1].children[0]
}

function removeSubtree (appAPI, path) {
  var allPaths = appAPI.filesList()
  var removePaths = allPaths.filter(function (p) { return ~p.indexOf(path) })
  removePaths.forEach(function (p) { appAPI.filesRemove(p) })
}

function expandPathTo (li) {
  while ((li = li.parentElement.parentElement) && li.tagName === 'LI') {
    var caret = li.firstChild.firstChild
    if (caret.classList.contains('fa-caret-right')) caret.click() // expand
  }
}

function setval (obj, path, value) {
  var keys = path.split('/')
  var len = keys.length - 1
  if (~len) {
    for (var last = keys[len], k, r, o, n, t = obj, idx = 0; idx < len; idx++) {
      k = keys[idx]
      if (o) o = o[k] = {}
      else if (t[k] === Object(t[k])) t = t[k]
      else (r = o = {}, n = k)
    }
    if (value !== undefined) {
      if (r) (t[n] = r, t = o)
      t[last] = value
      return path
    } else if (!r && last in t) return (delete t[last], path)
  }
  return obj
}
/* potential tests

var tape = require('tape')

test('setval edge cases', function (t) {
  t.plan(6)
  var state = { a: { b: [5,6,7] }, '': 3 }
  console.log('\nstate =',JSON.stringify(state)+'\n')
  setval(state, undefined, { x: 5})
  t.deepEqual(state, { a: { b: [5,6,7] }, '': 3 }, "setval(state, undefined, { x: 5})")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state)
  t.deepEqual(state, { a: { b: [5,6,7] }, '': 3 }, "setval(state)")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, '')
  t.deepEqual(state, { a: { b: [5,6,7] } }, "setval(state, '')")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, '', 6)
  t.deepEqual(state, { '': 6, a: { b: [5,6,7] } }, "setval(state, '', 6)")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, '/')
  t.deepEqual(state, { '': 6, a: { b: [5,6,7] } }, "setval(state, '/')")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, '/', 'yay')
  t.deepEqual(state, { '': { '': 'yay' }, a: { b: [5,6,7] } }, "setval(state, '/', 'yay')")
  console.log('      =',JSON.stringify(state)+'\n')
})

test('setval basics', function (t) {
  t.plan(6)
  var state = { a: { b: [5,6,7] }, '': 3 }
  console.log('\nstate =',JSON.stringify(state)+'\n')
  setval(state, 'a', 'm3h')
  t.deepEqual(state, { '': 3, a: 'm3h' }, "setval(state, 'a', 'm3h')")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, 'a')
  t.deepEqual(state, { '': 3 }, "setval(state, 'a')")
  console.log('      =',JSON.stringify(state)+'\n')
   setval(state, '/a', { b: 5 })
   t.deepEqual(state, { '': { a: { b: 5 } } }, "setval(state, '/a', { b: 5 })")
   console.log('      =',JSON.stringify(state)+'\n')
   setval(state, '/a/', 123 )
   t.deepEqual(state, { '': { a: { b: 5, '': 123 } } }, "setval(state, '/a/', 123)")
   console.log('      =',JSON.stringify(state)+'\n')
   setval(state, '//', 'yay' )
   t.deepEqual(state, { '': { a: { b: 5, '': 123 }, '': { '': 'yay' } } }, "setval(state, '//', 'yay')")
   console.log('      =',JSON.stringify(state)+'\n')
   setval(state, 'a/', { x: 5} )
   t.deepEqual(state, { '': { a: { b: 5, '': 123 }, '': { '': 'yay' } }, a: { '': { x: 5 } } }, "setval(state, 'a/', { x: 5} )")
   console.log('      =',JSON.stringify(state)+'\n')
})

test('setval normal', function (t) {
  t.plan(7)
  var state = { }
  console.log('\nstate =',JSON.stringify(state)+'\n')
  setval(state, ['a','b'], 'hello world')
  t.deepEqual(state, { a: { b: 'hello world' } }, "setval(state, ['a','b'], 'hello world')")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, ['a','b'])
  t.deepEqual(state, { a: {} }, "setval(state, ['a','b'])")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, 'a/b', 'hello world')
  t.deepEqual(state, { a: { b: 'hello world' } }, "setval(state, 'a/b', 'hello world')")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, 'a/c', 'foobar')
  t.deepEqual(state, { a: { b: 'hello world', c: 'foobar' } }, "setval(state, 'a/c', 'foobar')")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, 'a/c', null)
  t.deepEqual(state, { a: { b: 'hello world', c: null } }, "setval(state, 'a/c', null)")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, 'a/c')
  t.deepEqual(state, { a: { b: 'hello world' } }, "setval(state, 'a/c')")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, 'a/b/c', true)
  t.deepEqual(state, { a: { b: { c: true } } }, "setval(state, 'a/b/c', true)")
  console.log('      =',JSON.stringify(state)+'\n')
})

test('setval arrays', function (t) {
  t.plan(7)
  var state = { }
  console.log('\nstate =',JSON.stringify(state)+'\n')
  setval(state, 'a/b', 'hello world')
  t.deepEqual(state, { a: { b: 'hello world' } }, "setval(state, 'a/b', 'hello world')")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, 'a', [5,6,7])
  t.deepEqual(state, { a: [5,6,7] }, "setval(state, 'a', [5,6,7]")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, 'b', { y: 2 })
  t.deepEqual(state, { a: [5,6,7], b: { y: 2} }, "setval(state, 'b', { y: 2 })")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, 'b/0', { x: 2 })
  t.deepEqual(state, { a: [5,6,7], b: { y: 2, 0: { x: 2 } } }, "setval(state, 'b/0', { x: 2 })")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, 'b/y')
  t.deepEqual(state, { a: [5,6,7], b: { 0: { x: 2 } } }, "setval(state, 'b/y')")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, 'a/1', { x: 1 })
  t.deepEqual(state, { a: [5,{ x: 1 },7], b: { 0: { x: 2 } } }, "setval(state, 'a/1', { x: 1 })")
  console.log('      =',JSON.stringify(state)+'\n')
  setval(state, 'a/y', { foo: 'bar' })
  var x = { a: [5,{ x: 1 },7], b: { 0: { x: 2 } } }
  x.a.y = { foo: 'bar' }
  t.deepEqual(state, x, "setval(state, 'a/y', { foo: 'bar' })")
  console.log('      =', "works, but state is not JSON.stringifiable")
})

test('setval delimiter', function (t) {
  t.plan(1)
  var state = { }
  console.log('\nstate =',JSON.stringify(state)+'\n')
  setval(state, 'a.b', 'hello world', '.')
  t.deepEqual(state, { a: { b: 'hello world' } }, "setval(state, 'a.b', 'hello world', '.')")
  console.log('      =',JSON.stringify(state)+'\n')
})
*/
