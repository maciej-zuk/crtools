'use strict';

angular.module('crtoolsApp')

.directive('crDiff', function($http, $timeout) {
	return {
		templateUrl: 'views/diff.html',
		scope: {
			revision: '&',
			path: '&',
		},
		link: function link(scope, el) {
			scope.ready = false;

			var drawMarkers = function drawMarkers(markers) {
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

			var updateMarkers = function updateMarkers(markers) {
				var windowOffset = $('body').scrollTop();
				var leftTop, leftBottom, rightTop, rightBottom, marker;
				var cmiddleWidth = el.find('.diff .middle').outerWidth();
				var leftOffset = el.find('.diff .left').scrollTop();
				var rightOffset = el.find('.diff .right').scrollTop();
				for (var i = 0; i < markers.length; i++) {
					marker = markers[i];
					try {
						leftTop = marker.startAfter * 16 - leftOffset + 8;
						leftBottom = marker.endAfter * 16  - leftOffset + 8;
						rightTop = marker.startBefore * 16  - rightOffset + 8;
						rightBottom = marker.endBefore * 16  - rightOffset + 8;
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
			};

			var compare = function compare(data) {
				var cleft = el.find('.diff .left');
				var cright = el.find('.diff .right');
				cleft.empty();
				cright.empty();
				var process = function process(target, contentHtml, linesCount) {
					var linenos = $('<div class="linenos"></div>');
					var content = $('<div class="content"></div>');
					content.html(contentHtml);
				 	target.append(linenos);
				 	target.append(content);
				 	var lines = [];				 	
					for (var i = 0; i < linesCount; i++) {
						lines.push(i+1);
					}				 	
					linenos.html(lines.join('<br>'));
				};
				drawMarkers(data.markers);
				process(cright, data.after, data.afterLines);
				process(cleft, data.before, data.beforeLines);
				el.find('.diff .left, .diff .right').off();
				el.find('.diff .middle').off();
				el.find('.diff .middle').on('mousewheel', function(e) {
					el.find('.diff .left').scrollTop(el.find('.diff .left').scrollTop() + e.originalEvent.deltaY);
					el.find('.diff .right').scrollTop(el.find('.diff .right').scrollTop() + e.originalEvent.deltaY);

				});
				el.find('.diff .left, .diff .right').on('scroll', function() {
					updateMarkers(data.markers);
				});
				updateMarkers(data.markers);
			};

			var makeDiff = function makeDiff(file, left, right) {
				$http.get(buildServerPath('/getDiff/'), {
					params: {
						file: file,
						left: left,
						right: right
					},
					transformResponse: function(data) {
						return $.parseJSON(data);
					}
				}).then(function handleResp(resp) {
					compare(resp.data);
				});
			};

			scope.cleanup = function cleanup(){
				el.find('.diff .left, .diff .right').off();
				el.find('.diff .middle').off();
				scope.diffed = null;
				scope.stopProcessing = true;
			};

			scope.$on('loadDiff', function loadDiff() {
				scope.stopProcessing = false;
				el.find('.modal').modal().one('hidden.bs.modal', scope.cleanup);
				$timeout(function timeout(){
					makeDiff(scope.path(), scope.revision() - 1, scope.revision());
				}, 100);	

			});

			scope.$on('$destroy', function destroy() {
				scope.cleanup();
			});
		}
	};
});
