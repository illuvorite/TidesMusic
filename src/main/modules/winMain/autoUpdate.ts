// 自动更新已禁用：本项目不再自动检查/下载上游新版本，避免弹出「发现新版本」对话框
// 及引导用户迁移到 Any Listen。如需更新，请到 GitHub Releases 手动下载。
// 保留文件以便 winMain/index.ts 的 dynamic import 仍能 resolve 到 default noop。
export default () => {
  // no-op
}