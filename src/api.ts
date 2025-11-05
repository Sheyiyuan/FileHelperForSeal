const GROUP_API = "/upload_group_file"
const PRIVATE_API = "/upload_private_file"
const GROUP_CHECK_API = "/get_group_root_files"
const GROUP_DELETE_API = "/delete_group_file"

interface File {
  group_id: number;
  file_id: number;
  file_name: string;
  busid: number;
  file_size: number;
  upload_time: number;
  dead_time: number;
  modify_time: number;
  download_times: number;
  uploader: number;
  uploader_name: string;
}

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
function uploadFile(baseUrl: string, token: string, endpoint: string, targetId: string, filePath: string, idField: string): Promise<void> {
  const fileName = getNameFromPath(filePath);
  const payload = {
    [idField]: targetId,
    name: fileName,
    file: filePath
  };

  return fetch(baseUrl + endpoint, {
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

/**
 * 群文件列表获取函数
 */
function getGroupRootFiles(baseUrl: string, token: string, groupId: string): Promise<File[]> {
  return fetch(baseUrl + GROUP_CHECK_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      group_id: groupId
    })
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }).then(data => {
    return data.data.files as File[];
  }).catch(error => {
    console.error(`群文件列表获取操作失败，请查看日志详情。`, error);
    return [];
  });
}

/**
 * 群文件删除函数
 */
function deleteGroupFile(baseUrl: string, token: string, groupId: string, fileId: string): Promise<void> {
  return fetch(baseUrl + GROUP_DELETE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      group_id: groupId,
      file_id: fileId
    })
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }).then(data => {
    console.log(`执行群文件删除：`, JSON.stringify(data, null, 2));
  }).catch(error => {
    console.error(`群文件删除操作失败，请查看日志详情。`, error);
    throw error;
  });
}

// 导出公开的API函数
export function uploadGroupFile(baseUrl: string, groupId: string, filePath: string, token: string=""): Promise<void> {
  return uploadFile(baseUrl, token, GROUP_API, groupId, filePath, 'group_id');
}

export function uploadPrivateFile(baseUrl: string, userId: string, filePath: string, token: string=""): Promise<void> {
  return uploadFile(baseUrl, token, PRIVATE_API, userId, filePath, 'user_id');
}

// 修改函数签名以匹配调用参数顺序
export async function checkAndDealGroupFile(baseUrl: string, groupId: string, self_id: string, filePath: string, token: string, doDeleteExistedFile: boolean): Promise<boolean> {
  try {
    const files = await getGroupRootFiles(baseUrl, token, groupId);
    const file = files.find(f => f.file_name === getNameFromPath(filePath) && f.uploader.toString() === self_id);

    if (file) {
      if (doDeleteExistedFile) {
        // 先删除旧文件，再上传新文件
        await deleteGroupFile(baseUrl, token, groupId, file.file_id.toString());
        await uploadGroupFile(baseUrl, groupId, filePath, token);
        return true;
      }
      // 文件存在但不需要覆盖
      return true;
    } else {
      // 文件不存在，直接上传
      await uploadGroupFile(baseUrl, groupId, filePath, token);
      return false;
    }
  } catch (error) {
    console.error(`检查并处理群文件失败:`, error);
    // 出错时默认上传文件
    await uploadGroupFile(baseUrl, groupId, filePath, token);
    return false;
  }
}
