'use strict';

angular.module('crtoolsApp')
	.controller('SVNLogCtrl', function($scope, $http, $filter) {
		$scope.offsetDate = new Date();
		$scope.loadData = function() {
			$scope.items = [];
			$scope.ready = false;
			$scope.toDate = new Date($scope.offsetDate);
			$scope.fromDate = new Date($scope.offsetDate);
			$scope.toDate.setDate($scope.offsetDate.getDate() + 1);
			$scope.fromDate.setDate($scope.offsetDate.getDate() - 14);
			$http.get(buildServerPath('/getLog/'), {
				params: {
					file: '/',
					fromRev: $filter('date')($scope.fromDate, '{yyyy-MM-dd}'),
					toRev: $filter('date')($scope.toDate, '{yyyy-MM-dd}'),
				},
				transformResponse: function(data) {
					return $.parseXML(data);
				}
			}).then(function(resp) {
				var entries = resp.data.getElementsByTagName('logentry');
				angular.forEach(entries, function(entry) {
					var author = entry.getElementsByTagName('author')[0].textContent;
					var date = new Date(entry.getElementsByTagName('date')[0].textContent);
					var msg = entry.getElementsByTagName('msg')[0].textContent;
					var rev = entry.getAttribute('revision');
					$scope.items.push({
						author: author,
						date: date,
						msg: msg,
						rev: Number(rev)
					});
				});
				$scope.ready = true;
			});


			var today = new Date();
			if (today - $scope.offsetDate > 24 * 60 * 60 * 1000) {
				$scope.canShowNextBtn = true;
			} else {
				$scope.canShowNextBtn = false;
			}

		};
		$scope.search = function(row) {
			var pass = true;
			if ($scope.author) {
				pass = pass && (angular.lowercase(row.author).indexOf($scope.author) !== -1);
			}
			if (pass && $scope.message) {
				pass = pass && (angular.lowercase(row.msg).indexOf($scope.message) !== -1);
			}
			if (pass && $scope.revision) {
				pass = pass && (angular.lowercase('' + row.rev).indexOf($scope.revision) !== -1);
			}
			return pass;
		};
		$scope.prevTwoWeeks = function() {
			$scope.offsetDate.setDate($scope.offsetDate.getDate() - 14);
			$scope.loadData();
		};
		$scope.nextTwoWeeks = function() {
			$scope.offsetDate.setDate($scope.offsetDate.getDate() + 14);
			$scope.loadData();
		};
		$scope.loadData();
		$scope.$on('repoSynced', function() {
			$scope.loadData();
		});
	})

.filter('bytes', function() {
	return function(bytes, precision) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) {
			return '-';
		}
		if (typeof precision === 'undefined') {
			precision = 1;
		}
		var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
	};
})

.directive('crFileSize', function($http) {
	return {
		template: '{{size|bytes}}',
		scope: {
			revision: '&',
			path: '&'
		},
		link: function(scope, el) {
			$http.get(buildServerPath('/getFileSize'), {
				params: {
					file: scope.path(),
					revision: scope.revision(),
				}
			}).then(function(resp) {
				scope.size = resp.data;
				if (Number(scope.size) > 1024 * 1024) {
					el.css({
						color: 'red',
						'font-weight': 'bold'
					});
				}
			});
		}
	};
})

.directive('crFiles', function($http) {
	return {
		templateUrl: 'views/files.html',
		scope: {
			revision: '&',
		},
		link: function(scope, el) {
			scope.ready = false;
			$http.get(buildServerPath('/getFiles'), {
				params: {
					file: '/',
					revision: scope.revision(),
				},
				transformResponse: function(data) {
					return $.parseXML(data);
				}
			}).then(function(resp) {
				var entries = resp.data.getElementsByTagName('path');
				scope.items = [];
				angular.forEach(entries, function(entry) {
					scope.items.push(entry.textContent);
				});
				scope.ready = true;
			});

			scope.showDiff = function(path) {
				scope.currentPath = path;
				scope.currentRevision = scope.revision();
				scope.$broadcast('loadDiff');				
			};
		}
	};
})

