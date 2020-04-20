<template>
  <div id="app" :style="{ height: appHeight, width: appWidth }">
    <div id="editor-pane">
      <textarea
        id="editor"
        :value="markdown"
        @input="updateMarkdown"
        name="markmap"/>
      <div id="bottom-bar">
        <a id="copy-text" @click="copyText">Copy Text</a>
        <a id="clear-text" @click="clearText">Clear Text</a>
        <a id="download-markdown" @click="downloadText">Save Text</a>
        <a id="download-html" @click="downloadHtml">Save HTML</a>
        <a id="download-svg" @click="downloadSvg">Save SVG</a>
      </div>
    </div>
    <svg id="mindmap"/>
  </div>
</template>

<script>
import { transform } from 'markmap-lib/dist/transform.common'
import { markmap } from 'markmap-lib/dist/view.common'
import { fillTemplate } from 'markmap-lib/dist/template'
import debounce from 'lodash/debounce'

export default {
  name: 'App',
  data () {
    return {
      markdown: '# Trio\n\n- Tom\n- Dick\n- Harry',
      documentElementClientHeight: null,
      documentElementClientWidth: null,
      markmap: null
    }
  },
  computed: {
    transformed () {
      return transform(this.markdown)
    },
    appHeight () {
      return `${this.documentElementClientHeight}px`
    },
    appWidth () {
      return `${this.documentElementClientWidth}px`
    }
  },
  created () {
    this.initializeWindowInnerHeightListener(document.documentElement, window)
    this.initializeWindowInnerWidthListener(document.documentElement, window)
  },
  mounted () {
    this.initializeTabKeyToIndentLine()
    this.retrieveSavedTextFromLocalStorage()
    this.instantiateMarkmap()
  },
  watch: {
    transformed: {
      handler (newTransformed) {
        this.markmap.setData(newTransformed)
        this.saveTextToLocalStorage()
      },
      deep: true
    }
  },
  methods: {
    updateMarkdown: debounce(
      function (event) { this.markdown = event.target.value },
      800
    ),
    svgOutput () {
      const innerHtml = document.getElementById('mindmap').innerHTML
      return `<?xml version="1.0" encoding="UTF-8"?><svg id="markmap" xmlns="http://www.w3.org/2000/svg" class="markmap">${innerHtml}</svg>`
    },
    copyText () {
      document.getElementById('editor').select()
      document.execCommand('copy')
      document.getSelection().removeAllRanges()
    },
    clearText () {
      if (window.confirm('Are you sure you want to clear the text?')) {
        this.markdown = ''
      }
    },
    downloadText () {
      this.download('download-markdown', this.markdown, `markmap-${Date.now()}.txt`, 'text/plain')
    },
    downloadHtml () {
      const html = fillTemplate(this.transformed)
      this.download('download-html', html, `markmap-${Date.now()}.html`, 'text/html')
    },
    downloadSvg () {
      this.download('download-svg', this.svgOutput(), `markmap-${Date.now()}.svg`, 'image/svg+xml')
    },
    download (elementId, text, filename, type) {
      // REF: https://stackoverflow.com/a/29339233
      const button = document.getElementById(elementId)
      const file = new Blob([text], { type: type })
      button.href = URL.createObjectURL(file)
      button.download = filename
    },
    initializeWindowInnerHeightListener (documentElement, window) {
      this.documentElementClientHeight = documentElement.clientHeight

      window.addEventListener(
        'resize',
        () => { this.documentElementClientHeight = documentElement.clientHeight }
      )
    },
    initializeWindowInnerWidthListener (documentElement, window) {
      this.documentElementClientWidth = documentElement.clientWidth

      window.addEventListener(
        'resize',
        () => { this.documentElementClientWidth = documentElement.clientWidth }
      )
    },
    initializeTabKeyToIndentLine () {
      // REF: https://css-tricks.com/snippets/javascript/support-tabs-in-textareas/
      HTMLTextAreaElement.prototype.getCaretPosition = function () { // return the caret position of the textarea
        return this.selectionStart
      }
      HTMLTextAreaElement.prototype.setCaretPosition = function (position) { // change the caret position of the textarea
        this.selectionStart = position
        this.selectionEnd = position
        this.focus()
      }
      HTMLTextAreaElement.prototype.hasSelection = function () { // if the textarea has selection then return true
        if (this.selectionStart === this.selectionEnd) {
          return false
        } else {
          return true
        }
      }
      HTMLTextAreaElement.prototype.getSelectedText = function () { // return the selection text
        return this.value.substring(this.selectionStart, this.selectionEnd)
      }
      HTMLTextAreaElement.prototype.setSelection = function (start, end) { // change the selection area of the textarea
        this.selectionStart = start
        this.selectionEnd = end
        this.focus()
      }

      const textarea = document.getElementsByTagName('textarea')[0]

      textarea.onkeydown = function (event) {
        // support tab on textarea
        if (event.keyCode === 9) { // tab was pressed
          const newCaretPosition = textarea.getCaretPosition() + '    '.length
          textarea.value = textarea.value.substring(0, textarea.getCaretPosition()) + '    ' + textarea.value.substring(textarea.getCaretPosition(), textarea.value.length)
          textarea.setCaretPosition(newCaretPosition)
          return false
        }
        if (event.keyCode === 8) { // backspace
          if (textarea.value.substring(textarea.getCaretPosition() - 4, textarea.getCaretPosition()) === '    ') { // it's a tab space
            const newCaretPosition = textarea.getCaretPosition() - 3
            textarea.value = textarea.value.substring(0, textarea.getCaretPosition() - 3) + textarea.value.substring(textarea.getCaretPosition(), textarea.value.length)
            textarea.setCaretPosition(newCaretPosition)
          }
        }
        if (event.keyCode === 37) { // left arrow
          let newCaretPosition
          if (textarea.value.substring(textarea.getCaretPosition() - 4, textarea.getCaretPosition()) === '    ') { // it's a tab space
            newCaretPosition = textarea.getCaretPosition() - 3
            textarea.setCaretPosition(newCaretPosition)
          }
        }
        if (event.keyCode === 39) { // right arrow
          let newCaretPosition
          if (textarea.value.substring(textarea.getCaretPosition() + 4, textarea.getCaretPosition()) === '    ') { // it's a tab space
            newCaretPosition = textarea.getCaretPosition() + 3
            textarea.setCaretPosition(newCaretPosition)
          }
        }
      }
    },
    instantiateMarkmap () {
      this.markmap = markmap('#mindmap', this.transformed, { autoFit: true })
    },
    retrieveSavedTextFromLocalStorage () {
      const savedText = window.localStorage.getItem('markmapPlaygroundSavedText')
      if (savedText) {
        this.markdown = savedText
      }
    },
    saveTextToLocalStorage () {
      window.localStorage.setItem('markmapPlaygroundSavedText', this.markdown)
    }
  }
}
</script>

<style>
html,
body,
#app {
  /* REF: https://css-tricks.com/snippets/css/system-font-stack/ */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
  color: #333;
}

#app,
#bottom-bar {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
}

#mindmap {
  width: 65%;
}

#editor-pane {
  display: flex;
  flex-direction: column;
  width: 35%;
  min-width: 280px;
}

#bottom-bar {
  cursor: pointer;
  background-color: #f0f0f0;
}

#bottom-bar > a {
  font-size: 0.857142rem;
  font-weight: bolder;
  color: dodgerblue;
  padding: 0.4rem 0.3rem;
  text-align: center;
}

#bottom-bar > a:hover {
  color: mediumseagreen;
}

textarea {
  border: none;
  resize: none;
  outline: none;
  margin: 0;
  background-color: #f6f6f6;
  height: 100%;
  font-size: 14px;
  font-family: "Monaco", courier, monospace;
  padding: 20px;
}

</style>
