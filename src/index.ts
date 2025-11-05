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
    seal.ext.registerTemplateConfig(ext, "文件列表", [`{"文件名":"coc角色卡","文件路径":"/home/dice/files/coc角色卡.xlsx"}`],"此处配置项格式请严格按照示例书写，路径为协议端所在设备的绝对路径。")
    seal.ext.registerBoolConfig(ext, "是否允许群聊使用", true,"如果关闭，群聊中无法使用文件助手")
    seal.ext.registerBoolConfig(ext, "是否允许检测群文件列表", true,"如果开启，骰娘会在每次启动时检测群文件列表。关闭后骰娘跳过检查，可能会导致重复上传")
    seal.ext.registerBoolConfig(ext, "检测到群文件已存在时是否覆盖", true, "如果群文件已存在目标文件，true则在上传后删除旧的文件,否则提示文件已存在。仅在开启检测群文件列表时生效。")
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

  ext.onNotCommandReceived = async (ctx, msg) => {
    // 早期返回：不是目标指令直接退出
    const cmdPrefix = seal.ext.getStringConfig(ext, '获取文件指令');
    const message = msg.message.replace(/\s+/g, '');
    if (!message.startsWith(cmdPrefix)) {
      return;
    }

    // 获取配置信息
    const protocolUrl = seal.ext.getStringConfig(ext, '协议端 http 地址');
    const token = seal.ext.getStringConfig(ext, '协议端 token');
    const allowGroup = seal.ext.getBoolConfig(ext, '是否允许群聊使用');
    const checkFileList = seal.ext.getBoolConfig(ext, '是否允许检测群文件列表');
    const overwriteExisting = seal.ext.getBoolConfig(ext, '检测到群文件已存在时是否覆盖');
    const fileListJsonArray = seal.ext.getTemplateConfig(ext, '文件列表');
    const sendMessage = seal.ext.getStringConfig(ext, '发送文案');

    // 遍历文件列表查找匹配项
    for (let i = 0; i < fileListJsonArray.length; i++) {
      try {
        const fileInfo = JSON.parse(fileListJsonArray[i]);

        // 不是目标文件则继续下一个
        if (message !== cmdPrefix + fileInfo["文件名"]) {
          continue;
        }

        // 私聊处理
        if (ctx.isPrivate) {
          seal.replyToSender(ctx, msg, `${sendMessage}${fileInfo["文件名"]}`);
          await api.uploadPrivateFile(protocolUrl, ctx.player.userId.match(/\d+/)[0], fileInfo["文件路径"], token);
          return;
        }

        // 群聊处理 - 检查是否允许群聊使用
        if (!allowGroup) {
          seal.replyToSender(ctx, msg, `骰主已禁用群聊使用，请在私聊中使用。`);
          return;
        }

        // 群聊处理 - 不检查文件列表直接上传
        if (!checkFileList) {
          seal.replyToSender(ctx, msg, `${sendMessage}${fileInfo["文件名"]}`);
          await api.uploadGroupFile(protocolUrl, ctx.group.groupId.match(/\d+/)[0], fileInfo["文件路径"], token);
          return;
        }

        // 群聊处理 - 检查文件列表并处理
        const groupId = ctx.group.groupId.match(/\d+/)[0];
        const botId = ctx.endPoint.userId.match(/\d+/)[0];
        const is_exist = await api.checkAndDealGroupFile(protocolUrl, groupId, botId, fileInfo["文件路径"], token, overwriteExisting);

        // 根据处理结果发送不同回复
        if (is_exist && overwriteExisting) {
          seal.replyToSender(ctx, msg, `${sendMessage}${fileInfo["文件名"]}(文件已存在，已删除旧文件)。`);
        } else if (is_exist) {
          seal.replyToSender(ctx, msg, `文件：“${fileInfo["文件名"]}”已存在不再重复上传`);
        } else {
          seal.replyToSender(ctx, msg, `${sendMessage}${fileInfo["文件名"]}`);
        }
        return;

      } catch (error) {
        console.error(`解析文件配置出错 (索引 ${i})`, error);
        seal.replyToSender(ctx, msg, `文件配置有误，请联系骰主检查`);
        return;
      }
    }

    // 未找到匹配的文件
    seal.replyToSender(ctx, msg, `未找到指定的文件，请检查文件名是否正确`);
  }
}
main();
