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
			scope.source = null;
			scope.stopAdding = false;

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
						leftBottom = marker.endAfter * 16 - leftOffset + 8;
						rightTop = marker.startBefore * 16 - rightOffset + 8;
						rightBottom = marker.endBefore * 16 - rightOffset + 8;
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
							(cmiddleWidth / 4) +
							' ' +
							leftTop +

							' ' +
							(cmiddleWidth / 2) +
							' ' +
							((leftTop + rightTop) / 2) +

							' Q ' +
							(3 * cmiddleWidth / 4) +
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
							(3 * cmiddleWidth / 4) +
							' ' +
							rightBottom +

							' ' +
							(cmiddleWidth / 2) +
							' ' +
							((leftBottom + rightBottom) / 2) +

							' Q ' +
							(cmiddleWidth / 4) +
							' ' +
							leftBottom +


							' 0 ' +
							leftBottom +

							' L -9999 ' +
							leftBottom);
					} catch (e) {}
				}
			};

			var loadDiffData = function loadDiffData(data) {
				var cleft = el.find('.diff .left');
				var cright = el.find('.diff .right');
				var cmiddle = el.find('.diff .middle');
				var putLines = function process(linenos, linesCount) {
					var lines = [];
					for (var i = 0; i < linesCount; i++) {
						lines.push(i + 1);
					}
					linenos.html(lines.join('<br>'));
				};
				drawMarkers(data.markers);
				putLines(cleft.find('.linenos'), data.beforeLines);
				putLines(cright.find('.linenos'), data.afterLines);
				cmiddle.on('mousewheel', function(e) {
					cleft.scrollTop(cleft.scrollTop() + e.originalEvent.deltaY);
					cright.scrollTop(cright.scrollTop() + e.originalEvent.deltaY);
				});
				cleft.on('scroll', function() {
					updateMarkers(data.markers);
				});
				cright.on('scroll', function() {
					updateMarkers(data.markers);
				});
				updateMarkers(data.markers);
			};

			var makeDiff = function makeDiff(file, left, right) {
				scope.source = new EventSource(buildServerPath('/getDiff/?' + $.param({
					file: file,
					left: left,
					right: right
				})));
				var cleft = el.find('.diff .left .content');
				var cright = el.find('.diff .right .content');				
				scope.source.addEventListener('diffdata', function(e) {
					loadDiffData(JSON.parse(e.data));
				}, false);
				scope.source.addEventListener('before', function(e) {
					if(!scope.stopAdding){
						cleft.append(e.data);
					}
				}, false);
				scope.source.addEventListener('after', function(e) {
					if(!scope.stopAdding){
						cright.append(e.data);
					}
				}, false);
				scope.source.addEventListener('end', function() {
					if(scope.source){
						scope.source.close();
					}
					scope.source = null;
				}, false);
				scope.source.addEventListener('error', function() {
					if(scope.source){
						scope.source.close();
						scope.cleanup();
					}
					scope.source = null;
				}, false);
			};

			scope.cleanup = function cleanup() {
				scope.stopAdding = true;
				if (scope.source) {
					scope.source.close();
					scope.source = null;
				}
				var clearNode = function(node){
					while (node.firstChild) {
					    node.removeChild(node.firstChild);
					}					
				};
				el.find('.diff .left, .diff .right, .diff .middle').off();
				clearNode(el.find('.diff .left .content')[0]);
				clearNode(el.find('.diff .right .content')[0]);
				clearNode(el.find('.diff .left .linenos')[0]);
				clearNode(el.find('.diff .right .linenos')[0]);
				clearNode(el.find('.diff .middle')[0]);
			};

			scope.$on('loadDiff', function loadDiff() {
				el.find('.modal').modal().one('hidden.bs.modal', function(){
					setTimeout(scope.cleanup, 200);
				});
				scope.cleanup();
				scope.stopAdding = false;
				makeDiff(scope.path(), scope.revision() - 1, scope.revision());

			});

			scope.$on('$destroy', function destroy() {
				scope.cleanup();
			});
		}
	};
});
