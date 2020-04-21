const malformedBulletPointPattern = /(?<previousLine>^|\n[ ]*)(?<token>[-*])(?<irregularity>[ ]{2,}|[ ]{0})(?<line>[^ \n-])/ // Can't put '*' in negated set in capture group `line` because it could be used to italicize
const malformedNumberedPointPattern = /(?<previousLine>^|\n[ ]*)(?<token>\d+\.)(?<irregularity>[ ]{2,}|[ ]{0})(?<line>[^ .\n])/
const malformedHeaderPattern = /(?<previousLine>^|\n[ ]*)(?<token>[#]{1,6})(?<irregularity>[ ]{2,}|[ ]{0})(?<line>[^ #\n])/

// const bulletPointPattern = /[-*]/g
// const numberPointPattern = /\./g
// const headerPattern = /#{1,6}/g

const constructFindAndReplaceAllMalformedMarkdown = malformedRegExp => {
  return markdown => {
    let lintedMarkdown = markdown
    let malformedMarkdown = lintedMarkdown.match(malformedRegExp)

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
const findAndReplaceMalformedBulletPoints = constructFindAndReplaceAllMalformedMarkdown(malformedBulletPointPattern)
const findAndReplaceMalformedNumberedPoints = constructFindAndReplaceAllMalformedMarkdown(malformedNumberedPointPattern)
const findAndReplaceMalformedHeaders = constructFindAndReplaceAllMalformedMarkdown(malformedHeaderPattern)

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
