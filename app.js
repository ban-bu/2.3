// 配置
const CONFIG = {
    API_KEY: "sk-lNVAREVHjj386FDCd9McOL7k66DZCUkTp6IbV0u9970qqdlg",
    API_URL: "https://api.deepbricks.ai/v1/chat/completions",
    MODEL: "GPT-4.1-mini"
};

// 全局移动端检测函数
function isMobileDevice() {
    return window.innerWidth <= 768 || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 1024 && window.innerHeight > window.innerWidth) ||
           (window.innerWidth <= 480 && window.innerHeight > window.innerWidth);
}

// 全局状态
let messages = [];
let participants = [];
let isAIProcessing = false;
let currentUsername = '';
let roomId = '';
window.roomId = roomId; // 暴露到全局
let currentUserId = '';

// 基于用户名生成一致的用户ID
function generateUserIdFromUsername(username) {
    if (!username) return 'user-' + Math.random().toString(36).substr(2, 9);
    
    // 使用简单的哈希函数基于用户名生成一致的ID
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        const char = username.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    
    // 转换为正数并生成用户ID
    const userId = 'user-' + Math.abs(hash).toString(36);
    return userId;
}

// 实时通信状态
let isRealtimeEnabled = false;
let typingTimeout = null;

// DOM元素
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const participantsList = document.getElementById('participantsList');
const summaryContent = document.getElementById('summaryContent');
const aiStatus = document.getElementById('aiStatus');
const connectionStatus = document.getElementById('connectionStatus');
const askAIModal = document.getElementById('askAIModal');
const aiQuestionInput = document.getElementById('aiQuestionInput');
const usernameModal = document.getElementById('usernameModal');
const usernameInput = document.getElementById('usernameInput');
const roomInput = document.getElementById('roomInput');

// 移动端检测和响应式功能
function initMobileSupport() {
    const isMobile = window.innerWidth <= 768;
    const mobileNav = document.getElementById('mobileNav');
    const leftSidebar = document.querySelector('.left-sidebar');
    const rightSidebar = document.querySelector('.right-sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const aiPanelClose = document.getElementById('aiPanelClose');
    
    // 显示/隐藏移动端导航
    if (isMobile) {
        mobileNav.style.display = 'flex';
        if (sidebarClose) sidebarClose.style.display = 'block';
        if (aiPanelClose) aiPanelClose.style.display = 'block';
        
        // 默认隐藏侧边栏
        leftSidebar.classList.remove('active');
        rightSidebar.classList.remove('active');
    } else {
        mobileNav.style.display = 'none';
        if (sidebarClose) sidebarClose.style.display = 'none';
        if (aiPanelClose) aiPanelClose.style.display = 'none';
        
        // 桌面端显示侧边栏
        leftSidebar.classList.remove('active');
        rightSidebar.classList.remove('active');
    }
    
    // 移动端导航点击事件
    const navBtns = document.querySelectorAll('.mobile-nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            
            // 更新导航状态
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 切换内容区域
            switchMobileTab(tab);
        });
    });
    
    // 侧边栏关闭按钮
    if (sidebarClose) {
        sidebarClose.addEventListener('click', () => {
            leftSidebar.classList.remove('active');
            // 重新激活聊天标签
            navBtns.forEach(b => b.classList.remove('active'));
            const chatBtn = document.querySelector('[data-tab="chat"]');
            if (chatBtn) chatBtn.classList.add('active');
            switchMobileTab('chat');
        });
    }
    
    if (aiPanelClose) {
        aiPanelClose.addEventListener('click', () => {
            rightSidebar.classList.remove('active');
            // 重新激活聊天标签
            navBtns.forEach(b => b.classList.remove('active'));
            const chatBtn = document.querySelector('[data-tab="chat"]');
            if (chatBtn) chatBtn.classList.add('active');
            switchMobileTab('chat');
        });
    }
    
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
    
    // 图标加载优化
    optimizeIconLoading();
    
    // 强制确保移动端输入框可见
    forceMobileInputVisibility();
}

// 强制确保移动端输入框可见
function forceMobileInputVisibility() {
    if (isMobileDevice()) {
        // 延迟执行，确保DOM完全加载
        setTimeout(() => {
            const inputContainer = document.querySelector('.input-container');
            const inputWrapper = document.querySelector('.input-wrapper');
            const messageInput = document.getElementById('messageInput');
            const chatContainer = document.querySelector('.chat-container');
            
            // 检查是否在欢迎页面（用户名模态框显示时）
            const usernameModal = document.getElementById('usernameModal');
            const isOnWelcomePage = usernameModal && (usernameModal.style.display === 'block' || usernameModal.style.display === 'flex');
            
            if (isOnWelcomePage) {
                // 在欢迎页面时隐藏输入框
                if (inputContainer) {
                    inputContainer.style.display = 'none';
                }
                return;
            }
            
            // 确保输入框在正常聊天时始终可见
            if (inputContainer) {
                // 强制设置样式
                Object.assign(inputContainer.style, {
                    position: 'fixed',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    background: '#ffffff',
                    borderTop: '1px solid #e5e7eb',
                    zIndex: '9999',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0.75rem',
                    gap: '0.5rem',
                    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
                    minHeight: '140px',
                    maxHeight: '200px',
                    visibility: 'visible',
                    opacity: '1'
                });
            }
            
            if (inputWrapper) {
                Object.assign(inputWrapper.style, {
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'flex-end',
                    width: '100%'
                });
            }
            
            // 强制显示AI询问和文件上传按钮
            const inputActions = document.querySelector('.input-actions');
            if (inputActions) {
                Object.assign(inputActions.style, {
                    display: 'flex !important',
                    gap: '0.5rem',
                    flexShrink: '0',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    width: '100%',
                    marginTop: '0.5rem'
                });
    
            }
            
            // 强制显示所有功能按钮
            const buttons = document.querySelectorAll('.btn-ask-ai, .btn-summarize, .btn-upload');
            buttons.forEach(button => {
                Object.assign(button.style, {
                    display: 'flex !important',
                    flex: '1',
                    minHeight: '44px',
                    padding: '0.75rem 0.5rem',
                    border: 'none',
                    borderRadius: '0.5rem',
                    background: button.classList.contains('btn-ask-ai') ? '#3b82f6' : 
                              button.classList.contains('btn-summarize') ? '#10b981' : '#f59e0b',
                    color: 'white',
                    cursor: 'pointer',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                });
            });

            
            if (messageInput) {
                Object.assign(messageInput.style, {
                    flex: '1',
                    minHeight: '44px',
                    fontSize: '16px',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    resize: 'none',
                    background: '#ffffff',
                    display: 'block'
                });
            }
            
            if (chatContainer) {
                Object.assign(chatContainer.style, {
                    height: 'calc(100vh - 200px)',
                    overflow: 'hidden',
                    position: 'relative',
                    paddingBottom: '0' // 移除底部padding，让输入框完全独立
                });
            }
            
            // 监听窗口大小变化
            window.addEventListener('resize', () => {
                if (window.innerWidth <= 768) {
                    forceMobileInputVisibility();
                }
            });
            
                // 监听滚动事件，确保输入框始终在底部
    window.addEventListener('scroll', () => {
        if (inputContainer) {
            inputContainer.style.bottom = '0';
        }
    });
    
    // 定期检查输入框和按钮可见性
    setInterval(() => {
        const inputContainer = document.querySelector('.input-container');
        const inputActions = document.querySelector('.input-actions');
        const buttons = document.querySelectorAll('.btn-ask-ai, .btn-summarize, .btn-upload');
        
        // 检查是否在欢迎页面
        const usernameModal = document.getElementById('usernameModal');
        const isOnWelcomePage = usernameModal && (usernameModal.style.display === 'block' || usernameModal.style.display === 'flex');
        
        if (isOnWelcomePage) {
            // 在欢迎页面时隐藏输入框
            if (inputContainer) {
                inputContainer.style.display = 'none';
            }
            return;
        }
        
        if (inputContainer) {
            const rect = inputContainer.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            
            if (!isVisible) {
                console.log('⚠️ 检测到输入框不可见，正在修复...');
                inputContainer.style.display = 'flex';
                inputContainer.style.position = 'fixed';
                inputContainer.style.bottom = '0';
                inputContainer.style.zIndex = '9999';
            }
        }
        
        // 检查按钮是否可见
        if (inputActions) {
            const actionsRect = inputActions.getBoundingClientRect();
            const actionsVisible = actionsRect.top < window.innerHeight && actionsRect.bottom > 0;
            
            if (!actionsVisible) {
                console.log('⚠️ 检测到功能按钮不可见，正在修复...');
                Object.assign(inputActions.style, {
                    display: 'flex !important',
                    gap: '0.5rem',
                    flexShrink: '0',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    width: '100%',
                    marginTop: '0.5rem'
                });
            }
        }
        
        // 检查每个按钮的可见性
        buttons.forEach(button => {
            const buttonRect = button.getBoundingClientRect();
            const buttonVisible = buttonRect.top < window.innerHeight && buttonRect.bottom > 0;
            
            if (!buttonVisible) {
                console.log('⚠️ 检测到按钮不可见，正在修复...');
                Object.assign(button.style, {
                    display: 'flex !important',
                    flex: '1',
                    minHeight: '44px',
                    padding: '0.75rem 0.5rem',
                    border: 'none',
                    borderRadius: '0.5rem',
                    background: button.classList.contains('btn-ask-ai') ? '#3b82f6' : 
                              button.classList.contains('btn-summarize') ? '#10b981' : '#f59e0b',
                    color: 'white',
                    cursor: 'pointer',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                });
            }
        });
    }, 3000);
    
    }, 1000);
}

// 显示输入框提示（已禁用）
function showInputBoxHint() {
    // 此功能已禁用，不再显示修复按钮
    return;
}
        
            // 再次检查，确保在页面完全加载后输入框可见
    setTimeout(() => {
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer && inputContainer.style.display === 'none') {
            inputContainer.style.display = 'flex';
            console.log('🔄 输入框显示状态已修复');
        }
        
        // 添加调试信息
        console.log('📱 移动端输入框调试信息:');
        console.log('- 屏幕宽度:', window.innerWidth);
        console.log('- 屏幕高度:', window.innerHeight);
        console.log('- 输入框容器:', inputContainer);
        if (inputContainer) {
            console.log('- 输入框位置:', inputContainer.getBoundingClientRect());
            console.log('- 输入框样式:', inputContainer.style.cssText);
        }
        
        // 添加手动修复按钮（仅在开发环境）
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            addDebugButton();
        }
    }, 2000);
}

