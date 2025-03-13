document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const settingsBtn = document.getElementById('settingsBtn');
  const aboutBtn = document.getElementById('aboutBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const apiTokenInput = document.getElementById('apiToken');
  const apiHelpBtn = document.getElementById('apiHelpBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const noteTitle = document.getElementById('noteTitle');
  const noteContent = document.getElementById('noteContent'); // 原生 textarea
  const tagBtn = document.getElementById('tagBtn');
  const todoBtn = document.getElementById('todoBtn');
  const listBtn = document.getElementById('listBtn');
  const notesBtn = document.getElementById('notesBtn');
  const sendBtn = document.getElementById('sendBtn');
  const notesPanel = document.getElementById('notesPanel');
  const notesList = document.getElementById('notesList');
  const clearNotesBtn = document.getElementById('clearNotesBtn');
  const closeNotesBtn = document.getElementById('closeNotesBtn');
  const tagsPanel = document.getElementById('tagsPanel');
  const tagsList = document.getElementById('tagsList');
  const clearTagsBtn = document.getElementById('clearTagsBtn');
  const closeTagsBtn = document.getElementById('closeTagsBtn');
  const message = document.getElementById('message');
  const messageText = document.getElementById('messageText');

  // 标签正则表达式
  const tagRegex = /#[^\s]+\s/g;
  // URL 正则表达式
  const urlRegex = /^https?:\/\/.+/i;

  // 加载设置
  loadSettings();
  
  // 加载历史笔记
  loadNotes();
  
  // 加载标签
  loadTags();

  // 设置按钮点击事件
  settingsBtn.addEventListener('click', function() {
    settingsPanel.classList.toggle('active');
    if (notesPanel.classList.contains('active')) {
      notesPanel.classList.remove('active');
    }
  });

  // API帮助按钮点击事件
  apiHelpBtn.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://doc.gudong.site/inbox/api.html' });
  });

  // 关于按钮点击事件
  aboutBtn.addEventListener('click', function() {
    chrome.tabs.create({ url: 'https://doc.gudong.site/inbox/' });
  });

  // 保存设置按钮点击事件
  saveSettingsBtn.addEventListener('click', function() {
    const input = apiTokenInput.value.trim();
    if (input) {
      chrome.storage.sync.set({ 'inboxToken': input }, function() {
        showMessage('API Token 保存成功！', 'success');
        settingsPanel.classList.remove('active');
      });
    } else {
      showMessage('请输入有效的 API Token 或 API URL', 'error');
    }
  });

  // 标签按钮点击事件
  tagBtn.addEventListener('click', function() {
    tagsPanel.classList.toggle('active');
    if (settingsPanel.classList.contains('active')) {
      settingsPanel.classList.remove('active');
    }
    if (notesPanel.classList.contains('active')) {
      notesPanel.classList.remove('active');
    }
    
    // 更新标签列表
    updateTagsList();
  });

  // 待办按钮点击事件
  todoBtn.addEventListener('click', function() {
    insertTextAtCursor(noteContent, '- [ ] ');
  });

  // 无序列表按钮点击事件
  listBtn.addEventListener('click', function() {
    insertTextAtCursor(noteContent, '- ');
  });

  // 笔记列表按钮点击事件
  notesBtn.addEventListener('click', function() {
    notesPanel.classList.toggle('active');
    if (settingsPanel.classList.contains('active')) {
      settingsPanel.classList.remove('active');
    }
    
    // 更新笔记列表
    updateNotesList();
  });
  
  // 关闭笔记面板按钮点击事件
  closeNotesBtn.addEventListener('click', function() {
    notesPanel.classList.remove('active');
  });

  // 发送按钮点击事件
  sendBtn.addEventListener('click', function() {
    // 获取标题和内容
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();
    
    // 检查内容是否为空
    if (!content) {
      showMessage('笔记内容不能为空', 'error');
      return;
    }
    
    // 获取API Token
    chrome.storage.sync.get('inboxToken', function(result) {
      const tokenOrUrl = result.inboxToken;
      if (!tokenOrUrl) {
        showMessage('请先设置 API Token', 'error');
        settingsPanel.classList.add('active');
        return;
      }
      
      // 发送笔记
      sendNote(tokenOrUrl, title, content);
    });
  });

  // 清空笔记记录按钮点击事件
  clearNotesBtn.addEventListener('click', function() {
    if (confirm('确定要清空所有笔记记录吗？这不会删除已发送到 inBox 的笔记，只会清空本地历史记录。')) {
      chrome.storage.local.remove('inboxNotes', function() {
        showMessage('笔记记录已清空', 'success');
        updateNotesList();
      });
    }
  });

  // 笔记列表项点击事件（事件委托）
  notesList.addEventListener('click', function(e) {
    // 处理删除按钮点击
    if (e.target.closest('.delete-note')) {
      e.stopPropagation(); // 阻止事件冒泡
      const noteItem = e.target.closest('.note-item');
      const noteIndex = noteItem.dataset.index;
      deleteNote(noteIndex);
      return;
    }
    
    // 处理笔记项点击
    const noteItem = e.target.closest('.note-item');
    if (noteItem) {
      const noteIndex = noteItem.dataset.index;
      loadNoteContent(noteIndex);
    }
  });

  // 关闭标签面板按钮点击事件
  closeTagsBtn.addEventListener('click', function() {
    tagsPanel.classList.remove('active');
  });

  // 清空标签按钮点击事件
  clearTagsBtn.addEventListener('click', function() {
    if (confirm('确定要清空所有标签吗？')) {
      chrome.storage.local.remove('inboxTags', function() {
        showMessage('标签已清空', 'success');
        updateTagsList();
      });
    }
  });

  // 加载设置
  function loadSettings() {
    chrome.storage.sync.get('inboxToken', function(result) {
      if (result.inboxToken) {
        apiTokenInput.value = result.inboxToken;
      } else {
        // 首次使用，显示设置面板
        settingsPanel.classList.add('active');
      }
    });
  }

  // 加载历史笔记
  function loadNotes() {
    chrome.storage.local.get('inboxNotes', function(result) {
      if (!result.inboxNotes) {
        chrome.storage.local.set({ 'inboxNotes': [] });
      }
    });
  }

  // 加载标签
  function loadTags() {
    chrome.storage.local.get('inboxTags', function(result) {
      if (!result.inboxTags) {
        chrome.storage.local.set({ 'inboxTags': [] });
      }
    });
  }

  // 更新笔记列表
  function updateNotesList() {
    chrome.storage.local.get('inboxNotes', function(result) {
      const notes = result.inboxNotes || [];
      notesList.innerHTML = '';
      
      if (notes.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'note-item';
        emptyItem.innerHTML = '<span class="note-content">暂无笔记记录</span>';
        notesList.appendChild(emptyItem);
        return;
      }
      
      notes.forEach((note, index) => {
        const noteItem = document.createElement('li');
        noteItem.className = 'note-item';
        noteItem.dataset.index = index;
        
        // 显示标题或内容前20个字符作为预览
        let preview = '';
        
        // 优先使用note.title (新格式)
        if (note.title) {
          preview = note.title;
        } 
        // 兼容旧格式：从内容中提取标题
        else if (note.content) {
          const titleMatch = note.content.match(/^# (.*?)(?:\n|$)/);
          if (titleMatch && titleMatch[1]) {
            preview = titleMatch[1];
          } else {
            preview = note.content.substring(0, 20) + (note.content.length > 20 ? '...' : '');
          }
        }
        
        const time = new Date(note.time).toLocaleString();
        noteItem.innerHTML = `
          <div class="delete-note" title="删除笔记">×</div>
          <div class="note-content">${preview}</div>
          <div class="note-time">${time}</div>
        `;
        
        notesList.appendChild(noteItem);
      });
    });
  }

  // 删除指定笔记
  function deleteNote(index) {
    chrome.storage.local.get('inboxNotes', function(result) {
      const notes = result.inboxNotes || [];
      if (notes.length > index) {
        // 确认删除
        if(confirm('确定要删除这条笔记吗？')) {
          // 删除指定索引的笔记
          notes.splice(index, 1);
          // 保存更新后的笔记列表
          chrome.storage.local.set({ 'inboxNotes': notes }, function() {
            showMessage('笔记已删除', 'success');
            // 更新笔记列表显示
            updateNotesList();
          });
        }
      }
    });
  }

  // 加载笔记内容到编辑区
  function loadNoteContent(index) {
    chrome.storage.local.get('inboxNotes', function(result) {
      const notes = result.inboxNotes || [];
      if (notes.length > index) {
        const selectedNote = notes[index];
        
        // 优先使用新格式 (title 和 content 分离)
        if ('title' in selectedNote) {
          noteTitle.value = selectedNote.title || '';
          noteContent.value = selectedNote.content || '';
        } 
        // 兼容旧格式
        else if (selectedNote.content) {
          // 检查是否有标题（以 # 开头的第一行）
          const titleMatch = selectedNote.content.match(/^# (.*?)(?:\n|$)/);
          if (titleMatch && titleMatch[1]) {
            // 提取标题和内容
            const title = titleMatch[1];
            const content = selectedNote.content.replace(/^# .*?\n/, '').trim();
            
            // 更新编辑区
            noteTitle.value = title;
            noteContent.value = content;
          } else {
            // 没有标题，直接显示内容
            noteTitle.value = '';
            noteContent.value = selectedNote.content;
          }
        }
        
        // 关闭笔记面板
        notesPanel.classList.remove('active');
        
        // 滚动到输入区域
        noteTitle.scrollIntoView({ behavior: 'smooth' });
        
        // 显示加载成功提示
        showMessage('已加载笔记', 'success');
      }
    });
  }

  // 解析并存储标签
  function extractAndStoreTags(content) {
    const tags = content.match(tagRegex) || [];
    if (tags.length === 0) return;
    
    // 处理标签，去除 # 和结尾空格
    const processedTags = tags.map(tag => tag.replace('#', '').trim());
    
    // 存储到本地
    chrome.storage.local.get('inboxTags', function(result) {
      let currentTags = result.inboxTags || [];
      
      // 合并新标签并去重，只保留最近10个
      const newTags = [...new Set([...processedTags, ...currentTags])]
        .sort()
        .slice(0, 10);
      
      chrome.storage.local.set({ 'inboxTags': newTags });
    });
  }

  // 发送笔记到 inBox
  function sendNote(tokenOrUrl, title, content) {
    // 判断是否是完整URL还是仅token
    const apiUrl = urlRegex.test(tokenOrUrl) ? tokenOrUrl : `https://app.gudong.site/api/inbox/${tokenOrUrl}`;
    
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        title: title,
        content: content 
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.code === 0) {
        showMessage('笔记已成功发送到 inBox！', 'success');
        
        // 存储发送的笔记
        saveNote(title, content);
        
        // 解析并存储标签
        extractAndStoreTags(content);
        
        // 清空输入
        noteTitle.value = '';
        noteContent.value = '';
        
        // 更新笔记列表
        updateNotesList();
      } else {
        showMessage(`发送失败: ${data.msg}`, 'error');
      }
    })
    .catch(error => {
      showMessage(`发送错误: ${error.message}`, 'error');
    });
  }

  // 保存笔记到本地历史记录
  function saveNote(title, content) {
    chrome.storage.local.get('inboxNotes', function(result) {
      const notes = result.inboxNotes || [];
      
      // 添加新笔记到开头
      notes.unshift({
        title: title,
        content: content,
        time: new Date().toISOString()
      });
      
      // 限制保存的笔记数量，最多保存50条
      if (notes.length > 50) {
        notes.length = 50;
      }
      
      chrome.storage.local.set({ 'inboxNotes': notes });
    });
  }

  // 在编辑器光标位置插入文本
  function insertTextAtCursor(textarea, text) {
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const scrollTop = textarea.scrollTop;
    
    textarea.value = 
      textarea.value.substring(0, startPos) + 
      text + 
      textarea.value.substring(endPos, textarea.value.length);
    
    textarea.focus();
    textarea.selectionStart = startPos + text.length;
    textarea.selectionEnd = startPos + text.length;
    textarea.scrollTop = scrollTop;
  }

  // 显示消息
  function showMessage(text, type) {
    messageText.textContent = text;
    message.className = `message ${type} active`;
    
    // 3秒后自动隐藏
    setTimeout(() => {
      message.classList.remove('active');
    }, 3000);
  }

  // 更新标签列表
  function updateTagsList() {
    chrome.storage.local.get('inboxTags', function(result) {
      const tags = result.inboxTags || [];
      tagsList.innerHTML = '';
      
      if (tags.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-tags';
        emptyMsg.textContent = '暂无历史标签';
        tagsList.appendChild(emptyMsg);
        return;
      }
      
      tags.forEach(tag => {
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';
        tagItem.textContent = `#${tag}`;
        tagItem.dataset.tag = `#${tag}`;
        tagItem.addEventListener('click', function() {
          insertTextAtCursor(noteContent, this.dataset.tag + ' ');
          tagsPanel.classList.remove('active');
        });
        tagsList.appendChild(tagItem);
      });
    });
  }
}); 