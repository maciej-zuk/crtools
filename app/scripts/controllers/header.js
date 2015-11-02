'use strict';

angular.module('crtoolsApp')
	.controller('HeaderCtrl', ['$scope', '$rootScope', '$http', '$filter', function($scope, $rootScope, $http, $filter) {
		$scope.repos = [];
		$scope.getRepos = function(){
			$http.get(buildServerPath('/getRepos/')).then(function(resp) {
				$scope.repos = $filter('orderBy')(resp.data, 'name');
				for(var i=0; i<$scope.repos.length; i++){
					$scope.sync($scope.repos[i]);
				}
			});
		};
		$scope.sync = function(repository){
			repository.synced = false;
			var source = new EventSource(buildServerPath('/sync/?path='+repository.path));
			source.addEventListener('message', function() {
			}, false);
			source.addEventListener('end', function() {
				source.close();
				$rootScope.$apply(function(){
					$rootScope.$broadcast('repoSynced', repository.path);
					repository.synced = true;
				});
			}, false);
			source.addEventListener('error', function() {
				source.close();
			}, false);
		};
		$scope.addRepo = function(){
			$rootScope.$broadcast('addRepoOpened');
		};
		$scope.getRepos();
		$scope.$on('repoAdded', $scope.getRepos);
	}]);
