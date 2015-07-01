'use strict';

angular.module('crtoolsApp')
	.controller('HeaderCtrl', function($scope, $rootScope) {
		$scope.sync = function(){
			var data = 'Repo synchronization....\n';
			$('#syncModal').modal({backdrop: 'static'});
			$('#syncModal .modal-body').text(data);
			$('#syncModal .modal-footer').hide();
			var source = new EventSource(buildServerPath('/sync/'));
			source.addEventListener('message', function(e) {
				data += e.data+'\n';
				$('#syncModal .modal-body').text(data);
			}, false);
			source.addEventListener('end', function() {
				source.close();
				data += 'Finished.';
				$('#syncModal .modal-body').text(data);
				$('#syncModal .modal-footer').fadeIn();
				$rootScope.$apply(function(){
					$rootScope.$broadcast('repoSynced');
				});
			}, false);
			source.addEventListener('error', function() {
				source.close();
				data += 'Error!';
				$('#syncModal .modal-body').text(data);
				$('#syncModal .modal-footer').fadeIn();
			}, false);
		};
	});
