'use strict';
var _spawn = require('child_process').spawn;

var spawn = function(cmd, args){
    console.log('spawn: ', cmd, args.join(' '));
    return _spawn(cmd, args);
};

var q = require('q');

var getLog = function(path, fromRev, toRev) {
    var d = q.defer();
    var log = spawn('svn', ['log', '--xml', '-r', (fromRev || '0') + ':' + (toRev || 'HEAD'), path]);
    var logData = '';
    log.stdout.on('data', function(data) {
        logData += data;
    });
    log.on('close', function(code) {
        if (code !== 0) {
            d.reject();
        } else {
            d.resolve(logData);
        }
    });
    return d.promise;
};

var getFilesInRevision = function(path, revision) {
    var d = q.defer();
    var log = spawn('svn', ['log', '--xml', '--verbose', '-r', revision, path]);
    var logData = '';
    log.stdout.on('data', function(data) {
        logData += data;
    });
    log.on('close', function(code) {
        if (code !== 0) {
            d.reject();
        } else {
            d.resolve(logData);
        }
    });
    return d.promise;
};

var getFileSize = function(path, repo, revision) {
    var d = q.defer();
    var fileSize = spawn('svnlook', ['filesize', '-r', revision, repo, path]);
    var fileSizeData = '';
    fileSize.stdout.on('data', function(data) {
        fileSizeData += data;
    });
    fileSize.on('close', function(code) {
        if (code !== 0) {
            d.reject();
        } else {
            d.resolve(fileSizeData);
        }
    });
    return d.promise;
};

var getFileContent = function(path, revision) {
    var d = q.defer();
    var cat = spawn('svn', ['cat', '-r', revision, path]);
    var file = '';
    cat.stdout.on('data', function(data) {
        file += data;
    });
    cat.on('close', function(code) {
        if (code !== 0) {
            d.resolve('');
        } else {
            d.resolve(file);
        }
    });
    return d.promise;
};

var getDiffContent = function(path, fromRev, toRev) {
    var d = q.defer();
    var diffFile = '';
    var diff = spawn('svn', ['diff', '-r', fromRev + ':' + toRev, path]);
    diff.stdout.on('data', function(data) {
        diffFile += data;
    });
    diff.on('close', function(code) {
        if (code !== 0) {
            d.reject();
        } else {
            d.resolve(diffFile);
        }
    });
    return d.promise;
};

var syncRepository = function(path){
    var d = q.defer();
    var sync = spawn('svnsync', ['sync', path]);
    var lineBuf = '';
    sync.stdout.on('data', function(data) {
        lineBuf += data;
        if (lineBuf.indexOf('\n') >= 0) {
            d.notify(lineBuf);
            lineBuf = '';
        }
    });
    sync.on('close', function(code) {
        if (code !== 0) {
            d.reject();
        } else {            
            d.resolve(lineBuf);
        }
    });
    return d.promise;
};

module.exports = {
    getLog: getLog,
    getFilesInRevision: getFilesInRevision,
    getFileSize: getFileSize,
    getFileContent: getFileContent,
    getDiffContent: getDiffContent,
    syncRepository: syncRepository,
};