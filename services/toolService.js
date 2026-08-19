/**
 * Tool Service - Backend functions that AI can safely call
 * Defines and executes tools/functions for the chatbot
 */

const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const mongoose = require('mongoose');

/**
 * Tool Definitions - Describe what tools are available
 */
const TOOLS = [{
        name: 'searchProducts',
        description: 'Search for products by name, category, or description',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query (product name or keywords)'
                },
                category: {
                    type: 'string',
                    enum: ['Clothing', 'HomeDecor'],
                    description: 'Optional product category filter'
                },
                limit: {
                    type: 'integer',
                    description: 'Maximum number of results (default: 5)'
                }
            },
            required: ['query']
        }
    },
    {
        name: 'getProductDetails',
        description: 'Get detailed information about a specific product',
        parameters: {
            type: 'object',
            properties: {
                productId: {
                    type: 'string',
                    description: 'Product ID or slug'
                }
            },
            required: ['productId']
        }
    },
    {
        name: 'getCart',
        description: 'Retrieve user cart with items',
        parameters: {
            type: 'object',
            properties: {
                userId: {
                    type: 'string',
                    description: 'User ID'
                }
            },
            required: ['userId']
        }
    },
    {
        name: 'addToCart',
        description: 'Add a product to user cart',
        parameters: {
            type: 'object',
            properties: {
                userId: { type: 'string', description: 'User ID' },
                productId: { type: 'string', description: 'Product ID' },
                quantity: { type: 'integer', description: 'Quantity (default: 1)', default: 1 },
                size: { type: 'string', description: 'Size if applicable' },
                color: { type: 'string', description: 'Color if applicable' }
            },
            required: ['userId', 'productId']
        }
    },
    {
        name: 'applyCoupon',
        description: 'Validate and apply coupon code to user cart',
        parameters: {
            type: 'object',
            properties: {
                userId: { type: 'string', description: 'User ID' },
                couponCode: { type: 'string', description: 'Coupon code to apply' }
            },
            required: ['userId', 'couponCode']
        }
    },
    {
        name: 'getOrderStatus',
        description: 'Get status of a specific order',
        parameters: {
            type: 'object',
            properties: {
                orderId: { type: 'string', description: 'Order ID' },
                userId: { type: 'string', description: 'User ID (for validation)' }
            },
            required: ['orderId']
        }
    }
];

/**
 * Tool Implementation Functions
 */

/**
 * Search products by query
 */
