$port = 4173

@'
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || "/").split("?")[0]);
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const resolvedPath = path.resolve(root, "." + relativePath);
  const relative = path.relative(root, resolvedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(resolvedPath, (error, stat) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const targetPath = stat.isDirectory()
      ? path.join(resolvedPath, "index.html")
      : resolvedPath;

    fs.readFile(targetPath, (readError, data) => {
      if (readError) {
        res.writeHead(500);
        res.end("Server error");
        return;
      }

      res.writeHead(200, {
        "Content-Type": mime[path.extname(targetPath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-cache"
      });
      res.end(data);
    });
  });
}).listen(Number(process.env.PORT || 4173), "127.0.0.1", () => {
  console.log(`RangersJournal running at http://127.0.0.1:${process.env.PORT || 4173}/`);
});
'@ | node -