.directive('crDiff', function($http, $timeout) {
	return {
		templateUrl: 'views/diff.html',
		scope: {
			revision: '&',
			path: '&',
		},
		link: function(scope, el) {
			scope.ready = false;

			var throttle = function(func, wait, options) {
				var context, args, result;
				var timeout = null;
				var previous = 0;
				if (!options){
					options = {};
				}
				var later = function() {
					previous = options.leading === false ? 0 : Date.now();
					timeout = null;
					result = func.apply(context, args);
					if (!timeout){
						context = args = null;
					}
				};
				return function() {
					var now = Date.now();
					if (!previous && options.leading === false){
						previous = now;
					}
					var remaining = wait - (now - previous);
					context = this;
					args = arguments;
					if (remaining <= 0 || remaining > wait) {
						if (timeout) {
							clearTimeout(timeout);
							timeout = null;
						}
						previous = now;
						result = func.apply(context, args);
						if (!timeout){
							context = args = null;
						}
					} else if (!timeout && options.trailing !== false) {
						timeout = setTimeout(later, remaining);
					}
					return result;
				};
			};

			var applyDiff = function(file, difffile) {
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
									marker.endBefore = Math.max(1, before.length);
									marker.endAfter = Math.max(1, after.length);
									markers.push(marker);
									marker = null;
								}
								if (!marker) {
									marker = {
										type: 'add',
										startBefore: Math.max(1, before.length),
										startAfter: Math.max(1, after.length)
									};
								}
								before.push(rest);
								fileLine++;
							} else if (cmd === '+') {
								if (marker && marker.type !== 'remove') {
									marker.endBefore = Math.max(1, before.length);
									marker.endAfter = Math.max(1, after.length);
									markers.push(marker);
									marker = null;
								}
								if (!marker) {
									marker = {
										type: 'remove',
										startBefore: Math.max(1, before.length),
										startAfter: Math.max(1, after.length)
									};
								}
								after.push(rest);
							} else if (cmd === '@') {
								if (marker) {
									marker.endBefore = Math.max(1, before.length);
									marker.endAfter = Math.max(1, after.length);
									markers.push(marker);
									marker = null;
								}
								di--;
								break;
							} else if (cmd === '\\') {
								if (marker) {
									marker.endBefore = Math.max(1, before.length);
									marker.endAfter = Math.max(1, after.length);
									markers.push(marker);
									marker = null;
								}
							} else {
								if (marker) {
									marker.endBefore = Math.max(1, before.length);
									marker.endAfter = Math.max(1, after.length);
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

				for (; fileLine < input.length; fileLine++) {
					before.push(input[fileLine]);
					after.push(input[fileLine]);
				}
				return {
					after: after,
					before: before,
					markers: markers
				};
			};

			var drawMarkers = function(markers) {
				var cmiddle = el.find('.diff .middle');
				cmiddle.empty();
				for (var i = 0; i < markers.length; i++) {
					var marker = markers[i];
					var block = $('<svg class="marker ' + marker.type + '" width="147px" height="10px" xmlns="http://www.w3.org/2000/svg"></svg>');
					var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
					block.append(polygon);
					cmiddle.append(block);
					marker.elm = polygon;
				}
			};

			var updateMarkers = throttle(function(markers) {
				var windowOffset = $('body').scrollTop();
				var leftTop, leftBottom, rightTop, rightBottom, marker;
				var cmiddleWidth = el.find('.diff .middle').outerWidth();
				for (var i = 0; i < markers.length; i++) {
					marker = markers[i];
					try {
						leftTop = el.find('.diff .left .lineno[number=' + marker.startAfter + ']').offset().top + 8 - windowOffset;
						leftBottom = el.find('.diff .left .lineno[number=' + (marker.endAfter + 1) + ']').offset().top - 8 - windowOffset;
						rightTop = el.find('.diff .right .lineno[number=' + marker.startBefore + ']').offset().top + 8 - windowOffset;
						rightBottom = el.find('.diff .right .lineno[number=' + (marker.endBefore + 1) + ']').offset().top - 8 - windowOffset;
						if (marker.startBefore === marker.endBefore) {
							rightTop = rightBottom - 0.5;
							rightBottom += 0.5;
						}
						if (marker.startAfter === marker.endAfter) {
							leftTop = leftBottom - 0.5;
							leftBottom += 0.5;
						}
						marker.elm.setAttribute('d',
							'M ' +
							'-9999 ' +
							leftTop +

							' L 0 ' +
							leftTop +

							' Q ' +
							(cmiddleWidth/4) +
							' ' +
							leftTop +

							' ' +
							(cmiddleWidth/2) +
							' ' +
							((leftTop+rightTop)/2) +

							' Q ' +
							(3*cmiddleWidth/4) +
							' ' +
							rightTop +

							' ' +
							cmiddleWidth +
							' ' +
							rightTop +

							' L 9999 ' +
							rightTop +

							' L 9999 ' +
							rightBottom +

							' L ' +
							cmiddleWidth +
							' ' +
							rightBottom +

							' Q ' +
							(3*cmiddleWidth/4) +
							' ' +
							rightBottom +

							' ' +
							(cmiddleWidth/2) +
							' ' +
							((leftBottom+rightBottom)/2) +

							' Q ' +
							(cmiddleWidth/4) +
							' ' +
							leftBottom +


							' 0 ' +
							leftBottom +

							' L -9999 ' +
							leftBottom);
					} catch (e) {}
				}
			}, 0);

			var compare = function(file, diff) {
				var cleft = el.find('.diff .left');
				var cright = el.find('.diff .right');
				cleft.empty();
				cright.empty();
				var process = function(target, lines, markers) {
					var linenos = $('<div class="linenos"></div>');
					var content = $('<div class="content"></div>');
					content.text(lines.join('\n'));
					hljs.highlightBlock(content[0]);
					target.append(linenos);
					target.append(content);

					var i = 0;
					var promise = $.Deferred();
					var processLineInput = function() {
						for (var j = 0; j < 25; j++) {
							if (i >= lines.length) {
								promise.resolve();
								updateMarkers(markers);
								return;
							}
							var block = $('<div class="lineno" number="' +
								(i + 1) + '">' + (i + 1) + '</div>');
							linenos.append(block);
							i++;
						}
						updateMarkers(markers);
						requestAnimationFrame(processLineInput);
					};
					processLineInput();
					return promise;
				};
				var diffed = applyDiff(file, diff);
				drawMarkers(diffed.markers);
				process(cleft, diffed.after, diffed.markers);
				process(cright, diffed.before, diffed.markers);
				el.find('.diff .middle').on('mousewheel', function(e) {
					el.find('.diff .left').scrollTop(el.find('.diff .left').scrollTop() + e.originalEvent.deltaY);
					el.find('.diff .right').scrollTop(el.find('.diff .right').scrollTop() + e.originalEvent.deltaY);

				});
				el.find('.diff .left, .diff .right').on('scroll', function() {
					updateMarkers(diffed.markers);
				});
				updateMarkers(diffed.markers);
			};

			var makeDiff = function(file, left, right) {
				$http.get(buildServerPath('/getDiff/'), {
					params: {
						file: file,
						left: left,
						right: right
					},
					transformResponse: function(data) {
						return $.parseJSON(data);
					}
				}).then(function(resp) {
					compare(resp.data.file, resp.data.diff);
				});
			};

			scope.$on('loadDiff', function() {
				el.find('.modal').modal();
				$timeout(function(){
					makeDiff(scope.path(), scope.revision() - 1, scope.revision());
				}, 100);				
			});

		}
	};
});