// 添加调试按钮
function addDebugButton() {
    const debugBtn = document.createElement('button');
    debugBtn.textContent = '🔧 修复输入框';
    debugBtn.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 10000;
        background: #ff4444;
        color: white;
        border: none;
        padding: 10px;
        border-radius: 5px;
        font-size: 12px;
    `;
    debugBtn.onclick = () => {
        forceMobileInputVisibility();
        alert('输入框已强制修复！');
    };
    document.body.appendChild(debugBtn);
}

// 优化图标加载
function optimizeIconLoading() {
    // 检测Font Awesome是否加载成功
    setTimeout(() => {
        const testIcon = document.createElement('i');
        testIcon.className = 'fas fa-check';
        testIcon.style.display = 'none';
        document.body.appendChild(testIcon);
        
        const computedStyle = window.getComputedStyle(testIcon, '::before');
        const content = computedStyle.content;
        
        if (content === 'none' || content === '') {
            console.log('Font Awesome 加载失败，使用备用图标');
            useFallbackIcons();
        } else {
            console.log('Font Awesome 加载成功');
        }
        
        document.body.removeChild(testIcon);
    }, 2000);
}

// 备用图标方案
function useFallbackIcons() {
    // 替换常用图标为Unicode字符或SVG
    const iconReplacements = {
        'fas fa-comments': '💬',
        'fas fa-user-friends': '👥',
        'fas fa-robot': '🤖',
        'fas fa-search': '🔍',
        'fas fa-times': '✕',
        'fas fa-file': '📄',
        'fas fa-upload': '📤',
        'fas fa-send': '📤',
        'fas fa-copy': '📋',
        'fas fa-wifi': '📶',
        'fas fa-circle': '●',
        'fas fa-eye': '👁️',
        'fas fa-language': '🌐',
        'fas fa-file-text': '📝',
        'fas fa-key': '🔑',
        'fas fa-magic': '✨',
        'fas fa-spinner': '⏳',
        'fas fa-power-off': '⏻',
        'fas fa-clipboard-list': '📋',
        'fas fa-info-circle': 'ℹ️',
        'fas fa-check': '✓',
        'fas fa-exclamation-triangle': '⚠️',
        'fas fa-download': '📥'
    };
    
    // 替换所有图标
    Object.keys(iconReplacements).forEach(iconClass => {
        const className = iconClass.replace('fas fa-', '');
        const elements = document.querySelectorAll(`.${className}`);
        elements.forEach(element => {
            if (element.tagName === 'I') {
                element.textContent = iconReplacements[iconClass];
                element.style.fontFamily = 'inherit';
                element.style.fontStyle = 'normal';
            }
        });
    });
}

function switchMobileTab(tab) {
    const leftSidebar = document.querySelector('.left-sidebar');
    const rightSidebar = document.querySelector('.right-sidebar');
    const chatContainer = document.querySelector('.chat-container');
    
    // 隐藏所有面板
    leftSidebar.classList.remove('active');
    rightSidebar.classList.remove('active');
    chatContainer.style.display = 'flex';
    
    switch(tab) {
        case 'participants':
            if (window.innerWidth <= 768) {
                leftSidebar.classList.add('active');
                chatContainer.style.display = 'none';
            }
            break;
        case 'ai':
            if (window.innerWidth <= 768) {
                rightSidebar.classList.add('active');
                chatContainer.style.display = 'none';
            }
            break;
        case 'chat':
        default:
            chatContainer.style.display = 'flex';
            // 确保聊天页面时按钮可见
            setTimeout(ensureMobileButtonsVisibility, 100);
            break;
    }
}

// 窗口大小改变时重新初始化移动端支持
function handleResize() {
    initMobileSupport();
    // 确保按钮可见性
    ensureMobileButtonsVisibility();
}

// 添加移动端手势支持
function initTouchGestures() {
    if (window.innerWidth <= 768) {
        let startY = 0;
        let startX = 0;
        let currentY = 0;
        let currentX = 0;
        let threshold = 50; // 手势触发阈值
        
        // 为侧边栏添加滑动手势
        const leftSidebar = document.querySelector('.left-sidebar');
        const rightSidebar = document.querySelector('.right-sidebar');
        
        // 从左边缘滑动打开参与者面板
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;
            
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
            
            const diffX = currentX - startX;
            const diffY = currentY - startY;
            
            // 确保是水平滑动
            if (Math.abs(diffX) > Math.abs(diffY)) {
                // 从左边缘向右滑动，打开参与者面板
                if (startX < 20 && diffX > threshold) {
                    const navBtns = document.querySelectorAll('.mobile-nav-btn');
                    navBtns.forEach(b => b.classList.remove('active'));
                    document.querySelector('[data-tab="participants"]').classList.add('active');
                    switchMobileTab('participants');
                }
                
                // 从右边缘向左滑动，打开AI工具面板
                if (startX > window.innerWidth - 20 && diffX < -threshold) {
                    const navBtns = document.querySelectorAll('.mobile-nav-btn');
                    navBtns.forEach(b => b.classList.remove('active'));
                    document.querySelector('[data-tab="ai"]').classList.add('active');
                    switchMobileTab('ai');
                }
                
                // 在侧边栏上向相反方向滑动，关闭面板
                if (leftSidebar.classList.contains('active') && diffX < -threshold) {
                    leftSidebar.classList.remove('active');
                    const navBtns = document.querySelectorAll('.mobile-nav-btn');
                    navBtns.forEach(b => b.classList.remove('active'));
                    document.querySelector('[data-tab="chat"]').classList.add('active');
                    switchMobileTab('chat');
                }
                
                if (rightSidebar.classList.contains('active') && diffX > threshold) {
                    rightSidebar.classList.remove('active');
                    const navBtns = document.querySelectorAll('.mobile-nav-btn');
                    navBtns.forEach(b => b.classList.remove('active'));
                    document.querySelector('[data-tab="chat"]').classList.add('active');
                    switchMobileTab('chat');
                }
            }
        });
        
        document.addEventListener('touchend', () => {
            startX = 0;
            startY = 0;
        });
        
        // 防止默认的滑动行为干扰
        document.addEventListener('touchmove', (e) => {
            if (leftSidebar.classList.contains('active') || rightSidebar.classList.contains('active')) {
                // 在侧边栏打开时，阻止页面滚动
                if (e.target.closest('.left-sidebar') || e.target.closest('.right-sidebar')) {
                    return;
                }
                e.preventDefault();
            }
        }, { passive: false });
    }
}

// 确保移动端按钮可见性
function ensureMobileButtonsVisibility() {
    if (isMobileDevice()) {
        // 检查是否在欢迎页面
        const usernameModal = document.getElementById('usernameModal');
        const isOnWelcomePage = usernameModal && (usernameModal.style.display === 'block' || usernameModal.style.display === 'flex');
        
        if (isOnWelcomePage) {
            // 在欢迎页面时隐藏输入框
            const inputContainer = document.querySelector('.input-container');
            if (inputContainer) {
                inputContainer.style.display = 'none';
            }
            return;
        }
        
        // 确保输入框在正常聊天时始终可见
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) {
            inputContainer.style.display = 'flex';
        }
        
        const inputActions = document.querySelector('.input-actions');
        const buttons = document.querySelectorAll('.btn-ask-ai, .btn-summarize, .btn-upload');
        
        if (inputActions) {
            Object.assign(inputActions.style, {
                display: 'flex !important',
                gap: '0.5rem',
                flexShrink: '0',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                width: '100%',
                marginTop: '0.5rem'
            });
        }
        
        buttons.forEach(button => {
            Object.assign(button.style, {
                display: 'flex !important',
                flex: '1',
                minHeight: '44px',
                padding: '0.75rem 0.5rem',
                border: 'none',
                borderRadius: '0.5rem',
                background: button.classList.contains('btn-ask-ai') ? '#3b82f6' : 
                          button.classList.contains('btn-summarize') ? '#10b981' : '#f59e0b',
                color: 'white',
                cursor: 'pointer',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: '500',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            });
        });
        

    }
}

// 优化移动端输入体验
function optimizeMobileInput() {
    if (isMobileDevice()) {
        const messageInput = document.getElementById('messageInput');
        
        // 移动端输入框获得焦点时，调整视图
        messageInput.addEventListener('focus', () => {
            setTimeout(() => {
                messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
        
        // 移动端虚拟键盘处理
        let initialHeight = window.innerHeight;
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDiff = initialHeight - currentHeight;
            
            // 检测虚拟键盘是否弹出（高度减少超过150px）
            if (heightDiff > 150) {
                document.body.classList.add('keyboard-open');
                // 调整聊天容器高度
                const chatContainer = document.querySelector('.chat-container');
                if (chatContainer) {
                    chatContainer.style.height = `${currentHeight - 120}px`;
                }
            } else {
                document.body.classList.remove('keyboard-open');
                const chatContainer = document.querySelector('.chat-container');
                if (chatContainer) {
                    chatContainer.style.height = '';
                }
            }
        });
    }
}

// 初始化
function init() {
    // 从URL获取房间号，如果没有则在设置用户名时处理
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');
    if (urlRoomId) {
        roomId = urlRoomId;
        window.roomId = roomId;
        document.getElementById('roomId').textContent = `房间: ${roomId}`;
    }
    
    // 初始化麦克风状态
    initializeMicrophoneState();
    
    setupEventListeners();
    setupRealtimeClient();
    
    // 初始化移动端支持
    initMobileSupport();
    initTouchGestures();
    optimizeMobileInput();
    
        // 移动端输入框管理
    if (isMobileDevice()) {
        // 检查欢迎页面状态并相应处理输入框
        const checkWelcomePageAndInput = () => {
            const inputContainer = document.querySelector('.input-container');
            const usernameModal = document.getElementById('usernameModal');
            const isOnWelcomePage = usernameModal && (usernameModal.style.display === 'block' || usernameModal.style.display === 'flex');
            
            if (inputContainer) {
                if (isOnWelcomePage) {
                    // 在欢迎页面时隐藏输入框
                    inputContainer.style.display = 'none';
                } else {
                    // 在正常聊天时显示输入框
                    inputContainer.style.display = 'flex';
                    inputContainer.style.visibility = 'visible';
                    inputContainer.style.opacity = '1';
                    inputContainer.style.position = 'fixed';
                    inputContainer.style.bottom = '0';
                    inputContainer.style.left = '0';
                    inputContainer.style.right = '0';
                    inputContainer.style.zIndex = '9999';
                }
            }
        };
        
        // 初始检查
        setTimeout(checkWelcomePageAndInput, 500);
        
        // 定期检查状态变化
        setInterval(checkWelcomePageAndInput, 1000);
        
        // 监听屏幕方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(checkWelcomePageAndInput, 100);
        });
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            setTimeout(checkWelcomePageAndInput, 100);
        });
    }


    
    // 确保移动端按钮可见性
    setTimeout(() => {
        if (isMobileDevice()) {
            // 检查是否在欢迎页面，如果是则隐藏输入框
            const usernameModal = document.getElementById('usernameModal');
            const isOnWelcomePage = usernameModal && (usernameModal.style.display === 'block' || usernameModal.style.display === 'flex');
            
            if (isOnWelcomePage) {
                const inputContainer = document.querySelector('.input-container');
                if (inputContainer) {
                    inputContainer.style.display = 'none';
                }
            } else {
                // 确保输入框在正常聊天时始终可见
                const inputContainer = document.querySelector('.input-container');
                if (inputContainer) {
                    inputContainer.style.display = 'flex';
                    inputContainer.style.visibility = 'visible';
                    inputContainer.style.opacity = '1';
                }
                forceMobileInputVisibility();
            }
        }
    }, 1000);
    
    // 检查文档处理库加载状态
    setTimeout(checkDocumentLibraries, 1000); // 延迟1秒确保库完全加载
    
    // 测试XLSX库
    setTimeout(testXLSXLibrary, 1500);
    
    // 初始化语音通话功能
    initVoiceCall();
}

// ==================== 语音通话功能 ====================

// 初始化语音通话
function initVoiceCall() {
    console.log('🎙️ 初始化语音通话功能...');
    
    // 检查浏览器支持
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('⚠️ 浏览器不支持语音通话功能');
        showToast('您的浏览器不支持语音通话功能', 'warning');
        return;
    }
    
    // 初始化WebRTC配置
    window.RTCPeerConnection = window.RTCPeerConnection || 
                              window.webkitRTCPeerConnection || 
                              window.mozRTCPeerConnection;
    
    if (!window.RTCPeerConnection) {
        console.warn('⚠️ 浏览器不支持WebRTC');
        showToast('您的浏览器不支持WebRTC，无法使用语音通话', 'warning');
        return;
    }
    
    // 测试麦克风权限
    testMicrophonePermission();
    
    console.log('✅ 语音通话功能初始化完成');
}

// 测试麦克风权限
async function testMicrophonePermission() {
    const testMicBtn = document.getElementById('testMicBtn');
    
    try {
        console.log('🔍 测试麦克风权限...');
        
        // 更新按钮状态
        if (testMicBtn) {
            testMicBtn.classList.add('testing');
            testMicBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            testMicBtn.title = '正在测试麦克风...';
        }
        
        // 检查浏览器支持
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('浏览器不支持getUserMedia API');
        }
        
        // 检查权限API是否可用
        if (navigator.permissions && navigator.permissions.query) {
            const permissions = await navigator.permissions.query({ name: 'microphone' });
            console.log('麦克风权限状态:', permissions.state);
            
            if (permissions.state === 'denied') {
                console.warn('⚠️ 麦克风权限已被拒绝');
                showToast('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问', 'warning');
                return;
            }
        }
        
        // 尝试获取麦克风权限（不保存流）
        console.log('正在请求麦克风权限...');
        const audioConstraints = getOptimizedAudioConstraints();
        console.log('🎙️ 测试音频约束配置:', audioConstraints);
        
        const testStream = await navigator.mediaDevices.getUserMedia({ 
            audio: audioConstraints
        });
        
        // 立即停止测试流
        testStream.getTracks().forEach(track => track.stop());
        
        console.log('✅ 麦克风权限测试通过');
        showToast('✅ 麦克风权限测试通过，可以正常使用语音通话', 'success');
        
        // 更新按钮状态为成功
        if (testMicBtn) {
            testMicBtn.classList.remove('testing');
            testMicBtn.classList.add('success');
            testMicBtn.innerHTML = '<i class="fas fa-check"></i>';
            testMicBtn.title = '麦克风权限正常';
            testMicBtn.style.background = '#10b981';
            
            // 3秒后恢复原始状态
            setTimeout(() => {
                testMicBtn.classList.remove('success');
                testMicBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                testMicBtn.title = '测试麦克风';
                testMicBtn.style.background = '';
            }, 3000);
        }
        
    } catch (error) {
        console.warn('⚠️ 麦克风权限测试失败:', error);
        
        let warningMessage = '麦克风权限测试失败';
        
        if (error.name === 'NotAllowedError') {
            warningMessage = '麦克风权限被拒绝，请点击地址栏的麦克风图标并选择"允许"';
        } else if (error.name === 'NotFoundError') {
            warningMessage = '未找到麦克风设备，请检查麦克风连接';
        } else if (error.name === 'NotSupportedError') {
            warningMessage = '浏览器不支持麦克风功能';
        } else if (error.name === 'NotReadableError') {
            warningMessage = '麦克风被其他应用占用，请关闭其他使用麦克风的应用';
        } else if (error.name === 'OverconstrainedError') {
            warningMessage = '麦克风配置不兼容，请尝试刷新页面';
        } else {
            warningMessage = `麦克风测试失败: ${error.message}`;
        }
        
        showToast(warningMessage, 'error');
        
        // 更新按钮状态为失败
        if (testMicBtn) {
            testMicBtn.classList.remove('testing');
            testMicBtn.classList.add('error');
            testMicBtn.innerHTML = '<i class="fas fa-times"></i>';
            testMicBtn.title = '麦克风权限测试失败';
            testMicBtn.style.background = '#ef4444';
            
            // 3秒后恢复原始状态
            setTimeout(() => {
                testMicBtn.classList.remove('error');
                testMicBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                testMicBtn.title = '测试麦克风';
                testMicBtn.style.background = '';
            }, 3000);
        }
        
        // 显示详细的错误信息
        console.error('详细错误信息:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    }
}

// 切换语音通话状态
function toggleVoiceCall() {
    if (isInCall) {
        endVoiceCall();
    } else {
        startVoiceCall();
    }
}

// 开始语音通话
async function startVoiceCall() {
    try {
        console.log('📞 开始语音通话...');
        
        // 检查浏览器支持
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('浏览器不支持getUserMedia API');
        }
        
        // 检查麦克风权限
        const permissions = await navigator.permissions.query({ name: 'microphone' });
        console.log('麦克风权限状态:', permissions.state);
        
        if (permissions.state === 'denied') {
            throw new Error('麦克风权限已被拒绝，请在浏览器设置中允许麦克风访问');
        }
        
        // 获取麦克风权限
        console.log('正在请求麦克风权限...');
        const audioConstraints = getOptimizedAudioConstraints();
        console.log('🎙️ 使用音频约束配置:', audioConstraints);
        
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints
        });
        
        console.log('✅ 麦克风权限获取成功');
        
        // 恢复用户的麦克风偏好设置
        try {
            const savedPreference = localStorage.getItem('microphonePreference');
            if (savedPreference !== null) {
                isMuted = savedPreference === 'true';
                console.log('🔄 恢复麦克风状态偏好:', isMuted ? '静音' : '开启');
            } else {
                // 默认为开启状态
                isMuted = false;
                console.log('🎙️ 使用默认麦克风状态: 开启');
            }
        } catch (error) {
            console.warn('⚠️ 无法恢复麦克风状态偏好，使用默认设置:', error);
            isMuted = false;
        }
        
        isInCall = true;
        callStartTime = Date.now();
        
        // 清空并重新添加参与者
        callParticipants.clear();
        callParticipants.add(currentUserId);
        
        // 更新UI
        updateCallUI();
        showCallPanel();
        
        // 同步麦克风UI状态
        syncMicrophoneUI();
        
        // 同步参与者数据
        syncCallParticipants();
        
        // 優先嘗試從服務端獲取 ICE 配置（不阻塞太久）
        try {
            await Promise.race([
                loadServerIceConfig(),
                new Promise((resolve) => setTimeout(resolve, 1500))
            ]);
        } catch (e) {
            console.warn('拉取服務端 ICE 配置失敗，使用內建配置', e);
        }

        // 启动自动连接监控
        startConnectionMonitoring();
        
        // 快速网络连接检查（不阻塞通话流程）：自動選擇可用 TURN
        setTimeout(async () => {
            console.log('🔍 開始快速 TURN 可用性檢查...');
            try {
                const best = await selectBestTurnServer();
                if (best) {
                    console.log('✅ 已選擇可用 TURN:', best.urls);
                    preferredTurnServer = best;
                } else {
                    console.warn('⚠️ 未找到可用 TURN，跨網路可能有問題');
                }
            } catch (error) {
                console.warn('⚠️ 快速選擇 TURN 發生異常:', error);
            }
        }, 2000);
        
        // 通知其他用户加入通话
        console.log('📞 ===== 发送通话邀请 =====');
        console.log('📊 通话邀请详情:', {
            roomId: roomId,
            callerId: currentUserId,
            callerName: currentUsername,
            realtimeEnabled: isRealtimeEnabled,
            clientConnected: !!(window.realtimeClient && window.realtimeClient.socket && window.realtimeClient.socket.connected)
        });
        
        // 自动WebSocket连接状态检查和诊断
        await autoCheckWebSocketConnection();
        
        if (isRealtimeEnabled && window.realtimeClient) {
            if (window.realtimeClient.socket && window.realtimeClient.socket.connected) {
                console.log('✅ WebSocket连接正常，发送通话邀请...');
            window.realtimeClient.sendCallInvite({
                roomId,
                callerId: currentUserId,
                callerName: currentUsername
            });
                console.log('📤 通话邀请已发送');
            } else {
                console.error('❌ WebSocket未连接! 自动尝试修复...');
                await autoRepairWebSocketConnection();
            }
        } else {
            console.warn('⚠️ 实时通信未启用或客户端未初始化');
        }
        
        showToast('语音通话已开始', 'success');
        console.log('✅ 语音通话已启动');
        
        // 更新转录按钮状态
        if (typeof onCallStatusChange === 'function') {
            onCallStatusChange();
        }
        
    } catch (error) {
        console.error('❌ 启动语音通话失败:', error);
        
        let errorMessage = '无法启动语音通话';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = '麦克风权限被拒绝，请点击地址栏的麦克风图标并选择"允许"';
        } else if (error.name === 'NotFoundError') {
            errorMessage = '未找到麦克风设备，请检查麦克风连接';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = '浏览器不支持语音通话功能';
        } else if (error.name === 'NotReadableError') {
            errorMessage = '麦克风被其他应用占用，请关闭其他使用麦克风的应用';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = '麦克风配置不兼容，请尝试刷新页面';
        } else {
            errorMessage = `启动语音通话失败: ${error.message}`;
        }
        
        showToast(errorMessage, 'error');
        
        // 显示详细的错误信息
        console.error('详细错误信息:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    }
}

// 清理通话资源（不发送事件）
function cleanupCallResources() {
    console.log('📞 清理通话资源...');
    
    // 保存当前的麦克风状态偏好
    try {
        localStorage.setItem('microphonePreference', isMuted.toString());
        console.log('💾 保存麦克风状态偏好:', isMuted ? '静音' : '开启');
    } catch (error) {
        console.warn('⚠️ 无法保存麦克风状态偏好:', error);
    }
    
    // 停止本地流
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // 关闭所有对等连接并清理音频元素
    peerConnections.forEach((connection, userId) => {
        connection.close();
        
        // 清理对应的远程音频元素
        const audioElement = document.getElementById(`remote-audio-${userId}`);
        if (audioElement) {
            console.log('🧹 清理远程音频元素:', userId);
            audioElement.pause();
            audioElement.srcObject = null;
            audioElement.remove();
        }
    });
    peerConnections.clear();
    remoteStreams.clear();
    
    // 重置通话状态（但保持麦克风偏好）
    isInCall = false;
    // 注意：不再强制重置 isMuted，保持用户偏好
    callParticipants.clear();
    callStartTime = null;
    callDuration = null;
    
    // 停止自动连接监控
    stopConnectionMonitoring();
    
    // 更新UI
    updateCallUI();
    hideCallPanel();
    
    showToast('语音通话已结束', 'info');
    console.log('✅ 通话资源已清理');
    
    // 更新转录按钮状态（禁用转录功能）
    if (typeof onCallStatusChange === 'function') {
        onCallStatusChange();
    }
}

// 结束语音通话
function endVoiceCall() {
    console.log('📞 结束语音通话...');
    
    // 清理资源
    cleanupCallResources();
    
    // 通知其他用户结束通话
    if (isRealtimeEnabled && window.realtimeClient) {
        window.realtimeClient.sendCallEnd({
            roomId,
            userId: currentUserId
        });
    }
    
    console.log('✅ 语音通话已结束');
}

// 接受通话邀请
async function acceptCall() {
    try {
        console.log('📞 接受通话邀请...');
        
        // 检查浏览器支持
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('浏览器不支持getUserMedia API');
        }
        
        // 检查麦克风权限
        const permissions = await navigator.permissions.query({ name: 'microphone' });
        console.log('麦克风权限状态:', permissions.state);
        
        if (permissions.state === 'denied') {
            throw new Error('麦克风权限已被拒绝，请在浏览器设置中允许麦克风访问');
        }
        
        // 获取麦克风权限
        console.log('正在请求麦克风权限...');
        const audioConstraints = getOptimizedAudioConstraints();
        console.log('🎙️ 使用音频约束配置:', audioConstraints);
        
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints
        });
        
        console.log('✅ 麦克风权限获取成功');
        
        // 恢复用户的麦克风偏好设置
        try {
            const savedPreference = localStorage.getItem('microphonePreference');
            if (savedPreference !== null) {
                isMuted = savedPreference === 'true';
                console.log('🔄 恢复麦克风状态偏好:', isMuted ? '静音' : '开启');
            } else {
                // 默认为开启状态
                isMuted = false;
                console.log('🎙️ 使用默认麦克风状态: 开启');
            }
        } catch (error) {
            console.warn('⚠️ 无法恢复麦克风状态偏好，使用默认设置:', error);
            isMuted = false;
        }
        
        isInCall = true;
        callStartTime = Date.now();
        callParticipants.add(currentUserId);
        
        // 如果有来电数据，将呼叫者也添加到参与者列表
        if (window.incomingCallData && window.incomingCallData.callerId) {
            callParticipants.add(window.incomingCallData.callerId);
            console.log('📞 添加呼叫者到参与者列表:', window.incomingCallData.callerId);
        }
        
        // 更新UI
        updateCallUI();
        showCallPanel();
        hideIncomingCallModal();
        
        // 同步麦克风UI状态
        syncMicrophoneUI();
        
        // 同步参与者数据
        syncCallParticipants();
        
        // 启动自动连接监控
        startConnectionMonitoring();
        
        // 通知发起者已接受
        if (isRealtimeEnabled && window.realtimeClient) {
            window.realtimeClient.sendCallAccept({
                roomId,
                userId: currentUserId,
                userName: currentUsername
            });
        }
        
        showToast('已加入语音通话', 'success');
        console.log('✅ 已接受通话邀请');
        
        // 更新转录按钮状态
        if (typeof onCallStatusChange === 'function') {
            onCallStatusChange();
        }
        
    } catch (error) {
        console.error('❌ 接受通话失败:', error);
        showToast('无法加入通话，请检查麦克风权限', 'error');
    }
}

// 拒绝通话邀请
function rejectCall() {
    console.log('📞 拒绝通话邀请...');
    
    hideIncomingCallModal();
    
    // 通知发起者已拒绝
    if (isRealtimeEnabled && window.realtimeClient) {
        window.realtimeClient.sendCallReject({
            roomId,
            userId: currentUserId
        });
    }
    
    showToast('已拒绝通话邀请', 'info');
}

// 同步麦克风UI状态
function syncMicrophoneUI() {
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        muteBtn.classList.toggle('muted', isMuted);
        muteBtn.innerHTML = isMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
        muteBtn.style.background = isMuted ? '#ef4444' : '#10b981';
        console.log('🎙️ 同步麦克风UI状态:', isMuted ? '静音' : '开启');
    }
    
    // 同步音频track状态
    if (localStream) {
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !isMuted;
        });
    }
    
    // 延迟验证状态一致性
    setTimeout(() => {
        validateMicrophoneState();
    }, 100);
}

// 切换静音状态
function toggleMute() {
    if (!localStream) return;
    
    isMuted = !isMuted;
    
    // 同步UI和音频状态
    syncMicrophoneUI();
    
    // 更新通话参与者列表中的状态
    updateCallParticipants();
    
    // 通知其他用户静音状态变化
    if (isRealtimeEnabled && window.realtimeClient) {
        window.realtimeClient.sendMuteStatus({
            roomId,
            userId: currentUserId,
            isMuted
        });
    }
    
    showToast(isMuted ? '已静音' : '已取消静音', 'info');
}

// 切换扬声器状态
function toggleSpeaker() {
    isSpeakerOn = !isSpeakerOn;
    
    // 更新UI
    const speakerBtn = document.getElementById('speakerBtn');
    if (speakerBtn) {
        speakerBtn.innerHTML = isSpeakerOn ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    }
    
    showToast(isSpeakerOn ? '扬声器已开启' : '扬声器已关闭', 'info');
}

// 显示通话面板
function showCallPanel() {
    const callPanel = document.getElementById('voiceCallPanel');
    if (callPanel) {
        callPanel.style.display = 'block';
    }
    
    // 更新通话按钮状态
    const callBtn = document.getElementById('callBtn');
    if (callBtn) {
        callBtn.classList.add('in-call');
        callBtn.innerHTML = '<i class="fas fa-phone-slash"></i>';
    }
    
    // 开始计时
    startCallTimer();
}

// 隐藏通话面板
function hideCallPanel() {
    const callPanel = document.getElementById('voiceCallPanel');
    if (callPanel) {
        callPanel.style.display = 'none';
    }
    
    // 更新通话按钮状态
    const callBtn = document.getElementById('callBtn');
    if (callBtn) {
        callBtn.classList.remove('in-call');
        callBtn.innerHTML = '<i class="fas fa-phone"></i>';
    }
    
    // 停止计时
    stopCallTimer();
}

// 显示来电提示
function showIncomingCallModal(callerName) {
    const modal = document.getElementById('incomingCallModal');
    const callerNameElement = document.getElementById('incomingCallerName');
    
    if (modal && callerNameElement) {
        callerNameElement.textContent = callerName;
        modal.style.display = 'flex';
        
        // 播放来电铃声（可选）
        // playIncomingCallSound();
    }
}

// 隐藏来电提示
function hideIncomingCallModal() {
    const modal = document.getElementById('incomingCallModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 更新通话UI
function updateCallUI() {
    updateCallParticipants();
    updateCallDuration();
}

// 更新通话时长显示
function updateCallDuration() {
    const durationElement = document.getElementById('callDuration');
    if (!durationElement) return;
    
    if (callStartTime && isInCall) {
        const duration = Math.floor((Date.now() - callStartTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        durationElement.textContent = timeString;
    } else {
        durationElement.textContent = '00:00';
    }
}

// 更新通话参与者列表
function updateCallParticipants() {
    const participantsList = document.getElementById('callParticipantsList');
    const participantsCount = document.getElementById('callParticipants');
    
    if (!participantsList) return;
    
    participantsList.innerHTML = '';
    
    // 添加当前用户
    const currentUserDiv = document.createElement('div');
    currentUserDiv.className = 'call-participant';
    currentUserDiv.innerHTML = `
        <div class="call-participant-avatar">${currentUsername.charAt(0).toUpperCase()}</div>
        <div class="call-participant-info">
            <div class="call-participant-name">${currentUsername} (我)</div>
            <div class="call-participant-status ${isMuted ? 'muted' : 'online'}">
                <i class="fas fa-${isMuted ? 'microphone-slash' : 'microphone'}"></i>
                ${isMuted ? '已静音' : '在线'}
            </div>
        </div>
    `;
    participantsList.appendChild(currentUserDiv);
    
    // 添加其他参与者
    let otherParticipantsCount = 0;
    callParticipants.forEach(participantId => {
        if (participantId !== currentUserId) {
            // 首先尝试从参与者列表中找到
            let participant = participants.find(p => p.userId === participantId);
            
            // 如果找不到，创建一个临时的参与者对象
            if (!participant) {
                // 尝试从实时通信客户端获取用户信息
                if (window.realtimeClient && window.realtimeClient.socket) {
                    // 创建一个基于用户ID的临时参与者对象
                    participant = {
                        userId: participantId,
                        name: `用户${participantId.slice(-4)}`, // 使用用户ID的后4位作为显示名
                        status: 'online'
                    };
                } else {
                    // 如果无法获取用户信息，跳过这个参与者
                    console.warn(`无法找到参与者信息: ${participantId}`);
                    return;
                }
            }
            
            const participantDiv = document.createElement('div');
            participantDiv.className = 'call-participant';
            participantDiv.innerHTML = `
                <div class="call-participant-avatar">${participant.name.charAt(0).toUpperCase()}</div>
                <div class="call-participant-info">
                    <div class="call-participant-name">${participant.name}</div>
                    <div class="call-participant-status ${participant.isMuted ? 'muted' : 'online'}">
                        <i class="fas fa-${participant.isMuted ? 'microphone-slash' : 'microphone'}"></i>
                        ${participant.isMuted ? '已静音' : '在线'}
                    </div>
                </div>
            `;
            participantsList.appendChild(participantDiv);
            otherParticipantsCount++;
        }
    });
    
    // 更新参与者数量 - 确保显示正确的数量
    if (participantsCount) {
        const totalParticipants = callParticipants.size;
        participantsCount.textContent = `${totalParticipants} 人参与`;
        
        // 添加调试信息
        console.log(`📞 通话参与者更新:`, {
            callParticipantsSize: callParticipants.size,
            callParticipantsIds: Array.from(callParticipants),
            participantsArrayLength: participants.length,
            participantsIds: participants.map(p => p.userId),
            otherParticipantsCount,
            currentUserId
        });
    }
}

// 开始通话计时
function startCallTimer() {
    if (callDuration) return; // 避免重复启动
    
    callDuration = setInterval(() => {
        if (callStartTime) {
            const duration = Math.floor((Date.now() - callStartTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            const durationElement = document.getElementById('callDuration');
            if (durationElement) {
                durationElement.textContent = timeString;
            }
        }
    }, 1000);
}

// 停止通话计时
function stopCallTimer() {
    if (callDuration) {
        clearInterval(callDuration);
        callDuration = null;
    }
    
    const durationElement = document.getElementById('callDuration');
    if (durationElement) {
        durationElement.textContent = '00:00';
    }
}

// 检测设备类型
function detectDeviceType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // 检测移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // 检测iOS
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    
    // 检测Android
    const isAndroid = /Android/i.test(userAgent);
    
    return {
        isMobile,
        isIOS,
        isAndroid,
        isDesktop: !isMobile
    };
}

// 获取优化的音频约束
function getOptimizedAudioConstraints() {
    const device = detectDeviceType();
    
    if (device.isMobile) {
        console.log('📱 移动设备 - 使用强化的音频处理配置');
        return {
            echoCancellation: { exact: true },
            noiseSuppression: { exact: true },
            autoGainControl: { exact: true },
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
            googAudioMirroring: false,
            sampleRate: { ideal: 48000 },
            channelCount: { exact: 1 }
        };
    } else {
        console.log('💻 桌面设备 - 使用标准音频处理配置');
        return {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true,
            sampleRate: { ideal: 48000 },
            channelCount: { exact: 1 }
        };
    }
}

// 检测网络是否不稳定
function isNetworkUnstable() {
    // 检测是否存在失败的连接
    let hasFailedConnections = false;
    peerConnections.forEach((pc, userId) => {
        if (pc.iceConnectionState === 'failed' || 
            pc.iceConnectionState === 'disconnected' ||
            (pc.iceConnectionState === 'new' && pc.signalingState === 'have-local-offer')) {
            hasFailedConnections = true;
        }
    });
    
    // 如果有失败的连接，认为网络不稳定
    if (hasFailedConnections) {
        console.log('🚨 检测到网络不稳定：存在失败连接');
        return true;
    }
    
    // 检测WebSocket连接质量
    if (window.realtimeClient && window.realtimeClient.socket) {
        const socket = window.realtimeClient.socket;
        if (!socket.connected || (socket.ping && socket.ping > 1000)) {
            console.log('🚨 检测到网络不稳定：WebSocket连接差');
            return true;
        }
    }
    
    return false;
}

// WebRTC连接处理 - 智能选择连接配置
function createPeerConnection(userId, enhanced = false) {
    // 🚀 检测到网络不稳定或明确要求时，直接使用增强模式
    if (enhanced || isNetworkUnstable()) {
        console.log('🚀 网络不稳定或明确要求，使用增强连接配置...');
        return createEnhancedPeerConnection(userId);
    }
    // 若啟用僅走 TURN（relay-only），以最小可用 TURN 集合覆蓋配置
    if (forceRelayMode) {
        console.warn('🛡️ 已啟用 relay-only 模式，將僅使用 TURN 轉發');
        const relayServers = [];
        if (preferredTurnServer) relayServers.push(preferredTurnServer);
        // 後備公共 TURN（注意：公共服務可靠性有限，建議配置自有 TURN）
        relayServers.push(
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
        );
        const relayConfig = {
            iceServers: relayServers,
            iceTransportPolicy: 'relay',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            iceCandidatePoolSize: 10
        };
        const relayPc = new RTCPeerConnection(relayConfig);
        if (localStream) {
            localStream.getTracks().forEach(track => relayPc.addTrack(track, localStream));
        }
        peerConnections.set(userId, relayPc);
        return relayPc;
    }

    const configuration = {
        iceServers: [
            // Google公共STUN服务器
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            
            // 其他公共STUN服务器
            { urls: 'stun:stunserver.org' },
            { urls: 'stun:stun.voiparound.com' },
            { urls: 'stun:stun.voipbuster.com' },
            { urls: 'stun:stun.ekiga.net' },
            { urls: 'stun:stun.ideasip.com' },
            
            // 多个TURN服务器提供商 - 提高连接成功率
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turns:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            
            // 备用免费TURN服务器
            {
                urls: 'turn:relay1.expressturn.com:3478',
                username: 'ef4CVDZETE4TAMK426',
                credential: 'ugBu0jkKWIE6tIGG'
            },
            {
                urls: 'turns:relay1.expressturn.com:5349',
                username: 'ef4CVDZETE4TAMK426',
                credential: 'ugBu0jkKWIE6tIGG'
            },
            
            // 更多免费TURN选项
            {
                urls: 'turn:numb.viagenie.ca:3478',
                username: 'webrtc@live.com',
                credential: 'muazkh'
            },
            {
                urls: 'turns:numb.viagenie.ca:5349',
                username: 'webrtc@live.com', 
                credential: 'muazkh'
            },
            
            // 额外的免费TURN服务器
            {
                urls: 'turn:turn.bistri.com:80',
                username: 'homeo',
                credential: 'homeo'
            },
            {
                urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
                username: 'webrtc',
                credential: 'webrtc'
            },
            
            // 备用的高可用性TURN服务器
            {
                urls: 'turn:global.relay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:global.relay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ],
        iceCandidatePoolSize: 15, // 增加ICE候选池大小
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all' // 允许所有传输类型
    };
    
    console.log('🔧 WebRTC配置详情:', {
        STUN服务器数量: configuration.iceServers.filter(s => s.urls.includes('stun:')).length,
        TURN服务器数量: configuration.iceServers.filter(s => s.urls.includes('turn:')).length,
        TURNS服务器数量: configuration.iceServers.filter(s => s.urls.includes('turns:')).length,
        ICE候选池大小: configuration.iceCandidatePoolSize
    });
    
    const peerConnection = new RTCPeerConnection(configuration);
    
    // 设置连接超时计时器
    const connectionTimeout = setTimeout(() => {
        if (peerConnection.iceConnectionState === 'new' || 
            peerConnection.iceConnectionState === 'checking' ||
            peerConnection.iceConnectionState === 'disconnected') {
            console.error('⏰ ICE连接超时! 用户:', userId);
            console.log('🔍 连接状态详情:', {
                iceConnectionState: peerConnection.iceConnectionState,
                connectionState: peerConnection.connectionState,
                signalingState: peerConnection.signalingState,
                iceGatheringState: peerConnection.iceGatheringState
            });
            
            // 触发重连
            handleConnectionTimeout(userId, peerConnection);
        }
    }, 30000); // 30秒超时
    
    // 保存超时器引用
    peerConnection._connectionTimeout = connectionTimeout;
    
    // 添加连接状态监控 - 增强版
    let iceRestartCount = 0;
    const maxIceRestarts = 3;
    let lastConnectionTime = Date.now();
    
    peerConnection.oniceconnectionstatechange = () => {
        const currentTime = Date.now();
        const timeSinceLastChange = currentTime - lastConnectionTime;
        lastConnectionTime = currentTime;
        
        console.log('🔗 ICE连接状态变化:', peerConnection.iceConnectionState, '用户:', userId, 
                   `(距上次变化: ${timeSinceLastChange}ms)`);
        
        switch (peerConnection.iceConnectionState) {
            case 'new':
                console.log('🆕 ICE连接初始化中...');
                // 如果在"new"状态停留过久，尝试收集更多ICE候选
                setTimeout(() => {
                    if (peerConnection.iceConnectionState === 'new') {
                        console.warn('⚠️ ICE连接停留在new状态过久，可能存在网络问题');
                        // 记录网络状态以便诊断
                        console.log('🔍 网络诊断:', {
                            iceGatheringState: peerConnection.iceGatheringState,
                            signalingState: peerConnection.signalingState,
                            connectionState: peerConnection.connectionState
                        });
                    }
                }, 8000); // 8秒后检查
                break;
                
            case 'checking':
                console.log('🔍 ICE连接检查中...');
                break;
                
            case 'connected':
            case 'completed':
                console.log('✅ WebRTC连接建立成功! 用户:', userId);
                iceRestartCount = 0; // 重置重启计数
                showToast(`与用户 ${userId} 的连接已建立`, 'success');
                
                // 清除超时器
                if (peerConnection._connectionTimeout) {
                    clearTimeout(peerConnection._connectionTimeout);
                    peerConnection._connectionTimeout = null;
                }
                break;
                
            case 'disconnected':
                console.warn('⚠️ WebRTC连接断开, 用户:', userId);
                showToast(`与用户 ${userId} 的连接暂时中断`, 'warning');
                
                // 智能重连策略 - 基于断开时长调整
                const reconnectDelay = Math.min(5000 + (iceRestartCount * 2000), 15000);
                setTimeout(() => {
                    if (peerConnection.iceConnectionState === 'disconnected') {
                        console.log(`🔄 连接断开${reconnectDelay/1000}秒，尝试ICE重启...`);
                        if (iceRestartCount < maxIceRestarts) {
                            performIceRestart(peerConnection, userId);
                            iceRestartCount++;
                        } else {
                            console.error('❌ ICE重启次数已达上限，尝试完全重连...');
                            handleConnectionFailure(userId);
                        }
                    }
                }, reconnectDelay);
                break;
                
            case 'failed':
                console.error('❌ WebRTC连接失败, 用户:', userId);
                showToast(`与用户 ${userId} 的连接失败`, 'error');
                
                // 清除超时器
                if (peerConnection._connectionTimeout) {
                    clearTimeout(peerConnection._connectionTimeout);
                    peerConnection._connectionTimeout = null;
                }
                
                // 根据失败原因选择恢复策略
                if (iceRestartCount < maxIceRestarts && 
                    peerConnection.signalingState === 'stable') {
                    console.log('🔄 尝试ICE重启恢复连接...');
                    performIceRestart(peerConnection, userId);
                    iceRestartCount++;
                } else {
                    console.log('🔄 ICE重启无效，执行完全重连...');
                    handleConnectionFailure(userId);
                }
                break;
                
            case 'closed':
                console.log('🔒 WebRTC连接已关闭, 用户:', userId);
                // 清除超时器和重启计数
                if (peerConnection._connectionTimeout) {
                    clearTimeout(peerConnection._connectionTimeout);
                    peerConnection._connectionTimeout = null;
                }
                iceRestartCount = 0;
                break;
        }
    };
    
    peerConnection.onconnectionstatechange = () => {
        console.log('🔗 连接状态变化:', peerConnection.connectionState);
    };
    
    // 添加本地流 - 增强日志
    if (localStream) {
        console.log('🎙️ ===== 添加本地流到WebRTC连接 =====');
        console.log('👤 目标用户:', userId);
        console.log('📦 本地流信息:', {
            streamId: localStream.id,
            音频轨道数量: localStream.getAudioTracks().length,
            视频轨道数量: localStream.getVideoTracks().length
        });
        
        localStream.getTracks().forEach((track, index) => {
            console.log(`📡 添加轨道 ${index + 1}:`, {
                kind: track.kind,
                id: track.id,
                label: track.label,
                enabled: track.enabled,
                readyState: track.readyState,
                muted: track.muted
            });
            
            try {
                const sender = peerConnection.addTrack(track, localStream);
                console.log('✅ 轨道添加成功, sender:', !!sender);
            } catch (error) {
                console.error('❌ 添加轨道失败:', error);
            }
        });
        
        console.log('🎙️ ===== 本地流添加完成 =====');
    } else {
        console.error('❌ 没有本地流可添加!');
    }
    
        // 处理远程流 - 增强版流恢复机制
    peerConnection.ontrack = (event) => {
        console.log('📡 ===== 收到远程音频流 =====');
        console.log('👤 用户ID:', userId);
        console.log('📦 事件详情:', {
            streams数量: event.streams.length,
            track详情: event.track ? {
                kind: event.track.kind,
                id: event.track.id,
                label: event.track.label,
                enabled: event.track.enabled,
                readyState: event.track.readyState,
                muted: event.track.muted
            } : '无track信息'
        });
        
        if (event.streams.length > 0) {
            const stream = event.streams[0];
            console.log('🎵 音频流信息:', {
                streamId: stream.id,
                音频轨道数量: stream.getAudioTracks().length,
                音频轨道详情: stream.getAudioTracks().map(track => ({
                    id: track.id,
                    label: track.label,
                    enabled: track.enabled,
                    readyState: track.readyState,
                    muted: track.muted
                }))
            });
            
            // 检查是否已存在该用户的流，如果存在则先清理
            if (remoteStreams.has(userId)) {
                console.log('🧹 检测到用户已有远程流，先清理旧流...');
                const oldStream = remoteStreams.get(userId);
                if (oldStream) {
                    oldStream.getTracks().forEach(track => {
                        track.stop();
                        console.log('🛑 停止旧音频轨道:', track.id);
                    });
                }
                
                // 清理旧的音频元素
                const oldAudioElement = document.getElementById(`remote-audio-${userId}`);
                if (oldAudioElement) {
                    oldAudioElement.pause();
                    oldAudioElement.srcObject = null;
                    oldAudioElement.remove();
                    console.log('🗑️ 移除旧音频元素');
                }
            }
            
            remoteStreams.set(userId, stream);
            console.log('✅ 远程流已保存到Map, 当前远程流数量:', remoteStreams.size);
            
            // 添加流状态监控
            stream.getAudioTracks().forEach(track => {
                track.onended = () => {
                    console.warn('⚠️ 远程音频轨道结束:', track.id, '用户:', userId);
                    // 尝试自动恢复流
                    setTimeout(() => {
                        if (!remoteStreams.has(userId) || 
                            remoteStreams.get(userId).getAudioTracks().length === 0) {
                            console.log('🔄 检测到流丢失，尝试自动恢复...');
                            autoRecoverStream(userId);
                        }
                    }, 2000); // 2秒后检查是否需要恢复
                };
                
                track.onmute = () => {
                    console.warn('🔇 远程音频轨道被静音:', track.id, '用户:', userId);
                };
                
                track.onunmute = () => {
                    console.log('🔊 远程音频轨道取消静音:', track.id, '用户:', userId);
                };
            });
            
            // 创建增强的音频播放元素
            const audioElement = createEnhancedAudioElement(userId, stream);
            console.log('✅ 增强音频播放元素创建完成');
            
            showToast(`收到用户 ${userId} 的音频流`, 'success');
            
            audioElement.onpause = () => {
                console.log('⏸️ 远程音频暂停 - 用户:', userId);
            };
            
            audioElement.onended = () => {
                console.log('🏁 远程音频结束 - 用户:', userId);
        };
        
        audioElement.onerror = (error) => {
                console.error('❌ 远程音频播放错误 - 用户:', userId, {
                    error: error,
                    code: audioElement.error ? audioElement.error.code : '未知',
                    message: audioElement.error ? audioElement.error.message : '未知错误'
                });
            };
            
            audioElement.onabort = () => {
                console.warn('⚠️ 远程音频播放中止 - 用户:', userId);
            };
            
            audioElement.onstalled = () => {
                console.warn('⚠️ 远程音频播放停滞 - 用户:', userId);
            };
            
            audioElement.onwaiting = () => {
                console.log('⏳ 远程音频等待数据 - 用户:', userId);
            };
            
            // 设置音频元素ID以便管理
            audioElement.id = `remote-audio-${userId}`;
            audioElement.setAttribute('data-user-id', userId);
            
            console.log('📝 音频元素ID设置:', audioElement.id);
            
            // 添加到DOM
        document.body.appendChild(audioElement);
            console.log('✅ 音频元素已添加到DOM');
            
            // 验证添加是否成功
            const verifyElement = document.getElementById(`remote-audio-${userId}`);
            if (verifyElement) {
                console.log('✅ 音频元素添加验证成功');
            } else {
                console.error('❌ 音频元素添加验证失败!');
            }
        } else {
            console.error('❌ 没有接收到音频流!');
        }
        
        console.log('📡 ===== 远程音频流处理完成 =====');
    };
    
    // 处理ICE候选 - 增强日志和统计
    let candidateStats = {
        host: 0,
        srflx: 0,  // STUN候选
        relay: 0   // TURN候选
    };
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            const candidate = event.candidate;
            
            // 统计候选类型
            if (candidateStats[candidate.type] !== undefined) {
                candidateStats[candidate.type]++;
            }
            
            console.log('🧊 收集到ICE候选:', {
                用户ID: userId,
                候选类型: candidate.type,
                协议: candidate.protocol,
                地址: candidate.address,
                端口: candidate.port,
                foundation: candidate.foundation,
                priority: candidate.priority,
                relatedAddress: candidate.relatedAddress,
                relatedPort: candidate.relatedPort,
                统计: candidateStats
            });
            
            // 特别标注TURN候选
            if (candidate.type === 'relay') {
                console.log('🎉 重要: 收集到TURN候选(relay)! 这对跨网络通话至关重要');
            }
            
            if (isRealtimeEnabled && window.realtimeClient) {
                window.realtimeClient.sendIceCandidate({
                    roomId,
                    targetUserId: userId,
                    candidate: event.candidate,
                    fromUserId: currentUserId
                });
                console.log('📤 已发送ICE候选给用户:', userId, '类型:', candidate.type);
            } else {
                console.error('❌ 无法发送ICE候选 - 实时通信未启用');
            }
        } else {
            console.log('🏁 ICE候选收集完成 - 用户:', userId);
            console.log('📊 最终候选统计:', {
                用户ID: userId,
                host候选: candidateStats.host,
                STUN候选: candidateStats.srflx,
                TURN候选: candidateStats.relay,
                总计: candidateStats.host + candidateStats.srflx + candidateStats.relay
            });
            
            // 如果没有TURN候选，发出警告
            if (candidateStats.relay === 0) {
                console.warn('⚠️ 警告: 没有收集到TURN候选! 跨网络通话可能失败');
                console.warn('💡 建议: 运行 testNetworkConnectivity() 检查TURN服务器连接');
            }
        }
    };
    
    peerConnections.set(userId, peerConnection);
    return peerConnection;
}

// 处理连接超时 - 增加自动诊断
async function handleConnectionTimeout(userId, peerConnection) {
    console.log('⏰ ===== 处理连接超时 =====');
    console.log('👤 用户ID:', userId);
    console.log('🔍 超时时连接状态:', {
        iceConnectionState: peerConnection.iceConnectionState,
        connectionState: peerConnection.connectionState,
        signalingState: peerConnection.signalingState,
        iceGatheringState: peerConnection.iceGatheringState
    });
    
    // 🔥 自动运行网络诊断
    console.log('🔍 连接超时，自动运行网络诊断...');
    await autoRunNetworkDiagnosis();
    
    // 🔥 自动显示完整状态信息
    autoShowCompleteStatus();
    
    // 尝试ICE重启
    if (peerConnection.signalingState === 'stable') {
        console.log('🔄 尝试ICE重启...');
        try {
            peerConnection.restartIce();
            console.log('✅ ICE重启请求已发送');
            
            // 等待一段时间看是否恢复
            setTimeout(() => {
                if (peerConnection.iceConnectionState === 'new' || peerConnection.iceConnectionState === 'checking') {
                    console.warn('⚠️ ICE重启后仍未连接，强制重建连接');
                    handleConnectionFailure(userId);
                }
            }, 10000);
        } catch (error) {
            console.error('❌ ICE重启失败:', error);
            handleConnectionFailure(userId);
        }
    } else {
        console.log('⚠️ 信令状态不稳定，直接重建连接');
        handleConnectionFailure(userId);
    }
    
    console.log('⏰ ===== 连接超时处理完成 =====');
}

// 处理连接失败 - 增强版
function handleConnectionFailure(userId) {
    console.log('🔄 ===== 处理连接失败 =====');
    console.log('👤 用户ID:', userId);
    
    const peerConnection = peerConnections.get(userId);
    if (peerConnection) {
        // 清除超时器
        if (peerConnection._connectionTimeout) {
            clearTimeout(peerConnection._connectionTimeout);
            peerConnection._connectionTimeout = null;
        }
        
        // 记录失败前的状态
        console.log('📊 失败前连接状态:', {
            iceConnectionState: peerConnection.iceConnectionState,
            connectionState: peerConnection.connectionState,
            signalingState: peerConnection.signalingState,
            iceGatheringState: peerConnection.iceGatheringState
        });
        
        // 关闭失败的连接
        peerConnection.close();
        peerConnections.delete(userId);
        
        // 移除对应的远程流
        if (remoteStreams.has(userId)) {
            remoteStreams.delete(userId);
            console.log('🗑️ 移除远程流:', userId);
        }
        
        // 移除对应的音频元素
        const audioElement = document.getElementById(`remote-audio-${userId}`);
        if (audioElement) {
            audioElement.pause();
            audioElement.srcObject = null;
            audioElement.remove();
            console.log('🗑️ 移除音频元素:', userId);
        }
        
        console.log('🧹 连接资源清理完成');
        
        // 🔥 自动尝试修复连接
        if (isInCall && callParticipants.has(userId)) {
            console.log('🔄 准备自动修复连接...');
            
            // 短暂延迟后自动尝试修复
            setTimeout(async () => {
                await autoAttemptConnectionRepair(userId);
            }, 3000); // 3秒延迟
        } else {
            console.log('⚠️ 不在通话中或用户不在参与者列表，跳过修复');
        }
    } else {
        console.warn('⚠️ 找不到要处理的连接');
    }
    
    console.log('🔄 ===== 连接失败处理完成 =====');
}

// 处理通话邀请
function handleCallInvite(data) {
    console.log('📞 收到通话邀请:', data);
    console.log('📞 当前用户ID:', currentUserId, '当前用户名:', currentUsername);
    console.log('📞 是否已在通话中:', isInCall);
    
    if (isInCall) {
        // 如果已在通话中，自动拒绝
        console.log('📞 已在通话中，自动拒绝邀请');
        if (isRealtimeEnabled && window.realtimeClient) {
            window.realtimeClient.sendCallReject({
                roomId,
                userId: currentUserId,
                reason: 'busy'
            });
        }
        return;
    }
    
    // 保存呼叫者信息，用于后续处理
    window.incomingCallData = data;
    
    console.log('📞 显示来电提示，呼叫者:', data.callerName);
    showIncomingCallModal(data.callerName);
}

// 处理通话接受 - 增强日志和WebRTC连接
async function handleCallAccept(data) {
    console.log('📞 ===== 用户接受通话 =====');
    console.log('👤 接受用户:', data.userId, data.userName);
    console.log('🏠 房间ID:', data.roomId);
    
    // 验证是否是当前房间
    if (data.roomId && data.roomId !== roomId) {
        console.warn('⚠️ 房间ID不匹配，忽略此接受事件');
        return;
    }
    
    // 添加到参与者列表
    callParticipants.add(data.userId);
    
    // 确保当前用户也在参与者列表中
    if (!callParticipants.has(currentUserId)) {
        callParticipants.add(currentUserId);
    }
    
    console.log('👥 当前参与者:', Array.from(callParticipants));
    
    // 🔥 关键修复：创建WebRTC连接并开始协商
    console.log('🔗 为接受用户创建WebRTC连接...');
    const peerConnection = createPeerConnection(data.userId, true); // 🚀 使用增强模式
    
    // 确定谁应该发起offer（使用用户ID排序避免双向offer）
    const shouldInitiateOffer = currentUserId < data.userId;
    
    if (shouldInitiateOffer) {
        console.log('📤 我方发起WebRTC Offer给用户:', data.userId);
        
        try {
    // 创建并发送offer
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            console.log('✅ Offer创建成功, 类型:', offer.type);
            
            await peerConnection.setLocalDescription(offer);
            console.log('✅ 本地描述设置成功');
            
            // 发送offer给对方
            if (isRealtimeEnabled && window.realtimeClient && window.realtimeClient.socket && window.realtimeClient.socket.connected) {
                window.realtimeClient.sendCallOffer({
                    roomId,
                    targetUserId: data.userId,
                    offer: peerConnection.localDescription,
                    fromUserId: currentUserId
                });
                console.log('📤 Offer已发送给用户:', data.userId);
            } else {
                console.error('❌ 无法发送Offer - WebSocket未连接');
            }
            
        } catch (error) {
            console.error('❌ 创建或发送Offer失败:', error);
        }
    } else {
        console.log('📥 等待用户', data.userId, '发送Offer给我...');
    }
    
    updateCallUI();
    
    showToast(`${data.userName || data.userId} 加入了通话`, 'success');
    console.log('📞 ===== 通话接受处理完成 =====');
}

// 处理通话拒绝
function handleCallReject(data) {
    console.log('📞 用户拒绝通话:', data);
    
    callParticipants.delete(data.userId);
    updateCallUI();
    
    if (data.reason === 'busy') {
        showToast('对方正在通话中', 'warning');
    }
}

// 处理通话结束
function handleCallEnd(data) {
    // 临时注释掉日志以减少输出
    // console.log('📞 用户结束通话:', data);
    
    // 防止重复处理同一个用户的结束事件
    if (!callParticipants.has(data.userId)) {
        console.log('📞 用户已离开通话，跳过重复处理');
        return;
    }
    
    callParticipants.delete(data.userId);
    
    // 关闭对等连接
    const peerConnection = peerConnections.get(data.userId);
    if (peerConnection) {
        peerConnection.close();
        peerConnections.delete(data.userId);
    }
    
    // 移除远程流
    remoteStreams.delete(data.userId);
    
    updateCallUI();
    
    // 只有当自己是最后一个参与者时才结束通话，避免循环触发
    if (callParticipants.size <= 1 && callParticipants.has(currentUserId)) {
        console.log('📞 只剩自己，结束通话');
        // 直接清理资源，不发送callEnd事件
        cleanupCallResources();
    }
}

// 同步通话参与者数据
function syncCallParticipants() {
    if (!isInCall) return;
    
    // 确保当前用户在参与者列表中
    if (!callParticipants.has(currentUserId)) {
        callParticipants.add(currentUserId);
    }
    
    // 更新UI
    updateCallUI();
    
    console.log('📞 同步通话参与者数据:', {
        callParticipantsSize: callParticipants.size,
        callParticipantsIds: Array.from(callParticipants),
        currentUserId
    });
}

// 处理WebRTC offer - 增强日志
async function handleCallOffer(data) {
    console.log('📞 ===== 处理WebRTC Offer =====');
    console.log('👤 来源用户:', data.fromUserId);
    console.log('📦 Offer详情:', {
        type: data.offer.type,
        sdp: data.offer.sdp ? '已包含SDP' : '无SDP'
    });
    
    console.log('🔗 创建对等连接...');
    const peerConnection = createPeerConnection(data.fromUserId, true); // 🚀 使用增强模式
    
    try {
        console.log('📝 设置远程描述...');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        console.log('✅ 远程描述设置成功');
        
        console.log('📝 创建Answer...');
        const answer = await peerConnection.createAnswer();
        console.log('✅ Answer创建成功, 类型:', answer.type);
        
        console.log('📝 设置本地描述...');
        await peerConnection.setLocalDescription(answer);
        console.log('✅ 本地描述设置成功');
        
        console.log('🔗 WebRTC连接状态:', {
            iceConnectionState: peerConnection.iceConnectionState,
            connectionState: peerConnection.connectionState,
            signalingState: peerConnection.signalingState,
            iceGatheringState: peerConnection.iceGatheringState
        });
        
        if (isRealtimeEnabled && window.realtimeClient) {
            console.log('📤 发送Answer给用户:', data.fromUserId);
            window.realtimeClient.sendCallAnswer({
                roomId,
                targetUserId: data.fromUserId,
                answer: peerConnection.localDescription,
                fromUserId: currentUserId
            });
            console.log('✅ Answer已发送');
        } else {
            console.error('❌ 无法发送Answer - 实时通信未启用');
        }
    } catch (error) {
        console.error('❌ 处理offer失败:', error);
        console.error('错误详情:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    }
    
    console.log('📞 ===== Offer处理完成 =====');
}

// 处理WebRTC answer - 增强日志
async function handleCallAnswer(data) {
    console.log('📞 ===== 处理WebRTC Answer =====');
    console.log('👤 来源用户:', data.fromUserId);
    console.log('📦 Answer详情:', {
        type: data.answer.type,
        sdp: data.answer.sdp ? '已包含SDP' : '无SDP'
    });
    
    const peerConnection = peerConnections.get(data.fromUserId);
    if (peerConnection) {
        console.log('🔗 找到对等连接, 当前状态:', {
            iceConnectionState: peerConnection.iceConnectionState,
            connectionState: peerConnection.connectionState,
            signalingState: peerConnection.signalingState,
            iceGatheringState: peerConnection.iceGatheringState
        });
        
        try {
            // 检查连接状态，只有在have-local-offer状态下才能设置远程描述
            if (peerConnection.signalingState === 'have-local-offer') {
                console.log('✅ 信令状态正确，设置远程描述...');
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                console.log('✅ Answer设置成功，新的信令状态:', peerConnection.signalingState);
                
                // 处理暂存的ICE候选
                if (peerConnection.pendingIceCandidates && peerConnection.pendingIceCandidates.length > 0) {
                    console.log('📦 处理暂存的ICE候选, 数量:', peerConnection.pendingIceCandidates.length);
                    for (const candidate of peerConnection.pendingIceCandidates) {
                        try {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                            console.log('✅ 暂存ICE候选添加成功');
                        } catch (error) {
                            console.error('❌ 添加暂存ICE候选失败:', error);
                        }
                    }
                    peerConnection.pendingIceCandidates = [];
                    console.log('✅ 所有暂存ICE候选处理完成');
                }
                
                console.log('🔗 Answer处理后的连接状态:', {
                    iceConnectionState: peerConnection.iceConnectionState,
                    connectionState: peerConnection.connectionState,
                    signalingState: peerConnection.signalingState,
                    iceGatheringState: peerConnection.iceGatheringState
                });
            } else {
                console.warn('⚠️ 信令状态不正确，无法设置answer');
                console.warn('当前状态:', peerConnection.signalingState, '期望状态: have-local-offer');
            }
        } catch (error) {
            console.error('❌ 处理answer失败:', error);
            console.error('错误详情:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
    } else {
        console.error('❌ 找不到对应的对等连接! 用户ID:', data.fromUserId);
        console.log('🔍 当前所有对等连接:', Array.from(peerConnections.keys()));
    }
    
    console.log('📞 ===== Answer处理完成 =====');
}

// 处理ICE候选 - 增强日志
async function handleIceCandidate(data) {
    console.log('🧊 ===== 处理ICE候选 =====');
    console.log('👤 来源用户:', data.fromUserId);
    console.log('🎯 目标用户:', data.targetUserId);
    console.log('📦 候选信息:', {
        type: data.candidate.type,
        protocol: data.candidate.protocol,
        address: data.candidate.address,
        port: data.candidate.port,
        foundation: data.candidate.foundation,
        priority: data.candidate.priority,
        component: data.candidate.component
    });
    
    const peerConnection = peerConnections.get(data.fromUserId);
    if (peerConnection) {
        console.log('🔗 找到对等连接, 当前状态:', {
            iceConnectionState: peerConnection.iceConnectionState,
            connectionState: peerConnection.connectionState,
            signalingState: peerConnection.signalingState,
            hasRemoteDescription: !!peerConnection.remoteDescription
        });
        
        try {
            // 检查连接状态，确保远程描述已设置
            if (peerConnection.remoteDescription) {
                console.log('✅ 远程描述已设置，添加ICE候选...');
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log('✅ ICE候选添加成功');
            } else {
                // 如果远程描述还未设置，将ICE候选存储起来稍后处理
                console.warn('⚠️ 远程描述未设置，暂存ICE候选');
                if (!peerConnection.pendingIceCandidates) {
                    peerConnection.pendingIceCandidates = [];
                }
                peerConnection.pendingIceCandidates.push(data.candidate);
                console.log('📦 ICE候选已暂存, 暂存队列长度:', peerConnection.pendingIceCandidates.length);
            }
        } catch (error) {
            console.error('❌ 添加ICE候选失败:', error);
        }
    } else {
        console.error('❌ 找不到对应的对等连接! 用户ID:', data.fromUserId);
        console.log('🔍 当前所有对等连接:', Array.from(peerConnections.keys()));
    }
    
    console.log('🧊 ===== ICE候选处理完成 =====');
}

// 处理静音状态
function handleMuteStatus(data) {
    console.log('📞 收到静音状态:', data);
    
    // 更新参与者列表中的静音状态
    const participant = participants.find(p => p.userId === data.userId);
    if (participant) {
        participant.isMuted = data.isMuted;
        updateCallParticipants();
    }
}

// 处理转录状态变化
function handleTranscriptionStatusChange(data) {
    console.log('📝 转录状态变化:', data);
    
    if (data.action === 'start') {
        showToast(`${data.username} 开始了转录`, 'info');
        console.log(`📝 ${data.username} 开始转录`);
    } else if (data.action === 'stop') {
        showToast(`${data.username} 停止了转录`, 'info');
        console.log(`📝 ${data.username} 停止转录`);
    }
}

// 处理转录结果
function handleTranscriptionResult(data) {
    console.log('📝 收到转录结果:', data);
    
    if (data.type === 'xfyun') {
        // 显示转录结果到实时记录框
        displayTranscriptionResult(data);
        
        // 如果不是临时结果，更新全局转录文本用于下载
        if (!data.isPartial && data.result) {
            updateGlobalTranscriptionText(data);
        }
    }
}

// 显示转录结果到实时记录框
function displayTranscriptionResult(data) {
    const transcriptionHistory = document.getElementById('transcriptionHistory');
    if (!transcriptionHistory) return;
    
    // 隐藏占位符
    const placeholder = transcriptionHistory.querySelector('.transcription-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    // 获取或创建累积转录容器
    let cumulativeDiv = document.getElementById('cumulativeTranscription');
    if (!cumulativeDiv) {
        cumulativeDiv = document.createElement('div');
        cumulativeDiv.id = 'cumulativeTranscription';
        cumulativeDiv.className = 'cumulative-transcription';
        cumulativeDiv.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 15px;
            font-size: 14px;
            line-height: 1.8;
            color: #374151;
            min-height: 100px;
            white-space: pre-wrap;
            word-wrap: break-word;
            border: 2px solid #3b82f6;
            border-left: 4px solid #3b82f6;
            background: linear-gradient(135deg, #eff6ff, #dbeafe);
        `;
        transcriptionHistory.appendChild(cumulativeDiv);
    }
    
    // 初始化全局转录文本（如果不存在）
    if (!window.transcriptionClient) {
        window.transcriptionClient = { fullTranscriptionText: '' };
    }
    
    // 避免重复：检查是否已经包含在全文中
    if (data.result && data.result.trim()) {
        const cleanText = data.result.trim();
        if (window.transcriptionClient.fullTranscriptionText.includes(cleanText)) {
            console.log('🚫 跳过重复的转录结果:', cleanText);
            return;
        }
    }
    
    if (data.isPartial) {
        // 临时结果：显示为蓝色动画预览
        const finalText = window.transcriptionClient.fullTranscriptionText;
        const previewHtml = finalText + 
            '<span class="current-preview" style="color: #2563eb; background: rgba(37, 99, 235, 0.15); padding: 2px 4px; border-radius: 3px; animation: pulse 1.5s infinite;">' + 
            data.result + '</span>';
        cumulativeDiv.innerHTML = previewHtml;
    } else {
        // 最终结果：添加到累积文本
        if (data.result && data.result.trim()) {
            if (window.transcriptionClient.fullTranscriptionText.length > 0) {
                window.transcriptionClient.fullTranscriptionText += ' ';
            }
            window.transcriptionClient.fullTranscriptionText += data.result.trim();
            cumulativeDiv.textContent = window.transcriptionClient.fullTranscriptionText;
            
            // 显示下载按钮
            const downloadBtn = document.getElementById('downloadBtn');
            if (downloadBtn && window.transcriptionClient.fullTranscriptionText.length > 0) {
                downloadBtn.style.display = 'block';
            }
        }
    }
    
    // 自动滚动到底部
    transcriptionHistory.scrollTop = transcriptionHistory.scrollHeight;
}

