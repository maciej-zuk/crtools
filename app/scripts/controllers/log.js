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

;

