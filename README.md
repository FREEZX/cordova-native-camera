This plugin provides a way to show a preview, record, and take photos of the phone camera within your cordova application.

#How it works
To have it work cross-platform in the same manner, you need to add a video element with the "camera-video" id somewhere in your index file, and set it's z-index to be behind everything else.
The html, body, and other tags that might be in the way need to be transparent so the video can be visible in iOS.

In android, it requires crosswalk, and uses the HTML5 getUserMedia and cordova file API to show the video and save stuff.
For iOS, it's running a native video view in the background and uses native code to achieve recording and taking videos.

```
cordova.plugin.NativeCamera.showVideo = function(side)
```

Shows video on screen.


Side is exposed in the Position property:
```
cordova.plugin.NativeCamera.Position = {
    FRONT: 0,
    BACK: 1,
    UNSPECIFIED: 2
};
```


```
cordova.plugin.NativeCamera.removeVideo = function()
```
Removes the video from view.

```
cordova.plugin.NativeCamera.startRecording = function(success)
```
Starts recording into cordova.file.dataDirectory. Calls success with the filename when done

```
cordova.plugin.NativeCamera.stopRecording = function()
```
Ends recording

```
cordova.plugin.NativeCamera.takePhoto(success)
```
Take photo and put it in the cordova.file.dataDirectory. Calls success with the filename