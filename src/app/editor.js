'use strict'

var EventManager = require('../lib/eventManager')

var csjs = require('csjs-inject')
var ace = require('brace')
var Range = ace.acequire('ace/range').Range
require('../mode-solidity.js')

var css = csjs`
  .editor-container   {
    display   : flex;
    position  : absolute;
    top       : 2.5em;
    left      : 0;
    right     : 0;
    bottom    : 0;
    min-width : 20vw;
  }
  .ace-editor   {
    border-top  : 3px solid #F4F6FF;
    padding-top : 0.5em;
    font-size   : 15px;
    height      : 98%;
    width       : 100%;
  }
`
document.querySelector('#editor-container').className = css['editor-container']
document.querySelector('#input').className += css['ace-editor']

function Editor () {
  var editor = ace.edit('input')
  document.getElementById('input').editor = editor // required to access the editor during tests
  var event = new EventManager()
  this.event = event
  var sessions = {}
  var sourceAnnotations = []
  var readOnlySessions = {}
  var currentSession

  var emptySession = createSession('')

  function createSession (content) {
    var s = new ace.EditSession(content, 'ace/mode/javascript')
    s.setUndoManager(new ace.UndoManager())
    s.setTabSize(4)
    s.setUseSoftTabs(true)
    return s
  }

  function switchSession (path) {
    currentSession = path
    editor.setSession(sessions[currentSession])
    editor.setReadOnly(readOnlySessions[currentSession])
    editor.focus()
  }

  this.open = function (path, content) {
    if (!sessions[path]) {
      var session = createSession(content)
      sessions[path] = session
      readOnlySessions[path] = false
    }
    switchSession(path)
  }

  this.openReadOnly = function (path, content) {
    if (!sessions[path]) {
      var session = createSession(content)
      sessions[path] = session
      readOnlySessions[path] = true
    }
    switchSession(path)
  }

  this.get = function (path) {
    if (currentSession === path) {
      return editor.getValue()
    }
  }

  this.current = function (path) {
    if (editor.getSession() === emptySession) {
      return
    }
    return currentSession
  }

  this.discard = function (path) {
    if (currentSession !== path) {
      delete sessions[path]
    }
  }

  this.resize = function () {
    editor.resize()
    var session = editor.getSession()
    session.setUseWrapMode(document.querySelector('#editorWrap').checked)
    if (session.getUseWrapMode()) {
      var characterWidth = editor.renderer.characterWidth
      var contentWidth = editor.container.ownerDocument.getElementsByClassName('ace_scroller')[0].clientWidth

      if (contentWidth > 0) {
        session.setWrapLimit(parseInt(contentWidth / characterWidth, 10))
      }
    }
  }

  this.addMarker = function (lineColumnPos, cssClass) {
    var currentRange = new Range(lineColumnPos.start.line, lineColumnPos.start.column, lineColumnPos.end.line, lineColumnPos.end.column)
    return editor.session.addMarker(currentRange, cssClass)
  }

  this.removeMarker = function (markerId) {
    editor.session.removeMarker(markerId)
  }

  this.clearAnnotations = function () {
    sourceAnnotations = []
    editor.getSession().clearAnnotations()
  }

  this.addAnnotation = function (annotation) {
    sourceAnnotations[sourceAnnotations.length] = annotation
    this.setAnnotations(sourceAnnotations)
  }

  this.setAnnotations = function (sourceAnnotations) {
    editor.getSession().setAnnotations(sourceAnnotations)
  }

  this.gotoLine = function (line, col) {
    editor.focus()
    editor.gotoLine(line + 1, col - 1, true)
  }

  // Do setup on initialisation here
  editor.on('changeSession', function () {
    event.trigger('sessionSwitched', [])

    editor.getSession().on('change', function () {
      event.trigger('contentChanged', [])
    })
  })

  // Unmap ctrl-t & ctrl-f
  editor.commands.bindKeys({ 'ctrl-t': null })
  editor.commands.bindKeys({ 'ctrl-f': null })

  editor.resize(true)
}

module.exports = Editor
