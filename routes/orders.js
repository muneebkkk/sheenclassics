const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/summary', orderController.getOrderSummary);
router.post('/apply-coupon', orderController.applyCoupon);

// Create order - ALLOW unauthenticated users (collect email at checkout)
router.post('/create', orderController.createOrder);
// Use controller-level auth check so we always return JSON (no HTML redirects)
router.post('/:id/cancel', orderController.cancelOrder);
// My orders redirects to account with orders tab
router.get('/my-orders', isAuthenticated, (req, res) => {
    res.redirect('/account?tab=orders');
});
router.get('/:id', orderController.getOrder);

module.exports = router;