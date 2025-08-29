import express from 'express';
import { query, validationResult } from 'express-validator';
import { db } from '../config/database.js';
import { products } from '../models/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { eq, and, like, desc, asc, or } from 'drizzle-orm';

const router = express.Router();

// GET / - Get all products
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isLength({ min: 1 }).withMessage('Category is required if provided'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term is required if provided'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { page = 1, limit = 50, category, search, isActive } = req.query;
    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions = [];

    if (category) {
      whereConditions.push(eq(products.category, category));
    }
    if (search) {
      whereConditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.description, `%${search}%`),
          like(products.category, `%${search}%`)
        )
      );
    }
    if (isActive !== undefined) {
      whereConditions.push(eq(products.isActive, isActive === 'true'));
    }

    // Build query
    let query = db.select({
      id: products.id,
      name: products.name,
      description: products.description,
      category: products.category,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt
    }).from(products);

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Get total count for pagination
    const countQuery = db.select({ count: products.id }).from(products);
    if (whereConditions.length > 0) {
      countQuery = countQuery.where(and(...whereConditions));
    }
    const totalResult = await countQuery;
    const total = totalResult[0]?.count || 0;

    // Get paginated results
    const results = await query
      .orderBy(asc(products.name))
      .limit(parseInt(limit))
      .offset(offset);

    res.json({
      message: 'Products retrieved successfully',
      products: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /:id - Get product by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    const product = await db.select({
      id: products.id,
      name: products.name,
      description: products.description,
      category: products.category,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

    if (!product || product.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    res.json({
      message: 'Product retrieved successfully',
      product: product[0]
    });

  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
