// 有关“空白”模板的简介，请参阅以下文档: 
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var nav = WinJS.Navigation;
    var activationKinds = Windows.ApplicationModel.Activation.ActivationKind;

    //定义数据,用于存储获取到的json和生成的img url
    WinJS.Namespace.define("imgStorageFile",
    {
        dataTitle: "imgStorageData.txt",
        getUrl: "/json/1.json",
        dataFile: null,
        dataJson: null,
        isDataOK: 0,//是否获取数据成功
        addFunc: null,
        dataTemp: new WinJS.Binding.List(null)
    });

    app.oncheckpoint = function (args) {
        // TODO:  即将挂起此应用程序。在此处保存
        //需要在挂起中保留的任何状态。您可以使用
        // WinJS.Application.sessionState 对象，该对象将在
        //挂起中自动保存和恢复。如果您需要在
        //挂起应用程序之前完成异步操作，请调用
        // args.setPromise()。
    };
    function activated(args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            console.log("app.sessionState:");
            console.log(app.sessionState);

            if (app.sessionState) {
                console.log("Populate the UI with the previously saved application data");
            }
            else {
                console.log("Populate the UI with defaults");
            }

            args.setPromise(WinJS.UI.processAll().then(function () {
                var url = "/pages/pages.html";
                return WinJS.Navigation.navigate(url);
            }));
        }
    }
    WinJS.Navigation.addEventListener("navigated", function (eventObject) {
        console.log("**************************************************************************");

        var url = eventObject.detail.location;
        var host = document.getElementById("contentHost");

        console.log("navigated:" + url);

        if (host.winControl) {
            host.winControl.unload && host.winControl.unload();
            host.winControl.dispose && host.winControl.dispose();
        }
        WinJS.Utilities.disposeSubTree(host);
        WinJS.Utilities.empty(host);

        var p = WinJS.UI.Pages.render(url, host, eventObject.detail.state).then(function () {
            WinJS.Application.sessionState.lastUrl = url;
        });
        eventObject.detail.setPromise(p);
    });

    app.addEventListener("activated", activated, false);

    app.start();
})();
