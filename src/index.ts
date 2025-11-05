import * as api from './api'

function main() {
  // 注册扩展
  let ext = seal.ext.find('FileHelper');
  if (!ext) {
    ext = seal.ext.new('FileHelper', 'Sheyiyuan', '1.0.0');
    seal.ext.register(ext);
    seal.ext.registerStringConfig(ext, "协议端 http 地址", "http://127.0.0.1:63000");
    seal.ext.registerStringConfig(ext, "协议端 token", "");
    seal.ext.registerStringConfig(ext, "获取文件指令", "骰娘请给我");
    seal.ext.registerStringConfig(ext, "发送文案", "正在为您发送文件：")
    seal.ext.registerTemplateConfig(ext, "文件列表", [`{"文件名":"coc角色卡","文件路径":"/home/dice/files/coc角色卡.xlsx"}`])
    seal.ext.registerBoolConfig(ext, "是否允许群聊使用", true)
  }

  // 编写指令
  const cmdFileHelper = seal.ext.newCmdItemInfo();
  cmdFileHelper.name = '文件助手';
  cmdFileHelper.help = `一个简单的文件助手，用于按照骰主设定好的指令发送文件。`;

  cmdFileHelper.solve = (ctx, msg, _cmdArgs) => {
    //获取文件列表
    const fileListJsonArray = seal.ext.getTemplateConfig(ext, '文件列表');
    // 解析文件列表并提取文件名
    let fileNames = [];
    try {
    fileNames = fileListJsonArray.map(fileInfoJson => {
      const fileInfo = JSON.parse(fileInfoJson);
      return fileInfo["文件名"];
    });
    } catch (error) {
      console.error(`解析文件列表出错`, error);
      seal.replyToSender(ctx, msg, `文件列表配置有误，请联系骰主检查`);
      return seal.ext.newCmdExecuteResult(false);
    }
    // 发送文件列表
    seal.replyToSender(ctx, msg, `文件助手——让让骰娘给你发送文件\n作者：Sheyiyuan（2125107118）\n使用：${seal.ext.getStringConfig(ext, '获取文件指令')}+文件名 来获取文件。\n当前文件列表：${fileNames.join('、')}`)
    return seal.ext.newCmdExecuteResult(true);
  }

  // 注册命令
  ext.cmdMap['文件助手'] = cmdFileHelper;

  ext.onNotCommandReceived = (ctx, msg) => {
    const cmdPrefix = seal.ext.getStringConfig(ext, '获取文件指令');
    // 去除空格
    const message = msg.message.replace(/\s+/g, '');
    if (!message.startsWith(cmdPrefix)){
      return;
    }

    const protocolUrl = seal.ext.getStringConfig(ext, '协议端 http 地址');
    const token = seal.ext.getStringConfig(ext, '协议端 token');
    const allowGroup = seal.ext.getBoolConfig(ext, '是否允许群聊使用');
    const fileListJsonArray = seal.ext.getTemplateConfig(ext, '文件列表');

    for (let i = 0; i < fileListJsonArray.length; i++) {
      try {
        // 修复：使用正确的对象属性访问方式
        const fileInfo = JSON.parse(fileListJsonArray[i]);

        // 修复：将get()方法改为正确的对象属性访问
        if (message === cmdPrefix + fileInfo["文件名"]) {
          if (ctx.isPrivate) {
            api.uploadPrivateFile(protocolUrl, ctx.player.userId.match(/\d+/)[0], fileInfo["文件路径"], token)
          } else {
            if (!allowGroup) {
              seal.replyToSender(ctx, msg, `骰主已禁用群聊使用，请在私聊中使用。`)
              return;
            }
            api.uploadGroupFile(protocolUrl, ctx.group.groupId.match(/\d+/)[0], fileInfo["文件路径"], token)
          }
          // 找到匹配的文件后发送确认消息
          seal.replyToSender(ctx, msg, `${seal.ext.getStringConfig(ext, '发送文案')}${fileInfo["文件名"]}`);
          return;
        }
      } catch (error) {
        console.error(`解析文件配置出错 (索引 ${i})`, error);
        seal.replyToSender(ctx, msg, `文件配置有误，请联系骰主检查`);
      }
    }

    // 如果没有找到匹配的文件
    seal.replyToSender(ctx, msg, `未找到指定的文件，请检查文件名是否正确`);
  }
}
main();
