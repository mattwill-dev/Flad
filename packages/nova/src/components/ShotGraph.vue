<script setup>
/**
 * Thin uPlot wrapper. uPlot is vanilla JS, not a Vue component, so this owns an
 * imperative instance in a ref'd container and rebuilds it when the data shape
 * changes — reused for both the live-updating graph and a static past shot.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import uPlot from 'uplot';

const props = defineProps({
  elapsed: { type: Array, required: true },
  series: {
    // [{ label, color, values }]
    type: Array,
    required: true,
  },
});

const el = ref(null);
let chart = null;

function buildOpts() {
  const w = el.value?.clientWidth || 320;
  const h = el.value?.clientHeight || 150;
  return {
    width: w,
    height: h,
    padding: [8, 8, 8, 8],
    cursor: { show: false },
    legend: { show: false },
    axes: [{ show: false }, { show: false }],
    scales: { x: { time: false } },
    series: [
      {},
      ...props.series.map((s) => ({ stroke: s.color, width: 2, points: { show: false } })),
    ],
  };
}

function rebuild() {
  chart?.destroy();
  chart = null;
  if (!el.value || !props.elapsed.length) return;
  const data = [props.elapsed, ...props.series.map((s) => s.values)];
  chart = new uPlot(buildOpts(), data, el.value);
}

function onResize() { rebuild(); }

onMounted(() => {
  rebuild();
  window.addEventListener('resize', onResize);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  chart?.destroy();
});

// Live mode pushes new points onto the same arrays — setData is cheap and
// avoids destroying/recreating the chart every ~250ms tick.
watch(
  () => props.elapsed.length,
  () => {
    if (!chart) { rebuild(); return; }
    chart.setData([props.elapsed, ...props.series.map((s) => s.values)]);
  }
);
</script>

<template>
  <div ref="el" class="shot-graph-canvas"></div>
</template>
