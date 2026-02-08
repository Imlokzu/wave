const authToken = localStorage.getItem('authToken');
if (!authToken) {
  window.location.href = '/login.html';
}

const channelsList = document.getElementById('channelsList');
const postsList = document.getElementById('postsList');
const channelTitle = document.getElementById('channelTitle');
const channelSubtitle = document.getElementById('channelSubtitle');
const adminBadge = document.getElementById('adminBadge');
const adminCreateChannel = document.getElementById('adminCreateChannel');
const adminCreatePost = document.getElementById('adminCreatePost');
const createChannelBtn = document.getElementById('createChannelBtn');
const createPostBtn = document.getElementById('createPostBtn');

let isAdmin = false;
let currentChannel = null;

async function checkAdmin() {
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.ok) {
      isAdmin = true;
      adminBadge.classList.remove('hidden');
      adminCreateChannel.classList.remove('hidden');
      adminCreatePost.classList.remove('hidden');
    }
  } catch (_) {
    // ignore
  }
}

async function loadChannels() {
  const res = await fetch('/api/channels', {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const data = await res.json();
  const channels = data.channels || [];

  channelsList.innerHTML = '';
  channels.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left px-3 py-2 rounded-lg bg-surface-lighter hover:bg-slate-700 transition-colors';
    btn.textContent = ch.name;
    btn.onclick = () => selectChannel(ch);
    channelsList.appendChild(btn);
  });

  if (!currentChannel && channels.length > 0) {
    selectChannel(channels[0]);
  }
}

async function selectChannel(channel) {
  currentChannel = channel;
  channelTitle.textContent = channel.name;
  channelSubtitle.textContent = channel.description || '';
  await loadPosts(channel.id);
}

async function loadPosts(channelId) {
  const res = await fetch(`/api/channels/${channelId}/posts`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const data = await res.json();
  const posts = data.posts || [];

  postsList.innerHTML = '';
  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'bg-surface-lighter rounded-xl border border-slate-800 p-4';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-2';
    header.innerHTML = `<div class="text-xs text-slate-400">${post.createdByName || 'Admin'} · ${new Date(post.createdAt).toLocaleString()}</div>`;

    const content = document.createElement('div');
    content.className = 'text-sm text-white whitespace-pre-wrap';
    content.textContent = post.content;

    const reactions = document.createElement('div');
    reactions.className = 'flex gap-2 mt-3';
    ['👍','❤️','😂'].forEach(emoji => {
      const count = post.reactions?.[emoji] || 0;
      const btn = document.createElement('button');
      btn.className = 'px-2 py-1 rounded-lg bg-surface-dark border border-slate-700 text-xs';
      btn.textContent = `${emoji} ${count}`;
      btn.onclick = () => reactToPost(post.id, emoji, btn);
      reactions.appendChild(btn);
    });

    card.appendChild(header);
    card.appendChild(content);
    card.appendChild(reactions);
    postsList.appendChild(card);
  });
}

async function reactToPost(postId, emoji, btn) {
  if (!currentChannel) return;
  const res = await fetch(`/api/channels/${currentChannel.id}/posts/${postId}/react`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({ emoji })
  });
  const data = await res.json();
  if (data.reactions) {
    // Refresh posts to update counts
    await loadPosts(currentChannel.id);
  }
}

createChannelBtn?.addEventListener('click', async () => {
  const name = document.getElementById('channelName').value.trim();
  const description = document.getElementById('channelDescription').value.trim();
  if (!name) return;
  const res = await fetch('/api/channels', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({ name, description })
  });
  if (res.ok) {
    document.getElementById('channelName').value = '';
    document.getElementById('channelDescription').value = '';
    await loadChannels();
  }
});

createPostBtn?.addEventListener('click', async () => {
  if (!currentChannel) return;
  const content = document.getElementById('postContent').value.trim();
  if (!content) return;
  const res = await fetch(`/api/channels/${currentChannel.id}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({ content })
  });
  if (res.ok) {
    document.getElementById('postContent').value = '';
    await loadPosts(currentChannel.id);
  }
});

(async function init() {
  await checkAdmin();
  await loadChannels();
})();
