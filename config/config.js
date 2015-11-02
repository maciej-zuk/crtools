'use strict';
var SERVER_SCHEMA = 'http://';
var SERVER_HOST = 'localhost';
var SERVER_PORT = 3000;



var buildServerPath = function(relUrl){ // jshint ignore:line
	return SERVER_SCHEMA+SERVER_HOST+':'+SERVER_PORT+relUrl;
};

if ( typeof module === 'object' && typeof module.exports === 'object' ) {
	var REPOSITORY_ROOT = __dirname;
	module.exports = {
		SERVER_SCHEMA: SERVER_SCHEMA,
		SERVER_HOST: SERVER_HOST,
		SERVER_PORT: SERVER_PORT,
		REPOSITORY_ROOT: REPOSITORY_ROOT,
	};
}