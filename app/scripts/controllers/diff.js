'use strict';

angular.module('crtoolsApp')

.directive('crDiff', function($http, $timeout) {
    return {
        templateUrl: 'views/diff.html',
        scope: {
            revision: '&',
            path: '&',
            repoName: '&',
        },
        link: function link(scope, el) {
            var lastMarkerIdx = 0;
            scope.fontHeight = 16;
            scope.ready = false;
            scope.source = null;
            scope.stopAdding = false;
            scope.progress = 0;
            scope.leftLinesLoaded = 0;
            scope.rightLinesLoaded = 0;
            scope.linesCount = 0;

            var drawMarkers = function drawMarkers(markers) {
                if (!markers) {
                    return;
                }
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
                if (!markers) {
                    return;
                }
                var windowOffset = $('body').scrollTop();
                var leftTop, leftBottom, rightTop, rightBottom, marker;
                var cmiddleWidth = el.find('.diff .middle').outerWidth();
                var leftOffset = el.find('.diff .left').scrollTop();
                var rightOffset = el.find('.diff .right').scrollTop();
                for (var i = 0; i < markers.length; i++) {
                    marker = markers[i];
                    try {
                        leftTop = marker.startAfter * scope.fontHeight - leftOffset + 8;
                        leftBottom = marker.endAfter * scope.fontHeight - leftOffset + 8;
                        rightTop = marker.startBefore * scope.fontHeight - rightOffset + 8;
                        rightBottom = marker.endBefore * scope.fontHeight - rightOffset + 8;
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
                if (data.fileType.type === 'image') {
                    cleft.find('.content').append($('<img>'));
                    cright.find('.content').append($('<img>'));
                } else {
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
                    cleft.on('scroll', function() {
                        updateMarkers(data.markers);
                    });
                    cright.on('scroll', function() {
                        updateMarkers(data.markers);
                    });
                    updateMarkers(data.markers);
                }
                cmiddle.on('mousewheel', function(e) {
                    cleft.scrollTop(cleft.scrollTop() + e.originalEvent.deltaY);
                    cright.scrollTop(cright.scrollTop() + e.originalEvent.deltaY);
                });
            };

            var updateProgress = function() {
                var cValue = scope.leftLinesLoaded + scope.rightLinesLoaded;
                var maxValue = scope.linesCount;
                scope.progress = Math.ceil(100 * cValue / maxValue);
                if (scope.progress > 99) {
                    $timeout(function() {
                        scope.progress = 0;
                    }, 1000);
                }
            };

            var makeDiff = function makeDiff(file, left, right) {
                scope.source = new EventSource(buildServerPath('/getDiff/?' + $.param({
                    file: file,
                    left: left,
                    right: right,
                    repoName: scope.repoName()
                })));
                var cleft = el.find('.diff .left .content');
                var cright = el.find('.diff .right .content');
                scope.source.addEventListener('diffdata', function(e) {
                    var data = JSON.parse(e.data);
                    scope.markers = data.markers;
                    scope.linesCount = data.beforeLines + data.afterLines;
                    scope.type = data.fileType.type;
                    loadDiffData(data);
                    if (scope.markers && scope.markers.length > 0) {
                        scope.$apply(function() {
                            scrollToMarker(0);
                        });
                    }
                }, false);
                scope.source.addEventListener('before', function(e) {
                    if (!scope.stopAdding) {
                        if (scope.type === 'image') {
                            cleft.find('img').prop('src', e.data);
                        } else {
                            cleft.append(e.data);
                        }
                        scope.leftLinesLoaded++;
                        if (scope.leftLinesLoaded % 100 === 0) {
                            scope.$apply(updateProgress);
                        }
                    }
                }, false);
                scope.source.addEventListener('after', function(e) {
                    if (!scope.stopAdding) {
                        if (scope.type === 'image') {
                            cright.find('img').prop('src', e.data);
                        } else {
                            cright.append(e.data);
                        }
                        scope.rightLinesLoaded++;
                        if (scope.rightLinesLoaded % 100 === 0) {
                            scope.$apply(updateProgress);
                        }
                    }
                }, false);
                scope.source.addEventListener('end', function() {
                    if (scope.source) {
                        scope.source.close();
                    }
                    scope.source = null;
                    scope.$apply(updateProgress);
                }, false);
                scope.source.addEventListener('error', function() {
                    if (scope.source) {
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
                var clearNode = function(node) {
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
                el.find('.modal').modal().one('hidden.bs.modal', function() {
                    setTimeout(scope.cleanup, 200);
                });
                scope.cleanup();
                scope.stopAdding = false;
                scope.leftLinesLoaded = 0;
                scope.rightLinesLoaded = 0;
                scope.progress = 0.01;
                scope.linesCount = 0;
                makeDiff(scope.path(), scope.revision() - 1, scope.revision());
            });

            scope.$on('$destroy', function destroy() {
                scope.cleanup();
            });

            var closestChange = function() {
                if (scope.markers.length === 0) {
                    return null;
                }
                var cleft = el.find('.diff .left');
                var middleLine = Math.ceil((cleft.scrollTop() + cleft.height() / 2) / scope.fontHeight);
                var closestMarker = Math.abs(scope.markers[0].startBefore - middleLine);
                var closestMarkerIndex = 0;
                for (var i = 0; i < scope.markers.length; i++) {
                    var distance = Math.abs(scope.markers[i].startBefore - middleLine);
                    if (distance < closestMarker) {
                        closestMarker = distance;
                        closestMarkerIndex = i;
                    }
                }
                return closestMarkerIndex;
            };

            var scrollToMarker = function(markerIndex) {
                var marker = scope.markers[markerIndex];
                var cleft = el.find('.diff .left');
                var cright = el.find('.diff .right');
                var positionRight = ((marker.startBefore + marker.endBefore) * scope.fontHeight / 2) - (cleft.height() / 2);
                var positionLeft = ((marker.startAfter + marker.endAfter) * scope.fontHeight / 2) - (cright.height() / 2);
                cleft.scrollTop(positionLeft);
                cright.scrollTop(positionRight);
                if (markerIndex === 0) {
                    scope.prevChangeDisabled = true;
                } else {
                    scope.prevChangeDisabled = false;
                }
                if (markerIndex === scope.markers.length - 1) {
                    scope.nextChangeDisabled = true;
                } else {
                    scope.nextChangeDisabled = false;
                }
            };

            scope.scrollToPreviousChange = function() {
                var closestMarkerIndex = closestChange();
                if (closestMarkerIndex === null) {
                    return;
                }
                while (closestMarkerIndex >= lastMarkerIdx) {
                    closestMarkerIndex--;
                }
                if (closestMarkerIndex < 0) {
                    closestMarkerIndex = 0;
                }
                scrollToMarker(closestMarkerIndex);
                lastMarkerIdx = closestMarkerIndex;
            };

            scope.scrollToNextChange = function() {
                var closestMarkerIndex = closestChange();
                if (closestMarkerIndex === null) {
                    return;
                }
                while (closestMarkerIndex <= lastMarkerIdx) {
                    closestMarkerIndex++;
                }
                if (closestMarkerIndex >= scope.markers.length) {
                    closestMarkerIndex = scope.markers.length - 1;
                }
                scrollToMarker(closestMarkerIndex);
                lastMarkerIdx = closestMarkerIndex;
            };

        }
    };
});
