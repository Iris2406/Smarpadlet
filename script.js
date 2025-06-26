// Global variables
let currentBoard = null;
let responses = [];
let currentUser = null;
let isTeacher = false;

// Hebrew stop words for word cloud
const hebrewStopWords = [
    // מילות קישור בסיסיות
    'של', 'את', 'על', 'אל', 'עם', 'כל', 'זה', 'זאת', 'היא', 'הוא', 'אני', 'אתה', 'אתן', 'אתם',
    'הם', 'הן', 'לא', 'כן', 'גם', 'רק', 'אך', 'או', 'כי', 'אם', 'כך', 'אז', 'שם', 'פה', 'כאן',
    'יש', 'אין', 'היה', 'הייתה', 'יהיה', 'תהיה', 'עוד', 'כבר', 'מאוד', 'טוב', 'רע', 'גדול', 'קטן',
    'חדש', 'ישן', 'אחר', 'אחרת', 'ראשון', 'אחרון', 'פעם', 'פעמים', 'שעה', 'יום', 'שבוע', 'חודש', 
    'שנה', 'בית', 'עיר', 'ארץ', 'עולם', 'תמיד', 'לעולם', 'אולי', 'בוודאי', 'כמובן',
    // מילות קישור נוספות
    'בין', 'תוך', 'אצל', 'מן', 'בעד', 'נגד', 'לפי', 'אחרי', 'לפני', 'במשך', 'בזמן', 'במקום',
    'להיות', 'לעשות', 'לתת', 'לקחת', 'לבוא', 'ללכת', 'לראות', 'לשמוע', 'לדבר', 'לכתוב', 'לקרוא',
    // מילים נפוצות נוספות
    'זמן', 'דבר', 'דברים', 'אנשים', 'איש', 'אשה', 'ילד', 'ילדה', 'משהו', 'מישהו', 'איפה', 'מתי',
    'איך', 'למה', 'מדוע', 'כמה', 'הרבה', 'מעט', 'קצת', 'פחות', 'יותר', 'הכי', 'ביותר'
];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

function initializeApp() {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1);
    
    console.log('Initializing app for page:', page);
    
    switch(page) {
        case 'board.html':
            console.log('Loading board page');
            initializeBoard();
            break;
        case 'teacher.html':
            console.log('Redirecting from teacher.html to index.html');
            // Redirect to home since we removed teacher.html functionality
            window.location.href = 'index.html';
            break;
        case 'index.html':
        default:
            console.log('Loading home page');
            initializeHome();
            break;
    }
}

// Home page functions (now for teachers only)
function initializeHome() {
    // Check if there's a prefill parameter for recreating a board
    const urlParams = new URLSearchParams(window.location.search);
    const prefillCode = urlParams.get('prefill');
    if (prefillCode) {
        console.log('Prefilling form with code:', prefillCode);
        
        // Focus on teacher name field
        document.getElementById('teacherName').focus();
        
        // Show a helpful message
        setTimeout(() => {
            alert(`יצירת לוח מחדש עם קוד: ${prefillCode}\n\nמלא את הפרטים ולחץ "צור לוח חדש" כדי לשתף עם התלמידים`);
        }, 500);
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('Original file size:', file.size, 'bytes');
        
        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('קובץ התמונה גדול מדי. אנא בחר תמונה קטנה יותר (עד 5MB)');
            event.target.value = ''; // Clear the input
            return;
        }
        
        compressImage(file, (compressedDataUrl) => {
            showImagePreview(compressedDataUrl);
        });
    }
}

function compressImage(file, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        // Calculate new dimensions (max 800px width or height)
        const maxSize = 800;
        let { width, height } = img;
        
        if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
        } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
        }
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
        
        console.log('Compressed image size:', compressedDataUrl.length, 'characters');
        
        // Check if still too large
        if (compressedDataUrl.length > 1000000) { // ~1MB in base64
            // Compress more
            const veryCompressed = canvas.toDataURL('image/jpeg', 0.5); // 50% quality
            callback(veryCompressed);
        } else {
            callback(compressedDataUrl);
        }
    };
    
    img.onerror = function() {
        alert('שגיאה בטעינת התמונה');
    };
    
    const reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleImageUrl(event) {
    const url = event.target.value.trim();
    if (url) {
        showImagePreview(url);
    }
}

function showImagePreview(src) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `<img src="${src}" alt="תמונת השאלה">`;
}

