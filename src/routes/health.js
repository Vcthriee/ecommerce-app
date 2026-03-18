// Import Express router for health check endpoint
const express = require('express');
const router = express.Router();

// GET /health - ALB health check endpoint
// Simple, fast response - ALB needs this to return 200 quickly
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || 'unknown'
  });
});

// GET /health/ready - Kubernetes-style readiness probe
router.get('/ready', (req, res) => {
  res.status(200).json({ ready: true });
});

// GET /health/live - Kubernetes-style liveness probe
router.get('/live', (req, res) => {
  res.status(200).json({ alive: true });
});

module.exports = router;