async function searchProducts(params) {
    try {
        const { query, category, limit = 5 } = params;

        let mongoQuery = {};

        // Add category filter if provided
        if (category && ['Clothing', 'HomeDecor'].includes(category)) {
            mongoQuery.category = category;
        }

        // Add text search
        if (query && query.length > 0) {
            mongoQuery.$or = [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ];
        }

        const products = await Product.find(mongoQuery)
            .select('_id name slug price originalPrice category stock images')
            .limit(Math.min(limit, 10)); // Max 10 results

        return {
            success: true,
            count: products.length,
            products: products.map(p => ({
                id: p._id,
                name: p.name,
                slug: p.slug,
                price: p.price,
                originalPrice: p.originalPrice,
                category: p.category,
                inStock: p.stock > 0,
                link: `http://localhost:3000/products/${p.slug || p._id}`
            }))
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Get detailed product information
 */
async function getProductDetails(params) {
    try {
        const { productId } = params;

        // Validate ObjectId format
        let product;
        if (mongoose.Types.ObjectId.isValid(productId)) {
            product = await Product.findById(productId);
        } else {
            product = await Product.findOne({ slug: productId });
        }

        if (!product) {
            return { success: false, error: 'Product not found' };
        }

        return {
            success: true,
            product: {
                id: product._id,
                name: product.name,
                description: product.description,
                price: product.price,
                originalPrice: product.originalPrice,
                category: product.category,
                stock: product.stock,
                inStock: product.stock > 0,
                sizes: product.sizes || [],
                colors: product.colors || [],
                images: product.images || [],
                link: `http://localhost:3000/products/${product.slug || product._id}`
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Get user's cart
 */
async function getCart(params) {
    try {
        const { userId } = params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return { success: false, error: 'Invalid user ID' };
        }

        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart || !cart.items.length) {
            return { success: true, itemCount: 0, items: [] };
        }

        return {
            success: true,
            itemCount: cart.items.length,
            items: cart.items
                .filter(item => item.product) // Filter out deleted products
                .map(item => ({
                    productId: item.product._id,
                    name: item.product.name,
                    price: item.product.price,
                    quantity: item.quantity,
                    size: item.size,
                    color: item.color,
                    subtotal: item.product.price * item.quantity
                }))
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Add product to cart - returns action description for AI
 */
async function addToCart(params) {
    try {
        const { userId, productId, quantity = 1, size = '', color = '' } = params;

        // Validate inputs
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return { success: false, error: 'Invalid user ID' };
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return { success: false, error: 'Invalid product ID' };
        }

        // Check product exists and has stock
        const product = await Product.findById(productId);
        if (!product) {
            return { success: false, error: 'Product not found' };
        }

        if (product.stock < quantity) {
            return { success: false, error: `Only ${product.stock} items available` };
        }

        // Get or create cart
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        // Check for existing item
        const existingItem = cart.items.find(
            item => item.product.toString() === productId && item.size === size && item.color === color
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({ product: productId, quantity, size, color });
        }

        await cart.save();

        return {
            success: true,
            message: `✅ Added ${quantity}x "${product.name}" to cart`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Apply coupon to user's cart
 */
async function applyCoupon(params) {
    try {
        const { userId, couponCode } = params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return { success: false, error: 'Invalid user ID' };
        }

        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

        if (!coupon) {
            return { success: false, error: `Coupon "${couponCode}" not found` };
        }

        if (!coupon.isValid ?.()) {
            return { success: false, error: 'Coupon has expired' };
        }

        // Get cart to calculate discount
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || !cart.items.length) {
            return { success: false, error: 'Cart is empty' };
        }

        const subtotal = cart.items.reduce((sum, item) => {
            return item.product ? sum + item.product.price * item.quantity : sum;
        }, 0);

        if (subtotal < coupon.minPurchase) {
            return {
                success: false,
                error: `Minimum purchase of Rs.${coupon.minPurchase} required`
            };
        }

        const discount = coupon.discountType === 'percentage' ?
            (subtotal * coupon.discountValue) / 100 :
            coupon.discountValue;

        return {
            success: true,
            message: `✅ Coupon "${couponCode}" applied`,
            discount: discount,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Get order status
 */
async function getOrderStatus(params) {
    try {
        const { orderId, userId } = params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return { success: false, error: 'Invalid order ID' };
        }

        const order = await Order.findById(orderId).populate('items.product');

        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        // Optionally validate user owns this order
        if (userId && order.user.toString() !== userId) {
            return { success: false, error: 'Unauthorized' };
        }

        return {
            success: true,
            order: {
                id: order._id,
                status: order.status,
                createdAt: order.createdAt,
                itemCount: order.items.length,
                total: order.total,
                timeline: order.statusHistory ?.map(entry => ({
                    status: entry.status,
                    timestamp: entry.timestamp,
                    note: entry.note
                })) || []
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Execute a tool based on name and parameters
 * Returns result object
 */
async function executeTool(toolName, params) {
    console.log(`[TOOL] Executing: ${toolName}`, params);

    switch (toolName) {
        case 'searchProducts':
            return await searchProducts(params);
        case 'getProductDetails':
            return await getProductDetails(params);
        case 'getCart':
            return await getCart(params);
        case 'addToCart':
            return await addToCart(params);
        case 'applyCoupon':
            return await applyCoupon(params);
        case 'getOrderStatus':
            return await getOrderStatus(params);
        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

/**
 * Validate tool parameters before execution
 */
function validateToolCall(toolName, params) {
    const tool = TOOLS.find(t => t.name === toolName);

    if (!tool) {
        return { valid: false, error: `Unknown tool: ${toolName}` };
    }

    const required = tool.parameters.required || [];
    for (const param of required) {
        if (!(param in params)) {
            return { valid: false, error: `Missing required parameter: ${param}` };
        }
    }

    return { valid: true };
}

module.exports = {
    TOOLS,
    executeTool,
    validateToolCall,
    searchProducts,
    getProductDetails,
    getCart,
    addToCart,
    applyCoupon,
    getOrderStatus
};


































