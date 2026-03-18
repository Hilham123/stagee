<template>
<div class="stats-grid">
<div class="stat-card" v-for="stat in stats" :key="stat.label">
    <div class="stat-icon" :style="`background: ${stat.color || '#f0f4f8'}`">
    <component :is="stat.icon" :size="24" :color="stat.iconColor || '#1a3a5c'" />
    </div>
    <div class="stat-info">
    <div class="stat-value">{{ stat.value }}</div>
    <div class="stat-label">{{ stat.label }}</div>
    </div>
</div>
</div>
</template>

<script setup>
defineProps({
stats: { type: Array, default: () => [] }
})
</script>

<style scoped>
.stats-grid {
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 20px;
margin-bottom: 16px;
}
.stat-card {
background: white;
border-radius: 12px;
padding: 20px;
display: flex;
align-items: center;
gap: 16px;
box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.stat-icon {
width: 52px;
height: 52px;
border-radius: 12px;
display: flex;
align-items: center;
justify-content: center;
flex-shrink: 0;
}
.stat-value { font-size: 28px; font-weight: 700; color: #1a3a5c; }
.stat-label { font-size: 13px; color: #666; margin-top: 4px; }
</style>