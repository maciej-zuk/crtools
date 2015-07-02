'use strict';

var makeMarkers = function makeMarkers(file, difffile) {
	var input = file.split('\n');
	var before = [];
	var after = [];
	var diff = difffile.split('\n');
	if (diff.length < 2) {
		return {
			after: file.split('\n'),
			before: file.split('\n'),
			markers: []
		};
	}
	var hunkRe = /\@\@ -(.*?),/;
	var fileLine = 0;
	var markers = [];
	var marker;

	for (var di = 0; di < diff.length; di++) {
		var hunk = diff[di].match(hunkRe);
		if (hunk) {
			di++;
			var startLine = Number(hunk[1]);
			for (; fileLine < startLine - 1; fileLine++) {
				before.push(input[fileLine]);
				after.push(input[fileLine]);
			}
			marker = null;
			while (di < diff.length) {
				var diffLine = diff[di];
				var cmd = diffLine[0];
				var rest = diffLine.substr(1);
				if (cmd === '-') {
					if (marker && marker.type !== 'add') {
						marker.endBefore = Math.max(0, before.length);
						marker.endAfter = Math.max(0, after.length);
						markers.push(marker);
						marker = null;
					}
					if (!marker) {
						marker = {
							type: 'add',
							startBefore: Math.max(0, before.length),
							startAfter: Math.max(0, after.length)
						};
					}
					before.push(rest);
					fileLine++;
				} else if (cmd === '+') {
					if (marker && marker.type !== 'remove') {
						marker.endBefore = Math.max(0, before.length);
						marker.endAfter = Math.max(0, after.length);
						markers.push(marker);
						marker = null;
					}
					if (!marker) {
						marker = {
							type: 'remove',
							startBefore: Math.max(0, before.length),
							startAfter: Math.max(0, after.length)
						};
					}
					after.push(rest);
				} else if (cmd === '@') {
					if (marker) {
						marker.endBefore = Math.max(0, before.length);
						marker.endAfter = Math.max(0, after.length);
						markers.push(marker);
						marker = null;
					}
					di--;
					break;
				} else if (cmd === '\\') {
					if (marker) {
						marker.endBefore = Math.max(0, before.length);
						marker.endAfter = Math.max(0, after.length);
						markers.push(marker);
						marker = null;
					}
				} else {
					if (marker) {
						marker.endBefore = Math.max(0, before.length);
						marker.endAfter = Math.max(0, after.length);
						markers.push(marker);
						marker = null;
					}
					before.push(rest);
					after.push(rest);
					fileLine++;
				}
				di++;
			}
		}
	}
	if (marker) {
		marker.endBefore = before.length;
		marker.endAfter = after.length;
		markers.push(marker);
		marker = null;
	}

	var outMarkers = [];
	for (var i = 0; i < markers.length; i++) {
		var marker1 = markers[i];
		if (marker1.type !== 'add') {
			outMarkers.push(marker1);
			continue;
		}
		if (i + 1 >= markers.length) {
			outMarkers.push(marker1);
			break;
		}
		var marker2 = markers[i + 1];
		if (marker2.type !== 'remove') {
			outMarkers.push(marker2);
			continue;
		}
		if (marker1.startBefore === marker2.endBefore - 1 && marker1.startAfter === marker2.endAfter - 1 && marker1.endBefore === marker2.startBefore && marker1.endAfter === marker2.startAfter) {
			outMarkers.push({
				type: 'modify',
				startBefore: marker1.startBefore,
				endBefore: marker1.endBefore,
				startAfter: marker2.startAfter,
				endAfter: marker2.endAfter,
			});
		} else {
			outMarkers.push(marker1);
			outMarkers.push(marker2);
		}
		i++;
	}

	return outMarkers;
};

module.exports = {
	makeMarkers: makeMarkers
};
