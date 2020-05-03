<template>
  <div
    id="app"
    :style="{ height: appHeight, width: appWidth }">
    <div id="toolbar">
      <a
        id="lint-text"
        @click="lintText">Lint Text</a>
      <a
        id="copy-text"
        @click="copyText">Copy Text</a>
      <a
        id="clear-text"
        @click="clearText">Clear Text</a>
      <a
        id="download-markdown"
        @click="downloadText">Get Text</a>
      <a
        id="download-html"
        @click="downloadHtml">Get HTML</a>
      <a
        id="download-svg"
        @click="downloadSvg">Get SVG</a>
      <a
        id="fit-mindmap"
        @click="fitMindmap">Fit Canvas</a>
    </div>
    <div
      id="panes"
      :style="{ height: paneHeight }">
      <div
        id="editor-pane"
        class="resize-animation"
        :style="{ width: editorPaneWidth, height: editorPaneHeight }">
        <textarea
          id="editor"
          :value="markdown"
          @input="updateMarkdown"
          placeholder="Enter Markdown here..."
          name="markmap"/>
      </div>
      <div
        class="resize-handle resize-animation"
        :style="{ width: paneMode === 'top-bottom' ? appWidth : null, height: paneMode === 'top-bottom' ? '2% !important' : null }"/>
      <div
        id="mindmap-pane"
        class="resize-animation"
        :style="{ width: mindmapPaneWidth, height: mindmapPaneHeight }">
        <svg id="mindmap"/>
      </div>
    </div>
  </div>
</template>

<script>
import { transform } from 'markmap-lib/dist/transform.common'
import { markmap } from 'markmap-lib/dist/view.common'
import { fillTemplate } from 'markmap-lib/dist/template'
import debounce from 'lodash/debounce'

import { lintMarkdown } from './lintMarkdown'

const placeholderMarkdown =
  '# Oceans\n\n- Atlantic\n- Arctic\n- Indian\n- Pacific\n- '