function createBoard(event) {
    event.preventDefault();
    
    console.log('Creating board...');
    
    const teacherName = document.getElementById('teacherName').value.trim();
    const question = document.getElementById('question').value.trim();
    const imageFile = document.getElementById('imageFile').files[0];
    const imageUrl = document.getElementById('imageUrl').value.trim();
    const allowAnonymous = document.getElementById('allowAnonymous').checked;
    const moderateResponses = document.getElementById('moderateResponses').checked;
    
    console.log('Form data:', { teacherName, question, imageFile, imageUrl, allowAnonymous, moderateResponses });
    
    // Validate required fields
    if (!teacherName) {
        alert('יש להזין שם מורה');
        return;
    }
    
    if (!question) {
        alert('יש להזין שאלה');
        return;
    }
    
    // Generate board code
    const boardCode = generateBoardCode();
    console.log('Generated board code:', boardCode);
    
    // Create board data immediately
    const boardData = {
        code: boardCode,
        teacherName: teacherName,
        question: question,
        image: null, // Will be set if there's an image
        settings: {
            allowAnonymous: allowAnonymous,
            moderateResponses: moderateResponses
        },
        createdAt: new Date().toISOString(),
        responses: []
    };
    
    // Handle image - check if there's a preview image (already compressed)
    const previewImg = document.querySelector('#imagePreview img');
    if (previewImg && previewImg.src) {
        console.log('Using compressed image from preview');
        boardData.image = previewImg.src;
        saveBoardData(boardData);
    } else if (imageUrl) {
        console.log('Using image URL...');
        boardData.image = imageUrl;
        saveBoardData(boardData);
    } else {
        console.log('No image, saving board...');
        saveBoardData(boardData);
    }
}

function saveBoardData(boardData) {
    console.log('Saving board data:', boardData);
    
    try {
        // Check estimated size before saving
        const dataString = JSON.stringify(boardData);
        const sizeInBytes = new Blob([dataString]).size;
        console.log('Board data size:', sizeInBytes, 'bytes');
        
        if (sizeInBytes > 4 * 1024 * 1024) { // 4MB limit
            throw new Error('נתוני הלוח גדולים מדי. נסה תמונה קטנה יותר.');
        }
        
        // Save board data to localStorage
        localStorage.setItem(`board_${boardData.code}`, dataString);
        
        console.log('Board saved successfully');
        
        // Verify save
        const savedBoard = localStorage.getItem(`board_${boardData.code}`);
        console.log('Verification - saved board exists:', !!savedBoard);
        
        // Store teacher info
        currentUser = {
            name: boardData.teacherName,
            isTeacher: true,
            boardCode: boardData.code
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        console.log('Teacher info saved:', currentUser);
        
        // Show success message
        showBoardCreated(boardData);
        
    } catch (error) {
        console.error('Error saving board:', error);
        
        if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
            alert('השמירה נכשלה - התמונה גדולה מדי או שאין מספיק מקום באחסון. נסה:\n1. תמונה קטנה יותר\n2. מחק לוחות ישנים\n3. נסה בלי תמונה');
        } else {
            alert('שגיאה בשמירת הלוח: ' + error.message);
        }
    }
}

function generateBoardCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function showBoardCreated(boardData) {
    document.getElementById('teacherForm').style.display = 'none';
    document.getElementById('boardCreated').style.display = 'block';
    
    // Create simple board link - back to basics
    const protocol = window.location.protocol;
    const host = window.location.host;
    const pathname = window.location.pathname;
    
    let basePath;
    if (pathname.includes('index.html')) {
        basePath = pathname.replace('index.html', '');
    } else {
        basePath = pathname.endsWith('/') ? pathname : pathname + '/';
    }
    
    // SIMPLE SOLUTION: Put essential data directly in URL parameters
    // This avoids encoding issues and works reliably with Hebrew
    
    const params = new URLSearchParams();
    params.set('code', boardData.code);
    params.set('teacher', boardData.teacherName);
    params.set('question', boardData.question);
    
    if (boardData.image) {
        // For images, we'll still store in localStorage and reference by code
        params.set('hasImage', 'true');
    }
    
    params.set('allowAnonymous', boardData.settings.allowAnonymous);
    params.set('moderateResponses', boardData.settings.moderateResponses);
    
    // Create URL with simple parameters
    let boardLink = `${protocol}//${host}${basePath}board.html?${params.toString()}`;
    
    console.log('Generated board link with parameters:', boardLink);
    console.log('Link length:', boardLink.length);
    
    document.getElementById('boardLink').textContent = boardLink;
    
    // Add important note for teacher about sharing
    const linkInstruction = document.querySelector('.link-instruction');
    if (linkInstruction) {
        linkInstruction.innerHTML = `
            <strong>חשוב:</strong> לחץ על כפתור ההעתקה והדבק את הקישור בוואטסאפ של הכיתה<br/>
            <small style="color: #666;">💡 כדי לראות תגובות חדשות מהתלמידים, תצטרך לרענן את הדף או לחזור ללוח מהקישור</small>
        `;
    }
    
    // Also store in localStorage as backup for response persistence
    localStorage.setItem(`board_${boardData.code}`, JSON.stringify(boardData));
    
    window.currentBoardData = boardData;
}

