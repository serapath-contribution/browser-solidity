'use strict'

var remix = require('ethereum-remix')
var ace = require('brace')
var Range = ace.acequire('ace/range').Range

/**
 * Manage remix and source highlighting
 */
function Debugger (id, editor, compiler, executionContextEvent, switchToFile, offsetToLineColumnConverter) {
  this.el = document.querySelector(id)
  this.offsetToLineColumnConverter = offsetToLineColumnConverter
  this.debugger = new remix.ui.Debugger()
  this.sourceMappingDecoder = new remix.util.SourceMappingDecoder()
  this.el.appendChild(this.debugger.render())
  this.editor = editor
  this.switchToFile = switchToFile
  this.compiler = compiler
  this.markers = {}
  this.breakPointManager = new remix.code.BreakpointManager(this.debugger, (sourceLocation) => {
    return this.offsetToLineColumnConverter.offsetToLineColumn(sourceLocation, sourceLocation.file, this.editor, this.compiler.lastCompilationResult.data)
  })

  this.debugger.setBreakpointManager(this.breakPointManager)
  this.breakPointManager.event.register('breakpointHit', (sourceLocation) => {
    this.editor.setBreakpoint(this.touchedBreakpoint, 'breakpointUntouched')
    var lineColumnPos = this.offsetToLineColumnConverter.offsetToLineColumn(sourceLocation, sourceLocation.file, this.editor, this.compiler.lastCompilationResult.data)
    this.editor.setBreakpoint(lineColumnPos.start.line, 'breakpointTouched')
    var self = this
    setTimeout(function () {
      self.editor.setBreakpoint(lineColumnPos.start.line, 'breakpointUntouched')
    }, 5000)
  })

  function convertSourceLocation (self, fileName, row) {
    var source = {}
    for (let file in self.compiler.lastCompilationResult.data.sourceList) {
      if (self.compiler.lastCompilationResult.data.sourceList[file] === fileName) {
        source.file = file
        break
      }
    }
    console.log(self.offsetToLineColumnConverter.lineBreakPositionsByContent[source.file])
    source.start = self.offsetToLineColumnConverter.lineBreakPositionsByContent[source.file][row > 0 ? row - 1 : 0]
    source.end = self.offsetToLineColumnConverter.lineBreakPositionsByContent[source.file][row]
    source.row = row
    return source
  }

  editor.event.register('breakpointCleared', (fileName, row) => {
    this.breakPointManager.remove(convertSourceLocation(this, fileName, row))
  })

  editor.event.register('breakpointAdded', (fileName, row) => {
    this.breakPointManager.add(convertSourceLocation(this, fileName, row))
  })

  var self = this
  executionContextEvent.register('contextChanged', this, function (context) {
    self.switchProvider(context)
  })

  this.debugger.event.register('traceUnloaded', () => {
    this.removeMarkers()
  })

  // unload if a file has changed (but not if tabs were switched)
  editor.event.register('contentChanged', function () {
    self.debugger.unLoad()
    self.removeMarkers()
  })

  // register selected code item, highlight the corresponding source location
  this.debugger.codeManager.event.register('changed', this, function (code, address, index) {
    if (self.compiler.lastCompilationResult) {
      this.debugger.callTree.sourceLocationTracker.getSourceLocationFromInstructionIndex(address, index, self.compiler.lastCompilationResult.data.contracts, function (error, rawLocation) {
        if (!error) {
          var lineColumnPos = self.offsetToLineColumnConverter.offsetToLineColumn(rawLocation, rawLocation.file, self.editor, self.compiler.lastCompilationResult.data)
          self.highlight(lineColumnPos, rawLocation, 'highlightcode')
        } else {
          self.removeMarker('highlightcode')
        }
      })
    }
  })
}

/**
 * Start debugging using Remix
 *
 * @param {String} txHash    - hash of the transaction
 */
Debugger.prototype.debug = function (txHash) {
  var self = this
  this.debugger.web3().eth.getTransaction(txHash, function (error, tx) {
    if (!error) {
      self.debugger.setCompilationResult(self.compiler.lastCompilationResult.data)
      self.debugger.debug(tx)
    }
  })
}

Debugger.prototype.switchFile = function (rawLocation) {
  var name = this.editor.getCacheFile() // current opened tab
  var source = this.compiler.lastCompilationResult.data.sourceList[rawLocation.file] // auto switch to that tab
  if (name !== source) {
    this.switchToFile(source) // command the app to swicth to the next file
  }
}

/**
 * highlight the given @arg lineColumnPos
 *
 * @param {Object} lineColumnPos - position of the source code to hightlight {start: {line, column}, end: {line, column}}
 * @param {Object} rawLocation - raw position of the source code to hightlight {start, length, file, jump}
 */
Debugger.prototype.highlight = function (lineColumnPos, rawLocation, cssCode) {
  this.removeMarker(cssCode)
  this.switchFile(rawLocation)
  var range = new Range(lineColumnPos.start.line, lineColumnPos.start.column, lineColumnPos.end.line, lineColumnPos.end.column)
  this.markers[cssCode] = this.editor.addMarker(range, cssCode)
}

/**
 * unhighlight highlighted statements
 */
Debugger.prototype.removeMarkers = function () {
  for (var k in this.markers) {
    this.removeMarker(k)
  }
}

/**
 * unhighlight the current highlighted statement
 */
Debugger.prototype.removeMarker = function (key) {
  if (this.markers[key]) {
    this.editor.removeMarker(this.markers[key])
    this.markers[key] = null
  }
}

/**
 * add a new web3 provider to remix
 *
 * @param {String} type - type/name of the provider to add
 * @param {Object} obj  - provider
 */
Debugger.prototype.addProvider = function (type, obj) {
  this.debugger.addProvider(type, obj)
}

/**
 * switch the provider
 *
 * @param {String} type - type/name of the provider to use
 */
Debugger.prototype.switchProvider = function (type) {
  this.debugger.switchProvider(type)
}

/**
 * get the current provider
 */
Debugger.prototype.web3 = function (type) {
  return this.debugger.web3()
}

module.exports = Debugger
