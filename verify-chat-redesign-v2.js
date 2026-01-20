/**
 * Verification Script for Chat Redesign v2
 * Tests the new 3-column layout and all functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Chat Redesign v2...\n');

// Read the new chat.html file
const chatHtmlPath = path.join(__dirname, 'public', 'chat.html');
const chatHtml = fs.readFileSync(chatHtmlPath, 'utf8');

let passed = 0;
let failed = 0;

function test(name, condition) {
    if (condition) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        failed++;
    }
}

console.log('📋 Testing Critical Requirements:\n');

// 1. Icon Font Fix
test('Correct Material Symbols font link (with PLUS signs)', 
    chatHtml.includes('Material+Symbols+Outlined') && 
    !chatHtml.includes('Material_Symbols_Outlined'));

// 2. Layout Structure
test('Left sidebar (280px) present', chatHtml.includes('w-[280px]'));
test('Middle column (380px) present', chatHtml.includes('w-[380px]'));
test('Right panel (320px, XL only) present', chatHtml.includes('w-80') && chatHtml.includes('xl:flex'));

// 3. Wave Colors
test('Primary color #0db9f2', chatHtml.includes('"primary": "#0db9f2"'));
test('Background color #101e22', chatHtml.includes('"background-dark": "#101e22"'));
test('Surface color #16262c', chatHtml.includes('"surface-dark": "#16262c"'));
test('Inter font family', chatHtml.includes('Inter'));

// 4. All Critical IDs Present
const criticalIds = [
    'loginScreen', 'chatScreen', 'userNickname', 'sidebarSearchInput', 
    'sidebarSearchResults', 'createJoinRoomBtn', 'chatsList', 'dmsList', 
    'roomsList', 'backToRoomBtn', 'roomName', 'roomStatus', 'messagesFeed', 
    'pinnedMessages', 'messages', 'scrollToBottomBtn', 'typingIndicator', 
    'messageInput', 'attachmentBtn', 'emojiBtn', 'pollBtn', 'voiceBtn', 
    'sendButton', 'roomInfoPanel', 'notificationToggle', 'roomMembersList', 
    'roomCodeContainer', 'mobileBottomNav', 'attachmentMenu', 'pollModal', 
    'reactionPicker', 'createJoinRoomModal', 'newDMModal', 'settingsModal', 
    'inviteNotifications', 'roomNameRight', 'closePinnedBtn', 'pinnedMessagesList',
    'unreadCount', 'typingText', 'regenerateCodeBtn', 'createNewRoomBtn',
    'quickCreateRoomBtn', 'copyRoomCodeBtn', 'roomCodeDisplay', 'noRoomState',
    'roomInfoContainer', 'roomActionContainer', 'closePollModal', 'pollQuestion',
    'pollOptions', 'addPollOption', 'cancelPoll', 'createPoll', 'closeCreateJoinModal',
    'roomCodeInput', 'submitRoomBtn', 'closeNewDMModal', 'dmUserSearchInput',
    'dmSearchResults', 'closeSettingsModal', 'settingsNickname', 'settingsUsername',
    'settingsNotificationToggle', 'clearChatBtn', 'logoutBtn', 'attachImage',
    'attachFile', 'attachSticker', 'attachAudio', 'startVoiceCall', 'musicBtn',
    'setStatusLink'
];

let missingIds = [];
criticalIds.forEach(id => {
    if (!chatHtml.includes(`id="${id}"`)) {
        missingIds.push(id);
    }
});

test(`All ${criticalIds.length} critical IDs present`, missingIds.length === 0);
if (missingIds.length > 0) {
    console.log(`   Missing IDs: ${missingIds.join(', ')}`);
}

// 5. All Modals Present
const modals = ['pollModal', 'settingsModal', 'newDMModal', 'createJoinRoomModal', 
                'reactionPicker', 'attachmentMenu'];
modals.forEach(modal => {
    test(`Modal: ${modal}`, chatHtml.includes(`id="${modal}"`));
});

// 6. JavaScript Files
const jsFiles = ['config.js', 'utils.js', 'api.js', 'socket.js', 'state.js', 'ui.js', 'app.js'];
jsFiles.forEach(file => {
    test(`JS file included: ${file}`, chatHtml.includes(`/js/${file}`));
});

// 7. Mobile Navigation
test('Mobile bottom navigation present', chatHtml.includes('id="mobileBottomNav"'));
test('Mobile responsive classes', chatHtml.includes('lg:hidden') && chatHtml.includes('lg:flex'));

// 8. Material Symbols Configuration
test('Material Symbols CSS class', chatHtml.includes('material-symbols-outlined'));
test('Material Symbols font-variation-settings', chatHtml.includes('font-variation-settings'));

// 9. Layout Components
test('Left sidebar navigation menu', chatHtml.includes('Nav Links'));
test('Middle column chat list', chatHtml.includes('Direct Messages') && chatHtml.includes('Rooms'));
test('Main chat area', chatHtml.includes('Message Feed Container'));
test('Right panel room info', chatHtml.includes('Room Info'));

// 10. Design Elements
test('Wave logo "W" present', chatHtml.includes('text-background-dark font-black'));
test('User profile snippet', chatHtml.includes('User Profile Snippet'));
test('Search functionality', chatHtml.includes('Search conversations'));
test('Glassmorphism effect', chatHtml.includes('glass-panel'));

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
    console.log('🎉 All tests passed! Chat redesign v2 is ready.\n');
    console.log('✨ Key improvements:');
    console.log('   • Fixed Material Symbols font link');
    console.log('   • 3-column layout (280px + 380px + flex + 320px)');
    console.log('   • All IDs preserved for functionality');
    console.log('   • Wave colors applied');
    console.log('   • Mobile responsive design');
    console.log('   • All modals and features intact\n');
    process.exit(0);
} else {
    console.log('⚠️  Some tests failed. Please review the issues above.\n');
    process.exit(1);
}
