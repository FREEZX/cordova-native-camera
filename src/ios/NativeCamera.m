#import <Cordova/CDV.h>
#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>

@interface VideoRecordingDelegate : NSObject <AVCaptureFileOutputRecordingDelegate> {
    void (^exportCallback)();
}
    - (instancetype)initWithCallback: (void (^)(NSString*)) callback;
@end

@implementation VideoRecordingDelegate

-(instancetype)initWithCallback: (void (^)(NSString*)) callback{
    if(self = [super init]) {
        self->exportCallback = callback;
    }
    return self;
}

-(void)captureOutput:(AVCaptureFileOutput *)captureOutput didFinishRecordingToOutputFileAtURL:(NSURL *)outputFileURL fromConnections:(NSArray *)connections error:(NSError *)error{
    AVURLAsset * avAsset = [AVURLAsset assetWithURL:outputFileURL];
    AVAssetExportSession *exportSession = [AVAssetExportSession exportSessionWithAsset:avAsset presetName:AVAssetExportPresetPassthrough];

    NSString *exportFilename = [NSString stringWithFormat:@"%d.mp4", arc4random_uniform(1000000)];
    
    NSString *exportPath = [NSString stringWithFormat:@"%@/Library/NoCloud/%@", NSHomeDirectory(), exportFilename];
    NSURL *exportPathUrl = [NSURL fileURLWithPath:exportPath];
    
    exportSession.outputURL = exportPathUrl;
    exportSession.outputFileType = AVFileTypeMPEG4;
    exportSession.shouldOptimizeForNetworkUse = true;
//    [exportSession export]
    [exportSession exportAsynchronouslyWithCompletionHandler:^{
        NSLog(@"Export complete");
        exportCallback(exportPath);
    }];
}

@end

@interface NativeCamera : CDVPlugin {
    AVCaptureVideoPreviewLayer *previewLayer;
    AVCaptureSession *session;
    AVCaptureInput *videoDeviceInput;
    
    AVCaptureMovieFileOutput *videoOut;
    AVCaptureStillImageOutput *photoOut;
    VideoRecordingDelegate *videoRecordingDelegate;
}
@end

@implementation NativeCamera
-(void) pluginInitialize{
    self.webView.backgroundColor = [UIColor clearColor];
    self.webView.opaque = false;
    
    previewLayer = [AVCaptureVideoPreviewLayer new];
    previewLayer.zPosition = -10;
    previewLayer.frame = [[UIScreen mainScreen] bounds];
    previewLayer.videoGravity = AVLayerVideoGravityResizeAspectFill;
}

- (void)onReset
{
    if(session != nil){
        [session stopRunning];
        [previewLayer removeFromSuperlayer];
    }
}

- (void)showVideo:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        int side = [[command argumentAtIndex:0] integerValue];
        
        if(previewLayer.superlayer == nil) {
            [self.webView.layer insertSublayer:previewLayer atIndex:0];
        }
        if(session == nil){
            [self getVideoPreviewSession:side];
        }
        
        //Update the side
        [self getVideoSide:side];
        
        if(!session.running) {
            [session startRunning];
        }
    }];
}

- (void)removeVideo:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        if(session != nil){
            [session stopRunning];
            [previewLayer removeFromSuperlayer];
        }
    }];
}


- (void)startRecording:(CDVInvokedUrlCommand*)command{
    NSString *destination = [NSString stringWithFormat:@"%@%d", NSTemporaryDirectory(), arc4random_uniform(1000000)];
    NSURL *url = [NSURL fileURLWithPath:destination];
    
    videoRecordingDelegate = [[VideoRecordingDelegate alloc] initWithCallback:^(NSString* output){
        CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:output];
        [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
    }];
    [videoOut startRecordingToOutputFileURL:url recordingDelegate:videoRecordingDelegate];
}

- (void)stopRecording:(CDVInvokedUrlCommand*)command{
    [videoOut stopRecording];
}

- (void)takePhoto:(CDVInvokedUrlCommand*)command{
    [self.commandDelegate runInBackground:^{
        AVCaptureConnection *connection = [photoOut connectionWithMediaType:AVMediaTypeVideo];
        [photoOut captureStillImageAsynchronouslyFromConnection:connection completionHandler:^(CMSampleBufferRef imageDataSampleBuffer, NSError *error) {
            NSData *imageData = [AVCaptureStillImageOutput jpegStillImageNSDataRepresentation:imageDataSampleBuffer];
            NSString *exportFilename = [NSString stringWithFormat:@"%d.jpg", arc4random_uniform(1000000)];
            NSString *exportPath = [NSString stringWithFormat:@"%@/Library/NoCloud/%@", NSHomeDirectory(), exportFilename];
            [imageData writeToFile:exportPath options:NSDataWritingAtomic error:nil];
            
            CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:exportFilename];
            [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
        }];
    }];
}



//Internal stuff

- (void)getVideoPreviewSession:(int) side
{
    session = [AVCaptureSession new];
    session.sessionPreset = AVCaptureSessionPresetMedium;
    
    //Outputs
    videoOut = [AVCaptureMovieFileOutput new];
    [session addOutput:videoOut];
    photoOut = [AVCaptureStillImageOutput new];
    [session addOutput:photoOut];
    
    //Audio
    AVCaptureDevice *audioDevice = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeAudio];
    
    NSError *audioDeviceErr;
    AVCaptureDeviceInput *audioDeviceInput = [[AVCaptureDeviceInput alloc] initWithDevice:audioDevice error:&audioDeviceErr];
    [session addInput:audioDeviceInput];
    
    previewLayer.session = session;
}

- (void)getVideoSide:(int) side{
    //Video
    NSMutableArray<AVCaptureDevice*> *devices = [[NSMutableArray alloc] initWithArray:[AVCaptureDevice devicesWithMediaType:AVMediaTypeVideo]];
    
    AVCaptureDevice *videoDevice;
    for (AVCaptureDevice* device in devices) {
        if(side == 0 && device.position == AVCaptureDevicePositionFront) {
            videoDevice = device;
        } else if(side == 1 && device.position == AVCaptureDevicePositionBack) {
            videoDevice = device;
        } else if(side == 2 && device.position == AVCaptureDevicePositionUnspecified) {
            videoDevice = device;
        }
    }
    
    [session beginConfiguration];
    if(videoDeviceInput != nil){
        [session removeInput:videoDeviceInput];
    }
    
    NSError *videoDeviceErr;
    videoDeviceInput = [[AVCaptureDeviceInput alloc] initWithDevice:videoDevice error:&videoDeviceErr];
    
    [session addInput:videoDeviceInput];
    [session commitConfiguration];
}
@end
