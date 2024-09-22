// Required Modules
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const sqlite = require('sqlite3');
const { open } = require('sqlite');

// Array of Mime Types
const mimeTypes = {
  "html" : "text/html",
  "css" : "text/css",
  "js" : "text/javascript",
  "jpeg" : "image/jpeg",
  "jpg" : "image/jpeg",
  "png" : "image/png",
  "gif" : "image/gif",
  "webp" : "image/webp",
  "svg" : "image/svg+xml",
  "icon" : "image/x-icon",
  "webm" : "video/webm",
  "ogg" : "video/ogg",
  "mp4" : "video/mp4",
  "mp3" : "audio/mpeg",
  "ttf" : "font/ttf",
  "otf" : "font/otf",
  "woff" : "font/woff",
  "woff2" : "font/woff2",
  "pdf" : "application/pdf"
};

// Hostname and Port
const hostname = '0.0.0.0';  // Change this to 0.0.0.0 to allow external access
const port = 3000;

(async () => {
const db = await open({
  filename: "database.db",
  driver: sqlite.Database
})

await migrate(db)

/*
  !!! to clear record
  
  await db.exec("DELETE FROM views;")
  return
*/

// Create Server
const server = http.createServer(async (req, res) => {
  if(req.url === "/views" && req.method === "GET") {
    const result = await db.all("SELECT * from views;")
    res.writeHead(200, { "Content-Type": "application/json"})
    res.end(JSON.stringify({quantity: result?.length || 0}))
    return
  }
  if(req.url === "/hack" && req.method === "GET") {
     const ip = parseIp(req)
 
     const existingIp = await db.get(`SELECT ip from views WHERE ip = ?;`, ip)

     if(!existingIp || !existingIp.ip) {
        await db.run(`INSERT INTO views (ip) VALUES (?);`, [ip])
     }
     
     
     res.writeHead(200, { "Content-Type": "application/json"})
     res.end(JSON.stringify({ message: "ok" }))
     return
  }
  var uri = url.parse(req.url).pathname;
  var fileName = path.join(process.cwd(), unescape(uri)); // Current working directory + uri
  console.log('Loading ' + uri);
  var stats;

  try {
    stats = fs.lstatSync(fileName);
  } catch(e) {
    // If file not found
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('404 not Found\n');
    res.end();
    return;
  }

  // Check if file or directory
  if(stats.isFile()) {
    var mimeType = mimeTypes[path.extname(fileName).split('.').reverse()[0]];
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeType);
    var fileStream = fs.createReadStream(fileName);
    fileStream.pipe(res);
  } else if(stats.isDirectory()) {
    res.statusCode = 302;
    res.setHeader('Location', 'index.html');
    res.end();
  } else {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('500 Internal Error\n');
  }

});

// Run Server
server.listen(port, hostname, () => {
  console.log('Server running at http://' + hostname + ':' + port + '\n');
});
})()

const migrate = async (db) => {
  const result = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='views';")

  if(!result || !result.name || !result.name === "views") {
     await db.exec(`CREATE TABLE views (
	     ip TEXT PRIMARY KEY
      );`)
  }
}

const parseIp = (req) =>
    req.headers['x-forwarded-for']?.split(',').shift()
    || req.socket?.remoteAddress
