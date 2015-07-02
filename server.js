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
    svn.getLog(repodir + request.query.file, request.query.fromRev, request.query.toRev).then(function(data) {
        response.set({
            'Content-Type': 'text/xml'
        });
        response.status(200).send(data);
    }, function() {
        response.status(400).send('log');
    });
});


app.get('/getFiles/', function(request, response) {
    svn.getFilesInRevision(repodir + request.query.file, request.query.revision).then(function(data) {
        response.set({
            'Content-Type': 'text/xml'
        });
        response.status(200).send(data);
    }, function() {
        response.status(400).send('files');
    });
});


app.get('/getFileSize/', function(request, response) {
    svn.getFileSize(request.query.file, config.REPOSITORY_ROOT, request.query.revision).then(function(data) {
        response.status(200).send(data);
    }, function() {
        response.status(400).send('filesize');
    });
});

app.get('/getDiff/', function(request, response) {
    var beforeContent = svn.getFileContent(repodir + request.query.file, request.query.left);
    var afterContent = svn.getFileContent(repodir + request.query.file, request.query.right);
    var diffContent = svn.getDiffContent(repodir + request.query.file, request.query.right, request.query.left);
    q.all([beforeContent, afterContent, diffContent]).then(function(results) {
        response.send(diffmake.makeDiff(request.query.file, results[0], results[1], results[2]));
    }, function() {
        response.status(400).send('diff');
    });
});

app.get('/sync/', function(request, response) {
    response.header('Transfer-Encoding', 'chunked');
    response.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=UTF-8'
    });
    svn.syncRepository(repodir).then(function(data) {
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

app.listen(process.env.PORT || config.SERVER_PORT || 3000);