// 更新全局转录文本（用于下载）
function updateGlobalTranscriptionText(data) {
    if (!window.transcriptionClient) {
        window.transcriptionClient = { fullTranscriptionText: '' };
    }
    
    if (data.result && data.result.trim()) {
        // 避免重复添加相同内容
        const newText = data.result.trim();
        if (!window.transcriptionClient.fullTranscriptionText.includes(newText)) {
            if (window.transcriptionClient.fullTranscriptionText.length > 0) {
                window.transcriptionClient.fullTranscriptionText += ' ';
            }
            window.transcriptionClient.fullTranscriptionText += newText;
            
            console.log('📝 已更新全局转录文本，总长度:', window.transcriptionClient.fullTranscriptionText.length);
        }
    }
}
    
    showUsernameModal();
    registerServiceWorker();
    setupOfflineIndicator();
    

    
    // 监听localStorage变化，实现跨标签页同步
    window.addEventListener('storage', handleStorageChange);
    
    // 定期同步参与者在线状态
    setInterval(syncParticipantsStatus, 30000);
    
    // 定期同步通话参与者数据
    setInterval(() => {
        if (isInCall) {
            syncCallParticipants();
        }
    }, 5000);
    
    // Hugging Face环境提示
    if (window.location.hostname.includes('huggingface.co')) {
        // 显示侧边栏提示
        const hfNotice = document.getElementById('hfNotice');
        if (hfNotice) {
            hfNotice.style.display = 'block';
        }
        
        setTimeout(() => {
            showToast('💡 提示：现在支持多端实时聊天！配置WebSocket服务器后即可使用', 'info');
        }, 3000);
    }
// 设置事件监听器
function setupEventListeners() {
    messageInput.addEventListener('keydown', handleKeyDown);
    messageInput.addEventListener('input', autoResizeTextarea);
    
    // 实时输入提示 - 优化版本
    messageInput.addEventListener('input', handleTypingIndicator);
    
    // 处理输入法事件，减少输入法状态变化的影响
    messageInput.addEventListener('compositionstart', () => {
        // 输入法开始输入时，暂时不发送输入提示
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
    });
    
    messageInput.addEventListener('compositionend', () => {
        // 输入法结束输入时，延迟发送输入提示
        setTimeout(() => {
            if (messageInput.value.trim()) {
                handleTypingIndicator();
            }
        }, 300);
    });
    
    // 用户名输入事件
    usernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setUsername();
        }
    });
    
    // 点击外部关闭模态框
    askAIModal.addEventListener('click', (e) => {
        if (e.target === askAIModal) {
            closeAskAIModal();
        }
    });
    
    // 参与者搜索功能
    const participantsSearch = document.getElementById('participantsSearch');
    if (participantsSearch) {
        participantsSearch.addEventListener('input', (e) => {
            filterParticipants(e.target.value);
        });
    }
    
    // 聊天记录搜索功能
    const chatSearchInput = document.getElementById('chatSearchInput');
    if (chatSearchInput) {
        chatSearchInput.addEventListener('input', (e) => {
            searchChatMessages(e.target.value);
        });
    }
}

// 处理键盘事件
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// 处理输入提示 - 优化版本
let lastTypingTime = 0;
let typingState = false;

function handleTypingIndicator() {
    if (!isRealtimeEnabled || !window.realtimeClient) return;
    
    const now = Date.now();
    
    // 防止过于频繁的状态更新（至少间隔500ms）
    if (now - lastTypingTime < 500) {
        return;
    }
    
    lastTypingTime = now;
    
    // 如果当前不在输入状态，才发送开始输入信号
    if (!typingState) {
        typingState = true;
        window.realtimeClient.sendTypingIndicator(true);
    }
    
    // 清除之前的定时器
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // 3秒后停止输入提示（增加延迟）
    typingTimeout = setTimeout(() => {
        if (window.realtimeClient && typingState) {
            typingState = false;
            window.realtimeClient.sendTypingIndicator(false);
        }
    }, 3000);
}

// 自动调整文本框大小
function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

