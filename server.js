var express = require('express');
var spawn = require('child_process').spawn;
var app = express();
var config = require('./config/config');

var repodir = "file://"+config.REPOSITORY_ROOT;

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(express.static(__dirname + '/pub'));
app.get('/getLog/', function(request, response) {
    //console.log('svn', ['log', '--xml', '-r', request.query.fromRev||'0', ':', request.query.toRev||'HEAD', repodir + request.query.file]);
    var log = spawn('svn', ['log', '--xml', '-r', (request.query.fromRev||'0')+':'+(request.query.toRev||'HEAD'), repodir + request.query.file]);
    var logData = '';
    log.stdout.on('data', function(data) {
        logData += data;
    });
    log.on('close', function(code) {
        if (code !== 0) {
            //console.log('err', code);
            response.status(400).send('log');
        } else {
            response.set({'Content-Type': 'text/xml'});
            response.status(200).send(logData);
        }
    });
});
app.get('/getFiles/', function(request, response) {
    //console.log('svn', ['log', '--xml', repodir + request.query.file]);
    var log = spawn('svn', ['log', '--xml', '--verbose', '-r', request.query.revision, repodir + request.query.file]);
    var logData = '';
    log.stdout.on('data', function(data) {
        logData += data;
    });
    log.on('close', function(code) {
        if (code !== 0) {
            //console.log('err', code);
            response.status(400).send('log');
        } else {
            response.set({'Content-Type': 'text/xml'});
            response.status(200).send(logData);
        }
    });
});
app.get('/getFileSize/', function(request, response) {
    //console.log('svnlook', ['filesize', '-r', request.query.revision, config.REPOSITORY_ROOT, request.query.file].join(' '));
    var fileSize = spawn('svnlook', ['filesize', '-r', request.query.revision, config.REPOSITORY_ROOT, request.query.file]);
    var fileSizeData = '';
    fileSize.stdout.on('data', function(data) {
        fileSizeData += data;
    });
    fileSize.on('close', function(code) {
        if (code !== 0) {
            //console.log('err', code);
            response.status(400).send('filesize');
        } else {
            response.status(200).send(fileSizeData);
        }
    });
});
app.get('/getDiff/', function(request, response) {
    //console.log('svn', ['cat', '-r', request.query.right, repodir + request.query.file]);
    var cat = spawn('svn', ['cat', '-r', request.query.right, repodir + request.query.file]);
    var diffFile = '';
    var file = '';
    cat.stdout.on('data', function(data) {
        file += data;
    });
    cat.on('close', function(code) {
        if (code !== 0) {
            //console.log('err', code);
            response.status(400).send('cat');
        } else {
            //console.log('svn', ['diff', '-r', request.query.right + ':' + request.query.left, repodir + request.query.file]);
            var diff = spawn('svn', ['diff', '-r', request.query.right + ':' + request.query.left, repodir + request.query.file]);
            diff.stdout.on('data', function(data) {
                diffFile += data;
            });
            diff.on('close', function(code) {
                if (code !== 0) {
                    //console.log('err', code);
                    response.status(400).send('diff');
                } else {
                    response.send({
                        file: file,
                        diff: diffFile
                    });
                }
            });
        }
    });
});

app.get('/sync/', function(request, response){
    response.header('Transfer-Encoding', 'chunked');
    response.writeHead(200, {'Content-Type':'text/event-stream; charset=UTF-8'});
    //console.log('svnsync', ['sync', repodir]);
    var sync = spawn('svnsync', ['sync', repodir]);
    sync.stdout.on('data', function(data) {
        response.write("event:message\n");
        response.write("data:message "+data);
        response.write("\n\n");
    });
    sync.on('close', function(code) {
        response.write("event:end\ndata:\n\n");
    });
});

app.get('/chunked/', function(request, response){
    var i = 0;
    response.header('Transfer-Encoding', 'chunked');
    response.writeHead(200, {'Content-Type':'text/event-stream; charset=UTF-8'});

    var cb = function(){
        response.write("event:message\n");
        response.write("data:message "+i+'\n\n\n');
        i++;
        if(i>20){
            response.write("event:end\ndata:\n\n");
            //response.end();
        }else{
            setTimeout(cb, 200);
        }
    };
    cb();
});


app.listen(process.env.PORT || config.SERVER_PORT || 3000);