export default {
  name: 'App',
  data () {
    return {
      documentElementClientHeight: null,
      documentElementClientWidth: null,
      editorPaneElementClientWidth: null,
      editorPaneElementClientHeight: null,
      mindmapPaneElementClientWidth: null,
      mindmapPaneElementClientHeight: null,
      shouldResetHeightAndWidth: false,
      toolbarElementClientHeight: null,
      paneWidthRatio: {
        editor: 0.35,
        handle: 0.008,
        mindmap: 0.642
      },
      paneHeightRatio: {
        editor: 0.44,
        handle: 0.02,
        mindmap: 0.54
      },
      markdown: null,
      markmap: null,
      editor: null
    }
  },
  computed: {
    paneMode () {
      const currentAspectRatio = this.documentElementClientWidth / this.documentElementClientHeight
      const thresholdAspectRatio = 1
      const leftRightMode = (currentAspectRatio > thresholdAspectRatio) && 'left-right'
      const topBottomMode = (currentAspectRatio < thresholdAspectRatio) && 'top-bottom'

      return leftRightMode || topBottomMode
    },
    appHeight () {
      return `${this.documentElementClientHeight}px`
    },
    appWidth () {
      return `${this.documentElementClientWidth}px`
    },
    appDimensions () {
      return { height: this.appHeight, width: this.appWidth }
    },
    paneClientHeight () {
      return this.documentElementClientHeight - this.toolbarElementClientHeight
    },
    paneHeight () {
      return `${this.paneClientHeight}px`
    },
    editorPaneWidth () {
      return `${this.editorPaneElementClientWidth}px`
    },
    editorPaneHeight () {
      return `${this.editorPaneElementClientHeight}px`
    },
    mindmapPaneWidth () {
      return `${this.mindmapPaneElementClientWidth}px`
    },
    mindmapPaneHeight () {
      return `${this.mindmapPaneElementClientHeight}px`
    }
  },
  created () {
    this.initializeDocumentElementClientDimensionalChangeListener(
      document.documentElement,
      window
    )
    this.initializePaneDimensions()
      .then(() => {
        if (this.paneMode === 'left-right') {
          this.paneWidthRatio = this.setPaneWidthRatio()
        } else if (this.paneMode === 'top-bottom') {
          this.paneHeightRatio = this.setPaneHeightRatio()
        }
      })
  },
  mounted () {
    this.toolbarElementClientHeight = this.getToolbarElementHeight()
    this.markdown = lintMarkdown(this.retrieveSavedTextFromLocalStorage()) || placeholderMarkdown
    this.markmap = this.instantiateMarkmap()
    this.editor = this.instantiateCodeMirror(window.CodeMirror)
    this.initializePaneResizing('#editor-pane', '#mindmap-pane')
    this.configureCodeMirrorTabKey(window.CodeMirror)
    this.initializeCodeMirror()
    this.setFocusOnLastLineInCodeMirror()
  },
  watch: {
    markdown: {
      handler (newMarkdown) {
        this.markmap.setData(transform(newMarkdown))
        this.saveTextToLocalStorage()
      },
      deep: true
    },
    appDimensions () {
      this.editor.refresh() // Refreshes bottom margin for `scrollPastEnd`
      this.resetPaneDimensionsIfPaneModeChanges()
      this.setPaneDimensions()
      this.fitMindmap()
    },
    paneMode () {
      this.shouldResetHeightAndWidth = true
    }
  },
  methods: {
    updateMarkdown: debounce(function (codeMirror) {
      this.markdown = lintMarkdown(codeMirror.getValue())
    }, 800),
    svgOutput () {
      const innerHtml = document.getElementById('mindmap').innerHTML
      return `<?xml version="1.0" encoding="UTF-8"?><svg id="markmap" xmlns="http://www.w3.org/2000/svg" class="markmap">${innerHtml}</svg>`
    },
    lintText () {
      this.editor.setValue(lintMarkdown(this.markdown))
      this.setFocusOnCodeMirror()
    },
    copyText () {
      document.getElementById('editor').select()
      document.execCommand('copy')
      document.getSelection().removeAllRanges()
      document.activeElement.blur()
    },
    clearText () {
      const isPlaceholderText = this.markdown === placeholderMarkdown
      if (isPlaceholderText) {
        this.markdown = ''
      } else if (window.confirm('Are you sure you want to clear the text?')) {
        this.markdown = ''
      }
    },
    downloadText () {
      this.initializeDownload(
        'download-markdown',
        this.markdown,
        `markmap-${Date.now()}.txt`,
        'text/plain'
      )
    },
    downloadHtml () {
      const html = fillTemplate(transform(this.markdown))
      this.initializeDownload(
        'download-html',
        html,
        `markmap-${Date.now()}.html`,
        'text/html'
      )
    },
    downloadSvg () {
      this.initializeDownload(
        'download-svg',
        this.svgOutput(),
        `markmap-${Date.now()}.svg`,
        'image/svg+xml'
      )
    },
    initializeDownload (elementId, text, filename, type) {
      // REF: https://stackoverflow.com/a/29339233
      const button = document.getElementById(elementId)
      const file = new Blob([text], { type: type })
      button.href = URL.createObjectURL(file)
      button.download = filename
    },
    fitMindmap: debounce(function () {
      this.markmap.fit()
    }, 800),
    elementClientWidthGetter (elementId) {
      const element = document.getElementById(elementId)
      return element.clientWidth
    },
    elementClientHeightGetter (elementId) {
      const element = document.getElementById(elementId)
      return element.clientHeight
    },
    async initializePaneDimensions () {
      while (!document.getElementById('toolbar')?.clientHeight) {
        await new Promise(resolve => { setTimeout(resolve, 100) })
      }
      this.editorPaneElementClientWidth = this.elementClientWidthGetter('editor-pane')
      this.mindmapPaneElementClientWidth = this.elementClientWidthGetter('mindmap-pane')
      this.editorPaneElementClientHeight = this.elementClientHeightGetter('editor-pane')
      this.mindmapPaneElementClientHeight = this.elementClientHeightGetter('mindmap-pane')
    },
    setPaneWidthRatio () {
      const totalWidth = this.editorPaneElementClientWidth + this.mindmapPaneElementClientWidth
      return {
        editor: this.editorPaneElementClientWidth / totalWidth - 0.004,
        handle: 0.008,
        mindmap: this.mindmapPaneElementClientWidth / totalWidth - 0.004
      }
    },
    setPaneHeightRatio () {
      const totalHeight = this.editorPaneElementClientHeight + this.mindmapPaneElementClientHeight

      return {
        editor: this.editorPaneElementClientHeight / totalHeight - 0.01,
        handle: 0.02,
        mindmap: this.mindmapPaneElementClientHeight / totalHeight - 0.01
      }
    },
    resetPaneDimensionsIfPaneModeChanges () {
      if (this.shouldResetHeightAndWidth) {
        if (this.paneMode === 'left-right') {
          this.editorPaneElementClientHeight = null
          this.mindmapPaneElementClientHeight = null
        } else if (this.paneMode === 'top-bottom') {
          this.editorPaneElementClientWidth = null
          this.mindmapPaneElementClientWidth = null
        }
        this.shouldResetHeightAndWidth = false
      }
    },
    setPaneDimensions () {
      this.$nextTick(
        () => {
          if (this.paneMode === 'left-right') {
            this.editorPaneElementClientWidth = this.paneWidthRatio.editor * this.documentElementClientWidth
            this.mindmapPaneElementClientWidth = this.paneWidthRatio.mindmap * this.documentElementClientWidth
            this.editorPaneElementClientHeight = this.paneClientHeight
            this.mindmapPaneElementClientHeight = this.paneClientHeight
          } else if (this.paneMode === 'top-bottom') {
            this.editorPaneElementClientHeight = this.paneHeightRatio.editor * this.paneClientHeight
            this.mindmapPaneElementClientHeight = this.paneHeightRatio.mindmap * this.paneClientHeight
            this.editorPaneElementClientWidth = this.documentElementClientWidth
            this.mindmapPaneElementClientWidth = this.documentElementClientWidth
          }
        }
      )
    },
    initializePaneResizing (leftTargetClass, rightTargetClass, resizeHandleClass = '.resize-handle') {
      const leftTargetElement = document.querySelector(leftTargetClass)
      const rightTargetElement = document.querySelector(rightTargetClass)
      const resizeHandles = document.querySelectorAll(resizeHandleClass)
      const minimumSize = 20

      let originalLeftTargetWidth = 0
      let originalLeftTargetHeight = 0
      let originalRightTargetWidth = 0
      let originalRightTargetHeight = 0
      let originalMouseX = 0
      let originalMouseY = 0

      const events = {
        touch: {
          start: 'touchstart',
          move: 'touchmove',
          end: 'touchend'
        },
        mouse: {
          start: 'mousedown',
          move: 'mousemove',
          end: 'mouseup'
        }
      }

      const resizeHandler = eventType => {
        const { move, end } = events[eventType]
        return (
          event => {
            event.preventDefault()

            originalLeftTargetWidth = parseFloat(getComputedStyle(leftTargetElement, null).getPropertyValue('width').replace('px', ''))
            originalLeftTargetHeight = parseFloat(getComputedStyle(leftTargetElement, null).getPropertyValue('height').replace('px', ''))
            originalRightTargetWidth = parseFloat(getComputedStyle(rightTargetElement, null).getPropertyValue('width').replace('px', ''))
            originalRightTargetHeight = parseFloat(getComputedStyle(rightTargetElement, null).getPropertyValue('height').replace('px', ''))
            originalMouseX = event.pageX
            originalMouseY = event.pageY

            const resize = event => {
              if (this.paneMode === 'left-right') {
                const leftTargetWidth = originalLeftTargetWidth + (event.pageX - originalMouseX)
                if (leftTargetWidth > minimumSize) {
                  this.editorPaneElementClientWidth = leftTargetWidth
                  this.editorPaneElementClientHeight = this.paneClientHeight
                }
              }
              if (this.paneMode === 'top-bottom') {
                const leftTargetHeight = originalLeftTargetHeight + (event.pageY - originalMouseY)
                if (leftTargetHeight > minimumSize) {
                  this.editorPaneElementClientWidth = this.documentElementClientWidth
                  this.editorPaneElementClientHeight = leftTargetHeight
                }
              }

              if (this.paneMode === 'left-right') {
                const rightTargetWidth = originalRightTargetWidth - (event.pageX - originalMouseX)

                if (rightTargetWidth > minimumSize) {
                  this.mindmapPaneElementClientWidth = rightTargetWidth
                  this.mindmapPaneElementClientHeight = this.paneClientHeight
                }
              }
              if (this.paneMode === 'top-bottom') {
                const rightTargetHeight = originalRightTargetHeight - (event.pageY - originalMouseY)

                if (rightTargetHeight > minimumSize) {
                  this.mindmapPaneElementClientWidth = this.documentElementClientWidth
                  this.mindmapPaneElementClientHeight = rightTargetHeight
                }
              }

              if (this.paneMode === 'left-right') {
                this.paneWidthRatio = this.setPaneWidthRatio()
              } else if (this.paneMode === 'top-bottom') {
                this.paneHeightRatio = this.setPaneHeightRatio()
              }
              this.fitMindmap()
            }
            const stopResize = () => { window.removeEventListener('mousemove', resize) }

            window.addEventListener(move, resize)
            window.addEventListener(end, stopResize)
          }
        )
      }

      for (const resizeHandle of resizeHandles) {
        resizeHandle.addEventListener(events.mouse.start, resizeHandler('mouse'))
        resizeHandle.addEventListener(events.touch.start, resizeHandler('touch'))
      }
    },
    initializeDocumentElementClientDimensionalChangeListener (documentElement, window) {
      this.documentElementClientWidth = documentElement.clientWidth
      this.documentElementClientHeight = documentElement.clientHeight

      window.addEventListener('resize', () => {
        this.documentElementClientWidth = documentElement.clientWidth
        this.documentElementClientHeight = documentElement.clientHeight
      })
    },
    getToolbarElementHeight () {
      return document.getElementById('toolbar').clientHeight
    },
    instantiateMarkmap () {
      return markmap('#mindmap', transform(this.markdown), { autoFit: true })
    },
    retrieveSavedTextFromLocalStorage () {
      return window.localStorage.getItem('markmapPlaygroundSavedText') || ''
    },
    saveTextToLocalStorage () {
      window.localStorage.setItem('markmapPlaygroundSavedText', this.markdown)
    },
    instantiateCodeMirror (globalInstance) {
      return globalInstance.fromTextArea(
        document.querySelector('textarea#editor'),
        {
          mode: 'markdown',
          lineNumbers: true,
          theme: 'default',
          highlightFormatting: true,
          showTrailingSpace: true,
          autoCloseBrackets: true,
          scrollbarStyle: 'overlay',
          styleActiveLine: { nonEmpty: true },
          scrollPastEnd: true,
          tabSize: 2,
          indentUnit: 2,
          lineWrapping: true,
          foldGutter: true,
          gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
          indentWithTabs: true,
          highlightSelectionMatches: {
            showToken: /\w/,
            annotateScrollbar: true
          },
          extraKeys: {
            Enter: 'newlineAndIndentContinueMarkdownList',
            'Ctrl-Q': function (cm) {
              cm.foldCode(cm.getCursor())
            }
          }
          // autoCloseTags: true,
        }
      )
    },
    configureCodeMirrorTabKey (globalInstance) {
      // REF: https://github.com/codemirror/CodeMirror/issues/2428#issuecomment-39315423
      globalInstance.keyMap.default['Shift-Tab'] = 'indentLess'
      globalInstance.keyMap.default.Tab = 'indentMore'
    },
    initializeCodeMirror () {
      this.editor.setValue(this.markdown)
      this.editor.on('change', this.updateMarkdown)
    },
    setFocusOnLastLineInCodeMirror () {
      // REF: https://davidwalsh.name/codemirror-set-focus-line
      this.editor.focus()
      // Set the cursor at the end of existing content
      this.editor.setCursor(this.editor.lineCount(), 0)
      const { left: x, clientHeight: y } = this.editor.getScrollInfo()
      this.editor.scrollTo(x, y)
    },
    setFocusOnCodeMirror () {
      this.editor.focus()
      this.editor.setCursor(this.editor.lineCount(), 0)
    }
  }
}
</script>

