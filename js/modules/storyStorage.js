/**
 * Story Storage and Library Management
 */
import { state } from '../state/store.js';
import { el } from './domElements.js';
import { showToast, escapeHtml } from './utils.js';
import { saveStoryApi, loadSavedStoriesApi, loadStoryByIdApi } from '../api/apiClient.js';

export async function saveStoryToServer() {
  try {
    await saveStoryApi(state.story);
  } catch (e) {
    console.error('Failed to auto-save story:', e);
  }
}

export async function openSavedStoriesModal({ onStoryLoaded }) {
  el.savedModal.classList.add('show');
  el.savedStoriesList.innerHTML = '<p class="empty-state">Loading library...</p>';

  try {
    const data = await loadSavedStoriesApi();

    if (!data.stories || data.stories.length === 0) {
      el.savedStoriesList.innerHTML = '<p class="empty-state">No saved novels yet. Start creating one!</p>';
      return;
    }

    el.savedStoriesList.innerHTML = '';
    data.stories.forEach(item => {
      const card = document.createElement('div');
      card.className = 'saved-story-card';
      card.innerHTML = `
        <div class="saved-story-info">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${item.sceneCount} Scenes • ${new Date(item.createdAt).toLocaleDateString()}</p>
        </div>
        <button class="btn-primary btn-sm load-story-btn">Open Novel</button>
      `;

      card.querySelector('.load-story-btn').addEventListener('click', async () => {
        await loadStoryById(item.id, onStoryLoaded);
        el.savedModal.classList.remove('show');
      });

      el.savedStoriesList.appendChild(card);
    });
  } catch (e) {
    el.savedStoriesList.innerHTML = `<p class="empty-state">Error loading stories: ${e.message}</p>`;
  }
}

export async function loadStoryById(id, onStoryLoaded) {
  try {
    const storyData = await loadStoryByIdApi(id);
    state.story = storyData;

    if (typeof onStoryLoaded === 'function') {
      onStoryLoaded(storyData);
    }

    showToast(`Loaded "${state.story.title}"`, 'success');
  } catch (e) {
    showToast(`Failed to load story: ${e.message}`, 'error');
  }
}
