/**
 * Test script for music upload API
 * Run with: node test-music-upload.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001';

// Test credentials
const USERNAME = 'lokzu2';
const PASSWORD = 'ml120998';

async function login() {
  console.log('🔐 Logging in...');
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ Login successful');
  return data.token;
}

async function checkProStatus(token) {
  console.log('\n📊 Checking Pro status...');
  const response = await fetch(`${API_BASE}/api/subscription/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to check Pro status: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Pro Status: ${data.isPro ? '✅ PRO' : '❌ FREE'}`);
  return data.isPro;
}

async function uploadTestTrack(token) {
  console.log('\n🎵 Uploading test track...');
  
  // Create a test audio file (empty MP3 for testing)
  const testFilePath = path.join(__dirname, 'test-track.mp3');
  
  // Create a minimal valid MP3 file (ID3v2 header + minimal audio frame)
  const mp3Header = Buffer.from([
    0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ID3v2 header
    0xFF, 0xFB, 0x90, 0x00, // MP3 frame header
  ]);
  
  fs.writeFileSync(testFilePath, mp3Header);
  console.log('Created test MP3 file');

  const form = new FormData();
  form.append('file', fs.createReadStream(testFilePath), {
    filename: 'test-track.mp3',
    contentType: 'audio/mpeg'
  });
  form.append('isPublic', 'true');

  const response = await fetch(`${API_BASE}/api/music/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...form.getHeaders()
    },
    body: form
  });

  // Clean up test file
  fs.unlinkSync(testFilePath);
  console.log('Cleaned up test file');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Upload failed: ${error.error || response.status}`);
  }

  const data = await response.json();
  console.log('✅ Upload successful!');
  console.log('Track ID:', data.track.id);
  console.log('Title:', data.track.title);
  console.log('Artist:', data.track.artist);
  console.log('File URL:', data.track.fileUrl);
  return data.track;
}

async function getUserTracks(token) {
  console.log('\n📋 Getting user tracks...');
  const response = await fetch(`${API_BASE}/api/music/tracks`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to get tracks: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Found ${data.tracks.length} tracks`);
  data.tracks.forEach((track, i) => {
    console.log(`  ${i + 1}. ${track.title} by ${track.artist}`);
  });
  return data.tracks;
}

async function streamTrack(token, trackId) {
  console.log('\n🎧 Testing stream...');
  const response = await fetch(`${API_BASE}/api/music/stream/${trackId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to stream: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ Stream URL:', data.fileUrl);
  return data.fileUrl;
}

async function createPlaylist(token) {
  console.log('\n📝 Creating playlist...');
  const response = await fetch(`${API_BASE}/api/music/playlist`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test Playlist',
      description: 'Created by test script',
      isPublic: true
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create playlist: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ Playlist created:', data.playlist.name);
  return data.playlist;
}

async function runTests() {
  try {
    console.log('🚀 Starting Music Upload API Tests\n');
    console.log('='.repeat(50));

    // 1. Login
    const token = await login();

    // 2. Check Pro status
    const isPro = await checkProStatus(token);
    if (!isPro) {
      console.log('\n⚠️  User is not Pro. Upload will fail.');
      console.log('Run this SQL in Supabase to make user Pro:');
      console.log(`UPDATE users SET is_pro = TRUE WHERE username = '${USERNAME}';`);
      return;
    }

    // 3. Upload track
    const track = await uploadTestTrack(token);

    // 4. Get user tracks
    await getUserTracks(token);

    // 5. Stream track
    await streamTrack(token, track.id);

    // 6. Create playlist
    await createPlaylist(token);

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed!');
    console.log('\nNext steps:');
    console.log('1. Check Supabase Storage > flux-music bucket');
    console.log('2. Verify track in music_tracks table');
    console.log('3. Test upload from UI at /music.html');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
