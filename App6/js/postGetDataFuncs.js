/* 
 * 函数：检查文件是否存在函数
 * 功能：文件存在，readText从文件中读取数据；如果文件不存在，创建一个文件并获取数据写入文件
 * */
function checkFileExistence(data, addFunc) {
    console.log("checkFileExistence", "数据对象为：" + data.dataTitle);

    var localFolder = Windows.Storage.ApplicationData.current.localFolder;
    localFolder.getFileAsync(data.dataTitle).done( //检查文件是否存在的函数，参数：文件名
        function (file) {
            // If file exists. 
            console.log("checkFileExistence", "文件：'" + data.dataTitle + "'存在");
            getParent(file);//获取文件路径
            data.dataFile = file;
            if (addFunc) {
                readText(data, addFunc);        //文件存在，就从文件中读取数据    
            }
            else {
                readText(data);        //文件存在，就从文件中读取数据    
            }
        },
        function (err) {
            // If file doesn't exist, indicate users to use scenario 1. 
            console.log("checkFileExistence", "文件： '" + data.dataTitle + "' 不存在，从服务器获取数据。");

            //先创建一个空文件
            data.dataFile = createFile(data);
        }
    );

}

/* 
 * 函数：创建文件
 * 参数：dataFile文件对象
 * 返回值：dataFile文件对象
 * 功能：创建一个文件并获取数据写入文件（getDataFromServer）
 * 说明：路径定义为localFolder，其中（Windows.Storage.KnownFolders.picturesLibrary）是图片目录的路径
 * */
function createFile(dataFile,writeData) {
    console.log("createFile", "创建文件对象:" + dataFile.dataTitle);
    var localFolder = Windows.Storage.ApplicationData.current.localFolder;

    //Windows.Storage.KnownFolders.picturesLibrary.createFileAsync("sample.dat", Windows.Storage.CreationCollisionOption.replaceExisting).done(
    localFolder.createFileAsync(dataFile.dataTitle, Windows.Storage.CreationCollisionOption.replaceExisting).done(
    function (file) {
        dataFile.dataFile = file;
        console.log("createFile", "创建文件对象:" + dataFile.dataTitle + "成功！");
        //console.log(dataFile.dataFile);
        //getDataFromServer(dataFile); //文件创建成功再执行
        if (writeData) {
            writeText(dataFile, JSON.stringify(writeData));
        }
        else {
            writeText(dataFile, JSON.stringify(dataFile.dataJson));
        }
    },
    function (error) {
        console.log("createFile", "error");
    });
}

/* 
 * 函数：从文件中读取数据
 * 功能：
 * */
function readText(readFile, addFunc) {
    console.log("readText", "从文件'" + readFile.dataTitle + "'中读取数据");

    if (readFile.dataFile != null) {
        Windows.Storage.FileIO.readTextAsync(readFile.dataFile).done(function (fileContent) {//读文件，string类型内容存到fileContent

            //console.log("setData.js","文件文本内容为：'" + readFile.dataFile.name);

            //console.log("setData.js","文件文本类型为：" + typeof (fileContent));

            if (fileContent != "") {
                console.log("readFile", "从文件'" + readFile.dataTitle + "'中读取数据成功");
                readFile.dataJson = JSON.parse(fileContent);  //转换成json对象，存到HomeData.dataJson

                //设置html页面数据
                if (addFunc) {
                    readFile.addFunc = addFunc;
                }
                if (readFile.addFunc) {
                    readFile.addFunc(readFile.dataJson);
                }

                //去掉初始屏幕，有初始屏幕就会有执行效果
                if (readFile.dataTitle == "HomePageCustomersData.json") {
                    console.log("xxxxxx:file.dataTitle == HomePageCustomersData.json:xxxxxx");

                    setTimeout(function () {
                        ExtendedSplash.remove();
                    }, 2500);
                }

            }
            else {
                console.log("readFile", "从文件'" + readFile.dataTitle + "'中读取数据失败：文件为空");
                //console.log("setData.js","从服务器获取再写文件！");
                //getDataFromServer(readFile);

                writeText(readFile, JSON.stringify(readFile.dataJson));
            }
        },
        function (error) {
            console.log("readFile", "error");
        });
    }
}

/* 
 * 函数：获取文件路径的函数
 * */
function getParent(dataFile) {
    if (dataFile != null) {
        dataFile.getParentAsync().done(function (parentFolder) {
            var outputText = "文件路径: (" + dataFile.path + ")";
            //outputText += "\n父目录路径: " + parentFolder.name + " (" + parentFolder.path + ")";
            console.log("getParent", outputText);
        },
        function (error) {
            console.log("getParent", "error");
        });
    }
}


/* 
 * 函数：向文件中写入文本函数
 * 参数：文件对象，原数据对象
 * */
function writeText(WriteFile, writeDataStr) {
    //console.log("writeText", "写文件");

    if (WriteFile.dataFile !== null) {
        //var textArea = document.getElementById("textarea");
        //var userContent = textArea.innerText;

        var localFolder = Windows.Storage.ApplicationData.current.localFolder;

        console.log("localFolder:" + localFolder);
        var userContent = writeDataStr;
        if (userContent != "") {
            Windows.Storage.FileIO.writeTextAsync(WriteFile.dataFile, userContent).done(function () {
                console.log("writeText", "获取到的数据被写进成功：" + WriteFile.dataTitle);

            },
            function (error) {
                console.log("writeText", WriteFile.dataTitle + ",error");
            });
        } else {
            console.log("writeText", WriteFile.dataTitle + ",The text box is empty, please write something and then click 'Write' again.");
        }
    }
}
/* 
 * 函数：获取数据，从json文件
 * */
function getDataFromJson(file, addFunc) {
    console.log("getDataFromServer", "从本地获取数据");

    var getUrl = file.getUrl;
    console.log("getDataFromJson", file.dataTitle + ",请求的URL为：" + getUrl);

    $.ajax({
        type: "GET",
        url: getUrl,
        dataType: 'json',
        accept: "application/json",
        contentType: "application/json",
        success: function (data) {

            console.log("getDataFromJson", "本地返回的数据为：");
            console.log(data);
            file.dataJson = data;
            file.isDataOK = 1;
            if (addFunc) {
                file.addFunc = addFunc;
            }
            //设置html页面数据
            if (file.addFunc) {
                file.addFunc(data, file.dataTitle);
            }
        },
        error: function (data) {
            console.log("error");
            console.log(data);
        }
    });
}