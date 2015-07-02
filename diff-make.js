'use strict';
var diffutils = require('./diff-utils');
var hljs = require('highlight.js');

var guessType = function(filename) {
	var ext = filename.split('.').pop().toLowerCase();
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
	var diffData = {};
	diffData.fileType = guessType(filename);
	if (diffData.fileType.type === 'code') {
		var beforeLines = (before.match(/\n/g)||[]).length+1;
		var afterLines = (after.match(/\n/g)||[]).length+1;
		diffData.markers = diffutils.makeMarkers(after, diff);
		diffData.before = hljs.highlightAuto(before).value;
		diffData.after = hljs.highlightAuto(after).value;
		diffData.afterLines = afterLines;
		diffData.beforeLines = beforeLines;
	}else if(diffData.fileType.type === 'image'){
		diffData.after = 'data:'+diffData.fileType.mime+';base64,'+(new Buffer(after)).toString('base64');
		diffData.before = 'data:'+diffData.fileType.mime+';base64,'+(new Buffer(before)).toString('base64');
	}
	return diffData;
};

module.exports = {
	makeDiff: makeDiff
};
