var mediaDevices = {
    video: [],
    audio: []
};
var retreivedDevices = false;

var _currentStream = null;
var _mediaRecorder = null;
var _fileWriter = null;
var _fileEntry = null;
var _writeBuffer = [];

var isWriting = false;

exports.Position = {
    FRONT: 0,
    BACK: 1,
    UNSPECIFIED: 2
};

var _video = null;
var _canvas = null;
exports.size = {
    width: 0,
    height: 0
};

var isInitialized = false;
var context;

function b64toBlob(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
}

var _attemptWriting = function() {
    if(!_fileWriter) {
        return;
    }
    if(_writeBuffer.length>0 && _fileWriter.readyState!==1) {
        _fileWriter.write(_writeBuffer.shift());
    }
};

var _initMediaRecorder = function() {
    _mediaRecorder = new MediaRecorder(_currentStream);
    _mediaRecorder.ondataavailable = function(e) {
        if(e.data.size){
            _writeBuffer.push(e.data);
            _attemptWriting();
        }
    };

    _mediaRecorder.start(100);
};

exports.showVideo = function(side) {
    if(!isInitialized) {
        _video = document.getElementById('camera-video');
        _canvas = document.createElement('CANVAS');

        _video.addEventListener('canplay', function(ev) {
            exports.size.width = _video.videoWidth;
            exports.size.height = _video.videoHeight;
            _canvas.setAttribute('width', exports.size.width);
            _canvas.setAttribute('height', exports.size.height);
        });
        // context = canvas.getContext("2d");
        isInitialized = true;
    }
    cordova.plugins.diagnostic.requestRuntimePermissions(function(status) {
        function doVideo() {
            side = side % mediaDevices.video.length;
            currentVideoStreamIdx = side;

            var constraints = {
                audio: true,
                video: {
                    deviceId: {
                        exact: mediaDevices.video[side].deviceId
                    },
                    width: 1280,
                    height: 720,
                    frameRate: {ideal: 30, max: 60}
                }
            };
            navigator.mediaDevices.getUserMedia(constraints)
                .then(function(stream){
                    _currentStream = stream;
                    if(_mediaRecorder) {
                        _initMediaRecorder();
                    }
                    
                    _video.src = URL.createObjectURL(stream);
                });
        }

        if(!retreivedDevices) {
            navigator.mediaDevices.enumerateDevices()
                .then(function(devices){
                    for(var i=0; i<devices.length; ++i){
                        if(devices[i].kind === 'videoinput') {
                            mediaDevices.video.push(devices[i]);
                        } else if(devices[i].kind === 'audioinput') {
                            mediaDevices.audio.push(devices[i]);
                        }
                    }
                    doVideo();
                });
            retreivedDevices = true;
        } else {
            doVideo();
        }
    }, function(error){
        console.log(error);
    }, [
        cordova.plugins.diagnostic.permission.CAMERA,
        cordova.plugins.diagnostic.permission.RECORD_AUDIO,
        cordova.plugins.diagnostic.permission.READ_EXTERNAL_STORAGE
    ]);
};

exports.removeVideo = function() {
    _video.src = '';
};

exports.startRecording = function(success) {
    window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function (dirEntry) {
        var timestamp = Math.round((new Date()).getTime() / 1000);
        var _filename = 'culp_'+timestamp+'.webm';

        dirEntry.getFile(_filename, {create: true, exclusive: false}, function(fileEntry) {
            _fileEntry = fileEntry;
            fileEntry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = function() {
                    if(_writeBuffer.length > 0) {
                        _attemptWriting();
                    }
                	else if(_mediaRecorder.state !== 'recording') {
                		success(_filename);
                	}
                };
                _fileWriter = fileWriter;
                _initMediaRecorder();
            });
        });
    });
};

exports.stopRecording = function() {
    _mediaRecorder.stop();
};

exports.takePhoto = function(success) {
    var context = _canvas.getContext('2d');

    _canvas.width = exports.size.width;
    _canvas.height = exports.size.height;

    context.drawImage(_video, 0, 0, exports.size.width, exports.size.height);
    
    var photoUrl = _canvas.toDataURL('image/jpeg', 0.85);
    var block = photoUrl.split(";");

    var dataType = block[0].split(":")[1];// In this case "image/png"
    // get the real base64 content of the file
    var realData = block[1].split(",")[1];// In this case "iVBORw0KGg...."

    // document.getElementById('out-photo').src = photoUrl;

    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (dirEntry) {
        var timestamp = Math.round((new Date()).getTime() / 1000);
        var _filename = 'culp_'+timestamp+'.jpg';

        dirEntry.getFile(_filename, {create: true, exclusive: false}, function(fileEntry) {
            fileEntry.createWriter(function(fileWriter) {
            	fileWriter.onwriteend = function() {
            		success(_filename);
            	};
                fileWriter.write(b64toBlob(realData, dataType));
            });
        });
    });
};