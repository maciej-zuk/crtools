'use strict';
var express = require('express');
var app = express();
var config = require('./config/config');
var diffmake = require('./diff-make');
var svn = require('./svn-utils');
var q = require('q');

var repodir = 'file://' + config.REPOSITORY_ROOT;

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.get('/getLog/', function(request, response) {
    svn.getLog(repodir + '/' + request.query.repoName + '/' + request.query.file, request.query.fromRev, request.query.toRev).then(function(data) {
        response.set({
            'Content-Type': 'text/xml'
        });
        response.status(200).send(data);
    }, function() {
        response.status(400).send('log');
    });
});

app.get('/getRepos/', function(request, response) {
    svn.getRepositories(config.REPOSITORY_ROOT).then(function(data) {
        response.status(200).send(data);
    }, function() {
        response.status(400).send('getrepos');
    });
});

app.get('/getFiles/', function(request, response) {
    svn.getFilesInRevision(repodir + '/' + request.query.repoName + '/' +request.query.file, request.query.revision).then(function(data) {
        response.set({
            'Content-Type': 'text/xml'
        });
        response.status(200).send(data);
    }, function() {
        response.status(400).send('files');
    });
});


app.get('/getFileSize/', function(request, response) {
    svn.getFileSize(request.query.file, config.REPOSITORY_ROOT + '/' +request.query.repoName, request.query.revision).then(function(data) {
        response.status(200).send(data);
    }, function() {
        response.status(400).send('filesize');
    });
});

app.get('/getDiff/', function(request, response) {
    var beforeContent = svn.getFileContent(repodir + '/' + request.query.repoName + '/' + request.query.file, request.query.left);
    var afterContent = svn.getFileContent(repodir + '/' + request.query.repoName + '/' + request.query.file, request.query.right);
    var diffContent = svn.getDiffContent(repodir + '/' + request.query.repoName + '/' + request.query.file, request.query.right, request.query.left);
    q.all([beforeContent, afterContent, diffContent]).then(function(results) {
        var diffDefered = diffmake.makeDiff(request.query.file, results[0], results[1], results[2]);
        response.header('Transfer-Encoding', 'chunked');
        response.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=UTF-8'
        });
        diffDefered.promise.then(function() {
            response.write('\n\n');
            response.write('event:end\ndata:\n\n');
        }, function() {
            response.write('event:end\ndata:\n\n');
            response.status(400).send('sync');
        }, function(data) {
            if (response.connection.destroyed) {
                diffDefered.reject();
                return;
            }
            if (data.diffData) {
                response.write('event:diffdata\n');
                response.write('data:' + JSON.stringify(data.diffData));
            } else if (data.before) {
                response.write('event:before\n');
                response.write('data:' + data.before);
            } else if (data.after) {
                response.write('event:after\n');
                response.write('data:' + data.after);
            }
            response.write('\n\n');
        });

    }, function() {
        response.status(400).send('diff');
    });
});

app.get('/sync/', function(request, response) {
    response.header('Transfer-Encoding', 'chunked');
    response.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=UTF-8'
    });
    svn.syncRepository(repodir+'/'+ request.query.path).then(function(data) {
        response.write('event:message\n');
        response.write('data:' + data);
        response.write('\n\n');
        response.write('event:end\ndata:\n\n');
    }, function() {
        response.write('event:end\ndata:\n\n');
        response.status(400).send('sync');
    }, function(data) {
        response.write('event:message\n');
        response.write('data:' + data);
        response.write('\n\n');
    });
});

app.get('/addRepo/', function(request, response) {
    svn.createRepository(request.query.url, config.REPOSITORY_ROOT + '/' +request.query.repoName, request.query.login, request.query.password).then(function() {
        response.status(200).send('ok');
    }, function(msg) {
        response.status(400).send(msg);
    });
});

app.listen(process.env.PORT || config.SERVER_PORT || 3000);
