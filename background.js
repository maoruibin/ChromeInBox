// 当用户点击插件图标时
chrome.action.onClicked.addListener(function() {
  // 打开一个新窗口
  chrome.windows.create({
    url: 'popup.html',
    type: 'popup',
    width: 550,
    height: 600
  });
}); 