function copyLink() {
    const link = document.getElementById('boardLink').textContent;
    
    console.log('Copying link:', link);
    console.log('Link length:', link.length);
    
    if (!link) {
        showToast('⚠️ שגיאה: קישור לא זמין');
        return;
    }
    
    // Check if URL is too long for some platforms
    if (link.length > 2000) {
        console.warn('URL might be too long for some platforms:', link.length);
    }
    
    // Copy the link as-is (already includes protocol if needed)
    navigator.clipboard.writeText(link).then(() => {
        showToast('✅ הקישור הועתק! הדבק אותו בוואטסאפ של הכיתה');
        console.log('Link copied successfully');
    }).catch((error) => {
        console.error('Clipboard API failed:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('✅ הקישור הועתק! הדבק אותו בוואטסאפ של הכיתה');
        console.log('Link copied using fallback method');
    });
}

function goToBoard() {
    const link = document.getElementById('boardLink').textContent;
    console.log('Going to board with link:', link);
    
    // Make sure we use a full URL
    if (link.startsWith('http://') || link.startsWith('https://')) {
        window.location.href = link;
    } else {
        // Handle relative paths
        window.location.href = window.location.origin + '/' + link.replace(/^\/+/, '');
    }
}

function createAnother() {
    document.getElementById('boardCreated').style.display = 'none';
    document.getElementById('teacherForm').style.display = 'block';
    document.getElementById('teacherForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
}

function debugStorage() {
    console.log('=== DEBUG STORAGE ===');
    console.log('All localStorage keys:', Object.keys(localStorage));
    
    const boardKeys = Object.keys(localStorage).filter(key => key.startsWith('board_'));
    console.log('Board keys found:', boardKeys);
    
    const boards = [];
    boardKeys.forEach(key => {
        try {
            const boardData = localStorage.getItem(key);
            console.log(`${key}:`, boardData);
            
            const parsedBoard = JSON.parse(boardData);
            boards.push(`${parsedBoard.code}: "${parsedBoard.question}" - ${parsedBoard.teacherName}`);
        } catch (error) {
            console.error(`Error parsing ${key}:`, error);
            boards.push(`${key}: שגיאה בפרסור`);
        }
    });
    
    console.log('Current user:', localStorage.getItem('currentUser'));
    console.log('=====================');
    
    const boardList = boards.join('\n');
    
    alert(`Debug Info (check console for details):\n\nלוחות שנמצאו (${boards.length}):\n${boardList || 'אין לוחות'}\n\nבדוק את הקונסול לפרטים נוספים.`);
}

function clearStorage() {
    if (confirm('האם אתה בטוח שברצונך למחוק את כל הלוחות השמורים? פעולה זו לא ניתנת לביטול.')) {
        const boardKeys = Object.keys(localStorage).filter(key => key.startsWith('board_'));
        
        boardKeys.forEach(key => {
            localStorage.removeItem(key);
        });
        
        localStorage.removeItem('currentUser');
        
        alert(`נמחקו ${boardKeys.length} לוחות מהאחסון.`);
        console.log('Storage cleared');
    }
}

function testWordCloud() {
    // Create a test board with sample responses
    const testBoard = {
        code: 'TEST123',
        teacherName: 'מורה לבדיקה',
        question: 'מה הדעה שלכם על השיעור?',
        image: null,
        settings: { allowAnonymous: true, moderateResponses: false },
        createdAt: new Date().toISOString(),
        responses: [
            { text: 'השיעור היה טוב מאוד מעניין', author: 'תלמיד 1' },
            { text: 'אהבתי את השיעור טוב', author: 'תלמיד 2' },
            { text: 'השיעור היה מעניין ונהניתי', author: 'תלמיד 3' },
            { text: 'טוב מאוד השיעור מעניין', author: 'תלמיד 4' },
            { text: 'השיעור טוב אבל יכול להיות יותר מעניין', author: 'תלמיד 5' },
            { text: 'מעניין השיעור טוב', author: 'תלמיד 6' },
            { text: 'השיעור היה נהדר מעניין מאוד', author: 'תלמיד 7' },
            { text: 'טוב השיעור אהבתי מאוד', author: 'תלמיד 8' }
        ]
    };
    
    // Save test board
    localStorage.setItem('board_TEST123', JSON.stringify(testBoard));
    
    // Create link to test board
    const protocol = window.location.protocol;
    const host = window.location.host;
    const pathname = window.location.pathname;
    
    let basePath;
    if (pathname.includes('index.html')) {
        basePath = pathname.replace('index.html', '');
    } else {
        basePath = pathname.endsWith('/') ? pathname : pathname + '/';
    }
    
    const testLink = `${protocol}//${host}${basePath}board.html?code=TEST123`;
    
    alert(`נוצר לוח בדיקה לענן מילים!\n\nקוד: TEST123\n\nהלוח מכיל 8 תגובות לדוגמה עם המילים:\n- "טוב" (6 פעמים)\n- "מעניין" (6 פעמים) \n- "השיעור" (7 פעמים)\n\nעבור ללוח כדי לראות את ענן המילים!`);
    
    if (confirm('האם תרצה לעבור ללוח הבדיקה עכשיו?')) {
        window.open(testLink, '_blank');
    }
}

// Board page functions
function initializeBoard() {
    const urlParams = new URLSearchParams(window.location.search);
    
    console.log('Initializing board...');
    console.log('URL parameters:', urlParams.toString());
    
    let boardData = null;
    
    // Get data from URL parameters - simple and reliable
    const boardCode = urlParams.get('code');
    const teacherName = urlParams.get('teacher');
    const question = urlParams.get('question');
    
    if (boardCode && teacherName && question) {
        console.log('Found board data in URL parameters');
        
        // Reconstruct board data from URL parameters
        boardData = {
            code: boardCode,
            teacherName: decodeURIComponent(teacherName),
            question: decodeURIComponent(question),
            image: null, // Will load from localStorage if exists
            settings: {
                allowAnonymous: urlParams.get('allowAnonymous') === 'true',
                moderateResponses: urlParams.get('moderateResponses') === 'true'
            },
            createdAt: new Date().toISOString(),
            responses: []
        };
        
        // Check if there's an image in localStorage
        if (urlParams.get('hasImage') === 'true') {
            const existingBoardData = localStorage.getItem(`board_${boardCode}`);
            if (existingBoardData) {
                try {
                    const existing = JSON.parse(existingBoardData);
                    if (existing.image) {
                        boardData.image = existing.image;
                    }
                } catch (e) {
                    console.log('Could not load existing image:', e);
                }
            }
        }
        
        console.log('Board data reconstructed from URL parameters:', boardData);
        
        // Save to localStorage for response persistence and future loading
        localStorage.setItem(`board_${boardData.code}`, JSON.stringify(boardData));
        
    } else {
        // FALLBACK: Try localStorage for backward compatibility
        const legacyCode = urlParams.get('code');
        if (legacyCode) {
            console.log('Trying legacy localStorage loading for:', legacyCode);
            
            const boardDataString = localStorage.getItem(`board_${legacyCode}`);
            if (boardDataString) {
                try {
                    boardData = JSON.parse(boardDataString);
                    console.log('Board data loaded from localStorage (legacy):', boardData);
                } catch (e) {
                    console.error('Error parsing legacy board data:', e);
                }
            }
        }
    }
    
    // If still no board data, show clear error
    if (!boardData) {
        alert('לא ניתן לטעון את הלוח. הקישור אינו תקין או שפג תוקפו.\n\nבקש מהמורה לשלוח קישור חדש.');
        return;
    }
    
    // Board exists, now set it as current
    currentBoard = boardData;
    console.log('Current board set:', currentBoard);
    
    // Update UI with board info
    document.getElementById('boardCode').textContent = currentBoard.code;
    document.getElementById('teacherName').textContent = currentBoard.teacherName;
    document.getElementById('questionText').textContent = currentBoard.question;
    
    if (currentBoard.image) {
        document.getElementById('questionImage').innerHTML = 
            `<img src="${currentBoard.image}" alt="תמונת השאלה">`;
    }
    
    // Check if this is the teacher accessing their own board
    checkTeacherAccess(currentBoard.code);
    
    // If not teacher, show student name form
    if (!currentUser || !currentUser.isTeacher) {
        console.log('Showing student name form...');
        showStudentNameForm();
    }
    
    // Load existing responses
    loadResponses();
}

function checkTeacherAccess(boardCode) {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        const user = JSON.parse(userData);
        if (user.isTeacher && user.boardCode === boardCode) {
            currentUser = user;
            isTeacher = true;
            document.getElementById('teacherControlsBtn').style.display = 'block';
        }
    }
}

function showStudentNameForm() {
    let studentName = null;
    
    while (!studentName || !studentName.trim()) {
        studentName = prompt(`ברוכים הבאים ללוח של ${currentBoard.teacherName}!\n\nהזן את שמך כדי להצטרף ללוח:`);
        
        if (studentName === null) {
            // User clicked cancel
            if (confirm('אתה בטוח שברצונך לעזוב את הלוח?')) {
                // Just close the window or go back instead of going to teacher page
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.close();
                }
                return;
            }
            // Continue the loop to ask again
        } else if (!studentName.trim()) {
            alert('חובה להזין שם כדי להצטרף ללוח');
            // Continue the loop to ask again
        }
    }
    
    // Valid name entered
    currentUser = {
        name: studentName.trim(),
        email: studentName.trim() + '@student.local',
        isTeacher: false
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Show welcome message
    showToast(`שלום ${currentUser.name}! ברוכים הבאים ללוח`);
}

function loadResponses() {
    console.log('Loading responses for board:', currentBoard.code);
    
    // Load responses from localStorage
    const boardDataString = localStorage.getItem(`board_${currentBoard.code}`);
    if (boardDataString) {
        try {
            const boardData = JSON.parse(boardDataString);
            responses = boardData.responses || [];
            currentBoard.responses = responses;
            console.log('Loaded responses:', responses.length);
        } catch (e) {
            console.error('Error parsing board data:', e);
            responses = [];
        }
    } else {
        responses = [];
    }
    
    displayResponses();
    updateWordCloud();
    updateStats();
    
    // Show/hide empty state
    const emptyState = document.getElementById('emptyState');
    if (responses.length === 0) {
        emptyState.style.display = 'block';
        document.getElementById('gridView').style.display = 'none';
        
        // Show helpful message for students
        if (!isTeacher) {
            const helpText = document.createElement('p');
            helpText.style.color = '#6c757d';
            helpText.style.textAlign = 'center';
            helpText.style.marginTop = '20px';
            helpText.innerHTML = 'עדיין אין תגובות בלוח.<br/>בואו נתחיל לשתף רעיונות!';
            emptyState.appendChild(helpText);
        }
    } else {
        emptyState.style.display = 'none';
        document.getElementById('gridView').style.display = 'block';
    }
}

function displayResponses() {
    const container = document.getElementById('responsesContainer');
    container.innerHTML = '';
    
    responses.forEach(response => {
        const card = createResponseCard(response);
        container.appendChild(card);
    });
}

function createResponseCard(response) {
    const card = document.createElement('div');
    card.className = 'response-card';
    card.style.backgroundColor = response.bgColor;
    
    const time = new Date(response.timestamp).toLocaleString('he-IL');
    
    card.innerHTML = `
        <div class="response-header">
            <div class="response-author">${response.author}</div>
            <div class="response-emoji">${response.emoji}</div>
        </div>
        <div class="response-text">${response.text}</div>
        <div class="response-time">${time}</div>
    `;
    
    return card;
}

function showResponseForm() {
    if (!currentUser) {
        alert('יש להזדהות כדי להוסיף תגובה');
        return;
    }
    
    document.getElementById('responseModal').style.display = 'flex';
}

function hideResponseForm() {
    document.getElementById('responseModal').style.display = 'none';
    document.getElementById('responseForm').reset();
}

function addResponse(event) {
    event.preventDefault();
    
    const text = document.getElementById('responseText').value.trim();
    const bgColor = document.querySelector('input[name="bgColor"]:checked').value;
    const emoji = document.querySelector('input[name="emoji"]:checked').value;
    
    const response = {
        id: Date.now(),
        author: currentUser.name,
        email: currentUser.email,
        text: text,
        bgColor: bgColor,
        emoji: emoji,
        timestamp: new Date().toISOString()
    };
    
    // Add to responses
    responses.push(response);
    
    // Save locally
    currentBoard.responses = responses;
    localStorage.setItem(`board_${currentBoard.code}`, JSON.stringify(currentBoard));
    
    // Update display
    displayResponses();
    updateWordCloud();
    updateStats();
    
    // Hide form
    hideResponseForm();
    
    // Show success message with sharing instruction
    showToast('התגובה נוספה! המורה יוכל לראות אותה בלוח שלו.');
    
    // Show instruction to share updated link
    if (!isTeacher) {
        setTimeout(() => {
            alert('התגובה שלך נוספה!\n\nכדי שהמורה וכל התלמידים יראו את התגובה החדשה, בקש מהמורה לשתף שוב את הקישור ללוח.');
        }, 2000);
    }
}

function toggleTeacherControls() {
    const panel = document.getElementById('teacherPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function updateStats() {
    if (!isTeacher) return;
    
    const totalResponses = responses.length;
    const uniqueStudents = new Set(responses.map(r => r.email)).size;
    const totalWords = responses.reduce((total, r) => total + r.text.split(' ').length, 0);
    
    document.getElementById('totalResponses').textContent = totalResponses;
    document.getElementById('uniqueStudents').textContent = uniqueStudents;
    document.getElementById('totalWords').textContent = totalWords;
}

function exportToCSV() {
    if (responses.length === 0) {
        alert('אין תגובות לייצוא');
        return;
    }
    
    const headers = ['שם', 'מייל', 'תגובה', 'צבע', 'אימוג\'י', 'זמן'];
    const csvContent = [
        headers.join(','),
        ...responses.map(r => [
            `"${r.author}"`,
            `"${r.email}"`,
            `"${r.text.replace(/"/g, '""')}"`,
            `"${r.bgColor}"`,
            `"${r.emoji}"`,
            `"${new Date(r.timestamp).toLocaleString('he-IL')}"`
        ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `responses_${currentBoard.code}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('הקובץ הורד בהצלחה!');
}

function clearBoard() {
    if (!isTeacher) return;
    
    if (confirm('האם אתה בטוח שברצונך לנקות את כל התגובות?')) {
        responses = [];
        currentBoard.responses = [];
        localStorage.setItem(`board_${currentBoard.code}`, JSON.stringify(currentBoard));
        
        displayResponses();
        updateWordCloud();
        updateStats();
        
        showToast('הלוח נוקה בהצלחה!');
    }
}

function switchView(view) {
    const gridView = document.getElementById('gridView');
    const cloudView = document.getElementById('cloudView');
    const gridBtn = document.getElementById('gridViewBtn');
    const cloudBtn = document.getElementById('cloudViewBtn');
    
    if (view === 'grid') {
        gridView.style.display = 'block';
        cloudView.style.display = 'none';
        gridBtn.classList.add('active');
        cloudBtn.classList.remove('active');
    } else {
        gridView.style.display = 'none';
        cloudView.style.display = 'block';
        gridBtn.classList.remove('active');
        cloudBtn.classList.add('active');
        updateWordCloud();
    }
}

function updateWordCloud() {
    console.log('Updating word cloud...');
    
    if (responses.length === 0) {
        document.getElementById('wordCloudContainer').innerHTML = 
            '<p style="color: #6c757d;">אין מספיק תגובות ליצירת ענן מילים</p>';
        return;
    }
    
    // Extract words from all responses
    const allText = responses.map(r => r.text).join(' ');
    console.log('All text for word cloud:', allText);
    
    const words = extractWords(allText);
    console.log('Extracted words:', words);
    
    const wordCounts = countWords(words);
    console.log('Word counts:', wordCounts);
    
    // Generate word cloud HTML
    generateWordCloudHTML(wordCounts);
}

function extractWords(text) {
    console.log('Extracting words from:', text);
    
    // Clean the text and split into words - improved regex for Hebrew
    const words = text
        // Keep Hebrew letters (including final forms), English letters, numbers
        .replace(/[^\u0590-\u05FF\u0600-\u06FF\u0041-\u005A\u0061-\u007A\u0030-\u0039\s]/g, ' ') 
        .split(/\s+/) // Split by whitespace
        .filter(word => word.length >= 2) // At least 2 characters
        .map(word => word.trim().toLowerCase()) // Normalize to lowercase
        .filter(word => word.length > 0)
        .filter(word => {
            // More flexible stop words check
            const isStopWord = hebrewStopWords.some(stopWord => 
                word === stopWord || 
                word.includes(stopWord) && word.length - stopWord.length <= 2
            );
            return !isStopWord;
        })
        .filter(word => {
            // Filter out very common single letters and numbers
            return !/^[\u0590-\u05FF\u0041-\u005A\u0061-\u007A]$/.test(word) && // Single letters
                   !/^\d+$/.test(word); // Pure numbers
        });
    
    console.log('Filtered words:', words);
    
    // If no words found, be more lenient
    if (words.length === 0) {
        console.log('No words found with strict filter, trying lenient filter...');
        const lenientWords = text
            .replace(/[^\u0590-\u05FF\u0600-\u06FF\u0041-\u005A\u0061-\u007A\u0030-\u0039\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length >= 1) // Just 1 character
            .map(word => word.trim().toLowerCase())
            .filter(word => word.length > 0)
            .filter(word => word.length >= 2); // At least 2 chars in lenient mode too
        
        console.log('Lenient words:', lenientWords);
        return lenientWords;
    }
    
    return words;
}

function countWords(words) {
    const counts = {};
    
    // Count word frequencies
    words.forEach(word => {
        const normalizedWord = word.toLowerCase().trim();
        if (normalizedWord.length >= 2) { // Only count words with at least 2 characters
            counts[normalizedWord] = (counts[normalizedWord] || 0) + 1;
        }
    });
    
    console.log('Word counts before sorting:', counts);
    
    // Sort by frequency (descending) and then alphabetically for ties
    const sortedWords = Object.entries(counts)
        .filter(([word, count]) => count >= 1) // Only include words that appear at least once
        .sort((a, b) => {
            // First sort by count (descending)
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }
            // If counts are equal, sort alphabetically
            return a[0].localeCompare(b[0], 'he');
        })
        .slice(0, 40); // Show top 40 words
    
    console.log('Sorted words for cloud:', sortedWords);
    return sortedWords;
}

function generateWordCloudHTML(wordCounts) {
    const container = document.getElementById('wordCloudContainer');
    
    if (wordCounts.length === 0) {
        container.innerHTML = '<p style="color: #6c757d;">לא נמצאו מילים מתאימות לענן מילים</p>';
        return;
    }
    
    const maxCount = wordCounts[0][1];
    const minCount = wordCounts[wordCounts.length - 1][1];
    
    console.log(`Word cloud stats: Max count: ${maxCount}, Min count: ${minCount}, Total words: ${wordCounts.length}`);
    
    // Create more diverse colors
    const colors = [
        '#d5a400', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', 
        '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', 
        '#ff9f43', '#10ac84', '#ee5a24', '#0abde3', '#74b9ff',
        '#fd79a8', '#fdcb6e', '#6c5ce7', '#a29bfe', '#fd63ff'
    ];
    
    // Create word cloud with better size distribution
    const cloudHTML = wordCounts.map(([word, count], index) => {
        // Better size calculation - more dramatic differences
        let size;
        if (maxCount === minCount) {
            size = 24; // All words same size if same frequency
        } else {
            const sizeRatio = (count - minCount) / (maxCount - minCount);
            // Size range: 16px to 60px with exponential scaling for more dramatic effect
            size = Math.round(16 + Math.pow(sizeRatio, 0.8) * 44);
        }
        
        // Pick color
        const color = colors[index % colors.length];
        
        // Add rotation for cloud effect - mix of horizontal, vertical and angled
        let rotation;
        if (index === 0) {
            // Biggest word stays horizontal
            rotation = 0;
        } else {
            // Other words get random orientations
            const rotationOptions = [0, 0, 0, 90, -90, 45, -45]; // More horizontal words
            rotation = rotationOptions[Math.floor(Math.random() * rotationOptions.length)];
        }
        
        console.log(`Word: ${word}, Count: ${count}, Size: ${size}px, Rotation: ${rotation}deg`);
        
        return `<span class="word-cloud-word" style="
            font-size: ${size}px;
            color: ${color};
            margin: 6px 12px;
            display: inline-block;
            font-weight: ${size > 35 ? 'bold' : size > 25 ? '600' : 'normal'};
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            transform: rotate(${rotation}deg);
            transition: all 0.3s ease;
            cursor: pointer;
            line-height: 1.2;
        " 
        title="המילה '${word}' הוזכרה ${count} פעמים" 
        onmouseover="this.style.transform='rotate(0deg) scale(1.15)'; this.style.textShadow='3px 3px 8px rgba(0,0,0,0.4)'" 
        onmouseout="this.style.transform='rotate(${rotation}deg) scale(1)'; this.style.textShadow='2px 2px 4px rgba(0,0,0,0.3)'"
        >${word}</span>`;
    }).join(' ');
    
    container.innerHTML = `
        <div style="
            text-align: center; 
            line-height: 1.8; 
            padding: 30px 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 20px;
            box-shadow: inset 0 2px 15px rgba(0,0,0,0.1);
            overflow: hidden;
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
        ">
            ${cloudHTML}
        </div>
    `;
    
    console.log('Word cloud generated successfully');
}

function downloadWordCloud() {
    const container = document.getElementById('wordCloudContainer');
    
    if (!container || container.innerHTML.includes('אין מספיק תגובות')) {
        showToast('⚠️ אין ענן מילים להורדה');
        return;
    }
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const canvasWidth = 1200;
    const canvasHeight = 800;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Set background
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#f8f9fa');
    gradient.addColorStop(1, '#e9ecef');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Get all word elements
    const wordElements = container.querySelectorAll('.word-cloud-word');
    
    if (wordElements.length === 0) {
        showToast('⚠️ לא נמצאו מילים בענן המילים');
        return;
    }
    
    // Add title
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(`ענן מילים - ${currentBoard ? currentBoard.question : 'לוח אינטראקטיבי'}`, canvasWidth / 2, 50);
    
    // Draw words on canvas
    let currentX = 100;
    let currentY = 120;
    const maxWidth = canvasWidth - 200;
    const lineHeight = 80;
    
    wordElements.forEach((wordEl, index) => {
        const word = wordEl.textContent;
        const fontSize = parseInt(wordEl.style.fontSize);
        const color = wordEl.style.color;
        
        // Get rotation
        const transform = wordEl.style.transform;
        const rotationMatch = transform.match(/rotate\(([^)]+)deg\)/);
        const rotation = rotationMatch ? parseFloat(rotationMatch[1]) : 0;
        
        // Set font
        const fontWeight = fontSize > 35 ? 'bold' : fontSize > 25 ? '600' : 'normal';
        ctx.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = color;
        
        // Measure text
        const textWidth = ctx.measureText(word).width;
        
        // Check if we need a new line
        if (currentX + textWidth > maxWidth) {
            currentX = 100;
            currentY += lineHeight;
        }
        
        // Make sure we don't go off the canvas
        if (currentY > canvasHeight - 50) {
            return; // Skip remaining words if they don't fit
        }
        
        // Save context for rotation
        ctx.save();
        
        // Move to word position and rotate
        ctx.translate(currentX + textWidth / 2, currentY);
        if (rotation !== 0) {
            ctx.rotate((rotation * Math.PI) / 180);
        }
        
        // Draw the word centered
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(word, 0, 0);
        
        // Restore context
        ctx.restore();
        
        // Update position
        currentX += textWidth + 30;
    });
    
    // Add footer
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    const currentDate = new Date().toLocaleDateString('he-IL');
    ctx.fillText(`נוצר באמצעות SmartPadlet - ${currentDate}`, canvasWidth / 2, canvasHeight - 20);
    
    // Convert canvas to image and download
    try {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `word-cloud-${currentBoard ? currentBoard.code : 'smartpadlet'}-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showToast('✅ ענן המילים הורד בהצלחה!');
        }, 'image/png');
    } catch (error) {
        console.error('Error creating download:', error);
        showToast('⚠️ שגיאה בהורדת התמונה');
    }
}

function debugWordCloud() {
    console.log('=== DEBUG WORD CLOUD ===');
    console.log('Responses:', responses);
    
    if (responses.length === 0) {
        alert('אין תגובות ליצירת ענן מילים');
        return;
    }
    
    const allText = responses.map(r => r.text).join(' ');
    console.log('All text:', allText);
    
    const words = extractWords(allText);
    console.log('Extracted words:', words);
    
    const wordCounts = countWords(words);
    console.log('Word counts:', wordCounts);
    
    const debugInfo = `
    תגובות: ${responses.length}
    טקסט מלא: "${allText}"
    מילים מפוענחות: ${words.length} (${words.join(', ')})
    מילים לאחר ספירה: ${wordCounts.length} (${wordCounts.map(([word, count]) => `${word}:${count}`).join(', ')})
    
    בדוק את הקונסול לפרטים נוספים.
    `;
    
    alert(debugInfo);
    console.log('========================');
}

function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d5a400;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(213, 164, 0, 0.3);
        z-index: 10000;
        font-weight: 500;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 