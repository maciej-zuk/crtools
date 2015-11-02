'use strict';
angular.module('crtoolsApp').controller('AddRepoCtrl', function($scope, $rootScope, $http) {
	$scope.hasMessage = false;
	$scope.setMessage = function(msg){
		$scope.message = msg;
		$scope.hasMessage = true;
	};
    $scope.addRepoRun = function(url, name, login, password) {
        $http.get(buildServerPath('/addRepo/'), {
            params: {
                url: url,
                repoName: name,
                login: login,
                password: password,
            }
        }).then(function(resp) {
        	$rootScope.$broadcast('repoAdded');
        	$('#addRepoModal').modal('hide');
        }, function(resp){
        	$scope.setMessage(resp.data);
        });
    };
    $scope.show = function(){
    	$scope.hasMessage = false;
		$('#addRepoModal').modal();
    };
    $scope.$on('addRepoOpened', $scope.show);
});