const malformedBulletPointPattern = /(?<previousLine>^|\n[ ]*)(?<token>[-*])(?<irregularity>[ ]{2,}|[ ]{0})(?<line>[^ #])/
const malformedNumberedPointPattern = /(?<previousLine>^|\n[ ]*)(?<token>\d+\.)(?<irregularity>[ ]{2,}|[ ]{0})(?<line>[^ #])/
const malformedHeaderPattern = /(?<previousLine>^|\n[ ]*)(?<token>[#]{1,6})(?<irregularity>[ ]{2,}|[ ]{0})(?<line>[^ #])/

const bulletPointPattern = /[-*]/g
const numberPointPattern = /\./g
const headerPattern = /#{1,6}/g

const constructFindAndReplaceAllMalformedMarkdown = (malformedRegExp, tokenRegExp) => {
  return markdown => {
    let lintedMarkdown = markdown
    let malformedMarkdown = lintedMarkdown.match(malformedRegExp)
    console.dir(malformedMarkdown)

    while (malformedMarkdown) {
      const token = malformedMarkdown.groups.token
      const previousLine = malformedMarkdown.groups.previousLine
      const line = malformedMarkdown.groups.line.trim()
      lintedMarkdown = lintedMarkdown.replace(malformedMarkdown[0], `${previousLine}${token} ${line}`)
      malformedMarkdown = lintedMarkdown.match(malformedRegExp)
    }

    return lintedMarkdown
  }
}

const trimExcessNewLines = rawMarkdown => rawMarkdown.replace(/\n{3,}/g, '\n\n')
const findAndReplaceMalformedBulletPoints = constructFindAndReplaceAllMalformedMarkdown(malformedBulletPointPattern, bulletPointPattern)
const findAndReplaceMalformedNumberedPoints = constructFindAndReplaceAllMalformedMarkdown(malformedNumberedPointPattern, numberPointPattern)
const findAndReplaceMalformedHeaders = constructFindAndReplaceAllMalformedMarkdown(malformedHeaderPattern, headerPattern)

export const lintMarkdown = rawMarkdown => (
  [
    trimExcessNewLines,
    findAndReplaceMalformedBulletPoints,
    findAndReplaceMalformedNumberedPoints,
    findAndReplaceMalformedHeaders
  ].reduce((lintedMarkdown, linter) => linter(lintedMarkdown), rawMarkdown)
)

// export const constructFindAndReplaceMalformedMarkdown = (globalMalformedRegExp, globalTokenRegExp) => {
//   return markdown => {
//     let lintedMarkdown = markdown
//     const malformedMarkdown = lintedMarkdown.match(globalMalformedRegExp)
//     console.dir(malformedMarkdown)
//
//     if (malformedMarkdown) {
//       for (const item of malformedMarkdown) {
//         const token = item.match(globalTokenRegExp)[0]
//         const previousLine = item.split(token)[0]
//         const line = item.split(token)[1].trim()
//         lintedMarkdown = lintedMarkdown.replace(item, `${previousLine}${token} ${line}`)
//       }
//     }
//
//     return lintedMarkdown
//   }
// }
