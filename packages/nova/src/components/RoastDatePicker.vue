<script setup>
/**
 * A custom calendar-grid date picker (Monday-first), modeled on NSX's
 * batch-date-picker — so tapping a roast date opens THIS sheet instead of the
 * device's native OS calendar (which varies per Android build and ignored our
 * theme). Same contract as before: v-model in via modelValue, emits 'confirm'
 * with a 'YYYY-MM-DD' string or 'cancel'. Future dates are disabled (a bean
 * can't be roasted in the future).
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({ modelValue: { type: String, default: null } });
const emit = defineEmits(['confirm', 'cancel']);
const { t } = useI18n();

const pad = (n) => String(n).padStart(2, '0');
const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

const today = new Date();
const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());

// Parse the incoming value (or default to today) into the selected date and the
// month the grid opens on.
function parse(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return { y: today.getFullYear(), mo: today.getMonth(), d: today.getDate() };
  return { y: Number(m[1]), mo: Number(m[2]) - 1, d: Number(m[3]) };
}

const init = parse(props.modelValue);
const selected = ref(toIso(init.y, init.mo, init.d)); // 'YYYY-MM-DD'
const viewYear = ref(init.y);
const viewMonth = ref(init.mo); // 0-11

const MONTHS = computed(() => t('datePicker.months').split(','));
const WEEKDAYS = computed(() => t('datePicker.weekdays').split(','));
const monthLabel = computed(() => `${MONTHS.value[viewMonth.value]} ${viewYear.value}`);

// Monday-first grid: JS getDay() is Sunday=0, so shift so Monday=0.
const cells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate();
  const out = [];
  for (let i = 0; i < startOffset; i += 1) out.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = toIso(viewYear.value, viewMonth.value, d);
    out.push({ d, iso, future: iso > todayIso, today: iso === todayIso, selected: iso === selected.value });
  }
  return out;
});

function shiftMonth(delta) {
  let m = viewMonth.value + delta;
  let y = viewYear.value;
  if (m < 0) { m = 11; y -= 1; }
  else if (m > 11) { m = 0; y += 1; }
  viewMonth.value = m;
  viewYear.value = y;
}
function shiftYear(delta) { viewYear.value += delta; }
function pick(cell) { if (cell && !cell.future) selected.value = cell.iso; }
</script>

<template>
  <div class="scrim" @click.self="emit('cancel')">
    <div class="modal dp-modal">
      <span class="m-title">{{ t('espresso.setRoastDate') }}</span>

      <div class="dp-head">
        <button class="dp-nav" :aria-label="t('datePicker.prevYear')" @click="shiftYear(-1)">«</button>
        <button class="dp-nav" :aria-label="t('datePicker.prevMonth')" @click="shiftMonth(-1)">‹</button>
        <span class="dp-month">{{ monthLabel }}</span>
        <button class="dp-nav" :aria-label="t('datePicker.nextMonth')" @click="shiftMonth(1)">›</button>
        <button class="dp-nav" :aria-label="t('datePicker.nextYear')" @click="shiftYear(1)">»</button>
      </div>

      <div class="dp-grid dp-weekdays">
        <span v-for="w in WEEKDAYS" :key="w" class="dp-wd">{{ w }}</span>
      </div>
      <div class="dp-grid dp-days">
        <template v-for="(cell, i) in cells" :key="i">
          <span v-if="!cell" class="dp-day empty"></span>
          <button
            v-else
            class="dp-day"
            :class="{ sel: cell.selected, today: cell.today }"
            :disabled="cell.future"
            @click="pick(cell)"
          >{{ cell.d }}</button>
        </template>
      </div>

      <div class="modal-actions">
        <button class="cancel" @click="emit('cancel')">{{ t('common.cancel') }}</button>
        <button class="confirm" @click="emit('confirm', selected)">{{ t('common.confirm') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dp-modal { min-width: 320px; }
.dp-head { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 4px 0 10px; }
.dp-month { flex: 1; text-align: center; font-size: var(--fs-md); font-weight: 700; letter-spacing: 0.04em; }
.dp-nav {
  flex: none; width: 38px; height: 38px; border: none; border-radius: 10px;
  background: var(--card-bg); color: var(--accent); font-family: inherit; font-size: var(--fs-md); font-weight: 700; cursor: pointer;
}
.dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.dp-weekdays { margin-bottom: 4px; }
.dp-wd { text-align: center; font-size: var(--fs-xs); font-weight: 600; color: var(--muted); text-transform: uppercase; }
.dp-day {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 10px; background: var(--card-bg); color: var(--text);
  font-family: inherit; font-size: var(--fs-sm); font-weight: 600; cursor: pointer;
}
.dp-day.empty { background: none; }
.dp-day:disabled { opacity: 0.28; cursor: default; }
.dp-day.today { box-shadow: inset 0 0 0 1.5px var(--muted); }
.dp-day.sel { background: var(--accent); color: #12161b; }
</style>
