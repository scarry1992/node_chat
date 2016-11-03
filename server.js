var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    cache = {},
    server = http.createServer(handleReq).listen(3000),
    chatServer = require('./lib/chat_server');

chatServer.listen(server);

function send404(resp) {
    resp.writeHead(404, {'Content-Type': 'text/html'});
    resp.write('Error 404: resource not found');
    resp.end(console.log('end'));
}

function sendFile(resp, filePath, fileContents) {
    resp.writeHead(200, {'Content-Type': mime.lookup(path.basename(filePath))});
    resp.end(fileContents);
}
function serveStatic(resp, cache, absPath) {
    if (cache[absPath]) {
        sendFile(resp, absPath, cache[absPath])
    } else {
        fs.exists(absPath, function (exists) {
            if (exists) {
                fs.readFile(absPath, function (err, data) {
                    if (err) {
                        send404(resp);
                    } else {
                        cache[absPath] = data;
                        sendFile(resp, absPath, data);
                    }
                })
            } else {
                send404(resp);
            }

        })
    }
}

function handleReq(req, resp) {
    var filePath = false;

    if (req.url == '/') {
        filePath = 'public/index.html';
    } else {
        filePath = 'public'+req.url;
    }
    var absPath = './'+filePath;
    serveStatic(resp, cache, absPath);
}