<template>
  <router-view />
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f5f7fa;
  color: #333;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary   { background: #1a3a5c; color: white; }
.btn-primary:hover { background: #2a5a8c; }
.btn-success   { background: #28a745; color: white; }
.btn-success:hover { background: #218838; }
.btn-danger    { background: #dc3545; color: white; }
.btn-danger:hover  { background: #c82333; }
.btn-warning   { background: #ffc107; color: #333; }
.btn-warning:hover { background: #e0a800; }
.btn-secondary { background: #6c757d; color: white; }
.btn-secondary:hover { background: #5a6268; }
.btn:disabled  { opacity: 0.6; cursor: not-allowed; }

.badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.badge-brouillon     { background: #e9ecef; color: #495057; }
.badge-en_attente    { background: #fff3cd; color: #856404; }
.badge-en_validation { background: #cce5ff; color: #004085; }
.badge-approuve      { background: #d4edda; color: #155724; }
.badge-rejete        { background: #f8d7da; color: #721c24; }
.badge-archive       { background: #e2e3e5; color: #383d41; }

.card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

.table { width: 100%; border-collapse: collapse; }
.table th { background: #f8f9fa; padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #666; border-bottom: 2px solid #e0e0e0; }
.table td { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.table tr:hover td { background: #f8f9fa; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 6px; }
.form-group input,
.form-group select,
.form-group textarea { width: 100%; padding: 10px 14px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; box-sizing: border-box; }
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus { outline: none; border-color: #1a3a5c; }
</style>