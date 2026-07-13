<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  diaryState, roasterGroups, beansInRoaster, shotsInBean, fullHistoryShots,
  enterRoaster, enterBean, goBack, cycleSort, setView, ensureDiaryLoaded, shotCountForBean,
} from '../composables/useDiary.js';
import BeanEditor from '../components/BeanEditor.vue';

const { t } = useI18n();

onMounted(ensureDiaryLoaded);

const sortLabel = computed(() => t(`diary.sort${diaryState.sort[0].toUpperCase()}${diaryState.sort.slice(1)}`));
const searchPlaceholder = computed(() => {
  if (diaryState.view === 'full') return t('diary.searchProfile');
  return [t('diary.searchRoaster'), t('diary.searchBean'), t('diary.searchProfile')][diaryState.level];
});

const crumb = computed(() => {
  if (diaryState.view === 'full') return t('diary.fullHistory');
  if (diaryState.level === 0) return t('diary.roasters');
  if (diaryState.level === 1) return diaryState.roasterName;
  return `${diaryState.roasterName} › ${diaryState.bean?.name ?? ''}`;
});

const editingBean = ref(null); // bean object, or a { presetRoaster } marker for "new"
const showEditor = ref(false);
function openNewBean() {
  editingBean.value = null;
  showEditor.value = true;
}
function openEditBean(bean) {
  editingBean.value = bean;
  showEditor.value = true;
}
function closeEditor() { showEditor.value = false; }

// enjoyment is 0-100 in the real API (5 stars x 20), not 1-5 — treating it as
// 1-5 made '☆'.repeat(5 - n) throw a RangeError on any real shot rated above
// 5, which crashed the whole Diary render.
const stars = (enjoyment) => {
  const n = window.NSXCore.enjoymentToStars(enjoyment);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
};
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}
</script>

<template>
  <section class="page">
    <div class="diary-head">
      <button v-if="diaryState.view === 'browse' && diaryState.level > 0" class="ov-back" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>{{ t('diary.back') }}
      </button>
      <div v-if="diaryState.searchOpen" class="diary-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>
        <input v-model="diaryState.query" type="text" :placeholder="searchPlaceholder" autofocus />
      </div>
      <span v-else class="diary-crumb">{{ crumb }}</span>
      <button v-if="diaryState.searchOpen" class="sort-btn" @click="diaryState.searchOpen = false">{{ t('common.done') }}</button>
      <button v-else class="sort-btn" @click="cycleSort">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /></svg>{{ sortLabel }}
      </button>
    </div>

    <!-- Full history: flat list across all beans -->
    <div v-if="diaryState.view === 'full'" class="list">
      <div v-for="shot in fullHistoryShots" :key="shot.id" class="list-row shot-row">
        <span class="shot-facts">
          <span class="fact"><b>{{ fmtDate(shot.timestamp) }}</b></span>
          <span class="fact">{{ shot.workflow?.context?.coffeeName || '—' }}</span>
          <span class="fact">{{ shot.workflow?.profile?.title || '—' }}</span>
        </span>
        <span class="stars">{{ stars(shot.annotations?.enjoyment) }}</span>
      </div>
      <div v-if="!fullHistoryShots.length" class="list-row"><span class="rsub">{{ t('diary.noResults') }}</span></div>
    </div>

    <!-- Browse: roasters -->
    <div v-else-if="diaryState.level === 0" class="list">
      <button v-for="g in roasterGroups" :key="g.name" class="list-row" @click="enterRoaster(g.name)">
        <span class="rmeta">{{ g.name }}<span class="rsub">{{ g.beans.length }} bean{{ g.beans.length !== 1 ? 's' : '' }}</span></span>
        <span class="chev">›</span>
      </button>
      <div v-if="!roasterGroups.length" class="list-row"><span class="rsub">{{ t('diary.noResults') }}</span></div>
    </div>

    <!-- Browse: beans in a roaster -->
    <div v-else-if="diaryState.level === 1" class="list">
      <div v-for="bean in beansInRoaster" :key="bean.id" class="list-row bean-row">
        <button class="row-main" @click="enterBean(bean)">
          <span class="rmeta">{{ bean.name }}<span class="rsub">{{ shotCountForBean(bean) }}</span></span>
          <span class="chev">›</span>
        </button>
        <button class="row-edit" :aria-label="t('diary.editBean')" @click="openEditBean(bean)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1L20 7l-3-3L5 16l-1 4z" /></svg>
        </button>
      </div>
      <div v-if="!beansInRoaster.length" class="list-row"><span class="rsub">{{ t('diary.noResults') }}</span></div>
    </div>

    <!-- Browse: shots for a bean -->
    <div v-else class="list">
      <div v-for="shot in shotsInBean" :key="shot.id" class="list-row shot-row">
        <span class="shot-facts">
          <span class="fact"><b>{{ fmtDate(shot.timestamp) }}</b></span>
          <span class="fact">{{ shot.workflow?.profile?.title || '—' }}</span>
          <span class="fact"><b>{{ shot.workflow?.context?.targetDoseWeight ?? '—' }}</b>→<b>{{ shot.workflow?.context?.targetYield ?? '—' }}</b> g</span>
        </span>
        <span class="stars">{{ stars(shot.annotations?.enjoyment) }}</span>
      </div>
      <div v-if="!shotsInBean.length" class="list-row"><span class="rsub">{{ t('diary.noShotsYet') }}</span></div>
    </div>

    <div class="diary-bottom">
      <div class="seg" :data-pos="diaryState.view === 'full' ? 1 : 0">
        <span class="seg-thumb"></span>
        <button :class="{ on: diaryState.view === 'browse' }" @click="setView('browse')">{{ t('diary.browse') }}</button>
        <button :class="{ on: diaryState.view === 'full' }" @click="setView('full')">{{ t('diary.fullHistory') }}</button>
      </div>
      <span class="spacer" style="flex: 1"></span>
      <button
        v-if="diaryState.view === 'browse' && diaryState.level < 2"
        class="rbtn accent"
        :aria-label="t('diary.add')"
        @click="openNewBean"
      >+</button>
      <button class="rbtn" :aria-label="t('diary.search')" @click="diaryState.searchOpen = true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>
      </button>
    </div>

    <BeanEditor
      v-if="showEditor"
      :bean="editingBean"
      :preset-roaster="diaryState.level === 1 ? diaryState.roasterName : ''"
      @close="closeEditor"
      @saved="closeEditor"
      @deleted="closeEditor"
    />
  </section>
</template>
