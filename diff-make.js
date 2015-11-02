'use strict';
var diffutils = require('./diff-utils');
var prism = require('prismjs');
var q = require('q');


var guessType = function(filename) {
	var filenameParts = filename.split('.');
	var ext;
	if (filenameParts) {
		ext = filenameParts.pop().toLowerCase();
	}
	var guess = {
		js: {
			type: 'code',
			syntax: 'javascript'
		},
		html: {
			type: 'code',
			syntax: 'markup'
		},
		htm: {
			type: 'code',
			syntax: 'markup'
		},
		css: {
			type: 'code',
			syntax: 'css'
		},
		scss: {
			type: 'code',
			syntax: 'css'
		},
		png: {
			type: 'image',
			mime: 'image/png',
		},
		jpg: {
			type: 'image',
			mime: 'image/jpeg',
		},
		jpeg: {
			type: 'image',
			mime: 'image/jpeg',
		},
		gif: {
			type: 'image',
			mime: 'image/gif',
		},
		svg: {
			type: 'image',
			mime: 'image/svg+xml',
		},
	}[ext];
	if (guess) {
		return guess;
	} else {
		return {
			type: 'binary'
		};
	}
};

var makeDiff = function(filename, before, after, diff) {
	var d = q.defer();
	var diffData = {};
	diffData.fileType = guessType(filename);
	if (diffData.fileType.type === 'code') {
		var finishedAfter = q.defer();
		var finishedBefore = q.defer();
		var beforeLines = (before.match(/\n/g) || []).length + 1;
		var afterLines = (after.match(/\n/g) || []).length + 1;
		diffData.markers = diffutils.makeMarkers(after, diff);
		diffData.afterLines = afterLines;
		diffData.beforeLines = beforeLines;
		var beforeSplit = before.replace(/\r/gm, '').split('\n');
		var afterSplit = after.replace(/\r/gm, '').split('\n');
		var beforeSplitIndex = 0;
		var afterSplitIndex = 0;
		var runBefore = function() {
			try {
				d.notify({
					before: prism.highlight(beforeSplit[beforeSplitIndex], prism.languages[diffData.fileType.syntax]) + '<br>'
				});
			} catch (e) {
				d.reject(e);
				console.log(e);
			}
			beforeSplitIndex++;
			if (beforeSplitIndex >= diffData.beforeLines || d.promise.isRejected()) {
				finishedBefore.resolve();
			} else {
				setTimeout(runBefore, 0);
			}
		};
		var runAfter = function() {
			try {
				d.notify({
					after: prism.highlight(afterSplit[afterSplitIndex], prism.languages[diffData.fileType.syntax]) + '<br>'
				});
			} catch (e) {
				d.reject(e);
				console.log(e);
			}
			afterSplitIndex++;
			if (afterSplitIndex >= diffData.afterLines || d.promise.isRejected()) {
				finishedAfter.resolve();
			} else {
				setTimeout(runAfter, 0);
			}
		};
		q.all([finishedAfter.promise, finishedBefore.promise]).then(function() {
			setTimeout(function() {
				d.resolve();
			}, 100);
		});
		setTimeout(function() {
			d.notify({
				diffData: diffData
			});
			if (diffData.beforeLines < 1) {
				finishedBefore.resolve();
			} else {
				runBefore();
			}
			if (diffData.afterLines < 1) {
				finishedAfter.resolve();
			} else {
				runAfter();
			}
		}, 10);
	} else if (diffData.fileType.type === 'image') {
		setTimeout(function() {
			d.notify({
				diffData: diffData
			});
			d.notify({
				after: 'data:' + diffData.fileType.mime + ';base64,' + (new Buffer(after)).toString('base64')
			});
			d.notify({
				before: 'data:' + diffData.fileType.mime + ';base64,' + (new Buffer(before)).toString('base64')
			});
			d.resolve();
		}, 10);
	} else {
		setTimeout(function() {
			var beforeLines = (before.match(/\n/g) || []).length + 1;
			var afterLines = (after.match(/\n/g) || []).length + 1;
			diffData.markers = diffutils.makeMarkers(after, diff);
			diffData.afterLines = afterLines;
			diffData.beforeLines = beforeLines;
			d.notify({
				diffData: diffData
			});
			d.notify({
				after: after
			});
			d.notify({
				before: before
			});
			d.resolve();
		}, 10);
	}
	return d;
};

module.exports = {
	makeDiff: makeDiff
};
