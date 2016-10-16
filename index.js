#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const spawn = require('child_process').execFile;
const exec = require('child_process').exec;
const iconv = require('iconv-lite');

const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');

const argv = require('yargs')
  .option('n', {
    alias: 'note',
    describe: '要发布到博客上的笔记路径',
    demand: true
  })
  .option('b', {
    alias: 'blog',
    describe: '博客在本地的存储路径'
  })
  .usage('Usage: auto-blog [--note <path>]')
  .help('h', '显示帮助信息')
  .alias('h', 'help')
  .argv;


// 默认路径
const blog = 'E:\\Git\\my-blog\\';
const note = '';

fs.readFile(path.join(note, argv.n), 'utf-8', (err, data) => {
  if (err) throw err;
  newPost(data);
});

// 检查文件内容
const newPost = (data) => {
  let mainContent = data.split('---');
  let yaml = mainContent.splice(0,2)[1].trim(); // 切割字符串

  const info = handleYaml(yaml);
  const { basePath,fileName } = handleName(argv.n);
  const newYaml = '---\r\ntitle: '+ fileName +'\r\ntags: '+ info.tags +'\r\ncategories: '+ info.categories +'\r\ndata: '+ new Date() +'\r\n---';

  // 新建一个博文，第一次发布文章才使用
  runCommand('hexo new post '+info.title,(txt)=>{
    console.log(txt);

    const {newContent,aImgSrc} = handleContent(mainContent.join(''));
    const newData = newYaml + newContent;
    
    // 写文件，不存在则会被创建，存在则会被覆盖
    fs.open(path.join(path.join(blog, 'source\\_posts\\', info.title + '.md')), 'w', (err, fd) => {
      if (err) throw err;
      fs.write(fd, newData, (err, wirte, string) => {
        if (err) throw err;
        console.log(info.title+'.md写入完成');
      });
    });

    // 压缩图片
    imageCompress(basePath, aImgSrc, path.join(blog, 'source\\_posts\\', info.title), () => {
      console.log('图片压缩完成');
      // 执行hexo clean命令
      runCommand('hexo clean',(txt)=>{
        console.log(txt);
        console.log('正在部署中...请等待...');
        runCommand('hexo d -g',(txt)=>{
          console.log(txt);
        });
      });
    });

  });
  
}

// 运行命令，解决window下控制台乱码问题
const runCommand = (command,callback) => {
  exec(command,{encoding:'hex',cwd:path.join(blog)},(err,stdout,stderr)=>{
    let stdoutArr = [];
    stdout.each(2,function(data){
      stdoutArr.push(parseInt(data,16));
    });

    /*
    let stderrArr = [];
    stderr.each(2,function(data){
      stderrArr.push(parseInt(data,16));
    });
    */
    // console.log(iconv.decode(new Buffer(stdoutArr),'gbk'));
    // console.log('err: ',iconv.decode(new Buffer(stderrArr),'gbk'));

    if (err) throw err;
    callback(iconv.decode(new Buffer(stdoutArr),'gbk'));
  });
}

// 接受yaml字符串返回对应的json对象
const handleYaml = (str) => {
  str = str.split('\r\n');  // 根据换行符来切割字符串
  let yamlJson = {};
  for(let i=0;i<str.length;i++){
    let arr = str[i].split(':');
    yamlJson[arr[0].trim()] = arr[1].trim();
  }
  return yamlJson;
}

// 检索content里的图片信息并替换格式
const handleContent = (content) => {
  // ![]() 匹配markdown图片的正则表达式
  let reg = /\!\[.*?\]\(.+?\.(jpg|png)\)/ig;
  let aImgContent = content.match(reg);
  let aImgSrc = [];
  for(let i=0;i<aImgContent.length;i++){
    let imgSrc = aImgContent[i].substring(aImgContent[i].lastIndexOf('(')+1,aImgContent[i].length-1);
    aImgSrc.push(imgSrc);
    let imgTitle = aImgContent[i].substring(2,aImgContent[i].lastIndexOf(']'));
    aImgContent[i] = '{% asset_img '+ imgSrc.substring(imgSrc.lastIndexOf('/')+1) +' '+ imgTitle +' %}';
  }
  // 不知道为什么用match匹配时正好，用split匹配切割时却切出来含有图片后缀的数组项
  let aText = content.split(reg);
  // 用for循环遍历，解决上面出现的问题，将错误的数组项置为空
  for(let i=0;i<=aText.length;i++){
    if(aText[i] === 'png' || aText[i] === 'jpg' || aText[i] === '') {
      aText.splice(i,1);
      i--;  // 减一，很重要 
    }
  }
  let newContent = [];
  for(let i=0;i<aText.length;i++){
    newContent.push(aText[i]);
    if(i === aText.length - 1 ) break;
    newContent.push(aImgContent[i]);
  }
  newContent = newContent.join('');
  return { newContent,aImgSrc };
}

// 处理文章名字，输入文件路径，返回路径和文件名
const handleName = (name) => {
  let basePath = name.substring(0,name.lastIndexOf('\\'));
  let fileName = name.substring(name.lastIndexOf('\\')+1, name.lastIndexOf('.'))
  return {basePath,fileName};
}

// 压缩图片
const imageCompress = (basePath, aImgSrc, output, callback) => {
  for(let i=0;i<aImgSrc.length;i++){
    aImgSrc[i] = path.join(basePath,aImgSrc[i]);
  }
  imagemin(aImgSrc, output, {
    plugins: [
      imageminMozjpeg(),
      imageminPngquant({quality: '65-80'})
    ]
  }).then(files => {
    callback();
  });
}

String.prototype.each=function(i,fun){
  var index=0;
  var that=this;
  while(index<=that.length){
    (fun||function(){})(that.substr(index,i))
      index+=i;
  }
}