<style>
html,
body,
#app {
  /* REF: https://css-tricks.com/snippets/css/system-font-stack/ */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
  color: #333;
  background-color: #f7f7f7;
}

#toolbar {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  border-bottom: 1px solid #dddddd;
  width: 100%;
  cursor: pointer;
  background-color: #f0f0f0;
}

#toolbar > a {
  text-decoration: none;
  font-size: 0.714285rem;
  font-weight: bolder;
  color: dodgerblue;
  padding: 0.3rem 0.3rem;
  text-align: center;
}

#toolbar > a:active {
  color: mediumseagreen;
}

/*@supports (padding-bottom: env(safe-area-inset-bottom)) {*/
/*  #toolbar {*/
/*    padding-bottom: calc(env(safe-area-inset-bottom) * 0.6);*/
/*  }*/
/*}*/

.CodeMirror {
  height: 100%;
  font-family: "Monaco", courier, monospace;
  font-size: 0.857142rem;
  border: none;
  background-color: #f7f7f7;
}

.CodeMirror-gutters,
.CodeMirror-gutters > .CodeMirror-gutter.CodeMirror-linenumbers {
  background-color: #f0f0f0;
}

#editor {
  border: none;
  resize: none;
  outline: none;
  margin: 0;
  background-color: #f6f6f6;
  height: 100%;
  font-family: "Monaco", courier, monospace;
  padding: 0 0.857142rem;
}