// 设置实时客户端
function setupRealtimeClient() {
    if (!window.realtimeClient) {
        console.warn('实时客户端未加载');
        return;
    }
    
    // 设置事件处理器
    window.realtimeClient.setEventHandlers({
        onConnectionChange: (isConnected) => {
            isRealtimeEnabled = isConnected;
            updateConnectionStatus(isConnected);
        },
        
        onRoomData: async (data) => {
            console.log('收到房间数据:', data);
            
            // 保存房间信息和创建者状态
            if (data.roomInfo) {
                window.currentRoomInfo = data.roomInfo;
                window.isCreator = data.isCreator;
                console.log('房间信息:', data.roomInfo, '是否创建者:', data.isCreator);
                
                // 更新转录按钮状态（创建者状态变化时）
                if (typeof onCallStatusChange === 'function') {
                    onCallStatusChange();
                }
            }
            
            // 智能合并消息列表（优先服务器数据，但保留本地较新的消息）
            if (data.messages && data.messages.length > 0) {
                // 如果服务器有更多消息，使用服务器数据
                if (data.messages.length > messages.length) {
                    messagesContainer.innerHTML = '';
                    messages = data.messages;
                    
                    // 处理文件消息：恢复文件URL
                    for (const msg of messages) {
                        if (msg.type === 'file' && msg.file && msg.file.base64 && !msg.file.url) {
                            try {
                                // 将base64转换为Blob并创建URL
                                const response = await fetch(msg.file.base64);
                                const blob = await response.blob();
                                msg.file.url = URL.createObjectURL(blob);
                            } catch (error) {
                                console.error('恢复文件URL失败:', error);
                            }
                        }
                    }
                    
                    messages.forEach(msg => renderMessage(msg));
                    scrollToBottom();
                    // 同步到本地存储
                    saveRoomData();
                    showToast('已同步服务器数据', 'success');
                }
            }
            
            // 智能合并参与者列表
            if (data.participants) {
                // 直接使用服务器返回的参与者列表，避免重复添加
                participants = data.participants;
                renderParticipants();
            }
        },
        
        onMessageReceived: async (message) => {
            console.log('收到新消息:', message);
            
            // 避免重复显示自己发送的消息
            if (message.userId !== currentUserId) {
                // 检查是否是重复的AI消息（防止AI回复重复显示）
                if (message.userId === 'ai-assistant') {
                    // 如果这个AI回复是当前用户触发的，跳过（因为本地已经显示了）
                    if (message.originUserId === currentUserId) {
                        console.log('跳过自己触发的AI消息重复显示:', message.text.substring(0, 30) + '...');
                        return;
                    }
                    
                    // 简化的重复检测：检查相同内容的AI消息（最近1分钟内）
                    const isDuplicate = messages.some(existingMsg => 
                        existingMsg.type === 'ai' && 
                        existingMsg.author === 'AI助手' &&
                        existingMsg.text === message.text
                    );
                    
                    if (isDuplicate) {
                        console.log('跳过重复的AI消息:', message.text.substring(0, 30) + '...');
                        return;
                    }
                }
                
                // 检查是否是重复的文件消息（防止文件重复显示）
                if (message.type === 'file') {
                    const isDuplicateFile = messages.some(existingMsg => 
                        existingMsg.type === 'file' && 
                        existingMsg.file && 
                        existingMsg.file.name === message.file.name &&
                        existingMsg.userId === message.userId &&
                        Math.abs(new Date() - new Date(existingMsg.time)) < 5000 // 5秒内
                    );
                    
                    if (isDuplicateFile) {
                        console.log('跳过重复的文件消息:', message.file.name);
                        return;
                    }
                
                // 处理文件消息：如果有base64数据但没有URL，创建可用的URL
                    if (message.file && message.file.base64 && !message.file.url) {
                    try {
                        // 将base64转换为Blob并创建URL
                        const response = await fetch(message.file.base64);
                        const blob = await response.blob();
                        message.file.url = URL.createObjectURL(blob);
                        console.log('为接收的文件创建了可用URL');
                    } catch (error) {
                        console.error('处理接收的文件失败:', error);
                        }
                    }
                }
                
                // 确保接收到的消息有时间戳，如果没有则添加
                if (!message.timestamp && message.time) {
                    // 如果只有time字段，尝试解析为时间戳
                    try {
                        const timeParts = message.time.split(':');
                        if (timeParts.length === 2) {
                            const now = new Date();
                            const messageTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                                parseInt(timeParts[0]), parseInt(timeParts[1]));
                            message.timestamp = messageTime.getTime();
                        }
                    } catch (e) {
                        // 如果解析失败，使用当前时间
                        message.timestamp = Date.now();
                    }
                } else if (!message.timestamp) {
                    // 如果完全没有时间信息，使用当前时间
                    message.timestamp = Date.now();
                }
                
                messages.push(message);
                renderMessage(message);
                scrollToBottom();
                
                // 同时保存到本地存储作为备份
                saveRoomData();
            }
        },
        
        onParticipantsUpdate: (participantsList) => {
            console.log('参与者列表更新:', participantsList);
            participants = participantsList;
            renderParticipants();
        },
        
        onUserJoined: (user) => {
            console.log('用户加入:', user);
            showToast(`${user.name} 加入了会议`, 'info');
        },
        
        onUserLeft: (data) => {
            console.log('用户离开:', data);
            const user = participants.find(p => p.userId === data.userId);
            if (user) {
                showToast(`${user.name} 离开了会议`, 'info');
            }
        },
        
        onMeetingEnded: (data) => {
            console.log('会议已结束:', data);
            showToast(data.message, 'warning', 5000);
            
            // 清理本地数据
            messages = [];
            participants = [];
            window.currentRoomInfo = null;
            window.isCreator = false;
            
            // 清理UI
            messagesContainer.innerHTML = '';
            renderParticipants();
            
            // 清理localStorage
            const storageKey = `meeting_${roomId}`;
            localStorage.removeItem(storageKey);
            
            // 3秒后跳转到首页
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        },
        
        onEndMeetingSuccess: (data) => {
            console.log('会议结束成功:', data);
            showToast(data.message, 'success');
        },
        
        onUserTyping: (data) => {
            if (data.userId !== currentUserId) {
                showTypingIndicator(data);
            }
        },
        
        // 语音通话事件处理
        onCallInvite: (data) => {
            console.log('收到通话邀请:', data);
            handleCallInvite(data);
        },
        
        onCallAccept: (data) => {
            console.log('用户接受通话:', data);
            handleCallAccept(data);
        },
        
        onCallReject: (data) => {
            console.log('用户拒绝通话:', data);
            handleCallReject(data);
        },
        
        onCallEnd: (data) => {
            // 临时注释掉日志以减少输出
            // console.log('用户结束通话:', data);
            handleCallEnd(data);
        },
        
        onCallOffer: (data) => {
            console.log('收到WebRTC offer:', data);
            handleCallOffer(data);
        },
        
        onCallAnswer: (data) => {
            console.log('收到WebRTC answer:', data);
            handleCallAnswer(data);
        },
        
        onIceCandidate: (data) => {
            console.log('收到ICE候选:', data);
            handleIceCandidate(data);
        },
        
        onMuteStatus: (data) => {
            console.log('收到静音状态:', data);
            handleMuteStatus(data);
        },
        
        // 转录事件处理
        onTranscriptionStatusChange: (data) => {
            console.log('📝 转录状态变化:', data);
            handleTranscriptionStatusChange(data);
        },
        
        onTranscriptionResult: (data) => {
            console.log('📝 收到转录结果:', data);
            console.log('📝 转录结果详细信息:', {
                type: data.type,
                userId: data.userId,
                username: data.username,
                result: data.result,
                isPartial: data.isPartial,
                timestamp: data.timestamp
            });
            handleTranscriptionResult(data);
        },
        
        onError: (error) => {
            console.error('实时通信错误:', error);
            showToast(`连接错误: ${error}`, 'error');
        }
    });
}

// 更新连接状态显示
function updateConnectionStatus(isConnected) {
    if (!connectionStatus) return;
    
    if (isConnected) {
        connectionStatus.innerHTML = '<i class="fas fa-wifi"></i> 实时连接';
        connectionStatus.style.color = 'var(--success-color)';
        connectionStatus.title = '实时聊天已启用';
    } else {
        connectionStatus.innerHTML = '<i class="fas fa-wifi" style="opacity: 0.5;"></i> 本地模式';
        connectionStatus.style.color = 'var(--warning-color)';
        connectionStatus.title = '使用本地存储，无法多端同步';
    }
}

// 显示输入提示 - 优化版本
const typingIndicators = new Map(); // 跟踪所有输入提示的状态

function showTypingIndicator(data) {
    const indicatorId = `typing-${data.userId}`;
    let indicator = document.getElementById(indicatorId);
    
    if (data.isTyping) {
        // 如果指示器已存在且正在显示，不重复创建
        if (indicator && typingIndicators.get(data.userId)) {
            return;
        }
        
        // 创建或更新指示器
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = indicatorId;
            indicator.className = 'typing-indicator-message';
            indicator.innerHTML = `
                <div class="message-avatar" style="background-color: ${getAvatarColor(data.username)}">
                    ${data.username.charAt(0).toUpperCase()}
                </div>
                <div class="typing-content">
                    <span>${data.username} 正在输入...</span>
                    <div class="typing-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(indicator);
            scrollToBottom();
        }
        
        // 标记为正在显示
        typingIndicators.set(data.userId, true);
        
        // 清除之前的自动移除定时器
        if (indicator.dataset.autoRemoveTimer) {
            clearTimeout(parseInt(indicator.dataset.autoRemoveTimer));
        }
        
        // 设置新的自动移除定时器（8秒后自动移除）
        const timerId = setTimeout(() => {
            const currentIndicator = document.getElementById(indicatorId);
            if (currentIndicator) {
                currentIndicator.remove();
                typingIndicators.delete(data.userId);
            }
        }, 8000);
        
        indicator.dataset.autoRemoveTimer = timerId;
        
    } else {
        // 停止输入状态
        if (indicator) {
            indicator.remove();
            typingIndicators.delete(data.userId);
        }
    }
}

// 滚动到底部
function scrollToBottom() {
    // 在移动端，由于输入框独立布局，直接滚动到底部即可
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    } else {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// 生成或获取房间ID
function generateRoomId() {
    const urlParams = new URLSearchParams(window.location.search);
    let roomId = urlParams.get('room');
    
    if (!roomId) {
        roomId = 'meeting-' + Math.random().toString(36).substr(2, 6);
        // 更新URL但不刷新页面
        const newUrl = window.location.pathname + '?room=' + roomId;
        window.history.replaceState({path: newUrl}, '', newUrl);
    }
    
    document.getElementById('roomId').textContent = `房间: ${roomId}`;
    return roomId;
}

// 显示用户名设置模态框
function showUsernameModal() {
    usernameModal.style.display = 'block';
    document.body.classList.add('modal-open'); // 添加modal-open类
    
    // 预填房间号
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');
    if (urlRoomId) {
        roomInput.value = urlRoomId;
    }
    
    usernameInput.focus();
}

// 加载房间数据
function loadRoomData() {
    // 从localStorage加载房间数据
    const storageKey = `meeting_${roomId}`;
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
        const data = JSON.parse(savedData);
        messages = data.messages || [];
        participants = data.participants || [];
        
        // 处理文件消息：恢复文件URL
        messages.forEach(async (msg) => {
            if (msg.type === 'file' && msg.file && msg.file.base64 && !msg.file.url) {
                try {
                    // 将base64转换为Blob并创建URL
                    const response = await fetch(msg.file.base64);
                    const blob = await response.blob();
                    msg.file.url = URL.createObjectURL(blob);
                } catch (error) {
                    console.error('恢复文件URL失败:', error);
                }
            }
        });
        
        // 渲染已存在的消息
        messages.forEach(msg => renderMessage(msg));
        renderParticipants();
    }
    
    // 添加当前用户到参与者列表
    if (currentUsername) {
        addCurrentUserToParticipants();
    }
}

// 保存房间数据到localStorage
function saveRoomData() {
    const storageKey = `meeting_${roomId}`;
    const data = {
        messages: messages,
        participants: participants,
        lastUpdate: Date.now()
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
}

// 处理localStorage变化事件
function handleStorageChange(e) {
    if (e.key === `meeting_${roomId}` && e.newValue) {
        const data = JSON.parse(e.newValue);
        
        // 更新消息（避免重复）
        if (data.messages && data.messages.length > messages.length) {
            const newMessages = data.messages.slice(messages.length);
            newMessages.forEach(msg => {
                messages.push(msg);
                renderMessage(msg);
            });
        }
        
        // 更新参与者列表
        if (data.participants) {
            participants = data.participants;
            renderParticipants();
        }
    }
}

// 添加当前用户到参与者列表
function addCurrentUserToParticipants() {
    const existingUser = participants.find(p => p.userId === currentUserId);
    if (!existingUser && currentUsername) {
        participants.push({
            userId: currentUserId,
            name: currentUsername,
            status: 'online',
            joinTime: Date.now()
        });
        saveRoomData();
        renderParticipants();
    }
}

// 更新消息显示中的"(我)"标识
function updateMessagesOwnership() {
    // 重新渲染所有消息以更新"(我)"标识
    messagesContainer.innerHTML = '';
    messages.forEach(msg => renderMessage(msg));
}

// 同步参与者在线状态
function syncParticipantsStatus() {
    if (currentUsername) {
        addCurrentUserToParticipants();
    }
}









// 自动提醒用户保存会议数据
function remindToSaveData() {
    if (messages.length >= 5 && window.location.hostname.includes('huggingface.co')) {
        showToast('💾 数据已自动保存到服务器', 'info');
    }
}

// 设置用户名和房间号
function setUsername() {
    const username = usernameInput.value.trim();
    const customRoomId = roomInput.value.trim();
    
    if (!username) {
        alert('请输入您的姓名');
        return;
    }
    
    // 处理房间号
            if (customRoomId) {
            roomId = customRoomId;
            window.roomId = roomId;
            // 更新URL
            const newUrl = window.location.pathname + '?room=' + roomId;
            window.history.replaceState({path: newUrl}, '', newUrl);
            document.getElementById('roomId').textContent = `房间: ${roomId}`;
    } else if (!roomId) {
        // 如果没有自定义房间号且roomId未设置，生成新的
        roomId = 'meeting-' + Math.random().toString(36).substr(2, 6);
        window.roomId = roomId;
        const newUrl = window.location.pathname + '?room=' + roomId;
        window.history.replaceState({path: newUrl}, '', newUrl);
        document.getElementById('roomId').textContent = `房间: ${roomId}`;
    }
    
    // 设置当前用户信息
    currentUsername = username;
    // 基于用户名生成一致的用户ID
    currentUserId = generateUserIdFromUsername(username);
    
    // 尝试通过WebSocket加入房间
    if (window.realtimeClient && !window.realtimeClient.localMode) {
        // 先加载本地数据作为备用
        loadRoomData();
        
        // 然后尝试连接WebSocket获取最新数据
        window.realtimeClient.joinRoom(roomId, currentUserId, username);
        showToast('正在连接实时聊天...', 'info');
    } else {
        // 降级到本地模式
        loadRoomData();
        
        // 检查是否已有相同用户名的用户
        const existingUser = participants.find(p => p.name === username);
        if (existingUser) {
            // 使用现有的用户ID
            currentUserId = existingUser.id;
            currentUsername = username;
            
            // 更新用户状态为在线
            existingUser.status = 'online';
            existingUser.lastSeen = Date.now();
            
            // 更新消息显示中的"(我)"标识
            updateMessagesOwnership();
        } else {
            // 添加新用户到参与者列表
            participants.push({
                id: currentUserId,
                name: currentUsername,
                status: 'online',
                joinTime: Date.now(),
                lastSeen: Date.now()
            });
        }
        
        // 保存房间数据
        saveRoomData();
        renderParticipants();
    }
    
    usernameModal.style.display = 'none';
    
    // 在移动端，确保输入框在用户加入房间后显示
    if (isMobileDevice()) {
        setTimeout(() => {
            const inputContainer = document.querySelector('.input-container');
            if (inputContainer) {
                inputContainer.style.display = 'flex';
                inputContainer.style.visibility = 'visible';
                inputContainer.style.opacity = '1';
                forceMobileInputVisibility();
            }
        }, 500);
    }
}

// 关闭用户名设置模态框
function closeUsernameModal() {
    usernameModal.style.display = 'none';
    document.body.classList.remove('modal-open'); // 移除modal-open类
    
    // 在移动端，确保输入框在用户加入房间后显示
    if (isMobileDevice()) {
        setTimeout(() => {
            const inputContainer = document.querySelector('.input-container');
            if (inputContainer) {
                inputContainer.style.display = 'flex';
                inputContainer.style.visibility = 'visible';
                inputContainer.style.opacity = '1';
                forceMobileInputVisibility();
            }
        }, 500);
    }
}

// 创建新房间
function createNewRoom() {
    roomInput.value = ''; // 清空房间号输入
    
    // 强制重置房间ID，创建全新的房间
    roomId = 'meeting-' + Math.random().toString(36).substr(2, 6);
    window.roomId = roomId;
    const newUrl = window.location.pathname + '?room=' + roomId;
    window.history.replaceState({path: newUrl}, '', newUrl);
    document.getElementById('roomId').textContent = `房间: ${roomId}`;
    
    // 重置当前会话状态
    messages = [];
    participants = [];
    
    // 清空消息容器
    messagesContainer.innerHTML = '';
    
    // 重置总结内容
    summaryContent.innerHTML = '<p class="empty-summary">讨论开始后，AI将为您生成智能总结...</p>';
    
    // 如果已设置用户名，直接加入新房间
    if (currentUsername) {
        usernameModal.style.display = 'none';
        
        // 直接将当前用户添加到新房间的参与者列表
        participants.push({
            id: currentUserId,
            name: currentUsername,
            status: 'online',
            joinTime: Date.now(),
            lastSeen: Date.now()
        });
        
        // 保存房间数据并渲染参与者
        saveRoomData();
        renderParticipants();
    } else {
        // 否则显示用户名设置对话框
        setUsername();
    }
}

// 发送消息
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isAIProcessing || !currentUsername) return;

    // 创建消息对象
    const message = {
        type: 'user',
        text: text,
        author: currentUsername,
        userId: currentUserId,
        time: new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })
    };
    
    // 清空输入框
    messageInput.value = '';
    autoResizeTextarea();
    
    // 停止输入提示
    if (window.realtimeClient) {
        window.realtimeClient.sendTypingIndicator(false);
    }
    
    // 立即显示消息（提供即时反馈）
    messages.push(message);
    renderMessage(message);
    scrollToBottom();
    
    // 尝试通过WebSocket发送
    if (isRealtimeEnabled && window.realtimeClient) {
        const sent = window.realtimeClient.sendMessage(message);
        if (!sent) {
            // WebSocket发送失败，使用本地存储备份
            saveRoomData();
            showToast('消息已保存到本地，连接恢复后将同步', 'warning');
        }
    } else {
        // 本地模式，保存到localStorage
        saveRoomData();
    }

    // 在Hugging Face环境下提醒用户保存数据
    remindToSaveData();
}

// 添加消息到界面
function addMessage(type, text, author = 'AI助手', userId = null, shouldBroadcast = true, isAIQuestion = false) {
    const message = {
        type,
        text,
        author,
        userId: userId || (type === 'ai' ? 'ai-assistant' : 'unknown'),
        isAIQuestion: isAIQuestion || false,
        timestamp: Date.now(), // 使用UTC时间戳
        time: new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })
    };
    
    // 立即显示消息
    messages.push(message);
    renderMessage(message);
    scrollToBottom();
    
    // 通过WebSocket发送AI消息给其他用户（只有本地产生的消息才发送）
    if (shouldBroadcast && isRealtimeEnabled && window.realtimeClient) {

        const sent = window.realtimeClient.sendMessage(message);
        if (!sent) {
            // WebSocket发送失败，使用本地存储备份
            saveRoomData();
        }
    } else {
        // 本地模式或接收到的消息，保存到localStorage
        saveRoomData();
    }
}

// 渲染单条消息
function renderMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}-message${message.isAIQuestion ? ' ai-question-message' : ''}`;
    messageDiv.dataset.messageId = message.id || Date.now();
    
    let avatarContent;
    let avatarColor;
    
    if (message.type === 'user') {
        avatarColor = getAvatarColor(message.author);
        const initials = message.author.charAt(0).toUpperCase();
        avatarContent = `<span style="color: white; font-weight: bold;">${initials}</span>`;
    } else {
        avatarColor = '#6b7280';
        avatarContent = '<i class="fas fa-robot"></i>';
    }
    
    const isCurrentUser = message.userId === currentUserId;
    
    let messageText;
    if (message.isLoading) {
        messageDiv.classList.add('loading');
        messageText = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
    } else {
        const aiQuestionPrefix = message.isAIQuestion ? '<i class="fas fa-robot ai-question-icon"></i> [询问AI] ' : '';
        messageText = `<div class="message-text">${aiQuestionPrefix}${message.text}</div>`;
    }
    
    // 处理时间显示：如果有时间戳，使用本地时区格式化；否则使用原始时间
    let displayTime;
    if (message.timestamp) {
        displayTime = new Date(message.timestamp).toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } else {
        displayTime = message.time || new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar" style="background-color: ${avatarColor}">${avatarContent}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author" ${isCurrentUser ? 'style="color: #3b82f6; font-weight: 600;"' : ''}>
                    ${message.author} ${isCurrentUser ? '(我)' : ''}
                </span>
                <span class="message-time">${displayTime}</span>
            </div>
            ${messageText}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
}

// 处理AI集成（手动召唤版本）
async function processWithAI(userMessage) {
    if (isAIProcessing) return;
    
    isAIProcessing = true;
    updateAIStatus('AI正在分析...', 'processing');
    
    try {
        // 构建对话上下文
        const context = buildAIContext(userMessage);
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: context,
                max_tokens: 300,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            throw new Error('AI服务响应异常');
        }
        
        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        // 添加AI回答
        addMessage('ai', aiResponse, 'AI助手');
        
        updateAIStatus('AI回答完成', 'complete');
        setTimeout(() => updateAIStatus('AI正在待命...', 'idle'), 2000);
        
    } catch (error) {
        console.error('AI处理失败:', error);
        updateAIStatus('AI服务暂时不可用', 'error');
        setTimeout(() => updateAIStatus('AI正在待命...', 'idle'), 3000);
        
        // 模拟AI回答（降级方案）
        setTimeout(() => {
            const mockResponse = generateMockAIAnswer(userMessage);
            addMessage('ai', mockResponse, 'AI助手');
            updateAIStatus('AI正在待命...', 'idle');
        }, 1000);
    } finally {
        isAIProcessing = false;
    }
}

// 构建AI上下文
function buildAIContext(userMessage) {
    const recentMessages = messages.slice(-10);
    const conversationHistory = recentMessages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: `${msg.author}: ${msg.text}`
    }));
    
    return [
        {
            role: 'system',
            content: '你是一个智能会议助手，能够回答关于当前讨论的问题、提供总结和建议。请用中文回答。'
        },
        ...conversationHistory,
        {
            role: 'user',
            content: userMessage
        }
    ];
}

// 生成模拟AI响应
function generateMockAIResponse(message) {
    const mockResponses = [
        `用户提到: ${message.substring(0, 20)}...`,
        `讨论要点: ${message.includes('技术') ? '技术方案讨论' : '项目规划'}`,
        `记录: 重要观点 - ${message.length > 10 ? message.substring(0, 15) + '...' : message}`,
        `总结: ${message.includes('架构') ? '架构设计讨论' : '需求分析'}`,
    ];
    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
}

// 生成模拟AI回答
function generateMockAIAnswer(question) {
    const answers = [
        "根据当前讨论，我认为这是一个很有价值的观点。",
        "从讨论内容来看，大家的想法比较一致，可以继续深入探讨。",
        "这个问题很有深度，建议从多个角度继续分析。",
        "基于现有信息，我可以提供一些补充建议。",
        "讨论进展良好，建议总结一下目前的共识。"
    ];
    return answers[Math.floor(Math.random() * answers.length)];
}

// 更新AI状态
function updateAIStatus(text, type) {
    const icon = type === 'processing' ? 'fas fa-spinner fa-spin' : 
                 type === 'error' ? 'fas fa-exclamation-triangle' : 
                 'fas fa-robot';
    aiStatus.innerHTML = `<i class="${icon}"></i> ${text}`;
    
    if (type === 'error') {
        aiStatus.style.color = 'var(--error-color)';
    } else {
        aiStatus.style.color = 'var(--success-color)';
    }
}

// 询问AI
function askAI() {
    askAIModal.style.display = 'block';
    aiQuestionInput.focus();
}

// 关闭询问AI模态框
function closeAskAIModal() {
    askAIModal.style.display = 'none';
    aiQuestionInput.value = '';
}

// 提交AI问题
async function submitAIQuestion() {
    const question = aiQuestionInput.value.trim();
    if (!question || isAIProcessing) return;
    
    // 添加用户问题（标记为AI问题）
    addMessage('user', question, currentUsername, currentUserId, true, true);
    closeAskAIModal();
    
    isAIProcessing = true;
    updateAIStatus('AI正在思考...', 'processing');
    
    // 添加AI加载消息
    const loadingMessageId = addLoadingMessage('AI正在思考中...');
    
    try {
        const context = [
            {
                role: 'system',
                content: '你是一个专业的技术顾问。基于当前的会议讨论内容，为用户提供准确、有用的回答。回答要简洁明了，不超过200字。'
            },
            {
                role: 'user',
                content: `当前讨论内容: ${messages.slice(-3).map(m => m.text).join('；')}。用户问题: ${question}`
            }
        ];
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: context,
                max_tokens: 300,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            throw new Error('AI问答服务异常');
        }
        
        const data = await response.json();
        const aiAnswer = data.choices[0].message.content;
        
        // 更新加载消息为实际回答
        updateMessage(loadingMessageId, aiAnswer);
        
        // 同时创建一个新的AI消息发送给其他用户
        const aiMessage = {
            type: 'ai',
            text: aiAnswer,
            author: 'AI助手',
            userId: 'ai-assistant',
            time: new Date().toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            originUserId: currentUserId // 标记这个AI回复是由当前用户触发的
        };
        
        // 发送给其他用户（不影响本地显示）
        if (isRealtimeEnabled && window.realtimeClient) {
            window.realtimeClient.sendMessage(aiMessage);
        }
        
        updateAIStatus('AI正在监听...', 'listening');
        
    } catch (error) {
        console.error('AI问答失败:', error);
        
        // 更新加载消息为错误消息
        updateMessage(loadingMessageId, '抱歉，AI服务暂时不可用，请稍后重试。', true);
        
        updateAIStatus('AI正在监听...', 'listening');
    } finally {
        isAIProcessing = false;
    }
}

// 生成模拟AI回答
function generateMockAIAnswer(question) {
    const mockAnswers = [
        `关于"${question}"，建议考虑以下几点：1) 技术可行性 2) 成本效益 3) 实施周期。`,
        `这是一个很好的问题。基于当前讨论，我建议先进行小规模试点，验证效果后再全面推广。`,
        `从技术角度看，这个方案是可行的。但需要注意数据安全和性能优化方面的问题。`,
        `根据我的经验，建议采用渐进式实施策略，先解决核心痛点，再逐步完善。`
    ];
    return mockAnswers[Math.floor(Math.random() * mockAnswers.length)];
}

