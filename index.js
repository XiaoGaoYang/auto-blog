#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const os = require('os');
const spawn = require('child_process').execFile;
const exec = require('child_process').exec;
const iconv = require('iconv-lite');

const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');

const platform = os.platform();

const config = require('./config');

const argv = require('yargs')
  .option('note', {
    alias: 'n',
    describe: '要发布到博客上的笔记路径',
    demand: true
  })
  .option('blog', {
    alias: 'b',
    describe: '博客在本地的存储路径'
  })
  .option('deploy', {
    alias: 'd',
    describe: '部署hexo博客',
    type: 'boolean'
  })
  .usage('Usage: auto-blog [--note <path>]')
  .help('h', '显示帮助信息')
  .alias('help', 'h')
  .argv;


// 默认路径
const blog = config.blogPath;

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
  const newYaml = '---\ntitle: '+ fileName +'\ntags: '+ info.tags +'\ncategories: '+ info.categories +'\ndata: '+ new Date() +'\n---';

  // 新建一个博文，第一次发布文章才使用
  runCommand('hexo new post '+info.title,(txt)=>{
    console.log(txt);

    const {newContent,aImgSrc} = handleContent(mainContent.join(''));
    const newData = newYaml + newContent;
    
    // 写文件，不存在则会被创建，存在则会被覆盖
    fs.open(path.join(path.join(blog, 'source/_posts/', info.title + '.md')), 'w', (err, fd) => {
      if (err) throw err;
      fs.write(fd, newData, (err, wirte, string) => {
        if (err) throw err;
        console.log(info.title+'.md写入完成\n');
      });
    });

    // 压缩图片
    if(aImgSrc.length){
      imageCompress(basePath, aImgSrc, path.join(blog, 'source/_posts/', info.title), () => {
        console.log('图片压缩完成');
        preview();
      });
    }else{
      preview();
    }

  });

}

// 预览
const preview = () => {
  // 执行hexo clean命令
  runCommand('hexo clean', (txt) => {
    console.log(txt);
    if(argv.d){
      console.log('正在部署中...请等待...');
      runCommand('hexo d -g', (txt) => {
        console.log(txt);
      });
    }else{
      runCommand('hexo s -g', (txt) => {
        console.log(txt);
      });
    }
  });
}

// 运行命令，解决window下控制台乱码问题
const runCommand = (command,callback) => {
  let options = {
    cwd:path.join(blog),
    encoding: platform === 'linux' ? 'utf-8' : 'hex',
  };
  /*
  exec(command,options,(err,stdout,stderr)=>{
    if (err) throw err;
    if(platform === 'linux'){
      callback(stdout);
    }else{
      let stdoutArr = [];
      stdout.each(2,function(data){
        stdoutArr.push(parseInt(data,16));
      });
      callback(iconv.decode(new Buffer(stdoutArr),'gbk'));
    }
  });
  */
  const child = exec(command,options);
  child.stdout.on('data',(data)=>{
    callback(data);
  });
  child.stderr.on('data',(data)=>{
    callback(data);
  });
}

// 接受yaml字符串返回对应的json对象
const handleYaml = (str) => {
  str = str.split('\n');  // 根据换行符来切割字符串
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
  // 替换图片格式
  if(aImgContent && aImgContent.length){
    for(let i=0;i<aImgContent.length;i++){
      let imgSrc = aImgContent[i].substring(aImgContent[i].lastIndexOf('(')+1,aImgContent[i].length-1);
      aImgSrc.push(imgSrc);
      let imgTitle = aImgContent[i].substring(2,aImgContent[i].lastIndexOf(']'));
      aImgContent[i] = '{% asset_img '+ imgSrc.substring(imgSrc.lastIndexOf('/')+1) +' '+ imgTitle +' %}';
    }
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
  const char = platform === 'linux' ? '/' : '\\';
  const basePath = name.substring(0,name.lastIndexOf(char));
  const fileName = name.substring(name.lastIndexOf(char)+1, name.lastIndexOf('.'))
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