# lottie-extract-assets
根据lottie配置文件，提取lottie的json文件中图片，输出配置

在项目根目录下创建 lottie-extract-assets.json 编写配置
```json
    [
        //支持配置多个项目
       {
            "configPath":"src/act1/lottieConfig.json", //需要提取的lottie 配置
            "outFileName":"lottie-assets.js", //生成的文件名（.js或者.ts）
            "to":"dist", //输出资源文件保存目录
            "globalName":"widow._LottieConfig",
            "absPath":1,//lottie图片资源是否生成绝对路径  1（是） 2（否）
       }
    ]
```
lottieConfig.json编写格式如下：
```json
[
    "https://xxx.com/ceremonyBlessingBagFirst/data.json"
]
```

运行命令：
```js
lottieExtract 
```

检查如果没有查找到lottie-extract-assets.json,则需要根据提示输入:
> * 请输入LottieConfig文件目录：(src/lottieConfig.json) ./lottieConfig.json
> * 请输入输出资源文件名称：(lottie-assets.js) lottie-assets.js
> * 请输入输出资源文件保存目录：(dist) dist/lottie
> * 请输入全局访问提取资源对象：(window._config) widow._LottieConfig