// 生成总结
async function generateSummary() {
    if (messages.length === 0) {
        alert('暂无讨论内容可总结');
        return;
    }
    
    if (isAIProcessing) return;
    
    // 显示加载状态
    summaryContent.innerHTML = '<p class="loading-summary">AI正在分析讨论内容，请稍候...</p>';
    
    isAIProcessing = true;
    updateAIStatus('AI正在生成总结...', 'processing');
    
    try {
        const context = [
            {
                role: 'system',
                content: '你是一个专业的会议总结AI。请基于讨论内容，生成结构化的会议总结，包括：1) 主要讨论点 2) 达成的共识 3) 待解决问题 4) 下一步行动。用中文回答，格式清晰。'
            },
            {
                role: 'user',
                content: `会议讨论内容：${messages.map(m => `${m.author}: ${m.text}`).join('\n')}`
            }
        ];
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: context,
                max_tokens: 500,
                temperature: 0.5
            })
        });
        
        if (!response.ok) {
            throw new Error('AI总结服务异常');
        }
        
        const data = await response.json();
        const summary = data.choices[0].message.content;
        
        // 在侧边栏显示总结
        summaryContent.innerHTML = `<div class="summary-text">${summary.replace(/\n/g, '<br>')}</div>`;
        
        // 同时将总结作为AI消息添加到聊天流中，让所有用户都能看到
        addMessage('ai', `📋 **会议总结**\n\n${summary}`, 'AI助手', 'ai-assistant');
        
        updateAIStatus('AI正在监听...', 'listening');
        
    } catch (error) {
        console.error('AI总结失败:', error);
        
        // 生成模拟总结
        const mockSummary = generateMockSummary();
        summaryContent.innerHTML = `<div class="summary-text">${mockSummary}</div>`;
        
        // 同时将模拟总结作为AI消息添加到聊天流中
        addMessage('ai', `📋 **会议总结**\n\n${mockSummary.replace(/<br>/g, '\n').replace(/<\/?strong>/g, '**')}`, 'AI助手', 'ai-assistant');
        
        updateAIStatus('AI正在监听...', 'listening');
    } finally {
        isAIProcessing = false;
    }
}

// 获取用户头像颜色
function getAvatarColor(name) {
    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#22c55e', '#10b981', '#14b8a6',
        '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
}

// 生成模拟总结
function generateMockSummary() {
    return `
        <strong>📋 会议总结</strong><br><br>
        
        <strong>🎯 主要讨论点：</strong><br>
        • 技术架构方案讨论<br>
        • 微服务与容器化部署<br>
        • 项目实施计划<br><br>
        
        <strong>✅ 达成共识：</strong><br>
        • 采用微服务架构方向<br>
        • 优先考虑容器化部署<br><br>
        
        <strong>❓ 待解决问题：</strong><br>
        • 具体技术选型细节<br>
        • 团队技能储备评估<br><br>
        
        <strong>🚀 下一步行动：</strong><br>
        • 制定详细技术方案<br>
        • 安排技术调研<br>
        • 下次会议确定时间表
    `;
}

// 导出总结
function exportSummary() {
    const summaryText = summaryContent.innerText || summaryContent.textContent;
    if (!summaryText || summaryText.includes('暂无总结')) {
        alert('暂无总结内容可导出');
        return;
    }
    
    const fullContent = `
会议记录 - Vibe Meeting
时间: ${new Date().toLocaleString('zh-CN')}
房间: ${document.getElementById('roomId').textContent}
讨论内容:
${messages.map(m => `[${m.time}] ${m.author}: ${m.text}`).join('\n')}
AI总结:
${summaryText}
---
由Vibe Meeting AI助手生成
    `;
    
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 复制房间号
function copyRoomId(event) {
    const roomId = document.getElementById('roomId').textContent.replace('房间: ', '');
    navigator.clipboard.writeText(roomId).then(() => {
        const btn = event.target.tagName === 'BUTTON' ? event.target : event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> 已复制';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制房间号');
    });
}



// 搜索过滤参与者
function filterParticipants(searchTerm) {
    const filteredParticipants = participants.filter(participant => 
        participant.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderFilteredParticipants(filteredParticipants);
}

// 渲染过滤后的参与者列表
function renderFilteredParticipants(filteredParticipants) {
    participantsList.innerHTML = '';
    
    if (filteredParticipants.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-participants';
        if (document.getElementById('participantsSearch').value.trim()) {
            emptyDiv.innerHTML = '<p>没有找到匹配的在线成员</p>';
        } else {
            emptyDiv.innerHTML = '<p>暂无在线成员</p>';
        }
        participantsList.appendChild(emptyDiv);
        return;
    }
    
    // 对参与者进行排序：当前用户第一，创建者第二，其他按原顺序
    const sortedParticipants = [...filteredParticipants].sort((a, b) => {
        const aIsCurrentUser = a.userId === currentUserId;
        const bIsCurrentUser = b.userId === currentUserId;
        const aIsCreator = window.currentRoomInfo && a.userId === window.currentRoomInfo.creatorId;
        const bIsCreator = window.currentRoomInfo && b.userId === window.currentRoomInfo.creatorId;
        
        // 当前用户始终排在第一位
        if (aIsCurrentUser && !bIsCurrentUser) return -1;
        if (!aIsCurrentUser && bIsCurrentUser) return 1;
        
        // 如果当前用户就是创建者，直接保持顺序
        if (aIsCurrentUser && bIsCurrentUser) return 0;
        
        // 在非当前用户中，创建者排在第二位
        if (aIsCreator && !bIsCreator) return -1;
        if (!aIsCreator && bIsCreator) return 1;
        
        // 其他按原顺序
        return 0;
    });
    
    sortedParticipants.forEach((participant, index) => {
        const participantDiv = document.createElement('div');
        participantDiv.className = 'participant';
        
        const initials = participant.name.charAt(0).toUpperCase();
        const avatarColor = getAvatarColor(participant.name);
        const isCurrentUser = participant.userId === currentUserId;
        const isCreator = window.currentRoomInfo && participant.userId === window.currentRoomInfo.creatorId;
        
        // 确定显示标签
        let userTag = '';
        if (isCurrentUser && isCreator) {
            userTag = '(我·创建者)';
        } else if (isCurrentUser) {
            userTag = '(我)';
        } else if (isCreator) {
            userTag = '(创建者)';
        }
        
        participantDiv.innerHTML = `
            <div class="participant-avatar" style="background-color: ${avatarColor}">
                ${initials}
            </div>
            <div class="participant-info">
                <div class="participant-name">
                    ${participant.name} ${userTag}
                </div>
                <div class="participant-status ${participant.status}">
                    <i class="fas fa-circle"></i> ${participant.status === 'online' ? '在线' : '离线'}
                </div>
            </div>
        `;
        
        participantsList.appendChild(participantDiv);
    });
    
    // 如果当前用户是创建者，在参与者列表下方添加结束会议按钮
    if (window.isCreator) {
        const endMeetingDiv = document.createElement('div');
        endMeetingDiv.className = 'creator-actions';
        endMeetingDiv.innerHTML = `
            <button id="endMeetingBtn" class="btn-end-meeting" onclick="endMeeting()">
                <i class="fas fa-power-off"></i> 结束会议
            </button>
            <p class="creator-note">结束会议将清空所有聊天记录和文件</p>
        `;
        participantsList.appendChild(endMeetingDiv);
    }
}

// 渲染参与者列表（原始函数，保持向后兼容）
function renderParticipants() {
    renderFilteredParticipants(participants);
}

// 结束会议函数（仅创建者可调用）
function endMeeting() {
    if (!window.isCreator) {
        showToast('只有会议创建者可以结束会议', 'error');
        return;
    }
    
    const confirmMessage = `确定要结束会议吗？\n\n这将会：\n• 清空所有聊天记录\n• 删除所有上传的文件\n• 移除所有参与者\n• 此操作不可撤销`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // 显示结束中状态
    const endBtn = document.getElementById('endMeetingBtn');
    if (endBtn) {
        endBtn.disabled = true;
        endBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 结束中...';
    }
    
    // 发送结束会议请求
    if (isRealtimeEnabled && window.realtimeClient) {
        window.realtimeClient.endMeeting(roomId, currentUserId);
    } else {
        showToast('无法连接到服务器，请检查网络', 'error');
        // 恢复按钮状态
        if (endBtn) {
            endBtn.disabled = false;
            endBtn.innerHTML = '<i class="fas fa-power-off"></i> 结束会议';
        }
    }
}

// 这里可以添加真实的用户加入功能，例如WebSocket连接

// 检查文档处理库是否正确加载
function checkDocumentLibraries() {
    const libraries = {
        'PDF.js': typeof pdfjsLib !== 'undefined',
        'Mammoth.js': typeof mammoth !== 'undefined',
        'XLSX.js': typeof XLSX !== 'undefined'
    };
    
    console.log('文档处理库加载状态:', libraries);
    
    const missingLibs = Object.entries(libraries)
        .filter(([name, loaded]) => !loaded)
        .map(([name]) => name);
    
    if (missingLibs.length > 0) {
        console.warn('以下库未正确加载:', missingLibs.join(', '));
        showToast(`部分文档处理功能不可用：${missingLibs.join(', ')}`, 'warning');
    }
    
    return libraries;
}

// 处理Excel文档
async function processExcelDocument(file, fileMessage) {
    try {
        showToast('正在提取Excel文件内容...', 'info');
        
        // 检查XLSX.js是否加载
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX.js库未加载，请刷新页面重试');
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        let allSheetsContent = '';
        const sheetNames = workbook.SheetNames;
        
        // 遍历所有工作表
        for (let i = 0; i < sheetNames.length; i++) {
            const sheetName = sheetNames[i];
            const worksheet = workbook.Sheets[sheetName];
            
            // 尝试多种方法提取工作表内容
            try {
                let sheetContent = '';
                
                // 方法1：使用sheet_to_csv (如果存在)
                if (typeof XLSX.utils.sheet_to_csv === 'function') {
                    try {
                        const csvData = XLSX.utils.sheet_to_csv(worksheet);
                        if (csvData && csvData.trim()) {
                            sheetContent = csvData.trim();
                        }
                    } catch (csvError) {
                        console.warn(`CSV转换失败:`, csvError);
                    }
                }
                
                // 方法2：使用sheet_to_json（备用方法）
                if (!sheetContent && typeof XLSX.utils.sheet_to_json === 'function') {
                    try {
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        if (jsonData && jsonData.length > 0) {
                            sheetContent = jsonData.map(row => {
                                return (row || []).join('\t');
                            }).filter(line => line.trim()).join('\n');
                        }
                    } catch (jsonError) {
                        console.warn(`JSON转换失败:`, jsonError);
                    }
                }
                
                // 方法3：直接读取单元格（最后的备用方法）
                if (!sheetContent) {
                    try {
                        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
                        const cells = [];
                        for (let row = range.s.r; row <= range.e.r; row++) {
                            const rowData = [];
                            for (let col = range.s.c; col <= range.e.c; col++) {
                                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                                const cell = worksheet[cellAddress];
                                rowData.push(cell ? (cell.v || '') : '');
                            }
                            if (rowData.some(cell => cell.toString().trim())) {
                                cells.push(rowData.join('\t'));
                            }
                        }
                        sheetContent = cells.join('\n');
                    } catch (cellError) {
                        console.warn(`单元格读取失败:`, cellError);
                    }
                }
                
                if (sheetContent && sheetContent.trim()) {
                    allSheetsContent += `\n=== 工作表: ${sheetName} ===\n`;
                    allSheetsContent += sheetContent.trim() + '\n';
                } else {
                    console.warn(`工作表 ${sheetName} 无内容或无法读取`);
                }
                
            } catch (sheetError) {
                console.error(`处理工作表 ${sheetName} 完全失败:`, sheetError);
            }
        }
        
        if (!allSheetsContent.trim()) {
            throw new Error('Excel文件中没有找到可提取的数据');
        }
        
        // 构建完整内容
        const content = `Excel文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n工作表数量: ${sheetNames.length}\n\n内容：${allSheetsContent.trim()}`;
        
        console.log('Excel文件处理完成:', {
            fileName: file.name,
            fileType: file.type,
            sheetsCount: sheetNames.length,
            contentLength: allSheetsContent.length,
            content: content.substring(0, 200) + (content.length > 200 ? '...' : '')
        });
        
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: content
        };
        
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
        showToast('Excel文件内容提取完成', 'success');
        
    } catch (error) {
        console.error('处理Excel文件失败:', error);
        showToast(`Excel文件处理失败: ${error.message}`, 'error');
        
        // 即使失败也显示工具箱，但使用占位符内容
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: `这是一个Excel文件，但无法提取内容。文件可能已损坏或使用了不支持的格式。`
        };
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
    }
}

// 处理PPT文档
async function processPPTDocument(file, fileMessage) {
    try {
        showToast('正在分析PPT文件...', 'info');
        
        const arrayBuffer = await file.arrayBuffer();
        
        // PPT文件结构比较复杂，直接解析困难
        // 我们提供文件信息和基本分析，用户可以通过AI工具进行深度分析
        let content = `PowerPoint文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n文件类型: ${file.type}\n\n`;
        
        // 尝试检测是否是新格式的PPTX（实际上是ZIP文件）
        const uint8Array = new Uint8Array(arrayBuffer);
        const isZipFormat = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B; // PK signature
        
        if (isZipFormat) {
            content += `文件格式：PowerPoint 2007+ (.pptx)\n`;
            content += `压缩格式：是（基于XML）\n\n`;
            content += `内容摘要：这是一个现代PowerPoint演示文稿文件。由于PPT文件结构复杂，无法直接提取文本内容，但您可以使用AI工具进行智能分析，包括：\n`;
            content += `• 幻灯片内容识别\n`;
            content += `• 图表和图片分析\n`;
            content += `• 文本信息提取\n`;
            content += `• 演示文稿结构分析`;
        } else {
            content += `文件格式：PowerPoint 97-2003 (.ppt)\n`;
            content += `压缩格式：否（二进制格式）\n\n`;
            content += `内容摘要：这是一个传统PowerPoint演示文稿文件。建议转换为.pptx格式以获得更好的兼容性，或使用AI工具进行内容分析。`;
        }
        
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: content
        };
        
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
        showToast('PPT文件分析完成，可使用AI工具进一步处理', 'success');
        
    } catch (error) {
        console.error('处理PPT文件失败:', error);
        showToast(`PPT文件处理失败: ${error.message}`, 'error');
        
        // 即使失败也显示工具箱，但使用占位符内容
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: `这是一个PowerPoint演示文稿文件。由于文件格式复杂或文件可能损坏，无法直接分析内容。建议检查文件完整性或使用其他工具。`
        };
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
    }
}

// 处理CSV文件
async function processCSVFile(file, fileMessage) {
    try {
        showToast('正在处理CSV文件...', 'info');
        
        const text = await file.text();
        const lines = text.split('\n').slice(0, 20); // 只取前20行
        const preview = lines.join('\n');
        
        const content = `CSV文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n\n内容预览：\n${preview}${lines.length > 20 ? '\n...（更多内容）' : ''}`;
        
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: content
        };
        
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
        
    } catch (error) {
        console.error('处理CSV文件失败:', error);
        showToast('处理CSV文件失败，请稍后重试', 'error');
    }
}

// 处理JSON文件
async function processJSONFile(file, fileMessage) {
    try {
        showToast('正在处理JSON文件...', 'info');
        
        const text = await file.text();
        const jsonData = JSON.parse(text);
        const preview = JSON.stringify(jsonData, null, 2).substring(0, 1000);
        
        const content = `JSON文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n\n内容预览：\n${preview}${text.length > 1000 ? '\n...（更多内容）' : ''}`;
        
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: content
        };
        
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
        
    } catch (error) {
        console.error('处理JSON文件失败:', error);
        showToast('处理JSON文件失败，请稍后重试', 'error');
    }
}

// 处理HTML/XML文件
async function processHTMLFile(file, fileMessage) {
    try {
        showToast('正在处理HTML/XML文件...', 'info');
        
        const text = await file.text();
        const preview = text.substring(0, 1000);
        
        const content = `HTML/XML文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n\n内容预览：\n${preview}${text.length > 1000 ? '\n...（更多内容）' : ''}`;
        
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: content
        };
        
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
        
    } catch (error) {
        console.error('处理HTML/XML文件失败:', error);
        showToast('处理HTML/XML文件失败，请稍后重试', 'error');
    }
}

// 处理通用文件（尝试提取文本内容）
async function processGenericFile(file, fileMessage) {
    try {
        showToast('正在处理文件...', 'info');
        
        let content = '';
        
        // 尝试按文本文件处理
        try {
            const text = await file.text();
            content = `文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n文件类型: ${file.type}\n\n内容预览：\n${text.substring(0, 1000)}${text.length > 1000 ? '\n...（更多内容）' : ''}`;
        } catch (e) {
            content = `文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n文件类型: ${file.type}\n\n内容：这是一个二进制文件，无法直接解析其内容。可以通过AI工具箱进行智能分析。`;
        }
        
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: content
        };
        
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
        
    } catch (error) {
        console.error('处理文件失败:', error);
        showToast('处理文件失败，请稍后重试', 'error');
    }
}

// 搜索聊天记录
function searchChatMessages(searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    const messageElements = messagesContainer.querySelectorAll('.message');
    
    messageElements.forEach(messageEl => {
        const messageText = messageEl.querySelector('.message-text')?.textContent.toLowerCase() || '';
        const authorName = messageEl.querySelector('.message-author')?.textContent.toLowerCase() || '';
        
        if (searchTerm === '' || messageText.includes(searchLower) || authorName.includes(searchLower)) {
            messageEl.style.display = 'flex';
            messageEl.style.opacity = '1';
        } else {
            messageEl.style.display = 'none';
        }
    });
    
    // 高亮匹配的文本（可选功能）
    if (searchTerm !== '') {
        highlightSearchTerms(searchTerm);
    } else {
        removeHighlights();
    }
}

// 高亮搜索词
function highlightSearchTerms(searchTerm) {
    const messageElements = messagesContainer.querySelectorAll('.message');
    messageElements.forEach(messageEl => {
        const messageText = messageEl.querySelector('.message-text');
        if (messageText) {
            const text = messageText.textContent;
            const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
            const highlightedText = text.replace(regex, '<mark class="search-highlight">$1</mark>');
            messageText.innerHTML = highlightedText;
        }
    });
}

// 移除高亮
function removeHighlights() {
    const messageElements = messagesContainer.querySelectorAll('.message');
    messageElements.forEach(messageEl => {
        const messageText = messageEl.querySelector('.message-text');
        if (messageText) {
            messageText.innerHTML = messageText.textContent;
        }
    });
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 注册服务工作者
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW注册成功: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW注册失败: ', registrationError);
                });
        });
    }
}

// 设置离线指示器
function setupOfflineIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'offline-indicator';
    indicator.textContent = '⚠️ 网络连接已断开，部分功能可能受限';
    document.body.appendChild(indicator);

    window.addEventListener('online', () => {
        indicator.classList.remove('show');
        showToast('网络已恢复', 'success');
    });

    window.addEventListener('offline', () => {
        indicator.classList.add('show');
    });
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `${type}-toast`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// 文件上传和OCR功能
const fileInput = document.getElementById('fileInput');
const uploadZone = document.getElementById('uploadZone');

// 触发文件选择
function triggerFileUpload() {
    fileInput.click();
}

// 文件选择事件
fileInput.addEventListener('change', handleFileSelect);

// 处理文件选择
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    files.forEach(file => processFile(file));
    event.target.value = ''; // 重置输入
}

// 拖拽上传事件监听 - 使用更稳定的区域检测
const dragMessageInput = document.getElementById('messageInput');
const inputContainer = document.querySelector('.input-container');

// 只为相关容器添加事件监听
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    inputContainer.addEventListener(eventName, preventDefaults, false);
});

// 防抖处理 - 使用更严格的区域检测
let isDragging = false;
let dragCheckTimeout = null;

function highlight() {
    clearTimeout(dragCheckTimeout);
    if (!isDragging) {
        isDragging = true;
        uploadZone.style.display = 'block';
        uploadZone.classList.add('dragover');
    }
}

function unhighlight() {
    clearTimeout(dragCheckTimeout);
    dragCheckTimeout = setTimeout(() => {
        // 检查是否还在拖拽区域内
        const rect = inputContainer.getBoundingClientRect();
        const isStillOver = false; // 简化检测，直接隐藏
        
        if (!isStillOver) {
            isDragging = false;
            uploadZone.style.display = 'none';
            uploadZone.classList.remove('dragover');
        }
    }, 50);
}

// 事件委托到容器级别
inputContainer.addEventListener('dragenter', highlight, false);
inputContainer.addEventListener('dragover', highlight, false);
inputContainer.addEventListener('dragleave', unhighlight, false);
inputContainer.addEventListener('drop', handleDrop);

// 防止默认行为
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// 处理拖拽文件
function handleDrop(e) {
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => processFile(file));
    isDragging = false;
    uploadZone.style.display = 'none';
    uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => processFile(file));
    uploadZone.style.display = 'none';
}

// 处理单个文件
async function processFile(file) {
    if (!file) return;
    
    const maxSize = 10 * 1024 * 1024; // 10MB限制
    if (file.size > maxSize) {
        showToast('文件大小超过10MB限制', 'error');
        return;
    }
    
    // 支持AI分析的文件类型
    const aiSupportedTypes = [
        // 图片格式
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
        // 文档格式
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.presentation',
        'application/vnd.oasis.opendocument.spreadsheet',
        // 网页格式
        'text/html', 'text/xml', 'application/json',
        // 压缩格式
        'application/zip', 'application/x-rar-compressed', 'application/x-tar'
    ];
    
    // 现在支持所有文件类型上传，但只有特定类型支持AI分析
    const supportsAI = aiSupportedTypes.includes(file.type);
    
    if (!supportsAI) {
        console.log(`文件类型 ${file.type} 不支持AI分析，但可以上传和下载`);
    }
    
    // 将文件转换为base64以支持跨端分享
    const fileBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
    
    // 创建文件消息
    const fileMessage = {
        type: 'file',
        file: {
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type,
            url: URL.createObjectURL(file),
            base64: fileBase64 // 添加base64数据用于跨端分享
        },
        author: currentUsername,
        userId: currentUserId,
        timestamp: Date.now(), // 使用UTC时间戳
        time: new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })
    };
    
    // 只本地显示，不添加到messages数组（避免重复）
    renderMessage(fileMessage);
    
    // 发送文件消息给其他用户（包含base64数据）
    if (isRealtimeEnabled && window.realtimeClient) {
        const fileMessageForOthers = {
            ...fileMessage,
            file: {
                ...fileMessage.file,
                url: null // 移除本地URL，其他用户使用base64数据
            }
        };
        const sent = window.realtimeClient.sendMessage(fileMessageForOthers);
        if (sent) {
            // 发送成功后才添加到本地消息列表
            messages.push(fileMessage);
            saveRoomData();
        } else {
            // 发送失败，仍然保存到本地
            messages.push(fileMessage);
            saveRoomData();
        }
    } else {
        // 无网络连接时直接保存到本地
        messages.push(fileMessage);
        saveRoomData();
    }
    
    // 调试：文件类型信息
    console.log('处理文件:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        supportsAI: supportsAI
    });
    
    // 根据文件类型处理内容
    if (supportsAI) {
        // 支持AI分析的文件类型
    if (file.type === 'text/plain') {
        await processTextFile(file, fileMessage);
    } else if (file.type.startsWith('image/')) {
        // 图片文件 - 设置文件信息但不自动处理
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type
        };
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
    } else if (file.type === 'application/pdf' || file.type.includes('word')) {
        // PDF和Word文档 - 提取文本内容
        if (file.type === 'application/pdf') {
            await processPDFDocument(file, fileMessage);
        } else if (file.type.includes('word')) {
            await processWordDocument(file, fileMessage);
        }
        } else if (file.type.includes('excel') || file.type.includes('spreadsheet') || 
                   file.type === 'application/vnd.ms-excel' ||
                   file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        // Excel文件
        await processExcelDocument(file, fileMessage);
    } else if (file.type.includes('powerpoint') || file.type.includes('presentation')) {
        // PPT文件
        await processPPTDocument(file, fileMessage);
    } else if (file.type === 'text/csv') {
        // CSV文件
        await processCSVFile(file, fileMessage);
    } else if (file.type === 'application/json') {
        // JSON文件
        await processJSONFile(file, fileMessage);
    } else if (file.type === 'text/html' || file.type === 'text/xml') {
        // HTML/XML文件
        await processHTMLFile(file, fileMessage);
    } else {
            // 其他支持AI的文件类型 - 尝试提取文本内容
        await processGenericFile(file, fileMessage);
        }
    } else {
        // 不支持AI分析的文件类型 - 只显示文件信息，不提供AI工具
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type
        };
        
        showToast(`文件 ${file.name} 已上传，可供下载`, 'success');
        console.log(`不支持AI分析的文件类型: ${file.type}, 仅提供下载功能`);
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 处理图片OCR
async function processImageWithOCR(file, fileMessage) {
    try {
        showToast('正在识别图片中的文字...', 'info');
        
        const base64Image = await fileToBase64(file);
        
        const response = await fetch('https://api.deepbricks.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: '请识别这张图片中的所有文字内容，并保持原有格式。如果图片中包含表格或结构化数据，请以清晰的格式呈现。'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${file.type};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000
            })
        });
        
        if (!response.ok) {
            throw new Error('OCR识别失败');
        }
        
        const data = await response.json();
        const ocrText = data.choices[0].message.content;
        
        // 添加OCR结果消息
        const ocrMessage = {
            type: 'ocr',
            text: ocrText,
            originalFile: file.name,
            author: 'AI助手',
            userId: 'ai-assistant',
            time: new Date().toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
        
        messages.push(ocrMessage);
        renderMessage(ocrMessage);
        saveRoomData();
        
        // 发送OCR结果给其他用户
        if (isRealtimeEnabled && window.realtimeClient) {
            window.realtimeClient.sendMessage(ocrMessage);
        }
        
        showToast('OCR识别完成', 'success');
        
    } catch (error) {
        console.error('OCR识别失败:', error);
        showToast('OCR识别失败，请稍后重试', 'error');
    }
}

// 处理文本文件
async function processTextFile(file, fileMessage) {
    try {
        const text = await file.text();
        
        // 设置文件内容到currentFileInfo，供AI工具箱使用
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: text || '文本文件内容为空'
        };
        
        // 显示AI工具箱
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
        
    } catch (error) {
        console.error('文本文件读取失败:', error);
        showToast('文本文件读取失败', 'error');
    }
}

// 文件转Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

// 处理PDF文档
async function processPDFDocument(file, fileMessage) {
    try {
        showToast('正在提取PDF文档内容...', 'info');
        
        // 检查PDF.js是否加载
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js库未加载，请刷新页面重试');
        }
        
        const fileData = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;
        
        let fullText = '';
        const totalPages = pdf.numPages;
        
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        
        if (!fullText.trim()) {
            throw new Error('PDF文档中没有找到可提取的文本内容');
        }
        
        // 设置文件内容到currentFileInfo
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: fullText.trim() || 'PDF文档内容为空'
        };
        
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
        showToast('PDF文档内容提取完成', 'success');
        
    } catch (error) {
        console.error('PDF文档处理失败:', error);
        showToast(`PDF文档处理失败: ${error.message}`, 'error');
        
        // 即使失败也显示工具箱，但使用占位符内容
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: `这是一个PDF文档，但无法提取文本内容。请使用OCR功能或上传其他格式的文档。`
        };
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
    }
}

// 处理Word文档
async function processWordDocument(file, fileMessage) {
    try {
        showToast('正在提取Word文档内容...', 'info');
        
        // 检查mammoth.js是否加载
        if (typeof mammoth === 'undefined') {
            throw new Error('Mammoth.js库未加载，请刷新页面重试');
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        if (!result.value.trim()) {
            throw new Error('Word文档中没有找到可提取的文本内容');
        }
        
        // 设置文件内容到currentFileInfo
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: result.value.trim() || '文档内容为空'
        };
        
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
        showToast('Word文档内容提取完成', 'success');
        
    } catch (error) {
        console.error('Word文档处理失败:', error);
        showToast(`Word文档处理失败: ${error.message}`, 'error');
        
        // 即使失败也显示工具箱，但使用占位符内容
        window.currentFileInfo = {
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            content: `这是一个Word文档，但无法提取文本内容。请检查文档格式或上传其他格式的文档。`
        };
        showAIToolbar(file.name, window.currentFileInfo.url, file.type);
    }
}

