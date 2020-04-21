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
    <div id="mindmap-pane">
      <svg id="mindmap"/>
    </div>
  </div>
</template>

<script>
import { transform } from 'markmap-lib/dist/transform.common'
import { markmap } from 'markmap-lib/dist/view.common'
import { fillTemplate } from 'markmap-lib/dist/template'
import debounce from 'lodash/debounce'

import { lintMarkdown } from './lintMarkdown'
import { initializeTabKey } from './indentWithTabKey'

const placeholderMarkdown = '# Oceans\n\n- Atlantic\n- Arctic\n- Indian\n- Pacific\n-'

export default {
  name: 'App',
  data () {
    return {
      documentElementClientHeight: null,
      documentElementClientWidth: null,
      markdown: null,
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
    initializeTabKey()
    this.markdown = lintMarkdown(this.retrieveSavedTextFromLocalStorage()) || placeholderMarkdown
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
      function (event) { this.markdown = this.lintMarkdown(event.target.value) },
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
    instantiateMarkmap () {
      this.markmap = markmap('#mindmap', this.transformed, { autoFit: true })
    },
    retrieveSavedTextFromLocalStorage () {
      return window.localStorage.getItem('markmapPlaygroundSavedText') || ''
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
  padding: 0.4rem 0.3rem;
  text-align: center;
}

#bottom-bar > a:hover {
  color: mediumseagreen;
}

#bottom-bar > a:active {
  color: dodgerblue;
}

/*@supports (padding-bottom: env(safe-area-inset-bottom)) {*/
/*  #bottom-bar {*/
/*    padding-bottom: calc(env(safe-area-inset-bottom) * 0.6);*/
/*  }*/
/*}*/

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

/*@supports (padding-left: env(safe-area-inset-left)) {*/
/*  #mindmap,*/
/*  #editor {*/
/*    padding-left: calc(env(safe-area-inset-left) + 1rem);*/
/*  }*/
/*}*/

/* Left-Right View */
@media (min-aspect-ratio: 2/3) {
  #app {
    display: flex;
    flex-direction: row;
    justify-content: stretch;
    width: 100%;
  }
  #mindmap {
    width: 65%;
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
  #app {
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    width: 100%;
  }
  #mindmap {
    height: 99%;
    width: 100%;
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
