const fs = require('fs')

const findit = require('findit2')
const puppeteer = require('puppeteer')
const toml = require('toml')

// noinspection JSCheckFunctionSignatures
const config = toml.parse(fs.readFileSync('config.toml'))

async function savePage (page, pageName, bodyText) {
  const pageUrl = `${config.pukiwiki.wikiUrl}?cmd=edit&page=${config.pukiwiki.baseUrl}${pageName}`
  const credential = config.auth.username || config.auth.password ? {
    username: config.auth.username,
    password: config.auth.password
  } : null

  await page.authenticate(credential)
  await page.goto(pageUrl)
  await page.$eval('textarea', (el, bodyText) => el.value = bodyText, bodyText)
  await page.click('#_edit_form_notimestamp')
  await page.click('input[accesskey="s"]')
}

function getMarkdownFiles () {
  return new Promise((resolve) => {
    const finder = findit(config.directory.markdown, { followSymlinks: true })
    const markdownFiles = []
    finder.on('file', (file, stat, linkPath) => {
      // In case of symlink, use `linkPath` to get a relative path (`file` has an absolute path)
      const markdownFile = linkPath || file
      markdownFiles.push(markdownFile)
    })
    finder.on('end', () => resolve(markdownFiles))
  })
}

(async () => {
  const br = await puppeteer.launch({ headless: process.env.PUKIWIKI_BOT_HEADLESS || false })

  const mdFiles = await getMarkdownFiles()
  mdFiles.forEach(async mdFile => {
    const pageName = mdFile.replace(config.directory.markdown, '').replace(/\.md$/, '')
    const mdText = fs.readFileSync(mdFile, { encoding: 'utf-8' })

    const page = await br.newPage()
    await savePage(page, pageName, mdText)
  })
})()
