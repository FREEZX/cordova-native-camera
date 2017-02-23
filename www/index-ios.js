var exec = require('cordova/exec');

exports.Position = {
	FRONT: 0,
	BACK: 1,
	UNSPECIFIED: 2
};

exports.showVideo = function(side) {
	exec(null, null, 'NativeCamera', 'showVideo', [side]);
};

exports.removeVideo = function() {
	exec(null, null, 'NativeCamera', 'removeVideo');
};

exports.startRecording = function(success) {
	exec(success, null, 'NativeCamera', 'startRecording');	
};

exports.stopRecording = function() {
	exec(null, null, 'NativeCamera', 'stopRecording');	
};

exports.takePhoto = function(success) {
	exec(success, null, 'NativeCamera', 'takePhoto');	
};