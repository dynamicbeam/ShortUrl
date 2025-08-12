<template>
  <div class="min-h-screen bg-gray-100 flex flex-col items-center font-sans p-4 py-8">
    <div class="w-full max-w-3xl bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-4xl font-bold text-center text-gray-800 mb-8">短链接生成器</h1>

      <form @submit.prevent="createShortUrl" class="space-y-6">
        <div class="flex gap-4">
          <div class="flex-grow">
            <label for="longUrl" class="text-lg font-medium text-gray-700">输入长链接：<span class="text-red-500">*</span></label>
            <div class="flex gap-2 mt-2">
              <input
                id="longUrl"
                v-model="longUrl"
                type="url"
                required
                placeholder="https://example.com/very-long-url"
                class="flex-grow px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <input
                id="customCode"
                v-model="customCode"
                type="text"
                placeholder="自定义后缀（可选）"
                class="w-32 px-1 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <button
                type="submit"
                :disabled="isLoading"
                class="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {{ isLoading ? '生成中...' : '生成' }}
              </button>
            </div>
          </div>
        </div>
      </form>

      <!-- 生成结果 -->
      <div v-if="result" class="mt-6">
        <div v-if="isError" class="p-4 rounded-lg bg-red-100 text-red-800">
          <p class="font-medium">{{ result }}</p>
        </div>
        <div v-else class="flex items-center gap-3 p-4 rounded-lg bg-green-100">
          <div class="flex-grow">
            <p class="text-green-800 font-medium mb-1">短链接已生成并复制到剪贴板！</p>
            <a :href="result" target="_blank" class="text-blue-600 hover:text-blue-800 font-semibold break-all">{{ result }}</a>
          </div>
          <button
            @click="copyToClipboard(result)"
            class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2"
            title="复制链接"
          >
            📋
          </button>
        </div>
      </div>
    </div>

    <!-- 短链列表 -->
    <div class="w-full max-w-3xl bg-white shadow-lg rounded-lg p-8 mt-8">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">短链接列表</h2>
        <button
          @click="fetchLinks"
          class="text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-1"
          :class="{ 'animate-spin': isLoadingLinks }"
        >
          ⟳ 刷新
        </button>
      </div>

      <div v-if="isLoadingLinks" class="text-center py-8 text-gray-500">
        加载中...
      </div>
      
      <div v-else-if="links.length === 0" class="text-center py-8 text-gray-500">
        暂无短链接
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-left border-collapse">
          <thead class="border-b bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-sm font-semibold text-gray-700">短链接</th>
              <th scope="col" class="px-6 py-3 text-sm font-semibold text-gray-700">原始链接</th>
              <th scope="col" class="px-6 py-3 text-sm font-semibold text-gray-700">创建时间</th>
              <th scope="col" class="px-6 py-3 text-sm font-semibold text-gray-700 text-center">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="link in links" :key="link.shortUrl" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <a :href="link.shortUrl" target="_blank" class="text-blue-600 hover:text-blue-800 font-medium break-all">
                  {{ link.shortUrl }}
                </a>
              </td>
              <td class="px-6 py-4 max-w-xs">
                <p class="text-gray-600 text-sm truncate" :title="link.longUrl">{{ link.longUrl }}</p>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <p class="text-gray-500 text-sm">{{ new Date(link.createdAt).toLocaleString() }}</p>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <button
                  @click="copyToClipboard(link.shortUrl)"
                  class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
                  title="复制链接"
                >
                  📋
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <footer class="text-center text-gray-500 mt-8">
      <p></p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const longUrl = ref('');
const customCode = ref('');
const isLoading = ref(false);
const result = ref(null);
const isError = ref(false);
const links = ref([]);
const isLoadingLinks = ref(false);

const fetchLinks = async () => {
  isLoadingLinks.value = true;
  try {
    const response = await fetch('/api/links');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '获取链接列表失败');
    }
    links.value = data;
  } catch (error) {
    console.error('获取链接列表失败:', error);
  } finally {
    isLoadingLinks.value = false;
  }
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('复制失败:', error);
  }
};

// 初始加载链接列表
fetchLinks();

const createShortUrl = async () => {
  isLoading.value = true;
  result.value = null;
  isError.value = false;

  try {
    const payload = {
      longUrl: longUrl.value,
    };
    if (customCode.value) {
      payload.customCode = customCode.value;
    }

    const response = await fetch('/api/shorten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '发生未知错误');
    }

    result.value = data.shortUrl;
    // 复制到剪贴板
    await copyToClipboard(data.shortUrl);
    // 创建成功后刷新链接列表
    fetchLinks();
  } catch (error) {
    isError.value = true;
    result.value = `错误: ${error.message}`;
  } finally {
    isLoading.value = false;
  }
};
</script>
