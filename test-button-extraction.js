// Quick test to verify button URL extraction is working
const fetch = require('node-fetch');

async function testButtonExtraction() {
    console.log('🔍 Testing Button URL Extraction...\n');
    
    try {
        // Fetch posts from bot
        const response = await fetch('http://localhost:3000/posts?limit=20');
        const data = await response.json();
        
        if (data.status !== 'success') {
            console.log('❌ Failed to fetch posts:', data);
            return;
        }
        
        console.log(`✅ Fetched ${data.messages.length} posts\n`);
        
        // Check for button URLs
        let postsWithButtons = 0;
        let totalButtons = 0;
        
        data.messages.forEach((msg, index) => {
            if (msg.message && msg.message.includes('🔗 Links:')) {
                postsWithButtons++;
                
                // Count buttons in this post
                const linksSection = msg.message.split('🔗 Links:')[1];
                if (linksSection) {
                    const buttons = linksSection.trim().split('\n').filter(line => line.includes('http'));
                    totalButtons += buttons.length;
                    
                    console.log(`📌 Post ${index + 1} (${msg.channel_name}):`);
                    console.log(`   Message ID: ${msg.message_id}`);
                    console.log(`   Buttons found: ${buttons.length}`);
                    buttons.forEach(btn => {
                        const [text, url] = btn.split(': ');
                        console.log(`   - ${text}: ${url}`);
                    });
                    console.log('');
                }
            }
        });
        
        console.log('\n📊 Summary:');
        console.log(`   Total posts checked: ${data.messages.length}`);
        console.log(`   Posts with button URLs: ${postsWithButtons}`);
        console.log(`   Total buttons extracted: ${totalButtons}`);
        
        if (postsWithButtons === 0) {
            console.log('\n⚠️  No button URLs found yet.');
            console.log('   This is normal if:');
            console.log('   - Posts were scraped before the fix');
            console.log('   - Channels don\'t use inline buttons');
            console.log('   - Bot hasn\'t auto-scraped yet (happens every 10 min)');
            console.log('\n💡 Try:');
            console.log('   1. Wait for auto-scrape (10 minutes)');
            console.log('   2. Add a channel that uses buttons (TechCrunch, CoinTelegraph)');
            console.log('   3. Click Refresh in the feed UI');
        } else {
            console.log('\n✅ Button URL extraction is working!');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('\n💡 Make sure the bot is running: npm run dev:bot');
    }
}

testButtonExtraction();