// 渲染文件消息
function renderFileMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type === 'file' ? 'file-message' : 'text-message'}`;
    messageDiv.dataset.messageId = Date.now(); // 添加唯一标识
    
    const avatarColor = message.author === 'AI助手' ? '#6b7280' : getAvatarColor(message.author);
    const initials = message.author.charAt(0).toUpperCase();
    
    // 处理时间显示：如果有时间戳，使用本地时区格式化；否则使用原始时间
    let displayTime;
    if (message.timestamp) {
        displayTime = new Date(message.timestamp).toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } else {
        displayTime = message.time || new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar" style="background-color: ${avatarColor}">
            ${initials}
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${message.author}</span>
                <span class="message-time">${displayTime}</span>
            </div>
            ${renderFileContent(message)}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 更新消息内容（用于替换加载消息）
function updateMessage(messageId, newText, isError = false) {
    // 更新DOM元素
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageDiv) {
        const contentDiv = messageDiv.querySelector('.message-content');
        const headerDiv = contentDiv.querySelector('.message-header');
        
        messageDiv.classList.remove('loading');
        
        contentDiv.innerHTML = `
            <div class="message-header">
                ${headerDiv.innerHTML}
            </div>
            <div class="message-text ${isError ? 'error-text' : ''}">${newText}</div>
        `;
    }
    
    // 更新messages数组中的对应消息
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex !== -1) {
        messages[msgIndex].text = newText;
        messages[msgIndex].isLoading = false;
        
        // updateMessage现在只负责本地更新，不发送WebSocket消息
        // WebSocket发送由调用者单独处理
        
        // 保存到本地存储
        saveRoomData();
    }
}

// 添加加载消息并返回消息ID（仅本地显示，不发送给其他用户）
function addLoadingMessage(text) {
    const messageId = Date.now();
    const loadingMessage = {
        id: messageId,
        type: 'ai',
        text: text,
        author: 'AI助手',
        userId: 'ai-assistant',
        timestamp: Date.now(), // 使用UTC时间戳
        time: new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }),
        isLoading: true
    };
    
    // 只在本地添加，不发送给其他用户（这只是加载占位符）
    messages.push(loadingMessage);
    renderMessage(loadingMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageId;
}

// 渲染文件内容
function renderFileContent(message) {
    if (message.type === 'file') {
        const icon = getFileIcon(message.file.type);
        const messageId = Date.now();
        // 扩展AI支持检测，包含更多文件类型
        const aiSupportedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
            'application/pdf', 'text/plain', 'text/csv',
            // Word文档格式
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            // Excel表格格式
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            // PowerPoint演示文稿格式
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            // 其他文本格式
            'text/html', 'text/xml', 'application/json'
        ];
        
        const isSupportedForAI = aiSupportedTypes.includes(message.file.type);
        
        return `
            <div class="file-message" data-file-id="${messageId}" data-file-name="${message.file.name}" data-file-url="${message.file.url}" data-file-type="${message.file.type}">
                <i class="fas ${icon} file-icon"></i>
                <div class="file-info">
                    <div class="file-name">${message.file.name}</div>
                    <div class="file-size">${message.file.size}</div>
                    ${!isSupportedForAI ? '<div class="file-note">该文件类型暂不支持AI分析</div>' : ''}
                </div>
                <div class="file-actions">
                    <a href="${message.file.url}" download="${message.file.name}" class="file-download" title="下载文件">
                        <i class="fas fa-download"></i>
                    </a>
                    ${isSupportedForAI ? 
                        `<button class="btn-ai-tool" onclick="window.showAIToolbar('${message.file.name}', '${message.file.url}', '${message.file.type}')" title="AI工具">
                            <i class="fas fa-magic"></i>
                        </button>` : ''
                    }
                </div>
            </div>
        `;
    } else if (message.type === 'ocr') {
        return `
            <div class="ocr-result">
                <strong>图片文字识别结果 (${message.originalFile}):</strong>
                <div class="message-text">${message.text}</div>
            </div>
        `;
    } else if (message.type === 'text') {
        return `
            <div class="text-content">
                <strong>文本文件内容 (${message.originalFile}):</strong>
                <div class="message-text"><pre>${message.text}</pre></div>
            </div>
        `;
    }
}

// 获取文件图标
function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return 'fa-image';
    if (fileType === 'application/pdf') return 'fa-file-pdf';
    if (fileType.includes('word')) return 'fa-file-word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fa-file-excel';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'fa-file-powerpoint';
    if (fileType === 'text/plain') return 'fa-file-alt';
    if (fileType === 'text/csv') return 'fa-file-csv';
    if (fileType === 'application/json') return 'fa-file-code';
    if (fileType === 'text/html' || fileType === 'text/xml') return 'fa-file-code';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return 'fa-file-archive';
    if (fileType.startsWith('video/')) return 'fa-file-video';
    if (fileType.startsWith('audio/')) return 'fa-file-audio';
    return 'fa-file';
}

// AI工具箱面板功能 - 根据文件类型动态显示工具
async function showAIToolbar(fileName, fileUrl, fileType) {
    const placeholder = document.getElementById('toolboxPlaceholder');
    const activePanel = document.getElementById('toolboxActive');
    const currentFileName = document.getElementById('currentFileName');
    
    // 检查是否需要重新处理文件内容
    const needsContentProcessing = !window.currentFileInfo || 
                                  window.currentFileInfo.name !== fileName || 
                                  !window.currentFileInfo.content;
    
    // 设置当前文件信息到全局变量
    if (!window.currentFileInfo) {
        window.currentFileInfo = {};
    }
    
    // 保留现有的content，更新其他属性
    const existingContent = needsContentProcessing ? undefined : window.currentFileInfo.content;
    window.currentFileInfo = {
        name: fileName,
        url: fileUrl,
        type: fileType,
        content: existingContent
    };
    
    console.log('showAIToolbar设置文件信息:', {
        fileName: fileName,
        hasContent: !!window.currentFileInfo.content,
        contentLength: window.currentFileInfo.content ? window.currentFileInfo.content.length : 0,
        needsProcessing: needsContentProcessing
    });
    
    // 如果需要处理文件内容，异步下载并处理
    if (needsContentProcessing) {
        await processRemoteFile(fileName, fileUrl, fileType);
    }
    
    // 获取所有工具按钮
    const ocrBtn = document.getElementById('ocrBtn');
    const translateBtn = document.getElementById('translateBtn');
    const summarizeBtn = document.getElementById('summarizeBtn');
    const keywordsBtn = document.getElementById('keywordsBtn');
    
    // 扩展支持的文件类型检查
    const aiSupportedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
        'application/pdf', 'text/plain', 'text/csv',
        // Word文档格式
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // Excel表格格式
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // PowerPoint演示文稿格式
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // 其他文本格式
        'text/html', 'text/xml', 'application/json'
    ];
    
    const isSupportedForAI = aiSupportedTypes.includes(fileType);
    
    // 根据文件类型动态显示/隐藏工具按钮
    const isImage = fileType && fileType.startsWith('image/');
    const isText = fileType && (
        fileType === 'text/plain' || 
        fileType === 'text/csv' ||
        fileType === 'application/json' ||
        fileType === 'text/html' ||
        fileType === 'text/xml' ||
        fileType === 'application/pdf' ||
        // Word文档
        fileType === 'application/msword' ||
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        // Excel表格
        fileType === 'application/vnd.ms-excel' ||
        fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        // PowerPoint演示文稿
        fileType === 'application/vnd.ms-powerpoint' ||
        fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    
    // 对于不支持AI分析的文件类型，完全隐藏AI工具箱
    if (!isSupportedForAI) {
        placeholder.style.display = 'block';
        activePanel.style.display = 'none';
        return;
    }
    
    // 显示文件名
    currentFileName.textContent = fileName;
    
    // OCR - 仅图片可用
    ocrBtn.style.display = isImage ? 'flex' : 'none';
    ocrBtn.disabled = !isImage;
    
    // 翻译、总结、关键词 - 文本类文件可用
    translateBtn.style.display = isText ? 'flex' : 'none';
    summarizeBtn.style.display = isText ? 'flex' : 'none';
    keywordsBtn.style.display = isText ? 'flex' : 'none';
    
    translateBtn.disabled = !isText;
    summarizeBtn.disabled = !isText;
    keywordsBtn.disabled = !isText;
    
    // 显示活跃面板
    placeholder.style.display = 'none';
    activePanel.style.display = 'block';
}

function performOCR() {
    if (!window.currentFileInfo || !window.currentFileInfo.type.startsWith('image/')) {
        showToast('此功能仅适用于图片文件', 'error');
        return;
    }
    
    const { name, url, type } = window.currentFileInfo;
    
    // 添加加载消息并获取消息ID
    const messageId = addLoadingMessage(`正在对图片 "${name}" 进行OCR文字识别，请稍候...`);
    
    // 创建临时文件对象
    fetch(url)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], name, { type: type });
            return processImageWithOCR(file, { name: name });
        })
        .then(() => {
            // 处理完成，更新加载消息为成功消息
            updateMessage(messageId, `OCR文字识别完成！识别结果已添加到聊天记录中。`);
            
            // 同时创建一个新的AI消息发送给其他用户
            const aiMessage = {
                type: 'ai',
                text: `OCR文字识别完成！识别结果已添加到聊天记录中。`,
                author: 'AI助手',
                userId: 'ai-assistant',
                time: new Date().toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
            };
            
            // 发送给其他用户
            if (isRealtimeEnabled && window.realtimeClient) {
                window.realtimeClient.sendMessage(aiMessage);
            }
        })
        .catch(err => {
            console.error('获取文件失败:', err);
            
            // 处理失败，更新加载消息为错误消息
            updateMessage(messageId, `抱歉，对图片 "${name}" 进行OCR识别时出错：${err.message}`, true);
        });
}

async function translateText() {
    if (!window.currentFileInfo) {
        showToast('请先选择文件', 'error');
        return;
    }
    
    const { name, content } = window.currentFileInfo;
    
    // 添加加载消息并获取消息ID
    const messageId = addLoadingMessage(`正在翻译文件 "${name}" 的内容，请稍候...`);
    
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的翻译助手，请将用户提供的文本翻译成中文。请保持原文格式，准确翻译内容。'
                    },
                    {
                        role: 'user',
                        content: `请翻译以下内容：\n\n${content || '文档内容为空'}`
                    }
                ],
                max_tokens: 1000,
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            throw new Error('翻译服务响应异常');
        }
        
        const data = await response.json();
        const translatedText = data.choices[0].message.content;
        
        // 更新加载消息为成功结果
        updateMessage(messageId, `📋 **文件翻译完成：${name}**\n\n${translatedText}`);
        
        // 同时创建一个新的AI消息发送给其他用户
        const aiMessage = {
            type: 'ai',
            text: `📋 **文件翻译完成：${name}**\n\n${translatedText}`,
            author: 'AI助手',
            userId: 'ai-assistant',
            time: new Date().toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
        
        // 发送给其他用户
        if (isRealtimeEnabled && window.realtimeClient) {
            window.realtimeClient.sendMessage(aiMessage);
        }
        
    } catch (error) {
        console.error('翻译失败:', error);
        
        // 更新加载消息为错误结果
        updateMessage(messageId, `❌ 翻译失败：${error.message}。请稍后重试。`, true);
    }
}

async function summarizeText() {
    if (!window.currentFileInfo) {
        showToast('请先选择文件', 'error');
        return;
    }
    
    const { name, content } = window.currentFileInfo;
    
    // 调试信息
    console.log('总结函数调用:', {
        fileName: name,
        hasContent: !!content,
        contentLength: content ? content.length : 0,
        contentPreview: content ? content.substring(0, 100) + '...' : 'null/undefined'
    });
    
    // 添加加载消息并获取消息ID
    const messageId = addLoadingMessage(`正在总结文件 "${name}" 的内容，请稍候...`);
    
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的文本总结助手，请为用户提供简洁准确的文本摘要。请用中文总结，突出关键信息和要点。'
                    },
                    {
                        role: 'user',
                        content: `请总结以下文本内容，提供简洁的摘要：\n\n${content || '文档内容为空'}`
                    }
                ],
                max_tokens: 500,
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            throw new Error('总结服务响应异常');
        }
        
        const data = await response.json();
        const summary = data.choices[0].message.content;
        
        // 更新加载消息为成功结果
        updateMessage(messageId, `📝 **文件总结：${name}**\n\n${summary}`);
        
        // 同时创建一个新的AI消息发送给其他用户
        const aiMessage = {
            type: 'ai',
            text: `📝 **文件总结：${name}**\n\n${summary}`,
            author: 'AI助手',
            userId: 'ai-assistant',
            time: new Date().toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
        
        // 发送给其他用户
        if (isRealtimeEnabled && window.realtimeClient) {
            window.realtimeClient.sendMessage(aiMessage);
        }
        
    } catch (error) {
        console.error('总结失败:', error);
        
        // 更新加载消息为错误结果
        updateMessage(messageId, `❌ 总结失败：${error.message}。请稍后重试。`, true);
    }
}

async function extractKeywords() {
    if (!window.currentFileInfo) {
        showToast('请先选择文件', 'error');
        return;
    }
    
    const { name, content } = window.currentFileInfo;
    
    // 添加加载消息并获取消息ID
    const messageId = addLoadingMessage(`正在从文件 "${name}" 中提取关键词，请稍候...`);
    
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的关键词提取助手，请从文本中提取最重要的关键词和短语。请用中文回复，列出5-10个关键词，并简要说明每个关键词的重要性。'
                    },
                    {
                        role: 'user',
                        content: `请从以下文本中提取关键词：\n\n${content || '文档内容为空'}`
                    }
                ],
                max_tokens: 400,
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            throw new Error('关键词提取服务响应异常');
        }
        
        const data = await response.json();
        const keywords = data.choices[0].message.content;
        
        // 更新加载消息为成功结果
        updateMessage(messageId, `🔑 **关键词提取：${name}**\n\n${keywords}`);
        
        // 同时创建一个新的AI消息发送给其他用户
        const aiMessage = {
            type: 'ai',
            text: `🔑 **关键词提取：${name}**\n\n${keywords}`,
            author: 'AI助手',
            userId: 'ai-assistant',
            time: new Date().toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
        
        // 发送给其他用户
        if (isRealtimeEnabled && window.realtimeClient) {
            window.realtimeClient.sendMessage(aiMessage);
        }
        
    } catch (error) {
        console.error('关键词提取失败:', error);
        
        // 更新加载消息为错误结果
        updateMessage(messageId, `❌ 关键词提取失败：${error.message}。请稍后重试。`, true);
    }
}





// 测试XLSX库函数
function testXLSXLibrary() {
    console.log('=== XLSX库测试 ===');
    console.log('XLSX对象:', typeof XLSX);
    if (typeof XLSX !== 'undefined') {
        console.log('XLSX.version:', XLSX.version);
        console.log('XLSX.utils存在:', !!XLSX.utils);
        console.log('sheet_to_csv方法存在:', typeof XLSX.utils.sheet_to_csv);
        console.log('sheet_to_json方法存在:', typeof XLSX.utils.sheet_to_json);
        
        // 在页面上也显示状态
        showToast(`XLSX库状态: 已加载 (版本: ${XLSX.version})`, 'success');
    } else {
        console.error('XLSX库未加载！');
        showToast('XLSX库未加载！请检查网络连接', 'error');
    }
    console.log('==================');
}

// 处理远程文件（其他用户上传的文件）
async function processRemoteFile(fileName, fileUrl, fileType) {
    try {
        showToast(`正在处理远程文件 "${fileName}"...`, 'info');
        console.log('开始处理远程文件:', {fileName, fileUrl, fileType});
        
        // 下载文件
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`下载文件失败: ${response.status}`);
        }
        
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: fileType });
        
        console.log('远程文件下载完成:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        });
        
        // 根据文件类型处理内容
        if (fileType === 'text/plain') {
            await processTextFileContent(file);
        } else if (fileType.startsWith('image/')) {
            // 图片文件不需要内容处理，直接使用
            window.currentFileInfo.content = `图片文件: ${fileName}`;
        } else if (fileType === 'application/pdf') {
            await processPDFFileContent(file);
        } else if (fileType.includes('word') || 
                   fileType === 'application/msword' ||
                   fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            await processWordFileContent(file);
        } else if (fileType.includes('excel') || fileType.includes('spreadsheet') ||
                   fileType === 'application/vnd.ms-excel' ||
                   fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            await processExcelFileContent(file);
        } else if (fileType.includes('powerpoint') || fileType.includes('presentation') ||
                   fileType === 'application/vnd.ms-powerpoint' ||
                   fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
            await processPPTFileContent(file);
        } else if (fileType === 'text/csv') {
            await processCSVFileContent(file);
        } else if (fileType === 'application/json') {
            await processJSONFileContent(file);
        } else {
            // 不支持的文件类型
            window.currentFileInfo.content = `文件: ${fileName}\n文件大小: ${formatFileSize(file.size)}\n文件类型: ${fileType}\n\n这是一个二进制文件，无法直接解析其内容。`;
        }
        
        console.log('远程文件处理完成:', {
            fileName: fileName,
            hasContent: !!window.currentFileInfo.content,
            contentLength: window.currentFileInfo.content ? window.currentFileInfo.content.length : 0
        });
        
        showToast('远程文件处理完成，可以进行AI分析', 'success');
        
    } catch (error) {
        console.error('处理远程文件失败:', error);
        showToast(`处理远程文件失败: ${error.message}`, 'error');
        
        // 设置占位符内容
        window.currentFileInfo.content = `远程文件处理失败: ${error.message}`;
    }
}

// 辅助函数：处理各类文件内容（不包含UI更新）
async function processTextFileContent(file) {
    const text = await file.text();
    window.currentFileInfo.content = `文本文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n\n内容：\n${text}`;
}

async function processPDFFileContent(file) {
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js库未加载');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
    }
    
    window.currentFileInfo.content = fullText.trim() || 'PDF文档内容为空';
}

async function processWordFileContent(file) {
    if (typeof mammoth === 'undefined') {
        throw new Error('Mammoth.js库未加载');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    window.currentFileInfo.content = result.value.trim() || 'Word文档内容为空';
}

async function processExcelFileContent(file) {
    if (typeof XLSX === 'undefined') {
        throw new Error('XLSX.js库未加载');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let allSheetsContent = '';
    const sheetNames = workbook.SheetNames;
    
    for (let i = 0; i < sheetNames.length; i++) {
        const sheetName = sheetNames[i];
        const worksheet = workbook.Sheets[sheetName];
        
        try {
            let sheetContent = '';
            
            if (typeof XLSX.utils.sheet_to_csv === 'function') {
                const csvData = XLSX.utils.sheet_to_csv(worksheet);
                if (csvData && csvData.trim()) {
                    sheetContent = csvData.trim();
                }
            }
            
            if (!sheetContent && typeof XLSX.utils.sheet_to_json === 'function') {
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                if (jsonData && jsonData.length > 0) {
                    sheetContent = jsonData.map(row => (row || []).join('\t')).filter(line => line.trim()).join('\n');
                }
            }
            
            if (sheetContent && sheetContent.trim()) {
                allSheetsContent += `\n=== 工作表: ${sheetName} ===\n`;
                allSheetsContent += sheetContent.trim() + '\n';
            }
        } catch (sheetError) {
            console.warn(`处理工作表 ${sheetName} 失败:`, sheetError);
        }
    }
    
    const content = `Excel文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n工作表数量: ${sheetNames.length}\n\n内容：${allSheetsContent.trim()}`;
    window.currentFileInfo.content = content;
}

async function processPPTFileContent(file) {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const isZipFormat = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B;
    
    let content = `PowerPoint文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n文件类型: ${file.type}\n\n`;
    
    if (isZipFormat) {
        content += `文件格式：PowerPoint 2007+ (.pptx)\n压缩格式：是（基于XML）\n\n`;
        content += `内容摘要：这是一个现代PowerPoint演示文稿文件。由于PPT文件结构复杂，无法直接提取文本内容，但您可以使用AI工具进行智能分析。`;
    } else {
        content += `文件格式：PowerPoint 97-2003 (.ppt)\n压缩格式：否（二进制格式）\n\n`;
        content += `内容摘要：这是一个传统PowerPoint演示文稿文件。建议转换为.pptx格式以获得更好的兼容性，或使用AI工具进行内容分析。`;
    }
    
    window.currentFileInfo.content = content;
}

async function processCSVFileContent(file) {
    const text = await file.text();
    window.currentFileInfo.content = `CSV文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n\n内容：\n${text}`;
}

async function processJSONFileContent(file) {
    const text = await file.text();
    try {
        const jsonObj = JSON.parse(text);
        const formattedJson = JSON.stringify(jsonObj, null, 2);
        window.currentFileInfo.content = `JSON文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n\n格式化内容：\n${formattedJson}`;
    } catch (error) {
        window.currentFileInfo.content = `JSON文件: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n\n原始内容：\n${text}`;
    }
}

// 将函数暴露到全局作用域
window.showAIToolbar = showAIToolbar;
window.performOCR = performOCR;
window.translateText = translateText;
window.summarizeText = summarizeText;
window.extractKeywords = extractKeywords;
window.testXLSXLibrary = testXLSXLibrary;
window.processRemoteFile = processRemoteFile;

// 修改renderMessage函数以支持文件消息
const originalRenderMessage = renderMessage;
renderMessage = function(message) {
    if (message.type === 'file' || message.type === 'ocr' || message.type === 'text') {
        renderFileMessage(message);
    } else {
        originalRenderMessage(message);
    }
};

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', init);

// 语音相关全局变量
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let audioContext = null;
let recognition = null;
let isTranscribing = false;
let currentAudioBlob = null;
let audioQueue = [];
let isPlayingAudio = false;

// 语音通话相关变量
let localStream = null;
let remoteStreams = new Map(); // userId -> MediaStream
let peerConnections = new Map(); // userId -> RTCPeerConnection
let isInCall = false;
let isMuted = false;

// 跨網路連線強化：全域偏好 TURN 與 relay-only 模式
let preferredTurnServer = null; // { urls, username, credential }
let forceRelayMode = false;     // 當為 true 時，建立連線將強制僅使用 TURN (relay)
// 嘗試從服務端拉取 ICE 配置
async function loadServerIceConfig() {
    try {
        const res = await fetch('/api/ice', { cache: 'no-cache' });
        if (!res.ok) return false;
        const data = await res.json();
        if (data && Array.isArray(data.turnServers) && data.turnServers.length > 0) {
            preferredTurnServer = data.turnServers[0];
            console.log('☁️ 從服務端獲取 TURN:', preferredTurnServer);
            return true;
        }
        return false;
    } catch (e) {
        console.warn('獲取服務端 ICE 配置失敗:', e);
        return false;
    }
}

// 掃描一組 TURN，選擇可用的最佳候選
async function selectBestTurnServer() {
    const candidates = [];
    if (preferredTurnServer) candidates.push(preferredTurnServer);
    candidates.push(
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turns:relay1.expressturn.com:5349', username: 'ef4CVDZETE4TAMK426', credential: 'ugBu0jkKWIE6tIGG' }
    );
    for (const s of candidates) {
        try {
            const r = await testTurnServer(s);
            if (r && r.success) return s;
        } catch {}
    }
    return null;
}
let isSpeakerOn = true;
let callParticipants = new Set();
let callStartTime = null;
let callDuration = null;

// 初始化麦克风状态
function initializeMicrophoneState() {
    try {
        const savedPreference = localStorage.getItem('microphonePreference');
        if (savedPreference !== null) {
            isMuted = savedPreference === 'true';
            console.log('🔄 初始化麦克风状态偏好:', isMuted ? '静音' : '开启');
        } else {
            // 默认为开启状态
            isMuted = false;
            console.log('🎙️ 初始化默认麦克风状态: 开启');
        }
    } catch (error) {
        console.warn('⚠️ 无法初始化麦克风状态偏好，使用默认设置:', error);
        isMuted = false;
    }
}

// 验证麦克风状态一致性
function validateMicrophoneState() {
    if (!isInCall || !localStream) return;
    
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
        console.warn('⚠️ 没有音频轨道可用');
        return;
    }
    
    const actualMuted = !audioTracks[0].enabled;
    if (actualMuted !== isMuted) {
        console.warn('⚠️ 检测到麦克风状态不一致，正在修复...');
        console.log('预期状态:', isMuted ? '静音' : '开启', '实际状态:', actualMuted ? '静音' : '开启');
        
        // 修复状态不一致
        isMuted = actualMuted;
        syncMicrophoneUI();
        updateCallParticipants();
        
        console.log('✅ 麦克风状态已修复');
    }
}

// 调试WebRTC连接状态
function debugWebRTCConnections() {
    console.log('🔍 WebRTC连接调试信息:');
    console.log('通话状态:', isInCall);
    console.log('参与者数量:', callParticipants.size);
    console.log('对等连接数量:', peerConnections.size);
    console.log('远程流数量:', remoteStreams.size);
    
    if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        console.log('本地音频轨道:', audioTracks.length, audioTracks.map(t => ({
            enabled: t.enabled,
            readyState: t.readyState,
            label: t.label
        })));
    }
    
    peerConnections.forEach((pc, userId) => {
        console.log(`用户 ${userId} 连接状态:`, {
            iceConnectionState: pc.iceConnectionState,
            connectionState: pc.connectionState,
            signalingState: pc.signalingState
        });
    });
    
    // 检查远程音频元素
    const audioElements = document.querySelectorAll('audio[data-user-id]');
    console.log('远程音频元素:', audioElements.length);
    audioElements.forEach(audio => {
        console.log(`音频元素 ${audio.getAttribute('data-user-id')}:`, {
            paused: audio.paused,
            volume: audio.volume,
            muted: audio.muted,
            readyState: audio.readyState
        });
    });
}

// 将调试函数暴露到全局，方便开发者调用
window.debugWebRTC = debugWebRTCConnections;

// ==================== 自动诊断和修复功能 ====================

// 自动检查WebSocket连接状态
async function autoCheckWebSocketConnection() {
    console.log('🔍 ===== 自动WebSocket连接状态检查 =====');
    
    if (!window.realtimeClient) {
        console.error('❌ 实时客户端未初始化');
        return false;
    }
    
    if (!window.realtimeClient.socket) {
        console.error('❌ WebSocket对象不存在');
        return false;
    }
    
    const socket = window.realtimeClient.socket;
    
    console.log('📊 WebSocket状态详情:', {
        connected: socket.connected,
        disconnected: socket.disconnected,
        readyState: socket.readyState,
        id: socket.id,
        transport: socket.io ? socket.io.engine.transport.name : '未知',
        url: socket.io ? socket.io.uri : '未知',
        ping: socket.ping || '未知'
    });
    
    if (socket.connected) {
        console.log('✅ WebSocket连接正常');
        return true;
    } else {
        console.error('❌ WebSocket连接断开');
        return false;
    }
}

// 自动修复WebSocket连接
async function autoRepairWebSocketConnection() {
    console.log('🔧 ===== 自动修复WebSocket连接 =====');
    
    showToast('网络连接异常，正在自动修复...', 'warning');
    
    try {
        // 尝试重新连接websocket
        if (window.realtimeClient && window.realtimeClient.establishConnection) {
            console.log('🔄 尝试重新建立WebSocket连接...');
            window.realtimeClient.establishConnection();
            
            // 等待连接建立
            return new Promise((resolve) => {
                let attempts = 0;
                const maxAttempts = 10;
                
                const checkConnection = () => {
                    attempts++;
                    
                    if (window.realtimeClient.socket && window.realtimeClient.socket.connected) {
                        console.log('✅ WebSocket重连成功');
                        showToast('网络连接已恢复', 'success');
                        resolve(true);
                        return;
                    }
                    
                    if (attempts >= maxAttempts) {
                        console.error('❌ WebSocket重连失败，已达到最大尝试次数');
                        showToast('网络连接修复失败，请检查网络', 'error');
                        resolve(false);
                        return;
                    }
                    
                    console.log(`🔄 WebSocket重连中... (${attempts}/${maxAttempts})`);
                    setTimeout(checkConnection, 1000);
                };
                
                // 开始检查连接
                setTimeout(checkConnection, 1000);
            });
        }
    } catch (error) {
        console.error('❌ 自动修复WebSocket失败:', error);
        showToast('网络连接修复失败', 'error');
        return false;
    }
}

// 自动运行网络诊断
async function autoRunNetworkDiagnosis() {
    console.log('🔍 ===== 自动网络诊断开始 =====');
    
    try {
        // 快速测试主要的TURN服务器
        const criticalTurnServers = [
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:numb.viagenie.ca:3478',
                username: 'webrtc@live.com',
                credential: 'muazkh'
            }
        ];
        
        console.log('🧪 测试关键TURN服务器...');
        let workingTurnServers = 0;
        
        for (const turnServer of criticalTurnServers) {
            try {
                console.log(`📡 快速测试 ${turnServer.urls}...`);
                const testResult = await testTurnServer(turnServer);
                
                if (testResult.success) {
                    workingTurnServers++;
                    console.log(`✅ ${turnServer.urls} 可用`);
                } else {
                    console.log(`❌ ${turnServer.urls} 不可用:`, testResult.error);
                }
            } catch (error) {
                console.log(`❌ ${turnServer.urls} 测试失败:`, error.message);
            }
        }
        
        // 诊断结果
        if (workingTurnServers === 0) {
            console.error('🚨 严重: 所有关键TURN服务器都不可用! 跨网络通话将失败');
            showToast('网络穿透能力受限，可能无法建立跨网络通话', 'error');
        } else {
            console.log(`✅ 网络诊断完成，${workingTurnServers}/${criticalTurnServers.length} 个TURN服务器可用`);
        }
        
    } catch (error) {
        console.error('❌ 自动网络诊断失败:', error);
    }
    
    console.log('🔍 ===== 自动网络诊断完成 =====');
}

// 自动显示完整状态信息
function autoShowCompleteStatus() {
    console.log('📊 ===== 自动状态总览 =====');
    console.log('📞 通话状态:', isInCall);
    console.log('👥 参与者列表:', Array.from(callParticipants));
    console.log('🔗 WebRTC连接数量:', peerConnections.size);
    console.log('📡 远程流数量:', remoteStreams.size);
    
    // 显示每个连接的详细状态
    peerConnections.forEach((pc, userId) => {
        console.log(`🔗 用户 ${userId} 连接状态:`, {
            iceConnectionState: pc.iceConnectionState,
            connectionState: pc.connectionState,
            signalingState: pc.signalingState,
            iceGatheringState: pc.iceGatheringState
        });
    });
    
    // 显示远程音频元素状态
    const audioElements = document.querySelectorAll('audio[data-user-id]');
    console.log('🔊 音频元素数量:', audioElements.length);
    audioElements.forEach(audio => {
        const userId = audio.getAttribute('data-user-id');
        console.log(`🔊 用户 ${userId} 音频状态:`, {
            paused: audio.paused,
            volume: audio.volume,
            muted: audio.muted,
            readyState: audio.readyState,
            error: audio.error ? audio.error.message : null
        });
    });
    
    console.log('🔍 WebSocket连接状态:', window.realtimeClient && window.realtimeClient.socket ? window.realtimeClient.socket.connected : '未连接');
    console.log('📊 ===== 状态总览结束 =====');
}

// 自动连接修复尝试
async function autoAttemptConnectionRepair(userId) {
    console.log('🔧 ===== 自动连接修复 =====');
    console.log('👤 目标用户:', userId);
    
    // 检查是否应该尝试修复
    if (!isInCall || !callParticipants.has(userId)) {
        console.log('⚠️ 通话已结束或用户已离开，跳过修复');
        return;
    }
    
    showToast(`正在自动尝试修复与 ${userId} 的连接...`, 'info');
    
    try {
        // 清理旧连接
        if (peerConnections.has(userId)) {
            const oldConnection = peerConnections.get(userId);
            oldConnection.close();
            peerConnections.delete(userId);
        }
        
        if (remoteStreams.has(userId)) {
            remoteStreams.delete(userId);
        }
        
        const audioElement = document.getElementById(`remote-audio-${userId}`);
        if (audioElement) {
            audioElement.remove();
        }
        
        console.log('🧹 旧连接资源清理完成');
        
        // 等待一小段时间
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 重新创建连接
        console.log('🔗 重新创建WebRTC连接...');
        const peerConnection = createPeerConnection(userId, true); // 🚀 使用增强模式
        
        // 创建并发送新的offer
        console.log('📤 创建新的Offer...');
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
        });
        
        await peerConnection.setLocalDescription(offer);
        console.log('✅ 本地描述设置完成');
        
        // 检查WebSocket并发送
        if (window.realtimeClient && window.realtimeClient.socket && window.realtimeClient.socket.connected) {
            window.realtimeClient.sendCallOffer({
                roomId,
                targetUserId: userId,
                offer: peerConnection.localDescription,
                fromUserId: currentUserId
            });
            
            console.log('📤 修复Offer已发送');
            showToast('连接修复请求已发送，等待响应...', 'info');
            
        } else {
            console.error('❌ WebSocket未连接，修复失败');
            showToast('网络连接异常，修复失败', 'error');
        }
        
    } catch (error) {
        console.error('❌ 自动连接修复失败:', error);
        showToast('自动修复失败', 'error');
    }
    
    console.log('🔧 ===== 自动连接修复完成 =====');
}

// 智能连接修复 - 基于网络质量的自适应修复策略
async function performIntelligentConnectionRepair(networkQuality = null) {
    console.log('🚀 ===== 智能连接修复开始 =====');
    
    if (!isInCall) {
        console.log('⚠️ 通话已结束，跳过修复');
        return;
    }
    
    // 如果没有提供网络质量信息，先检测
    if (!networkQuality) {
        networkQuality = await detectNetworkQuality();
    }
    
    console.log('📊 网络质量评估:', networkQuality);
    
    // 根据网络质量选择修复策略
    let repairStrategy = 'conservative'; // 默认保守策略
    if (networkQuality.score > 70) {
        repairStrategy = 'aggressive'; // 网络好时使用激进策略
    } else if (networkQuality.score > 40) {
        repairStrategy = 'moderate'; // 中等网络使用适中策略
    }
    
    console.log('🔧 选择修复策略:', repairStrategy);
    
    // 分析所有问题连接
    const problemConnections = [];
    peerConnections.forEach((pc, userId) => {
        if (pc.iceConnectionState === 'new' || 
            pc.iceConnectionState === 'checking' ||
            pc.signalingState === 'have-local-offer' ||
            !remoteStreams.has(userId)) {
            problemConnections.push(userId);
        }
    });
    
    if (problemConnections.length === 0) {
        console.log('✅ 没有发现问题连接');
        return;
    }
    
    console.log('🔍 发现问题连接:', problemConnections);
    showToast(`检测到 ${problemConnections.length} 个连接问题，正在智能修复...`, 'warning');
    
    // 🚀 策略1: 强制信令重试
    console.log('🔄 策略1: 强制信令重试...');
    await forceSignalingRetry(problemConnections);
    
    // 等待2秒检查是否有改善
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 检查修复效果
    const stillProblem = [];
    problemConnections.forEach(userId => {
        const pc = peerConnections.get(userId);
        if (pc && (pc.iceConnectionState === 'new' || !remoteStreams.has(userId))) {
            stillProblem.push(userId);
        }
    });
    
    if (stillProblem.length > 0) {
        console.log('⚠️ 信令重试后仍有问题，执行策略2...');
        
        // 🚀 策略2: 激进重建连接
        console.log('🔄 策略2: 激进重建连接...');
        await aggressiveConnectionRebuild(stillProblem);
        
        // 再等待3秒检查
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 最终检查
        const finalCheck = [];
        stillProblem.forEach(userId => {
            const pc = peerConnections.get(userId);
            if (pc && (pc.iceConnectionState === 'new' || !remoteStreams.has(userId))) {
                finalCheck.push(userId);
            }
        });
        
        if (finalCheck.length > 0) {
            console.error('❌ 智能修复失败，可能是网络环境过于复杂');
            showToast('网络环境复杂，建议检查防火墙设置或更换网络', 'error');
            
            // 🚀 策略3: 最后的备用方案
            console.log('🔄 策略3: 备用连接方案...');
            await implementFallbackStrategy(finalCheck);
        } else {
            console.log('✅ 激进重建成功!');
            showToast('连接已成功修复', 'success');
        }
    } else {
        console.log('✅ 信令重试成功!');
        showToast('连接已通过信令重试修复', 'success');
    }
    
    console.log('🚀 ===== 智能连接修复完成 =====');
}

// 强制信令重试
async function forceSignalingRetry(userIds) {
    console.log('📡 ===== 强制信令重试 =====');
    
    for (const userId of userIds) {
        console.log(`🔄 重试用户 ${userId} 的信令协商...`);
        
        const pc = peerConnections.get(userId);
        if (!pc) continue;
        
        try {
            // 如果是offer方，重新发送offer
            if (currentUserId < userId) {
                console.log(`📤 重新发送Offer给 ${userId}...`);
                
                const offer = await pc.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: false,
                    iceRestart: true // 强制ICE重启
                });
                
                await pc.setLocalDescription(offer);
                
                if (window.realtimeClient && window.realtimeClient.socket && window.realtimeClient.socket.connected) {
                    // 重试发送3次，确保可靠性
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        console.log(`📤 发送Offer尝试 ${attempt}/3 给 ${userId}`);
                        
                        window.realtimeClient.sendCallOffer({
                            roomId,
                            targetUserId: userId,
                            offer: pc.localDescription,
                            fromUserId: currentUserId,
                            retry: true,
                            attempt: attempt
                        });
                        
                        if (attempt < 3) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                } else {
                    console.error('❌ WebSocket未连接，无法重试信令');
                }
            }
        } catch (error) {
            console.error(`❌ 用户 ${userId} 信令重试失败:`, error);
        }
    }
    
    console.log('📡 ===== 强制信令重试完成 =====');
}

// 激进重建连接
async function aggressiveConnectionRebuild(userIds) {
    console.log('💥 ===== 激进重建连接 =====');
    
    for (const userId of userIds) {
        console.log(`💥 激进重建用户 ${userId} 的连接...`);
        
        try {
            // 1. 完全清理旧连接
            if (peerConnections.has(userId)) {
                const oldPc = peerConnections.get(userId);
                oldPc.close();
                peerConnections.delete(userId);
                console.log(`🗑️ 已清理用户 ${userId} 的旧连接`);
            }
            
            if (remoteStreams.has(userId)) {
                remoteStreams.delete(userId);
            }
            
            const audioElement = document.getElementById(`remote-audio-${userId}`);
            if (audioElement) {
                audioElement.remove();
                console.log(`🗑️ 已移除用户 ${userId} 的音频元素`);
            }
            
            // 2. 使用增强配置重新创建连接
            console.log(`🔗 使用增强配置重建用户 ${userId} 的连接...`);
            const newPc = createEnhancedPeerConnection(userId);
            
            // 3. 如果是offer方，立即创建offer
            if (currentUserId < userId) {
                const offer = await newPc.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: false
                });
                
                await newPc.setLocalDescription(offer);
                
                if (window.realtimeClient && window.realtimeClient.socket && window.realtimeClient.socket.connected) {
                    console.log(`📤 发送激进重建Offer给 ${userId}`);
                    window.realtimeClient.sendCallOffer({
                        roomId,
                        targetUserId: userId,
                        offer: newPc.localDescription,
                        fromUserId: currentUserId,
                        aggressiveRebuild: true
                    });
                }
            }
            
            console.log(`✅ 用户 ${userId} 连接激进重建完成`);
            
        } catch (error) {
            console.error(`❌ 用户 ${userId} 激进重建失败:`, error);
        }
        
        // 每个用户之间稍作停顿
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('💥 ===== 激进重建连接完成 =====');
}

// 创建增强的WebRTC连接
function createEnhancedPeerConnection(userId) {
    console.log('🚀 创建增强WebRTC连接:', userId);
    
    // 增强的ICE服务器配置 - 更多服务器，更高成功率
    const enhancedIceServers = [
        // Google STUN服务器
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        
        // 其他公共STUN服务器
        { urls: 'stun:stunserver.org' },
        { urls: 'stun:stun.voiparound.com' },
        { urls: 'stun:stun.voipbuster.com' },
        { urls: 'stun:stun.ekiga.net' },
        
        // 高可靠性TURN服务器
        {
            urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: ['turn:openrelay.metered.ca:80?transport=tcp', 'turn:openrelay.metered.ca:443?transport=tcp'],
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: ['turn:numb.viagenie.ca:3478', 'turn:numb.viagenie.ca:3479'],
            username: 'webrtc@live.com',
            credential: 'muazkh'
        },
        {
            urls: 'turn:turn.bistri.com:80',
            username: 'homeo',
            credential: 'homeo'
        },
        {
            urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
            username: 'webrtc',
            credential: 'webrtc'
        },
        
        // 备用TURN服务器
        {
            urls: ['turn:global.relay.metered.ca:80', 'turn:global.relay.metered.ca:443'],
            username: 'bdb1e980-e364-4e60-b8dd-3d5ca4b39b90',
            credential: '2HJBJOLBNNDl1hqw'
        }
    ];
    
    let enhancedConfig = {
        iceServers: enhancedIceServers,
        iceCandidatePoolSize: 20,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
    };

    // 若強制 relay，套用 relay-only 並優先使用偏好 TURN
    if (forceRelayMode) {
        console.warn('🛡️ 增强连接使用 relay-only 模式');
        const servers = [];
        if (preferredTurnServer) servers.push(preferredTurnServer);
        servers.push(
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
        );
        enhancedConfig = {
            iceServers: servers,
            iceTransportPolicy: 'relay',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            iceCandidatePoolSize: 10
        };
    }
    
    const peerConnection = new RTCPeerConnection(enhancedConfig);
    
    // 添加本地流
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
            console.log('🎵 增强连接添加本地轨道:', track.kind, track.enabled);
        });
    }
    
    // 增强的事件监听器
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log(`🧊 增强连接ICE候选 [${userId}]:`, {
                type: event.candidate.type,
                protocol: event.candidate.protocol,
                address: event.candidate.address,
                port: event.candidate.port,
                priority: event.candidate.priority
            });
            
            if (isRealtimeEnabled && window.realtimeClient) {
                window.realtimeClient.sendIceCandidate({
                    roomId,
                    candidate: event.candidate,
                    targetUserId: userId,
                    fromUserId: currentUserId,
                    enhanced: true
                });
            }
        } else {
            console.log(`✅ 增强连接ICE候选收集完成 [${userId}]`);
        }
    };
    
    // 更详细的连接状态监控
    peerConnection.oniceconnectionstatechange = () => {
        console.log(`🔗 增强连接ICE状态变化 [${userId}]:`, peerConnection.iceConnectionState);
        
        if (peerConnection.iceConnectionState === 'connected') {
            console.log(`🎉 增强连接建立成功 [${userId}]!`);
            showToast(`与 ${userId} 的连接已建立`, 'success');
        } else if (peerConnection.iceConnectionState === 'failed') {
            console.error(`❌ 增强连接失败 [${userId}]`);
            setTimeout(() => {
                console.log(`🔄 增强连接失败，5秒后重试 [${userId}]...`);
                autoAttemptConnectionRepair(userId);
            }, 5000);
        }
    };
    
    peerConnection.ontrack = (event) => {
        console.log(`📡 增强连接接收到远程流 [${userId}]:`, event.streams[0]);
        const remoteStream = event.streams[0];
        remoteStreams.set(userId, remoteStream);
        
        // 创建增强的音频元素
        createEnhancedAudioElement(userId, remoteStream);
    };
    
    // 30秒超时检测
    setTimeout(() => {
        if (peerConnection.iceConnectionState === 'new' || peerConnection.iceConnectionState === 'checking') {
            console.warn(`⏰ 增强连接30秒超时 [${userId}]，状态: ${peerConnection.iceConnectionState}`);
            handleConnectionTimeout(userId, peerConnection);
        }
    }, 30000);
    
    peerConnections.set(userId, peerConnection);
    console.log(`✅ 增强WebRTC连接创建完成 [${userId}]`);
    
    return peerConnection;
}

// 创建增强的音频元素
function createEnhancedAudioElement(userId, remoteStream) {
    // 移除旧的音频元素
    const existingAudio = document.getElementById(`remote-audio-${userId}`);
    if (existingAudio) {
        existingAudio.remove();
    }
    
    const audio = document.createElement('audio');
    audio.id = `remote-audio-${userId}`;
    audio.setAttribute('data-user-id', userId);
    audio.srcObject = remoteStream;
    audio.autoplay = true;
    audio.volume = 0.9; // 稍微提高音量
    
    // 检测设备类型并应用优化
    const deviceType = detectDeviceType();
    if (deviceType.isMobile) {
        audio.muted = false;
        audio.playsInline = true;
        audio.setAttribute('webkit-playsinline', 'true');
        audio.setAttribute('playsinline', 'true');
        
        if (deviceType.isIOS) {
            audio.volume = 0.8;
            audio.controls = false;
            audio.style.display = 'none';
        }
    }
    
    // 增强的事件监听
    audio.addEventListener('loadstart', () => {
        console.log(`🔊 增强音频开始加载 [${userId}]`);
    });
    
    audio.addEventListener('canplay', () => {
        console.log(`🔊 增强音频可以播放 [${userId}]`);
        audio.play().catch(e => {
            console.warn(`⚠️ 增强音频自动播放失败 [${userId}]:`, e);
            // 移动设备可能需要用户交互
            if (deviceType.isMobile) {
                showToast('请点击屏幕启用音频播放', 'info');
                document.addEventListener('click', function playAudio() {
                    audio.play();
                    document.removeEventListener('click', playAudio);
                }, { once: true });
            }
        });
    });
    
    audio.addEventListener('play', () => {
        console.log(`🎵 增强音频开始播放 [${userId}]`);
    });
    
    audio.addEventListener('error', (e) => {
        console.error(`❌ 增强音频播放错误 [${userId}]:`, e.error);
    });
    
    document.body.appendChild(audio);
    console.log(`✅ 增强音频元素创建完成 [${userId}]`);
}

// 备用连接策略
async function implementFallbackStrategy(userIds) {
    console.log('🆘 ===== 实施备用连接策略 =====');
    
    // 策略：降级到最基础但最可靠的配置
    const fallbackConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ],
        iceCandidatePoolSize: 5,
        iceTransportPolicy: 'all'
    };
    
    for (const userId of userIds) {
        console.log(`🆘 为用户 ${userId} 实施备用策略...`);
        
        try {
            // 清理现有连接
            if (peerConnections.has(userId)) {
                peerConnections.get(userId).close();
                peerConnections.delete(userId);
            }
            
            // 使用最简单的配置重新创建
            const fallbackPc = new RTCPeerConnection(fallbackConfig);
            
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    fallbackPc.addTrack(track, localStream);
                });
            }
            
            fallbackPc.ontrack = (event) => {
                console.log(`🆘 备用连接接收到流 [${userId}]`);
                remoteStreams.set(userId, event.streams[0]);
                createEnhancedAudioElement(userId, event.streams[0]);
            };
            
            fallbackPc.onicecandidate = (event) => {
                if (event.candidate && window.realtimeClient) {
                    window.realtimeClient.sendIceCandidate({
                        roomId,
                        candidate: event.candidate,
                        targetUserId: userId,
                        fromUserId: currentUserId,
                        fallback: true
                    });
                }
            };
            
            peerConnections.set(userId, fallbackPc);
            
            // 如果是offer方，发送备用offer
            if (currentUserId < userId) {
                const offer = await fallbackPc.createOffer();
                await fallbackPc.setLocalDescription(offer);
                
                if (window.realtimeClient && window.realtimeClient.socket && window.realtimeClient.socket.connected) {
                    window.realtimeClient.sendCallOffer({
                        roomId,
                        targetUserId: userId,
                        offer: fallbackPc.localDescription,
                        fromUserId: currentUserId,
                        fallback: true
                    });
                }
            }
            
            console.log(`🆘 用户 ${userId} 备用策略完成`);
            
        } catch (error) {
            console.error(`❌ 用户 ${userId} 备用策略失败:`, error);
        }
    }
    
    console.log('🆘 ===== 备用连接策略完成 =====');
}

// 手动触发WebRTC连接建立（用于调试）
window.forceWebRTCConnection = async function(targetUserId) {
    if (!targetUserId) {
        console.error('❌ 请提供目标用户ID: forceWebRTCConnection("user-xxx")');
        return;
    }
    
    console.log('🔧 ===== 强制建立WebRTC连接 =====');
    console.log('🎯 目标用户:', targetUserId);
    
    // 检查是否在通话中
    if (!isInCall) {
        console.error('❌ 当前不在通话中，无法建立连接');
        return;
    }
    
    // 检查用户是否在参与者列表中
    if (!callParticipants.has(targetUserId)) {
        console.warn('⚠️ 目标用户不在参与者列表中，添加用户...');
        callParticipants.add(targetUserId);
    }
    
    // 检查是否已有连接
    if (peerConnections.has(targetUserId)) {
        console.log('🔄 已存在连接，先关闭旧连接...');
        const oldConnection = peerConnections.get(targetUserId);
        oldConnection.close();
        peerConnections.delete(targetUserId);
        
        // 清理相关资源
        if (remoteStreams.has(targetUserId)) {
            remoteStreams.delete(targetUserId);
        }
        
        const audioElement = document.getElementById(`remote-audio-${targetUserId}`);
        if (audioElement) {
            audioElement.remove();
        }
    }
    
    try {
        // 创建新的WebRTC连接
        console.log('🔗 创建新的WebRTC连接...');
        const peerConnection = createPeerConnection(targetUserId, true); // 🚀 使用增强模式
        
        console.log('📤 创建并发送Offer...');
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
        });
        
        await peerConnection.setLocalDescription(offer);
        console.log('✅ 本地描述设置完成');
        
        // 检查WebSocket连接
        if (!window.realtimeClient || !window.realtimeClient.socket || !window.realtimeClient.socket.connected) {
            console.error('❌ WebSocket未连接，无法发送Offer');
            return;
        }
        
        // 发送offer
        window.realtimeClient.sendCallOffer({
            roomId,
            targetUserId: targetUserId,
            offer: peerConnection.localDescription,
            fromUserId: currentUserId
        });
        
        console.log('📤 Offer已发送，等待Answer...');
        console.log('🔧 ===== 强制连接建立完成 =====');
        
        showToast(`正在尝试连接到 ${targetUserId}...`, 'info');
        
    } catch (error) {
        console.error('❌ 强制建立连接失败:', error);
    }
};

// 检查WebSocket连接状态
window.checkWebSocketConnection = function() {
    console.log('🔍 ===== WebSocket连接状态检查 =====');
    
    if (!window.realtimeClient) {
        console.error('❌ 实时客户端未初始化');
        return false;
    }
    
    if (!window.realtimeClient.socket) {
        console.error('❌ WebSocket对象不存在');
        return false;
    }
    
    const socket = window.realtimeClient.socket;
    
    console.log('📊 WebSocket状态详情:', {
        connected: socket.connected,
        disconnected: socket.disconnected,
        readyState: socket.readyState,
        id: socket.id,
        transport: socket.io ? socket.io.engine.transport.name : '未知',
        url: socket.io ? socket.io.uri : '未知'
    });
    
    if (socket.connected) {
        console.log('✅ WebSocket连接正常');
        return true;
    } else {
        console.error('❌ WebSocket连接断开');
        
        // 尝试重连
        if (window.realtimeClient.establishConnection) {
            console.log('🔄 尝试重新连接...');
            window.realtimeClient.establishConnection();
        }
        
        return false;
    }
};

// 显示所有参与者和连接状态
window.showCallStatus = function() {
    console.log('📊 ===== 通话状态总览 =====');
    console.log('📞 通话状态:', isInCall);
    console.log('👥 参与者列表:', Array.from(callParticipants));
    console.log('🔗 WebRTC连接数量:', peerConnections.size);
    console.log('📡 远程流数量:', remoteStreams.size);
    
    // 显示每个连接的详细状态
    peerConnections.forEach((pc, userId) => {
        console.log(`🔗 用户 ${userId} 连接状态:`, {
            iceConnectionState: pc.iceConnectionState,
            connectionState: pc.connectionState,
            signalingState: pc.signalingState,
            iceGatheringState: pc.iceGatheringState
        });
    });
    
    console.log('🔍 WebSocket连接状态:', window.realtimeClient && window.realtimeClient.socket ? window.realtimeClient.socket.connected : '未连接');
    console.log('📊 ===== 状态总览结束 =====');
};

// 网络环境诊断功能
window.testNetworkConnectivity = async function() {
    console.log('🔍 ===== 开始网络连接诊断 =====');
    
    const results = {
        stun: [],
        turn: [],
        summary: {
            stunWorking: 0,
            stunFailed: 0,
            turnWorking: 0,
            turnFailed: 0
        }
    };
    
    // 测试STUN服务器
    const stunServers = [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stunserver.org',
        'stun:stun.ekiga.net'
    ];
    
    console.log('🧪 测试STUN服务器...');
    for (const stunUrl of stunServers) {
        try {
            console.log(`📡 测试 ${stunUrl}...`);
            const testResult = await testStunServer(stunUrl);
            results.stun.push({
                url: stunUrl,
                success: testResult.success,
                localAddress: testResult.localAddress,
                serverAddress: testResult.serverAddress,
                error: testResult.error
            });
            
            if (testResult.success) {
                results.summary.stunWorking++;
                console.log(`✅ ${stunUrl} 工作正常`);
            } else {
                results.summary.stunFailed++;
                console.log(`❌ ${stunUrl} 连接失败:`, testResult.error);
            }
        } catch (error) {
            results.stun.push({
                url: stunUrl,
                success: false,
                error: error.message
            });
            results.summary.stunFailed++;
            console.log(`❌ ${stunUrl} 测试异常:`, error.message);
        }
    }
    
    // 测试TURN服务器
    const turnServers = [
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:numb.viagenie.ca:3478',
            username: 'webrtc@live.com',
            credential: 'muazkh'
        }
    ];
    
    console.log('🧪 测试TURN服务器...');
    for (const turnServer of turnServers) {
        try {
            console.log(`📡 测试 ${turnServer.urls}...`);
            const testResult = await testTurnServer(turnServer);
            results.turn.push({
                url: turnServer.urls,
                username: turnServer.username,
                success: testResult.success,
                candidates: testResult.candidates,
                error: testResult.error
            });
            
            if (testResult.success) {
                results.summary.turnWorking++;
                console.log(`✅ ${turnServer.urls} 工作正常`);
            } else {
                results.summary.turnFailed++;
                console.log(`❌ ${turnServer.urls} 连接失败:`, testResult.error);
            }
        } catch (error) {
            results.turn.push({
                url: turnServer.urls,
                username: turnServer.username,
                success: false,
                error: error.message
            });
            results.summary.turnFailed++;
            console.log(`❌ ${turnServer.urls} 测试异常:`, error.message);
        }
    }
    
    // 输出诊断报告
    console.log('📊 ===== 网络连接诊断报告 =====');
    console.log('📈 STUN服务器:', `${results.summary.stunWorking}/${results.summary.stunWorking + results.summary.stunFailed} 可用`);
    console.log('📈 TURN服务器:', `${results.summary.turnWorking}/${results.summary.turnWorking + results.summary.turnFailed} 可用`);
    
    if (results.summary.stunWorking === 0) {
        console.error('🚨 所有STUN服务器都无法连接! 这可能导致WebRTC连接问题');
    }
    
    if (results.summary.turnWorking === 0) {
        console.error('🚨 所有TURN服务器都无法连接! 不同网络下的通话可能无法建立');
    }
    
    console.log('📊 详细结果:', results);
    console.log('🔍 ===== 网络连接诊断完成 =====');
    
    return results;
};

// 测试单个STUN服务器
async function testStunServer(stunUrl) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('测试超时'));
        }, 10000);
        
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: stunUrl }]
        });
        
        let resolved = false;
        
        pc.onicecandidate = (event) => {
            if (event.candidate && !resolved) {
                resolved = true;
                clearTimeout(timeout);
                
                const candidate = event.candidate;
                resolve({
                    success: true,
                    localAddress: candidate.address,
                    serverAddress: candidate.relatedAddress,
                    type: candidate.type
                });
                
                pc.close();
            }
        };
        
        pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete' && !resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve({
                    success: false,
                    error: '未收到STUN响应'
                });
                pc.close();
            }
        };
        
        // 创建一个数据通道触发ICE收集
        pc.createDataChannel('test');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
    });
}

// 测试单个TURN服务器
async function testTurnServer(turnServer) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                error: '测试超时',
                candidates: []
            });
        }, 15000);
        
        const pc = new RTCPeerConnection({
            iceServers: [turnServer],
            iceCandidatePoolSize: 1
        });
        
        const candidates = [];
        let hasRelayCandidates = false;
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                candidates.push({
                    type: event.candidate.type,
                    protocol: event.candidate.protocol,
                    address: event.candidate.address
                });
                
                if (event.candidate.type === 'relay') {
                    hasRelayCandidates = true;
                }
            }
        };
        
        pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
                clearTimeout(timeout);
                resolve({
                    success: hasRelayCandidates,
                    error: hasRelayCandidates ? null : '未获取到relay候选',
                    candidates: candidates
                });
                pc.close();
            }
        };
        
        // 创建一个数据通道触发ICE收集
        pc.createDataChannel('test');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
    });
}

// 暴露手动播放音频的函数，用于解决移动端自动播放限制
window.forcePlayRemoteAudio = function() {
    console.log('🔊 手动播放所有远程音频...');
    const audioElements = document.querySelectorAll('audio[data-user-id]');
    
    audioElements.forEach(audio => {
        const userId = audio.getAttribute('data-user-id');
        console.log(`🎵 尝试播放用户 ${userId} 的音频...`);
        
        if (audio.paused) {
            audio.play().then(() => {
                console.log(`✅ 用户 ${userId} 音频播放成功`);
            }).catch(error => {
                console.error(`❌ 用户 ${userId} 音频播放失败:`, error);
            });
        } else {
            console.log(`✅ 用户 ${userId} 音频已在播放`);
        }
    });
    
    console.log(`🔊 共处理 ${audioElements.length} 个音频元素`);
};

// 暴露获取详细音频信息的函数
window.getAudioInfo = function() {
    console.log('🔍 ===== 音频信息详情 =====');
    
    // 本地流信息
    if (localStream) {
        console.log('🎙️ 本地流:', {
            id: localStream.id,
            active: localStream.active,
            tracks: localStream.getTracks().map(track => ({
                kind: track.kind,
                id: track.id,
                label: track.label,
                enabled: track.enabled,
                readyState: track.readyState,
                muted: track.muted
            }))
        });
    } else {
        console.log('⚠️ 没有本地流');
    }
    
    // 远程流信息
    console.log('📡 远程流数量:', remoteStreams.size);
    remoteStreams.forEach((stream, userId) => {
        console.log(`📡 用户 ${userId} 远程流:`, {
            id: stream.id,
            active: stream.active,
            tracks: stream.getTracks().map(track => ({
                kind: track.kind,
                id: track.id,
                label: track.label,
                enabled: track.enabled,
                readyState: track.readyState,
                muted: track.muted
            }))
        });
    });
    
    // 音频元素信息
    const audioElements = document.querySelectorAll('audio[data-user-id]');
    console.log('🔊 音频元素数量:', audioElements.length);
    audioElements.forEach(audio => {
        const userId = audio.getAttribute('data-user-id');
        console.log(`🔊 用户 ${userId} 音频元素:`, {
            id: audio.id,
            paused: audio.paused,
            volume: audio.volume,
            muted: audio.muted,
            readyState: audio.readyState,
            networkState: audio.networkState,
            currentTime: audio.currentTime,
            duration: audio.duration,
            autoplay: audio.autoplay,
            controls: audio.controls,
            srcObject: !!audio.srcObject,
            error: audio.error ? {
                code: audio.error.code,
                message: audio.error.message
            } : null
        });
    });
    
    console.log('🔍 ===== 音频信息详情结束 =====');
};

// 自动连接状态监控
let connectionMonitorInterval = null;

// 启动自动连接监控
function startConnectionMonitoring() {
    if (connectionMonitorInterval) {
        clearInterval(connectionMonitorInterval);
    }
    
    console.log('🔍 启动WebRTC连接状态自动监控...');
    
    // 动态调整监控频率
    let monitoringInterval = 10000; // 默认10秒
    let lastIssueTime = 0;
    let consecutiveHealthyChecks = 0;
    
    connectionMonitorInterval = setInterval(async () => {
        if (isInCall && peerConnections.size > 0) {
            const currentTime = Date.now();
            const timeSinceLastIssue = currentTime - lastIssueTime;
            
            // 根据网络状况动态调整监控频率
            if (timeSinceLastIssue > 60000) { // 1分钟内没有问题
                consecutiveHealthyChecks++;
                if (consecutiveHealthyChecks > 5) {
                    monitoringInterval = Math.min(monitoringInterval * 1.2, 30000); // 最大30秒
                }
            }
            
            console.log('📊 ===== WebRTC连接状态报告 =====');
            console.log('⏰ 时间:', new Date().toLocaleTimeString());
            console.log('🔍 监控间隔:', monitoringInterval/1000 + '秒');
            console.log('📞 通话状态:', isInCall);
            console.log('👥 参与者数量:', callParticipants.size);
            console.log('🔗 对等连接数量:', peerConnections.size);
            console.log('📡 远程流数量:', remoteStreams.size);
            
            // 🔥 自动检查WebSocket状态
            const wsConnected = window.realtimeClient && window.realtimeClient.socket && window.realtimeClient.socket.connected;
            console.log('🌐 WebSocket连接状态:', wsConnected ? '已连接' : '未连接');
            
            if (!wsConnected) {
                console.error('❌ 检测到WebSocket连接断开!');
                // 自动尝试修复WebSocket
                setTimeout(async () => {
                    await autoRepairWebSocketConnection();
                }, 1000);
            }
            
            // 检查本地流状态
            if (localStream) {
                const audioTracks = localStream.getAudioTracks();
                console.log('🎙️ 本地音频轨道:', {
                    数量: audioTracks.length,
                    详情: audioTracks.map(track => ({
                        enabled: track.enabled,
                        readyState: track.readyState,
                        label: track.label,
                        muted: track.muted
                    }))
                });
            } else {
                console.warn('⚠️ 本地流不存在!');
            }
            
            // 🔥 检查每个对等连接的状态并自动处理问题
            let hasConnectionIssues = false;
            
            peerConnections.forEach((pc, userId) => {
                const stats = {
                    用户ID: userId,
                    ICE连接状态: pc.iceConnectionState,
                    连接状态: pc.connectionState,
                    信令状态: pc.signalingState,
                    ICE收集状态: pc.iceGatheringState
                };
                
                console.log(`🔗 用户 ${userId} 连接详情:`, stats);
                
                // 🔥 自动检测连接问题
                if (pc.iceConnectionState === 'new' || pc.iceConnectionState === 'checking') {
                    hasConnectionIssues = true;
                    console.warn(`⚠️ 用户 ${userId} ICE连接状态异常: ${pc.iceConnectionState}`);
                }
                
                if (pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-remote-offer') {
                    hasConnectionIssues = true;
                    console.warn(`⚠️ 用户 ${userId} 信令协商未完成: ${pc.signalingState}`);
                }
                
                // 检查对应的远程流
                const remoteStream = remoteStreams.get(userId);
                if (remoteStream) {
                    const remoteTracks = remoteStream.getAudioTracks();
                    console.log(`📡 用户 ${userId} 远程音频轨道:`, {
                        数量: remoteTracks.length,
                        详情: remoteTracks.map(track => ({
                            enabled: track.enabled,
                            readyState: track.readyState,
                            label: track.label,
                            muted: track.muted
                        }))
                    });
                } else {
                    console.warn(`⚠️ 用户 ${userId} 没有远程流!`);
                    hasConnectionIssues = true;
                }
                
                // 检查对应的音频元素
                const audioElement = document.getElementById(`remote-audio-${userId}`);
                if (audioElement) {
                    const audioStats = {
                        paused: audioElement.paused,
                        volume: audioElement.volume,
                        muted: audioElement.muted,
                        readyState: audioElement.readyState,
                        currentTime: audioElement.currentTime,
                        duration: audioElement.duration,
                        networkState: audioElement.networkState,
                        srcObject: !!audioElement.srcObject
                    };
                    
                    console.log(`🔊 用户 ${userId} 音频元素状态:`, audioStats);
                    
                    // 检测音频播放问题
                    if (audioElement.paused && audioElement.srcObject) {
                        console.warn(`⚠️ 用户 ${userId} 音频元素有流但未播放`);
                        // 自动尝试播放
                        audioElement.play().catch(e => console.warn('自动播放失败:', e));
                    }
                } else {
                    console.warn(`⚠️ 用户 ${userId} 没有音频播放元素!`);
                    hasConnectionIssues = true;
                }
            });
            
            // 🔥 如果检测到连接问题，启动智能修复
            if (hasConnectionIssues) {
                console.error('🚨 检测到连接问题，启动智能自动修复...');
                lastIssueTime = currentTime; // 记录问题时间
                consecutiveHealthyChecks = 0; // 重置健康检查计数
                monitoringInterval = Math.max(monitoringInterval / 2, 3000); // 加快监控频率，最小3秒
                
                // 运行网络质量检测
                const networkQuality = await detectNetworkQuality();
                console.log('📊 当前网络质量:', networkQuality);
                
                // 根据网络质量调整修复策略
                if (networkQuality.score < 30) {
                    console.warn('⚠️ 网络质量较差，使用保守修复策略');
                    monitoringInterval = Math.max(monitoringInterval, 8000); // 降低监控频率
                }
                
                // 若長時間處於 ICE new/無遠程流，啟用 relay-only 進行回退
                const stuckNew = Array.from(peerConnections.values()).some(pc => pc.iceConnectionState === 'new');
                const noRemote = Array.from(peerConnections.keys()).some(uid => !remoteStreams.has(uid));
                if ((stuckNew || noRemote) && !forceRelayMode) {
                    console.warn('🛡️ 連線卡在 new 或無遠程流，啟用 relay-only 回退並重建');
                    forceRelayMode = true;
                    // 逐個重建
                    for (const uid of Array.from(peerConnections.keys())) {
                        try {
                            await autoAttemptConnectionRepair(uid);
                        } catch (e) {
                            console.warn('回退重建失敗:', uid, e);
                        }
                    }
                }

                autoShowCompleteStatus();
                
                // 🚀 智能修复策略
                setTimeout(async () => {
                    await performIntelligentConnectionRepair(networkQuality);
                }, networkQuality.score < 50 ? 5000 : 2000); // 网络差时延迟更长
            } else {
                // 没有问题时，可以逐渐放松监控频率
                consecutiveHealthyChecks++;
                if (consecutiveHealthyChecks > 3) {
                    monitoringInterval = Math.min(monitoringInterval * 1.1, 15000); // 最大15秒
                }
            }
            
            console.log('📊 ===== 监控报告结束 =====\n');
            
            // 动态更新监控间隔
            if (connectionMonitorInterval) {
                clearInterval(connectionMonitorInterval);
                connectionMonitorInterval = setInterval(arguments.callee, monitoringInterval);
            }
        }
    }, monitoringInterval); // 使用动态间隔
}

// 停止自动连接监控
function stopConnectionMonitoring() {
    if (connectionMonitorInterval) {
        clearInterval(connectionMonitorInterval);
        connectionMonitorInterval = null;
        console.log('🛑 停止WebRTC连接状态监控');
    }
}

// 执行ICE重启 - 新增功能
async function performIceRestart(peerConnection, userId) {
    console.log('🔄 ===== 执行ICE重启 =====');
    console.log('👤 目标用户:', userId);
    
    try {
        // 检查连接是否处于稳定状态
        if (peerConnection.signalingState !== 'stable') {
            console.warn('⚠️ 信令状态不稳定，无法执行ICE重启:', peerConnection.signalingState);
            return false;
        }
        
        console.log('🔄 开始ICE重启流程...');
        showToast(`正在重新建立与用户 ${userId} 的连接...`, 'info');
        
        // 创建带ICE重启的offer
        const offer = await peerConnection.createOffer({ 
            iceRestart: true,
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
        });
        
        console.log('✅ ICE重启Offer创建成功');
        
        // 设置本地描述
        await peerConnection.setLocalDescription(offer);
        console.log('✅ ICE重启本地描述设置完成');
        
        // 发送ICE重启offer
        if (window.realtimeClient && window.realtimeClient.socket && window.realtimeClient.socket.connected) {
            window.realtimeClient.socket.emit('webrtc-offer', {
                toUserId: userId,
                fromUserId: currentUserId,
                offer: offer,
                isIceRestart: true // 标记为ICE重启
            });
            console.log('📤 ICE重启Offer已发送');
            return true;
        } else {
            console.error('❌ WebSocket未连接，无法发送ICE重启offer');
            return false;
        }
        
    } catch (error) {
        console.error('❌ ICE重启失败:', error);
        showToast('连接重启失败', 'error');
        return false;
    }
}

// 自动恢复流 - 新增功能
async function autoRecoverStream(userId) {
    console.log('🔄 ===== 自动恢复远程流 =====');
    console.log('👤 目标用户:', userId);
    
    if (!isInCall || !callParticipants.has(userId)) {
        console.log('⚠️ 通话已结束或用户已离开，跳过流恢复');
        return false;
    }
    
    try {
        showToast(`正在恢复与用户 ${userId} 的音频流...`, 'info');
        
        // 检查当前的WebRTC连接状态
        const peerConnection = peerConnections.get(userId);
        if (!peerConnection) {
            console.log('❌ 没有找到对应的WebRTC连接，尝试重新建立连接');
            return await autoAttemptConnectionRepair(userId);
        }
        
        // 检查连接状态
        if (peerConnection.iceConnectionState === 'connected' || 
            peerConnection.iceConnectionState === 'completed') {
            console.log('✅ WebRTC连接正常，可能是轨道问题，尝试重新协商...');
            
            // 重新协商媒体
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            await peerConnection.setLocalDescription(offer);
            
            // 发送重新协商的offer
            if (window.realtimeClient && window.realtimeClient.socket && window.realtimeClient.socket.connected) {
                window.realtimeClient.socket.emit('webrtc-offer', {
                    toUserId: userId,
                    fromUserId: currentUserId,
                    offer: offer,
                    isRenegotiation: true // 标记为重新协商
                });
                console.log('📤 重新协商Offer已发送');
                return true;
            }
        } else {
            console.log('❌ WebRTC连接状态异常，尝试ICE重启');
            return await performIceRestart(peerConnection, userId);
        }
        
    } catch (error) {
        console.error('❌ 自动恢复流失败:', error);
        showToast('音频流恢复失败', 'error');
        return false;
    }
}

// 创建增强的音频元素 - 新增功能
function createEnhancedAudioElement(userId, stream) {
    console.log('🔊 ===== 创建增强音频元素 =====');
    console.log('👤 用户ID:', userId);
    
    // 先清理可能存在的旧元素
    const existingElement = document.getElementById(`remote-audio-${userId}`);
    if (existingElement) {
        console.log('🧹 清理现有音频元素');
        existingElement.pause();
        existingElement.srcObject = null;
        existingElement.remove();
    }
    
    // 创建新的音频元素
    const audioElement = document.createElement('audio');
    audioElement.id = `remote-audio-${userId}`;
    audioElement.setAttribute('data-user-id', userId);
    
    // 设置基本属性
    audioElement.srcObject = stream;
    audioElement.autoplay = true;
    audioElement.controls = false;
    audioElement.muted = !isSpeakerOn;
    audioElement.style.display = 'none'; // 隐藏元素
    
    // 移动设备特殊配置
    const device = detectDeviceType();
    if (device.isMobile) {
        console.log('📱 移动设备 - 应用音频优化配置');
        audioElement.volume = 0.8; // 稍微降低音量防止回声
        audioElement.setAttribute('playsinline', true);
        audioElement.setAttribute('webkit-playsinline', true);
    } else {
        audioElement.volume = 1.0;
    }
    
    // 添加增强的事件监听器
    audioElement.onloadstart = () => {
        console.log('🔄 音频开始加载:', userId);
    };
    
    audioElement.onloadeddata = () => {
        console.log('✅ 音频数据加载完成:', userId);
    };
    
    audioElement.oncanplay = () => {
        console.log('▶️ 音频可以播放:', userId);
    };
    
    audioElement.onplay = () => {
        console.log('🎵 音频开始播放:', userId);
        showToast(`开始播放用户 ${userId} 的音频`, 'success');
    };
    
    audioElement.onpause = () => {
        console.log('⏸️ 音频暂停:', userId);
    };
    
    audioElement.onerror = (error) => {
        console.error('❌ 音频播放错误:', error, '用户:', userId);
        showToast(`用户 ${userId} 音频播放出错`, 'error');
        
        // 尝试自动恢复
        setTimeout(() => {
            console.log('🔄 尝试自动恢复音频播放...');
            audioElement.load();
            audioElement.play().catch(e => {
                console.error('自动恢复播放失败:', e);
            });
        }, 1000);
    };
    
    audioElement.onstalled = () => {
        console.warn('⚠️ 音频播放停滞:', userId);
    };
    
    audioElement.onwaiting = () => {
        console.log('⏳ 音频等待数据:', userId);
    };
    
    // 添加到DOM
    document.body.appendChild(audioElement);
    console.log('✅ 音频元素已添加到DOM');
    
    // 尝试播放
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                console.log('✅ 音频自动播放成功:', userId);
            })
            .catch(error => {
                console.warn('⚠️ 音频自动播放失败（可能需要用户交互）:', error);
                // 显示提示让用户手动启用音频
                showToast(`请点击允许播放用户 ${userId} 的音频`, 'warning');
                
                // 添加点击事件监听器，用户下次点击时自动播放
                const enableAudio = () => {
                    audioElement.play().then(() => {
                        console.log('✅ 用户交互后音频播放成功');
                        showToast('音频播放已启用', 'success');
                        document.removeEventListener('click', enableAudio);
                    }).catch(e => {
                        console.error('用户交互后播放仍失败:', e);
                    });
                };
                document.addEventListener('click', enableAudio, { once: true });
            });
    }
    
    return audioElement;
}

// 网络质量检测 - 新增功能
async function detectNetworkQuality() {
    console.log('🌐 ===== 网络质量检测 =====');
    
    const quality = {
        rtt: 0,           // 往返时延
        bandwidth: 0,     // 带宽估计
        packetLoss: 0,    // 丢包率
        jitter: 0,        // 抖动
        score: 0          // 综合评分 0-100
    };
    
    try {
        // 简单的网络延迟测试
        const startTime = performance.now();
        
        // 使用多區域可達的端點，兼顧中國大陸/香港
        const testUrls = [
            'https://www.baidu.com/favicon.ico',
            'https://www.qq.com/favicon.ico',
            'https://www.aliyun.com/favicon.ico',
            'https://www.cloudflare.com/favicon.ico',
            'https://www.fastly.com/favicon.ico'
        ];
        
        const latencyTests = testUrls.map(async (url) => {
            try {
                const testStart = performance.now();
                const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
                const testEnd = performance.now();
                return testEnd - testStart;
            } catch (error) {
                console.warn('网络测试失败:', url, error);
                return 1000; // 默认高延迟
            }
        });
        
        const latencies = await Promise.all(latencyTests);
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        
        quality.rtt = Math.round(avgLatency);
        
        // 基于延迟估算网络质量分数
        if (quality.rtt < 50) {
            quality.score = 100;
        } else if (quality.rtt < 100) {
            quality.score = 90;
        } else if (quality.rtt < 200) {
            quality.score = 70;
        } else if (quality.rtt < 500) {
            quality.score = 50;
        } else {
            quality.score = 20;
        }
        
        console.log('📊 网络质量检测结果:', quality);
        return quality;
        
    } catch (error) {
        console.error('❌ 网络质量检测失败:', error);
        quality.score = 30; // 默认中等质量
        return quality;
    }
}

// ==================== 转录面板控制函数 ====================

// 转录面板现在固定显示，此函数用于兼容性
function toggleTranscriptionPanel() {
    // 转录面板现在固定在右侧栏中，总是可见
    showToast('转录面板已固定在右侧', 'info');
    return;
    
    const panel = document.getElementById('transcriptionPanel');
    const btn = document.getElementById('transcribeBtn');
    
    if (panel && btn) {
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'flex';
            btn.classList.add('active');
            btn.style.background = '#10b981';
            showToast('转录面板已打开', 'info');
        } else {
            panel.style.display = 'none';
            btn.classList.remove('active');
            btn.style.background = '';
            
            // 如果正在录音，停止录音
            if (window.transcriptionClient && window.transcriptionClient.isRecording) {
                window.transcriptionClient.stopRecording();
            }
            showToast('转录面板已关闭', 'info');
        }
    }
}

// 关闭转录面板
function closeTranscription() {
    const panel = document.getElementById('transcriptionPanel');
    const btn = document.getElementById('transcribeBtn');
    
    if (panel) {
        panel.style.display = 'none';
    }
    
    if (btn) {
        btn.classList.remove('active');
        btn.style.background = '';
    }
    
    // 如果正在录音，停止录音
    if (window.transcriptionClient && window.transcriptionClient.isRecording) {
        window.transcriptionClient.stopRecording();
    }
    
    showToast('转录面板已关闭', 'info');
}

// 测试麦克风功能
async function testMicrophone() {
    const btn = document.getElementById('testMicBtn');
    
    if (!btn) return;
    
    try {
        // 更新按钮状态
        btn.classList.add('testing');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.title = '正在测试麦克风...';
        
        // 检查浏览器支持
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('浏览器不支持getUserMedia API');
        }
        
        // 尝试获取麦克风权限（不保存流）
        console.log('正在测试麦克风权限...');
        const audioConstraints = getOptimizedAudioConstraints();
        console.log('🎙️ 测试音频约束配置:', audioConstraints);
        
        const testStream = await navigator.mediaDevices.getUserMedia({ 
            audio: audioConstraints
        });
        
        // 立即停止测试流
        testStream.getTracks().forEach(track => track.stop());
        
        console.log('✅ 麦克风权限测试通过');
        showToast('✅ 麦克风权限测试通过，可以正常使用转录功能', 'success');
        
        // 更新按钮状态为成功
        btn.classList.remove('testing');
        btn.classList.add('success');
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.title = '麦克风权限正常';
        
        // 3秒后恢复原始状态
        setTimeout(() => {
            btn.classList.remove('success');
            btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            btn.title = '测试麦克风';
        }, 3000);
        
    } catch (error) {
        console.warn('⚠️ 麦克风权限测试失败:', error);
        
        let warningMessage = '麦克风权限测试失败';
        
        if (error.name === 'NotAllowedError') {
            warningMessage = '麦克风权限被拒绝，请点击地址栏的麦克风图标并选择"允许"';
        } else if (error.name === 'NotFoundError') {
            warningMessage = '未找到麦克风设备，请检查麦克风连接';
        } else if (error.name === 'NotSupportedError') {
            warningMessage = '浏览器不支持麦克风功能';
        } else if (error.name === 'NotReadableError') {
            warningMessage = '麦克风被其他应用占用，请关闭其他使用麦克风的应用';
        } else if (error.name === 'OverconstrainedError') {
            warningMessage = '麦克风配置不兼容，请尝试刷新页面';
        } else {
            warningMessage = `麦克风测试失败: ${error.message}`;
        }
        
        showToast(warningMessage, 'error');
        
        // 更新按钮状态为失败
        btn.classList.remove('testing');
        btn.classList.add('error');
        btn.innerHTML = '<i class="fas fa-times"></i>';
        btn.title = '麦克风权限测试失败';
        
        // 3秒后恢复原始状态
        setTimeout(() => {
            btn.classList.remove('error');
            btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            btn.title = '测试麦克风';
        }, 3000);
    }
}

// 开始转录函数
function startTranscription() {
    if (window.transcriptionClient) {
        window.transcriptionClient.startStreamingMode(roomId);
        
        // 记录开始时间
        window.transcriptionClient.transcriptionStartTime = new Date();
        
        // 重置累积内容
        window.transcriptionClient.fullTranscriptionText = '';
        
        // 更新UI
        document.getElementById('startRecordBtn').style.display = 'none';
        document.getElementById('stopRecordBtn').style.display = 'block';
        document.getElementById('downloadBtn').style.display = 'none';
        
        // 更新状态
        const statusDiv = document.getElementById('transcriptionStatus');
        if (statusDiv) {
            const iconSpan = statusDiv.querySelector('i');
            const textSpan = statusDiv.querySelector('span');
            if (iconSpan && textSpan) {
                iconSpan.className = 'fas fa-microphone';
                textSpan.textContent = '正在转录...';
                statusDiv.style.color = '#22c55e';
            }
        }
        
        showToast('开始语音转录', 'success');
    } else {
        showToast('转录服务未初始化，请刷新页面', 'error');
    }
}

// 停止转录函数
function stopTranscription() {
    if (window.transcriptionClient) {
        window.transcriptionClient.stopStreamingMode();
        
        // 更新UI
        document.getElementById('startRecordBtn').style.display = 'block';
        document.getElementById('stopRecordBtn').style.display = 'none';
        
        // 更新状态
        const statusDiv = document.getElementById('transcriptionStatus');
        if (statusDiv) {
            const iconSpan = statusDiv.querySelector('i');
            const textSpan = statusDiv.querySelector('span');
            if (iconSpan && textSpan) {
                iconSpan.className = 'fas fa-microphone-slash';
                textSpan.textContent = '转录已停止';
                statusDiv.style.color = '#6b7280';
            }
        }
        
        // 如果有转录内容，显示下载按钮
        if (window.transcriptionClient.fullTranscriptionText.length > 0) {
            document.getElementById('downloadBtn').style.display = 'block';
        }
        
        showToast('转录已停止', 'info');
    } else {
        showToast('转录服务未初始化，请刷新页面', 'error');
    }
}

// 下载转录文档函数
function downloadTranscription() {
    if (!window.transcriptionClient || !window.transcriptionClient.fullTranscriptionText) {
        showToast('没有可下载的转录内容', 'warning');
        return;
    }
    
    const content = window.transcriptionClient.fullTranscriptionText;
    const startTime = window.transcriptionClient.transcriptionStartTime || new Date();
    const timestamp = startTime.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(/[/\\:*?"<>|]/g, '-');
    
    // 创建文档内容
    const documentContent = `会议转录文档
===================

房间: ${roomId || '未知'}
开始时间: ${startTime.toLocaleString('zh-CN')}
结束时间: ${new Date().toLocaleString('zh-CN')}
转录内容长度: ${content.length} 字符

转录内容:
===================

${content}

===================
此文档由 Vibe Meeting 实时转录功能生成
`;
    
    // 创建并下载文件
    const blob = new Blob([documentContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `会议转录-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('转录文档已下载', 'success');
}

// 兼容函数：保持向后兼容
function toggleTranscription() {
    // 检查当前状态并切换
    const startBtn = document.getElementById('startRecordBtn');
    const stopBtn = document.getElementById('stopRecordBtn');
    
    if (startBtn && startBtn.style.display !== 'none') {
        startTranscription();
    } else if (stopBtn && stopBtn.style.display !== 'none') {
        stopTranscription();
    }
}