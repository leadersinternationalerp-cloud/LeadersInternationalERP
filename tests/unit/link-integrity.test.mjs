import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const filepath = path.join(dir, file)
    if (fs.statSync(filepath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walkSync(filepath, filelist)
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      filelist.push(filepath)
    }
  }
  return filelist
}

function getAllAppRoutes(appDir) {
  const routes = new Set()
  const files = walkSync(appDir)
  for (const file of files) {
    const rel = path.relative(appDir, file).replace(/\\/g, '/')
    if (rel.endsWith('/page.tsx') || rel.endsWith('/page.ts') || rel.endsWith('/route.ts')) {
      const routePath = '/' + rel.replace(/\/page\.(tsx|ts)$/, '').replace(/\/route\.ts$/, '')
      routes.add(routePath === '/page' ? '/' : routePath)
    }
  }
  return routes
}

test('Link integrity: all static internal Links point to existing routes', () => {
  const srcDir = path.resolve('src')
  const appDir = path.resolve('src/app')
  const appRoutes = getAllAppRoutes(appDir)

  const files = walkSync(srcDir)
  const deadLinks = []

  const linkRegex = /href=["'](\/dashboard\/[^"'?#]+|\/kitchen\/[^"'?#]+|\/auth\/[^"'?#]+|\/api\/[^"'?#]+)["']/g

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    let match
    while ((match = linkRegex.exec(content)) !== null) {
      const link = match[1].replace(/\/$/, '')
      
      // Match against static route or dynamic route pattern
      const exists = Array.from(appRoutes).some(route => {
        if (route === link) return true
        // Simple dynamic route matching [param]
        const regexPattern = '^' + route.replace(/\[[^\]]+\]/g, '[^/]+') + '$'
        return new RegExp(regexPattern).test(link)
      })

      if (!exists) {
        deadLinks.push({ file: path.relative(process.cwd(), file), link })
      }
    }
  }

  assert.deepEqual(deadLinks, [], `Found dead internal links:\n${JSON.stringify(deadLinks, null, 2)}`)
})
