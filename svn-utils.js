'use strict';
var _spawn = require('child_process').spawn;
var fs = require('fs');
var path = require("path");
var spawn = function(cmd, args) {
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
    var cat = spawn('svn', ['cat', '-r', revision, path + '@' + revision]);
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
var syncRepository = function(path) {
    var d = q.defer();
    var sync = spawn('svnsync', ['sync', path, '--steal-lock']);
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
var getRepositories = function(root) {
    var d = q.defer();
    var processed;
    var repos = [];
    var processPath = function(path) {
        return function(err, subpaths) {
            if (!err) {
                if (subpaths.indexOf('conf') >= 0 && subpaths.indexOf('db') >= 0 && subpaths.indexOf('hooks') >= 0 && subpaths.indexOf('format') >= 0) {
                    repos.push({
                        path: path,
                        name: path
                    });
                }
            }
            processed--;
            if (processed === 0) {
                console.log(repos);
                d.resolve(repos);
            }
        };
    };
    fs.readdir(root, function(err, paths) {
        processed = paths.length;
        for (var i = 0; i < paths.length; i++) {
            fs.readdir(root + '/' + paths[i], processPath(paths[i]));
        }
    });
    return d.promise;
};

var rmdirRec = function(dir) {
    var list = fs.readdirSync(dir);
    for(var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i]);
        var stat = fs.statSync(filename);
        
        if(stat.isDirectory()) {
            rmdirRec(filename);
        } else {
            fs.unlinkSync(filename);
        }
    }
    fs.rmdirSync(dir);
};

var createRepository = function(url, path, login, password){
    var d = q.defer();
    spawn('svnadmin', ['create', path]).on('close', function(ret){
        if(ret !== 0){
            d.reject('Repository already exists!');
            return;
        }
        var prop = fs.openSync(path+'/hooks/pre-revprop-change', 'w');
        fs.writeSync(prop, '#!/bin/sh');
        fs.closeSync(prop);
        try{
            fs.chmodSync(path+'/hooks/pre-revprop-change', '755');
        }catch(e){}
        var sync = spawn('svnsync', [
            'init', 
            'file://'+path, 
            url, 
            '--source-trust-server-cert-failures=unknown-ca,cn-mismatch', 
            '--non-interactive', 
            '--source-username', 
            login, 
            '--source-password', 
            password
        ]);
        var syncout = '';
        sync.stderr.on('data', function(data) {
            syncout += data;
        });
        sync.on('close', function(ret){
            if(ret !== 0){
                rmdirRec(path);
                d.reject('Error when syncing: \n'+syncout);
                return;
            }
            d.resolve();
        });
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
    getRepositories: getRepositories,
    createRepository: createRepository,
};
