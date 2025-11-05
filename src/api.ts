const GROUP_API = "/upload_group_file"
const PRIVATE_API = "/upload_private_file"

/**
 * 从文件路径中提取文件名
 */
function getNameFromPath(filePath: string): string {
  try {
    // 处理不同操作系统的路径分隔符
    const parts = filePath.split(/[\\/]/);
    return parts[parts.length - 1];
  } catch (error) {
    console.error("提取文件名失败", error);
    // 失败时返回原路径作为备用
    return filePath;
  }
}

/**
 * 通用文件上传函数
 */
function uploadFile(baseUrl: string, token: string, endpoint: string, targetId: string, filePath: string, idField: string): void {
  const fileName = getNameFromPath(filePath);
  const payload = {
    [idField]: targetId,
    name: fileName,
    file: filePath
  };

  fetch(baseUrl + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify(payload)
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }).then(data => {
    console.log(`执行${endpoint === GROUP_API ? "群" : "私聊"}文件上传：`, JSON.stringify(data, null, 2));
  }).catch(error => {
    if (error instanceof TypeError) {
      console.error("网络连接问题，请检查网络设置。", error);
    } else {
      console.error(`文件上传操作失败，请查看日志详情。`, error);
    }
  });
}

// 导出公开的API函数
export function uploadGroupFile(baseUrl: string, groupId: string, filePath: string, token: string=""): void {
  uploadFile(baseUrl, token, GROUP_API, groupId, filePath, 'group_id');
}

export function uploadPrivateFile(baseUrl: string, userId: string, filePath: string, token: string=""): void {
  uploadFile(baseUrl, token, PRIVATE_API, userId, filePath, 'user_id');
}
