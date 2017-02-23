var mediaDevices = {
    video: [],
    audio: []
};
var retreivedDevices = false;

exports._currentStream = null;
exports._mediaRecorder = null;
exports._fileWriter = null;
exports._fileEntry = null;
var writeBuffer = [];

var isWriting = false;

exports.Position = {
    FRONT: 0,
    BACK: 1,
    UNSPECIFIED: 2
};

exports.video = null;
exports.canvas = null;
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

exports._attemptWriting = function() {
    console.log(exports._fileWriter.readyState);
    if(writeBuffer.length>0 && exports._fileWriter.readyState!==1) {
        console.log('writing');
        exports._fileWriter.write(writeBuffer.shift());
    }
};

exports.showVideo = function(side) {
    if(!isInitialized) {
        exports.video = document.getElementById('camera-video');
        exports.canvas = document.createElement('CANVAS');

        exports.video.addEventListener('canplay', function(ev) {
            exports.size.width = exports.video.videoWidth;
            exports.size.height = exports.video.videoHeight;
            exports.canvas.setAttribute('width', exports.size.width);
            exports.canvas.setAttribute('height', exports.size.height);
        });
        // context = canvas.getContext("2d");
        isInitialized = true;
    }
    cordova.plugins.diagnostic.requestRuntimePermissions(function(status) {
        console.log(status);

        function doVideo() {
            side = side % mediaDevices.video.length;
            currentVideoStreamIdx = side;

            var constraints = {
                audio: true,
                video: {
                    deviceId: {
                        exact: mediaDevices.video[side].deviceId
                    }
                }
            };
            navigator.mediaDevices.getUserMedia(constraints)
                .then(function(stream){
                    exports._currentStream = stream;
                    if(exports._mediaRecorder) {
                        exports.initMediaRecorder();
                    }
                    
                    exports.video.src = URL.createObjectURL(stream);
                });
        }

        if(!retreivedDevices) {
            navigator.mediaDevices.enumerateDevices()
                .then(function(devices){
                    for(var i=0; i<devices.length; ++i){
                        if(devices[i].kind === 'videoinput') {
                            console.log(devices[i]);
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
    exports.video.src = '';
};

exports.initMediaRecorder = function() {
    exports._mediaRecorder = new MediaRecorder(exports._currentStream);
    exports._mediaRecorder.ondataavailable = function(e) {
        if(e.data.size){
            console.log('pushing: '+e.data.size);
            writeBuffer.push(e.data);
            exports._attemptWriting();
            // exports._fileWriter.write(e.data);
        }
    };

    exports._mediaRecorder.start(100);
};

exports.startRecording = function(success) {
    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (dirEntry) {
        var timestamp = Math.round((new Date()).getTime() / 1000);
        var _filename = 'culp_'+timestamp+'.webm';

        dirEntry.getFile(_filename, {create: true, exclusive: false}, function(fileEntry) {
            exports._fileEntry = fileEntry;
            fileEntry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = function() {
                    exports._attemptWriting();
                	if(writeBuffer.length === 0 && exports._mediaRecorder.state !== 'recording') {
                		success(_filename);
                	}
                };
                exports._fileWriter = fileWriter;
                exports.initMediaRecorder();
            });
        });
    });
};

exports.stopRecording = function() {
    exports._mediaRecorder.stop();
    exports._mediaRecorder = null;
};

exports.takePhoto = function(success) {
    var context = exports.canvas.getContext('2d');

    exports.canvas.width = exports.size.width;
    exports.canvas.height = exports.size.height;

    context.drawImage(exports.video, 0, 0, exports.size.width, exports.size.height);
    
    var photoUrl = exports.canvas.toDataURL('image/jpeg', 0.85);
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