.resize-animation {
  /*transition: width 0.1s ease-in-out, height 0.1s ease-in-out;*/
}

/*@supports (padding-left: env(safe-area-inset-left)) {*/
/*  #mindmap,*/
/*  #editor {*/
/*    padding-left: calc(env(safe-area-inset-left) + 1rem);*/
/*  }*/
/*}*/

/* REF: https://stackoverflow.com/questions/3379091/is-it-possible-to-change-width-of-tab-symbol-in-textarea */
textarea {
  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;
}

.resize-handle {
  background-color: #f0f0f0;
}

/* Left-Right View */
@media (min-aspect-ratio: 2/2) {
  #panes {
    display: flex;
    flex-direction: row;
    justify-content: stretch;
    width: 100%;
  }
  .resize-handle {
    width: 0.8%;
    cursor: col-resize;
    border-left: 1px solid #dddddd;
    border-right: 1px solid #dddddd;
  }
  #mindmap {
    width: 65%;
  }
  .CodeMirror {
    font-size: 0.857142rem;
  }
  #editor {
    font-size: 0.857142rem;
  }
  #editor-pane {
    display: flex;
    flex-direction: column;
    width: 35%;
    min-width: 280px;
  }
  #mindmap-pane {
    height: 100%;
    width: 64.2%;
  }
  #mindmap {
    height: 99%;
    width: 100%;
  }
}

/* Top-Bottom View */
@media (max-aspect-ratio: 2/2) {
  #panes {
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    width: 100%;
  }
  .resize-handle {
    /*height: 2%;*/
    cursor: row-resize;
    border-top: 1px solid #dddddd;
    border-bottom: 1px solid #dddddd;
  }
  #mindmap {
    height: 99%;
    width: 100%;
  }
  .CodeMirror {
    font-size: 0.714285rem;
  }
  #editor {
    font-size: 0.714285rem;
  }
  #editor-pane {
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    height: 44%;
    width: 100%;
  }
  #mindmap-pane {
    height: 54%;
    width: 100%;
  }
}
</style>
