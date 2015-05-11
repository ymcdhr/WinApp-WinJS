(function () {
    "use strict";

    // 定义一个下载队列
    // Global array used to persist(存储) operations.
    var downloadOperations = [];

    WinJS.UI.Pages.define("/pages/pages.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        init: function (element, options) {
            console.log("pages:init，页面初始化时");
        },
        ready: function (element, options) {
            console.log("pages:ready，页面初加载完成后");

            // Enumerate outstanding downloads.
            // BackgroundDownloader 类：https://msdn.microsoft.com/zh-cn/library/windows/apps/windows.networking.backgroundtransfer.backgrounddownloader.aspx
            // getCurrentDownloadsAsync(),返回当前应用程序实例的挂起下载集合。
            // 返回值：IAsyncOperation < IVectorView >
            var localFolder = Windows.Storage.ApplicationData.current.localFolder;
            
            // Enumerate（枚举） outstanding downloads.
            // getCurrentDownloadsAsync() -返回未与组关联的挂起下载的集合。
            // Returns a collection of pending downloads that are not associated with a group.
            Windows.Networking.BackgroundTransfer.BackgroundDownloader.getCurrentDownloadsAsync().done(function (downloads) {
                // If downloads from previous application state exist, reassign callbacks and persist to global array.
                for (var i = 0; i < downloads.size; i++) {
                    var download = new DownloadOperation();
                    download.load(downloads[i]);
                    downloadOperations.push(download);
                }
            });

            startDownload();
            //var newDownload = new DownloadOperation();

            //var uriString = "http://d.hiphotos.baidu.com/image/pic/item/730e0cf3d7ca7bcbc1d4872ebc096b63f624a800.jpg";

            //var fileName = "xxx.jpg";

            //newDownload.start(uriString, fileName);

            //// Persist the download operation in the global array.
            //downloadOperations.push(newDownload);

        },
        unload: function () {

        }
    });




    //TODO: 下载操作类，DownloadOperation，Class associated with each download.
    function DownloadOperation() {
        var download = null;
        var promise = null;
        var imageStream = null;

        //开始下载成员函数
        //参数：
        //uri：下载地址
        //fileName：保存文件名
        //priority：下载优先级
        //requestUnconstrainedDownload：
        this.start = function (uri, fileName, priority, requestUnconstrainedDownload) {
            // Asynchronously create the file in the pictures folder.
            // 获取temp目录地址的对象，为storageFolder类
            var localFolder = Windows.Storage.ApplicationData.current.localFolder;
            console.log("下载保存路径："+localFolder.path);

            localFolder.createFolderAsync("adfolder", Windows.Storage.CreationCollisionOption.replaceExisting).done(function (newFolder) {

                // storageFolder.createFileAsync(desiredName, options)//options为枚举值
                // generateUniqueName：0，以名称创建新文件或文件夹，或自动追加一个数字（如果已存在具有该名称的文件或文件夹）。Windows.Storage.KnownFolders.picturesLibrary
                // replaceExisting：1，以名称创建新文件或文件夹，并替换任何文件或文件夹（如果已存在具有该名称的文件或文件夹）。
                // 创建文件对象
                newFolder.createFileAsync(fileName, Windows.Storage.CreationCollisionOption.replaceExisting).done(function (newFile) {
                    //新建后台传输类
                    var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();
                    console.log("下载url: " + uri.absoluteUri);

                    // Create a new download operation.
                    // newFile，类型: IStorageFile，响应将写入的文件。
                    // 返回值：DownloadOperation类，下载操作
                    download = downloader.createDownload(uri, newFile);

                    //printLog("Created download " + download.guid + " with priority " +
                    //    (priority === Windows.Networking.BackgroundTransfer.BackgroundTransferPriority.high ? "high" : "default") +
                    //    "<br/>");
                    console.log("Created download " + download.guid + " with priority " +
                        (priority === Windows.Networking.BackgroundTransfer.BackgroundTransferPriority.high ? "high" : "default") +
                        "<br/>");
                    //设置下载优先级
                    download.priority = priority;

                    //Unconstrained
                    if (!requestUnconstrainedDownload) {
                        // Start the download and persist（存储） the promise to be able to cancel the download.
                        // 启动下载，并将下载操作存储在promise中，可以取消
                        //.then(1,2,3)的3个参数：
                        //一个是在承诺成功完成后调用的函数
                        //一个是在承诺完成但出错后调用的函数
                        //一个是提供进度信息的函数
                        promise = download.startAsync().then(complete, error, progress);
                        return;
                    }

                    // Create a list of download operations: We'll request that operations in this list will run
                    // unconstrained.
                    var requestOperations = [];
                    requestOperations.push(download);

                    // If the app isn't actively being used, at some point the system may slow down or pause long running
                    // downloads. The purpose of this behavior is to increase the device's battery life.
                    // By requesting unconstrained downloads, the app can request the system to not suspend any of the
                    // downloads in the list for power saving reasons.
                    // Use this API with caution since it not only may reduce battery life, but it may show a prompt to
                    // the user.
                    var requestPromise;
                    try {
                        requestPromise = Windows.Networking.BackgroundTransfer.BackgroundDownloader.requestUnconstrainedDownloadsAsync(requestOperations);
                    } catch (error) {
                        var notImplementedException = -2147467263;
                        if (error.number === notImplementedException) {
                            displayError("BackgroundDownloader.requestUnconstrainedDownloadsAsync is not supported in Windows Phone.");
                            return;
                        }
                        throw error;
                    }

                    requestPromise.done(function (result) {
                        printLog("Request for unconstrained downloads has been " +
                            (result.isUnconstrained ? "granted" : "denied") + "<br/>");

                        promise = download.startAsync().then(complete, error, progress);
                    }, error);

                }, error);
            });
        };

        // On application activation, reassign callbacks for a download
        // operation persisted from previous application state.
        this.load = function (loadedDownload) {
            download = loadedDownload;
            printLog("Found download: " + download.guid + " from previous application run.<br\>");
            promise = download.attachAsync().then(complete, error, progress);
        };

        // Cancel download.
        this.cancel = function () {
            if (promise) {
                promise.cancel();
                promise = null;
                printLog("Canceling download: " + download.guid + "<br\>");
                if (imageStream) {
                    imageStream.close();
                    imageStream = null;
                }
            } else {
                printLog("Download " + download.guid + " already canceled.<br\>");
            }
        };

        // Resume download - download will restart if server does not allow range-requests.
        this.resume = function () {
            if (download) {
                if (download.progress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.pausedByApplication) {
                    download.resume();
                    printLog("Resuming download: " + download.guid + "<br\>");
                } else {
                    printLog("Download " + download.guid +
                        " is not paused, it may be running, completed, canceled or in error.<br\>");
                }
            }
        };

        // Pause download.
        this.pause = function () {
            if (download) {
                if (download.progress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.running) {
                    download.pause();
                    printLog("Pausing download: " + download.guid + "<br\>");
                } else {
                    printLog("Download " + download.guid +
                        " is not running, it may be paused, completed, canceled or in error.<br\>");
                }
            }
        };

        // Returns true if this is the download identified by the guid.
        this.hasGuid = function (guid) {
            return download.guid === guid;
        };

        // Removes download operation from global array.
        function removeDownload(guid) {
            downloadOperations.forEach(function (operation, index) {
                if (operation.hasGuid(guid)) {
                    downloadOperations.splice(index, 1);
                }
            });
        }

        // Progress callback.
        function progress() {
            // Output all attributes of the progress parameter.
            printLog(download.guid + " - progress: ");
            var currentProgress = download.progress;
            for (var att in currentProgress) {
                printLog(att + ": " + currentProgress[att] + ", ");
            }
            printLog("<br/>");

            // Handle various pause status conditions.
            if (currentProgress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.pausedByApplication) {
                printLog("Download " + download.guid + " paused by application <br\>");
            } else if (currentProgress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.pausedCostedNetwork) {
                printLog("Download " + download.guid + " paused because of costed network <br\>");
            } else if (currentProgress.status === Windows.Networking.BackgroundTransfer.BackgroundTransferStatus.pausedNoNetwork) {
                printLog("Download " + download.guid + " paused because network is unavailable.<br\>");
            } else {
                // We need a response before assigning the result stream to the image: If we get a response from
                // the server (hasResponseChanged == true) and if we haven't assigned the stream yet
                // (imageStream == null), then assign the stream to the image.
                // There is a second scenario where we need to assign the stream to the image: If a download gets
                // interrupted and cannot be resumed, the request is restarted. In that case we need to re-assign
                // the stream to the image since the requested image may have changed.
                if ((currentProgress.hasResponseChanged && !imageStream) || (currentProgress.hasRestarted)) {
                    try {
                        // Get Content-Type response header.
                        var contentType = download.getResponseInformation().headers.lookup("Content-Type");

                        // Check the stream is an image. For an example, change the URI string of the 'serverAddressField'
                        // to 'http://localhost/BackgroundTransferSample/data/windows-sdk.png' and start a download.
                        if (contentType.indexOf("image/") === 0) {
                            // Get the stream starting from byte 0.
                            imageStream = download.getResultStreamAt(0);

                            // Convert the stream to MS-Stream.
                            var msStream = MSApp.createStreamFromInputStream(contentType, imageStream);
                            var imageUrl = URL.createObjectURL(msStream);

                            // Pass the stream URL to the HTML image tag.
                            id("imageHolder").src = imageUrl;

                            // Close the stream once the image is displayed.
                            id("imageHolder").onload = function () {
                                if (imageStream) {
                                    imageStream.close();
                                    imageStream = null;
                                }
                            };
                        }
                    } catch (err) {
                        printLog("<b>Error in outputting file:</b> " + err + "<br\>");
                    }
                }
            }
        }

        // Completion callback.
        function complete() {
            removeDownload(download.guid);

            try {
                var responseInfo = download.getResponseInformation();
                printLog(download.guid + " - download complete. Status code: " + responseInfo.statusCode + "<br/>");
                displayStatus("Completed: " + download.guid + ", Status Code: " + responseInfo.statusCode);
            } catch (err) {
                displayException(err);
            }
        }

        // Error callback.
        function error(err) {
            if (download) {
                removeDownload(download.guid);
                printLog(download.guid + " - download completed with error.<br/>");
            }
            displayException(err);
        }
    }

    function displayException(err) {
        var message;
        if (err.stack) {
            message = err.stack;
        } else {
            message = err.message;
        }

        var errorStatus = Windows.Networking.BackgroundTransfer.BackgroundTransferError.getStatus(err.number);
        if (errorStatus === Windows.Web.WebErrorStatus.cannotConnect) {
            message = "App cannot connect. Network may be down, connection was refused or the host is unreachable.";
        }

        displayError(message);
    }

    function displayError(/*@type(String)*/message) {
        WinJS.log && WinJS.log(message, "sample", "error");
        console.log(message+"sample"+"error");
    }

    function displayStatus(/*@type(String)*/message) {
        WinJS.log && WinJS.log(message, "sample", "status");
        console.log(message + "sample" + "status");
    }

    // Print helper function.
    function printLog(/*@type(String)*/txt) {
        //var console = document.getElementById("outputConsole");
        //console.innerHTML += txt;
    }

    function id(elementId) {
        return document.getElementById(elementId);
    }

    function startDownload() {
        //BackgroundTransferPriority.default：0，枚举值，操作的默认优先级别设置。默认情况下，在创建新操作后，该操作将放置于当前传输队列的末尾。
        downloadFile(Windows.Networking.BackgroundTransfer.BackgroundTransferPriority.default, false);
    }

    function startUnconstrainedDownload() {
        downloadFile(Windows.Networking.BackgroundTransfer.BackgroundTransferPriority.default, true);
    }

    function startHighPriorityDownload() {
        downloadFile(Windows.Networking.BackgroundTransfer.BackgroundTransferPriority.high, false);
    }
    //启动下载函数
    //参数：priority优先级，requestUnconstrainedTransfer：
    function downloadFile(priority, requestUnconstrainedTransfer) {
        // Instantiate downloads.
        var newDownload = new DownloadOperation();

        // Pass the uri and the file name to be stored on disk to start the download.
        //var fileName = document.getElementById("fileNameField").value;
        var fileName;
        if (fileName === "") {
            displayError("A local file name is required.");
            return;
        }

        // Validating the URI is required since it was received from an untrusted source (user input).
        // The URI is validated by catching exceptions thrown by the Uri constructor.
        // Note that when enabling the text box users may provide URIs to machines on the intrAnet that require the
        // "Home or Work Networking" capability.
        var uri = null;
        var uriString = "http://d.hiphotos.baidu.com/image/pic/item/730e0cf3d7ca7bcbc1d4872ebc096b63f624a800.jpg";

        try {
            //new Windows.Foundation.Uri()启动 URI 的默认应用
            //https://msdn.microsoft.com/zh-cn/library/windows/apps/hh452690.aspx?f=255&MSPPError=-2147217396

            uri = new Windows.Foundation.Uri(uriString);
        } catch (error) {
            console.log("Error: Invalid URI. " + error.message);
            return;
        }

        fileName = "xxx.jpg";

        newDownload.start(uri, fileName, priority, requestUnconstrainedTransfer);

        // Persist（存储） the download operation in the global array.
        downloadOperations.push(newDownload);
    }

    // Cancel all downloads.
    function cancelAll() {
        for (var i = 0; i < downloadOperations.length; i++) {
            downloadOperations[i].cancel();
        }
    }

    // Pause all downloads.
    function pauseAll() {
        for (var i = 0; i < downloadOperations.length; i++) {
            downloadOperations[i].pause();
        }
    }

    // Resume all downloads.
    function resumeAll() {
        for (var i = 0; i < downloadOperations.length; i++) {
            downloadOperations[i].resume();
        }
    }

})();
