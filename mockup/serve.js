const http = require('http')
const fs = require('fs')
const path = require('path')
const port = 8080
const dir = __dirname

const mime = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.png':'image/png', '.ico':'image/x-icon' }

http.createServer((req, res) => {
  let file = req.url === '/' ? '/serieswatcher-palettes.html' : req.url
  const filePath = path.join(dir, decodeURIComponent(file))
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'text/plain' })
    res.end(data)
  })
}).listen(port, '0.0.0.0', () => {
  console.log(`Serving on http://192.168.1.182:${port}`)
  console.log(`Files: ${dir}`)
})
