<template>
  <div
    id="app"
    :style="{ height: appHeight, width: appWidth }">
    <div
      id="panes"
      :style="{ height: panesHeight }">
      <div
        id="editor-pane"
        class="resizable">
        <textarea
          id="editor"
          :value="markdown"
          @input="updateMarkdown"
          placeholder="Enter Markdown here..."
          name="markmap"/>
      </div>
      <div id="mindmap-pane">
        <svg id="mindmap"/>
      </div>
    </div>
    <div id="bottom-bar">
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
      bottomBarElementHeight: null,
      markdown: null,
      markmap: null,
      editor: null
    }
  },
  computed: {
    appHeight () {
      return `${this.documentElementClientHeight}px`
    },
    appWidth () {
      return `${this.documentElementClientWidth}px`
    },
    appDimensions () {
      return { height: this.appHeight, width: this.appWidth }
    },
    panesHeight () {
      return `${this.documentElementClientHeight - this.bottomBarElementHeight}px`
    }
  },
  created () {
    this.initializeDocumentElementClientHeightListener(
      document.documentElement,
      window
    )
    this.initializeDocumentElementClientWidthListener(
      document.documentElement,
      window
    )
  },
  mounted () {
    this.bottomBarElementHeight = this.getBottomBarElementHeight()
    this.markdown =
      lintMarkdown(this.retrieveSavedTextFromLocalStorage()) ||
      placeholderMarkdown
    this.markmap = this.instantiateMarkmap()
    this.editor = this.instantiateCodeMirror(window.CodeMirror)
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
      this.fitMindmap()
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
    initializeDocumentElementClientHeightListener (documentElement, window) {
      this.documentElementClientHeight = documentElement.clientHeight

      window.addEventListener('resize', () => {
        this.documentElementClientHeight = documentElement.clientHeight
      })
    },
    initializeDocumentElementClientWidthListener (documentElement, window) {
      this.documentElementClientWidth = documentElement.clientWidth

      window.addEventListener('resize', () => {
        this.documentElementClientWidth = documentElement.clientWidth
      })
    },
    getBottomBarElementHeight () {
      return document.getElementById('bottom-bar').clientHeight
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
      this.editor.setCursor()
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
}

#bottom-bar {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  width: 100%;
  cursor: pointer;
  background-color: #f0f0f0;
}

#bottom-bar > a {
  text-decoration: none;
  font-size: 0.714285rem;
  font-weight: bolder;
  color: dodgerblue;
  padding: 0.3rem 0.3rem;
  text-align: center;
}

#bottom-bar > a:active {
  color: mediumseagreen;
}

/*@supports (padding-bottom: env(safe-area-inset-bottom)) {*/
/*  #bottom-bar {*/
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

.resizable {
  resize: horizontal;
  overflow: auto;
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

/* Left-Right View */
@media (min-aspect-ratio: 2/3) {
  #panes {
    display: flex;
    flex-direction: row;
    justify-content: stretch;
    width: 100%;
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
    width: 65%;
  }
  #mindmap {
    height: 99%;
    width: 100%;
  }
}

/* Top-Bottom View */
@media (max-aspect-ratio: 2/3) {
  #panes {
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    width: 100%;
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
    height: 45%;
    width: 100%;
  }
  #mindmap-pane {
    height: 55%;
    width: 100%;
  }
}
</style>
